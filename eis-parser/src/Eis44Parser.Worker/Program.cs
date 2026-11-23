using Eis44Parser.Core;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Fns;
using Eis44Parser.Core.Models;
using Eis44Parser.Data;
using Eis44Parser.Data.Services;
using Eis44Parser.Worker;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

// Режимы: без аргументов — постоянный опрос, --once — один проход,
// --validate — проверить конфигурацию и создать БД без обращения к ЕИС,
// --check — проверить токен и доступность локального ГОСТ-туннеля,
// --import-nsi — выгрузить справочник НСИ (КТРУ) и опубликовать в csms-api,
// --pipeline-once — один проход четырёхэтапного конвейера (очередь архивов),
// --parse-file <путь> — разобрать один XML без ЕИС и токена
//   (в том числе fcsRegulationRules и fcsRequestForQuotation),
// --parse-xlsx <путь> — разобрать XLSX шаблон КТРУ экспертного совета,
// --contract-card <реестровый номер> — скачать и разобрать акты/платежи публичной карточки,
// --smp-html — дополнительно разобрать сведения о привлечении СМП из HTML-карточки
//   (с 2026 года субподрядчики публикуются на сайте, а не в XML),
// --smp-html-only — обновить только подтаблицу СМП из HTML по списку номеров
//   (--contract-card / --numbers-file / --inn, --year, --limit, --out) — XML не скачивается,
// --card-fields — дополнительно разобрать реквизиты карточки (поставщик, аванс,
//   срок исполнения, ИКЗ, обеспечение, счета сторон) при полном импорте,
// --card-fields-only — обновить только реквизиты карточки в готовых JSON
//   (те же --contract-card / --numbers-file / --inn, --year, --limit, --out),
// --reparse-card-dir <папка> — переразобрать уже скачанные XML карточек без сети
//   (после изменения парсера; JSON-проекции перезаписываются),
// --numbers-file <путь> — то же для явного списка реестровых номеров (по одному в строке);
//   поиск ЕИС не фильтрует по ИНН, поэтому надёжный источник списка — свои номера из БД,
// --inn <ИНН заказчика> — то же для всех контрактов заказчика за --year,
// --enrich-contractors — обогатить справочник подрядчиков по API ФНС
//   (--limit <n> — сколько карточек, --inn <ИНН> — только одна),
// --year <год> — фильтр года (по умолчанию 2026), --limit <n> — ограничение числа контрактов,
// --out <папка> — сохранить сырые XML и JSON-проекцию,
// --incremental — только новые номера старше курсора из --state (ежедневная проверка),
// --state <файл> — курсор импорта; по умолчанию <out>/import-state.json,
// --dry-run — только показать версию и объём снимка, без записи в API.
var runOnce = args.Contains("--once", StringComparer.OrdinalIgnoreCase);
var pipelineOnce = args.Contains("--pipeline-once", StringComparer.OrdinalIgnoreCase);
var validateOnly = args.Contains("--validate", StringComparer.OrdinalIgnoreCase);
var checkOnly = args.Contains("--check", StringComparer.OrdinalIgnoreCase);
var importNsi = args.Contains("--import-nsi", StringComparer.OrdinalIgnoreCase);
var dryRun = args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase);
var enrichContractors = args.Contains("--enrich-contractors", StringComparer.OrdinalIgnoreCase);
var smpHtml = args.Contains("--smp-html", StringComparer.OrdinalIgnoreCase);
// Реквизиты карточки (поставщик, аванс, срок исполнения) — из HTML ЕИС:
// в XML вложений их нет, поэтому реестр без этого блока остаётся пустым.
var cardFields = args.Contains("--card-fields", StringComparer.OrdinalIgnoreCase);

// ContentRoot привязан к каталогу исполняемого файла: туда копируется
// appsettings.json. Иначе при запуске из корня репозитория (dotnet run
// --project ...) конфиг не находится и молча используются дефолты.
var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
});
// Секрет хранится вне репозитория — в User Secrets (.NET), а не в appsettings.json.
// Подключаем явно, чтобы токен читался и вне окружения Development.
builder.Configuration.AddUserSecrets<Program>();

if (checkOnly)
{
    var checkOptions = builder.Configuration
        .GetSection(EisClientOptions.SectionName)
        .Get<EisClientOptions>() ?? new EisClientOptions();

    Console.WriteLine($"Туннель: {checkOptions.BaseTunnelUrl}");
    Console.WriteLine(checkOptions.HasPlaceholderToken
        ? "Токен: НЕ задан (User Secrets или Eis44__IndividualPersonToken)"
        : "Токен: задан");

    try
    {
        await TunnelProbe.EnsureAvailableAsync(checkOptions.BaseTunnelUrl);
        Console.WriteLine("Туннель: доступен — можно запускать --once.");
        return checkOptions.HasPlaceholderToken ? 1 : 0;
    }
    catch (InvalidOperationException exception)
    {
        Console.Error.WriteLine(exception.Message);
        return 1;
    }
}

