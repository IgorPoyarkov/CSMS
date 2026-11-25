import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

// Корень репозитория относительно scripts/consultant/lib.
export const ROOT = path.resolve(import.meta.dirname, "../../..");

const hash = (value) =>
  createHash("sha1").update(value).digest("hex").slice(0, 16);

/** Режем длинный текст на куски с перекрытием, чтобы цитата не теряла контекст. */
export function splitText(text, maxChars = 1100, overlap = 120) {
  const clean = String(text ?? "").replace(/\r/g, "").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const result = [];
  const words = clean.split(/\s+/);
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) result.push(current);
    const tail = current.slice(-overlap);
    current = word.length > maxChars ? word.slice(0, maxChars) : `${tail} ${word}`.trim();
  }
  if (current) result.push(current);
  return result;
}

/** Markdown режем по заголовкам: в заголовке куска остаётся номер раздела. */
export function splitDocument(text, fileName, maxChars = 1100) {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");
  const chunks = [];
  let header = "";
  let buffer = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (!body) return;
    const title = header ? `${fileName} · ${header}` : fileName;
    for (const part of splitText(body, maxChars)) {
      chunks.push({ title, text: part, ref: header, url: null });
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = line.match(/^\s*#{1,4}\s+(.+?)\s*$/);
    if (match) {
      flush();
      header = match[1].replace(/\*/g, "").trim();
      continue;
    }
    buffer.push(line);
    if (buffer.join("\n").length > maxChars * 2) flush();
  }
  flush();
  return chunks;
}

const makeChunk = (source, chunk) => ({
  id: hash(`${source}|${chunk.title}|${chunk.ref}|${chunk.text}`),
  source,
  title: chunk.title,
  ref: chunk.ref ?? "",
  url: chunk.url ?? null,
  text: chunk.text,
  meta: chunk.meta ?? {},
});

/** Статьи 44-ФЗ и ГК из зафиксированного снимка КонсультантПлюс. */
async function collectSnapshot(cfg) {
  const chunks = [];
  const file = path.join(ROOT, "docs/snapshots/civil-code-snapshot.json");
  const snapshot = JSON.parse(await fs.readFile(file, "utf8"));
  for (const [actKey, act] of Object.entries(snapshot.acts ?? {})) {
    const actName = actKey === "fz44" ? "44-ФЗ" : actKey === "gk1" || actKey === "gk2" ? "ГК РФ" : actKey;
    for (const [articleNo, article] of Object.entries(act.articles ?? {})) {
      for (const part of splitText(article.text, cfg.maxChunkChars, cfg.chunkOverlap)) {
        chunks.push(
          makeChunk("norm", {
            title: `${actName}, ст. ${articleNo}`,
            ref: `ст. ${articleNo}`,
            url: article.url ?? act.documentUrl,
            text: part,
            meta: { act: actKey, article: articleNo, textSha256: article.textSha256 },
          }),
        );
      }
    }
  }
  return chunks;
}

/** Правила национального режима ПП РФ № 1875 из активной версии csms-api. */
async function collectPp1875(cfg) {
  const chunks = [];
  const lookup = {};
  const base = cfg.apiBase ?? "http://localhost:5099";
  const meta = await fetch(`${base}/api/npa/documents/pp-1875`).then((r) => r.json());
  const groups = new Map();

  for (let skip = 0; skip < 20000; skip += 2000) {
    const rows = await fetch(
      `${base}/api/npa/documents/pp-1875/rules?take=2000&skip=${skip}`,
    ).then((r) => r.json());
    for (const row of rows) {
      const code = row.okpd2Code;
      if (code) {
        lookup[code] = {
          type: row.ruleType,
          condition: row.conditionText ?? null,
          status: row.status,
          inheritedFrom: row.inheritedFrom ?? null,
        };
      }
      const key = `${row.ruleType}|${row.conditionText ?? ""}|${row.quote ?? ""}`;
      if (!groups.has(key)) groups.set(key, { ...row, codes: [] });
      if (code && groups.get(key).codes.length < 24) groups.get(key).codes.push(code);
    }
    if (rows.length < 2000) break;
  }

  for (const rule of groups.values()) {
    const type =
      { include: "разрешено", exclude: "запрещено", conditional: "условно" }[
        rule.ruleType
      ] ?? rule.ruleType;
    const codes = rule.codes.join(", ");
    const text = [
      `Постановление Правительства РФ от 23.12.2024 № 1875 (национальный режим).`,
      `Версия: ${meta.version ?? "неизвестна"}.`,
      `Коды ОКПД2: ${codes || "не указаны"}.`,
      `Тип правила: ${type}.`,
      rule.conditionText ? `Условие: ${rule.conditionText}.` : "",
      rule.quote ? `Фрагмент текста постановления: ${rule.quote}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    chunks.push(
      makeChunk("pp1875", {
        title: `ПП РФ № 1875 · ${rule.ruleType} · ${codes.slice(0, 60)}`,
        ref: rule.ruleType,
        url: `http://publication.pravo.gov.ru/document/${meta.eoNumber ?? ""}`,
        text,
        meta: {
          codes: rule.codes,
          ruleType: rule.ruleType,
          version: meta.version ?? null,
          sourcePage: rule.sourcePage ?? null,
        },
      }),
    );
  }
  return { chunks, lookup };
}

