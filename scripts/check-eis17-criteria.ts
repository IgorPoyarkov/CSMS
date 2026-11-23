import assert from "node:assert/strict";
import {
  EIS_PLACING_WAY_CONSTRUCTION_DOCS,
  buildEis17CriteriaXml,
  mapCriterionTypeToEis17,
  mapNoticeCriteriaToEis17,
  parseEis17Criteria,
  validateNoticeCriteria2604,
} from "../src/services/Eis/eis17Types";
import { CRITERION_EIS_CODES } from "../src/services/Procurements/noticeInfo.config";
import {
  EIS_NATIONAL_REGIME_NPA_CODE,
  EIS_NATIONAL_REGIME_RESTRICTION_CODE,
} from "../src/services/NationalRegime/pp1875";
import {
  NoticeInfoSchema,
  type NoticeInfoFormValues,
} from "../src/services/Procurements/noticeInfo.schema";

/**
 * Smoke-проверка интеграции ПП РФ № 2604 в XML-схемы и типы извещения.
 *
 * Проверяются: коды критериев XSD 17.0 (CP/MC/TC/EN, QF/QO), маппинг
 * критериев и показателей из служебной записки, сериализация criteriaInfo
 * по IntegrationEPTypes.xsd, обратная десериализация, проверки значимости
 * и пределов приложения № 2, а также связь закупки с проектом контракта.
 *
 * Запуск: npm run check:eis17-criteria.
 */

type NoticeCriteria =
  NoticeInfoFormValues["participantsRequirements"]["evaluationCriteria"];

const criterion = (
  patch: Partial<NoticeCriteria[number]>,
): NoticeCriteria[number] => ({
  id: "criterion",
  type: "price",
  enabled: true,
  weightPercent: 0,
  ...patch,
});

const noticeWithCriteria = (
  criteria: NoticeCriteria,
  placingWayCode = "OKP20",
  notificationType: "EOK2020" | "EF2020" = "EOK2020",
): NoticeInfoFormValues =>
  ({
    notificationType,
    generalInfo: { placingWayCode },
    participantsRequirements: { evaluationCriteria: criteria },
  }) as unknown as NoticeInfoFormValues;

// 1. Коды критериев XSD 17.0 не перепутаны: MC — расходы, TC — жизненный
// цикл, QF — характеристики, QO — квалификация.
assert.deepEqual(mapCriterionTypeToEis17("price"), {
  group: "cost",
  code: "CP",
});
assert.deepEqual(mapCriterionTypeToEis17("exploitation_expenses"), {
  group: "cost",
  code: "MC",
});
assert.deepEqual(mapCriterionTypeToEis17("lifecycle_cost"), {
  group: "cost",
  code: "TC",
});
assert.deepEqual(mapCriterionTypeToEis17("energy_service_expenses"), {
  group: "cost",
  code: "EN",
});
assert.deepEqual(mapCriterionTypeToEis17("qualitative_characteristics"), {
  group: "qualitative",
  code: "QF",
});
assert.deepEqual(mapCriterionTypeToEis17("qualification"), {
  group: "qualitative",
  code: "QO",
});

assert.equal(CRITERION_EIS_CODES.exploitation_expenses, "MC");
assert.equal(CRITERION_EIS_CODES.lifecycle_cost, "TC");
assert.equal(CRITERION_EIS_CODES.qualitative_characteristics, "QF");
assert.equal(CRITERION_EIS_CODES.qualification, "QO");
// Коды нацрежима тоже берём из одного места — правил ПП РФ № 1875.
assert.equal(EIS_NATIONAL_REGIME_RESTRICTION_CODE, "JB2149");
assert.equal(EIS_NATIONAL_REGIME_NPA_CODE, "PP1875");