// Разбор отдельного реального XML без обращения к ЕИС: удобно проверять
// новые образцы документов, пока токен доступа ещё не выдан.
var parseFilePath = GetArgumentValue(args, "--parse-file");
if (parseFilePath is not null)
{
    try
    {
        using var stream = File.OpenRead(parseFilePath);
        var document = await XDocument.LoadAsync(stream, LoadOptions.None, CancellationToken.None);
        var fileName = Path.GetFileName(parseFilePath);

        if (NormalizationRulesParser.IsRegulationRules(document))
        {
            var rule = new NormalizationRulesParser().Parse(document, fileName);
            Console.WriteLine($"Файл: {rule.FileName}");
            Console.WriteLine($"Тип: fcsRegulationRules, реестровый номер: {rule.RegistryNumber}");
            Console.WriteLine($"Вид: {rule.TypeName} ({rule.TypeCode})");
            Console.WriteLine($"Состояние: {rule.State}, опубликован: {rule.PublishDate}");
            Console.WriteLine($"Орган: {rule.PublishingOrgName} | ИНН {rule.PublishingOrgInn}");
            Console.WriteLine($"Регионы: {string.Join(", ", rule.RegionCodes)}");
            Console.WriteLine($"Вложений: {rule.Attachments.Count}");
            foreach (var attachment in rule.Attachments)
            {
                Console.WriteLine($"  {attachment.TypeName}: {attachment.FileName} ({attachment.FileSize} байт)");
                Console.WriteLine($"    {attachment.Url}");
            }

            return 0;
        }

        if (PriceRequestParser.IsPriceRequest(document))
        {
            var request = new PriceRequestParser().Parse(document, fileName);
            Console.WriteLine($"Файл: {request.FileName}");
            Console.WriteLine($"Тип: fcsRequestForQuotation, id: {request.Id}");
            Console.WriteLine($"Состояние: {request.State}, версия: {request.VersionNumber}");
            Console.WriteLine($"Заказчик: {request.PublishingOrgName} | ИНН {request.PublishingOrgInn}");
            Console.WriteLine($"Период запроса: {request.RequestStart} — {request.RequestEnd}");
            Console.WriteLine($"Позиций: {request.Products.Count}");
            foreach (var product in request.Products)
            {
                Console.WriteLine($"  ОКПД2 {product.Okpd2Code} | {product.Name} | {product.Quantity} {product.OkeiName}");
            }

            return 0;
        }

        if (AcceptanceActParser.IsAcceptanceAct(document))
        {
            var act = new AcceptanceActParser().Parse(document, fileName);
            Console.WriteLine($"Файл: {act.FileName}");
            Console.WriteLine($"Реестровый номер: {act.RegNumber}, акт №{act.ActNumber} от {act.ActDate}");
            Console.WriteLine($"Этап: sid={act.Stage?.Sid}, тех. id={act.Stage?.TechnicalSid}, ИКЗ={act.Stage?.Ikz}");
            Console.WriteLine($"Контракт: №{act.Contract?.Number} от {act.Contract?.Date}");
            Console.WriteLine($"Итого: без НДС {act.Totals.SumWithoutVat}, с НДС {act.Totals.SumWithVat}, НДС {act.Totals.VatSum}");
            Console.WriteLine($"Сторон: {act.Parties.Count}, работ: {act.WorkItems.Count}, вложений: {act.Attachments.Count}");
            foreach (var party in act.Parties)
            {
                Console.WriteLine($"  {party.Role}: {party.Name} | ИНН {party.Inn} | КПП {party.Kpp}");
            }

            return 0;
        }

        if (GeneralAcceptanceParser.IsGeneralAcceptanceDocument(document))
        {
            var act = new GeneralAcceptanceParser().Parse(document, fileName);
            Console.WriteLine($"Файл: {act.FileName}");
            Console.WriteLine($"Упрощённый акт: реестровый номер {act.RegNumber}, №{act.ActNumber} от {act.ActDate}, КНД {act.Knd}");
            Console.WriteLine($"Контракт: {act.Contract?.Number} от {act.Contract?.Date}");
            Console.WriteLine($"Итого: без НДС {act.Totals.SumWithoutVat}, с НДС {act.Totals.SumWithVat}");
            Console.WriteLine($"Сторон: {act.Parties.Count}, строк: {act.WorkItems.Count}, подписантов: {act.Signatories.Count}");
            return 0;
        }

        if (AcceptanceDecisionParser.IsAcceptanceDecision(document))
        {
            var decision = new AcceptanceDecisionParser().Parse(document, fileName);
            Console.WriteLine($"Файл: {decision.FileName}");
            Console.WriteLine($"Решение заказчика: КНД {decision.Knd}, акт {decision.ActFileId}");
            Console.WriteLine($"Документ №{decision.PostedDocumentNumber} от {decision.PostedDocumentDate}, код операции {decision.OperationCode}");
            Console.WriteLine($"Подписантов: {decision.Signatories.Count}");
            return 0;
        }

        if (EdoMessageParser.IsEdoMessage(document))
        {
            var message = new EdoMessageParser().Parse(document, fileName);
            Console.WriteLine($"Файл: {message.FileName}");
            Console.WriteLine($"{message.MessageType}: КНД {message.Knd}, {message.EventDate} {message.EventTime}");
            Console.WriteLine($"Документ: {message.DocumentName} №{message.DocumentNumber} от {message.DocumentDate}");
            Console.WriteLine($"Файл: {message.PostedFileName}, участников: {message.Participants.Count}");
            return 0;
        }

        if (AcceptanceActParser.IsPaymentOrder(document))
        {
            var payment = new AcceptanceActParser().ParsePaymentOrder(document, fileName);
            Console.WriteLine($"Файл: {payment.FileName}");
            Console.WriteLine($"Платёж №{payment.DocumentNumber} от {payment.DocumentDate}, сумма {payment.Sum}");
            Console.WriteLine($"Реестровый номер: {payment.RegNumber}");
            Console.WriteLine($"Контракт: №{payment.ContractNumber} от {payment.ContractDate}");
            Console.WriteLine($"Акт: №{payment.AcceptanceDocumentNumber} от {payment.AcceptanceDocumentDate}");
            Console.WriteLine($"Назначение: {payment.Purpose}");
            return 0;
        }

        // Исполнение контракта 2026 года: печатаем этапы и акты приёмки,
        // чтобы проверить разбор на реальном файле без записи в БД.
        if (ContractExecutionParser.IsContractExecution(document))
        {
            var execution = new ContractExecutionParser().Parse(document, fileName);
            Console.WriteLine($"Файл: {execution.FileName}");
            Console.WriteLine($"Реестровый номер: {execution.RegNumber}");
            foreach (var stage in execution.Stages)
            {
                Console.WriteLine(
                    $"Этап {stage.Index}: sid={stage.Sid}, {stage.StartDate} — {stage.EndDate}, актов: {stage.Acts.Count}");
                foreach (var act in stage.Acts)
                {
                    Console.WriteLine(
                        $"  Акт №{act.DocumentNumber}: sid={act.Sid}, дата {act.DocumentDate}, " +
                        $"приёмка {act.AcceptanceDate}, сумма {act.Sum}, guidEDI {act.GuidEdi}");
                }
            }

            return 0;
        }

        var parsed = new EisDocumentParser().Parse(document, fileName);

        Console.WriteLine($"Файл: {parsed.FileName}");
        Console.WriteLine($"Тип: {parsed.Kind}, схема: {parsed.SchemeVersion}");
        Console.WriteLine($"Номер закупки: {parsed.PurchaseNumber}");
        Console.WriteLine($"Реестровый номер: {parsed.RegNumber}");
        Console.WriteLine($"ИКЗ: {parsed.Ikz}");
        Console.WriteLine($"Заказчик: {parsed.CustomerName} | ИНН {parsed.CustomerInn} | КПП {parsed.CustomerKpp}");
        Console.WriteLine($"Поставщик: {parsed.SupplierName} | ИНН {parsed.SupplierInn} | КПП {parsed.SupplierKpp}");
        Console.WriteLine($"Сумма: {parsed.Price}, дата: {parsed.PublishDate}");
        Console.WriteLine($"Объект: {parsed.ObjectInfo}");
        Console.WriteLine($"Позиций: {parsed.Items.Count}");
        foreach (var item in parsed.Items)
        {
            Console.WriteLine($"  {item.LineNo}: КТРУ {item.KtruCode} | ОКПД2 {item.Okpd2Code} | {item.ItemName}");
            Console.WriteLine($"     количество {item.Quantity}, цена {item.Price}");
        }

        Console.WriteLine($"Субподрядчиков: {parsed.Subcontractors.Count}");
        foreach (var subcontractor in parsed.Subcontractors)
        {
            Console.WriteLine(
                $"  ИНН {subcontractor.Inn} | КПП {subcontractor.Kpp} | статус {subcontractor.StatusCode} | " +
                $"{subcontractor.Name}");
            Console.WriteLine(
                $"     договор №{subcontractor.ContractNumber} от {subcontractor.ContractDate} " +
                $"на {subcontractor.ContractSum} | ОКПД2 {subcontractor.Okpd2Code} | {subcontractor.ContractSubject}");
        }

        return 0;
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"Ошибка разбора XML: {exception.Message}");
        return 1;
    }
}

