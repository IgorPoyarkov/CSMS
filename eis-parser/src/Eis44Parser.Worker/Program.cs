using Eis44Parser.Core;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Eis44Parser.Data;
using Eis44Parser.Worker;
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
// --parse-file <путь> — разобрать один XML без ЕИС и токена,
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
        var parsed = new EisDocumentParser().Parse(document, Path.GetFileName(parseFilePath));

        Console.WriteLine($"Файл: {parsed.FileName}");
        Console.WriteLine($"Тип: {parsed.Kind}, схема: {parsed.SchemeVersion}");
        Console.WriteLine($"Номер закупки: {parsed.PurchaseNumber}");
        Console.WriteLine($"ИКЗ: {parsed.Ikz}");
        Console.WriteLine($"Заказчик: {parsed.CustomerName} | ИНН {parsed.CustomerInn} | КПП {parsed.CustomerKpp}");
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
