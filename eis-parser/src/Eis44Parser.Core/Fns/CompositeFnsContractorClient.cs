using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Core.Fns;

/// <summary>
/// Выбирает провайдера ФНС по настройке Fns:Provider и пробует второй,
/// если первый не ответил. api-fns.ru даёт более полную карточку, но требует
/// ключ; «Прозрачный бизнес» работает без ключа и годится как резерв.
/// </summary>
public sealed class CompositeFnsContractorClient(
    ApiFnsContractorClient apiFns,
    TransparentBusinessContractorClient transparent,
    IOptions<FnsOptions> options,
    ILogger<CompositeFnsContractorClient> logger) : IFnsContractorClient
{
    public string ProviderName => options.Value.Provider;

    public async Task<ContractorInfo?> GetByInnAsync(
        string inn,
        CancellationToken cancellationToken = default)
    {
        var provider = options.Value.Provider?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(provider) || provider == "none")
        {
            return null;
        }

        // Порядок зависит от выбранного провайдера; второй — резерв.
        IFnsContractorClient[] clients = provider == "transparent"
            ? [transparent, apiFns]
            : [apiFns, transparent];

        foreach (var client in clients)
        {
            var info = await client.GetByInnAsync(inn, cancellationToken).ConfigureAwait(false);
            if (info is not null)
            {
                return info;
            }
        }

        logger.LogDebug("ФНС: карточка по ИНН {Inn} не найдена ни одним провайдером", inn);
        return null;
    }
}
