import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

// Локальный сервис консультанта проксируется Vite по /api/consultant → :5098.
// Генерация наdeepseek-r1:7b занимает десятки секунд, поэтому таймаут большой.
const consultantApi = axios.create({
  baseURL: "/api",
  timeout: 600_000,
  headers: { "Content-Type": "application/json" },
});

export const ConsultantCitationSchema = z.object({
  n: z.number(),
  title: z.string(),
  ref: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  quote: z.string(),
  score: z.number(),
  source: z.string(),
});

export const ConsultantAnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(ConsultantCitationSchema).default([]),
  tools: z.array(z.string()).default([]),
  confidence: z.number().default(0),
  refusal: z.boolean().default(false),
  model: z.string().optional(),
  latencyMs: z.number().optional(),
});

export type ConsultantCitation = z.infer<typeof ConsultantCitationSchema>;
export type ConsultantAnswer = z.infer<typeof ConsultantAnswerSchema>;

const ConsultantStatusSchema = z.object({
  ready: z.boolean(),
  building: z.boolean(),
  chunks: z.number(),
  builtAt: z.string().nullable(),
  embedModel: z.string(),
  chatModel: z.string(),
  stats: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type ConsultantStatus = z.infer<typeof ConsultantStatusSchema>;

export interface ConsultantQuestion {
  question: string;
  module?: string;
  entityId?: string;
  ruleId?: string;
}

export const CONSULTANT_STATUS_KEY = "consultant-status";

const fetchStatus = async (): Promise<ConsultantStatus> => {
  const { data } = await consultantApi.get("/consultant/status");
  return ConsultantStatusSchema.parse(data);
};

const askConsultant = async (payload: ConsultantQuestion): Promise<ConsultantAnswer> => {
  const { data } = await consultantApi.post("/consultant/ask", payload);
  return ConsultantAnswerSchema.parse(data);
};

/** Готовность индекса: сервис может достраивать его при первом запуске. */
export const useConsultantStatus = () =>
  useQuery({
    queryKey: [CONSULTANT_STATUS_KEY],
    queryFn: fetchStatus,
    staleTime: 30_000,
    retry: 0,
  });

export const useAskConsultant = () => useMutation({ mutationFn: askConsultant });
