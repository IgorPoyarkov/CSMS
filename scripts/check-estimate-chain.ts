import assert from "node:assert/strict";
import {
  DefectListSchema,
  computeEstimateTotals,
  emptyDefectList,
  type DefectList,
} from "../src/services/DefectList/defectList.schema";
import {
  ContractEstimateDocumentSchema,
  canApproveEstimate,
  canEditEstimate,
  canViewEstimate,
  createEstimateFromDefect,
  estimateNmckDelta,
  estimateScheduleDelta,
  estimateScheduleTotal,
  estimateTotals,
  findEstimateForDefect,
  isEstimateEditable,
  isEstimateScheduleEmpty,
  rebuildEstimateSchedule,
  syncEstimateItemsFromDefect,
  syncScheduleFromDefect,
  type ContractEstimateDocument,
  type EstimateActor,
} from "../src/services/Estimate/estimate.schema";
import {
  estimateValidationSummary,
  validateEstimateDocument,
} from "../src/services/Estimate/estimate.validation";
import type { NmckCalculationRecord } from "../src/services/Nmck/nmck.schema";

/**
 * Smoke-проверка сквозного процесса «дефектовка → смета → НМЦК».
 * Запуск: npm run check:estimates (rolldown собирает TS, затем Node).
 *
 * Проверяются: обратная совместимость дефектовки, перенос позиций,
 * отсутствие дублирования расчётов, валидация, права и синхронизация.
 */

const baseDefect = (): DefectList => ({
  ...emptyDefectList(1, {
    employeeId: 10,
    employeeName: "Иванов Иван Иванович",
    structuralUnitName: "Служба заказчика",
  }),
  id: 101,
  objectName: "Ремонт кровли административного здания",
  basis: "Дефектный акт № 7 от 10.11.2026",
  status: "submitted",
  updatedAt: "2026-11-20",
  items: [
    {
      id: "i1",
      section: "Кровля",
      normCode: "ГЭСН 12-01-001",
      name: "Разборка покрытия",
      unit: "м2",
      quantity: "100",
      unitPrice: "250.50",
    },
    {
      id: "i2",
      section: "Кровля",
      normCode: "ГЭСН 12-01-002",
      name: "Устройство покрытия",
      unit: "м2",
      quantity: "100",
      unitPrice: "800",
    },
  ],
  estimate: {
    ...emptyDefectList(1).estimate,
    overheadPercent: 10,
    profitPercent: 5,
    vatPercent: 20,
  },
});

const nmckRecord = (total: number): NmckCalculationRecord => ({
  method: "market_analysis",
  calculatedAt: "2026-11-21",
  calculationDate: "2026-11-21",
  calculatorName: "Иванов И. И.",
  subject: "Ремонт кровли административного здания",
  quantity: "1",
  unit: "компл.",
  offers: [],
  activeCount: 0,
  meanUnitPrice: 0,
  minUnitPrice: 0,
  maxUnitPrice: 0,
  stdDev: 0,
  cvPercent: 0,
  isHomogeneous: true,
  nmckMinTotal: total,
  nmckTotal: total,
});

// 1. Обратная совместимость: старая дефектовка без estimateDocumentId.
const defect = DefectListSchema.parse(baseDefect());
assert.equal(defect.estimateDocumentId, undefined);
assert.equal(defect.items.length, 2);

// 2. Расчёты не дублируются: смета использует тот же движок.
const expectedTotals = computeEstimateTotals(defect);
assert.equal(expectedTotals.directCost, 105_050);
assert.equal(expectedTotals.overhead, 10_505);
assert.equal(expectedTotals.profit, 5_777.75);
assert.equal(expectedTotals.vat, 24_266.55);
assert.equal(expectedTotals.total, 145_599.3);

// 3. Перенос дефектовки в отдельный документ.
const document = createEstimateFromDefect(defect);
assert.equal(document.defectListId, 101);
assert.equal(document.objectName, defect.objectName);
assert.equal(document.items.length, 2);
assert.equal(document.sourceUpdatedAt, "2026-11-20");
assert.equal(estimateTotals(document).total, 145_599.3);

