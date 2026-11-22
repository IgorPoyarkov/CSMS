using Eis44Parser.Core;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Eis44Parser.Data;
using Eis44Parser.Worker;
using System.Text.Encodings.Web;
using System.Text.Json;
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
// --inn <ИНН заказчика> — то же для всех контрактов заказчика за --year,
// --year <год> — фильтр года (по умолчанию 2026), --limit <n> — ограничение числа контрактов,
// --out <папка> — сохранить сырые XML и JSON-проекцию,
// --dry-run — только показать версию и объём снимка, без записи в API.
var runOnce = args.Contains("--once", StringComparer.OrdinalIgnoreCase);
var pipelineOnce = args.Contains("--pipeline-once", StringComparer.OrdinalIgnoreCase);
var validateOnly = args.Contains("--validate", StringComparer.OrdinalIgnoreCase);
var checkOnly = args.Contains("--check", StringComparer.OrdinalIgnoreCase);
var importNsi = args.Contains("--import-nsi", StringComparer.OrdinalIgnoreCase);
var dryRun = args.Contains("--dry-run", StringComparer.OrdinalIgnoreCase);

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

// Скачивание и полный разбор публичной карточки контракта: только общий доступ,
// токен ЕИС не нужен. Результат — projecting со всеми полями для фронта.
var cardRegNumber = GetArgumentValue(args, "--contract-card");
var customerInn = GetArgumentValue(args, "--inn");
if (cardRegNumber is not null || customerInn is not null)
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
            new ContractExecutionParser());

        var regNumbers = new List<string>();
        if (cardRegNumber is not null)
        {
            regNumbers.Add(cardRegNumber);
        }

        if (customerInn is not null)
        {
            var found = await cardClient.EnumerateContractsByInnAsync(customerInn);
            regNumbers.AddRange(found.Where(number => PublicContractCardClient.YearFromRegNumber(number) == year));
        }

        regNumbers = regNumbers.Distinct(StringComparer.Ordinal).Take(limit).ToList();
        Console.Error.WriteLine($"Контрактов к обработке: {regNumbers.Count}, год: {year}");

        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };
        var all = new List<ContractCardViewDto>();

        foreach (var regNumber in regNumbers)
        {
            try
            {
                var saveDirectory = outputDirectory is null
                    ? null
                    : Path.Combine(outputDirectory, regNumber);
                var view = await importer.ImportAsync(regNumber, year, saveDirectory);
                all.Add(view);
                Console.Error.WriteLine(
                    $"{regNumber}: актов {view.Acts.Count}, решений {view.Decisions.Count}, " +
                    $"платежей {view.Payments.Count}, ЭДО {view.Messages.Count}, " +
                    $"исполнений {view.Executions.Count}");

                if (outputDirectory is not null)
                {
                    Directory.CreateDirectory(outputDirectory);
                    var json = JsonSerializer.Serialize(view, jsonOptions);
                    await File.WriteAllTextAsync(
                        Path.Combine(outputDirectory, $"{regNumber}.json"),
                        json);
                }
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine($"{regNumber}: ОШИБКА {exception.Message}");
            }
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
