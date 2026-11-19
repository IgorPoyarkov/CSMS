import { z } from "zod";
import type { NmckMarketOffer } from "../Nmck/nmck.schema";
import { MINIMUM_SMP_REQUIRED_PERCENT } from "./pp1466";

/**
 * Реестр субъектов малого и среднего предпринимательства (реестр МСП).
 *
 * Заказчик проверяет по нему поставщиков, у которых запрошены коммерческие
 * предложения для обоснования НМЦК методом сопоставимых рыночных цен
 * (ч. 2–5 ст. 22 Закона № 44-ФЗ). Результат проверки — не юридический факт:
 * реестр в системе демонстрационный, а на проде сведения берутся из ФНС.
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
  note: z.string().optional(),
});

export type SmpRegistryEntry = z.infer<typeof SmpRegistryEntrySchema>;
export const SmpRegistryListSchema = z.array(SmpRegistryEntrySchema);

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
  smpSharePercent: number;
  allSmp: boolean;
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

  const rows: SmpSupplierMatch[] = included.map((offer) => {
    const inn = normalizeInn(offer.supplierInn);
    const entry = findSmpRegistryEntry(
      { inn, name: offer.supplierName },
      registry,
    );

    if (entry) {
      return {
        offer,
        entry,
        status: entry.isActive ? "smp" : "not_smp",
        matchBy: inn && normalizeInn(entry.inn) === inn ? "inn" : "name",
      };
    }

    // ИНН известен и в реестре не найден — поставщик проверен и не является
    // субъектом МСП; без ИНН утверждать нечего
    return {
      offer,
      entry: null,
      status: inn ? "not_smp" : "unknown",
      matchBy: null,
    };
  });

  const total = rows.length;
  const smpCount = rows.filter((row) => row.status === "smp").length;
  const notSmpCount = rows.filter((row) => row.status === "not_smp").length;
  const unknownCount = rows.filter((row) => row.status === "unknown").length;
  const smpSharePercent = total > 0 ? (smpCount / total) * 100 : 0;
  const allSmp = total > 0 && smpCount === total;

  let recommendation: SmpRecommendation | null = null;

  if (total === 0) {
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
  } else {
    recommendation = {
      mode: "none",
      title: "Привлечение СМП не обосновано",
      reason:
        unknownCount > 0
          ? `Ни один поставщик не подтверждён в реестре МСП, у ${unknownCount} из ${total} не указан ИНН — проверьте ИНН в коммерческих предложениях.`
          : "Ни один поставщик из выборки не найден в реестре МСП — требование о привлечении субподрядчиков не обосновано составом ценовой информации.",
    };
  }

  return {
    total,
    smpCount,
    notSmpCount,
    unknownCount,
    smpSharePercent,
    allSmp,
    rows,
    recommendation,
  };
};