// Копирование позиций глубокое: правка сметы не меняет дефектовку.
document.items[0].quantity = "50";
assert.equal(defect.items[0].quantity, "100");

const parsedDocument = ContractEstimateDocumentSchema.parse({
  ...createEstimateFromDefect(defect),
  id: 501,
  status: "draft",
});
assert.equal(parsedDocument.id, 501);

// 4. Валидация: корректный документ без ошибок.
const validDocument: ContractEstimateDocument = {
  ...parsedDocument,
  nmck: {
    method: "market_analysis",
    record: nmckRecord(145_599.3),
    basisText: "Метод сопоставимых рыночных цен",
    calculatedAt: "2026-11-21",
    calculatedBy: "Иванов И. И.",
  },
};
assert.equal(estimateNmckDelta(validDocument), 0);
assert.equal(
  estimateValidationSummary(validateEstimateDocument(validDocument, { defect }))
    .errors,
  0,
);

// 5. Пустая смета — ошибка.
const emptyDocument: ContractEstimateDocument = {
  ...validDocument,
  items: [],
};
assert.ok(
  validateEstimateDocument(emptyDocument, { defect }).some(
    (issue) => issue.code === "items-empty" && issue.level === "error",
  ),
);

// 6. Утверждение без НМЦК и без подписи — ошибки.
const approvedWithoutNmck: ContractEstimateDocument = {
  ...validDocument,
  nmck: undefined,
  status: "approved",
};
const approvalIssues = validateEstimateDocument(approvedWithoutNmck, {
  defect,
});
assert.ok(
  approvalIssues.some(
    (issue) => issue.code === "nmck-missing" && issue.level === "error",
  ),
);
assert.ok(
  approvalIssues.some(
    (issue) => issue.code === "approved-at" && issue.level === "error",
  ),
);
assert.ok(
  approvalIssues.some(
    (issue) => issue.code === "approved-by" && issue.level === "error",
  ),
);

// 6a. Передача в КС без НМЦК — уже ошибка, а в черновике — лишь предупреждение.
const reviewWithoutNmck: ContractEstimateDocument = {
  ...validDocument,
  nmck: undefined,
  status: "review",
};
const reviewIssues = validateEstimateDocument(reviewWithoutNmck, { defect });
assert.ok(
  reviewIssues.some(
    (issue) => issue.code === "nmck-missing" && issue.level === "error",
  ),
);
assert.equal(estimateValidationSummary(reviewIssues).canSubmit, false);

const draftWithoutNmck: ContractEstimateDocument = {
  ...validDocument,
  nmck: undefined,
  status: "draft",
};
const draftIssues = validateEstimateDocument(draftWithoutNmck, { defect });
assert.ok(
  draftIssues.some(
    (issue) => issue.code === "nmck-missing" && issue.level === "warning",
  ),
);
assert.equal(estimateValidationSummary(draftIssues).canSubmit, true);

// 7. Расхождение сметы и НМЦК — предупреждение, не ошибка.
const mismatchDocument: ContractEstimateDocument = {
  ...validDocument,
  nmck: {
    ...validDocument.nmck!,
    record: nmckRecord(140_000),
  },
};
const mismatchIssues = validateEstimateDocument(mismatchDocument, { defect });
assert.ok(
  mismatchIssues.some(
    (issue) => issue.code === "nmck-mismatch" && issue.level === "warning",
  ),
);
assert.equal(estimateValidationSummary(mismatchIssues).errors, 0);

// 8. Изменённая дефектовка — предупреждение об устаревании.
const changedDefect: DefectList = {
  ...defect,
  updatedAt: "2026-11-22",
};
assert.ok(
  validateEstimateDocument(validDocument, { defect: changedDefect }).some(
    (issue) => issue.code === "defect-stale",
  ),
);

// 9. Потерянная дефектовка — ошибка связи.
assert.ok(
  validateEstimateDocument(validDocument, {
    defect: undefined,
    checkDefect: true,
  }).some((issue) => issue.code === "defect-not-found"),
);

