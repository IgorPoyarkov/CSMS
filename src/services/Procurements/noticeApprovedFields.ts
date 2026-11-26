import type { ObjectDescription } from "../ObjectDescription/objectDescription.schema";
import type { ContractProject } from "../ContractProject/contractProject.schema";
import type { PurchaseNote } from "../PurchaseNote/purchaseNote.schema";
import type { NoticeInfoFormValues } from "./noticeInfo.schema";

/**
 * Поля извещения, которые приходят не от пользователя, а из утверждённых
 * документов верхнего уровня: служебной записки (СЗ), ООЗ и позиции
 * плана-графика. Список — единственный источник для блокировки в UI и для
 * проверки при сохранении: поле недоступно для правки и его значение
 * восстанавливается из снимка, сделанного в момент предзаполнения.
 *
 * Почему снимок, а не повторное чтение источника: предзаполнение уже содержит
 * нетривиальные правила (разбор ИКЗ, пересчёт цен, разворачивание ООЗ в позиции,
 * нормализация позиций 2571). Повторять эту логику здесь значит рассинхронизировать
 * форму и гейт. Поэтому фиксируется то, что реально подставила форма.
 */

// ─── Источники ────────────────────────────────────────────────────────────────

/** Реквизиты, приходящие из СЗ и связанной с ней позиции плана-графика. */
export const NOTICE_NOTE_LOCKED_PATHS = [
  "purchaseNoteId",
  "notificationType",
  "contactInfo.placerSurname",
  "contactInfo.placerName",
  "contactInfo.placerFathername",
  "generalInfo.placingWayCode",
  "generalInfo.plan2020Number",
  "generalInfo.position2020ExtNumber",
  "generalInfo.positionUniqueNumber",
  "generalInfo.positionSerialNumber",
  "generalInfo.orderName",
  "generalInfo.ikz",
  "ikz",
  "generalInfo.nmck",
  "generalInfo.authorizedBodyName",
  "generalInfo.jointOrganizerName",
  "generalInfo.placementOrganizerType",
  "generalInfo.kbk",
  "contractConditions.ikzYear",
  "contractConditions.ikzCustomerCode",
  "contractConditions.ikzPlanNumber",
  "contractConditions.ikzOrderNumber",
  "contractConditions.ikzOkpd2",
  "contractConditions.ikzKvr",
  "contractConditions.requiresPublicDiscussionArt20",
  "contractConditions.hasAdvance",
  "contractConditions.advancePercent",
  "contractConditions.paymentProcedure",
  "contractConditions.paymentTermDays",
  "contractConditions.budgetLevel",
  "contractConditions.budgetName",
  "contractConditions.isRelativeTerms",
  "contractConditions.startOffsetDays",
  "contractConditions.startDate",
  "contractConditions.endDate",
  "contractConditions.durationDays",
  "contractConditions.allowUnilateralRefusalArt95",
  "contractConditions.deliveryPlaces",
  "foundationInfo.protocolName",
  "foundationInfo.protocolNumber",
  "foundationInfo.protocolPublishDate",
  "foundationInfo.appNumber",
  "foundationInfo.isStructuredForm",
  "foundationInfo.contractProjectFiles",
  "participantsRequirements.evaluationCriteria",
  "participantsRequirements.evaluationObjectCategory",
  "participantsRequirements.evaluationOkpd2Codes",
  "participantsRequirements.unifiedRequirementsPart1Art31",
  "participantsRequirements.unifiedRequirementsPart1Art31Text",
  "participantsRequirements.requirementP1Part1Art31",
  "participantsRequirements.requirementP1Part1Art31Text",
  "participantsRequirements.requirementsPart1_1Art31",
  "participantsRequirements.pp1482ProductionFacilities",
  "participantsRequirements.pp1482ProductionFacilitiesText",
  "participantsRequirements.pp1482FinancialStability",
  "participantsRequirements.pp1482FinancialStabilityText",
  "participantsRequirements.pp1482Specialists",
  "participantsRequirements.pp1482SpecialistsText",
  "participantsRequirements.additionalRequirementsPart2Art31",
  "participantsRequirements.additionalRequirementsPart2Art31Text",
  "participantsRequirements.pp2571Positions",
  "participantsRequirements.requirementsPart2_1Art31",
  "participantsRequirements.requirementsPart2_1Art31Text",
  "participantsRequirements.pp2571Point4Requirement",
  "participantsRequirements.pp2571Point4RequirementText",
  "participantsRequirements.sanctionsRnpRequirement",
  "participantsRequirements.advantageSmpPart3Art30",
  "participantsRequirements.subcontractingSmpPart5Art30",
  "participantsRequirements.subcontractingSmpRequiredPercent",
  "participantsRequirements.subcontractingSmpNoteNumber",
  "participantsRequirements.requiresApplicationSecurity",
  "participantsRequirements.applicationSecurityPercent",
  "participantsRequirements.applicationSecurityOrder",
  "participantsRequirements.applicationSecurityRequisites",
  "participantsRequirements.applicationSecurityBudgetRequisites",
  "participantsRequirements.requiresContractSecurity",
  "participantsRequirements.contractSecurityPercent",
  "participantsRequirements.contractSecurityOrder",
  "participantsRequirements.contractSecurityRequisites",
  "participantsRequirements.requiresQualityWarranty",
  "participantsRequirements.warrantyMaintenanceInfo",
  "participantsRequirements.manufacturerWarrantyInfo",
  "participantsRequirements.warrantyTermAndVolume",
  "participantsRequirements.requiresWarrantySecurity",
  "participantsRequirements.warrantySecurityPercent",
  "participantsRequirements.warrantySecurityOrder",
  "participantsRequirements.warrantySecurityRequisites",
  "participantsRequirements.requiresTreasurySupport",
  "participantsRequirements.treasurySupportType",
  "participantsRequirements.requiresBankSupport",
  "participantsRequirements.additionalInfo",
  "purchaseObjects.isIndeterminateVolume",
  "purchaseObjects.isStructuredForm",
  "purchaseObjects.items",
  // ООЗ и обоснование НМЦК СЗ наследует документы со статусом; заменять их
  // в извещении вручную нельзя — это означало бы правку утверждённого документа.
  "attachedDocs",
] as const;

