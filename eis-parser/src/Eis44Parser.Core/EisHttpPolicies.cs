using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

namespace Eis44Parser.Core;

/// <summary>Общая политика повторов для SOAP-запросов и скачивания архивов.</summary>
public static class EisHttpPolicies
{
    /// <summary>429/502/503/504,RequestTimeout и сетевые ошибки — с экспоненциальной задержкой.</summary>
    public static ResiliencePipeline<HttpResponseMessage> CreateRetryPipeline(
        EisClientOptions options,
        ILogger logger)
    {
        var builder = new ResiliencePipelineBuilder<HttpResponseMessage>();
        if (options.MaxRetryAttempts <= 0)
        {
            // Polly требует MaxRetryAttempts >= 1; ноль означает «без повторов».
            return builder.Build();
        }

        var delay = TimeSpan.FromMilliseconds(Math.Max(100, options.RetryBaseDelayMs));

        return builder
            .AddRetry(new RetryStrategyOptions<HttpResponseMessage>
            {
                MaxRetryAttempts = Math.Max(0, options.MaxRetryAttempts),
                Delay = delay,
                BackoffType = DelayBackoffType.Exponential,
                ShouldHandle = args => ValueTask.FromResult(
                    args.Outcome.Exception is HttpRequestException or TaskCanceledException ||
                    (args.Outcome.Result is { IsSuccessStatusCode: false } result && IsTransient(result.StatusCode))),
                OnRetry = args =>
                {
                    logger.LogWarning(
                        "Запрос к ЕИС повторяется (попытка {Attempt}): {Reason}",
                        args.AttemptNumber,
                        args.Outcome.Exception?.Message ?? args.Outcome.Result?.StatusCode.ToString());
                    return ValueTask.CompletedTask;
                },
            })
            .Build();
    }

    /// <summary>Пауза между запросами: ЕИС ограничивает частоту обращений с одного токена.</summary>
    public static Task ThrottleAsync(EisClientOptions options, CancellationToken cancellationToken) =>
        Task.Delay(TimeSpan.FromMilliseconds(Math.Max(0, options.RequestDelayMs)), cancellationToken);

    private static bool IsTransient(System.Net.HttpStatusCode statusCode) =>
        statusCode is System.Net.HttpStatusCode.TooManyRequests or
            System.Net.HttpStatusCode.RequestTimeout or
            System.Net.HttpStatusCode.InternalServerError or
            System.Net.HttpStatusCode.BadGateway or
            System.Net.HttpStatusCode.ServiceUnavailable or
            System.Net.HttpStatusCode.GatewayTimeout;
}
