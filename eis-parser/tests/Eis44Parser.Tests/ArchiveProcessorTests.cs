using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging.Abstractions;

namespace Eis44Parser.Tests;

/// <summary>Этап 3: потоковое чтение ZIP, хеширование и разбор XML.</summary>
public sealed class ArchiveProcessorTests
{
    private readonly ArchiveProcessor _processor = new(new EisDocumentParser(), NullLogger<ArchiveProcessor>.Instance);

    [Fact]
    public async Task ProcessAsync_ParsesAllXmlAndKeepsArchiveHash()
    {
        var directory = Path.Combine(Path.GetTempPath(), $"eis-parser-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        try
        {
            var bytes = CreateZip(
                ("notice.xml", "<epNotificationEF2020><purchaseNumber>01234567890123456789</purchaseNumber></epNotificationEF2020>"),
                ("contract.xml", "<contract><regNum>01234567890123456789-1</regNum><contractPrice>10.5</contractPrice></contract>"));
            var path = Path.Combine(directory, "test.zip");
            await File.WriteAllBytesAsync(path, bytes);
            var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

            var result = await _processor.ProcessAsync(
                new ArchiveFile("https://example.test/a.zip", path, hash, bytes.LongLength));

            Assert.Equal(hash, result.ArchiveSha256);
            Assert.Equal(bytes.LongLength, result.ArchiveSizeBytes);
            Assert.Equal(2, result.Documents.Count);
            Assert.Contains(result.Documents, document => document.Kind == EisDocumentKind.Purchase);
            Assert.Contains(result.Documents, document => document.Kind == EisDocumentKind.Contract);
            Assert.All(result.Documents, document => Assert.Equal(64, document.DocumentSha256.Length));
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    [Fact]
    public async Task ProcessAsync_RejectsFileWithoutXml()
    {
        var directory = Path.Combine(Path.GetTempPath(), $"eis-parser-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        try
        {
            var path = Path.Combine(directory, "empty.zip");
            using (var stream = File.Create(path))
            using (var zip = new ZipArchive(stream, ZipArchiveMode.Create))
            {
                zip.CreateEntry("readme.txt");
            }

            await Assert.ThrowsAsync<InvalidDataException>(() => _processor.ProcessAsync(
                new ArchiveFile("https://example.test/empty.zip", path, "hash", new FileInfo(path).Length)));
        }
        finally
        {
            Directory.Delete(directory, recursive: true);
        }
    }

    private static byte[] CreateZip(params (string Name, string Xml)[] files)
    {
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, xml) in files)
            {
                var entry = zip.CreateEntry(name);
                using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(false));
                writer.Write(xml);
            }
        }

        return stream.ToArray();
    }
}
