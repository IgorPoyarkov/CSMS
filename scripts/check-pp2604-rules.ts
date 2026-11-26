import assert from "node:assert/strict";
import {
  OBJECT_CATEGORY_LIMITS,
  PP2604_APPENDIX2_SOURCE,
  PP2604_OFFLINE_MAPPING,
  detectObjectCategory,
  evaluateBids,
  isOkpd2CodeFormatValid,
  resolveOkpd2Category,
  validateBidEvaluation,
} from "../src/services/BidEvaluation/bidEvaluation.schema";
import type {
  Bid,
  Criterion,
  Indicator,
} from "../src/services/BidEvaluation/bidEvaluation.schema";
import type { Pp2604Mapping } from "../src/services/Pp2604/pp2604.schema";

/**
 * Smoke-проверка правил ОКПД2 → приложение N 2 ПП РФ N 2604.
 * Запуск: npm run check:pp2604 (rolldown собирает TS, затем выполняет Node).
 * Бакет с длиной префикса и источник связи проверяются на реальных кодах.
 */

const issueLevels = (
  config: Parameters<typeof validateBidEvaluation>[0],
): Array<{ level: string; message: string }> =>
  validateBidEvaluation(config, { checkIndicators: false, checkBids: false }).map(
    ({ level, message }) => ({ level, message }),
  );

// Источник пределов — официальное опубликование, 20 позиций приложения N 2.
assert.equal(PP2604_APPENDIX2_SOURCE.eoNumber, "0001202201040005");
assert.equal(OBJECT_CATEGORY_LIMITS.length, 20);
const itSystems = OBJECT_CATEGORY_LIMITS.find((item) => item.id === "it_systems");
assert.equal(itSystems?.appendixRow, 12);
assert.equal(itSystems?.minPrice, 30);
assert.equal(itSystems?.maxNonCost, 70);
assert.match(itSystems?.appendixName ?? "", /государственных/);

// Офлайн-снимок — тот же контракт, что отдаёт /api/pp2604/mapping: 20 позиций,
// связи с источником и явным признаком проверки, версия импортёра.
assert.equal(PP2604_OFFLINE_MAPPING.rulesVersion, "pp2604-rules-v1");
assert.equal(PP2604_OFFLINE_MAPPING.source.eoNumber, "0001202201040005");
assert.equal(PP2604_OFFLINE_MAPPING.categories.length, 20);
assert.equal(PP2604_OFFLINE_MAPPING.rules.length, 57);
assert.deepEqual(
  PP2604_OFFLINE_MAPPING.categories.map((item) => item.appendixRow),
  OBJECT_CATEGORY_LIMITS.map((item) => item.appendixRow),
);
PP2604_OFFLINE_MAPPING.rules.forEach((rule) => {
  assert.ok(rule.source.length > 0);
  assert.ok(["classifier", "purpose", "residual"].includes(rule.basis));
  assert.equal(typeof rule.needsReview, "boolean");
});

// Самый длинный префикс побеждает общий раздел.
assert.equal(resolveOkpd2Category("42.11.21").category, "road");
assert.equal(resolveOkpd2Category("42.12").category, "construction");
assert.equal(resolveOkpd2Category("43.3").category, "building_repair");
assert.equal(resolveOkpd2Category("43.2").category, "construction");
assert.equal(resolveOkpd2Category("71.11.23").category, "cultural_heritage");
assert.equal(resolveOkpd2Category("71.2").category, "expertise");

// Переданный каталог (например, полученный из API) имеет приоритет над
// захардкоженными правилами: проверяем подмену связи на конкретном префиксе.
const apiLikeMapping: Pp2604Mapping = {
  ...PP2604_OFFLINE_MAPPING,
  rules: PP2604_OFFLINE_MAPPING.rules.map((rule) =>
    rule.prefix === "42.11"
      ? { ...rule, category: "expertise", row: 20 }
      : rule,
  ),
};
assert.equal(resolveOkpd2Category("42.11.21", undefined, apiLikeMapping).category, "expertise");
assert.equal(
  detectObjectCategory(["42.11.21"], undefined, apiLikeMapping).category,
  "expertise",
);

// Отсутствующий и невалидный код уходят на ручную проверку.
assert.equal(isOkpd2CodeFormatValid("10.11.1"), true);
assert.equal(isOkpd2CodeFormatValid("10..11"), false);
const missing = resolveOkpd2Category(undefined);
assert.equal(missing.category, undefined);
assert.equal(missing.needsReview, true);
assert.match(missing.reason ?? "", /не указан/);
const invalid = resolveOkpd2Category("10..11");
assert.equal(invalid.category, undefined);
assert.equal(invalid.needsReview, true);

// Цель закупки переводит 10/11 в позицию 13.
const food = resolveOkpd2Category("10.11.11", "food_for_social_orgs");
assert.equal(food.category, "food_catering");
assert.equal(food.basis, "purpose");
assert.equal(food.row, 13);
assert.match(food.source ?? "", /поз\. 13/);
assert.equal(food.needsReview, false);

// Неоднозначная связь несёт причину и источник.
const ambiguous = resolveOkpd2Category("62.01");
assert.equal(ambiguous.category, "it_systems");
assert.equal(ambiguous.needsReview, true);
assert.match(ambiguous.source ?? "", /поз\. 12/);
assert.match(ambiguous.reason ?? "", /государственные|муниципальные/i);

