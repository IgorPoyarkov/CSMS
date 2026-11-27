/**
 * Разбор открытого каталога ГОСТ Росстандарта (protect.gost.ru).
 * Чистые функции без сетевых запросов — используются монитором и тестами.
 */

const DETAIL_LINK = /\/gost\/details\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

const DETAIL_FIELDS = {
  designation: "Обозначение",
  fullDesignation: "Полное обозначение",
  titleRu: "Заглавие на русском языке",
  orderNumber: "Номер приказа",
  orderDate: "Дата приказа",
  effectiveDate: "Дата введения в действие",
  effectiveNote: "Дата введения в действие(примечание)",
  ics: "Код ОКС",
  keywords: "Ключевые слова",
  scope: "Область применения",
  replaces: "Обозначение заменяемого(ых)",
  replacedBy: "Обозначение заменяющего",
  technicalCommittee: "Технический комитет",
  developer: "Организация - Разработчик",
};

/** Раскодировать часто встречающиеся HTML-сущности без внешних зависимостей. */
export function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&laquo;/gi, "«")
    .replace(/&raquo;/gi, "»")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * protect.gost.ru иногда смешивает кириллицу и латиницу в латинских словах
 * («Brбssica nбpus», «aeruginоsa»). Заменяем только букву между латинскими —
 * внутри настоящего русского текста такой строки не бывает.
 */
const LOOKALIKE_LETTERS = {
  а: "a",
  б: "a", // на сайте вместо «a» стабильно печатается «б»
  е: "e",
  к: "k",
  м: "m",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
  і: "i",
  ѕ: "s",
};

export function repairMojibake(value) {
  return String(value ?? "").replace(
    /([A-Za-z])([а-яёіѕ])([A-Za-z])/g,
    (_, before, letter, after) =>
      before + (LOOKALIKE_LETTERS[letter] ?? letter) + after,
  );
}

/** Текст из тега без вложенной разметки. */
function textOf(html) {
  return repairMojibake(decodeHtml(String(html ?? "").replace(/<[^>]+>/g, " ")));
}

/** Значение поля карточки по подписи «Основные сведения»/«Поисковые образы». */
function detailField(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(
    new RegExp(`>\\s*${escaped}\\s*</span>\\s*<p[^>]*>([\\s\\S]*?)</p>`, "i"),
  );
  if (!match) return "";
  const value = textOf(match[1]);
  return value === "-" ? "" : value;
}

/**
 * Список ГОСТов страницы. По умолчанию оставляем только «Принят» —
 * так помечены новые стандарты, остальные статусы относятся к действующим.
 */
export function parseGostList(html, { onlyNew = true } = {}) {
  const rows = String(html ?? "").match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const items = [];
  for (const row of rows) {
    const idMatch = row.match(DETAIL_LINK);
    if (!idMatch) continue;

    const cells = [...row.matchAll(/<td[\s\S]*?<\/td>/gi)].map((cell) => textOf(cell[0]));
    // № | обозначение | наименование | стр. | статус
    const designation = cells[1] ?? "";
    const title = cells[2] ?? "";
    const status = cells[4] ?? "";
    if (!designation || !title) continue;
    if (onlyNew && !/принят/i.test(status)) continue;

    items.push({
      id: idMatch[1],
      designation,
      title,
      pages: /^\d+$/.test(cells[3] ?? "") ? Number(cells[3]) : null,
      status: status.replace(/^[^\p{L}]+/u, "").trim(),
      sourceUrl: `https://protect.gost.ru/gost/details/${idMatch[1]}`,
    });
  }
  return items;
}

/** Номера страниц в пагинации списка. */
export function parseGostPages(html) {
  const pages = new Set();
  for (const match of decodeHtml(html).matchAll(/[?&]page=(\d+)/g)) {
    pages.add(Number(match[1]));
  }
  return [...pages].sort((a, b) => a - b);
}

/** Карточка ГОСТа: все локально сохраняемые текстовые поля. */
export function parseGostDetail(html, listItem = {}) {
  const source = String(html ?? "");
  const fields = {};
  for (const [key, label] of Object.entries(DETAIL_FIELDS)) {
    fields[key] = detailField(source, label);
  }

  const titleEnMatch = source.match(
    /<p class="text-gray-400 mt-1 text-sm italic[^"]*">([\s\S]*?)<\/p>/i,
  );
  const metaMatch = source.match(/<meta name="DESCRIPTION" Content="([\s\S]*?)"/i);

  const item = {
    ...listItem,
    designation: fields.designation || listItem.designation || "",
    title: fields.titleRu || listItem.title || "",
    titleEn: titleEnMatch ? textOf(titleEnMatch[1]) : "",
    fullDesignation: fields.fullDesignation || fields.designation || "",
    orderNumber: fields.orderNumber,
    orderDate: fields.orderDate,
    effectiveDate: fields.effectiveDate,
    effectiveNote: fields.effectiveNote,
    ics: fields.ics,
    keywords: fields.keywords,
    scope: fields.scope,
    replaces: fields.replaces,
    replacedBy: fields.replacedBy,
    technicalCommittee: fields.technicalCommittee,
    developer: fields.developer,
    // Локальный текст карточки: PDF на сайте — только картинки, поэтому
    // сохраняем то, что сайт отдаёт текстом (область применения и ключевые слова).
    text: [fields.scope, fields.keywords, fields.titleRu]
      .filter(Boolean)
      .join(". ")
      .replace(/\.\s*\./g, "."),
    metaDescription: metaMatch ? decodeHtml(metaMatch[1]) : "",
    collectedAt: listItem.collectedAt ?? new Date().toISOString(),
  };
  return item;
}

/** Ключ сопоставления введённого обозначения со справочником. */
export function normalizeDesignation(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/\s+/g, " ")
    .replace(/^[\s.;,]+|[\s.;,]+$/g, "");
}

/** Подсказка для ООЗ по обозначению ГОСТа из локального снимка. */
export function findGostHint(designation, items) {
  const key = normalizeDesignation(designation);
  if (!key) return null;
  return (
    items.find((item) => normalizeDesignation(item.designation) === key) ??
    items.find((item) => normalizeDesignation(item.fullDesignation) === key) ??
    null
  );
}

/** Год принятия из обозначения: ГОСТ Р 2.102-2023 → 2023, ГОСТ 10382-85 → 1985. */
export function gostYear(designation) {
  const match = String(designation ?? "").match(/-(\d{2}|\d{4})(?:\D|$)/);
  if (!match) return null;
  const year = Number(match[1]);
  return year < 100 ? (year <= 30 ? 2000 + year : 1900 + year) : year;
}
