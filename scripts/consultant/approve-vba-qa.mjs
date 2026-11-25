// Готовит рабочий Q&A из ревизованного черновика: помечает пары как подтверждённые
// и убирает из них только те формулировки, которые ревизор признал ошибочными.
// Черновик не меняется — его по-прежнему можно пересобрать из VBA.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const IN_FILE = path.join(ROOT, "docs/legal/consultant-vba-qa.draft.json");
const OUT_FILE = path.join(ROOT, "docs/legal/consultant-qa-vba.json");

// Ревизор: право одностороннего отказа по ГК действует по умолчанию, если
// соглашением не установлено иное; 44-ФЗ закрепляет его и за заказчиком, и за
// подрядчиком (ст. 95 ч. 8, 9). Старый ответ «если право было предусмотрено
// контрактом» не согласован с этой нормой — исправляем и здесь, и в генераторе.
const FIXES = {
  "vba-19": {
    answer: `Да. По ГК РФ право одностороннего отказа по основаниям, предусмотренным для отдельных видов обязательств, действует по умолчанию, если иное не установлено соглашением. Федеральный закон № 44-ФЗ прямо закрепляет такое право и за заказчика, и за подрядчика (исполнителя) с соблюдением порядка ст. 95: уведомление, десять дней, внесение сведений в ЕИС.`,
    norm: `ГК РФ; 44-ФЗ, ст. 95 ч. 8, 9`,
  },
  // Ч. 27 ст. 95 в черновике — опечатка: сроки возврата обеспечения стоят
  // в ч. 27 ст. 34 (там же их цитирует загруженный текст 44-ФЗ).
  "vba-50": {
    norm: `44-ФЗ, ст. 34 ч. 27; ст. 30 ч. 3; ст. 96 ч. 7.2`,
  },
};

const draft = JSON.parse(await fs.readFile(IN_FILE, "utf8"));
if (!Array.isArray(draft) || draft.length === 0) {
  throw new Error(`Пустой или некорректный черновик: ${IN_FILE}`);
}

const ids = new Set();
const pairs = draft.map((item) => {
  if (!item.question || !item.answer) {
    throw new Error(`Пара без вопроса или ответа: ${item.id ?? "без id"}`);
  }
  if (ids.has(item.id)) throw new Error(`Повторный id: ${item.id}`);
  ids.add(item.id);

  const { review, ...rest } = item;
  return {
    ...rest,
    ...(FIXES[item.id] ?? {}),
    reviewNote: review ?? "",
    status: "approved",
  };
});

await fs.writeFile(OUT_FILE, `${JSON.stringify(pairs, null, 2)}\n`, "utf8");
process.stdout.write(
  `Подтверждено пар: ${pairs.length} → ${path.relative(ROOT, OUT_FILE)}\n`,
);
