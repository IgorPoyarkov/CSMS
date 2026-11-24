import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  PurchaseObjectListSchema,
  PurchaseObjectSchema,
  type PurchaseObject,
  type PurchaseObjectInput,
} from "./purchaseObject.schema";

const ENDPOINT = "/purchaseObjects";
export const purchaseObjectsQueryKey = ["purchaseObjects"];

/** Пустые ссылки вырезаются: PG-адаптер иначе считает документ битой ссылкой. */
const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

const fetchAllPurchaseObjects = async (): Promise<PurchaseObject[]> => {
  const { data } = await api.get(ENDPOINT);
  return PurchaseObjectListSchema.parse(data);
};

/**
 * Объекты закупки организации. Фильтр по ООЗ / ПГ / СЗ делается на клиенте:
 * адаптер ::3002 умеет фильтровать только верхнеуровневые поля-колонки.
 */
export const usePurchaseObjects = (organizationId?: string | number) =>
  useQuery({
    queryKey: [
      ...purchaseObjectsQueryKey,
      "organization",
      String(organizationId ?? "all"),
    ],
    queryFn: async () => {
      const all = await fetchAllPurchaseObjects();
      const filtered = organizationId
        ? all.filter(
            (item) =>
              item.organizationId === undefined ||
              String(item.organizationId) === String(organizationId),
          )
        : all;
      return [...filtered].sort((a, b) =>
        String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
      );
    },
  });

export const useCreatePurchaseObject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PurchaseObjectInput) => {
      const prepared = PurchaseObjectSchema.parse({
        ...payload,
        createdAt:
          payload.createdAt ?? new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      const { data } = await api.post(ENDPOINT, omitEmptyReferences(prepared));
      return PurchaseObjectSchema.parse(data);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: purchaseObjectsQueryKey }),
  });
};

export const useUpdatePurchaseObject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<PurchaseObject>) => {
      const { data } = await api.patch(
        `${ENDPOINT}/${id}`,
        omitEmptyReferences({
          ...changes,
          updatedAt: new Date().toISOString().slice(0, 10),
        }),
      );
      return PurchaseObjectSchema.parse(data);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: purchaseObjectsQueryKey }),
  });
};

export const useDeletePurchaseObject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);
      return id;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: purchaseObjectsQueryKey }),
  });
};
