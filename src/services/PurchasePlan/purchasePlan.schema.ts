import { z } from "zod";
import { OrganizationCustomerSchema } from "../Organization/organization.schema";

/**
 * План-график закупок по 44-ФЗ.
 *
 * Состав сведений повторяет структуру плана-графика (распоряжение Правительства
 * РФ N 2344-р, приказ МЭР/Минфина России 145/206н): период планирования, статус
 * и перечень записей, в каждой из которых указываются номер, ИКЗ, объект
 * закупки, планируемый год размещения извещения, объём финансового обеспечения
 * по годам планирования, обязательное общественное обсуждение, уполномоченный
 * орган, организатор совместной закупки, ОКПД2 и наименование объекта.
 *
 * Сведения уровня извещения (НМЦК, КТРУ, количество и единица измерения, даты
 * исполнения контракта, способ определения поставщика, СМП/СОНКО, субподряд и
 * аванс) на планировании не заполняются: они появляются позже — в служебной
 * записке либо на этапе формирования бюджета.
 *
 * Реквизиты заказчика в плане-графике не заполняются: они берутся из
 * организации, к которой привязан вошедший пользователь.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

// Денежные и количественные поля приходят из текстовых input строкой,
// поэтому храним string | number, а к числу приводим только при валидации.
export const toNumber = (
  value: string | number | undefined | null,
): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const sumOf = (...values: (string | number | undefined)[]): number =>
  values.reduce<number>((total, value) => total + (toNumber(value) ?? 0), 0);

const moneySchema = (message = "Укажите сумму числом, например 1250000.50") =>
  z
    .union([z.string(), z.number()])
    .refine((value) => toNumber(value) === null || Number(value) >= 0, message)
    .optional();

// Пустая строка из формы приравнивается к «не заполнено», поэтому поля,
// необязательные по 44-ФЗ, проходят валидацию и с "" и с undefined.
const optionalText = (minLength: number, message: string) =>
  z
    .string()
    .refine((value) => value === "" || value.length >= minLength, message)
    .optional();

const optionalPattern = (pattern: RegExp, message: string) =>
  z
    .string()
    .refine((value) => value === "" || pattern.test(value), message)
    .optional();

const optionalDate = (message: string) =>
  optionalPattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, message);

// Статусы плана-графика в ЕИС: проект -> размещен -> изменен/удален
export const PurchasePlanStatusSchema = z.enum([
  "draft",
  "published",
  "changed",
  "removed",
]);

export type PurchasePlanStatus = z.infer<typeof PurchasePlanStatusSchema>;

// Способы определения поставщика (подрядчика, исполнителя), ст. 32 44-ФЗ,
// на планировании не выбираются — относятся к этапу извещения

// Заказчик плана-графика — организация из учётной записи пользователя
// (см. services/Organization). В план-график попадает как снимок реквизитов,
// поэтому в форме планирования эти поля не редактируются.
export const PurchasePlanCustomerSchema = OrganizationCustomerSchema;

export type PurchasePlanCustomer = z.infer<typeof PurchasePlanCustomerSchema>;

// Разбивка объёма финансового обеспечения по графам формы ПГ
// (приказ МЭР/Минфина России 145/206н): всего, текущий финансовый год,
// плановый период (первый и второй год), последующие годы.
export const positionFinanceParts = (position: {
  amountCurrentYear?: string | number;
  amountPlanPeriodFirstYear?: string | number;
  amountPlanPeriodSecondYear?: string | number;
  amountSubsequentYears?: string | number;
}) => [
  position.amountCurrentYear,
  position.amountPlanPeriodFirstYear,
  position.amountPlanPeriodSecondYear,
  position.amountSubsequentYears,
];

// Статус записи плана-графика: как в просмотре плана-графика закупок — позиция
// запланирована, размещена (план-график прошёл контроль и опубликован),
// изменена или исключена из плана
export const PurchasePlanPositionStatusSchema = z.enum([
  "planned",
  "placed",
  "changed",
  "cancelled",
]);

export type PurchasePlanPositionStatus = z.infer<
  typeof PurchasePlanPositionStatusSchema
>;

// Разбивка объёма финансового обеспечения записи по кодам бюджетной
// классификации (в просмотре плана-графика — «Детализация по кодам бюджетной
// классификации»): у одной закупки их может быть несколько
export const PurchasePlanKbkEntrySchema = z.object({
  kbk: optionalPattern(
    /^\d{20}$/,
    "КБК состоит из 20 цифр (разряды кода соединяются без пробелов)",
  ),
  // Разбивка КБК на разряды для формы: глава (3), раздел/подраздел (4),
  // целевая статья (10), вид расходов (3). Итоговый код остаётся в kbk.
  chapter: optionalPattern(/^\d{3}$/, "Глава КБК состоит из 3 цифр"),
  section: optionalPattern(/^\d{4}$/, "Раздел и подраздел КБК — 4 цифры"),
  targetArticle: optionalPattern(
    /^[0-9A-ZА-Я]{10}$/,
    "Целевая статья КБК — 10 символов",
  ),
  expenseType: optionalPattern(/^\d{3}$/, "Вид расходов КБК — 3 цифры"),
  amountTotal: moneySchema("Укажите объём финансового обеспечения по КБК"),
  amountCurrentYear: moneySchema(),
  amountPlanPeriodFirstYear: moneySchema(),
  amountPlanPeriodSecondYear: moneySchema(),
  amountSubsequentYears: moneySchema(),
});

export type PurchasePlanKbkEntry = z.infer<typeof PurchasePlanKbkEntrySchema>;

// Детализация объёма финансового обеспечения по КВР (tenderPlan2020KVRInfoType)
export const PurchasePlanKvrEntrySchema = z.object({
  kvr: optionalPattern(/^\d{3}$/, "КВР состоит из 3 цифр"),
  amountTotal: moneySchema("Укажите объём финансового обеспечения по КВР"),
  amountCurrentYear: moneySchema(),
  amountPlanPeriodFirstYear: moneySchema(),
  amountPlanPeriodSecondYear: moneySchema(),
  amountSubsequentYears: moneySchema(),
});

export type PurchasePlanKvrEntry = z.infer<typeof PurchasePlanKvrEntrySchema>;

// Детализация по кодам ОКС/ОНИ (КОКС, tenderPlan2020KOKSInfoType)
export const PurchasePlanKoksEntrySchema = z.object({
  koksCode: z.string().min(1, "Укажите код КОКС"),
  koksName: z.string().optional(),
  amountTotal: moneySchema("Укажите сумму по объекту КОКС"),
  amountCurrentYear: moneySchema(),
  amountPlanPeriodFirstYear: moneySchema(),
  amountPlanPeriodSecondYear: moneySchema(),
  amountSubsequentYears: moneySchema(),
});

export type PurchasePlanKoksEntry = z.infer<typeof PurchasePlanKoksEntrySchema>;

// Особые закупки плана-графика (tenderPlan2020SpecialPurchasePositionType,
// IntegrationTPTypes.xsd): в ЕИС 17.0 особые закупки передаются блоком
// specialPurchasePositions. Устаревший блок specialPurchases игнорируется.
export const PurchasePlanSpecialPurchaseSchema = z.object({
  id: idSchema(),
  typeCode: z.string().min(1, "Укажите код особой закупки"),
  typeName: z.string().optional(),
  ikz: optionalPattern(/^\d{36}$/, "ИКЗ особой закупки состоит из 36 цифр"),
  iku: optionalPattern(
    /^\d{20}$/,
    "ИКУ организации-владельца версии плана-графика состоит из 20 цифр",
  ),
  // Реестровый номер позиции особой закупки в плане-графике
  positionNumber: optionalPattern(
    /^\d{1,6}$/,
    "Реестровый номер позиции особой закупки — до 6 цифр",
  ),
  extNumber: optionalText(1, "Укажите внешний номер позиции"),
  kvr: optionalPattern(/^\d{3}$/, "КВР состоит из 3 цифр"),
  kbk: optionalPattern(
    /^\d{20}$/,
    "КБК состоит из 20 цифр (разряды кода соединяются без пробелов)",
  ),
  koksCode: z.string().optional(),
  publishYear: z.union([z.string(), z.number()]).optional(),
  purchaseNumber: optionalPattern(/^\d{1,4}$/, "До 4 цифр"),
  modificationStatus: z.enum(["N", "E"]).optional(),
  amountTotal: moneySchema(),
  amountCurrentYear: moneySchema(),
  amountPlanPeriodFirstYear: moneySchema(),
  amountPlanPeriodSecondYear: moneySchema(),
  amountSubsequentYears: moneySchema(),
});

export type PurchasePlanSpecialPurchase = z.infer<
  typeof PurchasePlanSpecialPurchaseSchema
>;

// Новая позиция особой закупки: год размещения по умолчанию — год ПГ,
// суммы пустые — заполняются заказчиком
export const emptyPurchasePlanSpecialPurchase = (
  planYear: string | number,
): PurchasePlanSpecialPurchase => ({
  id: `special-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  typeCode: "",
  typeName: "",
  ikz: "",
  iku: "",
  positionNumber: "",
  extNumber: "",
  kvr: "",
  kbk: "",
  koksCode: "",
  publishYear: String(planYear),
  purchaseNumber: "",
  modificationStatus: "N",
  amountTotal: "",
  amountCurrentYear: "",
  amountPlanPeriodFirstYear: "",
  amountPlanPeriodSecondYear: "",
  amountSubsequentYears: "",
});

export const PurchasePlanOkpd2ItemSchema = z.object({
  okpd2Code: z.string(),
  okpd2Name: z.string().optional(),
});

export type PurchasePlanOkpd2Item = z.infer<typeof PurchasePlanOkpd2ItemSchema>;

// Запись плана-графика: набор граф повторяет форму ПГ из ЛК заказчика ЕИС —
// № п/п, ИКЗ, объект закупки, планируемый год размещения извещения, объём
// финансового обеспечения по годам, обязательное общественное обсуждение,
// уполномоченный орган, организатор совместной закупки, ОКПД2 (код и
// наименование), наименование объекта закупки.
export const PurchasePlanPositionSchema = z
  .object({
    id: idSchema(),
    serialNumber: z
      .union([z.string(), z.number()])
      .refine(
        (value) => toNumber(value) === null || Number(value) >= 1,
        "Номер позиции должен быть натуральным числом",
      )
      .optional(),
    // Уникальный номер позиции плана-графика закупок: номер плана-графика и
    // шестизначный порядковый номер записи (в просмотре ПГ —
    // «202601442000018001000127»). Формируется системой, а не заказчиком
    uniqueNumber: optionalPattern(
      /^\d{6,30}$/,
      "Уникальный номер позиции — 24 цифры: 18 цифр реестрового номера плана-графика и 6 цифр номера позиции",
    ),
    // Номер закупки, включенной в план-график закупок: четырёхзначный,
    // следующий по порядку среди записей плана. Больше 9999 быть не может:
    // в ИКЗ под номер закупки отведено ровно 4 разряда
    purchaseNumber: optionalPattern(
      /^\d{1,4}$/,
      "Номер закупки — не более 9999 (до четырёх цифр)",
    ),
    // Состав разрядов ИКЗ задаёт Порядок, утв. приказом Минфина России
    // от 10.04.2019 № 55н; XSD ЕИС 17.0 закрепляет только формат
    identificationCode: optionalPattern(
      /^[0-9A-ZА-Я]{20,36}$/,
      "ИКЗ формируется по Порядку, утверждённому приказом Минфина России от 10.04.2019 № 55н: 20-36 символов без пробелов и разделителей",
    ),
    objectOfPurchase: z
      .string()
      .min(5, "Укажите объект закупки (наименование товара, работы, услуги)"),
    plannedPlacementYear: z
      .union([z.string(), z.number()])
      .refine((value) => {
        if (value === "") {
          return true;
        }

        const year = Number(value);

        return Number.isInteger(year) && year >= 2014 && year <= 2100;
      }, "Планируемый год размещения извещения должен быть в диапазоне 2014-2100")
      .optional(),
    amountTotal: moneySchema("Укажите объём финансового обеспечения всего"),
    amountCurrentYear: moneySchema(
      "Укажите объём финансового обеспечения на текущий финансовый год",
    ),
    amountPlanPeriodFirstYear: moneySchema(
      "Укажите объём финансового обеспечения на первый год планового периода",
    ),
    amountPlanPeriodSecondYear: moneySchema(
      "Укажите объём финансового обеспечения на второй год планового периода",
    ),
    amountSubsequentYears: moneySchema(
      "Укажите объём финансового обеспечения на последующие годы",
    ),
    isPublicDiscussionRequired: z.boolean().optional(),
    // Чекбоксы-переключатели блоков уполномоченного органа и организатора
    // совместной закупки: храним отдельно, чтобы использовать в выборках.
    hasAuthorizedBody: z.boolean().optional(),
    hasJointOrganizer: z.boolean().optional(),
    authorizedBodyName: optionalText(
      2,
      "Укажите наименование уполномоченного органа (учреждения)",
    ),
    jointOrganizerName: optionalText(
      2,
      "Укажите наименование организатора совместного конкурса или аукциона",
    ),
    okpd2Code: optionalPattern(
      /^\d{2}(\.\d{1,6}){1,4}(-\d{1,7})?$/,
      "Не верный код ОКПД2 (ожидается вид 32.50.13.190)",
    ),
    okpd2Name: optionalText(
      2,
      "Укажите наименование объекта по ОКПД2 (товар, работа, услуга)",
    ),
    objectName: optionalText(
      5,
      "Укажите наименование объекта закупки (по КТРУ или в свободной форме)",
    ),

    // Код бюджетной классификации: 20 цифр. Нужен для группировки записей ПГ
    // и поиска по расходам — в форме ПГ это отдельная графа. Основной код
    // записи, когда кодов несколько они перечислены в kbkEntries
    kbk: optionalPattern(
      /^\d{20}$/,
      "КБК состоит из 20 цифр (разряды кода соединяются без пробелов)",
    ),
    kbkEntries: z.array(PurchasePlanKbkEntrySchema).optional(),

    // Статус записи плана-графика и дата, когда позиция размещена (план-график
    // прошёл контроль), — графа «Статус» в просмотре плана-графика
    status: PurchasePlanPositionStatusSchema.optional(),
    statusDate: optionalDate(
      "Неверный формат даты размещения записи (ожидается ГГГГ-ММ-ДД)",
    ),

    // Поля ЕИС 17.0 (IntegrationTPTypes.xsd :: tenderPlan2020PositionType)
    extNumber: optionalText(1, "Укажите внешний номер позиции"),
    iku: optionalPattern(
      /^\d{20}$/,
      "ИКУ организации-владельца состоит из 20 цифр",
    ),
    purchaseOrderNumber: optionalPattern(
      /^\d{1,3}$/,
      "Порядковый номер закупки в ИКЗ состоит из 3 цифр (в ПГ обычно 000)",
    ),
    kvr: optionalPattern(
      /^\d{3}$/,
      "Код вида расходов (КВР) состоит из 3 цифр",
    ),
    ktruCode: optionalText(4, "Укажите код позиции по КТРУ"),
    ktruName: optionalText(2, "Укажите наименование позиции по КТРУ"),
    hasMultipleOkpd2: z.boolean().optional(),
    okpd2Items: z.array(PurchasePlanOkpd2ItemSchema).optional(),
    isEnergyServiceContract: z.boolean().optional(),
    isProvisionLendingServices: z.boolean().optional(),
    isConstructionWorks: z.boolean().optional(),
    isNotFederalFinancing: z.boolean().optional(),
    notPublishedOnEIS: z.boolean().optional(),
    modificationStatus: z.enum(["N", "E"]).optional(),
    changeReasonCode: z.string().optional(),
    changeReasonName: z.string().optional(),
    modificationDecision: z
      .enum(["notSpecified", "purchaseChanged", "purchaseCanceled"])
      .optional(),
    modificationDescription: z.string().optional(),
    kvrEntries: z.array(PurchasePlanKvrEntrySchema).optional(),
    koksEntries: z.array(PurchasePlanKoksEntrySchema).optional(),
  })
  .refine(
    (position) =>
      toNumber(position.amountTotal) === null ||
      Math.abs(
        Number(position.amountTotal) - sumOf(...positionFinanceParts(position)),
      ) < 1e-6,
    {
      message:
        "Объём финансового обеспечения «всего» не совпадает с суммой планируемых платежей по годам",
      path: ["amountTotal"],
    },
  );

export type PurchasePlanPosition = z.infer<typeof PurchasePlanPositionSchema>;

export const PurchasePlanSchema = z
  .object({
    id: idSchema(),
    // План-график всегда принадлежит конкретной организации-заказчику
    // (organizations.id). Планы других заказчиков пользователю недоступны.
    organizationId: z
      .union([z.string(), z.number()])
      .refine(
        (value) => value !== "" && value !== null && value !== undefined,
        "План-график должен быть привязан к организации заказчика",
      ),
    // Реестровый номер плана-графика — 18 цифр: год формирования (4),
    // уникальный учётный номер заказчика в сводном реестре (11) и порядковый
    // номер плана-графика этого заказчика на указанный год (3)
    planNumber: z
      .string()
      .min(
        4,
        "Укажите номер плана-графика: 18 цифр — год (4), код заказчика по СПЗ (11), порядковый номер плана (3), например 202603770123450001",
      ),
    customer: PurchasePlanCustomerSchema,
    planYear: z.union([z.string(), z.number()]).refine((value) => {
      const year = Number(value);

      return Number.isInteger(year) && year >= 2014 && year <= 2100;
    }, "Год планирования должен быть в диапазоне 2014-2100"),
    status: PurchasePlanStatusSchema,
    versionNumber: z
      .union([z.string(), z.number()])
      .refine(
        (value) => toNumber(value) === null || Number(value) >= 1,
        "Номер версии должен быть натуральным числом",
      )
      .optional(),
    approvalDate: optionalDate(
      "Неверный формат даты утверждения плана-графика (ожидается ГГГГ-ММ-ДД)",
    ),
    approvalAuthor: optionalText(
      5,
      "Укажите должность и ФИО утвердившего план-график",
    ),
    publishDate: optionalDate(
      "Неверный формат даты размещения в ЕИС (ожидается ГГГГ-ММ-ДД)",
    ),
    eisUrl: optionalText(8, "Укажите ссылку на план-график в ЕИС"),
    totalAmount: moneySchema("Укажите совокупный объём закупок числом"),
    remarks: z.string().optional(),
    positions: z.array(PurchasePlanPositionSchema),

    // Метаданные версии и заголовка по ЕИС 17.0 (tenderPlan2020CommonInfoType)
    externalId: z.string().optional(),
    ownerRole: z.enum(["CU", "OA"]).optional(),
    pfhdType: z.enum(["IND", "CONS"]).optional(),
    planPeriodFirstYear: z.union([z.string(), z.number()]).optional(),
    planPeriodSecondYear: z.union([z.string(), z.number()]).optional(),
    directDate: optionalDate("Неверный формат даты направления на контроль"),
    createDate: optionalDate("Неверный формат даты создания"),
    firstVersionPublishDate: optionalDate(
      "Неверный формат даты публикации первой версии",
    ),
    specialPurchases: z.array(PurchasePlanSpecialPurchaseSchema).optional(),
  })
  .refine((plan) => plan.status === "draft" || plan.positions.length > 0, {
    message: "Размещаемый план-график должен содержать хотя бы одну запись",
    path: ["positions"],
  })
  .refine(
    (plan) =>
      !plan.approvalDate ||
      !plan.publishDate ||
      plan.approvalDate <= plan.publishDate,
    {
      message: "План-график не может быть размещён раньше даты утверждения",
      path: ["publishDate"],
    },
  )
  .refine((plan) => plan.status !== "published" || Boolean(plan.publishDate), {
    message: "Для статуса «Размещен в ЕИС» укажите дату размещения",
    path: ["publishDate"],
  })
  .refine(
    (plan) =>
      toNumber(plan.totalAmount) === null ||
      Math.abs(
        Number(plan.totalAmount) -
          plan.positions.reduce(
            (total, position) => total + (toNumber(position.amountTotal) ?? 0),
            0,
          ),
      ) < 1,
    {
      message:
        "Совокупный объём не совпадает с суммой объёмов финансового обеспечения по записям ПГ",
      path: ["totalAmount"],
    },
  );

export type PurchasePlan = z.infer<typeof PurchasePlanSchema>;

export const PurchasePlanListSchema = z.array(PurchasePlanSchema);

/**
 * Коды бюджетной классификации записи плана-графика. Несколько кодов заказчик
 * ведёт в kbkEntries («Детализация по кодам бюджетной классификации»), одиночный
 * КБК графы формы остаётся в kbk — здесь оба случая сводятся к списку.
 */
