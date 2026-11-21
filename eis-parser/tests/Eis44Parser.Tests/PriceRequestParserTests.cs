using System.Xml.Linq;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Tests;

/// <summary>
/// Маппинг реальной печатной формы fcsRequestForQuotation. Запрос ценовых
/// предложений не содержит purchaseNumber/ИКЗ, поэтому важно, что он не
/// попадает в Purchases, а разбирается отдельным парсером.
/// </summary>
public sealed class PriceRequestParserTests
{
    private static XDocument Load(string name) => XDocument.Load(Path.Combine("test-data", name));

    [Fact]
    public void ParsesRealRequestForQuotation()
    {
        var document = Load("pricerequest-fcsRequestForQuotation-real.xml");

        var result = new PriceRequestParser().Parse(document, "fcsRequestForQuotation.xml");

        Assert.Equal(3523485, result.Id);
        Assert.Equal("01", result.VersionNumber);
        Assert.Equal("Подготовка", result.State);
        Assert.Equal("01442000018", result.PublishingOrgRegNum);
        Assert.Equal("4629040439", result.PublishingOrgInn);
        Assert.Equal("463201001", result.PublishingOrgKpp);
        Assert.Contains("КУРСКАВТОДОР", result.PublishingOrgName!, StringComparison.Ordinal);
        Assert.Equal("https://zakupki.gov.ru/epz/pricereq/card/common-info.html?priceRequestId=3523485", result.CardUrl);
        Assert.Equal("ttt@yy.eu", result.ContactEmail);
        Assert.Equal("435-35-3454334-345", result.ContactPhone);
        Assert.Equal("апр апр ар", result.ContactPerson);
        Assert.Equal("2026-11-21T22:22:00+03:00", result.RequestStart);
        Assert.Equal("2026-11-27T22:22:00+03:00", result.RequestEnd);
        Assert.Equal(6, result.Conditions.Count);
        Assert.Contains("вапвап", result.Conditions["addInfo"], StringComparison.Ordinal);
    }

    [Fact]
    public void ParsesProductWithOkpd2AndOkei()
    {
        var document = Load("pricerequest-fcsRequestForQuotation-real.xml");

        var result = new PriceRequestParser().Parse(document, "fcsRequestForQuotation.xml");

        var product = Assert.Single(result.Products);
        Assert.Equal("58.11.11.000", product.Okpd2Code);
        Assert.Equal("Учебники печатные общеобразовательного назначения", product.Okpd2Name);
        Assert.Equal("sdf", product.Name);
        Assert.Equal("959", product.OkeiCode);
        Assert.Equal("Автомобиле-день", product.OkeiName);
        Assert.Equal(4m, product.Quantity);
    }

    [Fact]
    public void EisDocumentParserTreatsPriceRequestAsSeparateKind()
    {
        var document = Load("pricerequest-fcsRequestForQuotation-real.xml");

        var result = new EisDocumentParser().Parse(document, "fcsRequestForQuotation.xml");

        Assert.Equal(EisDocumentKind.PriceRequest, result.Kind);
        Assert.Null(result.PurchaseNumber);
        Assert.False(string.IsNullOrWhiteSpace(result.RawXml));
    }

    [Fact]
    public void RejectsWrongRoot()
    {
        var document = XDocument.Parse("<root><id>1</id></root>");

        Assert.Throws<ArgumentException>(() => new PriceRequestParser().Parse(document, "wrong.xml"));
    }
}
