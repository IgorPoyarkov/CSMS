import { z } from "zod";

/**
 * Офлайн-агент подсказок для ООЗ (scripts/build-ooz-agent.mjs).
 * Работает только по локальным снимкам ГОСТ и НПА; каждое предложение
 * обязательно содержит дословную цитату, поэтому field/value не выдумываются.
 */

export const OOZ_AGENT_SIMPLE_FIELDS = [
  "warrantyTermMonths",
  "warrantyRequirements",
  "otherRequirements",
] as const;

export const OozAgentFieldSchema = z.union([
  z.enum(OOZ_AGENT_SIMPLE_FIELDS),
  z.string().startsWith("descriptionComponents."),
]);

export const OozAgentSuggestionSchema = z.object({
  field: OozAgentFieldSchema,
  value: z.string(),
  label: z.string(),
  quote: z.string(),
  source: z.string(),
  sourceUrl: z.string().nullable(),
  kind: z.enum(["GOST", "NPA"]),
  // Анти-галлюцинационный статус: ГОСТ проверен по полному тексту,
  // сопоставление нормы НПА полю ООЗ оставлено на human-проверку.
  status: z.enum(["confirmed", "needs_review", "unconfirmed"]),
  confidence: z.number().min(0).max(1),
});

export const OozAgentDocumentSchema = z.object({
  code: z.string(),
  name: z.string(),
  kind: z.enum(["GOST", "NPA"]),
  standardType: z.enum(["GOST", "TR_TS", "other"]),
  okpd2Codes: z.array(z.string()),
  ktruCodes: z.array(z.string()),
  sourceUrl: z.string().nullable(),
  status: z.enum(["has_requirements", "no_quotes", "needs_full_text"]),
});

export const OozAgentSnapshotSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  catalogVersion: z.string().nullable(),
  requirementsVersion: z.string().nullable(),
  selectionGeneratedAt: z.string().nullable(),
  documents: z.array(OozAgentDocumentSchema),
  suggestions: z.array(OozAgentSuggestionSchema),
  byOkpd2: z.record(z.string(), z.array(z.string())),
});

export type OozAgentSuggestion = z.infer<typeof OozAgentSuggestionSchema>;
export type OozAgentDocument = z.infer<typeof OozAgentDocumentSchema>;
export type OozAgentSnapshot = z.infer<typeof OozAgentSnapshotSchema>;

const normalize = (value: string) => value.replace(/\s+/g, "").toUpperCase();

/** Документы агента, найденные по коду ОКПД2 описываемой позиции. */
export const findAgentDocuments = (
  snapshot: OozAgentSnapshot | null | undefined,
  okpd2Code: string,
): OozAgentDocument[] => {
  const codes = snapshot?.byOkpd2?.[okpd2Code] ?? [];
  return (snapshot?.documents ?? []).filter((doc) => codes.includes(doc.code));
};

/**
 * Подсказки для документа. НПА из ст. 33 применимы к любому описанию,
 * поэтому они возвращаются даже если ГОСТ не выбран.
 */
export const findAgentSuggestions = (
  snapshot: OozAgentSnapshot | null | undefined,
  code: string,
): OozAgentSuggestion[] => {
  const key = code ? normalize(code) : "";
  return (snapshot?.suggestions ?? []).filter(
    (item) =>
      item.kind === "NPA" || (Boolean(key) && normalize(item.source) === key),
  );
};
