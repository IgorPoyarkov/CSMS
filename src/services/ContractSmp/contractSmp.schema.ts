import z from "zod";

/**
 * Сведения о привлечении СМП/СОНКО по контракту (Tasks 9, п. 6 и п. 7, п/п 4).
 *
 * Подрядчик, выигравший закупку с требованием о привлечении СМП (ч. 5 ст. 30
 * 44-ФЗ), обязан привлекать субподрядчиков из реестра МСП в объёме, указанном
 * в процентах от цены контракта (ч. 6 ст. 30), и нести за это
 * гражданско-правовую ответственность. Сейчас контрактная служба читает почту
 * и вбивает реквизиты каждого договора в карточку контракта в ЕИС руками.
 * Здесь эти сведения заводятся один раз: подрядчик присылает, система
 * считает сроки и объём, заказчик принимает и выгружает в ЕИС.
 *
 * Состав записи — то, что реально нужно реестру контрактов: реквизиты договора
 * с субподрядчиком, признак субъекта МСП, период и документы-основания.
 * При фиксированной цене акты и платёжки в ЕИС не вносятся, поэтому поля
 * приёмки и оплаты не обязательны, но хранятся для сверки — проверка спрашивает
 * именно их.
 *
 * Сроки подрядчика — константы типовых условий (см. pp1466.ts), срок заказчика
 * считается от `receivedAt`: без даты и времени получения срок неотсчитываем
 * и виноватым остаётся заказчик (ч. 3 ст. 103 44-ФЗ).
 */

// Тип документа, который присылает подрядчик по типовым условиям
export const CONTRACT_SMP_DOCUMENT_TYPES = [
  "subContract",
  "declaration",
  "acceptance",
  "payment",
] as const;

export type ContractSmpDocumentType =
  (typeof CONTRACT_SMP_DOCUMENT_TYPES)[number];

export const contractSmpDocumentTypeLabels: Record<
  ContractSmpDocumentType,
  string
> = {
  subContract: "Договор с субподрядчиком",
  declaration: "Декларация о принадлежности к СМП/СОНКО",
  acceptance: "Акт приёмки выполненных работ (оказанных услуг)",
  payment: "Платёжное поручение",
};

// Что заказчик сделал со сведениями
export const CONTRACT_SMP_STATUSES = [
  "submitted",
  "accepted",
  "rejected",
  "pushedToEis",
] as const;

export type ContractSmpStatus = (typeof CONTRACT_SMP_STATUSES)[number];

export const contractSmpStatusLabels: Record<ContractSmpStatus, string> = {
  submitted: "Поданы подрядчиком",
  accepted: "Приняты заказчиком",
  rejected: "Отклонены",
  pushedToEis: "Выгружены в ЕИС",
};

// Вид цены в сведениях реестра контрактов ЕИС: цена контракта или цена
// единицы товара (работы, услуги). Для договоров с субподрядчиком обычно
// указывается цена договора, но при неопределённом объёме — цена единицы.
export const CONTRACT_SMP_PRICE_TYPES = ["contract", "unit"] as const;

export type ContractSmpPriceType = (typeof CONTRACT_SMP_PRICE_TYPES)[number];

export const contractSmpPriceTypeLabels: Record<ContractSmpPriceType, string> =
  {
    contract: "Цена контракта (договора)",
    unit: "Цена единицы товара (работы, услуги)",
  };

const optionalText = (max = 300) =>
  z.string().max(max).optional().or(z.literal(""));

const optionalDate = () =>
  z
    .string()
    .refine(
      (v) =>
        v === "" || /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    )
    .optional();

// Дата с временем: момент получения сведений от подрядчика
const optionalDateTime = () =>
  z
    .string()
    .refine(
      (v) =>
        v === "" ||
        /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?$/.test(v),
      "Ожидается дата и время (ГГГГ-ММ-ДДЧЧ:ММ)",
    )
    .optional();

const requiredDateTime = (message: string) =>
  z
    .string()
    .min(1, message)
    .refine(
      (v) => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v),
      "Зафиксируйте дату и время получения сведений",
    );

