using System.IO.Compression;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Tests;

/// <summary>Этап 2: токен в HTTP-заголовке, SHA-256 и отбраковка битых ZIP.</summary>
public sealed class ArchiveDownloaderTests
{
    [Fact]
    public async Task Download_WritesVerifiedZipAndComputesSha256()
    {
        var directory = NewDirectory();
        try
        {
            var bytes = CreateZip();
            string? token = null;
            var downloader = CreateDownloader(directory, request =>
            {
                token = request.Headers.GetValues("individualPerson_token").Single();
                Assert.Equal("/eis/archives/42.zip", request.RequestUri!.AbsolutePath);
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(bytes) };
            });

            var archive = await downloader.DownloadAsync("https://zakupki.gov.ru/eis/archives/42.zip");

            Assert.Equal("token-1", token);
            Assert.Equal(Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(), archive.Sha256);
            Assert.Equal(bytes.LongLength, archive.SizeBytes);
            Assert.True(File.Exists(archive.LocalPath));
            Assert.EndsWith(".zip", archive.LocalPath, StringComparison.Ordinal);
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Fact]
    public async Task Download_CorruptArchive_ThrowsAndCleansTemporaryFile()
    {
        var directory = NewDirectory();
        try
        {
            var downloader = CreateDownloader(directory, _ => new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(Encoding.UTF8.GetBytes("это не ZIP")),
            });

            await Assert.ThrowsAnyAsync<Exception>(() =>
                downloader.DownloadAsync("https://zakupki.gov.ru/eis/archives/bad.zip"));

            Assert.Empty(Directory.GetFiles(directory));
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    private static ArchiveDownloader CreateDownloader(
        string directory,
        Func<HttpRequestMessage, HttpResponseMessage> respond)
    {
        var options = Options.Create(new EisClientOptions
        {
            IndividualPersonToken = "token-1",
            BaseTunnelUrl = "http://127.0.0.1:8080",
            SkipTunnelProbe = true,
            RequestDelayMs = 0,
            MaxRetryAttempts = 0,
            ArchiveDirectory = directory,
        });
        return new ArchiveDownloader(new HttpClient(new StubHandler(respond)), options,
            NullLogger<ArchiveDownloader>.Instance);
    }

    private static string NewDirectory()
    {
        var directory = Path.Combine(Path.GetTempPath(), $"eis-download-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        return directory;
    }

    private static byte[] CreateZip()
    {
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var entry = zip.CreateEntry("notice.xml");
            using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false));
            writer.Write("<epNotificationEF2020><purchaseNumber>01234567890123456789</purchaseNumber></epNotificationEF2020>");
        }

        return stream.ToArray();
    }

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(respond(request));
    }
}
