import z from "zod";
import {
  EIS_CONTRACT_NUMBER_LENGTH,
  IKZ_LENGTH,
  isEisContractNumber,
  isIkz,
} from "../Eis/eisIdentifiers";
import {
  EIS_BASE_DOCUMENT_TYPES,
  EIS_DEFAULT_PAY_DOCUMENT_TYPE,
  EIS_PAY_DOCUMENT_TYPE_CODES,
  EIS_PAY_DOCUMENT_TYPE_LABELS,
  EIS_RUBLE_CURRENCY_CODE,
  type EisBaseDocumentType,
  type EisPayDocumentTypeCode,
} from "../Eis/eisExecutionReadiness";
import {
  optionalDate,
  optionalMoney,
  optionalPattern,
  optionalText,
  requiredMoney,
  requiredText,
} from "../shared/validation";

/**
 * Реестр контрактов (ст. 82, 83, 94, 103 ФЗ-44).
 *
 * Формируется после заключения контракта и содержит:
 * — реквизиты и предмет контракта
 * — этапы исполнения (для многоэтапных контрактов)
 * — платежи (аванс, промежуточные, финальные)
 * — неустойки и штрафы
 * — сведения о поставках/приёмке
 * — публикация в реестре (ЕИС, Казначейство)
 */

// Хелперы полей вынесены в services/shared/validation: поведение "" и undefined
// сохранено, обязательная сумма по-прежнему отвергает пустую строку.

// ─── Этап исполнения контракта (ст. 33 ч. 1 п. 1.1) ───────────────────────

export const ContractStageSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  contractId: z.union([z.string(), z.number()]).optional(),
  // Номер этапа
  stageNumber: z.number().int().min(1),
  // Идентификатор этапа в ЕИС (stagetInfoType/sid): портал различает этапы
  // именно по sid, а не по порядковому номеру
  sid: optionalText(1, "Укажите идентификатор этапа в ЕИС (sid)"),
  // Наименование этапа
  name: requiredText(3, "Укажите наименование этапа"),
  // Дата начала этапа
  startDate: optionalDate(),
  // Дата окончания этапа
  endDate: optionalDate(),
  // Стоимость этапа (руб)
  amount: optionalMoney(),
  // Разбивка суммы этапа по годам (paymentsSumInfo): в XSD сумма этапа
  // хранится не в stage, а в блоке платежей
  paymentsSumInfo: z
    .object({
      currentYear: optionalMoney(),
      firstYear: optionalMoney(),
      secondYear: optionalMoney(),
      subsequentYears: optionalMoney(),
    })
    .optional(),
  // Сумма оплачена
  paidAmount: optionalMoney(),
  // Статус этапа
  status: z
    .enum(["planned", "in_progress", "completed", "delayed"])
    .default("planned"),
  // Акт приёмки этапа
  acceptanceActNumber: optionalText(3, "Номер акта"),
  acceptanceActDate: optionalDate(),
  // Комментарий
  comment: z.string().optional(),
});

export type ContractStage = z.infer<typeof ContractStageSchema>;
export const ContractStageListSchema = z.array(ContractStageSchema);

// ─── Платёж по контракту (ст. 34 ч. 12, 13.1) ─────────────────────────────

/**
 * Коды вида платежа в XSD ЕИС (`payDocumentInfo/payDocumentType`) и подписи.
 *
 * Значения — из Альбома 17.0 (`oosbaseX1_payDocumentType`): поле описывает
 * природу платежа (оплата контрагенту, налоги, неустойка, возврат), а не этап
 * расчёта. Наши «аванс / промежуточный / окончательный» этим полем не
 * различаются: все три — оплата контрагенту (PC). Неустойку и возврат
 * выбирают вручную, иначе ЕИС прочитает обычный платёж как возврат.
 */
export const CONTRACT_PAYMENT_XSD_CODES = EIS_PAY_DOCUMENT_TYPE_CODES;

export type ContractPaymentXsdCode = EisPayDocumentTypeCode;

export const CONTRACT_PAYMENT_XSD_LABELS = EIS_PAY_DOCUMENT_TYPE_LABELS;

