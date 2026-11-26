// Сборка каталога НПА для экрана «Библиотека НПА».
//
// Источник истины — каталог актов проекта, карточки pravo.gov.ru, манифест
// скачанных файлов и текущий поисковый индекс. Скрипт не скачивает документы:
// он фиксирует, какие акты уже загружены и доступны локальному просмотру.
// Результат кладётся в public/npa-library.json и читается frontend через
// React Query (серверные данные не дублируются в стор).
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

const readJson = async (rel) =>
  JSON.parse(await fs.readFile(path.join(ROOT, rel), "utf8"));

const catalog = (await readJson("scripts/consultant/pravo-catalog.json")).acts ?? [];
const cards = (await readJson("scripts/consultant/pravo-sources.json")).acts ?? [];
const downloaded = await readJson(".tmp/pravo-downloads/downloaded.json");
const index = await readJson(".tmp/consultant/index.json");

const cardById = new Map(cards.map((card) => [card.id, card]));

// Считаем фрагменты по slug из индекса. ПП РФ № 1875 индексируется отдельно
// (source: pp1875, по кодам ОКПД2 из csms-api), поэтому считаем и его тоже.
const chunksBySlug = new Map();
const bump = (key) => chunksBySlug.set(key, (chunksBySlug.get(key) ?? 0) + 1);
for (const chunk of index.chunks ?? []) {
  const slug = chunk.meta?.slug;
  if (slug) bump(slug);
  else if (chunk.source === "pp1875") bump("pp-1875");
}

const KIND_ORDER = [
  "Федеральный закон",
  "Постановление Правительства",
  "Распоряжение Правительства",
  "Приказ",
  "Постановление Госкомстата",
];

const formatDate = (value) => {
  const raw = String(value ?? "");
  if (!/^\d{8}$/.test(raw)) return "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
};

const SUBJECT_START = /^(?:О|Об|ОБ|©б)\s/i;
const SERVICE_LINE = /^(?:Федеральный закон|Кодекс Российской Федерации|Постановление Правительства|Распоряжение Правительства|Приказ|Редакция|Официальный текст|Дата публикации|Принят|Одобрен|Раздел|РАЗДЕЛ|ОБЩАЯ|ОСОБЕННАЯ|ГЛАВА|Глава|МИНИСТЕРСТВО|ФЕДЕРАЛЬНОЕ|ПРАВИТЕЛЬСТВО|РОССИЙСКАЯ ФЕДЕРАЦИЯ|Регистрационный|Москва|МОСКВА|ПРИКАЗ|ПОСТАНОВЛЕНИЕ|ФЕДЕРАЛЬНЫЙ ЗАКОН|КОДЕКС|от\s|Председатель|Министр|Подписано)/i;

/**
 * Полное название акта: карточка pravo.gov.ru даёт только вид, дату и номер,
 * а предмет регулирования лежит в шапке сохранённой копии до первой главы.
 * У отсканированных приказов шапка испорчена OCR — такие строки не берём,
 * чтобы не показывать выдуманное название.
 */
