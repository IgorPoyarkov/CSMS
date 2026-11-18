import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  PurchaseDescriptionListSchema,
  PurchaseDescriptionSchema,
  type PurchaseDescription,
} from "./purchaseDescription.schema";

const ENDPOINT = "/purchaseDescriptions";

export const purchaseDescriptionsQueryKey = ["purchaseDescriptions"];

/**
 * Описания объектов закупки, подготовленные инициаторами закупки.
 *
 * Список берётся по организации: инициатор отбирает из него только свои
 * документы (purchaseDescriptionsOfEmployee), контрактная служба видит все —
 * ей по задаче нужно проверить описание и поставить позицию в план-график.
 */
const fetchPurchaseDescriptions = async (
  organizationId: string | number,
): Promise<PurchaseDescription[]> => {
  const { data } = await api.get(ENDPOINT, { params: { organizationId } });

  return PurchaseDescriptionListSchema.parse(data);
};

// json-server удаляет записи с «битыми» ссылками (*Id, которых нет в
// связанной коллекции), а пустая строка — тоже битая ссылка. Поэтому пустые
// идентификаторы вырезаем: поля просто нет в записи.
const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

export const useOrganizationPurchaseDescriptions = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [
      ...purchaseDescriptionsQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () =>
      fetchPurchaseDescriptions(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreatePurchaseDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (description: PurchaseDescription) => {
      const { data } = await api.post(
        ENDPOINT,
        PurchaseDescriptionSchema.parse(omitEmptyReferences(description)),
      );

      return PurchaseDescriptionSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: purchaseDescriptionsQueryKey,
      });
    },
  });
};

export const useUpdatePurchaseDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<PurchaseDescription>) => {
      const { data } = await api.patch(
        `${ENDPOINT}/${id}`,
        omitEmptyReferences(changes),
      );

      return PurchaseDescriptionSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: purchaseDescriptionsQueryKey,
      });
    },
  });
};

export const useDeletePurchaseDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: purchaseDescriptionsQueryKey,
      });
    },
  });
};
