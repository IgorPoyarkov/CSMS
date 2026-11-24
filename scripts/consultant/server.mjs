import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import express from "express";
import { z } from "zod";
import { ROOT } from "./lib/knowledge.mjs";
import { embedTexts } from "./lib/embed.mjs";
import { retrieve } from "./lib/retrieve.mjs";

const cfg = JSON.parse(
  await fs.readFile(path.join(import.meta.dirname, "sources.json"), "utf8"),
);
const outFile = path.join(ROOT, ".tmp/consultant/index.json");
const port = Number(process.env.CONSULTANT_PORT ?? 5098);

let index = null;
let building = false;

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function loadIndex() {
  try {
    index = JSON.parse(await fs.readFile(outFile, "utf8"));
    process.stdout.write(`Индекс загружен: ${index.chunks.length} фрагментов\n`);
  } catch {
    index = null;
  }
}

function runIngest(force) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(import.meta.dirname, "ingest.mjs"),
      ...(force ? ["--force"] : []),
    ], { cwd: ROOT, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ingest завершился с кодом ${code}`)),
    );
  });
}

async function ensureIndex() {
  if (index || building) return;
  building = true;
  try {
    if (!(await exists(outFile))) await runIngest(false);
    await loadIndex();
  } catch (error) {
    process.stderr.write(`Ошибка индексации: ${error.message}\n`);
  } finally {
    building = false;
  }
}

const askSchema = z.object({
  question: z.string().min(2).max(4000),
  module: z.string().max(80).optional(),
  entityId: z.string().max(120).optional(),
  ruleId: z.string().max(160).optional(),
  sessionId: z.string().max(80).optional(),
});

const DISCLAIMER = "Справочно. Проверьте первоисточник и редакцию.";

function buildPrompt(fragments, question, context) {
  const sources = fragments
    .map(
      (item) =>
        `[${item.n}] ${item.title}${item.ref ? ` · ${item.ref}` : ""}\n${item.text}`,
    )
    .join("\n\n");
  return {
    system: [
      "Ты справочный консультант CSMS по 44-ФЗ. Отвечай только на русском языке.",
      "Используй ТОЛЬКО приведённые фрагменты. Не добавляй знаний извне и не выдумывай нормы, даты и редакции.",
      "Каждое утверждение подтверждай ссылкой [номер] на фрагмент. Если фрагменты противоречат друг другу — скажи об этом.",
      "Не давай юридического заключения. Не называй конкретные сроки, проценты и коды ОКПД2, которых нет во фрагментах.",
      "Если фрагмент помечен как «точное правило» для кода ОКПД2 из вопроса, он главнее остальных: отвечай только по нему и не подменяй код другим кодом из соседних фрагментов.",
      "Ответ — до 1500 знаков, по делу, без вступления и без повтора вопроса. В конце всегда добавь фразу: «Справочно. Проверьте первоисточник и редакцию».",
    ].join(" "),
    user: [
      `Контекст экрана: ${context || "не указан"}.`,
      `Вопрос: ${question}`,
      "",
      "Фрагменты источников:",
      sources,
    ].join("\n"),
  };
}

/** DeepSeek отдаёт <think>...</think> — рассуждения убираем из ответа пользователю. */
function cleanAnswer(text) {
  return String(text ?? "")
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<think>[\s\S]*$/g, "")
    .replace(/<｜end▁of▁sentence｜>/g, "")
    .trim();
}

async function generate(prompt) {
  const response = await fetch(
    `${cfg.ollama ?? "http://localhost:11434"}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: cfg.chatModel ?? "deepseek-r1:7b",
        stream: false,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        options: { temperature: 0.2, num_ctx: 8192 },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Ollama ${response.status}: ${(await response.text()).slice(0, 400)}`);
  }
  const body = await response.json();
  return cleanAnswer(body.message?.content ?? "");
}

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "64kb" }));

app.get("/api/consultant/status", async (_req, res) => {
  await ensureIndex();
  res.json({
    ready: Boolean(index),
    building,
    chunks: index?.chunks.length ?? 0,
    builtAt: index?.builtAt ?? null,
    embedModel: cfg.embedModel,
    chatModel: cfg.chatModel,
    stats: index?.stats ?? null,
  });
});

app.post("/api/consultant/ask", async (req, res) => {
  await ensureIndex();
  if (!index) {
    return res.status(503).json({ error: "Индекс ещё строится, попробуйте позже" });
  }
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Некорректный вопрос", details: parsed.error.issues });
  }
  const started = Date.now();
  const { question, module, ruleId, entityId } = parsed.data;
  try {
    const [queryVector] = await embedTexts([question], cfg, 1);
    const found = retrieve({ ...index, queryVector }, question, cfg);
    if (found.refusal) {
      return res.json({
        answer:
          "В имеющихся редакциях ответа нет. Уточните вопрос, укажите статью или модуль CSMS. " +
          DISCLAIMER,
        citations: [],
        tools: found.exactCodes.length ? ["ПП 1875: точная проверка кода ОКПД2"] : [],
        confidence: Number(found.confidence.toFixed(3)),
        refusal: true,
        model: cfg.chatModel,
        latencyMs: Date.now() - started,
      });
    }

    const context = [module ? `модуль ${module}` : "", ruleId ? `правило ${ruleId}` : "", entityId ? `объект ${entityId}` : ""]
      .filter(Boolean)
      .join(", ");
    const answer = await generate(buildPrompt(found.fragments, question, context));
    const used = new Set(
      [...answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])),
    );
    const citations = found.fragments
      .filter((item) => !used.size || used.has(item.n))
      .map(({ n, title, ref, url, text, score, source }) => ({
        n,
        title,
        ref,
        url,
        quote: text.slice(0, 420),
        score: Number(score.toFixed(3)),
        source,
      }));

    res.json({
      answer: answer || `Ответ не получен. ${DISCLAIMER}`,
      citations,
      tools: found.exactCodes.length ? ["ПП 1875: точная проверка кода ОКПД2"] : [],
      confidence: Number(found.confidence.toFixed(3)),
      refusal: false,
      model: cfg.chatModel,
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    process.stderr.write(`Ошибка ответа: ${error.stack ?? error.message}\n`);
    res.status(502).json({ error: error.message });
  }
});

app.post("/api/consultant/reindex", async (_req, res) => {
  if (building) return res.status(409).json({ error: "Переиндексация уже идёт" });
  building = true;
  try {
    await runIngest(true);
    await loadIndex();
    res.json({ ok: true, chunks: index?.chunks.length ?? 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    building = false;
  }
});

app.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Консультант CSMS: http://127.0.0.1:${port}\n`);
  ensureIndex();
});
