import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOozAgentSnapshot,
  findAgentDocuments,
  findAgentSuggestions,
  npaStandardType,
  npaSuggestionsFromArticle33,
} from "../lib/ooz-agent.mjs";

const npaSnapshot = {
  acts: {
    fz44: {
      articles: {
        33: {
          text: "3) описание объекта закупки может включать в себя спецификации, планы, чертежи, эскизы, фотографии, упаковки в соответствии с требованиями Гражданского кодекса Российской Федерации, маркировки, этикеток.",
          url: "https://example.invalid/33",
        },
      },
    },
  },
};

const selection = {
  generatedAt: "2026-11-27T00:00:00.000Z",
  okpd2Codes: ["49.31.21.110", "26.51.66.190"],
  selected: [
    {
      designation: "ГОСТ 30593-2015",
      name: "ГОСТ 30593-2015",
      okpd2Codes: ["49.31.21.110"],
      ktruCodes: ["49.31.21.110-00000054"],
      sourceUrl: "https://allgosts.ru/43/060/gost_30593-2015",
    },
  ],
  otherStandards: [
    {
      name: "ТР ТС 018/2011",
      okpd2Codes: ["49.31.21.110"],
      ktruCodes: ["49.31.21.110-00000054"],
      sourceUrl: null,
    },
  ],
};

const requirements = {
  version: "test-req",
  items: [
    {
      designation: "ГОСТ 30593-2015",
      requirements: [
        {
          field: "warrantyTermMonths",
          value: "12",
          label: "Гарантийный срок",
          quote: "Гарантийный срок - 12 месяцев",
        },
      ],
    },
  ],
};

test("агент не выдумывает цитаты НПА", () => {
  const suggestions = npaSuggestionsFromArticle33(npaSnapshot);
  const text = npaSnapshot.acts.fz44.articles["33"].text;
  assert.deepEqual(
    suggestions.map((item) => item.field),
    [
      "descriptionComponents.specifications",
      "descriptionComponents.plans",
      "descriptionComponents.drawings",
      "descriptionComponents.sketches",
      "descriptionComponents.photos",
      "descriptionComponents.packaging",
      "descriptionComponents.marking",
      "descriptionComponents.labels",
    ],
  );
  for (const suggestion of suggestions) {
    assert.ok(text.includes(suggestion.quote));
    assert.equal(suggestion.kind, "NPA");
    // Точная цитата не делает автоматическую подстановку доказанной нормой.
    assert.equal(suggestion.status, "needs_review");
    assert.equal(suggestion.confidence, 0.55);
  }
});

test("тип документа из КТРУ определяет контрол в ООЗ", () => {
  assert.equal(npaStandardType("ТР ТС 018/2011"), "TR_TS");
  assert.equal(
    npaStandardType("Федеральный закон от 13.07.2015 № 220-ФЗ"),
    "other",
  );
});

test("снимок агента связывает документы с ОКПД2 и сохраняет источники", () => {
  const snapshot = buildOozAgentSnapshot({
    selection,
    requirements,
    catalog: { version: "test-catalog" },
    npaSnapshot,
    generatedAt: "2026-11-27T00:00:00.000Z",
  });
  assert.match(snapshot.version, /^ooz-agent-20261127-/);
  assert.equal(snapshot.catalogVersion, "test-catalog");
  assert.equal(snapshot.requirementsVersion, "test-req");
  assert.deepEqual(Object.keys(snapshot.byOkpd2), ["49.31.21.110"]);

  const docs = findAgentDocuments(snapshot, "49.31.21.110");
  assert.deepEqual(
    docs.map((doc) => [doc.code, doc.kind, doc.status]),
    [
      ["ГОСТ 30593-2015", "GOST", "has_requirements"],
      ["ТР ТС 018/2011", "NPA", "needs_full_text"],
    ],
  );
  assert.deepEqual(findAgentDocuments(snapshot, "26.51.66.190"), []);

  const withNpa = findAgentSuggestions(snapshot, "ГОСТ 30593 - 2015");
  const gost = withNpa.filter((item) => item.kind === "GOST");
  assert.equal(gost.length, 1);
  assert.equal(gost[0].field, "warrantyTermMonths");
  assert.equal(gost[0].status, "confirmed");
  assert.equal(gost[0].confidence, 1);
  assert.ok(withNpa.some((item) => item.kind === "NPA"));
  assert.ok(
    npaSnapshot.acts.fz44.articles["33"].text.includes(
      withNpa.find((item) => item.kind === "NPA").quote,
    ),
  );

  // Нормы ст. 33 показываются даже если ГОСТ по ОКПД2 не найден.
  const npaOnly = findAgentSuggestions(snapshot, "");
  assert.ok(npaOnly.length > 0);
  assert.ok(npaOnly.every((item) => item.kind === "NPA"));
});
