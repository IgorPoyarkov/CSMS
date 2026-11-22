/**
 * Слой «предмет/объект закупки → институт ГК РФ» (P0–P1).
 *
 * Чистый модуль: не ходит в сеть, не пишет в БД. Источник текста — снимок
 * `docs/snapshots/civil-code-snapshot.json`, снятый с КонсультантПлюс.
 *
 * Главное решение пользователя: ОКПД2 — только косвенный сигнал. Истину о том,
 * является ли объект товаром, работой или услугой, мы берём из определений ГК
 * (ст. 454/506 — товар и поставка, ст. 702/703 — работа, ст. 779 — услуга).
 * Расхождение между заявленным предметом и объектом не сглаживаем, а помечаем
 * как mismatch с правовым обоснованием. Исключения — контракт жизненного цикла
 * (44-ФЗ, ст. 3 п. 8.2) и поставка, логически вплетённая в работу/услугу.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const CIVIL_SNAPSHOT_PATH = path.resolve(
  "docs/snapshots/civil-code-snapshot.json",
);

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
    label: "Научно-исследовательские, опытно-конструкторские и технологические работы",
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

/** Читает снимок и проверяет его внутреннюю целостность. */
export function loadCivilSnapshot(snapshotPath = CIVIL_SNAPSHOT_PATH) {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const problems = [];
  for (const act of Object.values(snapshot.acts || {})) {
    for (const article of Object.values(act.articles || {})) {
      const actual = crypto
        .createHash("sha256")
        .update(article.text)
        .digest("hex")
        .toUpperCase();
      if (actual !== article.textSha256) {
        problems.push(`Не совпал хеш текста: ${article.url}`);
      }
      const hasHeading = new RegExp(`Статья\\s+${article.article}\\.`).test(
        article.text,
      );
      if (!hasHeading && !/^\d+\./.test(article.text)) {
        problems.push(`Подозрительный текст статьи: ${article.url}`);
      }
    }
  }
  if (problems.length) throw new Error(problems.join("; "));
  return snapshot;
}

/** Возвращает текст статьи по ссылке вида `gk2:702`. */
export function articleText(snapshot, reference) {
  const [act, number] = String(reference).split(":");
  return snapshot?.acts?.[act]?.articles?.[number]?.text ?? null;
}

/**
 * Эвристика характера нормы по её тексту. Не заменяет юридическую экспертизу:
 * «если иное не предусмотрено договором» = диспозитивная норма.
 */
