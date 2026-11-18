import z from "zod";
import {
  BudgetPart13Art44RequisitesSchema,
  OrganizationSecurityAccountSchema,
} from "../Organization/organization.schema";
import { DeliveryPlaceSchema } from "../Procurements/noticeInfo.schema";
import { RUSSIA } from "../AddressRef/addressRef.schema";
import {
  NMCK_METHODS,
  NmckCalculationRecordSchema,
  NmckMarketOfferSchema,
} from "../Nmck/nmck.schema";
import {
  CriterionSchema,
  OBJECT_CATEGORY_IDS,
  PROCEDURE_KINDS,
} from "../BidEvaluation/bidEvaluation.schema";

/**
 * Потребность / служебная записка по позиции плана-графика.
 *
 * Создаётся по конкретной позиции плана-графика (действие «Сформировать
 * потребность») и является носителем исходных требований по закупке:
 * множественные объекты закупки и связанные ООЗ, единый флаг ч. 24 ст. 22,
 * КБК из ПГ (с правом несогласия планировщиков/согласующих), относительные и
 * абсолютные сроки поставки, приёмка датой или от события, множественные
 * места поставки, бюджет/аванс/сопровождение, требования ст. 31 / ПП 1482 /
 * ПП 2571, СМП, гарантия качества и все три вида обеспечений с реквизитами.
 *
 * Сведения из СЗ предзаполняют извещение, а данные извещения и СЗ — проект
 * контракта и далее карточку контракта в реестре.
 */

const isoDate = () =>
  z
    .string()
    .refine(
      (v) =>
        v === "" || /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    )
    .optional();