export const positionKbkEntries = (
  position: Pick<PurchasePlanPosition, "kbk" | "kbkEntries">,
): PurchasePlanKbkEntry[] => {
  const entries = (position.kbkEntries ?? []).filter((entry) => entry.kbk);

  return entries.length > 0
    ? entries
    : position.kbk
      ? [{ kbk: position.kbk }]
      : [];
};

export const positionKbkCodes = (
  position: Pick<PurchasePlanPosition, "kbk" | "kbkEntries">,
): string[] => positionKbkEntries(position).map((entry) => entry.kbk as string);

// Номер закупки, включенной в план-график: следующий по порядку среди записей
// плана, четырёхзначный — как в просмотре плана-графика
export const nextPurchaseNumber = (
  positions: Pick<PurchasePlanPosition, "purchaseNumber">[],
): string => {
  const used = positions
    .map((position) => toNumber(position.purchaseNumber))
    .filter((value): value is number => value !== null);
  const next = used.length > 0 ? Math.max(...used) + 1 : 1;

  return String(next).padStart(4, "0");
};

/**
 * Занятые номера закупок в плане: по ним селект не даёт выбрать повтор.
 * `exceptNumber` — номер самой редактируемой позиции: он не считается занятым.
 */
export const purchaseNumbersUsed = (
  positions: Pick<PurchasePlanPosition, "purchaseNumber">[],
  exceptNumber?: string | number,
): number[] => {
  const except = toNumber(exceptNumber);

  return positions
    .map((position) => toNumber(position.purchaseNumber))
    .filter((value): value is number => value !== null && value !== except);
};

