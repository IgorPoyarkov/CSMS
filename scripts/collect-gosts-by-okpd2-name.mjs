/**
 * Подбор ГОСТов по названиям кодов ОКПД2 из позиций плана-графика.
 *
 * Отбор через `standards[]` карточек КТРУ находит только те стандарты, которые
 * сама ЕИС привязала к позиции каталога; у дорожных и многих других карточек
 * поле «Информация о технических регламентах и стандартах» пустое. Здесь мы
 * берём названия ОКПД2 из ПГ, превращаем их в поисковые слова и ищем
 * аналогичные по названию ГОСТы в официальном каталоге Росстандарта.
 *
 * Запуск (нужен локальный pg-адаптер на :3002):
 *   node scripts/collect-gosts-by-okpd2-name.mjs [--dry-run]
 *
 * На выходе — docs/snapshots/gost/pg-name-gosts.json. Это только список:
 * полный текст выгружается отдельно через scripts/browser/export-article.js.
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseGostList, parseGostPages } from "./lib/gost-standards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PG_URL = process.env.PG_JSON_SERVER ?? "http://localhost:3002";
const BASE = "https://protect.gost.ru";
const OUT = path.join(ROOT, "docs/snapshots/gost/pg-name-gosts.json");
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/140.0 Safari/537.36";

// Служебные слова ОКПД2 не несут смысла для поиска по названию стандарта.
const STOP_WORDS = new Set([
  "услуги", "услуга", "работы", "работа", "по", "на", "в", "и", "для", "с", "из",
  "прочие", "прочее", "прочего", "не", "включая", "включенные", "также",
  "другие", "группировки", "группировка", "общего", "видов", "всех", "типа",
  "дания", "сети", "систем", "средства", "объекты", "выполнение", "оказание",
  "наименование",
]);

const ENDINGS = [
  "иями", "ями", "ами", "ыми", "ими", "ого", "его", "ому", "ему", "ость",
  "ости", "ство", "стве", "ством", "иях", "ах", "ях", "ам", "ям", "ов", "ев",
  "ав", "ый", "ий", "ая", "ое", "ые", "ие", "ой", "ей", "ом", "ем", "ым", "ем",
  "ую", "юю", "ия", "ья", "ье", "ью", "ии", "ей", "ть", "й", "ь", "а", "я",
  "ы", "и", "у", "ю", "е", "о",
];

/** Приведение русского слова к основе — поиск на сайте работает по префиксу. */
function stem(word) {
  const value = String(word).toLowerCase();
  for (const ending of ENDINGS) {
    if (value.length - ending.length >= 4 && value.endsWith(ending)) {
      return value.slice(0, -ending.length);
    }
  }
  return value;
}

const words = (text) => String(text ?? "").toLowerCase().match(/[а-яё]{4,}/g) ?? [];
const contentWords = (text) => words(text).filter((word) => !STOP_WORDS.has(word));

/**
 * Поисковые запросы: основы слов и пары соседних слов.
 * Пары берём и в исходной форме, и в переставленном порядке: поиск на сайте
 * чувствителен к форме слова, а «дороги автомобильные» и «автомобильные дороги»
 * выдают разные, но одинаково релевантные списки.
 */
function queriesFor(name) {
  const raw = contentWords(name).slice(0, 6);
  const stems = [...new Set(contentWords(name).map(stem))].filter((word) => word.length >= 4);
  const queries = stems.slice(0, 5);
  for (let index = 0; index + 1 < raw.length; index += 1) {
    queries.push(`${raw[index]} ${raw[index + 1]}`);
    queries.push(`${raw[index + 1]} ${raw[index]}`);
  }
  for (let index = 0; index + 1 < stems.length; index += 1) {
    queries.push(`${stems[index]} ${stems[index + 1]}`);
  }
  return [...new Set(queries)].slice(0, 16);
}

/** Степень совпадения названия ГОСТа с названием кода ОКПД2. */
function relevance(title, name) {
  const titleStems = new Set(contentWords(title).map(stem));
  const nameStems = new Set(contentWords(name).map(stem));
  let score = 0;
  for (const left of titleStems) {
    for (const right of nameStems) {
      if (
        left === right ||
        (left.length >= 4 && right.length >= 4 && (left.startsWith(right) || right.startsWith(left)))
      ) {
        score += 1;
        break;
      }
    }
  }
  return score;
}

const json = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "ru-RU,ru;q=0.9" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};

const searchUrl = (query, page = 1) =>
  `${BASE}/gost/?search=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ""}`;

