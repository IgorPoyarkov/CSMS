import z from "zod";

/**
 * Служебная записка по позиции плана-графика (Tasks 9, п. 7, п/п 3).
 *
 * Служебных записки две и они разные. Бюджетная СЗ (смета → бюджет →
 * утверждённая смета, по 44-ФЗ до планирования) здесь не ведётся — она далёкое
 * будущее. Эта записка создаётся кликом по конкретной позиции ПГ и является
 * носителем требований по закупке: именно в ней появляется требование
 * о привлечении СМП/СОНКО, которое наследуется вниз по цепочке
 * ПГ → СЗ → извещение → проект контракта → контракт → реестр.
 *
 * Срок подачи сведений подрядчиком здесь не заводится: сроки типовых условий —
 * константы (см. services/ContractSmp/pp1466.ts), переменная величина одна —
 * процент привлечения по п. 1 ПП РФ от 23.12.2016 N 1466.
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

export const PurchaseNoteSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  // Ссылка на план-график и позицию, по которой записка заведена
  purchasePlanId: z.union([z.string(), z.number()]).optional(),
  purchasePlanNumber: z.string().optional(),
  positionId: z.union([z.string(), z.number()]).optional(),
  // Номер записи и уникальный номер позиции — чтобы СЗ читалась без ПГ под рукой
  positionSerialNumber: z.string().optional(),
  positionUniqueNumber: z.string().optional(),

  // Реквизиты служебной записки
  noteNumber: z.string().trim().min(1, "Укажите номер служебной записки"),
  noteDate: z.string().trim().min(1, "Укажите дату служебной записки"),
  // Инициатор — кто требует закупку (профильный отдел, заказчик)
  initiatorName: z.string().trim().min(3, "Укажите инициатора"),
  // Основание: бюджетная смета строкой — отдельной сущности сметы нет
  basis: z.string().max(500).optional(),

  // Требования по закупке. Процентов от цены контракта, которые подрядчик
  // обязан привлечь субподрядчиками из СМП/СОНКО (п. 1 ПП РФ N 1466)
  smpRequiredPercent: z.coerce
    .number({ message: "Укажите процент числом" })
    .min(5, "По п. 1 ПП РФ от 23.12.2016 N 1466 не менее 5 %")
    .max(100, "Не может превышать 100 %"),

  // Предмет закупки и НМЦК, которые заявляет инициатор
  subject: z.string().trim().min(5, "Укажите предмет закупки"),
  initialMaxPrice: optionalMoney(),

  status: z.enum(["draft", "approved", "cancelled"]).default("approved"),
  comment: z.string().optional(),
  createdAt: isoDate(),
});

export type PurchaseNote = z.infer<typeof PurchaseNoteSchema>;
export type PurchaseNoteInput = z.input<typeof PurchaseNoteSchema>;
export const PurchaseNoteListSchema = z.array(PurchaseNoteSchema);

// Служебки позиции: по ним наследуем требование по СМП вниз по цепочке
export const purchaseNotesForPosition = (
  notes: PurchaseNote[],
  positionId: string | number | undefined,
): PurchaseNote[] =>
  positionId === undefined || positionId === ""
    ? []
    : notes.filter((note) => String(note.positionId) === String(positionId));

// Последняя по номеру служебка позиции — её требование и наследуем
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

// Требуемый объём привлечения по служебке: процент от цены (НМЦК) закупки
export const requiredSmpAmountFromNote = (
  note: PurchaseNote,
): number | null => {
  const price = Number.parseFloat(String(note.initialMaxPrice ?? ""));
  const percent = Number(note.smpRequiredPercent);

  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(percent)) {
    return null;
  }

  return Math.round(price * percent) / 100;
};

export const emptyPurchaseNote = (
  organizationId: string | number = "",
): PurchaseNote => ({
  organizationId,
  noteNumber: "",
  noteDate: new Date().toISOString().slice(0, 10),
  initiatorName: "",
  basis: "",
  smpRequiredPercent: 5,
  subject: "",
  initialMaxPrice: "",
  status: "approved",
  comment: "",
  createdAt: new Date().toISOString().slice(0, 10),
});
