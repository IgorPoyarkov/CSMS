using System.IO.Compression;
using System.Xml.Linq;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;

namespace Eis44Parser.Core;

/// <summary>
/// Этап 3 конвейера: потоково читает XML из проверенного ZIP, разбирает их
/// версионно-устойчивым парсером и возвращает результат для слоя хранения.
/// Сам архив и отдельные XML остаются на диске/в БД как сырой слепок.
/// </summary>
public sealed class ArchiveProcessor(
    EisDocumentParser parser,
    ILogger<ArchiveProcessor> logger)
{
    /// <summary>Распаковать и разобрать все XML-файлы архива.</summary>
    public async Task<ArchiveProcessingResult> ProcessAsync(
        ArchiveFile archive,
        CancellationToken cancellationToken = default)
    {
        if (!File.Exists(archive.LocalPath))
        {
            throw new FileNotFoundException("Архив ЕИС не найден на диске.", archive.LocalPath);
        }

        var documents = new List<ParsedEisDocument>();

        await using var stream = new FileStream(archive.LocalPath, FileMode.Open, FileAccess.Read, FileShare.Read,
            81920, FileOptions.Asynchronous);
        using var zip = new ZipArchive(stream, ZipArchiveMode.Read);

        foreach (var entry in zip.Entries.Where(entry =>
                     entry.FullName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase)))
        {
            cancellationToken.ThrowIfCancellationRequested();

            await using var entryStream = entry.Open();
            var document = await XDocument.LoadAsync(entryStream, LoadOptions.None, cancellationToken)
                .ConfigureAwait(false);
            documents.Add(parser.Parse(document, entry.FullName));
        }

        if (documents.Count == 0)
        {
            throw new InvalidDataException($"В архиве {archive.SourceUrl} нет XML-документов.");
        }

        logger.LogInformation(
            "Архив {Archive}: прочитано {Count} XML, типов: {Kinds}",
            archive.SourceUrl,
            documents.Count,
            string.Join(", ", documents.GroupBy(item => item.Kind)
                .Select(group => $"{group.Key}={group.Count()}")));

        return new ArchiveProcessingResult(archive.Sha256, archive.SizeBytes, documents);
    }
}
