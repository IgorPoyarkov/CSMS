import assert from "node:assert/strict";
import test from "node:test";

import { extractNpaFullTextSuggestions } from "../lib/npa-fulltext.mjs";
import {
  buildOozAgentSnapshot,
  findAgentSuggestions,
} from "../lib/ooz-agent.mjs";

const text = [
  "Федеральный закон от 13.07.2015 № 220-ФЗ",
  "13) вид транспортного средства - автобус, трамвай или троллейбус;",
  "15) рейс - путь транспортного средства по маршруту регулярных перевозок;",
].join("\n");

test("из полного текста НПА берутся только дословные строки", () => {
  const suggestions = extractNpaFullTextSuggestions({
    code: "Федеральный закон от 13.07.2015 № 220-ФЗ",
    text,
    sourceUrl: "https://example.invalid/220fz",
    fullTextUrl: "/npa/fulltext/fz.txt",
  });
  assert.deepEqual(
    suggestions.map((item) => item.quote),
    [
      "13) вид транспортного средства - автобус, трамвай или троллейбус;",
      "15) рейс - путь транспортного средства по маршруту регулярных перевозок;",
    ],
  );
  for (const suggestion of suggestions) {
    assert.equal(suggestion.value, suggestion.quote);
    assert.ok(text.includes(suggestion.quote));
    assert.equal(suggestion.status, "needs_review");
    assert.equal(suggestion.confidence, 0.55);
    assert.equal(suggestion.field, "otherRequirements");
  }
});

test("нет текста или неизвестный документ — нет подсказок", () => {
  assert.deepEqual(
    extractNpaFullTextSuggestions({
      code: "ТР ТС 018/2011",
      text: null,
    }),
    [],
  );
  assert.deepEqual(
    extractNpaFullTextSuggestions({ code: "Неизвестный закон", text }),
    [],
  );
});

test("цитаты НПА выдаются только для своего документа", () => {
  const law = "Федеральный закон от 13.07.2015 № 220-ФЗ";
  const snapshot = buildOozAgentSnapshot({
    selection: {
      okpd2Codes: ["49.31.21.110"],
      selected: [],
      otherStandards: [
        {
          name: law,
          okpd2Codes: ["49.31.21.110"],
          ktruCodes: [],
          sourceUrl: null,
        },
      ],
    },
    requirements: { items: [] },
    catalog: {},
    npaSnapshot: { acts: { fz44: { articles: { 33: { text: "" } } } } },
    npaFullTexts: [
      { code: law, text, sourceUrl: null, fullTextUrl: "/npa/fulltext/fz.txt" },
    ],
  });
  const lawDoc = snapshot.documents.find((doc) => doc.code === law);
  assert.equal(lawDoc.status, "has_requirements");
  assert.equal(lawDoc.fullTextUrl, "/npa/fulltext/fz.txt");

  assert.equal(findAgentSuggestions(snapshot, law).length, 2);
  assert.equal(findAgentSuggestions(snapshot, "Другой документ").length, 0);
  assert.equal(findAgentSuggestions(snapshot, "").length, 0);
});
