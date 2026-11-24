import { cosine } from "./embed.mjs";

const STOP_WORDS = new Set([
  "как", "что", "это", "для", "при", "или", "если", "него", "нее", "его", "ее", "был", "была",
  "быть", "может", "можно", "нужно", "должен", "должна", "почему", "какой", "какая", "какие",
  "вопрос", "ответ", "статья", "часть", "пункт", "мне", "вам", "там", "тут", "уже", "еще",
]);

// Короткие аббревиатуры — ключевые слова домена, их нельзя отбрасывать.
const KEEP_SHORT = new Set([
  "эп", "эцп", "укэп", "мчд", "нмцк", "пг", "ооз", "сз", "кс", "еис",
  "окпд2", "ктру", "смп", "сонко", "фз", "рф", "гк", "коап",
]);

// Раскрываем аббревиатуры: в заметках автора может быть «ЭП», а в норме —
// «электронная подпись», и lexical-покрытие должно их связать.
const EXPAND = {
  эп: ["электронная", "подпись"],
  эцп: ["электронная", "подпись"],
  укэп: ["усиленная", "квалифицированная", "подпись"],
  мчд: ["машиночитаемая", "доверенность"],
  нмцк: ["начальная", "максимальная", "цена", "контракта"],
  ооз: ["описание", "объекта", "закупки"],
  сз: ["служебная", "записка"],
  кс: ["контрактная", "служба"],
  еис: ["единая", "информационная", "система"],
  смп: ["малые", "средние", "предприятия"],
  сонко: ["социально", "ориентированные", "некоммерческие", "организации"],
};

export function tokenize(text) {
  const words = String(text ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^a-zа-я0-9]+/u)
    .filter((word) => (word.length >= 3 || KEEP_SHORT.has(word)) && !STOP_WORDS.has(word));
  return words.flatMap((word) => [word, ...(EXPAND[word] ?? [])]);
}

/** Код ОКПД2 в вопросе: минимум три группы (01.13.32), максимум пять. */
export function findOkpd2Codes(text) {
  // Меньше трёх групп давало бы ложные совпадения с датами вида 23.12.2024.
  const found = String(text ?? "").match(/\b\d{2}(?:\.\d{1,3}){2,4}\b/g) ?? [];
  return [...new Set(found)];
}

function lookupForCode(lookup, code) {
  if (lookup[code]) return { code, ...lookup[code] };
  const parts = code.split(".");
  while (parts.length > 1) {
    parts.pop();
    const parent = parts.join(".");
    if (lookup[parent]) return { code: parent, ...lookup[parent] };
  }
  return null;
}

/** Гибрид: векторная близость плюс небольшой вес за совпадение слов. */
export function retrieve(index, question, cfg) {
  const queryVector = index.queryVector;
  const queryTokens = new Set(tokenize(question));
  const scored = index.chunks.map((chunk) => {
    const vectorScore = cosine(queryVector, chunk.embedding);
    const textTokens = tokenize(`${chunk.title} ${chunk.text}`);
    let matches = 0;
    for (const token of queryTokens) if (textTokens.includes(token)) matches += 1;
    const lexical = queryTokens.size ? matches / queryTokens.size : 0;
    return { chunk, score: vectorScore + 0.08 * lexical, vectorScore, lexical };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = [];
  const seen = new Set();
  for (const item of scored) {
    const key = `${item.chunk.title}|${item.chunk.text.slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(item);
    if (picked.length >= (cfg.topK ?? 6)) break;
  }

  // Точное правило по коду ОКПД2 важнее векторной догадки — добавляем отдельным источником.
  const exact = [];
  for (const code of findOkpd2Codes(question)) {
    const rule = lookupForCode(index.lookup ?? {}, code);
    if (rule && !exact.some((item) => item.rule.code === rule.code)) {
      exact.push({ rule, code });
    }
  }

  const vectorFragments = picked.map((item) => ({
    title: item.chunk.title,
    ref: item.chunk.ref,
    url: item.chunk.url,
    text: item.chunk.text,
    score: item.score,
    source: item.chunk.source,
  }));

  const exactFragments = exact.map((item) => {
    const type =
      { include: "разрешено", exclude: "запрещено", conditional: "условно" }[
        item.rule.type
      ] ?? item.rule.type;
    return {
      title: `ПП РФ № 1875 · точное правило для ${item.code}`,
      ref: "национальный режим",
      url: "http://publication.pravo.gov.ru/document/0001202412250018",
      text: [
        `Код ОКПД2 ${item.code}: ${type}.`,
        item.rule.condition ? `Условие: ${item.rule.condition}` : "",
        `Статус правила: ${item.rule.status}.`,
      ]
        .filter(Boolean)
        .join("\n"),
      score: 1,
      source: "pp1875-exact",
    };
  });

  // Точное правило ставим первым: у модели не должно быть соблазна ответить
  // по похожему, но другому коду из векторных фрагментов.
  const fragments = [...exactFragments, ...vectorFragments].map((fragment, i) => ({
    ...fragment,
    n: i + 1,
  }));

  // nomic-embed-text даёт высокую косинусную близость даже нерелевантным
  // вопросам, поэтому порог дополняем lexical-покрытием: хоть одно слово
  // вопроса должно встречаться в найденном фрагменте.
  const topGrounding = picked[0]?.lexical ?? 0;
  return {
    fragments,
    confidence: fragments.length ? Math.max(...fragments.map((item) => item.score)) : 0,
    refusal:
      !fragments.length ||
      (!exact.length &&
        (vectorFragments[0].score < (cfg.minScore ?? 0.34) || topGrounding < 0.2)),
    exactCodes: exact.map((item) => item.code),
  };
}
