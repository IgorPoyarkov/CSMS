using System.Xml.Linq;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Tests;

/// <summary>
/// Проверка маппинга на реальных XML из карточки закупки 0144200001826000192.
/// Это не синтетические примеры: расхождения с ними уже приводили к пустым
/// позициям и неверному ИНН заказчика.
/// </summary>
public sealed class EisDocumentParserRealXmlTests
{
    private readonly EisDocumentParser _parser = new();

    [Fact]
    public void ParsesRealEokNotification()
    {
        var document = Load("epNotificationEOK2020-real.xml");

        var result = _parser.Parse(document, "epNotificationEOK2020.xml");

        Assert.Equal(EisDocumentKind.Purchase, result.Kind);
        Assert.Equal("16.3", result.SchemeVersion);
        Assert.Equal("0144200001826000192", result.PurchaseNumber);
        Assert.Equal("262462904043946320100101130014211244", result.Ikz);
        Assert.Equal("4629040439", result.CustomerInn);
        Assert.Equal("463201001", result.CustomerKpp);
        Assert.Contains("КУРСКАВТОДОР", result.CustomerName, StringComparison.Ordinal);
        Assert.Equal(7_169_815.60m, result.Price);
        Assert.Equal("2026-11-18T17:21:35.504+03:00", result.PublishDate);
        Assert.Contains("водопропускной железобетонной трубы", result.ObjectInfo, StringComparison.Ordinal);
        Assert.Equal(
            "https://zakupki.gov.ru/epz/order/notice/printForm/view.html?regNumber=0144200001826000192",
            result.PrintFormUrl);

        var item = Assert.Single(result.Items);
        Assert.Equal("42.11.20.200", item.Okpd2Code);
        Assert.Null(item.KtruCode);
        Assert.Contains("водопропускной железобетонной трубы", item.ItemName, StringComparison.Ordinal);
        Assert.Equal(1m, item.Quantity);
        Assert.Equal(7_169_815.60m, item.Price);
    }

    [Fact]
    public void ParsesNestedKtruAndOkpd2FromRealAuction()
    {
        var document = Load("epNotificationEF2020-real.xml");

        var result = _parser.Parse(document, "epNotificationEF2020.xml");

        Assert.Equal(EisDocumentKind.Purchase, result.Kind);
        Assert.Equal("0144200001826000201", result.PurchaseNumber);
        Assert.Equal("262462904043946320100101140014931244", result.Ikz);
        Assert.Equal(22_662_656.28m, result.Price);

        var item = Assert.Single(result.Items);
        // Код КТРУ — собственный <code> тега <KTRU>, а не code характеристики.
        Assert.Equal("49.31.21.110-00000054", item.KtruCode);
        Assert.Equal("49.31.21.110", item.Okpd2Code);
        Assert.Equal("Услуга по регулярным перевозкам пассажиров автобусом", item.ItemName);
        Assert.Equal(524_598.525m, item.Quantity);
        Assert.Equal(43.20m, item.Price);
    }

    [Theory]
    [InlineData("control99-notice-compliance-real.xml", "2026-11-19T16:06:41+03:00")]
    [InlineData("control99-begin-message-real.xml", "2026-11-19T14:08:36+03:00")]
    public void KeepsControl99PrintFormsAsRaw(string fileName, string publishDate)
    {
        var document = Load(fileName);

        var result = _parser.Parse(document, "control99.xml");

        // Незнакомый корень не должен ломать конвейер: документ сохраняется
        // как unknown и разбирается после обновления парсера.
        Assert.Equal(EisDocumentKind.Unknown, result.Kind);
        Assert.Equal("16.3", result.SchemeVersion);
        Assert.Equal("4629040439", result.CustomerInn);
        Assert.Equal("463201001", result.CustomerKpp);
        Assert.Contains("КУРСКАВТОДОР", result.CustomerName, StringComparison.Ordinal);
        Assert.Equal(publishDate, result.PublishDate);
    }

