/**
 * Единая точка входа для разбора технических документов (ГОСТ, СП, ТУ, ...).
 *
 * Сеть здесь сознательно не используется: страницы скачиваются в браузере
 * (Nodes-фetch упирается в капчу на части сайтов) и кладутся в
 * docs/snapshots/gost/fulltext/ — pdf/doc скачивать не нужно, полный текст
 * лежит прямо в HTML страницы. Этот модуль умеет читать оба вида снимка:
 *   *.html — страница сайта с текстом внутри <article>;
 *   *.txt  — текст, сохранённый из браузера (innerText <article>).
 *
 * Чтобы добавить новый источник, достаточно зарегистрировать его в
 * TECH_DOC_SOURCES и, если у него другая разметка, добавить парсер рядом с
 * allgosts.mjs и дописать dispatch в parseTechnicalDocument().
 */
import {
  extractGostRequirements,
  parseAllgostsPage,
  parseGostText,
} from "./allgosts.mjs";

/**
 * Реестр источников технических документов.
 * robotRules — что разрешает robots.txt; browserSave — как выгружать текст.
 */
export const TECH_DOC_SOURCES = [
  {
    id: "allgosts",
    label: "allgosts.ru — полный текст ГОСТ",
    host: "allgosts.ru",
    robots: "HTML-страницы разрешены; /search и *.pdf/*.doc/*.docx запрещены",
    browserSave: "document.querySelector('article')",
    formats: ["html", "txt"],
  },
  {
    id: "protect-gost",
    label: "protect.gost.ru — карточки новых ГОСТов",
    host: "protect.gost.ru",
    robots: "карточки доступны; полный текст только после входа",
    browserSave: "только bibliographic-поля карточки (см. gost-monitor.mjs)",
    formats: ["html"],
  },
];

/** Источник по URL или имени файла снимка. */
export function detectTechDocSource(urlOrName = "") {
  const value = String(urlOrName).toLowerCase();
  return TECH_DOC_SOURCES.find((source) => value.includes(source.host)) ?? null;
}

/** Имя файла снимка: ГОСТ 1232-2017 → gost-1232-2017.txt. */
export function techDocFilename(designation, ext = "txt") {
  const slug = String(designation ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  // Обычный префикс файлов снимков — латиницей: gost-1232-2017.txt.
  const normalized = slug.replace(/^гост/, "gost");
  return `${normalized || "document"}.${ext.replace(/^\./, "")}`;
}

/**
 * Разбирает сохранённую страницу или текст в единую структуру:
 * { designation, text, sections:[{heading, paragraphs}] }.
 */
export function parseTechnicalDocument(content, options = {}) {
  const { sourceUrl = "", designation = "", source = "auto" } = options;
  const body = String(content ?? "");
  const detected = source === "auto" ? detectTechDocSource(sourceUrl)?.id : source;
  const isHtml = /<article[\s>]/i.test(body) || detected === "allgosts" && /<h1[\s>]/i.test(body);

  const parsed = isHtml
    ? parseAllgostsPage(body, sourceUrl)
    : parseGostText(body, sourceUrl);
  if (designation && !parsed.designation) parsed.designation = designation;
  return { ...parsed, source: detected ?? "text" };
}

/**
 * Требования для ООЗ с дословной цитатой из текста документа.
 * Возвращаем только те значения, цитату которых можно найти в исходнике.
 */
export const extractTechnicalRequirements = extractGostRequirements;
