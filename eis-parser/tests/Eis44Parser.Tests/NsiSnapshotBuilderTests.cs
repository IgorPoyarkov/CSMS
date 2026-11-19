using Eis44Parser.Core;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Tests;

/// <summary>Проверки детерминированной версии снимка КТРУ.</summary>
public sealed class NsiSnapshotBuilderTests
{
    private static NsiPosition Position(string code, string name) => new(
        code,
        "32.50.13.190",
        name,
        true,
        new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["code"] = code,
            ["name"] = name,
            ["OKPD2"] = new Dictionary<string, object?> { ["code"] = "32.50.13.190" },
        });

    [Fact]
    public void Build_ДаётСтабильнуюВерсиюИ64Hex()
    {
        static NsiSnapshot Build() => NsiSnapshotBuilder.Build(
            "nsiKtru",
            "https://int.zakupki.gov.ru/eis-integration/services/getDocsIP",
            [Position("b", "Второй"), Position("a", "Первый")]);

        var first = Build();
        var second = Build();

        Assert.Equal(first.Version, second.Version);
        Assert.Equal(first.SourceSha256, second.SourceSha256);
        Assert.NotNull(first.SourceSha256);
        Assert.Equal(64, first.SourceSha256.Length);
        Assert.StartsWith("eis-nsiKtru-", first.Version);
        Assert.Equal(16, first.Version["eis-nsiKtru-".Length..].Length);
    }

    [Fact]
    public void Build_СортируетПозицииИСохраняетДатуПубликации()
    {
        var withDate = Position("a", "Первый") with
        {
            Payload = new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["code"] = "a",
                ["publishDate"] = "2026-03-01T00:00:00Z",
            },
        };

        var snapshot = NsiSnapshotBuilder.Build("nsiKtru", "https://example.test", [Position("b", "Второй"), withDate]);

        Assert.Equal(["a", "b"], snapshot.Items.Select(item => item.Code));
        Assert.Equal(new DateTimeOffset(2026, 3, 1, 0, 0, 0, TimeSpan.Zero), snapshot.PublishedAt);
    }

    [Fact]
    public void Build_ПустаяВыгрузкаОтклоняется()
    {
        Assert.Throws<ArgumentException>(() =>
            NsiSnapshotBuilder.Build("nsiKtru", "https://example.test", []));
    }
}