    [Fact]
    public void ParsesContractProjectAdditionalAgreement()
    {
        var document = Load("cp-contract-project-lkp-real.xml");

        var result = _parser.Parse(document, "cpContractProjectLKP.xml");

        // В корне одновременно есть contract и project — это контрактный документ.
        Assert.Equal(EisDocumentKind.Contract, result.Kind);
        Assert.Equal("16.3", result.SchemeVersion);
        Assert.Equal("262462904043946320100100080014211244", result.Ikz);
        Assert.Equal("4629040439", result.CustomerInn);
        Assert.Equal("4621009123", result.SupplierInn);
        Assert.Contains("ТЕРРА", result.SupplierName, StringComparison.Ordinal);
        Assert.StartsWith("2026-11-21", result.PublishDate, StringComparison.Ordinal);
        Assert.Empty(result.Items);
    }

    [Fact]
    public void ParsesAnotherContractProjectWithDifferentSupplier()
    {
        var document = Load("cp-contract-project-lkp-fatezh-real.xml");

        var result = _parser.Parse(document, "cpContractProjectLKP-fatezh.xml");

        // Второй проект доп. соглашения того же заказчика: другой ИКЗ и подрядчик.
        Assert.Equal(EisDocumentKind.Contract, result.Kind);
        Assert.Equal("262462904043946320100101030014211244", result.Ikz);
        Assert.Equal("4629040439", result.CustomerInn);
        Assert.Equal("4611014131", result.SupplierInn);
        Assert.Equal("461101001", result.SupplierKpp);
        Assert.Contains("ФАТЕЖСКОЕ ДОРОЖНОЕ РЕМОНТНО-СТРОИТЕЛЬНОЕ УПРАВЛЕНИЕ", result.SupplierName, StringComparison.Ordinal);
        Assert.StartsWith("2026-11-21", result.PublishDate, StringComparison.Ordinal);
        Assert.Empty(result.Items);
        // Поля numberAdd/docNumberAdd пока не маппятся, но сырой XML сохраняется целиком.
        Assert.Contains("numberAdd", result.RawXml, StringComparison.Ordinal);
        Assert.Contains("docNumberAdd", result.RawXml, StringComparison.Ordinal);
    }

    [Fact]
    public void ParsesElectronicContractProject()
    {
        var document = Load("cp-contract-project-real.xml");

        var result = _parser.Parse(document, "cpContractProject.xml");

        // Проект электронного контракта (16.2): основание в foundationInfo,
        // цена и предмет в contractInfo, исполнитель в корневом participantInfo.
        Assert.Equal(EisDocumentKind.Contract, result.Kind);
        Assert.Equal("16.2", result.SchemeVersion);
        Assert.Equal("0144200001826000147", result.PurchaseNumber);
        Assert.Equal("262462904043946320100100710017112414", result.Ikz);
        Assert.Equal("4629040439", result.CustomerInn);
        Assert.Equal("5752072709", result.SupplierInn);
        Assert.Equal("575201001", result.SupplierKpp);
        Assert.Contains("ОРЕЛАВТОБАН", result.SupplierName, StringComparison.Ordinal);
        Assert.Equal(1_600_000.00m, result.Price);
        Assert.Equal("2026-09-29T11:04:18", result.PublishDate);
        Assert.Contains("проектно-изыскательских работ", result.ObjectInfo, StringComparison.Ordinal);
        Assert.Equal(
            "https://zakupki.gov.ru/44fz/filestore/public/1.0/download/rpec/file.html?uid=01A0F1AF02677FBDA0227DF797473AED",
            result.PrintFormUrl);
        Assert.Empty(result.Items);
    }

    [Fact]
    public void ParsesElectronicContractWithProductInfo()
    {
        var document = Load("cp-electronic-contract-real.xml");

        var result = _parser.Parse(document, "cpElectronicContract.xml");

        // Подписанный электронный контракт: позиция лежит в <productsInfo><productInfo>.
        Assert.Equal(EisDocumentKind.Contract, result.Kind);
        Assert.Equal("16.2", result.SchemeVersion);
        Assert.Equal("0144200001826000147", result.PurchaseNumber);
        Assert.Equal("262462904043946320100100710017112414", result.Ikz);
        Assert.Equal("4629040439", result.CustomerInn);
        Assert.Equal("5752072709", result.SupplierInn);
        Assert.Contains("ОРЕЛАВТОБАН", result.SupplierName, StringComparison.Ordinal);
        Assert.Equal(1_600_000.00m, result.Price);
        Assert.Equal("2026-09-29T00:00:00.000+03:00", result.PublishDate);
        Assert.Contains("проектно-изыскательских работ", result.ObjectInfo, StringComparison.Ordinal);

        var item = Assert.Single(result.Items);
        Assert.Equal("71.12.14.000-00000007", item.KtruCode);
        Assert.Equal("71.12.14", item.Okpd2Code);
        Assert.Contains("Разработка проектной документации", item.ItemName, StringComparison.Ordinal);
        Assert.Equal(1m, item.Quantity);
        Assert.Equal(1_600_000.00m, item.Price);
    }