// Разбор XLSX шаблонов КТРУ из архивов экспертного совета ЕИС.
// Результат — только источник характеристик для ручной сверки с НСИ,
// не авторитетный справочник.
var parseXlsxPath = GetArgumentValue(args, "--parse-xlsx");
if (parseXlsxPath is not null)
{
    try
    {
        using var stream = File.OpenRead(parseXlsxPath);
        var position = KtruXlsxParser.Parse(stream, Path.GetFileName(parseXlsxPath));
        if (position is null)
        {
            Console.Error.WriteLine("Неизвестный шаблон XLSX: нет ни «Идентификатор или № id», ни «Код каталога ХХХ».");
            return 1;
        }

        Console.WriteLine($"Файл: {position.SourceFile}");
        Console.WriteLine($"Шаблон: {position.Template}");
        Console.WriteLine($"Код КТРУ: {position.Code}");
        Console.WriteLine($"Коды: {string.Join(", ", position.Codes)}");
        Console.WriteLine($"ОКПД2: {position.Okpd2Code}");
        Console.WriteLine($"Наименование: {position.Name}");
        Console.WriteLine($"Единица: {position.Unit}");
        Console.WriteLine($"Характеристик: {position.Characteristics.Count}");
        foreach (var characteristic in position.Characteristics)
        {
            Console.WriteLine($"  {characteristic.Name} ({characteristic.Unit})" +
                $"{(characteristic.IsMandatory is true ? " [обязательная]" : "")}:");
            foreach (var value in characteristic.Values)
            {
                Console.WriteLine($"    {value}");
            }
        }

        return 0;
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"Ошибка разбора XLSX: {exception.Message}");
        return 1;
    }
}

