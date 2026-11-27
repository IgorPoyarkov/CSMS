import { z } from "zod";

/**
 * Локальный снимок новых ГОСТов protect.gost.ru.
 *
 * Фронт не ходит на сайт Росстандарта: монитор (`scripts/gost-monitor.mjs`)
 * собирает карточки и кладёт снимок в `public/gost/catalog.json`. Здесь лежит
 * только контракт чтения этого снимка и подсказки для редактора ООЗ.
 */

const optionalText = z.string().optional().default("");

export const GostCatalogItemSchema = z.object({
  id: z.string(),
  designation: z.string(),
  title: z.string(),
  titleEn: optionalText,
  fullDesignation: optionalText,
  status: optionalText,
  pages: z.number().int().nullable().optional(),
  orderNumber: optionalText,
  orderDate: optionalText,
  effectiveDate: optionalText,
  effectiveNote: optionalText,
  ics: optionalText,
  keywords: optionalText,
  scope: optionalText,
  replaces: optionalText,
  replacedBy: optionalText,
  technicalCommittee: optionalText,
  developer: optionalText,
  text: optionalText,
  metaDescription: optionalText,
  sourceUrl: optionalText,
  collectedAt: optionalText,
});

export const GostCatalogSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  source: z.string(),
  sourcePage: optionalText,
  itemCount: z.number().int().nonnegative(),
  items: z.array(GostCatalogItemSchema),
});

export type GostCatalogItem = z.infer<typeof GostCatalogItemSchema>;
export type GostCatalog = z.infer<typeof GostCatalogSchema>;

/** Ключ сравнения обозначений: регистр, пробелы и знаки в конце не важны. */
export const normalizeGostDesignation = (value: string): string =>
  String(value ?? "")
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/\s+/g, " ")
    .replace(/^[\s.;,]+|[\s.;,]+$/g, "");

/** Карточка ГОСТа по введённому в ООЗ обозначению. */
export const findGostInCatalog = (
  catalog: GostCatalog | null | undefined,
  designation: string,
): GostCatalogItem | null => {
  const key = normalizeGostDesignation(designation);
  if (!key || !catalog?.items?.length) return null;

  return (
    catalog.items.find(
      (item) => normalizeGostDesignation(item.designation) === key,
    ) ??
    catalog.items.find(
      (item) => normalizeGostDesignation(item.fullDesignation) === key,
    ) ??
    null
  );
};

/** Короткое пояснение к карточке для подсказки в редакторе ООЗ. */
export const gostHintSummary = (item: GostCatalogItem): string => {
  const parts = [
    item.status || "Принят",
    item.effectiveDate ? `действует с ${item.effectiveDate}` : "",
    item.orderNumber ? `приказ ${item.orderNumber} от ${item.orderDate}` : "",
  ].filter(Boolean);
  const scope = item.scope || item.text;
  return scope ? `${parts.join(" · ")}. ${scope}` : parts.join(" · ");
};
