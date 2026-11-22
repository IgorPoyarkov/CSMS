using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Eis44Parser.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Data.Services;

/// <summary>Итог одного прохода обогащения справочника подрядчиков.</summary>
public sealed record ContractorEnrichmentResult(int Requested, int Updated, int Skipped);

/// <summary>
/// Дозаполняет карточки подрядчиков данными ФНС. В справочник попадают все
/// контрагенты из XML (заказчики, поставщики, субподрядчики), а обогащение
/// идёт по ИНН независимо от роли — поэтому субподрядчик, ставший
/// генподрядчиком, уже имеет готовую карточку.
/// </summary>
public sealed class ContractorEnrichmentService(
    EisDbContext db,
    IFnsContractorClient client,
    IOptions<FnsOptions> options,
    ILogger<ContractorEnrichmentService> logger)
{
    /// <summary>
    /// Обновить до <paramref name="limit"/> карточек. Если задан ИНН —
    /// обновляется только он, без учёта срока кэша (ручная проверка).
    /// </summary>
    public async Task<ContractorEnrichmentResult> EnrichAsync(
        int limit = 100,
        string? inn = null,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var now = DateTimeOffset.UtcNow;
        var staleBefore = now.AddDays(-Math.Max(1, settings.CacheDays));

        var query = db.Contractors.AsQueryable();

        if (!string.IsNullOrWhiteSpace(inn))
        {
            var normalized = inn.Trim();
            query = query.Where(item => item.Inn == normalized);
        }
        else
        {
            // Карточки, которые ещё ни разу не проверяли, идут первыми.
            query = query.Where(item => item.FnsCheckedAt == null || item.FnsCheckedAt < staleBefore);
        }

        var contractors = await query
            .OrderBy(item => item.FnsCheckedAt)
            .ThenBy(item => item.Id)
            .Take(Math.Max(1, limit))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var updated = 0;
        foreach (var contractor in contractors)
        {
            var info = await client.GetByInnAsync(contractor.Inn, cancellationToken).ConfigureAwait(false);
            if (info is null)
            {
                continue;
            }

            Apply(contractor, info, now);
            updated += 1;

            // Сохраняем пачками: у крупного заказчика контрагентов сотни.
            if (updated % 50 == 0)
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
        }

        if (updated > 0)
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        logger.LogInformation(
            "ФНС ({Provider}): обновлено {Updated} из {Requested} карточек",
            client.ProviderName,
            updated,
            contractors.Count);

        return new ContractorEnrichmentResult(contractors.Count, updated, contractors.Count - updated);
    }

    private static void Apply(ContractorRecord contractor, ContractorInfo info, DateTimeOffset now)
    {
        // Пустые поля ответа не затирают уже известные значения.
        contractor.Kpp = info.Kpp ?? contractor.Kpp;
        contractor.Name = info.Name ?? contractor.Name;
        contractor.FullName = info.FullName ?? contractor.FullName;
        contractor.Ogrn = info.Ogrn ?? contractor.Ogrn;
        contractor.Address = info.Address ?? contractor.Address;
        contractor.FnsStatus = info.Status ?? contractor.FnsStatus;
        contractor.IsSmp = info.IsSmp ?? contractor.IsSmp;
        contractor.IsSono = info.IsSono ?? contractor.IsSono;
        contractor.Source = info.Source;
        contractor.FnsCheckedAt = now;
        contractor.FnsPayload = info.RawJson;
        contractor.UpdatedAt = now;
    }
}
