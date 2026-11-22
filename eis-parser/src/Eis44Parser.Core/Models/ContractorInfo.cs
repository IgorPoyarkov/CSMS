namespace Eis44Parser.Core.Models;

/// <summary>
/// Карточка контрагента из API ФНС. Поля необязательные: разные провайдеры
/// отдают разный набор, а часть данных (СМП/СОНО) может отсутствовать.
/// </summary>
public sealed record ContractorInfo(
    string Inn,
    string? Kpp,
    string? Name,
    string? FullName,
    string? Ogrn,
    string? Address,
    string? Status,
    bool? IsSmp,
    bool? IsSono,
    /// <summary>api-fns | transparent.</summary>
    string Source,
    string? RawJson);
