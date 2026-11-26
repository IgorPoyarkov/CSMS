// Разбирает две новые подборки вопросов-ответов в черновики для консультанта.
// Статус draft-for-review: в индекс пары попадают только после одобрения.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

const SOURCES = [
  {
    inFile: "docs/legal/consultant-qa-gz-100.source.md",
    outFile: "docs/legal/consultant-qa-gz-100.draft.json",
    expected: 100,
    idPrefix: "gz",
    source: "Материал пользователя: 100 вопросов-ответов о госзакупках",
    parts: [
      {
        upTo: 10,
        module: "common",
        category: "Общие вопросы о госзакупках",
      },
      {
        upTo: 20,
        module: "registration",
        category: "Регистрация и подготовка",
      },
      {
        upTo: 50,
        module: "procurement",
        category: "Участие в закупках",
      },
      {
        upTo: 70,
        module: "contract",
        category: "Заключение и исполнение контракта",
      },
      {
        upTo: 80,
        module: "control",
        category: "Ответственность и обжалование",
      },
      {
        upTo: 100,
        module: "changes-2026",
        category: "Изменения 2026 года",
      },
    ],
  },
  {
    inFile: "docs/legal/consultant-qa-2026-07-webinar.source.md",
    outFile: "docs/legal/consultant-qa-2026-07-webinar.draft.json",
    expected: 5,
    idPrefix: "webinar",
    source: "Ответы экспертов Прогосзаказ.рф на вопросы вебинара (изменения с 01.07.2026)",
    parts: [
      {
        upTo: 5,
        module: "changes-2026",
        category: "Изменения с 1 июля 2026 года: реестр, оплата, малые закупки",
      },
    ],
  },
];

/** Вытаскиваем ссылки на нормы из текста ответа, чтобы поле norm не было пустым. */
function extractNorm(answer) {
  const found = [];
  for (const match of answer.matchAll(/\(([^)]{2,180})\)/g)) {
    const value = match[1].trim();
    if (/ст\.|№\s*\d|ПП РФ|Приказ|БК РФ/i.test(value)) found.push(value);
  }
  for (const match of answer.matchAll(
    /ст\.?\s*\d+(?:\.\d+)?[^,;.]*?(?:44-ФЗ|КоАП РФ|БК РФ)/g,
  )) {
    found.push(match[0].trim());
  }
  return [...new Set(found)].slice(0, 3).join("; ") || " — ";
}

for (const config of SOURCES) {
  const lines = (
    await fs.readFile(path.join(ROOT, config.inFile), "utf8")
  ).split(/\r?\n/);
  const draft = [];
  let current = null;

  for (const line of lines) {
    const question = line.match(/^(\d+)\.\s+(.+)$/);
    if (question) {
      if (current) draft.push(current);
      const number = Number(question[1]);
      const part =
        config.parts.find((item) => number <= item.upTo) ?? config.parts.at(-1);
      current = {
        id: `${config.idPrefix}-${number}`,
        category: part.category,
        module: part.module,
        question: question[2].trim(),
        answer: "",
        source: config.source,
        norm: " — ",
        status: "draft-for-review",
        reviewNote: "",
      };
      continue;
    }
    if (!current || line.trim().startsWith("#")) continue;
    const answer = line.match(/^Ответ:\s*(.+)$/);
    if (answer) {
      current.answer = answer[1].trim();
      continue;
    }
    // Вебинарные ответы многострочные: продолжаем абзац до следующего вопроса.
    if (current.answer && line.trim()) {
      current.answer += `\n${line.trim()}`;
    }
  }
  if (current) draft.push(current);

  if (
    draft.length !== config.expected ||
    draft.some((item) => !item.question || !item.answer)
  ) {
    throw new Error(
      `Ожидались ${config.expected} полных пар, получено ${draft.length}: ${config.inFile}`,
    );
  }
  for (const item of draft) item.norm = extractNorm(item.answer);

  const outPath = path.join(ROOT, config.outFile);
  await fs.writeFile(outPath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Черновик: ${draft.length} пар → ${path.relative(ROOT, outPath)}\n`,
  );
}