/** Реквизиты, приходящие из утверждённого ООЗ и его отдельных объектов. */
export const NOTICE_OOZ_LOCKED_PATHS = [
  "objectDescriptionId",
  "objectDescription",
  "purchaseObjects.items",
  "purchaseObjects.isIndeterminateVolume",
  "participantsRequirements.warrantyTermAndVolume",
] as const;

/** Реквизиты, фиксируемые утверждённым обоснованием НМЦК (подписанным в ЭП). */
export const NOTICE_NMCK_LOCKED_PATHS = [
  "generalInfo.nmck",
  "contractConditions.currency",
  "contractConditions.currencyCode",
  "contractConditions.usePriceFormulaPP19",
  "contractConditions.priceFormulaText",
  "contractConditions.isForeignCurrencyNmck",
  "contractConditions.maxContractPrice",
] as const;

/**
 * Реквизиты, фиксируемые утверждённым проектом контракта
 * (статус не «черновик»): предмет, цена, оплата, сроки, обеспечения,
 * гарантии, СМП/СОНКО, изменение и расторжение.
 */
export const NOTICE_CONTRACT_PROJECT_LOCKED_PATHS = [
  "contractProjectId",
  "contractProjectNumber",
  "generalInfo.orderName",
  "generalInfo.nmck",
  "contractConditions.currency",
  "contractConditions.currencyCode",
  "contractConditions.usePriceFormulaPP19",
  "contractConditions.priceFormulaText",
  "contractConditions.isForeignCurrencyNmck",
  "contractConditions.hasAdvance",
  "contractConditions.advancePercent",
  "contractConditions.paymentProcedure",
  "contractConditions.paymentTermDays",
  "contractConditions.isRelativeTerms",
  "contractConditions.startOffsetDays",
  "contractConditions.startDate",
  "contractConditions.endDate",
  "contractConditions.durationDays",
  "contractConditions.allowUnilateralRefusalArt95",
  "contractConditions.deliveryPlaces",
  "contractConditions.typicalConditionsNumber",
  "contractConditions.isLifecycleContract",
  "participantsRequirements.requiresApplicationSecurity",
  "participantsRequirements.applicationSecurityPercent",
  "participantsRequirements.applicationSecurityOrder",
  "participantsRequirements.requiresContractSecurity",
  "participantsRequirements.contractSecurityPercent",
  "participantsRequirements.contractSecurityOrder",
  "participantsRequirements.requiresQualityWarranty",
  "participantsRequirements.warrantyMaintenanceInfo",
  "participantsRequirements.manufacturerWarrantyInfo",
  "participantsRequirements.warrantyTermAndVolume",
  "participantsRequirements.requiresWarrantySecurity",
  "participantsRequirements.warrantySecurityPercent",
  "participantsRequirements.subcontractingSmpPart5Art30",
  "participantsRequirements.subcontractingSmpRequiredPercent",
  "participantsRequirements.subcontractingSmpNoteNumber",
  "participantsRequirements.additionalInfo",
] as const;

export const NOTICE_LOCKED_SOURCE_LABELS: Record<string, string> = {
  purchaseNoteId: "СЗ",
  notificationType: "СЗ",
  contactInfo: "СЗ",
  generalInfo: "СЗ / план-график",
  "generalInfo.nmck": "утверждённое обоснование НМЦК / проект контракта",
  "generalInfo.orderName": "СЗ / утверждённый проект контракта",
  contractConditions: "СЗ / план-график",
  foundationInfo: "СЗ",
  participantsRequirements: "СЗ",
  purchaseObjects: "ООЗ / СЗ",
  objectDescription: "ООЗ",
  objectDescriptionId: "ООЗ",
  attachedDocs: "утверждённые документы СЗ",
  ikz: "СЗ / план-график",
  contractProjectId: "утверждённый проект контракта",
  contractProjectNumber: "утверждённый проект контракта",
};

