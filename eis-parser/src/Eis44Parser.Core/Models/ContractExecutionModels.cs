namespace Eis44Parser.Core.Models;

/// <summary>
/// Проекция исполнения контракта для карточки контракта: этап → документы о приёмке.
/// Это не сущность БД: данные читаются из сырого XML contractProcedure,
/// а сохранять их отдельными таблицами пока не нужно.
/// </summary>
public sealed record ContractExecutionViewDto(
    string FileName,
    string RegNumber,
    IReadOnlyList<ContractStageDto> Stages);

/// <summary>Этап исполнения. Если признака этапности нет — единственный этап с индексом 1.</summary>
public sealed record ContractStageDto(
    int Index,
    string? Sid,
    string? Name,
    string? StartDate,
    string? EndDate,
    int? OrdinalNumber,
    IReadOnlyList<ContractAcceptanceActDto> Acts);

/// <summary>Документ о приёмке внутри этапа.</summary>
public sealed record ContractAcceptanceActDto(
    string RegNumber,
    string? Sid,
    string? DocumentNumber,
    string? DocumentDate,
    string? AcceptanceDate,
    decimal? Sum,
    int? OrdinalNumber,
    string? GuidEdi);
