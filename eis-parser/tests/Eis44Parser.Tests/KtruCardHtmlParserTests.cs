using System.Text.Json;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Tests;

/// <summary>
/// Тесты на урезанных, но реальных по разметке фрагментах ЕИС: карточка,
/// строка поиска с «N позиций» и ajax-таблица характеристик.
/// </summary>
public sealed class KtruCardHtmlParserTests
{
    private const string CardHtml = """
        <div class="cardMainInfo__content">
          <section class="blockInfo__section section">
            <span class="section__title">Статус</span>
            <span class="section__info">Включено в КТРУ</span>
          </section>
          <section class="blockInfo__section section">
            <span class="section__title">Позиция является укрупненной</span>
            <span class="section__info">Да</span>
          </section>
          <section class="blockInfo__section section">
            <span class="section__title">Дата включения позиции в каталог</span>
            <span class="section__info">26.12.2019</span>
          </section>
          <section class="blockInfo__section section">
            <span class="section__title">Код позиции КТРУ</span>
            <span class="section__info">01.13.11.000-00000002</span>
          </section>
          <section class="blockInfo__section section">
            <span class="section__title">Код по ОКПД2</span>
            <span class="section__info">01.13.11.000: Спаржа</span>
          </section>
          <section class="blockInfo__section section">
            <span class="section__title">Наименование товара, работы, услуги</span>
            <span class="section__info">Спаржа </span>
          </section>
          <section class="blockInfo__section section">
            <span class="section__title">Единицы измерения (количество товара, объем работы, услуги по ОКЕИ)</span>
            <span class="section__info">
              <div>Килограмм</div>
            </span>
          </section>
          <section class="blockInfo__section section">
            <span class="section__title">Дата начала обязательного применения позиции каталога</span>
            <span class="section__info">01.04.2020</span>
          </section>
          <section class="blockInfo__section section">
            <span class="section__title">Дата окончания применения позиции каталога</span>
            <span class="section__info"> Бессрочно </span>
          </section>
          <div id="classfrContent">
            <input type="hidden" id="ktruItemId" value="01.13.11.000-00000002"/>
            <span class="section__title">Общероссийские и международные классификаторы</span>
            <table class="tableBlock grayBorderBottom">
              <thead><tr><th>Наименование классификатора</th><th>Значение классификатора</th><th>Описание по классификатору</th></tr></thead>
              <tbody class="tableBlock__body">
                <tr>
                  <td class="tableBlock__col_first" rowspan="1">Общероссийский классификатор продукции по видам экономической деятельности (ОКПД2)</td>
                  <td> 01.13.11.000: Спаржа </td>
                  <td>Сведения отсутствуют</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div id="standardContent">
            <span class="section__title">Информация о технических регламентах и стандартах</span>
            <table class="tableBlock grayBorderBottom">
              <thead><tr><th>Наименование документа</th><th>Электронный образ документа</th></tr></thead>
              <tbody class="tableBlock__body">
                <tr>
                  <td> ГОСТ 34318-2017 &#034;Межгосударственный стандарт. Спаржа свежая. Технические условия&#034; </td>
                  <td> </td>
                </tr>
                <tr>
                  <td> ТР ТС 021/2011 </td>
                  <td><a href="/epz/ktru/files/021-2011.pdf">Скачать</a></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        """;

    private const string SearchHtml = """
        <div class="registry-entry__body mt-auto hidden-block-hover">
          <div class="registry-entry__body-block">
            <div class="registry-entry__body-caption float-right">
              <a href="?&amp;ktruCharItemId=01.13.13.000-00000003_1&amp;parentTemplateId=01.13.13.000-00000003">2 позиции<img src="/arrow.svg" alt=""></a>
            </div>
          </div>
        </div>
        """;

    private const string DescriptionHtml = """
        <input type="hidden" id="ktruItemVersionId" value="26.20.18.000-00000069_25"/>
        <input type="hidden" id="pageNumber" value="1"/>
        """;

    private const string PartHtml = """
        <table class="blockInfo__table tableBlock grayBorderBottom mt-0">
          <thead>
            <tr><th>Наименование характеристики</th><th>Значение характеристики</th><th>Единица измерения характеристики</th></tr>
          </thead>
          <tbody class="tableBlock__body">
            <tr class="tableBlock__row">
              <td class="tableBlock__col_first" rowspan="2" class="characteristicName">
                <div> Возможность автоматического двухстороннего сканирования </div>
                <div class="revert" title="..."> (характеристика не является обязательной для применения) </div>
              </td>
              <td class="tableBlock__col_last">Да</td>
              <td></td>
            </tr>
            <tr class="tableBlock__row">
              <td class="tableBlock__col_last">Нет</td>
              <td></td>
            </tr>
            <tr class="tableBlock__row">
              <td class="tableBlock__col_first" rowspan="1" class="characteristicName">
                <div>Наименование товара</div>
              </td>
              <td>Спаржа</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        """;

