using System.Xml.Linq;
using Eis44Parser.Core;
using Xunit;

namespace Eis44Parser.Tests;

/// <summary>Проверки устойчивого парсинга XML разных версий схем ЕИС.</summary>
public sealed class TenderXmlParserTests
{
    [Fact]
    public void Parse_IgnoresNamespacePrefixAndReadsSchemeVersion()
    {
        var xml = """
            <ns:epNotificationEF2020 xmlns:ns="http://zakupki.gov.ru" schemeVersion="15.0">
              <ns:purchaseNumber>01234567890123456789</ns:purchaseNumber>
              <ns:purchaseObjectInfo>Поставка компьютеров</ns:purchaseObjectInfo>
              <ns:maxPrice>12345.67</ns:maxPrice>
              <ns:INN>7700000000</ns:INN>
              <ns:publishDTInEIS>2026-11-18</ns:publishDTInEIS>
            </ns:epNotificationEF2020>
            """;

        var dto = new TenderXmlParser().Parse(XDocument.Parse(xml), "notice.xml");

        Assert.Equal("notice.xml", dto.FileName);
        Assert.Equal("15.0", dto.SchemeVersion);
        Assert.Equal("01234567890123456789", dto.PurchaseNumber);
        Assert.Equal("Поставка компьютеров", dto.ObjectInfo);
        Assert.Equal(12345.67m, dto.MaxPrice);
        Assert.Equal("7700000000", dto.CustomerInn);
        Assert.Equal("2026-11-18", dto.PublishDate);
        Assert.Contains("schemeVersion", dto.RawXml, StringComparison.Ordinal);
    }

    [Fact]
    public void Parse_CommaDecimalAndUnknownVersion()
    {
        var xml = """
            <notification xmlns="http://zakupki.gov.ru">
              <maxPrice>1 234,50</maxPrice>
              <reestrNumber>01234567890123456789</reestrNumber>
            </notification>
            """;

        var dto = new TenderXmlParser().Parse(XDocument.Parse(xml), "old.xml");

        Assert.Equal("unknown", dto.SchemeVersion);
        Assert.Equal(1234.50m, dto.MaxPrice);
        Assert.Equal("01234567890123456789", dto.PurchaseNumber);
    }
}
