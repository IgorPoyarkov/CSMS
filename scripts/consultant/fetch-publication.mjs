import fs from "node:fs";
import path from "node:path";
import { createWorker } from "tesseract.js";

/**
 * Сканированные оригиналы ведомственных актов с publication.pravo.gov.ru.
 * Карточек с консолидированным текстом в actual нет, поэтому страницы
 * распознаём через tesseract.js и кладём в общий индекс как обычные .md.
 * Карточки подбираются заранее: node scripts/consultant/resolve-publication.mjs
 * и ручная проверкаезультата в .tmp/pravo-downloads/publication-map.json.
 */
const ROOT = process.cwd();
const OUT_DIR = ".tmp/pravo-downloads";
const MAP_FILE = "scripts/consultant/publication-map.json";
const STATUS_FILE = path.join(OUT_DIR, "downloaded.json");
const VIEW = "http://publication.pravo.gov.ru/Document/View/";

/** Портал иногда рвёт соединение — повторяем запрос вместе с чтением тела. */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchWithRetry(url, read, attempts = 10) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await read(response);
    } catch (error) {
      last = error;
      await delay(Math.min(1000 * attempt, 8000));
    }
  }
  throw last;
}
const fetchText = (url) => fetchWithRetry(url, (response) => response.text());
const fetchBuffer = (url) =>
  fetchWithRetry(url, async (response) => Buffer.from(await response.arrayBuffer()));

const force = process.argv.includes("--force");
const only = process.argv.find((arg) => arg.startsWith("--only="))?.slice(7)?.split(",") ?? null;

const catalog = JSON.parse(fs.readFileSync("scripts/consultant/pravo-catalog.json", "utf8"));
const actById = new Map(catalog.acts.map((act) => [act.id, act]));
const map = JSON.parse(fs.readFileSync(path.join(ROOT, MAP_FILE), "utf8"));
const status = JSON.parse(fs.readFileSync(path.join(ROOT, STATUS_FILE), "utf8"));
const targets = Object.entries(map).filter(
  ([id]) => !id.startsWith("_") && (!only || only.includes(id)),
);

let worker = null;
async function getWorker() {
  if (!worker) {
    worker = await createWorker("rus", 1, {
      logger: () => {},
      cachePath: ".tmp/ocr-tools",
    });
  }
  return worker;
}

function slugOf(id, date) {
  return `${id}-${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

for (const [id, info] of targets) {
  const act = actById.get(id);
  if (!act) throw new Error(`Нет в каталоге: ${id}`);
  const slug = slugOf(id, info.date);
  if (!force && status[slug]?.files?.length) {
    console.log(`Пропущено: ${slug} (уже скачано)`);
    continue;
  }
  const html = await fetchText(VIEW + info.eo);
  const documentId = html.match(/GetImage\?documentId=([0-9a-f-]+)/i)?.[1];
  const pages = Number(html.match(/из <b>(\d+)<\/b>/i)?.[1] ?? 1);
  if (!documentId) throw new Error(`Не найден documentId: ${info.eo}`);

  console.log(`Скачивается: ${slug} · ${pages} стр.`);
  const ocr = await getWorker();
  const texts = [];
  for (let page = 1; page <= pages; page += 1) {
    const buffer = await fetchBuffer(
      `http://publication.pravo.gov.ru/GetImage?documentId=${documentId}&pageNumber=${page}`,
    );
    const { data } = await ocr.recognize(buffer);
    texts.push(data.text.trim());
    console.log(`  стр. ${page}/${pages}`);
  }

  const dateText = `${info.date.slice(0, 4)}-${info.date.slice(4, 6)}-${info.date.slice(6, 8)}`;
  const header = [
    info.title,
    "Официальный текст (оригинал, опубликованный на publication.pravo.gov.ru)",
    `Дата публикации: ${dateText}. Распознано из скана (OCR), сверьте с первоисточником.`,
    "",
  ].join("\n");
  const text = header + texts.join("\n\n") + "\n";
  const normalized = text.replace(/^(\d{1,3}\.\s)/gm, "## $1");
  const files = [`${OUT_DIR}/${slug}.txt`, `${OUT_DIR}/${slug}.md`];
  await fs.promises.writeFile(path.join(ROOT, files[0]), text, "utf8");
  await fs.promises.writeFile(path.join(ROOT, files[1]), normalized, "utf8");

  status[slug] = {
    slug,
    role: "actual",
    act: info.title,
    hash: "",
    redid: null,
    date: info.date,
    caption: `оригинал от ${dateText}, распознан из скана`,
    actual: true,
    hasContent: false,
    cardUrl: VIEW + info.eo,
    publicationUrl: VIEW + info.eo,
    files,
    bytes: [Buffer.byteLength(text), Buffer.byteLength(normalized)],
    actId: id,
    shortName: act.short,
    source: "publication-ocr",
    eoNumber: info.eo,
    pages,
  };
  await fs.promises.writeFile(
    path.join(ROOT, STATUS_FILE),
    JSON.stringify(status, null, 2) + "\n",
    "utf8",
  );
  console.log(`Скачано: ${slug} · ${pages} стр.`);
}

await worker?.terminate();
console.log(`Статус: ${STATUS_FILE}`);
