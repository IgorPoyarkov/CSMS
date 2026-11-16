import z from "zod";

/**
 * Проект контракта по 44-ФЗ.
 *
 * Формируется по результатам определения поставщика (ст. 51) и содержит
 * обязательные условия, предусмотренные ст. 33 и ст. 34 Закона № 44-ФЗ.
 *
 * Структура разделов:
 * 1. Предмет контракта (ст. 33 ч. 1 п. 1)
 * 2. Цена и порядок оплаты (ст. 33 ч. 1 п. 1, ст. 34 ч. 12)
 * 3. Срок исполнения и порядок приёмки (ст. 33 ч. 1 п. 1, 3)
 * 4. Качество, гарантия (ст. 33 ч. 1 п. 2)
 * 5. Обеспечение и неустойка (ст. 34 ч. 5, 7, 13)
 * 6. Изменение и расторжение (ст. 95)
 */

const optionalText = (min: number, message: string) =>
  z
    .string()
    .refine((v) => v === "" || v.length >= min, message)
    .optional();

const requiredText = (min: number, message: string) =>
  z.string().min(min, message);

const optionalDate = () =>
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

// ─── Раздел 1: Предмет контракта (ст. 33) ─────────────────────────────────

export const ContractSubjectSchema = z.object({
  // Наименование объекта закупки (позиция плана-графика)
  objectName: requiredText(5, "Укажите наименование объекта закупки"),
  // Описание объекта закупки (ст. 33 ч. 1 п. 1)
  description: requiredText(10, "Опишите объект закупки"),
  // ОКПД2 код
  okpd2Code: optionalText(4, "Укажите код ОКПД2"),
  // КВЕД2 код
  kved2Code: optionalText(4, "Укажите код КВЕД2"),
  // Единица измерения и количество
  quantity: optionalText(1, "Укажите количество"),
  // Место поставки (ст. 33 ч. 1 п. 1)
  deliveryPlace: optionalText(5, "Укажите место поставки"),
});

// ─── Раздел 2: Цена и порядок оплаты (ст. 33, 34) ─────────────────────────

export const ContractPriceSchema = z.object({
  // Начальная (максимальная) цена контракта
  initialMaxPrice: optionalMoney(),
  // Цена контракта (итоговая, с учётом скидок)
  finalPrice: optionalMoney(),
  // Обоснование цены (ст. 33 ч. 1 п. 4, ст. 22)
  priceBasis: optionalText(10, "Укажите обоснование НМЦК"),
  // Структура цены: включены ли расходы на перевозку, страхование, уплату пошлин, налогов, НДС
  priceIncludesExpenses: z.boolean().default(true),
  // Порядок оплаты: аванс, постоплата, поэтапная (ст. 34 ч. 12)
  paymentProcedure: z
    .enum(["advance", "postpayment", "staged"])
    .default("postpayment"),
  // Размер аванса (в процентах)
  advancePercent: z
    .string()
    .refine(
      (v) => v === "" || (parseFloat(v) >= 0 && parseFloat(v) <= 100),
      "Аванс от 0 до 100%",
    )
    .optional(),
  // Срок оплаты (в рабочих/календарных днях, ст. 34 ч. 13.1)
  paymentTermDays: z
    .number()
    .int("Укажите целое число дней")
    .min(1, "Срок оплаты не менее 1 дня")
    .optional(),
});

// ─── Раздел 3: Срок исполнения и приёмка ──────────────────────────────────

export const ContractTermSchema = z.object({
  // Дата начала исполнения
  startDate: optionalDate(),
  // Дата окончания исполнения (или количество дней/месяцев)
  endDate: optionalDate(),
  // Срок действия контракта (если отличается от срока исполнения)
  validUntil: optionalDate(),
  // Этапы исполнения (для поэтапного)
  stages: z
    .array(
      z.object({
        name: requiredText(3, "Название этапа"),
        endDate: optionalDate(),
        amount: optionalMoney(),
      }),
    )
    .optional(),
  // Порядок приёмки (ст. 94)
  acceptanceProcedure: optionalText(10, "Опишите порядок приёмки"),
  // Срок приёмки (дней после поставки)
  acceptanceTermDays: z
    .number()
    .int()
    .min(1, "Срок приёмки не менее 1 дня")
    .optional(),
});

// ─── Раздел 4: Качество и гарантия ────────────────────────────────────────

