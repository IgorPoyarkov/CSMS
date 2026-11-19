import type {
  ContractPayment,
  ContractPenalty,
  ContractRegistryItem,
  ContractStage,
} from "../ContractRegistry/contractRegistry.schema";
import { toNumber, type PurchasePlan } from "../PurchasePlan/purchasePlan.schema";

/**
 * Агрегатор аналитики закупок и исполнения бюджета для дашборда (Recharts + D3).
 * Все показатели рассчитываются строго из реальных записей организации.
 */

export interface MonthlyVolumePoint {
  monthIndex: number; // 0..11
  monthKey: string; // YYYY-MM
  monthLabel: string;
  plannedAmount: number;
  contractedAmount: number;
  paidAmount: number;
  scheduledAmount: number;
  contractsCount: number;
}

export interface ContractStatusPoint {
  status: ContractRegistryItem["status"];
  label: string;
  count: number;
  amount: number;
  sharePercent: number;
}

export interface BudgetContractItem {
  contractId: string;
  contractNumber: string;
  contractName: string;
  supplierName: string;
  status: ContractRegistryItem["status"];
  statusLabel: string;
  plannedNmck: number;
  contractPrice: number;
  paidAmount: number;
  scheduledAmount: number;
  penaltiesAmount: number;
  remainingToPay: number;
  executionPercent: number;
  stagesCount: number;
  completedStagesCount: number;
}

export interface BudgetYearBucket {
  yearLabel: string;
  plannedAmount: number;
  contractedAmount: number;
  paidAmount: number;
}

export interface DashboardAnalyticsData {
  selectedYear: number;
  availableYears: number[];
  monthlySeries: MonthlyVolumePoint[];
  contractStatuses: ContractStatusPoint[];
  budgetContracts: BudgetContractItem[];
  budgetByYear: BudgetYearBucket[];
  kpis: {
    totalPlannedPG: number;
    totalContracted: number;
    totalPaid: number;
    totalScheduled: number;
    totalPenalties: number;
    savingsAmount: number;
    executionPercent: number;
    contractingPercent: number;
  };
}

const MONTH_SHORT_LABELS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

export const CONTRACT_STATUS_LABELS: Record<
  ContractRegistryItem["status"],
  string
> = {
  signed: "Заключён",
  in_execution: "На исполнении",
  completed: "Исполнен",
  terminated: "Расторгнут",
  suspended: "Приостановлен",
};

const parseMoney = (v: string | number | undefined | null): number => {
  const n = toNumber(v);
  return n !== null && Number.isFinite(n) ? n : 0;
};

const extractYearMonth = (
  dateStr?: string,
): { year: number; month: number } | null => {
  if (!dateStr || !/^\d{4}-\d{2}/.test(dateStr)) return null;
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7)) - 1;
  if (!Number.isInteger(year) || month < 0 || month > 11) return null;
  return { year, month };
};

export const collectAvailableYears = ({
  plans,
  contracts,
  payments,
  fallbackYear,
}: {
  plans: PurchasePlan[];
  contracts: ContractRegistryItem[];
  payments: ContractPayment[];
  fallbackYear: number;
}): number[] => {
  const years = new Set<number>();
  plans.forEach((p) => {
    const y = Number(p.planYear);
    if (Number.isInteger(y) && y >= 2020 && y <= 2100) years.add(y);
  });
  contracts.forEach((c) => {
    const ym = extractYearMonth(c.contractDate);
    if (ym) years.add(ym.year);
  });
  payments.forEach((p) => {
    const ym = extractYearMonth(p.paymentDate);
    if (ym) years.add(ym.year);
  });
  if (years.size === 0) years.add(fallbackYear);
  return Array.from(years).sort((a, b) => b - a);
};