export interface NoticeApprovedSources {
  note?: PurchaseNote | null;
  description?: ObjectDescription | null;
  /** СЗ с подписанным (утверждённым) обоснованием НМЦК. */
  nmckNote?: PurchaseNote | null;
  /** Сохранённый проект контракта; блокирует поля в статусе не «черновик». */
  contractProject?: ContractProject | null;
}

/**
 * Список заблокированных путей.
 *
 * Поля, переданные служебной запиской, фиксируются в извещении независимо от
 * её статуса: извещение не должно расходиться с СЗ, а менять эти значения
 * можно только в самой записке. ООЗ блокирует свои поля в статусе `approved`,
 * обоснование НМЦК — после подписания в ЭП, проект контракта — после
 * утверждения (любой статус, кроме `draft`).
 */
export const getNoticeLockedPaths = ({
  note,
  description,
  nmckNote,
  contractProject,
}: NoticeApprovedSources): string[] => {
  const paths: string[] = [];
  if (note) {
    paths.push(...NOTICE_NOTE_LOCKED_PATHS);
  }
  if (description?.status === "approved") {
    paths.push(...NOTICE_OOZ_LOCKED_PATHS);
  }
  if (nmckNote?.nmckSignature) {
    paths.push(...NOTICE_NMCK_LOCKED_PATHS);
  }
  if (contractProject && contractProject.status !== "draft") {
    paths.push(...NOTICE_CONTRACT_PROJECT_LOCKED_PATHS);
  }
  return Array.from(new Set(paths));
};

/** Путь заблокирован сам или является вложенным в заблокированный (индексы массивов). */
export const isNoticePathLocked = (
  path: string,
  lockedPaths: readonly string[],
): boolean =>
  lockedPaths.some(
    (locked) =>
      path === locked ||
      path.startsWith(`${locked}.`) ||
      path.startsWith(`${locked}[`),
  );

/** Человекочитаемое описание источников для сообщений и подсказок. */
export const describeNoticeLockedSources = (
  lockedPaths: readonly string[],
): string => {
  if (lockedPaths.length === 0) return "";
  const labels = new Set<string>();
  lockedPaths.forEach((path) => {
    labels.add(noticeLockedSourceLabel(path));
  });
  return Array.from(labels).join(", ");
};

/** Метка источника для конкретного пути: сначала полный путь, затем корень. */
export const noticeLockedSourceLabel = (path: string): string => {
  if (NOTICE_LOCKED_SOURCE_LABELS[path]) {
    return NOTICE_LOCKED_SOURCE_LABELS[path];
  }
  const root = path.split(/[.[]/)[0];
  return NOTICE_LOCKED_SOURCE_LABELS[root] ?? root;
};

// ─── Работа со значениями ─────────────────────────────────────────────────────

type FormValues = NoticeInfoFormValues & Record<string, unknown>;

const readPath = (values: FormValues, path: string): unknown =>
  path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .reduce<unknown>(
      (current, key) =>
        current !== null && typeof current === "object"
          ? (current as Record<string, unknown>)[key]
          : undefined,
      values,
    );

const writePath = (values: FormValues, path: string, value: unknown): void => {
  const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cursor: Record<string, unknown> = values;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    const next = cursor[key];
    if (next === null || typeof next !== "object") {
      cursor[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  });
};

export type NoticeLockedSnapshot = Record<string, unknown>;

/** Фиксирует значения заблокированных полей сразу после предзаполнения. */
export const snapshotNoticeLockedFields = (
  values: NoticeInfoFormValues,
  lockedPaths: readonly string[],
): NoticeLockedSnapshot => {
  const snapshot: NoticeLockedSnapshot = {};
  lockedPaths.forEach((path) => {
    snapshot[path] = readPath(values as FormValues, path);
  });
  return snapshot;
};

const equalValues = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (typeof left !== typeof right) return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

export interface NoticeLockedChange {
  path: string;
  label: string;
}

/**
 * Расхождение между текущей формой и снимком утверждённых данных.
 * Возвращает список путей — их нельзя сохранять, а значения надо вернуть.
 */
export const findNoticeLockedChanges = (
  values: NoticeInfoFormValues,
  snapshot: NoticeLockedSnapshot,
  lockedPaths: readonly string[],
): NoticeLockedChange[] =>
  lockedPaths
    .filter(
      (path) =>
        !equalValues(readPath(values as FormValues, path), snapshot[path]),
    )
    .map((path) => ({
      path,
      label: noticeLockedSourceLabel(path),
    }));

/** Возвращает форме значения утверждённых полей после attempts правки. */
export const restoreNoticeLockedFields = (
  values: NoticeInfoFormValues,
  snapshot: NoticeLockedSnapshot,
  lockedPaths: readonly string[],
): NoticeInfoFormValues => {
  const restored = structuredClone(values) as FormValues;
  lockedPaths.forEach((path) => {
    writePath(restored, path, structuredClone(snapshot[path]));
  });
  return restored as NoticeInfoFormValues;
};
