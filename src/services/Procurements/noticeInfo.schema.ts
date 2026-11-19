import { z } from "zod";
import { BudgetPart13Art44RequisitesSchema } from "../Organization/organization.schema";

export const EisPhoneSchema = z.object({
  countryCode: z.string().max(4),
  cityCode: z.string().max(6),
  num: z.string().max(7),
  numExt: z.string().max(15),
});

export const BankRequisitesSchema = z.object({
  accountSearch: z.string().optional(),
  recipientName: z.string().optional(),
  recipientInn: z.string().optional(),
  recipientKpp: z.string().optional(),
  settlementAccount: z.string().optional(),
  personalAccount: z.string().optional(),
  bik: z.string().optional(),
  bankName: z.string().optional(),
  correspondentAccount: z.string().optional(),
});

export const KbkFinancingRowSchema = z.object({
  id: z.string(),
  chapter: z.string(),
  sectionSubsection: z.string(),
  targetArticle: z.string(),
  expenseType: z.string(),
  total: z.number(),
  year2026: z.number(),
  year2027: z.number(),
  year2028: z.number(),
  subsequentYears: z.number(),
});

export const ContractStageSchema = z.object({
  stageNumber: z.number(),
  startOffsetDays: z.number(),
  durationDays: z.number(),
  kbkRows: z.array(KbkFinancingRowSchema),
});

// Место поставки указывается каскадом уровней (Tasks 7, п. 2): страна, субъект
// Российской Федерации, муниципальное образование, населённый пункт и адрес.
// Промежуточные уровни необязательны — место поставки допускается описать и
// строкой адреса, если справочник региона не подключён
export const DeliveryPlaceSchema = z.object({
  id: z.string(),
  country: z.string(),
  oksmCode: z.string().optional(),
  garGuid: z.string().optional(),
  region: z.string().optional(),
  municipality: z.string().optional(),
  settlement: z.string().optional(),
  address: z.string(),
  additionalInfo: z.string().optional(),
});

export const PurchaseObjectRequirementSchema = z.object({
  id: z.string(),
  requirementType: z.enum(["consumer", "quality", "functional", "other"]),
  requirementText: z.string().min(1, "Укажите требование"),
});

export type PurchaseObjectRequirement = z.infer<
  typeof PurchaseObjectRequirementSchema
>;

export const PurchaseObjectItemSchema = z.object({
  id: z.string(),
  externalSid: z.string().optional(),
  productType: z.enum(["PRODUCT", "WORK", "SERVICE"]).optional(),
  okpd2OrKtruCode: z.string(),
  okpd2Code: z.string().optional(),
  // Позиция КТРУ, выбранная для кода ОКПД2 (ПП РФ № 145)
  ktruCode: z.string().optional(),
  ktruName: z.string().optional(),
  // Связанное структурированное ООЗ (единый набор характеристик)
  objectDescriptionId: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  okeiCode: z.string().optional(),
  unit: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  volumeSpecifyingMethod: z.enum(["QF", "SF"]).optional(),
  volumeTextForm: z.string().optional(),
  trademarks: z.string().optional(),
  isEquivalentDeliveryAllowed: z.boolean().optional(),
  isMedicalProduct: z.boolean().optional(),
  isSoftware: z.boolean().optional(),
  isSupplyDuringWorks: z.boolean(),
  nationalRegimeType: z.enum(["none", "ban", "restriction", "advantage"]),
  imposibilityBan: z.boolean().optional(),
  imposibilityBanReason: z.string().optional(),
  // Устаревшие требования по позиции (совместимость старых записей).
  // Новые извещения ведут единый набор в purchaseObjects.normingRequirements.
  normingRequirements: z.array(PurchaseObjectRequirementSchema).optional(),
});

