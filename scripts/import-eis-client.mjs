/**
 * Импорт публичных данных ЕИС 44-ФЗ для нового клиента.
 *
 * Входные данные договора: ИНН заказчика и срок обслуживания. По ИНН публичным
 * поиском находятся последние N планов-графиков (окно = срок договора) и
 * последние M извещений (окно = 2 года, как в настройке маппинга). Результаты
 * поиска скачиваются официальным CSV/Excel-экспортом ЕИС, карточки fetched
 * как печатные формы, после чего всё раскладывается в db.json json-server.
 *
 * ЭЦП, токены ЕИС и закрытые документы не используются: только publichные
 * страницы zakupki.gov.ru, доступные без авторизации.
 *
 * Пример:
 *   node scripts/import-eis-client.mjs --inn 4629040439 --years 3 \
 *     --notice-years 2 --plans 3 --notices 3 --tasks 12
 *   node scripts/import-eis-client.mjs --dry-run
 *   node scripts/import-eis-client.mjs --inn 4629040439 --refresh-organization
 *
 * Реквизиты заказчика берутся из публичной карточки организации ЕИС:
 * поиск по ИНН → info.html (реквизиты) и other.html (контакты). При full-import
 * они обновляются автоматически, отдельный флаг обновляет только организацию
 * и снимки заказчика в уже импортированных планах/извещениях.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applyEisChain, buildNoticeTasks } from "./link-eis-chain.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CURL = process.platform === "win32" ? "curl.exe" : "curl";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";
const EIS = "https://zakupki.gov.ru";

const CSV_FIELDS = [
  "placementCsv",
  "registryNumberCsv",
  "stepOrderPlacementCsv",
  "methodOrderPurchaseCsv",
  "nameOrderCsv",
  "purchaseNumbersCsv",
  "numberLotCsv",
  "nameLotCsv",
  "maxContractPriceCsv",
  "currencyCodeCsv",
  "maxPriceContractCurrencyCsv",
  "currencyCodeContractCurrencyCsv",
  "scopeOkdpCsv",
  "scopeOkpdCsv",
  "scopeOkpd2Csv",
  "scopeKtruCsv",
  "ea615ItemCsv",
  "customerNameCsv",
  "organizationOrderPlacementCsv",
  "publishDateCsv",
  "lastDateChangeCsv",
  "startDateRequestCsv",
  "endDateRequestCsv",
  "ea615DateCsv",
  "featureOrderPlacementCsv",
];

const ETP_FALLBACK = { name: 'АО "РАД"', url: "https://lot-online.ru" };
const ETP_BY_NAME = [
  [/сбербанк/i, { name: 'АО "Сбербанк-АСТ"', url: "https://sberbank-ast.ru" }],
  [/еэтп|роселтOrg|roseltorg/i, { name: 'АО "ЕЭТП"', url: "https://roseltorg.ru" }],
  [/ртс-тендер/i, { name: "РТС-тендер", url: "https://rts-tender.ru" }],
  [/гпб/i, { name: "ЭТП ГПБ", url: "https://etpgpb.ru" }],
  [/тэк-торг/i, { name: "ТЭК-Торг", url: "https://tektorg.ru" }],
  [/рад|lot-online/i, ETP_FALLBACK],
];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function parseArgs(argv) {
  const args = {
    db: path.join(ROOT, "db.json"),
    inn: "",
    years: 3,
    noticeYears: 2,
    plans: 3,
    notices: 3,
    tasks: 12,
    dryRun: false,
    refreshOrganization: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (flag === "--refresh-organization") {
      args.refreshOrganization = true;
      continue;
    }
    if (!flag.startsWith("--")) continue;
    const key = flag.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) continue;
    args[key] = value;
    i++;
  }
  args.years = Number(args.years);
  args.noticeYears = Number(args.noticeYears);
  args.plans = Number(args.plans);
  args.notices = Number(args.notices);
  args.tasks = Number(args.tasks);
  return args;
}

function fetchRaw(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = execFileSync(
        CURL,
        [
          "-sS",
          "-m",
          "60",
          "-A",
          USER_AGENT,
          "-H",
          "Accept-Language: ru-RU,ru;q=0.9",
          "-w",
          "\nHTTP_CODE:%{http_code}",
          url,
        ],
        { maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
      );
      const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result);
      // Ищем маркер в байтах: в кириллическом HTML символьный индекс меньше
      // байтового, поэтому срез по строке обрезал конец страницы.
      const marker = Buffer.from("\nHTTP_CODE:");
      const cut = buffer.lastIndexOf(marker);
      const status = Number(buffer.subarray(cut + marker.length).toString("utf8").trim() || 0);
      if (status === 200) return buffer.subarray(0, cut);
      lastError = new Error(`ЕИС вернул HTTP ${status}: ${url}`);
    } catch (error) {
      lastError = error;
    }
    sleep(attempt * 1200);
  }
  throw new Error(`${lastError?.message ?? "Ошибка запроса ЕИС"}: ${url}`);
}

function fetchText(url) {
  return fetchRaw(url).toString("utf8");
}

function decodeEntities(value) {
  return (value || "")
    .replace(/&#034;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#8381;/g, "₽")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");
}

function clean(value) {
  return decodeEntities(
    String(value ?? "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function textOnly(html) {
  return clean(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " "),
  );
}

// Публичная карточка организации: по ИНН находим реестровый номер, затем
// читаем реквизиты (info.html) и контакты (other.html). Никаких закрытых
// сервисов ЕИС и токенов здесь не используется.
const ORG_SEARCH_URL =
  "https://zakupki.gov.ru/epz/organization/search/results.html";
const ORG_INFO_URL =
  "https://zakupki.gov.ru/epz/organization/view/info.html?reestrNumber=";
const ORG_OTHER_URL =
  "https://zakupki.gov.ru/epz/organization/view/other.html?reestrNumber=";

/**
 * Для отладки и повторного прогона при нестабильной сети можно подложить
 * уже скачанные страницы через EIS_ORG_*_HTML — обычный прогон их не использует.
 */