const readSubject = async (slug, kind) => {
  if (!slug) return "";
  const file = path.join(ROOT, ".tmp/pravo-downloads", `${slug}.md`);
  let head = "";
  try {
    const handle = await fs.open(file, "r");
    try {
      const buffer = Buffer.alloc(32 * 1024);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytesRead).toString("utf8");
    } finally {
      await handle.close();
    }
  } catch {
    return "";
  }
  const lines = head.split(/\r?\n/);
  const stop = lines.findIndex((line) => line.trim().startsWith("## "));
  for (const raw of lines.slice(0, stop < 0 ? lines.length : stop)) {
    const value = raw
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^©(?=[А-Яа-яЁё])/, "О")
      .replace(/[.,:;]+$/, "");
    if (!value || value.length < 5 || value.length > 260) continue;
    if (/^\d/.test(value) || /[|\\^`{}~]/.test(value)) continue;
    const letters = (value.match(/[А-Яа-яЁё]/g) ?? []).length;
    if (letters / value.length < 0.6) continue;
    if (SERVICE_LINE.test(value) && !SUBJECT_START.test(value)) continue;
    if (value === value.toUpperCase() && !SUBJECT_START.test(value)) continue;
    // «частью 3 статьи 83 Градостроительного кодекса» — не название акта:
    // кодекс/регламент должен быть в начале заголовка.
    const codeTitle = /^(?:[А-Яа-яЁё-]+\s+){0,3}(?:кодекс|регламент)\b/i.test(value);
    if (!SUBJECT_START.test(value) && !codeTitle) continue;
    // У приказов шапка распознана из скана: берём только явно полные и
    // не испорченные OCR формулировки, иначе показываем обозначение карточки.
    if (
      kind === "Приказ" &&
      (!/^(?:Об утверждении|О внесении|Об установлении)/i.test(value) ||
        value.length < 50 ||
        /[?|]/.test(value))
    ) {
      continue;
    }
    return value;
  }
  return "";
};

const fullTitle = (base, subject) => {
  const designation = String(base ?? "").replace(/\s+/g, " ").trim();
  if (!subject) return designation;
  if (!SUBJECT_START.test(subject)) {
    // «Уголовный кодекс Российской Федерации» + номер из карточки.
    const match = designation.match(/от\s+(\d{2}\.\d{2}\.\d{4})\s+№\s*(\S+)/);
    if (match) return `${subject} от ${match[1]} № ${match[2]}`;
  }
  return `${designation} «${subject}»`;
};

// У части старых записей (например, ПП РФ № 1875) поле files не заполнено,
// хотя файлы лежат на диске. Проверяем их напрямую, чтобы библиотека не
// показывала доступный документ как «без текста».
const resolveFiles = async (slug, record) => {
  const declared = Array.isArray(record.files) ? record.files : [];
  const candidates = declared.length
    ? declared
    : ["md", "txt", "doc"].map((ext) => `.tmp/pravo-downloads/${slug}.${ext}`);
  const found = [];
  for (const rel of candidates) {
    if (typeof rel !== "string") continue;
    try {
      await fs.access(path.join(ROOT, rel));
      found.push(rel);
    } catch {
      // Файла нет — просто не предлагаем этот формат.
    }
  }
  return found;
};

const recordsByAct = new Map();
for (const [slug, record] of Object.entries(downloaded)) {
  const actId = record.actId ?? slug.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  if (!recordsByAct.has(actId)) recordsByAct.set(actId, []);
  recordsByAct.get(actId).push({ slug, ...record, files: await resolveFiles(slug, record) });
}

const items = [];
for (const act of catalog) {
  const records = recordsByAct.get(act.id) ?? [];
  // Актуальная редакция важнее архивной; архив показываем отдельной записью,
  // если другой редакции у акта нет.
  const active =
    records.find((record) => record.role === "actual") ??
    records.find((record) => record.role === "future") ??
    records[0] ??
    null;
  const card = cardById.get(act.id);
  const formats = new Set(
    (active?.files ?? [])
      .map((file) => String(file).match(/(\.md|\.txt|\.doc)$/i)?.[1]?.toLowerCase())
      .filter(Boolean),
  );
  const designation = active?.act || card?.documentName || act.title || act.short || act.id;
  const subject = await readSubject(active?.slug ?? "", act.kind);
  const title = fullTitle(designation, subject);
  const slug = active?.slug ?? "";
  const sourceUrl = slug ? `/api/consultant/source/npa/${slug}?format=md` : "";
  // Все загруженные редакции акта — для выбора внутри просмотра. В списке
  // остаётся одна карточка на акт: архив не загромождает библиотеку.
  const editions = records
    .filter((record) => (record.files ?? []).some((file) => /\.md$/i.test(file)))
    .map((record) => ({
      slug: record.slug,
      role: record.role ?? "",
      date: formatDate(record.date),
      caption: String(record.caption ?? "").trim(),
      sourceUrl: `/api/consultant/source/npa/${record.slug}?format=md`,
      wordUrl: (record.files ?? []).some((file) => /\.doc$/i.test(file))
        ? `/api/consultant/source/npa/${record.slug}?format=doc&download=1`
        : "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  const chunks =
    (chunksBySlug.get(slug) ?? 0) +
    (act.id === "pp-1875" ? chunksBySlug.get("pp-1875") ?? 0 : 0);

  let status = "available";
  let note = "";
  if (!active) {
    status = "missing-card";
    note = "Официальной карточки на pravo.gov.ru нет: акт не загружен и не может цитироваться как первоисточник.";
  } else if (active.role === "future") {
    status = "future";
    note = "Будущая редакция: в поиск консультанта не попадает.";
  } else if (active.role === "archive") {
    status = "archive";
    note = "Архивная редакция: в ответах по умолчанию не используется.";
  } else if (!formats.has(".md")) {
    status = "no-text";
    note = "Файл для просмотра отсутствует.";
  } else if (act.id === "pp-1875") {
    note = "Правила индексируются из csms-api по точным кодам ОКПД2; локальный текст доступен для просмотра.";
  }

  items.push({
    id: act.id,
    slug,
    shortName: active?.shortName || card?.shortName || act.short || act.id,
    title,
    subject,
    kind: act.kind || "НПА",
    number: String(act.number ?? ""),
    year: String(act.year ?? ""),
    relevantFrom: act.relevantFrom ?? "",
    role: active?.role ?? "",
    date: formatDate(active?.date ?? card?.date),
    redid: active?.redid ?? null,
    actId: active?.actId ?? act.id,
    cardUrl: active?.cardUrl || card?.cardUrl || "",
    publicationUrl: active?.publicationUrl || "",
    formats: [...formats],
    editions,
    chunks,
    status,
    note,
    // Просмотр открывает тот же документ, что и цитата консультанта: параметр
    // doc — полный URL локального источника, его проверяет isLocalSource().
    viewerUrl: sourceUrl
      ? `/consultant?${new URLSearchParams({ doc: sourceUrl, title }).toString()}`
      : "",
    sourceUrl,
    wordUrl: slug && formats.has(".doc")
      ? `/api/consultant/source/npa/${slug}?format=doc&download=1`
      : "",
  });
}

items.sort((a, b) => {
  const byKind = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
  if (byKind !== 0) return byKind;
  return Number(a.number || 9999) - Number(b.number || 9999) || a.title.localeCompare(b.title, "ru");
});

const report = {
  builtAt: new Date().toISOString(),
  total: items.length,
  available: items.filter((item) => item.status === "available").length,
  missingCard: items.filter((item) => item.status === "missing-card").length,
  archive: items.filter((item) => item.status === "archive").length,
  future: items.filter((item) => item.status === "future").length,
  indexedChunks: index.chunks?.length ?? 0,
  kinds: KIND_ORDER.filter((kind) => items.some((item) => item.kind === kind)),
  items,
};

const outFile = path.join(ROOT, "public/npa-library.json");
await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(
  `НПА в каталоге: ${report.total}, доступно: ${report.available}, ` +
    `без карточки: ${report.missingCard}, архив: ${report.archive} → ${path.relative(ROOT, outFile)}\n`,
);
