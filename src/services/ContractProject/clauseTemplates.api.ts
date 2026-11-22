import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

// В dev запросы идут через прокси Vite (/api → csms-api:5099).
// Отдельный instance нужен: общий `api` смотрит на json-server (:3001).
const clauseApi = axios.create({
  baseURL: "/api",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

/** Утверждённая вставка: дословный текст плюс привязка к снимку нормы. */
export const ClauseTemplateSchema = z.object({
  key: z.string(),
  title: z.string(),
  sectionId: z.string(),
  targetPath: z.string(),
  body: z.string(),
  bodySha256: z.string(),
  institute: z.string(),
  normReference: z.string(),
  actCode: z.string(),
  textSha256: z.string(),
  sourceUrl: z.string().nullable(),
  snapshotSha256: z.string(),
  contractKinds: z.array(z.string()),
  sortOrder: z.number(),
});

export type ClauseTemplate = z.infer<typeof ClauseTemplateSchema>;

export const ClauseSuggestionsSchema = z.object({
  classification: z.object({
    declaredKind: z.string(),
    institutes: z.array(z.string()),
    reviewRequired: z.boolean(),
  }),
  templates: z.array(
    z.object({
      template: ClauseTemplateSchema,
      instituteLabel: z.string(),
    }),
  ),
});

export type ClauseSuggestions = z.infer<typeof ClauseSuggestionsSchema>;

export const CLAUSE_SUGGESTIONS_KEY = "clause-suggestions";

/**
 * Подбор формулировок на стороне API: предмет закупки → институт ГК →
 * утверждённая вставка. Классификатор не дублируется в браузере, чтобы
 * обоснование для проверяющего и выбираемый текст не разошлись.
 */
export const useClauseSuggestions = (subject: string, contractKind: string) =>
  useQuery({
    queryKey: [CLAUSE_SUGGESTIONS_KEY, subject, contractKind],
    queryFn: async ({ signal }): Promise<ClauseSuggestions> => {
      const { data } = await clauseApi.get("/clause-templates/suggestions", {
        params: { subject, contractKind },
        signal,
      });
      return ClauseSuggestionsSchema.parse(data);
    },
    // Реестр версионирован и меняется только вместе с конструктором.
    staleTime: 10 * 60 * 1000,
  });
