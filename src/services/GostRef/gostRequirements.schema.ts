import { z } from "zod";

import { normalizeGostDesignation } from "./gostRef.schema";

/**
 * Требования, извлечённые из полного текста технического документа
 * (scripts/build-gost-requirements.mjs). Каждое значение сопровождается
 * дословной цитатой: без неё подсказка в ООЗ не показывается.
 */

export const GOST_REQUIREMENT_FIELDS = [
  "warrantyTermMonths",
  "warrantyRequirements",
  "otherRequirements",
  "descriptionComponents.packaging",
] as const;

export const GostRequirementSchema = z.object({
  field: z.enum(GOST_REQUIREMENT_FIELDS),
  label: z.string(),
  value: z.string(),
  quote: z.string(),
  section: z.string().default(""),
  months: z.number().int().positive().optional(),
});

export const GostRequirementsCatalogSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  source: z.string(),
  itemCount: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      designation: z.string(),
      sourceUrl: z.string().default(""),
      source: z.string().default(""),
      snapshotFile: z.string().default(""),
      textChars: z.number().int().nonnegative(),
      textSha256: z.string(),
      requirements: z.array(GostRequirementSchema),
    }),
  ),
});

export type GostRequirement = z.infer<typeof GostRequirementSchema>;
export type GostRequirementsCatalog = z.infer<
  typeof GostRequirementsCatalogSchema
>;

/** Требования для введённого в ООЗ обозначения ГОСТа. */
export const findGostRequirements = (
  catalog: GostRequirementsCatalog | null | undefined,
  designation: string,
): GostRequirement[] => {
  const key = normalizeGostDesignation(designation);
  if (!key || !catalog?.items?.length) return [];
  return (
    catalog.items.find(
      (item) => normalizeGostDesignation(item.designation) === key,
    )?.requirements ?? []
  );
};
