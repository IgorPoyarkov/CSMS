import { z } from "zod";
import type { NmckMarketOffer } from "../Nmck/nmck.schema";
import { MINIMUM_SMP_REQUIRED_PERCENT } from "./pp1466";

/**
 * Реестр субъектов малого и среднего предпринимательства (реестр МСП).
 *
 * Заказчик проверяет по нему поставщиков, у которых запрошены коммерческие
 * предложения для обоснования НМЦК методом сопоставимых рыночных цен
 * (ч. 2–5 ст. 22 Закона № 44-ФЗ), и субподрядчиков, привлечённых к контракту.
 *
 * Полный перечень реестра системе не нужен: сверяется конкретный ИНН — при
 * вводе субподрядчика и при проверке коммерческих предложений
 * (`POST /__smp/check`). Ответ сервиса ФНС по каждому ИНН лежит в коллекции
 * `smpRegistry` как результат сверки с датой `checkedAt`:
 *  - `found: true`,  `isActive: true`  — в реестре МСП (с категорией);
 *  - `found: true`,  `isActive: false` — исключён из реестра МСП;
 *  - `found: false`                    — сверен и в реестре не значится.
 * ИНН, которого в справочнике нет, — непроверенный, а не «не СМП»: иначе
 * каждый ещё не сверенный поставщик получал бы ложный отказ.
 *
 * Зачем это нужно: если все КП получены от СМП/СОНКО, закупку можно провести
 * только среди них (ч. 1, 3 ст. 30); если СМП только часть поставщиков —
 * обосновано привлечение субподрядчиков (ч. 5, 6 ст. 30) в объёме,
 * пропорциональном доле СМП в выборке.
 */

export const SMP_REGISTRY_CATEGORIES = ["micro", "small", "medium"] as const;

export type SmpRegistryCategory = (typeof SMP_REGISTRY_CATEGORIES)[number];

export const smpRegistryCategoryLabels: Record<SmpRegistryCategory, string> = {
  micro: "Микропредприятие",
  small: "Малое предприятие",
  medium: "Среднее предприятие",
};

export const SmpRegistryEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  // ИНН — основной ключ сопоставления: наименования меняются, ИНН нет
  inn: z.string(),
  name: z.string(),
  category: z.enum(SMP_REGISTRY_CATEGORIES).optional(),
  registryNumber: z.string().optional(),
  region: z.string().optional(),
  includedAt: z.string().optional(),
  // Исключённые из реестра остаются в справочнике: важно показать,
  // что поставщик проверялся и уже не является субъектом МСП
  isActive: z.boolean().default(true),
  /**
   * Результат сверки: `true` — ИНН в реестре, `false` — сверен и не найден.
   * У записей из выгрузки поля нет (undefined) — они всегда «найдены».
   */
  found: z.boolean().optional(),
  /** Когда ИНН сверяли с реестром (ISO). Проставляется точечной сверкой. */
  checkedAt: z.string().optional(),
  /** Откуда запись: `fns-live` — ответ сервиса ФНС на конкретный ИНН. */
  source: z.string().optional(),
  note: z.string().optional(),
});

export type SmpRegistryEntry = z.infer<typeof SmpRegistryEntrySchema>;
export const SmpRegistryListSchema = z.array(SmpRegistryEntrySchema);

/** Запись справочника означает «в реестре МСП»: `found: false` — не найдено. */
export const isSmpRegistryEntryFound = (entry: SmpRegistryEntry): boolean =>
  entry.found !== false;

/**
 * В справочнике есть хотя бы одна выполненная сверка. Пустой справочник
 * ничего не доказывает: вердикта по ИНН нет, пока этот ИНН не сверен.
 */
export const isSmpRegistryLoaded = (registry: SmpRegistryEntry[]): boolean =>
  registry.length > 0;

/** Что показывать вместо вердикта, пока ни один ИНН не сверялся. */
export const SMP_REGISTRY_NOT_CHECKED_TEXT =
  "ИНН не сверялся с реестром МСП. Нажмите «Проверить в реестре МСП» — система спросит сервис ФНС и запомнит ответ.";

// ─── Ответ точечной сверки ──────────────────────────────────────────────────

/**
 * Статус ответа сервиса ФНС:
 *  - `in_registry` / `out_of_registry` / `excluded` — вердикт есть;
 *  - `invalid` — ИНН не проходит проверку контрольной суммы;
 *  - `unavailable` — сервис не ответил, вердикта нет (не путать с «не найден»).
 */
export const SMP_INN_LOOKUP_STATUSES = [
  "in_registry",
  "out_of_registry",
  "excluded",
  "invalid",
  "unavailable",
] as const;