async function walkXsd(directory, files = [], depth = 0) {
  if (depth > 6) return files;
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", ".tmp", ".next", "bin", "obj"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkXsd(full, files, depth + 1);
    else if (entry.name.toLowerCase().endsWith(".xsd")) files.push(full);
  }
  return files;
}

/** XSD ЕИС: только схемы из контура закупок, чтобы не раздувать индекс. */
async function collectXsd(cfg) {
  const chunks = [];
  const files = [];
  for (const dir of cfg.xsdDirs ?? []) await walkXsd(path.resolve(ROOT, dir), files);
  // Схемы ЕИС называются по подсистемам (IntegrationTypes, fcsExport, docs-ws-api),
  // поэтому фильтруем по расширению, а не по ключевым словам в имени.
  const interesting = files.sort((a, b) =>
    path.basename(a).localeCompare(path.basename(b)),
  );

  for (const file of interesting) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const text = await fs.readFile(file, "utf8");
    for (const part of splitText(text, 1600, 160)) {
      chunks.push(
        makeChunk("xsd", {
          title: `XSD ЕИС · ${path.basename(file)}`,
          ref: rel,
          url: null,
          text: part,
          meta: { file: rel },
        }),
      );
      if (chunks.length >= (cfg.maxXsdChunks ?? 250)) return chunks;
    }
  }
  return chunks;
}

/** Документация CSMS — то, что объясняет бизнес-правила системы. */
async function collectDocs(cfg) {
  const chunks = [];
  for (const rel of cfg.docFiles ?? []) {
    const file = path.resolve(ROOT, rel);
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    const capped = text.slice(0, cfg.maxDocChars ?? 260000);
    for (const part of splitDocument(capped, rel, cfg.maxChunkChars)) {
      chunks.push(
        makeChunk("csms-doc", {
          title: part.title,
          ref: part.ref,
          url: null,
          text: part.text,
          meta: { file: rel },
        }),
      );
    }
  }
  return chunks;
}

