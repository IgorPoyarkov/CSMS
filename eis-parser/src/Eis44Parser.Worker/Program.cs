using Eis44Parser.Core;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Eis44Parser.Data;
using Eis44Parser.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

// Режимы: без аргументов — постоянный опрос, --once — один проход,
// --validate — проверить конфигурацию и создать БД без обращения к ЕИС.
var runOnce = args.Contains("--once", StringComparer.OrdinalIgnoreCase);
var validateOnly = args.Contains("--validate", StringComparer.OrdinalIgnoreCase);

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

builder.Services.AddHttpClient();

builder.Services.Configure<EisClientOptions>(
    builder.Configuration.GetSection(EisClientOptions.SectionName));

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
builder.Services.AddSingleton<IEis44Client, Eis44Client>();
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

if (validateOnly)
{
    using var scope = host.Services.CreateScope();
    var options = scope.ServiceProvider.GetRequiredService<IOptions<EisClientOptions>>().Value;
    var db = scope.ServiceProvider.GetRequiredService<EisDbContext>();
    await db.Database.EnsureCreatedAsync();

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
