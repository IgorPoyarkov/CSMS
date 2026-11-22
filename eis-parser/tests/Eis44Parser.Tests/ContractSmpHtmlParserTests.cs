using Eis44Parser.Core;

namespace Eis44Parser.Tests;

/// <summary>
/// Подтаблица «Информация о привлечении СМП, СОНО» из HTML-карточки контракта.
/// С 2026 года заказчик не публикует субподрядчиков в XML, но на сайте вкладка
/// «Общая информация» содержит и требование, и таблицу субподрядов.
/// </summary>
public sealed class ContractSmpHtmlParserTests
{
    private readonly ContractSmpHtmlParser _parser = new();

    [Fact]
    public void ParsesRequirementAndSubcontractorsFromHtml()
    {
        var result = _parser.Parse(CardHtml, "2462904043926000006");

        Assert.NotNull(result);
        Assert.Equal(25.0m, result.RequirementPercent);
        Assert.Equal(36_928_182.21m, result.RequirementSum);
        Assert.Equal("html:2462904043926000006", result.SourceFile);
        // В HTML текст ответственности не выводится — его оставляет XML-парсер
        Assert.Null(result.Responsibility);

        Assert.Equal(2, result.Subcontractors.Count);

        var company = result.Subcontractors[0];
        Assert.Equal("3129002200", company.Inn);
        Assert.Equal("312001001", company.Kpp);
        Assert.Equal("ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ \"СЕЛЕНА\"", company.Name);
        Assert.Equal("30", company.StatusCode);
        Assert.Equal("субъект малого предпринимательства", company.StatusName);
        Assert.Equal(940_000.00m, company.ContractSum);
        Assert.Equal("105-26 ПО", company.ContractNumber);
        // Сайт отдаёт дату как 20.04.2026, в проекции она в ISO, как из XML
        Assert.Equal("2026-04-20", company.ContractDate);
        Assert.Equal("Поставка товара", company.ContractSubject);
        Assert.Equal("42.11.20.200", company.Okpd2Code);

        // ИП: КПП нет, статус СОНО (40) — фронт покажет отдельной подписью
        var individual = result.Subcontractors[1];
        Assert.Equal("462900896079", individual.Inn);
        Assert.Null(individual.Kpp);
        Assert.Equal("40", individual.StatusCode);
        Assert.Equal("социально ориентированная некоммерческая организация", individual.StatusName);
        Assert.Equal(494_590.16m, individual.ContractSum);
        Assert.Equal("04/05/2026-01", individual.ContractNumber);
        Assert.Equal("2026-05-04", individual.ContractDate);
        Assert.Equal("42.11.20.200", individual.Okpd2Code);
    }

    [Fact]
    public void ReturnsNullWhenCardHasNoSmpSection()
    {
        const string html = """
            <html><body>
            <h2>Общая информация</h2>
            <section class="blockInfo__section section">
                <span class="section__title">Цена контракта</span>
                <span class="section__info">1 000,00 ₽</span>
            </section>
            </body></html>
            """;

        Assert.Null(_parser.Parse(html, "2462904043926000006"));
    }

    [Fact]
    public void ReadsRequirementWhenSubcontractorsAreNotPublished()
    {
        // У большинства контрактов 2026 года в HTML есть только требование:
        // таблица субподрядчиков появляется после публикации сведений.
        const string html = """
            <section class="blockInfo__section section">
                <span class="section__title">Объем привлечения к исполнению контракта субподрядчиков,
                    соисполнителей из числа СМП, СОНО
                </span>
                <span class="section__info">25%</span>
            </section>
            """;

        var result = _parser.Parse(html, "2462904043926000006");

        Assert.NotNull(result);
        Assert.Equal(25.0m, result.RequirementPercent);
        Assert.Null(result.RequirementSum);
        Assert.Empty(result.Subcontractors);
    }

    [Fact]
    public void ParsesPrintFormWithFullSubcontractorTable()
    {
        // Печатная форма — основной источник: вкладка «Общая информация»
        // обрезает таблицу до 10 строк, а здесь приходят все субдоговоры.
        var result = _parser.Parse(PrintFormHtml, "2462904043925000011");

        Assert.NotNull(result);
        Assert.Equal(25.0m, result.RequirementPercent);
        Assert.Equal(67_892_027.98m, result.RequirementSum);
        Assert.Equal(2, result.Subcontractors.Count);

        var first = result.Subcontractors[0];
        Assert.Equal("4632306640", first.Inn);
        Assert.Equal("463201001", first.Kpp);
        Assert.Contains("ЛИДЕР ГРУПП", first.Name, StringComparison.Ordinal);
        Assert.Equal("30", first.StatusCode);
        // Запятая из ячейки «Статус» в название статуса не попадает
        Assert.Equal("субъект малого предпринимательства", first.StatusName);
        Assert.Equal(0.00m, first.ContractSum);
        Assert.Equal("01/09/26/20Р", first.ContractNumber);
        Assert.Equal("2026-10-28", first.ContractDate);
        Assert.Contains("строительных машин", first.ContractSubject, StringComparison.Ordinal);
        // В печатной форме ОКПД2 нет — поле остаётся пустым
        Assert.Null(first.Okpd2Code);

        Assert.Equal("40", result.Subcontractors[1].StatusCode);
        Assert.Equal(4_001_827.62m, result.Subcontractors[1].ContractSum);
        // Часть строк печатной формы отдаёт дату договора в ISO — она тоже
        // должна разобраться, а номер не должен тянуть за собой «от …»
        Assert.Equal("18/05/2026-02", result.Subcontractors[1].ContractNumber);
        Assert.Equal("2026-05-18", result.Subcontractors[1].ContractDate);
    }

