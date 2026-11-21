using Eis44Parser.Core;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging.Abstractions;

namespace Eis44Parser.Tests;

/// <summary>
/// Этап 3 на настоящем ZIP из ЕИС: 1 контракт + 9 документов о исполнении.
/// Именно здесь обнаружилось, что корень файлов — &lt;export&gt;, а не тип документа.
/// </summary>
public sealed class EisArchiveProcessorRealZipTests
{
    [Fact]
    public async Task ProcessesRealContractArchive()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-data", "contract-2462904043925000011-25.zip");
        var archive = new ArchiveFile(
            "file://contract-2462904043925000011-25.zip",
            path,
            "fixture",
            new FileInfo(path).Length);
        var processor = new ArchiveProcessor(new EisDocumentParser(), NullLogger<ArchiveProcessor>.Instance);

        var result = await processor.ProcessAsync(archive);

        Assert.Equal(10, result.Documents.Count);
        Assert.All(result.Documents, document => Assert.Equal(EisDocumentKind.Contract, document.Kind));

        var contract = Assert.Single(result.Documents,
            document => document.FileName.StartsWith("contract_", StringComparison.Ordinal));
        Assert.Equal("2462904043925000011", contract.RegNumber);
        Assert.Equal("0144200001825000020", contract.PurchaseNumber);
        Assert.Equal("252462904043946320100100260074211244", contract.Ikz);
        Assert.Equal("4629040439", contract.CustomerInn);
        Assert.Contains("КУРСКАВТОДОР", contract.CustomerName, StringComparison.Ordinal);
        Assert.Equal("4621009123", contract.SupplierInn);
        Assert.Contains("ТЕРРА", contract.SupplierName, StringComparison.Ordinal);
        Assert.Equal(271_568_111.92m, contract.Price);
        Assert.Equal("2026-11-19T11:50:38.381+03:00", contract.PublishDate);
        Assert.Contains("ремонту автомобильной дороги Курск-Касторное", contract.ObjectInfo, StringComparison.Ordinal);

        var item = Assert.Single(contract.Items);
        Assert.Equal("42.11.20.200", item.Okpd2Code);
        Assert.StartsWith("Выполнение работ по ремонту автомобильной дороги", item.ItemName, StringComparison.Ordinal);
        Assert.Equal(1m, item.Quantity);
        Assert.Equal(271_568_111.92m, item.Price);
    }
}