function readOrganizationHtml(url, envName) {
  const cache = process.env[envName];
  if (cache && fs.existsSync(cache)) {
    return fs.readFileSync(cache, "utf8");
  }
  return fetchText(url);
}

/** Разбирает пары «заголовок — значение» карточки организации ЕИС. */
function parseOrganizationValues(html) {
  const values = new Map();
  const sectionPattern =
    /<span class="section__title[^"]*">\s*([\s\S]*?)\s*<\/span>\s*<span class="section__info[^"]*">\s*([\s\S]*?)\s*<\/span>/g;
  for (const match of html.matchAll(sectionPattern)) {
    values.set(clean(match[1]), clean(match[2]));
  }
  const bodyPattern =
    /<div class="registry-entry__body-title">\s*([\s\S]*?)\s*<\/div>\s*<div class="registry-entry__body-value">\s*([\s\S]*?)\s*<\/div>/g;
  for (const match of html.matchAll(bodyPattern)) {
    const key = clean(match[1]);
    if (key && !values.has(key)) values.set(key, clean(match[2]));
  }
  return values;
}

function findOrganizationNumber(inn) {
  const url = `${ORG_SEARCH_URL}?searchString=${encodeURIComponent(inn)}`;
  const cards = readOrganizationHtml(url, "EIS_ORG_SEARCH_HTML")
    .split(/<div class="registry-entry__header-mid__number">/)
    .slice(1);
  const numbers = [];
  for (const card of cards) {
    const number = card.match(/view\/info\.html\?reestrNumber=(\d+)/)?.[1];
    if (!number) continue;
    const values = parseOrganizationValues(card.slice(0, 5000));
    if (values.get("ИНН") === inn) numbers.push(number);
  }
  if (!numbers.length) {
    throw new Error(`В публичном реестре ЕИС не найдена организация с ИНН ${inn}`);
  }
  return numbers[0];
}

function fetchOrganization(inn) {
  const reestrNumber = findOrganizationNumber(inn);
  const info = parseOrganizationValues(
    readOrganizationHtml(`${ORG_INFO_URL}${reestrNumber}`, "EIS_ORG_INFO_HTML"),
  );
  const other = parseOrganizationValues(
    readOrganizationHtml(`${ORG_OTHER_URL}${reestrNumber}`, "EIS_ORG_OTHER_HTML"),
  );
  const value = (key, values = info) => values.get(key) || "";
  const fullName = value("Полное наименование");
  if (!fullName || value("ИНН") !== inn) {
    throw new Error(`Карточка ЕИС ${reestrNumber} не подтвердила ИНН ${inn}`);
  }
  return {
    registryNumber: reestrNumber,
    fullName,
    shortName: value("Сокращенное наименование"),
    inn,
    kpp: value("КПП"),
    ogrn: value("ОГРН"),
    oktmo: value("ОКТМО"),
    consRegistryNum: value("Код по Сводному реестру"),
    legalAddress: value("Место нахождения"),
    postalAddress: value("Почтовый адрес", other),
    email: value("Контактный адрес электронной почты", other),
    phone: value("Телефон", other),
    responsiblePerson: value("Контактное лицо", other),
  };
}

/** Пустые значения не перезаписывают шаблон; неподтверждённый телефон ответственного убираем. */
function applyOrganizationRequisites(target, publicOrg) {
  for (const [key, value] of Object.entries(publicOrg)) {
    if (value) target[key] = value;
  }
  delete target.responsiblePhone;
}