    [Theory]
    [InlineData("cp-electronic-contract-16-1-real.xml", "16.1")]
    [InlineData("cp-electronic-contract-amended-real.xml", "16.2")]
    public void ParsesRealElectronicContractsWithNineItems(string fileName, string schemeVersion)
    {
        var document = Load(fileName);

        var result = _parser.Parse(document, fileName);

        Assert.Equal(EisDocumentKind.Contract, result.Kind);
        Assert.Equal(schemeVersion, result.SchemeVersion);
        Assert.Equal("0144200001826000063", result.PurchaseNumber);
        Assert.Equal("262462904043946320100100400014211244", result.Ikz);
        Assert.Equal("4621009123", result.SupplierInn);
        Assert.Contains("ТЕРРА", result.SupplierName, StringComparison.Ordinal);
        Assert.Equal("2026-05-20T00:00:00.000+03:00", result.PublishDate);
        // Итог контракта лежит в contractPriceInfo, а не в первой позиции.
        Assert.Equal(202_006_953.29m, result.Price);
        Assert.Equal(9, result.Items.Count);
        Assert.All(result.Items, item => Assert.Equal("42.11.20.300", item.Okpd2Code));
    }

    [Fact]
    public void KeepsContractDeltaAsRaw()
    {
        var document = Load("cp-delta-real.xml");

        var result = _parser.Parse(document, "cpDelta.xml");

        // cpDelta (изменение контракта) пока не маппится в отдельную сущность.
        Assert.Equal(EisDocumentKind.Unknown, result.Kind);
        Assert.Equal("16.2", result.SchemeVersion);
        Assert.Equal("262462904043946320100100400014211244", result.Ikz);
        Assert.Equal("4621009123", result.SupplierInn);
        Assert.False(string.IsNullOrWhiteSpace(result.RawXml));
    }

    [Fact]
    public void KeepsRoskaznaPaymentOrderAsRaw()
    {
        var document = Load("fam-payment-order-real.xml");

        var result = _parser.Parse(document, "FAM_PaymOrderCr.xml");

        Assert.Equal(EisDocumentKind.Unknown, result.Kind);
        Assert.False(string.IsNullOrWhiteSpace(result.RawXml));
    }

    [Fact]
    public void KeepsEsmvPaymentApplicationAsRaw()
    {
        var document = Load("esmv-appl-cash-flow-real.xml");

        var result = _parser.Parse(document, "applCashFlow.xml");

        // Платёжное заявление не является контрактом: в БД уйдёт только сырой XML.
        Assert.Equal(EisDocumentKind.Unknown, result.Kind);
        Assert.Equal("4.1", result.SchemeVersion);
        Assert.Equal("4621009123", result.SupplierInn);
        Assert.Contains("ТЕРРА", result.SupplierName, StringComparison.Ordinal);
        Assert.False(string.IsNullOrWhiteSpace(result.RawXml));
    }

    [Fact]
    public void KeepsRoskaznaBudgetObligationNoticeForLaterParsing()
    {
        var document = Load("exp-notice-bo-real.xml");

        var result = _parser.Parse(document, "exp-notice-bo.xml");

        Assert.Equal(EisDocumentKind.Unknown, result.Kind);
        Assert.Equal("2.0", result.SchemeVersion);
        Assert.Equal("262462904043946320100101130014211244", result.Ikz);
        Assert.Equal(7_169_815.60m, result.Price);
        Assert.Equal("2026-11-20", result.PublishDate);
        Assert.False(string.IsNullOrWhiteSpace(result.RawXml));
    }

    private static XDocument Load(string fileName) =>
        XDocument.Load(Path.Combine(AppContext.BaseDirectory, "test-data", fileName));
}
