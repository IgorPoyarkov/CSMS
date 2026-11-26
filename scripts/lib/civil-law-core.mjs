/**
 * Чистое ядро слоя «предмет/объект закупки → институт ГК РФ → условия контракта».
 *
 * Общая логика для Node-скриптов P0–P1 и конструктора проекта контракта.
 * Не использует fs/path/crypto и не читает файлы: снимок передаётся аргументом.
 * Источник текста — docs/snapshots/civil-code-snapshot.json (КонсультантПлюс).
 */
export const ACT_CODES = Object.freeze({
  GK1: "gk1",
  GK2: "gk2",
  FZ44: "fz44",
});

/** Таксономия институтов. Статьи либо подтверждены снимком, либо ждут его. */
export const CIVIL_INSTITUTES = Object.freeze({
  "goods-supply-state": {
    label: "Поставка товаров для государственных или муниципальных нужд",
    kind: "goods",
    articles: ["gk2:525", "gk2:526", "gk2:531", "gk2:532"],
    special: true,
  },
  "goods-purchase-sale": {
    label: "Купля-продажа и поставка (общие правила)",
    kind: "goods",
    articles: ["gk2:454", "gk2:455", "gk2:506"],
    special: false,
  },
  "works-contract-state": {
    label: "Подрядные работы для государственных или муниципальных нужд",
    kind: "works",
    articles: ["gk2:763", "gk2:764", "gk2:766"],
    special: true,
  },
  "works-contract": {
    label: "Подряд (общие правила)",
    kind: "works",
    articles: ["gk2:702", "gk2:703"],
    special: false,
  },
  "works-construction": {
    label: "Строительный подряд",
    kind: "works",
    articles: ["gk2:740", "gk2:743", "gk2:753", "gk2:755"],
    special: false,
  },
  "works-rnd": {
    label:
      "Научно-исследовательские, опытно-конструкторские и технологические работы",
    kind: "works",
    articles: ["gk2:769", "gk2:770", "gk2:772"],
    special: false,
  },
  "services-paid": {
    label: "Возмездное оказание услуг",
    kind: "services",
    articles: ["gk2:779", "gk2:780", "gk2:781"],
    special: false,
  },
  lease: {
    label: "Аренда",
    kind: "goods",
    articles: [],
    special: false,
    pendingArticles: ["gk2:606"],
  },
  "ip-license": {
    label: "Интеллектуальная собственность и лицензионный договор",
    kind: "services",
    articles: [],
    special: false,
    pendingArticles: ["gk4:1235", "gk4:1286"],
  },
  "utilities-supply": {
    label: "Энергоснабжение, водоснабжение и технологическое присоединение",
    kind: "services",
    articles: [],
    special: false,
    pendingArticles: ["gk2:539", "gk2:548"],
  },
});
/**
 * Матрица «ст. 34 44-ФЗ → ГК РФ». Приоритет императивных норм 44-ФЗ выше
 * диспозитивных норм ГК: если 44-ФЗ уже предписал условие, вставка ГК уступает.
 */
export const FZ44_ARTICLE34_MATRIX = Object.freeze([
  {
    topic: "Предмет, количество, объём и сроки",
    fz44: "34:1",
    gk: ["gk1:432", "gk2:455", "gk2:703", "gk2:779"],
    priority: "imperative",
  },
  {
    topic: "Цена контракта и оплата",
    fz44: "34:2",
    gk: ["gk1:424", "gk2:711", "gk2:781"],
    priority: "imperative",
  },
  {
    topic: "Ответственность за неисполнение",
    fz44: "34:4",
    gk: ["gk1:401", "gk2:521"],
    priority: "imperative",
  },
  {
    topic: "Поставка для госнужд",
    fz44: "3:8",
    gk: ["gk2:525", "gk2:526", "gk2:531", "gk2:532"],
    priority: "special",
  },
  {
    topic: "Подрядные работы для госнужд",
    fz44: "3:8",
    gk: ["gk2:763", "gk2:764", "gk2:766"],
    priority: "special",
  },
  {
    topic: "Приёмка и качество результата",
    fz44: "34:1",
    gk: ["gk2:720", "gk2:721", "gk2:753", "gk2:754"],
    priority: "dispositive",
  },
]);
/** Возвращает текст статьи по ссылке вида `gk2:702`. */
export function articleText(snapshot, reference) {
  const [act, number] = String(reference).split(":");
  return snapshot?.acts?.[act]?.articles?.[number]?.text ?? null;
}

/**
 * Оговорки, которые делают норму диспозитивной: даже если в ней есть «должен»
 * или «не допускается», стороны вправе установить иное. Возвращаем сами
 * формулировки, чтобы их можно было показать как доказательство в выводе.
 */