async function fetchHtml(url, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ru-RU,ru;q=0.9",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} для ${url}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/** Все страницы выдачи по одному запросу. */
async function searchGosts(query) {
  const first = await fetchHtml(searchUrl(query));
  const items = parseGostList(first, { onlyNew: false });
  const pages = parseGostPages(first);
  for (const page of pages) {
    const html = await fetchHtml(searchUrl(query, page));
    items.push(...parseGostList(html, { onlyNew: false }));
  }
  return items;
}

const plans = await json(`${PG_URL}/purchasePlans?_limit=1000`);
const codeNames = new Map();
let positionCount = 0;
for (const plan of plans) {
  for (const position of plan.positions ?? []) {
    positionCount += 1;
    for (const [code, name] of [
      [position.okpd2Code, position.okpd2Name],
      ...(position.okpd2Items ?? []).map((item) => [item.okpd2Code, item.okpd2Name]),
    ]) {
      if (code && name && !codeNames.has(code)) codeNames.set(code, name);
    }
  }
}

const queryCodes = new Map();
for (const [code, name] of codeNames) {
  for (const query of queriesFor(name)) {
    const codes = queryCodes.get(query) ?? new Set();
    codes.add(code);
    queryCodes.set(query, codes);
  }
}

const queries = [...queryCodes.keys()].sort();
const dryRun = process.argv.includes("--dry-run");
if (dryRun) {
  console.log(`Кодов ОКПД2: ${codeNames.size}, запросов: ${queries.length}`);
  for (const [code, name] of codeNames) {
    console.log(`${code}: ${name}\n  ${queriesFor(name).join(" | ")}`);
  }
  process.exit(0);
}

const found = new Map();
let rawCount = 0;

/** Добавить выдачу в общий список; inherited — связи от заменённого документа. */
const merge = (results, query, inherited) => {
  for (const item of results) {
    const record = found.get(item.designation) ?? {
      designation: item.designation,
      title: item.title,
      status: item.status,
      sourceUrl: item.sourceUrl,
      queries: new Set(),
      okpd2Codes: new Set(inherited?.codes ?? []),
      scores: { ...(inherited?.scores ?? {}) },
    };
    record.queries.add(query);
    for (const code of queryCodes.get(query) ?? []) {
      const score = relevance(item.title, codeNames.get(code));
      if (!score) continue;
      record.okpd2Codes.add(code);
      record.scores[code] = Math.max(record.scores[code] ?? 0, score);
    }
    found.set(item.designation, record);
  }
};

for (const [index, query] of queries.entries()) {
  const results = await searchGosts(query);
  rawCount += results.length;
  merge(results, query);
  if ((index + 1) % 10 === 0) {
    console.log(`Запросов обработано: ${index + 1}/${queries.length}, найдено ГОСТов: ${found.size}`);
  }
}

// Устаревшие документы часто указывают на замену, но поиск по названию её не
// находит: отдельно ищем по обозначению, чтобы поднять действующую версию.
const replacementCandidates = [...found.values()]
  .filter(
    (record) =>
      !/^Действует/i.test(record.status) &&
      record.okpd2Codes.size > 0 &&
      Object.values(record.scores).some((score) => score >= 2),
  );
const replacements = new Map();
for (const record of replacementCandidates) {
  // Поиск по designation с годом находит только саму старую версию; номер без
  // года возвращает и её, и действующую замену.
  // Год может быть двузначным («50597-93») и четырёхзначным («30593-2015»).
  const number = /(\d[\d.]*)-\d{2,4}$/.exec(record.designation)?.[1] ?? record.designation;
  if (!replacements.has(number)) replacements.set(number, record);
}
for (const [index, [number, record]] of [...replacements.entries()].entries()) {
  const results = await searchGosts(number);
  rawCount += results.length;
  merge(results, number, { codes: record.okpd2Codes, scores: record.scores });
  if ((index + 1) % 20 === 0) {
    console.log(`Проверено замен: ${index + 1}/${replacements.size}`);
  }
}

const items = [...found.values()]
  .filter((record) => record.okpd2Codes.size > 0)
  .map((record) => ({
    designation: record.designation,
    title: record.title,
    status: record.status,
    current: /^Действует/i.test(record.status),
    sourceUrl: record.sourceUrl,
    queries: [...record.queries].sort(),
    okpd2Codes: [...record.okpd2Codes].sort(),
    scores: Object.fromEntries(
      Object.entries(record.scores).sort(([a], [b]) => a.localeCompare(b)),
    ),
  }))
  .sort((a, b) => a.designation.localeCompare(b.designation));

const payload = JSON.stringify(
  {
    generatedAt: new Date().toISOString(),
    source: BASE,
    planCount: plans.length,
    positionCount,
    okpd2Codes: [...codeNames.keys()].sort(),
    queryCount: queries.length,
    replacementQueries: replacements.size,
    rawCount,
    selectionSha256: createHash("sha256")
      .update(JSON.stringify(items))
      .digest("hex"),
    items,
  },
  null,
  2,
);
await fs.writeFile(OUT, `${payload}\n`, "utf8");
console.log(
  `Планов: ${plans.length}, позиций: ${positionCount}, кодов ОКПД2: ${codeNames.size}, ` +
    `запросов: ${queries.length}, выдач: ${rawCount}, ГОСТов: ${items.length}, ` +
    `действующих: ${items.filter((item) => item.current).length}`,
);
console.log(`Список: ${OUT}`);
