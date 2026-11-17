import z from "zod";

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

// Обязательная сумма: пустая строка недопустима
const requiredMoney = (message: string) =>
  z
    .string()
    .min(1, message)
    .refine(
      (v) => /^\d+(\.\d{1,2})?$/.test(v),
      "Укажите сумму числом с точностью до копеек",
    );

// ─── Этап исполнения контракта (ст. 33 ч. 1 п. 1.1) ───────────────────────

export const ContractStageSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  contractId: z.union([z.string(), z.number()]).optional(),
  // Номер этапа
  stageNumber: z.number().int().min(1),
  // Наименование этапа
  name: requiredText(3, "Укажите наименование этапа"),
  // Дата начала этапа
  startDate: optionalDate(),
  // Дата окончания этапа
  endDate: optionalDate(),
  // Стоимость этапа (руб)
  amount: optionalMoney(),
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
  // Счёт-фактура
  invoiceNumber: optionalText(3, "Номер счёта-фактуры"),
  invoiceDate: optionalDate(),
  // Статус оплаты
  status: z
    .enum(["scheduled", "sent", "paid", "rejected"])
    .default("scheduled"),
  // Номер банковского документа
  bankDocumentNumber: optionalText(3, "Номер банковского документа"),
  // Казначейское исполнение
  treasuryExecution: z.boolean().default(false),
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
  // Ссылка на закупку
  procurementId: z.union([z.string(), z.number()]).optional(),
  // ИКЗ
  ikz: optionalText(10, "Укажите ИКЗ"),
  // Номер контракта
  contractNumber: requiredText(3, "Укажите номер контракта"),
  // Дата заключения контракта (ст. 51 ч. 4)
  contractDate: optionalDate(),
  // Наименование контракта
  contractName: requiredText(5, "Укажите наименование контракта"),
  // Заказчик
  customerName: optionalText(5, "Укажите заказчика"),
  // Поставщик (контрагент)
  supplierName: requiredText(5, "Укажите поставщика"),
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