// 10. Синхронизация позиций сохраняет настройки сметы и НМЦК.
const refreshedDefect: DefectList = {
  ...changedDefect,
  items: changedDefect.items.map((item) =>
    item.id === "i1" ? { ...item, quantity: "120" } : item,
  ),
};
const synced = syncEstimateItemsFromDefect(validDocument, refreshedDefect);
assert.equal(synced.items[0].quantity, "120");
assert.equal(synced.sourceUpdatedAt, "2026-11-22");
assert.equal(synced.nmck?.record?.nmckTotal, 145_599.3);
assert.equal(synced.estimate.overheadPercent, 10);

// 11. Права: автор, чужая КС, руководитель, работник без функций.
const authorActor: EstimateActor = {
  employeeId: 10,
  isContractServiceMember: false,
  isHead: false,
  myFunctions: [],
};
const strangerActor: EstimateActor = {
  employeeId: 11,
  isContractServiceMember: false,
  isHead: false,
  myFunctions: [],
};
const headActor: EstimateActor = {
  employeeId: 20,
  isContractServiceMember: true,
  isHead: true,
  myFunctions: ["planning", "purchase_description"],
};
const serviceWithoutFunctions: EstimateActor = {
  employeeId: 21,
  isContractServiceMember: true,
  isHead: false,
  myFunctions: [],
};

assert.equal(canViewEstimate(validDocument, authorActor), true);
assert.equal(canEditEstimate(validDocument, authorActor), true);
assert.equal(canApproveEstimate(validDocument, authorActor), false);

assert.equal(canViewEstimate(validDocument, strangerActor), false);
assert.equal(canEditEstimate(validDocument, strangerActor), false);

assert.equal(canEditEstimate(validDocument, headActor), true);
assert.equal(canApproveEstimate(validDocument, headActor), true);

assert.equal(canEditEstimate(validDocument, serviceWithoutFunctions), false);
assert.equal(canApproveEstimate(validDocument, serviceWithoutFunctions), false);

// Утверждённый документ не редактируется даже автором.
const approvedDocument: ContractEstimateDocument = {
  ...validDocument,
  status: "approved",
  approvedAt: "2026-11-22",
  approvedBy: "Петров П. П.",
};
assert.equal(isEstimateEditable(approvedDocument), false);
assert.equal(canEditEstimate(approvedDocument, authorActor), false);

// 12. Поиск сметы по дефектовке.
assert.equal(findEstimateForDefect([validDocument], 101)?.id, 501);
assert.equal(findEstimateForDefect([validDocument], 999), undefined);

// 13. График СМР и оплаты (приказ № 336/пр): перенос, пересборка, сверка.
const defectWithSchedule: DefectList = {
  ...defect,
  schedule: {
    ...defect.schedule,
    plannedStart: "2026-12-01",
    plannedEnd: "2026-12-31",
    legalActId: "minstroy-336pr",
    stages: [
      {
        id: "s1",
        name: "Кровля",
        startDate: "2026-12-01",
        endDate: "2026-12-31",
        amount: "145599.30",
      },
    ],
  },
};

// Перенос графика из дефектовки при создании сметы.
const scheduleDocument = createEstimateFromDefect(defectWithSchedule);
assert.equal(scheduleDocument.schedule.legalActId, "minstroy-336pr");
assert.equal(scheduleDocument.schedule.stages.length, 1);
assert.equal(estimateScheduleTotal(scheduleDocument), 145_599.3);
assert.equal(estimateScheduleDelta(scheduleDocument), 0);
assert.equal(isEstimateScheduleEmpty(scheduleDocument), false);

// Пересборка из сметы: этапы по разделам, НМЦК и смета не теряются.
const withNmck: ContractEstimateDocument = {
  ...validDocument,
  schedule: { ...scheduleDocument.schedule, stages: [] },
};
const rebuiltSchedule = rebuildEstimateSchedule(withNmck);
assert.equal(rebuiltSchedule.schedule.stages.length, 1);
assert.equal(estimateScheduleTotal(rebuiltSchedule), 145_599.3);
assert.equal(estimateScheduleDelta(rebuiltSchedule), 0);
assert.equal(rebuiltSchedule.nmck?.record?.nmckTotal, 145_599.3);

