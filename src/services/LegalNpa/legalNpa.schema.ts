import { z } from "zod";

/**
 * НПА с версионностью: акт хранится в коллекции `legalActs`, редакции — внутри
 * документа в поле `versions`. Отдельная коллекция не нужна: актов немного,
 * а версии всегда читаются вместе с актом.
 *
 * Минимальный набор редакций — требование владельца: для федеральных законов
 * не меньше 7, для указов, постановлений, распоряжений и приказов — не меньше 3.
 * Порог проверяется скриптом `scripts/npa-sync.mjs --check` и показывается в
 * интерфейсе: неполный набор — красный бейдж, полный — зелёный.
 */

export const NPA_ACT_KINDS = [
  "federal-law",
  "presidential-decree",
  "government-decree",
  "government-order",
  "ministry-order",
  "other",
] as const;

export type NpaActKind = (typeof NPA_ACT_KINDS)[number];

export const npaKindLabels: Record<NpaActKind, string> = {
  "federal-law": "Федеральный закон",
  "presidential-decree": "Указ Президента РФ",
  "government-decree": "Постановление Правительства РФ",
  "government-order": "Распоряжение Правительства РФ",
  "ministry-order": "Приказ ведомства",
  other: "Иной акт",
};

/** Минимум редакций по виду акта. */
export const NPA_MIN_VERSIONS: Record<NpaActKind, number> = {
  "federal-law": 7,
  "presidential-decree": 3,
  "government-decree": 3,
  "government-order": 3,
  "ministry-order": 3,
  other: 3,
};

/** Виды актов, которые в `legalActs` записаны старым перечнем. */
const KIND_ALIASES: Record<string, NpaActKind> = {
  "federal-law": "federal-law",
  "government-decree": "government-decree",
  "government-order": "government-order",
  "ministry-order": "ministry-order",
  "presidential-decree": "presidential-decree",
  other: "other",
};

export const normalizeNpaKind = (value: unknown): NpaActKind => {
  const key = typeof value === "string" ? value.trim() : "";
  return KIND_ALIASES[key] ?? "other";
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ожидается дата ГГГГ-ММ-ДД");

export const NpaArticleSchema = z.object({
  number: z.string().trim().min(1),
  title: z.string().trim().optional(),
  text: z.string(),
});

export type NpaArticle = z.infer<typeof NpaArticleSchema>;

export const NpaVersionSchema = z.object({
  // Стабильный ключ версии внутри акта: «2013-04-05» или «red-2024-08-08»
  id: z.string().trim().min(1),
  // Подпись для интерфейса: «ред. от 08.08.2024»
  revision: z.string().trim().min(1),
  validFrom: isoDate,
  validTo: isoDate.optional(),
  publishedAt: isoDate.optional(),
  // Изменяющий акт: «ФЗ от 08.08.2024 № 259-ФЗ»
  changingAct: z.string().trim().optional(),
  sourceUrl: z.string().trim().optional(),
  contentHash: z.string().trim().optional(),
  // Подтверждена ли редакция администратором НПА (роль npa_admin)
  verified: z.boolean().default(false),
  // text — загружен полный текст, metadata — только реквизиты
  contentStatus: z.enum(["text", "metadata"]).default("metadata"),
  articles: z.array(NpaArticleSchema).default([]),
});

export type NpaVersion = z.infer<typeof NpaVersionSchema>;

export const NpaActSchema = z.object({
  id: z.union([z.string(), z.number()]),
  shortName: z.string().trim().min(1),
  fullName: z.string().trim().default(""),
  actType: z.string().default("other"),
  actNumber: z.string().trim().default(""),
  adoptedDate: isoDate.optional(),
  status: z.string().default("active"),
  sourceUrl: z.string().trim().optional(),
  isVerified: z.boolean().default(false),
  lastCheckedDate: isoDate.optional(),
  // Источник подтвердил, что других редакций нет: набор полный, даже если
  // редакций меньше рекомендованного порога (например, у приказа их всего 2).
  sourceComplete: z.boolean().default(false),
  // Сколько редакций существует по источнику — для подписи «в источнике N».
  sourceVersionsTotal: z.number().int().nonnegative().optional(),
  versions: z.array(NpaVersionSchema).default([]),
});

export type NpaAct = z.infer<typeof NpaActSchema>;

export const NpaActListSchema = z.array(NpaActSchema);

export const npaKindOf = (act: Pick<NpaAct, "actType">): NpaActKind =>
  normalizeNpaKind(act.actType);

export const requiredVersions = (act: Pick<NpaAct, "actType">): number =>
  NPA_MIN_VERSIONS[npaKindOf(act)];

export interface NpaCompleteness {
  required: number;
  actual: number;
  missing: number;
  complete: boolean;
  /** Набор подтверждён источником: других редакций не существует. */
  sourceComplete: boolean;
}

/**
 * Полнота набора. Порог — ориентир, а не требование: если источник
 * подтвердил, что редакций всего меньше (sourceComplete), набор считается
 * полным. Неподтверждённый недобор — не ошибка, а повод проверить источник.
 */
export const npaCompleteness = (
  act: Pick<NpaAct, "actType" | "versions" | "sourceComplete">,
): NpaCompleteness => {
  const required = requiredVersions(act);
  const actual = act.versions.length;
  const sourceComplete = act.sourceComplete === true;

  return {
    required,
    actual,
    missing: sourceComplete ? 0 : Math.max(0, required - actual),
    complete: actual >= required || sourceComplete,
    sourceComplete,
  };
};

const dateValue = (value: string | undefined): number | null => {
  if (!value) return null;
  const ts = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ts) ? ts : null;
};