// Типы критериев оценки в извещении (п. 3 Положения о оценке, ПП РФ N 2604).
// Порядок фиксирован: в форме всегда шесть слотов, состав задаётся флагом
// `enabled` — так критерии из служебной записки не теряются при переносе.
export const NOTICE_EVALUATION_CRITERION_TYPES = [
  "price",
  "exploitation_expenses",
  "lifecycle_cost",
  "energy_service_expenses",
  "qualitative_characteristics",
  "qualification",
] as const;

export type NoticeEvaluationCriterionType =
  (typeof NOTICE_EVALUATION_CRITERION_TYPES)[number];

// Показатель критерия (п. 7, 8 Положения) — переносится из служебной записки
// и в извещении показывается в полной форме: наименование, значимость,
// единица измерения, направление, способ оценки и шкала
export const EvaluationIndicatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string().optional(),
  weightPercent: z.number().min(0).max(100).optional(),
  unit: z.string().optional(),
  best: z.string().optional(),
  scoring: z.string().optional(),
  limitMin: z.number().optional(),
  limitMax: z.number().optional(),
  scaleText: z.string().optional(),
});

export type NoticeEvaluationIndicator = z.infer<
  typeof EvaluationIndicatorSchema
>;

export const EvaluationCriterionSchema = z.object({
  id: z.string(),
  type: z.enum(NOTICE_EVALUATION_CRITERION_TYPES),
  enabled: z.boolean(),
  weightPercent: z.number().min(0).max(100),
  additionalInfo: z.string().optional(),
  // Отдельные положения о применении критерия (раздел III формы оценки)
  note: z.string().optional(),
  indicators: z.array(EvaluationIndicatorSchema).optional(),
});

export const AttachedDocItemSchema = z.object({
  id: z.string(),
  category: z.enum([
    "nmck_justification",
    "contract_project",
    "object_description",
    "application_requirements",
    "evaluation_order",
    "additional_docs",
  ]),
  fileName: z.string(),
  description: z.string(),
});

