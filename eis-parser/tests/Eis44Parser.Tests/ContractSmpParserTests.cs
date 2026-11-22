using System.Xml.Linq;
using Eis44Parser.Core;

namespace Eis44Parser.Tests;

/// <summary>
/// Подтаблица «Информация о привлечении СМП, СОНО» из XML контракта карточки
/// ЕИС: требуемый объём (процент и сумма) и субподрядчики с реквизитами
/// субдоговоров. Проверяем на срезе реальной выгрузки контракта.
/// </summary>
public sealed class ContractSmpParserTests
{
    private readonly ContractSmpParser _parser = new();

    [Fact]
    public void ParsesRequirementAndSubcontractorsFromContractXml()
    {
        var document = Load("contract-with-smp-subcontractors.xml");

        Assert.True(ContractSmpParser.IsSmpDocument(document));

        var result = _parser.Parse(document, "contract_2462904043925000011.xml");

        Assert.Equal(25.0m, result.RequirementPercent);
        Assert.Equal(67_892_027.98m, result.RequirementSum);
        Assert.Equal("contract_2462904043925000011.xml", result.SourceFile);
        // Текст ответственности берётся из условия контракта, а не из сведений
        Assert.Contains("штрафа", result.Responsibility, StringComparison.Ordinal);

        // Повторный договор того же ИНН в XML схлопывается: 4 записи → 3
        Assert.Equal(3, result.Subcontractors.Count);

        var smp = result.Subcontractors[0];
        Assert.Equal("4632306640", smp.Inn);
        Assert.Equal("463201001", smp.Kpp);
        Assert.Contains("ЛИДЕР ГРУПП", smp.Name, StringComparison.Ordinal);
        Assert.Equal("30", smp.StatusCode);
        Assert.Equal("субъект малого предпринимательства", smp.StatusName);
        Assert.Equal(15_234_000.50m, smp.ContractSum);
        Assert.Equal("01/09/26/20Р", smp.ContractNumber);
        Assert.Equal("2026-10-28", smp.ContractDate);
        Assert.Equal("42.11.20.200", smp.Okpd2Code);
        Assert.Contains("строительных машин", smp.ContractSubject, StringComparison.Ordinal);

        // СОНО приходит с кодом 40 — фронт показывает его отдельной подписью
        Assert.Equal("40", result.Subcontractors[1].StatusCode);

        // У ИП нет fullName: ФИО собирается из lastName/firstName/middleName
        var individual = result.Subcontractors[2];
        Assert.Equal("463201234567", individual.Inn);
        Assert.Equal("Кузнецов Андрей Петрович", individual.Name);
    }

    [Fact]
    public void ReadsRequirementWhenSubcontractorsAreNotPublished()
    {
        // У контрактов 2026 года заказчик публикует только условие привлечения
        // (subcontractorsAttractionConditionsInfo), а субподрядчиков — ещё нет.
        // Требование при этом должно попасть в карточку.
        var document = XDocument.Parse(
            """
            <contract>
              <contractConditionsInfo>
                <subcontractorsAttractionConditionsInfo>
                  <subcontractorsAttractionVolume>25.0</subcontractorsAttractionVolume>
                  <responsibility>В виде штрафа в размере 5% от объема привлечения СМП</responsibility>
                </subcontractorsAttractionConditionsInfo>
              </contractConditionsInfo>
            </contract>
            """);

        Assert.True(ContractSmpParser.IsSmpDocument(document));

        var result = _parser.Parse(document, "Электронный контракт.xml");

        Assert.Equal(25.0m, result.RequirementPercent);
        Assert.Null(result.RequirementSum);
        Assert.Contains("штрафа", result.Responsibility, StringComparison.Ordinal);
        Assert.Empty(result.Subcontractors);
    }

    private static XDocument Load(string name)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-data", name);
        return XDocument.Load(path);
    }

    [Fact]
    public void ImportFromFilesBuildsSmpWithoutNetwork()
    {
        // Офлайн-переразбор (--reparse-card-dir): проекция собирается из уже
        // скачанных XML, клиент ЕИС при этом не вызывается.
        var importer = new ContractCardImportService(
            new PublicContractCardClient(),
            new AcceptanceActParser(),
            new GeneralAcceptanceParser(),
            new AcceptanceDecisionParser(),
            new EdoMessageParser(),
            new ContractExecutionParser(),
            new ContractSmpParser());

        var path = Path.Combine(
            AppContext.BaseDirectory, "test-data", "contract-with-smp-subcontractors.xml");
        IEnumerable<(string FileName, string? SourceArchive, byte[] Bytes)> files =
        [
            ("contract_2462904043925000011.xml", null, File.ReadAllBytes(path)),
        ];
        var view = importer.ImportFromFiles("2462904043925000011", files);

        var smp = Assert.Single(view.Smp);
        Assert.Equal(25.0m, smp.RequirementPercent);
        Assert.Equal(3, smp.Subcontractors.Count);
        Assert.Equal("2462904043925000011", view.RegNumber);
    }
}
