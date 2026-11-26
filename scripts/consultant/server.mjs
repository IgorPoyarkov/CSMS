import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import express from "express";
import { z } from "zod";
import { ROOT } from "./lib/knowledge.mjs";
import { embedTexts } from "./lib/embed.mjs";
import { retrieve, isArchiveChunk } from "./lib/retrieve.mjs";
import {
  isFz44Chunk,
  referentialTargets,
  stageForQuestion,
  targetFilter,
} from "./lib/dialog.mjs";

const PRAVO_STATUS_FILE = path.join(ROOT, ".tmp/pravo-downloads/downloaded.json");
const PRAVO_DIR = path.join(ROOT, ".tmp/pravo-downloads");
const NPA_EXT = { md: ".md", txt: ".txt", doc: ".doc" };

async function readPravoStatus() {
  try {
    return JSON.parse(await fs.readFile(PRAVO_STATUS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function safePravoFile(relPath) {
  if (typeof relPath !== "string" || !relPath) return null;
  const abs = path.resolve(ROOT, relPath);
  const rel = path.relative(PRAVO_DIR, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return abs;
}

function pickNpaFile(info, format) {
  const ext = NPA_EXT[format];
  const files = Array.isArray(info?.files) ? info.files : [];
  return files.find((f) => typeof f === "string" && f.toLowerCase().endsWith(ext)) ?? null;
}

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
const NORMATIVE_SOURCES = new Set(["npa", "norm", "qa", "pp1875", "pp1875-exact"]);

// Уточняющие вопросы живут только в памяти процесса и истекают через 30 минут.
// sessionId приходит с экрана; без него используем адрес клиента (локальный сервис).
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000;
const sessionKey = (req, sessionId) => sessionId || req.ip || "default";

function getPending(key) {
  const state = sessions.get(key);
  if (!state) return null;
  if (Date.now() - state.at > SESSION_TTL_MS) {
    sessions.delete(key);
    return null;
  }
  return state.pending;
}

function setPending(key, pending) {
  sessions.set(key, { pending, at: Date.now() });
}

function clearPending(key) {
  sessions.delete(key);
}

const editionFields = (found) => ({
  edition: found?.pastEditionRequested ? "historical" : "current-only",
  archiveChunksSkipped: found?.excludedArchive ?? 0,
});

function citeFromFragment(fragment) {
  return {
    n: fragment.n,
    title: fragment.title,
    ref: fragment.ref,
    url: fragment.url,
    externalUrl: fragment.meta?.externalUrl ?? null,
    quote: String(fragment.text ?? "").slice(0, 420),
    score: Number((fragment.score ?? 0).toFixed(3)),
    source: fragment.source,
  };
}

/** Отсылка внутри 44-ФЗ: дописываем статью в контекст, ответ остаётся одним. */
async function expandInternalRefs(found, refs, index, cfg) {
  const fragments = [...found.fragments];
  const seen = new Set(fragments.map((f) => `${f.title}|${f.text.slice(0, 60)}`));
  for (const ref of refs) {
    const text = `статья ${ref.target.article} 44-ФЗ`;
    const [vector] = await embedTexts([text], cfg, 1);
    const extra = retrieve({ ...index, queryVector: vector }, text, cfg, {
      filter: targetFilter(ref.target),
    });
    for (const fragment of extra.fragments.slice(0, 2)) {
      const key = `${fragment.title}|${fragment.text.slice(0, 60)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fragments.push({ ...fragment, n: fragments.length + 1 });
    }
  }
  return { ...found, fragments };
}

function refusalResponse(found, started, reason) {
  const detail = reason ? ` ${reason}` : "";
  const citations = (found.fragments || [])
    .filter((f) => NORMATIVE_SOURCES.has(f.source))
    .slice(0, 6)
    .map(({ n, title, ref, url, text, score, source }) => ({
      n, title, ref, url,
      quote: text.slice(0, 420),
      score: Number(score.toFixed(3)),
      source,
    }));
  return {
    answer:
      "В загруженных редакциях прямого однозначного ответа по заданной формулировке не подтверждено. Уточните субъект и отношение (заказчик-поставщик/подрядчик-субподрядчик СМП/СОНКО)." +
      detail +
      " Ближайшие нормы см. в цитатах. " +
      DISCLAIMER,
    citations,
    tools: found.exactCodes.length ? ["ПП 1875: точная проверка кода ОКПД2"] : [],
    confidence: Number(found.confidence.toFixed(3)),
    refusal: true,
    model: cfg.chatModel,
    ...editionFields(found),
    latencyMs: Date.now() - started,
  };
}

function hasNormativeFragments(found) {
  return found.fragments.some((f) => NORMATIVE_SOURCES.has(f.source));
}

/**
 * Если модель отказалась или дала слишком короткий ответ, а норма уже найдена,
 * отдаём сами фрагменты: пользователь видит текст нормы с цитатами, а не
 * сообщение о том, что документ будто бы не изучался. Ничего не выдумываем.
 */
function citationAnswer(found) {
  const top = found.fragments
    .filter((fragment) => NORMATIVE_SOURCES.has(fragment.source))
    .slice(0, 4);
  if (!top.length) return null;
  return {
    answer:
      top
        .map(
          (fragment, index) =>
            `[${index + 1}] ${fragment.title}${fragment.ref ? ` · ${fragment.ref}` : ""}: ` +
            String(fragment.text).slice(0, 320),
        )
        .join("\n\n") +
      `\n\n${DISCLAIMER}`,
    citations: top.map((fragment, index) => ({
      ...citeFromFragment(fragment),
      n: index + 1,
    })),
    refusal: false,
  };
}

function respondWithCitations(res, found, started, stage, followUp) {
  const direct = citationAnswer(found);
  if (!direct) return false;
  res.json({
    ...direct,
    tools: found.exactCodes.length ? ["ПП 1875: точная проверка кода ОКПД2"] : [],
    confidence: Number(found.confidence.toFixed(3)),
    refusal: false,
    stage: stage?.kind ?? "fz44",
    ...(followUp ? { followUp } : {}),
    model: cfg.chatModel,
    ...editionFields(found),
    latencyMs: Date.now() - started,
  });
  return true;
}

function isPaymentSmpQuestion(question) {
  const q = String(question).toLowerCase();
  const pay = /оплат|оплач|платеж|платёж/.test(q);
  const smp = /смп|сонко|субподряд|соисполнител|малого предпринимательства|социально ориентированн/.test(q);
  return pay && smp;
}

function isTreasuryPaymentQuestion(question) {
  const q = String(question).toLowerCase();
  return /оплат|оплач|платеж|платёж/.test(q) && /казначейск|казначейств|сопровожден/.test(q);
}

function findTreasuryPaymentChunks(index, allowArchive = false) {
  const chunks = Array.isArray(index?.chunks) ? index.chunks : [];
  const scored = [];
  for (const c of chunks) {
    // Как и в основном поиске: архивная редакция не должна попадать в ответ,
    // если пользователь прямо не спросил про прошлое состояние нормы.
    if (!allowArchive && isArchiveChunk(c)) continue;
    if (!NORMATIVE_SOURCES.has(c.source)) continue;
    const text = String(c.text || "");
    const title = String(c.title || "");
    const hay = (title + "\n" + text).toLowerCase();
    if (!/казначейск/.test(hay) || !/оплат/.test(hay)) continue;
    let s = 0;
    if (/ст\.?\s*34|статья\s*34|ч\.?\s*13\.1|части\s*13\.1/i.test(hay)) s += 4;
    if (/не более десяти рабочих дней/.test(hay)) s += 5;
    if (/казначейскому сопровождению/.test(hay)) s += 3;
    if (/документа о приемке/.test(hay)) s += 1;
    if (/44-фз/.test(hay)) s += 2;
    if (/2026-10-01|актуальн/.test(hay)) s += 2;
    if (/архивная/.test(hay)) s -= 4;
    if (s >= 7) scored.push({ c, s });
  }
  scored.sort((a,b)=>b.s-a.s);
  return scored.slice(0,3).map((x,i)=>({
    n: 900+i, title: x.c.title, ref: x.c.ref, url: x.c.url, text: x.c.text,
    score: 0.99, source: x.c.source, meta: x.c.meta || {}
  }));
}

function buildTreasuryPaymentAnswer(found, index) {
  const txt = (f) => String(f.title||"") + " " + String(f.ref||"") + " " + String(f.text||"");
  let st34General = pickCitation(found, (f) =>
    /ст\.?\s*34|статья\s*34/i.test(txt(f)) &&
    /не более (семи|15|пятнадцати) рабочих дней/i.test(txt(f)) &&
    /дат[ыа] подписания заказчиком документа о приемке/i.test(txt(f))
  );
  let st34Treasury = pickCitation(found, (f) =>
    /ст\.?\s*34|статья\s*34/i.test(txt(f)) &&
    /казначейск/i.test(txt(f)) &&
    /не более десяти рабочих дней/i.test(txt(f)) &&
    /оплат/i.test(txt(f))
  );
  const extra = findTreasuryPaymentChunks(index, found.pastEditionRequested);
  if (!st34Treasury) st34Treasury = extra.find((f)=>/не более десяти рабочих дней/i.test(String(f.text||"")) && /казначейск/i.test(String(f.text||""))) || null;
  if (!st34General) st34General = extra.find((f)=>/не более (семи|15|пятнадцати) рабочих дней/i.test(String(f.text||"")) && /дат[ыа] подписания заказчиком документа о приемке/i.test(String(f.text||""))) || st34Treasury || null;
  if (!st34Treasury && !st34General) return null;
  const cites = [st34General, st34Treasury].filter((c,i,a)=>c && a.findIndex(x=>String(x.title)===String(c.title) && String(x.ref)===String(c.ref) && String(x.text).slice(0,80)===String(c.text).slice(0,80))===i);
  const byId = new Map(cites.map((c,i)=>[c,i+1]));
  const ref = (c) => c && byId.has(c) ? `[${byId.get(c)}]` : "";
  const parts = [];
  parts.push("При казначейском сопровождении срок оплаты по контракту 44-ФЗ определяется ч. 13.1 ст. 34 44-ФЗ.");
  if (st34General) {
    parts.push(`Общее правило: срок оплаты поставленного товара, выполненной работы (ее результатов), оказанной услуги, отдельных этапов исполнения контракта должен составлять не более 15 рабочих дней, а с 1 июля 2022 года - не более 7 рабочих дней с даты подписания заказчиком документа о приемке по ч. 7 ст. 94 44-ФЗ ${ref(st34General)}.`);
  }
  if (st34Treasury) {
    parts.push(`Исключение при казначейском сопровождении: если в соответствии с законодательством РФ расчеты по контракту или расчеты по контракту в части выплаты аванса подлежат казначейскому сопровождению, срок оплаты должен составлять не более 10 рабочих дней с даты подписания документа о приемке, предусмотренного ч. 7 ст. 94 44-ФЗ ${ref(st34Treasury)}.`);
  } else {
    parts.push("В загруженных фрагментах прямо виден общий срок по ч. 13.1 ст. 34 44-ФЗ, но пункт о казначейском сопровождении не попал в цитаты. Проверьте актуальный текст ч. 13.1 ст. 34 44-ФЗ.");
  }
  parts.push("Справочно. Проверьте первоисточник и актуальную редакцию.");
  const quoteFor = (c, wantTreasury) => {
    const text = String(c.text || "");
    if (wantTreasury) {
      const idx = text.toLowerCase().indexOf("казначейскому сопровождению");
      if (idx >= 0) {
        const start = Math.max(0, idx - 120);
        return text.slice(start, start + 420);
      }
    }
    return text.slice(0, 420);
  };
  const citations = cites.map((c,i)=>({
    n:i+1, title:c.title, ref:c.ref, url:c.url,
    externalUrl:c.meta?.externalUrl ?? null,
    quote: quoteFor(c, c === st34Treasury),
    score:Number((c.score||0).toFixed(3)), source:c.source
  }));
  return { answer: parts.join("\n\n"), citations, refusal: false };
}

function pickCitation(found, predicate) {
  return found.fragments.find((f) => NORMATIVE_SOURCES.has(f.source) && predicate(f));
}

function buildPaymentSmpAnswer(found) {
  const txt = (f) => String(f.title||"") + " " + String(f.ref||"") + " " + String(f.text||"");
  const st34 = pickCitation(found, (f) => /ст\.?\s*34|статья\s*34/i.test(txt(f)) && /срок оплаты заказчиком поставленного товара|не более (семи|пятнадцати) рабочих дней/i.test(String(f.text||"")));
  const st34Any = st34 || pickCitation(found, (f) => /ст\.?\s*34|статья\s*34/i.test(txt(f)) && /оплат/.test(String(f.text||"")));
  const st30 = pickCitation(found, (f) => /ст\.?\s*30|статья\s*30/i.test(txt(f)) && /субъектов малого предпринимательства|социально ориентированных некоммерческих/i.test(txt(f)));
  const pp1466 = pickCitation(found, (f) => /1466/.test(String(f.title||"")) && /(10 рабочих дней со дня оплаты|5 рабочих дней со дня заключения договора|субподрядчик|соисполнитель)/i.test(String(f.text||"")));
  const st34Use = st34 || st34Any;
  if (!st34Use) return null;
  const cites = [st34Use, st30, pp1466].filter(Boolean);
  const byId = new Map(cites.map((c, i) => [c.n, i + 1]));
  const ref = (c) => (c ? "[" + byId.get(c.n) + "]" : "");
  const parts = [];
  parts.push("Вопрос неоднозначный: нужно разделять оплату заказчиком по контракту и расчёты/документы по привлечению субподрядчиков-СМП/СОНКО.");
  parts.push("1. Оплата заказчиком поставщику (подрядчику, исполнителю), в том числе СМП/СОНКО: по ч. 13.1 ст. 34 44-ФЗ срок оплаты поставленного товара, выполненной работы (ее результатов), оказанной услуги, отдельных этапов исполнения контракта должен составлять не более 15 рабочих дней, а с 1 мая 2022 года — не более 7 рабочих дней с даты подписания заказчиком документа о приемке по ч. 7 ст. 94 44-ФЗ " + ref(st34Use) + ". Отдельного специального срока оплаты заказчиком именно потому, что поставщик/подрядчик является СМП/СОНКО, эта норма не устанавливает; применяются исключения, прямо перечисленные в ч. 13.1 ст. 34 " + ref(st34Use) + ".");
  if (st30) parts.push("2. Привлечение СМП/СОНКО как субподрядчиков/соисполнителей: ст. 30 44-ФЗ регулирует квоту закупок у СМП/СОНКО и условие о привлечении субподрядчиков/соисполнителей из их числа, но не устанавливает специальный срок оплаты заказчиком по контракту " + ref(st30) + ".");
  if (pp1466) parts.push("3. ПП РФ № 1466 устанавливает типовые условия о привлечении субподрядчиков/соисполнителей СМП/СОНКО, в том числе представление заказчику документов в течение 10 рабочих дней со дня оплаты поставщиком (подрядчиком, исполнителем) обязательств по договору с субподрядчиком/соисполнителем; это срок представления документов, а не срок оплаты заказчиком по контракту 44-ФЗ " + ref(pp1466) + ".");
  else parts.push("3. По оплате подрядчиком субподрядчику-СМП/СОНКО прямой нормы о том же сроке, что в ч. 13.1 ст. 34 44-ФЗ для заказчика, в найденных фрагментах нет. Нужно проверять условия контракта/договора субподряда и применимые типовые условия, включая ПП РФ № 1466.");
  parts.push("Справочно. Проверьте первоисточник и редакцию.");
  const citations = cites.map((c, i) => ({ n:i+1, title:c.title, ref:c.ref, url:c.url, quote:String(c.text||"").slice(0,420), score:Number((c.score||0).toFixed(3)), source:c.source }));
  return { answer: parts.join("\n\n"), citations, refusal: false };
}

function buildPrompt(fragments, question, context) {
  const sources = fragments
    .map(
      (item) =>
        `[${item.n}] [${item.source}] ${item.title}${item.ref ? ` — ${item.ref}` : ""}\n${item.text}`,
    )
    .join("\n\n");
  return {
    system: [
      "Ты — правовой ассистент CSMS по 44-ФЗ. Отвечай ТОЛЬКО на русском языке. Любой английский текст запрещён. Отвечай коротко и только по приведённым фрагментам.",
      "Используй ТОЛЬКО приведённые фрагменты. Не добавляй знаний извне и не выдумывай нормы, даты, редакции, сроки и проценты.",
      "Каждое юридическое утверждение подтверждай ссылкой [номер] на фрагмент с источником npa/norm/qa/pp1875. Не делай юридических выводов только из csms-notes/csms-doc/xsd.",
      "Если вопрос неоднозначный (смешаны разные субъекты/отношения: заказчик-поставщик, подрядчик-субподрядчик СМП/СОНКО, срок оплаты/срок привлечения/срок представления документов), сначала явно укажи неоднозначность и разложи ответ по случаям, опираясь только на найденные нормы.",
      "Если среди фрагментов есть норма, прямо регулирующая вопрос, отвечай по ней и обязательно цитируй её [номер]. Не пиши об отсутствии ответа, если подходящая норма перед тобой. Не подставляй норму другого случая. Только если ни один фрагмент не покрывает вопрос, скажи, что прямого ответа в загруженных редакциях нет, и процитируй ближайшую найденную норму.",
      "Фрагменты CurrentTasks.md/WorkPlan.md/csms-doc/csms-notes — рабочие заметки/описание проекта, не нормы. Они не могут быть основанием юридического ответа.",
      "По умолчанию поиск идёт только по действующей редакции 44-ФЗ: архивные фрагменты в контекст не попадают. Если пользователь прямо спросил про прошлую дату, архивный фрагмент можно использовать, но явно называй дату редакции из заголовка.",
      "Если в тексте нормы есть оговорка о сроке действия («до 1 января …», «не применяется до …», «вступает в силу с …»), соблюдай её и не применяй норму раньше указанной даты. Дату бери только из текста фрагмента, а не из заголовка.",
      "Не делай выводов о том, что норма утратила силу/действует до даты, по служебным пометкам заголовка фрагмента.",
      "Если в вопросе указан номер статьи, а во фрагменте другой номер, прямо скажи, что в загруженной редакции нумерация иная, и процитируй найденную статью; не выдавай её за запрошенную.",
      "Не давай юридического заключения. Ответ — до 1500 знаков, по делу, без вступления и без повтора вопроса. В конце всегда добавь: «Справочно. Проверьте первоисточник и редакцию».",
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
  const messages = [
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user },
  ];

  // llama.cpp отдаёт OpenAI-совместимый /v1/chat/completions; Ollama оставлен
  // как запасной путь (и используется для эмбеддингов).
  if (cfg.chatApi === "openai") {
    const base = String(cfg.chatBase ?? "http://127.0.0.1:5100/v1").replace(/\/+$/, "");
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: cfg.chatModel ?? "csms-44fz",
        messages,
        temperature: 0.2,
        max_tokens: 2048,
        stream: false,
      }),
    });
    if (!response.ok) {
      throw new Error(`llama.cpp ${response.status}: ${(await response.text()).slice(0, 400)}`);
    }
    const body = await response.json();
    // llama.cpp для DeepSeek-R1 отдаёт основную часть ответа в reasoning_content.
    const message = body.choices?.[0]?.message ?? {};
    return cleanAnswer(message.content) || cleanAnswer(message.reasoning_content) || "";
  }

  const response = await fetch(
    `${cfg.ollama ?? "http://localhost:11434"}/api/chat`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: cfg.chatModel ?? "deepseek-r1:7b",
        stream: false,
        messages,
        options: { temperature: 0.2, num_ctx: 8192 },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Ollama ${response.status}: ${(await response.text()).slice(0, 400)}`);
  }
  const body = await response.json();
  return (
    cleanAnswer(body.message?.content) ||
    cleanAnswer(body.message?.reasoning_content) ||
    ""
  );
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
    chatApi: cfg.chatApi ?? "ollama",
    stats: index?.stats ?? null,
  });
});

app.get("/api/consultant/source/npa/:slug", async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!/^[a-z0-9][a-z0-9._-]{0,200}$/i.test(slug)) {
    return res.status(400).json({ error: "Некорректный slug" });
  }
  const format = String(req.query.format || "md").toLowerCase();
  if (!NPA_EXT[format]) return res.status(400).json({ error: "Поддерживаются format=md|txt|doc" });

  const status = await readPravoStatus();
  const info = status[slug];
  if (!info) return res.status(404).json({ error: "Источник не найден" });

  const rel = pickNpaFile(info, format);
  const abs = safePravoFile(rel);
  if (!abs) return res.status(404).json({ error: "Файл не найден" });
  try {
    await fs.access(abs);
  } catch {
    return res.status(404).json({ error: "Файл не найден на диске" });
  }

  const download = String(req.query.download || "") === "1";
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, max-age=300");
  if (format === "md") res.type("text/markdown; charset=utf-8");
  else if (format === "txt") res.type("text/plain; charset=utf-8");
  else res.type("application/msword");
  res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${path.basename(abs)}"`);
  const buf = await fs.readFile(abs);
  return res.send(buf);
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
  const { question, module, ruleId, entityId, sessionId } = parsed.data;
  try {
    const key = sessionKey(req, sessionId);
    const pending = getPending(key);
    const stage = stageForQuestion(question, pending);
    let found;
    let promptQuestion = question;
    let followUp = null;
    let externalOnlyResponse = null;

    if (stage) {
      // Пользователь согласился: ищем именно выбранную норму или расширяем поиск.
      clearPending(key);
      const searchText = stage.kind === "widen"
        ? stage.question
        : `${pending?.question ?? question} подробнее ${stage.label}`;
      const [vector] = await embedTexts([searchText], cfg, 1);
      found = stage.kind === "widen"
        ? retrieve({ ...index, queryVector: vector }, searchText, cfg)
        : retrieve({ ...index, queryVector: vector }, searchText, cfg, {
            filter: targetFilter(stage.target),
          });
      promptQuestion = searchText;
    } else {
      // Первый проход всегда ищет норму в 44-ФЗ действующей редакции.
      const [queryVector] = await embedTexts([question], cfg, 1);
      found = retrieve({ ...index, queryVector }, question, cfg, {
        filter: isFz44Chunk,
      });
    }

    const _isPaySmp = isPaymentSmpQuestion(question);
    const _isTreasuryPay = !_isPaySmp && isTreasuryPaymentQuestion(question);
    // Структурированные ответы ищут норму по всему индексу. Считаем их до
    // проверки found.refusal, иначе fallback по казначейству остаётся мёртвым.
    const structured = _isPaySmp
      ? buildPaymentSmpAnswer(found)
      : _isTreasuryPay
        ? buildTreasuryPaymentAnswer(found, index)
        : null;

    if (!stage && found.refusal && !structured) {
      if (hasNormativeFragments(found)) {
        respondWithCitations(res, found, started, stage, followUp);
        return;
      }
      setPending(key, { kind: "widen", question });
      return res.json({
        answer:
          "В действующей редакции 44-ФЗ прямого ответа по такому вопросу не найдено. " +
          "Не подменяю норму похожей из другого акта. Если хотите, продолжу поиск в ПП РФ, " +
          "приказах и рабочих материалах CSMS.",
        citations: [],
        tools: [],
        confidence: Number(found.confidence.toFixed(3)),
        refusal: false,
        stage: "no-norm",
        followUp: {
          text: "Продолжить поиск в других источниках?",
          question: `Продолжить поиск: ${question}`,
        },
        model: cfg.chatModel,
        ...editionFields(found),
        latencyMs: Date.now() - started,
      });
    }
    if (found.legalQuestion && !found.exactCodes.length && !hasNormativeFragments(found) && !structured) {
      return res.json(
        refusalResponse(found, started, "Найдены только рабочие заметки/описание проекта, а не норма."),
      );
    }

    if (!stage) {
      const normFragment = found.fragments.find(
        (item) => ["npa", "norm"].includes(item.source) && isFz44Chunk(item),
      );
      if (normFragment) {
        const refs = referentialTargets(normFragment);
        // Отсылка к другой статье 44-ФЗ раскрывается сразу: ответ остаётся одним.
        if (refs.internal.length) {
          found = await expandInternalRefs(found, refs.internal, index, cfg);
        }
        // Внешний акт показываем только после согласия пользователя.
        if (refs.external.length) {
          setPending(key, { kind: "norm", targets: refs.external, question });
          const options = refs.external.map((item) => ({ label: item.label, question: item.question }));
          if (!refs.internal.length) {
            externalOnlyResponse = {
              answer:
                `В 44-ФЗ норма есть: ${normFragment.title}${normFragment.ref ? ` · ${normFragment.ref}` : ""}. ` +
                `Она отсылочная: подробности установлены в ${refs.external.map((item) => item.label).join(", ")}.`,
              citations: [citeFromFragment(normFragment)],
              tools: [],
              confidence: Number(found.confidence.toFixed(3)),
              refusal: false,
              stage: "referential",
              followUp: { text: "Хотите, чтобы я посмотрел эту норму подробнее?", options },
              model: cfg.chatModel,
              ...editionFields(found),
              latencyMs: Date.now() - started,
            };
          }
          followUp = {
            text: "В ответе есть также отсылка к другому акту. Посмотреть её подробнее?",
            options,
          };
        }
      }
    }

    if (structured) {
      return res.json({
        ...structured,
        tools: [],
        confidence: Number(found.confidence.toFixed(3)),
        refusal: false,
        stage: stage?.kind ?? "fz44",
        ...(followUp ? { followUp } : {}),
        model: cfg.chatModel,
        ...editionFields(found),
        latencyMs: Date.now() - started,
      });
    }

    // Структурированные ответы (оплата, казначейство) уже содержат нужные
    // нормы из других актов — им уточняющий вопрос не нужен.
    if (externalOnlyResponse) return res.json(externalOnlyResponse);

    const context = [module ? `модуль ${module}` : "", ruleId ? `правило ${ruleId}` : "", entityId ? `объект ${entityId}` : ""]
      .filter(Boolean)
      .join(", ");
    let answer = String(await generate(buildPrompt(found.fragments, promptQuestion, context)) || "");
    let used = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    let citedFragments = found.fragments.filter((item) => used.has(item.n));
    let citedNormative = citedFragments.some((c) => NORMATIVE_SOURCES.has(c.source));
    let cyr = (answer.match(/[А-Яа-яЁё]/g) || []).length;
    let lat = (answer.match(/[A-Za-z]/g) || []).length;
    let hasUngroundedExpiry = /действу[ею]т до|утратил[ао]? силу|устарел[ао]?/.test(String(answer).toLowerCase()) &&
      !citedFragments.some((f) => /действу[ею]т до|утратил[ао]? силу|устарел[ао]?/.test(String(f.text||"").toLowerCase()));
    if (found.legalQuestion && (!used.size || !citedNormative || lat > cyr || hasUngroundedExpiry)) {
      answer = String(await generate(buildPrompt(found.fragments, promptQuestion + "\n\nОтветь строго на русском языке и обязательно поставь ссылки [n] на нормативные фрагменты npa/norm/qa/pp1875.", context)) || "");
      used = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
      citedFragments = found.fragments.filter((item) => used.has(item.n));
      citedNormative = citedFragments.some((c) => NORMATIVE_SOURCES.has(c.source));
      cyr = (answer.match(/[А-Яа-яЁё]/g) || []).length;
      lat = (answer.match(/[A-Za-z]/g) || []).length;
      hasUngroundedExpiry = /действу[ею]т до|утратил[ао]? силу|устарел[ао]?/.test(String(answer).toLowerCase()) &&
        !citedFragments.some((f) => /действу[ею]т до|утратил[ао]? силу|устарел[ао]?/.test(String(f.text||"").toLowerCase()));
    }
    const citations = (citedFragments.length ? citedFragments : found.fragments)
      .map(({ n, title, ref, url, text, score, source, meta }) => ({
        n,
        title,
        ref,
        url,
        externalUrl: meta?.externalUrl ?? null,
        quote: text.slice(0, 420),
        score: Number(score.toFixed(3)),
        source,
      }));
    const hasNormativeAvailable = hasNormativeFragments(found);
    const substantive = cyr >= 80 && lat <= cyr;
    const modelRefusal = /прямого ответа.{0,60}нет|в загруженных редакциях.{0,60}нет|не найден[оы]|не учил|не подтверждено/i.test(answer);
    if (found.legalQuestion && (hasUngroundedExpiry || modelRefusal || !substantive || (!citedNormative && !hasNormativeAvailable))) {
      // Норма уже в контексте — отдаём её текст с цитатами, даже если модель
      // написала отказ или ответ вышел слишком коротким. Отказ остаётся только
      // когда нормативных фрагментов действительно нет.
      if (hasNormativeAvailable && respondWithCitations(res, found, started, stage, followUp)) return;
      const reason = hasUngroundedExpiry
        ? "Ответ содержит не подтверждённое утверждение о сроке действия нормы."
        : "Ответ не подтверждён нормативными цитатами или нарушает формат.";
      return res.json(refusalResponse(found, started, reason));
    }
    // Если модель дала содержательный русский ответ без маркеров [n], но у нас есть нормативные фрагменты, прикладываем их как цитаты.
    if (found.legalQuestion && !citedNormative && hasNormativeAvailable && substantive) {
      const topNorm = found.fragments.filter((c) => NORMATIVE_SOURCES.has(c.source)).slice(0, 4);
      for (const c of topNorm) { if (!citations.find((x)=>x.n===c.n)) citations.push({ n:c.n,title:c.title,ref:c.ref,url:c.url,quote:c.text.slice(0,420),score:Number(c.score.toFixed(3)),source:c.source }); }
    }

    res.json({
      answer: answer || `Ответ не получен. ${DISCLAIMER}`,
      citations,
      tools: [
        ...(found.exactCodes.length ? ["ПП 1875: точная проверка кода ОКПД2"] : []),
        ...(stage?.kind === "widen" ? ["Поиск расширен за пределы 44-ФЗ"] : []),
      ],
      confidence: Number(found.confidence.toFixed(3)),
      refusal: false,
      stage: stage?.kind ?? "fz44",
      ...(followUp ? { followUp } : {}),
      model: cfg.chatModel,
      ...editionFields(found),
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
