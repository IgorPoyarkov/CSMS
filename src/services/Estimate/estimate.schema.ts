import { z } from "zod";
import {
  ContractEstimateSchema,
  DefectItemSchema,
  computeEstimateTotals,
  emptyContractEstimate,
  normalizeEstimate,
  type DefectItem,
  type DefectList,
  type EstimateTotals,
} from "../DefectList/defectList.schema";
import { NMCK_METHODS, NmckCalculationRecordSchema } from "../Nmck/nmck.schema";
import type { ContractServiceFunction } from "../ContractService/contractService.schema";

/**
 * Отдельный документ «смета контракта + обоснование НМЦК».
 *
 * Зачем отдельно от дефектовки:
 * - дефектовка описывает объёмы работ и остаётся входом процесса;
 * - смета и обоснование НМЦК живут дольше дефектовки, версионируются,
 *   согласуются контрактной службой и передаются в план-график/извещение;
 * - расчёты не дублируются: итоги сметы считает `computeEstimateTotals`
 *   из `defectList.schema`, обоснование НМЦК — существующий модуль `Nmck`.
 *
 * Документ хранится в коллекции `contractEstimates`, связан с дефектовкой
 * (`defectListId`) и с цепочкой закупки (`purchasePlanId`, `positionId`,
 * `procurementId`). Поля связи необязательные — обратная совместимость.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

const requiredId = (message: string) =>
  z
    .union([z.string(), z.number()])
    .refine(
      (value) => value !== "" && value !== null && value !== undefined,
      message,
    );

const optionalText = (minLength: number, message: string) =>
  z
    .string()
    .refine((value) => value === "" || value.length >= minLength, message)
    .optional();

const isoDate = () =>
  z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
      "Неверный формат даты (ожидается ГГГГ-ММ-ДД)",
    )
    .optional();

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const ESTIMATE_DOCUMENT_STATUSES = [
  "draft",
  "review",
  "approved",
  "returned",
] as const;

export type EstimateDocumentStatus =
  (typeof ESTIMATE_DOCUMENT_STATUSES)[number];

export const estimateDocumentStatusLabels: Record<
  EstimateDocumentStatus,
  string
> = {
  draft: "Черновик",
  review: "На проверке в КС",
  approved: "Утверждено",
  returned: "Возвращено на доработку",
};

/**
 * Обоснование НМЦК хранится записью существующего модуля `Nmck`
 * (`NmckCalculationRecord`) плюс текст обоснования для печати.
 */
export const EstimateNmckSchema = z.object({
  method: z.enum(NMCK_METHODS).optional(),
  record: NmckCalculationRecordSchema.optional(),
  basisText: z.string().optional(),
  calculatedAt: isoDate(),
  calculatedBy: z.string().optional(),
});

export type EstimateNmck = z.infer<typeof EstimateNmckSchema>;

export const ContractEstimateDocumentSchema = z.object({
  id: idSchema(),

  organizationId: requiredId(
    "Смета должна быть привязана к организации заказчика",
  ),

  // Вход процесса — дефектовка. Снимок items хранится рядом, чтобы смету
  // можно было открыть и напечатать, даже если дефектовку удалили.
  defectListId: idSchema(),
  purchasePlanId: idSchema(),
  positionId: idSchema(),
  procurementId: idSchema(),
  objectDescriptionId: idSchema(),
  objectName: optionalText(3, "Укажите объект"),
  basis: z.string().max(500).optional(),

  authorEmployeeId: idSchema(),
  authorName: z.string().optional(),
  structuralUnitName: z.string().optional(),

  items: z.array(DefectItemSchema).default([]),
  estimate: ContractEstimateSchema.default(emptyContractEstimate()),

  // Обоснование НМЦК (ст. 22 Закона № 44-ФЗ, приказ МЭР № 567).
  nmck: EstimateNmckSchema.optional(),

  status: z.enum(ESTIMATE_DOCUMENT_STATUSES).default("draft"),

  // Версия дефектовки, из которой собран документ: по ней видно, что
  // дефектовку изменили после формирования сметы.
  sourceUpdatedAt: isoDate(),

  reviewComment: z.string().optional(),
  approvedAt: isoDate(),
  approvedBy: z.string().optional(),

  createdAt: isoDate(),
  updatedAt: isoDate(),
});

export type ContractEstimateDocument = z.infer<
  typeof ContractEstimateDocumentSchema
>;
export type ContractEstimateDocumentInput = z.input<
  typeof ContractEstimateDocumentSchema
>;

export const ContractEstimateDocumentListSchema = z.array(
  ContractEstimateDocumentSchema,
);

export interface EstimateAuthor {
  employeeId?: string | number;
  employeeName?: string;
  structuralUnitName?: string;
}

export const emptyEstimateDocument = (
  organizationId: string | number = "",
  author: EstimateAuthor = {},
): ContractEstimateDocument => ({
  organizationId,
  objectName: "",
  basis: "",
  authorEmployeeId: author.employeeId ?? "",
  authorName: author.employeeName ?? "",
  structuralUnitName: author.structuralUnitName ?? "",
  items: [],
  estimate: emptyContractEstimate(),
  status: "draft",
  sourceUpdatedAt: "",
  reviewComment: "",
  approvedAt: "",
  approvedBy: "",
  createdAt: todayIso(),
  updatedAt: todayIso(),
});

const cloneItems = (items: DefectItem[]): DefectItem[] =>
  items.map((item) => ({ ...item }));

/**
 * Создание сметы из дефектовки: переносит позиции и настройки сметы.
 * Расчёты не выполняются — они всегда выводятся из позиций.
 */