// Несколько кодов: конфликт, нераспознанный код и итоговая проверка.
const detection = detectObjectCategory(["69.1", "86.01", "bad"]);
assert.equal(detection.conflict, true);
assert.deepEqual(detection.unmatched, ["bad"]);
assert.equal(detection.category, undefined);
assert.equal(detection.needsReview, false);

const base = {
  organizationId: "org-1",
  objectCategory: "goods" as const,
  okpd2Codes: ["26.11"],
  procedureKind: "tender" as const,
  nmck: "1000",
  criteria: [
    { type: "price" as const, enabled: true, weightPercent: 70, indicators: [] },
    {
      type: "characteristics" as const,
      enabled: true,
      weightPercent: 30,
      indicators: [],
    },
  ],
  bids: [],
  status: "draft" as const,
};

assert.ok(
  !issueLevels(base).some(
    (issue) =>
      issue.level === "error" && /Категория|.не соответствует ОКПД2/.test(issue.message),
  ),
);
assert.ok(
  issueLevels({ ...base, okpd2Codes: ["bad"] }).some(
    (issue) => issue.level === "error" && /не распознан/.test(issue.message),
  ),
);
assert.ok(
  issueLevels({ ...base, okpd2Codes: [] }).some(
    (issue) => issue.level === "warning" && /Код ОКПД2 не указан/.test(issue.message),
  ),
);
assert.ok(
  issueLevels({ ...base, okpd2Codes: ["62.01"], objectCategory: "works_services" }).some(
    (issue) => issue.level === "warning" && /Источник: .*поз\. 12/.test(issue.message),
  ),
);

// Направление и способ оценки: «направление не применяется» допустимо только
// вне формулы п. 20, а иной порядок (п. 22) требует описания порядка и
// автоматически не рассчитывается.
const criterionWithIndicator = (indicator: Partial<Indicator>): Criterion[] => [
  {
    id: "crit-price",
    type: "price",
    enabled: true,
    weightPercent: 60,
    indicators: [],
    note: "",
  },
  {
    id: "crit-qualification",
    type: "qualification",
    enabled: true,
    weightPercent: 40,
    indicators: [
      {
        id: "ind-experience",
        name: "Опыт работы по предмету контракта",
        kind: "experience",
        weightPercent: 100,
        best: "none",
        scoring: "formula",
        ...indicator,
      },
    ],
    note: "",
  },
];

const indicatorIssues = (indicator: Partial<Indicator>) =>
  validateBidEvaluation(
    {
      procedureKind: "tender",
      objectCategory: "goods",
      nmck: "1000",
      okpd2Codes: ["26.11"],
      status: "draft",
      bids: [],
      criteria: criterionWithIndicator(indicator),
    },
    { checkBids: false },
  );

assert.ok(
  indicatorIssues({}).some(
    (issue) => issue.level === "error" && /по формуле \(п\. 20/.test(issue.message),
  ),
  "формула без направления должна давать ошибку",
);
assert.ok(
  indicatorIssues({ scoring: "other" }).some(
    (issue) => issue.level === "error" && /опишите иной порядок/.test(issue.message),
  ),
  "иной порядок без текста должен давать ошибку",
);
assert.ok(
  indicatorIssues({
    scoring: "other",
    otherOrder: "Балл = 100 − отклонение от лучшего предложения, %",
  }).some(
    (issue) => issue.level === "warning" && /не рассчитываются/.test(issue.message),
  ),
  "иной порядок с текстом — предупреждение о ручном расчёте",
);
assert.ok(
  !indicatorIssues({ scoring: "scale", scaleText: "да = 100" }).some(
    (issue) => issue.level === "error" && /по формуле \(п\. 20/.test(issue.message),
  ),
  "шкале направление не требуется",
);

// Расчёт с новыми значениями справочников: иной порядок оценки и «направление
// не применяется» не ломают evaluateBids — показатель даёт 0 автоматических
// баллов, остальные критерии считаются как обычно.
const sampleBids: Bid[] = [
  {
    id: "bid-1",
    participantName: "Участник 1",
    price: "900",
    values: {},
    totalScore: 0,
    rank: 0,
  },
  {
    id: "bid-2",
    participantName: "Участник 2",
    price: "800",
    values: {},
    totalScore: 0,
    rank: 0,
  },
];

const otherOrderEvaluation = evaluateBids({
  nmck: "1000",
  criteria: criterionWithIndicator({
    scoring: "other",
    otherOrder: "Балл = 100 − отклонение от лучшего предложения, %",
  }),
  bids: sampleBids,
});
assert.equal(otherOrderEvaluation.bids.length, 2);
assert.ok(
  otherOrderEvaluation.bids.every((bid) => Number.isFinite(bid.totalScore)),
  "иной порядок оценки не должен ломать расчёт баллов",
);

const noneDirectionEvaluation = evaluateBids({
  nmck: "1000",
  criteria: criterionWithIndicator({ best: "none", scoring: "formula" }),
  bids: sampleBids,
});
assert.ok(
  noneDirectionEvaluation.bids.every((bid) => bid.totalScore > 0),
  "цена считается, а показатель без направления даёт 0",
);

console.log("Проверки ПП РФ N 2604 / ОКПД2 пройдены.");
