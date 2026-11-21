using System.Xml.Linq;

namespace Eis44Parser.Core;

/// <summary>
/// Публичный источник правил нормирования: поисковая страница ЕИС и печатная
/// форма в XML. Не требует токена getDocsIP, ГОСТ-туннеля и личного кабинета.
///
/// Источник: https://zakupki.gov.ru/epz/normalizationrules/search/results.html
/// В карточке правила берём printFormId из ссылки printForm/view.html и меняем
/// view.html на viewXml.html — получаем тот же документ в машиночитаемом виде.
/// </summary>
public sealed class NormalizationRulesClient
{
    public const string SearchUrl = "https://zakupki.gov.ru/epz/normalizationrules/search/results.html";

    private const string XmlUrl =
        "https://zakupki.gov.ru/epz/normalizationrules/printForm/viewXml.html?printFormId={0}";

    private readonly HttpClient _http;

    public NormalizationRulesClient(HttpClient http)
    {
        ArgumentNullException.ThrowIfNull(http);
        _http = http;
        if (!_http.DefaultRequestHeaders.UserAgent.Any())
        {
            _http.DefaultRequestHeaders.UserAgent.ParseAdd("EIS44-Parser/1.0");
        }
    }

    /// <summary>Скачать XML печатной формы по printFormId из карточки правила.</summary>
    public async Task<XDocument> GetPrintFormXmlAsync(int printFormId, CancellationToken cancellationToken = default)
    {
        if (printFormId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(printFormId), "printFormId должен быть положительным.");
        }

        using var response = await _http
            .GetAsync(string.Format(XmlUrl, printFormId), cancellationToken)
            .ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        var document = XDocument.Parse(content);
        if (!NormalizationRulesParser.IsRegulationRules(document))
        {
            throw new InvalidDataException(
                $"printFormId={printFormId} вернул не fcsRegulationRules, а {document.Root?.Name.LocalName ?? "пустой документ"}.");
        }

        return document;
    }
}
