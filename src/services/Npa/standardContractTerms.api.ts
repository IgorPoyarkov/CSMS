import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";
import { CSMS_API_BASE_URL } from "../apiBaseUrl";

/**
 * Действующие типовые условия контрактов (ч. 11 ст. 34 44-ФЗ) из csms-api.
 * Бэк отдаёт снимок актуальных редакций pravo.gov.ru, поэтому старт страницы
 * библиотеки НПА не зависит от доступности портала.
 */
const StandardContractTermSchema = z.object({
  code: z.string(),
  number: z.string(),
  passing: z.string(),
  title: z.string(),
  state: z.string(),
  adoptionDate: z.string().nullable(),
  publicationNumber: z.string(),
  cardUrl: z.string(),
  sourceUrl: z.string(),
  redid: z.number(),
  redDate: z.string(),
  isGovernment: z.boolean(),
  alwaysApplies: z.boolean(),
  text: z.string(),
  textSha256: z.string(),
});

const StandardContractTermsCatalogSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  source: z.string(),
  queries: z.array(z.string()),
  items: z.array(StandardContractTermSchema),
});

export type StandardContractTerm = z.infer<typeof StandardContractTermSchema>;
export type StandardContractTermsCatalog = z.infer<
  typeof StandardContractTermsCatalogSchema
>;

export const STANDARD_CONTRACT_TERMS_KEY = "standard-contract-terms";

const standardContractTermsApi = axios.create({
  baseURL: CSMS_API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

export const useStandardContractTerms = () =>
  useQuery({
    queryKey: [STANDARD_CONTRACT_TERMS_KEY],
    staleTime: 60 * 60_000,
    retry: false,
    queryFn: async ({ signal }): Promise<StandardContractTermsCatalog> => {
      const { data } = await standardContractTermsApi.get<unknown>(
        "/api/standard-contract-terms/catalog",
        { signal },
      );
      return StandardContractTermsCatalogSchema.parse(data);
    },
  });
