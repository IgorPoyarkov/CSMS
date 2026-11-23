const MONEY_FORMATTER = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Денежная сумма в рублях с двумя знаками: «1 234,56 ₽». */
export const formatMoneyRu = (value: number): string =>
  `${MONEY_FORMATTER.format(value)} ₽`;

/** Текущая дата в формате input type="date" (ГГГГ-ММ-ДД). */
export const currentIsoDate = (): string => new Date().toISOString().slice(0, 10);

/** Текущий момент в ISO-формате для поля createdAt событий. */
export const currentIsoTimestamp = (): string => new Date().toISOString();
