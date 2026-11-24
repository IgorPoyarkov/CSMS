import { z } from "zod";
import { isApprovedPurchaseNoteStatus } from "../PurchaseNote/purchaseNote.schema";
import {
  CONTRACT_MANAGER_MAX_ANNUAL_VOLUME,
  ContractServiceCreationMethodSchema,
  ContractServiceFunctionSchema,
  MIN_CONTRACT_SERVICE_SIZE,
  contractServiceFunctionCodes,
  type ContractService,
  type ContractServiceFunction,
} from "../ContractService/contractService.schema";
import {
  contractServiceCreationMethodLabel,
  contractServiceFunctionLabel,
  contractServiceFunctionParagraph,
  contractServiceHeadcount,
  contractServiceRoster,
  educationWarning,
  employeeFullName,
  getEducationStatus,
} from "../ContractService/contractService.config";
import { formatMoneyRu as formatMoneyText } from "../../shared/format";
import type { OrganizationCustomer } from "../Organization/organization.schema";
import type { BaseEmployee } from "../StaffingTable/StaffingTable.schema";
import type { EmployeeEducation } from "../ContractService/education.schema";
import {
  businessDaysBetween,
  dateRangesOverlap,
  type Leave,
} from "../Calendar/calendar.schema";
import type { AccessRequest } from "../AccessRequest/accessRequest.schema";
import { isAccessRequestOpen } from "../AccessRequest/accessRequest.schema";
import { isTaskOverdue, type Task } from "../Tasks/tasks.schema";
import type { TaskEvaluation } from "../Tasks/taskEvaluation.schema";
import {
  employeeScoreAverage,
  employeeScoreTotal,
  onTimeCompletionRate,
  salaryImpact,
  salaryImpactLabel,
} from "../Tasks/taskEvaluation.api";
import type { PurchasePlan } from "../PurchasePlan/purchasePlan.schema";
import { planTotalAmount } from "../../components/PurchasePlan/purchasePlan.config";
import type { PurchaseNote } from "../PurchaseNote/purchaseNote.schema";
import type { ObjectDescription } from "../ObjectDescription/objectDescription.schema";
import { validateOrder158nCompliance } from "../ObjectDescription/order158nValidator";
import type { Okpd2Ref } from "../Okpd2Ref/okpd2Ref.schema";
import type { DefectList } from "../DefectList/defectList.schema";
import type { Procurement } from "../Procurements/procurement.schema";
import type { BidEvaluation } from "../BidEvaluation/bidEvaluation.schema";
import type { ContractProject } from "../ContractProject/contractProject.schema";
import {
  isContractOverdue,
  type ContractPayment,
  type ContractPenalty,
  type ContractRegistryItem,
} from "../ContractRegistry/contractRegistry.schema";
import { smnpShare, type SmnpSonekReport } from "./smnpSonek.schema";
import type { SignatureEvent } from "../Eds/eds.schema";

/**
 * Автоматически формируемый отчёт о деятельности контрактной службы
 * по Приказу Минфина России от 31.07.2020 № 158н
 * «Об утверждении Типового положения (регламента) о контрактной службе».
 */

export const Order158nReportPeriodTypeSchema = z.enum([
  "annual",
  "quarterly",
  "custom",
]);
export type Order158nReportPeriodType = z.infer<
  typeof Order158nReportPeriodTypeSchema
>;

export const ORDER_158N_PERIOD_TYPE_LABELS: Record<
  Order158nReportPeriodType,
  string
> = {
  annual: "Годовой",
  quarterly: "Квартальный",
  custom: "Произвольный период",
};

export const Order158nQuarterSchema = z.enum(["q1", "q2", "q3", "q4"]);
export type Order158nQuarter = z.infer<typeof Order158nQuarterSchema>;

export const ORDER_158N_QUARTER_LABELS: Record<Order158nQuarter, string> = {
  q1: "I квартал",
  q2: "II квартал",
  q3: "III квартал",
  q4: "IV квартал",
};

export const Order158nReportStatusSchema = z.enum([
  "draft",
  "formed",
  "approved",
]);
export type Order158nReportStatus = z.infer<typeof Order158nReportStatusSchema>;

export const ORDER_158N_REPORT_STATUS_LABELS: Record<
  Order158nReportStatus,
  string
> = {
  draft: "Черновик",
  formed: "Сформирован",
  approved: "Утверждён",
};

export const Order158nCheckStatusSchema = z.enum(["pass", "warning", "fail"]);
export type Order158nCheckStatus = z.infer<typeof Order158nCheckStatusSchema>;

export const Order158nComplianceItemSchema = z.object({
  id: z.string(),
  clause: z.string(),
  title: z.string(),
  status: Order158nCheckStatusSchema,
  detail: z.string(),
  actionTo: z.string().optional(),
  actionLabel: z.string().optional(),
});
export type Order158nComplianceItem = z.infer<
  typeof Order158nComplianceItemSchema
>;

export const Order158nSubIndicatorSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type Order158nSubIndicator = z.infer<typeof Order158nSubIndicatorSchema>;

export const Order158nFunctionActivitySchema = z.object({
  functionCode: ContractServiceFunctionSchema,
  paragraph: z.string(),
  title: z.string(),
  assignedEmployeesCount: z.number().int().nonnegative(),
  assignedEmployeeNames: z.array(z.string()).default([]),
  tasksTotal: z.number().int().nonnegative(),
  tasksCompleted: z.number().int().nonnegative(),
  tasksInProgress: z.number().int().nonnegative(),
  tasksPending: z.number().int().nonnegative(),
  tasksOverdue: z.number().int().nonnegative(),
  averageScore: z.number().nullable().optional(),
  keyMetricLabel: z.string().default(""),
  keyMetricValue: z.string().default(""),
  subIndicators: z.array(Order158nSubIndicatorSchema).default([]),
});
export type Order158nFunctionActivity = z.infer<
  typeof Order158nFunctionActivitySchema
>;

