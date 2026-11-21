using Eis44Parser.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Eis44Parser.Tests;

/// <summary>Старая БД воркера содержит только Tenders — конвейер должен досоздать свои таблицы.</summary>
public sealed class EisPipelineSchemaTests
{
    [Fact]
    public async Task EnsureAsync_AddsPipelineTablesToExistingDatabaseAndIsIdempotent()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<EisDbContext>().UseSqlite(connection).Options;
        using var db = new EisDbContext(options);

        // Имитация состояния до появления конвейера.
        await db.Database.ExecuteSqlRawAsync(
            "CREATE TABLE \"Tenders\" (\"Id\" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, \"PurchaseNumber\" TEXT)");
        Assert.Equal(1, await TableCountAsync(db, "Tenders"));
        Assert.Equal(0, await TableCountAsync(db, "eis_archive_queue"));

        await EisPipelineSchema.EnsureAsync(db);
        await EisPipelineSchema.EnsureAsync(db);

        foreach (var table in new[]
                 {
                     "eis_sync_state", "eis_archive_queue", "raw_documents",
                     "purchases", "purchase_items", "contracts", "participants",
                 })
        {
            Assert.Equal(1, await TableCountAsync(db, table));
        }

        // EF-маппинг должен использовать те же snake_case-имена, что и DDL.
        var columns = await db.Database
            .SqlQueryRaw<string>("SELECT name FROM pragma_table_info('eis_archive_queue')")
            .ToListAsync();
        Assert.Contains("archive_url", columns);
        Assert.Contains("url_sha256", columns);
        Assert.DoesNotContain("ArchiveUrl", columns);
        Assert.Equal(1, await TableCountAsync(db, "Tenders"));
    }

    private static Task<int> TableCountAsync(EisDbContext db, string table) =>
        db.Database.SqlQueryRaw<int>(
                "SELECT COUNT(*) AS \"Value\" FROM sqlite_master WHERE type = 'table' AND name = {0}", table)
            .SingleAsync();
}