/** Проверка, что номер закупки не повторяет уже занятые в плане. */
export const isPurchaseNumberTaken = (
  positions: Pick<PurchasePlanPosition, "purchaseNumber">[],
  number: string | number | undefined,
  exceptNumber?: string | number,
): boolean => {
  const value = toNumber(number);

  return (
    value !== null &&
    purchaseNumbersUsed(positions, exceptNumber).includes(value)
  );
};

// Разбивка КБК на разряды формы: глава 3, раздел/подраздел 4,
// целевая статья 10, вид расходов 3
export interface KbkParts {
  chapter: string;
  section: string;
  targetArticle: string;
  expenseType: string;
}

export const splitKbk = (kbk?: string): KbkParts => {
  const digits = String(kbk ?? "").replace(/[^0-9A-Za-zА-Яа-я]/g, "");

  return {
    chapter: digits.slice(0, 3),
    section: digits.slice(3, 7),
    targetArticle: digits.slice(7, 17),
    expenseType: digits.slice(17, 20),
  };
};

/** Сборка 20-значного КБК из разрядов; пустая строка, если разряды неполные. */
export const buildKbk = (parts: Partial<KbkParts>): string => {
  const chapter = String(parts.chapter ?? "").trim();
  const section = String(parts.section ?? "").trim();
  const targetArticle = String(parts.targetArticle ?? "").trim();
  const expenseType = String(parts.expenseType ?? "").trim();

  if (
    chapter.length !== 3 ||
    section.length !== 4 ||
    targetArticle.length !== 10 ||
    expenseType.length !== 3
  ) {
    return "";
  }

  return `${chapter}${section}${targetArticle}${expenseType}`;
};

