import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ContractSmpRecordListSchema,
  ContractSmpRecordSchema,
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
 * в ЕИС, где записей много и тянуть их по одному контракту долго.
 *
 * json-server не умеет `contractId_in`, поэтому берём коллекцию целиком и
 * режем по своему списку на клиенте: организация своя, записей немного.
 */
export const smpRecordsByContractsQueryKey = [
  ...contractSmpQueryKey,
  "byContracts",
];

const fetchAllRecords = async (): Promise<ContractSmpRecord[]> => {
  const { data } = await api.get(ENDPOINT);

  return ContractSmpRecordListSchema.parse(data);
};

export const useAllContractSmpRecords = (enabled = true) =>
  useQuery({
    queryKey: smpRecordsByContractsQueryKey,
    queryFn: fetchAllRecords,
    enabled,
  });
