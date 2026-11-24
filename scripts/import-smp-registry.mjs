/**
 * Импорт реестра МСП в PostgreSQL из официальной выгрузки ФНС
 * (набор открытых данных 7707329152-rsmp).
 *
 * Для работы системы полный перечень не нужен: ИНН сверяется точечно
 * (`POST /__smp/check` → `scripts/lib/smp-lookup.mjs`), и ответ сервиса ФНС
 * ложится в `smpRegistry` с датой сверки. Импорт остаётся способом заранее
 * засеять справочник выгрузкой — например, чтобы проверить сразу много
 * поставщиков без обращений к порталу.
 *
 * Демонстрационных записей в системе нет: справочник либо наполнен сверками и
 * выгрузкой, либо пуст — и тогда проверка поставщиков отвечает «не проверено»,
 * а не «в реестре МСП не найден» (см. `isSmpRegistryLoaded`).
 *
 * Форматы на входе:
 *  — CSV/TSV с заголовком (разделитель `;`, `,` или табуляция): выгрузка ФНС
 *    либо «Экспорт в Excel» с портала rmsp.nalog.ru, сохранённый как
 *    «CSV UTF-8». Распознаются колонки: ИНН, Наименование, Категория,
 *    Реестровый номер, Регион, Дата включения, Дата исключения;
 *  — JSON-массив записей или объект `{ "smpRegistry": [...] }`.
 *
 * Запуск:
 *   npm run smp:registry:import -- <файл> [--dry] [--append]
 *
 * `--dry` — только проверить файл и показать сводку, без записи в БД.
 * `--append` — дополнить коллекцию; по умолчанию записи, которых нет в файле,
 * удаляются: иначе компания, исключённая из реестра, оставалась бы «действующей».
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  PG_SCHEMA,
  createPgPool,
  ensureSchema,
  upsertDocument,
} from "./lib/pg-store.mjs";

const COLLECTION = "smpRegistry";

// Заголовки CSV: выгрузка ФНС и Excel-экспорт портала называют колонки по-разному
const HEADER_ALIASES = {
  inn: ["инн", "inn"],
  name: [
    "наименование",
    "наименование субъекта",
    "наименование субъекта мсп",
    "наименование организации",
    "name",
  ],
  category: [
    "категория",
    "категория субъекта",
    "категория субъекта мсп",
    "category",
  ],
  registryNumber: ["реестровый номер", "номер в реестре", "registrynumber"],
  region: ["регион", "субъект рф", "region"],
  includedAt: ["дата включения", "дата включения в реестр", "includedat"],
  excludedAt: ["дата исключения", "дата исключения из реестра", "excludedat"],
};

const CATEGORY_BY_TEXT = new Map([
  ["микро", "micro"],
  ["микропредприятие", "micro"],
  ["микро предприятие", "micro"],
  ["1", "micro"],
  ["micro", "micro"],
  ["малое", "small"],
  ["малое предприятие", "small"],
  ["малый бизнес", "small"],
  ["2", "small"],
  ["small", "small"],
  ["среднее", "medium"],
  ["среднее предприятие", "medium"],
  ["3", "medium"],
  ["medium", "medium"],
]);

const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'`]/g, "")
    .replace(/[^a-zа-я0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeInn = (value) => String(value ?? "").replace(/\D/g, "");

const isInn = (value) => value.length === 10 || value.length === 12;

/** `01.08.2016` → `2016-08-01`; уже ISO-дата остаётся как есть. */
const isoDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : "";
};

const categoryOf = (value) => {
  const text = normalizeHeader(value);
  return CATEGORY_BY_TEXT.get(text) ?? "";
};

/** Строка CSV с кавычками: `"ООО ""Ромашка""";7701234567`. */
const splitCsvLine = (line, delimiter) => {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += char;
  }

  cells.push(cell);
  return cells.map((value) => value.trim());
};

const detectDelimiter = (line) => {
  const counts = [";", ",", "\t"].map((delimiter) => ({
    delimiter,
    count: line.split(delimiter).length - 1,
  }));
  return counts.sort((left, right) => right.count - left.count)[0].delimiter;
};

const headerKey = (header) => {
  const normalized = normalizeHeader(header);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) return key;
  }
  return "";
};

/**
 * Разбирает CSV-текст в массив строк (объекты по заголовку).
 * Возвращает и пропуски: строки без корректного ИНН или наименования.
 */
export const parseSmpRegistryText = (text) => {
  const lines = String(text)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error(
      "В файле нет строк данных: нужен заголовок и хотя бы одна запись.",
    );
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = splitCsvLine(lines[0], delimiter);
  const columns = header.map(headerKey);

  const missing = ["inn", "name"].filter((key) => !columns.includes(key));
  if (missing.length > 0) {
    throw new Error(
      `В заголовке нет обязательных колонок: ${missing.join(", ")}. ` +
        "Ожидаются «ИНН» и «Наименование» (или inn/name).",
    );
  }

  const rows = [];
  const skipped = [];

  for (let index = 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index], delimiter);
    const raw = {};
    columns.forEach((key, columnIndex) => {
      if (key) raw[key] = cells[columnIndex] ?? "";
    });
    if (!raw.inn && !raw.name) continue;

    const inn = normalizeInn(raw.inn);
    if (!isInn(inn)) {
      skipped.push({
        line: index + 1,
        reason: `ИНН «${raw.inn}» не 10 и не 12 цифр`,
      });
      continue;
    }
    if (!String(raw.name ?? "").trim()) {
      skipped.push({ line: index + 1, reason: "не заполнено наименование" });
      continue;
    }

    rows.push({
      inn,
      name: String(raw.name).trim(),
      category: categoryOf(raw.category),
      registryNumber: String(raw.registryNumber ?? "").trim(),
      region: String(raw.region ?? "").trim(),
      includedAt: isoDate(raw.includedAt),
      excludedAt: isoDate(raw.excludedAt),
    });
  }

  return { rows, skipped };
};

