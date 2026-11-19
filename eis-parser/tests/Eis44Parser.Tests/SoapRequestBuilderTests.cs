using System.Xml.Linq;
using Eis44Parser.Core;
using Xunit;

namespace Eis44Parser.Tests;

/// <summary>Проверки строгого порядка тегов SOAP-запросов.</summary>
public sealed class SoapRequestBuilderTests
{
    private static readonly Guid RequestId = Guid.Parse("11111111-2222-3333-4444-555555555555");
    private static readonly DateTime CreatedAt = new(2026, 11, 19, 10, 30, 0, DateTimeKind.Utc);

    [Fact]
    public void RegionRequest_PreservesSequenceAndEscapesToken()
    {
        var xml = SoapRequestBuilder.BuildRegionRequest(
            "token&1",
            "31",
            "epNotificationEF2020",
            new DateTime(2026, 11, 18),
            "PRIZ",
            "PROD",
            RequestId,
            CreatedAt);

        var document = XDocument.Parse(xml);
        Assert.Equal("Envelope", document.Root?.Name.LocalName);

        var token = document.Descendants()
            .Single(element => element.Name.LocalName == "individualPerson_token")
            .Value;
        Assert.Equal("token&1", token);

        var selection = document.Descendants()
            .Single(element => element.Name.LocalName == "selectionParams");
        Assert.Equal(
            ["orgRegion", "subsystemType", "documentType44", "periodInfo"],
            selection.Elements().Select(element => element.Name.LocalName));

        Assert.Equal(
            "2026-11-18",
            document.Descendants().Single(element => element.Name.LocalName == "exactDate").Value);
        Assert.Equal(
            "PROD",
            document.Descendants().Single(element => element.Name.LocalName == "mode").Value);
    }

    [Fact]
    public void ReestrNumberRequest_PreservesSequence()
    {
        var xml = SoapRequestBuilder.BuildReestrNumberRequest(
            "token",
            "01234567890123456789",
            "RPEC",
            "PROD",
            RequestId,
            CreatedAt);

        var selection = XDocument.Parse(xml)
            .Descendants()
            .Single(element => element.Name.LocalName == "selectionParams");

        Assert.Equal(
            ["subsystemType", "reestrNumber"],
            selection.Elements().Select(element => element.Name.LocalName));
        Assert.Equal(
            "01234567890123456789",
            selection.Elements().Single(element => element.Name.LocalName == "reestrNumber").Value);
    }

    [Fact]
    public void NsiRequest_PreservesSequenceAndValidatesKind()
    {
        var xml = SoapRequestBuilder.BuildNsiRequest(
            "token&1",
            "nsiKtru",
            "all",
            "PROD",
            RequestId,
            CreatedAt);

        var document = XDocument.Parse(xml);
        Assert.Equal("Envelope", document.Root?.Name.LocalName);
        Assert.Equal("getNsiRequest", document.Descendants()
            .Single(element => element.Name.LocalName == "getNsiRequest").Name.LocalName);
        Assert.Equal("token&1", document.Descendants()
            .Single(element => element.Name.LocalName == "individualPerson_token").Value);

        var selection = document.Descendants()
            .Single(element => element.Name.LocalName == "selectionParams");
        Assert.Equal(["nsiCode44", "nsiKind"], selection.Elements().Select(e => e.Name.LocalName));
        Assert.Equal("nsiKtru", selection.Elements().Single(e => e.Name.LocalName == "nsiCode44").Value);
        Assert.Equal("all", selection.Elements().Single(e => e.Name.LocalName == "nsiKind").Value);
        Assert.Equal("PROD", document.Descendants().Single(e => e.Name.LocalName == "mode").Value);

        Assert.Throws<ArgumentException>(() => SoapRequestBuilder.BuildNsiRequest(
            "token", "nsiKtru", "full", "PROD", RequestId, CreatedAt));
    }
}