const optionalMoney = () =>
  z
    .string()
    .refine(
      (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
      "Укажите сумму числом с точностью до копеек",
    )
    .optional();

const optionalPercent = () =>
  z
    .string()
    .refine(
      (v) =>
        v === "" ||
        (/^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
      "Укажите значение от 0 до 100",
    )
    .optional();

const optionalNonNegativeInt = () =>
  z
    .union([z.number(), z.string(), z.undefined()])
    .transform((v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined;
    })
    .optional();

const optionalSmpPercent = () =>
  z
    .union([z.number(), z.string(), z.undefined()])
    .transform((v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : Number.NaN;
    })
    .optional();

export const PurchaseNoteObjectItemSchema = z.object({
  id: z.string(),
  objectDescriptionId: z.union([z.string(), z.number()]).nullable().optional(),
  name: z.string().trim().min(1, "Укажите наименование объекта закупки"),
  okpd2Code: z.string().optional(),
  okpd2Name: z.string().optional(),
  // Позиция КТРУ, если код ОКПД2 присутствует в каталоге (ПП РФ № 145):
  // наименование, единица измерения и характеристики берутся из каталога
  ktruCode: z.string().optional(),
  ktruName: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.string().optional(),
  unitPrice: optionalMoney(),
  totalPrice: optionalMoney(),
  nationalRegimeType: z
    .enum(["none", "ban", "restriction", "advantage"])
    .optional(),
  isSupplyDuringWorks: z.boolean().optional(),
});

export type PurchaseNoteObjectItem = z.infer<
  typeof PurchaseNoteObjectItemSchema
>;

/**
 * Подпись обоснования НМЦК электронной подписью заказчика.
 *
 * Снимок события журнала ЭП хранится копией: журнал отвечает на вопрос
 * «кто и чем подписал», а карточка СЗ должна показывать подписанную НМЦК
 * даже если запись журнала отфильтрована или недоступна. Подписанная НМЦК
 * подтягивается в СЗ и в извещение, чтобы обоснование не собиралось заново.
 */
export const NmckSignatureSchema = z.object({
  signedAt: z.string().optional(),
  signedBy: z.string().optional(),
  certificateOwner: z.string().optional(),
  certificateSerial: z.string().optional(),
  certificateInn: z.string().optional(),
  fileName: z.string().optional(),
  fileUpdatedAt: z.string().optional(),
  nmckTotal: z.string().optional(),
  method: z.enum(NMCK_METHODS).optional(),
  eventId: z.union([z.string(), z.number()]).optional(),
  documentLabel: z.string().optional(),
});

export type NmckSignature = z.infer<typeof NmckSignatureSchema>;

export const PurchaseNoteSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    organizationId: z.union([z.string(), z.number()]),

    // Ссылка на план-график (выступает основанием потребности), позицию, закупку и ООЗ
    purchasePlanId: z.union([z.string(), z.number()]).nullable().optional(),
    purchasePlanNumber: z.string().optional(),
    positionId: z.union([z.string(), z.number()]).nullable().optional(),
    positionSerialNumber: z.string().optional(),
    positionUniqueNumber: z.string().optional(),
    ikz: z.string().optional(),
    procurementId: z.union([z.string(), z.number()]).nullable().optional(),
    objectDescriptionId: z
      .union([z.string(), z.number()])
      .nullable()
      .optional(),

    // Организаторы и КБК (код берётся из ПГ; правка кода в СЗ закрыта,
    // возможно только несогласие, а суммы финансирования корректируются)
    authorizedBodyName: z.string().optional(),
    jointOrganizerName: z.string().optional(),
    kbk: z.string().optional(),
    kbkDisagreement: z.boolean().optional(),
    kbkSuggested: z.string().optional(),
    kbkDisagreementComment: z.string().optional(),
    kbkDisagreementAuthor: z.string().optional(),
    // Суммы финансирования по КБК, скорректированные в СЗ. По умолчанию
    // берутся из плана-графика, но могут быть уменьшены под фактическую НМЦК.
    // Правятся именно годовые суммы: «всего» по КБК считается как их сумма,
    // а непревышение объёмов плана-графика проверяется в форме.
    kbkFundingAmounts: z
      .array(
        z.object({
          id: z.string(),
          kbk: z.string().optional(),
          amountCurrentYear: optionalMoney(),
          amountPlanPeriodFirstYear: optionalMoney(),
          amountPlanPeriodSecondYear: optionalMoney(),
          amountSubsequentYears: optionalMoney(),
        }),
      )
      .optional(),

    // Бюджет: уровень фиксирован от заказчика, источник финансирования — текст
    budgetLevel: z.string().optional(),
    fundingSource: z.string().optional(),

    // Реквизиты потребности / служебной записки
    noteNumber: z.string().trim().min(1, "Укажите номер служебной записки"),
    noteDate: z.string().trim().min(1, "Укажите дату служебной записки"),
    initiatorEmployeeId: z
      .union([z.string(), z.number()])
      .nullable()
      .optional(),
    initiatorName: z.string().trim().min(3, "Укажите инициатора"),
    // Устаревшее поле основания (сохранено для совместимости старых записей)
    basis: z.string().max(500).optional(),

    // Предмет закупки (верхнее поле) и единый флаг ч. 24 ст. 22 над объектами
    subject: z.string().trim().min(5, "Укажите предмет закупки"),
    isIndeterminateVolume: z.boolean().optional(),
    // Множественные объекты закупки по СЗ
    items: z.array(PurchaseNoteObjectItemSchema).optional(),

    // Сводные поля первой позиции (для обратной совместимости)
    okpd2Code: z.string().optional(),
    okpd2Name: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.string().optional(),
    initialMaxPrice: optionalMoney(),
    priceBasis: z.string().optional(),
    // Файл обоснования НМЦК, запрос на него и рабочие коммерческие предложения (ст. 22 44-ФЗ)
    nmckFileName: z.string().optional(),
    nmckFileUpdatedAt: z.string().optional(),

    // Файл структурированного описания объекта закупки (ООЗ). Готовится
    // в служебной записке; после согласования переносится в прилагаемые
    // документы извещения.
    objectDescriptionFileName: z.string().optional(),
    objectDescriptionFileUpdatedAt: z.string().optional(),

    // Готовность ООЗ и позиции плана-графика:
    // - набор объектов конечный, описание позволяет определить НМЦК;
    // - это последняя закупка по позиции плана-графика (дальнейших не будет).
    oozSetComplete: z.boolean().optional(),
    positionProcurementsComplete: z.boolean().optional(),
    nmckRequestStatus: z.enum(["none", "requested", "received"]).optional(),
    nmckRequestComment: z.string().optional(),
    nmckRequestAssignee: z.string().optional(),
    nmckRequestDate: z.string().optional(),
    nmckOffers: z.array(NmckMarketOfferSchema).optional(),
    nmckCalculation: NmckCalculationRecordSchema.optional(),
    // Подписанная ЭП заказчика НМЦК: реквизиты подписи и файла обоснования
    nmckSignature: NmckSignatureSchema.optional(),

    // Способ определения поставщика и отраслевой тип закупки
    placingWayCode: z.string().optional(),
    procurementType: z.string().optional(),

    // Аванс и сопровождение контракта (порядка оплаты и срока оплаты в СЗ нет —
    // срок оплаты определяется на этапе проекта контракта в т.ч. по казначейскому сопровождению)
    hasAdvance: z.boolean().optional(),
    advancePercent: optionalPercent(),
    requiresTreasurySupport: z.boolean().optional(),
    treasurySupportType: z
      .enum(["", "full", "advance_only"])
      .or(z.string())
      .optional(),
    requiresBankSupport: z.boolean().optional(),
    // Устаревшие поля для обратной совместимости старых записей
    paymentProcedure: z.enum(["postpayment", "advance", "staged"]).optional(),
    paymentTermDays: optionalNonNegativeInt(),

    // Сроки поставки (относительные / абсолютные) и приёмки (от события / датой).
    // Для относительного срока — опциональный признак «отсчёт с даты
    // заключения контракта» (иначе от иной даты, указанной в закупке).
    deliveryTermMode: z.enum(["relative", "absolute"]).optional(),
    deliveryTermFromContractDate: z.boolean().optional(),
    deliveryStartOffsetDays: optionalNonNegativeInt(),
    desiredStartDate: isoDate(),
    desiredEndDate: isoDate(),
    executionTermDays: optionalNonNegativeInt(),

    acceptanceTermMode: z.enum(["event", "date"]).optional(),
    acceptanceEventBase: z.string().optional(),
    acceptanceTermDays: optionalNonNegativeInt(),
    acceptanceDate: isoDate(),

    // Множественные места поставки (каскад как в Извещении) + плоская строка совместимости
    deliveryPlaces: z.array(DeliveryPlaceSchema).optional(),
    deliveryPlace: z.string().optional(),

    // Национальный режим (ст. 14) и СМП/СОНКО (ст. 30, ПП РФ № 1466)
    nationalRegimeType: z
      .enum(["none", "ban", "restriction", "advantage"])
      .optional(),
    advantageSmpPart3Art30: z.boolean().optional(),
    requiresSmpSubcontracting: z.boolean().optional(),
    smpRequiredPercent: optionalSmpPercent(),

    // Требования к участникам закупок (ст. 31, ПП РФ № 1482, ПП РФ № 2571, санкции РНП)
    // Поля описания предусмотрены под всеми требованиями, кроме ч. 1.1 ст. 31 (default true) и санкционного РНП
    unifiedRequirementsPart1Art31: z.boolean().optional(),
    unifiedRequirementsPart1Art31Text: z.string().optional(),
    requirementP1Part1Art31: z.boolean().optional(),
    requirementP1Part1Art31Text: z.string().optional(),
    requirementsPart1_1Art31: z.boolean().optional(),
    pp1482ProductionFacilities: z.boolean().optional(),
    pp1482ProductionFacilitiesText: z.string().optional(),
    pp1482FinancialStability: z.boolean().optional(),
    pp1482FinancialStabilityText: z.string().optional(),
    pp1482Specialists: z.boolean().optional(),
    pp1482SpecialistsText: z.string().optional(),
    additionalRequirementsPart2Art31: z.boolean().optional(),
    additionalRequirementsPart2Art31Text: z.string().optional(),
    pp2571Positions: z.array(z.string()).optional(),
    requirementsPart2_1Art31: z.boolean().optional(),
    requirementsPart2_1Art31Text: z.string().optional(),
    pp2571Point4Requirement: z.boolean().optional(),
    pp2571Point4RequirementText: z.string().optional(),
    sanctionsRnpRequirement: z.boolean().optional(),

    // Критерии оценки по ПП РФ N 2604 (для извещения). Категория объекта и
    // коды ОКПД2 связывают СЗ с позицией плана-графика: по ним проверяются
    // предельные величины значимости и аукционный перечень N 471-р.
    evaluationProcedureKind: z.enum(PROCEDURE_KINDS).optional(),
    evaluationObjectCategory: z.enum(OBJECT_CATEGORY_IDS).optional(),
    evaluationOkpd2Codes: z.array(z.string()).optional(),
    evaluationCriteria: z.array(CriterionSchema).optional(),

    // Устаревшие поля критериев (оставлены optional для старых записей)
    priceWeightPercent: optionalPercent(),
    qualificationWeightPercent: optionalPercent(),

    // Обеспечение заявки + подраздел бюджетного счёта по ч. 13 ст. 44 44-ФЗ
    requiresApplicationSecurity: z.boolean().optional(),
    applicationSecurityPercent: optionalPercent(),
    applicationSecurityOrder: z.string().optional(),
    applicationSecurityRequisites: OrganizationSecurityAccountSchema.optional(),
    applicationSecurityBudgetRequisites:
      BudgetPart13Art44RequisitesSchema.optional(),

    // Обеспечение исполнения контракта + порядок + реквизиты
    requiresContractSecurity: z.boolean().optional(),
    contractSecurityPercent: optionalPercent(),
    contractSecurityOrder: z.string().optional(),
    contractSecurityRequisites: OrganizationSecurityAccountSchema.optional(),

    // Гарантия качества (3 поля, 3-е обязательно при включении) и обеспечение гарантии
    requiresQualityWarranty: z.boolean().optional(),
    warrantyMaintenanceInfo: z.string().optional(),
    manufacturerWarrantyInfo: z.string().optional(),
    warrantyTermAndVolume: z.string().optional(),

    requiresWarrantySecurity: z.boolean().optional(),
    warrantySecurityPercent: optionalPercent(),
    warrantySecurityOrder: z.string().optional(),
    warrantySecurityRequisites: OrganizationSecurityAccountSchema.optional(),

    warrantyTermMonths: optionalNonNegativeInt(),
    allowUnilateralRefusalArt95: z.boolean().optional(),
    otherRequirements: z.string().optional(),

    status: z
      .enum(["draft", "in_review", "approved", "rejected", "cancelled"])
      .default("draft"),
    approvalUpdatedAt: z.string().optional(),
    approvalUpdatedBy: z.string().optional(),
    approvalComment: z.string().optional(),
    comment: z.string().optional(),
    createdAt: isoDate(),
  })
  .superRefine((note, ctx) => {
    // 1. При включённой галочке привлечения СМП обязателен процент 5..100
    if (note.requiresSmpSubcontracting) {
      const val = note.smpRequiredPercent;
      if (val === undefined || Number.isNaN(val)) {
        ctx.addIssue({
          code: "custom",
          path: ["smpRequiredPercent"],
          message: "Укажите процент привлечения СМП/СОНКО числом",
        });
      } else if (val < 5 || val > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["smpRequiredPercent"],
          message: "По п. 1 ПП РФ от 23.12.2016 № 1466 — от 5 до 100 %",
        });
      }
    }

    // 2. При включённой гарантии качества 3-е поле обязательно
    if (note.requiresQualityWarranty) {
      if (!note.warrantyTermAndVolume || !note.warrantyTermAndVolume.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["warrantyTermAndVolume"],
          message:
            "Укажите срок и (или) требования к объему предоставления гарантии качества",
        });
      }
    }

    // 3. Обеспечение гарантийных обязательств допустимо только при гарантии качества
    if (note.requiresWarrantySecurity && !note.requiresQualityWarranty) {
      ctx.addIssue({
        code: "custom",
        path: ["requiresWarrantySecurity"],
        message:
          "Обеспечение гарантийных обязательств устанавливается только при включённой гарантии качества",
      });
    }
  });

