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

    [Fact]
    public void Parse_Contract_ReadsSubcontractorsFromSubContractorsSum()
    {
        var xml = """
            <contract schemeVersion="16.3">
              <regNum>2462904043925000011</regNum>
              <subContractorsSum>
                <sumInPercents>25.0</sumInPercents>
                <subContractors>
                  <subContractor>
                    <legalEntityRF>
                      <fullName>ООО «Лидер Групп»</fullName>
                      <INN>4632306640</INN>
                      <KPP>463201001</KPP>
                      <statusInfo><code>30</code><name>СМП</name></statusInfo>
                      <subContractInfo>
                        <subContractDate>2026-10-28</subContractDate>
                        <subContractNumber>01/09/26/20Р</subContractNumber>
                        <subContractSubject>Услуги спецтехники</subContractSubject>
                        <subContractPriceInfo><price>1000.50</price></subContractPriceInfo>
                      </subContractInfo>
                      <subPurchaseObjectsInfo>
                        <subPurchaseObjectInfo>
                          <OKPD2><code>42.11.20.200</code></OKPD2>
                        </subPurchaseObjectInfo>
                      </subPurchaseObjectsInfo>
                    </legalEntityRF>
                  </subContractor>
                  <subContractor>
                    <individualBusinessmanRF>
                      <lastName>Кочетков</lastName>
                      <firstName>Юрий</firstName>
                      <middleName>Алексеевич</middleName>
                      <INN>463227720470</INN>
                      <statusInfo><code>30</code><name>СМП</name></statusInfo>
                      <subContractInfo>
                        <subContractDate>2026-03-18</subContractDate>
                        <subContractNumber>Д-73</subContractNumber>
                        <subContractSubject>Услуги спецтехники</subContractSubject>
                        <subContractPriceInfo><price>0.00</price></subContractPriceInfo>
                      </subContractInfo>
                    </individualBusinessmanRF>
                  </subContractor>
                </subContractors>
              </subContractorsSum>
            </contract>
            """;

        var result = _parser.Parse(XDocument.Parse(xml), "contract.xml");

        Assert.Equal(2, result.Subcontractors.Count);

        var company = result.Subcontractors[0];
        Assert.Equal("4632306640", company.Inn);
        Assert.Equal("463201001", company.Kpp);
        Assert.Equal("ООО «Лидер Групп»", company.Name);
        Assert.Equal("30", company.StatusCode);
        Assert.Equal("СМП", company.StatusName);
        Assert.Equal(1000.50m, company.ContractSum);
        Assert.Equal("01/09/26/20Р", company.ContractNumber);
        Assert.Equal("2026-10-28", company.ContractDate);
        Assert.Equal("42.11.20.200", company.Okpd2Code);

        var entrepreneur = result.Subcontractors[1];
        Assert.Equal("463227720470", entrepreneur.Inn);
        // У ИП нет fullName — ФИО собирается из lastName/firstName/middleName.
        Assert.Equal("Кочетков Юрий Алексеевич", entrepreneur.Name);
        Assert.Null(entrepreneur.Kpp);
    }
}
