using System.Xml.Linq;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Tests;

/// <summary>
/// Маппинг реальных публичных XML правил нормирования из реестра ЕИС.
/// Источник: https://zakupki.gov.ru/epz/normalizationrules/search/results.html
/// </summary>
public sealed class NormalizationRulesParserTests
{
    private static XDocument Load(string name) => XDocument.Load(Path.Combine("test-data", name));

    [Fact]
    public void ParsesRequirementsForIndividualProducts()
    {
        var document = Load("norm-rule-672586.xml");

        Assert.True(NormalizationRulesParser.IsRegulationRules(document));
        var result = new NormalizationRulesParser().Parse(document, "norm-rule-672586.xml");

        Assert.Equal(556347, result.Id);
        Assert.Equal("019020000212624307", result.RegistryNumber);
        Assert.Equal("2026-11-20T17:27:52.244+05:00", result.PublishDate);
        Assert.Equal(7, result.TypeCode);
        Assert.Contains("Требования к отдельным видам", result.TypeName, StringComparison.Ordinal);
        Assert.Equal("Обсуждение проект", result.State);
        Assert.Equal("8901017212", result.PublishingOrgInn);
        Assert.Equal("01902000021", result.PublishingOrgRegNum);
        Assert.Contains("ЯМАЛО-НЕНЕЦКОГО", result.PublishingOrgName!, StringComparison.Ordinal);
        Assert.Equal("Приказ", result.BaseDocumentTypeName);
        Assert.Equal(["71000000"], result.RegionCodes);
        Assert.Equal(["Муниципальные образования Тюменской области"], result.RegionNames);
        Assert.Equal("ГО, ОУ ГВФ, МО", Assert.Single(result.ApprovedFor));
        Assert.Equal("2026-11-20T02:00:00.000+05:00", result.DiscussionStart);
        Assert.Equal("2026-11-30T02:00:00.000+05:00", result.DiscussionEnd);
        Assert.Contains("019020000212624307", result.RawXml, StringComparison.Ordinal);
    }

    [Fact]
    public void ParsesRegulatoryCostsAndAttachments()
    {
        var document = Load("norm-rule-672611.xml");

        var result = new NormalizationRulesParser().Parse(document, "norm-rule-672611.xml");

        Assert.Equal(556373, result.Id);
        Assert.Equal("015660005082624325", result.RegistryNumber);
        Assert.Equal(9, result.TypeCode);
        Assert.Contains("Нормативные затраты", result.TypeName, StringComparison.Ordinal);
        Assert.Equal("5981010782", result.PublishingOrgInn);
        Assert.Equal("Распоряжение", result.BaseDocumentTypeName);
        Assert.Equal(["57000000"], result.RegionCodes);
        Assert.Equal(2, result.Attachments.Count);
        Assert.All(result.Attachments, attachment =>
        {
            Assert.StartsWith("https://zakupki.gov.ru/44fz/filestore/", attachment.Url, StringComparison.Ordinal);
            Assert.EndsWith(".docx", attachment.FileName, StringComparison.Ordinal);
            Assert.True(attachment.FileSize > 0);
        });
        Assert.Contains("Проект правил нормирования", result.Attachments[0].TypeName, StringComparison.Ordinal);
        Assert.Contains("Пояснительная записка", result.Attachments[1].TypeName, StringComparison.Ordinal);
    }

    [Fact]
    public void EisDocumentParserTreatsRegulationRulesAsSeparateKind()
    {
        var document = Load("norm-rule-672586.xml");

        var result = new EisDocumentParser().Parse(document, "fcsRegulationRules.xml");

        Assert.Equal(EisDocumentKind.RegulationRules, result.Kind);
        Assert.Null(result.PurchaseNumber);
    }

    [Fact]
    public void RejectsWrongRoot()
    {
        var document = XDocument.Parse("<root><id>1</id></root>");

        Assert.Throws<ArgumentException>(() => new NormalizationRulesParser().Parse(document, "wrong.xml"));
    }
}
