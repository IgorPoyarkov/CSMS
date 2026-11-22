using System.Xml.Linq;
using Eis44Parser.Core;

namespace Eis44Parser.Tests;

/// <summary>
/// Разбор реальных кириллических XML приёмки из публичной карточки контракта
/// 2462904043926000006 (WINDOWS-1251) и платёжного поручения Казначейства.
/// </summary>
public sealed class AcceptanceActParserTests
{
    private readonly AcceptanceActParser _parser = new();

    [Fact]
    public void ParsesRealAcceptanceActWithAllFields()
    {
        var document = LoadFromZip(
            "UPD_20260925_2462904043926000006.zip",
            "ON_AKTREZRABP_2ZK-CUS-01442000018_2ZK-SUP-00019010413_20260925_01A0D78A-0717-7013-8BCC-E439356A28A6.xml");

        Assert.True(AcceptanceActParser.IsAcceptanceAct(document));

        var act = _parser.Parse(document, "ON_AKTREZRABP.xml", "UPD_20260925.zip");

        Assert.Equal("2462904043926000006", act.RegNumber);
        Assert.Equal("548", act.ActNumber);
        Assert.Equal("2026-09-25", act.ActDate);
        Assert.Equal("16.2", act.FormVersion);
        Assert.Equal("1110335", act.Knd);

        // Связка с этапом и контрактом — без новых сущностей и кириллических полей в БД.
        Assert.Equal("0C9B0A7D20B14A51AF45892F18429FDB", act.Stage?.Sid);
        Assert.Equal("129498592", act.Stage?.TechnicalSid);
        Assert.Equal("262462904043946320100100050014211244", act.Stage?.Ikz);
        Assert.Equal("3Р_26", act.Contract?.Number);
        Assert.Equal("2026-02-17", act.Contract?.Date);
        Assert.Equal("01442000018260000030001", act.Contract?.GovernmentContractId);

        var contractor = Assert.Single(act.Parties, party => party.Role == "Подрядчик");
        Assert.Equal("4611014131", contractor.Inn);
        Assert.Equal("2ZK-SUP-00019010413", contractor.ParticipantId);
        Assert.Equal("712Ю8315001", contractor.BankRequisites?.PersonalAccount);

        var customer = Assert.Single(act.Parties, party => party.Role == "Заказчик");
        Assert.Equal("4629040439", customer.Inn);

        var item = Assert.Single(act.WorkItems);
        Assert.Equal("42.11.20.200", item.Okpd2Code);
        Assert.Equal("Работы по ремонту автомобильных дорог", item.Okpd2Name);
        Assert.Null(item.KtruCode);
        Assert.Equal("4F08D8CC1263414985617C99658939A1", item.KtruId);
        Assert.Equal("804440311", item.TechnicalKtruId);
        Assert.Equal("01a0d8bfabb670aba5609628579d14a0", item.EaKtruId);
        Assert.Equal(9_941_150.80m, item.SumWithVat);
        Assert.Equal("22%", item.VatRate);
        Assert.Equal(9_941_150.80m, act.Totals.SumWithVat);
        Assert.Equal(1_792_666.54m, act.Totals.VatSum);
        Assert.Equal("2026-05-26", act.Period?.StartDate);
        Assert.Equal("2026-09-24", act.Period?.EndDate);

        Assert.Equal(3, act.Attachments.Count);
        Assert.Contains(act.Attachments, attachment => attachment.FileName == "кс-2 №2 ГК 3Р.xls");
        var signatory = Assert.Single(act.Signatories);
        Assert.Equal("Шубин", signatory.LastName);
        Assert.Equal("ГЕНЕРАЛЬНЫЙ ДИРЕКТОР", signatory.Position);
    }

    [Fact]
    public void ParsesEarlier2026ActFromSecondArchive()
    {
        var document = LoadFromZip(
            "UPD_20260527_2462904043926000006.zip",
            "ON_AKTREZRABP_2ZK-CUS-01442000018_2ZK-SUP-00019010413_20260526_019E6405-2AAB-7EA0-9178-7AC1BECE941C.xml");

        var act = _parser.Parse(document, "ON_AKTREZRABP.xml");

        Assert.Equal("267", act.ActNumber);
        Assert.Equal("2026-05-26", act.ActDate);
        Assert.Equal("0C9B0A7D20B14A51AF45892F18429FDB", act.Stage?.Sid);
        Assert.Equal(137_771_578.02m, act.Totals.SumWithVat);
    }

