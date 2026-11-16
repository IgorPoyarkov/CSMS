import { z } from "zod";

/**
 * Законодательный акт, которым обоснованы поля, проверки и сроки в системе.
 *
 * Сущность заведена по Tasks 6 (п. 3): раньше ссылки на нормы жили только
 * в комментариях и подсказках компонентов, из-за чего при изменении акта
 * приходилось руками искать, где он упомянут. Здесь акт хранится одной
 * записью, а поле `components` перечисляет компоненты системы, которые на
 * него опираются, — это и подготовка к отслеживанию изменений актов на
 * продакшене, и наглядная «фишка» для презентации.
 *
 * Происхождение данных: `isVerified` отличает акты, сверенные с первоисточником,
 * от тех, чьи номер и дата перенесены из формулировок интерфейса. Не
 * сверенные записи нужно прогнать через проверку до того, как на них начнёт
 * опираться контроль сроков.
 */

export const LEGAL_ACT_TYPES = [
  "federal-law",
  "government-decree",
  "government-order",
  "ministry-order",
  "other",
] as const;

export type LegalActType = (typeof LEGAL_ACT_TYPES)[number];

export const legalActTypeLabels: Record<LegalActType, string> = {
  "federal-law": "Федеральный закон",
  "government-decree": "Постановление Правительства РФ",
  "government-order": "Распоряжение Правительства РФ",
  "ministry-order": "Приказ ведомства",
  other: "Иной акт",
};

export const LEGAL_ACT_STATUSES = ["active", "superseded", "expired"] as const;

export type LegalActStatus = (typeof LEGAL_ACT_STATUSES)[number];

export const legalActStatusLabels: Record<LegalActStatus, string> = {
  active: "действует",
  superseded: "утратил силу (заменён)",
  expired: "действовал до указанной даты",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ожидается дата в формате ГГГГ-ММ-ДД")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

export const LegalActSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  // Организация-заказчик: null или отсутствие поля — акт общий для всех
  organizationId: z.union([z.string(), z.number()]).nullable().optional(),

  // «44-ФЗ», «ПП РФ N 926» — так акт подписан в интерфейсе
  shortName: z.string().trim().min(1, "Укажите краткое наименование акта"),
  fullName: z
    .string()
    .trim()
    .min(1, "Укажите полное наименование акта")
    .max(500),
  actType: z.enum(LEGAL_ACT_TYPES),

  // Кто принял: Президент РФ, Правительство РФ, Минфин России и т.п.
  adoptedBy: z.string().trim().min(1, "Укажите, кто принял акт"),
  actNumber: z.string().trim().min(1, "Укажите номер акта"),
  adoptedDate: isoDate,

  // Срок действия. Пустое значение — акт применяется бессрочно, пока не
  // утратил силу; expiresDate заполняется для актов с ограниченным сроком
  effectiveDate: isoDate,
  expiresDate: isoDate,
  status: z.enum(LEGAL_ACT_STATUSES).default("active"),
  // Чем заменён, если статус superseded
  supersededBy: optionalText(300),

  // Что именно акт регулирует в системе — коротко, для карточки и подсказок
  scope: optionalText(500),
  // Компоненты системы, связанные с актом (имена компонентов и конфигураций)
  components: z.array(z.string().trim().min(1)).default([]),

  // Официальный источник и дата последней сверки с ним — основа для
  // отслеживания изменений на продакшене
  sourceUrl: optionalText(300),
  lastCheckedDate: isoDate,
  isVerified: z.boolean().default(false),
  notes: optionalText(1000),
});

export const LegalActListSchema = z.array(LegalActSchema);

export type LegalAct = z.infer<typeof LegalActSchema>;
export type LegalActInput = z.input<typeof LegalActSchema>;

// Дата «31.07.2020» из ISO-строки без зависимости от локали браузера
export const formatActDate = (isoDate: string | undefined): string => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
};

/**
 * Подпись акта для подсказок и ссылок: «ПП РФ N 926 от 02.09.2015». Дата
 * отсутствует у записей, перенесённых из формулировок интерфейса, — тогда
 * подпись выходит без неё, а не с «???».
 */
export const formatLegalAct = (act: LegalAct): string => {
  const date = formatActDate(act.adoptedDate);
  // Номер часто уже входит в краткое наименование («ПП РФ N 926») — тогда не
  // повторяем его
  const number =
    act.actNumber && !act.shortName.includes(act.actNumber)
      ? ` № ${act.actNumber}`
      : "";
  return date
    ? `${act.shortName} от ${date}${number}`
    : `${act.shortName}${number}`;
};

// Бессрочный акт действует в любую дату; для срочного проверяем границы
export const isActInForceOn = (
  act: LegalAct,
  date: string | undefined,
): boolean => {
  if (act.status !== "active") return false;
  const day = date ?? new Date().toISOString().slice(0, 10);
  if (act.effectiveDate && day < act.effectiveDate) return false;
  if (act.expiresDate && day > act.expiresDate) return false;
  return true;
};

// Период действия для таблицы реестра
export const formatActPeriod = (act: LegalAct): string => {
  if (act.expiresDate) {
    const from = act.effectiveDate
      ? `с ${formatActDate(act.effectiveDate)} `
      : "";
    return `${from}по ${formatActDate(act.expiresDate)}`;
  }
  return act.effectiveDate
    ? `с ${formatActDate(act.effectiveDate)} · бессрочно`
    : "бессрочно";
};

/**
 * Акты, на которые опирается компонент. Ищем по имени компонента без учёта
 * регистра: в `components` храним имена так, как они написаны в коде.
 */
export const actsForComponent = (
  acts: LegalAct[],
  componentName: string,
): LegalAct[] => {
  const needle = componentName.trim().toLowerCase();
  if (!needle) return [];
  return acts.filter((act) =>
    (act.components ?? []).some(
      (component) => component.trim().toLowerCase() === needle,
    ),
  );
};
