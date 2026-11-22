using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Скачивает все вложения публичной карточки контракта, разбирает акты приёмки,
/// решения заказчика, сообщения ЭДО, платёжные поручения и XML исполнения, и
/// собирает готовую проекцию для фронта. Ничего не пишет в БД: сырые файлы при
/// желании сохраняются на диск.
/// </summary>
public sealed class ContractCardImportService(
    PublicContractCardClient client,
    AcceptanceActParser acceptanceParser,
    GeneralAcceptanceParser generalParser,
    AcceptanceDecisionParser decisionParser,
    EdoMessageParser edoParser,
    ContractExecutionParser executionParser)
{
    /// <summary>Импортировать один контракт; year — фильтр по году (null = все).</summary>
    public async Task<ContractCardViewDto> ImportAsync(
        string regNumber,
        int? year,
        string? saveDirectory = null,
        CancellationToken cancellationToken = default)
    {
        var acts = new List<AcceptanceActViewDto>();
        var decisions = new List<AcceptanceDecisionDto>();
        var payments = new List<PaymentOrderViewDto>();
        var messages = new List<EdoMessageDto>();
        var executions = new List<ContractExecutionViewDto>();
        var skipped = new List<string>();

        var files = await client.GetDocumentFilesAsync(regNumber, cancellationToken);
        if (saveDirectory is not null)
        {
            Directory.CreateDirectory(saveDirectory);
        }

        foreach (var file in files)
        {
            // Zakupki добавляет к названию размер: "...xml (3.85 Кб)".
            var title = System.Text.RegularExpressions.Regex.Replace(
                file.Title, @"\s*\([^)]*\)\s*$", string.Empty).Trim();
            var isXml = title.EndsWith(".xml", StringComparison.OrdinalIgnoreCase);
            var isZip = title.EndsWith(".zip", StringComparison.OrdinalIgnoreCase);

            // PDF/DOC/XLS — сканированные версии тех же документов; для
            // структурированного парсера они не нужны.
            if (!isXml && !isZip)
            {
                skipped.Add(title);
                continue;
            }

            var bytes = await client.DownloadAsync(file, cancellationToken);
            if (isZip)
            {
                foreach (var entry in PublicContractCardClient.ReadZipEntries(bytes))
                {
                    var document = Load(entry.Bytes, entry.Name);
                    if (document is null)
                    {
                        skipped.Add($"{title} → {entry.Name} (не XML)");
                        continue;
                    }

                    Save(saveDirectory, Path.GetFileName(entry.Name), entry.Bytes);
                    Classify(
                        document, Path.GetFileName(entry.Name), title, year,
                        acts, decisions, payments, messages, executions, skipped);
                }
            }
            else
            {
                var document = Load(bytes, title);
                if (document is null)
                {
                    skipped.Add(title);
                    continue;
                }

                Save(saveDirectory, SafeFileName(title), bytes);
                Classify(
                    document, SafeFileName(title), null, year,
                    acts, decisions, payments, messages, executions, skipped);
            }
        }

        // В некоторых формах реестровый номер есть только в ссылке на контракт;
        // подставляем номер карточки, чтобы связка была всегда заполнена.
        for (var index = 0; index < acts.Count; index++)
        {
            if (string.IsNullOrWhiteSpace(acts[index].RegNumber))
            {
                acts[index] = acts[index] with { RegNumber = regNumber };
            }
        }

        return new ContractCardViewDto(
            regNumber,
            acts.OrderBy(act => act.ActDate, StringComparer.Ordinal).ToList(),
            decisions.OrderBy(decision => decision.InfoDate, StringComparer.Ordinal).ToList(),
            payments.OrderBy(payment => payment.DocumentDate, StringComparer.Ordinal).ToList(),
            messages.OrderBy(message => message.EventDate, StringComparer.Ordinal).ToList(),
            executions,
            skipped);
    }

    private void Classify(
        XDocument document,
        string fileName,
        string? sourceArchive,
        int? year,
        List<AcceptanceActViewDto> acts,
        List<AcceptanceDecisionDto> decisions,
        List<PaymentOrderViewDto> payments,
        List<EdoMessageDto> messages,
        List<ContractExecutionViewDto> executions,
        List<string> skipped)
    {
        if (AcceptanceActParser.IsAcceptanceAct(document))
        {
            var act = acceptanceParser.Parse(document, fileName, sourceArchive);
            if (MatchesYear(year, act.ActDate, act.InfoDate, fileName, sourceArchive))
            {
                acts.Add(act);
            }
        }
        else if (GeneralAcceptanceParser.IsGeneralAcceptanceDocument(document))
        {
            var act = generalParser.Parse(document, fileName, sourceArchive);
            if (MatchesYear(year, act.ActDate, act.InfoDate, fileName, sourceArchive))
            {
                acts.Add(act);
            }
        }
        else if (AcceptanceDecisionParser.IsAcceptanceDecision(document))
        {
            var decision = decisionParser.Parse(document, fileName);
            if (MatchesYear(year, decision.InfoDate, decision.PostedDocumentDate, fileName, sourceArchive))
            {
                decisions.Add(decision);
            }
        }
        else if (EdoMessageParser.IsEdoMessage(document))
        {
            var message = edoParser.Parse(document, fileName);
            if (MatchesYear(year, message.EventDate, message.DocumentDate, fileName, sourceArchive))
            {
                messages.Add(message);
            }
        }
        else if (AcceptanceActParser.IsPaymentOrder(document))
        {
            var payment = acceptanceParser.ParsePaymentOrder(document, fileName);
            if (MatchesYear(year, payment.DocumentDate, payment.ExecutionDate, fileName))
            {
                payments.Add(payment);
            }
        }
        else if (ContractExecutionParser.IsContractExecution(document))
        {
            var execution = executionParser.Parse(document, fileName);
            if (MatchesYear(
                    year,
                    execution.Stages.SelectMany(stage => new[] { stage.StartDate, stage.EndDate })
                        .Append(execution.RegNumber)
                        .Append(fileName)
                        .ToArray()))
            {
                executions.Add(execution);
            }
        }
        else
        {
            // Остальные XML (электронный контракт, доп. соглашения) Основной
            // парсер разбирает отдельно — здесь они только не мешают приёмке.
            skipped.Add(fileName);
        }
    }

    private static bool MatchesYear(int? year, params string?[] values)
    {
        if (year is null)
        {
            return true;
        }

        var marker = year.Value.ToString(System.Globalization.CultureInfo.InvariantCulture);
        return values.Any(value => !string.IsNullOrWhiteSpace(value) && value.Contains(marker, StringComparison.Ordinal));
    }

    private static XDocument? Load(byte[] bytes, string name)
    {
        try
        {
            // XDocument.Load(stream) читает encoding="WINDOWS-1251" из декларации,
            // поэтому кириллические теги и атрибуты приходят в корректной кодировке.
            using var stream = new MemoryStream(bytes);
            return XDocument.Load(stream);
        }
        catch (System.Xml.XmlException)
        {
            return null;
        }
    }

    private static void Save(string? directory, string fileName, byte[] bytes)
    {
        if (directory is null)
        {
            return;
        }

        var path = Path.Combine(directory, fileName);
        if (!File.Exists(path))
        {
            File.WriteAllBytes(path, bytes);
        }
    }

    private static string SafeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return new string(value.Select(character => invalid.Contains(character) ? '_' : character).ToArray());
    }
}