export const buildDashboardAnalytics = ({
  plans,
  contracts,
  stages,
  payments,
  penalties,
  selectedYear,
}: {
  plans: PurchasePlan[];
  contracts: ContractRegistryItem[];
  stages: ContractStage[];
  payments: ContractPayment[];
  penalties: ContractPenalty[];
  selectedYear: number;
}): DashboardAnalyticsData => {
  const orgContractIds = new Set(
    contracts.map((c) => String(c.id ?? "")).filter(Boolean),
  );
  const orgPayments = payments.filter((p) =>
    orgContractIds.has(String(p.contractId ?? "")),
  );
  const orgStages = stages.filter((s) =>
    orgContractIds.has(String(s.contractId ?? "")),
  );
  const orgPenalties = penalties.filter((p) =>
    orgContractIds.has(String(p.contractId ?? "")),
  );

  // Месячная сетка для выбранного года
  const monthlySeries: MonthlyVolumePoint[] = MONTH_SHORT_LABELS.map(
    (label, idx) => ({
      monthIndex: idx,
      monthKey: `${selectedYear}-${String(idx + 1).padStart(2, "0")}`,
      monthLabel: label,
      plannedAmount: 0,
      contractedAmount: 0,
      paidAmount: 0,
      scheduledAmount: 0,
      contractsCount: 0,
    }),
  );

  // Плановый объём по позициям ПГ: при наличии statusDate относим к месяцу
  // размещения позиции, иначе к дате утверждения/публикации плана (или равномерно на год)
  for (const plan of plans) {
    const planYearNum = Number(plan.planYear);
    if (planYearNum !== selectedYear) continue;
    const planFallbackYm =
      extractYearMonth(plan.publishDate) ?? extractYearMonth(plan.approvalDate);

    for (const pos of plan.positions ?? []) {
      const amount = parseMoney(pos.amountTotal);
      if (amount <= 0) continue;
      const posYm = extractYearMonth(pos.statusDate);
      if (posYm && posYm.year === selectedYear) {
        monthlySeries[posYm.month].plannedAmount += amount;
      } else if (planFallbackYm && planFallbackYm.year === selectedYear) {
        monthlySeries[planFallbackYm.month].plannedAmount += amount;
      } else {
        // Относим к январю планового года как стартовому утверждению лимитов ПГ
        monthlySeries[0].plannedAmount += amount;
      }
    }
  }

  for (const contract of contracts) {
    const ym = extractYearMonth(contract.contractDate);
    if (ym && ym.year === selectedYear) {
      monthlySeries[ym.month].contractedAmount += parseMoney(
        contract.contractPrice,
      );
      monthlySeries[ym.month].contractsCount += 1;
    }
  }

  for (const payment of orgPayments) {
    const ym = extractYearMonth(payment.paymentDate);
    if (!ym || ym.year !== selectedYear) continue;
    const amount = parseMoney(payment.amount);
    if (payment.status === "paid") {
      monthlySeries[ym.month].paidAmount += amount;
    } else if (payment.status === "scheduled" || payment.status === "sent") {
      monthlySeries[ym.month].scheduledAmount += amount;
    }
  }

  // Округляем месячные суммы до копеек
  monthlySeries.forEach((m) => {
    m.plannedAmount = Math.round(m.plannedAmount * 100) / 100;
    m.contractedAmount = Math.round(m.contractedAmount * 100) / 100;
    m.paidAmount = Math.round(m.paidAmount * 100) / 100;
    m.scheduledAmount = Math.round(m.scheduledAmount * 100) / 100;
  });

  // Распределение по статусам контрактов
  const statusesOrder: ContractRegistryItem["status"][] = [
    "signed",
    "in_execution",
    "completed",
    "suspended",
    "terminated",
  ];
  const totalContractsAmount = contracts.reduce(
    (s, c) => s + parseMoney(c.contractPrice),
    0,
  );

  const contractStatuses: ContractStatusPoint[] = statusesOrder
    .map((status) => {
      const subset = contracts.filter((c) => c.status === status);
      const amount = subset.reduce(
        (s, c) => s + parseMoney(c.contractPrice),
        0,
      );
      return {
        status,
        label: CONTRACT_STATUS_LABELS[status],
        count: subset.length,
        amount: Math.round(amount * 100) / 100,
        sharePercent:
          totalContractsAmount > 0
            ? Math.round((amount / totalContractsAmount) * 1000) / 10
            : 0,
      };
    })
    .filter((s) => s.count > 0);

  // Детализация исполнения бюджета по контрактам (для D3 монитора)
  const budgetContracts: BudgetContractItem[] = contracts
    .map((contract) => {
      const cid = String(contract.id ?? contract.contractNumber);
      const cPayments = orgPayments.filter(
        (p) => String(p.contractId ?? "") === cid,
      );
      const cStages = orgStages.filter(
        (s) => String(s.contractId ?? "") === cid,
      );
      const cPenalties = orgPenalties.filter(
        (p) => String(p.contractId ?? "") === cid,
      );

      const contractPrice = parseMoney(contract.contractPrice);
      const plannedNmck =
        parseMoney(contract.initialMaxPrice) || contractPrice;
      const paidAmount = cPayments
        .filter((p) => p.status === "paid")
        .reduce((s, p) => s + parseMoney(p.amount), 0);
      const scheduledAmount = cPayments
        .filter((p) => p.status === "scheduled" || p.status === "sent")
        .reduce((s, p) => s + parseMoney(p.amount), 0);
      const penaltiesAmount = cPenalties.reduce(
        (s, p) => s + parseMoney(p.amount),
        0,
      );
      const remainingToPay = Math.max(0, contractPrice - paidAmount);
      const executionPercent =
        contractPrice > 0
          ? Math.min(100, Math.round((paidAmount / contractPrice) * 1000) / 10)
          : 0;

      return {
        contractId: cid,
        contractNumber: contract.contractNumber,
        contractName: contract.contractName,
        supplierName: contract.supplierName,
        status: contract.status,
        statusLabel: CONTRACT_STATUS_LABELS[contract.status],
        plannedNmck: Math.round(plannedNmck * 100) / 100,
        contractPrice: Math.round(contractPrice * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100,
        scheduledAmount: Math.round(scheduledAmount * 100) / 100,
        penaltiesAmount: Math.round(penaltiesAmount * 100) / 100,
        remainingToPay: Math.round(remainingToPay * 100) / 100,
        executionPercent,
        stagesCount: cStages.length,
        completedStagesCount: cStages.filter((s) => s.status === "completed")
          .length,
      };
    })
    .sort((a, b) => b.contractPrice - a.contractPrice);

  // Разбивка по годам финансирования (ПГ vs Контракты vs Фактическая оплата)
  const yearBucketsMap = new Map<number, BudgetYearBucket>();
  const ensureYearBucket = (year: number): BudgetYearBucket => {
    const existing = yearBucketsMap.get(year);
    if (existing) return existing;
    const created: BudgetYearBucket = {
      yearLabel: String(year),
      plannedAmount: 0,
      contractedAmount: 0,
      paidAmount: 0,
    };
    yearBucketsMap.set(year, created);
    return created;
  };

  for (const plan of plans) {
    const baseYear = Number(plan.planYear);
    if (!Number.isInteger(baseYear)) continue;
    for (const pos of plan.positions ?? []) {
      const y0 = parseMoney(pos.amountCurrentYear);
      const y1 = parseMoney(pos.amountPlanPeriodFirstYear);
      const y2 = parseMoney(pos.amountPlanPeriodSecondYear);
      const total = parseMoney(pos.amountTotal);
      if (y0 + y1 + y2 > 0) {
        if (y0 > 0) ensureYearBucket(baseYear).plannedAmount += y0;
        if (y1 > 0) ensureYearBucket(baseYear + 1).plannedAmount += y1;
        if (y2 > 0) ensureYearBucket(baseYear + 2).plannedAmount += y2;
      } else if (total > 0) {
        ensureYearBucket(baseYear).plannedAmount += total;
      }
    }
  }

  for (const c of contracts) {
    const ym = extractYearMonth(c.contractDate);
    if (ym) {
      ensureYearBucket(ym.year).contractedAmount += parseMoney(c.contractPrice);
    }
  }

  for (const p of orgPayments) {
    if (p.status !== "paid") continue;
    const ym = extractYearMonth(p.paymentDate);
    if (ym) {
      ensureYearBucket(ym.year).paidAmount += parseMoney(p.amount);
    }
  }

  const budgetByYear = Array.from(yearBucketsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, bucket]) => ({
      ...bucket,
      plannedAmount: Math.round(bucket.plannedAmount * 100) / 100,
      contractedAmount: Math.round(bucket.contractedAmount * 100) / 100,
      paidAmount: Math.round(bucket.paidAmount * 100) / 100,
    }));

  const totalPlannedPG = plans.reduce(
    (sum, p) =>
      sum +
      (toNumber(p.totalAmount) ??
        (p.positions ?? []).reduce(
          (ps, pos) => ps + parseMoney(pos.amountTotal),
          0,
        )),
    0,
  );
  const totalContracted = budgetContracts.reduce(
    (s, b) => s + b.contractPrice,
    0,
  );
  const totalNmck = budgetContracts.reduce((s, b) => s + b.plannedNmck, 0);
  const totalPaid = budgetContracts.reduce((s, b) => s + b.paidAmount, 0);
  const totalScheduled = budgetContracts.reduce(
    (s, b) => s + b.scheduledAmount,
    0,
  );
  const totalPenalties = budgetContracts.reduce(
    (s, b) => s + b.penaltiesAmount,
    0,
  );

  const availableYears = collectAvailableYears({
    plans,
    contracts,
    payments: orgPayments,
    fallbackYear: selectedYear,
  });

  return {
    selectedYear,
    availableYears,
    monthlySeries,
    contractStatuses,
    budgetContracts,
    budgetByYear,
    kpis: {
      totalPlannedPG: Math.round(totalPlannedPG * 100) / 100,
      totalContracted: Math.round(totalContracted * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalScheduled: Math.round(totalScheduled * 100) / 100,
      totalPenalties: Math.round(totalPenalties * 100) / 100,
      savingsAmount: Math.max(0, Math.round((totalNmck - totalContracted) * 100) / 100),
      executionPercent:
        totalContracted > 0
          ? Math.round((totalPaid / totalContracted) * 1000) / 10
          : 0,
      contractingPercent:
        totalPlannedPG > 0
          ? Math.round((totalContracted / totalPlannedPG) * 1000) / 10
          : 0,
    },
  };
};
