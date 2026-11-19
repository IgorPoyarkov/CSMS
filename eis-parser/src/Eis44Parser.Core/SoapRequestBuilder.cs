using System.Globalization;
using System.Xml.Linq;

namespace Eis44Parser.Core;

/// <summary>
/// Сборка SOAP-конвертов для getDocsIP. Валидатор ЕИС проверяет XML по
/// xs:sequence, поэтому порядок тегов здесь фиксирован и менять его нельзя.
/// Экранирование спецсимволов выполняет сам XElement — ручной вызов
/// SecurityElement.Escape привёл бы к двойному экранированию (&amp;amp;).
/// </summary>
public static class SoapRequestBuilder
{
    private const string SoapNamespace = "http://xmlsoap.org";
    private const string EisNamespace = "http://zakupki.gov.ru";

    /// <summary>
    /// Запрос извещений по региону за конкретную дату.
    /// </summary>
    public static string BuildRegionRequest(
        string token,
        string regionCode,
        string documentType44,
        DateTime date,
        string subsystemType,
        string mode,
        Guid requestId,
        DateTime createdAt)
    {
        return BuildEnvelope(token, new XElement(
            XNamespace.Get(EisNamespace) + "getDocsByOrgRegionRequest",
            BuildIndex(requestId, createdAt, mode),
            new XElement("selectionParams",
                new XElement("orgRegion", regionCode),
                new XElement("subsystemType", subsystemType),
                new XElement("documentType44", documentType44),
                new XElement("periodInfo",
                    new XElement("exactDate", date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture))))));
    }

    /// <summary>
    /// Точечный запрос по 19-значному номеру закупки.
    /// </summary>
    public static string BuildReestrNumberRequest(
        string token,
        string reestrNumber,
        string subsystemType,
        string mode,
        Guid requestId,
        DateTime createdAt)
    {
        return BuildEnvelope(token, new XElement(
            XNamespace.Get(EisNamespace) + "getDocsByReestrNumberRequest",
            BuildIndex(requestId, createdAt, mode),
            new XElement("selectionParams",
                new XElement("subsystemType", subsystemType),
                new XElement("reestrNumber", reestrNumber))));
    }

    /// <summary>
    /// Запрос выгрузки справочника НСИ (getNsiRequest). Порядок тегов и
    /// допустимые значения nsiKind — по getDocsIP-ws-api.xsd 17.0 (line 687+):
    /// index, затем selectionParams{nsiCode44, nsiKind}.
    /// Пространство имён конверта повторяет остальные методы этого сервиса.
    /// </summary>
    public static string BuildNsiRequest(
        string token,
        string nsiCode,
        string nsiKind,
        string mode,
        Guid requestId,
        DateTime createdAt)
    {
        if (string.IsNullOrWhiteSpace(nsiCode))
        {
            throw new ArgumentException("Не задан код справочника ЕИС (nsiCode44).", nameof(nsiCode));
        }

        if (nsiKind is not ("all" or "inc"))
        {
            throw new ArgumentException("nsiKind может быть только all или inc.", nameof(nsiKind));
        }

        return BuildEnvelope(token, new XElement(
            XNamespace.Get(EisNamespace) + "getNsiRequest",
            BuildIndex(requestId, createdAt, mode),
            new XElement("selectionParams",
                new XElement("nsiCode44", nsiCode),
                new XElement("nsiKind", nsiKind))));
    }

    private static XElement BuildIndex(Guid requestId, DateTime createdAt, string mode) =>
        new("index",
            new XElement("id", requestId.ToString("D")),
            new XElement("createDateTime", createdAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)),
            new XElement("mode", mode));

    private static string BuildEnvelope(string token, XElement body)
    {
        XNamespace soap = SoapNamespace;
        var envelope = new XElement(
            soap + "Envelope",
            new XAttribute(XNamespace.Xmlns + "soapenv", SoapNamespace),
            new XAttribute(XNamespace.Xmlns + "ws", EisNamespace),
            new XElement(soap + "Header",
                new XElement("individualPerson_token", token)),
            new XElement(soap + "Body", body));

        return envelope.ToString(SaveOptions.DisableFormatting);
    }
}