// Реестровый номер плана-графика — 18 цифр: год формирования (4),
// уникальный учётный номер заказчика в сводном реестре (11) и порядковый
// номер плана-графика этого заказчика на указанный год (3)
export const PLAN_REGISTRY_NUMBER_LENGTH = 18;
// Уникальный номер позиции — 24 цифры: 18 цифр номера плана-графика и 6 цифр
// внутреннего номера позиции, который ЕИС присваивает при создании строки
// и не меняет при редактировании
export const POSITION_UNIQUE_NUMBER_LENGTH = 24;

export interface PlanRegistryNumberParts {
  year: string;
  customerCode: string;
  planOrder: string;
}

// Разбор 18-значного реестрового номера плана-графика; null — формат нарушен
export const splitPlanRegistryNumber = (
  planNumber: string | number | undefined,
): PlanRegistryNumberParts | null => {
  const digits = String(planNumber ?? "").replace(/\D/g, "");

  if (digits.length !== PLAN_REGISTRY_NUMBER_LENGTH) {
    return null;
  }

  return {
    year: digits.slice(0, 4),
    customerCode: digits.slice(4, 15),
    planOrder: digits.slice(15, 18),
  };
};

export const isPlanRegistryNumber = (
  planNumber: string | number | undefined,
): boolean => splitPlanRegistryNumber(planNumber) !== null;

