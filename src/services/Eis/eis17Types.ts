import { z } from "zod";
import {
  positionKbkEntries,
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "../PurchasePlan/purchasePlan.schema";
import type {
  NoticeEvaluationCriterionType,
  NoticeInfoFormValues,
} from "../Procurements/noticeInfo.schema";

/**
 * Контракты ЕИС 17.0 (из XSD-схем CSMS-API: schemas/17.0).
 *
 * Содержит типизированные DTO, справочные перечисления и мапперы для:
 * - Плана-графика 2020 (`IntegrationTPTypes.xsd`: tenderPlan2020Type);
 * - Извещений о закупке (`IntegrationEPTypes.xsd`: notificationEF2020Type,
 *   notificationEOK2020Type, notificationEZK2020Type, notificationEZT2020Type,
 *   notificationEMZ2025Type, notificationCancelType).
 */

// ─── Общие перечисления ЕИС 17.0 (BaseTypes.xsd) ─────────────────────────────

export const EIS_IKZ_PATTERN = /^\d{36}$/;

export const EIS_ARTICLE15_PARTS = [
  "P4",
  "P5",
  "P6",
  "P41",
  "P43",
  "P44",
] as const;

export type EisArticle15Part = (typeof EIS_ARTICLE15_PARTS)[number];

export const EIS_ARTICLE15_PART_LABELS: Record<EisArticle15Part, string> = {
  P4: "ч. 4 ст. 15 — бюджетные инвестиции юридическим лицам",
  P5: "ч. 5 ст. 15 — юридические лица при реализации проектов строительства",
  P6: "ч. 6 ст. 15 — переданные полномочия государственного (муниципального) заказчика",
  P41: "ч. 4.1 ст. 15 — получатели субсидий на приобретение объектов недвижимого имущества",
  P43: "ч. 4.3 ст. 15 — государственные (муниципальные) унитарные предприятия (в рамках переданных полномочий)",
  P44: "ч. 4.4 ст. 15 — отдельные юридические лица по специальным актам Правительства РФ",
};

export const EIS_RESPONSIBLE_ROLES = [
  "CU",
  "OCU",
  "RA",
  "ORA",
  "AI",
  "OAI",
  "OA",
  "OOA",
  "CS",
  "OCS",
  "CC",
  "OCC",
  "AU",
  "OAU",
  "RO",
  "TKO",
  "CN",
  "OCN",
  "CU5CH26",
] as const;

export type EisResponsibleRole = (typeof EIS_RESPONSIBLE_ROLES)[number];

export const EIS_RESPONSIBLE_ROLE_LABELS: Record<EisResponsibleRole, string> = {
  CU: "CU — Заказчик",
  OCU: "OCU — Заказчик (обособленное подразделение)",
  RA: "RA — Уполномоченный орган",
  ORA: "ORA — Уполномоченный орган (обособленное подразделение)",
  AI: "AI — Уполномоченное учреждение",
  OAI: "OAI — Уполномоченное учреждение (обособленное подразделение)",
  OA: "OA — Организация, осуществляющая полномочия заказчика",
  OOA: "OOA — Организация с полномочиями заказчика (обособл. подразделение)",
  CS: "CS — Специализированная организация",
  OCS: "OCS — Специализированная организация (обособл. подразделение)",
  CC: "CC — Организатор совместного конкурса/аукциона (заказчик)",
  OCC: "OCC — Организатор совместной закупки (обособл. подразделение)",
  AU: "AU — Уполномоченный орган/учреждение — организатор совместной закупки",
  OAU: "OAU — Уполномоченный организатор (обособл. подразделение)",
  RO: "RO — Региональный оператор",
  TKO: "TKO — Региональный оператор по обращению с ТКО",
  CN: "CN — Централизованная организация",
  OCN: "OCN — Централизованная организация (обособл. подразделение)",
  CU5CH26: "CU5CH26 — Заказчик по п. 5 ч. 26 ст. 112 Закона № 44-ФЗ",
};

export const EIS_COST_CRITERION_CODES = ["CP", "MC", "TC", "EN"] as const;
export type EisCostCriterionCode = (typeof EIS_COST_CRITERION_CODES)[number];

export const EIS_QUALITATIVE_CRITERION_CODES = ["QF", "QO"] as const;
export type EisQualitativeCriterionCode =
  (typeof EIS_QUALITATIVE_CRITERION_CODES)[number];

export const EIS_CRITERION_CODE_LABELS: Record<
  EisCostCriterionCode | EisQualitativeCriterionCode,
  string
> = {
  CP: "CP — Цена контракта, сумма цен единиц ТРУ",
  MC: "MC — Стоимость жизненного цикла товара/объекта",
  TC: "TC — Расходы на эксплуатацию и ремонт",
  EN: "EN — Сумма расходов по энергосервисному контракту",
  QO: "QO — Качественные, функциональные и экологические характеристики",
  QF: "QF — Квалификация участников закупки",
};

export const EIS_PRODUCT_TYPES = ["PRODUCT", "WORK", "SERVICE"] as const;
export type EisProductType = (typeof EIS_PRODUCT_TYPES)[number];

export const EIS_PRODUCT_TYPE_LABELS: Record<EisProductType, string> = {
  PRODUCT: "PRODUCT — Товар",
  WORK: "WORK — Работа",
  SERVICE: "SERVICE — Услуга",
};

// ─── План-график 2020 (IntegrationTPTypes.xsd) ───────────────────────────────

export const EIS_TP_OWNER_ROLES = ["CU", "OA"] as const;
export type EisTpOwnerRole = (typeof EIS_TP_OWNER_ROLES)[number];

export const EIS_TP_PFHD_TYPES = ["IND", "CONS"] as const;
export type EisTpPfhdType = (typeof EIS_TP_PFHD_TYPES)[number];

export const EIS_TP_MODIFICATION_STATUSES = ["N", "E"] as const;
export type EisTpModificationStatus =
  (typeof EIS_TP_MODIFICATION_STATUSES)[number];

export const EIS_TP_POSITION_DECISIONS = [
  "notSpecified",
  "purchaseChanged",
  "purchaseCanceled",
] as const;
export type EisTpPositionDecision = (typeof EIS_TP_POSITION_DECISIONS)[number];

export interface EisTenderPlan2020FinanceResources {
  total: number;
  currentYear: number;
  firstYear: number;
  secondYear: number;
  subsecYears: number;
}

export interface EisTenderPlan2020KBKInfo {
  kbk: string;
  yearsInfo: EisTenderPlan2020FinanceResources;
}

export interface EisTenderPlan2020KVRInfo {
  kvrCode: string;
  yearsInfo: EisTenderPlan2020FinanceResources;
}

export interface EisTenderPlan2020KOKSInfo {
  koksCode: string;
  koksName?: string;
  yearsInfo: EisTenderPlan2020FinanceResources;
}

export interface EisTenderPlan2020Organization {
  regNum?: string;
  consRegistryNum?: string;
  fullName: string;
  inn: string;
  kpp?: string;
  oktmoCode?: string;
  factAddress?: string;
  phone?: string;
  email?: string;
}

export interface EisTenderPlan2020Position {
  positionNumber?: string;
  extNumber?: string;
  ikz: string;
  publishYear: number;
  iku?: string;
  purchaseNumber: string;
  purchaseOrderNumber?: string;
  okpd2Codes: Array<{ okpdCode: string; okpdName?: string }>;
  okpd2MultipleZeroCode: boolean;
  ktruCode?: string;
  ktruName?: string;
  kvrCode?: string;
  purchaseObjectInfo: string;
  publicDiscussion: boolean;
  positionCanceled: boolean;
  positionModificationStatus?: EisTpModificationStatus;
  positionModification?: {
    changeReasonCode?: string;
    changeReasonName?: string;
    decision: EisTpPositionDecision;
    description?: string;
    modificationNumber?: number;
  };
  centralizedPurchaseOrg?: string;
  jointBiddingOrg?: string;
  financeInfo: EisTenderPlan2020FinanceResources;
  kbksInfo: EisTenderPlan2020KBKInfo[];
  kvrsInfo: EisTenderPlan2020KVRInfo[];
  koksInfo: EisTenderPlan2020KOKSInfo[];
  isEnergyServiceContract: boolean;
  isProvisionLendingServices: boolean;
  isConstructionWorks: boolean;
  isNotFederalFinancing: boolean;
  notPublishedOnEIS: boolean;
}

export interface EisTenderPlan2020SpecialPurchase {
  id?: string;
  typeCode: string;
  typeName?: string;
  ikz?: string;
  iku?: string;
  // Реестровый номер позиции особой закупки в плане-графике
  positionNumber?: string;
  extNumber?: string;
  kvr?: string;
  kbk?: string;
  koksCode?: string;
  publishYear?: number;
  purchaseNumber?: string;
  modificationStatus?: "N" | "E";
  financeInfo: EisTenderPlan2020FinanceResources;
}

export interface EisTenderPlan2020 {
  schemaVersion: "17.0";
  externalId?: string;
  planNumber: string;
  versionNumber: number;
  commonInfo: {
    planYear: number;
    planPeriod: {
      firstYear: number;
      secondYear: number;
    };
    ownerRole: EisTpOwnerRole;
    pfhdType?: EisTpPfhdType;
    directDate?: string;
    createDate?: string;
    confirmDate?: string;
    publishDate?: string;
    firstVersionPublishDate?: string;
    eisUrl?: string;
    owner: EisTenderPlan2020Organization;
    customer: EisTenderPlan2020Organization;
  };
  positions: EisTenderPlan2020Position[];
  specialPurchases: EisTenderPlan2020SpecialPurchase[];
  totals: EisTenderPlan2020FinanceResources;
}

// ─── Извещения 2020 (IntegrationEPTypes.xsd) ─────────────────────────────────

export const EIS_NOTIFICATION_TYPES = [
  "EF2020",
  "EOK2020",
  "EZK2020",
  "EZT2020",
  "EMZ2025",
  "Cancel",
] as const;

export type EisNotificationType = (typeof EIS_NOTIFICATION_TYPES)[number];

export const EIS_NOTIFICATION_TYPE_LABELS: Record<EisNotificationType, string> =
  {
    EF2020: "notificationEF2020 — Электронный аукцион (ЭА20)",
    EOK2020: "notificationEOK2020 — Открытый конкурс в ЭФ (ЭОК20)",
    EZK2020: "notificationEZK2020 — Запрос котировок в ЭФ (ЭЗК20)",
    EZT2020: "notificationEZT2020 — Закупка товара по ч. 12 ст. 93 (ЭЗТ20)",
    EMZ2025: "notificationEMZ2025 — Закупка у ед. поставщика (п. 4–5 ч. 1 ст. 93)",
    Cancel: "notificationCancel — Извещение об отмене определения поставщика",
  };

export interface EisNotification2020 {
  schemaVersion: "17.0";
  notificationType: EisNotificationType;
  externalId?: string;
  versionNumber: number;
  commonInfo: {
    purchaseNumber: string | null;
    docNumber?: string;
    directDT?: string;
    publishDTInEIS?: string;
    href?: string;
    plannedPublishDate: string;
    purchaseObjectInfo: string;
    placingWayCode: string;
    etpCode?: string;
    etpName: string;
    etpUrl: string;
    article15Features?: EisArticle15Part;
    isGOZ: boolean;
    notPublishedOnEIS: boolean;
    isBudgetUnionState: boolean;
  };
  purchaseResponsibleInfo: {
    responsibleOrgName: string;
    responsibleRole: EisResponsibleRole;
    specializedOrg?: {
      fullName: string;
      inn?: string;
      kpp?: string;
      address?: string;
    };
    contactPerson: {
      lastName: string;
      firstName: string;
      middleName?: string;
    };
    contactEmail: string;
    contactPhone: string;
    contactFax?: string;
    addInfo?: string;
  };
  notificationInfo: {
    procedureInfo: {
      collectingStartDT?: string;
      collectingEndDate: string;
      collectingEndTime: string;
      firstPartsDate?: string;
      submissionProcedureDate?: string;
      secondPartsDate?: string;
      biddingDate?: string;
      summarizingDate: string;
      additionalInfo?: string;
    };
    contractConditionsInfo: {
      maxPrice: number;
      currencyCode: "RUB";
      interbudgetaryTransfer: boolean;
      isContractPriceFormula: boolean;
      contractPriceFormulaText?: string;
      standardContractNumber?: string;
      contractLifeCycle: boolean;
      contractLifeCycleCases: string[];
      oneSideRejectionSt95: boolean;
      oneSideRejectionSt95Text?: string;
    };
    customerRequirementInfo: {
      tenderPlan2020Info: {
        plan2020Number?: string;
        position2020Number?: string;
        position2020ExtNumber?: string;
        positionSerialNumber?: string;
      };
      ikz: string;
      contractGuarantee?: {
        part: number;
        procedureInfo?: string;
        unableProvideReason?: string;
      };
      applicationGuarantee?: {
        part: number;
        procedureInfo?: string;
      };
      warrantyInfo?: {
        warrantyServiceRequirement?: string;
        manufacturersWarrantyRequirement?: string;
        warrantyTerm?: string;
      };
      deliveryTerm: {
        isRelative: boolean;
        relativeTermsInfo?: {
          start: number;
          startDayType: "C" | "W";
          term: number;
          termDayType: "C" | "W";
        };
        notRelativeTermsInfo?: {
          startDate?: string;
          endDate?: string;
          isFromConclusionDate?: boolean;
          isNotEarlierConclusionDate?: boolean;
        };
      };
      deliveryPlacesInfo: Array<{
        countryCode: string;
        countryFullName: string;
        garGuid?: string;
        deliveryPlace: string;
      }>;
      bankSupportContractRequired: boolean;
      treasurySupportContractRequired: boolean;
      treasurySupportContractType?: string;
    };
    purchaseObjectsInfo: {
      isMedicines: boolean;
      isStructuredForm: boolean;
      quantityUndefined: boolean;
      objects: Array<{
        externalSid?: string;
        type: EisProductType;
        okpd2Code?: string;
        ktruCode?: string;
        name: string;
        okeiCode?: string;
        okeiName: string;
        quantity: number;
        price: number;
        sum: number;
        volumeSpecifyingMethod: "QF" | "SF";
        volumeTextForm?: string;
        trademark?: string;
        isMedicalProduct?: boolean;
        isSoftware?: boolean;
        restrictionSt14?: {
          mode: "none" | "ban" | "restriction" | "advantage";
          imposibilityBan: boolean;
          imposibilityBanReason?: string;
        };
      }>;
    };
    criteriaInfo: Array<{
      group: "cost" | "qualitative";
      code: EisCostCriterionCode | EisQualitativeCriterionCode;
      valueInfo: number;
      indicatorsCount: number;
    }>;
    flags: {
      purchaseObjectsCh9St37: boolean;
      competitionCh19St48: boolean;
      isExecutionStagesTerms: boolean;
    };
  };
  modificationInfo?: {
    info?: string;
    addInfo?: string;
    reasonCode?: string;
    reasonName?: string;
  };
  cancelReasonInfo?: {
    reasonCode?: string;
    reasonName?: string;
    addInfo?: string;
  };
  serviceSigns: {
    isIncludeKOKS: boolean;
    isControlP1Ch5St99: boolean;
    is449Features: boolean;
  };
}

// ─── Вспомогательные функции и мапперы ───────────────────────────────────────

export const Eis17ValidationIssueSchema = z.object({
  severity: z.enum(["error", "warning"]),
  field: z.string(),
  message: z.string(),
});

export type Eis17ValidationIssue = z.infer<typeof Eis17ValidationIssueSchema>;

export interface Eis17ValidationResult {
  valid: boolean;
  issues: Eis17ValidationIssue[];
  errorsCount: number;
  warningsCount: number;
}

/**
 * Определяет XSD-тип извещения ЕИС 17.0 по коду способа определения поставщика.
 */
export const inferNotificationType = (
  placingWayCode?: string,
  explicitType?: EisNotificationType,
): EisNotificationType => {
  if (explicitType) {
    return explicitType;
  }

  const normalized = (placingWayCode ?? "").trim().toUpperCase();
  if (normalized.startsWith("EA")) return "EF2020";
  if (normalized.startsWith("OK") || normalized.startsWith("EOK")) {
    return "EOK2020";
  }
  if (normalized.startsWith("ZK")) return "EZK2020";
  if (normalized.startsWith("EZT")) return "EZT2020";
  if (normalized.startsWith("EP") || normalized.startsWith("EMZ")) {
    return "EMZ2025";
  }

  return "EOK2020";
};

/**
 * Сопоставляет внутренний тип критерия Положения № 2604 с кодом критерия XSD 17.0.
 */
export const mapCriterionTypeToEis17 = (
  type: NoticeEvaluationCriterionType,
): {
  group: "cost" | "qualitative";
  code: EisCostCriterionCode | EisQualitativeCriterionCode;
} => {
  switch (type) {
    case "price":
      return { group: "cost", code: "CP" };
    case "lifecycle_cost":
      return { group: "cost", code: "MC" };
    case "exploitation_expenses":
      return { group: "cost", code: "TC" };
    case "energy_service_expenses":
      return { group: "cost", code: "EN" };
    case "qualification":
      return { group: "qualitative", code: "QF" };
    case "qualitative_characteristics":
    default:
      return { group: "qualitative", code: "QO" };
  }
};

const moneyNum = (value: string | number | undefined): number =>
  Math.round((toNumber(value) ?? 0) * 100) / 100;

const emptyFinance = (): EisTenderPlan2020FinanceResources => ({
  total: 0,
  currentYear: 0,
  firstYear: 0,
  secondYear: 0,
  subsecYears: 0,
});

const positionFinance = (
  pos: Pick<
    PurchasePlanPosition,
    | "amountTotal"
    | "amountCurrentYear"
    | "amountPlanPeriodFirstYear"
    | "amountPlanPeriodSecondYear"
    | "amountSubsequentYears"
  >,
): EisTenderPlan2020FinanceResources => ({
  total: moneyNum(pos.amountTotal),
  currentYear: moneyNum(pos.amountCurrentYear),
  firstYear: moneyNum(pos.amountPlanPeriodFirstYear),
  secondYear: moneyNum(pos.amountPlanPeriodSecondYear),
  subsecYears: moneyNum(pos.amountSubsequentYears),
});

/**
 * Преобразует план-график фронтенда в структуру tenderPlan2020Type (ЕИС 17.0).
 */
export const mapPurchasePlanToEis17 = (plan: PurchasePlan): EisTenderPlan2020 => {
  const planYearNum = Number(plan.planYear) || new Date().getFullYear();
  const firstYear =
    Number(plan.planPeriodFirstYear) || planYearNum + 1;
  const secondYear =
    Number(plan.planPeriodSecondYear) || planYearNum + 2;

  const orgDto: EisTenderPlan2020Organization = {
    regNum: plan.customer.regNum || undefined,
    consRegistryNum: plan.customer.consRegistryNum || undefined,
    fullName: plan.customer.fullName,
    inn: plan.customer.inn,
    kpp: plan.customer.kpp || undefined,
    oktmoCode: plan.customer.oktmo || undefined,
    factAddress: plan.customer.legalAddress || undefined,
    phone: plan.customer.phone || undefined,
    email: plan.customer.email || undefined,
  };

  const totals = plan.positions.reduce<EisTenderPlan2020FinanceResources>(
    (acc, pos) => {
      const f = positionFinance(pos);
      return {
        total: Math.round((acc.total + f.total) * 100) / 100,
        currentYear: Math.round((acc.currentYear + f.currentYear) * 100) / 100,
        firstYear: Math.round((acc.firstYear + f.firstYear) * 100) / 100,
        secondYear: Math.round((acc.secondYear + f.secondYear) * 100) / 100,
        subsecYears: Math.round((acc.subsecYears + f.subsecYears) * 100) / 100,
      };
    },
    emptyFinance(),
  );

  const positions: EisTenderPlan2020Position[] = plan.positions.map((pos) => {
    const fin = positionFinance(pos);
    const kbksInfo = positionKbkEntries(pos).map((entry) => ({
      kbk: entry.kbk ?? "",
      yearsInfo: {
        total: moneyNum(entry.amountTotal) || fin.total,
        currentYear: moneyNum(entry.amountCurrentYear),
        firstYear: moneyNum(entry.amountPlanPeriodFirstYear),
        secondYear: moneyNum(entry.amountPlanPeriodSecondYear),
        subsecYears: moneyNum(entry.amountSubsequentYears),
      },
    }));

    const kvrsInfo = (pos.kvrEntries ?? []).map((entry) => ({
      kvrCode: entry.kvr ?? "",
      yearsInfo: {
        total: moneyNum(entry.amountTotal),
        currentYear: moneyNum(entry.amountCurrentYear),
        firstYear: moneyNum(entry.amountPlanPeriodFirstYear),
        secondYear: moneyNum(entry.amountPlanPeriodSecondYear),
        subsecYears: moneyNum(entry.amountSubsequentYears),
      },
    }));

    const koksInfo = (pos.koksEntries ?? []).map((entry) => ({
      koksCode: entry.koksCode,
      koksName: entry.koksName || undefined,
      yearsInfo: {
        total: moneyNum(entry.amountTotal),
        currentYear: moneyNum(entry.amountCurrentYear),
        firstYear: moneyNum(entry.amountPlanPeriodFirstYear),
        secondYear: moneyNum(entry.amountPlanPeriodSecondYear),
        subsecYears: moneyNum(entry.amountSubsequentYears),
      },
    }));

    const okpdList =
      pos.okpd2Items && pos.okpd2Items.length > 0
        ? pos.okpd2Items.map((item) => ({
            okpdCode: item.okpd2Code,
            okpdName: item.okpd2Name,
          }))
        : pos.okpd2Code
          ? [{ okpdCode: pos.okpd2Code, okpdName: pos.okpd2Name }]
          : [];

    const hasModification =
      pos.status === "changed" ||
      pos.status === "cancelled" ||
      Boolean(pos.modificationStatus) ||
      Boolean(pos.changeReasonCode);

    return {
      positionNumber: pos.uniqueNumber || undefined,
      extNumber: pos.extNumber || undefined,
      ikz: pos.identificationCode ?? "",
      publishYear: Number(pos.plannedPlacementYear) || planYearNum,
      iku: pos.iku || undefined,
      purchaseNumber: pos.purchaseNumber ?? "",
      purchaseOrderNumber: pos.purchaseOrderNumber || "000",
      okpd2Codes: okpdList,
      okpd2MultipleZeroCode: Boolean(pos.hasMultipleOkpd2) || okpdList.length > 1,
      ktruCode: pos.ktruCode || undefined,
      ktruName: pos.ktruName || undefined,
      kvrCode: pos.kvr || (pos.kbk ? pos.kbk.slice(-3) : undefined),
      purchaseObjectInfo: pos.objectOfPurchase,
      publicDiscussion: Boolean(pos.isPublicDiscussionRequired),
      positionCanceled: pos.status === "cancelled",
      positionModificationStatus:
        pos.modificationStatus ??
        (pos.status === "changed" || pos.status === "cancelled"
          ? "E"
          : undefined),
      positionModification: hasModification
        ? {
            changeReasonCode: pos.changeReasonCode || undefined,
            changeReasonName: pos.changeReasonName || undefined,
            decision:
              pos.modificationDecision ??
              (pos.status === "cancelled"
                ? "purchaseCanceled"
                : pos.status === "changed"
                  ? "purchaseChanged"
                  : "notSpecified"),
            description: pos.modificationDescription || undefined,
            modificationNumber: Number(plan.versionNumber) || undefined,
          }
        : undefined,
      centralizedPurchaseOrg: pos.authorizedBodyName || undefined,
      jointBiddingOrg: pos.jointOrganizerName || undefined,
      financeInfo: fin,
      kbksInfo,
      kvrsInfo,
      koksInfo,
      isEnergyServiceContract: Boolean(pos.isEnergyServiceContract),
      isProvisionLendingServices: Boolean(pos.isProvisionLendingServices),
      isConstructionWorks: Boolean(pos.isConstructionWorks),
      isNotFederalFinancing: Boolean(pos.isNotFederalFinancing),
      notPublishedOnEIS: Boolean(pos.notPublishedOnEIS),
    };
  });

  const specialPurchases: EisTenderPlan2020SpecialPurchase[] = (
    plan.specialPurchases ?? []
  ).map((sp) => ({
    id: sp.id ? String(sp.id) : undefined,
    // В черновике код типа может быть не заполнен: в DTO отдаём пустую
    // строку, а ошибку выгрузки покажет validatePurchasePlanEis17
    typeCode: sp.typeCode ?? "",
    typeName: sp.typeName,
    ikz: sp.ikz,
    iku: sp.iku,
    positionNumber: sp.positionNumber,
    extNumber: sp.extNumber,
    kvr: sp.kvr,
    kbk: sp.kbk,
    koksCode: sp.koksCode,
    publishYear: Number(sp.publishYear) || planYearNum,
    purchaseNumber: sp.purchaseNumber,
    modificationStatus: sp.modificationStatus,
    financeInfo: positionFinance(sp),
  }));

  return {
    schemaVersion: "17.0",
    externalId: plan.externalId || undefined,
    planNumber: plan.planNumber,
    versionNumber: Number(plan.versionNumber) || 1,
    commonInfo: {
      planYear: planYearNum,
      planPeriod: {
        firstYear,
        secondYear,
      },
      ownerRole: plan.ownerRole ?? "CU",
      pfhdType: plan.pfhdType,
      directDate: plan.directDate || undefined,
      createDate: plan.createDate || undefined,
      confirmDate: plan.approvalDate || undefined,
      publishDate: plan.publishDate || undefined,
      firstVersionPublishDate: plan.firstVersionPublishDate || undefined,
      eisUrl: plan.eisUrl || undefined,
      owner: orgDto,
      customer: orgDto,
    },
    positions,
    specialPurchases,
    totals,
  };
};

/**
 * Преобразует извещение фронтенда в структуру notification2020Type (ЕИС 17.0).
 */
export const mapNoticeInfoToEis17 = (
  notice: NoticeInfoFormValues,
): EisNotification2020 => {
  const notificationType = inferNotificationType(
    notice.generalInfo.placingWayCode,
    notice.notificationType,
  );
  const phone = notice.contactInfo.phoneNum;
  const fax = notice.contactInfo.faxNum;
  const formatPhone = (p: typeof phone) =>
    p.cityCode || p.num
      ? `${p.countryCode || "7"}-${p.cityCode}-${p.num}${p.numExt ? ` доб. ${p.numExt}` : ""}`
      : "";

  const firstPlace = notice.contractConditions.deliveryPlaces?.[0];

  return {
    schemaVersion: "17.0",
    notificationType,
    externalId: notice.externalId || undefined,
    versionNumber: Number(notice.versionNumber ?? 1) || 1,
    commonInfo: {
      purchaseNumber: notice.generalInfo.noticeNumber,
      directDT: notice.generalInfo.directDT || undefined,
      publishDTInEIS: notice.generalInfo.publishDTInEIS || undefined,
      href: notice.generalInfo.href || undefined,
      plannedPublishDate: notice.procedureInfo.plannedPublishDate,
      purchaseObjectInfo: notice.generalInfo.orderName,
      placingWayCode: notice.generalInfo.placingWayCode,
      etpName: notice.generalInfo.etpName,
      etpUrl: notice.generalInfo.etpUrl,
      article15Features: notice.generalInfo.article15Features || undefined,
      isGOZ: Boolean(notice.generalInfo.isGOZ),
      notPublishedOnEIS: Boolean(notice.generalInfo.notPublishedOnEIS),
      isBudgetUnionState: Boolean(notice.generalInfo.isBudgetUnionState),
    },
    purchaseResponsibleInfo: {
      responsibleOrgName: notice.contactInfo.organizationName,
      responsibleRole:
        notice.contactInfo.responsibleRole ??
        (notice.generalInfo.placementOrganizerType === "joint_organizer"
          ? "CC"
          : "CU"),
      specializedOrg: notice.contactInfo.specializedOrgName
        ? {
            fullName: notice.contactInfo.specializedOrgName,
            inn: notice.contactInfo.specializedOrgInn || undefined,
            kpp: notice.contactInfo.specializedOrgKpp || undefined,
            address: notice.contactInfo.specializedOrgAddress || undefined,
          }
        : undefined,
      contactPerson: {
        lastName: notice.contactInfo.placerSurname,
        firstName: notice.contactInfo.placerName,
        middleName: notice.contactInfo.placerFathername || undefined,
      },
      contactEmail: notice.contactInfo.placerEmail,
      contactPhone: formatPhone(phone),
      contactFax: formatPhone(fax) || undefined,
      addInfo: notice.contactInfo.otherInfo || undefined,
    },
    notificationInfo: {
      procedureInfo: {
        collectingStartDT: notice.procedureInfo.collectingStartDT || undefined,
        collectingEndDate: notice.procedureInfo.submissionEndDate,
        collectingEndTime: notice.procedureInfo.submissionEndTime,
        firstPartsDate: notice.procedureInfo.firstPartsDate || undefined,
        submissionProcedureDate:
          notice.procedureInfo.submissionProcedureDate || undefined,
        secondPartsDate:
          notice.procedureInfo.secondPartsReviewEndDate || undefined,
        biddingDate: notice.procedureInfo.biddingDate || undefined,
        summarizingDate: notice.procedureInfo.summingUpDate,
        additionalInfo: notice.procedureInfo.additionalInfo || undefined,
      },
      contractConditionsInfo: {
        maxPrice: notice.generalInfo.nmck,
        currencyCode: "RUB",
        interbudgetaryTransfer: Boolean(
          notice.contractConditions.interbudgetaryTransfer,
        ),
        isContractPriceFormula: Boolean(
          notice.contractConditions.usePriceFormulaPP19,
        ),
        contractPriceFormulaText:
          notice.contractConditions.priceFormulaText || undefined,
        standardContractNumber:
          notice.contractConditions.typicalConditionsNumber || undefined,
        contractLifeCycle: Boolean(
          notice.contractConditions.isLifecycleContract,
        ),
        contractLifeCycleCases:
          notice.contractConditions.lifecycleCasesPP1087 ?? [],
        oneSideRejectionSt95: Boolean(
          notice.contractConditions.allowUnilateralRefusalArt95,
        ),
        oneSideRejectionSt95Text:
          notice.contractConditions.oneSideRejectionSt95Text || undefined,
      },
      customerRequirementInfo: {
        tenderPlan2020Info: {
          plan2020Number: notice.generalInfo.plan2020Number || undefined,
          position2020Number:
            notice.generalInfo.positionUniqueNumber || undefined,
          position2020ExtNumber:
            notice.generalInfo.position2020ExtNumber || undefined,
          positionSerialNumber:
            notice.generalInfo.positionSerialNumber || undefined,
        },
        ikz: notice.generalInfo.ikz,
        contractGuarantee: notice.participantsRequirements
          .requiresContractSecurity
          ? {
              part: notice.participantsRequirements.contractSecurityPercent,
              procedureInfo:
                notice.participantsRequirements.contractSecurityOrder ||
                undefined,
            }
          : notice.participantsRequirements
                .unableProvideContractGuaranteeReason
            ? {
                part: 0,
                unableProvideReason:
                  notice.participantsRequirements
                    .unableProvideContractGuaranteeReason,
              }
            : undefined,
        applicationGuarantee: notice.participantsRequirements
          .requiresApplicationSecurity
          ? {
              part: notice.participantsRequirements.applicationSecurityPercent,
              procedureInfo:
                notice.participantsRequirements.applicationSecurityOrder ||
                undefined,
            }
          : undefined,
        warrantyInfo: notice.participantsRequirements.requiresQualityWarranty
          ? {
              warrantyServiceRequirement:
                notice.participantsRequirements.warrantyMaintenanceInfo ||
                undefined,
              manufacturersWarrantyRequirement:
                notice.participantsRequirements.manufacturerWarrantyInfo ||
                undefined,
              warrantyTerm:
                notice.participantsRequirements.warrantyTermAndVolume ||
                undefined,
            }
          : undefined,
        deliveryTerm: notice.contractConditions.isRelativeTerms
          ? {
              isRelative: true,
              relativeTermsInfo: {
                start: notice.contractConditions.startOffsetDays,
                startDayType: notice.contractConditions.startDayType ?? "C",
                term: notice.contractConditions.durationDays,
                termDayType: notice.contractConditions.termDayType ?? "C",
              },
            }
          : {
              isRelative: false,
              notRelativeTermsInfo: {
                startDate: notice.contractConditions.startDate || undefined,
                endDate: notice.contractConditions.endDate || undefined,
                isFromConclusionDate: Boolean(
                  notice.contractConditions.isFromConclusionDate,
                ),
                isNotEarlierConclusionDate: Boolean(
                  notice.contractConditions.isNotEarlierConclusionDate,
                ),
              },
            },
        deliveryPlacesInfo: (
          notice.contractConditions.deliveryPlaces ?? (firstPlace ? [firstPlace] : [])
        ).map((place) => ({
          countryCode: place.oksmCode || "643",
          countryFullName: place.country || "Российская Федерация",
          garGuid: place.garGuid || undefined,
          deliveryPlace: [
            place.region,
            place.municipality,
            place.settlement,
            place.address,
            place.additionalInfo,
          ]
            .filter(Boolean)
            .join(", "),
        })),
        bankSupportContractRequired: Boolean(
          notice.participantsRequirements.requiresBankSupport,
        ),
        treasurySupportContractRequired: Boolean(
          notice.participantsRequirements.requiresTreasurySupport,
        ),
        treasurySupportContractType:
          notice.participantsRequirements.treasurySupportType || undefined,
      },
      purchaseObjectsInfo: {
        isMedicines: Boolean(notice.purchaseObjects.isMedicines),
        isStructuredForm: notice.purchaseObjects.isStructuredForm ?? true,
        quantityUndefined: Boolean(
          notice.purchaseObjects.isIndeterminateVolume,
        ),
        objects: notice.purchaseObjects.items.map((item) => {
          const code = item.okpd2OrKtruCode || "";
          const looksLikeKtru = Boolean(item.ktruCode) || /^\d{2}\.\d{2}\.\d{2}\.\d{3}-\d{8}$/.test(code);
          return {
            externalSid: item.externalSid || item.id,
            type: item.productType ?? "PRODUCT",
            okpd2Code: item.okpd2Code || (!looksLikeKtru ? code : undefined),
            ktruCode: item.ktruCode || (looksLikeKtru ? code : undefined),
            name: item.name,
            okeiCode: item.okeiCode || undefined,
            okeiName: item.unit,
            quantity: item.quantity,
            price: item.unitPrice,
            sum: item.totalPrice,
            volumeSpecifyingMethod:
              item.volumeSpecifyingMethod ??
              (notice.purchaseObjects.isIndeterminateVolume ? "SF" : "QF"),
            volumeTextForm: item.volumeTextForm || undefined,
            trademark: item.trademarks || undefined,
            isMedicalProduct: item.isMedicalProduct,
            isSoftware: item.isSoftware,
            restrictionSt14: {
              mode: item.nationalRegimeType,
              imposibilityBan: Boolean(item.imposibilityBan),
              imposibilityBanReason: item.imposibilityBanReason || undefined,
            },
          };
        }),
      },
      criteriaInfo: notice.participantsRequirements.evaluationCriteria
        .filter((crit) => crit.enabled)
        .map((crit) => {
          const mapped = mapCriterionTypeToEis17(crit.type);
          return {
            group: mapped.group,
            code: mapped.code,
            valueInfo: crit.weightPercent,
            indicatorsCount: crit.indicators?.length ?? 0,
          };
        }),
      flags: {
        purchaseObjectsCh9St37: Boolean(notice.purchaseObjectsCh9St37),
        competitionCh19St48: Boolean(notice.generalInfo.isPart19Art48),
        isExecutionStagesTerms: Boolean(
          notice.contractConditions.isExecutionStagesTerms,
        ),
      },
    },
    modificationInfo: notice.modificationInfo?.reasonCode
      ? {
          info: notice.modificationInfo.info,
          addInfo: notice.modificationInfo.addInfo,
          reasonCode: notice.modificationInfo.reasonCode,
          reasonName: notice.modificationInfo.reasonName,
        }
      : undefined,
    cancelReasonInfo:
      notificationType === "Cancel" || notice.cancelReasonInfo?.reasonCode
        ? {
            reasonCode: notice.cancelReasonInfo?.reasonCode,
            reasonName: notice.cancelReasonInfo?.reasonName,
            addInfo: notice.cancelReasonInfo?.addInfo,
          }
        : undefined,
    serviceSigns: {
      isIncludeKOKS: Boolean(notice.serviceSigns?.isIncludeKOKS),
      isControlP1Ch5St99: Boolean(notice.serviceSigns?.isControlP1Ch5St99),
      is449Features: Boolean(notice.generalInfo.is449Features),
    },
  };
};

// ─── Валидация полноты по XSD-схемам ЕИС 17.0 ────────────────────────────────

export const validatePurchasePlanEis17 = (
  plan: PurchasePlan,
): Eis17ValidationResult => {
  const issues: Eis17ValidationIssue[] = [];

  if (!plan.ownerRole) {
    issues.push({
      severity: "warning",
      field: "ownerRole",
      message:
        "Не указана роль владельца версии (ownerRole: CU / OA по IntegrationTPTypes.xsd). При выгрузке принята CU.",
    });
  }

  if (!plan.customer.regNum && !plan.customer.consRegistryNum) {
    issues.push({
      severity: "warning",
      field: "customer.regNum",
      message:
        "Не заполнены код по СПЗ (regNum) или код по Сводному реестру (consRegistryNum) — обязательны при передаче XML в ЕИС.",
    });
  }

  // Реестровый номер плана-графика — 18 цифр: год (4), код заказчика по СПЗ
  // (11), порядковый номер плана (3). От него зависит уникальный номер позиции
  const planDigits = String(plan.planNumber ?? "").replace(/\D/g, "");
  if (planDigits.length !== 18) {
    issues.push({
      severity: "error",
      field: "planNumber",
      message:
        `Реестровый номер плана-графика содержит ${planDigits.length} цифр вместо 18: ` +
        `год (4) + код заказчика по СПЗ (11) + порядковый номер плана (3). ` +
        `Без него уникальный номер позиции не собирается в 24 знака.`,
    });
  }

  plan.positions.forEach((pos, idx) => {
    const label = `Позиция № ${pos.serialNumber || idx + 1}`;
    const ikz = (pos.identificationCode ?? "").trim();

    if (!ikz) {
      issues.push({
        severity: "error",
        field: `positions[${idx}].identificationCode`,
        message: `${label}: отсутствует ИКЗ (по приказу Минфина России от 10.04.2019 № 55н — 36 цифр).`,
      });
    } else if (!EIS_IKZ_PATTERN.test(ikz)) {
      issues.push({
        severity: "error",
        field: `positions[${idx}].identificationCode`,
        message: `${label}: ИКЗ «${ikz}» содержит ${ikz.length} симв. вместо 36 цифр по приказу Минфина России от 10.04.2019 № 55н.`,
      });
    }

    if (!pos.uniqueNumber && !pos.extNumber) {
      issues.push({
        severity: "warning",
        field: `positions[${idx}].extNumber`,
        message: `${label}: отсутствуют positionNumber и extNumber (требуются для связки tenderPlan2020Info в извещении).`,
      });
    }

    // tenderPlan2020PositonNumberType — xs:length 24: 18 цифр номера
    // плана-графика + 6 цифр внутреннего номера позиции
    if (pos.uniqueNumber && !/^\d{24}$/.test(String(pos.uniqueNumber))) {
      issues.push({
        severity: "error",
        field: `positions[${idx}].uniqueNumber`,
        message:
          `${label}: уникальный номер позиции «${pos.uniqueNumber}» содержит ` +
          `${String(pos.uniqueNumber).length} симв. вместо 24 (18 цифр номера плана-графика + 6 цифр номера позиции).`,
      });
    }

    if (pos.status === "changed" || pos.status === "cancelled") {
      if (!pos.changeReasonCode && !pos.modificationDescription) {
        issues.push({
          severity: "warning",
          field: `positions[${idx}].changeReasonCode`,
          message: `${label}: для изменённой/исключённой позиции XSD 17.0 требует блок positionModification (основание и решение).`,
        });
      }
    }

    if (pos.isConstructionWorks && (!pos.koksEntries || pos.koksEntries.length === 0)) {
      issues.push({
        severity: "warning",
        field: `positions[${idx}].koksEntries`,
        message: `${label}: отмечено строительство/ОКС, но не заполнена детализация по КОКС (KOKSsInfo).`,
      });
    }
  });

  // Особые закупки: пустой typeCode допустим в черновике (строка только
  // добавлена), но в ЕИС 17.0 такая позиция не пройдёт контроль
  (plan.specialPurchases ?? []).forEach((special, idx) => {
    if (!String(special.typeCode ?? "").trim()) {
      issues.push({
        severity: "error",
        field: `specialPurchases[${idx}].typeCode`,
        message:
          `Особая закупка № ${idx + 1}: не указан код типа особой закупки (typeCode) — ` +
          `без него позиция specialPurchasePositions не пройдёт контроль ЕИС 17.0.`,
      });
    }
  });

  const errorsCount = issues.filter((i) => i.severity === "error").length;
  const warningsCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorsCount === 0,
    issues,
    errorsCount,
    warningsCount,
  };
};

