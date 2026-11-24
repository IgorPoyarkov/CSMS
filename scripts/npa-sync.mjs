#!/usr/bin/env node
/**
 * Синхронизация НПА и проверка полноты редакций.
 *
 * Ориентир полноты: три редакции у любого вида акта. Порог — не требование:
 * недобор не считается ошибкой, если источник подтвердил, что других редакций
 * нет. У 44-ФЗ горизонт релевантности — 01.01.2022: закон с тех пор изменился
 * целиком, а контрактов более ранних лет в системе практически нет, поэтому
 * архивные редакции не загружаются и не учитываются в проверке.
 *
 * Скрипт проверяет набор по данным `legalActs` и умеет наполнять каркас:
 *
 *   node scripts/npa-sync.mjs --check
 *   node scripts/npa-sync.mjs --seed
 *   node scripts/npa-sync.mjs --source=pravo --url=http://publication.pravo.gov.ru/document/0001201304080023 --act=npa-44fz
 *   node scripts/npa-sync.mjs --list
 *
 * `--seed` кладёт только реквизиты редакций (даты вступления, подписи) без
 * выдуманных текстов: `contentStatus: "metadata"`. Тексты и номера изменяющих
 * актов добавляет реальная синхронизация с pravo.gov.ru (`--source=pravo`),
 * которая запускается в сети заказчика.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const API = process.env.NPA_API || "http://localhost:3002";
const MIN_VERSIONS = {
  "federal-law": 3,
  "presidential-decree": 3,
  "government-decree": 3,
  "government-order": 3,
  "ministry-order": 3,
  other: 3,
};

/** Горизонт релевантности 44-ФЗ: редакции до 2022 года не нужны. */
const FEDERAL_LAW_RELEVANT_FROM = "2022-01-01";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};

const apiBase = option("api", API).replace(/\/$/, "");

/** Горизонт, заданный флагом `--relevant-from=ГГГГ-ММ-ДД` (иначе — дефолт). */
const RELEVANT_FROM_OVERRIDE = option("relevant-from", null);

const request = async (path, init = {}) => {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path}: HTTP ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
};

const listActs = () => request("/legalActs");

const upsertAct = async (act) => {
  const existing = (await listActs()).find(
    (item) => String(item.id) === String(act.id),
  );
  if (existing) {
    return request(`/legalActs/${act.id}`, {
      method: "PATCH",
      body: JSON.stringify(act),
    });
  }
  return request("/legalActs", { method: "POST", body: JSON.stringify(act) });
};

const version = (date, label, extra = {}) => ({
  id: `red-${date}`,
  revision: label,
  validFrom: date,
  publishedAt: date,
  verified: false,
  contentStatus: "metadata",
  articles: [],
  ...extra,
});

/**
 * Демонстрационный набор: реальные виды актов и даты вступления редакций.
 * Тексты не подставляются — иначе консультант мог бы сослаться на
 * выдуманную норму. Номера изменяющих актов заполняет pravo.gov.ru.
 */
const seedActs = () => [
  {
    id: "npa-44fz",
    shortName: "44-ФЗ",
    fullName:
      "Федеральный закон от 05.04.2013 № 44-ФЗ «О контрактной системе в сфере закупок товаров, работ, услуг для обеспечения государственных и муниципальных нужд»",
    actType: "federal-law",
    actNumber: "44-ФЗ",
    adoptedDate: "2013-04-05",
    status: "active",
    sourceUrl: "http://publication.pravo.gov.ru/document/0001201304080023",
    isVerified: false,
    lastCheckedDate: new Date().toISOString().slice(0, 10),
    // Только горизонт с 2022 года: до него 44-ФЗ действовал в другом каркасе,
    // сверять его с текущими проверками нельзя, а контрактов тех лет в системе
    // нет. Четыре редакции — покрывают 2022–2025. Даты демонстрационные:
    // точный перечень редакций и номера изменяющих актов даёт pravo.gov.ru.
    sourceComplete: false,
    relevantFrom: RELEVANT_FROM_OVERRIDE ?? FEDERAL_LAW_RELEVANT_FROM,
    versions: [
      version("2022-01-01", "ред. от 02.07.2021"),
      version("2023-01-01", "ред. от 28.12.2022"),
      version("2024-01-01", "ред. от 25.12.2023"),
      version("2025-01-01", "ред. от 25.12.2024"),
    ],
  },
  {
    id: "npa-pp-1042",
    shortName: "ПП РФ № 1042",
    fullName:
      "Постановление Правительства РФ от 30.08.2017 № 1042 «Об утверждении Правил определения размера штрафа…»",
    actType: "government-decree",
    actNumber: "1042",
    adoptedDate: "2017-08-30",
    status: "active",
    sourceUrl: "http://publication.pravo.gov.ru/",
    isVerified: false,
    lastCheckedDate: new Date().toISOString().slice(0, 10),
    sourceComplete: false,
    versions: [
      version("2017-09-09", "Первоначальная редакция"),
      version("2019-01-01", "ред. от 15.11.2018"),
      version("2022-01-01", "ред. от 23.12.2021"),
    ],
  },
  {
    id: "npa-158n",
    shortName: "Приказ № 158н",
    fullName:
      "Приказ Минфина России от 31.07.2020 № 158н «Об утверждении Типового положения (регламента) о контрактной службе»",
    actType: "ministry-order",
    actNumber: "158н",
    adoptedDate: "2020-07-31",
    status: "active",
    sourceUrl: "http://publication.pravo.gov.ru/",
    isVerified: false,
    lastCheckedDate: new Date().toISOString().slice(0, 10),
    sourceComplete: false,
    versions: [
      version("2020-07-31", "Первоначальная редакция"),
      version("2021-01-01", "ред. от 31.07.2020 (вступление)"),
      version("2023-01-01", "ред. от 01.12.2022"),
    ],
  },
];

