/**
 * Сборка локального снимка требований из полного текста технических документов.
 *
 * Источник текста — HTML-страницы allgosts.ru, выгруженные в браузере через
 * scripts/browser/export-article.js в docs/snapshots/gost/fulltext/*.html|txt
 * (скриптовый fetch упирается в капчу, браузер — нет). Каждое требование
 * сохраняется только с дословной цитатой из текста стандарта.
 *
 * Запуск: node scripts/build-gost-requirements.mjs [--out public/gost/requirements.json]
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractTechnicalRequirements,
  parseTechnicalDocument,
} from "./lib/tech-doc.mjs";
import { designationOf } from "./lib/allgosts.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEXT_DIR = path.join(ROOT, "docs/snapshots/gost/fulltext");
const DEFAULT_OUT = path.join(ROOT, "public/gost/requirements.json");
const SOURCES_FILE = path.join(TEXT_DIR, "sources.json");

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};

const resolveFromRoot = (value) =>
  path.isAbsolute(value) ? value : path.join(ROOT, value);

const outFile = resolveFromRoot(arg("--out", DEFAULT_OUT));
const sources = JSON.parse(await fs.readFile(SOURCES_FILE, "utf8"));

// Группируем по основанию имени: *.html предпочтительнее *.txt, так как в
// разметке сохраняются заголовки разделов и структура требований.
const names = new Map();
for (const file of (await fs.readdir(TEXT_DIR)).sort()) {
  const match = /\.(html|txt)$/i.exec(file);
  if (!match) continue;
  const base = file.slice(0, -match[0].length);
  const current = names.get(base) ?? {};
  if (!current[match[1].toLowerCase()]) current[match[1].toLowerCase()] = file;
  names.set(base, current);
}

const items = [];
for (const [base, files] of names) {
  const preferred = files.html ?? files.txt;
  const content = await fs.readFile(path.join(TEXT_DIR, preferred), "utf8");
  const designationFromFile = `ГОСТ ${base.replace(/^gost-/i, "")}`;
  const parsed = parseTechnicalDocument(content, {
    designation: designationFromFile,
    sourceUrl:
      sources[designationFromFile] ??
      sources[parsedDesignation(content, designationFromFile)] ??
      "",
  });
  const requirements = extractTechnicalRequirements(parsed);
  items.push({
    designation: parsed.designation || designationFromFile,
    sourceUrl: parsed.sourceUrl,
    source: parsed.source,
    snapshotFile: preferred,
    textChars: parsed.text.length,
    textSha256: createHash("sha256").update(parsed.text).digest("hex"),
    requirements,
  });
  console.log(`${preferred}: ${requirements.length} требований`);
}

/** Обозначение из текста нужно узнать до вызова основного парсера. */
function parsedDesignation(content, fallback) {
  if (/<article[\s>]/i.test(content)) {
    const title = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(content)?.[1] ?? "";
    return designationOf(title) || fallback;
  }
  return (
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^ГОСТ(?: Р)?\s/.test(line)) ?? fallback
  );
}

const payload = JSON.stringify(items);
const hash = createHash("sha256").update(payload).digest("hex").slice(0, 12);
const version = `gost-req-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${hash}`;
const catalog = {
  version,
  generatedAt: new Date().toISOString(),
  source: "https://allgosts.ru",
  itemCount: items.length,
  items,
};

await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, JSON.stringify(catalog, null, 2) + "\n", "utf8");
console.log(`Снимок: ${outFile}, версия ${version}`);
