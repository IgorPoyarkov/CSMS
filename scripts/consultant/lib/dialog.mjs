// Диалог консультанта: сначала ищем норму в 44-ФЗ, затем по согласию
// пользователя раскрываем отсылочную норму или расширяем поиск.

/** Норма 44-ФЗ — текст закона, снимок статьи или проверенный Q&A со ссылкой на него. */
export function isFz44Chunk(chunk) {
  const meta = chunk?.meta ?? {};
  if (chunk?.source === "norm") return meta.act === "fz44";
  if (chunk?.source === "qa") return /44-фз/i.test(String(chunk.ref ?? ""));
  if (chunk?.source === "npa") {
    return (
      meta.shortName === "44-ФЗ" ||
      String(meta.slug ?? "").startsWith("fz-44") ||
      /^44-ФЗ/.test(String(chunk?.title ?? ""))
    );
  }
  return false;
}

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function articleFromTitle(title) {
  const text = String(title ?? "");
  const match =
    text.match(/Статья\s+(\d{1,3}(?:\.\d+)?)/i) ??
    text.match(/\bст\.?\s*(\d{1,3}(?:\.\d+)?)/i);
  return match?.[1] ?? null;
}

/**
 * Ссылки на другие нормы внутри найденной статьи. Возвращаем готовые строки
 * для уточняющего вопроса: пользователь выбирает, какую норму раскрыть.
 */
export function extractNormRefs(text, ownArticle = null) {
  const refs = [];
  const add = (label, target, key) => {
    if (!key || key === `fz44:${ownArticle}`) return;
    if (refs.some((item) => item.key === key)) return;
    refs.push({ label, target, key, question: `Подробно: ${label}` });
  };

  for (const match of String(text ?? "").matchAll(
    /стат(?:ья|ьи|ью|ей|я)\s*(\d{1,3}(?:\.\d+)?)/gi,
  )) {
    add(`статья ${match[1]} 44-ФЗ`, { kind: "fz44", article: match[1] }, `fz44:${match[1]}`);
  }
  for (const match of String(text ?? "").matchAll(/\bст\.?\s*(\d{1,3}(?:\.\d+)?)/gi)) {
    add(`статья ${match[1]} 44-ФЗ`, { kind: "fz44", article: match[1] }, `fz44:${match[1]}`);
  }
  for (const match of String(text ?? "").matchAll(
    /постановлением\s+Правительства[^.]*?№\s*(\d+)/gi,
  )) {
    add(`ПП РФ № ${match[1]}`, { kind: "pp", number: match[1] }, `pp:${match[1]}`);
  }
  for (const match of String(text ?? "").matchAll(
    /\bПП\s+РФ\s*№\s*(\d+)/gi,
  )) {
    add(`ПП РФ № ${match[1]}`, { kind: "pp", number: match[1] }, `pp:${match[1]}`);
  }
  for (const match of String(text ?? "").matchAll(/приказом[^.]*?№\s*(\d+)/gi)) {
    add(`приказ № ${match[1]}`, { kind: "order", number: match[1] }, `order:${match[1]}`);
  }
  return refs.slice(0, 3);
}

/**
 * Статья есть, но суть вопроса вынесена в другую норму.
 * Внутренние отсылки (другие статьи 44-ФЗ) раскрываем сразу в одном ответе;
 * вопрос пользователю задаём только по внешним актам (ПП РФ, приказы).
 */
export function referentialTargets(fragment) {
  const text = String(fragment?.text ?? "");
  if (!/(порядок|правила|перечень|состав|структура|методика|требования|размер|условия)/i.test(text)) {
    return { internal: [], external: [] };
  }
  if (!/(определя|устанавлива|утвержда|регулиру)/i.test(text)) {
    return { internal: [], external: [] };
  }
  const ownArticle = articleFromTitle(`${fragment?.title ?? ""} ${fragment?.ref ?? ""}`);
  const refs = extractNormRefs(text, ownArticle);
  return {
    internal: refs.filter((item) => item.target.kind === "fz44"),
    external: refs.filter((item) => item.target.kind !== "fz44"),
  };
}

/** Разбираем ответ пользователя на уточняющий вопрос. */
export function targetFromText(text) {
  const value = String(text ?? "").trim();
  const article = value.match(/(?:статья|ст\.?)\s*(\d{1,3}(?:\.\d+)?)/i);
  if (article) {
    return {
      label: `статья ${article[1]} 44-ФЗ`,
      question: `Подробно: статья ${article[1]} 44-ФЗ`,
      target: { kind: "fz44", article: article[1] },
    };
  }
  const pp = value.match(/(?:ПП РФ|постановление Правительства)[^.]*?№\s*(\d+)/i);
  if (pp) {
    return {
      label: `ПП РФ № ${pp[1]}`,
      question: `Подробно: ПП РФ № ${pp[1]}`,
      target: { kind: "pp", number: pp[1] },
    };
  }
  const order = value.match(/приказ[^.]*?№\s*(\d+)/i);
  if (order) {
    return {
      label: `приказ № ${order[1]}`,
      question: `Подробно: приказ № ${order[1]}`,
      target: { kind: "order", number: order[1] },
    };
  }
  return null;
}

export function isConsent(question) {
  // Кириллица не является «словом» для \b без флага u, поэтому используем
  // проверку границы через Unicode-свойства.
  return /^(да(?!\p{L})|давайте|ага|ок(?!\p{L})|окей|конечно|согласен|хочу|посмотри|покажи|ищи|продолж|дальше|ну да|подробнее)/iu
    .test(String(question ?? "").trim());
}

/**
 * Что делать с репликой пользователя после уточняющего вопроса.
 * `Подробно: ...` и `Продолжить поиск: ...` работают и без состояния сессии —
 * в них уже вшит контекст, поэтому их можно использовать как кнопки.
 */
export function stageForQuestion(question, pending) {
  const value = String(question ?? "").trim();
  const widen = value.match(/^Продолжить поиск:\s*(.+)$/i);
  if (widen) return { kind: "widen", question: widen[1].trim() };

  const details = value.match(/^Подробно:\s*(.+)$/i);
  if (details) {
    const parsed = targetFromText(details[1]);
    if (parsed) return { kind: "target", ...parsed };
  }

  if (pending?.kind === "widen" && isConsent(value)) {
    return { kind: "widen", question: pending.question };
  }
  if (pending?.kind === "norm" && isConsent(value)) {
    const chosen = targetFromText(value);
    const target = chosen
      ? pending.targets.find((item) => item.key === chosen.target.kind + ":" + (chosen.target.article ?? chosen.target.number))
      : null;
    return { kind: "target", ...(target ?? pending.targets[0]) };
  }
  return null;
}

/** Фильтр чанков для выбранной нормы: только она, в действующей редакции. */
export function targetFilter(target) {
  if (target?.kind === "fz44") {
    const pattern = new RegExp(`(?:^|[^\\d])${escapeRegExp(target.article)}(?![\\d])`);
    return (chunk) => isFz44Chunk(chunk) && pattern.test(`${chunk.title ?? ""} ${chunk.ref ?? ""}`);
  }
  const number = String(target?.number ?? "");
  return (chunk) => {
    if (!["npa", "norm", "pp1875", "pp1875-exact"].includes(chunk?.source)) return false;
    return String(`${chunk.title ?? ""} ${chunk.ref ?? ""} ${chunk.text ?? ""}`).includes(`№ ${number}`);
  };
}