/**
 * Код XSD по нашему типу платежа. Этап расчёта в `payDocumentType` не
 * участвует, поэтому по умолчанию всегда «оплата контрагенту».
 */
export const paymentXsdCodeFor = (
  _paymentType: ContractPayment["paymentType"],
): ContractPaymentXsdCode => EIS_DEFAULT_PAY_DOCUMENT_TYPE;

/** Срок оплаты по ч. 13.1 ст. 34: 7 рабочих дней, при казначейском — 10. */
export const paymentDeadlineDays = (treasuryExecution: boolean): number =>
  treasuryExecution ? 10 : 7;

/**
 * Локальная дата в формате ГГГГ-ММ-ДД. `toISOString()` переводит момент в UTC,
 * и в UTC+3 локальная полночь уезжает на предыдущий день: срок оплаты и
 * «сегодня» для просрочки считались на день раньше реальной даты.
 */
export const localIsoDate = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;


export const ContractPaymentSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  contractId: z.union([z.string(), z.number()]).optional(),
  // Номер платёжного документа
  paymentDocumentNumber: optionalText(3, "Номер платёжного документа"),
  // Дата платежа
  paymentDate: optionalDate(),
  // Сумма платежа (руб)
  amount: requiredMoney("Укажите сумму платежа"),
  // Тип платежа: аванс, промежуточный, финальный
  paymentType: z.enum(["advance", "intermediate", "final"]).default("advance"),
  // Код вида платежа по XSD ЕИС (PC/PN/RC/RE); при пустом значении
  // вычисляется из paymentType
  paymentTypeCode: z.enum(CONTRACT_PAYMENT_XSD_CODES).optional(),
  // Счёт-фактура
  invoiceNumber: optionalText(3, "Номер счёта-фактуры"),
  invoiceDate: optionalDate(),
  // Статус оплаты
  status: z
    .enum(["scheduled", "sent", "paid", "rejected"])
    .default("scheduled"),
  // Номер банковского документа
  bankDocumentNumber: optionalText(3, "Номер банковского документа"),
  // Реестровый номер сведений об исполнении, который присваивает ЕИС
  regNumberExecution: optionalText(
    1,
    "Укажите реестровый номер сведений об исполнении в ЕИС",
  ),
  // Казначейское исполнение
  treasuryExecution: z.boolean().default(false),
  // КБК платежа: при казначейском исполнении обязателен — ЕИС раскладывает
  // сумму по бюджетной классификации (paymentsSumInfo/budgetFinancingsInfo)
  kbk: optionalPattern(/^\d{20}$/, "КБК — 20 цифр"),
  // Документ-основание платежа (baseDocumentInfo/baseDocumentType):
  // C — контракт (аванс), A — документ о приёмке, N/U — неустойка
  baseDocumentType: z.enum(EIS_BASE_DOCUMENT_TYPES).default("C"),
  // Номер и дата документа-основания
  baseDocumentNumber: optionalText(1, "Укажите номер документа-основания"),
  baseDocumentDate: optionalDate(),
  // Идентификатор документа о приёмке в ЕИС (docAcceptance/RDICSid):
  // без него основание «документ о приёмке» ЕИС не примет
  baseDocumentSid: optionalText(
    1,
    "Укажите идентификатор документа о приёмке в ЕИС",
  ),
  // Комментарий
  comment: z.string().optional(),
});

export type ContractPayment = z.infer<typeof ContractPaymentSchema>;
export const ContractPaymentListSchema = z.array(ContractPaymentSchema);

// ─── Неустойка / штраф (ст. 34 ч. 5, 7) ───────────────────────────────────