// Обновление только подтаблицы СМП из HTML-карточки. XML не скачивается:
// режим нужен, когда в XML сведений о субподрядчиках нет, а на сайте они есть.
// Существующая JSON-проекция читается и перезаписывается, остальные поля не
// трогаются; если проекции ещё нет — создаётся минимальная (её дополнит импорт).
var smpHtmlOnly = args.Contains("--smp-html-only", StringComparer.OrdinalIgnoreCase);
if (smpHtmlOnly)
{
    var outputDirectory = GetArgumentValue(args, "--out");
    if (outputDirectory is null)
    {
        Console.Error.WriteLine("--smp-html-only требует --out <папка с проекциями>");
        return 1;
    }

    var singleNumber = GetArgumentValue(args, "--contract-card");
    var numbersFile = GetArgumentValue(args, "--numbers-file");
    var htmlOnlyCustomerInn = GetArgumentValue(args, "--inn");
    var year = int.TryParse(GetArgumentValue(args, "--year"), out var parsedYear)
        ? parsedYear
        : 2026;
    var limit = int.TryParse(GetArgumentValue(args, "--limit"), out var parsedLimit)
        ? parsedLimit
        : int.MaxValue;

    var htmlClient = new PublicContractCardClient();
    var htmlParser = new ContractSmpHtmlParser();
    var numbers = new List<string>();
    if (singleNumber is not null)
    {
        numbers.Add(singleNumber);
    }
    else if (numbersFile is not null)
    {
        if (!File.Exists(numbersFile))
        {
            Console.Error.WriteLine($"Файл номеров не найден: {numbersFile}");
            return 1;
        }

        numbers.AddRange(File.ReadLines(numbersFile)
            .Select(line => line.Trim())
            .Where(line => line.Length == 19 && line.All(char.IsDigit)));
    }
    else if (htmlOnlyCustomerInn is not null)
    {
        numbers.AddRange((await htmlClient.EnumerateContractsByInnAsync(htmlOnlyCustomerInn))
            .Where(number => PublicContractCardClient.YearFromRegNumber(number) == year));
    }
    else
    {
        Console.Error.WriteLine(
            "--smp-html-only требует --contract-card, --numbers-file или --inn");
        return 1;
    }

    numbers = numbers
        .Distinct(StringComparer.Ordinal)
        .OrderBy(number => number, StringComparer.Ordinal)
        .Take(limit)
        .ToList();

    Directory.CreateDirectory(outputDirectory);
    var htmlJsonOptions = new JsonSerializerOptions
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    var updated = 0;
    var withoutSmp = 0;
    var failed = 0;
    foreach (var regNumber in numbers)
    {
        try
        {
            var commonInfo = await htmlClient.GetCommonInfoHtmlAsync(regNumber);
            var contractInfoId = ContractSmpHtmlParser.ContractInfoIdOf(commonInfo);
            var subcontractorsHtml = contractInfoId is null
                ? null
                : await htmlClient.GetSubcontractorsHtmlAsync(contractInfoId);
            var smp = htmlParser.ParseCommonInfoCard(
                commonInfo, subcontractorsHtml, regNumber);
            if (smp is null)
            {
                withoutSmp++;
                Console.Error.WriteLine($"{regNumber}: блока СМП в HTML нет");
                continue;
            }

            var path = Path.Combine(outputDirectory, $"{regNumber}.json");
            JsonObject projection;
            if (File.Exists(path))
            {
                projection = JsonNode.Parse(await File.ReadAllTextAsync(path))?.AsObject()
                    ?? new JsonObject();
            }
            else
            {
                projection = new JsonObject
                {
                    ["RegNumber"] = regNumber,
                    ["regNumber"] = regNumber,
                    ["Acts"] = new JsonArray(),
                    ["Decisions"] = new JsonArray(),
                    ["Payments"] = new JsonArray(),
                    ["Messages"] = new JsonArray(),
                    ["Executions"] = new JsonArray(),
                    ["SkippedFiles"] = new JsonArray(),
                };
            }

            projection["RegNumber"] = regNumber;
            projection["regNumber"] = regNumber;
            projection["Smp"] = JsonSerializer.SerializeToNode(new[] { smp }, htmlJsonOptions);
            await File.WriteAllTextAsync(path, projection.ToJsonString(htmlJsonOptions));

            updated++;
            Console.Error.WriteLine(
                $"{regNumber}: требование {smp.RequirementPercent}%, " +
                $"субподрядчиков {smp.Subcontractors.Count}");
        }
        catch (Exception exception)
        {
            failed++;
            Console.Error.WriteLine($"{regNumber}: ОШИБКА {exception.Message}");
        }
    }

    Console.WriteLine(JsonSerializer.Serialize(new
    {
        total = numbers.Count,
        updated,
        withoutSmp,
        failed,
    }, htmlJsonOptions));
    return 0;
}
// Обновление только реквизитов контракта (поставщик, аванс, срок, ИКЗ,
// обеспечение, счета) из HTML-карточки. XML не скачивается: режим нужен,
// чтобы заполнить реестр по уже выгруженным проекциям.
var cardFieldsOnly = args.Contains("--card-fields-only", StringComparer.OrdinalIgnoreCase);
if (cardFieldsOnly)
{
    var outputDirectory = GetArgumentValue(args, "--out");
    if (outputDirectory is null)
    {
        Console.Error.WriteLine("--card-fields-only требует --out <папка с проекциями>");
        return 1;
    }

    var singleNumber = GetArgumentValue(args, "--contract-card");
    var numbersFile = GetArgumentValue(args, "--numbers-file");
    var onlyCustomerInn = GetArgumentValue(args, "--inn");
    var onlyYear = int.TryParse(GetArgumentValue(args, "--year"), out var parsedOnlyYear)
        ? parsedOnlyYear
        : 2026;
    var onlyLimit = int.TryParse(GetArgumentValue(args, "--limit"), out var parsedOnlyLimit)
        ? parsedOnlyLimit
        : int.MaxValue;

    var fieldsClient = new PublicContractCardClient();
    var fieldsParser = new ContractGeneralHtmlParser();
    var fieldsNumbers = new List<string>();
    if (singleNumber is not null)
    {
        fieldsNumbers.Add(singleNumber);
    }
    else if (numbersFile is not null)
    {
        if (!File.Exists(numbersFile))
        {
            Console.Error.WriteLine($"Файл номеров не найден: {numbersFile}");
            return 1;
        }

        fieldsNumbers.AddRange(File.ReadLines(numbersFile)
            .Select(line => line.Trim())
            .Where(line => line.Length == 19 && line.All(char.IsDigit)));
    }
    else if (onlyCustomerInn is not null)
    {
        fieldsNumbers.AddRange((await fieldsClient.EnumerateContractsByInnAsync(onlyCustomerInn))
            .Where(number => PublicContractCardClient.YearFromRegNumber(number) == onlyYear));
    }
    else
    {
        Console.Error.WriteLine(
            "--card-fields-only требует --contract-card, --numbers-file или --inn");
        return 1;
    }

    fieldsNumbers = fieldsNumbers
        .Distinct(StringComparer.Ordinal)
        .OrderBy(number => number, StringComparer.Ordinal)
        .Take(onlyLimit)
        .ToList();

    Directory.CreateDirectory(outputDirectory);
    var fieldsJsonOptions = new JsonSerializerOptions
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    var fieldsUpdated = 0;
    var fieldsFailed = 0;
    foreach (var regNumber in fieldsNumbers)
    {
        try
        {
            var commonInfo = await fieldsClient.GetCommonInfoHtmlAsync(regNumber);
            var printForm = await fieldsClient.GetPrintFormHtmlAsync(regNumber);
            var general = fieldsParser.Parse(commonInfo, printForm, regNumber);
            if (general is null)
            {
                fieldsFailed++;
                Console.Error.WriteLine($"{regNumber}: реквизиты карточки не разобрались");
                continue;
            }

            var path = Path.Combine(outputDirectory, $"{regNumber}.json");
            JsonObject projection;
            if (File.Exists(path))
            {
                projection = JsonNode.Parse(await File.ReadAllTextAsync(path))?.AsObject()
                    ?? new JsonObject();
            }
            else
            {
                projection = new JsonObject
                {
                    ["RegNumber"] = regNumber,
                    ["regNumber"] = regNumber,
                    ["Acts"] = new JsonArray(),
                    ["Decisions"] = new JsonArray(),
                    ["Payments"] = new JsonArray(),
                    ["Messages"] = new JsonArray(),
                    ["Executions"] = new JsonArray(),
                    ["SkippedFiles"] = new JsonArray(),
                };
            }

            projection["RegNumber"] = regNumber;
            projection["regNumber"] = regNumber;
            projection["General"] = JsonSerializer.SerializeToNode(general, fieldsJsonOptions);
            await File.WriteAllTextAsync(path, projection.ToJsonString(fieldsJsonOptions));

            fieldsUpdated++;
            Console.Error.WriteLine(
                $"{regNumber}: поставщик «{general.SupplierName ?? "—"}» " +
                $"(ИНН {general.SupplierInn ?? "—"}), аванс {general.AdvanceAmount?.ToString() ?? "—"}");
        }
        catch (Exception exception)
        {
            fieldsFailed++;
            Console.Error.WriteLine($"{regNumber}: ОШИБКА {exception.Message}");
        }
    }

    Console.WriteLine(JsonSerializer.Serialize(new
    {
        total = fieldsNumbers.Count,
        updated = fieldsUpdated,
        failed = fieldsFailed,
    }, fieldsJsonOptions));
    return 0;
}



