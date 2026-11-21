using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Версионно-устойчивый парсер XML из архивов ЕИС. Ищет теги по LocalName,
/// не привязываясь к префиксам пространств имён и версии Альбома ТФФ.
/// Названия кандидатов взяты из XSD 17.0 (IntegrationTypes.xsd):
/// regNum, purchaseNumber, IKZ, INN, KPP, nmck/contractPrice, printForm,
/// OKPD2, KTRU/code, signDate. Точная семантика поля уточняется при
/// появлении реального примера документа — здесь осознанно нет «догадок»
/// вроде выдуманных кодов справочников.
/// </summary>
public sealed class EisDocumentParser
{
    // В печатной форме ИНН/КПП заказчика находятся в purchaseResponsibleInfo,
    // а внутри customerRequirementInfo они относятся к бюджетному аккумулятору.
    private static readonly string[] CustomerScopes =
        ["responsibleOrgInfo", "customer", "customerInfo", "mainInfo", "accountBudgetAdmin"];

    // legalEntityRFInfo идёт первым: внутри participantInfo могут встречаться
    // и другие <name> (например, status/name «Субъект малого предпринимательства»).
    private static readonly string[] SupplierScopes =
        ["legalEntityRFInfo", "supplier", "supplierInfo", "participantInfo", "postavshik"];

