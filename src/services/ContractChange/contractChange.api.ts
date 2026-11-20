import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCsmsApi } from "../csmsApi";
import type {
  AddContractChangeDocumentPayload,
  ContractChangeBasis,
  ContractChangeInput,
  ContractChangeMeta,
  ContractChangeResponse,
  ContractChangeActionPayload,
  ContractChangeDocumentType,
  ContractChangeIssue,
  RegisterContractChangePayload,
  RemoveContractChangeDocumentPayload,
  UpdateContractChangePayload,
} from "./contractChange.types";

/**
 * Клиент модуля изменения/расторжения контрактов csms-api.
 *
 * Отдельного «поставить статус» нет: действия идут по именованным маршрутам,
 * потому что статус меняет только сценарий домена. Проверка условий —
 * `POST /validate` с тем же кодом правил, что и при сохранении.
 */
const api = createCsmsApi();

export const contractChangeQueryKey = ["contractChanges"];

const listKey = (organizationId: string, contractId: string) => [
  ...contractChangeQueryKey,
  "list",
  organizationId,
  contractId,
];

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: contractChangeQueryKey });
};

export const useContractChanges = (
  organizationId: string | undefined,
  contractId?: string,
) =>
  useQuery({
    queryKey: listKey(organizationId ?? "", contractId ?? ""),
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<ContractChangeResponse[]> => {
      const { data } = await api.get<ContractChangeResponse[]>(
        "/api/contract-changes/",
        {
          params: {
            organizationId,
            contractId: contractId || undefined,
          },
        },
      );

      return data;
    },
  });

export const useContractChange = (id: string | undefined) =>
  useQuery({
    queryKey: [...contractChangeQueryKey, "item", id ?? ""],
    enabled: Boolean(id),
    queryFn: async (): Promise<ContractChangeResponse> => {
      const { data } = await api.get<ContractChangeResponse>(
        `/api/contract-changes/${id}`,
      );

      return data;
    },
  });

export const useContractChangeBases = () =>
  useQuery({
    queryKey: [...contractChangeQueryKey, "bases"],
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async (): Promise<ContractChangeBasis[]> => {
      const { data } = await api.get<ContractChangeBasis[]>(
        "/api/contract-changes/bases",
      );

      return data;
    },
  });

export const useContractChangeMeta = () =>
  useQuery({
    queryKey: [...contractChangeQueryKey, "meta"],
    staleTime: 10 * 60_000,
    retry: 1,
    queryFn: async (): Promise<ContractChangeMeta> => {
      const { data } = await api.get<ContractChangeMeta>(
        "/api/contract-changes/meta",
      );

      return data;
    },
  });

export const useValidateContractChange = () =>
  useMutation({
    mutationFn: async (
      input: ContractChangeInput,
    ): Promise<ContractChangeIssue[]> => {
      const { data } = await api.post<ContractChangeIssue[]>(
        "/api/contract-changes/validate",
        { input },
      );

      return data;
    },
  });

export const useCreateContractChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: ContractChangeInput,
    ): Promise<ContractChangeResponse> => {
      const { data } = await api.post<ContractChangeResponse>(
        "/api/contract-changes/",
        { input },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateContractChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
      actor,
    }: UpdateContractChangePayload): Promise<ContractChangeResponse> => {
      const { data } = await api.put<ContractChangeResponse>(
        `/api/contract-changes/${id}`,
        { input, actor },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useAddContractChangeDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      type,
      title,
      content,
      actor,
    }: AddContractChangeDocumentPayload): Promise<ContractChangeResponse> => {
      const { data } = await api.post<ContractChangeResponse>(
        `/api/contract-changes/${id}/documents`,
        { type, title, content, actor } satisfies {
          type: ContractChangeDocumentType;
          title: string;
          content: string;
          actor: string;
        },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useRemoveContractChangeDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      documentId,
      actor,
    }: RemoveContractChangeDocumentPayload): Promise<ContractChangeResponse> => {
      const { data } = await api.delete<ContractChangeResponse>(
        `/api/contract-changes/${id}/documents/${documentId}`,
        { params: { actor } },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useContractChangeAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      actor,
      comment,
    }: ContractChangeActionPayload): Promise<ContractChangeResponse> => {
      const { data } = await api.post<ContractChangeResponse>(
        `/api/contract-changes/${id}/${action}`,
        { actor, comment },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useRegisterContractChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      actor,
      registrationNumber,
      registrationDate,
    }: RegisterContractChangePayload): Promise<ContractChangeResponse> => {
      const { data } = await api.post<ContractChangeResponse>(
        `/api/contract-changes/${id}/register`,
        { actor, registrationNumber, registrationDate },
      );

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
};
