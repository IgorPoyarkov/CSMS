import { z } from "zod";

/**
 * Проекция публичной карточки контракта ЕИС (`ContractCardViewDto` воркера
 * `eis-parser`) — не сущность нашей БД, а снимок выгрузки: воркер скачивает
 * акты приёмки, решения заказчика, платёжные поручения и сообщения ЭДО.
 *
 * Документ лежит в jsonb-коллекции `contractCardProjections` целиком, поэтому
 * схема читает только те блоки, которые показывает карточка реестра. Значения
 * приходят из XML Казначейства и бывают пустыми: приводим их к `string | null`
 * и `number | null`, чтобы разметка не занималась разбором строк.
 */

/** Текст из XML: пустая строка и пробелы означают «поля нет». */
const text = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) =>
    value === null || value === undefined || String(value).trim() === ""
      ? null
      : String(value),
  );

/** Денежная сумма: в проекции встречается и числом, и строкой с точкой. */
const amount = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed =
      typeof value === "number"
        ? value
        : Number.parseFloat(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  });

// ─── Документ о приёмке (ОН_АКТРЕЗРАБП) ────────────────────────────────────

/** Строка работ/товаров акта: для карточки важен только состав и ОКПД2. */
export const ContractCardActWorkItemSchema = z.object({
  LineNumber: text,
  Name: text,
  Okpd2Code: text,
  KtruCode: text,
  Quantity: text,
  UnitName: text,
  Price: amount,
  SumWithVat: amount,
});

/** Итоги акта: без НДС, с НДС и сумма налога. */
export const ContractCardActTotalsSchema = z.object({
  SumWithoutVat: amount,
  SumWithVat: amount,
  VatSum: amount,
});

export const ContractCardActSchema = z.object({
  ActNumber: text,
  ActDate: text,
  RegNumber: text,
  Knd: text,
  FileName: text,
  ObjectName: text,
  // Ссылка на контракт из блока ИдДог: в проекции не всегда заполнена
  Contract: z.object({ Number: text, Date: text }).nullish(),
  // Этап исполнения: ИдЭтапКонт — GUID, ТехИдЭтапКонт — номер в ЕИС
  Stage: z.object({ Sid: text, TechnicalSid: text, Ikz: text }).nullish(),
  // Период выполнения работ и дата предъявления
  Period: z
    .object({
      StartDate: text,
      EndDate: text,
      PresentationDate: text,
      OperationContent: text,
    })
    .nullish(),
  Totals: ContractCardActTotalsSchema.nullish(),
  WorkItems: z.array(ContractCardActWorkItemSchema).default([]),
});

export type ContractCardAct = z.infer<typeof ContractCardActSchema>;

// ─── Решение заказчика о приёмке (ОН_АКТРЕЗРАБПОК) ─────────────────────────

export const ContractCardDecisionSchema = z.object({
  // Номер и дата акта, к которому относится решение
  PostedDocumentNumber: text,
  PostedDocumentDate: text,
  OperationCode: text,
  CustomerName: text,
  InfoDate: text,
});

export type ContractCardDecision = z.infer<typeof ContractCardDecisionSchema>;

// ─── Платёжное поручение Казначейства ──────────────────────────────────────

export const ContractCardPaymentSchema = z.object({
  DocumentNumber: text,
  DocumentDate: text,
  ChargeOffDate: text,
  Sum: amount,
  RegNumber: text,
  Purpose: text,
  PaymentType: text,
  ContractNumber: text,
  ContractDate: text,
  // Ссылка на акт приёмки внутри назначения платежа — по ней платёж
  // сопоставляется с документом о приёмке
  AcceptanceDocumentNumber: text,
  AcceptanceDocumentDate: text,
  PayerName: text,
  RecipientName: text,
  Kbk: text,
  DocumentId: text,
  FileName: text,
});

export type ContractCardPayment = z.infer<typeof ContractCardPaymentSchema>;

// ─── Сообщение ЭДО (только для счётчика в шапке секции) ────────────────────

export const ContractCardMessageSchema = z.object({
  MessageType: text,
  EventDate: text,
  EventTime: text,
  OperatorName: text,
});

export type ContractCardMessage = z.infer<typeof ContractCardMessageSchema>;

// ─── Документ коллекции `contractCardProjections` ──────────────────────────

/**
 * Служебные ключи (`id`, `regNumber`, `contractId`, `organizationId`) добавляет
 * импорт `scripts/import-contract-card-projections.mjs`: они связывают
 * публичную карточку с записью своего реестра контрактов.
 */
export const ContractCardProjectionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  RegNumber: text,
  regNumber: text,
  contractId: z.union([z.string(), z.number()]).nullish(),
  contractNumber: text,
  importedAt: text,
  eisUrl: text,
  Acts: z.array(ContractCardActSchema).default([]),
  Decisions: z.array(ContractCardDecisionSchema).default([]),
  Payments: z.array(ContractCardPaymentSchema).default([]),
  Messages: z.array(ContractCardMessageSchema).default([]),
});

export type ContractCardProjection = z.infer<
  typeof ContractCardProjectionSchema
>;

export const ContractCardProjectionListSchema = z.array(
  ContractCardProjectionSchema,
);

// ─── Утилиты сопоставления ─────────────────────────────────────────────────

/**
 * Номера документов сравниваем без пробелов, «№» и разделителей: в акте номер
 * «1», а в назначении платежа — «Документ о приемке № 1 от 25.09.2026».
 */
const sameDocumentNumber = (
  left: string | null,
  right: string | null,
): boolean => {
  const normalize = (value: string | null) =>
    (value ?? "").replace(/[^\dA-Za-zА-Яа-яЁё]/g, "").toLowerCase();
  const a = normalize(left);
  return a !== "" && a === normalize(right);
};

/** Итог акта: с НДС, а если портал не заполнил НДС — без НДС. */
export const contractCardActTotal = (act: ContractCardAct): number | null =>
  act.Totals?.SumWithVat ?? act.Totals?.SumWithoutVat ?? null;

/** Сумма всех актов приёмки. */
export const contractCardActsTotal = (acts: ContractCardAct[]): number =>
  acts.reduce((sum, act) => sum + (contractCardActTotal(act) ?? 0), 0);

/** Сумма всех платёжных поручений. */
export const contractCardPaymentsTotal = (
  payments: ContractCardPayment[],
): number =>
  payments.reduce((sum, payment) => sum + (payment.Sum ?? 0), 0);

/** Платежи, в назначении которых указан этот акт приёмки. */
export const contractCardActPayments = (
  act: ContractCardAct,
  payments: ContractCardPayment[],
): ContractCardPayment[] =>
  payments.filter((payment) =>
    sameDocumentNumber(payment.AcceptanceDocumentNumber, act.ActNumber),
  );

/** Оплачено по акту — сумма связанных платёжных поручений. */
export const contractCardActPaidTotal = (
  act: ContractCardAct,
  payments: ContractCardPayment[],
): number => contractCardPaymentsTotal(contractCardActPayments(act, payments));

/** Решение заказчика по акту: сопоставляем по номеру принятого документа. */
export const contractCardActDecision = (
  act: ContractCardAct,
  decisions: ContractCardDecision[],
): ContractCardDecision | null =>
  decisions.find((decision) =>
    sameDocumentNumber(decision.PostedDocumentNumber, act.ActNumber),
  ) ?? null;