/** JSON: массив записей или `{ smpRegistry: [...] }` из бэкапа базы. */
const parseJson = (text) => {
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed) ? parsed : (parsed?.smpRegistry ?? null);
  if (!Array.isArray(rows)) {
    throw new Error("Ожидался массив записей или объект с полем smpRegistry.");
  }
  return rows;
};

/**
 * Сырые записи → документы коллекции `smpRegistry`.
 *
 * Ключ — ИНН: он не меняется, а наименование меняется и допускает совпадение
 * с одноимённой организацией. Повтор ИНН в файле перекрывается последней
 * записью — так выглядит обновление сведений в новой выгрузке.
 */
export const buildSmpRegistryDocs = (rows) => {
  const byInn = new Map();
  const skipped = [];

  for (const raw of rows) {
    const inn = normalizeInn(raw.inn ?? raw["ИНН"]);
    if (!isInn(inn)) {
      skipped.push({
        inn: String(raw.inn ?? raw["ИНН"] ?? ""),
        reason: "ИНН не 10 и не 12 цифр",
      });
      continue;
    }

    const name = String(raw.name ?? raw["Наименование"] ?? "").trim();
    if (!name) {
      skipped.push({ inn, reason: "не заполнено наименование" });
      continue;
    }

    const excludedAt = isoDate(raw.excludedAt ?? raw["Дата исключения"]);
    const includedAt = isoDate(raw.includedAt ?? raw["Дата включения"]);
    const category = categoryOf(raw.category ?? raw["Категория"]);

    const doc = {
      id: inn,
      inn,
      name,
      isActive: Boolean(raw.isActive ?? raw.is_active ?? !excludedAt),
    };
    const registryNumber = String(
      raw.registryNumber ?? raw["Реестровый номер"] ?? "",
    ).trim();
    if (registryNumber) doc.registryNumber = registryNumber;
    const region = String(raw.region ?? raw["Регион"] ?? "").trim();
    if (region) doc.region = region;
    if (category) doc.category = category;
    if (includedAt) doc.includedAt = includedAt;
    if (excludedAt) {
      doc.isActive = false;
      doc.note = `Исключён из реестра ${excludedAt}`;
    } else if (raw.note) {
      doc.note = String(raw.note);
    }

    byInn.set(inn, doc);
  }

  return { docs: [...byInn.values()], skipped };
};

/** Читает файл выгрузки по расширению и возвращает документы для PG. */
export const readSmpRegistryFile = (file) => {
  const text = fs.readFileSync(file, "utf8");
  const extension = path.extname(file).toLowerCase();

  if (extension === ".json") {
    return buildSmpRegistryDocs(parseJson(text));
  }

  const { rows, skipped } = parseSmpRegistryText(text);
  const result = buildSmpRegistryDocs(rows);
  return { docs: result.docs, skipped: [...skipped, ...result.skipped] };
};

const usage = () =>
  "Использование: npm run smp:registry:import -- <файл.csv|json> [--dry] [--append]";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  const dry = args.includes("--dry");
  const append = args.includes("--append");

  if (!file) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const absolute = path.resolve(file);
  if (!fs.existsSync(absolute)) {
    console.error(`Файл не найден: ${absolute}`);
    process.exitCode = 1;
    return;
  }

  const { docs, skipped } = readSmpRegistryFile(absolute);
  if (docs.length === 0) {
    console.error(
      "В файле нет ни одной записи с корректным ИНН — реестр не тронут.",
    );
    process.exitCode = 1;
    return;
  }

  const counts = { micro: 0, small: 0, medium: 0, other: 0, excluded: 0 };
  for (const doc of docs) {
    if (!doc.isActive) counts.excluded += 1;
    if (doc.category) counts[doc.category] += 1;
    else counts.other += 1;
  }

  console.log(
    `Разобрано ${docs.length} записей: микро ${counts.micro}, малые ${counts.small}, ` +
      `средние ${counts.medium}, без категории ${counts.other}, исключённых ${counts.excluded}.`,
  );
  for (const skip of skipped.slice(0, 10)) {
    const where = skip.line
      ? ` (строка ${skip.line})`
      : skip.inn
        ? ` (ИНН ${skip.inn})`
        : "";
    console.log(`  пропущено${where}: ${skip.reason}`);
  }
  if (skipped.length > 10) {
    console.log(`  … и ещё ${skipped.length - 10} пропусков.`);
  }

  if (dry) {
    console.log("--dry: файл проверен, в базу ничего не записано.");
    return;
  }

  const pool = createPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureSchema(client);

    // Отсутствующие в файле записи удаляем: реестр — срез на дату выгрузки,
    // исключённая компания не должна остаться «действующей»
    if (!append) {
      const ids = docs.map((doc) => String(doc.id));
      await client.query(
        `DELETE FROM ${PG_SCHEMA}.documents
         WHERE collection = $1 AND doc_id <> ALL($2::text[])`,
        [COLLECTION, ids],
      );
    }

    for (const doc of docs) {
      await upsertDocument(client, COLLECTION, doc);
    }

    await client.query("COMMIT");
    console.log(
      `Реестр МСП обновлён: ${docs.length} записей в коллекции ${COLLECTION}${
        append ? " (дополнение)" : ""
      }.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка записи в PostgreSQL:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  await main();
}
