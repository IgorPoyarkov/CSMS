/**
 * Проверка локального снимка новых ГОСТов и подсказок в ООЗ.
 *
 * Запуск: node scripts/run-ts-check.mjs scripts/check-ooz-gost-catalog.ts
 *
 * Снимок лежит в public/gost/catalog.json и обновляется монитором
 * scripts/gost-monitor.mjs. Предупреждение GOST_NOT_MODERN при этом не меняется:
 * оно по-прежнему считается только из обозначения, без справочника.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ObjectDescriptionSchema,
  validateObjectDescriptionCompliance,
  type ObjectStandardRef,
} from "../src/services/ObjectDescription/objectDescription.schema";
import {
  findGostInCatalog,
  GostCatalogSchema,
  gostHintSummary,
} from "../src/services/GostRef/gostRef.schema";
import {
  findGostRequirements,
  GostRequirementsCatalogSchema,
} from "../src/services/GostRef/gostRequirements.schema";

const file = path.resolve("public/gost/catalog.json");
let checks = 0;
let failures = 0;

const assert = (condition: boolean, message: string) => {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  }
};

const catalog = GostCatalogSchema.parse(JSON.parse(readFileSync(file, "utf8")));

assert(catalog.itemCount === catalog.items.length, "itemCount совпадает с массивом");
assert(catalog.itemCount > 0, "снимок не пустой");
assert(/^gost-\d{8}-[0-9a-f]{12}$/.test(catalog.version), "версия снимка");
assert(
  catalog.items.every((item) => item.designation && item.title && item.text),
  "у всех карточек есть обозначение, название и локальный текст",
);
assert(
  catalog.items.every((item) => item.sourceUrl.startsWith("https://protect.gost.ru/gost/details/")),
  "источник карточки — protect.gost.ru",
);
assert(
  catalog.items.every((item) => /принят/i.test(item.status)),
  "в снимке только новые ГОСТы со статусом «Принят»",
);

const first = catalog.items[0];
assert(findGostInCatalog(catalog, first.designation)?.id === first.id, "поиск по точному обозначению");
assert(
  findGostInCatalog(catalog, `  ${first.designation.toLowerCase()}  `)?.id === first.id,
  "поиск нормализует регистр и пробелы",
);
assert(findGostInCatalog(catalog, "ГОСТ 00000-9999") === null, "неизвестный ГОСТ не подсказывается");
assert(
  gostHintSummary(first).includes(first.status) &&
    gostHintSummary(first).includes(first.scope.slice(0, 20)),
  "сводка подсказки содержит статус и область применения",
);

// Требования из полного текста: каждая подстановка обязана иметь цитату,
// дословно присутствующую в сохранённом тексте документа.
const requirementsFile = path.resolve("public/gost/requirements.json");
const requirements = GostRequirementsCatalogSchema.parse(
  JSON.parse(readFileSync(requirementsFile, "utf8")),
);
assert(
  requirements.itemCount === requirements.items.length && requirements.itemCount > 0,
  "снимок требований не пустой и itemCount верен",
);
assert(/^gost-req-\d{8}-[0-9a-f]{12}$/.test(requirements.version), "версия снимка требований");
const firstRequirementItem = requirements.items[0];
assert(
  firstRequirementItem.requirements.every((item) => item.quote.trim().length >= 10),
  "у каждого требования есть цитата",
);
const snapshotText = readFileSync(
  path.resolve("docs/snapshots/gost/fulltext", firstRequirementItem.snapshotFile),
  "utf8",
).replace(/\s+/g, " ");
assert(
  firstRequirementItem.requirements.every((item) =>
    snapshotText.includes(item.quote.replace(/\s+/g, " ")),
  ),
  "цитаты дословно совпадают с текстом документа",
);
assert(
  findGostRequirements(requirements, "ГОСТ 1232-2017").some(
    (item) => item.field === "warrantyTermMonths" && item.value === "60",
  ),
  "гарантийный срок из ГОСТа находится по обозначению",
);
assert(
  findGostRequirements(requirements, "ГОСТ 00000-9999").length === 0,
  "неизвестному ГОСТу требования не подставляются",
);

// Старое поведение сохранено: GOST_NOT_MODERN остаётся warning, а не ошибкой.
const standard = (id: string, code: string): ObjectStandardRef => ({
  id,
  standardType: "GOST",
  code,
  title: "",
  hasDeviation: false,
  deviationJustification: "",
});
const warnings = (code: string) => {
  const desc = ObjectDescriptionSchema.parse({
    title: "Проверка ГОСТ",
    okpd2Code: "10.00.00.000",
    standards: [standard("1", code)],
  });
  return validateObjectDescriptionCompliance(desc).filter(
    (issue) => issue.code === "GOST_NOT_MODERN",
  );
};
assert(warnings("ГОСТ 10382-85").length === 1, "старый ГОСТ по-прежнему даёт GOST_NOT_MODERN");
assert(warnings("ГОСТ 10382-85")[0]?.level === "warning", "предупреждение не блокирует запись");
assert(warnings(first.designation).length === 0, "новый ГОСТ из снимка предупреждения не даёт");

if (failures > 0) {
  console.error(`Проверка снимка ГОСТ: ${failures}/${checks} неудач(а)`);
  process.exitCode = 1;
} else {
  console.log(`Проверка снимка ГОСТ: ${checks}/${checks} — ок`);
}
