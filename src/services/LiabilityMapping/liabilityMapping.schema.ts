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

export const MatchedLiabilitySchema = z.object({
  liability_node_id: z.string(),
  norm_reference: z.string(),
  match_degree: z.enum(["full", "partial", "blanket", "irrelevant"]),
  probability_score: z.number(),
  qualifying_conditions: z.array(z.string()),
  sanction_summary: z.string(),
  legal_reasoning: z.string(),
  requires_human_review: z.boolean(),
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
});

export type LiabilityMappingResult = z.infer<typeof LiabilityMappingResultSchema>;
