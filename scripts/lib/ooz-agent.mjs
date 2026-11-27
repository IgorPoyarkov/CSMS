/**
 * Агент подсказок для описания объекта закупки (ООЗ) по ГОСТ и НПА.
 *
 * Принцип snapshot-first: никаких запросов к ЕИС, protect.gost.ru или pravo.gov.ru.
 * Агент работает только по зафиксированным снимкам и не придумывает значения —
 * каждое предложение обязательно содержит дословную цитату из снимка.
 * Там, где полного текста нет (ТР ТС), документ помечается как требующий
 * проверки, но поле не заполняется. Полный текст НПА (220-ФЗ) читается из
 * отдельного снимка; цитаты из него тоже остаются needs_review.
 */
import { createHash } from "node:crypto";
import { extractNpaFullTextSuggestions } from "./npa-fulltext.mjs";

const COMPONENT_NEEDLES = [
  ["specifications", "спецификации"],
  ["plans", "планы"],
  ["drawings", "чертежи"],
  ["sketches", "эскизы"],
  ["photos", "фотографии"],
  ["testResults", "результаты работы, тестирования"],
  [
    "testRequirements",
    "требования, в том числе в отношении проведения испытаний, методов испытаний",
  ],
  [
    "packaging",
    "упаковки в соответствии с требованиями Гражданского кодекса Российской Федерации",
  ],
  ["marking", "маркировки"],
  ["labels", "этикеток"],
  ["conformityConfirmation", "подтверждения соответствия"],
  ["productionMethods", "процессов и методов производства"],
  ["symbolsAndTerminology", "условных обозначений и терминологии"],
];

const COMPONENT_LABELS = {
  specifications: "Спецификации",
  plans: "Планы",
  drawings: "Чертежи",
  sketches: "Эскизы",
  photos: "Фотографии",
  testResults: "Результаты работы, тестирования",
  testRequirements: "Испытания и методы испытаний",
  packaging: "Упаковка",
  marking: "Маркировка",
  labels: "Этикетки",
  conformityConfirmation: "Подтверждение соответствия",
  productionMethods: "Процессы и методы производства",
  symbolsAndTerminology: "Условные обозначения и терминология",
};

/** Норма из ст. 33 44-ФЗ о составе описания — НПА-источник подсказок. */
export function npaSuggestionsFromArticle33(snapshot) {
  const article = snapshot?.acts?.fz44?.articles?.["33"];
  const text = String(article?.text ?? "");
  return COMPONENT_NEEDLES.filter(([, needle]) => text.includes(needle)).map(
    ([component, needle]) => ({
      field: `descriptionComponents.${component}`,
      value: component,
      label: `${COMPONENT_LABELS[component]} (п. 3 ч. 1 ст. 33)`,
      quote: needle,
      source: "44-ФЗ, ст. 33, ч. 1, п. 3",
      sourceUrl: article?.url ?? null,
      kind: "NPA",
      // Цитата дословная, но сам переход «норма → поле ООЗ» требует
      // human-проверки: статус как в csms-api (needs_review + /verify).
      status: "needs_review",
      confidence: 0.55,
    }),
  );
}

/** Классификация документа из карточки КТРУ для редактора ООЗ. */
export const npaStandardType = (name) =>
  /^ТР\s+(?:ТС|ЕАЭС)/i.test(name) ? "TR_TS" : "other";

/**
 * Сборка снимка агента из уже существующих локальных снимков.
 * Поля ГОСТов берутся из requirements.json, где цитата уже проверена.
 */