export const validateNoticeInfoEis17 = (
  notice: NoticeInfoFormValues,
): Eis17ValidationResult => {
  const issues: Eis17ValidationIssue[] = [];
  const dto = mapNoticeInfoToEis17(notice);

  if (!EIS_IKZ_PATTERN.test(dto.notificationInfo.customerRequirementInfo.ikz.trim())) {
    issues.push({
      severity: "error",
      field: "generalInfo.ikz",
      message:
        "ИКЗ извещения должен состоять ровно из 36 цифр (приказ Минфина России от 10.04.2019 № 55н).",
    });
  }

  if (
    !dto.notificationInfo.customerRequirementInfo.tenderPlan2020Info
      .plan2020Number &&
    !dto.notificationInfo.customerRequirementInfo.tenderPlan2020Info
      .position2020Number
  ) {
    issues.push({
      severity: "warning",
      field: "generalInfo.plan2020Number",
      message:
        "Не заполнен блок tenderPlan2020Info (номер ПГ / реестровый или внешний номер позиции ПГ).",
    });
  }

  if (
    dto.notificationType === "EOK2020" &&
    !dto.notificationInfo.procedureInfo.firstPartsDate
  ) {
    issues.push({
      severity: "warning",
      field: "procedureInfo.firstPartsDate",
      message:
        "Для электронного конкурса (notificationEOK2020) рекомендуется указать дату рассмотрения и оценки первых частей заявок (firstPartsDate).",
    });
  }

  if (
    dto.notificationType === "EF2020" &&
    !dto.notificationInfo.procedureInfo.biddingDate
  ) {
    issues.push({
      severity: "warning",
      field: "procedureInfo.biddingDate",
      message:
        "Для электронного аукциона (notificationEF2020) в XSD 17.0 предусмотрена дата проведения процедуры подачи ценовых предложений (biddingDate).",
    });
  }

  if (
    !dto.notificationInfo.customerRequirementInfo.deliveryTerm.isRelative &&
    (!dto.notificationInfo.customerRequirementInfo.deliveryTerm
      .notRelativeTermsInfo?.startDate ||
      !dto.notificationInfo.customerRequirementInfo.deliveryTerm
        .notRelativeTermsInfo?.endDate)
  ) {
    issues.push({
      severity: "error",
      field: "contractConditions.startDate",
      message:
        "При не относительных сроках (notRelativeTermsInfo) укажите календарные даты начала и окончания исполнения контракта.",
    });
  }

  dto.notificationInfo.customerRequirementInfo.deliveryPlacesInfo.forEach(
    (place, idx) => {
      if (!place.garGuid) {
        issues.push({
          severity: "warning",
          field: `contractConditions.deliveryPlaces.${idx}.garGuid`,
          message: `Место поставки № ${idx + 1}: не указан GUID ГАР (byGARInfoType/GARInfo).`,
        });
      }
    },
  );

  dto.notificationInfo.purchaseObjectsInfo.objects.forEach((obj, idx) => {
    if (!obj.okpd2Code && !obj.ktruCode) {
      issues.push({
        severity: "error",
        field: `purchaseObjects.items.${idx}.okpd2OrKtruCode`,
        message: `Позиция объекта № ${idx + 1}: отсутствует код ОКПД2 или КТРУ.`,
      });
    }
    if (obj.restrictionSt14?.imposibilityBan && !obj.restrictionSt14.imposibilityBanReason) {
      issues.push({
        severity: "error",
        field: `purchaseObjects.items.${idx}.imposibilityBanReason`,
        message: `Позиция объекта № ${idx + 1}: отмечена невозможность применения запрета/ограничения по ст. 14 — укажите обоснование (imposibilityBanReason).`,
      });
    }
  });

  const errorsCount = issues.filter((i) => i.severity === "error").length;
  const warningsCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorsCount === 0,
    issues,
    errorsCount,
    warningsCount,
  };
};

