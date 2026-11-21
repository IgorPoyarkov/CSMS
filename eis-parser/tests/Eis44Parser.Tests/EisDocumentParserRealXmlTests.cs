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

    [Fact]
    public void ParsesRealControlNoticeWithoutCrashing()
    {
        var document = Load("control99-notice-compliance-real.xml");

        var result = _parser.Parse(document, "control99.xml");

        // Незнакомый корень не должен ломать конвейер: документ сохраняется
        // как unknown и разбирается после обновления парсера.
        Assert.Equal(EisDocumentKind.Unknown, result.Kind);
        Assert.Equal("16.3", result.SchemeVersion);
        Assert.Equal("4629040439", result.CustomerInn);
        Assert.Equal("463201001", result.CustomerKpp);
        Assert.Contains("КУРСКАВТОДОР", result.CustomerName, StringComparison.Ordinal);
        Assert.Equal("2026-11-19T16:06:41+03:00", result.PublishDate);
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
