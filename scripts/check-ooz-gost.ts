/**
 * Проверка честного предупреждения об устаревших ГОСТах в ООЗ.
 *
 * Запуск: node scripts/run-ts-check.mjs scripts/check-ooz-gost.ts
 * Справочник ГОСТов не используется: год берётся только из обозначения,
 * поэтому проверка целиком локальная и не зависит от ЕИС. Локальный снимок
 * новых ГОСТов даёт только подсказки в редакторе и не влияет на предупреждение.
 */
import {
  MODERN_GOST_MIN_YEAR,
  ObjectDescriptionSchema,
  gostPublicationYear,
  validateObjectDescriptionCompliance,
  type ObjectStandardRef,
} from "../src/services/ObjectDescription/objectDescription.schema";

let failures = 0;

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  }
};

const standard = (id: string, code: string): ObjectStandardRef => ({
  id,
  standardType: "GOST",
  code,
  title: "",
  hasDeviation: false,
  deviationJustification: "",
});

const gostWarnings = (standards: ObjectStandardRef[]) => {
  const desc = ObjectDescriptionSchema.parse({
    title: "Проверка ГОСТ",
    okpd2Code: "10.00.00.000",
    standards,
  });
  return validateObjectDescriptionCompliance(desc).filter(
    (issue) => issue.code === "GOST_NOT_MODERN",
  );
};

// Год из обозначения: четырёхзначный и двухзначный вариант, мусор → null.
assert(
  gostPublicationYear("ГОСТ Р 2.102-2023") === 2023,
  "ГОСТ Р 2.102-2023 → 2023",
);
assert(
  gostPublicationYear("ГОСТ 10382-85") === 1985,
  "ГОСТ 10382-85 → 1985",
);
assert(gostPublicationYear("ГОСТ без года") === null, "без года → null");

// Нет ГОСТов: предупреждение, но не ошибка — сохранение не блокируется.
const none = gostWarnings([]);
assert(none.length === 1, "нет ГОСТов → одно предупреждение");
assert(none[0]?.level === "warning", "уровень предупреждения — warning");

// Все ГОСТы старше порога: честное предупреждение.
const old = gostWarnings([standard("1", "ГОСТ 10382-85")]);
assert(old.length === 1, "старый ГОСТ → одно предупреждение");
assert(
  old[0]?.message.includes(String(MODERN_GOST_MIN_YEAR)),
  "в тексте указан порог 2010",
);

// Современный ГОСТ (в том числе вместе со старым) предупреждения не даёт.
assert(
  gostWarnings([standard("1", "ГОСТ Р 50444-2020")]).length === 0,
  "современный ГОСТ → без предупреждения",
);
assert(
  gostWarnings([
    standard("1", "ГОСТ 10382-85"),
    standard("2", "ГОСТ Р 50444-2020"),
  ]).length === 0,
  "есть современная редакция → без предупреждения",
);

if (failures > 0) {
  console.error(`Проверка ГОСТ: ${failures} неудач(а)`);
  process.exitCode = 1;
} else {
  console.log("Проверка ГОСТ: 7/7 — ок");
}