export type PurchaseNote = z.infer<typeof PurchaseNoteSchema>;
export type PurchaseNoteInput = z.input<typeof PurchaseNoteSchema>;
export const PurchaseNoteListSchema = z.array(PurchaseNoteSchema);

export const PURCHASE_NOTE_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type PurchaseNoteStatus = (typeof PURCHASE_NOTE_STATUSES)[number];

export type PurchaseNoteStatusTone =
  | "in_progress"
  | "in_review"
  | "approved"
  | "rejected";

export const PURCHASE_NOTE_STATUS_META: Record<
  PurchaseNoteStatus,
  {
    label: string;
    shortLabel: string;
    tone: PurchaseNoteStatusTone;
  }
> = {
  draft: {
    label: "В работе",
    shortLabel: "В работе",
    tone: "in_progress",
  },
  in_review: {
    label: "На согласовании",
    shortLabel: "Согласование",
    tone: "in_review",
  },
  approved: {
    label: "Согласовано",
    shortLabel: "Согласовано",
    tone: "approved",
  },
  rejected: {
    label: "Отклонено",
    shortLabel: "Отклонено",
    tone: "rejected",
  },
  cancelled: {
    label: "Отклонено (аннулировано)",
    shortLabel: "Аннулировано",
    tone: "rejected",
  },
};