const kindOf = (act) =>
  Object.hasOwn(MIN_VERSIONS, act.actType) ? act.actType : "other";

/** Редакция на горизонте: действовала после `relevantFrom` или действует. */
const versionRelevant = (version, from) => {
  if (!from) return true;
  return !version.validTo || version.validTo > from;
};

/** Редакции на горизонте релевантности (все, если горизонт не задан). */
const relevantVersions = (act) => {
  const list = Array.isArray(act.versions) ? act.versions : [];
  return act.relevantFrom
    ? list.filter((version) => versionRelevant(version, act.relevantFrom))
    : list;
};

const completeness = (act) => {
  const required = MIN_VERSIONS[kindOf(act)];
  const list = Array.isArray(act.versions) ? act.versions : [];
  const actual = relevantVersions(act).length;
  const archived = list.length - actual;
  const sourceComplete = act.sourceComplete === true;
  return {
    required,
    actual,
    archived,
    relevantFrom: act.relevantFrom ?? null,
    sourceComplete,
    // Порог — ориентир: подтверждённый источником набор считается полным,
    // даже если редакций меньше (у приказа их может быть всего две).
    complete: actual >= required || sourceComplete,
  };
};

const printCheck = (acts) => {
  const rows = acts.map((act) => {
    const { required, actual, archived, relevantFrom, complete, sourceComplete } =
      completeness(act);
    const status = sourceComplete
      ? `OK · в источнике ${actual}`
      : complete
        ? "OK"
        : `проверить: ${actual} из ${required}`;

    return {
      id: act.id,
      act: act.shortName,
      kind: kindOf(act),
      horizon: relevantFrom ?? "—",
      actual,
      archived,
      required,
      status,
    };
  });

  if (rows.length === 0) {
    console.log("Актов нет. Запустите: node scripts/npa-sync.mjs --seed");
    return true;
  }

  console.table(rows);
  const incomplete = rows.filter((row) => !row.status.startsWith("OK"));
  console.log(
    incomplete.length === 0
      ? "Полнота редакций: наборы полные на горизонте (порог или подтверждение источника)."
      : `Полнота редакций: ${incomplete.length} акт(ов) без подтверждения набора — это не ошибка, а повод сверить источник.`,
  );

  return incomplete.length === 0;
};

/** Отметить, что источник подтвердил: других редакций нет. */
const markSourceComplete = async (actId) => {
  const acts = await listActs();
  const target = acts.find((act) => String(act.id) === String(actId));
  if (!target) throw new Error(`Акт ${actId} не найден`);

  // Считаем только редакции на горизонте: архивные в источник не запрашиваем.
  const total = relevantVersions(target).length;
  await upsertAct({
    id: target.id,
    sourceComplete: true,
    sourceVersionsTotal: total,
    lastCheckedDate: new Date().toISOString().slice(0, 10),
  });
  console.log(
    `${target.shortName}: набор подтверждён источником (${total} редакций на горизонте).`,
  );
};

/** Декодирование HTML-сущностей: в <title> они числовые (&#x424;…). */
const decodeHtml = (value) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/"/g, '"')
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&nbsp;/g, " ")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&/g, "&");

const fetchPravoCard = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "CSMS-NPA-Sync/1.0 (+legal acts registry)" },
  });
  if (!response.ok) {
    throw new Error(`pravo.gov.ru: HTTP ${response.status}`);
  }
  const html = await response.text();
  const text = (pattern) => html.match(pattern)?.[1]?.trim();

  const title = decodeHtml(text(/<title>([\s\S]*?)<\/title>/i) ?? "").replace(
    /\s+/g,
    " ",
  );
  // Значение лежит в соседнем <span class="document-info-data">, поэтому
  // между подписью и числом допускаем разметку.
  const eoNumber = text(
    /Номер опубликования:[\s\S]{0,160}?document-info-data[^>]*>\s*([0-9]+)/i,
  );
  const published = text(
    /Дата опубликования:[\s\S]{0,200}?document-info-data[^>]*>\s*([0-9]{2}\.[0-9]{2}\.[0-9]{4})/i,
  );
  const pdfPath = text(/href="(\/file\/pdf\?eoNumber=[^"]+)"/i);
  const actualLink = text(
    /href="(http:\/\/actual\.pravo\.gov\.ru\/content\/content\.html#pnum=[^"]+)"/i,
  );

  if (!eoNumber) {
    throw new Error("Не найден номер опубликования — проверьте URL карточки");
  }

  const [day, month, year] = (published ?? "").split(".");
  const publishedIso =
    day && month && year ? `${year}-${month}-${day}` : undefined;

  return {
    title,
    eoNumber,
    publishedIso,
    pdfUrl: pdfPath ? new URL(pdfPath, url).toString() : undefined,
    actualUrl: actualLink,
    cardUrl: url,
  };
};