/**
 * Уникальный номер позиции плана-графика: 18-значный реестровый номер самого
 * плана-графика и 6-значный внутренний номер позиции. Номер присваивает ЕИС
 * автоматически, заказчик его не заполняет и при редактировании он не меняется.
 */
export const buildPositionUniqueNumber = (
  planNumber: string | number | undefined,
  serialNumber: string | number | undefined,
): string => {
  const planDigits = String(planNumber ?? "").replace(/\D/g, "");
  const order = toNumber(serialNumber);

  if (!planDigits || order === null) {
    return "";
  }

  const orderDigits = String(Math.trunc(order)).padStart(6, "0").slice(-6);

  return `${planDigits}${orderDigits}`;
};

// Проверка формата уникального номера позиции: ровно 24 цифры
export const isPositionUniqueNumber = (
  value: string | number | undefined,
): boolean => /^\d{24}$/.test(String(value ?? ""));

/**
 * Нормативная основа ИКЗ: Порядок формирования идентификационного кода
 * закупки утверждён приказом Минфина России от 10.04.2019 № 55н. XSD ЕИС
 * 17.0 (`ikzCodeType`) закрепляет только формат ^\d{36}$, а состав и
 * разрядность частей кода задаёт именно 55н.
 */
export const IKZ_ORDER_REFERENCE =
  "приказом Минфина России от 10.04.2019 № 55н";

