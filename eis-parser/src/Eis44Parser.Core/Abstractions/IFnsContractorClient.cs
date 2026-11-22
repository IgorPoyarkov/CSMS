using Eis44Parser.Core.Models;

namespace Eis44Parser.Core.Abstractions;

/// <summary>Источник карточек контрагентов по ИНН (api-fns.ru, «Прозрачный бизнес»).</summary>
public interface IFnsContractorClient
{
    /// <summary>Имя провайдера для поля contractors.source.</summary>
    string ProviderName { get; }

    /// <summary>Найти организацию по ИНН. null — не найдена или провайдер недоступен.</summary>
    Task<ContractorInfo?> GetByInnAsync(string inn, CancellationToken cancellationToken = default);
}
