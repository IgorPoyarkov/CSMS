import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ObjectDescriptionListSchema,
  ObjectDescriptionSchema,
  type ObjectCharacteristic,
  type ObjectDescription,
} from "./objectDescription.schema";

const ENDPOINT = "/objectDescriptions";

export const objectDescriptionsQueryKey = ["objectDescriptions"];

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

const fetchAllObjectDescriptions = async (): Promise<ObjectDescription[]> => {
  const { data } = await api.get(ENDPOINT);
  return ObjectDescriptionListSchema.parse(data);
};

/**
 * Все структурированные ООЗ и типовые шаблоны нормирования, доступные организации
 * (общие записи с organizationId == null + записи текущей организации).
 */
export const useOrganizationObjectDescriptions = (
  organizationId?: string | number,
) =>
  useQuery({
    queryKey: [
      ...objectDescriptionsQueryKey,
      "organization",
      String(organizationId ?? "all"),
    ],
    queryFn: async () => {
      const all = await fetchAllObjectDescriptions();
      const filtered = organizationId
        ? all.filter(
            (item) =>
              item.organizationId === null ||
              item.organizationId === undefined ||
              String(item.organizationId) === String(organizationId),
          )
        : all;

      return [...filtered].sort((a, b) =>
        String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")),
      );
    },
  });

/**
 * Типовые требования по п. 7 ПП РФ № 926, сгруппированные по коду ОКПД2.
 */
export const useNormingTemplates = (organizationId?: string | number) => {
  const query = useOrganizationObjectDescriptions(organizationId);
  const templates = (query.data ?? []).filter(
    (item) => item.kind === "norming_template",
  );

  const byCode = templates.reduce<Record<string, ObjectDescription>>(
    (acc, tpl) => {
      // Предпочитаем локальный шаблон организации поверх общего
      const existing = acc[tpl.okpd2Code];
      if (!existing || tpl.organizationId !== null) {
        acc[tpl.okpd2Code] = tpl;
      }
      return acc;
    },
    {},
  );

  return {
    ...query,
    templates,
    byCode,
  };
};

export const useCreateObjectDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ObjectDescription) => {
      const prepared = ObjectDescriptionSchema.parse({
        ...payload,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      const { data } = await api.post(
        ENDPOINT,
        omitEmptyReferences(prepared),
      );
      return ObjectDescriptionSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectDescriptionsQueryKey });
    },
  });
};

export const useUpdateObjectDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<ObjectDescription>) => {
      const cleaned = omitEmptyReferences({
        ...changes,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      const { data } = await api.patch(`${ENDPOINT}/${id}`, cleaned);
      return ObjectDescriptionSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectDescriptionsQueryKey });
    },
  });
};

export const useDeleteObjectDescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectDescriptionsQueryKey });
    },
  });
};

/**
 * Создание или обновление типового шаблона требований (ПП РФ № 926) для кода ОКПД2.
 */
export const useUpsertNormingTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      existingId,
      organizationId,
      okpd2Code,
      okpd2Name,
      characteristics,
    }: {
      existingId?: string | number;
      organizationId?: string | number | null;
      okpd2Code: string;
      okpd2Name: string;
      characteristics: ObjectCharacteristic[];
    }) => {
      const now = new Date().toISOString().slice(0, 10);
      if (existingId !== undefined && existingId !== "") {
        const { data } = await api.patch(`${ENDPOINT}/${existingId}`, {
          characteristics,
          okpd2Name,
          updatedAt: now,
        });
        return ObjectDescriptionSchema.parse(data);
      }

      const payload = ObjectDescriptionSchema.parse({
        organizationId: organizationId ?? null,
        kind: "norming_template",
        status: "approved",
        title: `Типовые требования (ПП 926): ${okpd2Name || okpd2Code}`,
        okpd2Code,
        okpd2Name,
        characteristics,
        updatedAt: now,
      });
      const { data } = await api.post(
        ENDPOINT,
        omitEmptyReferences(payload),
      );
      return ObjectDescriptionSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectDescriptionsQueryKey });
    },
  });
};
