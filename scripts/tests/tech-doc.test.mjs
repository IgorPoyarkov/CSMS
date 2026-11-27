import assert from "node:assert/strict";
import test from "node:test";

import {
  detectTechDocSource,
  extractTechnicalRequirements,
  parseTechnicalDocument,
  techDocFilename,
  TECH_DOC_SOURCES,
} from "../lib/tech-doc.mjs";
import {
  designationOf,
  extractGostRequirements,
  parseGostText,
  warrantyMonths,
} from "../lib/allgosts.mjs";

const sample = `
ГОСТ 1232-2017
Изоляторы линейные штыревые. Общие технические условия
1 Область применения
Настоящий стандарт распространяется на изоляторы.
5 Технические требования
5.25.3 Упаковка - в соответствии с нормативными документами.
8 Методы испытаний
Дождевальная установка должна обеспечивать среднюю вертикальную составляющую интенсивности дождя.
9 Гарантии изготовителя
9.1 Изготовитель гарантирует соответствие изоляторов требованиям настоящего стандарта при соблюдении условий хранения, транспортирования, монтажа и эксплуатации.
9.2 Гарантийный срок эксплуатации изоляторов - пять лет со дня ввода в эксплуатацию.
`;

test("warrantyMonths: слова и цифры", () => {
  assert.equal(warrantyMonths("пять лет со дня ввода"), 60);
  assert.equal(warrantyMonths("3 года"), 36);
  assert.equal(warrantyMonths("18 месяцев"), 18);
  assert.equal(warrantyMonths("гарантия на изделия"), null);
});

test("parseGostText находит разделы и обозначение", () => {
  const parsed = parseGostText(sample);
  assert.equal(parsed.designation, "ГОСТ 1232-2017");
  assert.ok(parsed.sections.some((s) => /Гарантии изготовителя/i.test(s.heading)));
  assert.ok(parsed.text.includes("9.2 Гарантийный срок"));
});

test("требования извлекаются только с дословной цитатой", () => {
  const parsed = parseGostText(sample);
  const requirements = extractGostRequirements(parsed);
  const fields = requirements.map((r) => r.field);

  assert.ok(fields.includes("warrantyTermMonths"));
  assert.equal(
    requirements.find((r) => r.field === "warrantyTermMonths")?.value,
    "60",
  );
  assert.ok(
    requirements.some(
      (r) => r.label === "Гарантия на оборудование" && /9\.1 Изготовитель гарантирует/.test(r.value),
    ),
  );
  assert.ok(
    requirements.some(
      (r) => r.label === "Тара и упаковка" && /5\.25\.3 Упаковка/.test(r.value),
    ),
  );
  assert.ok(fields.includes("descriptionComponents.packaging"));
  // Упоминание монтажа в методе испытания не подставляется в ООЗ.
  assert.ok(!requirements.some((r) => r.label === "Монтаж и ввод в эксплуатацию"));
  assert.ok(requirements.every((r) => parsed.text.includes(r.quote)));
});

test("маркировка в перечне документов не становится упаковкой", () => {
  const parsed = parseGostText(`
ГОСТ 30593-2015
Системы отопления, вентиляции и кондиционирования
6 Требования к эффективности
Экспертиза технической документации (декларации изготовителя, технического описания, маркировок ТС и др.)
`);
  const fields = extractGostRequirements(parsed).map((r) => r.field);
  assert.ok(!fields.includes("otherRequirements"));
  assert.ok(!fields.includes("descriptionComponents.packaging"));
});

test("разбор HTML-страницы allgosts.ru", () => {
  const html = `<html><body><h1>ГОСТ 1232-2017</h1><article>
    <h2>9 Гарантии изготовителя</h2>
    <p>9.2 Гарантийный срок эксплуатации изоляторов - пять лет со дня ввода в эксплуатацию.</p>
  </article></body></html>`;
  const parsed = parseTechnicalDocument(html, {
    sourceUrl: "https://allgosts.ru/29/080/gost_1232-2017",
  });
  assert.equal(parsed.designation, "ГОСТ 1232-2017");
  assert.equal(parsed.source, "allgosts");
  assert.equal(parsed.sections[0]?.heading, "9 Гарантии изготовителя");
  assert.ok(parsed.text.includes("пять лет"));
});

test("единая точка входа выбирает парсер по виду снимка", () => {
  const fromText = parseTechnicalDocument(sample, {
    designation: "ГОСТ 1232-2017",
    sourceUrl: "https://allgosts.ru/29/080/gost_1232-2017",
  });
  assert.equal(fromText.designation, "ГОСТ 1232-2017");
  assert.deepEqual(
    extractTechnicalRequirements(fromText).map((r) => r.field),
    extractGostRequirements(parseGostText(sample)).map((r) => r.field),
  );
});

test("реестр источников и имена снимков", () => {
  assert.ok(TECH_DOC_SOURCES.length >= 2);
  assert.equal(detectTechDocSource("https://allgosts.ru/x")?.id, "allgosts");
  assert.equal(detectTechDocSource("gost-1232-2017.txt"), null);
  assert.equal(techDocFilename("ГОСТ 1232-2017"), "gost-1232-2017.txt");
  assert.equal(
    designationOf("ГОСТ 1232-2017 Изоляторы линейные. Общие технические условия"),
    "ГОСТ 1232-2017",
  );
});