export const createEstimateFromDefect = (
  defect: DefectList,
  author: EstimateAuthor = {},
): ContractEstimateDocument => ({
  organizationId: defect.organizationId,
  defectListId: defect.id,
  purchasePlanId: defect.purchasePlanId,
  positionId: defect.positionId,
  procurementId: defect.procurementId,
  objectDescriptionId: defect.objectDescriptionId,
  objectName: defect.objectName ?? "",
  basis: defect.basis ?? "",
  authorEmployeeId: defect.authorEmployeeId ?? author.employeeId ?? "",
  authorName: defect.authorName || author.employeeName || "",
  structuralUnitName:
    defect.structuralUnitName || author.structuralUnitName || "",
  items: cloneItems(defect.items),
  estimate: normalizeEstimate(defect.estimate),
  status: "draft",
  sourceUpdatedAt: defect.updatedAt ?? todayIso(),
  reviewComment: "",
  approvedAt: "",
  approvedBy: "",
  createdAt: todayIso(),
  updatedAt: todayIso(),
});

/**
 * Обновление позиций из дефектовки. Настройки сметы и обоснование НМЦК
 * сохраняются: человек мог их уже заполнить.
 */
export const syncEstimateItemsFromDefect = (
  document: ContractEstimateDocument,
  defect: DefectList,
): ContractEstimateDocument => ({
  ...document,
  defectListId: defect.id ?? document.defectListId,
  purchasePlanId: defect.purchasePlanId ?? document.purchasePlanId,
  positionId: defect.positionId ?? document.positionId,
  procurementId: defect.procurementId ?? document.procurementId,
  objectDescriptionId:
    defect.objectDescriptionId ?? document.objectDescriptionId,
  objectName: defect.objectName || document.objectName,
  basis: defect.basis || document.basis,
  items: cloneItems(defect.items),
  sourceUpdatedAt: defect.updatedAt ?? todayIso(),
  updatedAt: todayIso(),
});

/** Итоги сметы — единая точка, использующая расчёт дефектовки. */
export const estimateTotals = (
  document: Pick<ContractEstimateDocument, "items" | "estimate">,
): EstimateTotals => computeEstimateTotals(document);

export const estimateNmckTotal = (
  document: Pick<ContractEstimateDocument, "nmck">,
): number | null => {
  const total = document.nmck?.record?.nmckTotal;

  return typeof total === "number" && Number.isFinite(total) ? total : null;
};

/**
 * Расхождение «итог сметы − НМЦК». null — обоснование ещё не рассчитано.
 * Для строительства НМЦК определяется проектно-сметным методом, поэтому
 * расхождение — предупреждение, а не автоматическая ошибка.
 */
export const estimateNmckDelta = (
  document: Pick<ContractEstimateDocument, "items" | "estimate" | "nmck">,
): number | null => {
  const nmck = estimateNmckTotal(document);

  if (nmck === null) return null;

  return Math.round((estimateTotals(document).total - nmck) * 100) / 100;
};

export const findEstimateForDefect = (
  estimates: ContractEstimateDocument[],
  defectListId: string | number | undefined,
): ContractEstimateDocument | undefined => {
  if (defectListId === undefined || defectListId === "") return undefined;

  return estimates.find(
    (estimate) => String(estimate.defectListId) === String(defectListId),
  );
};

export const isEstimateEditable = (
  document: Pick<ContractEstimateDocument, "status">,
): boolean => document.status === "draft" || document.status === "returned";

/** Дефектовку изменили после того, как собрали смету. */
export const isEstimateStale = (
  document: Pick<ContractEstimateDocument, "sourceUpdatedAt">,
  defect: Pick<DefectList, "updatedAt"> | undefined,
): boolean => {
  if (!defect?.updatedAt || !document.sourceUpdatedAt) return false;

  return String(defect.updatedAt) > String(document.sourceUpdatedAt);
};

/**
 * Права на документ. Расчёт прав чистый, чтобы его можно было проверить
 * тестом и переиспользовать в списке и в редакторе.
 */
export interface EstimateActor {
  employeeId?: string | number;
  isContractServiceMember: boolean;
  isHead: boolean;
  myFunctions: ContractServiceFunction[];
}

const isAuthor = (
  document: Pick<ContractEstimateDocument, "authorEmployeeId">,
  actor: EstimateActor,
): boolean =>
  actor.employeeId !== undefined &&
  actor.employeeId !== "" &&
  String(document.authorEmployeeId) === String(actor.employeeId);

const hasEstimateFunction = (actor: EstimateActor): boolean =>
  actor.myFunctions.includes("planning") ||
  actor.myFunctions.includes("purchase_description");

export const canViewEstimate = (
  document: Pick<ContractEstimateDocument, "authorEmployeeId">,
  actor: EstimateActor,
): boolean => actor.isContractServiceMember || isAuthor(document, actor);

export const canEditEstimate = (
  document: Pick<ContractEstimateDocument, "authorEmployeeId" | "status">,
  actor: EstimateActor,
): boolean =>
  isEstimateEditable(document) &&
  (isAuthor(document, actor) ||
    (actor.isContractServiceMember && hasEstimateFunction(actor)));

export const canApproveEstimate = (
  document: Pick<ContractEstimateDocument, "authorEmployeeId" | "status">,
  actor: EstimateActor,
): boolean =>
  actor.isContractServiceMember &&
  (actor.isHead || actor.myFunctions.includes("purchase_description")) &&
  document.status !== "approved";
