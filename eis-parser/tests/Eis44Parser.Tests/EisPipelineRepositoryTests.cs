using Eis44Parser.Core.Models;
using Eis44Parser.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Eis44Parser.Tests;

/// <summary>Идемпотентность очереди и upsert нормализованных сущностей.</summary>
public sealed class EisPipelineRepositoryTests
{
    [Fact]
    public async Task FullPipeline_EnqueueClaimPersist_IsIdempotent()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<EisDbContext>().UseSqlite(connection).Options;
        using var db = new EisDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var repository = new EisPipelineRepository(db);

        var candidate = new ArchiveCandidate(
            "https://example.test/archive.zip", "31", EisSubsystems.Priz, "epNotificationEF2020", null, null);
        Assert.True(await repository.EnqueueAsync(candidate));
        Assert.False(await repository.EnqueueAsync(candidate));
        Assert.Equal(1, await db.ArchiveQueue.CountAsync());

        var claimed = await repository.ClaimNextAsync();
        Assert.NotNull(claimed);
        Assert.Equal("downloading", claimed!.Status);
        Assert.Equal(1, claimed.Attempts);

        var archive = new ArchiveFile(candidate.ArchiveUrl, "/tmp/archive.zip", new string('a', 64), 1024);
        await repository.MarkDownloadedAsync(claimed.Id, archive);

        var purchase = new ParsedEisDocument
        {
            FileName = "notice.xml",
            DocumentSha256 = new string('b', 64),
            Kind = EisDocumentKind.Purchase,
            PurchaseNumber = "01234567890123456789",
            CustomerInn = "7700000000",
            Price = 100000m,
            Items =
            [
                new PurchaseItemDto(1, "03.0000.1", "26.20.11", "Компьютер", 2m, 50000m),
            ],
        };
        await repository.PersistDocumentAsync(claimed.Id, purchase);
        await repository.PersistDocumentAsync(claimed.Id, purchase);

        Assert.Equal(1, await db.Purchases.CountAsync());
        Assert.Equal(1, await db.PurchaseItems.CountAsync());
        Assert.Equal(1, await db.RawDocuments.CountAsync());
        Assert.Equal("7700000000", await db.Participants.Select(p => p.Inn).SingleAsync());

        var contract = new ParsedEisDocument
        {
            FileName = "contract.xml",
            DocumentSha256 = new string('c', 64),
            Kind = EisDocumentKind.Contract,
            RegNumber = "01234567890123456789-1",
            PurchaseNumber = "01234567890123456789",
            CustomerInn = "7700000000",
            SupplierInn = "5001000000",
            Price = 90000m,
        };
        await repository.PersistDocumentAsync(claimed.Id, contract);
        await repository.PersistDocumentAsync(claimed.Id, contract);

        Assert.Equal(1, await db.Contracts.CountAsync());
        Assert.Equal(2, await db.Participants.CountAsync());
        Assert.Equal(2, await db.RawDocuments.CountAsync());

        await repository.MarkProcessedAsync(claimed.Id);
        var stored = await db.ArchiveQueue.SingleAsync();
        Assert.Equal("processed", stored.Status);
        Assert.Equal(archive.Sha256, stored.ArchiveSha256);
        Assert.Null(await repository.ClaimNextAsync());
    }
}