export function classifyNormKind(text) {
  if (/если иное не предусмотрено|если договором не предусмотрено|по соглашению сторон/i.test(text)) {
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
    Object.entries(RAW_PATTERNS).map(([key, list]) => [
      key,
      list.map(word),
    ]),
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
  const earliest = hits.filter((hit) => hit.at === first.at).map((hit) => hit.kind);
  // «Работы по поставке телевизора» → declared=works: ведущее слово в начале фразы.
  return { kind: earliest.includes("works") ? "works" : first.kind, word: first.word };
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

/** ОКПД2: 41–43 — строительство (работы), 58–96 в основном услуги, 01–39 — товары. */
export function okpd2Signal(code) {
  const digits = String(code ?? "").replace(/\D/g, "");
  if (digits.length < 2) return { kind: "unknown", confidence: 0 };
  const section = Number(digits.slice(0, 2));
  if (section >= 41 && section <= 43) return { kind: "works", confidence: 0.7 };
  if (section === 71) return { kind: "ambiguous", confidence: 0.3 };
  if (section >= 58 && section <= 82) return { kind: "services", confidence: 0.6 };
  if (section >= 85 && section <= 96) return { kind: "services", confidence: 0.6 };
  if (section >= 1 && section <= 39) return { kind: "goods", confidence: 0.7 };
  if (section === 45 || section === 46 || section === 47) {
    return { kind: "goods", confidence: 0.6 };
  }
  return { kind: "unknown", confidence: 0 };
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
  const context = normal([objectName, input.characteristics].filter(Boolean).join(" "));
  const okpdCodes = Array.isArray(input.okpd2Codes)
    ? input.okpd2Codes
    : [input.okpd2Code].filter(Boolean);
  const okpdSignals = okpdCodes.map(okpd2Signal).filter((signal) => signal.kind !== "unknown");

  const declared = firstKindByPosition(subject);
  const objectByWords = kindByScore(context || subject);
  const okpdKind = okpdSignals.length
    ? okpdSignals[0].kind
    : "unknown";
  const objectKind =
    okpdKind !== "unknown" && okpdKind !== "ambiguous"
      ? okpdKind
      : objectByWords.kind;

  const matches = (pattern, text) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  };
  const any = (key, text) => PATTERNS[key].some((pattern) => matches(pattern, text));
  const exceptions = [];
  if (input.flags?.lifecycle || any("lifecycle", subject)) exceptions.push("lifecycleContract");
  if (any("embeddedSupply", subject)) exceptions.push("embeddedSupply");
  // «Поставка и монтаж» — смешанный предмет, а не поставка внутри работ.
  if (matches(PATTERNS.goods[0], subject) && any("mount", subject)) {
    exceptions.push("mixedSubjectGoodsWorks");
  } else if (any("embeddedWorks", subject)) {
    exceptions.push("embeddedWorks");
  }

  const mismatch = declared.kind !== "unknown" &&
    objectKind !== "unknown" &&
    objectKind !== "ambiguous" &&
    declared.kind !== objectKind &&
    !exceptions.includes("lifecycleContract") &&
    !exceptions.includes("embeddedSupply") &&
    !exceptions.includes("embeddedWorks") &&
    !exceptions.includes("mixedSubjectGoodsWorks");

  // При исключениях ведущим остаётся заявленный предмет: «поставка в ходе
  // работ/услуг» не должна переопределить всю квалификацию в товар.
  let effectiveKind = objectKind !== "unknown" && objectKind !== "ambiguous"
    ? objectKind
    : declared.kind;
  if (exceptions.length) effectiveKind = declared.kind;
  if (mismatch) effectiveKind = objectKind;
  const institutes = [];
  const addInstitute = (id, source) => {
    if (!CIVIL_INSTITUTES[id] || institutes.some((item) => item.id === id)) return;
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
    if (exceptions.includes("embeddedSupply")) addInstitute("goods-purchase-sale", "exception");
  } else if (effectiveKind === "services") {
    // Энерго- и водоснабжение регулируются отдельными параграфами ГК, текст
    // которых ещё не зафиксирован в снимке: вставок отсюда не выдаём.
    if (any("utilities", subject)) addInstitute("utilities-supply", "subject");
    else addInstitute("services-paid", "gk-general");
    if (exceptions.includes("embeddedSupply")) addInstitute("goods-purchase-sale", "exception");
  }

  const notes = [];
  // Ключевой вопрос пользователя: не слукавил ли заказчик, назвав «услугой»
  // то, что по ст. 702 ГК является работой с сдачей результата.
  if (declared.kind === "services" && any("works", subject)) {
    notes.push(
      "В предмете заявлены услуги, но есть признаки работы (ст. 702, 703 ГК РФ); нужна проверка квалификации",
    );
  }
  const reasons = [];
  reasons.push(`Заявленный предмет: ${declared.kind} (${declared.word || "не определён"})`);
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
  else if (okpdSignals.length || objectByWords.kind !== "unknown") confidence += 0.12;
  if (mismatch) confidence = Math.min(confidence, 0.6);
  if (exceptions.length) confidence = Math.min(confidence, 0.7);

  return {
    declaredKind: declared.kind,
    objectKind,
    effectiveKind,
    institutes,
    mismatch: mismatch
      ? {
          detected: true,
          declared: declared.kind,
          object: objectKind,
          basis: PAIR_ARTICLES[pairKey(declared.kind, objectKind)] || [],
          severity: declared.kind === "works" && objectKind === "goods" ? "high" : "medium",
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
  return missing.length ? { ok: false, missing: [...new Set(missing)] } : { ok: true, missing: [] };
}