export const ContractPenaltySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  contractId: z.union([z.string(), z.number()]).optional(),
  // Тип: просрочка, нарушение качества, нарушение сроков поставки
  type: z.enum(["delay", "quality", "delivery", "other"]),
  // Дата выявления
  detectedDate: optionalDate(),
  // Сумма неустойки (руб)
  amount: requiredMoney("Укажите сумму"),
  // Статус: начислена, взыскана, оспорена, списана
  status: z
    .enum(["accrued", "collected", "disputed", "written_off"])
    .default("accrued"),
  // Дата взыскания/списания
  resolutionDate: optionalDate(),
  // Номер документа о взыскании/списании
  resolutionDocumentNumber: optionalText(3, "Номер документа"),
  // Описание нарушения
  description: requiredText(10, "Опишите нарушение"),
  // Ссылка на договор/контракт
  reference: z.string().optional(),
});

export type ContractPenalty = z.infer<typeof ContractPenaltySchema>;
export const ContractPenaltyListSchema = z.array(ContractPenaltySchema);

// ─── Поставка / приёмка (ст. 34, 94) ──────────────────────────────────────

export const ContractDeliverySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  contractId: z.union([z.string(), z.number()]).optional(),
  // Дата поставки
  deliveryDate: optionalDate(),
  // Наименование товара/работы/услуги
  itemName: requiredText(5, "Укажите наименование"),
  // Количество
  quantity: optionalText(1, "Укажите количество"),
  // Единица измерения
  unit: optionalText(1, "Единица измерения"),
  // Сумма поставки
  amount: optionalMoney(),
  // Акт приёмки
  acceptanceActNumber: optionalText(3, "Номер акта приёмки"),
  acceptanceActDate: optionalDate(),
  // Результат приёмки: принято, принято_с_замечаниями, отклонено
  result: z
    .enum(["accepted", "accepted_with_notes", "rejected"])
    .default("accepted"),
  // Замечания (если есть)
  notes: z.string().optional(),
});

export type ContractDelivery = z.infer<typeof ContractDeliverySchema>;
export const ContractDeliveryListSchema = z.array(ContractDeliverySchema);

// ─── Чекпоинты процесса по контракту (Tasks 8 п. 2 б) ─────────────────────
//
// ЕИС о ходе процесса ничего не сообщает, поэтому этапы отмечает сам заказчик:
// проверка → подписание → включение в реестр → исполнение → оплата. Это наш
// собственный журнал, а не данные, полученные из ЕИС, — поэтому он не зависит
// от каналов обмена и работает уже сейчас.

export const CONTRACT_EVENT_CHECKPOINTS = [
  "project_created",
  "customer_approved",
  "supplier_signed",
  "customer_signed",
  "registry_included",
  "execution_started",
  "acceptance",
  "payment",
  "completed",
  "terminated",
] as const;

export type ContractEventCheckpoint =
  (typeof CONTRACT_EVENT_CHECKPOINTS)[number];

export const contractEventCheckpointLabels: Record<
  ContractEventCheckpoint,
  string
> = {
  project_created: "Проект контракта сформирован",
  customer_approved: "Проверен контрактной службой",
  supplier_signed: "Подписан поставщиком",
  customer_signed: "Подписан заказчиком",
  registry_included: "Включён в реестр контрактов",
  execution_started: "Начато исполнение",
  acceptance: "Приёмка состоялась",
  payment: "Оплата произведена",
  completed: "Исполнение завершено",
  terminated: "Контракт расторгнут",
};

export const ContractEventSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  contractId: z.union([z.string(), z.number()]),
  // Что именно произошло
  checkpoint: z.enum(CONTRACT_EVENT_CHECKPOINTS),
  // Этап, к которому относится факт: sid этапа из ЕИС. Когда этапов нет,
  // чекпоинт относится к контракту целиком и поле остаётся пустым — поэтому
  // в форме его не спрашиваем, а подставляем из этапа.
  stageSid: z.string().optional(),
  // Наименование этапа на момент отметки: снимок, чтобы запись читалась и
  // после перезагрузки этапов из ЕИС
  stageName: z.string().optional(),
  // Дата события, а не дата ввода записи
  occurredAt: optionalDate(),
  // Кто отметил — снимок ФИО, чтобы запись читалась после изменения штатки
  employeeId: z.union([z.string(), z.number()]).optional(),
  employeeName: optionalText(3, "Укажите ФИО"),
  // Документ-основание: номер и дата протокола, приказа, акта
  basis: z.string().optional(),
  comment: z.string().optional(),
  createdAt: optionalDate(),
  // Когда отметку исправляли: журнал должен показывать правки, а не
  // выглядеть так, будто запись сразу была верной
  updatedAt: optionalDate(),
});

