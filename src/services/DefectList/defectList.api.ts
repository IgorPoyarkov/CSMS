import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  DefectListListSchema,
  DefectListSchema,
  type DefectList,
} from "./defectList.schema";

const ENDPOINT = "/defectLists";

export const defectListsQueryKey = ["defectLists"];

/**
 * Дефектовки, подготовленные инициаторами закупки.
 *
 * Список берётся по организации: инициатор отбирает из него только свои
 * документы (defectListsOfEmployee), контрактная служба видит все — ей по
 * задаче нужно проверить дефектовку, проект сметы и проект графика.
 */
const fetchDefectLists = async (
  organizationId: string | number,
): Promise<DefectList[]> => {
  const { data } = await api.get(ENDPOINT, { params: { organizationId } });

  return DefectListListSchema.parse(data);
};

// json-server удаляет записи с «битыми» ссылками (*Id, которых нет в
// связанной коллекции), а пустая строка — тоже битая ссылка. Поэтому пустые
// идентификаторы вырезаем, включая вложенные блоки сметы и графика.
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

  return {
    ...cleaned,
    ...(estimate ? { estimate: cleanIds(estimate) } : {}),
    ...(schedule ? { schedule: cleanIds(schedule) } : {}),
  } as T;
};

export const useOrganizationDefectLists = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [
      ...defectListsQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () => fetchDefectLists(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreateDefectList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (list: DefectList) => {
      const { data } = await api.post(
        ENDPOINT,
        DefectListSchema.parse(
          prepareForSave(list as unknown as Record<string, unknown>),
        ),
      );

      return DefectListSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectListsQueryKey });
    },
  });
};

export const useUpdateDefectList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<DefectList>) => {
      const { data } = await api.patch(
        `${ENDPOINT}/${id}`,
        prepareForSave(changes as Record<string, unknown>),
      );

      return DefectListSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectListsQueryKey });
    },
  });
};

export const useDeleteDefectList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: defectListsQueryKey });
    },
  });
};