export const NoticeInfoSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  procurementId: z.union([z.string(), z.number()]).nullable().optional(),
  purchaseNoteId: z.union([z.string(), z.number()]).nullable().optional(),
  objectDescriptionId: z.union([z.string(), z.number()]).nullable().optional(),
  ikz: z.string().optional(),

  // Метаданные типа документа и версионности по IntegrationEPTypes.xsd (ЕИС 17.0)
  notificationType: z
    .enum(["EF2020", "EOK2020", "EZK2020", "EZT2020", "EMZ2025", "Cancel"])
    .optional(),
  externalId: z.string().optional(),
  versionNumber: z.union([z.string(), z.number()]).optional(),
  serviceSigns: z
    .object({
      isIncludeKOKS: z.boolean().optional(),
      isControlP1Ch5St99: z.boolean().optional(),
    })
    .optional(),
  modificationInfo: z
    .object({
      info: z.string().optional(),
      addInfo: z.string().optional(),
      reasonCode: z.string().optional(),
      reasonName: z.string().optional(),
      decisionDate: z.string().optional(),
      decisionDocNumber: z.string().optional(),
    })
    .optional(),
  cancelReasonInfo: z
    .object({
      reasonCode: z.string().optional(),
      reasonName: z.string().optional(),
      addInfo: z.string().optional(),
    })
    .optional(),

  // ВКЛАДКА 1: Сведения о состоянии извещения
  noticeState: z.object({
    statusLabel: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    createdByUserId: z.union([z.string(), z.number()]).optional(),
    createdByFullName: z.string(),
    updatedByFullName: z.string(),
  }),

  // ВКЛАДКА 1: Общая информация
  generalInfo: z.object({
    noticeNumber: z.string().nullable(),
    placingWayCode: z.string().min(1, "Выберите способ определения поставщика"),
    isPart19Art48: z.boolean(),
    etpName: z.string().min(1, "Выберите электронную площадку"),
    etpUrl: z.string().url("Некорректный адрес ЭТП"),
    placementOrganizerType: z.enum(["customer", "joint_organizer"]),
    authorizedBodyApproval: z.string(),
    orderName: z.string().min(1, "Наименование объекта закупки обязательно"),
    planPositionNumber: z.string(),
    // Связь с позицией плана-графика по tenderPlan2020InfoType
    plan2020Number: z.string().optional(),
    positionUniqueNumber: z.string().optional(),
    position2020ExtNumber: z.string().optional(),
    positionSerialNumber: z.string().optional(),
    ikz: z.string().min(36, "ИКЗ должен содержать 36 символов"),
    nmck: z.number().nonnegative(),
    authorizedBodyName: z.string().optional(),
    jointOrganizerName: z.string().optional(),
    kbk: z.string().optional(),
    // Признаки commonInfo (ЕИС 17.0)
    isGOZ: z.boolean().optional(),
    notPublishedOnEIS: z.boolean().optional(),
    article15Features: z
      .enum(["", "P4", "P5", "P6", "P41", "P43", "P44"])
      .optional(),
    isBudgetUnionState: z.boolean().optional(),
    is449Features: z.boolean().optional(),
    directDT: z.string().optional(),
    publishDTInEIS: z.string().optional(),
    href: z.string().optional(),
  }),

  // ВКЛАДКА 1: Жизнеобеспечение (ч. 9 ст. 37)
  purchaseObjectsCh9St37: z.boolean(),

  // ВКЛАДКА 1: Контактная информация
  contactInfo: z.object({
    organizationId: z.union([z.string(), z.number()]).optional(),
    organizationName: z.string().min(1),
    postalAddress: z.string().min(1),
    locationAddress: z.string().min(1),
    responsibleRole: z
      .enum([
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
      ])
      .optional(),
    specializedOrgName: z.string().optional(),
    specializedOrgInn: z.string().optional(),
    specializedOrgKpp: z.string().optional(),
    specializedOrgAddress: z.string().optional(),
    placerSurname: z.string().min(1, "Укажите фамилию").max(50),
    placerName: z.string().min(1, "Укажите имя").max(50),
    placerFathername: z.string().max(50),
    placerEmail: z.string().email("Некорректный email").max(256),
    phoneNum: EisPhoneSchema,
    faxNum: EisPhoneSchema,
    otherInfo: z.string(),
  }),

  // ВКЛАДКА 2: Информация о процедуре закупки
  procedureInfo: z.object({
    collectingStartDT: z.string().optional(),
    plannedPublishDate: z
      .string()
      .min(1, "Укажите предполагаемую дату размещения"),
    submissionEndDate: z
      .string()
      .min(1, "Укажите дату окончания подачи заявок"),
    submissionEndTime: z
      .string()
      .min(1, "Укажите время окончания подачи заявок"),
    // Поля procedureEOK2020Type (конкурс) и procedureEF2020Type (аукцион)
    firstPartsDate: z.string().optional(),
    submissionProcedureDate: z.string().optional(),
    secondPartsReviewEndDate: z.string().optional(),
    biddingDate: z.string().optional(),
    summingUpDate: z.string().min(1, "Укажите дату подведения итогов"),
    additionalInfo: z.string().optional(),
  }),

  // ВКЛАДКА 3: Условия контракта
  contractConditions: z.object({
    currency: z.string(),
    usePriceFormulaPP19: z.boolean(),
    priceFormulaText: z.string().optional(),
    isForeignCurrencyNmck: z.boolean(),
    interbudgetaryTransfer: z.boolean().optional(),
    hasAdvance: z.boolean(),
    advancePercent: z.number().min(0).max(100),
    requiresPublicDiscussionArt20: z.boolean(),

    // Составные части ИКЗ
    ikzYear: z.string(),
    ikzCustomerCode: z.string(),
    ikzPlanNumber: z.string(),
    ikzOrderNumber: z.string(),
    ikzOkpd2: z.string(),
    ikzKvr: z.string(),

    // Сроки и этапы (relativeAndNotRelativeTerms2022Type)
    isRelativeTerms: z.boolean(),
    startOffsetDays: z.number().nonnegative(),
    startDayType: z.enum(["C", "W"]).optional(),
    durationDays: z.number().nonnegative(),
    termDayType: z.enum(["C", "W"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isFromConclusionDate: z.boolean().optional(),
    isNotEarlierConclusionDate: z.boolean().optional(),
    isExecutionStagesTerms: z.boolean().optional(),
    hasMultipleStages: z.boolean(),
    stagesCount: z.number().min(1),
    stages: z.array(ContractStageSchema),

    // Бюджет и финансирование
    isBudgetFunds: z.boolean(),
    budgetName: z.string(),
    budgetLevel: z.string(),
    oktmoCode: z.string(),

    // Типовые условия и контракт жизненного цикла (ПП РФ № 1087)
    typicalConditionsNumber: z.string().optional(),
    isLifecycleContract: z.boolean(),
    lifecycleCasesPP1087: z.array(z.string()),
    lcDeliveryPrice: z.number().optional(),
    lcServicePrice: z.number().optional(),

    // Места поставки и доп. условия
    deliveryPlaces: z.array(DeliveryPlaceSchema),
    allowUnilateralRefusalArt95: z.boolean(),
    oneSideRejectionSt95Text: z.string().optional(),
    multipleWinnersPart10Art34: z.enum(["not_established", "established"]),
  }),

  // ВКЛАДКА 4: Объект закупки
  purchaseObjects: z.object({
    isMedicines: z.boolean(),
    isStructuredForm: z.boolean().optional(),
    isIndeterminateVolume: z.boolean(),
    items: z.array(PurchaseObjectItemSchema),
    // Единый набор характеристик объекта закупки (п. 7 ПП РФ № 926 / ООЗ).
    // Раньше набор дублировался в каждой позиции; теперь он один на закупку.
    normingRequirements: z.array(PurchaseObjectRequirementSchema).optional(),
  }),

  // ВКЛАДКА 4: Структурированное описание объекта закупки
  // (ПП РФ от 08.02.2017 № 145 — требования к описанию объекта закупки).
  // Дополняет типовые требования normingRequirements (ПП РФ N 926) и
  // Positionen объекта закупки purchaseObjects.items.
  objectDescription: z
    .object({
      objectName: z.string().optional(),
      okpd2Code: z.string().optional(),
      okpd2Name: z.string().optional(),
      ktruCode: z.string().optional(),
      ktruName: z.string().optional(),
      consumerProperties: z.string().optional(),
      qualityCharacteristics: z.string().optional(),
      functionalProperties: z.string().optional(),
      environmentalCharacteristics: z.string().optional(),
      otherRequirements: z.string().optional(),
    })
    .optional(),

  // ВКЛАДКА 5: Требования к участникам, критерии и обеспечение
  participantsRequirements: z.object({
    isNiokrOrConsulting: z.boolean(),
    evaluationCriteria: z.array(EvaluationCriterionSchema),
    // Категория объекта по приложению N 2 к ПП РФ N 2604 и коды ОКПД2,
    // по которым она определена в служебной записке (план-график)
    evaluationObjectCategory: z.string().optional(),
    evaluationOkpd2Codes: z.array(z.string()).optional(),

    // Преимущества
    advantageDisabledArt29: z.boolean(),
    advantagePenalSystemArt28: z.boolean(),
    advantageSmpPart3Art30: z.boolean(),

    // Требования по ст. 31 и ПП РФ № 1482 / № 2571
    unifiedRequirementsPart1Art31: z.boolean(),
    unifiedRequirementsPart1Art31Text: z.string().optional(),
    requirementP1Part1Art31: z.boolean().optional(),
    requirementP1Part1Art31Text: z.string().optional(),
    requirementsPart1_1Art31: z.boolean(),
    pp1482ProductionFacilities: z.boolean().optional(),
    pp1482ProductionFacilitiesText: z.string().optional(),
    pp1482FinancialStability: z.boolean().optional(),
    pp1482FinancialStabilityText: z.string().optional(),
    pp1482Specialists: z.boolean().optional(),
    pp1482SpecialistsText: z.string().optional(),
    additionalRequirementsPart2Art31: z.boolean(),
    additionalRequirementsPart2Art31Text: z.string().optional(),
    pp2571Positions: z.array(z.string()),
    requirementsPart2_1Art31: z.boolean().optional(),
    requirementsPart2_1Art31Text: z.string().optional(),
    pp2571Point4Requirement: z.boolean().optional(),
    pp2571Point4RequirementText: z.string().optional(),
    subcontractingSmpPart5Art30: z.boolean(),
    // Требование о привлечении субподрядчиков из СМП/СОНКО: процент от цены
    // контракта по п. 1 типовых условий (ПП РФ от 23.12.2016 N 1466).
    // Наследуется из служебной записки по позиции плана-графика
    subcontractingSmpRequiredPercent: z
      .string()
      .refine(
        (v) =>
          v === "" ||
          (/^\d{1,3}(\.\d{1,2})?$/.test(v) &&
            Number(v) >= 0 &&
            Number(v) <= 100),
        "Процент от 0 до 100",
      )
      .optional(),
    // Номер служебки, из которой взято требование — ссылка для проверки
    subcontractingSmpNoteNumber: z.string().optional(),
    sanctionsRnpRequirement: z.boolean(),

    // Обеспечение заявки
    requiresApplicationSecurity: z.boolean(),
    applicationSecurityPercent: z.number().min(0).max(5),
    applicationSecurityOrder: z.string().optional(),
    applicationSecurityRequisites: BankRequisitesSchema,
    applicationSecurityBudgetRequisites:
      BudgetPart13Art44RequisitesSchema.optional(),

    // Обеспечение исполнения контракта
    requiresContractSecurity: z.boolean(),
    contractSecurityPercent: z.number().min(0).max(30),
    contractSecurityOrder: z.string().optional(),
    contractSecurityRequisites: BankRequisitesSchema,
    unableProvideContractGuaranteeReason: z.string().optional(),

    // Гарантия качества и обеспечение гарантийных обязательств
    requiresQualityWarranty: z.boolean(),
    warrantyMaintenanceInfo: z.string().optional(),
    manufacturerWarrantyInfo: z.string().optional(),
    warrantyTermAndVolume: z.string().optional(),

    requiresWarrantySecurity: z.boolean(),
    warrantySecurityPercent: z.number().min(0).max(10),
    warrantySecurityOrder: z.string().optional(),
    warrantySecurityRequisites: BankRequisitesSchema,

    additionalInfo: z.string().optional(),

    // Казначейское и банковское сопровождение
    requiresTreasurySupport: z.boolean(),
    treasurySupportType: z.string().optional(),
    requiresBankSupport: z.boolean(),
  }),

  // Контроль нормирования (ПП РФ N 926 от 02.09.2015): цена единицы нормируемой
  // позиции не может превышать предельную. Превышение снимается с контроля
  // только подписью главного подписанта — руководитель контрактной службы или
  // контрактный управляющий фиксирует, что организация идёт на нарушение
  // осознанно; факт подписи остаётся в извещении
  normingControl: z
    .object({
      breachConfirmedByName: z.string().optional(),
      breachConfirmedDate: z.string().optional(),
      breachReason: z.string().optional(),
    })
    .optional(),

  // ВКЛАДКА 6: Прилагаемые документы
  attachedDocs: z.array(AttachedDocItemSchema),
});

export type NoticeInfoFormValues = z.infer<typeof NoticeInfoSchema>;
export type NoticeInfo = NoticeInfoFormValues;