// Скачивание и полный разбор публичной карточки контракта: только общий доступ,
// токен ЕИС не нужен. Результат — projecting со всеми полями для фронта.
var cardRegNumber = GetArgumentValue(args, "--contract-card");
var customerInn = GetArgumentValue(args, "--inn");
var numbersFilePath = GetArgumentValue(args, "--numbers-file");
if (cardRegNumber is not null || customerInn is not null || numbersFilePath is not null)
{
    try
    {
        var yearValue = GetArgumentValue(args, "--year");
        var year = int.TryParse(yearValue, out var parsedYear) ? parsedYear : 2026;
        var limitValue = GetArgumentValue(args, "--limit");
        var limit = int.TryParse(limitValue, out var parsedLimit) ? parsedLimit : int.MaxValue;
        var outputDirectory = GetArgumentValue(args, "--out");

        var cardClient = new PublicContractCardClient();
        var importer = new ContractCardImportService(
            cardClient,
            new AcceptanceActParser(),
            new GeneralAcceptanceParser(),
            new AcceptanceDecisionParser(),
            new EdoMessageParser(),
            new ContractExecutionParser(),
            new ContractSmpParser());

        var incremental = args.Contains("--incremental", StringComparer.OrdinalIgnoreCase);
        var statePath = GetArgumentValue(args, "--state")
            ?? (outputDirectory is null ? null : Path.Combine(outputDirectory, "import-state.json"));
        if (incremental && statePath is null)
        {
            Console.Error.WriteLine(
                "--incremental без --out и без --state: некуда сохранить курсор, выполняю полный проход.");
        }

        var regNumbers = new List<string>();
        if (cardRegNumber is not null)
        {
            regNumbers.Add(cardRegNumber);
        }

        CardImportState? state = null;
        if (numbersFilePath is not null)
        {
            // Поиск ЕИС не фильтрует по заказчику, поэтому явный список номеров
            // из своей БД — надёжный источник: чужие карточки не попадут в импорт.
            if (!File.Exists(numbersFilePath))
            {
                Console.Error.WriteLine($"Файл номеров не найден: {numbersFilePath}");
                return 1;
            }

            var numbers = File.ReadLines(numbersFilePath)
                .Select(line => line.Trim())
                .Where(line => line.Length > 0 && !line.StartsWith('#'))
                .Where(line => line.Length == 19 && line.All(char.IsDigit))
                .ToList();
            regNumbers.AddRange(numbers);
            Console.Error.WriteLine(
                $"Явный список номеров: {numbers.Count}, файл {numbersFilePath}");

            // Повтор после обрыва: уже разобранные проекции не скачиваем заново.
            if (incremental && outputDirectory is not null)
            {
                regNumbers = regNumbers
                    .Where(number => !File.Exists(Path.Combine(outputDirectory, $"{number}.json")))
                    .ToList();
                Console.Error.WriteLine($"Осталось после проверки готовых проекций: {regNumbers.Count}");
            }
        }
        else if (customerInn is not null)
        {
            var found = await cardClient.EnumerateContractsByInnAsync(customerInn);
            var forYear = found
                .Where(number => PublicContractCardClient.YearFromRegNumber(number) == year)
                .ToList();

            if (incremental && statePath is not null)
            {
                state = CardImportState.Load(statePath);

                // Большой проход уже сделан раньше: восстанавливаем курсор из готовых
                // проекций в --out, чтобы не скачивать заново весь реестр.
                if (string.IsNullOrEmpty(state.LastRegNumber) &&
                    outputDirectory is not null && Directory.Exists(outputDirectory))
                {
                    var existing = Directory.GetFiles(outputDirectory, "*.json", SearchOption.TopDirectoryOnly)
                        .Select(Path.GetFileNameWithoutExtension)
                        .Where(name => name is { Length: 19 } && name.All(char.IsDigit))
                        .OrderBy(name => name, StringComparer.Ordinal)
                        .ToList();
                    if (existing.Count > 0)
                    {
                        state.LastRegNumber = existing[^1]!;
                        state.ProcessedCount = existing.Count;
                        state.Inn = customerInn;
                        state.Year = year;
                        state.LastCheckedAt = DateTimeOffset.UtcNow;
                        state.LastImportedAt = DateTimeOffset.UtcNow;
                        state.Save(statePath);
                        Console.Error.WriteLine(
                            $"Курсор восстановлен из {existing.Count} готовых проекций: {state.LastRegNumber}");
                    }
                }

                state.Inn = customerInn;
                state.Year = year;
                state.LastCheckedAt = DateTimeOffset.UtcNow;

                if (string.IsNullOrEmpty(state.LastRegNumber))
                {
                    // Первый запуск: одноразовый полный проход по ИНН.
                    regNumbers.AddRange(forYear);
                    Console.Error.WriteLine($"Первый проход: контрактов {forYear.Count}, год {year}");
                }
                else
                {
                    // Ежедневная проверка: только номера старше курсора. Поиск по ИНН
                    // дешёвый (страницы HTML), XML карточек скачиваем только для новых.
                    regNumbers.AddRange(forYear.Where(number =>
                        string.CompareOrdinal(number, state.LastRegNumber) > 0));
                    Console.Error.WriteLine(
                        $"Инкремент: курсор {state.LastRegNumber}, всего в поиске {forYear.Count}, " +
                        $"новых {regNumbers.Count}");
                }
            }
            else
            {
                regNumbers.AddRange(forYear);
            }
        }

        regNumbers = regNumbers
            .Distinct(StringComparer.Ordinal)
            .OrderBy(number => number, StringComparer.Ordinal)
            .Take(limit)
            .ToList();
        Console.Error.WriteLine($"Контрактов к обработке: {regNumbers.Count}, год: {year}");

        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        if (state is not null && statePath is not null && regNumbers.Count == 0)
        {
            state.Save(statePath);
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                newContracts = 0,
                lastRegNumber = state.LastRegNumber,
                lastCheckedAt = state.LastCheckedAt,
            }, jsonOptions));
            return 0;
        }

        var all = new List<ContractCardViewDto>();

        foreach (var regNumber in regNumbers)
        {
            try
            {
                var saveDirectory = outputDirectory is null
                    ? null
                    : Path.Combine(outputDirectory, regNumber);
                var view = await importer.ImportAsync(
                    regNumber, year, saveDirectory,
                    includeHtmlSmp: smpHtml,
                    includeHtmlGeneral: cardFields);
                all.Add(view);
                Console.Error.WriteLine(
                    $"{regNumber}: актов {view.Acts.Count}, решений {view.Decisions.Count}, " +
                    $"платежей {view.Payments.Count}, ЭДО {view.Messages.Count}, " +
                    $"исполнений {view.Executions.Count}, " +
                    $"субподрядчиков {view.Smp.Sum(item => item.Subcontractors.Count)}, " +
                    $"подрядчик «{view.General?.SupplierName ?? "—"}»");

                if (outputDirectory is not null)
                {
                    Directory.CreateDirectory(outputDirectory);
                    var json = JsonSerializer.Serialize(view, jsonOptions);
                    await File.WriteAllTextAsync(
                        Path.Combine(outputDirectory, $"{regNumber}.json"),
                        json);
                }

                // Курсор двигаем только после успешного разбора: упавший номер
                // останется в списке и будет повторён при следующей проверке.
                if (state is not null &&
                    (state.LastRegNumber is null || string.CompareOrdinal(regNumber, state.LastRegNumber) > 0))
                {
                    state.LastRegNumber = regNumber;
                }
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine($"{regNumber}: ОШИБКА {exception.Message}");
            }
        }

        if (state is not null && statePath is not null)
        {
            state.ProcessedCount += all.Count;
            state.LastImportedAt = DateTimeOffset.UtcNow;
            state.Save(statePath);
            Console.Error.WriteLine(
                $"Курсор обновлён: {state.LastRegNumber}, новых разобрано {all.Count}");
        }

        Console.WriteLine(JsonSerializer.Serialize(all, jsonOptions));
        return 0;
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"Ошибка загрузки карточки контракта: {exception.Message}");
        return 1;
    }
}

