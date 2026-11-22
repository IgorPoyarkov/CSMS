namespace Eis44Parser.Core.Models;

/// <summary>
/// Полная проекция документа о приёмке (ОН_АКТРЕЗРАБП) для карточки контракта
/// и формирования документов на фронте. Это не сущность БД: XML остаётся в raw,
/// новые таблицы и кириллические поля в БД не добавляются.
/// </summary>
public sealed record AcceptanceActViewDto(
    string FileName,
    string FileId,
    string? SourceArchive,
    string? FormVersion,
    string RegNumber,
    string ActNumber,
    string? ActDate,
    string? Knd,
    string? InfoDate,
    string? InfoTime,
    string? ObjectName,
    string? CurrencyCode,
    ContractReferenceDto? Contract,
    StageReferenceDto? Stage,
    IReadOnlyList<AcceptancePartyDto> Parties,
    IReadOnlyList<AcceptanceWorkItemDto> WorkItems,
    AcceptanceTotalsDto Totals,
    AcceptancePeriodDto? Period,
    IReadOnlyList<AcceptanceAttachmentDto> Attachments,
    IReadOnlyList<AcceptanceSignatoryDto> Signatories);

/// <summary>Ссылка на контракт из блока ИдДог.</summary>
public sealed record ContractReferenceDto(
    string? Number,
    string? Date,
    string? GovernmentContractId,
    string? ContractVersionId);

/// <summary>
/// Ссылка на этап: ИдЭтапКонт — стабильный GUID этапа, ТехИдЭтапКонт — его
/// числовой идентификатор в ЕИС. Оба значения нужны фронту для связки акта с этапом.
/// </summary>
public sealed record StageReferenceDto(
    string? Sid,
    string? TechnicalSid,
    string? Ikz);

/// <summary>Сторона договора (подрядчик или заказчик) с реквизитами.</summary>
public sealed record AcceptancePartyDto(
    string Role,
    string? Name,
    string? ShortName,
    string? Inn,
    string? Kpp,
    string? ParticipantId,
    string? Address,
    string? Phone,
    string? Email,
    BankRequisitesDto? BankRequisites);

/// <summary>Банковские реквизиты стороны.</summary>
public sealed record BankRequisitesDto(
    string? PersonalAccount,
    string? BankBik,
    string? BankName,
    string? CorrespondentAccount,
    string? TreasuryAccount,
    string? CounterpartyName,
    string? RequisitesId);

/// <summary>
/// Строка работ/товаров в акте. ОКПД2 и КТРУ — разные классификаторы:
/// ОКПД2 имеет вид 42.11.20.200, код КТРУ — 01.13.43.110-00000002.
/// В ОН_АКТРЕЗРАБП КТРУ доступен идентификаторами блока СведТРУКонт.
/// </summary>
public sealed record AcceptanceWorkItemDto(
    string? LineNumber,
    string? Name,
    string? Okpd2Code,
    string? Okpd2Name,
    string? KtruCode,
    string? KtruId,
    string? TechnicalKtruId,
    string? EaKtruId,
    string? Quantity,
    string? UnitName,
    decimal? Price,
    decimal? SumWithoutVat,
    decimal? SumWithVat,
    string? VatRate,
    decimal? VatSum);

/// <summary>Итоги акта: без НДС, с НДС и сумма налога.</summary>
public sealed record AcceptanceTotalsDto(
    decimal? SumWithoutVat,
    decimal? SumWithVat,
    decimal? VatSum);

/// <summary>Период выполнения работ и даты предъявления/приёмки.</summary>
public sealed record AcceptancePeriodDto(
    string? StartDate,
    string? EndDate,
    string? PresentationDate,
    string? OperationContent);

/// <summary>Вложение акта (кс-2, ЖПР, исполнительная документация).</summary>
public sealed record AcceptanceAttachmentDto(
    string? ContentId,
    string? FileName,
    string? Hash,
    string? Extension,
    string? AttachedAt,
    string? DocumentKindName);

/// <summary>Подписант акта.</summary>
public sealed record AcceptanceSignatoryDto(
    string? Position,
    string? LastName,
    string? FirstName,
    string? MiddleName,
    string? AuthorityBasis);

/// <summary>
/// Платёжное поручение Казначейства: реестровый номер, сумма, дата, назначение
/// платежа и ссылка на документ о приёмке внутри назначения платежа.
/// </summary>
public sealed record PaymentOrderViewDto(
    string FileName,
    string? DocumentNumber,
    string? DocumentDate,
    string? ExecutionDate,
    decimal? Sum,
    string? RegNumber,
    string? Purpose,
    string? ContractNumber,
    string? ContractDate,
    string? AcceptanceDocumentNumber,
    string? AcceptanceDocumentDate,
    string? PayerInn,
    string? PayerKpp,
    string? PayerName,
    string? RecipientInn,
    string? RecipientKpp,
    string? RecipientName,
    string? Igk,
    string? DocumentId,
    string? ChargeOffDate,
    string? EdNo,
    string? EdDate,
    string? PayerBik,
    string? PayerAccount,
    string? PayerBankName,
    string? RecipBik,
    string? RecipAccount,
    string? RecipBankName,
    string? SumInWords,
    string? PaymentType,
    string? Kbk);

/// <summary>
/// Сведения о привлечении СМП/СОНО из XML контракта карточки ЕИС.
/// В карточке это подтаблица контракта: требуемый объём (процент и сумма),
/// ответственность за неисполнение условия и сами субподрядчики с реквизитами
/// субдоговоров. Требование (subcontractorsAttractionConditionsInfo) заполнено
/// у всех контрактов с ч. 5 ст. 30 44-ФЗ, а фактические субподрядчики
/// (subContractorsSum) появляются только когда заказчик их опубликовал.
/// </summary>
public sealed record ContractSmpViewDto(
    /// <summary>
    /// Требуемый объём в процентах: sumInPercents сведений о привлечении,
    /// а если их ещё нет — subcontractorsAttractionVolume условий контракта.
    /// </summary>
    decimal? RequirementPercent,
    /// <summary>Требуемый объём в рублях (priceValueRUR / priceValue).</summary>
    decimal? RequirementSum,
    /// <summary>Ответственность за неисполнение условия привлечения СМП.</summary>
    string? Responsibility,
    IReadOnlyList<SubcontractorDto> Subcontractors,
    string SourceFile);

/// <summary>Всё, что скачано по одному контракту, в одном DTO для фронта.</summary>
public sealed record ContractCardViewDto(
    string RegNumber,
    IReadOnlyList<AcceptanceActViewDto> Acts,
    IReadOnlyList<AcceptanceDecisionDto> Decisions,
    IReadOnlyList<PaymentOrderViewDto> Payments,
    IReadOnlyList<EdoMessageDto> Messages,
    IReadOnlyList<ContractExecutionViewDto> Executions,
    IReadOnlyList<string> SkippedFiles,
    /// <summary>Сведения о привлечении СМП/СОНО (подтаблица контракта).</summary>
    IReadOnlyList<ContractSmpViewDto> Smp);