/** Убираем статусные эмодзи и технический мусор, оставляя слова пометок. */
function cleanNotes(text) {
  return String(text ?? "")
    .replace(/\r/g, "")
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(/<!--[^>]*-->/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** WorkPlan размечен комментариями <!-- N -->, CurrentTasks — заголовками. */
function noteBlocks(text, file) {
  const source = text.replace(/\r/g, "");
  if (/WorkPlan\.md$/i.test(file)) {
    const parts = source.split(/<!--\s*(\d+)\s*-->/);
    const blocks = [];
    for (let i = 1; i < parts.length; i += 2) {
      blocks.push({ header: `блок ${parts[i]}`, body: parts[i + 1] ?? "" });
    }
    return blocks;
  }

  const blocks = [];
  let header = "заметки";
  let buffer = [];
  const flush = () => {
    if (buffer.join("\n").trim()) blocks.push({ header, body: buffer.join("\n") });
    buffer = [];
  };
  for (const line of source.split("\n")) {
    const match = line.match(/^\s*-?\s*#{1,4}\s+(.+?)\s*$/);
    if (match) {
      flush();
      const title = cleanNotes(match[1]).replace(/\*/g, "");
      header = title.length > 100 ? `${title.slice(0, 100).trimEnd()}…` : title;
      continue;
    }
    buffer.push(line);
  }
  flush();
  return blocks;
}

/** Рабочие заметки автора: не нормы, поэтому индексируются отдельным source. */
async function collectWorkingNotes(cfg) {
  const chunks = [];
  for (const rel of cfg.noteFiles ?? []) {
    const file = path.resolve(ROOT, rel);
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const block of noteBlocks(text, rel)) {
      const clean = cleanNotes(block.body);
      if (clean.length < 40) continue;
      for (const part of splitText(clean, cfg.maxChunkChars, cfg.chunkOverlap)) {
        chunks.push(
          makeChunk("csms-notes", {
            title: `${rel} · ${block.header}`,
            ref: block.header,
            url: null,
            text: part,
            meta: { file: rel, kind: "working-notes" },
          }),
        );
      }
    }
  }
  return chunks;
}

/**
 * Официальные тексты НПА, скачанные с pravo.gov.ru (`fetch-pravo.mjs sync`).
 * В индекс попадают только фактически скачанные редакции: будущие excluded,
 * архивные помечаются в заголовке, чтобы консультант не выдавал их за действующие.
 */
async function collectPravoNpa(cfg) {
  const chunks = [];
  const manifestFile = path.join(import.meta.dirname, "../pravo-sources.json");
  const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  const statusFile = path.join(ROOT, manifest.outputDir ?? ".tmp/pravo-downloads", "downloaded.json");
  const status = JSON.parse(
    (await fs.readFile(statusFile, "utf8").catch(() => null)) ?? "{}",
  );

  for (const [slug, info] of Object.entries(status)) {
    if (info.role === "future") continue;
    const rel = (info.files ?? []).find((file) => file.endsWith(".md"));
    if (!rel) continue;
    let text;
    try {
      text = await fs.readFile(path.join(ROOT, rel), "utf8");
    } catch {
      continue;
    }
    // У постановлений нет заголовков «Статья N» — режем по нумерованным пунктам.
    if (!/^##\s*Статья\s+\d+/m.test(text)) {
      text = text.replace(/^(\d{1,3}\.\s)/gm, "## $1");
    }
    const name = `${info.shortName ?? info.act ?? slug} · ред. ${info.date ?? "?"}${
      info.role === "archive" ? " (архивная)" : ""
    }`;
    for (const part of splitDocument(text, name, cfg.maxChunkChars)) {
      chunks.push(
        makeChunk("npa", {
          title: part.title,
          ref: part.ref,
          // Локальная ссылка на скачанный файл; внешний источник остаётся в meta.
          url: `/api/consultant/source/npa/${slug}?format=md`,
          text: part.text,
          meta: {
            actId: info.actId,
            shortName: info.shortName ?? null,
            date: info.date ?? null,
            role: info.role ?? null,
            redid: info.redid ?? null,
            slug,
            externalUrl: info.cardUrl ?? info.publicationUrl ?? null,
            localFile: rel,
          },
        }),
      );
    }
  }
  return chunks;
}

/** Свои вопросы-ответы: формат [{ question, answer, module, norm, url }]. */
export async function collectQa(cfg) {
  // qaFile оставлен для совместимости со старыми конфигурациями.
  const files = Array.isArray(cfg.qaFiles)
    ? cfg.qaFiles
    : cfg.qaFile
      ? [cfg.qaFile]
      : [];
  const chunks = [];
  for (const fileRef of files) {
    const file = path.resolve(ROOT, fileRef);
    let items;
    try {
      items = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      continue;
    }
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      // Черновики ждут ревизии: в ответы консультанта они попадать не должны.
      if (item.status === "draft-for-review") continue;
      chunks.push(
        makeChunk("qa", {
          title: `Вопрос-ответ · ${item.module ?? "общее"}`,
          ref: item.norm ?? "",
          url: item.url ?? null,
          text: `Вопрос: ${item.question}\nОтвет: ${item.answer}${item.norm ? `\nНорма: ${item.norm}` : ""}`,
          meta: { module: item.module ?? null, question: item.question },
        }),
      );
    }
  }
  return chunks;
}

export async function collectSources(cfg) {
  // csms-api может быть не поднят: тогда теряем только точные коды ОКПД2 из БД,
  // но сам текст ПП № 1875 уже есть среди скачанных НПА. Индекс собираем дальше.
  const pp1875 = await collectPp1875(cfg).catch((error) => {
    process.stderr.write(`Правила ПП № 1875 из csms-api недоступны: ${error.message}\n`);
    return { chunks: [], lookup: {} };
  });
  const [snapshot, npa, xsd, docs, notes, qa] = await Promise.all([
    collectSnapshot(cfg),
    collectPravoNpa(cfg),
    collectXsd(cfg),
    collectDocs(cfg),
    collectWorkingNotes(cfg),
    collectQa(cfg),
  ]);
  return {
    chunks: [...snapshot, ...npa, ...pp1875.chunks, ...xsd, ...docs, ...notes, ...qa],
    lookup: pp1875.lookup,
  };
}
