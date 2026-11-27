import assert from "node:assert/strict";
import {
  StandardContractTermSchema,
  StandardContractTermsCatalogSchema,
} from "../src/services/Npa/standardContractTerms.api";
import {
  buildStandardContractTermsDocx,
  buildStandardTermNavigation,
  parseStandardContractTermsText,
  standardTermBlockId,
} from "../src/services/Npa/standardContractTermsWord";
import { emptyContractProject } from "../src/services/ContractProject/contractProject.schema";
import { buildContractDocument } from "../src/services/ContractProject/contractDocument";
import { buildContractDocumentDocx } from "../src/services/ContractProject/contractProjectExport";

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
  textSource: "pravo.gov.ru",
  pdfSha256: null,
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
assert.equal(parsed.items[0].textSource, "pravo.gov.ru");
assert.equal(parsed.items[0].pdfSha256, null);

// Карточка из фолбэка ЕИС: источник текста и хеш PDF обязаны разбираться,
// иначе карточка исчезнет с экрана после обновления каталога.
const eisItem = StandardContractTermSchema.parse({
  ...item,
  sourceUrl: "https://zakupki.gov.ru/epz/btk/btkCard/document-info.html?reestrNumber=1400700000525001",
  textSource: "pravo.gov.ru (снимок)",
  pdfSha256: "A".repeat(64),
});
assert.equal(eisItem.textSource, "pravo.gov.ru (снимок)");
assert.equal(eisItem.pdfSha256, "A".repeat(64));

// Старое имя redid (как в seed-файле бэка) в API не приходит: если оно вернётся,
// разбор должен упасть здесь, а не сообщением об ошибке на странице.
assert.throws(() =>
  StandardContractTermsCatalogSchema.parse({
    ...catalog,
    items: [{ ...item, redId: undefined, redid: 410434 }],
  }),
);

// Парсер для Word: размечает структуру, но сохраняет дословный текст снимка.
const sampleText = [
  "ПРАВИТЕЛЬСТВО РОССИЙСКОЙ ФЕДЕРАЦИИ",
  "ПОСТАНОВЛЕНИЕ",
  "от 14 ноября 2024 г. № 1550",
  "I. Условия об обязанностях исполнителя",
  "1. Выполнять работы:",
  "а) в установленный срок;",
  "– либо в иной срок.",
  "Обычный абзац с редакцией 4.1.",
].join("\n");
const blocks = parseStandardContractTermsText(sampleText);
assert.deepEqual(
  blocks.map((block) => block.kind),
  ["agency", "agency", "decree", "section", "clause", "subclause", "subclause", "paragraph"],
);
assert.equal(
  blocks.map((block) => block.text).join("\n"),
  sampleText,
  "парсер не должен менять текст и нумерацию",
);

const navigation = buildStandardTermNavigation(blocks);
assert.deepEqual(
  navigation.map((item) => item.level),
  [0, 0, 0, 1, 2, 3, 3],
  "в оглавлении должны быть шапка, раздел, пункт и подпункты",
);
assert.deepEqual(
  navigation.map((item) => item.id),
  [0, 1, 2, 3, 4, 5, 6].map(standardTermBlockId),
  "якорь оглавления должен вести к тому же абзацу снимка",
);

// Пустые строки снимка — только интервалы между абзацами, в Word они не
// переносятся, но все строки с текстом обязаны остаться в том же порядке.
const withBlankLines = "Шапка\n\n1. Пункт\n";
assert.equal(
  parseStandardContractTermsText(withBlankLines)
    .map((block) => block.text)
    .join("\n"),
  "Шапка\n1. Пункт",
);

const term = parsed.items[0];
const termDocx = await buildStandardContractTermsDocx(term);
assert.ok(termDocx.size > 1000, "Word типовых условий должен собираться");

// Выбранный акт попадает в текст проекта контракта.
const project = {
  ...emptyContractProject("1", "goods"),
  contractName: "Контракт на поставку",
  standardTerm: {
    code: term.code,
    number: term.number,
    passing: term.passing,
    title: term.title,
    redDate: term.redDate,
    sourceUrl: term.sourceUrl,
    cardUrl: term.cardUrl,
    textSource: term.textSource,
    textSha256: term.textSha256,
    text: sampleText,
  },
};
const contractDocument = buildContractDocument(project);
const termSection = contractDocument.sections.find(
  (section) => section.id === "standard-terms",
);
assert.ok(termSection, "типовые условия должны попадать в текст контракта");
assert.deepEqual(termSection.paragraphs, blocks.map((block) => block.text));
const projectDocx = await buildContractDocumentDocx(
  contractDocument,
  project.standardTerm,
);
assert.ok(projectDocx.size > 1000, "Word проекта контракта должен собираться");

console.log(
  "check:standard-terms - контракт API, Word типовых условий и проект контракта корректны",
);