    [Fact]
    public void ParseCard_ReadsHeaderClassifiersAndStandards()
    {
        Assert.True(KtruCardHtmlParser.IsCard(CardHtml));

        var card = KtruCardHtmlParser.ParseCard(CardHtml, "01.13.11.000-00000002");

        Assert.Equal("01.13.11.000-00000002", card.Code);
        Assert.Equal("01.13.11.000", card.Okpd2Code);
        Assert.Equal("Спаржа", card.Name);
        Assert.Equal("Килограмм", card.Unit);
        Assert.Equal("Включено в КТРУ", card.Status);
        Assert.Equal("26.12.2019", card.IncludedDate);
        Assert.Equal("01.04.2020", card.MandatoryFrom);
        Assert.Equal("Бессрочно", card.MandatoryTo);
        Assert.True(card.Enlarged);

        var classifier = Assert.Single(card.Classifiers);
        Assert.Equal("Общероссийский классификатор продукции по видам экономической деятельности (ОКПД2)", classifier.Name);
        Assert.Equal("01.13.11.000: Спаржа", classifier.Value);
        Assert.Equal("Сведения отсутствуют", classifier.Description);

        Assert.Equal(2, card.Standards.Count);
        Assert.Equal("ГОСТ 34318-2017 \"Межгосударственный стандарт. Спаржа свежая. Технические условия\"", card.Standards[0].Name);
        Assert.Equal("", card.Standards[0].DocumentUrl);
        Assert.Equal("/epz/ktru/files/021-2011.pdf", card.Standards[1].DocumentUrl);
    }

    [Fact]
    public void ParseNesting_AndChildIds_FollowDeclaredPositions()
    {
        var nesting = KtruCardHtmlParser.ParseNesting(SearchHtml);

        Assert.NotNull(nesting);
        Assert.Equal(2, nesting.Count);
        Assert.Contains("parentTemplateId=01.13.13.000-00000003", nesting.RelativeUrl);

        const string children = """
            <a href="/epz/ktru/ktruCard/commonInfo.html?itemId=01.13.13.000-00000001">Кочан капусты</a>
            <a href="/epz/ktru/ktruCard/commonInfo.html?itemId=01.13.13.000-00000002">Кочан капусты</a>
            <a href="/epz/ktru/ktruCard/commonInfo.html?itemId=01.13.13.000-00000002">дубль</a>
            """;

        Assert.Equal(
            ["01.13.13.000-00000001", "01.13.13.000-00000002"],
            KtruCardHtmlParser.ParseChildIds(children));
    }

    [Fact]
    public void ParseCharacteristics_KeepsRequiredFlagAndMultipleValues()
    {
        var characteristics = KtruCardHtmlParser.ParseCharacteristics(PartHtml);

        Assert.Equal(2, characteristics.Count);
        Assert.False(characteristics[0].Required);
        Assert.Equal("Возможность автоматического двухстороннего сканирования", characteristics[0].Name);
        Assert.Equal(["Да", "Нет"], characteristics[0].Values.Select(value => value.Value));
        Assert.True(characteristics[1].Required);
        Assert.Equal("Спаржа", Assert.Single(characteristics[1].Values).Value);
    }

    [Fact]
    public void ParseVersionId_ReadsAjaxVersion()
    {
        Assert.Equal("26.20.18.000-00000069_25", KtruCardHtmlParser.ParseVersionId(DescriptionHtml));
    }

