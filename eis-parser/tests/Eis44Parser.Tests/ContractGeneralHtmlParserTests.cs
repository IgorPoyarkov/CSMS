using Eis44Parser.Core;

namespace Eis44Parser.Tests;

/// <summary>
/// Реквизиты контракта из HTML-карточки ЕИС: поставщик, аванс, срок исполнения,
/// ИКЗ и счета сторон. Поля берутся из двух страниц: вкладка «Общая информация»
/// (секции blockInfo__section) и печатная форма карточки, где опубликован
/// поставщик с банковскими реквизитами.
/// </summary>
public sealed class ContractGeneralHtmlParserTests
{
    private readonly ContractGeneralHtmlParser _parser = new();

    [Fact]
    public void ParsesContractFieldsFromCommonInfo()
    {
        var result = _parser.Parse(CommonInfoHtml, null, "2462904043926000006");

        Assert.NotNull(result);
        Assert.Equal("14Р_26", result.ContractNumber);
        Assert.Equal("2026-02-20", result.ContractDate);
        Assert.Equal("Ремонт автомобильной дороги", result.ContractName);
        Assert.Equal(147_712_728.82m, result.ContractPrice);
        Assert.Equal("262462904043946320100100050014211244", result.Ikz);
        Assert.Equal("ОБЛАСТНОЕ КАЗЕННОЕ УЧРЕЖДЕНИЕ \"КУРСКавтодор\"", result.CustomerName);
        Assert.Equal("4629040439", result.CustomerInn);
        Assert.Equal("463201001", result.CustomerKpp);
        Assert.Equal(29.59m, result.AdvancePercent);
        Assert.Equal(43_701_531.08m, result.AdvanceAmount);
        Assert.Equal(1_500_000.00m, result.PerformanceSecurityAmount);
        Assert.Equal("2026-02-17", result.ExecutionStartDate);
        Assert.Equal("2026-12-21", result.ExecutionEndDate);
        // Поставщика в этой вкладке нет — блок приходит из печатной формы
        Assert.Null(result.SupplierName);
        Assert.Equal("common-info:2462904043926000006", result.SourceFile);
    }

    [Fact]
    public void ParsesSupplierAndBankDetailsFromPrintForm()
    {
        var result = _parser.Parse(
            CommonInfoHtml, PrintFormHtml, "2462904043926000006");

        Assert.NotNull(result);
        Assert.Equal(
            "АКЦИОНЕРНОЕ ОБЩЕСТВО \"ФАТЕЖСКОЕ ДОРОЖНОЕ РЕМОНТНО-СТРОИТЕЛЬНОЕ УПРАВЛЕНИЕ\"",
            result.SupplierName);
        Assert.Equal("4611014131", result.SupplierInn);
        Assert.Equal("461101001", result.SupplierKpp);
        Assert.Equal("712Ю8315001", result.SupplierPersonalAccount);
        Assert.Equal("03225643380000004402", result.SupplierAccount);
        Assert.Equal(
            "ОКЦ № 3 ГУ Банка России по ЦФО // УФК ПО КУРСКОЙ ОБЛАСТИ, г. Курск",
            result.SupplierBankName);
        Assert.Equal("013807906", result.SupplierBik);
        Assert.Equal("40102810545370000038", result.SupplierCorrespondentAccount);
        Assert.Equal("03221643380000004400", result.CustomerAccount);
        Assert.Equal("013807906", result.CustomerBik);
        Assert.Equal(
            "common-info+print-form:2462904043926000006", result.SourceFile);
    }

    [Fact]
    public void StripsMarkupFromCustomerName()
    {
        // В карточке наименование заказчика обёрнуто в ссылку на организацию —
        // в реестр должно попасть имя, а не <a href=…>.
        var result = _parser.Parse(LinkedCustomerHtml, null, "2462904043926000006");

        Assert.NotNull(result);
        Assert.Equal("ОБЛАСТНОЕ КАЗЕННОЕ УЧРЕЖДЕНИЕ \"КУРСКАВТОДОР\"", result.CustomerName);
        Assert.Equal("4629040439", result.CustomerInn);
    }

