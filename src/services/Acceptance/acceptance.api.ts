import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCsmsApi } from "../csmsApi";
import type {
  AcceptAcceptancePayload,
  AcceptanceActionPayload,
  AcceptanceDefectRequirement,
  AcceptanceInput,
  AcceptanceIssue,
  AcceptanceMeta,
  AcceptanceResponse,
  AcceptanceStatus,
  AddAcceptanceDefectPayload,
  AddAcceptancePositionPayload,
  RegisterAcceptancePayload,
  RemoveAcceptanceDefectPayload,
  RemoveAcceptancePositionPayload,
  UpdateAcceptancePayload,
} from "./acceptance.types";

/**
 * Клиент электронного актирования csms-api.
 *
 * Позиции и недостатки меняются отдельными маршрутами: состав принятого
 * фиксируется при направлении заказчику, поэтому «сохранить всё разом» здесь
 * было бы неверно. Проверка условий — `POST /validate`.
 */
const api = createCsmsApi();

export const acceptanceQueryKey = ["acceptances"];

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: acceptanceQueryKey });
};

export const useAcceptances = (
  organizationId: string | undefined,
  contractId?: string,
  status?: AcceptanceStatus,
) =>
  useQuery({
    queryKey: [
      ...acceptanceQueryKey,
      "list",
      organizationId ?? "",
      contractId ?? "",
      status ?? "",
    ],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<AcceptanceResponse[]> => {
      const { data } = await api.get<AcceptanceResponse[]>(
        "/api/acceptances/",
        {
          params: {
            organizationId,
            contractId: contractId || undefined,
            status: status || undefined,
          },
        },
      );

      return data;
    },
  });

export const useAcceptance = (id: string | undefined) =>
  useQuery({
    queryKey: [...acceptanceQueryKey, "item", id ?? ""],
    enabled: Boolean(id),
    queryFn: async (): Promise<AcceptanceResponse> => {
      const { data } = await api.get<AcceptanceResponse>(
        `/api/acceptances/${id}`,
      );

      return data;
    },
  });

export const useAcceptanceMeta = () =>
  useQuery({
    queryKey: [...acceptanceQueryKey, "meta"],
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async (): Promise<AcceptanceMeta> => {
      const { data } = await api.get<AcceptanceMeta>("/api/acceptances/meta");

      return data;
    },
  });

export const useValidateAcceptance = () =>
  useMutation({
    mutationFn: async (input: AcceptanceInput): Promise<AcceptanceIssue[]> => {
      const { data } = await api.post<AcceptanceIssue[]>(
        "/api/acceptances/validate",
        { input },
      );

      return data;
    },
  });

export const useCreateAcceptance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AcceptanceInput): Promise<AcceptanceResponse> => {
      const { data } = await api.post<AcceptanceResponse>("/api/acceptances/", {
        input,
      });

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateAcceptance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
      actor,
    }: UpdateAcceptancePayload): Promise<AcceptanceResponse> => {
      const { data } = await api.put<AcceptanceResponse>(
        `/api/acceptances/${id}`,
        { input, actor },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useAddAcceptancePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      okpd2,
      unit,
      quantity,
      unitPrice,
      vatRate,
      countryOrigin,
      registryNumber,
      actor,
    }: AddAcceptancePositionPayload): Promise<AcceptanceResponse> => {
      const { data } = await api.post<AcceptanceResponse>(
        `/api/acceptances/${id}/positions`,
        {
          name,
          okpd2,
          unit,
          quantity,
          unitPrice,
          vatRate,
          countryOrigin,
          registryNumber,
          actor,
        },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useRemoveAcceptancePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      positionId,
      actor,
    }: RemoveAcceptancePositionPayload): Promise<AcceptanceResponse> => {
      const { data } = await api.delete<AcceptanceResponse>(
        `/api/acceptances/${id}/positions/${positionId}`,
        { params: { actor } },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useAddAcceptanceDefect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      positionId,
      description,
      quantity,
      requirement,
      actor,
    }: AddAcceptanceDefectPayload): Promise<AcceptanceResponse> => {
      const { data } = await api.post<AcceptanceResponse>(
        `/api/acceptances/${id}/defects`,
        {
          positionId,
          description,
          quantity,
          requirement: requirement satisfies AcceptanceDefectRequirement,
          actor,
        },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useRemoveAcceptanceDefect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      defectId,
      actor,
    }: RemoveAcceptanceDefectPayload): Promise<AcceptanceResponse> => {
      const { data } = await api.delete<AcceptanceResponse>(
        `/api/acceptances/${id}/defects/${defectId}`,
        { params: { actor } },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useAcceptanceAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      actor,
      comment,
    }: AcceptanceActionPayload): Promise<AcceptanceResponse> => {
      const { data } = await api.post<AcceptanceResponse>(
        `/api/acceptances/${id}/${action}`,
        { actor, comment },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useAcceptAcceptance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      actor,
      result,
      comment,
    }: AcceptAcceptancePayload): Promise<AcceptanceResponse> => {
      const { data } = await api.post<AcceptanceResponse>(
        `/api/acceptances/${id}/accept`,
        { actor, result, comment },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useRegisterAcceptance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      actor,
      registrationNumber,
      registrationDate,
    }: RegisterAcceptancePayload): Promise<AcceptanceResponse> => {
      const { data } = await api.post<AcceptanceResponse>(
        `/api/acceptances/${id}/register`,
        { actor, registrationNumber, registrationDate },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};
