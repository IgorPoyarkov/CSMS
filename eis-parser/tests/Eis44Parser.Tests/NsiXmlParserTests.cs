using System.Xml.Linq;
using Eis44Parser.Core;

namespace Eis44Parser.Tests;

/// <summary>Разбор позиций КТРУ на фикстуре по XSD 17.0, без сети.</summary>
public sealed class NsiXmlParserTests
{
    private const string KtruXml = """
        <nsi:nsiKTRU xmlns:nsi="http://zakupki.gov.ru/nsi/17">
          <nsi:position>
            <nsi:data schemeVersion="17.0">
              <nsi:code>32.50.13.190-01</nsi:code>
              <nsi:versionCode>1</nsi:versionCode>
              <nsi:version>1</nsi:version>
              <nsi:inclusionDate>2026-01-01T00:00:00Z</nsi:inclusionDate>
              <nsi:publishDate>2026-02-01T00:00:00Z</nsi:publishDate>
              <nsi:name>Изделие медицинское</nsi:name>
              <nsi:OKPD2><nsi:code>32.50.13.190</nsi:code></nsi:OKPD2>
              <nsi:status>ACTIVE</nsi:status>
              <nsi:actual>true</nsi:actual>
            </nsi:data>
          </nsi:position>
          <nsi:position>
            <nsi:data schemeVersion="17.0">
              <nsi:code>26.20.11.110-02</nsi:code>
              <nsi:version>2</nsi:version>
              <nsi:publishDate>2026-03-01T00:00:00Z</nsi:publishDate>
              <nsi:name>Компьютер</nsi:name>
              <nsi:OKPD2><nsi:code>26.20.11.110</nsi:code></nsi:OKPD2>
              <nsi:status>INACTIVE</nsi:status>
            </nsi:data>
          </nsi:position>
        </nsi:nsiKTRU>
        """;

    [Fact]
    public void ParseKtru_ЧитаетПозицииНезависимоОтПрефиксов()
    {
        var positions = NsiXmlParser.ParseKtru(XDocument.Parse(KtruXml));

        Assert.Equal(2, positions.Count);
        var first = positions[0];
        Assert.Equal("32.50.13.190-01", first.Code);
        Assert.Equal("32.50.13.190", first.ParentCode);
        Assert.Equal("Изделие медицинское", first.Name);
        Assert.True(first.Actual);
        Assert.Equal("2026-02-01T00:00:00Z", first.Payload["publishDate"]);
    }

    [Fact]
    public void ParseKtru_БезActual_БерётСтатусВерсии()
    {
        var positions = NsiXmlParser.ParseKtru(XDocument.Parse(KtruXml));
        var second = positions[1];

        Assert.Equal("26.20.11.110-02", second.Code);
        Assert.Equal("26.20.11.110", second.ParentCode);
        Assert.False(second.Actual);
        Assert.DoesNotContain("actual", second.Payload.Keys);
    }

    [Fact]
    public void ParseKtru_СохраняетВложенныйOKPD2ВPayload()
    {
        var position = NsiXmlParser.ParseKtru(XDocument.Parse(KtruXml))[0];

        var okpd2 = Assert.IsAssignableFrom<IReadOnlyDictionary<string, object?>>(
            position.Payload["OKPD2"]);
        Assert.Equal("32.50.13.190", okpd2["code"]);
    }
}
