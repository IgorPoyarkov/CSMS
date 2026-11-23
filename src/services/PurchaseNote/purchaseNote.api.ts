import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  PurchaseNoteListSchema,
  PurchaseNoteReadSchema,
  PurchaseNoteSchema,
  type PurchaseNote,
} from "./purchaseNote.schema";

const ENDPOINT = "/purchaseNotes";

export const purchaseNotesQueryKey = ["purchaseNotes"];

/**
 * Служебные записки по позициям плана-графика. Список берётся по организации:
 * требование о привлечении СМП читается из них при создании извещения,
 * проекта контракта и карточки контракта.
 */
const fetchPurchaseNotes = async (
  organizationId: string | number,
): Promise<PurchaseNote[]> => {
  const { data } = await api.get(ENDPOINT, { params: { organizationId } });

  return PurchaseNoteListSchema.parse(data);
};

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

export const usePurchaseNotes = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...purchaseNotesQueryKey, "organization", String(organizationId)],
    queryFn: () => fetchPurchaseNotes(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreatePurchaseNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: PurchaseNote) => {
      const { data } = await api.post(
        ENDPOINT,
        PurchaseNoteSchema.parse(omitEmptyReferences(note)),
      );

      // Ответ сервера читаем мягкой схемой: правила ПП РФ № 2571 уже
      // проверены формой, а старая запись не должна ронять карточку.
      return PurchaseNoteReadSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseNotesQueryKey });
    },
  });
};

export const useUpdatePurchaseNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<PurchaseNote>) => {
      const { data } = await api.patch(
        `${ENDPOINT}/${id}`,
        omitEmptyReferences(changes),
      );

      return PurchaseNoteReadSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseNotesQueryKey });
    },
  });
};

export const useDeletePurchaseNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseNotesQueryKey });
    },
  });
};