export type SmpInnLookupStatus = (typeof SMP_INN_LOOKUP_STATUSES)[number];

export const SmpInnLookupSchema = z.object({
  inn: z.string(),
  found: z.boolean(),
  status: z.enum(SMP_INN_LOOKUP_STATUSES),
  /** Ответ взят из справочника: ФНС повторно не спрашивали. */
  cached: z.boolean().default(false),
  name: z.string().optional(),
  category: z.enum(SMP_REGISTRY_CATEGORIES).optional(),
  region: z.string().optional(),
  includedAt: z.string().optional(),
  checkedAt: z.string().optional(),
  note: z.string().optional(),
  error: z.string().optional(),
});

export type SmpInnLookup = z.infer<typeof SmpInnLookupSchema>;

/** Ответ пакетной сверки: `{ results: [...] }`. */
export const SmpInnLookupResponseSchema = z.object({
  results: z.array(SmpInnLookupSchema),
});

/** Дата в подписи: `2026-11-24T…` → `24.11.2026`. */
const lookupDate = (value?: string): string => {
  const [year, month, day] = String(value ?? "").slice(0, 10).split("-");
  return day && month && year ? `${day}.${month}.${year}` : "";
};

/** Одна фраза для интерфейса: что ответил сервис ФНС по этому ИНН. */
export const smpInnLookupText = (answer: SmpInnLookup): string => {
  const checked = lookupDate(answer.checkedAt);
  const when = checked ? ` (проверено ${checked})` : "";

  switch (answer.status) {
    case "in_registry": {
      const category = answer.category
        ? smpRegistryCategoryLabels[answer.category]
        : "";
      const included = lookupDate(answer.includedAt);
      return `В реестре МСП${category ? `: ${category}` : ""}${
        included ? `, включён ${included}` : ""
      }${when}`;
    }
    case "excluded":
      return `Исключён из реестра МСП${when}`;
    case "out_of_registry":
      return `ИНН ${answer.inn} в реестре МСП не найден${when}`;
    case "invalid":
      return answer.error ?? "ИНН некорректен";
    default:
      return `Сервис ФНС недоступен — вердикта по ИНН ${answer.inn} нет${
        answer.error ? ` (${answer.error})` : ""
      }`;
  }
};

// ─── Нормализация и сопоставление ───────────────────────────────────────────

export const normalizeInn = (value?: string): string =>
  (value ?? "").replace(/\D/g, "");

// Организационно-правовые формы и кавычки не различают поставщика:
// «ООО «МедТехСнаб»» и «МедТехСнаб» — одна и та же запись
const LEGAL_FORM_WORDS =
  /\b(ооо|оао|зао|пао|ао|ип|нко|ано|фонд|учреждение|предприятие|компания|общество|ограниченной|ответственностью)\b/g;

