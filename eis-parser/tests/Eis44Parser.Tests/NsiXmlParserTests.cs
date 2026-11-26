using System.Collections.Generic;
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

  private const string KtruWithCharacteristicsXml = """
        <nsi:nsiKTRU xmlns:nsi="http://zakupki.gov.ru/nsi/17">
          <nsi:position>
            <nsi:data schemeVersion="17.0">
              <nsi:code>49.31.21.110-00000062</nsi:code>
              <nsi:name>Услуга по регулярным перевозкам пассажиров автобусом</nsi:name>
              <nsi:OKPD2><nsi:code>49.31.21.110</nsi:code></nsi:OKPD2>
              <nsi:OKEIs>
                <nsi:OKEI><nsi:code>008</nsi:code><nsi:name>Километр</nsi:name></nsi:OKEI>
              </nsi:OKEIs>
              <nsi:characteristics>
                <nsi:characteristic>
                  <nsi:code>CH-1</nsi:code>
                  <nsi:name>Тип маршрута</nsi:name>
                  <nsi:type>1</nsi:type>
                  <nsi:kind>1</nsi:kind>
                  <nsi:isRequired>true</nsi:isRequired>
                  <nsi:values>
                    <nsi:value><nsi:qualityDescription>Межмуниципальный</nsi:qualityDescription></nsi:value>
                    <nsi:value><nsi:qualityDescription>Муниципальный</nsi:qualityDescription></nsi:value>
                  </nsi:values>
                </nsi:characteristic>
                <nsi:characteristic>
                  <nsi:code>CH-2</nsi:code>
                  <nsi:name>Класс транспортного средства</nsi:name>
                  <nsi:type>1</nsi:type>
                  <nsi:kind>2</nsi:kind>
                  <nsi:isRequired>false</nsi:isRequired>
                  <nsi:values>
                    <nsi:value><nsi:qualityDescription>Малый</nsi:qualityDescription></nsi:value>
                  </nsi:values>
                </nsi:characteristic>
                <nsi:characteristic>
                  <nsi:code>CH-3</nsi:code>
                  <nsi:name>Мощность</nsi:name>
                  <nsi:type>2</nsi:type>
                  <nsi:isRequired>true</nsi:isRequired>
                  <nsi:values>
                    <nsi:value>
                      <nsi:rangeSet><nsi:valueRange><nsi:min>1</nsi:min><nsi:max>10</nsi:max></nsi:valueRange></nsi:rangeSet>
                      <nsi:OKEI><nsi:name>кВт</nsi:name></nsi:OKEI>
                    </nsi:value>
                  </nsi:values>
                </nsi:characteristic>
              </nsi:characteristics>
              <nsi:parentPositionInfo><nsi:code>49.31.21.110-00000001</nsi:code></nsi:parentPositionInfo>
            </nsi:data>
          </nsi:position>
        </nsi:nsiKTRU>
        """;

  [Fact]
  public void ParseKtru_ЧитаетХарактеристикиИРодительскуюПозицию()
  {
    var position = NsiXmlParser.ParseKtru(XDocument.Parse(KtruWithCharacteristicsXml))[0];

    // Позиция остаётся в выборке по ОКПД2, а родительская КТРУ-позиция
    // сохраняется отдельно в payload.
    Assert.Equal("49.31.21.110", position.ParentCode);
    Assert.Equal("49.31.21.110-00000001", position.Payload["parentKtruCode"]);
    Assert.Equal("49.31.21.110-00000062", position.Payload["ktruCode"]);
    Assert.Equal("49.31.21.110", position.Payload["okpd2Code"]);
    Assert.Equal("Километр", position.Payload["unit"]);

    var characteristics = Assert.IsAssignableFrom<
        IReadOnlyList<Dictionary<string, object?>>>(
        position.Payload["characteristics"]);
    Assert.Equal(3, characteristics.Count);

    var route = characteristics[0];
    Assert.Equal("Тип маршрута", route["name"]);
    Assert.Equal("enum", route["valueType"]);
    Assert.Equal("Межмуниципальный; Муниципальный", route["valueText"]);
    Assert.True(route["isMandatory"] is true);

    var vehicleClass = characteristics[1];
    Assert.Equal("exact", vehicleClass["valueType"]);
    Assert.False(vehicleClass["isMandatory"] is true);

    var power = characteristics[2];
    Assert.Equal("range", power["valueType"]);
    Assert.Equal("1", power["minValue"]);
    Assert.Equal("10", power["maxValue"]);
    Assert.Equal("кВт", power["unit"]);
  }
}
