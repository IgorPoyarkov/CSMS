import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  EisTestAccessRequestListSchema,
  EisTestAccessRequestSchema,
  type EisTestAccessRequest,
} from "./eisTestAccess.schema";

/**
 * Хранилище обращений на тестовый доступ к ЕИС.
 *
 * Использует общий json-server/PG-адаптер контракт: коллекция
 * `eisTestAccessRequests`. Это даёт сохранение без отдельного бэкенда.
 */

const ENDPOINT = "/eisTestAccessRequests";

export const eisTestAccessRequestsQueryKey = ["eisTestAccessRequests"] as const;

export const useEisTestAccessRequests = () =>
  useQuery({
    queryKey: eisTestAccessRequestsQueryKey,
    queryFn: async () => {
      const { data } = await api.get(ENDPOINT);
      return EisTestAccessRequestListSchema.parse(data);
    },
  });

export const useSaveEisTestAccessRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: EisTestAccessRequest) => {
      const payload = EisTestAccessRequestSchema.parse({
        ...request,
        updatedAt: new Date().toISOString(),
      });

      const existing = await api
        .get(`${ENDPOINT}/${encodeURIComponent(payload.id)}`)
        .then((response) => response.data)
        .catch(() => null);

      if (existing) {
        const { data } = await api.put(
          `${ENDPOINT}/${encodeURIComponent(payload.id)}`,
          payload,
        );
        return EisTestAccessRequestSchema.parse(data);
      }

      const { data } = await api.post(ENDPOINT, payload);
      return EisTestAccessRequestSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eisTestAccessRequestsQueryKey });
    },
  });
};

export const useDeleteEisTestAccessRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${ENDPOINT}/${encodeURIComponent(id)}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eisTestAccessRequestsQueryKey });
    },
  });
};