// Повторный разбор уже скачанных карточек: сеть не нужна, берём XML из
// каталога выгрузки (<out>/<реестровый номер>/*.xml) и перезаписываем JSON.
// Нужен, когда меняется парсер: 111 карточек заново не скачиваются.
var reparseDirectory = GetArgumentValue(args, "--reparse-card-dir");
if (reparseDirectory is not null)
{
    if (!Directory.Exists(reparseDirectory))
    {
        Console.Error.WriteLine($"Каталог не найден: {reparseDirectory}");
        return 1;
    }

    var reparseYear = int.TryParse(GetArgumentValue(args, "--year"), out var parsedReparseYear)
        ? parsedReparseYear
        : (int?)null;
    var reparseJsonOptions = new JsonSerializerOptions
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };
    var importer = new ContractCardImportService(
        new PublicContractCardClient(),
        new AcceptanceActParser(),
        new GeneralAcceptanceParser(),
        new AcceptanceDecisionParser(),
        new EdoMessageParser(),
        new ContractExecutionParser(),
        new ContractSmpParser());

    var reparsed = 0;
    foreach (var cardDirectory in Directory
                 .EnumerateDirectories(reparseDirectory)
                 .OrderBy(path => path, StringComparer.Ordinal))
    {
        var regNumber = Path.GetFileName(cardDirectory);
        if (regNumber.Length != 19 || !regNumber.All(char.IsDigit))
        {
            continue;
        }

        // ZIP-архивы уже распакованы при первом проходе: читаем только XML.
        var files = Directory
            .EnumerateFiles(cardDirectory, "*.xml", SearchOption.TopDirectoryOnly)
            .OrderBy(path => path, StringComparer.Ordinal)
            .Select(path => (
                FileName: Path.GetFileName(path),
                SourceArchive: (string?)null,
                Bytes: File.ReadAllBytes(path)))
            .ToList();
        if (files.Count == 0)
        {
            continue;
        }

        var view = importer.ImportFromFiles(regNumber, files, reparseYear);
        Console.Error.WriteLine(
            $"{regNumber}: актов {view.Acts.Count}, платежей {view.Payments.Count}, " +
            $"субподрядчиков {view.Smp.Sum(item => item.Subcontractors.Count)}");

        await File.WriteAllTextAsync(
            Path.Combine(reparseDirectory, $"{regNumber}.json"),
            JsonSerializer.Serialize(view, reparseJsonOptions));
        reparsed += 1;
    }

    Console.WriteLine(JsonSerializer.Serialize(new { reparsed, directory = reparseDirectory }, reparseJsonOptions));
    return 0;
}

