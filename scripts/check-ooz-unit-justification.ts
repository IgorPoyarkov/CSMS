/**
 * Проверка ручной единицы характеристики КТРУ и обязательного обоснования.
 *
 * Запуск: node scripts/run-ts-check.mjs scripts/check-ooz-unit-justification.ts
 */
import {
  ObjectDescriptionSchema,
  validateObjectDescriptionCompliance,
} from "../src/services/ObjectDescription/objectDescription.schema";
import {
  ktruToObjectCharacteristics,
  mergeKtruCharacteristics,
} from "../src/services/ObjectDescription/descriptionTemplates";
import { KtruRefSchema } from "../src/services/KtruRef/ktruRef.schema";

let failures = 0;

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  }
};

const ktru = KtruRefSchema.parse({
  ktruCode: "49.31.21.110-00000054",
  okpd2Code: "49.31.21.110",
  name: "Услуга по перевозкам",
  characteristics: [
    {
      id: "c1",
      name: "Класс транспортного средства",
      unit: "",
      valueType: "text",
      isMandatory: true,
    },
  ],
});

const fromKtru = ktruToObjectCharacteristics(ktru)[0];
assert(
  fromKtru.unitManuallyChanged === false &&
    fromKtru.unitChangeJustification === "",
  "характеристика КТРУ не считает единицу изменённой",
);

const withManualUnit = (justification: string, manuallyChanged = true) =>
  ObjectDescriptionSchema.parse({
    title: "Проверка единицы",
    okpd2Code: "49.31.21.110",
    characteristics: [
      {
        ...fromKtru,
        unit: "шт",
        unitManuallyChanged: manuallyChanged,
        unitChangeJustification: justification,
      },
    ],
  });

const unitIssues = (justification: string, manuallyChanged = true) =>
  validateObjectDescriptionCompliance(
    withManualUnit(justification, manuallyChanged),
  ).filter((issue) => issue.code === "KTRU_UNIT_CHANGE_UNJUSTIFIED");

const missing = unitIssues("");
assert(missing.length === 1, "ручная единица без обоснования → ошибка");
assert(missing[0]?.level === "error", "уровень ошибки — error");

const justified = unitIssues("В позиции КТРУ единица не указана.");
assert(justified.length === 0, "с обоснованием ошибки нет");
assert(
  unitIssues("", false).length === 0,
  "без признака ручного изменения ошибки нет",
);

// Повторная подстановка КТРУ не должна терять принятое решение пользователя.
const merged = mergeKtruCharacteristics(
  [
    {
      ...fromKtru,
      unit: "шт",
      unitManuallyChanged: true,
      unitChangeJustification: "В позиции КТРУ единица не указана.",
    },
  ],
  [fromKtru],
);
assert(
  merged[0].unitManuallyChanged === true &&
    merged[0].unitChangeJustification === "В позиции КТРУ единица не указана.",
  "при отсутствии единицы в КТРУ ручное значение сохраняется",
);

const ktruWithUnit = KtruRefSchema.parse({
  ...ktru,
  characteristics: [{ ...ktru.characteristics[0], unit: "шт" }],
});
const mergedWithCatalogUnit = mergeKtruCharacteristics(
  [
    {
      ...fromKtru,
      unit: "шт",
      unitManuallyChanged: true,
      unitChangeJustification: "В позиции КТРУ единица не указана.",
    },
  ],
  ktruToObjectCharacteristics(ktruWithUnit),
);
assert(
  mergedWithCatalogUnit[0].unitManuallyChanged === false &&
    mergedWithCatalogUnit[0].unitChangeJustification === "",
  "если единица есть в КТРУ, ручное изменение сбрасывается",
);

if (failures > 0) {
  console.error(`Проверка единицы КТРУ: ${failures} неудач(а)`);
  process.exitCode = 1;
} else {
  console.log("Проверка единицы КТРУ: 7/7 — ок");
}