export interface IkzParts {
  /** Год размещения извещения — 2 последние цифры */
  year: string;
  /** Идентификационный код заказчика (ИКУ) — 20 цифр */
  customerCode: string;
  /** Номер закупки, включённой в план-график — 4 цифры */
  purchaseNumber: string;
  /** Порядковый номер закупки — 3 цифры */
  orderNumber: string;
  /** Код позиции ОКПД2 — 4 цифры («0000» при нескольких кодах) */
  okpd2: string;
  /** Код вида расходов — 3 цифры */
  kvr: string;
  /** Собранный ИКЗ (36 цифр) или "", если части неполные */
  code: string;
}

interface IkzSource {
  planYear: string | number | undefined;
  inn: string | undefined;
  kpp: string | undefined;
  iku?: string | undefined;
  orgKindDigit?: string | undefined;
  purchaseNumber: string | number | undefined;
  purchaseOrderNumber?: string | number | undefined;
  serialNumber: string | number | undefined;
  okpd2Code?: string | undefined;
  hasMultipleOkpd2?: boolean;
  kvr?: string | undefined;
  kbk: string | undefined;
}

/**
 * Разбор ИКЗ на разряды по приказу Минфина России от 10.04.2019 № 55н:
 * - 1..2   (2) : последние 2 цифры года планирования;
 * - 3..22  (20): ИКУ заказчика (ИНН 10/12 + КПП 9 + код вида организации '1');
 * - 23..26 (4) : номер закупки, включённой в план-график;
 * - 27..29 (3) : порядковый номер закупки ('000' или порядковый номер в группе);
 * - 30..33 (4) : первые 4 цифры кода ОКПД2 (или '0000' при нескольких ОКПД2);
 * - 34..36 (3) : КВР (явный 3-значный код или последние 3 цифры 20-значного КБК).
 *
 * Возвращает и части по отдельности (для таблицы ИКЗ в карточке позиции),
 * и собранный код.
 */