    /// <summary>Срез реальной разметки карточки 2462904043926000006.</summary>
    private const string CardHtml = """
        <html><body>
        <section class="blockInfo__section section">
            <span class="section__title">Объем привлечения к исполнению контракта субподрядчиков,
                соисполнителей из числа СМП, СОНО
            </span>
            <span class="section__info">
                25%
                , что составляет
                36 928 182,21, ₽
            </span>
        </section>

        <h2 class="blockInfo__title">Информация о субподрядчиках, соисполнителях из числа СМП, СОНО</h2>
        <div class="subcontractorsInnerHtml">
        <table class="blockInfo__table tableBlock grayBorderBottom">
        <tbody class="tableBlock__body">
            <tr class="tableBlock__row">
                <td class="tableBlock__col">
                    <img src="/epz/static/img/icons/icon_expander_uncover.svg"
                         alt="Раскрыть" class="draftArrow cursorPointer"
                         data-id="3036432">
                </td>
                <td class="tableBlock__col">
                    ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "СЕЛЕНА"
                </td>
                <td class="tableBlock__col">
                    3129002200
                </td>
                <td class="tableBlock__col">
                    312001001
                    <br>25.04.2022
                </td>
                <td class="tableBlock__col">
                    309296, БЕЛГОРОДСКАЯ ОБЛАСТЬ, Г. ШЕБЕКИНО, УЛ. РЖЕВСКОЕ ШОССЕ, Д. 25
                </td>
                <td class="tableBlock__col">
                    №
                    105-26 ПО
                    <br/>
                    от 20.04.2026
                </td>
                <td class="tableBlock__col">
                    Поставка товара
                </td>
                <td class="tableBlock__col text-right">
                    940 000,00 руб.
                </td>
            </tr>

            <tr class="tableBlock__row subContractor-3036432" style="display:none;">
                <td colspan="100%">
                    <h2 class="blockInfo__title">Сведения о субподрядчике, соисполнителе</h2>
                    <section class="blockInfo__section section">
                        <span class="section__title">Полное наименование</span>
                        <span class="section__info">
                            ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "СЕЛЕНА"
                        </span>
                    </section>
                    <section class="blockInfo__section section">
                        <span class="section__title">Статус</span>
                        <span class="section__info">
                            30 - субъект малого предпринимательства
                        </span>
                    </section>
                    <h2 class="blockInfo__title">Сведения об объекте закупок</h2>
                    <table class="blockInfo__table tableBlock grayBorderBottom">
                        <tbody class="tableBlock__body">
                            <tr class="tableBlock__row">
                                <td class=" tableBlock__col tableBlock__col_first">Поставка товара</td>
                                <td class="tableBlock__col tableBlock__col_right">42.11.20.200</td>
                                <td class="tableBlock__col">Условная единица (усл. ед)</td>
                                <td class="tableBlock__col tableBlock__col_right">940 000,00</td>
                                <td class="tableBlock__col">1</td>
                                <td class="tableBlock__col tableBlock__col_right">940 000,00</td>
                                <td class="tableBlock__col">22%</td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>

            <tr class="tableBlock__row">
                <td class="tableBlock__col">
                    <img src="/epz/static/img/icons/icon_expander_uncover.svg"
                         alt="Раскрыть" class="draftArrow cursorPointer"
                         data-id="3036431">
                </td>
                <td class="tableBlock__col">
                    СЕРГЕЙ
                    ВИКТОРОВИЧ
                    ИЛЬИН
                </td>
                <td class="tableBlock__col">
                    462900896079
                </td>
                <td class="tableBlock__col">
                    <br>28.11.2022
                </td>
                <td class="tableBlock__col">
                    305014, КУРСКАЯ ОБЛАСТЬ, Г. Курск, УЛ. Поныровская, Д.35
                </td>
                <td class="tableBlock__col">
                    №
                    04/05/2026-01
                    <br/>
                    от 04.05.2026
                </td>
                <td class="tableBlock__col">
                    Перевозка груза автомобильным транспортом
                </td>
                <td class="tableBlock__col text-right">
                    494 590,16 руб.
                </td>
            </tr>

            <tr class="tableBlock__row subContractor-3036431" style="display:none;">
                <td colspan="100%">
                    <section class="blockInfo__section section">
                        <span class="section__title">Статус</span>
                        <span class="section__info">
                            40 - социально ориентированная некоммерческая организация
                        </span>
                    </section>
                    <h2 class="blockInfo__title">Сведения об объекте закупок</h2>
                    <table class="blockInfo__table tableBlock grayBorderBottom">
                        <tbody class="tableBlock__body">
                            <tr class="tableBlock__row">
                                <td class=" tableBlock__col tableBlock__col_first">Перевозка груза</td>
                                <td class="tableBlock__col tableBlock__col_right">42.11.20.200</td>
                                <td class="tableBlock__col">Условная единица (усл. ед)</td>
                                <td class="tableBlock__col tableBlock__col_right">494 590,16</td>
                                <td class="tableBlock__col">1</td>
                                <td class="tableBlock__col tableBlock__col_right">494 590,16</td>
                                <td class="tableBlock__col">Без НДС</td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
        </table>
        </div>
        </body></html>
        """;