// 2. Маппинг критериев и показателей из СЗ в структуру извещения.
const mappedCriteria = mapNoticeCriteriaToEis17(
  noticeWithCriteria([
    criterion({ id: "c-price", type: "price", weightPercent: 60 }),
    criterion({
      id: "c-quality",
      type: "qualitative_characteristics",
      weightPercent: 40,
      additionalInfo: "Оценка по п. 20 Положения",
      indicators: [
        {
          id: "i-quality",
          name: "Качество работ",
          weightPercent: 70,
          best: "max",
          scoring: "formula",
          unit: "балл",
          limitMin: 0,
          limitMax: 100,
        },
        {
          id: "i-eco",
          name: "Экологичность",
          weightPercent: 30,
          best: "min",
          scoring: "scale",
          scaleText: "Шкала 1–5",
        },
      ],
    }),
    criterion({
      id: "c-disabled",
      type: "qualification",
      enabled: false,
      weightPercent: 0,
    }),
  ]),
);

assert.equal(mappedCriteria.length, 2);
assert.equal(mappedCriteria[0].code, "CP");
assert.equal(mappedCriteria[1].code, "QF");
assert.equal(mappedCriteria[1].addInfo, "Оценка по п. 20 Положения");
assert.equal(mappedCriteria[1].indicators.length, 2);
assert.equal(mappedCriteria[1].indicators[0].measurementOrder, "F");
assert.equal(mappedCriteria[1].indicators[1].measurementOrder, "L");
assert.equal(mappedCriteria[1].indicators[1].addInfo, "Шкала 1–5");

// 3. Аукцион: Положение № 2604 не применяется, но XSD требует criteriaInfo —
// выгружается единственный критерий «цена» со значимостью 100 %.
const auctionCriteria = mapNoticeCriteriaToEis17(
  noticeWithCriteria([], "EA20", "EF2020"),
);
assert.equal(auctionCriteria.length, 1);
assert.equal(auctionCriteria[0].code, "CP");
assert.equal(auctionCriteria[0].valueInfo, 100);

// 4. Сериализация criteriaInfo по XSD 17.0: cost/qualitative-ветки,
// показатели, порядок оценки; устаревшего criterionCode быть не должно.
const criteriaXml = buildEis17CriteriaXml(mappedCriteria, {
  includeCertainWorks: true,
  isCertainWorks: false,
});

assert.ok(criteriaXml.startsWith("<criteriaInfo>"));
assert.ok(criteriaXml.includes("<isCertainWorks>false</isCertainWorks>"));
assert.ok(
  criteriaXml.includes(
    "<costCriterionInfo><code>CP</code><valueInfo>60</valueInfo></costCriterionInfo>",
  ),
);
assert.ok(
  criteriaXml.includes(
    "<qualitativeCriterionInfo><code>QF</code><valueInfo>40</valueInfo>",
  ),
);
assert.ok(criteriaXml.includes("<indicatorsInfo>"));
assert.ok(criteriaXml.includes("<measurementOrder>F</measurementOrder>"));
assert.ok(criteriaXml.includes("<measurementOrder>L</measurementOrder>"));
assert.ok(criteriaXml.includes("<addInfo>Шкала 1–5</addInfo>"));
assert.ok(!criteriaXml.includes("<criterionCode>"));

// 5. Десериализация восстанавливает критерии и показатели (round-trip).
const parsedCriteria = parseEis17Criteria(criteriaXml);
assert.equal(parsedCriteria.length, 2);
assert.deepEqual(
  parsedCriteria.map((item) => ({
    group: item.group,
    code: item.code,
    valueInfo: item.valueInfo,
  })),
  [
    { group: "cost", code: "CP", valueInfo: 60 },
    { group: "qualitative", code: "QF", valueInfo: 40 },
  ],
);
assert.equal(parsedCriteria[1].addInfo, "Оценка по п. 20 Положения");
assert.equal(parsedCriteria[1].indicators.length, 2);
assert.equal(parsedCriteria[1].indicators[0].name, "Качество работ");
assert.equal(parsedCriteria[1].indicators[0].value, 70);
assert.equal(parsedCriteria[1].indicators[1].measurementOrder, "L");
assert.equal(parsedCriteria[1].indicators[1].addInfo, "Шкала 1–5");

