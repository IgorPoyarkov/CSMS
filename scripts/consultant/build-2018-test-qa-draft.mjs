// Разбирает приложенный PDF с правильными ответами на тест заказчиков 2018 года.
// Все пары остаются в черновике: это архивная редакция, в индекс не попадает.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const IN_FILE = path.join(ROOT, "docs/legal/consultant-qa-2018-test.source.md");
const OUT_FILE = path.join(ROOT, "docs/legal/consultant-qa-2018-test.draft.json");

function extractNorm(text) {
  const found = [];
  for (const match of text.matchAll(/(Федеральный закон|постановление Правительства|приказ)[^,;.]{0,90}? №\s*\d+/gi)) {
    found.push(match[0].trim());
  }
  for (const match of text.matchAll(/статей?\s*\d+(?:\.\d+)?[^,;.]{0,60}?44-ФЗ/gi)) {
    found.push(match[0].trim());
  }
  return [...new Set(found)].slice(0, 3).join("; ") || " — ";
}

const lines = (await fs.readFile(IN_FILE, "utf8")).split(/\r?\n/);
const draft = [];
let current = null;
let inAnswer = false;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("_ARCHIVE")) continue;
  if (/^Вопрос(?:\s|\.|:|$)/i.test(trimmed)) {
    if (current) draft.push(current);
    inAnswer = false;
    current = {
      id: `test2018-${draft.length + 1}`,
      category: "Архив: тест заказчиков по 44-ФЗ (2018 год)",
      module: "archive",
      question: trimmed.replace(/^Вопрос\s*(?:\d+\.?\s*)?[.:-]?\s*/i, "").trim(),
      answer: "",
      source: "Правильные ответы на вопросы теста по итогам тестирования заказчиков в 2018 году (PDF)",
      norm: " — ",
      status: "draft-for-review",
      reviewNote:
        "Архивная редакция 2018 года: часть норм и формулировок утратила силу. В индекс консультанта не включать без сверки с действующим правом.",
    };
    continue;
  }
  if (!current) continue;
  const answer = trimmed.match(/^Ответ[.:]?\s*(.*)$/i);
  if (answer) {
    inAnswer = true;
    if (answer[1]) current.answer += `${answer[1]} `;
    continue;
  }
  // Вопросы в PDF тоже многострочные — собираем их до строки «Ответ».
  if (!inAnswer) current.question += ` ${trimmed}`;
  else current.answer += `${trimmed} `;
}
if (current) draft.push(current);

for (const item of draft) {
  item.question = item.question.replace(/\s+/g, " ").trim();
  item.answer = item.answer.replace(/\s+/g, " ").trim();
  item.norm = extractNorm(item.answer);
}
if (draft.length < 40 || draft.some((item) => !item.question || !item.answer)) {
  throw new Error(`Ожидались полные пары архивного теста, получено: ${draft.length}`);
}

await fs.writeFile(OUT_FILE, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
process.stdout.write(
  `Черновик архивного теста: ${draft.length} пар → ${path.relative(ROOT, OUT_FILE)}\n`,
);
