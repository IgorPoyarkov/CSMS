// Разбирает присланный текст из 200 вопросов в черновик Q&A для консультанта.
// Черновик помечается draft-for-review и в индекс не попадает до одобрения.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const IN_FILE = path.join(ROOT, "docs/legal/consultant-qa-44fz-200.source.md");
const OUT_FILE = path.join(ROOT, "docs/legal/consultant-qa-44fz-200.draft.json");

const PARTS = [
  {
    upTo: 40,
    module: "common",
    category: "Общие положения, планирование, НМЦК, требования к участникам",
  },
  {
    upTo: 80,
    module: "procurement",
    category: "Конкурентные способы, обеспечение, национальный режим",
  },
  {
    upTo: 120,
    module: "contract",
    category: "Заключение, исполнение, изменение, расторжение контракта",
  },
  {
    upTo: 160,
    module: "single-supplier",
    category: "Единственный поставщик, сопровождение, стройка, лекарства",
  },
  {
    upTo: 200,
    module: "control",
    category: "Контроль, обжалование, РНП, ответственность по КоАП РФ",
  },
];

// Места, где сверка с загруженными текстами НПА выявила расхождение или
// требует уточнения. В одобренный файл пары попадают только с правкой.
const REVIEW = {
  9: "Ч. 2 ст. 20 44-ФЗ: «составляющей два млрд рублей и более», а не «превышающей».",
  28: "Вопрос про срок гарантии, ответ — про требования к гарантии; переформулировано.",
  39: "Ст. 23 ч. 3 44-ФЗ относит структуру ИКЗ к Минфину; 36 знаков — по Приказу № 55н.",
  67: "Ч. 6 ст. 96 44-ФЗ: аванс >30% НМЦК → обеспечение в размере аванса.",
  95: "Ч. 4 ст. 94 утратила силу, ч. 4.1 даёт Правительству право определять обязательные случаи.",
  106: "Сверено с ч. 9 ст. 95 44-ФЗ; ранее одобренная пара vba-19 противоречила этой норме.",
  133: "П. 8, 8.1 ч. 1 ст. 3 и ч. 15 ст. 34 44-ФЗ: контракт письменный, «любая форма» неверна.",
  156: "ПП РФ № 1875, п. 4 «у», «ф»: правило полного цикла производства в ЕАЭС.",
  168: "Вопрос и ответ не совпадали; оставлен вопрос о сроке жалобы при заключении контракта.",
  176: "Ч. 3 ст. 104 44-ФЗ: более 25% акций/долей самостоятельно или с аффилированными лицами.",
  183: "ФЗ от 28.12.2024 № 500-ФЗ: 7.29–7.32 утратили силу, действуют 7.30.1 и 7.30.2.",
  185: "Ч. 5, 6 ст. 7.30.1 КоАП РФ: 3–10 тыс. либо 1% от 10 до 50 тыс. рублей.",
  187: "Ч. 5, 9 ст. 7.30.1 КоАП РФ: 3–10 тыс. либо 10–20 тыс. рублей.",
  188: "Ч. 11 ст. 7.30.1 КоАП РФ: от 40 до 60 тыс. рублей, а не 40–50 тыс.",
  190: "Ч. 8, 10 ст. 7.30.2 КоАП РФ: 1% от 10 до 50 тыс., повторно — дисквалификация.",
  192: "Ст. 7.32 КоАП РФ утратила силу; санкции 5–15% в текущем тексте отсутствуют.",
};

/** Вытаскиваем ссылки на нормы из текста ответа, чтобы поле norm не было пустым. */
function extractNorm(answer) {
  const found = [];
  for (const match of answer.matchAll(/\(([^)]{2,140})\)/g)) {
    const value = match[1].trim();
    if (/ст\.|№\s*\d|ПП РФ|Приказ/i.test(value)) found.push(value);
  }
  for (const match of answer.matchAll(/ст\.?\s*\d+(?:\.\d+)?[^,;.]*?(?:44-ФЗ|КоАП РФ)/g)) {
    found.push(match[0].trim());
  }
  return [...new Set(found)].slice(0, 3).join("; ") || " — ";
}

const lines = (await fs.readFile(IN_FILE, "utf8")).split(/\r?\n/);
const draft = [];
let current = null;

for (const line of lines) {
  const question = line.match(/^(\d+)\.\s+(.+)$/);
  if (question) {
    if (current) draft.push(current);
    const number = Number(question[1]);
    const part = PARTS.find((item) => number <= item.upTo) ?? PARTS.at(-1);
    current = {
      id: `44fz-${number}`,
      number,
      category: part.category,
      module: part.module,
      question: question[2].trim(),
      answer: "",
      source: "Материал пользователя: 200 вопросов-ответов по 44-ФЗ",
      norm: " — ",
      status: "draft-for-review",
      reviewNote: REVIEW[number] ?? "",
    };
    continue;
  }
  const answer = line.match(/^Ответ:\s*(.+)$/);
  if (answer && current) {
    current.answer = answer[1].trim();
    current.norm = extractNorm(current.answer);
  }
}
if (current) draft.push(current);

if (draft.length !== 200 || draft.some((item) => !item.question || !item.answer)) {
  throw new Error(`Ожидались 200 полных пар, получено: ${draft.length}`);
}

const clean = draft.map(({ number, ...item }) => item);
await fs.writeFile(OUT_FILE, `${JSON.stringify(clean, null, 2)}\n`, "utf8");
process.stdout.write(
  `Черновик: ${clean.length} пар → ${path.relative(ROOT, OUT_FILE)}\n`,
);
