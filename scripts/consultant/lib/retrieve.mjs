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
  // Морфология частых вопросов: «деньги/возвращаются/сроки» ↔ norm-текст.
  деньги: ["денежные", "средства"],
  возвращаются: ["возврат", "возврата"],
  сроки: ["срок", "срока", "сроков"],
  качестве: ["качество"],
  обеспечения: ["обеспечение"],
  обязательства: ["обязательств"],
};

/** Каждое слово вопроса — группа синонимов; покрытие считается по группам. */
function tokenGroups(text) {
  const words = String(text ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^a-zа-я0-9]+/u)
    // Номера статей и частей («ст. 34», «ч. 27») тоже несут смысл для поиска.
    .filter(
      (word) =>
        ((word.length >= 3 || /^\d{1,3}$/.test(word)) && !STOP_WORDS.has(word)) ||
        KEEP_SHORT.has(word),
    );
  return words.map((word) => [word, ...(EXPAND[word] ?? [])]);
}

export function tokenize(text) {
  return tokenGroups(text).flat();
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

const LEGAL_HINTS = [
  /оплат|оплач|платеж|платёж/i,
  /смп|сонко|субподряд|соисполнител|малого предпринимательства|социально ориентированн/i,
  /контракт|договор|закупк|заказчик|поставщик|подрядчик|исполнитель|44-фз/i,
  /штраф|пен[ия]|неустойк|обеспечени/i,
  /приемк|приёмк|акт/i,
];

function isLegalQuestion(question) {
  return LEGAL_HINTS.filter((re) => re.test(question)).length >= 2;
}

function sourcePriority(source) {
  if (source === "npa" || source === "norm" || source === "qa" || source === "pp1875-exact") return 0.08;
  if (source === "pp1875") return 0.05;
  if (source === "csms-doc") return -0.03;
  if (source === "csms-notes" || source === "xsd") return -0.08;
  return 0;
}

function paymentSmpBoost(chunk, question) {
  const text = `${chunk.title} ${chunk.text}`.toLowerCase();
  const q = question.toLowerCase();
  const asksPayment = /оплат|оплач|платеж|платёж/.test(q);
  const asksSmp = /смп|сонко|субподряд|соисполнител|малого предпринимательства|социально ориентированн/.test(q);
  const asksTreasury = /казначейск|казначейств|сопровожден/.test(q);
  let boost = 0;
  if (asksPayment) {
    if (/срок оплаты/.test(text)) boost += 0.14;
    if (/не более .*рабочих дней/.test(text) && /оплат/.test(text)) boost += 0.12;
    if (/статья 34|ст\.?\s*34/i.test(text) && /оплат/.test(text)) boost += 0.12;
    if (/13\.1/.test(text) && /оплат/.test(text)) boost += 0.12;
    if (/статья 30/.test(text) && asksSmp) boost += 0.1;
    if (/1466/.test(chunk.title)) boost += 0.12;
    if (/типовые условия контрактов/.test(text) && asksSmp) boost += 0.08;
    if (/оплачивать поставленные субподрядчиком/.test(text)) boost += 0.14;
  }
  if (asksTreasury) {
    if (/казначейск/.test(text) && /сопровожден/.test(text)) boost += 0.22;
    if (/казначейск/.test(text) && /срок оплат/.test(text)) boost += 0.2;
    if (/не более десяти рабочих дней/.test(text) && /казначейск/.test(text)) boost += 0.22;
    if (/статья 34/.test(text) && /казначейск/.test(text)) boost += 0.12;
    if (/13\.1/.test(text) && /казначейск/.test(text)) boost += 0.12;
    if (/жилищн|пен[ия]|неустойк|коап|гк рф, ч|земельн/.test(text) && !/44-фз|контракт/.test(text)) boost -= 0.18;
  }
  if (asksSmp && /субъектов малого предпринимательства|социально ориентированных некоммерческих/.test(text)) boost += 0.05;
  if (chunk.source === "npa" && !/архивная/.test(chunk.title)) boost += 0.03;
  if (/архивная/.test(chunk.title)) boost -= 0.08;
  if (/360-фз|223-фз|44-фз.*архивная/.test(chunk.title.toLowerCase()) && asksPayment) boost -= 0.06;
  return boost;
}

/**
 * Архивная редакция задачи только в манифесте загрузки (`meta.role`) и в
 * заголовке чанка. Проверяем оба варианта: старые индексы могли сохраниться
 * без meta, но пометка «архивная» в title есть всегда.
 */
export function isArchiveChunk(chunk) {
  return (
    chunk?.meta?.role === "archive" ||
    /архивн/i.test(String(chunk?.title ?? ""))
  );
}

/**
 * Пользователь прямо спрашивает о прошлом состоянии нормы. Без явной даты или
 * слов про архив отвечаем только по действующей редакции; дата в вопросе
 * допускает архив, но только если она уже прошла (будущая дата — условие
 * вступления нормы, а не запрос старой редакции).
 */
export function asksPastEdition(question) {
  const q = String(question ?? "").toLowerCase();
  if (/архивн|историческ|ранее действовав|действовавш|в редакции от|по состоянию на|на дату|утративш/.test(q)) {
    return true;
  }
  const now = new Date();
  for (const [, day, month, year] of q.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)) {
    if (new Date(Number(year), Number(month) - 1, Number(day)) < now) return true;
  }
  for (const [, year] of q.matchAll(/\b(\d{4})\s*год/g)) {
    if (Number(year) < now.getFullYear()) return true;
  }
  return false;
}