export type ContractEvent = z.infer<typeof ContractEventSchema>;
export const ContractEventListSchema = z.array(ContractEventSchema);

// ─── Итоговый контракт реестра ─────────────────────────────────────────────

export const ContractRegistryItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  // Ссылка на проект контракта
  contractProjectId: z.union([z.string(), z.number()]).optional(),
  // Ссылка на закупку. Публичный импорт ЕИС не всегда знает процедуру, поэтому
  // допускаем и явный null: json-server всё равно отдаёт его как «нет ссылки».
  procurementId: z.union([z.string(), z.number()]).nullish(),
  // ИКЗ
  // Проверка на чтении мягкая: в уже заведённых записях встречаются неполные
  // коды (35 разрядов), и жёсткий разбор сломал бы карточку вместо того, чтобы
  // показать, что номер надо исправить. Строгая проверка — при вводе, в блоке
  // реквизитов ЕИС и в форме пакета.
  ikz: optionalText(10, "Укажите ИКЗ"),
  // Реестровый номер контракта в ЕИС (19 цифр). Присваивает портал, когда
  // сведения о контракте внесены; без него пакет сведений не отправить
  eisRegistryNumber: z
    .string()
    .refine(
      (v) => v === "" || isEisContractNumber(v),
      `Реестровый номер контракта в ЕИС — ${EIS_CONTRACT_NUMBER_LENGTH} цифр`,
    )
    .optional(),
  // Номер контракта
  contractNumber: requiredText(3, "Укажите номер контракта"),
  // Дата заключения контракта (ст. 51 ч. 4)
  contractDate: optionalDate(),
  // Наименование контракта
  contractName: requiredText(5, "Укажите наименование контракта"),
  // Заказчик
  customerName: optionalText(5, "Укажите заказчика"),
  // Поставщик (контрагент). В публичных карточках ЕИС поле иногда отсутствует:
  // приводим отсутствие к пустой строке, чтобы тип оставался string для всех
  // потребителей, а ручное заполнение по-прежнему проверялось схемой.
  supplierName: z.preprocess(
    (value) => value ?? "",
    z
      .string()
      .refine((value) => value === "" || value.length >= 5, "Укажите поставщика"),
  ),
  // ИНН поставщика
  supplierInn: z.string().optional(),
  // КПП поставщика
  supplierKpp: z.string().optional(),
  // Начальная (максимальная) цена
  initialMaxPrice: optionalMoney(),
  // Цена контракта (итоговая)
  contractPrice: requiredMoney("Укажите цену контракта"),
  // Обеспечение исполнения (руб)
  performanceSecurityAmount: optionalMoney(),
  // Гарантийное обеспечение (руб)
  warrantySecurityAmount: optionalMoney(),
  // Аванс по контракту (руб)
  advanceAmount: optionalMoney(),
  // Форма исполнения: полная / частичная
  executionForm: z.enum(["full", "partial"]).default("full"),
  // Ссылка на опубликованный контракт в ЕИС
  eisUrl: z.string().optional(),
  // Дата публикации в ЕИС
  eisPublishDate: optionalDate(),
  // Статус контракта
  status: z
    .enum(["signed", "in_execution", "completed", "terminated", "suspended"])
    .default("signed"),
  // Процент привлечения СМП/СОНКО по ч. 5 ст. 30 — наследуется из
  // служебной записки через цепочку ПГ → СЗ → извещение → проект контракта
  smpRequiredPercent: z
    .string()
    .refine(
      (v) =>
        v === "" ||
        (/^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
      "Процент от 0 до 100",
    )
    .optional(),
  // Номер служебки, из которой унаследовано требование
  subcontractingSmpNoteNumber: z.string().optional(),
  // Дата начала исполнения
  executionStartDate: optionalDate(),
  // Дата окончания исполнения
  executionEndDate: optionalDate(),
  // Дата фактического завершения
  completionDate: optionalDate(),
  // Дата размещения сведений о контракте в Казначействе
  treasuryPublishDate: optionalDate(),
  // Номер/дата приказа о заключении
  orderNumber: optionalText(3, "Номер приказа"),
  orderDate: optionalDate(),
  // Кто подписал контракт от заказчика
  signedByEmployeeId: z.union([z.string(), z.number()]).optional(),
  signedByName: optionalText(5, "ФИО подписанта"),
  // Комментарий
  comment: z.string().optional(),
  createdAt: optionalDate(),
  updatedAt: optionalDate(),
});

