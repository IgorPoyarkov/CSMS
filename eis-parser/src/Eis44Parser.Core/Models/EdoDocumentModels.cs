namespace Eis44Parser.Core.Models;

/// <summary>
/// Сообщение электронного документооборота с Казначейством (DP_IZVPOL — извещение
/// о получении, DP_PDOTPR — подтверждение). Нужно фронту для цепочки согласования
/// и формирования пакета документов. Подпись хранится длиной, чтобы не тащить
/// мегабайты base64 в JSON; сам XML остаётся в исходном файле.
/// </summary>
public sealed record EdoMessageDto(
    string FileName,
    string FileId,
    string? FormVersion,
    string MessageType,
    string? Knd,
    string? OperatorName,
    string? OperatorInn,
    string? OperationId,
    string? EventDate,
    string? EventTime,
    string? PostedFileName,
    string? DocumentName,
    string? DocumentNumber,
    string? DocumentDate,
    IReadOnlyList<EdoParticipantDto> Participants,
    string? SignatoryPosition,
    string? SignatoryName,
    int SignatureLength);

/// <summary>Участник ЭДО (отправитель или получатель документа).</summary>
public sealed record EdoParticipantDto(
    string Role,
    string? ParticipantId,
    string? Name,
    string? Inn,
    string? Kpp);

/// <summary>
/// Решение заказчика по результатам приёмки (ОН_АКТРЕЗРАБЗ, КНД 1110336):
/// ссылка на акт, код операции приёмки и подписанты. Без этой проекции нельзя
/// сформировать полный пакет документов по приёмке.
/// </summary>
public sealed record AcceptanceDecisionDto(
    string FileName,
    string FileId,
    string? FormVersion,
    string? Knd,
    string? InfoDate,
    string? InfoTime,
    string? CustomerName,
    string? ActFileId,
    string? ActFileDate,
    string? ActFileTime,
    string? PostedDocumentNumber,
    string? PostedDocumentDate,
    string? OperationCode,
    string? RefusalDocumentId,
    IReadOnlyList<AcceptanceSignatoryDto> Signatories,
    int SignatureLength);