builder.Services.AddHttpClient();

builder.Services.Configure<EisClientOptions>(
    builder.Configuration.GetSection(EisClientOptions.SectionName));
builder.Services.Configure<EisNsiOptions>(
    builder.Configuration.GetSection(EisNsiOptions.SectionName));

// Биндер коллекций дописывает значения из конфига к значениям свойств-инициализаторов.
// Убираем дубли, иначе воркер опрашивает один и тот же регион/тип по несколько раз.
builder.Services.PostConfigure<EisClientOptions>(options =>
{
    options.RegionCodes = [.. options.RegionCodes.Distinct(StringComparer.OrdinalIgnoreCase)];
    options.DocumentTypes = [.. options.DocumentTypes.Distinct(StringComparer.OrdinalIgnoreCase)];
    options.SubsystemTypes = [.. options.SubsystemTypes.Distinct(StringComparer.OrdinalIgnoreCase)];

    if (options.RegionCodes.Count == 0)
    {
        options.RegionCodes = ["31"];
    }

    if (options.DocumentTypes.Count == 0)
    {
        options.DocumentTypes = [.. EisDocumentTypes.NotificationTypes];
    }

    if (options.SubsystemTypes.Count == 0)
    {
        options.SubsystemTypes = [EisSubsystems.Priz];
    }
});
builder.Services.AddSingleton<ITenderXmlParser, TenderXmlParser>();
builder.Services.AddSingleton<IEisSoapClient, EisSoapClient>();
builder.Services.AddSingleton<IEis44Client, Eis44Client>();
builder.Services.AddSingleton<EisDocumentParser>();
builder.Services.AddSingleton<ArchiveDownloader>();
builder.Services.AddSingleton<ArchiveProcessor>();
builder.Services.AddSingleton<IEisPipelineRepository, EisPipelineRepository>();
builder.Services.AddSingleton<EisPipelineRunner>();
builder.Services.AddSingleton<NsiImportService>();
builder.Services.AddTransient<ReferenceApiClient>();
builder.Services.AddSingleton<ITenderRepository, TenderRepository>();
builder.Services.AddSingleton<PollingWorker>();
builder.Services.AddHostedService(service => service.GetRequiredService<PollingWorker>());

// Обогащение справочника подрядчиков по API ФНС. Ключ api-fns.ru хранится
// в User Secrets (Fns:ApiKey), провайдер выбирается в appsettings.
builder.Services.Configure<FnsOptions>(builder.Configuration.GetSection(FnsOptions.SectionName));
var fnsSettings = builder.Configuration.GetSection(FnsOptions.SectionName).Get<FnsOptions>()
    ?? new FnsOptions();