export const normalizeSupplierName = (value?: string): string =>
  (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'`]/g, " ")
    .replace(LEGAL_FORM_WORDS, " ")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Поиск поставщика в реестре: сначала по ИНН (точное совпадение), затем по
 * нормализованному наименованию (равенство или вхождение более короткого).
 * ИНН приоритетнее: по названию можно спутать головную компанию и филиал.
 */
export const findSmpRegistryEntry = (
  supplier: { inn?: string; name?: string },
  registry: SmpRegistryEntry[],
): SmpRegistryEntry | null => {
  const inn = normalizeInn(supplier.inn);
  if (inn) {
    const byInn = registry.find((entry) => normalizeInn(entry.inn) === inn);
    if (byInn) return byInn;
  }

  const name = normalizeSupplierName(supplier.name);
  if (!name) return null;

  const exact = registry.find(
    (entry) => normalizeSupplierName(entry.name) === name,
  );
  if (exact) return exact;

  // Вхождение — только для достаточно длинных названий, иначе «мед» найдёт
  // половину реестра и проверка потеряет смысл
  if (name.length < 6) return null;

  return (
    registry.find((entry) => {
      const candidate = normalizeSupplierName(entry.name);
      if (candidate.length < 6) return false;
      return candidate.includes(name) || name.includes(candidate);
    }) ?? null
  );
};

// ─── Проверка состава коммерческих предложений ──────────────────────────────

export type SmpSupplierStatus = "smp" | "not_smp" | "unknown";

export interface SmpSupplierMatch {
  offer: NmckMarketOffer;
  entry: SmpRegistryEntry | null;
  status: SmpSupplierStatus;
  matchBy: "inn" | "name" | null;
}

export type SmpRecommendationMode = "smp_only" | "subcontracting" | "none";

export interface SmpRecommendation {
  mode: SmpRecommendationMode;
  title: string;
  reason: string;
  // Процент привлечения для режима subcontracting (шаг 5, не ниже минимума)
  percent?: number;
}

export interface SmpCompositionAnalysis {
  total: number;
  smpCount: number;
  notSmpCount: number;
  unknownCount: number;
  /** ИНН известен, но сверки ещё не было: вердикта нет ни в одну сторону. */
  uncheckedCount: number;
  smpSharePercent: number;
  allSmp: boolean;
  /** В справочнике есть хотя бы одна сверка (не признак вердикта по ИНН). */
  registryLoaded: boolean;
  rows: SmpSupplierMatch[];
  recommendation: SmpRecommendation | null;
}

// Проценты привлечения округляем до 5: заказчик устанавливает целое значение,
// а доля СМП в выборке КП — величина оценочная
const roundPercentToFive = (value: number): number =>
  Math.max(MINIMUM_SMP_REQUIRED_PERCENT, Math.round(value / 5) * 5);

export const analyzeNmckSmpComposition = (
  offers: NmckMarketOffer[],
  registry: SmpRegistryEntry[],
): SmpCompositionAnalysis => {
  // Исключённые из расчёта предложения не участвуют и в проверке: их цена
  // не влияет на НМЦК, значит и поставщик не характеризует выборку
  const included = offers.filter((offer) => offer.included !== false);

  // Сверка есть только по тем ИНН, которые уже проверяли: справочник — это
  // результаты точечных запросов к сервису ФНС, а не полный перечень. Поэтому
  // отсутствие записи означает «не проверено», а не «не СМП».
  const registryLoaded = isSmpRegistryLoaded(registry);

  const rows: SmpSupplierMatch[] = included.map((offer) => {
    const inn = normalizeInn(offer.supplierInn);
    const entry = findSmpRegistryEntry(
      { inn, name: offer.supplierName },
      registry,
    );

    if (!entry) {
      return { offer, entry: null, status: "unknown", matchBy: null };
    }

    // Сверка выполнена и ИНН в реестре не значится — это вердикт, а не догадка
    if (!isSmpRegistryEntryFound(entry)) {
      return { offer, entry, status: "not_smp", matchBy: "inn" };
    }

    return {
      offer,
      entry,
      status: entry.isActive ? "smp" : "not_smp",
      matchBy: inn && normalizeInn(entry.inn) === inn ? "inn" : "name",
    };
  });

  const total = rows.length;
  const smpCount = rows.filter((row) => row.status === "smp").length;
  const notSmpCount = rows.filter((row) => row.status === "not_smp").length;
  const unknownCount = rows.filter((row) => row.status === "unknown").length;
  // Непроверенные с ИНН: из-за них рекомендация была бы по неполным данным
  const uncheckedCount = rows.filter(
    (row) => row.status === "unknown" && normalizeInn(row.offer.supplierInn),
  ).length;
  const smpSharePercent = total > 0 ? (smpCount / total) * 100 : 0;
  const allSmp = total > 0 && smpCount === total;

  let recommendation: SmpRecommendation | null = null;

  if (total === 0 || uncheckedCount > 0) {
    recommendation = null;
  } else if (allSmp) {
    recommendation = {
      mode: "smp_only",
      title: "Закупка только среди СМП и СОНКО",
      reason: `Все ${total} коммерческих предложений получены от поставщиков из реестра МСП — закупку можно провести только среди СМП/СОНКО (ч. 1, 3 ст. 30 Закона № 44-ФЗ).`,
    };
  } else if (smpCount > 0) {
    const percent = roundPercentToFive(smpSharePercent);
    recommendation = {
      mode: "subcontracting",
      title: `Привлечение СМП/СОНКО — ${percent}%`,
      reason: `Из ${total} предложений ${smpCount} от субъектов МСП (${smpSharePercent.toFixed(0)}%). Обосновано требование о привлечении субподрядчиков из СМП/СОНКО (ч. 5, 6 ст. 30 Закона № 44-ФЗ) с объёмом около ${percent}% от цены контракта.`,
      percent,
    };
  } else if (notSmpCount === total) {
    recommendation = {
      mode: "none",
      title: "Привлечение СМП не обосновано",
      reason:
        "Все поставщики из выборки сверены с реестром МСП и в нём не значатся — требование о привлечении субподрядчиков не обосновано составом ценовой информации.",
    };
  }

  // Остались непроверенные ИНН — рекомендации нет: советовать режим закупки
  // по неполным данным нельзя, сначала проверка в реестре

  return {
    total,
    smpCount,
    notSmpCount,
    unknownCount,
    uncheckedCount,
    smpSharePercent,
    allSmp,
    registryLoaded,
    rows,
    recommendation,
  };
};
