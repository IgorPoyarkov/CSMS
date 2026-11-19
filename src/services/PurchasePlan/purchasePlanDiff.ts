import {
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "./purchasePlan.schema";

/**
 * Модуль структурированного сравнения двух редакций (версий) плана-графика 44-ФЗ.
 */

export interface HeaderFieldDiff {
  field: string;
  label: string;
  before: string;
  after: string;
}

export type PositionChangeKind =
  | "added"
  | "removed"
  | "modified"
  | "unchanged";

export interface PositionFieldDiff {
  field: string;
  label: string;
  before: string;
  after: string;
}

export interface PositionDiffItem {
  key: string;
  kind: PositionChangeKind;
  purchaseNumber: string;
  identificationCode: string;
  objectOfPurchase: string;
  beforeAmount: number;
  afterAmount: number;
  amountDelta: number;
  fieldDiffs: PositionFieldDiff[];
  beforePosition?: PurchasePlanPosition;
  afterPosition?: PurchasePlanPosition;
}

export interface PurchasePlanDiffResult {
  headerDiffs: HeaderFieldDiff[];
  positions: PositionDiffItem[];
  summary: {
    beforeCount: number;
    afterCount: number;
    beforeTotal: number;
    afterTotal: number;
    amountDelta: number;
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

const statusLabels: Record<string, string> = {
  draft: "Проект",
  published: "Размещен в ЕИС",
  changed: "Изменен",
  removed: "Удален",
};

const posStatusLabels: Record<string, string> = {
  planned: "Запланирована",
  placed: "Размещена",
  changed: "Изменена",
  cancelled: "Исключена",
};

const normStr = (val: unknown): string => {
  if (val === undefined || val === null) return "";
  if (typeof val === "boolean") return val ? "Да" : "Нет";
  return String(val).trim();
};

const planSum = (plan: PurchasePlan): number => {
  const declared = toNumber(plan.totalAmount);
  if (declared !== null) return declared;
  return (plan.positions ?? []).reduce(
    (s, p) => s + (toNumber(p.amountTotal) ?? 0),
    0,
  );
};

const positionMatchKey = (
  pos: PurchasePlanPosition,
  fallbackIndex: number,
): string => {
  if (pos.identificationCode) return `ikz:${pos.identificationCode}`;
  if (pos.uniqueNumber) return `uniq:${pos.uniqueNumber}`;
  if (pos.id !== undefined && pos.id !== "") return `id:${pos.id}`;
  if (pos.purchaseNumber) return `num:${pos.purchaseNumber}`;
  return `idx:${fallbackIndex}:${pos.objectOfPurchase}`;
};

const POSITION_COMPARED_FIELDS: {
  key: keyof PurchasePlanPosition;
  label: string;
  format?: (v: unknown) => string;
}[] = [
  { key: "objectOfPurchase", label: "Объект закупки" },
  { key: "identificationCode", label: "ИКЗ" },
  { key: "purchaseNumber", label: "Номер закупки" },
  { key: "plannedPlacementYear", label: "Год размещения" },
  { key: "okpd2Code", label: "Код ОКПД2" },
  { key: "okpd2Name", label: "Наименование ОКПД2" },
  { key: "kbk", label: "КБК" },
  { key: "amountTotal", label: "Финансирование, всего (₽)" },
  { key: "amountCurrentYear", label: "Текущий год (₽)" },
  { key: "amountPlanPeriodFirstYear", label: "1-й плановый год (₽)" },
  { key: "amountPlanPeriodSecondYear", label: "2-й плановый год (₽)" },
  { key: "amountSubsequentYears", label: "Последующие годы (₽)" },
  {
    key: "status",
    label: "Статус позиции",
    format: (v) => (v ? posStatusLabels[String(v)] ?? String(v) : "Запланирована"),
  },
  {
    key: "isPublicDiscussionRequired",
    label: "Общественное обсуждение",
    format: (v) => (v ? "Да" : "Нет"),
  },
];

export const diffPurchasePlans = (
  beforePlan: PurchasePlan,
  afterPlan: PurchasePlan,
): PurchasePlanDiffResult => {
  const headerFields: {
    key: keyof PurchasePlan;
    label: string;
    format?: (v: unknown) => string;
  }[] = [
    { key: "planNumber", label: "Номер плана-графика" },
    { key: "planYear", label: "Год планирования" },
    {
      key: "status",
      label: "Статус",
      format: (v) => statusLabels[String(v)] ?? String(v ?? ""),
    },
    { key: "versionNumber", label: "Номер версии" },
    { key: "approvalDate", label: "Дата утверждения" },
    { key: "approvalAuthor", label: "Утвердил" },
    { key: "publishDate", label: "Дата публикации в ЕИС" },
    { key: "totalAmount", label: "Совокупный объём (₽)" },
    { key: "remarks", label: "Примечание" },
  ];

  const headerDiffs: HeaderFieldDiff[] = [];
  for (const item of headerFields) {
    const rawA = beforePlan[item.key];
    const rawB = afterPlan[item.key];
    const strA = item.format ? item.format(rawA) : normStr(rawA);
    const strB = item.format ? item.format(rawB) : normStr(rawB);
    if (strA !== strB) {
      headerDiffs.push({
        field: String(item.key),
        label: item.label,
        before: strA || "—",
        after: strB || "—",
      });
    }
  }

  const beforeMap = new Map<string, PurchasePlanPosition>();
  (beforePlan.positions ?? []).forEach((pos, idx) => {
    beforeMap.set(positionMatchKey(pos, idx), pos);
  });

  const afterMap = new Map<string, PurchasePlanPosition>();
  (afterPlan.positions ?? []).forEach((pos, idx) => {
    afterMap.set(positionMatchKey(pos, idx), pos);
  });

  const allKeys = Array.from(
    new Set([...beforeMap.keys(), ...afterMap.keys()]),
  );

  const positions: PositionDiffItem[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const key of allKeys) {
    const beforePos = beforeMap.get(key);
    const afterPos = afterMap.get(key);
    const beforeAmount = toNumber(beforePos?.amountTotal) ?? 0;
    const afterAmount = toNumber(afterPos?.amountTotal) ?? 0;
    const delta = Number((afterAmount - beforeAmount).toFixed(2));

    if (!beforePos && afterPos) {
      added += 1;
      positions.push({
        key,
        kind: "added",
        purchaseNumber: String(afterPos.purchaseNumber ?? "—"),
        identificationCode: afterPos.identificationCode || "—",
        objectOfPurchase: afterPos.objectOfPurchase,
        beforeAmount: 0,
        afterAmount,
        amountDelta: afterAmount,
        fieldDiffs: [],
        afterPosition: afterPos,
      });
      continue;
    }

    if (beforePos && !afterPos) {
      removed += 1;
      positions.push({
        key,
        kind: "removed",
        purchaseNumber: String(beforePos.purchaseNumber ?? "—"),
        identificationCode: beforePos.identificationCode || "—",
        objectOfPurchase: beforePos.objectOfPurchase,
        beforeAmount,
        afterAmount: 0,
        amountDelta: -beforeAmount,
        fieldDiffs: [],
        beforePosition: beforePos,
      });
      continue;
    }

    if (beforePos && afterPos) {
      const fieldDiffs: PositionFieldDiff[] = [];
      for (const spec of POSITION_COMPARED_FIELDS) {
        const valA = spec.format
          ? spec.format(beforePos[spec.key])
          : normStr(beforePos[spec.key]);
        const valB = spec.format
          ? spec.format(afterPos[spec.key])
          : normStr(afterPos[spec.key]);
        if (valA !== valB) {
          fieldDiffs.push({
            field: String(spec.key),
            label: spec.label,
            before: valA || "—",
            after: valB || "—",
          });
        }
      }

      const kind: PositionChangeKind =
        fieldDiffs.length > 0 ? "modified" : "unchanged";
      if (kind === "modified") {
        modified += 1;
      } else {
        unchanged += 1;
      }

      positions.push({
        key,
        kind,
        purchaseNumber: String(
          afterPos.purchaseNumber ?? beforePos.purchaseNumber ?? "—",
        ),
        identificationCode:
          afterPos.identificationCode || beforePos.identificationCode || "—",
        objectOfPurchase: afterPos.objectOfPurchase || beforePos.objectOfPurchase,
        beforeAmount,
        afterAmount,
        amountDelta: delta,
        fieldDiffs,
        beforePosition: beforePos,
        afterPosition: afterPos,
      });
    }
  }

  const beforeTotal = planSum(beforePlan);
  const afterTotal = planSum(afterPlan);

  return {
    headerDiffs,
    positions,
    summary: {
      beforeCount: (beforePlan.positions ?? []).length,
      afterCount: (afterPlan.positions ?? []).length,
      beforeTotal,
      afterTotal,
      amountDelta: Number((afterTotal - beforeTotal).toFixed(2)),
      added,
      removed,
      modified,
      unchanged,
    },
  };
};
