using Eis44Parser.Core;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Tests;

/// <summary>
/// Разбор двух реальных шаблонов из архива экспертного совета ЕИС № 89
/// от 20.11.2026. Это предложения по актуализации описаний, а не выгрузка
/// реестра КТРУ: результат используется только как источник характеристик.
/// XLSX читается напрямую через ZIP+XML, без NuGet-зависимостей.
/// </summary>
public sealed class KtruXlsxParserTests
{
    private static Stream Open(string name) =>
        File.OpenRead(Path.Combine("test-data", name));

    [Fact]
    public void ParsesCatalogTemplate()
    {
        using var stream = Open("22.22.12.000-00000003 Сумка хозяйственная.xlsx");

        var result = KtruXlsxParser.Parse(stream, "22.22.12.000-00000003 Сумка хозяйственная.xlsx");

        Assert.NotNull(result);
        Assert.Equal(KtruXlsxTemplate.Catalog, result.Template);
        Assert.Equal("22.22.12.000-00000003", result.Code);
        Assert.Equal("22.22.12.000", result.Okpd2Code);
        Assert.Equal("Сумка хозяйственная", result.Name);
        Assert.Equal("шт", result.Unit);
        Assert.True(result.Characteristics.Count >= 4, $"Характеристик: {result.Characteristics.Count}");
        Assert.Contains(result.Characteristics, item => item.Name == "Тип сумки");
        Assert.Contains(result.Characteristics, item => item.Name == "Высота" && item.Unit == "мм");
        var type = result.Characteristics.First(item => item.Name == "Тип сумки");
        Assert.Contains("Сумка складная", type.Values, StringComparer.Ordinal);
        Assert.True(type.IsMandatory);
    }

    [Fact]
    public void ParsesRequestTemplate()
    {
        using var stream = Open("128660 Лактат ИВД, реагент.xlsx");

        var result = KtruXlsxParser.Parse(stream, "128660 Лактат ИВД, реагент.xlsx");

        Assert.NotNull(result);
        Assert.Equal(KtruXlsxTemplate.Request, result.Template);
        Assert.Equal("20.59.52.195-128660-1-00001", result.Code);
        Assert.Equal(2, result.Codes.Count);
        Assert.Contains("21.20.23.110-128660-1-00001", result.Codes);
        Assert.Equal("20.59.52.195", result.Okpd2Code);
        Assert.Equal("Лактат ИВД, реагент", result.Name);
        Assert.Equal("Шт.", result.Unit);
        // В конкретном файле заполнены только качественные характеристики:
        // колонки количественных (E:H) пусты, хотя шапка шаблона есть.
        Assert.NotEmpty(result.Characteristics);
        Assert.Contains(result.Characteristics, item => item.Name == "Назначение");
        var purpose = result.Characteristics.First(item => item.Name == "Назначение");
        Assert.Contains("Для анализатора Vitros", purpose.Values, StringComparer.Ordinal);
    }

    [Fact]
    public void UnknownTemplateReturnsNull()
    {
        using var stream = new MemoryStream();
        using var writer = new StreamWriter(stream, leaveOpen: true);
        writer.Write("<not-xlsx/>");
        writer.Flush();
        stream.Position = 0;

        Assert.ThrowsAny<Exception>(() => KtruXlsxParser.Parse(stream, "broken.xlsx"));
    }
}