const DISPOSITIVE_QUALIFIERS = Object.freeze([
  /если иное не предусмотрено[^.]{0,160}/gi,
  /если договором не предусмотрено[^.]{0,160}/gi,
  /по соглашению сторон[^.]{0,160}/gi,
  /допускается иное[^.]{0,160}/gi,
  /иное может быть предусмотрено[^.]{0,160}/gi,
  /не применяется, если[^.]{0,160}/gi,
]);

/** Находит в тексте статьи оговорки «может быть иначе», без выдуманных формулировок. */
export function findNormQualifiers(text) {
  const source = String(text ?? "");
  const haystack = source.toLowerCase().replace(/ё/g, "е");
  const found = new Map();
  for (const pattern of DISPOSITIVE_QUALIFIERS) {
    for (const match of haystack.matchAll(pattern)) {
      const value = source
        .slice(match.index, match.index + match[0].length)
        .trim();
      found.set(value.toLowerCase().replace(/\s+/g, " "), value);
    }
  }
  return [...found.values()];
}

/**
 * Эвристика характера нормы по её тексту. Не заменяет юридическую экспертизу:
 * «если иное не предусмотрено договором» = диспозитивная норма.
 */
export function classifyNormKind(text) {
  if (findNormQualifiers(text).length) {
    return "dispositive";
  }
  if (/не допускается|обязан|должен|не вправе/i.test(text)) {
    return "imperative";
  }
  return "definitional";
}

const normal = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim();

