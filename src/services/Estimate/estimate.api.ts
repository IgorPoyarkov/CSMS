import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ContractEstimateDocumentListSchema,
  ContractEstimateDocumentSchema,
  type ContractEstimateDocument,
} from "./estimate.schema";

const ENDPOINT = "/contractEstimates";

export const estimatesQueryKey = ["contractEstimates"];

/**
 * Сметы и обоснования НМЦК организации.
 *
 * Коллекция `contractEstimates` добавлена в PG-адаптер; фильтрация по
 * организации идёт тем же способом, что и у дефектовок.
 */
const fetchEstimates = async (
  organizationId: string | number,
): Promise<ContractEstimateDocument[]> => {
  const { data } = await api.get(ENDPOINT, { params: { organizationId } });

  return ContractEstimateDocumentListSchema.parse(data);
};

const fetchEstimate = async (
  id: string | number,
): Promise<ContractEstimateDocument> => {
  const { data } = await api.get(`${ENDPOINT}/${id}`);

  return ContractEstimateDocumentSchema.parse(data);
};

// Пустые *Id не отправляем: json-server-совместимый адаптер и старые
// смоук-проверки считают пустую строку «битой» ссылкой.
const cleanIds = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

const prepareForSave = <T extends Record<string, unknown>>(data: T): T => {
  const cleaned = cleanIds(data);
  const estimate = cleaned.estimate as Record<string, unknown> | undefined;
  const schedule = cleaned.schedule as Record<string, unknown> | undefined;
  const nmck = cleaned.nmck as Record<string, unknown> | undefined;
  const record = nmck?.record as Record<string, unknown> | undefined;

  return {
    ...cleaned,
    ...(estimate ? { estimate: cleanIds(estimate) } : {}),
    ...(schedule ? { schedule: cleanIds(schedule) } : {}),
    ...(nmck
      ? {
          nmck: {
            ...cleanIds(nmck),
            ...(record ? { record: cleanIds(record) } : {}),
          },
        }
      : {}),
  } as T;
};

export const useOrganizationEstimates = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...estimatesQueryKey, "organization", String(organizationId)],
    queryFn: () => fetchEstimates(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useEstimateDocument = (id: string | number | undefined) =>
  useQuery({
    queryKey: [...estimatesQueryKey, "document", String(id)],
    queryFn: () => fetchEstimate(id as string | number),
    enabled: id !== undefined && id !== "",
  });

export const useCreateEstimate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: ContractEstimateDocument) => {
      const { data } = await api.post(
        ENDPOINT,
        ContractEstimateDocumentSchema.parse(
          prepareForSave(document as unknown as Record<string, unknown>),
        ),
      );

      return ContractEstimateDocumentSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimatesQueryKey });
    },
  });
};

export const useUpdateEstimate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<ContractEstimateDocument>) => {
      const { data } = await api.patch(
        `${ENDPOINT}/${id}`,
        prepareForSave(changes as Record<string, unknown>),
      );

      return ContractEstimateDocumentSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimatesQueryKey });
    },
  });
};

export const useDeleteEstimate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimatesQueryKey });
    },
  });
};