function dateFromDots(value) {
  const match = clean(value).match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function shiftDate(date, years) {
  const copy = new Date(date.getTime());
  copy.setFullYear(copy.getFullYear() - years);
  return copy;
}

function formatDots(date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}.${date.getFullYear()}`;
}

function money(value) {
  const raw = clean(value);
  // В ЕИС есть два формата: «6 590 000,01» (HTML) и «22662656.28» (CSV).
  // Точка — разделитель тысяч только когда есть запятая.
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const number = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function moneyString(value) {
  return money(value).toFixed(2);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function afterLabel(text, label) {
  const index = text.indexOf(label);
  if (index < 0) return "";
  const rest = text.slice(index + label.length).trim();
  const next = rest.search(/\s{2,}|[А-ЯЁA-Z][а-яёa-z]+\s+[А-ЯЁA-Z]/);
  return (next > 0 ? rest.slice(0, next) : rest).trim();
}

function parseCsv(buffer) {
  const text = new TextDecoder("windows-1251").decode(buffer);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ";" && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])),
  );
}

function buildPlanSearchUrl(inn, from, to) {
  const params = new URLSearchParams({
    searchString: inn,
    publishDateFrom: from,
    publishDateTo: to,
    recordsPerPage: "_50",
    pageNumber: "1",
    sortBy: "BY_MODIFY_DATE",
    sortDirection: "false",
  });
  return `${EIS}/epz/orderplan/search/results.html?${params}`;
}

function buildNoticeSearchUrl(inn, from, to) {
  const params = new URLSearchParams({
    searchString: inn,
    publishDateFrom: from,
    publishDateTo: to,
    recordsPerPage: "_50",
    pageNumber: "1",
    sortBy: "BY_MODIFY_DATE",
    sortDirection: "false",
  });
  return `${EIS}/epz/order/extendedsearch/results.html?${params}`;
}

function buildNoticeCsvUrl(inn, from, to, start, end) {
  const params = new URLSearchParams({
    searchString: inn,
    publishDateFrom: from,
    publishDateTo: to,
    recordsPerPage: "_50",
    pageNumber: "1",
    sortBy: "BY_MODIFY_DATE",
    sortDirection: "false",
    from: String(start),
    to: String(end),
  });
  for (const field of CSV_FIELDS) params.set(field, "true");
  return `${EIS}/epz/order/orderCsvSettings/download.html?${params}`;
}

function parseTotalCount(html) {
  const match = html.match(/(\d[\d\s ]*) записей?/);
  return match ? Number(match[1].replace(/[\s ]/g, "")) : 0;
}

async function findPlanNumbers(inn, from, to, limit) {
  const html = fetchText(buildPlanSearchUrl(inn, from, to));
  const numbers = unique([...html.matchAll(/plan-number=(\d+)/g)].map((m) => m[1]));
  const result = numbers.slice(0, limit);
  sleep(600);
  return { numbers: result, total: parseTotalCount(html) };
}

async function fetchPlan(planNumber) {
  const base = `${EIS}/epz/orderplan/pg2020`;
  const generalHtml = fetchText(
    `${base}/general-info.html?plan-number=${planNumber}`,
  );
  sleep(400);
  // Позиции отдаются страницами по 50, поэтому обходим все страницы:
  // план на 119 позиций должен попасть в базу целиком, а не первые 10.
  const positionPages = [];
  for (let page = 1; page <= 20; page++) {
    const html = fetchText(
      `${base}/plan-position-search.html?plan-number=${planNumber}&itemIndex=${(page - 1) * 50}&pageSize=50`,
    );
    const count = [...html.matchAll(/position\/general-info\.html[^>]*>\s*(\d{36})/g)].length;
    if (process.env.EIS_IMPORT_DEBUG) console.error(`positions page ${page}: ${count}`);
    positionPages.push(html);
    sleep(300);
    if (count < 50) break;
  }
  const positionsHtml = positionPages.join("\n");

  const general = textOnly(generalHtml);
  const approvalDate = dateFromDots(
    sectionValue(generalHtml, "Дата утверждения плана-графика"),
  );
  const approvalAuthor = sectionValue(
    generalHtml,
    "ФИО лица, утвердившего план-график",
  ).slice(0, 120);
  const publishDate = dateFromDots(
    sectionValue(generalHtml, "Дата размещения плана-графика"),
  );
  const statusRaw = sectionValue(generalHtml, "Статус");
  const financialYear =
    clean(
      (generalHtml.match(
        /<span class="cardMainInfo__title">Финансовый год планирования<\/span>\s*<span class="cardMainInfo__content">([\s\S]*?)<\/span>/i,
      ) || [])[1],
    ).match(/\d{4}/)?.[0] ?? planNumber.slice(0, 4);
  const customerName = sectionValue(
    generalHtml,
    "Наименование Заказчика",
  ).slice(0, 250);

  const positions = [];
  // В постраничном ответе блок пагинации идёт ДО строк, поэтому останавливаем
  // совпадение только на следующей строке или конце документа.
  const rowPattern =
    /<div class="row bt-4 pb-4 pt-4 text-base-mid b-bottom">([\s\S]*?)(?=<div class="row bt-4 pb-4 pt-4 text-base-mid b-bottom">|$)/g;
  for (const match of positionsHtml.matchAll(rowPattern)) {
    const row = match[1];
    const ikz = clean((row.match(/position\/general-info\.html[^>]*>\s*(\d{36})/) || [])[1]);
    if (!ikz) continue;
    const cols = [...row.matchAll(/<div class="col-2(?: text-break)?">([\s\S]*?)<\/div>/g)]
      .map((m) => clean(m[1]));
    const objectOfPurchase = cols[0] ?? "";
    const classification = cols[1] ?? "";
    const amount = cols[2] ?? "";
    const statusBlock = clean(
      [...row.matchAll(/<div class="col-1">([\s\S]*?)<\/div>/g)].at(-1)?.[1],
    );
    const uniqueNumber = clean((row.match(/Уникальный номер позиции в плане-графике закупок<\/div>\s*<div class="common-text__value">([\s\S]*?)<\/div>/) || [])[1]);
    const planYear = clean((row.match(/Планируемый год размещения извещения[\s\S]*?<div class="common-text__value">\s*(\d{4})/) || [])[1]);
    const publicDiscussion = /Проводится|Завершено/.test(
      clean((row.match(/Обязательное общественное обсуждение<\/div>\s*<div class="common-text__value">([\s\S]*?)<\/div>/) || [])[1]),
    );
    const [codePart, ...nameParts] = classification.split(":");
    positions.push({
      ikz,
      objectOfPurchase,
      okpd2Code: /^\d/.test(codePart) ? codePart.trim() : "",
      okpd2Name: nameParts.join(":").trim(),
      amount: moneyString(amount),
      statusLabel: statusBlock.split(" ")[0] || "Размещена",
      statusDate: dateFromDots(statusBlock) || publishDate,
      uniqueNumber,
      planYear: planYear || financialYear,
      publicDiscussion,
      positionNumber: ikz.slice(22, 26),
      eisUrl: `${base}/position/general-info.html?plan-number=${planNumber}&position-number=${uniqueNumber}`,
    });
  }
  const seen = new Set();
  const uniquePositions = positions.filter((position) => {
    if (seen.has(position.ikz)) return false;
    seen.add(position.ikz);
    return true;
  });

  return {
    planNumber,
    financialYear,
    approvalDate,
    approvalAuthor,
    publishDate,
    status: /Размещ/.test(statusRaw) ? "published" : "draft",
    customerName: customerName || undefined,
    positions: uniquePositions,
    eisUrl: `${base}/general-info.html?plan-number=${planNumber}`,
  };
}

async function fetchNoticesCsv(inn, from, to, limit) {
  const searchHtml = fetchText(buildNoticeSearchUrl(inn, from, to));
  const total = parseTotalCount(searchHtml);
  sleep(500);
  const rows = [];
  for (let start = 1; start <= Math.min(total, 5000); start += 500) {
    const buffer = fetchRaw(buildNoticeCsvUrl(inn, from, to, start, start + 499));
    rows.push(...parseCsv(buffer));
    sleep(700);
    if (rows.length >= limit * 8) break;
  }
  const byNumber = new Map();
  for (const row of rows) {
    const number = clean(row["Реестровый номер закупки"]).replace(/^№\s*/, "");
    if (number && !byNumber.has(number)) byNumber.set(number, row);
  }
  const result = [...byNumber.entries()]
    .map(([number, row]) => ({ number, row }))
    .sort((a, b) =>
      dateFromDots(b.row["Дата размещения"]).localeCompare(
        dateFromDots(a.row["Дата размещения"]),
      ),
    )
    .slice(0, limit);
  return { notices: result, total };
}

function parsePhone(phone) {
  const value = clean(phone);
  const parts = value.split("-").filter(Boolean);
  if (parts.length >= 3) {
    return {
      countryCode: parts[0].replace(/\D/g, "").slice(0, 4),
      cityCode: parts[1].replace(/\D/g, "").slice(0, 6),
      num: parts[2].replace(/\D/g, "").slice(0, 7),
      numExt: parts.slice(3).join("").replace(/\D/g, "").slice(0, 15),
    };
  }
  const digits = value.replace(/\D/g, "");
  if (!digits) return { countryCode: "7", cityCode: "", num: "", numExt: "" };
  return {
    countryCode: digits.slice(0, 1),
    cityCode: digits.slice(1, 5),
    num: digits.slice(5, 12),
    numExt: digits.slice(12),
  };
}

function detectPlacingWay(method) {
  const value = clean(method);
  if (/электронный аукцион/i.test(value)) return { code: "EA20", type: "EF2020" };
  if (/запрос котировок/i.test(value)) return { code: "ZK20", type: "EZK2020" };
  if (/электронный запрос предложений/i.test(value)) return { code: "EZT20", type: "EZT2020" };
  if (/конкурс/i.test(value)) return { code: "OKP20", type: "EOK2020" };
  return { code: "EP93", type: "EMZ2025" };
}

function detectEtp(name, url) {
  const normalizedUrl = clean(url);
  const etp = {
    name: clean(name) || ETP_FALLBACK.name,
    url: /^https?:\/\//.test(normalizedUrl) ? normalizedUrl : ETP_FALLBACK.url,
  };
  const source = `${etp.name} ${etp.url}`;
  for (const [pattern, known] of ETP_BY_NAME) {
    if (pattern.test(source)) {
      return { name: etp.name, url: etp.url === ETP_FALLBACK.url && /lot-online/.test(known.url) ? etp.url : etp.url || known.url };
    }
  }
  return etp;
}

function sectionValue(html, needle) {
  const rows = [
    ...html.matchAll(
      /<span class="section__title">([\s\S]*?)<\/span>\s*<span class="section__info">([\s\S]*?)<\/span>/gi,
    ),
  ];
  const found = rows.find((row) =>
    clean(row[1]).toLowerCase().includes(needle.toLowerCase()),
  );
  return found ? clean(found[2]) : "";
}

function paramValue(html, needle) {
  const rows = [
    ...html.matchAll(
      /<p class="parameter">([\s\S]*?)<\/p>[\s\S]*?<p class="parameterValue">([\s\S]*?)<\/p>/gi,
    ),
  ];
  const found = rows.find((row) =>
    clean(row[1]).toLowerCase().includes(needle.toLowerCase()),
  );
  return found ? clean(found[2]) : "";
}

async function fetchNoticeDetail(number) {
  const url = `${EIS}/epz/order/notice/printForm/view.html?regNumber=${number}`;
  const html = fetchText(url);
  sleep(500);
  const text = textOnly(html);
  const kbk = clean(
    (text.match(/Код бюджетной классификации Российской Федерации\s+Сумма контракта[\s\S]*?\b(\d{20})\b/) || [])[1],
  );
  const classification = clean(
    (text.match(/Наименование товара, работы, услуги Код позиции[\s\S]*?Идентификатор:\s*\d+\s+([^\s]+)/) || [])[1],
  );
  const characteristics = text
    .split("Наименование характеристики Значение характеристики")
    .slice(1)
    .join(" ")
    .slice(0, 1200);
  return {
    url,
    etpName: paramValue(html, "Наименование электронной площадки"),
    etpUrl: paramValue(html, "Адрес электронной площадки"),
    kbk,
    classification,
    responsible: paramValue(html, "Ответственное должностное лицо").slice(0, 120),
    email: paramValue(html, "Адрес электронной почты").slice(0, 120),
    phone: paramValue(html, "Номер контактного телефона").slice(0, 40),
    address: paramValue(html, "Почтовый адрес").slice(0, 250),
    place: paramValue(html, "Место поставки товара, выполнения работы или оказания услуги").slice(0, 250),
    submissionEnd: paramValue(html, "Дата и время окончания срока подачи заявок"),
    auctionDate: paramValue(html, "Дата проведения процедуры подачи предложений"),
    summingDate: paramValue(html, "Дата подведения итогов определения поставщика"),
    contractStart: paramValue(html, "Дата начала исполнения контракта"),
    contractEnd: paramValue(html, "Срок исполнения контракта"),
    characteristics,
  };
}

function mapPlan(source, template, org, importInfo) {
  const positions = source.positions.map((position, index) => ({
    ...structuredClone(template),
    id: `${source.planNumber}-${index + 1}`,
    serialNumber: position.positionNumber,
    identificationCode: position.ikz,
    objectOfPurchase: position.objectOfPurchase,
    plannedPlacementYear: position.planYear,
    amountTotal: position.amount,
    amountCurrentYear: position.amount,
    amountPlanPeriodFirstYear: "0",
    amountPlanPeriodSecondYear: "0",
    amountSubsequentYears: "0",
    isPublicDiscussionRequired: position.publicDiscussion,
    okpd2Code: position.okpd2Code,
    okpd2Name: position.okpd2Name,
    objectName: position.okpd2Name,
    ktrCode: position.okpd2Code,
    nmck: position.amount,
    // Публичная карточка не содержит КБК позиции; оставляем поле пустым,
    // иначе из шаблона демо-плана тянутся чужие суммы и валидация падает.
    kbk: "",
    kbkEntries: [],
    uniqueNumber: position.uniqueNumber,
    status: position.statusLabel === "Отменена" ? "cancelled" : "placed",
    statusDate: position.statusDate,
    eisUrl: position.eisUrl,
    remarks: `Импорт ЕИС; ИКЗ ${position.ikz}`,
  }));
  const total = positions.reduce(
    (sum, position) => sum + money(position.amountTotal),
    0,
  );
  return {
    id: `eisp-${source.planNumber}`,
    organizationId: org.id,
    planNumber: source.planNumber,
    status: source.status,
    planYear: source.financialYear,
    versionNumber: "1",
    approvalDate: source.approvalDate,
    approvalAuthor: source.approvalAuthor || org.responsiblePerson || "",
    publishDate: source.publishDate,
    eisUrl: source.eisUrl,
    totalAmount: total.toFixed(2),
    remarks: `Импорт из ЕИС по ИНН ${importInfo.inn}: позиций ${positions.length}, окно ${importInfo.planFrom} — ${importInfo.to}`,
    customer: {
      ...structuredClone(org),
      fullName: source.customerName || org.fullName,
    },
    positions,
    specialPurchases: [],
    eisImport: importInfo,
  };
}

function mapNotice(item, detail, template, org, plans, importInfo) {
  const row = item.row;
  const ikz = clean(row["Идентификационный код закупки"]).replace(/^'/, "");
  const regNumber = item.number;
  const method = row["Способ определения поставщика (подрядчика, исполнителя), подрядной организации (размещения закупки)"];
  const placing = detectPlacingWay(method);
  const etp = detectEtp(detail.etpName, detail.etpUrl);
  const publishDate = dateFromDots(row["Дата размещения"]);
  const updatedDate = dateFromDots(row["Дата обновления"]) || publishDate;
  const nmck = money(row["Начальная (максимальная) цена контракта"]);
  const orderName = clean(row["Наименование закупки"]);
  const classification = detail.classification || clean(row["Код позиции"]);
  const [codePart, ...nameParts] = classification.split(":");
  const ktruMatch = clean(codePart).match(/^(\d{2}\.\d{2}\.\d{2}\.\d{3}-\d{8})$/);
  const okpd2 = clean(row["Классификация по ОКПД2"]).split(":")[0];
  const code = ktruMatch ? "" : okpd2 || clean(codePart);
  const allPositions = plans.flatMap((plan) =>
    plan.positions.map((position) => ({ ...position, planNumber: plan.planNumber })),
  );
  // ИКЗ извещения и позиции плана отличаются в разрядах номера позиции
  // (например ...011400149... и ...011400049...), поэтому сначала ищем
  // точное совпадение, затем — по первым 26 разрядам (номер закупки).
  const matchedPosition =
    allPositions.find((position) => position.identificationCode === ikz) ??
    allPositions.find((position) =>
      position.identificationCode?.startsWith(ikz.slice(0, 26)),
    );

  const notice = structuredClone(template);
  notice.id = `eisn-${regNumber}`;
  notice.procurementId = `eis-${regNumber}`;
  notice.ikz = ikz;
  notice.notificationType = placing.type;
  notice.externalId = regNumber;
  notice.versionNumber = "1";
  notice.noticeState = {
    ...notice.noticeState,
    statusLabel: clean(row["Этап закупки"]) || "Размещено",
    createdAt: `${publishDate}T00:00:00+03:00`,
    updatedAt: `${updatedDate}T00:00:00+03:00`,
    createdByUserId: org.id,
    createdByFullName: detail.responsible || org.responsiblePerson || org.email,
    updatedByFullName: detail.responsible || org.responsiblePerson || org.email,
  };
  notice.generalInfo = {
    ...notice.generalInfo,
    noticeNumber: regNumber,
    placingWayCode: placing.code,
    etpName: etp.name,
    etpUrl: etp.url,
    orderName,
    planPositionNumber: ikz.slice(22, 26),
    plan2020Number: matchedPosition?.planNumber ?? "",
    positionUniqueNumber: matchedPosition?.uniqueNumber ?? "",
    positionSerialNumber: matchedPosition?.serialNumber ?? "",
    ikz,
    nmck,
    kbk: detail.kbk,
    publishDTInEIS: publishDate,
    href: detail.url,
    antitrustWarning: true,
  };
  notice.contactInfo = {
    ...notice.contactInfo,
    organizationId: org.id,
    organizationName: clean(row["Наименование Заказчика"]) || org.fullName,
    postalAddress: detail.address || org.postalAddress,
    locationAddress: detail.place || detail.address || org.legalAddress,
    responsibleRole: "CU",
    placerSurname: detail.responsible.split(" ")[0] ?? "",
    placerName: detail.responsible.split(" ")[1] ?? "",
    placerFathername: detail.responsible.split(" ").slice(2).join(" "),
    placerEmail: detail.email || org.email,
    phoneNum: parsePhone(detail.phone || org.phone),
  };
  notice.procedureInfo = {
    ...notice.procedureInfo,
    collectingStartDT: dateFromDots(row["Дата начала подачи заявок"]) || publishDate,
    plannedPublishDate: publishDate,
    submissionEndDate: dateFromDots(detail.submissionEnd || row["Дата окончания подачи заявок"]),
    submissionEndTime: (clean(detail.submissionEnd).match(/(\d{2}:\d{2})/) || [])[1] ?? "09:00",
    firstPartsDate: dateFromDots(detail.auctionDate),
    summingUpDate: dateFromDots(detail.summingDate),
  };
  notice.contractConditions = {
    ...notice.contractConditions,
    startDate: dateFromDots(detail.contractStart),
    endDate: dateFromDots(detail.contractEnd),
    kbk: detail.kbk,
    budgetName: "Бюджет Курской области",
    deliveryPlaces: [
      {
        ...notice.contractConditions.deliveryPlaces[0],
        address: detail.place || org.legalAddress,
      },
    ],
  };
  notice.purchaseObjects = {
    ...notice.purchaseObjects,
    isStructuredForm: true,
    items: [
      {
        id: "1",
        okpd2OrKtruCode: code || classification,
        okpd2Code: okpd2,
        ktruCode: ktruMatch ? ktruMatch[1] : "",
        ktruName: ktruMatch ? nameParts.join(":").trim() : "",
        name: nameParts.join(":").trim() || orderName,
        unit: "",
        quantity: 1,
        unitPrice: nmck,
        totalPrice: nmck,
        isSupplyDuringWorks: false,
        nationalRegimeType: "none",
      },
    ],
  };
  notice.objectDescription = {
    ...notice.objectDescription,
    objectName: nameParts.join(":").trim() || orderName,
    okpd2Code: okpd2,
    okpd2Name: nameParts.join(":").trim(),
    ktruCode: ktruMatch ? ktruMatch[1] : "",
    ktruName: ktruMatch ? nameParts.join(":").trim() : "",
    consumerProperties: detail.characteristics,
  };
  notice.attachedDocs = [];
  notice.eisImport = {
    ...importInfo,
    sourceUrl: detail.url,
    planNumber: matchedPosition?.planNumber ?? "",
  };
  return notice;
}

function mapProcurement(notice) {
  return {
    id: notice.procurementId,
    "Идентификационный код закупки": notice.ikz,
    "Наименование закупки": notice.generalInfo.orderName,
    "Номер извещения": notice.generalInfo.noticeNumber,
    "Начальная (максимальная) цена контракта, руб": notice.generalInfo.nmck,
    "Тип закупки": clean(
      notice.eisImport?.method ??
        notice.generalInfo.placingWayCode,
    ),
    eisSourceUrl: notice.generalInfo.href,
  };
}

function pruneDb(db, org, employee, importedProcurementIds) {
  const keep = {
    users: (item) => item.email === employee.email || item.id === employee.userId,
    employees: (item) => item.id === employee.id,
    organizations: (item) => item.id === org.id,
    contractServices: (item) => item.organizationId === org.id,
    structuralUnits: (item) => String(item.id) === String(employee.structuralUnitId),
    contractRegistry: () => true,
  };
  for (const key of Object.keys(db)) {
    if (!Array.isArray(db[key])) continue;
    if (keep[key]) {
      db[key] = db[key].filter(keep[key]);
    } else {
      db[key] = [];
    }
  }
  // Ссылок на старые демо-процедуры у части контрактов больше нет. Удаляем
  // ключ целиком: json-server считает null «висячей» ссылкой и при любом DELETE
  // пытается каскадно удалить все такие контракты.
  const valid = new Set(importedProcurementIds.map(String));
  for (const contract of db.contractRegistry) {
    if (
      contract.procurementId == null ||
      !valid.has(String(contract.procurementId))
    ) {
      delete contract.procurementId;
    }
  }
  return db;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = JSON.parse(fs.readFileSync(args.db, "utf8"));
  const org = db.organizations.find((item) => item.inn === args.inn)
    ?? db.organizations.find((item) => item.id === 6);
  if (!org) throw new Error(`В db.json нет организации с ИНН ${args.inn}`);
  const employee = db.employees.find((item) => item.userId === 7)
    ?? db.employees.find((item) => item.email === "poyarkova_nyy@mail.ru");
  if (!employee) throw new Error("В db.json нет связанного работника пользователя");

  const inn = args.inn || org.inn;
  const publicOrg = fetchOrganization(inn);
  applyOrganizationRequisites(org, publicOrg);
  if (args.refreshOrganization) {
    const snapshots = [
      ...(db.purchasePlans ?? []).map((plan) => plan.customer),
      ...(db.notices ?? []).map((notice) => notice.customer),
    ].filter(
      (customer) =>
        customer && (customer.id === org.id || customer.inn === inn),
    );
    for (const snapshot of snapshots) {
      applyOrganizationRequisites(snapshot, publicOrg);
    }
    fs.writeFileSync(args.db, `${JSON.stringify(db, null, 2)}\n`, "utf8");
    console.log(
      JSON.stringify(
        { organization: org, snapshotsUpdated: snapshots.length },
        null,
        2,
      ),
    );
    return;
  }

  const now = new Date();
  const planFromDots = formatDots(shiftDate(now, args.years));
  const noticeFromDots = formatDots(shiftDate(now, args.noticeYears));
  const toDots = formatDots(now);
  const importInfo = {
    inn,
    importedAt: now.toISOString(),
    contractYears: args.years,
    planFrom: planFromDots,
    noticeFrom: noticeFromDots,
    to: toDots,
  };

  console.log(`ИНН ${inn}: планы ${planFromDots}—${toDots}, извещения ${noticeFromDots}—${toDots}`);
  const foundPlans = await findPlanNumbers(inn, planFromDots, toDots, args.plans);
  const planSources = [];
  for (const number of foundPlans.numbers) {
    planSources.push(await fetchPlan(number));
  }
  const foundNotices = await fetchNoticesCsv(inn, noticeFromDots, toDots, args.notices);
  const noticeRows = [];
  for (const item of foundNotices.notices) {
    const detail = await fetchNoticeDetail(item.number);
    noticeRows.push({ item, detail });
  }

  // Шаблоны берём из текущей базы до очистки: так сохраняются все вложенные
  // поля схем ЕИС 17.0, которые не заполняются из публичной карточки.
  const planTemplate = db.purchasePlans[0]?.positions?.[0] ?? {};
  const noticeTemplate = db.notices[0] ?? {};
  const plans = planSources.map((source) => mapPlan(source, planTemplate, org, importInfo));
  const notices = noticeRows.map(({ item, detail }) =>
    mapNotice(item, detail, noticeTemplate, org, plans, { ...importInfo, method: item.row["Способ определения поставщика (подрядчика, исполнителя), подрядной организации (размещения закупки)"] }),
  );
  const procurements = notices.map(mapProcurement);

  const summary = {
    ...importInfo,
    plansFound: foundPlans.total,
    plansImported: plans.length,
    planNumbers: plans.map((plan) => plan.planNumber),
    noticesFound: foundNotices.total,
    noticesImported: notices.length,
    noticeNumbers: notices.map((notice) => notice.generalInfo.noticeNumber),
    organization: {
      registryNumber: publicOrg.registryNumber,
      fullName: publicOrg.fullName,
    },
  };

  if (args.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    console.log("Первый план:", JSON.stringify(plans[0] && {
      id: plans[0].id,
      positions: plans[0].positions.length,
      totalAmount: plans[0].totalAmount,
    }));
    console.log("Первое извещение:", JSON.stringify(notices[0] && {
      id: notices[0].id,
      ikz: notices[0].ikz,
      nmck: notices[0].generalInfo.nmck,
      etp: notices[0].generalInfo.etpName,
    }));
    return;
  }

  const preservedContracts = db.contractRegistry.length;
  pruneDb(db, org, employee, procurements.map((item) => item.id));
  db.purchasePlans = plans;
  db.procurements = procurements;
  db.notices = notices;

  // Связи строим после очистки старых процедур: только так у контрактов
  // останутся актуальные procurementId. Из извещений одновременно берём
  // ответственных лиц — они получают задачи по своим закупкам.
  const chain = applyEisChain(db);
  const linkedContracts = db.contractRegistry.filter((contract) =>
    procurements.some((item) => item.id === contract.procurementId),
  );
  const tasks = buildNoticeTasks({
    plans,
    notices,
    contracts: linkedContracts,
    org,
    head: employee,
    staffByNotice: chain.byNotice,
    count: args.tasks,
  });
  db.tasks = tasks;

  if (process.env.EIS_IMPORT_SAMPLE) {
    fs.writeFileSync(
      path.join(process.env.TEMP || ".", "eis-import-sample.json"),
      JSON.stringify({ plan: plans[0], notice: notices[0], task: tasks[0] }, null, 2),
      "utf8",
    );
  }

  const report = {
    ...summary,
    tasksAdded: tasks.length,
    contractsPreserved: preservedContracts,
    contractLinks: chain.notices,
    paymentLinks: chain.payments,
    responsibleStaff: chain.staff,
  };
  db.eisImportSummary = report;
  fs.writeFileSync(args.db, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(`Ошибка импорта ЕИС: ${error.message}`);
  if (process.env.EIS_IMPORT_DEBUG) console.error(error.stack);
  process.exitCode = 1;
});