// JS не считает кириллицу «словом» для \b, поэтому границы задаём через
// Unicode-классы: иначе «Работы по поставке телевизора» не распознаётся вовсе.
const word = (source) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${source}(?![\\p{L}\\p{N}])`, "gu");

const RAW_PATTERNS = Object.freeze({
  works: [
    "работ[ауы]?",
    "выполнение работ",
    "ремонт[\\p{L}\\p{N}]*",
    "реконструкц[\\p{L}\\p{N}]*",
    "строительств[\\p{L}\\p{N}]*",
    "монтаж[\\p{L}\\p{N}]*",
    "демонтаж[\\p{L}\\p{N}]*",
    "установк[\\p{L}\\p{N}]*",
    "пусконалад[\\p{L}\\p{N}]*",
    "изыскани[\\p{L}\\p{N}]*",
    "проектирован[\\p{L}\\p{N}]*",
  ],
  services: [
    "услуг[\\p{L}\\p{N}]*",
    "обслуживани[\\p{L}\\p{N}]*",
    "сопровождени[\\p{L}\\p{N}]*",
    "обучен[\\p{L}\\p{N}]*",
    "консультировани[\\p{L}\\p{N}]*",
    "доставк[\\p{L}\\p{N}]*",
    "охрана",
    "экспертиз[\\p{L}\\p{N}]*",
    "энергоснабжен[\\p{L}\\p{N}]*",
    "водоснабжен[\\p{L}\\p{N}]*",
    "технологическ[\\p{L}\\p{N}]* присоединен[\\p{L}\\p{N}]*",
  ],
  goods: [
    "поставк[\\p{L}\\p{N}]*",
    "товар[\\p{L}\\p{N}]*",
    "приобретен[\\p{L}\\p{N}]*",
    "оборудован[\\p{L}\\p{N}]*",
    "телевизор[\\p{L}\\p{N}]*",
    "автомобил[\\p{L}\\p{N}]*",
    "мебел[\\p{L}\\p{N}]*",
    "компьютер[\\p{L}\\p{N}]*",
    "прибор[\\p{L}\\p{N}]*",
    "материал[\\p{L}\\p{N}]*",
  ],
  construction: [
    "строительств[\\p{L}\\p{N}]*",
    "ремонт[\\p{L}\\p{N}]*",
    "реконструкц[\\p{L}\\p{N}]*",
    "капитальн[\\p{L}\\p{N}]*",
  ],
  rnd: [
    "научно-исследовательск[\\p{L}\\p{N}]*",
    "опытно-конструкторск[\\p{L}\\p{N}]*",
    "технологических работ",
    "ниоктр",
  ],
  lease: ["аренд[\\p{L}\\p{N}]*", "лизинг[\\p{L}\\p{N}]*"],
  ip: [
    "программн[\\p{L}\\p{N}]* обеспечен[\\p{L}\\p{N}]*",
    "лицензионн[\\p{L}\\p{N}]*",
    "исключительн[\\p{L}\\p{N}]* прав[\\p{L}\\p{N}]*",
    "исходн[\\p{L}\\p{N}]* код[\\p{L}\\p{N}]*",
  ],
  lifecycle: ["жизненного цикла", "кжц"],
  utilities: [
    "энергоснабжен[\\p{L}\\p{N}]*",
    "водоснабжен[\\p{L}\\p{N}]*",
    "теплоснабжен[\\p{L}\\p{N}]*",
    "газоснабжен[\\p{L}\\p{N}]*",
    "технологическ[\\p{L}\\p{N}]* присоединен[\\p{L}\\p{N}]*",
  ],
  embeddedSupply: [
    "с поставкой",
    "включая поставку",
    "в том числе поставк[\\p{L}\\p{N}]*",
    "поставк[\\p{L}\\p{N}]* материалов",
    "материалы и оборудован[\\p{L}\\p{N}]*",
    "с материалами",
  ],
  embeddedWorks: ["с установкой", "с пусконаладк[\\p{L}\\p{N}]*"],
  mount: ["монтаж[\\p{L}\\p{N}]*"],
});

const PATTERNS = Object.freeze(
  Object.fromEntries(
    Object.entries(RAW_PATTERNS).map(([key, list]) => [key, list.map(word)]),
  ),
);

function firstKindByPosition(text) {
  const hits = [];
  for (const kind of ["works", "services", "goods"]) {
    for (const pattern of PATTERNS[kind]) {
      pattern.lastIndex = 0;
      const match = pattern.exec(text);
      if (match) hits.push({ kind, at: match.index, word: match[0] });
    }
  }
  hits.sort((a, b) => a.at - b.at);
  if (!hits.length) return { kind: "unknown", word: null };
  const first = hits[0];
  const earliest = hits
    .filter((hit) => hit.at === first.at)
    .map((hit) => hit.kind);
  // «Работы по поставке телевизора» → declared=works: ведущее слово в начале фразы.
  return {
    kind: earliest.includes("works") ? "works" : first.kind,
    word: first.word,
  };
}

function kindByScore(text) {
  const count = { goods: 0, works: 0, services: 0 };
  for (const kind of Object.keys(count)) {
    for (const pattern of PATTERNS[kind]) {
      pattern.lastIndex = 0;
      count[kind] += (text.match(pattern) || []).length;
    }
  }
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]);
  if (!top[0][1]) return { kind: "unknown", count };
  if (top[1] && top[1][1] === top[0][1]) return { kind: "ambiguous", count };
  return { kind: top[0][0], count };
}

/**
 * Ведущее слово наименования — второй признак вида объекта. В ОКПД2 названия
 * начинаются с «Услуги …», «Работы …», «Продукция …», поэтому раздел 71
 * (проектирование: по коду услуга, по предмету закупки — работа) и разделы,
 * которых нет в таблице ниже (49–56, 84, 97–99), определяются по первому слову,
 * а не остаются «не определено».
 */
function kindByFirstWord(name) {
  const first =
    String(name ?? "")
      .trim()
      .toLowerCase()
      .match(/^[а-яёa-z]+/)?.[0] ?? "";
  if (first.startsWith("услуг")) return "services";
  if (first.startsWith("работ")) return "works";
  if (first.startsWith("продукц") || first.startsWith("товар")) return "goods";
  return "unknown";
}

/**
 * ОКПД2: 41–43 — строительство (работы), 58–96 в основном услуги, 01–39 — товары.
 * `name` — наименование позиции справочника: применяется только когда раздел
 * кода не даёт однозначного ответа (unknown/ambiguous).
 */
export function okpd2Signal(code, name) {
  const digits = String(code ?? "").replace(/\D/g, "");
  let signal = { kind: "unknown", confidence: 0 };

  if (digits.length >= 2) {
    const section = Number(digits.slice(0, 2));
    if (section >= 41 && section <= 43)
      signal = { kind: "works", confidence: 0.7 };
    else if (section === 71) signal = { kind: "ambiguous", confidence: 0.3 };
    else if (section >= 58 && section <= 82)
      signal = { kind: "services", confidence: 0.6 };
    else if (section >= 85 && section <= 96)
      signal = { kind: "services", confidence: 0.6 };
    else if (section >= 1 && section <= 39)
      signal = { kind: "goods", confidence: 0.7 };
    else if (section === 45 || section === 46 || section === 47) {
      signal = { kind: "goods", confidence: 0.6 };
    }
  }

  if (signal.kind === "unknown" || signal.kind === "ambiguous") {
    const byName = kindByFirstWord(name);
    if (byName !== "unknown") return { kind: byName, confidence: 0.5 };
  }

  return signal;
}

/**
 * Вид объекта по дереву ОКПД2. Базовый сигнал — раздел кода и первое слово
 * наименования; если ни то, ни другое не дало ответа, берётся вид соседних
 * позиций той же группы (код без последнего разряда). Пример: у
 * 52.23.19.112 «Съемки воздушные» нет прямых родителей в снимке, но соседи
 * 52.23.19.110/.111 — «Работы …», поэтому позиция считается работой.
 *
 * @param {{ code: string, name?: string }[]} items
 * @returns {Map<string, { kind: string, confidence: number }>}
 */
export function resolveOkpd2Kinds(items) {
  const signals = new Map();
  const groups = new Map();

  for (const item of items) {
    const code = String(item.code ?? "").trim();
    if (!code) continue;
    signals.set(code, okpd2Signal(code, item.name));

    const parts = code.split(".");
    if (parts.length > 1) {
      const group = parts.slice(0, -1).join(".");
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(code);
    }
  }

  for (const [code, signal] of signals) {
    if (signal.kind !== "unknown" && signal.kind !== "ambiguous") continue;

    const parts = code.split(".");
    if (parts.length < 2) continue;

    const votes = { goods: 0, works: 0, services: 0 };
    for (const sibling of groups.get(parts.slice(0, -1).join(".")) ?? []) {
      if (sibling === code) continue;
      const kind = signals.get(sibling)?.kind;
      if (kind && kind in votes) votes[kind] += 1;
    }

    const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    // Ничья или пустая группа: позиция остаётся неопределённой
    if (!ranked[0][1] || ranked[1][1] === ranked[0][1]) continue;

    // Уверенность ниже, чем у раздела кода: это вывод по соседям, не по коду
    signals.set(code, { kind: ranked[0][0], confidence: 0.4 });
  }

  return signals;
}

const DECLARED_KIND_LABELS = Object.freeze({
  goods: "товар",
  works: "работа",
  services: "услуга",
  unknown: "не определён",
});

/** Вид предмета из формы закупки/контракта к видам ядра (36.44, 71 и т.п.). */
export function normalizeDeclaredKind(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["goods", "product", "товар", "товары"].includes(raw)) return "goods";
  if (
    ["works", "work", "работа", "работы", "design_survey", "пир"].includes(raw)
  )
    return "works";
  if (["services", "service", "услуга", "услуги"].includes(raw))
    return "services";
  if (raw.startsWith("works_")) return "works";
  if (raw.startsWith("services_")) return "services";
  return "unknown";
}

/**
 * Первая отсечка: вид предмета из формы против кода ОКПД2 объекта.
 * Это слабый сигнал для человека, а не вывод о нарушении: 71 и пустой код
 * остаются неопределёнными, а расхождение не меняет квалификацию по ГК.
 */
function buildOkpd2Consistency(
  okpdCodes,
  signal,
  formDeclared,
  subjectDeclared,
) {
  const declared = formDeclared !== "unknown" ? formDeclared : subjectDeclared;
  const code = okpdCodes.find(Boolean) ?? "";
  let status = "unknown";
  if (signal.kind === "ambiguous") status = "ambiguous";
  else if (signal.kind !== "unknown" && declared !== "unknown") {
    status = declared === signal.kind ? "match" : "mismatch";
  }

  const labels = DECLARED_KIND_LABELS;
  const source = formDeclared !== "unknown" ? "форме" : "тексте предмета";
  const message =
    status === "mismatch"
      ? `В ${source} заявлен «${labels[declared]}», а код ОКПД2 ${code} указывает на «${labels[signal.kind] ?? signal.kind}». Нужна ручная сверка, это не вывод о нарушении.`
      : status === "ambiguous"
        ? `Код ОКПД2 ${code} относится к неоднозначной группе: вид предмета по коду не проверен.`
        : status === "match"
          ? `Вид предмета и код ОКПД2 ${code} предварительно согласованы.`
          : "Код ОКПД2 отсутствует или не распознан: первичная сверка не выполнена.";

  return {
    declared,
    source: formDeclared !== "unknown" ? "form" : "subject",
    code,
    signal: signal.kind,
    status,
    confidence: signal.confidence,
    message,
  };
}

const PAIR_ARTICLES = Object.freeze({
  "goods-works": ["gk2:454", "gk2:506", "gk2:702", "gk2:703"],
  "goods-services": ["gk2:454", "gk2:779"],
  "services-works": ["gk2:702", "gk2:779"],
});

function pairKey(a, b) {
  return [a, b].sort().join("-");
}

/**
 * Классификация одного контракта. Возвращает результате с явными причинами,
 * чтобы фронт мог показать не только вердикт, но и обоснование.
 */
export function classifyProcurement(input = {}) {
  const subject = normal(input.subject);
  const objectName = normal(input.objectName);
  const context = normal(
    [objectName, input.characteristics].filter(Boolean).join(" "),
  );
  const okpdCodes = Array.isArray(input.okpd2Codes)
    ? input.okpd2Codes
    : [input.okpd2Code].filter(Boolean);
  // Наименование объекта — запасной признак для разделов, где код неоднозначен
  const okpdSignals = okpdCodes
    .map((code) => okpd2Signal(code, objectName))
    .filter((signal) => signal.kind !== "unknown");

  const declared = firstKindByPosition(subject);
  const okpd2Consistency = buildOkpd2Consistency(
    okpdCodes,
    okpdSignals[0] ?? okpd2Signal(okpdCodes[0], objectName),
    normalizeDeclaredKind(input.declaredKind),
    declared.kind,
  );
  const objectByWords = kindByScore(context || subject);
  const okpdKind = okpdSignals.length ? okpdSignals[0].kind : "unknown";
  const objectKind =
    okpdKind !== "unknown" && okpdKind !== "ambiguous"
      ? okpdKind
      : objectByWords.kind;

  const matches = (pattern, text) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  };
  const any = (key, text) =>
    PATTERNS[key].some((pattern) => matches(pattern, text));
  const exceptions = [];
  if (input.flags?.lifecycle || any("lifecycle", subject))
    exceptions.push("lifecycleContract");
  if (any("embeddedSupply", subject)) exceptions.push("embeddedSupply");
  // «Поставка и монтаж» — смешанный предмет, а не поставка внутри работ.
  if (matches(PATTERNS.goods[0], subject) && any("mount", subject)) {
    exceptions.push("mixedSubjectGoodsWorks");
  } else if (any("embeddedWorks", subject)) {
    exceptions.push("embeddedWorks");
  }

  const mismatch =
    declared.kind !== "unknown" &&
    objectKind !== "unknown" &&
    objectKind !== "ambiguous" &&
    declared.kind !== objectKind &&
    !exceptions.includes("lifecycleContract") &&
    !exceptions.includes("embeddedSupply") &&
    !exceptions.includes("embeddedWorks") &&
    !exceptions.includes("mixedSubjectGoodsWorks");

  // При исключениях ведущим остаётся заявленный предмет: «поставка в ходе
  // работ/услуг» не должна переопределить всю квалификацию в товар.
  let effectiveKind =
    objectKind !== "unknown" && objectKind !== "ambiguous"
      ? objectKind
      : declared.kind;
  if (exceptions.length) effectiveKind = declared.kind;
  if (mismatch) effectiveKind = objectKind;
  const institutes = [];
  const addInstitute = (id, source) => {
    if (!CIVIL_INSTITUTES[id] || institutes.some((item) => item.id === id))
      return;
    const institute = CIVIL_INSTITUTES[id];
    institutes.push({
      id,
      label: institute.label,
      special: institute.special,
      articles: institute.articles,
      pendingArticles: institute.pendingArticles || [],
      source,
      priority: institute.special ? "special" : "general",
    });
  };

  if (any("lease", subject)) addInstitute("lease", "subject");
  if (any("ip", subject)) addInstitute("ip-license", "subject");
  if (any("rnd", subject)) addInstitute("works-rnd", "subject");
  if (effectiveKind === "goods") {
    addInstitute("goods-supply-state", "gk-special");
    addInstitute("goods-purchase-sale", "gk-general");
    if (exceptions.length) addInstitute("works-contract", "exception");
  } else if (effectiveKind === "works") {
    addInstitute("works-contract-state", "gk-special");
    addInstitute("works-contract", "gk-general");
    if (any("construction", subject) || any("construction", context)) {
      addInstitute("works-construction", "subject");
    }
    if (exceptions.includes("embeddedSupply"))
      addInstitute("goods-purchase-sale", "exception");
  } else if (effectiveKind === "services") {
    // Энерго- и водоснабжение регулируются отдельными параграфами ГК, текст
    // которых ещё не зафиксирован в снимке: вставок отсюда не выдаём.
    if (any("utilities", subject)) addInstitute("utilities-supply", "subject");
    else addInstitute("services-paid", "gk-general");
    if (exceptions.includes("embeddedSupply"))
      addInstitute("goods-purchase-sale", "exception");
  }

  const notes = [];
  // Первая отсечка не меняет основной вердикт: это повод сверить предмет
  // с объектом вручную, а не обвинение в нарушении.
  if (
    okpd2Consistency.status === "mismatch" ||
    okpd2Consistency.status === "ambiguous"
  ) {
    notes.push(okpd2Consistency.message);
  }
  // Ключевой вопрос пользователя: не слукавил ли заказчик, назвав «услугой»
  // то, что по ст. 702 ГК является работой с сдачей результата.
  if (declared.kind === "services" && any("works", subject)) {
    notes.push(
      "В предмете заявлены услуги, но есть признаки работы (ст. 702, 703 ГК РФ); нужна проверка квалификации",
    );
  }
  const reasons = [];
  reasons.push(
    `Заявленный предмет: ${declared.kind} (${declared.word || "не определён"})`,
  );
  reasons.push(`Сверка вида предмета с ОКПД2: ${okpd2Consistency.status}`);
  if (okpdSignals.length) reasons.push(`ОКПД2 указывает на: ${okpdKind}`);
  if (context) reasons.push(`Объект/характеристики: ${objectByWords.kind}`);
  if (mismatch) {
    reasons.push(
      `Расхождение: по ГК объект — ${objectKind}, а в предмете заявлено ${declared.kind}`,
    );
  }
  for (const exception of exceptions) reasons.push(`Исключение: ${exception}`);

  const agreement = okpdSignals.length && objectByWords.kind === okpdKind;
  let confidence = 0.45;
  if (agreement) confidence += 0.3;
  else if (okpdSignals.length || objectByWords.kind !== "unknown")
    confidence += 0.12;
  if (mismatch) confidence = Math.min(confidence, 0.6);
  if (exceptions.length) confidence = Math.min(confidence, 0.7);

  return {
    declaredKind: declared.kind,
    objectKind,
    effectiveKind,
    okpd2Consistency,
    institutes,
    mismatch: mismatch
      ? {
          detected: true,
          declared: declared.kind,
          object: objectKind,
          basis: PAIR_ARTICLES[pairKey(declared.kind, objectKind)] || [],
          severity:
            declared.kind === "works" && objectKind === "goods"
              ? "high"
              : "medium",
        }
      : { detected: false },
    exceptions,
    reviewRequired:
      mismatch ||
      notes.length > 0 ||
      exceptions.includes("mixedSubjectGoodsWorks") ||
      institutes.some((item) => item.pendingArticles.length > 0) ||
      isUnknownKind(objectKind),
    confidence: Number(confidence.toFixed(2)),
    reasons,
    notes,
  };
}

function isUnknownKind(kind) {
  return kind === "unknown" || kind === "ambiguous";
}

/**
 * Правовое обоснование для проекта контракта: только дословные фрагменты
 * зафиксированного снимка. Никакого пересказа или свободной генерации текста:
 * если статьи нет в снимке, она просто не попадает в результат.
 */
export function buildLegalBasis(result, snapshot) {
  const basis = [];
  for (const institute of result.institutes) {
    for (const reference of institute.articles) {
      const article = articleMeta(snapshot, reference);
      if (!article?.text) continue;
      basis.push({
        reference,
        institute: institute.id,
        priority: institute.priority,
        normKind: classifyNormKind(article.text),
        quote: firstParagraph(article.text),
        sourceUrl: article.url,
        textSha256: article.textSha256,
      });
    }
  }
  return basis.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "special" ? -1 : 1;
    return a.reference.localeCompare(b.reference, "ru");
  });
}

function articleMeta(snapshot, reference) {
  const [act, number] = String(reference).split(":");
  return snapshot?.acts?.[act]?.articles?.[number] ?? null;
}

function firstParagraph(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !new RegExp(`^Статья\\s+\\d+\\.`).test(line));
  return lines[0] || "";
}

/** Проверяет, что все статьи результата есть в снимке (иначе вставка запрещена). */
export function validateAgainstSnapshot(result, snapshot) {
  const missing = [];
  for (const institute of result.institutes) {
    for (const reference of institute.articles) {
      if (!articleText(snapshot, reference)) missing.push(reference);
    }
  }
  for (const link of FZ44_ARTICLE34_MATRIX) {
    for (const reference of link.gk) {
      if (!articleText(snapshot, reference)) missing.push(reference);
    }
  }
  return missing.length
    ? { ok: false, missing: [...new Set(missing)] }
    : { ok: true, missing: [] };
}

/**
 * Условия, которые должны быть в контракте по 44-ФЗ. Каждая цитата — дословный
 * абзац зафиксированного снимка; новый текст формулировок не создаётся.
 * `paragraph` — номер пункта статьи, из которого берётся цитата.
 */
export const CIVIL_CONTRACT_REQUIREMENTS = Object.freeze([
  {
    id: "subject-essential",
    title: "Предмет контракта как существенное условие договора",
    description:
      "Без соглашения по предмету договор не считается заключённым; контракт заключается на условиях извещения.",
    sectionId: "subject",
    paths: ["subject.objectName", "subject.description"],
    priority: "fz44-imperative",
    quotes: [
      { reference: "fz44:34", paragraph: 1 },
      { reference: "gk1:432", paragraph: 1 },
    ],
  },
  {
    id: "goods-name-quantity",
    title: "Наименование и количество товара",
    description:
      "Условие договора купли-продажи о товаре считается согласованным, если договор позволяет определить наименование и количество.",
    kinds: ["goods"],
    sectionId: "subject",
    paths: ["subject.objectName", "subject.quantity"],
    priority: "gk-general",
    quotes: [{ reference: "gk2:455", paragraph: 3 }],
  },
  {
    id: "goods-delivery",
    title: "Передача товара заказчику или по его указанию",
    description:
      "По государственному контракту поставщик передаёт товары заказчику либо по его указанию иному лицу.",
    kinds: ["goods"],
    sectionId: "subject",
    paths: ["subject.deliveryPlace"],
    priority: "gk-special",
    quotes: [{ reference: "gk2:526" }, { reference: "gk2:525", paragraph: 1 }],
  },
  {
    id: "goods-quality",
    title: "Качество поставляемого товара",
    description:
      "Качество товара должно соответствовать договору; исполнение госконтракта подчиняется правилам поставки.",
    kinds: ["goods"],
    sectionId: "quality",
    paths: ["quality.qualityRequirements", "quality.specifications"],
    priority: "gk-general",
    quotes: [
      { reference: "gk2:469", paragraph: 1 },
      { reference: "gk2:531", paragraph: 1 },
    ],
  },
  {
    id: "works-result",
    title: "Определённая работа и передача результата",
    description:
      "Подрядчик выполняет по заданию заказчика определённую работу и сдаёт её результат.",
    kinds: ["works"],
    sectionId: "subject",
    paths: ["subject.objectName", "subject.description", "subject.objectList"],
    priority: "gk-general",
    quotes: [
      { reference: "gk2:702", paragraph: 1 },
      { reference: "gk2:703", paragraph: 1 },
    ],
  },
  {
    id: "works-state-terms",
    title: "Объём, стоимость, сроки и обеспечение подрядных работ",
    description:
      "Гос контракт на подрядные работы должен содержать объём, стоимость, даты начала и окончания, порядок финансирования и способы обеспечения.",
    kinds: ["works"],
    sectionId: "term",
    paths: [
      "subject.quantity",
      "price.finalPrice",
      "term.startDate",
      "term.endDate",
      "price.paymentProcedure",
    ],
    priority: "gk-special",
    quotes: [
      { reference: "gk2:766", paragraph: 1 },
      { reference: "gk2:763", paragraph: 2 },
    ],
  },
  {
    id: "works-price",
    title: "Цена работы или способ её определения",
    description:
      "В договоре подряда указывается цена подлежащей выполнению работы или способы её определения.",
    kinds: ["works"],
    sectionId: "price",
    paths: ["price.finalPrice", "price.isFixed"],
    priority: "gk-general",
    quotes: [{ reference: "gk2:709", paragraph: 1 }],
  },
  {
    id: "works-acceptance",
    title: "Приёмка результата и оформление акта",
    description:
      "Заказчик осматривает и принимает результат в сроки и порядке, предусмотренные договором; сдача оформляется актом.",
    kinds: ["works"],
    sectionId: "term",
    paths: [
      "term.acceptanceProcedure",
      "term.acceptanceTermDays",
      "term.acceptanceActForm",
    ],
    priority: "gk-general",
    quotes: [
      { reference: "gk2:720", paragraph: 1 },
      { reference: "gk2:753", paragraph: 4 },
    ],
  },
  {
    id: "works-quality-warranty",
    title: "Качество и гарантия результата работы",
    description:
      "Качество работы должно соответствовать условиям договора; при установленном гарантийном сроке результат должен отвечать этим условиям весь срок.",
    kinds: ["works"],
    sectionId: "quality",
    paths: ["quality.qualityRequirements", "quality.warrantyPeriodMonths"],
    priority: "gk-general",
    quotes: [
      { reference: "gk2:721", paragraph: 1 },
      { reference: "gk2:722", paragraph: 1 },
    ],
  },
  {
    id: "construction-documentation",
    title: "Техническая документация и смета",
    description:
      "Договором строительного подряда определяются состав и содержание технической документации, а также сторона и срок её предоставления.",
    institutes: ["works-construction"],
    sectionId: "projectDocs",
    paths: ["projectDocs.documentsList", "projectDocs.expertiseRequired"],
    priority: "gk-general",
    quotes: [{ reference: "gk2:743", paragraph: 2 }],
  },
  {
    id: "services-scope",
    title: "Состав и объём услуг",
    description:
      "Исполнитель обязуется по заданию заказчика оказать услуги — совершить определённые действия или деятельность.",
    kinds: ["services"],
    sectionId: "subject",
    paths: ["subject.objectName", "subject.description", "subject.quantity"],
    priority: "gk-general",
    quotes: [{ reference: "gk2:779", paragraph: 1 }],
  },
  {
    id: "services-payment",
    title: "Сроки и порядок оплаты услуг",
    description:
      "Заказчик оплачивает оказанные услуги в сроки и в порядке, указанные в договоре.",
    kinds: ["services"],
    sectionId: "price",
    paths: [
      "price.finalPrice",
      "price.paymentTermDays",
      "price.paymentProcedure",
    ],
    priority: "gk-general",
    quotes: [{ reference: "gk2:781", paragraph: 1 }],
  },
  {
    id: "price-fixed-44",
    title: "Твёрдая цена контракта",
    description:
      "Цена контракта твёрдая и определяется на весь срок исполнения; исполнение договора оплачивается по установленной соглашением цене.",
    sectionId: "price",
    paths: ["price.finalPrice", "price.isFixed"],
    priority: "fz44-imperative",
    quotes: [
      { reference: "fz44:34", paragraph: 2 },
      { reference: "gk1:424", paragraph: 1 },
    ],
  },
  {
    id: "payment-acceptance-44",
    title: "Порядок и сроки оплаты и приёмки по 44-ФЗ",
    description:
      "Контракт должен содержать порядок и сроки оплаты, приёмки и оформления её результатов, а также предельный срок оплаты.",
    sectionId: "price",
    paths: [
      "price.paymentTermDays",
      "term.acceptanceProcedure",
      "term.acceptanceTermDays",
    ],
    priority: "fz44-imperative",
    quotes: [
      { reference: "fz44:34", paragraph: "13.1" },
      { reference: "fz44:34", paragraph: 13 },
    ],
  },
  {
    id: "liability-44",
    title: "Ответственность за неисполнение контракта",
    description:
      "Обязательное условие контракта — ответственность заказчика и поставщика за неисполнение или ненадлежащее исполнение обязательств.",
    sectionId: "responsibility",
    paths: [
      "responsibility.penaltyFormula",
      "responsibility.fixedPenaltyAmount",
    ],
    priority: "fz44-imperative",
    quotes: [
      { reference: "fz44:34", paragraph: 4 },
      { reference: "gk1:401", paragraph: 1 },
    ],
  },
  {
    id: "ip-results",
    title: "Права на результаты работ",
    description:
      "Стороны используют результаты работ в пределах и на условиях, предусмотренных договором.",
    institutes: ["works-rnd", "ip-license"],
    sectionId: "designRights",
    paths: ["designRights.usageRights", "designRights.rightsOwner"],
    priority: "gk-general",
    quotes: [
      { reference: "gk2:772", paragraph: 1 },
      { reference: "gk2:769", paragraph: 4 },
    ],
  },
]);

function paragraphByNumber(text, number) {
  const source = String(text || "");
  if (number === undefined || number === null) return firstParagraph(source);
  const prefix = `${number}. `;
  const found = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(prefix));
  return found || firstParagraph(source);
}

function valueByPath(source, dottedPath) {
  return String(dottedPath)
    .split(".")
    .reduce(
      (value, key) =>
        value && typeof value === "object" ? value[key] : undefined,
      source,
    );
}

function isFilled(value) {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

/**
 * Что именно должно быть в проекте контракта: условия по ГК РФ и 44-ФЗ,
 * статус заполнения и дословные цитаты из снимка. Без генерации текста.
 */
export function buildContractRequirements(project, snapshot) {
  const subject = [project?.subject?.objectName, project?.subject?.description]
    .filter(Boolean)
    .join(" ");
  const classification = classifyProcurement({
    subject,
    objectName: project?.subject?.objectName,
    characteristics: project?.subject?.description,
    okpd2Code: project?.subject?.okpd2Code,
    declaredKind: project?.kind,
    flags: { lifecycle: /жизненного цикла/i.test(subject) },
  });
  const instituteIds = new Set(
    classification.institutes.map((item) => item.id),
  );
  const overriddenSections = new Set(
    (project?.sectionOverrides || [])
      .filter((item) => String(item?.text || "").trim())
      .map((item) => item.sectionId),
  );

  const requirements = CIVIL_CONTRACT_REQUIREMENTS.filter(
    (item) =>
      (!item.kinds || item.kinds.includes(classification.effectiveKind)) &&
      (!item.institutes || item.institutes.some((id) => instituteIds.has(id))),
  ).map((item) => {
    const filled = item.paths.filter((path) =>
      isFilled(valueByPath(project, path)),
    );
    const status = overriddenSections.has(item.sectionId)
      ? "overridden"
      : filled.length === item.paths.length
        ? "filled"
        : filled.length > 0
          ? "partial"
          : "missing";
    const quotes = item.quotes
      .map((quote) => {
        const meta = articleMeta(snapshot, quote.reference);
        if (!meta?.text) return null;
        // Оговорка в статье делает условие рекомендацией, а не жёстким требованием.
        const qualifiers = findNormQualifiers(meta.text);
        return {
          reference: quote.reference,
          quote: paragraphByNumber(meta.text, quote.paragraph),
          sourceUrl: meta.url,
          textSha256: meta.textSha256,
          normKind: qualifiers.length ? "dispositive" : "imperative",
          qualifiers,
        };
      })
      .filter(Boolean);
    const dispositiveQuotes = quotes.filter((quote) => quote.qualifiers.length);
    const normKind =
      quotes.length === 0
        ? "unknown"
        : dispositiveQuotes.length === quotes.length
          ? "dispositive"
          : dispositiveQuotes.length > 0
            ? "mixed"
            : "imperative";
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      sectionId: item.sectionId,
      priority: item.priority,
      paths: [...item.paths],
      filledPaths: filled,
      missingPaths: item.paths.filter((path) => !filled.includes(path)),
      status,
      quotes,
      normKind,
      qualifierNotes: dispositiveQuotes.map((quote) => ({
        reference: quote.reference,
        quote: quote.qualifiers[0],
      })),
      articleRefs: item.quotes.map((quote) => quote.reference),
    };
  });

  const counts = requirements.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      acc.total += 1;
      return acc;
    },
    { total: 0, filled: 0, partial: 0, missing: 0, overridden: 0 },
  );

  return {
    classification,
    legalBasis: buildLegalBasis(classification, snapshot),
    requirements,
    counts,
    pendingArticles: classification.institutes.flatMap((institute) =>
      institute.pendingArticles.map((reference) => ({
        reference,
        institute: institute.id,
        label: institute.label,
      })),
    ),
  };
}
