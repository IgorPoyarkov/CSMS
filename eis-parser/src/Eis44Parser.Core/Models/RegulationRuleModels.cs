namespace Eis44Parser.Core.Models;

/// <summary>Вложение версии правил нормирования (тип документа по XSD 17.0).</summary>
public sealed record RegulationRuleAttachment(
    string ContentId,
    string FileName,
    string? Description,
    long? FileSize,
    string Url,
    int TypeCode,
    string TypeName,
    string? PlacingDate);

/// <summary>
/// Версия правил нормирования в сфере закупок (fcsRegulationRules).
/// Публичный XML печатаемой формы из реестра правил нормирования ЕИС —
/// авторитетный источник для проверки нормативов в плане-графике по 44-ФЗ.
/// </summary>
public sealed record RegulationRuleDocument(
    string FileName,
    long Id,
    string RegistryNumber,
    string? PublishDate,
    int TypeCode,
    string TypeName,
    string? State,
    string? PublishingOrgName,
    string? PublishingOrgRegNum,
    string? PublishingOrgInn,
    string? PublishingOrgKpp,
    string? ApprovingOrgName,
    bool ApprovedByGovernment,
    IReadOnlyList<string> ApprovedFor,
    IReadOnlyList<string> RegionCodes,
    IReadOnlyList<string> RegionNames,
    string? BaseDocumentName,
    string? BaseDocumentNumber,
    string? BaseDocumentDate,
    int? BaseDocumentTypeCode,
    string? BaseDocumentTypeName,
    string? AdditionalInfo,
    string? DiscussionStart,
    string? DiscussionEnd,
    IReadOnlyList<RegulationRuleAttachment> Attachments,
    string RawXml);