    [Fact]
    public void ParseCategories_ReadsRssForEveryCategoryAndSkipsMedicines()
    {
        const string start = """
            <div class="rubricator-list">
              <a href="/epz/ktru/search/results.html?rubricatorIdSelected=-1&morphology=on&pageNumber=1&sortDirection=true&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=ITEM_CODE&activeESCKLP=on&selectedNameFromRubricator=%D0%A1%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D1%87%D0%BD%D0%B8%D0%BA+%D0%BB%D0%B5%D0%BA%D0%B0%D1%80%D1%81%D1%82%D0%B2">Лекарства</a>
              <a href="/epz/ktru/search/results.html?rubricatorIdSelected=119&morphology=on&pageNumber=1&sortDirection=true&recordsPerPage=_10&showLotsInfoHidden=false&sortBy=ITEM_CODE&active=on&selectedNameFromRubricator=%D0%9F%D1%80%D0%BE%D0%B8%D0%B7%D0%B2%D0%BE%D0%B4%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D0%BE%D0%B5+%D0%BE%D0%B1%D0%BE%D1%80%D1%83%D0%B4%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5">Оборудование</a>
            </div>
            """;

        var categories = KtruCardHtmlParser.ParseCategories(start);

        var category = Assert.Single(categories);
        Assert.Equal("119", category.Id);
        Assert.Equal("Производственное оборудование", category.Name);
        Assert.Contains("recordsPerPage=_100", category.SearchUrl);
        Assert.StartsWith("/epz/ktru/search/rss?", category.RssUrl);
        Assert.Contains("recordsPerPage=_100", category.RssUrl);
    }

    [Fact]
    public void ParseRssCodes_SkipsMedicineFormatAndKeepsSupportedOnes()
    {
        const string rss = """
            <rss><channel>
              <item><content:encoded>&lt;strong&gt;Код позиции КТРУ: &lt;/strong&gt;42.21.13.190-00000011&lt;br/&gt;</content:encoded></item>
              <item><content:encoded>&lt;strong&gt;Код позиции КТРУ: &lt;/strong&gt;21.10.51.123-000001-1-00047-0000000000000&lt;br/&gt;</content:encoded></item>
              <item><content:encoded>&lt;strong&gt;Код позиции КТРУ: &lt;/strong&gt;01.13.11.000-00000002&lt;br/&gt;</content:encoded></item>
            </channel></rss>
            """;

        Assert.Equal(
            ["42.21.13.190-00000011", "01.13.11.000-00000002"],
            KtruCardHtmlParser.ParseRssCodes(rss));
        Assert.False(KtruCardHtmlParser.IsSupportedCode("21.10.51.123-000001-1-00047-0000000000000"));
    }

    [Fact]
    public void ParseSearchCodes_ReadsIdsFromCategoryPage()
    {
        const string search = """
            <a href="/epz/ktru/ktruCard/commonInfo.html?itemId=25.30.11.190-00000006">Котел</a>
            <a href="/epz/ktru/ktruCard/commonInfo.html?itemId=21.10.51.123-000001-1-00047-0000000000000">Лекарство</a>
            """;

        Assert.Equal(
            ["25.30.11.190-00000006"],
            KtruCardHtmlParser.ParseSearchCodes(search));
    }

    [Fact]
    public void SnapshotBuilder_PutsNewFieldsIntoCompatiblePayload()
    {
        var card = KtruCardHtmlParser.ParseCard(CardHtml, "01.13.11.000-00000002") with
        {
            ChildCodes = ["01.13.11.000-00000001"],
            Characteristics = KtruCardHtmlParser.ParseCharacteristics(PartHtml),
        };

        var snapshot = KtruHtmlSnapshotBuilder.Build(
            [card],
            "nsiKTRU",
            "https://zakupki.gov.ru/epz/ktru/search/results.html",
            new DateTimeOffset(2026, 11, 21, 0, 0, 0, TimeSpan.Zero));

        Assert.Equal("nsiKTRU", snapshot.Dataset);
        Assert.StartsWith("ktru-html-20261121-1-", snapshot.Version);
        var hash = snapshot.SourceSha256;
        Assert.NotNull(hash);
        Assert.Equal(64, hash.Length);

        var item = Assert.Single(snapshot.Items);
        Assert.Equal(card.Code, item.Code);
        Assert.Equal(card.Okpd2Code, item.ParentCode);

        var payload = JsonSerializer.SerializeToElement(item.Payload);
        Assert.Equal("Килограмм", payload.GetProperty("unit").GetString());
        Assert.Equal("01.13.11.000-00000001", payload.GetProperty("childCodes")[0].GetString());
        // Два значения первой характеристики + одно значение второй.
        Assert.Equal(3, payload.GetProperty("characteristics").EnumerateArray().Count());
        Assert.False(payload.GetProperty("characteristics")[0].GetProperty("isMandatory").GetBoolean());
        Assert.Equal("ГОСТ 34318-2017 \"Межгосударственный стандарт. Спаржа свежая. Технические условия\"",
            payload.GetProperty("standards")[0].GetProperty("name").GetString());
    }
}
