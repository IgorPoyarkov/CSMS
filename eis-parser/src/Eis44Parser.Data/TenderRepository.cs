using Eis44Parser.Core.Models;
using Eis44Parser.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Eis44Parser.Data;

/// <inheritdoc />
public sealed class TenderRepository : ITenderRepository
{
    private readonly EisDbContext _db;

    public TenderRepository(EisDbContext db)
    {
        _db = db;
    }

    /// <inheritdoc />
    public async Task<SaveResult> SaveAsync(
        IEnumerable<TenderDto> tenders,
        CancellationToken cancellationToken = default)
    {
        var inserted = 0;
        var updated = 0;
        var skipped = 0;
        var now = DateTime.UtcNow;

        foreach (var tender in tenders)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var existing = await FindExistingAsync(tender, cancellationToken).ConfigureAwait(false);
            if (existing is not null && !IsChanged(existing, tender))
            {
                skipped++;
                continue;
            }

            if (existing is null)
            {
                _db.Tenders.Add(new TenderRecord
                {
                    PurchaseNumber = Normalize(tender.PurchaseNumber),
                    SchemeVersion = tender.SchemeVersion,
                    ObjectInfo = tender.ObjectInfo,
                    MaxPrice = tender.MaxPrice,
                    CustomerInn = tender.CustomerInn,
                    PublishDate = tender.PublishDate,
                    SourceFile = tender.FileName,
                    ArchiveUrl = tender.ArchiveUrl,
                    SubsystemType = tender.SubsystemType,
                    DocumentType = tender.DocumentType,
                    ParsedAt = now,
                    UpdatedAt = now,
                    RawXml = tender.RawXml,
                });
                inserted++;
            }
            else
            {
                existing.SchemeVersion = tender.SchemeVersion;
                existing.ObjectInfo = tender.ObjectInfo;
                existing.MaxPrice = tender.MaxPrice;
                existing.CustomerInn = tender.CustomerInn;
                existing.PublishDate = tender.PublishDate;
                existing.ArchiveUrl = tender.ArchiveUrl;
                existing.RawXml = tender.RawXml;
                existing.UpdatedAt = now;
                updated++;
            }
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new SaveResult(inserted, updated, skipped);
    }

    private async Task<TenderRecord?> FindExistingAsync(
        TenderDto tender,
        CancellationToken cancellationToken)
    {
        var number = Normalize(tender.PurchaseNumber);
        if (number is not null)
        {
            return await _db.Tenders
                .SingleOrDefaultAsync(record => record.PurchaseNumber == number, cancellationToken)
                .ConfigureAwait(false);
        }

        return await _db.Tenders
            .SingleOrDefaultAsync(
                record => record.SourceFile == tender.FileName && record.ArchiveUrl == tender.ArchiveUrl,
                cancellationToken)
            .ConfigureAwait(false);
    }

    private static bool IsChanged(TenderRecord record, TenderDto tender) =>
        !string.Equals(record.SchemeVersion, tender.SchemeVersion, StringComparison.Ordinal) ||
        !string.Equals(record.PublishDate, tender.PublishDate, StringComparison.Ordinal) ||
        !string.Equals(record.ObjectInfo, tender.ObjectInfo, StringComparison.Ordinal) ||
        record.MaxPrice != tender.MaxPrice;

    private static string? Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
