import { z } from "zod";
import { OrganizationCustomerSchema } from "../Organization/organization.schema";
import { NmckCalculationRecordSchema } from "../Nmck/nmck.schema";

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
  amountTotal: moneySchema("Укажите объём финансового обеспечения по КБК"),
  amountCurrentYear: moneySchema(),
  amountPlanPeriodFirstYear: moneySchema(),
  amountPlanPeriodSecondYear: moneySchema(),
  amountSubsequentYears: moneySchema(),
});

export type PurchasePlanKbkEntry = z.infer<typeof PurchasePlanKbkEntrySchema>;

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
      "Уникальный номер позиции — номер плана-графика и шестизначный номер записи",
    ),
    // Номер закупки, включенной в план-график закупок: четырёхзначный,
    // следующий по порядку среди записей плана
    purchaseNumber: optionalPattern(
      /^\d{1,4}$/,
      "Номер закупки, включенной в план-график, — до четырёх цифр",
    ),
    identificationCode: optionalPattern(
      /^[0-9A-ZА-Я]{20,36}$/,
      "ИКЗ формируется по правилам формирования идентификационного кода закупки: 20-36 символов без пробелов и разделителей",
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

    // Сведения расчёта НМЦК (ст. 22 44-ФЗ, Приказ МЭР № 567)
    quantity: z.union([z.string(), z.number()]).optional(),
    unit: z.string().optional(),
    nmck: moneySchema("Укажите НМЦК числом, например 1250000.50"),
    nmckCalculation: NmckCalculationRecordSchema.optional(),
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
    planNumber: z
      .string()
      .min(4, "Укажите номер плана-графика, например 202603770123450001"),
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

// Уникальный номер позиции плана-графика: номер плана-графика и шестизначный
// порядковый номер записи. Номер выдаёт система, заказчиком не заполняется
export const buildPositionUniqueNumber = (
  planNumber: string | number | undefined,
  serialNumber: string | number | undefined,
): string => {
  const planDigits = String(planNumber ?? "").replace(/\D/g, "");
  const order = toNumber(serialNumber);

  if (!planDigits || order === null) {
    return "";
  }

  return `${planDigits}${String(Math.trunc(order)).padStart(6, "0")}`;
};

/**
 * ИКЗ формируется автоматически, состав — как в просмотре позиции
 * плана-графика: 2 разряда года планирования, 15 разрядов кода заказчика
 * (ИНН и КПП), 4 разряда номера закупки, 3 разряда кода позиции плана-графика
 * и 3 разряда кода вида расходов из КБК. Пока не из чего собрать хотя бы одну
 * часть, код не формируется — его заполняют вручную.
 */
export const buildIdentificationCode = ({
  planYear,
  inn,
  kpp,
  purchaseNumber,
  serialNumber,
  kbk,
}: {
  planYear: string | number | undefined;
  inn: string | undefined;
  kpp: string | undefined;
  purchaseNumber: string | number | undefined;
  serialNumber: string | number | undefined;
  kbk: string | undefined;
}): string => {
  const year = toNumber(planYear);
  const customerDigits = `${String(inn ?? "").replace(/\D/g, "")}${String(
    kpp ?? "",
  ).replace(/\D/g, "")}`;
  const purchase = toNumber(purchaseNumber);
  const order = toNumber(serialNumber);
  // Разряды вида расходов в кодовой записи бюджета (группа и подгруппа)
  const expenditureKind = String(kbk ?? "")
    .replace(/\D/g, "")
    .slice(12, 15);

  if (
    year === null ||
    customerDigits.length < 10 ||
    purchase === null ||
    order === null ||
    expenditureKind.length !== 3
  ) {
    return "";
  }

  return [
    String(year % 100).padStart(2, "0"),
    customerDigits.slice(0, 15).padEnd(15, "0"),
    String(purchase).padStart(4, "0"),
    String(order).padStart(3, "0"),
    expenditureKind,
  ].join("");
};

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
  purchaseNumber: "",
  identificationCode: "",
  objectOfPurchase: "",
  plannedPlacementYear: "",
  amountTotal: "",
  amountCurrentYear: "",
  amountPlanPeriodFirstYear: "",
  amountPlanPeriodSecondYear: "",
  amountSubsequentYears: "",
  isPublicDiscussionRequired: false,
  authorizedBodyName: "",
  jointOrganizerName: "",
  okpd2Code: "",
  okpd2Name: "",
  objectName: "",
  kbk: "",
  kbkEntries: [],
  status: "planned",
  statusDate: "",
  quantity: "",
  unit: "",
  nmck: "",
  nmckCalculation: undefined,
});

export const emptyPurchasePlan = (): PurchasePlan => ({
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
  },
  planYear: String(new Date().getFullYear()),
  status: "draft",
  versionNumber: "1",
  approvalDate: "",
  approvalAuthor: "",
  publishDate: "",
  eisUrl: "",
  totalAmount: "",
  remarks: "",
  positions: [],
});
