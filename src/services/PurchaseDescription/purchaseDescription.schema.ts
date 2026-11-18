import { z } from "zod";

/**
 * Описание объекта закупки, подготовленное инициатором закупки
 * (Tasks 8, п. 4 — роль «не участник КС»).
 *
 * Роль нужна, потому что описание объекта закупки составляет не контрактная
 * служба, а подразделение-заказчик: оно знает, что именно ему нужно, и лучше
 * сделает это в структурированной форме, чем на листе А4 или в Excel.
 * Инициатор видит только свои черновики и свои документы; готовое описание он
 * направляет в контрактную службу, где появляется задача «проверить описание
 * и поставить позицию в план-график». Дальше процесс идёт без него.
 *
 * Структура описания опирается на две нормы:
 * - ПП РФ от 08.02.2017 N 145 — структурированное описание объекта закупки
 *   (наименование, ОКПД2, потребительские/качественные/функциональные
 *   характеристики, иные требования);
 * - ПП РФ от 02.09.2015 N 926 — типовые требования к отдельным видам ТРУ,
 *   которые инициатор указывает в описании (п. 7).
 *
 * Смета (дефектовка) ведётся здесь же позициями: наименование, единица
 * измерения, количество, цена за единицу. Отдельной сущности сметы нет —
 * так же, как бюджетная смета в служебной записке заводится строкой.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

const requiredId = (message: string) =>
  z
    .union([z.string(), z.number()])
    .refine(
      (value) => value !== "" && value !== null && value !== undefined,
      message,
    );

// Пустая строка из формы приравнивается к «не заполнено»
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

// Деньги и количество — строки, как и во всех остальных схемах проекта:
// json-server не знает типов, а форма отдаёт то, что ввёл человек
const optionalMoney = () =>
  z
    .string()
    .refine(
      (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
      "Укажите сумму числом с точностью до копеек",
    )
    .optional();

const optionalQuantity = () =>
  z
    .string()
    .refine(
      (value) => value === "" || /^\d+(\.\d{1,3})?$/.test(value),
      "Укажите количество числом (до трёх знаков после запятой)",
    )
    .optional();

const today = (): string => new Date().toISOString().slice(0, 10);

// Роль в системе, которую получает работник вне контрактной службы
export const PURCHASE_INITIATOR_ROLE = "Инициатор закупки";

export const PURCHASE_INITIATOR_ROLE_HINT =
  "Работник подразделения-заказчика, не входящий в контрактную службу: " +
  "готовит описание объекта закупки, смету (дефектовку) и направляет их в КС";

export const PurchaseDescriptionStatusSchema = z.enum([
  "draft",
  "submitted",
  "accepted",
  "returned",
]);

export type PurchaseDescriptionStatus = z.infer<
  typeof PurchaseDescriptionStatusSchema
>;

export const purchaseDescriptionStatusLabels: Record<
  PurchaseDescriptionStatus,
  string
> = {
  draft: "Черновик",
  submitted: "Направлено в КС",
  accepted: "Принято в работу",
  returned: "Возвращено на доработку",
};

// Строка сметы (дефектовки): инициатор считает объём и стоимость сам
export const PurchaseDescriptionItemSchema = z.object({
  id: idSchema(),
  name: z.string().trim().min(1, "Укажите наименование позиции"),
  unit: z.string().optional(),
  quantity: optionalQuantity(),
  unitPrice: optionalMoney(),
});

export type PurchaseDescriptionItem = z.infer<
  typeof PurchaseDescriptionItemSchema
>;

export const PurchaseDescriptionSchema = z.object({
  id: idSchema(),

  // Описание принадлежит организации-заказчику и конкретному работнику —
  // инициатору. Чужие описания инициатору недоступны.
  organizationId: requiredId(
    "Описание должно быть привязано к организации заказчика",
  ),
  authorEmployeeId: requiredId(
    "Описание должно быть привязано к работнику-инициатору",
  ),
  authorName: optionalText(5, "Укажите ФИО инициатора"),
  // Подразделение-заказчик сохраняется снимком: кадровые перестановки не
  // должны переписывать уже направленное описание
  structuralUnitId: idSchema(),
  structuralUnitName: optionalText(2, "Укажите подразделение инициатора"),

  // === Объект закупки (ПП РФ от 08.02.2017 N 145) ===
  title: z.string().trim().min(5, "Укажите наименование объекта закупки"),
  okpd2Code: z.string().optional(),
  okpd2Name: z.string().optional(),
  // Требования к ТРУ: потребительские свойства, качественные и
  // функциональные характеристики, экологические и иные требования (п. 7
  // ПП РФ N 926 — типовые требования для нормируемых кодов)
  requirements: z.string().optional(),
  // Обоснование потребности: зачем заказчику эта закупка
  justification: z.string().optional(),

  // === Смета / дефектовка ===
  items: z.array(PurchaseDescriptionItemSchema).default([]),

  // === Движение документа ===
  status: PurchaseDescriptionStatusSchema.default("draft"),
  submittedAt: isoDate(),
  // Итог рассмотрения в КС (когда позиция попала в план-график либо
  // описание вернули на доработку)
  reviewedAt: isoDate(),
  reviewComment: z.string().optional(),
  // Задача в КС, созданная при направлении описания
  taskId: idSchema(),
  // Позиция плана-графика, в которую КС поставила закупку (заполняется позже)
  purchasePlanId: idSchema(),
  positionId: idSchema(),

  createdAt: isoDate(),
  updatedAt: isoDate(),
});

export type PurchaseDescription = z.infer<typeof PurchaseDescriptionSchema>;
export type PurchaseDescriptionInput = z.input<typeof PurchaseDescriptionSchema>;

export const PurchaseDescriptionListSchema = z.array(
  PurchaseDescriptionSchema,
);

// Срок рассмотрения описания в контрактной службе
export const PURCHASE_DESCRIPTION_REVIEW_DAYS = 5;

// Сумма по строке сметы: количество × цена за единицу
export const parseAmount = (value: string | undefined): number => {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
};

export const purchaseDescriptionItemAmount = (
  item: PurchaseDescriptionItem,
): number =>
  Math.round(parseAmount(item.quantity) * parseAmount(item.unitPrice) * 100) /
  100;

export const purchaseDescriptionTotal = (
  description: Pick<PurchaseDescription, "items">,
): number =>
  Math.round(
    description.items.reduce(
      (total, item) => total + purchaseDescriptionItemAmount(item),
      0,
    ) * 100,
  ) / 100;

// Править можно только черновик и возвращённое описание: направленное
// в КС и принятое в работу — это уже документ
export const isPurchaseDescriptionEditable = (
  description: Pick<PurchaseDescription, "status">,
): boolean =>
  description.status === "draft" || description.status === "returned";

// Инициатор видит только свои описания (Tasks 8, п. 4)
export const purchaseDescriptionsOfEmployee = (
  descriptions: PurchaseDescription[],
  employeeId: string | number | undefined,
): PurchaseDescription[] =>
  employeeId === undefined || employeeId === ""
    ? []
    : descriptions.filter(
        (description) =>
          String(description.authorEmployeeId) === String(employeeId),
      );

// Свежие сверху: работа идёт с последним документом
export const sortPurchaseDescriptions = (
  descriptions: PurchaseDescription[],
): PurchaseDescription[] =>
  [...descriptions].sort((first, second) =>
    String(second.createdAt ?? "").localeCompare(String(first.createdAt ?? "")),
  );

// Дата через N календарных дней — срок рассмотрения задачи в КС
export const addDays = (isoDateValue: string, days: number): string => {
  const date = new Date(`${isoDateValue}T00:00:00`);

  if (isNaN(date.getTime())) {
    return isoDateValue;
  }

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
};

export interface PurchaseDescriptionAuthor {
  employeeId?: string | number;
  employeeName?: string;
  structuralUnitId?: string | number;
  structuralUnitName?: string;
}

export const emptyPurchaseDescription = (
  organizationId: string | number = "",
  author: PurchaseDescriptionAuthor = {},
): PurchaseDescription => ({
  organizationId,
  authorEmployeeId: author.employeeId ?? "",
  authorName: author.employeeName ?? "",
  structuralUnitId: author.structuralUnitId,
  structuralUnitName: author.structuralUnitName ?? "",
  title: "",
  okpd2Code: "",
  okpd2Name: "",
  requirements: "",
  justification: "",
  items: [],
  status: "draft",
  submittedAt: "",
  reviewComment: "",
  createdAt: today(),
  updatedAt: today(),
});