export const ContractQualitySchema = z.object({
  // Требования к качеству (ст. 33 ч. 1 п. 2)
  qualityRequirements: requiredText(10, "Укажите требования к качеству"),
  // Гарантия (срок службы / гарантийный срок, ст. 33 ч. 1 п. 6)
  warrantyPeriodMonths: z
    .number()
    .int()
    .min(0, "Гарантия не может быть отрицательной")
    .optional(),
  // Срок службы
  serviceLifeMonths: z.number().int().min(0).optional(),
  // Требования к объёму и качеству (по позициям)
  specifications: z.string().optional(),
});

// ─── Раздел 5: Обеспечение и неустойка (ст. 34) ───────────────────────────

export const ContractSecuritySchema = z.object({
  // Обеспечение заявки (ст. 34 ч. 1)
  bidSecurityRequired: z.boolean().default(false),
  bidSecurityPercent: z
    .string()
    .refine(
      (v) => v === "" || (parseFloat(v) >= 0.5 && parseFloat(v) <= 5),
      "Обеспечение заявки: 0.5–5% (ст. 34 ч. 4)",
    )
    .optional(),
  // Обеспечение исполнения контракта (ст. 34 ч. 6)
  performanceSecurityRequired: z.boolean().default(true),
  performanceSecurityPercent: z
    .string()
    .refine(
      (v) => v === "" || (parseFloat(v) >= 0.5 && parseFloat(v) <= 30),
      "Обеспечение исполнения: 0.5–30% (ст. 34 ч. 6)",
    )
    .optional(),
  // Обеспечение гарантийных обязательств
  warrantySecurityRequired: z.boolean().default(false),
  // Сумма обеспечения
  securityAmount: optionalMoney(),
  // Пени: 1/300 ключевой ставки ЦБ (ст. 34 ч. 5 п. 1)
  penaltyFormula: z
    .string()
    .default("1/300 ключевой ставки ЦБ РФ за каждый день просрочки"),
  // Штрафы (фиксированные, ст. 34 ч. 5 п. 2, постановление 1042)
  fixedPenaltyAmount: optionalMoney(),
  // Ответственность за нарушение сроков промежуточных обязательств
  interimPenaltyEnabled: z.boolean().default(true),
});

// ─── Раздел 6: Изменение и расторжение (ст. 95) ───────────────────────────

export const ContractChangeSchema = z.object({
  // Условия изменения контракта (ст. 95 ч. 1)
  changeConditions: optionalText(10, "Укажите условия изменения контракта"),
  // Возможность изменения количества и объёма
  allowQuantityChange: z.boolean().default(false),
  // Возможность изменения цены
  allowPriceChange: z.boolean().default(false),
  // Условия одностороннего отказа (ст. 95 ч. 8-9)
  terminationConditions: optionalText(10, "Условия расторжения контракта"),
  // Срок возврата обеспечения (ст. 34 ч. 27)
  securityReturnDays: z.number().int().min(1).optional(),
});

// ─── Итоговая схема проекта контракта ──────────────────────────────────────

export const ContractProjectSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  // Ссылка на закупку
  procurementId: z.union([z.string(), z.number()]).optional(),
  // ИКЗ (идентификационный код закупки)
  ikz: optionalText(10, "Укажите ИКЗ"),
  // Номер извещения
  noticeNumber: optionalText(1, "Укажите номер извещения"),
  // Процент привлечения СМП/СОНКО по ч. 5 ст. 30 — наследуется из
  // служебной записки по позиции ПГ через извещение
  smpRequiredPercent: z
    .string()
    .refine(
      (v) =>
        v === "" ||
        (/^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
      "Процент от 0 до 100",
    )
    .optional(),
  // Номер служебки, из которой унаследовано требование — для справки
  subcontractingSmpNoteNumber: z.string().optional(),
  // Наименование контракта
  contractName: requiredText(5, "Укажите наименование контракта"),
  // Заказчик
  customerName: optionalText(5, "Укажите наименование заказчика"),
  // Поставщик (победитель)
  supplierName: optionalText(5, "Укажите наименование поставщика"),
  // Дата составления проекта
  projectDate: optionalDate(),
  // Дата заключения контракта (ст. 51 ч. 4: не ранее чем через 10 дней)
  conclusionDate: optionalDate(),
  // Протокол разногласий (ст. 51 ч. 4)
  protocolOfDisagreements: z.boolean().default(false),
  // Срок размещения протокола разногласий (4 дня)
  disagreementsDeadlineDays: z.number().int().min(1).optional(),

  // Разделы проекта
  subject: ContractSubjectSchema,
  price: ContractPriceSchema,
  term: ContractTermSchema,
  quality: ContractQualitySchema,
  security: ContractSecuritySchema,
  change: ContractChangeSchema,

  // Статус проекта
  status: z
    .enum(["draft", "published", "signed", "terminated"])
    .default("draft"),
  createdAt: optionalDate(),
  updatedAt: optionalDate(),
});

