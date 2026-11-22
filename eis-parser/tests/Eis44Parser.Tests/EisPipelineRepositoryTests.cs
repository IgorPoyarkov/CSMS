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

    [Fact]
    public async Task ContractProcedureDoesNotOverwriteContract()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<EisDbContext>().UseSqlite(connection).Options;
        using var db = new EisDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var repository = new EisPipelineRepository(db);

        var candidate = new ArchiveCandidate(
            "https://example.test/export.zip", "31", EisSubsystems.Priz, "contract", null, null);
        Assert.True(await repository.EnqueueAsync(candidate));
        var claimed = await repository.ClaimNextAsync();
        Assert.NotNull(claimed);
        var archive = new ArchiveFile(candidate.ArchiveUrl, "/tmp/export.zip", new string('a', 64), 1024);
        await repository.MarkDownloadedAsync(claimed!.Id, archive);

        await repository.PersistDocumentAsync(claimed.Id, new ParsedEisDocument
        {
            FileName = "export.xml#1-contract",
            DocumentSha256 = new string('b', 64),
            Kind = EisDocumentKind.Contract,
            RegNumber = "2462904043925000011",
            PurchaseNumber = "0144200001825000020",
            Ikz = "252462904043946320100100260074211244",
            SupplierInn = "4621009123",
            Price = 271_568_111.92m,
        });

        // В настоящем export.zip 207 этапов с тем же regNum, но без ИКЗ и цены.
        await repository.PersistDocumentAsync(claimed.Id, new ParsedEisDocument
        {
            FileName = "export.xml#2-contractProcedure",
            DocumentSha256 = new string('c', 64),
            Kind = EisDocumentKind.ContractProcedure,
            RegNumber = "2462904043925000011",
            PurchaseNumber = "2462904043925000011",
        });

        var contract = await db.Contracts.SingleAsync();
        Assert.Equal("252462904043946320100100260074211244", contract.Ikz);
        Assert.Equal(271_568_111.92m, contract.ContractPrice);
        Assert.Equal("4621009123", contract.SupplierInn);
        Assert.Equal(2, await db.RawDocuments.CountAsync());
        Assert.Equal(1, await db.Participants.CountAsync());
    }

    [Fact]
    public async Task TenderPlanIsStoredAsRawWithoutPurchase()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<EisDbContext>().UseSqlite(connection).Options;
        using var db = new EisDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var repository = new EisPipelineRepository(db);

        var candidate = new ArchiveCandidate(
            "https://example.test/plan.zip", "31", EisSubsystems.Rpgz, EisDocumentTypes.TenderPlan2020, null, null);
        Assert.True(await repository.EnqueueAsync(candidate));
        var claimed = await repository.ClaimNextAsync();
        Assert.NotNull(claimed);

        // <purchaseNumber> плана-графика — это 0001, 0002…, а не номер закупки.
        await repository.PersistDocumentAsync(claimed!.Id, new ParsedEisDocument
        {
            FileName = "tenderPlan2020.xml",
            DocumentSha256 = new string('d', 64),
            Kind = EisDocumentKind.TenderPlan,
            PurchaseNumber = "0001",
            CustomerInn = "4629040439",
        });

        Assert.Equal(0, await db.Purchases.CountAsync());
        Assert.Equal(1, await db.RawDocuments.CountAsync());
        Assert.Equal("TenderPlan", await db.RawDocuments.Select(r => r.DocumentKind).SingleAsync());
    }

    [Fact]
    public async Task ContractWithSubcontractors_PersistsContractorsAndLinks()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<EisDbContext>().UseSqlite(connection).Options;
        using var db = new EisDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var repository = new EisPipelineRepository(db);

        var candidate = new ArchiveCandidate(
            "https://example.test/contract.zip", "31", EisSubsystems.Priz, "contract", null, null);
        Assert.True(await repository.EnqueueAsync(candidate));
        var claimed = await repository.ClaimNextAsync();
        Assert.NotNull(claimed);

        var contract = new ParsedEisDocument
        {
            FileName = "contract.xml",
            DocumentSha256 = new string('e', 64),
            Kind = EisDocumentKind.Contract,
            RegNumber = "2462904043925000011",
            PurchaseNumber = "0144200001825000020",
            CustomerInn = "4629040439",
            SupplierInn = "4621009123",
            Price = 271_568_111.92m,
            Subcontractors =
            [
                new SubcontractorDto(
                    "4632306640", "463201001", "ООО «Лидер Групп»", "30", "СМП",
                    0m, "2026-10-28", "01/09/26/20Р", "Услуги", "42.11.20.200"),
                new SubcontractorDto(
                    "463227720470", null, "Кочетков Юрий Алексеевич", "30", "СМП",
                    0m, "2026-03-18", "Д-73", "Услуги", "42.11.20.200"),
            ],
        };

        await repository.PersistDocumentAsync(claimed!.Id, contract);
        // Повторный разбор того же XML не должен плодить связи.
        await repository.PersistDocumentAsync(claimed.Id, contract);

        Assert.Equal(1, await db.Contracts.CountAsync());
        Assert.Equal(2, await db.ContractSubcontractors.CountAsync());
        // Заказчик, поставщик и два субподрядчика — все в справочнике.
        Assert.Equal(4, await db.Contractors.CountAsync());

        var link = await db.ContractSubcontractors.SingleAsync(item => item.Inn == "4632306640");
        Assert.Equal("01/09/26/20Р", link.DocumentNumber);
        Assert.Equal("30", link.StatusCode);
        Assert.Equal("42.11.20.200", link.Okpd2Code);

        var contractor = await db.Contractors.SingleAsync(item => item.Inn == "4632306640");
        Assert.True(contractor.IsSmp);
        Assert.False(contractor.IsSono);
        Assert.Equal("eis", contractor.Source);
        Assert.Null(contractor.FnsCheckedAt);

        // ИП хранится по ИНН так же, как юрлицо.
        Assert.NotNull(await db.Contractors.SingleOrDefaultAsync(item => item.Inn == "463227720470"));
    }
}
