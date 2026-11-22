using System.IO.Compression;
using System.Xml.Linq;
using Eis44Parser.Core;

namespace Eis44Parser.Tests;

/// <summary>
/// Разбор исполнения контракта 2026 года: этап и вложенные акты приёмки
/// берутся из сырого XML contractProcedure без создания новых сущностей.
/// </summary>
public sealed class ContractExecutionParserTests
{
    private readonly ContractExecutionParser _parser = new();

    [Fact]
    public void ParsesStagesAndAcceptanceActsFromReal2026Archive()
    {
        var document = LoadFromZip(
            "contract-2462904043925000011-25.zip",
            "contractProcedure_24629040439250000110131_447861200.xml");

        Assert.True(ContractExecutionParser.IsContractExecution(document));

        var result = _parser.Parse(document, "contractProcedure_447861200.xml");

        Assert.Equal("2462904043925000011", result.RegNumber);
        var stage = Assert.Single(result.Stages);
        Assert.Equal(1, stage.Index);
        Assert.Equal("116850892", stage.Sid);
        Assert.Equal("2026-01-01", stage.StartDate);
        Assert.Equal("2026-12-21", stage.EndDate);
        Assert.Equal(2, stage.OrdinalNumber);

        var act = Assert.Single(stage.Acts);
        Assert.Equal("778267820", act.Sid);
        Assert.Equal("27/07/03", act.DocumentNumber);
        Assert.Equal("2026-07-27", act.DocumentDate);
        Assert.Equal("2026-07-29", act.AcceptanceDate);
        Assert.Equal(215_065_318.10m, act.Sum);
        Assert.Equal("019FAE88-7523-7FD4-92F7-31C7EA9D21B7", act.GuidEdi);
    }

    [Fact]
    public void WithoutStageFlagActGoesToFirstStage()
    {
        // В ЕИС отсутствие признака этапности означает первый (единственный) этап.
        var xml = """
            <contractProcedure>
              <regNum>2462904043926000006</regNum>
              <docAcceptance>
                <sid>778267821</sid>
                <documentNum>17/07/01</documentNum>
                <documentDate>2026-09-25</documentDate>
                <deliveryAcceptDate>2026-09-25</deliveryAcceptDate>
                <totalPaymentAmount>1892932.32</totalPaymentAmount>
              </docAcceptance>
            </contractProcedure>
            """;

        var result = _parser.Parse(XDocument.Parse(xml), "act.xml");
        var stage = Assert.Single(result.Stages);

        Assert.Equal("2462904043926000006", result.RegNumber);
        Assert.Equal(1, stage.Index);
        Assert.Null(stage.Sid);
        var act = Assert.Single(stage.Acts);
        Assert.Equal("17/07/01", act.DocumentNumber);
        Assert.Equal(1_892_932.32m, act.Sum);
    }

    [Fact]
    public void ParsesAllArchiveExecutionDocumentsAndMergesVersionsOfSameAct()
    {
        // Девять XML за 2026 год содержат четыре разных акта в нескольких версиях:
        // ранняя версия — только номер, поздняя — сумма, дата приёмки и guidEDI.
        var path = Path.Combine(
            AppContext.BaseDirectory,
            "test-data",
            "contract-2462904043925000011-25.zip");
        using var stream = File.OpenRead(path);
        using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
        var documents = new List<(XDocument Document, string FileName)>();
        foreach (var entry in zip.Entries.Where(item =>
                     item.FullName.StartsWith("contractProcedure", StringComparison.Ordinal)))
        {
            using var entryStream = entry.Open();
            documents.Add((XDocument.Load(entryStream), entry.Name));
        }

        Assert.Equal(9, documents.Count);

        var result = _parser.ParseAll(documents);
        var stage = Assert.Single(result.Stages);

        Assert.Equal("2462904043925000011", result.RegNumber);
        Assert.Equal(1, stage.Index);
        Assert.Equal(4, stage.Acts.Count);
        Assert.All(stage.Acts, act => Assert.NotNull(act.Sum));
        Assert.Contains(stage.Acts,
            act => act.DocumentNumber == "27/07/03" && act.Sum == 215_065_318.10m);
    }

    private static XDocument LoadFromZip(string archiveName, string entryName)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-data", archiveName);
        using var stream = File.OpenRead(path);
        using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
        var entry = zip.GetEntry(entryName)
            ?? throw new InvalidOperationException($"В архиве {archiveName} нет {entryName}.");
        using var entryStream = entry.Open();
        return XDocument.Load(entryStream);
    }
}
