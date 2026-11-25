// Сборка датасета для LoRA-дообучения консультанта.
//
// Источник фактов — только уже одобренные Q&A и действующая редакция 44-ФЗ из
// индекса. Синтетические пары помечаются как черновик и не попадают в RAG.
// Формат JSONL: instruction/input/output — подходит для SFT в transformers/peft.

import fs from "node:fs/promises";
import path from "node:path";
import { ROOT } from "./lib/knowledge.mjs";
import { isFz44Chunk } from "./lib/dialog.mjs";
import { isArchiveChunk } from "./lib/retrieve.mjs";

const cfg = JSON.parse(
  await fs.readFile(path.join(import.meta.dirname, "sources.json"), "utf8"),
);
const indexFile = path.join(ROOT, ".tmp/consultant/index.json");
const outFile = path.join(ROOT, "docs/legal/consultant-lora-dataset.jsonl");
const reportFile = path.join(ROOT, "docs/legal/consultant-lora-dataset.report.json");

const args = new Set(process.argv.slice(2));
const maxAuto = Number(process.env.LORA_MAX_AUTO ?? 1200);
const includeAuto = !args.has("--approved-only");

const DISCLAIMER = "Справочно. Проверьте первоисточник и редакцию.";
const normRef = /(?:ст\.?|статья|статьи|статью|статьёй)\s*(\d{1,3}(?:\.\d+)?)/gi;
const articleInTitle = /(?:статья|ст\.?)\s*(\d{1,3}(?:\.\d+)?)/i;

const index = JSON.parse(await fs.readFile(indexFile, "utf8"));
// В контекст обучения берём только текст норм: QA-чанки уже содержат готовый
// ответ и не должны подсказывать модель вместо самой нормы.
const currentFz = index.chunks.filter(
  (chunk) => isFz44Chunk(chunk) && ["npa", "norm"].includes(chunk.source) && !isArchiveChunk(chunk),
);

const articleOf = (chunk) =>
  articleInTitle.exec(`${chunk.title ?? ""} ${chunk.ref ?? ""}`)?.[1] ?? null;

const tokenize = (text) =>
  String(text ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .match(/[а-за-я0-9]{3,}/g) ?? [];

function scoreChunk(chunk, refs, tokens) {
  const hay = `${chunk.title ?? ""} ${chunk.ref ?? ""} ${chunk.text ?? ""}`.toLowerCase();
  const own = articleOf(chunk);
  let score = 0;
  if (own && refs.includes(own)) score += 6;
  // Предпочитаем начало статьи, а не осколок с середины после overlap.
  if (/^\s*(?:\d+[.)]|[\d.]+\s)/.test(String(chunk.text ?? ""))) score += 0.3;
  for (const token of tokens) if (hay.includes(token)) score += 0.25;
  return score;
}

function pickContext(question, refs = []) {
  const tokens = [...new Set(tokenize(question))];
  return currentFz
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, refs, tokens) }))
    .filter((item) => item.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.chunk);
}

function fragment(chunk, n) {
  return `[${n}] [${chunk.source}] ${chunk.title}${chunk.ref ? ` — ${chunk.ref}` : ""}\n${chunk.text}`;
}

function splitFor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
  return hash % 10 === 0 ? "eval" : "train";
}

const rows = [];

// 1. Проверенные пары: ответ оставляем как есть, прикладываем действующую норму.
for (const fileRef of cfg.qaFiles ?? []) {
  const file = path.resolve(ROOT, fileRef);
  let items;
  try {
    items = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    continue;
  }
  if (!Array.isArray(items)) continue;
  for (const item of items) {
    if (item.status === "draft-for-review") continue;
    const refs = [...String(item.norm ?? "").matchAll(normRef)].map((m) => m[1]);
    const question = String(item.question ?? "");
    const contextChunks = pickContext(question, refs);
    const context = contextChunks.map((chunk, i) => fragment(chunk, i + 1)).join("\n\n");
    const cites = contextChunks.map((_, i) => `[${i + 1}]`).join(", ");
    const answer = `${String(item.answer ?? "").trim()}${cites ? ` ${cites}` : ""}\n\n${DISCLAIMER}`;
    const id = `qa:${item.id ?? `${fileRef}:${rows.length}`}`;
    rows.push({
      id,
      source: "approved-qa",
      status: item.status ?? "approved",
      module: item.module ?? "common",
      instruction: question,
      input: context ? `Нормы действующей редакции:\n${context}` : "",
      output: answer,
      citations: contextChunks.map((c) => c.title),
      split: splitFor(id),
    });
  }
}

// 2. Синтетические пары из текста действующих статей 44-ФЗ.
if (includeAuto) {
  const byArticle = new Map();
  const topicByArticle = new Map();
  for (const chunk of currentFz) {
    const article = articleOf(chunk);
    if (!article) continue;
    const title = String(chunk.title ?? "");
    const match = title.match(/^.*?статья\s*\d+(?:\.\d+)?\.?\s*(.+)$/i);
    if (match && match[1] !== "44-ФЗ" && !topicByArticle.has(article)) {
      topicByArticle.set(article, match[1].trim());
    }
    if (byArticle.has(article)) continue;
    if (String(chunk.text ?? "").length < 160) continue;
    byArticle.set(article, chunk);
  }

  for (const [article, chunk] of byArticle) {
    if (rows.length >= maxAuto + 242) break;
    const title = String(chunk.title ?? "");
    const topic = topicByArticle.get(article) ?? "";
    const sentences = String(chunk.text ?? "")
      .replace(/\s+/g, " ")
      .match(/[^.!?]+[.!?]+/g) ?? [];
    const body = sentences.slice(0, 2).join(" ").trim().slice(0, 700);
    if (body.length < 80) continue;
    const questions = [
      `Что устанавливает статья ${article} 44-ФЗ${topic ? ` («${topic}»)` : ""}?`,
    ];
    if (/обязан|должен|не вправе|устанавлива|определя|порядк/i.test(body)) {
      questions.push(`Какие требования содержит статья ${article} 44-ФЗ по теме «${topic || "применение нормы"}»?`);
    }
    for (const [i, question] of questions.entries()) {
      if (rows.length >= maxAuto + 242) break;
      const id = `norm:${article}:${i}`;
      rows.push({
        id,
        source: "current-norm",
        // Автоматически собранные пары ждут ревизии и не индексируются в RAG.
        status: "draft-for-review",
        module: "common",
        instruction: question,
        input: `Нормы действующей редакции:\n${fragment(chunk, 1)}`,
        output: `${body} [1]\n\n${DISCLAIMER}`,
        citations: [title],
        split: splitFor(id),
      });
    }
  }
}

await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(
  outFile,
  rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
  "utf8",
);

const report = {
  builtAt: new Date().toISOString(),
  total: rows.length,
  bySource: rows.reduce((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {}),
  bySplit: rows.reduce((acc, r) => {
    acc[r.split] = (acc[r.split] ?? 0) + 1;
    return acc;
  }, {}),
  withContext: rows.filter((r) => r.input).length,
  currentFzChunks: currentFz.length,
  includeAuto,
};
await fs.writeFile(reportFile, JSON.stringify(report, null, 2) + "\n", "utf8");
process.stdout.write(`Лора-датасет: ${rows.length} пар → ${path.relative(ROOT, outFile)}\n`);
process.stdout.write(JSON.stringify(report.bySource) + "\n");
