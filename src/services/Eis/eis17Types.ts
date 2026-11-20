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
import type { ContractProject } from "../ContractProject/contractProject.schema";

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
  // Раздел 1 формы ПГ: ОКОПФ, ОКФС и ОКТМО ППО заказчика
  // (tenderPlan2020CommonInfoType/customerInfo)
  okopf?: string;
  okfs?: string;
  oktmoPpo?: string;
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
  isNotFederalFinancing?: boolean;
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
    EMZ2025:
      "notificationEMZ2025 — Закупка у ед. поставщика (п. 4–5 ч. 1 ст. 93)",
    Cancel: "notificationCancel — Извещение об отмене определения поставщика",
  };

// Лекарственный препарат извещения (п. 9 Раздела 1 формы, ПП РФ N 60).
// В ЕИС выгружается только при наличии внешнего кода МНН по справочнику.
export interface EisNotificationMedicine {
  externalSid?: string;
  mnnExternalCode: string;
  mnnName: string;
  tradeName?: string;
  medicamentalForm?: string;
  dosage?: string;
  okeiCode?: string;
  okeiName?: string;
  quantity?: number;
  registrationNumber?: string;
}

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
    // П. 3 Раздела 1: указание на часть ст. 15 Закона N 44-ФЗ
    article15Part?: string;
    isGOZ: boolean;
    notPublishedOnEIS: boolean;
    isBudgetUnionState: boolean;
    // П. 13 Раздела 1: максимальное значение цены контракта и начальная
    // сумма цен единиц (при формуле цены либо цене единицы по ч. 24 ст. 22)
    maxContractPrice?: number;
    initialUnitPriceSum?: number;
    // П. 15 Раздела 1: валюта по ОКВ (по умолчанию 643)
    currencyNumericCode: string;
    // П. 38 Раздела 1: предупреждение об административной и уголовной
    // ответственности за нарушение антимонопольного законодательства
    antitrustWarning: boolean;
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
      // Начальная (максимальная) цена в валюте контракта
      maxPriceCurrency?: number;
      currencyCode: "RUB";
      currencyNumericCode: string;
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
      // provisionWarranty — обеспечение гарантийных обязательств
      provisionWarranty?: {
        amount?: number;
        part?: number;
        procedureInfo?: string;
      };
      // stagesInfo — этапы исполнения контракта
      // (customerRequirementInfo/contractConditionsInfo/contractExecutionPaymentPlan)
      stagesInfo?: Array<{
        externalSid?: string;
        start: number;
        startDayType: "C" | "W";
        term: number;
        termDayType: "C" | "W";
        amount?: number;
      }>;
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
      // П. 13 Раздела 1: начальная сумма цен единиц товара, работы, услуги
      totalSum?: number;
      totalSumCurrency?: number;
      // П. 9 Раздела 1: лекарственные препараты (МНН и характеристики)
      medicines: EisNotificationMedicine[];
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
    // preferensesInfo — преимущества участникам (ст. 28–30 44-ФЗ)
    preferensesInfo: Array<{
      code: string;
      name?: string;
      value?: number;
    }>;
    // requirementsInfo — требования к участникам (ст. 31 44-ФЗ)
    requirementsInfo: Array<{
      code: string;
      name?: string;
      content?: string;
      addRequirements?: string[];
    }>;
    // restrictionsInfo — ограничения национального режима (ст. 14 44-ФЗ)
    restrictionsInfo: Array<{
      code: string;
      name?: string;
      content?: string;
      restrictionsSt14?: Array<{
        type: "BAN" | "RA" | "AC";
        npaCode?: string;
        npaName?: string;
        imposibilityBan?: boolean;
        imposibilityBanReason?: string;
      }>;
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

const addFinance = (
  left: EisTenderPlan2020FinanceResources,
  right: EisTenderPlan2020FinanceResources,
): EisTenderPlan2020FinanceResources => ({
  total: Math.round((left.total + right.total) * 100) / 100,
  currentYear: Math.round((left.currentYear + right.currentYear) * 100) / 100,
  firstYear: Math.round((left.firstYear + right.firstYear) * 100) / 100,
  secondYear: Math.round((left.secondYear + right.secondYear) * 100) / 100,
  subsecYears: Math.round((left.subsecYears + right.subsecYears) * 100) / 100,
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
export const mapPurchasePlanToEis17 = (
  plan: PurchasePlan,
): EisTenderPlan2020 => {
  const planYearNum = Number(plan.planYear) || new Date().getFullYear();
  const firstYear = Number(plan.planPeriodFirstYear) || planYearNum + 1;
  const secondYear = Number(plan.planPeriodSecondYear) || planYearNum + 2;

  const customerOrg: EisTenderPlan2020Organization = {
    regNum: plan.customer.regNum || undefined,
    consRegistryNum: plan.customer.consRegistryNum || undefined,
    fullName: plan.customer.fullName,
    inn: plan.customer.inn,
    kpp: plan.customer.kpp || undefined,
    oktmoCode: plan.customer.oktmo || undefined,
    factAddress: plan.customer.legalAddress || undefined,
    phone: plan.customer.phone || undefined,
    email: plan.customer.email || undefined,
    okopf: plan.customer.okopf || undefined,
    okfs: plan.customer.okfs || undefined,
    oktmoPpo: plan.customer.oktmoPpo || undefined,
  };

  // Роль OA: версию плана-графика формирует организация, которой переданы
  // полномочия заказчика (п. 14, подп. "ж" Положения N 1279)
  const authorized = plan.authorizedOrganization;
  const ownerOrg: EisTenderPlan2020Organization =
    plan.ownerRole === "OA" && authorized
      ? {
          regNum: undefined,
          consRegistryNum: undefined,
          fullName: authorized.fullName || plan.customer.fullName,
          inn: authorized.inn || plan.customer.inn,
          kpp: authorized.kpp || undefined,
          oktmoCode: authorized.oktmo || undefined,
          factAddress: authorized.legalAddress || undefined,
          phone: authorized.phone || undefined,
          email: authorized.email || undefined,
        }
      : customerOrg;

  // Итоги ПГ = записи + особые закупки (totalsInfo XSD ЕИС 17.0)
  const totals = [
    ...plan.positions.map((position) => positionFinance(position)),
    ...(plan.specialPurchases ?? []).map((item) => positionFinance(item)),
  ].reduce(addFinance, emptyFinance());

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
      okpd2MultipleZeroCode:
        Boolean(pos.hasMultipleOkpd2) || okpdList.length > 1,
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
    isNotFederalFinancing: sp.isNotFederalFinancing,
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
      owner: ownerOrg,
      customer: customerOrg,
    },
    positions,
    specialPurchases,
    totals,
  };
};

// Коды преимуществ и требований из справочника nsiPurchasePreferences.
// Требования (ET44, TU44, TR442, ETP44312, TOVNPIVR) перечислены в XSD
// IntegrationEPTypes.xsd; коды преимуществ (P1–P3) соответствуют записям
// справочника и подлежат сверке при обновлении НСИ.
const EIS_PREFERENCE_SMP = "P3";
const EIS_PREFERENCE_PENAL = "P1";
const EIS_PREFERENCE_DISABLED = "P2";
// Ограничение национального режима: запрет/ограничение допуска (ст. 14)
const EIS_RESTRICTION_ST14 = "JB2149";

interface NoticePreferencesMapping {
  preferensesInfo: EisNotification2020["notificationInfo"]["preferensesInfo"];
  requirementsInfo: EisNotification2020["notificationInfo"]["requirementsInfo"];
  restrictionsInfo: EisNotification2020["notificationInfo"]["restrictionsInfo"];
}

/**
 * Преимущества, требования ст. 31 и ограничения нацрежима извещения.
 *
 * В форме они ведутся флагами и текстами (participantsRequirements), а в XSD
 * лежат отдельными блоками notificationInfo/preferensesInfo,
 * requirementsInfo и restrictionsInfo. Национальный режим собирается по
 * позициям объекта закупки: запрет и ограничение допуска — это restrictionInfo
 * с кодом JB2149 и перечнем restrictionSt14.
 */
const mapNoticePreferences = (
  notice: NoticeInfoFormValues,
): NoticePreferencesMapping => {
  const requirements = notice.participantsRequirements;

  const preferensesInfo: NoticePreferencesMapping["preferensesInfo"] = [];
  if (requirements.advantagePenalSystemArt28) {
    preferensesInfo.push({
      code: EIS_PREFERENCE_PENAL,
      name: "Преимущество учреждениям и предприятиям уголовно-исполнительной системы (ст. 28)",
    });
  }
  if (requirements.advantageDisabledArt29) {
    preferensesInfo.push({
      code: EIS_PREFERENCE_DISABLED,
      name: "Преимущество организациям инвалидов (ст. 29)",
    });
  }
  if (requirements.advantageSmpPart3Art30) {
    preferensesInfo.push({
      code: EIS_PREFERENCE_SMP,
      name: "Преимущество субъектам малого предпринимательства и СОНКО (ч. 3 ст. 30)",
    });
  }

  const requirementsInfo: NoticePreferencesMapping["requirementsInfo"] = [];
  if (requirements.unifiedRequirementsPart1Art31) {
    requirementsInfo.push({
      code: "ET44",
      name: "Единые требования к участникам закупок (ч. 1 ст. 31)",
      content: requirements.unifiedRequirementsPart1Art31Text || undefined,
    });
  }
  if (requirements.additionalRequirementsPart2Art31) {
    requirementsInfo.push({
      code: "TU44",
      name: "Дополнительные требования к участникам закупок (ч. 2 ст. 31)",
      content: requirements.additionalRequirementsPart2Art31Text || undefined,
      addRequirements: requirements.pp2571Positions?.length
        ? requirements.pp2571Positions
        : undefined,
    });
  }
  if (requirements.requirementsPart1_1Art31) {
    requirementsInfo.push({
      code: "TR442",
      name: "Требования к участникам закупок (ч. 1.1 ст. 31)",
    });
  }
  if (requirements.requirementsPart2_1Art31) {
    requirementsInfo.push({
      code: "ETP44312",
      name: "Требования к участникам закупок (ч. 2.1 ст. 31)",
      content: requirements.requirementsPart2_1Art31Text || undefined,
    });
  }
  if (
    requirements.pp2571Point4Requirement ||
    requirements.sanctionsRnpRequirement
  ) {
    requirementsInfo.push({
      code: "TOVNPIVR",
      name: "Отсутствие в РНП информации об отказе от исполнения контракта из-за санкций",
      content: requirements.pp2571Point4RequirementText || undefined,
    });
  }

  // Национальный режим: в извещении он задан по позициям, в XSD — общим
  // блоком ограничений. Запрет и ограничение допуска выводятся отдельными
  // restrictionInfo, чтобы в превью было видно основание.
  const restrictionsInfo: NoticePreferencesMapping["restrictionsInfo"] = [];
  const modes = new Set(
    notice.purchaseObjects.items.map((item) => item.nationalRegimeType),
  );
  const npa = {
    npaCode: "PP1875",
    npaName:
      "Постановление Правительства РФ от 23.12.2024 № 1875 «О мерах по предоставлению национального режима...»",
  };
  if (modes.has("ban")) {
    const banItem = notice.purchaseObjects.items.find(
      (item) => item.nationalRegimeType === "ban",
    );
    restrictionsInfo.push({
      code: EIS_RESTRICTION_ST14,
      name: "Запрет на допуск товаров, работ, услуг (ст. 14)",
      content:
        banItem?.imposibilityBanReason ||
        "Запрет на допуск товаров, работ, услуг при осуществлении закупок",
      restrictionsSt14: [
        {
          type: "BAN",
          ...npa,
          imposibilityBan: Boolean(banItem?.imposibilityBan),
          imposibilityBanReason: banItem?.imposibilityBanReason || undefined,
        },
      ],
    });
  }
  if (modes.has("restriction")) {
    restrictionsInfo.push({
      code: EIS_RESTRICTION_ST14,
      name: "Ограничение допуска товаров, работ, услуг (ст. 14)",
      content:
        "Ограничение допуска товаров, работ, услуг при осуществлении закупок",
      restrictionsSt14: [{ type: "RA", ...npa }],
    });
  }

  return { preferensesInfo, requirementsInfo, restrictionsInfo };
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
      article15Part: notice.generalInfo.article15Part || undefined,
      isGOZ: Boolean(notice.generalInfo.isGOZ),
      notPublishedOnEIS: Boolean(notice.generalInfo.notPublishedOnEIS),
      isBudgetUnionState: Boolean(notice.generalInfo.isBudgetUnionState),
      maxContractPrice: notice.generalInfo.maxContractPrice,
      initialUnitPriceSum: notice.generalInfo.initialUnitPriceSum,
      currencyNumericCode: notice.contractConditions.currencyCode || "643",
      // Предупреждение по п. 38 обязательно, поэтому по умолчанию включено
      antitrustWarning: notice.generalInfo.antitrustWarning !== false,
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
        // При формуле цены либо цене единицы (ч. 24 ст. 22) в maxPriceInfo
        // указывается максимальное значение цены, а не НМЦК
        maxPrice:
          notice.generalInfo.maxContractPrice ?? notice.generalInfo.nmck,
        maxPriceCurrency:
          notice.generalInfo.maxContractPrice ?? notice.generalInfo.nmck,
        currencyCode: "RUB",
        currencyNumericCode: notice.contractConditions.currencyCode || "643",
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
          : notice.participantsRequirements.unableProvideContractGuaranteeReason
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
        // Обеспечение гарантийных обязательств (provisionWarranty)
        provisionWarranty: notice.participantsRequirements
          .requiresWarrantySecurity
          ? {
              part: notice.participantsRequirements.warrantySecurityPercent,
              procedureInfo:
                notice.participantsRequirements.warrantySecurityOrder ||
                undefined,
            }
          : undefined,
        // Этапы исполнения контракта: XSD ждёт их в плане оплаты, а не
        // отдельным блоком извещения
        stagesInfo: notice.contractConditions.hasMultipleStages
          ? (notice.contractConditions.stages ?? []).map((stage) => ({
              externalSid: `stage-${stage.stageNumber}`,
              start: stage.startOffsetDays,
              startDayType: notice.contractConditions.startDayType ?? "C",
              term: stage.durationDays,
              termDayType: notice.contractConditions.termDayType ?? "C",
              amount:
                stage.kbkRows.reduce((sum, row) => sum + row.total, 0) ||
                undefined,
            }))
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
          notice.contractConditions.deliveryPlaces ??
          (firstPlace ? [firstPlace] : [])
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
        totalSum: notice.generalInfo.initialUnitPriceSum,
        totalSumCurrency: notice.generalInfo.initialUnitPriceSum,
        // Лекарственные препараты выгружаются только при наличии внешнего
        // кода МНН — без него ЕИС не примет блок drugPurchaseObjectsInfo
        medicines: (notice.purchaseObjects.medicines ?? [])
          .filter((medicine) => Boolean(medicine.mnnExternalCode?.trim()))
          .map((medicine) => ({
            externalSid: medicine.id,
            mnnExternalCode: medicine.mnnExternalCode!.trim(),
            mnnName: medicine.mnnName,
            tradeName: medicine.tradeName || undefined,
            medicamentalForm: medicine.medicamentalForm || undefined,
            dosage: medicine.dosage || undefined,
            okeiCode: medicine.okeiCode || undefined,
            okeiName: medicine.okeiName || undefined,
            quantity: medicine.quantity,
            registrationNumber: medicine.registrationNumber || undefined,
          })),
        objects: notice.purchaseObjects.items.map((item) => {
          const code = item.okpd2OrKtruCode || "";
          const looksLikeKtru =
            Boolean(item.ktruCode) ||
            /^\d{2}\.\d{2}\.\d{2}\.\d{3}-\d{8}$/.test(code);
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
      ...mapNoticePreferences(notice),
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
  const pushIssue = (
    severity: Eis17ValidationIssue["severity"],
    field: string,
    message: string,
  ) => {
    issues.push({ severity, field, message });
  };

  // Раздел 1 формы ПГ: единица измерения — рубль по ОКЕИ 383
  if ((plan.okeiCode ?? "").trim() !== "383") {
    pushIssue(
      "error",
      "okeiCode",
      "Единица измерения плана-графика — рубль по ОКЕИ 383 (Раздел 1 формы ПГ, п. 2 Положения N 1279).",
    );
  }
  if (!(plan.okeiName ?? "").trim()) {
    pushIssue(
      "warning",
      "okeiName",
      "Не заполнено наименование единицы измерения — по ОКЕИ 383 ожидается «рубль».",
    );
  }

  if (!plan.ownerRole) {
    pushIssue(
      "warning",
      "ownerRole",
      "Не указана роль владельца версии (ownerRole: CU / OA по IntegrationTPTypes.xsd). При выгрузке принята CU.",
    );
  }

  // Раздел 1 формы ПГ: реквизиты заказчика
  if (!plan.customer.regNum && !plan.customer.consRegistryNum) {
    pushIssue(
      "warning",
      "customer.regNum",
      "Не заполнены код по СПЗ (regNum) или код по Сводному реестру (consRegistryNum) — обязательны при передаче XML в ЕИС.",
    );
  }
  if (!plan.customer.okopf) {
    pushIssue(
      "warning",
      "customer.okopf",
      "Не указана организационно-правовая форма заказчика по ОКОПФ (Раздел 1 формы ПГ).",
    );
  }
  if (!plan.customer.okfs) {
    pushIssue(
      "warning",
      "customer.okfs",
      "Не указана форма собственности заказчика по ОКФС (Раздел 1 формы ПГ).",
    );
  }
  if (!plan.customer.oktmo) {
    pushIssue(
      "warning",
      "customer.oktmo",
      "Не указан код ОКТМО места нахождения заказчика (Раздел 1 формы ПГ).",
    );
  }
  if (!plan.customer.legalAddress) {
    pushIssue(
      "warning",
      "customer.legalAddress",
      "Не указано место нахождения заказчика (Раздел 1 формы ПГ).",
    );
  }
  if (!plan.customer.phone) {
    pushIssue(
      "warning",
      "customer.phone",
      "Не указан телефон заказчика (Раздел 1 формы ПГ).",
    );
  }
  if (!plan.customer.email) {
    pushIssue(
      "warning",
      "customer.email",
      "Не указан адрес электронной почты заказчика (Раздел 1 формы ПГ).",
    );
  }

  // Подп. «ж» п. 14 Положения N 1279: при передаче полномочий заказчика
  // в плане-графике указывается организация, которой они переданы
  if (plan.ownerRole === "OA") {
    const authorized = plan.authorizedOrganization;
    if (!authorized?.fullName) {
      pushIssue(
        "error",
        "authorizedOrganization.fullName",
        "Для роли OA не указано полное наименование организации, которой переданы полномочия заказчика.",
      );
    }
    if (!authorized?.inn) {
      pushIssue(
        "error",
        "authorizedOrganization.inn",
        "Для роли OA не указан ИНН организации, которой переданы полномочия заказчика.",
      );
    }
    if (!authorized?.kpp) {
      pushIssue(
        "error",
        "authorizedOrganization.kpp",
        "Для роли OA не указан КПП организации, которой переданы полномочия заказчика.",
      );
    }
    if (!authorized?.oktmo) {
      pushIssue(
        "error",
        "authorizedOrganization.oktmo",
        "Для роли OA не указан ОКТМО организации, которой переданы полномочия заказчика.",
      );
    }
  }

  // Реестровый номер плана-графика — 18 цифр: год (4), код заказчика по СПЗ
  // (11), порядковый номер плана (3). От него зависит уникальный номер позиции
  const planDigits = String(plan.planNumber ?? "").replace(/\D/g, "");
  if (planDigits.length !== 18) {
    pushIssue(
      "error",
      "planNumber",
      `Реестровый номер плана-графика содержит ${planDigits.length} цифр вместо 18: ` +
        `год (4) + код заказчика по СПЗ (11) + порядковый номер плана (3). ` +
        `Без него уникальный номер позиции не собирается в 24 знака.`,
    );
  }

  plan.positions.forEach((pos, idx) => {
    const label = `Позиция № ${pos.serialNumber || idx + 1}`;
    const ikz = (pos.identificationCode ?? "").trim();

    if (!ikz) {
      pushIssue(
        "error",
        `positions[${idx}].identificationCode`,
        `${label}: отсутствует ИКЗ (по приказу Минфина России от 10.04.2019 № 55н — 36 цифр).`,
      );
    } else if (!EIS_IKZ_PATTERN.test(ikz)) {
      pushIssue(
        "error",
        `positions[${idx}].identificationCode`,
        `${label}: ИКЗ «${ikz}» содержит ${ikz.length} симв. вместо 36 цифр по приказу Минфина России от 10.04.2019 № 55н.`,
      );
    }

    // Графа 2 формы ПГ: ОКПД2 не ниже группы, один или несколько кодов.
    // XSD контролирует минимум 4 разряда в коде без учёта точки
    const okpd2Codes =
      pos.okpd2Items && pos.okpd2Items.length > 0
        ? pos.okpd2Items.map((item) => item.okpd2Code)
        : pos.okpd2Code
          ? [pos.okpd2Code]
          : [];
    if (okpd2Codes.length === 0) {
      pushIssue(
        "error",
        `positions[${idx}].okpd2Code`,
        `${label}: не указан код ОКПД2 (графа 2 формы ПГ, п. 6 Положения N 1279).`,
      );
    }
    okpd2Codes.forEach((code) => {
      const digits = String(code ?? "").replace(/\D/g, "");
      if (digits.length > 0 && digits.length < 4) {
        pushIssue(
          "error",
          `positions[${idx}].okpd2Code`,
          `${label}: код ОКПД2 «${code}» содержит менее 4 разрядов — XSD требует указывать код не ниже группы.`,
        );
      }
    });

    // Графа 4 формы ПГ: планируемый год размещения извещения
    const publishYear = toNumber(pos.plannedPlacementYear);
    if (publishYear === null) {
      pushIssue(
        "error",
        `positions[${idx}].plannedPlacementYear`,
        `${label}: не указан планируемый год размещения извещения (графа 4 формы ПГ).`,
      );
    } else if (publishYear < 2000 || publishYear > 2100) {
      pushIssue(
        "warning",
        `positions[${idx}].plannedPlacementYear`,
        `${label}: планируемый год размещения «${pos.plannedPlacementYear}» выглядит некорректно.`,
      );
    }

    // Графа 5 формы ПГ: объём финансового обеспечения, всего
    const amountTotal = toNumber(pos.amountTotal);
    if (amountTotal === null) {
      pushIssue(
        "error",
        `positions[${idx}].amountTotal`,
        `${label}: не указан объём финансового обеспечения, всего (графа 5 формы ПГ).`,
      );
    } else if (amountTotal === 0) {
      pushIssue(
        "warning",
        `positions[${idx}].amountTotal`,
        `${label}: объём финансового обеспечения равен нулю.`,
      );
    }

    if (!pos.uniqueNumber && !pos.extNumber) {
      pushIssue(
        "warning",
        `positions[${idx}].extNumber`,
        `${label}: отсутствуют positionNumber и extNumber (требуются для связки tenderPlan2020Info в извещении).`,
      );
    }

    // tenderPlan2020PositonNumberType — xs:length 24: 18 цифр номера
    // плана-графика + 6 цифр внутреннего номера позиции
    if (pos.uniqueNumber && !/^\d{24}$/.test(String(pos.uniqueNumber))) {
      pushIssue(
        "error",
        `positions[${idx}].uniqueNumber`,
        `${label}: уникальный номер позиции «${pos.uniqueNumber}» содержит ` +
          `${String(pos.uniqueNumber).length} симв. вместо 24 (18 цифр номера плана-графика + 6 цифр номера позиции).`,
      );
    }

    // Детализация по КБК: при заполненной сумме код КБК обязателен
    (pos.kbkEntries ?? []).forEach((entry, entryIdx) => {
      if ((toNumber(entry.amountTotal) ?? 0) > 0 && !entry.kbk) {
        pushIssue(
          "error",
          `positions[${idx}].kbkEntries[${entryIdx}].kbk`,
          `${label}: в детализации по КБК не заполнен код при ненулевой сумме (KBKsInfo/KBKInfo).`,
        );
      }
    });

    // Детализация по КВР: при заполненной сумме код КВР обязателен
    (pos.kvrEntries ?? []).forEach((entry, entryIdx) => {
      if ((toNumber(entry.amountTotal) ?? 0) > 0 && !entry.kvr) {
        pushIssue(
          "error",
          `positions[${idx}].kvrEntries[${entryIdx}].kvr`,
          `${label}: в детализации по КВР не заполнен код при ненулевой сумме (KVRsInfo/KVRInfo).`,
        );
      }
    });

    if (pos.status === "changed" || pos.status === "cancelled") {
      if (!pos.changeReasonCode && !pos.modificationDescription) {
        pushIssue(
          "warning",
          `positions[${idx}].changeReasonCode`,
          `${label}: для изменённой/исключённой позиции XSD 17.0 требует блок positionModification (основание и решение).`,
        );
      }
    }

    // В XSD признаки энергосервиса, кредита и строительства взаимоисключающие
    const specialFlags = [
      pos.isEnergyServiceContract,
      pos.isProvisionLendingServices,
      pos.isConstructionWorks,
    ].filter(Boolean).length;
    if (specialFlags > 1) {
      pushIssue(
        "error",
        `positions[${idx}].isConstructionWorks`,
        `${label}: одновременно установлено несколько признаков (энергосервис / кредит / строительство), XSD допускает только один.`,
      );
    }

    if (pos.isNotFederalFinancing && !pos.isConstructionWorks) {
      pushIssue(
        "warning",
        `positions[${idx}].isNotFederalFinancing`,
        `${label}: признак «без софинансирования из федерального бюджета» относится к закупкам работ по строительству/ОКС.`,
      );
    }

    if (
      pos.isConstructionWorks &&
      (!pos.koksEntries || pos.koksEntries.length === 0)
    ) {
      pushIssue(
        "warning",
        `positions[${idx}].koksEntries`,
        `${label}: отмечено строительство/ОКС, но не заполнена детализация по КОКС (KOKSsInfo).`,
      );
    }
  });

  // Особые закупки: пустой typeCode допустим в черновике (строка только
  // добавлена), но в ЕИС 17.0 такая позиция не пройдёт контроль
  const specialPurchases = plan.specialPurchases ?? [];
  specialPurchases.forEach((special, idx) => {
    const label = `Особая закупка № ${idx + 1}`;

    if (!String(special.typeCode ?? "").trim()) {
      pushIssue(
        "error",
        `specialPurchases[${idx}].typeCode`,
        `${label}: не указан код типа особой закупки (typeCode) — без него позиция specialPurchasePositions не пройдёт контроль ЕИС 17.0.`,
      );
    }
    if (!String(special.kvr ?? "").trim()) {
      pushIssue(
        "error",
        `specialPurchases[${idx}].kvr`,
        `${label}: не указан КВР — в specialPurchasePositionType блок KVRInfo обязателен.`,
      );
    }
    if (!String(special.ikz ?? "").trim()) {
      pushIssue(
        "warning",
        `specialPurchases[${idx}].ikz`,
        `${label}: не указан ИКЗ особой закупки.`,
      );
    }
    if (!String(special.purchaseNumber ?? "").trim()) {
      pushIssue(
        "warning",
        `specialPurchases[${idx}].purchaseNumber`,
        `${label}: не указан номер закупки, включённой в план-график.`,
      );
    }
    if (toNumber(special.publishYear) === null) {
      pushIssue(
        "warning",
        `specialPurchases[${idx}].publishYear`,
        `${label}: не указан планируемый год размещения извещения.`,
      );
    }

    const declared = toNumber(special.amountTotal);
    if (declared === null) {
      pushIssue(
        "error",
        `specialPurchases[${idx}].amountTotal`,
        `${label}: не указан объём финансового обеспечения.`,
      );
    } else {
      const yearsSum =
        (toNumber(special.amountCurrentYear) ?? 0) +
        (toNumber(special.amountPlanPeriodFirstYear) ?? 0) +
        (toNumber(special.amountPlanPeriodSecondYear) ?? 0) +
        (toNumber(special.amountSubsequentYears) ?? 0);
      if (Math.abs(declared - yearsSum) > 0.01) {
        pushIssue(
          "error",
          `specialPurchases[${idx}].amountTotal`,
          `${label}: объём «всего» (${declared.toFixed(2)}) не совпадает с суммой по годам (${yearsSum.toFixed(2)}).`,
        );
      }
    }
  });

  // Итог плана-графика = позиции + особые закупки (outcomeIndicators/totalsInfo)
  const declaredTotal = toNumber(plan.totalAmount);
  if (declaredTotal !== null) {
    const positionsTotal = plan.positions.reduce(
      (sum, position) => sum + (toNumber(position.amountTotal) ?? 0),
      0,
    );
    const specialTotal = specialPurchases.reduce(
      (sum, item) => sum + (toNumber(item.amountTotal) ?? 0),
      0,
    );
    if (Math.abs(declaredTotal - (positionsTotal + specialTotal)) > 0.01) {
      pushIssue(
        "error",
        "totalAmount",
        `Совокупный объём (${declaredTotal.toFixed(2)}) не совпадает с суммой позиций и особых закупок ` +
          `(${(positionsTotal + specialTotal).toFixed(2)}).`,
      );
    }
  }

  // Размещённый план-график не может быть пустым
  if (
    plan.status !== "draft" &&
    plan.positions.length === 0 &&
    specialPurchases.length === 0
  ) {
    pushIssue(
      "error",
      "positions",
      "Размещённый план-график должен содержать хотя бы одну позицию или особую закупку.",
    );
  }

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

  if (
    !EIS_IKZ_PATTERN.test(
      dto.notificationInfo.customerRequirementInfo.ikz.trim(),
    )
  ) {
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
    if (
      obj.restrictionSt14?.imposibilityBan &&
      !obj.restrictionSt14.imposibilityBanReason
    ) {
      issues.push({
        severity: "error",
        field: `purchaseObjects.items.${idx}.imposibilityBanReason`,
        message: `Позиция объекта № ${idx + 1}: отмечена невозможность применения запрета/ограничения по ст. 14 — укажите обоснование (imposibilityBanReason).`,
      });
    }
  });

  // П. 3 Раздела 1 формы извещения (ПП РФ N 60): указание на часть ст. 15
  if (!dto.commonInfo.article15Part && !dto.commonInfo.article15Features) {
    issues.push({
      severity: "warning",
      field: "generalInfo.article15Part",
      message:
        "П. 3 Раздела 1: укажите часть ст. 15 Закона № 44-ФЗ либо признак article15Features.",
    });
  }

  // П. 15 Раздела 1: наименование валюты по ОКВ
  if (!/^\d{3}$/.test(dto.commonInfo.currencyNumericCode)) {
    issues.push({
      severity: "warning",
      field: "contractConditions.currencyCode",
      message:
        "П. 15 Раздела 1: код валюты по ОКВ должен состоять из трёх цифр (по умолчанию 643 — российский рубль).",
    });
  } else if (dto.commonInfo.currencyNumericCode !== "643") {
    issues.push({
      severity: "warning",
      field: "contractConditions.currencyCode",
      message: `П. 15 Раздела 1: закупка в иностранной валюте (ОКВ ${dto.commonInfo.currencyNumericCode}) — проверьте курс и maxPriceCurrency.`,
    });
  }

  // П. 13 Раздела 1: при формуле цены либо невозможности определить объём
  // указываются максимальное значение цены и начальная сумма цен единиц
  const needsMaxPriceInfo =
    notice.contractConditions.usePriceFormulaPP19 ||
    notice.purchaseObjects.isIndeterminateVolume;
  if (needsMaxPriceInfo && !dto.commonInfo.maxContractPrice) {
    issues.push({
      severity: "error",
      field: "generalInfo.maxContractPrice",
      message:
        "П. 13 Раздела 1: при формуле цены или невозможности определить объём укажите максимальное значение цены контракта.",
    });
  }
  if (needsMaxPriceInfo && !dto.commonInfo.initialUnitPriceSum) {
    issues.push({
      severity: "error",
      field: "generalInfo.initialUnitPriceSum",
      message:
        "П. 13 Раздела 1: укажите начальную сумму цен единиц товара, работы, услуги (totalSum).",
    });
  }

  // П. 9 Раздела 1: сведения о лекарственных препаратах
  if (notice.purchaseObjects.isMedicines) {
    const declaredMedicines = notice.purchaseObjects.medicines ?? [];
    if (declaredMedicines.length === 0) {
      issues.push({
        severity: "error",
        field: "purchaseObjects.medicines",
        message:
          "П. 9 Раздела 1: установлен признак закупки лекарственных препаратов, но МНН не добавлены.",
      });
    }
    declaredMedicines.forEach((medicine, idx) => {
      if (!medicine.mnnName?.trim()) {
        issues.push({
          severity: "error",
          field: `purchaseObjects.medicines.${idx}.mnnName`,
          message: `Лекарственный препарат № ${idx + 1}: укажите МНН (группировочное, химическое наименование).`,
        });
      }
      if (!medicine.mnnExternalCode?.trim()) {
        issues.push({
          severity: "warning",
          field: `purchaseObjects.medicines.${idx}.mnnExternalCode`,
          message: `Лекарственный препарат № ${idx + 1}: без внешнего кода МНН блок не выгрузится в drugPurchaseObjectsInfo.`,
        });
      }
      if (!medicine.okeiCode?.trim()) {
        issues.push({
          severity: "warning",
          field: `purchaseObjects.medicines.${idx}.okeiCode`,
          message: `Лекарственный препарат № ${idx + 1}: не указана единица измерения по ОКЕИ.`,
        });
      }
      if (medicine.quantity === undefined) {
        issues.push({
          severity: "warning",
          field: `purchaseObjects.medicines.${idx}.quantity`,
          message: `Лекарственный препарат № ${idx + 1}: не указано количество (drugQuantity).`,
        });
      }
    });
  }

  // П. 38 Раздела 1: предупреждение об административной и уголовной
  // ответственности за нарушение антимонопольного законодательства
  if (!dto.commonInfo.antitrustWarning) {
    issues.push({
      severity: "error",
      field: "generalInfo.antitrustWarning",
      message:
        "П. 38 Раздела 1: предупреждение об административной и уголовной ответственности за нарушение антимонопольного законодательства обязательно.",
    });
  }

  // Раздел 2 формы извещения: обязательный состав прилагаемых документов
  const attachedDocs = notice.attachedDocs ?? [];
  const hasDoc = (category: string) =>
    attachedDocs.some((doc) => doc.category === category);
  const requiredDocs: Array<{ category: string; label: string }> = [
    {
      category: "object_description",
      label: "описание объекта закупки (ст. 33)",
    },
    { category: "nmck_justification", label: "обоснование НМЦК" },
    {
      category: "application_requirements",
      label: "требования к содержанию и составу заявки с инструкцией",
    },
    { category: "contract_project", label: "проект контракта" },
  ];
  requiredDocs.forEach(({ category, label }) => {
    if (!hasDoc(category)) {
      issues.push({
        severity: "error",
        field: `attachedDocs.${category}`,
        message: `Раздел 2: не приложен документ «${label}».`,
      });
    }
  });
  if (dto.notificationType === "EOK2020" && !hasDoc("evaluation_order")) {
    issues.push({
      severity: "warning",
      field: "attachedDocs.evaluation_order",
      message:
        "Раздел 2: для конкурса приложите порядок рассмотрения и оценки заявок.",
    });
  }

  // Извещение на 80 % состоит из сведений о закупке (СЗ): без связи с СЗ
  // невозможно сверить предзаполненные значения
  if (
    notice.purchaseNoteId === null ||
    notice.purchaseNoteId === undefined ||
    notice.purchaseNoteId === ""
  ) {
    issues.push({
      severity: "warning",
      field: "purchaseNoteId",
      message:
        "Извещение не связано со сведениями о закупке (СЗ) — предзаполнение и сверка с планом-графиком недоступны.",
    });
  }

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

// Объём финансового обеспечения (tenderPlan2020FinanceResourcesType)
const financeResourcesXml = (
  finance: EisTenderPlan2020FinanceResources,
): string =>
  `<total>${finance.total.toFixed(2)}</total>` +
  `<currentYear>${finance.currentYear.toFixed(2)}</currentYear>` +
  `<firstYear>${finance.firstYear.toFixed(2)}</firstYear>` +
  `<secondYear>${finance.secondYear.toFixed(2)}</secondYear>` +
  `<subsecYears>${finance.subsecYears.toFixed(2)}</subsecYears>`;

// Организация по tenderPlan2020OrganizationType. Код по СПЗ обязателен:
// если он неизвестен, XSD требует заглушку 00000000000 и код по СвР
const organizationXml = (org: EisTenderPlan2020Organization): string =>
  `<regNum>${escapeXml(org.regNum || "00000000000")}</regNum>` +
  (org.consRegistryNum
    ? `<consRegistryNum>${escapeXml(org.consRegistryNum)}</consRegistryNum>`
    : "") +
  (org.fullName ? `<fullName>${escapeXml(org.fullName)}</fullName>` : "") +
  (org.inn ? `<INN>${escapeXml(org.inn)}</INN>` : "") +
  (org.kpp ? `<KPP>${escapeXml(org.kpp)}</KPP>` : "") +
  (org.oktmoCode
    ? `<OKTMO><code>${escapeXml(org.oktmoCode)}</code></OKTMO>`
    : "") +
  (org.factAddress
    ? `<factAddress>${escapeXml(org.factAddress)}</factAddress>`
    : "") +
  (org.phone ? `<phone>${escapeXml(org.phone)}</phone>` : "") +
  (org.email ? `<email>${escapeXml(org.email)}</email>` : "");

// Ссылка на КВР (tenderPlan2020KVRRefType): код либо заглушка 000
const kvrRefXml = (kvr?: string): string => {
  const code = (kvr ?? "").trim();

  return code
    ? `<KVR><code>${escapeXml(code)}</code></KVR>`
    : `<undefined>000</undefined>`;
};

// Классификация по ОКПД2 (choice: один OKPD2Info либо undefined/OKPD2s)
const okpd2InfoXml = (pos: EisTenderPlan2020Position): string => {
  const okpd2RefXml = (item: { okpdCode: string; okpdName?: string }): string =>
    `<OKPD2Info><OKPDCode>${escapeXml(item.okpdCode)}</OKPDCode>` +
    (item.okpdName ? `<OKPDName>${escapeXml(item.okpdName)}</OKPDName>` : "") +
    `</OKPD2Info>`;

  if (pos.okpd2Codes.length === 0) {
    return `<undefined><OKPD2s/></undefined>`;
  }

  if (pos.okpd2Codes.length === 1) {
    return okpd2RefXml(pos.okpd2Codes[0]);
  }

  return (
    `<undefined><OKPD2s>` +
    pos.okpd2Codes.map(okpd2RefXml).join("") +
    `</OKPD2s></undefined>`
  );
};

// Позиция плана-графика (tenderPlan2020PositionType)
const positionXml = (pos: EisTenderPlan2020Position): string => {
  const modification = pos.positionModification;
  const modificationXml = modification
    ? `<positionModification>` +
      (modification.changeReasonCode
        ? `<changeReason><code>${escapeXml(modification.changeReasonCode)}</code>` +
          (modification.changeReasonName
            ? `<name>${escapeXml(modification.changeReasonName)}</name>`
            : "") +
          `</changeReason>`
        : "") +
      `<decision>${modification.decision}</decision>` +
      (modification.description
        ? `<description>${escapeXml(modification.description)}</description>`
        : "") +
      (modification.modificationNumber
        ? `<modificationNumber>${modification.modificationNumber}</modificationNumber>`
        : "") +
      `</positionModification>`
    : "";

  // Детализация по КБК вложена в financeInfo (tenderPlan2020KBKsInfoType)
  const kbksXml = pos.kbksInfo.length
    ? `<KBKsInfo>${pos.kbksInfo
        .map(
          (entry) =>
            `<KBKInfo><KBK>${escapeXml(entry.kbk)}</KBK>` +
            `<KBKYearsInfo>${financeResourcesXml(entry.yearsInfo)}</KBKYearsInfo>` +
            `</KBKInfo>`,
        )
        .join("")}</KBKsInfo>`
    : "";

  const kvrsXml = pos.kvrsInfo.length
    ? `<KVRsInfo>${pos.kvrsInfo
        .map(
          (entry) =>
            `<KVRInfo><KVR><code>${escapeXml(entry.kvrCode)}</code></KVR>` +
            `<KVRYearsInfo>${financeResourcesXml(entry.yearsInfo)}</KVRYearsInfo>` +
            `</KVRInfo>`,
        )
        .join("")}</KVRsInfo>`
    : "";

  const koksXml = pos.koksInfo.length
    ? `<KOKSsInfo>${pos.koksInfo
        .map(
          (entry) =>
            `<KOKSInfo><KOKS><code>${escapeXml(entry.koksCode)}</code>` +
            (entry.koksName
              ? `<name>${escapeXml(entry.koksName)}</name>`
              : "") +
            `</KOKS>` +
            `<KOKSYearsInfo>${financeResourcesXml(entry.yearsInfo)}</KOKSYearsInfo>` +
            `</KOKSInfo>`,
        )
        .join("")}</KOKSsInfo>`
    : "";

  // Признаки isProvisionLendingServices / isConstructionWorks /
  // isNotFederalFinancing в XSD объявлены с fixed="true": передаём только true
  return (
    `<position><commonInfo>` +
    (pos.positionNumber
      ? `<positionNumber>${escapeXml(pos.positionNumber)}</positionNumber>`
      : "") +
    (pos.extNumber
      ? `<extNumber>${escapeXml(pos.extNumber)}</extNumber>`
      : "") +
    (pos.ikz ? `<IKZ>${escapeXml(pos.ikz)}</IKZ>` : "") +
    `<publishYear>${pos.publishYear}</publishYear>` +
    (pos.iku ? `<IKU>${escapeXml(pos.iku)}</IKU>` : "") +
    `<purchaseNumber>${escapeXml(pos.purchaseNumber)}</purchaseNumber>` +
    (pos.purchaseOrderNumber
      ? `<purchaseOrderNumber>${escapeXml(pos.purchaseOrderNumber)}</purchaseOrderNumber>`
      : "") +
    okpd2InfoXml(pos) +
    `<KVRInfo>${kvrRefXml(pos.kvrCode)}</KVRInfo>` +
    (pos.purchaseObjectInfo
      ? `<purchaseObjectInfo>${escapeXml(pos.purchaseObjectInfo)}</purchaseObjectInfo>`
      : "") +
    `<publicDiscussion>${pos.publicDiscussion}</publicDiscussion>` +
    `<positionCanceled>${pos.positionCanceled}</positionCanceled>` +
    modificationXml +
    (pos.positionModificationStatus
      ? `<positionModificationStatus>${pos.positionModificationStatus}</positionModificationStatus>`
      : "") +
    // В схеме ПГ уполномоченный орган и организатор совместной закупки —
    // это организация, а не строка: код по СПЗ неизвестен, ставим заглушку
    (pos.centralizedPurchaseOrg
      ? `<centralizedPurchaseInfo><centralizedPurchaseOrgInfo>` +
        `<regNum>00000000000</regNum>` +
        `<fullName>${escapeXml(pos.centralizedPurchaseOrg)}</fullName>` +
        `</centralizedPurchaseOrgInfo></centralizedPurchaseInfo>`
      : "") +
    (pos.jointBiddingOrg
      ? `<jointBiddingInfo><jointBiddingOrgInfo>` +
        `<regNum>00000000000</regNum>` +
        `<fullName>${escapeXml(pos.jointBiddingOrg)}</fullName>` +
        `</jointBiddingOrgInfo></jointBiddingInfo>`
      : "") +
    `</commonInfo>` +
    `<financeInfo>${financeResourcesXml(pos.financeInfo)}${kbksXml}</financeInfo>` +
    kvrsXml +
    `<isEnergyServiceContract>${pos.isEnergyServiceContract}</isEnergyServiceContract>` +
    (pos.isProvisionLendingServices
      ? `<isProvisionLendingServices>true</isProvisionLendingServices>`
      : "") +
    (pos.isConstructionWorks
      ? `<isConstructionWorks>true</isConstructionWorks>`
      : "") +
    (pos.isNotFederalFinancing
      ? `<isNotFederalFinancing>true</isNotFederalFinancing>`
      : "") +
    koksXml +
    `</position>`
  );
};

// Позиция особой закупки (tenderPlan2020SpecialPurchasePositionType)
const specialPurchaseXml = (sp: EisTenderPlan2020SpecialPurchase): string => {
  const kbksXml = sp.kbk
    ? `<KBKsInfo><KBKInfo><KBK>${escapeXml(sp.kbk)}</KBK>` +
      `<KBKYearsInfo>${financeResourcesXml(sp.financeInfo)}</KBKYearsInfo>` +
      `</KBKInfo></KBKsInfo>`
    : "";

  const koksXml = sp.koksCode
    ? `<KOKSsInfo><KOKSInfo><KOKS><code>${escapeXml(sp.koksCode)}</code></KOKS>` +
      `<KOKSYearsInfo>${financeResourcesXml(sp.financeInfo)}</KOKSYearsInfo>` +
      `</KOKSInfo></KOKSsInfo>`
    : "";

  return (
    `<specialPurchasePosition>` +
    `<type><code>${escapeXml(sp.typeCode)}</code>` +
    (sp.typeName ? `<name>${escapeXml(sp.typeName)}</name>` : "") +
    `</type>` +
    (sp.positionNumber
      ? `<positionNumber>${escapeXml(sp.positionNumber)}</positionNumber>`
      : "") +
    (sp.extNumber ? `<extNumber>${escapeXml(sp.extNumber)}</extNumber>` : "") +
    (sp.ikz ? `<IKZ>${escapeXml(sp.ikz)}</IKZ>` : "") +
    `<publishYear>${sp.publishYear ?? 0}</publishYear>` +
    (sp.iku ? `<IKU>${escapeXml(sp.iku)}</IKU>` : "") +
    `<KVRInfo>${kvrRefXml(sp.kvr)}</KVRInfo>` +
    `<purchaseNumber>${escapeXml(sp.purchaseNumber ?? "")}</purchaseNumber>` +
    `<financeInfo>${financeResourcesXml(sp.financeInfo)}</financeInfo>` +
    kbksXml +
    (sp.modificationStatus
      ? `<specialPurchasePositionModificationStatus>${sp.modificationStatus}</specialPurchasePositionModificationStatus>`
      : "") +
    (sp.isNotFederalFinancing
      ? `<isNotFederalFinancing>true</isNotFederalFinancing>`
      : "") +
    koksXml +
    `</specialPurchasePosition>`
  );
};

export const buildTenderPlan2020XmlPreview = (plan: PurchasePlan): string => {
  const dto = mapPurchasePlanToEis17(plan);

  // customerInfo — расширение tenderPlan2020OrganizationType:
  // ОКОПФ, ОКФС, ОКТМО ППО и тип ПФХД идут после реквизитов организации
  const customerXml =
    organizationXml(dto.commonInfo.customer) +
    (dto.commonInfo.customer.okopf
      ? `<OKOPF><code>${escapeXml(dto.commonInfo.customer.okopf)}</code></OKOPF>`
      : "") +
    (dto.commonInfo.customer.okfs
      ? `<OKFS><code>${escapeXml(dto.commonInfo.customer.okfs)}</code></OKFS>`
      : "") +
    (dto.commonInfo.customer.oktmoPpo
      ? `<OKTMOPPO><code>${escapeXml(dto.commonInfo.customer.oktmoPpo)}</code></OKTMOPPO>`
      : "") +
    (dto.commonInfo.pfhdType
      ? `<PFHDType>${dto.commonInfo.pfhdType}</PFHDType>`
      : "");

  // Роль владельца версии (CU/OA) в XSD находится внутри ownerInfo
  const ownerXml =
    organizationXml(dto.commonInfo.owner) +
    `<ownerRole>${dto.commonInfo.ownerRole}</ownerRole>`;

  const positionsXml = dto.positions.length
    ? `\n  <positions>${dto.positions.map(positionXml).join("")}</positions>`
    : "";

  const specialXml = dto.specialPurchases.length
    ? `\n  <specialPurchasePositions>${dto.specialPurchases
        .map(specialPurchaseXml)
        .join("")}</specialPurchasePositions>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<tenderPlan2020 xmlns="http://zakupki.gov.ru/oos/TPtypes/1" schemeVersion="${dto.schemaVersion}">
  ${dto.externalId ? `<externalId>${escapeXml(dto.externalId)}</externalId>` : ""}
  <planNumber>${escapeXml(dto.planNumber)}</planNumber>
  <versionNumber>${dto.versionNumber}</versionNumber>
  <commonInfo>
    <planYear>${dto.commonInfo.planYear}</planYear>
    <planPeriod><firstYear>${dto.commonInfo.planPeriod.firstYear}</firstYear><secondYear>${dto.commonInfo.planPeriod.secondYear}</secondYear></planPeriod>
    ${dto.commonInfo.createDate ? `<createDate>${escapeXml(dto.commonInfo.createDate)}</createDate>` : ""}
    ${dto.commonInfo.firstVersionPublishDate ? `<firstVersionPublishDate>${escapeXml(dto.commonInfo.firstVersionPublishDate)}</firstVersionPublishDate>` : ""}
    ${dto.commonInfo.confirmDate ? `<confirmDate>${escapeXml(dto.commonInfo.confirmDate)}</confirmDate>` : ""}
    ${dto.commonInfo.directDate ? `<directDate>${escapeXml(dto.commonInfo.directDate)}</directDate>` : ""}
    ${dto.commonInfo.publishDate ? `<publishDate>${escapeXml(dto.commonInfo.publishDate)}</publishDate>` : ""}
    <customerInfo>${customerXml}</customerInfo>
    <ownerInfo>${ownerXml}</ownerInfo>
  </commonInfo>${positionsXml}${specialXml}
  <outcomeIndicators><totalsInfo>${financeResourcesXml(dto.totals)}</totalsInfo></outcomeIndicators>
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

  // П. 9 Раздела 1: лекарственные препараты. Блок drugPurchaseObjectsInfo
  // выводится только при наличии внешнего кода МНН — иначе ЕИС отклонит
  // документ, поэтому остаётся notDrugPurchaseObjectsInfo.
  const drugsXml = dto.notificationInfo.purchaseObjectsInfo.medicines
    .map(
      (medicine) => `        <drugPurchaseObjectInfo>
          ${medicine.externalSid ? `<externalSid>${escapeXml(medicine.externalSid)}</externalSid>` : ""}
          <objectInfoUsingReferenceInfo>
            <drugsInfo>
              <drugInfo>
                <MNNInfoUsingReferenceInfo>
                  <notificationSid>${escapeXml(medicine.externalSid ?? medicine.mnnExternalCode)}</notificationSid>
                  <MNNInfo>
                    <MNNExternalCode>${escapeXml(medicine.mnnExternalCode)}</MNNExternalCode>
                    <MNNName>${escapeXml(medicine.mnnName)}</MNNName>
                  </MNNInfo>
                  ${medicine.medicamentalForm ? `<medicamentalFormInfo><medicamentalFormName>${escapeXml(medicine.medicamentalForm)}</medicamentalFormName></medicamentalFormInfo>` : ""}
                  ${medicine.dosage ? `<dosageInfo><dosageGRLSValue>${escapeXml(medicine.dosage)}</dosageGRLSValue></dosageInfo>` : ""}
                  <OKEIInfo>${medicine.okeiCode ? `<code>${escapeXml(medicine.okeiCode)}</code>` : ""}<name>${escapeXml(medicine.okeiName ?? "Штука")}</name></OKEIInfo>
                  ${medicine.quantity !== undefined ? `<drugQuantity>${medicine.quantity}</drugQuantity>` : ""}
                  ${medicine.registrationNumber ? `<registrationNumbersInfo><registrationNumber>${escapeXml(medicine.registrationNumber)}</registrationNumber></registrationNumbersInfo>` : ""}
                </MNNInfoUsingReferenceInfo>
              </drugInfo>
            </drugsInfo>
          </objectInfoUsingReferenceInfo>
        </drugPurchaseObjectInfo>`,
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

  const dayType = (value: "C" | "W"): string =>
    value === "W" ? "working" : "calendar";

  const customerRequirement = dto.notificationInfo.customerRequirementInfo;
  const contractConditions = dto.notificationInfo.contractConditionsInfo;

  // Обеспечения: заявки, исполнения контракта и гарантийных обязательств.
  // Реквизиты счёта в превью не выводятся — их подставляет ЕИС из карточки
  // заказчика; здесь видны размер и порядок внесения.
  const guaranteeXml = (
    tag: "applicationGuarantee" | "contractGuarantee" | "provisionWarranty",
    value: { part?: number; procedureInfo?: string } | undefined,
  ): string =>
    value
      ? `      <${tag}>
        ${value.part !== undefined ? `<part>${value.part}</part>` : ""}
        ${value.procedureInfo ? `<procedureInfo>${escapeXml(value.procedureInfo)}</procedureInfo>` : ""}
      </${tag}>`
      : "";

  // Этапы исполнения контракта — внутри плана оплаты
  const stagesXml = customerRequirement.stagesInfo?.length
    ? `      <contractExecutionPaymentPlan>
        <stagesInfo>
${customerRequirement.stagesInfo
  .map(
    (stage) => `          <stageInfo>
            ${stage.externalSid ? `<externalSid>${escapeXml(stage.externalSid)}</externalSid>` : ""}
            <termsInfo>
              <relativeTermsInfo>
                <start>${stage.start}</start>
                <startDayType>${dayType(stage.startDayType)}</startDayType>
                <term>${stage.term}</term>
                <termDayType>${dayType(stage.termDayType)}</termDayType>
              </relativeTermsInfo>
            </termsInfo>
          </stageInfo>`,
  )
  .join("\n")}
        </stagesInfo>
      </contractExecutionPaymentPlan>`
    : "";

  const deliveryTermXml = customerRequirement.deliveryTerm.isRelative
    ? `      <deliveryTerm>
        <relativeTermsInfo>
          <start>${customerRequirement.deliveryTerm.relativeTermsInfo?.start ?? 0}</start>
          <startDayType>${dayType(customerRequirement.deliveryTerm.relativeTermsInfo?.startDayType ?? "C")}</startDayType>
          <term>${customerRequirement.deliveryTerm.relativeTermsInfo?.term ?? 0}</term>
          <termDayType>${dayType(customerRequirement.deliveryTerm.relativeTermsInfo?.termDayType ?? "C")}</termDayType>
        </relativeTermsInfo>
      </deliveryTerm>`
    : `      <deliveryTerm>
        <notRelativeTermsInfo>
          ${customerRequirement.deliveryTerm.notRelativeTermsInfo?.startDate ? `<startDate>${escapeXml(customerRequirement.deliveryTerm.notRelativeTermsInfo.startDate)}</startDate>` : ""}
          ${customerRequirement.deliveryTerm.notRelativeTermsInfo?.endDate ? `<endDate>${escapeXml(customerRequirement.deliveryTerm.notRelativeTermsInfo.endDate)}</endDate>` : ""}
        </notRelativeTermsInfo>
      </deliveryTerm>`;

  const deliveryPlacesXml = customerRequirement.deliveryPlacesInfo.length
    ? `      <deliveryPlacesInfo>
${customerRequirement.deliveryPlacesInfo
  .map(
    (place) => `        <deliveryPlaceInfo>
          <country><code>${escapeXml(place.countryCode)}</code><fullName>${escapeXml(place.countryFullName)}</fullName></country>
          ${place.garGuid ? `<garGuid>${escapeXml(place.garGuid)}</garGuid>` : ""}
          <deliveryPlace>${escapeXml(place.deliveryPlace)}</deliveryPlace>
        </deliveryPlaceInfo>`,
  )
  .join("\n")}
      </deliveryPlacesInfo>`
    : "";

  // Преимущества (ст. 28–30) — блок notificationInfo/preferensesInfo
  const preferensesXml = dto.notificationInfo.preferensesInfo.length
    ? `    <preferensesInfo>
${dto.notificationInfo.preferensesInfo
  .map(
    (pref) => `      <preferenseInfo>
        <preferenseRequirementInfo><code>${escapeXml(pref.code)}</code>${pref.name ? `<name>${escapeXml(pref.name)}</name>` : ""}</preferenseRequirementInfo>
        ${pref.value !== undefined ? `<prefValue>${pref.value}</prefValue>` : ""}
      </preferenseInfo>`,
  )
  .join("\n")}
    </preferensesInfo>`
    : "";

  // Требования к участникам (ст. 31) — notificationInfo/requirementsInfo
  const requirementsXml = dto.notificationInfo.requirementsInfo.length
    ? `    <requirementsInfo>
${dto.notificationInfo.requirementsInfo
  .map(
    (req) => `      <requirementInfo>
        <preferenseRequirementInfo><code>${escapeXml(req.code)}</code>${req.name ? `<name>${escapeXml(req.name)}</name>` : ""}</preferenseRequirementInfo>
        ${req.content ? `<content>${escapeXml(req.content)}</content>` : ""}
        ${
          req.addRequirements?.length
            ? `<addRequirements>${req.addRequirements
                .map(
                  (item) =>
                    `<addRequirement><shortName>${escapeXml(item)}</shortName></addRequirement>`,
                )
                .join("")}</addRequirements>`
            : ""
        }
      </requirementInfo>`,
  )
  .join("\n")}
    </requirementsInfo>`
    : "";

  // Национальный режим (ст. 14) — notificationInfo/restrictionsInfo
  const restrictionsXml = dto.notificationInfo.restrictionsInfo.length
    ? `    <restrictionsInfo>
${dto.notificationInfo.restrictionsInfo
  .map(
    (restriction) => `      <restrictionInfo>
        <preferenseRequirementInfo><code>${escapeXml(restriction.code)}</code>${restriction.name ? `<name>${escapeXml(restriction.name)}</name>` : ""}</preferenseRequirementInfo>
        ${
          restriction.restrictionsSt14?.length
            ? `<restrictionsSt14>${restriction.restrictionsSt14
                .map(
                  (st14) => `<restrictionSt14>
            <requirementsType><requirementType><type>${st14.type}</type></requirementType></requirementsType>
            <NPAInfo><code>${escapeXml(st14.npaCode ?? "")}</code>${st14.npaName ? `<name>${escapeXml(st14.npaName)}</name>` : ""}</NPAInfo>
            ${
              st14.imposibilityBan
                ? `<exception><imposibilityBan>true</imposibilityBan>${st14.imposibilityBanReason ? `<imposibilityBanReason>${escapeXml(st14.imposibilityBanReason)}</imposibilityBanReason>` : ""}</exception>`
                : ""
            }
          </restrictionSt14>`,
                )
                .join("")}</restrictionsSt14>`
            : restriction.content
              ? `<content>${escapeXml(restriction.content)}</content>`
              : ""
        }
      </restrictionInfo>`,
  )
  .join("\n")}
    </restrictionsInfo>`
    : "";

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
    <customerRequirementsInfo>
      <customerRequirementInfo>
        ${guaranteeXml("applicationGuarantee", customerRequirement.applicationGuarantee)}
        ${guaranteeXml("contractGuarantee", customerRequirement.contractGuarantee)}
        ${guaranteeXml("provisionWarranty", customerRequirement.provisionWarranty)}
        <contractConditionsInfo>
          <maxPriceInfo>
            <maxPrice>${contractConditions.maxPrice.toFixed(2)}</maxPrice>
            <currency><code>RUB</code><name>Российский рубль</name></currency>
            ${contractConditions.isContractPriceFormula ? "<isContractPriceFormula>true</isContractPriceFormula>" : ""}
            ${contractConditions.contractPriceFormulaText ? `<contractPriceFormulaText>${escapeXml(contractConditions.contractPriceFormulaText)}</contractPriceFormulaText>` : ""}
          </maxPriceInfo>
          ${contractConditions.maxPriceCurrency !== undefined ? `<maxPriceCurrency>${contractConditions.maxPriceCurrency.toFixed(2)}</maxPriceCurrency>` : ""}
          <interbudgetaryTransfer>${contractConditions.interbudgetaryTransfer}</interbudgetaryTransfer>
          <contractLifeCycle>${contractConditions.contractLifeCycle}</contractLifeCycle>
          <purchaseCode>${escapeXml(customerRequirement.ikz)}</purchaseCode>
          <tenderPlan2020Info>
            ${customerRequirement.tenderPlan2020Info.plan2020Number ? `<plan2020Number>${escapeXml(customerRequirement.tenderPlan2020Info.plan2020Number)}</plan2020Number>` : ""}
            ${customerRequirement.tenderPlan2020Info.position2020Number ? `<position2020Number>${escapeXml(customerRequirement.tenderPlan2020Info.position2020Number)}</position2020Number>` : ""}
            ${customerRequirement.tenderPlan2020Info.position2020ExtNumber ? `<position2020ExtNumber>${escapeXml(customerRequirement.tenderPlan2020Info.position2020ExtNumber)}</position2020ExtNumber>` : ""}
          </tenderPlan2020Info>
${stagesXml}
${deliveryPlacesXml}
${deliveryTermXml}
        </contractConditionsInfo>
      </customerRequirementInfo>
    </customerRequirementsInfo>
    <purchaseObjectsInfo>
      <isStructuredForm>${dto.notificationInfo.purchaseObjectsInfo.isStructuredForm}</isStructuredForm>
      ${dto.notificationInfo.purchaseObjectsInfo.quantityUndefined ? "<quantityUndefined>true</quantityUndefined>" : ""}
      ${
        drugsXml
          ? `<drugPurchaseObjectsInfo>
${drugsXml}
      </drugPurchaseObjectsInfo>`
          : `<notDrugPurchaseObjectsInfo>
${objectsXml}
      </notDrugPurchaseObjectsInfo>`
      }
      ${dto.notificationInfo.purchaseObjectsInfo.totalSum !== undefined ? `<totalSum>${dto.notificationInfo.purchaseObjectsInfo.totalSum.toFixed(2)}</totalSum>` : ""}
      ${dto.notificationInfo.purchaseObjectsInfo.totalSumCurrency !== undefined ? `<totalSumCurrency>${dto.notificationInfo.purchaseObjectsInfo.totalSumCurrency.toFixed(2)}</totalSumCurrency>` : ""}
    </purchaseObjectsInfo>
    ${criteriaXml ? `<criteriaInfo>\n${criteriaXml}\n    </criteriaInfo>` : ""}
${preferensesXml}
${requirementsXml}
${restrictionsXml}
  </notificationInfo>
  <serviceSigns>
    <isIncludeKOKS>${dto.serviceSigns.isIncludeKOKS}</isIncludeKOKS>
    <isControlP1Ch5St99>${dto.serviceSigns.isControlP1Ch5St99}</isControlP1Ch5St99>
    <is449Features>${dto.serviceSigns.is449Features}</is449Features>
  </serviceSigns>
</${rootTag}>`;
};

// ─── Проект контракта (IntegrationCPTypes.xsd) ───────────────────────────────

/**
 * Снимок проекта контракта для выгрузки в contractProjectType.
 *
 * Идентификаторы ЕИС (ЭТП, способ, ИКЗ, заказчик, поставщик) при приёме
 * подтягивает из связанного извещения по foundationInfo/purchaseNumber,
 * поэтому в превью они выводятся только при наличии — пустые блоки не
 * создаются, чтобы не выдавать заведомо неполный документ за готовый.
 */
export interface EisContractProject2020 {
  schemaVersion: "17.0";
  externalId?: string;
  versionNumber: number;
  purchaseNumber: string;
  etpName?: string;
  etpUrl?: string;
  placingWayCode?: string;
  ikz?: string;
  protocol?: {
    name: string;
    number: string;
    publishDate: string;
  };
  customer?: {
    fullName: string;
    shortName?: string;
    inn?: string;
    kpp?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  placerRole: string;
  participant?: {
    fullName: string;
    inn?: string;
    kpp?: string;
    ogrn?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  quantityUndefined: boolean;
  isStructuredForm: boolean;
  subject?: string;
  concludeContractRight: boolean;
  changePrice?: number;
  changePriceFoundation?: string;
  price?: number;
  currencyNumericCode: string;
  contractNumber?: string;
  conclusionContractSt95Ch17_1: boolean;
  isContractPriceFormula: boolean;
  appNumber?: string;
  files: Array<{
    fileName: string;
    description?: string;
    fileSize?: number;
    fileFingerPrint?: string;
  }>;
}

const positiveNumber = (value?: string): number | undefined => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * Проект контракта → DTO contractProjectType (ЕИС 17.0).
 *
 * Цена берётся из changePriceInfo, если цена изменена относительно
 * предложения поставщика, иначе из итоговой цены контракта.
 */
export const mapContractProjectToEis17 = (
  project: ContractProject,
): EisContractProject2020 => {
  const info = project.eisInfo;
  const changePrice = positiveNumber(info.changePrice);

  return {
    schemaVersion: "17.0",
    externalId: project.id !== undefined ? String(project.id) : undefined,
    versionNumber: 1,
    purchaseNumber: (info.purchaseNumber || project.noticeNumber || "").trim(),
    etpName: info.etpName || undefined,
    etpUrl: info.etpUrl || undefined,
    placingWayCode: info.placingWayCode || undefined,
    ikz: project.ikz || undefined,
    protocol:
      info.protocolName && info.protocolNumber && info.protocolPublishDate
        ? {
            name: info.protocolName,
            number: info.protocolNumber,
            publishDate: info.protocolPublishDate,
          }
        : undefined,
    customer: project.customerName
      ? {
          fullName: project.customerName,
          shortName: project.requisites.customerShortName || undefined,
          inn: project.requisites.customerInn || undefined,
          kpp: project.requisites.customerKpp || undefined,
          address: project.requisites.customerAddress || undefined,
          email: project.requisites.customerEmail || undefined,
          phone: project.requisites.customerPhone || undefined,
        }
      : undefined,
    placerRole: info.placerRole || "CU",
    participant: project.supplierName
      ? {
          fullName: project.supplierName,
          inn: project.requisites.supplierInn || undefined,
          kpp: project.requisites.supplierKpp || undefined,
          ogrn: project.requisites.supplierOgrn || undefined,
          address: project.requisites.supplierAddress || undefined,
          email: project.requisites.supplierEmail || undefined,
          phone: project.requisites.supplierPhone || undefined,
        }
      : undefined,
    quantityUndefined: Boolean(info.quantityUndefined),
    isStructuredForm: Boolean(info.isStructuredForm),
    subject: project.subject.objectName || undefined,
    concludeContractRight: Boolean(info.concludeContractRight),
    changePrice,
    changePriceFoundation: changePrice
      ? info.changePriceFoundation || undefined
      : undefined,
    price: changePrice ?? positiveNumber(project.price.finalPrice),
    currencyNumericCode: project.price.currencyCode || "643",
    contractNumber: project.contractNumber || undefined,
    conclusionContractSt95Ch17_1: Boolean(info.conclusionContractSt95Ch17_1),
    isContractPriceFormula: Boolean(info.isContractPriceFormula),
    appNumber: info.appNumber || undefined,
    files: (info.contractProjectFiles ?? []).map((file) => ({
      fileName: file.fileName,
      description: file.description || undefined,
      fileSize: file.fileSize,
      fileFingerPrint: file.fileFingerPrint || undefined,
    })),
  };
};

/**
 * Проверки проекта контракта по contractProjectType.
 *
 * Не заменяет XSD-валидацию, но ловит то, что ЕИС отклонит по существу:
 * нет номера закупки, цены, предмета, а при неструктурированной форме —
 * файлов проекта.
 */
export const validateContractProjectEis17 = (
  project: ContractProject,
): Eis17ValidationResult => {
  const dto = mapContractProjectToEis17(project);
  const issues: Eis17ValidationIssue[] = [];

  const pushIssue = (
    severity: Eis17ValidationIssue["severity"],
    field: string,
    message: string,
  ) => issues.push({ severity, field, message });

  if (!dto.purchaseNumber) {
    pushIssue(
      "error",
      "eisInfo.purchaseNumber",
      "Не указан номер закупки: без foundationInfo/purchaseNumber ЕИС не свяжет проект с извещением.",
    );
  }
  if (!dto.subject) {
    pushIssue(
      "error",
      "subject.objectName",
      "Не указан предмет контракта (contractInfo/subject).",
    );
  }
  if (!dto.price) {
    pushIssue(
      "error",
      "price.finalPrice",
      "Не указана цена контракта (contractInfo/price или changePriceInfo/changePrice).",
    );
  }
  if (dto.changePrice && !dto.changePriceFoundation) {
    pushIssue(
      "error",
      "eisInfo.changePriceFoundation",
      "Цена изменена относительно предложения поставщика — укажите основание изменения (nsiChangePriceFoundation).",
    );
  }
  if (!dto.isStructuredForm && dto.files.length === 0) {
    pushIssue(
      "error",
      "eisInfo.contractProjectFiles",
      "Проект не в структурированной форме: приложите файл проекта контракта, иначе ЕИС отклонит документ.",
    );
  }
  if (!dto.protocol) {
    pushIssue(
      "warning",
      "eisInfo.protocolInfo",
      "Не заполнен протокол-основание: ЕИС заполнит его из связанной закупки, но для проверки лучше указать.",
    );
  }
  if (!dto.appNumber) {
    pushIssue(
      "warning",
      "eisInfo.appNumber",
      "Не указан номер заявки победителя (appNumber).",
    );
  }
  if (!project.requisites.supplierInn) {
    pushIssue(
      "warning",
      "requisites.supplierInn",
      "Не указан ИНН поставщика: participantInfo проверяется по итоговому протоколу.",
    );
  }

  const errorsCount = issues.filter((i) => i.severity === "error").length;

  return {
    valid: errorsCount === 0,
    issues,
    errorsCount,
    warningsCount: issues.length - errorsCount,
  };
};

/** Предпросмотр XML проекта контракта для contractProjectType. */
export const buildContractProjectXmlPreview = (
  project: ContractProject,
): string => {
  const dto = mapContractProjectToEis17(project);

  const foundationXml = `  <foundationInfo>
    <purchaseNumber>${escapeXml(dto.purchaseNumber)}</purchaseNumber>
    ${dto.etpName ? `<ETP><name>${escapeXml(dto.etpName)}</name>${dto.etpUrl ? `<url>${escapeXml(dto.etpUrl)}</url>` : ""}</ETP>` : ""}
    ${dto.placingWayCode ? `<placingWay><code>${escapeXml(dto.placingWayCode)}</code></placingWay>` : ""}
    ${dto.ikz ? `<purchaseCode>${escapeXml(dto.ikz)}</purchaseCode>` : ""}
    ${
      dto.protocol
        ? `<protocolInfo>
      <name>${escapeXml(dto.protocol.name)}</name>
      <number>${escapeXml(dto.protocol.number)}</number>
      <publishDTInEIS>${escapeXml(dto.protocol.publishDate)}</publishDTInEIS>
    </protocolInfo>`
        : ""
    }
  </foundationInfo>`;

  // customerInfo — organizationType, у которого regNum обязателен. Без кода
  // СПЗ блок не выводим: ЕИС при одном заказчике всё равно берёт его из
  // извещения, а неполный блок только запутает проверку.
  const customerXml = dto.customer?.inn
    ? `  <customerInfo>
    <fullName>${escapeXml(dto.customer.fullName)}</fullName>
    ${dto.customer.inn ? `<INN>${escapeXml(dto.customer.inn)}</INN>` : ""}
    ${dto.customer.kpp ? `<KPP>${escapeXml(dto.customer.kpp)}</KPP>` : ""}
  </customerInfo>`
    : "";

  const participantXml = dto.participant?.inn
    ? `  <participantInfo>
    <legalEntityRFInfo>
      <fullName>${escapeXml(dto.participant.fullName)}</fullName>
      <INN>${escapeXml(dto.participant.inn)}</INN>
      ${dto.participant.kpp ? `<KPP>${escapeXml(dto.participant.kpp)}</KPP>` : ""}
      ${dto.participant.ogrn ? `<ogrn>${escapeXml(dto.participant.ogrn)}</ogrn>` : ""}
      <contactInfo>
        <orgPostAddress>${escapeXml(dto.participant.address ?? "")}</orgPostAddress>
        <orgFactAddress>${escapeXml(dto.participant.address ?? "")}</orgFactAddress>
        ${dto.participant.email ? `<contactEMail>${escapeXml(dto.participant.email)}</contactEMail>` : ""}
        <contactPhone>${escapeXml(dto.participant.phone ?? "")}</contactPhone>
      </contactInfo>
    </legalEntityRFInfo>
  </participantInfo>`
    : "";

  const changePriceXml =
    dto.changePrice !== undefined
      ? `      <changePriceInfo>
        <changePrice>${dto.changePrice.toFixed(2)}</changePrice>
        <changePriceFoundation>${escapeXml(dto.changePriceFoundation ?? "")}</changePriceFoundation>
      </changePriceInfo>`
      : "";

  const filesXml = dto.files.length
    ? `  <contractProjectFilesInfo>
${dto.files
  .map(
    (file) => `    <contractProjectFileInfo>
      <fileName>${escapeXml(file.fileName)}</fileName>
      ${file.description ? `<description>${escapeXml(file.description)}</description>` : ""}
      ${file.fileSize !== undefined ? `<fileSize>${file.fileSize}</fileSize>` : ""}
      ${file.fileFingerPrint ? `<fileFingerPrint>${escapeXml(file.fileFingerPrint)}</fileFingerPrint>` : ""}
    </contractProjectFileInfo>`,
  )
  .join("\n")}
  </contractProjectFilesInfo>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<contractProject xmlns="http://zakupki.gov.ru/oos/CPtypes/1" schemeVersion="${dto.schemaVersion}">
  ${dto.externalId ? `<externalId>${escapeXml(dto.externalId)}</externalId>` : ""}
  <versionNumber>${dto.versionNumber}</versionNumber>
${foundationXml}
${customerXml}
  <placerInfo>
    <responsibleOrg><fullName>${escapeXml(project.customerName || project.requisites.customerFullName || "")}</fullName>${project.requisites.customerInn ? `<INN>${escapeXml(project.requisites.customerInn)}</INN>` : ""}${project.requisites.customerKpp ? `<KPP>${escapeXml(project.requisites.customerKpp)}</KPP>` : ""}</responsibleOrg>
    <responsibleRole>${escapeXml(dto.placerRole)}</responsibleRole>
  </placerInfo>
${participantXml}
  ${dto.quantityUndefined ? "<quantityUndefined>true</quantityUndefined>" : ""}
  <contractInfo>
    ${dto.isStructuredForm ? "<isStructuredForm>true</isStructuredForm>" : ""}
    ${dto.subject ? `<subject>${escapeXml(dto.subject)}</subject>` : ""}
    ${dto.concludeContractRight ? "<concludeContractRight>true</concludeContractRight>" : ""}
${changePriceXml}
    ${dto.price !== undefined ? `<price>${dto.price.toFixed(2)}</price>` : ""}
    <currency><code>${escapeXml(dto.currencyNumericCode)}</code><name>Российский рубль</name></currency>
    ${dto.contractNumber ? `<number>${escapeXml(dto.contractNumber)}</number>` : ""}
    ${dto.conclusionContractSt95Ch17_1 ? "<conclusionContractSt95Ch17.1>true</conclusionContractSt95Ch17.1>" : ""}
  </contractInfo>
  ${dto.isContractPriceFormula ? "<isContractPriceFormula>true</isContractPriceFormula>" : ""}
  ${dto.appNumber ? `<appNumber>${escapeXml(dto.appNumber)}</appNumber>` : ""}
${filesXml}
</contractProject>`;
};