export function buildOozAgentSnapshot({
  selection,
  requirements,
  catalog,
  npaSnapshot,
  // Зафиксированные полные тексты НПА и ГОСТов уже прочитаны сборщиком:
  // сам агент по-прежнему не делает сетевых вызовов.
  npaFullTexts = [],
  gostFullTextUrls = {},
  generatedAt = new Date().toISOString(),
}) {
  const npaFullTextSuggestions = npaFullTexts.flatMap((full) =>
    extractNpaFullTextSuggestions(full),
  );
  const gostDocs = (selection.selected ?? []).map((item) => {
    const requirementCount =
      requirements.items?.find((entry) => entry.designation === item.designation)
        ?.requirements?.length ?? 0;
    return {
      code: item.designation,
      name: item.name ?? item.designation,
      kind: "GOST",
      standardType: "GOST",
      okpd2Codes: item.okpd2Codes,
      ktruCodes: item.ktruCodes,
      sourceUrl: item.sourceUrl ?? null,
      fullTextUrl: gostFullTextUrls[item.designation] ?? null,
      status: requirementCount > 0 ? "has_requirements" : "no_quotes",
    };
  });
  const npaDocs = (selection.otherStandards ?? []).map((item) => {
    const full = npaFullTexts.find((entry) => entry.code === item.name);
    const quoteCount = npaFullTextSuggestions.filter(
      (suggestion) => suggestion.documentCode === item.name,
    ).length;
    return {
      code: item.name,
      name: item.name,
      kind: "NPA",
      standardType: npaStandardType(item.name),
      okpd2Codes: item.okpd2Codes,
      ktruCodes: item.ktruCodes,
      sourceUrl: item.sourceUrl ?? full?.sourceUrl ?? null,
      fullTextUrl: full?.fullTextUrl ?? null,
      // Нет зафиксированного текста — нет и цитат; у ТР ТС остаётся пометка
      // needs_full_text, пока не появится текст без OCR.
      status: !full?.fullTextUrl
        ? "needs_full_text"
        : quoteCount > 0
          ? "has_requirements"
          : "no_quotes",
    };
  });
  const documents = [...gostDocs, ...npaDocs];

  const gostSuggestions = (requirements.items ?? []).flatMap((item) =>
    (item.requirements ?? []).map((requirement) => ({
      field: requirement.field,
      value: requirement.value,
      label: requirement.label,
      quote: requirement.quote,
      source: item.designation,
      sourceUrl:
        gostDocs.find((doc) => doc.code === item.designation)?.sourceUrl ?? null,
      kind: "GOST",
      // Значение уже проверено build-gost-requirements.mjs по полному тексту.
      status: "confirmed",
      confidence: 1,
    })),
  );
  const npaSuggestions = npaSuggestionsFromArticle33(npaSnapshot);
  const suggestions = [
    ...gostSuggestions,
    ...npaSuggestions,
    ...npaFullTextSuggestions,
  ];

  const byOkpd2 = {};
  for (const code of selection.okpd2Codes ?? []) {
    const relevant = documents.filter((doc) => doc.okpd2Codes.includes(code));
    if (relevant.length) byOkpd2[code] = relevant.map((doc) => doc.code);
  }

  const payload = {
    generatedAt,
    catalogVersion: catalog?.version ?? null,
    requirementsVersion: requirements?.version ?? null,
    selectionGeneratedAt: selection?.generatedAt ?? null,
    documents,
    suggestions,
    byOkpd2,
  };
  const source = JSON.stringify(payload);
  return {
    ...payload,
    version: `ooz-agent-${generatedAt.slice(0, 10).replaceAll("-", "")}-${createHash("sha1").update(source).digest("hex").slice(0, 12)}`,
  };
}

/** Подсказки для конкретного документа и общие нормы ст. 33. */
export function findAgentSuggestions(snapshot, code) {
  const normalize = (value) => String(value).replace(/\s+/g, "").toUpperCase();
  const normalized = code ? normalize(code) : "";
  return (snapshot?.suggestions ?? []).filter((suggestion) => {
    // Цитаты из полного текста НПА привязаны к своему документу: закон о
    // маршрутах не должен заполнять описание другой позиции.
    if (suggestion.documentCode) {
      return (
        Boolean(normalized) && normalize(suggestion.documentCode) === normalized
      );
    }
    // Нормы ст. 33 применимы к любому описанию — и без выбранного документа.
    if (suggestion.kind === "NPA") return true;
    return Boolean(normalized) && normalize(suggestion.source) === normalized;
  });
}

/** Документы, которые агент нашёл для кода ОКПД2. */
export function findAgentDocuments(snapshot, okpd2Code) {
  const codes = snapshot?.byOkpd2?.[okpd2Code] ?? [];
  return (snapshot?.documents ?? []).filter((doc) => codes.includes(doc.code));
}
