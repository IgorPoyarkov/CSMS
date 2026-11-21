namespace Eis44Parser.Core.Models;

/// <summary>Какой из двух шаблонов EIS распознан в XLSX.</summary>
public enum KtruXlsxTemplate
{
    /// <summary>«Идентификатор или № id…» — шаблон описания позиции каталога.</summary>
    Catalog = 0,

    /// <summary>«Код каталога ХХХХХХХХХ-…» — шаблон заявки на изменение описания.</summary>
    Request = 1,
}

/// <summary>Характеристика позиции КТРУ из шаблона экспертного совета.</summary>
public sealed record KtruXlsxCharacteristic(
    string Name,
    string? Unit,
    List<string> Values,
    bool? IsMandatory,
    string? SelectionType);

/// <summary>
/// Одна позиция из шаблона описания. Это предложение экспертного совета,
/// а не официальная выгрузка реестра: код и характеристики надо сверять с НСИ.
/// </summary>
public sealed record KtruXlsxPosition(
    string Code,
    IReadOnlyList<string> Codes,
    string Okpd2Code,
    IReadOnlyList<string> Okpd2Codes,
    string Name,
    string? Unit,
    string? Description,
    IReadOnlyList<KtruXlsxCharacteristic> Characteristics,
    KtruXlsxTemplate Template,
    string SourceFile);
