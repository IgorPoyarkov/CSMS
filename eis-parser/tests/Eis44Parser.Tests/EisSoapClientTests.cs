using System.Net;
using System.Text;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Tests;

/// <summary>Этап 1: заголовки, разбор ответа и ошибки ЕИС без реальной сети.</summary>
public sealed class EisSoapClientTests
{
    [Fact]
    public async Task Fetch_UsesTokenAndSoapAction_DeduplicatesArchiveUrls()
    {
        string? token = null;
        string? soapAction = null;
        string? body = null;
        var client = CreateClient(request =>
        {
            token = request.Headers.GetValues("individualPerson_token").Single();
            soapAction = request.Headers.GetValues("SOAPAction").Single();
            body = request.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
            return SoapResponse("""
                <dataInfo>
                  <archiveUrl>https://example.test/a.zip</archiveUrl>
                  <archiveUrl>https://example.test/a.zip</archiveUrl>
                  <archiveUrl>https://example.test/b.zip</archiveUrl>
                </dataInfo>
                """);
        });

        var result = await client.FetchArchivesByRegionAsync(
            "31", "epNotificationEF2020", new DateOnly(2026, 11, 20), EisSubsystems.Priz);

        Assert.Equal(2, result.Count);
        Assert.Equal("token-1", token);
        Assert.Equal("http://zakupki.gov.ru/fz44/queue/ws/get-docs-ip", soapAction);
        Assert.Contains("<orgRegion>31</orgRegion>", body, StringComparison.Ordinal);
        Assert.Contains("<exactDate>2026-11-20</exactDate>", body, StringComparison.Ordinal);
        Assert.Contains("<individualPerson_token>token-1</individualPerson_token>", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Fetch_ThrowsDomainErrorFromEis()
    {
        var client = CreateClient(_ => SoapResponse("<dataInfo><errorInfo>Токены для сервисов отдачи отсутствуют</errorInfo></dataInfo>"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.FetchNsiArchiveUrlsAsync("nsiKTRU", "all"));

        Assert.Contains("Токены для сервисов отдачи", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Fetch_NoData_ReturnsEmpty()
    {
        var client = CreateClient(_ => SoapResponse("<dataInfo><noData>true</noData></dataInfo>"));

        Assert.Empty(await client.FetchArchivesByReestrNumberAsync("01234567890123456789", EisSubsystems.Rgk));
    }

    [Fact]
    public async Task Fetch_Transient503_RetriesWithFreshRequest()
    {
        var attempts = 0;
        var client = CreateClient(request =>
        {
            attempts++;
            Assert.Equal("token-1", request.Headers.GetValues("individualPerson_token").Single());
            return attempts == 1
                ? new HttpResponseMessage(HttpStatusCode.ServiceUnavailable) { Content = new StringContent("retry") }
                : SoapResponse("<dataInfo><archiveUrl>https://example.test/a.zip</archiveUrl></dataInfo>");
        }, maxRetries: 1);

        var result = await client.FetchArchivesByReestrNumberAsync("01234567890123456789", EisSubsystems.Priz);

        Assert.Equal(2, attempts);
        Assert.Equal("https://example.test/a.zip", Assert.Single(result));
    }

    private static EisSoapClient CreateClient(
        Func<HttpRequestMessage, HttpResponseMessage> respond,
        int maxRetries = 0)
    {
        var options = Options.Create(new EisClientOptions
        {
            IndividualPersonToken = "token-1",
            SkipTunnelProbe = true,
            RequestDelayMs = 0,
            MaxRetryAttempts = maxRetries,
            RetryBaseDelayMs = 100,
        });
        return new EisSoapClient(
            new HttpClient(new StubHandler(respond)),
            options,
            NullLogger<EisSoapClient>.Instance);
    }

    private static HttpResponseMessage SoapResponse(string body) =>
        new(HttpStatusCode.OK)
        {
            Content = new StringContent(
                $"<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\"><soapenv:Body>{body}</soapenv:Body></soapenv:Envelope>",
                Encoding.UTF8,
                "text/xml"),
        };

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(respond(request));
    }
}