export const Order158nEmployeePerformanceSchema = z.object({
  employeeRefId: z.union([z.string(), z.number()]).optional(),
  fullName: z.string(),
  role: z.string(),
  position: z.string(),
  structuralUnitName: z.string(),
  functions: z.array(ContractServiceFunctionSchema).default([]),
  hasProfileEducation: z.boolean(),
  educationSummary: z.string(),
  educationWarning: z.string().nullable().optional(),
  dpoExpired: z.boolean(),
  dpoExpiringSoon: z.boolean(),
  hasOpenEducationRequest: z.boolean().default(false),
  leavesCount: z.number().int().nonnegative(),
  leaveDaysCount: z.number().int().nonnegative(),
  tasksTotal: z.number().int().nonnegative(),
  tasksCompleted: z.number().int().nonnegative(),
  tasksInProgress: z.number().int().nonnegative(),
  tasksPending: z.number().int().nonnegative(),
  tasksOverdue: z.number().int().nonnegative(),
  onTimeRate: z.number().min(0).max(100),
  evaluationsCount: z.number().int().nonnegative(),
  averageScore: z.number().nullable().optional(),
  totalScorePoints: z.number(),
  salaryImpact: z.enum(["bonus", "neutral", "penalty", "unknown"]),
  salaryImpactText: z.string(),
});
export type Order158nEmployeePerformance = z.infer<
  typeof Order158nEmployeePerformanceSchema
>;

export const Order158nReportSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  reportNumber: z.string().min(1, "Укажите номер отчёта"),
  reportDate: z.string(),
  periodType: Order158nReportPeriodTypeSchema.default("annual"),
  year: z.number().int().min(2000).max(2100),
  quarter: Order158nQuarterSchema.optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  periodLabel: z.string(),
  status: Order158nReportStatusSchema.default("formed"),

  // Снимок реквизитов организации-заказчика
  organizationFullName: z.string(),
  organizationShortName: z.string().optional(),
  organizationInn: z.string().optional(),
  organizationKpp: z.string().optional(),
  organizationOgrn: z.string().optional(),
  organizationAddress: z.string().optional(),

  // Организация КС (Раздел II Приказа № 158н)
  hasContractService: z.boolean(),
  creationMethod: ContractServiceCreationMethodSchema.optional(),
  creationMethodLabel: z.string(),
  structuralUnitName: z.string().optional(),
  orderNumber: z.string().optional(),
  orderDate: z.string().optional(),
  headName: z.string().optional(),
  headPosition: z.string().optional(),
  headOrderNumber: z.string().optional(),
  headOrderDate: z.string().optional(),
  appointedByName: z.string().optional(),
  headcount: z.number().int().nonnegative(),
  annualPlannedVolume: z.number().nonnegative(),

  // Сводные количественные и стоимостные показатели
  plansCount: z.number().int().nonnegative(),
  plansPublishedCount: z.number().int().nonnegative(),
  planPositionsCount: z.number().int().nonnegative(),
  plansTotalAmount: z.number().nonnegative(),

  notesTotalCount: z.number().int().nonnegative(),
  notesApprovedCount: z.number().int().nonnegative(),
  notesWithNmckCount: z.number().int().nonnegative(),
  notesNmckTotalAmount: z.number().nonnegative(),

  oozTotalCount: z.number().int().nonnegative(),
  oozApprovedCount: z.number().int().nonnegative(),
  oozCompliantCount: z.number().int().nonnegative(),

  defectListsCount: z.number().int().nonnegative(),
  defectListsAcceptedCount: z.number().int().nonnegative(),

  procurementsCount: z.number().int().nonnegative(),
  noticesPublishedCount: z.number().int().nonnegative(),
  bidEvaluationsCount: z.number().int().nonnegative(),

  contractProjectsCount: z.number().int().nonnegative(),
  contractsTotalCount: z.number().int().nonnegative(),
  contractsActiveCount: z.number().int().nonnegative(),
  contractsCompletedCount: z.number().int().nonnegative(),
  contractsTerminatedCount: z.number().int().nonnegative(),
  contractsOverdueCount: z.number().int().nonnegative(),
  contractsTotalAmount: z.number().nonnegative(),
  contractsPaidAmount: z.number().nonnegative(),
  penaltiesCount: z.number().int().nonnegative(),
  penaltiesAmount: z.number().nonnegative(),

  smnpSharePercent: z.number().min(0).max(100),
  edsSignedCount: z.number().int().nonnegative(),
  edsRejectedCount: z.number().int().nonnegative(),

  tasksTotalCount: z.number().int().nonnegative(),
  tasksCompletedCount: z.number().int().nonnegative(),
  tasksInProgressCount: z.number().int().nonnegative(),
  tasksPendingCount: z.number().int().nonnegative(),
  tasksOverdueCount: z.number().int().nonnegative(),
  tasksOnTimeRate: z.number().min(0).max(100),
  averageEvaluationScore: z.number().nullable().optional(),

  educationCompliantCount: z.number().int().nonnegative(),
  educationTotalChecked: z.number().int().nonnegative(),
  openEducationRequestsCount: z.number().int().nonnegative(),

  complianceScorePercent: z.number().min(0).max(100),
  complianceStatus: Order158nCheckStatusSchema,

  complianceChecks: z.array(Order158nComplianceItemSchema).default([]),
  functionActivities: z.array(Order158nFunctionActivitySchema).default([]),
  employeePerformances: z.array(Order158nEmployeePerformanceSchema).default([]),
  recommendations: z.array(z.string()).default([]),

  preparedByName: z.string().optional(),
  approvedByName: z.string().optional(),
  conclusionNote: z.string().optional(),
  generatedAt: z.string(),
});

export type Order158nReport = z.infer<typeof Order158nReportSchema>;
export const Order158nReportListSchema = z.array(Order158nReportSchema);

export interface Order158nPeriodConfig {
  periodType: Order158nReportPeriodType;
  year: number;
  quarter?: Order158nQuarter;
  customStart?: string;
  customEnd?: string;
  reportNumber?: string;
  reportDate?: string;
}

const safeMoney = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null || value === "") return 0;
  const num =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : 0;
};

/** Вычисление границ и подписи отчётного периода */
export function resolveOrder158nPeriodRange(config: Order158nPeriodConfig): {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
} {
  const year = config.year || new Date().getFullYear();

  if (config.periodType === "annual") {
    return {
      periodStart: `${year}-01-01`,
      periodEnd: `${year}-12-31`,
      periodLabel: `${year} год (${`01.01.${year} — 31.12.${year}`})`,
    };
  }

  if (config.periodType === "quarterly") {
    const q = config.quarter ?? "q4";
    const ranges: Record<
      Order158nQuarter,
      { start: string; end: string; ru: string }
    > = {
      q1: {
        start: `${year}-01-01`,
        end: `${year}-03-31`,
        ru: `01.01.${year} — 31.03.${year}`,
      },
      q2: {
        start: `${year}-04-01`,
        end: `${year}-06-30`,
        ru: `01.04.${year} — 30.06.${year}`,
      },
      q3: {
        start: `${year}-07-01`,
        end: `${year}-09-30`,
        ru: `01.07.${year} — 30.09.${year}`,
      },
      q4: {
        start: `${year}-10-01`,
        end: `${year}-12-31`,
        ru: `01.10.${year} — 31.12.${year}`,
      },
    };
    const r = ranges[q];
    return {
      periodStart: r.start,
      periodEnd: r.end,
      periodLabel: `${ORDER_158N_QUARTER_LABELS[q]} ${year} г. (${r.ru})`,
    };
  }

  const start = config.customStart || `${year}-01-01`;
  const end = config.customEnd || `${year}-12-31`;
  return {
    periodStart: start <= end ? start : end,
    periodEnd: end >= start ? end : start,
    periodLabel: `С ${start} по ${end}`,
  };
}