    /// <summary>Срез печатной формы карточки 2462904043925000011.</summary>
    private const string PrintFormHtml = """
        <html><body>
        <table cellpadding="0" cellspacing="0">
            <tr>
                <td class="right-pad">Объем привлечения к исполнению контракта субподрядчиков, соисполнителей из числа СМП, СОНО в %</td>
                <td class="col-border ">25.00</td>
            </tr>
            <tr>
                <td class="right-pad">Объем привлечения к исполнению контракта субподрядчиков, соисполнителей из числа СМП, СОНО в рублях</td>
                <td class="col-border ">67 892 027.98</td>
            </tr>
        </table>

        <center>Информация о субподрядчиках, соисполнителях из числа СМП, СОНО</center>
        <table cellpadding="0" cellspacing="0" class="border-table contract-cell-content">
            <tr class="border-table-head">
                <td>№ п/п</td>
                <td>Наименование юридического лица</td>
                <td>Адрес места нахождения</td>
                <td>Адрес почтовый</td>
                <td>ИНН</td>
                <td>КПП</td>
                <td>ОКОПФ</td>
                <td>Статус</td>
                <td>Реквизиты договора</td>
                <td>Предмет договора</td>
                <td>Способ указания цены договора</td>
                <td>Цена договора</td>
            </tr>
            <tr>
                <td style="text-align:left;">1</td>
                <td style="text-align:left;">2</td>
                <td style="text-align:left;">3</td>
                <td style="text-align:left;">4</td>
                <td style="text-align:left;">5</td>
                <td style="text-align:left;">6</td>
                <td style="text-align:left;">7</td>
                <td style="text-align:left;">8</td>
                <td style="text-align:left;">9</td>
                <td style="text-align:left;">10</td>
                <td style="text-align:left;">11</td>
                <td style="text-align:left;">12</td>
            </tr>
            <tr>
                <td>1</td>
                <td>ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ЛИДЕР ГРУПП". ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "ЛИДЕР ГРУПП"</td>
                <td>305000, КУРСКАЯ ОБЛАСТЬ, Г. КУРСК, УЛ ВАТУТИНА, ЗД. 25, ПОМЕЩ. VII</td>
                <td></td>
                <td>4632306640</td>
                <td>463201001</td>
                <td>12300 : Общество с ограниченной ответственностью</td>
                <td>30 - субъект малого предпринимательства, </td>
                <td>№ 01/09/26/20Р от 28.10.2026</td>
                <td>Оказание услуг по работе строительных машин и механизмов с экипажем</td>
                <td>Цена договора</td>
                <td>0.00 руб.</td>
            </tr>
            <tr>
                <td>2</td>
                <td>ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "БЕЛГОРОДСПЕЦСТРОЙ"</td>
                <td>308008, БЕЛГОРОДСКАЯ ОБЛАСТЬ, Г. БЕЛГОРОД, УЛ. МАГИСТРАЛЬНАЯ, Д. 2А</td>
                <td></td>
                <td>3123433874</td>
                <td>312301001</td>
                <td>12300 : Общество с ограниченной ответственностью</td>
                <td>40 - социально ориентированная некоммерческая организация, </td>
                <td>№18/05/2026-02 от 2026-05-18</td>
                <td>Выполнение работ по ремонту водопропускных труб</td>
                <td>Цена договора</td>
                <td>4 001 827.62 руб.</td>
            </tr>
        </table>
        </body></html>
        """;
}
