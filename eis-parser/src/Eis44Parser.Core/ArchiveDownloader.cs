using System.IO.Compression;
using System.Security.Cryptography;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;

namespace Eis44Parser.Core;

/// <summary>
/// Этап 2 конвейера: скачать ZIP по ссылке из SOAP-ответа, посчитать SHA-256,
/// проверить целостность архива и положить его на диск. Токен передаётся и в
/// HTTP-заголовке — сервер отдачи требует его при скачивании архива.
/// </summary>
public sealed class ArchiveDownloader
{
    private readonly HttpClient _httpClient;
    private readonly EisClientOptions _options;
    private readonly ILogger<ArchiveDownloader> _logger;
    private readonly ResiliencePipeline<HttpResponseMessage> _pipeline;

    public ArchiveDownloader(
        HttpClient httpClient,
        IOptions<EisClientOptions> options,
        ILogger<ArchiveDownloader> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
        _httpClient.Timeout = TimeSpan.FromMinutes(Math.Max(1, _options.RequestTimeoutMinutes));
        _pipeline = EisHttpPolicies.CreateRetryPipeline(_options, logger);
    }

    /// <summary>Скачать архив и вернуть описание проверенного локального файла.</summary>
    public async Task<ArchiveFile> DownloadAsync(
        string archiveUrl,
        CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(archiveUrl, UriKind.Absolute, out var archiveUri))
        {
            throw new ArgumentException($"Некорректная ссылка на архив ЕИС: {archiveUrl}", nameof(archiveUrl));
        }

        if (!_options.SkipTunnelProbe)
        {
            await TunnelProbe.EnsureAvailableAsync(_options.BaseTunnelUrl, cancellationToken).ConfigureAwait(false);
        }

        await EisHttpPolicies.ThrottleAsync(_options, cancellationToken).ConfigureAwait(false);

        // ГОСТ-TLS terminates в локальном Stunnel, поэтому домен ЕИС в URL
        // заменяется на адрес туннеля, а путь и query сохраняются.
        var localUrl = $"{_options.BaseTunnelUrl.TrimEnd('/')}{archiveUri.PathAndQuery}";

        // Каждый ретрай Polly должен использовать свежий HttpRequestMessage —
        // отправленный однажды запрос повторно отправлять запрещено.
        using var response = await _pipeline
            .ExecuteAsync(async token =>
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, localUrl);
                request.Headers.Add("individualPerson_token", _options.IndividualPersonToken);
                return await _httpClient
                    .SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token)
                    .ConfigureAwait(false);
            }, cancellationToken)
            .ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            throw new HttpRequestException(
                $"Не удалось скачать архив ЕИС: {(int)response.StatusCode} {response.ReasonPhrase}. {Truncate(body)}");
        }

        var directory = string.IsNullOrWhiteSpace(_options.ArchiveDirectory)
            ? Path.Combine(Path.GetTempPath(), "csms-eis-archives")
            : _options.ArchiveDirectory;
        Directory.CreateDirectory(directory);

        var temporary = Path.Combine(directory, $"download-{Guid.NewGuid():N}.tmp");
        try
        {
            string sha256;
            long size;
            await using (var file = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None,
                             81920, FileOptions.Asynchronous))
            using (var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256))
            await using (var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false))
            {
                var buffer = new byte[81920];
                int read;
                while ((read = await stream.ReadAsync(buffer, cancellationToken).ConfigureAwait(false)) > 0)
                {
                    hash.AppendData(buffer.AsSpan(0, read));
                    await file.WriteAsync(buffer.AsMemory(0, read), cancellationToken).ConfigureAwait(false);
                }

                sha256 = Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant();
                size = file.Length;
            }

            VerifyZip(temporary);

            var finalPath = Path.Combine(directory, $"{sha256}.zip");
            if (!File.Exists(finalPath))
            {
                File.Move(temporary, finalPath);
            }
            else
            {
                File.Delete(temporary);
            }

            _logger.LogInformation("Архив ЕИС {Url} сохранён: {Path} ({Size} байт, SHA-256 {Hash})",
                archiveUrl, finalPath, size, sha256);
            return new ArchiveFile(archiveUrl, finalPath, sha256, size);
        }
        catch
        {
            if (File.Exists(temporary))
            {
                File.Delete(temporary);
            }

            throw;
        }
    }

    /// <summary>Проверка, что файл — небитый ZIP и все записи читаются до конца.</summary>
    private static void VerifyZip(string path)
    {
        using var stream = File.OpenRead(path);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        foreach (var entry in archive.Entries)
        {
            using var entryStream = entry.Open();
            var buffer = new byte[8192];
            while (entryStream.Read(buffer, 0, buffer.Length) > 0)
            {
            }
        }
    }

    private static string Truncate(string? value, int maxLength = 500)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Length <= maxLength ? value : value[..maxLength] + "…";
    }
}