export const getPurchaseNoteStatusMeta = (
  status?: PurchaseNoteStatus | string,
) =>
  PURCHASE_NOTE_STATUS_META[
    (status as PurchaseNoteStatus) in PURCHASE_NOTE_STATUS_META
      ? (status as PurchaseNoteStatus)
      : "draft"
  ];

// Служебки позиции: по ним наследуем требование по СМП и исходные условия вниз по цепочке
export const purchaseNotesForPosition = (
  notes: PurchaseNote[],
  positionId: string | number | undefined,
): PurchaseNote[] =>
  positionId === undefined || positionId === ""
    ? []
    : notes.filter((note) => String(note.positionId) === String(positionId));

// Последняя по номеру служебка позиции — её требования и наследуем
export const latestPurchaseNoteForPosition = (
  notes: PurchaseNote[],
  positionId: string | number | undefined,
): PurchaseNote | undefined =>
  purchaseNotesForPosition(notes, positionId).slice(-1)[0];

// Следующий номер служебной записки: нумерация сквозная по организации
export const nextPurchaseNoteNumber = (notes: PurchaseNote[]): string => {
  const last = notes.reduce((max, note) => {
    const value = Number.parseInt(String(note.noteNumber ?? ""), 10);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  return String(last + 1);
};

// Проверка, включено ли привлечение СМП (учитывает старые записи без нового флага)
export const hasSmpSubcontractingRequirement = (note: PurchaseNote): boolean =>
  note.requiresSmpSubcontracting ??
  (note.smpRequiredPercent !== undefined &&
    note.smpRequiredPercent > 0 &&
    !note.advantageSmpPart3Art30);

// Требуемый объём привлечения по служебке: процент от цены (НМЦК) закупки
export const requiredSmpAmountFromNote = (
  note: PurchaseNote,
): number | null => {
  if (!hasSmpSubcontractingRequirement(note)) return null;
  const price = Number.parseFloat(String(note.initialMaxPrice ?? ""));
  const percent = Number(note.smpRequiredPercent);

  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(percent)) {
    return null;
  }

  return Math.round(price * percent) / 100;
};

export const emptyDeliveryPlace = (id = "1") => ({
  id,
  country: RUSSIA,
  region: "",
  municipality: "",
  settlement: "",
  address: "",
  additionalInfo: "",
});

export const emptyPurchaseNote = (
  organizationId: string | number = "",
): PurchaseNote => ({
  organizationId,
  noteNumber: "",
  noteDate: new Date().toISOString().slice(0, 10),
  initiatorName: "",
  basis: "",
  ikz: "",
  authorizedBodyName: "",
  jointOrganizerName: "",
  kbk: "",
  kbkDisagreement: false,
  kbkSuggested: "",
  kbkDisagreementComment: "",
  kbkDisagreementAuthor: "",
  budgetLevel: "",
  fundingSource: "Бюджет субъекта Российской Федерации",
  subject: "",
  isIndeterminateVolume: false,
  // По умолчанию набор объектов считается конечным, а закупка — последней
  // по позиции плана-графика: заказчик снимает флаги осознанно
  oozSetComplete: true,
  positionProcurementsComplete: true,
  items: [
    {
      id: "item-1",
      objectDescriptionId: undefined,
      name: "",
      okpd2Code: "",
      okpd2Name: "",
      ktruCode: "",
      ktruName: "",
      unit: "",
      quantity: "1",
      unitPrice: "",
      totalPrice: "",
      nationalRegimeType: "none",
      isSupplyDuringWorks: false,
    },
  ],
  okpd2Code: "",
  okpd2Name: "",
  unit: "",
  quantity: "1",
  initialMaxPrice: "",
  priceBasis:
    "Метод сопоставимых рыночных цен (анализ рынка) в соответствии со ст. 22 Закона № 44-ФЗ",
  // Способ определения поставщика не выбирается по умолчанию: пользователь
  // должен осознанно выбрать его в форме (плейсхолдер «Выберите способ»)
  placingWayCode: "",
  procurementType: "Прочее",
  hasAdvance: false,
  advancePercent: "",
  requiresTreasurySupport: false,
  treasurySupportType: "",
  requiresBankSupport: false,
  deliveryTermMode: "relative",
  deliveryTermFromContractDate: true,
  deliveryStartOffsetDays: 0,
  desiredStartDate: "",
  desiredEndDate: "",
  executionTermDays: 30,
  acceptanceTermMode: "event",
  acceptanceEventBase: "с даты поступления заказчику документа о приёмке в ЕИС",
  acceptanceTermDays: 10,
  acceptanceDate: "",
  deliveryPlaces: [emptyDeliveryPlace("1")],
  deliveryPlace: "",
  nationalRegimeType: "none",
  advantageSmpPart3Art30: false,
  requiresSmpSubcontracting: false,
  smpRequiredPercent: undefined,
  unifiedRequirementsPart1Art31: true,
  unifiedRequirementsPart1Art31Text:
    "Соответствие требованиям ч. 1 ст. 31 Закона № 44-ФЗ (непроведение ликвидации/банкротства, неприостановление деятельности, отсутствие недоимки по налогам, судимости и конфликта интересов).",
  requirementP1Part1Art31: false,
  requirementP1Part1Art31Text:
    "Наличие действующей лицензии / членства в СРО / свидетельства о допуске к видам работ, установленных законодательством Российской Федерации (п. 1 ч. 1 ст. 31 Закона № 44-ФЗ).",
  requirementsPart1_1Art31: true,
  pp1482ProductionFacilities: false,
  pp1482ProductionFacilitiesText: "",
  pp1482FinancialStability: false,
  pp1482FinancialStabilityText: "",
  pp1482Specialists: false,
  pp1482SpecialistsText: "",
  additionalRequirementsPart2Art31: false,
  additionalRequirementsPart2Art31Text: "",
  pp2571Positions: [],
  requirementsPart2_1Art31: false,
  requirementsPart2_1Art31Text:
    "Наличие опыта исполнения контракта (договора) стоимостью не менее 20 процентов НМЦК за последние 3 года до даты подачи заявки при НМЦК 20 млн рублей и более (ч. 2.1 ст. 31 Закона № 44-ФЗ).",
  pp2571Point4Requirement: false,
  pp2571Point4RequirementText:
    "Участник закупки подтверждает соответствие требованиям, предусмотренным пунктом 4 Постановления Правительства РФ от 29.12.2021 № 2571 (порядок оценки опыта исполнения контракта, в том числе с учетом правопреемства и без учёта штрафов/пеней, не превышающих установленный порог, либо подтверждение документами о приёмке по ЕИС / контрактам № 44-ФЗ и № 223-ФЗ).",
  sanctionsRnpRequirement: false,
  requiresApplicationSecurity: true,
  applicationSecurityPercent: "1",
  applicationSecurityOrder:
    "Денежные средства перечисляются участником на специальный счёт (либо предоставляется независимая гарантия по ст. 45 Закона № 44-ФЗ)",
  applicationSecurityRequisites: {},
  applicationSecurityBudgetRequisites: {},
  requiresContractSecurity: true,
  contractSecurityPercent: "5",
  contractSecurityOrder:
    "Денежные средства перечисляются на указанный счёт заказчика до заключения контракта либо предоставляется независимая гарантия (ст. 96 Закона № 44-ФЗ)",
  contractSecurityRequisites: {},
  requiresQualityWarranty: false,
  warrantyMaintenanceInfo: "",
  manufacturerWarrantyInfo: "",
  warrantyTermAndVolume: "",
  requiresWarrantySecurity: false,
  warrantySecurityPercent: "",
  warrantySecurityOrder:
    "Предоставляется поставщиком до оформления документа о приёмке поставленного товара / выполненной работы (ч. 7.1 ст. 94 Закона № 44-ФЗ)",
  warrantySecurityRequisites: {},
  warrantyTermMonths: 12,
  allowUnilateralRefusalArt95: true,
  otherRequirements: "",
  status: "draft",
  approvalUpdatedAt: "",
  approvalUpdatedBy: "",
  approvalComment: "",
  comment: "",
  createdAt: new Date().toISOString().slice(0, 10),
});