export const buildIkzParts = ({
  planYear,
  inn,
  kpp,
  iku,
  orgKindDigit = "1",
  purchaseNumber,
  purchaseOrderNumber,
  serialNumber,
  okpd2Code,
  hasMultipleOkpd2 = false,
  kvr,
  kbk,
}: IkzSource): IkzParts => {
  const year = toNumber(planYear);
  const ikuDigits = String(iku ?? "").replace(/\D/g, "");
  const innDigits = String(inn ?? "").replace(/\D/g, "");
  const kppDigits = String(kpp ?? "").replace(/\D/g, "");
  const kind =
    String(orgKindDigit ?? "1")
      .replace(/\D/g, "")
      .slice(0, 1) || "1";

  let customerCode20 = "";
  if (ikuDigits.length === 20) {
    customerCode20 = ikuDigits;
  } else if (innDigits.length >= 10) {
    const baseInn =
      innDigits.length === 10 ? innDigits : innDigits.slice(0, 12);
    const kppPart = kppDigits.padStart(9, "0").slice(0, 9);
    customerCode20 = `${baseInn}${kppPart}${kind}`.slice(0, 20).padEnd(20, "0");
  }

  const purchase = toNumber(purchaseNumber);
  const explicitOrder = toNumber(purchaseOrderNumber);
  const fallbackSerial = toNumber(serialNumber);
  const order = explicitOrder ?? fallbackSerial ?? 0;

  const kvrDigits = String(kvr ?? "").replace(/\D/g, "");
  const kbkDigits = String(kbk ?? "").replace(/\D/g, "");
  const expenditureKind =
    kvrDigits.length === 3
      ? kvrDigits
      : kbkDigits.length >= 3
        ? kbkDigits.slice(-3)
        : "";

  const okpdDigits = hasMultipleOkpd2
    ? "0000"
    : String(okpd2Code ?? "")
        .replace(/\D/g, "")
        .slice(0, 4)
        .padEnd(4, "0");

  const yearPart = year === null ? "" : String(year % 100).padStart(2, "0");
  const purchasePart =
    purchase === null
      ? ""
      : String(Math.trunc(purchase)).padStart(4, "0").slice(-4);
  const orderPart = String(Math.trunc(order)).padStart(3, "0").slice(-3);

  const complete =
    yearPart.length === 2 &&
    customerCode20.length === 20 &&
    purchasePart.length === 4 &&
    expenditureKind.length === 3;

  return {
    year: yearPart,
    customerCode: customerCode20,
    purchaseNumber: purchasePart,
    orderNumber: orderPart,
    okpd2: okpdDigits,
    kvr: expenditureKind,
    code: complete
      ? [
          yearPart,
          customerCode20,
          purchasePart,
          orderPart,
          okpdDigits,
          expenditureKind,
        ].join("")
      : "",
  };
};

