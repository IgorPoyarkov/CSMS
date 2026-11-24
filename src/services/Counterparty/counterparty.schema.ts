import { z } from "zod";
import {
  normalizeInn,
  type SmpRegistryCategory,
  type SmpRegistryEntry,
} from "../ContractSmp/smpRegistry.schema";

/**
 * Контрагент — поставщик, подрядчик или субподрядчик заказчика.
 *
 * До этого справочника ИНН и наименование поставщика вписывались заново в
 * каждой форме: карточка контракта, проект контракта, приёмка, сведения о СМП,
 * коммерческие предложения. Здесь реквизиты хранятся один раз и подставляются
 * в документы, а сверка с реестром МСП нужна не ради названия, а ради вердикта
 * «субъект МСП или нет».
 *
 * Ключ — ИНН (`inn`): наименования меняются, ИНН нет.
 *
 * Вердикт реестра МСП в карточке не хранится: его источник — `smpRegistry`
 * (ответ сервиса ФНС с датой сверки). Карточка отвечает только за реквизиты,
 * поэтому обновление сверки не требует править справочник, а признак МСП не
 * рассинхронизируется между двумя коллекциями (`withSmpVerdict`).
 *
 * Документы не должны зависеть от правок карточки: реестровая запись в ЕИС
 * фиксирует реквизиты на дату подачи, поэтому формы копируют их в свои поля
 * (`counterpartyRequisites`), а карточка только помогает не вводить данные
 * повторно.
 */

export const CounterpartySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  /** ИНН — ключ сопоставления во всех документах заказчика */
  inn: z.string(),
  /** Полное наименование (как в ЕГРЮЛ/ЕГРИП или как прислал подрядчик) */
  name: z.string(),
  shortName: z.string().optional(),
  kpp: z.string().optional(),
  ogrn: z.string().optional(),
  legalAddress: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Counterparty = z.infer<typeof CounterpartySchema>;
export const CounterpartyListSchema = z.array(CounterpartySchema);

/** Карточка до сохранения: идентификатора и дат ещё нет. */
export type CounterpartyDraft = Omit<
  Counterparty,
  "id" | "createdAt" | "updatedAt"
>;

/** Пустой ИНН или неполный набор цифр — карточку создавать не из чего. */
export const isCounterpartyInnComplete = (inn?: string): boolean => {
  const digits = normalizeInn(inn);

  return digits.length === 10 || digits.length === 12;
};

/** Подпись карточки в списках: наименование, а рядом — ИНН для сверки глазами. */
export const counterpartyTitle = (counterparty: Counterparty): string =>
  counterparty.inn
    ? `${counterparty.name} · ИНН ${counterparty.inn}`
    : counterparty.name;

/** Текст для поиска в выпадающем списке: и ИНН, и оба наименования. */
export const counterpartySearchText = (counterparty: Counterparty): string =>
  [counterparty.inn, counterparty.name, counterparty.shortName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

/** Заготовка карточки: ИНН из формы, наименование подставляется следом. */
export const createCounterpartyDraft = (
  inn: string,
  name = "",
): CounterpartyDraft => ({
  inn: normalizeInn(inn),
  name: name.trim(),
  isActive: true,
});

/**
 * Реквизиты для документа. Формы копируют их в свои поля: реестровая запись
 * ЕИС не должна меняться, если карточку позже поправят.
 */
export const counterpartyRequisites = (
  counterparty: Counterparty,
): { supplierName: string; supplierInn: string; supplierKpp: string } => ({
  supplierName: counterparty.name,
  supplierInn: counterparty.inn,
  supplierKpp: counterparty.kpp ?? "",
});

/**
 * Вердикт реестра МСП по карточке.
 *
 * `unchecked` — сверки не было. Это не «не СМП»: поставщик просто ещё не
 * проверялся, и рекомендацию по режиму закупки из такого статуса делать нельзя.
 */
export const COUNTERPARTY_SMP_STATUSES = [
  "in_registry",
  "excluded",
  "out_of_registry",
  "unchecked",
] as const;

export type CounterpartySmpStatus =
  (typeof COUNTERPARTY_SMP_STATUSES)[number];

export interface CounterpartySmpVerdict {
  status: CounterpartySmpStatus;
  category?: SmpRegistryCategory;
  /** Дата сверки (ISO) — есть только у реального вердикта */
  checkedAt?: string;
}

export type CounterpartyWithSmp = Counterparty & {
  smp: CounterpartySmpVerdict;
};

/** Вердикт из записи справочника сверок; записи нет — «не проверялся». */
export const counterpartySmpVerdict = (
  entry?: SmpRegistryEntry,
): CounterpartySmpVerdict => {
  if (!entry) {
    return { status: "unchecked" };
  }

  // Запись из полной выгрузки реестра приходит без `found`: раз она есть,
  // значит ИНН в реестре был найден
  if (entry.found === false) {
    return { status: "out_of_registry", checkedAt: entry.checkedAt };
  }

  return {
    status: entry.isActive === false ? "excluded" : "in_registry",
    category: entry.category,
    checkedAt: entry.checkedAt,
  };
};

/** Карточка с присоединённым вердиктом: реквизиты и признак МСП вместе. */
export const withSmpVerdict = (
  counterparty: Counterparty,
  entries: SmpRegistryEntry[],
): CounterpartyWithSmp => {
  const inn = normalizeInn(counterparty.inn);
  const entry = entries.find((item) => normalizeInn(item.inn) === inn);

  return { ...counterparty, smp: counterpartySmpVerdict(entry) };
};

/**
 * Вердикт ещё актуален: с даты сверки прошло не больше `ttlDays` (по умолчанию
 * 30 — столько же, сколько кэширует справочник на сервере).
 */
export const isCounterpartySmpVerdictFresh = (
  verdict: CounterpartySmpVerdict,
  ttlDays = 30,
  now = new Date(),
): boolean => {
  if (verdict.status === "unchecked" || !verdict.checkedAt) {
    return false;
  }

  const checked = new Date(verdict.checkedAt);
  if (Number.isNaN(checked.getTime())) {
    return false;
  }

  const ageMs = now.getTime() - checked.getTime();

  return ageMs >= 0 && ageMs <= ttlDays * 24 * 60 * 60 * 1000;
};

/** Что показать вместо вердикта, если сверки ещё не было. */
export const COUNTERPARTY_SMP_NOT_CHECKED_TEXT =
  "Принадлежность к МСП не проверялась";

/** Подпись вердикта: «в реестре МСП: малое предприятие (24.11.2026)». */
export const counterpartySmpLabel = (
  verdict: CounterpartySmpVerdict,
  categoryLabels: Record<SmpRegistryCategory, string>,
  formatDate: (iso?: string) => string,
): string => {
  if (verdict.status === "unchecked") {
    return COUNTERPARTY_SMP_NOT_CHECKED_TEXT;
  }

  const checked = verdict.checkedAt
    ? ` (проверено ${formatDate(verdict.checkedAt)})`
    : "";

  if (verdict.status === "out_of_registry") {
    return `В реестре МСП не найден${checked}`;
  }

  if (verdict.status === "excluded") {
    return `Исключён из реестра МСП${checked}`;
  }

  const category = verdict.category
    ? categoryLabels[verdict.category]
    : "субъект МСП";

  return `В реестре МСП: ${category.toLowerCase()}${checked}`;
};

