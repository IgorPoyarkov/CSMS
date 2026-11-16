import { z } from "zod";

export const EisPhoneSchema = z.object({
  countryCode: z.string().max(4),
  cityCode: z.string().max(6),
  num: z.string().max(7),
  numExt: z.string().max(15),
});

export const BankRequisitesSchema = z.object({
  accountSearch: z.string().optional(),
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
  region: z.string().optional(),
  municipality: z.string().optional(),
  settlement: z.string().optional(),
  address: z.string(),
  additionalInfo: z.string().optional(),
});

export const PurchaseObjectItemSchema = z.object({
  id: z.string(),
  okpd2OrKtruCode: z.string(),
  name: z.string(),
  unit: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  trademarks: z.string().optional(),
  isSupplyDuringWorks: z.boolean(),
  nationalRegimeType: z.enum(["none", "ban", "restriction", "advantage"]),
  // Типовые требования по п. 7 ПП РФ N 926 (обязательное нормирование).
  // Заполняются для нормируемых позиций ОКПД2 — потребительские, качественные,
  // функциональные и прочие свойства товара/работы/услуги.
  normingRequirements: z
    .array(
      z.object({
        id: z.string(),
        requirementType: z.enum([
          "consumer",
          "quality",
          "functional",
          "other",
        ]),
        requirementText: z.string().min(1, "Укажите требование"),
      }),
    )
    .optional(),
});

export const EvaluationCriterionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "price",
    "exploitation_expenses",
    "lifecycle_cost",
    "energy_service_expenses",
    "qualitative_characteristics",
    "qualification",
  ]),
  enabled: z.boolean(),
  weightPercent: z.number().min(0).max(100),
  additionalInfo: z.string().optional(),
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
    ikz: z.string().min(36, "ИКЗ должен содержать 36 символов"),
    nmck: z.number().nonnegative(),
    authorizedBodyName: z.string().optional(),
    jointOrganizerName: z.string().optional(),
    kbk: z.string().optional(),
  }),

  // ВКЛАДКА 1: Жизнеобеспечение (ч. 9 ст. 37)
  purchaseObjectsCh9St37: z.boolean(),

  // ВКЛАДКА 1: Контактная информация
  contactInfo: z.object({
    organizationId: z.union([z.string(), z.number()]).optional(),
    organizationName: z.string().min(1),
    postalAddress: z.string().min(1),
    locationAddress: z.string().min(1),
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
    plannedPublishDate: z
      .string()
      .min(1, "Укажите предполагаемую дату размещения"),
    submissionEndDate: z
      .string()
      .min(1, "Укажите дату окончания подачи заявок"),
    submissionEndTime: z
      .string()
      .min(1, "Укажите время окончания подачи заявок"),
    secondPartsReviewEndDate: z.string().optional(),
    summingUpDate: z.string().min(1, "Укажите дату подведения итогов"),
  }),

  // ВКЛАДКА 3: Условия контракта
  contractConditions: z.object({
    currency: z.string(),
    usePriceFormulaPP19: z.boolean(),
    priceFormulaText: z.string().optional(),
    isForeignCurrencyNmck: z.boolean(),
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

    // Сроки и этапы
    isRelativeTerms: z.boolean(),
    startOffsetDays: z.number().nonnegative(),
    durationDays: z.number().nonnegative(),
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

    // Места поставки и доп. условия
    deliveryPlaces: z.array(DeliveryPlaceSchema),
    allowUnilateralRefusalArt95: z.boolean(),
    multipleWinnersPart10Art34: z.enum(["not_established", "established"]),
  }),

  // ВКЛАДКА 4: Объект закупки
  purchaseObjects: z.object({
    isMedicines: z.boolean(),
    isIndeterminateVolume: z.boolean(),
    items: z.array(PurchaseObjectItemSchema),
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

    // Преимущества
    advantageDisabledArt29: z.boolean(),
    advantagePenalSystemArt28: z.boolean(),
    advantageSmpPart3Art30: z.boolean(),

    // Требования по ст. 31
    unifiedRequirementsPart1Art31: z.boolean(),
    requirementsPart1_1Art31: z.boolean(),
    additionalRequirementsPart2Art31: z.boolean(),
    pp2571Positions: z.array(z.string()),
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

    // Обеспечение исполнения контракта
    requiresContractSecurity: z.boolean(),
    contractSecurityPercent: z.number().min(0).max(30),
    contractSecurityOrder: z.string().optional(),
    contractSecurityRequisites: BankRequisitesSchema,

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