    /// <summary>Разобрать один XML-файл архива.</summary>
    public ParsedEisDocument Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);

        var root = document.Root;
        // В архивах ЕИС корень — универсальный <export>, а тип документа задаёт
        // первый вложенный элемент: <contract>, <contractProcedure> и т.п.
        var documentElement = root?.Name.LocalName.Equals("export", StringComparison.OrdinalIgnoreCase) == true
            ? root.Elements().FirstOrDefault()
            : root;
        var regNumber = GetOwnValue(documentElement, "regNum");
        var code = document.ToString(SaveOptions.DisableFormatting);

        return new ParsedEisDocument
        {
            FileName = fileName,
            DocumentSha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code))).ToLowerInvariant(),
            // У документов Казначейства версия лежит в атрибуте versionID.
            SchemeVersion = GetValue(root, "schemeVersion", "versionID") ?? "unknown",
            Kind = DetectKind(documentElement?.Name.LocalName),
            PurchaseNumber = FirstNonEmpty(
                GetValue(root, "purchaseNumber", "notificationNumber"),
                IsRegistryNumber(regNumber) ? regNumber : null),
            // regNum контракта — непосредственный ребёнок <contract>, а не regNum заказчика.
            RegNumber = regNumber,
            // В извещениях ЕИС ИКЗ лежит в <IKZInfo><purchaseCode>, у Казначейства —
            // в <InfDcBs_RmAct>; непосредственного тега <IKZ> в печатной форме нет.
            Ikz = GetValue(root, "IKZ", "ikz", "purchaseCode", "InfDcBs_RmAct"),
            CustomerInn = GetPartyValue(root, CustomerScopes, "INN"),
            CustomerKpp = GetPartyValue(root, CustomerScopes, "KPP"),
            CustomerName = GetPartyValue(root, CustomerScopes, "fullName", "shortName", "name"),
            // В проектах доп. соглашений исполнитель лежит в participantInfo.
            SupplierInn = GetPartyValue(root, SupplierScopes, "INN"),
            SupplierKpp = GetPartyValue(root, SupplierScopes, "KPP"),
            SupplierName = GetPartyValue(root, SupplierScopes, "fullName", "shortName", "name"),
            Price = ParseMoney(GetPrice(root)),
            PublishDate = GetValue(
                root, "publishDTInEIS", "publishDate", "signDate", "contractDate", "dateCreate", "DtSgnng"),
            ObjectInfo = GetValue(root, "purchaseObjectInfo", "contractSubject", "objectInfo", "subject", "name"),
            PrintFormUrl = GetPrintFormUrl(root),
            Items = ParseItems(root),
            RawXml = code,
        };
    }

    private static string? GetPartyValue(
        XElement? root,
        IReadOnlyCollection<string> scopes,
        params string[] fields)
    {
        if (root is null)
        {
            return null;
        }

        var elements = root.DescendantsAndSelf();
        foreach (var scope in scopes)
        {
            // Точное совпадение LocalName надёжнее подстроки: в реальном XML
            // customerRequirementsInfo — обёртка, а не сам заказчик.
            var element = elements.FirstOrDefault(candidate =>
                    candidate.Name.LocalName.Equals(scope, StringComparison.OrdinalIgnoreCase))
                ?? elements.FirstOrDefault(candidate =>
                    candidate.Name.LocalName.Contains(scope, StringComparison.OrdinalIgnoreCase));

            if (element is null)
            {
                continue;
            }

            var value = GetValue(element, fields);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }

    /// <summary>Значение из непосредственных детей: у контракта рядом с regNum
    /// лежат regNum заказчика, а у позиции — название классификатора.</summary>
    private static string? GetOwnValue(XElement? element, params string[] localNames)
    {
        if (element is null)
        {
            return null;
        }

        foreach (var localName in localNames)
        {
            var value = element.Elements()
                .FirstOrDefault(child => child.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase))
                ?.Value;

            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    private static string? GetPrintFormUrl(XElement? root)
    {
        var printForm = root?.DescendantsAndSelf()
            .FirstOrDefault(element =>
                element.Name.LocalName.Equals("printForm", StringComparison.OrdinalIgnoreCase) ||
                element.Name.LocalName.Equals("printFormInfo", StringComparison.OrdinalIgnoreCase));

        return printForm?
            .Attributes()
            .FirstOrDefault(attribute =>
                attribute.Name.LocalName.Equals("url", StringComparison.OrdinalIgnoreCase) ||
                attribute.Name.LocalName.Equals("href", StringComparison.OrdinalIgnoreCase))
            ?.Value ?? GetValue(printForm, "url", "href", "fileName");
    }

    private static IReadOnlyList<PurchaseItemDto> ParseItems(XElement? root)
    {
        var items = new List<PurchaseItemDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var element in (root?.DescendantsAndSelf() ?? []).Where(candidate =>
                     candidate.Name.LocalName.Equals("item", StringComparison.OrdinalIgnoreCase) ||
                     candidate.Name.LocalName.Equals("position", StringComparison.OrdinalIgnoreCase) ||
                     candidate.Name.LocalName.Equals("product", StringComparison.OrdinalIgnoreCase) ||
                     candidate.Name.LocalName.Equals("purchaseItem", StringComparison.OrdinalIgnoreCase) ||
                     // Реальные извещения ЕИС: <purchaseObjectsInfo><purchaseObject>.
                     candidate.Name.LocalName.Equals("purchaseObject", StringComparison.OrdinalIgnoreCase) ||
                      // Электронные контракты ЕИС: <productsInfo><productInfo>.
                      candidate.Name.LocalName.Equals("productInfo", StringComparison.OrdinalIgnoreCase)))
        {
            var ktru = GetClassifierCode(element, "KTRU");
            var okpd2 = GetClassifierCode(element, "OKPD2");
            // Сначала собственный <name> позиции: внутри <product>/<purchaseObject>
            // раньше него встречается <name> классификатора ОКПД2.
            var name = GetOwnValue(element, "name", "itemName", "productName")
                ?? GetValue(element, "name", "itemName", "productName");

            if (ktru is null && okpd2 is null && name is null)
            {
                continue;
            }

            var key = $"{ktru}|{okpd2}|{name}";
            if (!seen.Add(key))
            {
                continue;
            }

            items.Add(new PurchaseItemDto(
                LineNo: items.Count + 1,
                KtruCode: ktru,
                Okpd2Code: okpd2,
                ItemName: name,
                Quantity: ParseMoney(GetValue(element, "quantity", "qty", "amount")),
                Price: ParseMoney(GetValue(element, "price", "unitPrice", "initialPrice"))));
        }

        return items;
    }

    private static string? GetClassifierCode(XElement item, string classifier)
    {
        var node = item.DescendantsAndSelf()
            .FirstOrDefault(element =>
                element.Name.LocalName.Equals(classifier, StringComparison.OrdinalIgnoreCase) ||
                // В электронных контрактах ЕИС теги называются OKPD2Info/KTRUInfo.
                element.Name.LocalName.Equals(classifier + "Info", StringComparison.OrdinalIgnoreCase));

        if (node is null)
        {
            return null;
        }

        // В печатной форме код лежит в <OKPDCode>/<KTRUCode>, в экспорте —
        // в <code>. Не берём node.Value целиком: он склеил бы код с названием.
        var code = GetValue(node, "code", "OKPDCode", "KTRUCode", "OKPD2Code", "codeOKPD2", "codeKTRU");
        if (!string.IsNullOrWhiteSpace(code))
        {
            return code;
        }

        return !node.HasElements && node.Value.Length is > 0 and < 40
            ? node.Value.Trim()
            : null;
    }

    private static bool IsRegistryNumber(string? value) =>
        value is not null && value.Length is >= 15 and <= 20 && value.All(char.IsDigit);

    private static EisDocumentKind DetectKind(string? rootName)
    {
        if (string.IsNullOrWhiteSpace(rootName))
        {
            return EisDocumentKind.Unknown;
        }

        if (rootName.Contains("nsi", StringComparison.OrdinalIgnoreCase))
        {
            return EisDocumentKind.Nsi;
        }

        // contractProcedure — этап исполнения с тем же regNum, что у контракта.
        // Если считать его обычным контрактом, 207 этапов перезапишут основную
        // запись пустыми полями (нет ИКЗ, цены и поставщика).
        if (rootName.Contains("contractProcedure", StringComparison.OrdinalIgnoreCase))
        {
            return EisDocumentKind.ContractProcedure;
        }

        // Сначала contract: cpContractProjectLKP содержит и contract, и project,
        // но это проект доп. соглашения, а не извещение о закупке.
        if (rootName.Contains("contract", StringComparison.OrdinalIgnoreCase))
        {
            return EisDocumentKind.Contract;
        }

        // План-график — не закупка: его <purchaseNumber> нумеруют позиции
        // (0001, 0002…), а реестровый номер лежит в <planNumber>. Пока нет
        // отдельной сущности plans, сохраняем только сырой XML.
        if (rootName.Contains("tenderPlan", StringComparison.OrdinalIgnoreCase))
        {
            return EisDocumentKind.TenderPlan;
        }

        return rootName.Contains("project", StringComparison.OrdinalIgnoreCase) ||
               rootName.Contains("notification", StringComparison.OrdinalIgnoreCase) ||
               rootName.Contains("plan", StringComparison.OrdinalIgnoreCase)
            ? EisDocumentKind.Purchase
            : EisDocumentKind.Unknown;
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    private static string? GetValue(XElement? root, params string[] localNames)
    {
        if (root is null)
        {
            return null;
        }

        foreach (var localName in localNames)
        {
            var elementValue = root.DescendantsAndSelf()
                .FirstOrDefault(element => element.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase))
                ?.Value;

            if (!string.IsNullOrWhiteSpace(elementValue))
            {
                return elementValue.Trim();
            }

            // schemeVersion и url живут в атрибутах: element.Value вернул бы
            // весь текст потомка, поэтому читаем именно атрибут.
            var attributeValue = root.DescendantsAndSelf()
                .SelectMany(element => element.Attributes())
                .FirstOrDefault(attribute => attribute.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase))
                ?.Value;

            if (!string.IsNullOrWhiteSpace(attributeValue))
            {
                return attributeValue.Trim();
            }
        }

        return null;
    }

    /// <summary>Цена документа, а не цена первой позиции: в cpElectronicContract
    /// первые &lt;price&gt; принадлежат позициям, а итог — в contractPriceInfo.</summary>
    private static string? GetPrice(XElement? root)
    {
        if (root is null)
        {
            return null;
        }

        // Контейнеры цены в порядке приоритета: в электронном контракте итог
        // лежит в contractPriceInfo, в проекте — в contractInfo, в извещении —
        // в maxPriceInfo. Иначе первым попадётся <price> позиции товара.
        string[] priceScopes = ["contractPriceInfo", "contractInfo", "maxPriceInfo"];
        foreach (var scope in priceScopes)
        {
            var node = root.DescendantsAndSelf()
                .FirstOrDefault(element => element.Name.LocalName.Equals(scope, StringComparison.OrdinalIgnoreCase));
            var value = GetValue(node, "price", "maxPrice", "contractPrice");
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return GetValue(root, "contractPrice", "nmck", "initialMaxPrice", "maxPrice", "price", "InfDcBs_SmSbsds");
    }

    private static decimal? ParseMoney(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var invariant))
        {
            return invariant;
        }

        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.GetCultureInfo("ru-RU"), out var russian)
            ? russian
            : null;
    }
}