// 6. Корректный конкурс по категории «образовательные услуги» (поз. 17:
// цена ≥ 40 %, нестоимостные ≤ 60 %) — ошибок нет.
const validContest = validateNoticeCriteria2604(mappedCriteria, {
  notificationType: "EOK2020",
  placingWayCode: "OKP20",
  objectCategory: "education",
});
assert.equal(
  validContest.filter((issue) => issue.severity === "error").length,
  0,
);

// 7. Сумма значимостей критериев не 100 % — ошибка.
const wrongSum = validateNoticeCriteria2604(
  [
    { group: "cost", code: "CP", valueInfo: 60, indicators: [] },
    { group: "qualitative", code: "QF", valueInfo: 30, indicators: [] },
  ],
  { notificationType: "EOK2020" },
);
assert.ok(
  wrongSum.some(
    (issue) =>
      issue.severity === "error" && /должно быть 100/.test(issue.message),
  ),
);

// 8. Для конкурса цена обязательна.
const withoutPrice = validateNoticeCriteria2604(
  [{ group: "qualitative", code: "QF", valueInfo: 100, indicators: [] }],
  { notificationType: "EOK2020" },
);
assert.ok(
  withoutPrice.some(
    (issue) =>
      issue.severity === "error" && /цена контракта/.test(issue.message),
  ),
);

// 9. QF запрещён для подспособа OKB504 (XSD 17.0).
const qfForConstruction = validateNoticeCriteria2604(mappedCriteria, {
  notificationType: "EOK2020",
  placingWayCode: EIS_PLACING_WAY_CONSTRUCTION_DOCS,
});
assert.ok(
  qfForConstruction.some(
    (issue) => issue.severity === "error" && /OKB504/.test(issue.message),
  ),
);

// 10. Показатели нестоимостного критерия должны давать 100 %.
const wrongIndicators = validateNoticeCriteria2604(
  [
    { group: "cost", code: "CP", valueInfo: 60, indicators: [] },
    {
      group: "qualitative",
      code: "QF",
      valueInfo: 40,
      indicators: [
        {
          externalSid: "i1",
          name: "Показатель",
          value: 50,
          measurementOrder: "F",
        },
      ],
    },
  ],
  { notificationType: "EOK2020" },
);
assert.ok(
  wrongIndicators.some(
    (issue) =>
      issue.severity === "error" && /ожидается 100/.test(issue.message),
  ),
);

// 11. Пределы приложения № 2: цена ниже минимума и нестоимостные выше
// максимума для образовательных услуг.
const beyondLimits = validateNoticeCriteria2604(
  [
    { group: "cost", code: "CP", valueInfo: 30, indicators: [] },
    { group: "qualitative", code: "QF", valueInfo: 70, indicators: [] },
  ],
  {
    notificationType: "EOK2020",
    objectCategory: "education",
  },
);
assert.ok(
  beyondLimits.some(
    (issue) =>
      issue.severity === "error" && /ниже минимума/.test(issue.message),
  ),
);
assert.ok(
  beyondLimits.some(
    (issue) =>
      issue.severity === "error" && /выше максимума/.test(issue.message),
  ),
);

// 12. Аукцион: пустой набор критериев не блокируется Положением № 2604.
assert.equal(
  validateNoticeCriteria2604([], { notificationType: "EF2020" }).length,
  0,
);

// 13. Связь закупки с проектом контракта отражена в схеме извещения.
assert.ok("contractProjectId" in NoticeInfoSchema.shape);
assert.ok("contractProjectNumber" in NoticeInfoSchema.shape);

console.log(
  "Проверка критериев ПП РФ № 2604 пройдена: коды XSD 17.0, criteriaInfo, " +
    "пределы приложения № 2 и связь с проектом контракта.",
);
