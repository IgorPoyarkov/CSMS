import { z } from "zod";

/**
 * Единица измерения Общероссийского классификатора единиц измерения (ОКЕИ,
 * ОК 015-94 / МК 002-97), загружаемая через публичный API /api/okei.
 */
export const OkeiUnitSchema = z.object({
  code: z.string(),
  name: z.string(),
  symbolRu: z.string().default(""),
  symbolEn: z.string().default(""),
  section: z.string().default(""),
  group: z.string().default(""),
  synonyms: z.array(z.string()).default([]),
});

export type OkeiUnit = z.infer<typeof OkeiUnitSchema>;

export const OkeiUnitListSchema = z.array(OkeiUnitSchema);
