using System.Net.Sockets;

namespace Eis44Parser.Core;

/// <summary>
/// Проверка доступности локального ГОСТ-туннеля, через который ходят запросы к ЕИС.
/// Отдельный TCP-пинг нужен, чтобы ошибка «туннель не поднят» не маскировалась
/// под таймаут/сетевую ошибку HttpClient.
/// </summary>
public static class TunnelProbe
{
    /// <summary>Таймаут подключения к локальному туннелю.</summary>
    public static readonly TimeSpan ConnectTimeout = TimeSpan.FromSeconds(2);

    /// <summary>
    /// Проверить адрес туннеля и бросить понятное исключение, если он недоступен.
    /// </summary>
    public static async Task EnsureAvailableAsync(
        string baseTunnelUrl,
        CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(baseTunnelUrl, UriKind.Absolute, out var uri))
        {
            throw new InvalidOperationException(
                $"Некорректный адрес туннеля ЕИС: '{baseTunnelUrl}'. " +
                "Ожидается, например, http://127.0.0.1:8080.");
        }

        var port = uri.IsDefaultPort ? (uri.Scheme == Uri.UriSchemeHttps ? 443 : 80) : uri.Port;

        using var client = new TcpClient();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(ConnectTimeout);

        try
        {
            await client.ConnectAsync(uri.Host, port, timeout.Token).ConfigureAwait(false);
        }
        catch (Exception exception) when (exception is SocketException or OperationCanceledException)
        {
            throw new InvalidOperationException(
                $"Локальный ГОСТ-туннель недоступен: {uri.Host}:{port}. " +
                "Запустите stunnel с eis-parser/stunnel.conf " +
                "(accept=127.0.0.1:8080, connect=int.zakupki.gov.ru:443). " +
                "Старый хост int44.zakupki.gov.ru не используется — затем проверьте --check.",
                exception);
        }
    }
}
