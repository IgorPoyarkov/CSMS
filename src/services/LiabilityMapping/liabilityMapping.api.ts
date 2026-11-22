import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  LiabilityMappingOverviewItemSchema,
  LiabilityMappingResultSchema,
  type LiabilityMappingOverviewItem,
  type LiabilityMappingResult,
} from "./liabilityMapping.schema";

// В dev запросы идут через прокси Vite (/api → csms-api:5099).
const liabilityApi = axios.create({
  baseURL: "/api",
  // Арбитр на локальной LLM может думать несколько минут.
  timeout: 900_000,
  headers: { "Content-Type": "application/json" },
});

export const LIABILITY_OVERVIEW_KEY = "liability-mapping-overview";
export const LIABILITY_RESULT_KEY = "liability-mapping-result";
export const LIABILITY_DUTIES_KEY = "liability-mapping-duties";

/** Строка справочника обязанностей: форма Сущности А для конвейера. */
export interface LiabilityDutyRow {
  duty: unknown;
  dutyId?: string;
}

const fetchOverview = async (): Promise<LiabilityMappingOverviewItem[]> => {
  const { data } = await liabilityApi.get("/liability-mapping/overview");
  return LiabilityMappingOverviewItemSchema.array().parse(data);
};

/**
 * Справочник 41 обязанности 158н — статические данные. Кэшируем его
 * бессрочно: раньше страница тянула этот список прямым fetch при каждом
 * запуске сопоставления, минуя React Query и общий кэш.
 */
export const fetchLiabilityDuties = async (): Promise<LiabilityDutyRow[]> => {
  const { data } = await liabilityApi.get("/liability-mapping/duties");
  return data as LiabilityDutyRow[];
};

export const useLiabilityDuties = () =>
  useQuery({
    queryKey: [LIABILITY_DUTIES_KEY],
    queryFn: fetchLiabilityDuties,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

const fetchResult = async (
  dutyId: string,
): Promise<LiabilityMappingResult | null> => {
  try {
    const { data } = await liabilityApi.get(
      `/liability-mapping/${encodeURIComponent(dutyId)}`,
    );
    return LiabilityMappingResultSchema.parse(data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

const mapDuty = async (
  duty: unknown,
): Promise<LiabilityMappingResult> => {
  const { data } = await liabilityApi.post("/liability-mapping/map", duty);
  return LiabilityMappingResultSchema.parse(data);
};

export const useLiabilityOverview = () =>
  useQuery({
    queryKey: [LIABILITY_OVERVIEW_KEY],
    queryFn: fetchOverview,
    staleTime: 30_000,
    retry: 1,
  });

export const useLiabilityResult = (dutyId: string | null) =>
  useQuery({
    queryKey: [LIABILITY_RESULT_KEY, dutyId],
    queryFn: () => fetchResult(dutyId as string),
    enabled: Boolean(dutyId),
    staleTime: 60_000,
    retry: 1,
  });

export const useMapLiabilityDuty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mapDuty,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: [LIABILITY_OVERVIEW_KEY] });
      void queryClient.invalidateQueries({
        queryKey: [LIABILITY_RESULT_KEY, result.duty_id],
      });
    },
  });
};