const optionalMoney = () =>
  z
    .string()
    .refine(
      (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
      "Укажите сумму числом с точностью до копеек",
    )
    .optional();

const inn = () =>
  z
    .string()
    .refine(
      (v) => v === "" || /^\d{10}(\d{2})?$/.test(v),
      "ИНН — 10 или 12 цифр",
    )
    .optional();

export const ContractSmpRecordSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  contractId: z.union([z.string(), z.number()]),

  // Тип документа и его реквизиты
  documentType: z.enum(CONTRACT_SMP_DOCUMENT_TYPES),
  documentNumber: z.string().trim().min(1, "Укажите номер документа"),
  documentDate: z
    .string()
    .min(1, "Укажите дату документа")
    .refine(
      (v) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    ),
  amount: optionalMoney(),
  // Код ОКПД2 предмета договора — поле реестра контрактов ЕИС
  okpd2Code: z
    .string()
    .refine(
      (v) => v === "" || /^\d{2}(\.\d+)*$/.test(v),
      "ОКПД2: цифры и точки, например 43.31.10",
    )
    .optional(),
  // Вид цены контракта для карточки реестра
  priceType: z.enum(CONTRACT_SMP_PRICE_TYPES).default("contract"),
  // Цена за единицу, если выбран вид цены «цена единицы»
  unitPrice: optionalMoney(),
  subject: optionalText(500),
  // Период, к которому относятся сведения (например «2026-07» или квартал)
  period: optionalText(100),

  // Субподрядчик (соисполнитель)
  supplierName: z.string().trim().min(3, "Укажите субподрядчика"),
  supplierInn: inn(),
  supplierKpp: z
    .string()
    .refine((v) => v === "" || /^\d{9}$/.test(v), "КПП — 9 цифр")
    .optional(),
  // Право на преференцию: запись в реестре МСП или реестре социальных
  // предпринимателей. Только такие договоры закрывают объём привлечения
  isSmpSubject: z.boolean().default(true),

  // Документ, к которому относится это приложение (акт/платёжка к договору)
  subContractRecordId: z.union([z.string(), z.number()]).optional(),

  // п. 3 типовых условий: субподрядчик заменён на этапе исполнения
  isReplacementSubContract: z.boolean().default(false),
  // п. 4: обязательство перед субподрядчиком оплачено раньше срока,
  // предусмотренного контрактом с заказчиком — срок по другим правилам
  paidEarlierThanContractSchedule: z.boolean().default(false),
  // Дата оплаты подрядчиком обязательств перед субподрядчиком (п. 4, п. 5)
  paidToSupplierDate: optionalDate(),
  // Дата подписания подрядчиком документа о приёмке (основание для п. 5)
  acceptanceSignedDate: optionalDate(),

  // Момент получения сведений от подрядчика — от него считается срок заказчика
  receivedAt: requiredDateTime(
    "Укажите, когда получены сведения от подрядчика",
  ),

  // Метаданные файла-источника: сам файл обрабатывается в браузере и не
  // загружается, храним только название, чтобы сверить поля с документом
  sourceFileName: optionalText(255),

  // Два подтверждения достоверности: подрядчик при отправке и заказчик при
  // приёмке (п. 6 типовых условий — ответственность за недостоверные сведения)
  supplierConfirmedAt: optionalDateTime(),
  supplierConfirmedBy: optionalText(150),
  supplierConfirmedDocument: optionalText(200),
  customerConfirmedAt: optionalDateTime(),
  customerConfirmedBy: optionalText(150),
  customerConfirmedDocument: optionalText(200),

  status: z.enum(CONTRACT_SMP_STATUSES).default("submitted"),
  // Результат выгрузки в карточку контракта ЕИС
  eisPublishDate: optionalDate(),
  eisRecordNumber: optionalText(100),

  comment: optionalText(1000),
  createdAt: optionalDateTime(),
});

export type ContractSmpRecord = z.infer<typeof ContractSmpRecordSchema>;
export type ContractSmpRecordInput = z.input<typeof ContractSmpRecordSchema>;
export const ContractSmpRecordListSchema = z.array(ContractSmpRecordSchema);

// ─── Утилиты ───────────────────────────────────────────────────────────────

// Дата без времени: нужна для расчёта срока заказчика по производственному
// календарю (время оставляем в receivedAt для фиксации момента получения)
export const receivedDateOf = (record: ContractSmpRecord): string =>
  String(record.receivedAt ?? "").slice(0, 10);

// Сведения приняты заказчиком (в том числе уже выгружены в ЕИС)
export const isRecordAccepted = (record: ContractSmpRecord): boolean =>
  record.status === "accepted" || record.status === "pushedToEis";

// В объём привлечения идут только принятые договоры с субподрядчиками из
// реестра МСП/СОНКО: декларация, акт и платёжка сами по себе объём не закрывают
export const countsTowardsSmpVolume = (record: ContractSmpRecord): boolean =>
  record.documentType === "subContract" &&
  record.isSmpSubject &&
  isRecordAccepted(record);

// Фактический объём привлечения — сумма принятых договоров с СМП
export const smpActualAmount = (records: ContractSmpRecord[]): number =>
  records
    .filter(countsTowardsSmpVolume)
    .reduce(
      (sum, record) => sum + (Number.parseFloat(record.amount ?? "") || 0),
      0,
    );

