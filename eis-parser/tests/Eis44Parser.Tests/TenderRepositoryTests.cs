using Eis44Parser.Core.Models;
using Eis44Parser.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Eis44Parser.Tests;

/// <summary>Дедупликация по номеру закупки и версии документа.</summary>
public sealed class TenderRepositoryTests
{
    [Fact]
    public async Task SaveAsync_InsertsSkipsAndUpdatesChangedVersion()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<EisDbContext>()
            .UseSqlite(connection)
            .Options;
        using var db = new EisDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var repository = new TenderRepository(db);
        var tender = new TenderDto
        {
            FileName = "notice.xml",
            PurchaseNumber = "01234567890123456789",
            SchemeVersion = "1.0",
            ObjectInfo = "Поставка компьютеров",
            MaxPrice = 100000m,
            CustomerInn = "7700000000",
            PublishDate = "2026-11-18",
        };

        var first = await repository.SaveAsync([tender]);
        Assert.Equal(1, first.Inserted);

        var repeated = await repository.SaveAsync([tender]);
        Assert.Equal(1, repeated.Skipped);
        Assert.Equal(0, repeated.Inserted);
        Assert.Equal(0, repeated.Updated);

        var changed = await repository.SaveAsync([tender with { SchemeVersion = "2.0" }]);
        Assert.Equal(1, changed.Updated);
        Assert.Equal(1, await db.Tenders.CountAsync());
        Assert.Equal("2.0", await db.Tenders.Select(record => record.SchemeVersion).SingleAsync());
    }
}
