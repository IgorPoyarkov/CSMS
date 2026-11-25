import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import express from "express";
import { z } from "zod";
import { ROOT } from "./lib/knowledge.mjs";
import { embedTexts } from "./lib/embed.mjs";
import { retrieve } from "./lib/retrieve.mjs";
import {
  isFz44Chunk,
  referentialTargets,
  stageForQuestion,
  targetFilter,
} from "./lib/dialog.mjs";

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

function isPaymentSmpQuestion(question) {
  const q = String(question).toLowerCase();
  const pay = /оплат|срок\s+оплат|платеж|платёж/.test(q);
  const smp = /смп|сонко|субподряд|соисполнител|малого предпринимательства|социально ориентированн/.test(q);
  return pay && smp;
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
      "Если прямой нормы для конкретного случая во фрагментах нет, не подставляй похожую норму другого случая. Прямо напиши, что прямого ответа в загруженных редакциях нет, и назови ближайшую найденную норму.",
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

    if (!stage && found.refusal) {
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
    if (found.legalQuestion && !found.exactCodes.length && !hasNormativeFragments(found)) {
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

      const structured = isPaymentSmpQuestion(question) ? buildPaymentSmpAnswer(found) : null;
      if (structured) {
        return res.json({
          ...structured,
          tools: [],
          confidence: Number(found.confidence.toFixed(3)),
          refusal: false,
          stage: "fz44",
          ...(followUp ? { followUp } : {}),
          model: cfg.chatModel,
          ...editionFields(found),
          latencyMs: Date.now() - started,
        });
      }
      // Структурированные ответы уже содержат нужные нормы — вопрос не нужен.
      if (externalOnlyResponse) return res.json(externalOnlyResponse);
    }

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
      .map(({ n, title, ref, url, text, score, source }) => ({
        n,
        title,
        ref,
        url,
        quote: text.slice(0, 420),
        score: Number(score.toFixed(3)),
        source,
      }));
    const hasNormativeAvailable = hasNormativeFragments(found);
    const substantive = cyr >= 80 && lat <= cyr;
    if (found.legalQuestion && hasUngroundedExpiry) {
      return res.json(refusalResponse(found, started, "Ответ содержит не подтверждённое утверждение о сроке действия нормы."));
    }
    if (found.legalQuestion && (!substantive || (!citedNormative && !hasNormativeAvailable))) {
      return res.json(refusalResponse(found, started, "Ответ не подтверждён нормативными цитатами или нарушает формат."));
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