var fnsTimeout = TimeSpan.FromSeconds(Math.Max(5, fnsSettings.TimeoutSeconds));

builder.Services.AddHttpClient<ApiFnsContractorClient>(client =>
{
    client.Timeout = fnsTimeout;
    client.DefaultRequestHeaders.UserAgent.ParseAdd("CSMS-Eis44Parser/1.0");
});
builder.Services.AddHttpClient<TransparentBusinessContractorClient>(client =>
{
    client.Timeout = fnsTimeout;
    // Сервис ФНС отвечает только браузерным клиентам.
    client.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36");
});
builder.Services.AddTransient<IFnsContractorClient, CompositeFnsContractorClient>();
builder.Services.AddScoped<ContractorEnrichmentService>();

var provider = builder.Configuration.GetValue<string>("Database:Provider") ?? "Sqlite";
var connectionString = builder.Configuration.GetConnectionString("EisDb") ?? "Data Source=eis44.db";

builder.Services.AddDbContext<EisDbContext>(options =>
{
    if (string.Equals(provider, "PostgreSql", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});

var host = builder.Build();

if (importNsi)
{
    try
    {
        var nsiOptions = host.Services.GetRequiredService<IOptions<EisNsiOptions>>().Value;
        var snapshot = await host.Services.GetRequiredService<NsiImportService>()
            .BuildSnapshotAsync(CancellationToken.None);

        Console.WriteLine($"Справочник: {snapshot.Dataset}");
        Console.WriteLine($"Версия: {snapshot.Version}");
        Console.WriteLine($"SHA-256: {snapshot.SourceSha256}");
        Console.WriteLine($"Позиций: {snapshot.Items.Count}");
        foreach (var item in snapshot.Items.Take(5))
        {
            Console.WriteLine($"  {item.Code} | {item.ParentCode} | {item.Name}");
        }

        if (dryRun)
        {
            Console.WriteLine("dry-run: снимок не опубликован.");
            return 0;
        }

        var dto = new ReferenceImportRequestDto(
            snapshot.Dataset,
            snapshot.Version,
            snapshot.SourceDocument,
            snapshot.SourceUrl,
            snapshot.SourceSha256,
            snapshot.PublishedAt,
            snapshot.Items);

        var response = await host.Services.GetRequiredService<ReferenceApiClient>()
            .PublishAsync(dto, CancellationToken.None);
        Console.WriteLine($"Опубликовано в {nsiOptions.ApiBaseUrl}: {response}");
        return 0;
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"Ошибка импорта справочника НСИ: {exception.Message}");
        return 1;
    }
}

if (validateOnly)
{
    using var scope = host.Services.CreateScope();
    var options = scope.ServiceProvider.GetRequiredService<IOptions<EisClientOptions>>().Value;
    var db = scope.ServiceProvider.GetRequiredService<EisDbContext>();
    await db.Database.EnsureCreatedAsync();
    await EisPipelineSchema.EnsureAsync(db);

    Console.WriteLine($"Провайдер БД: {provider}");
    Console.WriteLine($"Туннель ЕИС: {options.BaseTunnelUrl}{options.ServicePath}");
    Console.WriteLine($"Регионы: {string.Join(", ", options.RegionCodes)}");
    Console.WriteLine($"Типы документов: {string.Join(", ", options.DocumentTypes)}");
    Console.WriteLine(options.HasPlaceholderToken
        ? "Токен не задан — перед запросами к ЕИС укажите Eis44__IndividualPersonToken."
        : "Токен задан.");
    Console.WriteLine("БД готова.");
    return 0;
}

if (pipelineOnce)
{
    try
    {
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EisDbContext>();
        await db.Database.EnsureCreatedAsync();
        await EisPipelineSchema.EnsureAsync(db);

        var result = await host.Services.GetRequiredService<EisPipelineRunner>()
            .RunOnceAsync(CancellationToken.None);
        Console.WriteLine(
            $"Конвейер: в очередь {result.Enqueued}, обработано {result.Processed}, ошибок {result.Failed}.");
        return result.Failed == 0 ? 0 : 1;
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"Ошибка конвейера ЕИС: {exception.Message}");
        return 1;
    }
}

if (enrichContractors)
{
    try
    {
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EisDbContext>();
        await db.Database.EnsureCreatedAsync();
        await EisPipelineSchema.EnsureAsync(db);

        var limitValue = GetArgumentValue(args, "--limit");
        var limit = int.TryParse(limitValue, out var parsedLimit) ? parsedLimit : 100;
        var inn = GetArgumentValue(args, "--inn");

        var result = await scope.ServiceProvider.GetRequiredService<ContractorEnrichmentService>()
            .EnrichAsync(limit, inn, CancellationToken.None);

        Console.WriteLine(
            $"Подрядчики: проверено {result.Requested}, обновлено {result.Updated}, " +
            $"без данных {result.Skipped}.");
        return 0;
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"Ошибка обогащения справочника подрядчиков: {exception.Message}");
        return 1;
    }
}

if (runOnce)
{
    try
    {
        await host.Services.GetRequiredService<PollingWorker>()
            .PollOnceAsync(CancellationToken.None);
        return 0;
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"Ошибка опроса ЕИС: {exception.Message}");
        return 1;
    }
}

await host.RunAsync();
return 0;

/// <summary>Прочитать значение аргумента вида --parse-file path\to\file.xml.</summary>
static string? GetArgumentValue(string[] arguments, string name)
{
    var index = Array.FindIndex(arguments, value => value.Equals(name, StringComparison.OrdinalIgnoreCase));
    return index >= 0 && index + 1 < arguments.Length ? arguments[index + 1] : null;
}