/**
 * Редакция, действовавшая на дату события. Если дата не передана — берётся
 * последняя редакция. Если событие раньше первой редакции — null.
 */
export const versionOnDate = (
  versions: NpaVersion[],
  date?: string,
): NpaVersion | null => {
  if (versions.length === 0) return null;
  const target = dateValue(date);
  if (target === null) {
    return [...versions].sort((a, b) =>
      b.validFrom.localeCompare(a.validFrom),
    )[0];
  }

  return (
    versions.find((version) => {
      const from = dateValue(version.validFrom);
      const to = dateValue(version.validTo);
      if (from === null) return false;
      if (from > target) return false;
      return to === null || target < to;
    }) ?? null
  );
};

export interface NpaArticleDiff {
  number: string;
  title?: string;
  status: "added" | "removed" | "changed";
  before?: string;
  after?: string;
}

/** Diff по статьям: добавленные, удалённые и изменённые. */
export const diffNpaArticles = (
  from: NpaVersion,
  to: NpaVersion,
): NpaArticleDiff[] => {
  const before = new Map(from.articles.map((item) => [item.number, item]));
  const after = new Map(to.articles.map((item) => [item.number, item]));
  const result: NpaArticleDiff[] = [];

  for (const [number, article] of after) {
    const previous = before.get(number);
    if (!previous) {
      result.push({
        number,
        title: article.title,
        status: "added",
        after: article.text,
      });
      continue;
    }
    if (previous.text !== article.text || previous.title !== article.title) {
      result.push({
        number,
        title: article.title ?? previous.title,
        status: "changed",
        before: previous.text,
        after: article.text,
      });
    }
  }

  for (const [number, article] of before) {
    if (!after.has(number)) {
      result.push({
        number,
        title: article.title,
        status: "removed",
        before: article.text,
      });
    }
  }

  return result.sort((a, b) => a.number.localeCompare(b.number, "ru"));
};

export const sortVersions = (versions: NpaVersion[]): NpaVersion[] =>
  [...versions].sort((a, b) => a.validFrom.localeCompare(b.validFrom));

/** Свежие редакции первыми — так их читают в интерфейсе. */
export const sortVersionsDesc = (versions: NpaVersion[]): NpaVersion[] =>
  [...versions].sort((a, b) => b.validFrom.localeCompare(a.validFrom));