    [Fact]
    public void ReturnsNullForPageWithoutSections()
    {
        Assert.Null(_parser.Parse(
            "<html><body>Технические работы</body></html>",
            null,
            "2462904043926000006"));
    }

    private const string CommonInfoHtml = """
        <html><body>
        <div class="cardMainInfo__section">
            <span class="cardMainInfo__title">Цена контракта</span>
            <span class="cardMainInfo__content cost">147 712 728,82&nbsp;&#8381;</span>
        </div>
        <section class="blockInfo__section section">
            <span class="section__title">Номер контракта</span>
            <span class="section__info">14Р_26</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Дата заключения контракта</span>
            <span class="section__info">20.02.2026</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Предмет контракта</span>
            <span class="section__info">Ремонт автомобильной дороги</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Идентификационный код закупки (ИКЗ)</span>
            <span class="section__info">262462904043946320100100050014211244</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Полное наименование заказчика</span>
            <span class="section__info">ОБЛАСТНОЕ КАЗЕННОЕ УЧРЕЖДЕНИЕ "КУРСКавтодор"</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">ИНН</span>
            <span class="section__info">4629040439</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">КПП</span>
            <span class="section__info">463201001</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Дата начала исполнения контракта</span>
            <span class="section__info">17.02.2026
                <img class="icon-note-contract displayNone" data-id="contractTermStart"/>
            </span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Дата окончания исполнения контракта</span>
            <span class="section__info">21.12.2026</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Размер аванса</span>
            <span class="section__info">29.59%, что составляет 43 701 531,08 ₽</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Размер обеспечения исполнения контракта, ₽</span>
            <span class="section__info">1 500 000,00</span>
        </section>
        </body></html>
        """;

    private const string LinkedCustomerHtml = """
        <html><body>
        <section class="blockInfo__section section">
            <span class="section__title">Номер контракта</span>
            <span class="section__info">3Р_26</span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">Полное наименование заказчика</span>
            <span class="section__info">
                <a target="_blank" href="/epz/organization/view/info.html?organizationCode=01442000018"
                   rel="noopener" onclick="window.open(this.href); return false;">
                    ОБЛАСТНОЕ КАЗЕННОЕ УЧРЕЖДЕНИЕ "КУРСКАВТОДОР"
                </a>
            </span>
        </section>
        <section class="blockInfo__section section">
            <span class="section__title">ИНН</span>
            <span class="section__info">4629040439</span>
        </section>
        </body></html>
        """;

    private const string PrintFormHtml = """
        <html><body>
        <table>
            <tr>
                <td rowspan="1">Заказчик:<br>ОБЛАСТНОЕ КАЗЕННОЕ УЧРЕЖДЕНИЕ "КУРСКавтодор"<br>ИНН: 4629040439,<br>КПП: 463201001</td>
                <td>Лицевой счет в ФК</td>
                <td>03442Р11220</td>
                <td>03221643380000004400</td>
                <td>ОКЦ № 3 ГУ Банка России по ЦФО // УФК ПО КУРСКОЙ ОБЛАСТИ, г. Курск<br>БИК: 013807906, к/с: 40102810545370000038</td>
                <td></td>
            </tr>
            <tr>
                <td rowspan="1">Поставщик (подрядчик, исполнитель):<br>АКЦИОНЕРНОЕ ОБЩЕСТВО "ФАТЕЖСКОЕ ДОРОЖНОЕ РЕМОНТНО-СТРОИТЕЛЬНОЕ УПРАВЛЕНИЕ"<br><br>ИНН: 4611014131,<br>КПП: 461101001</td>
                <td>Лицевой счет в ФК</td>
                <td>712Ю8315001</td>
                <td>03225643380000004402</td>
                <td>ОКЦ № 3 ГУ Банка России по ЦФО // УФК ПО КУРСКОЙ ОБЛАСТИ, г. Курск<br>БИК: 013807906, к/с: 40102810545370000038</td>
                <td>МИНИСТЕРСТВО ФИНАНСОВ И БЮДЖЕТНОГО КОНТРОЛЯ КУРСКОЙ ОБЛАСТИ</td>
            </tr>
        </table>
        </body></html>
        """;
}
