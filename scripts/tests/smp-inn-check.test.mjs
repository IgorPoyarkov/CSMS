/** Проверки точечной сверки ИНН с реестром МСП (без сети: fetch подменяется). */

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLookupDoc,
  docToAnswer,
  isLookupFresh,
  isValidInn,
  lookupInn,
  mapSmpCategory,
  pickRow,
} from "../lib/smp-lookup.mjs";

/** Ответ портала ФНС на существующий ИНН (поля, которые нам нужны). */
const FOUND = {
  rowCount: 1,
  data: [
    {
      inn: "4630000790",
      ogrn: "1034637001948",
      category: 1,
      is_active: 1,
      regioncode: "46",
      dtregistry: "10.08.2017 00:00:00",
      name_ex: 'АКЦИОНЕРНОЕ ОБЩЕСТВО "КУРСКТАРА"',
    },
  ],
};

/** Ответ на ИНН, которого в реестре нет: `data` вообще отсутствует. */
const NOT_FOUND = {
  rowCount: 0,
  pageNav: { pages: [["1", null]] },
};

const fakeFetch = (payload) => async () => ({
  ok: true,
  json: async () => payload,
});

test("ИНН проверяется по контрольной сумме: 10 знаков и 12 у ИП", () => {
  assert.equal(isValidInn("4630000790"), true);
  assert.equal(isValidInn("7707083893"), true);
  assert.equal(isValidInn("4630000791"), false);
  assert.equal(isValidInn("463000079"), false);
  assert.equal(isValidInn(""), false);
});

test("категория ФНС переводится в микро/малое/среднее", () => {
  assert.equal(mapSmpCategory(1), "micro");
  assert.equal(mapSmpCategory(2), "small");
  assert.equal(mapSmpCategory(3), "medium");
  assert.equal(mapSmpCategory(0), undefined);
  assert.equal(mapSmpCategory(undefined), undefined);
});

test("строка реестра ищется по ИНН, а не по частичному совпадению", () => {
  const payload = {
    data: [
      { inn: "4630000790", name_ex: "ПЕРВОЕ" },
      { inn: "4630000791", name_ex: "ВТОРОЕ" },
    ],
  };

  assert.equal(pickRow(payload, "4630000791")?.name_ex, "ВТОРОЕ");
  assert.equal(pickRow(payload, "4630000790")?.name_ex, "ПЕРВОЕ");
  assert.equal(pickRow(payload, "4699999999"), null);
  assert.equal(pickRow(NOT_FOUND, "4630000790"), null);
});

test("ответ ФНС превращается в документ справочника с датой сверки", () => {
  const doc = buildLookupDoc({
    inn: "4630000790",
    row: FOUND.data[0],
    checkedAt: "2026-11-24T08:00:00.000Z",
  });

  assert.equal(doc.inn, "4630000790");
  assert.equal(doc.name, 'АКЦИОНЕРНОЕ ОБЩЕСТВО "КУРСКТАРА"');
  assert.equal(doc.category, "micro");
  assert.equal(doc.region, "46");
  assert.equal(doc.includedAt, "2017-08-10");
  assert.equal(doc.found, true);
  assert.equal(doc.isActive, true);
  assert.equal(doc.source, "fns-live");
  assert.equal(doc.checkedAt, "2026-11-24T08:00:00.000Z");
});

test("отсутствие записи — это `found: false` с датой, а не пустота", () => {
  const doc = buildLookupDoc({
    inn: "7799999999",
    row: null,
    checkedAt: "2026-11-24T08:00:00.000Z",
  });

  assert.equal(doc.found, false);
  assert.equal(doc.isActive, false);
  assert.equal(doc.checkedAt, "2026-11-24T08:00:00.000Z");
});

test("исключённый из реестра: found, но не активен — отдельный вердикт", () => {
  const doc = buildLookupDoc({
    inn: "7712345678",
    row: { ...FOUND.data[0], inn: "7712345678", is_active: 0 },
  });

  assert.equal(doc.found, true);
  assert.equal(doc.isActive, false);
  assert.equal(doc.note, "исключён из реестра МСП");
  assert.equal(docToAnswer(doc).status, "excluded");
});

test("сверка через сервис: найдено, не найдено и недоступность", async () => {
  const found = await lookupInn("4630000790", {
    fetchImpl: fakeFetch(FOUND),
  });
  assert.equal(found.status, "in_registry");
  assert.equal(found.cached, false);

  const missing = await lookupInn("7707083893", {
    fetchImpl: fakeFetch(NOT_FOUND),
  });
  assert.equal(missing.status, "out_of_registry");

  await assert.rejects(() =>
    lookupInn("4630000790", {
      fetchImpl: async () => ({ ok: false, status: 503 }),
    }),
  );
});

test("некорректный ИНН не ходит в сеть и не считается вердиктом", async () => {
  let called = false;
  const answer = await lookupInn("4630000791", {
    fetchImpl: async () => {
      called = true;
      return { ok: true, json: async () => FOUND };
    },
  });

  assert.equal(called, false);
  assert.equal(answer.status, "invalid");
  assert.equal(answer.found, false);
  assert.ok(answer.error);
});

test("ответ API не выдаёт «не найдено» за запись справочника", () => {
  const found = docToAnswer(
    buildLookupDoc({ inn: "4630000790", row: FOUND.data[0] }),
    true,
  );
  assert.equal(found.status, "in_registry");
  assert.equal(found.cached, true);
  assert.equal(found.category, "micro");

  const missing = docToAnswer(
    buildLookupDoc({ inn: "7799999999", row: null }),
    false,
  );
  assert.equal(missing.status, "out_of_registry");
  assert.equal(missing.found, false);
});

test("кэш живёт TTL: свежий ответ ФНС повторно не запрашивается", () => {
  const doc = { checkedAt: "2026-11-01T00:00:00.000Z" };
  const day = 24 * 60 * 60 * 1000;

  assert.equal(isLookupFresh(doc, Date.parse("2026-11-10T00:00:00.000Z")), true);
  assert.equal(
    isLookupFresh(doc, Date.parse("2026-11-01T00:00:00.000Z") + 45 * day),
    false,
  );
  assert.equal(isLookupFresh({}), false);
  assert.equal(isLookupFresh({ checkedAt: "не дата" }), false);
});
