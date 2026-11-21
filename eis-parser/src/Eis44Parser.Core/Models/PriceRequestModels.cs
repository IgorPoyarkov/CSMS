namespace Eis44Parser.Core.Models;

/// <summary>Позиция запроса ценовых предложений (закупка до 100 тыс. руб.).</summary>
public sealed record PriceRequestProduct(
    string? Okpd2Code,
    string? Okpd2Name,
    string Name,
    string? OkeiCode,
    string? OkeiName,
    decimal? Quantity);

/// <summary>
/// Печатная форма fcsRequestForQuotation. В отличие от извещения, здесь нет
/// purchaseNumber и ИКЗ, поэтому документ хранится отдельно, а не в purchases.
/// </summary>
public sealed record PriceRequestDocument(
    string FileName,
    long Id,
    string? VersionNumber,
    string? State,
    string? PublishingOrgRegNum,
    string? PublishingOrgName,
    string? PublishingOrgInn,
    string? PublishingOrgKpp,
    string? CardUrl,
    string? PrintFormUrl,
    string? ObjectInfo,
    string? ContactPerson,
    string? ContactEmail,
    string? ContactPhone,
    string? RequestStart,
    string? RequestEnd,
    string? PurchaseStart,
    string? PurchaseEnd,
    IReadOnlyList<PriceRequestProduct> Products,
    IReadOnlyDictionary<string, string> Conditions,
    string RawXml);