/**
 * Формирование 36-значного ИКЗ по приказу Минфина России от 10.04.2019 № 55н
 * и в соответствии с XSD ЕИС 17.0 (`ikzCodeType`: ^\d{36}$).
 */
export const buildIdentificationCode = ({
  planYear,
  inn,
  kpp,
  iku,
  orgKindDigit = "1",
  purchaseNumber,
  purchaseOrderNumber,
  serialNumber,
  okpd2Code,
  hasMultipleOkpd2 = false,
  kvr,
  kbk,
}: IkzSource): string =>
  buildIkzParts({
    planYear,
    inn,
    kpp,
    iku,
    orgKindDigit,
    purchaseNumber,
    purchaseOrderNumber,
    serialNumber,
    okpd2Code,
    hasMultipleOkpd2,
    kvr,
    kbk,
  }).code;

// json-server отдаёт organizationId числом, а из строки запроса он приходит
// строкой, поэтому принадлежность сравниваем как строки
export const isPlanOfOrganization = (
  plan: Pick<PurchasePlan, "organizationId">,
  organizationId: string | number | undefined,
): boolean =>
  organizationId !== undefined &&
  String(plan.organizationId) === String(organizationId);

// Пустые значения для useForm/useFieldArray: "" проходит необязательные поля
// схемы, поэтому новая форма стартует без ложных ошибок валидации.
export const emptyPurchasePlanPosition = (): PurchasePlanPosition => ({
  serialNumber: "",
  uniqueNumber: "",
  extNumber: "",
  purchaseNumber: "",
  purchaseOrderNumber: "000",
  iku: "",
  kvr: "",
  identificationCode: "",
  objectOfPurchase: "",
  plannedPlacementYear: "",
  amountTotal: "",
  amountCurrentYear: "",
  amountPlanPeriodFirstYear: "",
  amountPlanPeriodSecondYear: "",
  amountSubsequentYears: "",
  isPublicDiscussionRequired: false,
  hasAuthorizedBody: false,
  hasJointOrganizer: false,
  authorizedBodyName: "",
  jointOrganizerName: "",
  okpd2Code: "",
  okpd2Name: "",
  hasMultipleOkpd2: false,
  okpd2Items: [],
  ktruCode: "",
  ktruName: "",
  objectName: "",
  kbk: "",
  kbkEntries: [],
  kvrEntries: [],
  koksEntries: [],
  isEnergyServiceContract: false,
  isProvisionLendingServices: false,
  isConstructionWorks: false,
  isNotFederalFinancing: false,
  notPublishedOnEIS: false,
  status: "planned",
  statusDate: "",
  modificationStatus: "N",
  changeReasonCode: "",
  changeReasonName: "",
  modificationDecision: "notSpecified",
  modificationDescription: "",
});

export const emptyPurchasePlan = (): PurchasePlan => {
  const year = new Date().getFullYear();

  return {
    organizationId: "",
    planNumber: "",
    customer: {
      fullName: "",
      shortName: "",
      inn: "",
      kpp: "",
      ogrn: "",
      legalAddress: "",
      postalAddress: "",
      email: "",
      phone: "",
      responsiblePerson: "",
      responsiblePhone: "",
      regNum: "",
      consRegistryNum: "",
      okopf: "",
      okfs: "",
      oktmo: "",
      oktmoPpo: "",
    },
    planYear: String(year),
    planPeriodFirstYear: String(year + 1),
    planPeriodSecondYear: String(year + 2),
    status: "draft",
    ownerRole: "CU",
    pfhdType: "IND",
    versionNumber: "1",
    approvalDate: "",
    approvalAuthor: "",
    publishDate: "",
    directDate: "",
    createDate: new Date().toISOString().slice(0, 10),
    firstVersionPublishDate: "",
    externalId: "",
    eisUrl: "",
    totalAmount: "",
    remarks: "",
    positions: [],
    specialPurchases: [],
  };
};