const downloadPdf = async (card) => {
  if (!card.pdfUrl) return null;
  const response = await fetch(card.pdfUrl, {
    headers: { "User-Agent": "CSMS-NPA-Sync/1.0" },
  });
  if (!response.ok) throw new Error(`PDF: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const path = `.tmp/npa/${card.eoNumber}.pdf`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
  return { path, bytes: buffer.length };
};

const syncPravo = async ({ url, actId, download }) => {
  if (!url) throw new Error("Укажите --url карточки на pravo.gov.ru");

  const acts = await listActs();
  const target = acts.find((act) => String(act.id) === String(actId));
  if (!target) {
    throw new Error(`Акт ${actId} не найден. Сначала выполните --seed`);
  }

  const card = await fetchPravoCard(url);
  const versionId = `pravo-${card.eoNumber}`;
  const exists = (target.versions ?? []).some((item) => item.id === versionId);
  const nextVersion = version(
    card.publishedIso ?? new Date().toISOString().slice(0, 10),
    `публикация от ${card.publishedIso ?? "—"}`,
    {
      id: versionId,
      sourceUrl: card.cardUrl,
      changingAct: card.title,
      contentStatus: "metadata",
    },
  );

  const versions = exists
    ? target.versions
    : [...(target.versions ?? []), nextVersion];

  await upsertAct({
    id: target.id,
    versions,
    sourceUrl: target.sourceUrl ?? card.cardUrl,
    ...(RELEVANT_FROM_OVERRIDE ? { relevantFrom: RELEVANT_FROM_OVERRIDE } : {}),
    lastCheckedDate: new Date().toISOString().slice(0, 10),
  });

  const horizon = RELEVANT_FROM_OVERRIDE ?? target.relevantFrom;
  console.log(`Акт: ${target.shortName}`);
  if (horizon) console.log(`Горизонт: редакции с ${horizon}`);
  console.log(`Карточка: ${card.cardUrl}`);
  console.log(`Опубликование: ${card.eoNumber} от ${card.publishedIso ?? "—"}`);
  if (card.actualUrl) console.log(`Текст: ${card.actualUrl}`);
  console.log(
    exists
      ? "Редакция уже была в реестре — обновлена дата сверки."
      : `Добавлена редакция ${nextVersion.revision}.`,
  );

  if (download) {
    const pdf = await downloadPdf(card);
    if (pdf) console.log(`PDF: ${pdf.path} (${pdf.bytes} байт)`);
  }
};

const main = async () => {
  if (flag("list")) {
    const acts = await listActs();
    console.table(
      acts.map((act) => ({
        id: act.id,
        act: act.shortName,
        kind: act.actType,
        versions: act.versions?.length ?? 0,
      })),
    );
    return;
  }

  if (flag("seed")) {
    for (const act of seedActs()) {
      await upsertAct(act);
      const horizon = act.relevantFrom
        ? `, горизонт с ${act.relevantFrom}`
        : "";
      console.log(
        `· ${act.shortName}: ${act.versions.length} редакций${horizon}`,
      );
    }
    console.log(
      "Демо-набор записан. Проверка: node scripts/npa-sync.mjs --check",
    );
    return;
  }

  if (flag("complete")) {
    await markSourceComplete(option("act", "npa-44fz"));
    return;
  }

  if (flag("check")) {
    const ok = printCheck(await listActs());
    // Мягкий режим: недобор — предупреждение, а не ошибка. Код 1 только с
    // --strict, когда проверка нужна в CI и набор обязан быть подтверждён.
    if (!ok && flag("strict")) process.exitCode = 1;
    return;
  }

  if (option("source", "") === "pravo") {
    await syncPravo({
      url: option("url", ""),
      actId: option("act", "npa-44fz"),
      download: flag("download"),
    });
    return;
  }

  console.log(
    [
      "Команды:",
      "  --seed                       записать демонстрационные акты и редакции",
      "  --check                      проверить набор на горизонте (ориентир — 3 редакции)",
      "  --check --strict             код 1, если набор не подтверждён (для CI)",
      "  --complete --act=<id>        источник подтвердил: других редакций нет",
      "  --list                       показать акты и число редакций",
      "  --source=pravo --url=...     добавить редакцию с карточки pravo.gov.ru",
      "  --act=<id>                   акт для --source=pravo (по умолчанию npa-44fz)",
      "  --relevant-from=ГГГГ-ММ-ДД   горизонт: редакции до даты не учитываются",
      "                               (44-ФЗ по умолчанию — 2022-01-01)",
      "  --download                   сохранить PDF карточки в .tmp/npa",
      "  --api=http://localhost:3002  адрес PG-адаптера",
    ].join("\n"),
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
