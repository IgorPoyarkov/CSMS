import { useCallback } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ContractSmpRecordListSchema,
  ContractSmpRecordSchema,
  computeSmpVolume,
  type ContractSmpRecord,
} from "./contractSmp.schema";

const ENDPOINT = "/contractSmpRecords";

export const contractSmpQueryKey = ["contractSmpRecords"];

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

/**
 * Сведения о привлечении СМП по контракту (Tasks 9, п. 7, п/п 4). Список
 * берётся по контракту: секция «Привлечение СМП» живёт в его карточке.
 */
const fetchRecordsByContract = async (
  contractId: string | number,
): Promise<ContractSmpRecord[]> => {
  const { data } = await api.get(ENDPOINT, { params: { contractId } });

  return ContractSmpRecordListSchema.parse(data);
};

export const useContractSmpRecords = (
  contractId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...contractSmpQueryKey, "contract", String(contractId)],
    queryFn: () => fetchRecordsByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

/**
 * Сведения о привлечении СМП сразу по нескольким контрактам.
 *
 * Нужны аналитике фактического привлечения за прошлые годы: чтобы посчитать
 * средний процент по сопоставимым контрактам, приходится читать записи каждого
 * контракта отдельно. Возвращает массив результатов в том же порядке, что и
 * переданные идентификаторы.
 */
export const useContractSmpRecordsBatch = (
  contractIds: Array<string | number | undefined | null>,
) => {
  const ids = contractIds.filter(
    (id): id is string | number => id !== undefined && id !== null && id !== "",
  );

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: [...contractSmpQueryKey, "contract", String(id)],
      queryFn: () => fetchRecordsByContract(id),
      enabled: Boolean(id),
      staleTime: 60_000,
    })),
  });
};

/**
 * Объём привлечения СМП для сводки: требуемая, фактическая сумма и дефицит.
 * Запрос тот же, что у `useContractSmpRecords`, но агрегат считается один раз
 * на изменение записей или условий контракта — таблице секции нужен полный
 * список, а прогресс-бару в реестре — только три числа.
 */
/**
 * Объём СМП по контракту: требуемый (из процента контракта или ЕИС) и факт.
 * `eisActual` — сумма субдоговоров из карточки ЕИС: используется, пока ручных
 * записей нет, иначе сводка показывает «требуется 0,00 ₽» при заполненном
 * условии привлечения в ЕИС.
 */
export const useContractSmpVolume = (
  contractId: string | number | undefined,
  contractPrice: string | number | undefined,
  smpRequiredPercent: string | number | undefined,
  eisActual?: number,
) => {
  const select = useCallback(
    (records: ContractSmpRecord[]) =>
      computeSmpVolume(records, contractPrice, smpRequiredPercent, eisActual),
    [contractPrice, smpRequiredPercent, eisActual],
  );

  return useQuery({
    queryKey: [...contractSmpQueryKey, "contract", String(contractId)],
    queryFn: () => fetchRecordsByContract(contractId as string | number),
    enabled: Boolean(contractId),
    select,
  });
};

export const useCreateContractSmpRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: ContractSmpRecord) => {
      const { data } = await api.post(
        ENDPOINT,
        ContractSmpRecordSchema.parse(omitEmptyReferences(record)),
      );

      return ContractSmpRecordSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractSmpQueryKey });
    },
  });
};

export const useUpdateContractSmpRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<ContractSmpRecord>) => {
      const { data } = await api.patch(`${ENDPOINT}/${id}`, changes);

      return ContractSmpRecordSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractSmpQueryKey });
    },
  });
};

export const useDeleteContractSmpRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractSmpQueryKey });
    },
  });
};

/**
 * Все сведения о привлечении СМП организации разом — нужно странице выгрузки
 * в ЕИС, где записей много и тянуть их по контракту долго.
 */
export const smpRecordsQueryKey = [...contractSmpQueryKey, "all"];

const fetchAllRecords = async (): Promise<ContractSmpRecord[]> => {
  const { data } = await api.get(ENDPOINT);
  return ContractSmpRecordListSchema.parse(data);
};

export const useAllContractSmpRecords = (enabled = true) =>
  useQuery({
    queryKey: smpRecordsQueryKey,
    queryFn: fetchAllRecords,
    enabled,
  });