// ─── Предпросмотр XML по структурам ЕИС 17.0 ─────────────────────────────────

const escapeXml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const buildTenderPlan2020XmlPreview = (plan: PurchasePlan): string => {
  const dto = mapPurchasePlanToEis17(plan);
  const positionsXml = dto.positions
    .map(
      (pos) => `    <position>
      <commonInfo>
        ${pos.positionNumber ? `<positionNumber>${escapeXml(pos.positionNumber)}</positionNumber>` : ""}
        ${pos.extNumber ? `<extNumber>${escapeXml(pos.extNumber)}</extNumber>` : ""}
        <IKZ>${escapeXml(pos.ikz)}</IKZ>
        <publishYear>${pos.publishYear}</publishYear>
        ${pos.iku ? `<IKU>${escapeXml(pos.iku)}</IKU>` : ""}
        <purchaseNumber>${escapeXml(pos.purchaseNumber)}</purchaseNumber>
        <purchaseObjectInfo>${escapeXml(pos.purchaseObjectInfo)}</purchaseObjectInfo>
        <publicDiscussion>${pos.publicDiscussion}</publicDiscussion>
        <positionCanceled>${pos.positionCanceled}</positionCanceled>
        ${
          pos.positionModificationStatus
            ? `<positionModificationStatus>${pos.positionModificationStatus}</positionModificationStatus>`
            : ""
        }
      </commonInfo>
      <financeInfo>
        <total>${pos.financeInfo.total.toFixed(2)}</total>
        <currentYear>${pos.financeInfo.currentYear.toFixed(2)}</currentYear>
        <firstYear>${pos.financeInfo.firstYear.toFixed(2)}</firstYear>
        <secondYear>${pos.financeInfo.secondYear.toFixed(2)}</secondYear>
        <subsecYears>${pos.financeInfo.subsecYears.toFixed(2)}</subsecYears>
      </financeInfo>
      <isEnergyServiceContract>${pos.isEnergyServiceContract}</isEnergyServiceContract>
      <isProvisionLendingServices>${pos.isProvisionLendingServices}</isProvisionLendingServices>
      <isConstructionWorks>${pos.isConstructionWorks}</isConstructionWorks>
    </position>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<tenderPlan2020 xmlns="http://zakupki.gov.ru/oos/TPtypes/1" schemeVersion="${dto.schemaVersion}">
  ${dto.externalId ? `<externalId>${escapeXml(dto.externalId)}</externalId>` : ""}
  <planNumber>${escapeXml(dto.planNumber)}</planNumber>
  <versionNumber>${dto.versionNumber}</versionNumber>
  <commonInfo>
    <planYear>${dto.commonInfo.planYear}</planYear>
    <planPeriod>
      <firstYear>${dto.commonInfo.planPeriod.firstYear}</firstYear>
      <secondYear>${dto.commonInfo.planPeriod.secondYear}</secondYear>
    </planPeriod>
    <ownerRole>${dto.commonInfo.ownerRole}</ownerRole>
    ${dto.commonInfo.pfhdType ? `<PFHD>${dto.commonInfo.pfhdType}</PFHD>` : ""}
    <customerInfo>
      ${dto.commonInfo.customer.regNum ? `<regNum>${escapeXml(dto.commonInfo.customer.regNum)}</regNum>` : ""}
      <fullName>${escapeXml(dto.commonInfo.customer.fullName)}</fullName>
      <INN>${escapeXml(dto.commonInfo.customer.inn)}</INN>
      ${dto.commonInfo.customer.kpp ? `<KPP>${escapeXml(dto.commonInfo.customer.kpp)}</KPP>` : ""}
    </customerInfo>
  </commonInfo>
  <positions>
${positionsXml}
  </positions>
</tenderPlan2020>`;
};

export const buildNotification2020XmlPreview = (
  notice: NoticeInfoFormValues,
): string => {
  const dto = mapNoticeInfoToEis17(notice);
  const rootTag =
    dto.notificationType === "Cancel"
      ? "notificationCancel"
      : `notification${dto.notificationType}`;

  const objectsXml = dto.notificationInfo.purchaseObjectsInfo.objects
    .map(
      (obj) => `        <purchaseObject>
          <type>${obj.type}</type>
          ${obj.ktruCode ? `<KTRU><code>${escapeXml(obj.ktruCode)}</code></KTRU>` : ""}
          ${obj.okpd2Code ? `<OKPD2><OKPDCode>${escapeXml(obj.okpd2Code)}</OKPDCode></OKPD2>` : ""}
          <name>${escapeXml(obj.name)}</name>
          <OKEI>${obj.okeiCode ? `<code>${escapeXml(obj.okeiCode)}</code>` : ""}<name>${escapeXml(obj.okeiName)}</name></OKEI>
          <price>${obj.price.toFixed(2)}</price>
          <quantity><value>${obj.quantity}</value></quantity>
          <sum>${obj.sum.toFixed(2)}</sum>
          <volumeSpecifyingMethod>${obj.volumeSpecifyingMethod}</volumeSpecifyingMethod>
        </purchaseObject>`,
    )
    .join("\n");

  const criteriaXml = dto.notificationInfo.criteriaInfo
    .map(
      (c) => `        <criterionInfo>
          <criterionCode>${c.code}</criterionCode>
          <valueInfo>${c.valueInfo}</valueInfo>
        </criterionInfo>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<${rootTag} xmlns="http://zakupki.gov.ru/oos/EPtypes/1" schemeVersion="${dto.schemaVersion}">
  ${dto.externalId ? `<externalId>${escapeXml(dto.externalId)}</externalId>` : ""}
  <versionNumber>${dto.versionNumber}</versionNumber>
  <commonInfo>
    ${dto.commonInfo.purchaseNumber ? `<purchaseNumber>${escapeXml(dto.commonInfo.purchaseNumber)}</purchaseNumber>` : ""}
    <plannedPublishDate>${escapeXml(dto.commonInfo.plannedPublishDate)}</plannedPublishDate>
    <purchaseObjectInfo>${escapeXml(dto.commonInfo.purchaseObjectInfo)}</purchaseObjectInfo>
    <placingWay><code>${escapeXml(dto.commonInfo.placingWayCode)}</code></placingWay>
    <ETP><name>${escapeXml(dto.commonInfo.etpName)}</name><url>${escapeXml(dto.commonInfo.etpUrl)}</url></ETP>
    ${dto.commonInfo.article15Features ? `<article15Features>${dto.commonInfo.article15Features}</article15Features>` : ""}
    <isGOZ>${dto.commonInfo.isGOZ}</isGOZ>
    <notPublishedOnEIS>${dto.commonInfo.notPublishedOnEIS}</notPublishedOnEIS>
  </commonInfo>
  <purchaseResponsibleInfo>
    <responsibleRole>${dto.purchaseResponsibleInfo.responsibleRole}</responsibleRole>
    <responsibleOrg><fullName>${escapeXml(dto.purchaseResponsibleInfo.responsibleOrgName)}</fullName></responsibleOrg>
    <responsibleInfo>
      <contactEMail>${escapeXml(dto.purchaseResponsibleInfo.contactEmail)}</contactEMail>
      <contactPhone>${escapeXml(dto.purchaseResponsibleInfo.contactPhone)}</contactPhone>
    </responsibleInfo>
  </purchaseResponsibleInfo>
  <notificationInfo>
    <contractConditionsInfo>
      <maxPriceInfo><maxPrice>${dto.notificationInfo.contractConditionsInfo.maxPrice.toFixed(2)}</maxPrice><currency><code>RUB</code></currency></maxPriceInfo>
      <interbudgetaryTransfer>${dto.notificationInfo.contractConditionsInfo.interbudgetaryTransfer}</interbudgetaryTransfer>
      <contractLifeCycle>${dto.notificationInfo.contractConditionsInfo.contractLifeCycle}</contractLifeCycle>
    </contractConditionsInfo>
    <customerRequirementsInfo>
      <customerRequirementInfo>
        <tenderPlan2020Info>
          ${dto.notificationInfo.customerRequirementInfo.tenderPlan2020Info.plan2020Number ? `<plan2020Number>${escapeXml(dto.notificationInfo.customerRequirementInfo.tenderPlan2020Info.plan2020Number)}</plan2020Number>` : ""}
          ${dto.notificationInfo.customerRequirementInfo.tenderPlan2020Info.position2020Number ? `<position2020Number>${escapeXml(dto.notificationInfo.customerRequirementInfo.tenderPlan2020Info.position2020Number)}</position2020Number>` : ""}
          ${dto.notificationInfo.customerRequirementInfo.tenderPlan2020Info.position2020ExtNumber ? `<position2020ExtNumber>${escapeXml(dto.notificationInfo.customerRequirementInfo.tenderPlan2020Info.position2020ExtNumber)}</position2020ExtNumber>` : ""}
        </tenderPlan2020Info>
        <IKZ>${escapeXml(dto.notificationInfo.customerRequirementInfo.ikz)}</IKZ>
      </customerRequirementInfo>
    </customerRequirementsInfo>
    <purchaseObjectsInfo>
      <isStructuredForm>${dto.notificationInfo.purchaseObjectsInfo.isStructuredForm}</isStructuredForm>
      <notDrugPurchaseObjectsInfo>
${objectsXml}
      </notDrugPurchaseObjectsInfo>
    </purchaseObjectsInfo>
    ${criteriaXml ? `<criteriaInfo>\n${criteriaXml}\n    </criteriaInfo>` : ""}
  </notificationInfo>
  <serviceSigns>
    <isIncludeKOKS>${dto.serviceSigns.isIncludeKOKS}</isIncludeKOKS>
    <isControlP1Ch5St99>${dto.serviceSigns.isControlP1Ch5St99}</isControlP1Ch5St99>
    <is449Features>${dto.serviceSigns.is449Features}</is449Features>
  </serviceSigns>
</${rootTag}>`;
};
