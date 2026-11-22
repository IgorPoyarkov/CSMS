import { z } from "zod";

export const LiabilityMappingOverviewItemSchema = z.object({
  dutyId: z.string(),
  clause: z.string(),
  sectionTitle: z.string(),
  statement: z.string(),
  hasResult: z.boolean(),
  runId: z.string().nullable(),
  candidateCount: z.number(),
  matchedCount: z.number(),
  reviewCount: z.number(),
  topNormReference: z.string().nullable(),
  topMatchDegree: z.string().nullable(),
  topProbabilityScore: z.number().nullable(),
  calculatedAt: z.string().nullable(),
});

export type LiabilityMappingOverviewItem = z.infer<
  typeof LiabilityMappingOverviewItemSchema
>;

export const ViolationHypothesisSchema = z.object({
  id: z.string(),
  kind: z.string(),
  text: z.string(),
  duty_id: z.string(),
});

// Статус честно отделяет подтверждённую моделью норму от заготовок и отказов:
// score=0 из fallback и irrelevant выглядели как обычные нормы.
export const MatchStatusSchema = z.enum([
  "confirmed",
  "preliminary",
  "unconfirmed",
]);

export const MatchedLiabilitySchema = z.object({
  liability_node_id: z.string(),
  norm_reference: z.string(),
  match_degree: z.enum(["full", "partial", "blanket", "irrelevant"]),
  probability_score: z.number(),
  qualifying_conditions: z.array(z.string()),
  sanction_summary: z.string(),
  legal_reasoning: z.string(),
  requires_human_review: z.boolean(),
  status: MatchStatusSchema.optional().default("confirmed"),
  cited_quote: z.string().nullable().optional().default(null),
  hypothesis_id: z.string().nullable().optional().default(null),
  rejection_reasons: z.array(z.string()).optional().default([]),
});

export const MappingDiagnosticsSchema = z.object({
  candidateCount: z.number(),
  evaluated: z.number(),
  confirmed: z.number(),
  preliminary: z.number(),
  unconfirmed: z.number(),
  irrelevant: z.number(),
  fallback: z.number(),
  topReasons: z.array(z.string()),
});

export const LiabilityMappingResultSchema = z.object({
  duty_id: z.string(),
  run_id: z.string(),
  violation_hypotheses: z.array(ViolationHypothesisSchema),
  matched_liabilities: z.array(MatchedLiabilitySchema),
  candidate_count: z.number(),
  model_version: z.string(),
  prompt_version: z.string(),
  calculated_at: z.string(),
  requires_human_review: z.boolean(),
  // Поля добавлены в v4; дефолт сохраняет совместимость со старым ответом API.
  diagnostics: MappingDiagnosticsSchema.nullable().optional().default(null),
});

export type LiabilityMappingResult = z.infer<typeof LiabilityMappingResultSchema>;
export type MatchedLiability = z.infer<typeof MatchedLiabilitySchema>;
export type MatchStatus = z.infer<typeof MatchStatusSchema>;
