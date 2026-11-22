/**
 * Подписи и форматирование для карточки контракта.
 *
 * Вынесено из `ContractRegistryPage`: после разделения реестра и карточки
 * (реестр показывает только сводку, детали — на роуте `/contract-registry/:id`)
 * одни и те же подписи нужны обоим экранам, дублировать их в двух файлах
 * нельзя — разъедутся.
 */

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  signed: "Заключён",
  in_execution: "Исполняется",
  completed: "Завершён",
  terminated: "Расторгнут",
  suspended: "Приостановлен",
};

export const STAGE_LABELS: Record<string, string> = {
  planned: "Запланирован",
  in_progress: "Выполняется",
  completed: "Выполнен",
  delayed: "Просрочен",
};

export const PAYMENT_LABELS: Record<string, string> = {
  advance: "Аванс",
  intermediate: "Промежуточный",
  final: "Финальный",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Запланирован",
  sent: "Отправлен",
  paid: "Оплачен",
  rejected: "Отклонён",
};

export const PENALTY_LABELS: Record<string, string> = {
  delay: "Просрочка",
  quality: "Качество",
  delivery: "Поставка",
  other: "Прочее",
};

export const PENALTY_STATUS_LABELS: Record<string, string> = {
  accrued: "Начислена",
  collected: "Взыскана",
  disputed: "Оспорена",
  written_off: "Списана",
};

export const DELIVERY_LABELS: Record<string, string> = {
  accepted: "Принято",
  accepted_with_notes: "Принято с замечаниями",
  rejected: "Отклонено",
};

/** Денежная строка для карточки: пустое значение показываем прочерком. */
export const formatMoney = (
  value: string | number | undefined | null,
): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!num && num !== 0) return "—";
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Доля исполнения в процентах с защитой от нулевой цены контракта. */
export const percentOf = (
  value: number,
  total: string | number | undefined,
): number => {
  const denominator = typeof total === "string" ? parseFloat(total) : total;
  if (!denominator || denominator <= 0) return 0;
  return Math.round((value / denominator) * 100);
};

/**
 * Склонение числительных: «1 документ», «2 документа», «5 документов».
 * Нужно для подписей сводки, где количество приходит из данных.
 */
export const plural = (
  count: number,
  forms: [string, string, string],
): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
};
