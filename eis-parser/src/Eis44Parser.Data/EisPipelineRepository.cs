using System.Security.Cryptography;
using System.Text;
using Eis44Parser.Core.Models;
using Eis44Parser.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Eis44Parser.Data;

/// <inheritdoc />
public sealed class EisPipelineRepository(EisDbContext db) : IEisPipelineRepository
{
    // После пяти неудач задача требует ручного разбора, а не бесконечных ретраев.
    private const int MaxAttempts = 5;

    /// <inheritdoc />
    public async Task<bool> EnqueueAsync(
        ArchiveCandidate candidate,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(candidate.ArchiveUrl))
        {
            throw new ArgumentException("Пустая ссылка на архив ЕИС.", nameof(candidate));
        }

        var hash = Sha256(candidate.ArchiveUrl);
        if (await db.ArchiveQueue.AnyAsync(item => item.UrlSha256 == hash, cancellationToken)
                .ConfigureAwait(false))
        {
            return false;
        }

        var now = DateTimeOffset.UtcNow;
        db.ArchiveQueue.Add(new EisArchiveQueueRecord
        {
            ArchiveUrl = candidate.ArchiveUrl,
            UrlSha256 = hash,
            RegionCode = candidate.RegionCode,
            SubsystemType = candidate.SubsystemType,
            DocumentType = candidate.DocumentType,
            PeriodStart = candidate.PeriodStart,
            PeriodEnd = candidate.PeriodEnd,
            Status = "pending",
            EnqueuedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <inheritdoc />
    public async Task<EisArchiveQueueRecord?> ClaimNextAsync(CancellationToken cancellationToken = default)
    {
        var item = await db.ArchiveQueue
            .Where(entry => entry.Status == "pending")
            // Порядок вставки совпадает с порядком постановки в очередь;
            // ORDER BY DateTimeOffset не поддерживается SQLite в тестах.
            .OrderBy(entry => entry.Id)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            return null;
        }

        item.Status = "downloading";
        item.Attempts++;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return item;
    }

    /// <inheritdoc />
    public async Task MarkDownloadedAsync(
        long id,
        ArchiveFile archive,
        CancellationToken cancellationToken = default)
    {
        var item = await FindAsync(id, cancellationToken).ConfigureAwait(false);
        item.Status = "downloaded";
        item.ArchiveSha256 = archive.Sha256;
        item.ArchiveSizeBytes = archive.SizeBytes;
        item.LocalPath = archive.LocalPath;
        item.LastError = null;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task MarkFailedAsync(long id, string error, CancellationToken cancellationToken = default)
    {
        var item = await FindAsync(id, cancellationToken).ConfigureAwait(false);
        item.Status = item.Attempts >= MaxAttempts ? "failed" : "pending";
        item.LastError = error.Length <= 2000 ? error : error[..2000];
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task MarkProcessedAsync(long id, CancellationToken cancellationToken = default)
    {
        var item = await FindAsync(id, cancellationToken).ConfigureAwait(false);
        var now = DateTimeOffset.UtcNow;
        item.Status = "processed";
        item.ProcessedAt = now;
        item.UpdatedAt = now;
        item.LastError = null;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task PersistDocumentAsync(
        long archiveId,
        ParsedEisDocument document,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var raw = await db.RawDocuments
            .SingleOrDefaultAsync(item => item.ArchiveId == archiveId && item.FileName == document.FileName,
                cancellationToken)
            .ConfigureAwait(false);

        if (raw is null)
        {
            raw = new RawDocumentRecord
            {
                ArchiveId = archiveId,
                FileName = document.FileName,
                ParsedAt = DateTimeOffset.UtcNow,
            };
            db.RawDocuments.Add(raw);
        }

        raw.DocumentSha256 = document.DocumentSha256;
        raw.SchemeVersion = document.SchemeVersion;
        raw.DocumentKind = document.Kind.ToString();
        raw.RawXml = document.RawXml;

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        switch (document.Kind)
        {
            case EisDocumentKind.Purchase:
                await UpsertPurchaseAsync(document, raw.Id, cancellationToken).ConfigureAwait(false);
                break;
            case EisDocumentKind.Contract:
                await UpsertContractAsync(document, raw.Id, cancellationToken).ConfigureAwait(false);
                break;
            // Этапы исполнения хранятся в raw_documents, но не перезаписывают
            // основную запись контракта: у них нет ИКЗ, цены и поставщика.
            case EisDocumentKind.ContractProcedure:
                break;
            // Планы-графики тоже пока только сырой XML: их purchaseNumber —
            // номера позиций, запись в purchases была бы неверной.
            case EisDocumentKind.TenderPlan:
                break;
        }
    }

    private async Task UpsertPurchaseAsync(
        ParsedEisDocument document,
        long rawId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(document.PurchaseNumber))
        {
            // Без номера нельзя гарантировать идемпотентность — сырой XML уже сохранён.
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var purchase = await db.Purchases
            .SingleOrDefaultAsync(item => item.PurchaseNumber == document.PurchaseNumber, cancellationToken)
            .ConfigureAwait(false);

        if (purchase is null)
        {
            purchase = new PurchaseRecord
            {
                PurchaseNumber = document.PurchaseNumber!,
                CreatedAt = now,
            };
            db.Purchases.Add(purchase);
        }

        purchase.Ikz = document.Ikz;
        purchase.CustomerInn = document.CustomerInn;
        purchase.CustomerKpp = document.CustomerKpp;
        purchase.Nmck = document.Price;
        purchase.ObjectInfo = document.ObjectInfo;
        purchase.PublishDate = document.PublishDate;
        purchase.DocumentType = null;
        purchase.SchemeVersion = document.SchemeVersion;
        purchase.RawDocumentId = rawId;
        purchase.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        foreach (var item in document.Items)
        {
            var existing = await db.PurchaseItems
                .SingleOrDefaultAsync(entry => entry.PurchaseId == purchase.Id && entry.LineNo == item.LineNo,
                    cancellationToken)
                .ConfigureAwait(false);

            if (existing is null)
            {
                db.PurchaseItems.Add(new PurchaseItemRecord
                {
                    PurchaseId = purchase.Id,
                    LineNo = item.LineNo,
                    KtruCode = item.KtruCode,
                    Okpd2Code = item.Okpd2Code,
                    ItemName = item.ItemName,
                    Quantity = item.Quantity,
                    Price = item.Price,
                    RawDocumentId = rawId,
                });
            }
            else
            {
                existing.KtruCode = item.KtruCode;
                existing.Okpd2Code = item.Okpd2Code;
                existing.ItemName = item.ItemName;
                existing.Quantity = item.Quantity;
                existing.Price = item.Price;
            }
        }

        await UpsertParticipantAsync(
            purchaseId: purchase.Id,
            contractId: null,
            role: "customer",
            inn: document.CustomerInn,
            kpp: document.CustomerKpp,
            name: document.CustomerName,
            rawId,
            cancellationToken);

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task UpsertContractAsync(
        ParsedEisDocument document,
        long rawId,
        CancellationToken cancellationToken)
    {
        var number = document.RegNumber ?? document.PurchaseNumber;
        if (string.IsNullOrWhiteSpace(number))
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var contract = await db.Contracts
            .SingleOrDefaultAsync(item => item.RegNumber == number, cancellationToken)
            .ConfigureAwait(false);

        if (contract is null)
        {
            contract = new ContractRecord { RegNumber = number!, CreatedAt = now };
            db.Contracts.Add(contract);
        }

        contract.PurchaseNumber = document.PurchaseNumber;
        contract.Ikz = document.Ikz;
        contract.CustomerInn = document.CustomerInn;
        contract.CustomerKpp = document.CustomerKpp;
        contract.SupplierInn = document.SupplierInn;
        contract.SupplierKpp = document.SupplierKpp;
        contract.ContractPrice = document.Price;
        contract.ContractDate = document.PublishDate;
        contract.RawDocumentId = rawId;
        contract.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        await UpsertParticipantAsync(contract.Id, null, "customer", document.CustomerInn,
            document.CustomerKpp, document.CustomerName, rawId, cancellationToken);
        await UpsertParticipantAsync(contract.Id, null, "supplier", document.SupplierInn,
            document.SupplierKpp, document.SupplierName, rawId, cancellationToken);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task UpsertParticipantAsync(
        long? purchaseId,
        long? contractId,
        string role,
        string? inn,
        string? kpp,
        string? name,
        long rawId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(inn))
        {
            return;
        }

        var existing = await db.Participants
            .SingleOrDefaultAsync(participant =>
                    participant.PurchaseId == purchaseId &&
                    participant.ContractId == contractId &&
                    participant.Role == role &&
                    participant.Inn == inn &&
                    participant.Kpp == kpp,
                cancellationToken)
            .ConfigureAwait(false);

        if (existing is null)
        {
            db.Participants.Add(new ParticipantRecord
            {
                PurchaseId = purchaseId,
                ContractId = contractId,
                Role = role,
                Inn = inn,
                Kpp = kpp,
                Name = name,
                RawDocumentId = rawId,
            });
        }
        else
        {
            existing.Name = name;
            existing.RawDocumentId = rawId;
        }
    }

    private async Task<EisArchiveQueueRecord> FindAsync(long id, CancellationToken cancellationToken) =>
        await db.ArchiveQueue.FindAsync([id], cancellationToken)
        .ConfigureAwait(false) ?? throw new InvalidOperationException($"Задача архива {id} не найдена.");

    private static string Sha256(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}