// Требуемый объём: процент из служебки по позиции ПГ × цена контракта
export const smpRequiredAmount = (
  contractPrice: string | number | undefined,
  requiredPercent: string | number | undefined,
): number | null => {
  const price = Number.parseFloat(String(contractPrice ?? ""));
  const percent = Number.parseFloat(String(requiredPercent ?? ""));

  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(percent)) {
    return null;
  }

  return Math.round(price * percent) / 100;
};

// Процент закрытия требуемого объёма — для прогресс-бара
export const smpVolumeProgress = (
  actual: number,
  required: number | null,
): number => {
  if (!required || required <= 0) return 0;
  return Math.round((actual / required) * 10000) / 100;
};

// ─── Контроль объёма и неустойка (п. 6) ────────────────────────────────────

export interface SmpVolumeResult {
  required: number;
  actual: number;
  shortfall: number;
  progress: number; // 0-100
  isComplete: boolean;
}

// Вычислить объём: требуемый, факт, прогресс-бар, флаг закрытия.
// `actualOverride` — факт из карточки ЕИС (сумма субдоговоров со СМП), когда
// ручных записей ещё нет: иначе прогресс показывал бы нулевое привлечение при
// заполненной подтаблице контракта
export const computeSmpVolume = (
  records: ContractSmpRecord[],
  contractPrice: string | number | undefined,
  requiredPercent: string | number | undefined,
  actualOverride?: number,
): SmpVolumeResult => {
  const required = smpRequiredAmount(contractPrice, requiredPercent) ?? 0;
  const actual = actualOverride ?? smpActualAmount(records);
  const shortfall = Math.max(0, required - actual);
  const progress = smpVolumeProgress(actual, required);

  return {
    required,
    actual,
    shortfall,
    progress,
    isComplete: shortfall <= 0,
  };
};

// Неустойка: 0.1% от суммы недопривлечения за каждый день просрочки.
// Если просрочка не указана, начисляет 1% от суммы недолга (базовая ставка).
// Возвращает объект, совместимый с ContractPenaltySchema (type "other",
// status "accrued"), с обоснованием и ссылкой на ПП РФ от 23.12.2016 N 1466
export interface SmpPenaltyResult {
  penalty: {
    type: "other";
    amount: string;
    status: "accrued";
    description: string;
    reference: string;
    detectedDate: string;
  };
  amount: number;
  shortfall: number;
  overdueDays: number;
}

export const computeSmpPenalty = (
  shortfall: number,
  overdueDays: number = 0,
): SmpPenaltyResult | null => {
  if (shortfall <= 0) return null;

  const days = overdueDays > 0 ? overdueDays : 1;
  const rate = 0.001; // 0.1% в день
  const amount = Math.round(shortfall * rate * days * 100) / 100;

  return {
    penalty: {
      type: "other" as const,
      amount: amount.toFixed(2),
      status: "accrued" as const,
      description: `Недопривлечение СМП/СОНКО: недобрано ${shortfall.toLocaleString(
        "ru-RU",
      )} руб. (${days} раб. дн.${overdueDays > 0 ? " " : ""}${overdueDays > 0 ? "просрочка" : " — базовая ставка 0.1% в день"}). ПП РФ от 23.12.2016 N 1466, п. 6.`,
      reference: "ПП РФ от 23.12.2016 N 1466, п. 6",
      detectedDate: new Date().toISOString().slice(0, 10),
    },
    amount,
    shortfall,
    overdueDays: days,
  };
};

// Пустая запись для формы: дата получения подставляется текущей, чтобы
// момент «получил» фиксировался автоматически
export const emptyContractSmpRecord = (
  organizationId: string | number = "",
  contractId: string | number = "",
): ContractSmpRecord => ({
  organizationId,
  contractId,
  documentType: "subContract",
  documentNumber: "",
  documentDate: new Date().toISOString().slice(0, 10),
  amount: "",
  okpd2Code: "",
  priceType: "contract",
  unitPrice: "",
  subject: "",
  period: "",
  supplierName: "",
  supplierInn: "",
  supplierKpp: "",
  isSmpSubject: true,
  isReplacementSubContract: false,
  paidEarlierThanContractSchedule: false,
  paidToSupplierDate: "",
  acceptanceSignedDate: "",
  receivedAt: new Date().toISOString().slice(0, 16),
  sourceFileName: "",
  status: "submitted",
  eisPublishDate: "",
  eisRecordNumber: "",
  comment: "",
  createdAt: new Date().toISOString(),
});
