using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace Eis44Parser.Data;

/// <summary>
/// Создаёт таблицы конвейера в уже существующей БД. <see cref="RelationalDatabaseCreator.EnsureCreated"/>
/// не добавляет таблицы, если файл БД есть — а старый воркер создавал только Tenders.
/// Скрипты идемпотентны (CREATE TABLE/INDEX IF NOT EXISTS), повтор безопасен.
/// </summary>
public static class EisPipelineSchema
{
    private const string PostgresResource = "Eis44Parser.Data.Sql.Postgres.sql";
    private const string SqliteResource = "Eis44Parser.Data.Sql.Sqlite.sql";

    /// <summary>Применить DDL конвейера для текущего провайдера EF Core.</summary>
    public static async Task EnsureAsync(EisDbContext db, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(db);

        var resource = db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true
            ? SqliteResource
            : PostgresResource;

        using var stream = typeof(EisPipelineSchema).Assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"В сборке нет встроенного скрипта {resource}.");
        using var reader = new StreamReader(stream);
        var script = await reader.ReadToEndAsync(cancellationToken).ConfigureAwait(false);

        await db.Database.ExecuteSqlRawAsync(script, cancellationToken).ConfigureAwait(false);
    }
}
