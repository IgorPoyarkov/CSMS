using System.Xml.Linq;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Tests;

/// <summary>Парсер не должен зависеть от префиксов пространств имён и версии схемы.</summary>
public sealed class EisDocumentParserTests
{
    private readonly EisDocumentParser _parser = new();

    [Fact]
    public void Parse_Notification_ReadsKeyFieldsAndItemsByLocalName()
    {
        var xml = """
            <epNotificationEF2020 xmlns:n="urn:eis-17" schemeVersion="17.0">
              <n:purchaseNumber>01234567890123456789</n:purchaseNumber>
              <n:IKZ>ikz-1</n:IKZ>
              <n:customer><n:mainInfo>
                <n:INN>7700000000</n:INN><n:KPP>770001001</n:KPP><n:name>Заказчик</n:name>
              </n:mainInfo></n:customer>
              <n:nmck>100000.50</n:nmck>
              <n:purchaseObjectInfo>Поставка компьютеров</n:purchaseObjectInfo>
              <n:printForm url="https://zakupki.gov.ru/print/1" />
              <n:items><n:item>
                <n:KTRU><n:code>03.0000.1</n:code></n:KTRU>
                <n:OKPD2><n:code>26.20.11</n:code></n:OKPD2>
                <n:name>Компьютер</n:name><n:quantity>2</n:quantity><n:price>50000.25</n:price>
              </n:item></n:items>
            </epNotificationEF2020>
            """;

        var result = _parser.Parse(XDocument.Parse(xml), "notice.xml");

        Assert.Equal(EisDocumentKind.Purchase, result.Kind);
        Assert.Equal("17.0", result.SchemeVersion);
        Assert.Equal("01234567890123456789", result.PurchaseNumber);
        Assert.Equal("ikz-1", result.Ikz);
        Assert.Equal("7700000000", result.CustomerInn);
        Assert.Equal("770001001", result.CustomerKpp);
        Assert.Equal(100000.50m, result.Price);
        Assert.Equal("https://zakupki.gov.ru/print/1", result.PrintFormUrl);
        var item = Assert.Single(result.Items);
        Assert.Equal("03.0000.1", item.KtruCode);
        Assert.Equal("26.20.11", item.Okpd2Code);
        Assert.Equal(2m, item.Quantity);
        Assert.Equal(64, result.DocumentSha256.Length);
    }

    [Fact]
    public void Parse_Contract_ReadsRegNumberAndSupplier()
    {
        var xml = """
            <contract xmlns:x="urn:other" schemeVersion="16.0">
              <x:regNum>01234567890123456789-1</x:regNum>
              <x:purchaseNumber>01234567890123456789</x:purchaseNumber>
              <x:contractPrice>50000.00</x:contractPrice>
              <x:signDate>2026-11-20</x:signDate>
              <x:customer><x:INN>7700000000</x:INN></x:customer>
              <x:supplier><x:INN>5001000000</x:INN><x:KPP>500101001</x:KPP></x:supplier>
            </contract>
            """;

        var result = _parser.Parse(XDocument.Parse(xml), "contract.xml");

        Assert.Equal(EisDocumentKind.Contract, result.Kind);
        Assert.Equal("01234567890123456789-1", result.RegNumber);
        Assert.Equal("01234567890123456789", result.PurchaseNumber);
        Assert.Equal("5001000000", result.SupplierInn);
        Assert.Equal("500101001", result.SupplierKpp);
        Assert.Equal(50000.00m, result.Price);
        Assert.Equal("2026-11-20", result.PublishDate);
    }

    [Fact]
    public void Parse_AcceptanceAct_ReadsRegistryNumberFromCyrillicAttribute()
    {
        // Акты приёмки 2026 года: <ОсновСтроит РеестрНомКонт="...">.
        var xml = """
            <ОсновСтроит РеестрНомКонт="2462904043926000006" ПрГосМун="1">
              <НомерДок>01</НомерДок>
            </ОсновСтроит>
            """;

        var result = _parser.Parse(XDocument.Parse(xml), "ON_AKTREZRABP.xml");

        Assert.Equal(EisDocumentKind.Unknown, result.Kind);
        Assert.Equal("2462904043926000006", result.RegNumber);
        Assert.Equal("2462904043926000006", result.PurchaseNumber);
    }
}