    [Fact]
    public void ParsesRealPaymentOrderAndLinksItToAcceptanceAct()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-data", "payment-order-2462904043926000006-real.xml");
        using var stream = File.OpenRead(path);
        var document = XDocument.Load(stream);

        Assert.True(AcceptanceActParser.IsPaymentOrder(document));

        var payment = _parser.ParsePaymentOrder(document, "payment.xml");

        Assert.Equal("317371", payment.DocumentNumber);
        Assert.Equal("2026-09-28", payment.DocumentDate);
        Assert.Equal(6_815_969.23m, payment.Sum);
        Assert.Equal("2462904043926000006", payment.RegNumber);
        Assert.Equal("3Р_26", payment.ContractNumber);
        Assert.Equal("2026-02-17", payment.ContractDate);
        Assert.Equal("548", payment.AcceptanceDocumentNumber);
        Assert.Equal("2026-09-25", payment.AcceptanceDocumentDate);
        Assert.Equal("4629040439", payment.PayerInn);
        Assert.Equal("4611014131", payment.RecipientInn);
    }

    [Fact]
    public void ParsesCustomerDecisionOnAcceptance()
    {
        var document = LoadFromZip(
            "UPD_20260925_2462904043926000006.zip",
            "ON_AKTREZRABZ_2ZK-SUP-00019010413_2ZK-CUS-01442000018_20260925_083FBEA2-25F6-418B-B04F-EB715FF3FD10.xml");

        Assert.True(AcceptanceDecisionParser.IsAcceptanceDecision(document));

        var decision = new AcceptanceDecisionParser().Parse(document, "ON_AKTREZRABZ.xml");

        Assert.Equal("1110336", decision.Knd);
        Assert.Equal("2026-09-25", decision.InfoDate);
        Assert.Contains("01A0D78A-0717-7013-8BCC-E439356A28A6", decision.ActFileId ?? string.Empty);
        Assert.Equal("548", decision.PostedDocumentNumber);
        Assert.Equal("2026-09-25", decision.PostedDocumentDate);
        Assert.Equal("1", decision.OperationCode);
        Assert.Equal(6, decision.Signatories.Count);
        Assert.Contains(decision.Signatories, signatory => signatory.LastName == "Толстых");
        Assert.Contains(decision.Signatories, signatory => signatory.AuthorityBasis == "Должностные обязанности");
        Assert.True(decision.SignatureLength > 0);
    }

    [Fact]
    public void ParsesEdoMessagesWithDocumentReference()
    {
        var receipt = LoadFromZip(
            "UPD_20260925_2462904043926000006.zip",
            "DP_IZVPOL_2ZK-SUP-00019010413_2ZK-CUS-01442000018_20260925_612EF7F8-7BEC-4FAA-A139-FDA86B469975.xml");
        var confirmation = LoadFromZip(
            "UPD_20260925_2462904043926000006.zip",
            "DP_PDOTPR_2ZK-CUS-01442000018_2ZK_20260925_6e9e05e8-5972-46eb-a24d-b3bb235e888c.xml");

        Assert.True(EdoMessageParser.IsEdoMessage(receipt));

        var parser = new EdoMessageParser();
        var received = parser.Parse(receipt, "DP_IZVPOL.xml");

        Assert.Equal("1115110", received.Knd);
        Assert.Equal("Извещение о получении", received.MessageType);
        Assert.Equal("2026-09-25", received.EventDate);
        Assert.Equal("16.41.52", received.EventTime);
        Assert.StartsWith("ON_AKTREZRABP", received.PostedFileName ?? string.Empty);
        Assert.Equal("Документ о приемке", received.DocumentName);
        Assert.Equal("548", received.DocumentNumber);
        Assert.Equal("2026-09-25", received.DocumentDate);
        Assert.Contains(received.Participants, participant => participant.Inn == "4629040439");
        Assert.Contains(received.Participants, participant => participant.Inn == "4611014131");
        Assert.True(received.SignatureLength > 0);

        var confirmed = parser.Parse(confirmation, "DP_PDOTPR.xml");
        Assert.Equal("1115111", confirmed.Knd);
        Assert.Equal("Подтверждение ЭДО", confirmed.MessageType);
        Assert.Equal("2026-09-25", confirmed.EventDate);
    }

    [Fact]
    public void ParsesFamPaymentOrderWithShortDates()
    {
        var document = LoadXml("payment-order-fam-1027402308826001005.xml");

        Assert.True(AcceptanceActParser.IsPaymentOrder(document));

        var payment = _parser.ParsePaymentOrder(document, "payment-fam.xml");

        Assert.Equal("103526", payment.DocumentNumber);
        Assert.Equal("2026-08-05", payment.DocumentDate);
        Assert.Equal(39_721.71m, payment.Sum);
        Assert.Equal("1027402308826001005", payment.RegNumber);
        Assert.Equal("03011000496260008890001", payment.ContractNumber);
        Assert.Equal("2026-06-29", payment.ContractDate);
        Assert.Equal("953", payment.AcceptanceDocumentNumber);
        Assert.Equal("2026-08-02", payment.AcceptanceDocumentDate);
        Assert.Equal("0274023088", payment.PayerInn);
        Assert.Equal("0269042310", payment.RecipientInn);
        Assert.Equal("2026-08-06", payment.ChargeOffDate);
        Assert.Equal("03214643000000015109", payment.PayerAccount);
    }

    [Fact]
    public void ParsesSimplifiedAcceptanceDocument()
    {
        var document = LoadXml("nschfdoppr-1027402308826001005.xml");

        Assert.True(GeneralAcceptanceParser.IsGeneralAcceptanceDocument(document));

        var act = new GeneralAcceptanceParser().Parse(document, "ON_NSCHFDOPPR.xml");

        Assert.Equal("1115131", act.Knd);
        Assert.Equal("1027402308826001005", act.RegNumber);
        Assert.Equal("895", act.ActNumber);
        Assert.Equal("2026-07-03", act.ActDate);
        Assert.Equal("03011000496260008890001", act.Contract?.Number);
        Assert.Equal("2026-06-29", act.Contract?.Date);
        var contractor = Assert.Single(act.Parties, party => party.Role == "Подрядчик");
        Assert.Equal("0269042310", contractor.Inn);
        var customer = Assert.Single(act.Parties, party => party.Role == "Заказчик");
        Assert.Equal("0274023088", customer.Inn);
        Assert.Equal(5, act.WorkItems.Count);
        Assert.Equal("01.13.43.110", act.WorkItems[0].Okpd2Code);
        Assert.Equal("01.13.43.110-00000002", act.WorkItems[0].KtruCode);
        Assert.Equal(55_272m, act.Totals.SumWithVat);
        Assert.Contains(act.Signatories, signatory => signatory.LastName == "Абдувохидов");
    }

    [Fact]
    public void ParsesSimplifiedCustomerDecision()
    {
        var document = LoadXml("nschfdopok-1027402308826001005.xml");

        Assert.True(AcceptanceDecisionParser.IsAcceptanceDecision(document));

        var decision = new AcceptanceDecisionParser().Parse(document, "ON_NSCHFDOPPOK.xml");

        Assert.Equal("1115132", decision.Knd);
        Assert.Equal("2026-09-03", decision.InfoDate);
        Assert.StartsWith("ON_NSCHFDOPPR", decision.ActFileId ?? string.Empty);
        Assert.Equal("895", decision.PostedDocumentNumber);
        Assert.Equal("2026-07-03", decision.PostedDocumentDate);
        Assert.Equal("1", decision.OperationCode);
        Assert.Contains(decision.Signatories, signatory => signatory.LastName == "Фархшатов");
    }

    [Fact]
    public void YearIsReadFromRegistryNumber()
    {
        Assert.Equal(2026, PublicContractCardClient.YearFromRegNumber("2462904043926000006"));
        Assert.Equal(2025, PublicContractCardClient.YearFromRegNumber("2462904043925000011"));
    }

    private static XDocument LoadXml(string fileName)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-data", fileName);
        using var stream = File.OpenRead(path);
        return XDocument.Load(stream);
    }

    private static XDocument LoadFromZip(string archiveName, string entryName)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "test-data", archiveName);
        using var stream = File.OpenRead(path);
        using var zip = new System.IO.Compression.ZipArchive(stream, System.IO.Compression.ZipArchiveMode.Read);
        var entry = zip.Entries.FirstOrDefault(item =>
                item.FullName.EndsWith(entryName, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"В архиве {archiveName} нет {entryName}.");
        using var entryStream = entry.Open();
        using var buffer = new MemoryStream();
        entryStream.CopyTo(buffer);
        using var xmlStream = new MemoryStream(buffer.ToArray());
        // XDocument читает WINDOWS-1251 из декларации (провайдер зарегистрирован в Core).
        return XDocument.Load(xmlStream);
    }
}