// В дефектовке этапов нет — они собираются по смете на её периоде.
const emptyDefectSchedule: DefectList = {
  ...defectWithSchedule,
  schedule: { ...defectWithSchedule.schedule, stages: [] },
};
const syncedSchedule = syncScheduleFromDefect(
  { ...withNmck, schedule: { ...withNmck.schedule, stages: [] } },
  emptyDefectSchedule,
);
assert.equal(syncedSchedule.schedule.plannedStart, "2026-12-01");
assert.equal(syncedSchedule.schedule.stages.length, 1);
assert.equal(estimateScheduleTotal(syncedSchedule), 145_599.3);

// Пустая ссылка на акт в дефектовке не затирает выбранный акт сметы.
const syncedWithoutAct = syncScheduleFromDefect(
  {
    ...withNmck,
    schedule: {
      ...withNmck.schedule,
      stages: [],
      legalActId: "minstroy-336pr",
    },
  },
  {
    ...emptyDefectSchedule,
    schedule: { ...emptyDefectSchedule.schedule, legalActId: "" },
  },
);
assert.equal(syncedWithoutAct.schedule.legalActId, "minstroy-336pr");

// Расхождение графика со сметой — предупреждение, не ошибка.
const brokenSchedule: ContractEstimateDocument = {
  ...rebuiltSchedule,
  schedule: {
    ...rebuiltSchedule.schedule,
    stages: rebuiltSchedule.schedule.stages.map((stage) => ({
      ...stage,
      amount: "100000.00",
    })),
  },
};
const scheduleIssues = validateEstimateDocument(brokenSchedule, {
  defect: defectWithSchedule,
});
assert.ok(
  scheduleIssues.some(
    (issue) => issue.code === "schedule-mismatch" && issue.level === "warning",
  ),
);
assert.equal(estimateValidationSummary(scheduleIssues).canSubmit, true);

// Нет акта 336/пр — предупреждение.
const scheduleWithoutAct: ContractEstimateDocument = {
  ...rebuiltSchedule,
  schedule: { ...rebuiltSchedule.schedule, legalActId: undefined },
};
assert.ok(
  validateEstimateDocument(scheduleWithoutAct, {
    defect: defectWithSchedule,
  }).some((issue) => issue.code === "schedule-legal-act"),
);

// Этап вне общего периода — предупреждение.
const stageOutside: ContractEstimateDocument = {
  ...rebuiltSchedule,
  schedule: {
    ...rebuiltSchedule.schedule,
    stages: [
      {
        id: "s-out",
        name: "Кровля",
        startDate: "2026-11-01",
        endDate: "2026-12-10",
        amount: "145599.30",
      },
    ],
  },
};
assert.ok(
  validateEstimateDocument(stageOutside, { defect: defectWithSchedule }).some(
    (issue) => issue.code === "schedule-stage-outside",
  ),
);

// Дата окончания этапа раньше начала — ошибка.
const stageBrokenPeriod: ContractEstimateDocument = {
  ...rebuiltSchedule,
  schedule: {
    ...rebuiltSchedule.schedule,
    stages: [
      {
        id: "s-broken",
        name: "Кровля",
        startDate: "2026-12-10",
        endDate: "2026-12-01",
        amount: "145599.30",
      },
    ],
  },
};
assert.ok(
  validateEstimateDocument(stageBrokenPeriod, {
    defect: defectWithSchedule,
  }).some(
    (issue) =>
      issue.code === "schedule-stage-period" && issue.level === "error",
  ),
);

// Обратная совместимость: документ без блока schedule получает пустой график.
const legacyDocument = ContractEstimateDocumentSchema.parse({
  ...createEstimateFromDefect(defect),
  id: 502,
});
assert.equal(legacyDocument.schedule.stages.length, 0);
assert.equal(estimateScheduleDelta(legacyDocument), 145_599.3);

console.log(
  "Проверка сквозного процесса пройдена: дефектовка → смета → НМЦК, " +
    "валидация, права и синхронизация.",
);