export type ContractRegistryItem = z.infer<typeof ContractRegistryItemSchema>;
export const ContractRegistryItemListSchema = z.array(
  ContractRegistryItemSchema,
);

// ─── Утилиты ───────────────────────────────────────────────────────────────

/**
 * Проверка ИКЗ карточки контракта: 36 цифр (приказ Минфина № 55н, XSD 17.0).
 * В старых записях встречаются 35-значные коды — на чтении они допускаются,
 * но перед выгрузкой в ЕИС должны быть исправлены.
 */
export const isContractIkzValid = (ikz: string | undefined): boolean =>
  Boolean(ikz && isIkz(ikz));

export const contractIkzError = (ikz: string | undefined): string | null => {
  if (!ikz) return null;
  if (isContractIkzValid(ikz)) return null;
  return `ИКЗ — ${IKZ_LENGTH} цифр, сейчас введено ${ikz.trim().length}. Код берут из позиции плана-графика.`;
};

/**
 * Дата, до которой должна быть произведена оплата по ч. 13.1 ст. 34:
 * 7 рабочих дней с даты подписания документа о приёмке, при казначейском
 * сопровождении — 10 рабочих дней.
 */
export const paymentDeadlineDate = (
  payment: Pick<ContractPayment, "paymentDate" | "treasuryExecution">,
): string => {
  if (!payment.paymentDate) return "";
  const days = paymentDeadlineDays(Boolean(payment.treasuryExecution));
  const date = new Date(`${payment.paymentDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  let added = 0;

  while (added < days) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) {
      added += 1;
    }
  }

  return localIsoDate(date);
};

/**
 * Полный набор полей payDocumentInfo для маппера в XML ЕИС.
 * Собирается из карточки платежа, чтобы бэк не додумывал коды и сроки.
 * Пути соответствуют `contractExecutionPaymentType` Альбома 17.0.
 */
export interface PayDocumentInfo {
  payDocumentNum: string;
  payDocumentDate: string;
  paid: string;
  payDocumentType: ContractPaymentXsdCode;
  /** Валюта платежа: в CSMS только рубли (643). */
  currency: string;
  baseDocumentType: EisBaseDocumentType;
  baseDocumentNumber: string;
  baseDocumentDate: string;
  /** Идентификатор документа о приёмке в ЕИС (docAcceptance/RDICSid). */
  baseDocumentSid: string;
  /** КБК: обязателен при казначейском исполнении. */
  kbk: string;
  bankDocumentNumber: string;
  regNumberExecution: string;
  paymentDeadlineDate: string;
}

export const buildPayDocumentInfo = (
  payment: ContractPayment,
): PayDocumentInfo => ({
  payDocumentNum: payment.paymentDocumentNumber ?? "",
  payDocumentDate: payment.paymentDate ?? "",
  paid: payment.amount,
  payDocumentType:
    payment.paymentTypeCode ?? paymentXsdCodeFor(payment.paymentType),
  currency: EIS_RUBLE_CURRENCY_CODE,
  baseDocumentType: payment.baseDocumentType ?? "C",
  baseDocumentNumber: payment.baseDocumentNumber ?? "",
  baseDocumentDate: payment.baseDocumentDate ?? "",
  baseDocumentSid: payment.baseDocumentSid ?? "",
  kbk: payment.kbk ?? "",
  bankDocumentNumber: payment.bankDocumentNumber ?? "",
  regNumberExecution: payment.regNumberExecution ?? "",
  paymentDeadlineDate: paymentDeadlineDate(payment),
});

/**
 * Поля этапа для stagetInfoType: ЕИС идентифицирует этап по sid, а сумма
 * лежит в paymentsSumInfo, а не в самом stage.
 */
export interface ContractStageEisInfo {
  sid: string;
  stageName: string;
  startDate: string;
  endDate: string;
  paymentsSumInfo: ContractStage["paymentsSumInfo"] | null;
}

export const buildStageEisInfo = (
  stage: ContractStage,
): ContractStageEisInfo => ({
  sid: stage.sid ?? "",
  stageName: stage.name,
  startDate: stage.startDate ?? "",
  endDate: stage.endDate ?? "",
  paymentsSumInfo: stage.paymentsSumInfo ?? null,
});

// Расчёт оплаченной суммы по контракту
export const totalPaid = (payments: ContractPayment[]): string => {
  return payments
    .filter((p) => p.status === "paid" && p.amount)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
    .toFixed(2);
};

// Процент оплаты контракта
export const paymentPercent = (paid: string, totalPrice: string): number => {
  const total = parseFloat(totalPrice);
  if (!total || total === 0) return 0;
  return Math.round((parseFloat(paid) / total) * 10000) / 100;
};

// Расчёт неустойки по контракту
export const totalPenalties = (penalties: ContractPenalty[]): string => {
  return penalties
    .filter((p) => p.amount)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0)
    .toFixed(2);
};

// Проверка просрочки
export const isContractOverdue = (
  contract: ContractRegistryItem,
  now: Date = new Date(),
): boolean => {
  if (contract.status === "completed" || contract.status === "terminated") {
    return false;
  }
  if (!contract.executionEndDate) return false;
  return new Date(contract.executionEndDate) < now;
};

// Создание пустого контракта
export const emptyContract = (
  organizationId: string | number = "",
): ContractRegistryItem => ({
  organizationId,
  contractNumber: "",
  ikz: "",
  eisRegistryNumber: "",
  contractDate: "",
  contractName: "",
  supplierName: "",
  contractPrice: "",
  executionForm: "full",
  status: "signed",
  comment: "",
  createdAt: new Date().toISOString().slice(0, 10),
  updatedAt: new Date().toISOString().slice(0, 10),
});

// ─── Чекпоинты процесса: порядок, сортировка, заготовка ────────────────────

// Маршрут контракта — порядок, в котором этапы идут в интерфейсе
export const CONTRACT_EVENT_ORDER = Object.fromEntries(
  CONTRACT_EVENT_CHECKPOINTS.map((checkpoint, index) => [checkpoint, index]),
) as Record<ContractEventCheckpoint, number>;

/**
 * События по дате (запись без даты уходит в конец), при равных датах —
 * по маршруту контракта.
 */
export const sortContractEvents = (events: ContractEvent[]): ContractEvent[] =>
  [...events].sort((a, b) => {
    const left = a.occurredAt ?? "";
    const right = b.occurredAt ?? "";
    if (left && right && left !== right) return left.localeCompare(right);
    if (left && !right) return -1;
    if (!left && right) return 1;
    return (
      CONTRACT_EVENT_ORDER[a.checkpoint] - CONTRACT_EVENT_ORDER[b.checkpoint]
    );
  });

/** Ближайший неотмеченный этап — его предлагаем в форме по умолчанию. */
export const nextContractEvent = (
  events: ContractEvent[],
): ContractEventCheckpoint =>
  CONTRACT_EVENT_CHECKPOINTS.find(
    (checkpoint) => !events.some((event) => event.checkpoint === checkpoint),
  ) ?? "completed";

/** Заготовка записи о событии. */
export const emptyContractEvent = (
  contractId: string | number = "",
  checkpoint: ContractEventCheckpoint = "project_created",
): ContractEvent => ({
  contractId,
  checkpoint,
  occurredAt: new Date().toISOString().slice(0, 10),
  employeeName: "",
  basis: "",
  comment: "",
  createdAt: new Date().toISOString().slice(0, 10),
});