/** Проверка попадания ISO-даты (ГГГГ-ММ-ДД или timestamp) в период */
const isIsoInPeriod = (
  rawDate: string | undefined | null,
  periodStart: string,
  periodEnd: string,
): boolean => {
  if (!rawDate) return true;
  const isoDay = String(rawDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return true;
  return isoDay >= periodStart && isoDay <= periodEnd;
};

export interface BuildOrder158nReportInput {
  organization: OrganizationCustomer;
  contractService: ContractService | null;
  employees: BaseEmployee[];
  educations: EmployeeEducation[];
  leaves: Leave[];
  accessRequests: AccessRequest[];
  tasks: Task[];
  taskEvaluations: TaskEvaluation[];
  plans: PurchasePlan[];
  purchaseNotes: PurchaseNote[];
  objectDescriptions: ObjectDescription[];
  okpd2Dictionary: Okpd2Ref[];
  defectLists: DefectList[];
  procurements: Procurement[];
  bidEvaluations: BidEvaluation[];
  contractProjects: ContractProject[];
  contracts: ContractRegistryItem[];
  payments: ContractPayment[];
  penalties: ContractPenalty[];
  smnpReports: SmnpSonekReport[];
  edsEvents: SignatureEvent[];
  periodConfig: Order158nPeriodConfig;
  preparedByName?: string;
}

/**
 * Автоматически собирает сводный отчёт по Приказу Минфина № 158н
 * из живых данных деятельности контрактной службы заказчика.
 */
export function buildOrder158nActivityReport(
  input: BuildOrder158nReportInput,
): Order158nReport {
  const {
    organization,
    contractService,
    employees,
    educations,
    leaves,
    accessRequests,
    tasks,
    taskEvaluations,
    plans,
    purchaseNotes,
    objectDescriptions,
    okpd2Dictionary,
    defectLists,
    procurements,
    bidEvaluations,
    contractProjects,
    contracts,
    payments,
    penalties,
    smnpReports,
    edsEvents,
    periodConfig,
  } = input;

  const todayIso = new Date().toISOString().slice(0, 10);
  const { periodStart, periodEnd, periodLabel } =
    resolveOrder158nPeriodRange(periodConfig);

  const startYear = Number(periodStart.slice(0, 4)) || periodConfig.year;
  const endYear = Number(periodEnd.slice(0, 4)) || periodConfig.year;

  // Фильтрация по периоду
  const periodPlans = plans.filter((p) => {
    const planYearNum = Number(p.planYear);
    if (!planYearNum) return true;
    return planYearNum >= startYear && planYearNum <= endYear;
  });

  const periodTasks = tasks.filter((t) => {
    const refDate = t.completedAt || t.dueDate || t.createdAt;
    return isIsoInPeriod(refDate, periodStart, periodEnd);
  });

  const periodTaskIds = new Set(
    periodTasks.map((t) => String(t.id ?? "")).filter(Boolean),
  );
  const periodEvaluations = taskEvaluations.filter(
    (e) =>
      (e.taskId && periodTaskIds.has(String(e.taskId))) ||
      (!e.taskId && isIsoInPeriod(e.createdAt, periodStart, periodEnd)),
  );

  const visiblePurchaseNotes = purchaseNotes.filter(
    (n) => n.isExternalEis !== true,
  );
  const periodNotes = visiblePurchaseNotes.filter((n) =>
    isIsoInPeriod(n.noteDate || n.createdAt, periodStart, periodEnd),
  );
  const periodOoz = objectDescriptions.filter((d) =>
    isIsoInPeriod(d.approvedDate || d.updatedAt, periodStart, periodEnd),
  );
  const periodDefectLists = defectLists.filter((dl) =>
    isIsoInPeriod(dl.createdAt, periodStart, periodEnd),
  );
  const periodBidEvaluations = bidEvaluations.filter((b) =>
    isIsoInPeriod(b.createdAt, periodStart, periodEnd),
  );
  const periodContractProjects = contractProjects.filter((cp) =>
    isIsoInPeriod(
      cp.projectDate || cp.conclusionDate || cp.createdAt,
      periodStart,
      periodEnd,
    ),
  );
  const periodContracts = contracts.filter((c) =>
    isIsoInPeriod(c.contractDate || c.createdAt, periodStart, periodEnd),
  );
  const periodContractIds = new Set(
    periodContracts.map((c) => String(c.id ?? "")).filter(Boolean),
  );
  const periodPayments = payments.filter((p) =>
    p.contractId ? periodContractIds.has(String(p.contractId)) : false,
  );
  const periodPenalties = penalties.filter((p) =>
    p.contractId ? periodContractIds.has(String(p.contractId)) : false,
  );
  const periodEdsEvents = edsEvents.filter((ev) =>
    isIsoInPeriod(ev.createdAt, periodStart, periodEnd),
  );
  const periodLeaves = leaves.filter((leave) => {
    if (leave.status === "cancelled") return false;
    if (!leave.startDate || !leave.endDate) return false;
    return dateRangesOverlap(
      leave.startDate,
      leave.endDate,
      periodStart,
      periodEnd,
    );
  });

  // Организационные закупки по связи ИКЗ ПГ / проектов контрактов / реестра
  const allPlanIkz = new Set(
    plans.flatMap((p) =>
      (p.positions ?? []).map((pos) => pos.identificationCode).filter(Boolean),
    ),
  );
  const linkedProcIds = new Set(
    [
      ...contractProjects.map((cp) => String(cp.procurementId ?? "")),
      ...contracts.map((c) => String(c.procurementId ?? "")),
    ].filter(Boolean),
  );
  const orgProcurements = procurements.filter(
    (p) =>
      allPlanIkz.has(p.ikz) ||
      linkedProcIds.has(String(p.id ?? "")) ||
      allPlanIkz.size === 0,
  );
  const noticesPublishedCount = orgProcurements.filter((p) =>
    Boolean(p.noticeNumber),
  ).length;

  // Сведения о составе КС и штате структурного подразделения
  const unitEmployees = contractService?.structuralUnitId
    ? employees.filter(
        (emp) =>
          String(emp.structuralUnitId) ===
          String(contractService.structuralUnitId),
      )
    : [];

  const rosterRows = contractService
    ? contractServiceRoster(contractService)
    : [];
  const headcount = contractService
    ? contractServiceHeadcount(contractService, unitEmployees)
    : 0;

  // Объединённый список сотрудников КС (для способа structural_unit добавляем штат отдела)
  const staffMap = new Map<
    string,
    {
      employeeId?: string | number;
      fullName: string;
      role: string;
      position: string;
      structuralUnitName: string;
      functions: ContractServiceFunction[];
    }
  >();

  rosterRows.forEach((row, index) => {
    const key = row.employeeId
      ? `emp-${String(row.employeeId)}`
      : `roster-${index}`;
    const empRecord = employees.find(
      (e) => String(e.id) === String(row.employeeId),
    );
    staffMap.set(key, {
      employeeId: row.employeeId,
      fullName:
        row.employeeFullName ||
        (empRecord ? employeeFullName(empRecord) : "Сотрудник КС"),
      role: row.role,
      position: row.position || empRecord?.position || "—",
      structuralUnitName:
        row.structuralUnitName ||
        contractService?.structuralUnitName ||
        "В прямом подчинении",
      functions: row.functions ?? [],
    });
  });

  if (contractService?.creationMethod === "structural_unit") {
    unitEmployees.forEach((emp) => {
      const key = `emp-${String(emp.id)}`;
      if (!staffMap.has(key)) {
        staffMap.set(key, {
          employeeId: emp.id,
          fullName: employeeFullName(emp) || "Сотрудник подразделения КС",
          role: "Работник структурного подразделения КС (п. 2.1)",
          position: emp.position || "—",
          structuralUnitName:
            contractService.structuralUnitName || "Контрактная служба",
          functions: contractServiceFunctionCodes,
        });
      }
    });
  }

  // Персональные показатели сотрудников КС
  const employeePerformances: Order158nEmployeePerformance[] = Array.from(
    staffMap.values(),
  ).map((member) => {
    const empId = member.employeeId;
    const empEducations = empId
      ? educations.filter((e) => String(e.employeeId) === String(empId))
      : [];
    const eduStatus = getEducationStatus(empEducations);
    const eduWarn = educationWarning(eduStatus);
    const hasOpenReq = empId
      ? accessRequests.some(
          (req) =>
            String(req.employeeId) === String(empId) &&
            isAccessRequestOpen(req),
        )
      : false;

    const empLeaves = empId
      ? periodLeaves.filter((l) => String(l.employeeId) === String(empId))
      : [];
    const leaveDaysCount = empLeaves.reduce((sum, leave) => {
      const s = leave.startDate > periodStart ? leave.startDate : periodStart;
      const e = leave.endDate < periodEnd ? leave.endDate : periodEnd;
      return sum + (s <= e ? businessDaysBetween(s, e) : 0);
    }, 0);

    const empTasks = empId
      ? periodTasks.filter((t) => String(t.assigneeId) === String(empId))
      : [];
    const tasksCompleted = empTasks.filter(
      (t) => t.status === "completed",
    ).length;
    const tasksInProgress = empTasks.filter(
      (t) => t.status === "in_progress",
    ).length;
    const tasksPending = empTasks.filter((t) => t.status === "pending").length;
    const tasksOverdue = empTasks.filter((t) => isTaskOverdue(t)).length;

    const empTaskIds = new Set(
      empTasks.map((t) => String(t.id ?? "")).filter(Boolean),
    );
    const empEvals = empId
      ? periodEvaluations.filter(
          (ev) =>
            String(ev.evaluatedEmployeeId ?? "") === String(empId) ||
            (ev.taskId && empTaskIds.has(String(ev.taskId))),
        )
      : [];

    const timing = onTimeCompletionRate(empTasks, empEvals);
    const avgScore = employeeScoreAverage(empEvals);
    const totalPoints = employeeScoreTotal(empEvals);
    const impact = salaryImpact(empEvals);

    return {
      employeeRefId: empId,
      fullName: member.fullName,
      role: member.role,
      position: member.position,
      structuralUnitName: member.structuralUnitName,
      functions: member.functions,
      hasProfileEducation: eduStatus.hasProfile,
      educationSummary: eduStatus.summary,
      educationWarning: eduWarn,
      dpoExpired: eduStatus.dpoExpired,
      dpoExpiringSoon: eduStatus.dpoExpiringSoon,
      hasOpenEducationRequest: hasOpenReq,
      leavesCount: empLeaves.length,
      leaveDaysCount,
      tasksTotal: empTasks.length,
      tasksCompleted,
      tasksInProgress,
      tasksPending,
      tasksOverdue,
      onTimeRate: empTasks.length > 0 ? timing.rate : 100,
      evaluationsCount: empEvals.length,
      averageScore: avgScore,
      totalScorePoints: totalPoints,
      salaryImpact: impact,
      salaryImpactText: salaryImpactLabel[impact] ?? "Нет оценок",
    };
  });

  // Статистика по планам-графикам (п. 3.1)
  const plansCount = periodPlans.length;
  const plansPublishedCount = periodPlans.filter(
    (p) => p.status === "published",
  ).length;
  const planPositionsCount = periodPlans.reduce(
    (sum, p) => sum + (p.positions?.length ?? 0),
    0,
  );
  const plansTotalAmount = periodPlans.reduce(
    (sum, p) => sum + planTotalAmount(p),
    0,
  );
  // Для порога 100 млн руб. смотрим максимальный годовой план организации
  const annualPlannedVolume = plans.reduce(
    (max, p) => Math.max(max, planTotalAmount(p)),
    0,
  );

  // СЗ и НМЦК + ООЗ + Дефектовки (п. 3.2)
  const notesTotalCount = periodNotes.length;
  const notesApprovedCount = periodNotes.filter((n) =>
    isApprovedPurchaseNoteStatus(n.status),
  ).length;
  const notesWithNmckCount = periodNotes.filter((n) =>
    Boolean(n.nmckCalculation),
  ).length;
  const notesNmckTotalAmount = periodNotes.reduce(
    (sum, n) => sum + (n.nmckCalculation?.nmckTotal ?? 0),
    0,
  );

  const oozTotalCount = periodOoz.length;
  const oozApprovedCount = periodOoz.filter(
    (d) => d.status === "approved",
  ).length;
  const oozCompliantCount = periodOoz.filter((d) => {
    const check = validateOrder158nCompliance(d, {
      contractService,
      educations,
      okpd2Dictionary,
    });
    return check.failCount === 0;
  }).length;

  const defectListsCount = periodDefectLists.length;
  const defectListsAcceptedCount = periodDefectLists.filter(
    (dl) => dl.status === "accepted",
  ).length;

  // Процедуры, 2604 и СМП (п. 3.3)
  const procurementsCount = orgProcurements.length;
  const bidEvaluationsCount = periodBidEvaluations.length;
  const periodSmnpReports = smnpReports.filter(
    (r) => r.year >= startYear && r.year <= endYear,
  );
  const latestSmnpReport = periodSmnpReports[0];
  const smnpSharePercent = latestSmnpReport
    ? smnpShare(
        latestSmnpReport.actualSmnpAmount ?? 0,
        latestSmnpReport.totalProcurementAmount ?? 0,
      )
    : 0;

  // Контракты, ЭП, оплаты и неустойки (п. 3.4–3.5)
  const contractProjectsCount = periodContractProjects.length;
  const contractsTotalCount = periodContracts.length;
  const contractsActiveCount = periodContracts.filter(
    (c) => c.status === "signed" || c.status === "in_execution",
  ).length;
  const contractsCompletedCount = periodContracts.filter(
    (c) => c.status === "completed",
  ).length;
  const contractsTerminatedCount = periodContracts.filter(
    (c) => c.status === "terminated",
  ).length;
  const contractsOverdueCount = periodContracts.filter((c) =>
    isContractOverdue(c),
  ).length;
  const contractsTotalAmount = periodContracts.reduce(
    (sum, c) => sum + safeMoney(c.contractPrice),
    0,
  );
  const contractsPaidAmount = periodPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + safeMoney(p.amount), 0);
  const penaltiesCount = periodPenalties.length;
  const penaltiesAmount = periodPenalties.reduce(
    (sum, p) => sum + safeMoney(p.amount),
    0,
  );

  const edsSignedCount = periodEdsEvents.filter(
    (ev) => ev.result === "signed",
  ).length;
  const edsRejectedCount = periodEdsEvents.filter(
    (ev) => ev.result !== "signed",
  ).length;

  // Задачи и оценки
  const tasksTotalCount = periodTasks.length;
  const tasksCompletedCount = periodTasks.filter(
    (t) => t.status === "completed",
  ).length;
  const tasksInProgressCount = periodTasks.filter(
    (t) => t.status === "in_progress",
  ).length;
  const tasksPendingCount = periodTasks.filter(
    (t) => t.status === "pending",
  ).length;
  const tasksOverdueCount = periodTasks.filter((t) => isTaskOverdue(t)).length;
  const globalTiming = onTimeCompletionRate(periodTasks, periodEvaluations);
  const tasksOnTimeRate = periodTasks.length > 0 ? globalTiming.rate : 100;
  const averageEvaluationScore = employeeScoreAverage(periodEvaluations);

  // Образование персонала КС
  const educationTotalChecked = employeePerformances.length;
  const educationCompliantCount = employeePerformances.filter(
    (e) => e.hasProfileEducation && !e.dpoExpired,
  ).length;
  const openEducationRequestsCount = accessRequests.filter((r) =>
    isAccessRequestOpen(r),
  ).length;

  // Деятельность по основным разделам Раздела III Приказа № 158н
  const functionMetricsMap: Partial<
    Record<
      ContractServiceFunction,
      {
        keyMetricLabel: string;
        keyMetricValue: string;
        subIndicators: Order158nSubIndicator[];
      }
    >
  > = {
    planning: {
      keyMetricLabel: "Позиций в планах-графиках",
      keyMetricValue: `${planPositionsCount} поз. (${formatMoneyText(plansTotalAmount)})`,
      subIndicators: [
        {
          label: "Планов-графиков (опубл. в ЕИС)",
          value: `${plansCount} (опубл.: ${plansPublishedCount})`,
        },
        {
          label: "Совокупный объём по ПГ",
          value: formatMoneyText(plansTotalAmount),
        },
      ],
    },
    purchase_description: {
      keyMetricLabel: "СЗ / ООЗ / Дефектовки",
      keyMetricValue: `${notesTotalCount} СЗ · ${oozTotalCount} ООЗ`,
      subIndicators: [
        {
          label: "СЗ (согласовано / с расчётом НМЦК)",
          value: `${notesTotalCount} (${notesApprovedCount} / ${notesWithNmckCount})`,
        },
        {
          label: "Описаний объекта (утв. / соотв. 158н)",
          value: `${oozTotalCount} (${oozApprovedCount} / ${oozCompliantCount})`,
        },
        {
          label: "Дефектовки от инициаторов (принято)",
          value: `${defectListsCount} (${defectListsAcceptedCount})`,
        },
      ],
    },
    supplier_determination: {
      keyMetricLabel: "Закупки и оценка заявок",
      keyMetricValue: `${procurementsCount} закуп. (извещ.: ${noticesPublishedCount})`,
      subIndicators: [
        {
          label: "Оценки заявок (ПП РФ № 2604)",
          value: String(bidEvaluationsCount),
        },
        {
          label: "Доля закупок у СМП (ст. 30)",
          value: `${smnpSharePercent}%`,
        },
      ],
    },
    contract_conclusion: {
      keyMetricLabel: "Проекты и заключённые контракты",
      keyMetricValue: `${contractProjectsCount} проект. · ${contractsTotalCount} контр.`,
      subIndicators: [
        {
          label: "Сумма заключённых контрактов",
          value: formatMoneyText(contractsTotalAmount),
        },
        {
          label: "Действия с ЭП (подписано / отказов)",
          value: `${edsSignedCount} / ${edsRejectedCount}`,
        },
      ],
    },
    contract_execution: {
      keyMetricLabel: "Исполнение и финансовый контроль",
      keyMetricValue: `${contractsCompletedCount}/${contractsTotalCount} исполн. (опл. ${formatMoneyText(contractsPaidAmount)})`,
      subIndicators: [
        {
          label: "Действующие / просроченные / расторг.",
          value: `${contractsActiveCount} / ${contractsOverdueCount} / ${contractsTerminatedCount}`,
        },
        {
          label: "Неустойки и штрафы",
          value: `${penaltiesCount} (${formatMoneyText(penaltiesAmount)})`,
        },
      ],
    },
  };

  const functionActivities: Order158nFunctionActivity[] =
    contractServiceFunctionCodes.map((fnCode) => {
      const assigned = employeePerformances.filter((e) =>
        e.functions.includes(fnCode),
      );
      const fnTasks = periodTasks.filter((t) => t.functionCode === fnCode);
      const fnTaskIds = new Set(
        fnTasks.map((t) => String(t.id ?? "")).filter(Boolean),
      );
      const fnEvals = periodEvaluations.filter(
        (ev) => ev.taskId && fnTaskIds.has(String(ev.taskId)),
      );
      const metrics = functionMetricsMap[fnCode];

      const taskStats = {
        functionCode: fnCode,
        paragraph: contractServiceFunctionParagraph(fnCode),
        title: contractServiceFunctionLabel(fnCode),
        assignedEmployeesCount: assigned.length,
        assignedEmployeeNames: assigned.map((a) => a.fullName),
        tasksTotal: fnTasks.length,
        tasksCompleted: fnTasks.filter((t) => t.status === "completed").length,
        tasksInProgress: fnTasks.filter((t) => t.status === "in_progress")
          .length,
        tasksPending: fnTasks.filter((t) => t.status === "pending").length,
        tasksOverdue: fnTasks.filter((t) => isTaskOverdue(t)).length,
        averageScore: employeeScoreAverage(fnEvals),
      };

      if (!metrics)
        return {
          ...taskStats,
          keyMetricLabel: "",
          keyMetricValue: "",
          subIndicators: [],
        };

      return {
        ...taskStats,
        keyMetricLabel: metrics.keyMetricLabel,
        keyMetricValue: metrics.keyMetricValue,
        subIndicators: metrics.subIndicators,
      };
    });

  // Контрольный чек-лист соответствия Приказу № 158н
  const complianceChecks: Order158nComplianceItem[] = [];

  // 1. п. 2.1 Способ создания КС и приказ
  if (!contractService) {
    complianceChecks.push({
      id: "p2_1_creation",
      clause: "п. 2.1",
      title: "Фиксация способа создания контрактной службы",
      status: "fail",
      detail:
        "Контрактная служба или контрактный управляющий в организации не оформлены.",
      actionTo: "/contract-service",
      actionLabel: "Оформить КС",
    });
  } else if (!contractService.orderNumber || !contractService.orderDate) {
    complianceChecks.push({
      id: "p2_1_creation",
      clause: "п. 2.1",
      title: "Фиксация способа создания контрактной службы",
      status: "warning",
      detail: `Способ выбран («${contractServiceCreationMethodLabel(contractService.creationMethod)}»), но не заполнены номер и дата приказа о создании КС.`,
      actionTo: "/contract-service",
      actionLabel: "Указать приказ",
    });
  } else {
    complianceChecks.push({
      id: "p2_1_creation",
      clause: "п. 2.1",
      title: "Фиксация способа создания контрактной службы",
      status: "pass",
      detail: `Утверждён способ: ${contractServiceCreationMethodLabel(contractService.creationMethod)} (приказ от ${contractService.orderDate} № ${contractService.orderNumber}).`,
    });
  }

  // 2. п. 2.2 и ч. 21 ст. 38 44-ФЗ Численность и порог СГОЗ
  if (!contractService) {
    complianceChecks.push({
      id: "p2_2_headcount",
      clause: "п. 2.2, ч. 21 ст. 38",
      title: "Штатная численность КС и соблюдение порога 100 млн ₽",
      status: "fail",
      detail: "Численность не определена — отсутствуют сведения о КС.",
      actionTo: "/contract-service",
      actionLabel: "Укомплектовать штат",
    });
  } else if (
    contractService.creationMethod === "contract_manager" &&
    annualPlannedVolume > CONTRACT_MANAGER_MAX_ANNUAL_VOLUME
  ) {
    complianceChecks.push({
      id: "p2_2_headcount",
      clause: "п. 2.2, ч. 21 ст. 38",
      title: "Штатная численность КС и соблюдение порога 100 млн ₽",
      status: "fail",
      detail: `СГОЗ заказчика составляет ${formatMoneyText(annualPlannedVolume)} (> 100 млн ₽): организация обязана создать контрактную службу численностью не менее ${MIN_CONTRACT_SERVICE_SIZE} человек вместо контрактного управляющего.`,
      actionTo: "/contract-service",
      actionLabel: "Создать КС",
    });
  } else if (
    contractService.creationMethod !== "contract_manager" &&
    headcount < MIN_CONTRACT_SERVICE_SIZE
  ) {
    complianceChecks.push({
      id: "p2_2_headcount",
      clause: "п. 2.2, ч. 21 ст. 38",
      title: "Штатная численность КС и соблюдение порога 100 млн ₽",
      status: "fail",
      detail: `Фактическая численность КС (${headcount} чел.) меньше минимально допустимых ${MIN_CONTRACT_SERVICE_SIZE} человек.`,
      actionTo: "/contract-service",
      actionLabel: "Добавить работников",
    });
  } else {
    complianceChecks.push({
      id: "p2_2_headcount",
      clause: "п. 2.2, ч. 21 ст. 38",
      title: "Штатная численность КС и соблюдение порога 100 млн ₽",
      status: "pass",
      detail:
        contractService.creationMethod === "contract_manager"
          ? `Назначен контрактный управляющий; годовой объём закупок (${formatMoneyText(annualPlannedVolume)}) в пределах лимита 100 млн ₽.`
          : `Штатная численность составляет ${headcount} чел. (требование ≥ ${MIN_CONTRACT_SERVICE_SIZE} чел. выполнено).`,
    });
  }

  // 3. п. 2.3 Руководитель КС и приказ о назначении
  if (contractService?.creationMethod === "contract_manager") {
    complianceChecks.push({
      id: "p2_3_head",
      clause: "п. 2.3",
      title: "Назначение руководителя контрактной службы приказом",
      status: "pass",
      detail: `Для способа «контрактный управляющий» руководство возложено на ${contractService.contractManager?.employeeFullName || "назначенное должностное лицо"}.`,
    });
  } else if (!contractService?.head?.employeeId) {
    complianceChecks.push({
      id: "p2_3_head",
      clause: "п. 2.3",
      title: "Назначение руководителя контрактной службы приказом",
      status: "fail",
      detail: "Руководитель контрактной службы не выбран.",
      actionTo: "/contract-service",
      actionLabel: "Назначить руководителя",
    });
  } else if (
    !contractService.headOrderNumber ||
    !contractService.headOrderDate
  ) {
    complianceChecks.push({
      id: "p2_3_head",
      clause: "п. 2.3",
      title: "Назначение руководителя контрактной службы приказом",
      status: "warning",
      detail: `Руководитель КС (${contractService.head.employeeFullName}) выбран, но отсутствуют реквизиты приказа о назначении.`,
      actionTo: "/contract-service",
      actionLabel: "Указать приказ",
    });
  } else {
    complianceChecks.push({
      id: "p2_3_head",
      clause: "п. 2.3",
      title: "Назначение руководителя контрактной службы приказом",
      status: "pass",
      detail: `Руководитель КС — ${contractService.head.employeeFullName}, назначен приказом от ${contractService.headOrderDate} № ${contractService.headOrderNumber}.`,
    });
  }

  // 4. п. 2.4 Полнота распределения 5 функций Раздела III
  const uncoveredFunctions = functionActivities.filter(
    (f) => f.assignedEmployeesCount === 0,
  );
  if (!contractService) {
    complianceChecks.push({
      id: "p2_4_functions",
      clause: "п. 2.4",
      title: "Распределение функций Раздела III между работниками КС",
      status: "fail",
      detail: "Функции не распределены из-за отсутствия контрактной службы.",
    });
  } else if (uncoveredFunctions.length > 0) {
    complianceChecks.push({
      id: "p2_4_functions",
      clause: "п. 2.4",
      title: "Распределение функций Раздела III между работниками КС",
      status: "warning",
      detail: `Не закреплены за работниками КС: ${uncoveredFunctions.map((f) => `${f.paragraph} ${f.title}`).join("; ")}.`,
      actionTo: "/contract-service",
      actionLabel: "Распределить функции",
    });
  } else {
    complianceChecks.push({
      id: "p2_4_functions",
      clause: "п. 2.4",
      title: "Распределение функций Раздела III между работниками КС",
      status: "pass",
      detail:
        "Все 5 укрупнённых функций Раздела III (п. 3.1–3.5) закреплены за сотрудниками КС.",
    });
  }

  // 5. п. 2.5 Профессиональное образование работников КС
  const expiredEduWorkers = employeePerformances.filter((e) => e.dpoExpired);
  const missingEduWorkers = employeePerformances.filter(
    (e) => !e.hasProfileEducation,
  );
  const expiringEduWorkers = employeePerformances.filter(
    (e) => !e.dpoExpired && e.dpoExpiringSoon,
  );

  if (employeePerformances.length === 0) {
    complianceChecks.push({
      id: "p2_5_education",
      clause: "п. 2.5",
      title: "Профессиональное образование и ДПО работников КС",
      status: "warning",
      detail: "Нет сотрудников в составе КС для проверки образования.",
    });
  } else if (expiredEduWorkers.length > 0) {
    complianceChecks.push({
      id: "p2_5_education",
      clause: "п. 2.5",
      title: "Профессиональное образование и ДПО работников КС",
      status: "fail",
      detail: `Просрочено ДПО у: ${expiredEduWorkers.map((e) => e.fullName).join(", ")}. По п. 2.5 выполнение полномочий до обновления ДПО недопустимо.`,
      actionTo: "/contract-service",
      actionLabel: "Оформить заявку на ДПО",
    });
  } else if (missingEduWorkers.length > 0 || expiringEduWorkers.length > 0) {
    const notes: string[] = [];
    if (missingEduWorkers.length > 0) {
      notes.push(
        `нет профильного образования/данных: ${missingEduWorkers.map((e) => e.fullName).join(", ")}`,
      );
    }
    if (expiringEduWorkers.length > 0) {
      notes.push(
        `скоро истекает ДПО: ${expiringEduWorkers.map((e) => e.fullName).join(", ")}`,
      );
    }
    complianceChecks.push({
      id: "p2_5_education",
      clause: "п. 2.5",
      title: "Профессиональное образование и ДПО работников КС",
      status: "warning",
      detail: `Требует кадрового контроля: ${notes.join("; ")}.`,
      actionTo: "/contract-service",
      actionLabel: "Проверить образование",
    });
  } else {
    complianceChecks.push({
      id: "p2_5_education",
      clause: "п. 2.5",
      title: "Профессиональное образование и ДПО работников КС",
      status: "pass",
      detail: `Все работники КС (${educationCompliantCount} из ${educationTotalChecked}) имеют действующее профильное образование/ДПО.`,
    });
  }

  // 6. п. 2.6 Исполнительская дисциплина и минимизация рисков обжалования
  const violationEvalsCount = periodEvaluations.filter(
    (e) => e.score === "violation",
  ).length;
  if (
    violationEvalsCount > 0 ||
    tasksOverdueCount > 0 ||
    contractsOverdueCount > 0
  ) {
    complianceChecks.push({
      id: "p2_6_discipline",
      clause: "п. 2.6",
      title: "Исполнительская дисциплина и профилактика нарушений",
      status: violationEvalsCount > 0 ? "fail" : "warning",
      detail: `Выявлены отклонения: просроченных задач — ${tasksOverdueCount}, оценок «Нарушение» — ${violationEvalsCount}, контрактов с нарушением срока — ${contractsOverdueCount}.`,
      actionTo: "/tasks",
      actionLabel: "Перейти к задачам",
    });
  } else {
    complianceChecks.push({
      id: "p2_6_discipline",
      clause: "п. 2.6",
      title: "Исполнительская дисциплина и профилактика нарушений",
      status: "pass",
      detail: `Просроченных задач и зафиксированных нарушений за период нет (своевременность выполнения: ${tasksOnTimeRate}%).`,
    });
  }

  // 7. п. 3.1–3.2 Планирование, нормирование, ООЗ и обоснование НМЦК
  const notesMissingNmck = Math.max(0, notesTotalCount - notesWithNmckCount);
  if (notesMissingNmck > 0 || oozCompliantCount < oozTotalCount) {
    complianceChecks.push({
      id: "p3_1_3_2_planning_nmck",
      clause: "п. 3.1, п. 3.2",
      title: "Качество планирования, ООЗ (ст. 33) и обоснования НМЦК (ст. 22)",
      status: "warning",
      detail: `Служебных записок без расчёта НМЦК в системе: ${notesMissingNmck} из ${notesTotalCount}; ООЗ без замечаний 158н: ${oozCompliantCount} из ${oozTotalCount}.`,
      actionTo: "/nmck-calculator",
      actionLabel: "Калькулятор НМЦК",
    });
  } else {
    complianceChecks.push({
      id: "p3_1_3_2_planning_nmck",
      clause: "п. 3.1, п. 3.2",
      title: "Качество планирования, ООЗ (ст. 33) и обоснования НМЦК (ст. 22)",
      status: "pass",
      detail: `Планы-графики (${plansCount}), СЗ (${notesTotalCount}) и ООЗ (${oozTotalCount}) соответствуют требованиям ст. 16, 19, 22 и 33 44-ФЗ.`,
    });
  }

  // 8. п. 3.3–3.5 Процедуры, ЭП и исполнение контрактов
  if (edsRejectedCount > 0 || penaltiesCount > 0) {
    complianceChecks.push({
      id: "p3_3_3_5_execution",
      clause: "п. 3.3–3.5",
      title: "Определение поставщика, ЭП и ведение реестра контрактов",
      status: "warning",
      detail: `Отклонено сертификатов ЭП: ${edsRejectedCount}; начислено/учтено неустоек по контрактам: ${penaltiesCount} (${formatMoneyText(penaltiesAmount)}).`,
      actionTo: "/contract-registry",
      actionLabel: "Реестр контрактов",
    });
  } else {
    complianceChecks.push({
      id: "p3_3_3_5_execution",
      clause: "п. 3.3–3.5",
      title: "Определение поставщика, ЭП и ведение реестра контрактов",
      status: "pass",
      detail: `Контрактов в реестре: ${contractsTotalCount}, подписаний ЭП: ${edsSignedCount}, доля СМП: ${smnpSharePercent}%.`,
    });
  }

  // Индекс соответствия (pass = 100%, warning = 50%, fail = 0%)
  const weightedScore = complianceChecks.reduce((sum, item) => {
    if (item.status === "pass") return sum + 1;
    if (item.status === "warning") return sum + 0.5;
    return sum;
  }, 0);
  const complianceScorePercent =
    complianceChecks.length > 0
      ? Math.round((weightedScore / complianceChecks.length) * 100)
      : 0;
  const failCount = complianceChecks.filter((c) => c.status === "fail").length;
  const warnCount = complianceChecks.filter(
    (c) => c.status === "warning",
  ).length;
  const complianceStatus: Order158nCheckStatus =
    failCount > 0 ? "fail" : warnCount > 0 ? "warning" : "pass";

  // Автоматические управленческие рекомендации
  const recommendations: string[] = [];
  complianceChecks.forEach((c) => {
    if (c.status !== "pass") {
      recommendations.push(`[${c.clause}] ${c.detail}`);
    }
  });
  if (recommendations.length === 0) {
    recommendations.push(
      "Деятельность контрактной службы соответствует требованиям Приказа Минфина России № 158н; критических нарушений и кадровых рисков за отчётный период не выявлено.",
    );
  }

  const orgShort =
    organization.shortName || organization.fullName || "Заказчик";
  const defaultReportNum =
    periodConfig.reportNumber?.trim() ||
    `158н-${periodConfig.year}-${String(todayIso.slice(5, 7))}${String(todayIso.slice(8, 10))}`;

  const headName =
    contractService?.creationMethod === "contract_manager"
      ? contractService.contractManager?.employeeFullName
      : contractService?.head?.employeeFullName;
  const headPosition =
    contractService?.creationMethod === "contract_manager"
      ? contractService.contractManager?.position
      : contractService?.head?.position;

  const autoConclusion = [
    `По итогам периода (${periodLabel}) организация ${orgShort} провела ${procurementsCount} закупок и сопровождает ${contractsTotalCount} контрактов на сумму ${formatMoneyText(contractsTotalAmount)}.`,
    `Уровень соответствия требованиям Приказа Минфина России № 158н: ${complianceScorePercent}%.`,
    `Исполнено задач КС: ${tasksCompletedCount} из ${tasksTotalCount} (своевременность ${tasksOnTimeRate}%), профильное образование подтверждено у ${educationCompliantCount} из ${educationTotalChecked} работников.`,
  ].join(" ");

  return {
    organizationId: organization.id ?? "",
    reportNumber: defaultReportNum,
    reportDate: periodConfig.reportDate || todayIso,
    periodType: periodConfig.periodType,
    year: periodConfig.year,
    quarter:
      periodConfig.periodType === "quarterly"
        ? (periodConfig.quarter ?? "q4")
        : undefined,
    periodStart,
    periodEnd,
    periodLabel,
    status: "formed",

    organizationFullName: organization.fullName || orgShort,
    organizationShortName: organization.shortName || undefined,
    organizationInn: organization.inn || undefined,
    organizationKpp: organization.kpp || undefined,
    organizationOgrn: organization.ogrn || undefined,
    organizationAddress: organization.legalAddress || undefined,

    hasContractService: Boolean(contractService),
    creationMethod: contractService?.creationMethod,
    creationMethodLabel: contractService
      ? contractServiceCreationMethodLabel(contractService.creationMethod)
      : "Контрактная служба / управляющий не оформлены",
    structuralUnitName: contractService?.structuralUnitName || undefined,
    orderNumber: contractService?.orderNumber || undefined,
    orderDate: contractService?.orderDate || undefined,
    headName: headName || undefined,
    headPosition: headPosition || undefined,
    headOrderNumber: contractService?.headOrderNumber || undefined,
    headOrderDate: contractService?.headOrderDate || undefined,
    appointedByName: contractService?.appointedByName || undefined,
    headcount,
    annualPlannedVolume,

    plansCount,
    plansPublishedCount,
    planPositionsCount,
    plansTotalAmount,

    notesTotalCount,
    notesApprovedCount,
    notesWithNmckCount,
    notesNmckTotalAmount,

    oozTotalCount,
    oozApprovedCount,
    oozCompliantCount,

    defectListsCount,
    defectListsAcceptedCount,

    procurementsCount,
    noticesPublishedCount,
    bidEvaluationsCount,

    contractProjectsCount,
    contractsTotalCount,
    contractsActiveCount,
    contractsCompletedCount,
    contractsTerminatedCount,
    contractsOverdueCount,
    contractsTotalAmount,
    contractsPaidAmount,
    penaltiesCount,
    penaltiesAmount,

    smnpSharePercent,
    edsSignedCount,
    edsRejectedCount,

    tasksTotalCount,
    tasksCompletedCount,
    tasksInProgressCount,
    tasksPendingCount,
    tasksOverdueCount,
    tasksOnTimeRate,
    averageEvaluationScore,

    educationCompliantCount,
    educationTotalChecked,
    openEducationRequestsCount,

    complianceScorePercent,
    complianceStatus,

    complianceChecks,
    functionActivities,
    employeePerformances,
    recommendations,

    preparedByName:
      input.preparedByName?.trim() ||
      headName ||
      organization.responsiblePerson,
    approvedByName: organization.responsiblePerson || undefined,
    conclusionNote: autoConclusion,
    generatedAt: todayIso,
  };
}
