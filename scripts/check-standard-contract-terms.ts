import assert from "node:assert/strict";
import { StandardContractTermsCatalogSchema } from "../src/services/Npa/standardContractTerms.api";

/**
 * Контракт каталога типовых условий контрактов между csms-api и /legal/library.
 *
 * ASP.NET сериализует свойство RedId как redId (camelCase). Проверка фиксирует
 * имена полей снимка: расхождение в одном поле ломает zod-разбор и всю
 * группу карточек на экране библиотеки НПА.
 *
 * Запуск: npm run check:standard-terms (rolldown собирает TS, затем Node).
 */

const item = {
  code: "pp-1466",
  number: "1466",
  passing: "Постановление Правительства Российской Федерации от 23.12.2016 № 1466",
  title: "Об утверждении типовых условий контрактов",
  state: "Действует без изменений",
  adoptionDate: "2016-12-23",
  publicationNumber: "0001201612270012",
  cardUrl: "http://publication.pravo.gov.ru/Document/View/0001201612270012",
  sourceUrl: "http://actual.pravo.gov.ru/content/content.html#pnum=0001201612270012",
  redId: 410434,
  redDate: "20221031",
  isGovernment: true,
  alwaysApplies: true,
  text: "Типовые условия контрактов...",
  textSha256: "D7BA1DA812EC",
};

const catalog = {
  version: "standard-terms-test",
  generatedAt: "2026-11-28T00:00:00.000Z",
  source: "http://actual.pravo.gov.ru:8000/api/ebpi/",
  queries: ["типовые условия контрактов"],
  items: [item],
};

const parsed = StandardContractTermsCatalogSchema.parse(catalog);
assert.equal(parsed.items[0].redId, 410434);
assert.equal(parsed.items[0].alwaysApplies, true);

// Старое имя redid (как в seed-файле бэка) в API не приходит: если оно вернётся,
// разбор должен упасть здесь, а не сообщением об ошибке на странице.
assert.throws(() =>
  StandardContractTermsCatalogSchema.parse({
    ...catalog,
    items: [{ ...item, redId: undefined, redid: 410434 }],
  }),
);

console.log("check:standard-terms - контракт API типовых условий корректен");