/** Гибрид: векторная близость плюс небольшой вес за совпадение слов. */
export function retrieve(index, question, cfg, options = {}) {
  const queryVector = index.queryVector;
  const queryGroups = tokenGroups(question);
  const pastEditionRequested = asksPastEdition(question);
  // По умолчанию архивные редакции не участвуют в поиске вообще: раньше они
  // лишь штрафовались весом и иногда попадали в контекст вместо текущей нормы.
  let candidates = typeof options.filter === "function"
    ? index.chunks.filter(options.filter)
    : index.chunks;
  let excludedArchive = 0;
  if (!pastEditionRequested) {
    const before = candidates.length;
    candidates = candidates.filter((chunk) => !isArchiveChunk(chunk));
    excludedArchive = before - candidates.length;
  }
  const articleRefs = [
    ...question.matchAll(/(?:ст\.?|статья|статьи|статью|статьёй)\s*(\d{1,3})/gi),
  ].map((match) => match[1]);
  const qLower = String(question ?? "").toLowerCase();
  const treasuryIntent =
    /оплат|оплач|платеж|платёж/.test(qLower) &&
    /казначейск|казначейств|сопровожден/.test(qLower);
  const legalQuestion = isLegalQuestion(question) || treasuryIntent;
  const scored = candidates.map((chunk) => {
    const vectorScore = cosine(queryVector, chunk.embedding);
    const textTokens = new Set(tokenize(`${chunk.title} ${chunk.text}`));
    let matches = 0;
    for (const group of queryGroups) {
      if (group.some((token) => textTokens.has(token))) matches += 1;
    }
    const lexical = queryGroups.length ? matches / queryGroups.length : 0;
    // Упоминание номера статьи в тексте другой статьи — не ответ; нужен заголовок.
    const titleBonus = articleRefs.some((ref) =>
      new RegExp(`(?:^|[^\\d])${ref}(?![\\d])`).test(chunk.title),
    )
      ? 0.06
      : 0;
    const priority = legalQuestion ? sourcePriority(chunk.source) : 0;
    const boost = legalQuestion ? paymentSmpBoost(chunk, question) : 0;
    return {
      chunk,
      score: vectorScore + 0.12 * lexical + titleBonus + priority + boost,
      vectorScore,
      lexical,
    };
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
    meta: item.chunk.meta ?? {},
  }));

  const exactFragments = exact.map((item) => {
    const type =
      { include: "разрешён", exclude: "запрещён", conditional: "условный" }[
        item.rule.type
      ] ?? item.rule.type;
    const externalUrl = "http://publication.pravo.gov.ru/document/0001202412250018";
    return {
      title: `ПП РФ № 1875 - точное правило для ${item.code}`,
      ref: "Позиционный раздел",
      url: externalUrl,
      text: [
        `Код ОКПД2 ${item.code}: ${type}.`,
        item.rule.condition ? `Условие: ${item.rule.condition}` : "",
        `Статус правила: ${item.rule.status}.`,
      ]
        .filter(Boolean)
        .join("\n"),
      score: 1,
      source: "pp1875-exact",
      meta: { externalUrl },
    };
  });

  // Точное правило ставим первым. Для правовых вопросов при наличии NPA/norm
  // не даём рабочим заметкам доминировать в контексте.
  const hasNormative = vectorFragments.some((f) => ["npa", "norm", "qa", "pp1875"].includes(f.source));
  const filteredVector = legalQuestion && hasNormative
    ? vectorFragments.filter((f) => !["csms-notes", "csms-doc", "xsd"].includes(f.source) || f.score >= 0.95)
    : vectorFragments;
  const fragments = [...exactFragments, ...filteredVector].map((fragment, i) => ({
    ...fragment,
    n: i + 1,
  }));

  // nomic-embed-text даёт высокую косинусную близость даже нерелевантным
  // вопросам, поэтому порог дополняем lexical-покрытием: хоть одно слово
  // вопроса должно встречаться в найденном фрагменте.
  const topGrounding = Math.max(0, ...picked.map((item) => item.lexical));
  // Слабое ранжирование — сигнал качества, но не основание отказа: если
  // нормативный фрагмент найден, его нужно отдать с цитатой, а не писать,
  // что документ не изучали. Отказ только при полном отсутствии норм.
  const rankingWeak =
    !exact.length &&
    ((filteredVector[0]?.score ?? 0) < (cfg.minScore ?? 0.34) || topGrounding < 0.2);
  const grounded = fragments.some((fragment) =>
    ["npa", "norm", "qa", "pp1875", "pp1875-exact"].includes(fragment.source),
  );
  return {
    fragments,
    confidence: fragments.length ? Math.max(...fragments.map((item) => item.score)) : 0,
    refusal: !fragments.length || !grounded,
    rankingWeak,
    exactCodes: exact.map((item) => item.code),
    legalQuestion,
    pastEditionRequested,
    excludedArchive,
  };
}