export type ContractProject = z.infer<typeof ContractProjectSchema>;
export const ContractProjectListSchema = z.array(ContractProjectSchema);

export const emptyContractProject = (
  organizationId: string | number = "",
): ContractProject => ({
  organizationId,
  procurementId: "",
  ikz: "",
  noticeNumber: "",
  contractName: "",
  customerName: "",
  supplierName: "",
  projectDate: "",
  conclusionDate: "",
  protocolOfDisagreements: false,
  subject: {
    objectName: "",
    description: "",
    okpd2Code: "",
    kved2Code: "",
    quantity: "",
    deliveryPlace: "",
  },
  price: {
    initialMaxPrice: "",
    finalPrice: "",
    priceBasis: "",
    priceIncludesExpenses: true,
    paymentProcedure: "postpayment",
    advancePercent: "",
    paymentTermDays: 7,
  },
  term: {
    startDate: "",
    endDate: "",
    validUntil: "",
    stages: [],
    acceptanceProcedure: "",
    acceptanceTermDays: 10,
  },
  quality: {
    qualityRequirements: "",
    warrantyPeriodMonths: undefined,
    serviceLifeMonths: undefined,
    specifications: "",
  },
  security: {
    bidSecurityRequired: false,
    bidSecurityPercent: "",
    performanceSecurityRequired: true,
    performanceSecurityPercent: "5",
    warrantySecurityRequired: false,
    securityAmount: "",
    penaltyFormula: "1/300 ключевой ставки ЦБ РФ за каждый день просрочки",
    fixedPenaltyAmount: "",
    interimPenaltyEnabled: true,
  },
  change: {
    changeConditions: "",
    allowQuantityChange: false,
    allowPriceChange: false,
    terminationConditions: "",
    securityReturnDays: 30,
  },
  status: "draft",
  createdAt: "",
  updatedAt: "",
});

// ─── Утилиты ───────────────────────────────────────────────────────────────

// Обязательные условия ст. 33
export const MANDATORY_TERMS = [
  { id: "subject", label: "Предмет контракта", article: "ст. 33 ч. 1 п. 1" },
  { id: "price", label: "Цена контракта", article: "ст. 33 ч. 1 п. 1, 4" },
  { id: "term", label: "Срок исполнения", article: "ст. 33 ч. 1 п. 1" },
  {
    id: "quality",
    label: "Качество и гарантия",
    article: "ст. 33 ч. 1 п. 2, 6",
  },
  {
    id: "security",
    label: "Обеспечение и неустойка",
    article: "ст. 34 ч. 5-7",
  },
  { id: "change", label: "Изменение и расторжение", article: "ст. 95 ч. 1" },
] as const;

// Проверка заполненности разделов
export const sectionCompletion = (project: ContractProject) => {
  const sections = [
    {
      id: "subject",
      complete: Boolean(
        project.subject.objectName && project.subject.description,
      ),
    },
    {
      id: "price",
      complete: Boolean(
        project.price.initialMaxPrice && project.price.priceBasis,
      ),
    },
    {
      id: "term",
      complete: Boolean(project.term.startDate && project.term.endDate),
    },
    {
      id: "quality",
      complete: Boolean(project.quality.qualityRequirements),
    },
    {
      id: "security",
      complete: project.security.performanceSecurityRequired
        ? Boolean(project.security.performanceSecurityPercent)
        : true,
    },
    {
      id: "change",
      complete: Boolean(project.change.changeConditions),
    },
  ];

  const completed = sections.filter((s) => s.complete).length;
  const percent = Math.round((completed / sections.length) * 100);

  return { sections, completed, total: sections.length, percent };
};

// Рекомендации по срокам ст. 51 ч. 4
export const conclusionDeadline = (protocolDate: string): string | null => {
  if (!protocolDate) return null;
  const date = new Date(protocolDate);
  date.setDate(date.getDate() + 10);
  return date.toISOString().slice(0, 10);
};
