import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ContractRegistryItemListSchema,
  ContractRegistryItemSchema,
  ContractStageListSchema,
  ContractStageSchema,
  ContractPaymentListSchema,
  ContractPaymentSchema,
  ContractPenaltyListSchema,
  ContractPenaltySchema,
  ContractDeliveryListSchema,
  ContractDeliverySchema,
  type ContractRegistryItem,
  type ContractStage,
  type ContractPayment,
  type ContractPenalty,
  type ContractDelivery,
} from "./contractRegistry.schema";

const CONTRACTS_ENDPOINT = "/contractRegistry";
const STAGES_ENDPOINT = "/contractStages";
const PAYMENTS_ENDPOINT = "/contractPayments";
const PENALTIES_ENDPOINT = "/contractPenalties";
const DELIVERIES_ENDPOINT = "/contractDeliveries";

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

// ─── Контракты ──────────────────────────────────────────────────────────────

/** Результат подгрузки сведений контракта по реестровому номеру. */
export type ContractLookup = {
  /** Найденный контракт своей организации. */
  contract: ContractRegistryItem | null;
  /** Такой номер в реестре есть, но контракт относится к другой организации. */
  anotherOrganization: boolean;
};

const fetchContractsByOrg = async (
  organizationId: string | number,
): Promise<ContractRegistryItem[]> => {
  const response = await api.get(CONTRACTS_ENDPOINT, {
    params: { organizationId },
  });
  return ContractRegistryItemListSchema.parse(response.data);
};

const createContract = async (
  contract: ContractRegistryItem,
): Promise<ContractRegistryItem> => {
  const response = await api.post(
    CONTRACTS_ENDPOINT,
    omitEmptyReferences(contract),
  );
  return ContractRegistryItemSchema.parse(response.data);
};

const updateContract = async ({
  id,
  ...data
}: {
  id: string | number;
} & Partial<ContractRegistryItem>): Promise<ContractRegistryItem> => {
  const response = await api.patch(`${CONTRACTS_ENDPOINT}/${id}`, data);
  return ContractRegistryItemSchema.parse(response.data);
};

const deleteContract = async (
  id: string | number,
): Promise<string | number> => {
  await api.delete(`${CONTRACTS_ENDPOINT}/${id}`);
  return id;
};

/**
 * Контракты по реестровому номеру. json-server сравнивает поле целиком, поэтому
 * номер передают как есть. organizationId передавать обязательно для запросов
 * от имени пользователя — без него ищется по всему реестру.
 */
const fetchContractsByNumber = async (
  contractNumber: string,
  organizationId?: string | number,
): Promise<ContractRegistryItem[]> => {
  const response = await api.get(CONTRACTS_ENDPOINT, {
    params: {
      contractNumber,
      ...(organizationId === undefined ? {} : { organizationId }),
    },
  });
  return ContractRegistryItemListSchema.parse(response.data);
};

/**
 * Один номер может относиться к нескольким записям реестра (изменение контракта),
 * поэтому берём запись с самой свежей датой заключения.
 */
const pickLatestContract = (
  rows: ContractRegistryItem[],
): ContractRegistryItem | null =>
  rows.length === 0
    ? null
    : [...rows].sort((a, b) =>
        String(b.contractDate).localeCompare(String(a.contractDate)),
      )[0];

/**
 * Минимальная длина реестрового номера — как в схеме контракта
 * (requiredText(3, "Укажите номер контракта")).
 */
export const MIN_CONTRACT_NUMBER_LENGTH = 3;

/**
 * Подгрузка сведений контракта из реестра по его реестровому номеру.
 *
 * Сначала ищем только среди контрактов своей организации — разграничение
 * по организации здесь на уровне запроса. Если своего контракта с таким номером
 * нет, делаем уточняющий запрос по всему реестру, чтобы честно ответить
 * «номер есть, но он у другого заказчика», а не «не найдено». Сведения чужого
 * контракта при этом не возвращаются.
 */
export const lookupContractByNumber = async (
  contractNumber: string,
  organizationId: string | number,
): Promise<ContractLookup> => {
  const own = await fetchContractsByNumber(contractNumber, organizationId);
  if (own.length > 0) {
    return { contract: pickLatestContract(own), anotherOrganization: false };
  }
  const foreign = await fetchContractsByNumber(contractNumber);
  return { contract: null, anotherOrganization: foreign.length > 0 };
};

// ─── Этапы ──────────────────────────────────────────────────────────────────

const fetchStagesByContract = async (
  contractId: string | number,
): Promise<ContractStage[]> => {
  const response = await api.get(STAGES_ENDPOINT, {
    params: { contractId },
  });
  return ContractStageListSchema.parse(response.data);
};

const createStage = async (stage: ContractStage): Promise<ContractStage> => {
  const response = await api.post(STAGES_ENDPOINT, omitEmptyReferences(stage));
  return ContractStageSchema.parse(response.data);
};

const updateStage = async ({
  id,
  ...data
}: {
  id: string | number;
} & Partial<ContractStage>): Promise<ContractStage> => {
  const response = await api.patch(`${STAGES_ENDPOINT}/${id}`, data);
  return ContractStageSchema.parse(response.data);
};

const deleteStage = async (id: string | number): Promise<string | number> => {
  await api.delete(`${STAGES_ENDPOINT}/${id}`);
  return id;
};

// ─── Платежи ────────────────────────────────────────────────────────────────

const fetchPaymentsByContract = async (
  contractId: string | number,
): Promise<ContractPayment[]> => {
  const response = await api.get(PAYMENTS_ENDPOINT, {
    params: { contractId },
  });
  return ContractPaymentListSchema.parse(response.data);
};

const createPayment = async (
  payment: ContractPayment,
): Promise<ContractPayment> => {
  const response = await api.post(
    PAYMENTS_ENDPOINT,
    omitEmptyReferences(payment),
  );
  return ContractPaymentSchema.parse(response.data);
};

const updatePayment = async ({
  id,
  ...data
}: {
  id: string | number;
} & Partial<ContractPayment>): Promise<ContractPayment> => {
  const response = await api.patch(`${PAYMENTS_ENDPOINT}/${id}`, data);
  return ContractPaymentSchema.parse(response.data);
};

const deletePayment = async (id: string | number): Promise<string | number> => {
  await api.delete(`${PAYMENTS_ENDPOINT}/${id}`);
  return id;
};

// ─── Неустойки ─────────────────────────────────────────────────────────────

const fetchPenaltiesByContract = async (
  contractId: string | number,
): Promise<ContractPenalty[]> => {
  const response = await api.get(PENALTIES_ENDPOINT, {
    params: { contractId },
  });
  return ContractPenaltyListSchema.parse(response.data);
};

const createPenalty = async (
  penalty: ContractPenalty,
): Promise<ContractPenalty> => {
  const response = await api.post(
    PENALTIES_ENDPOINT,
    omitEmptyReferences(penalty),
  );
  return ContractPenaltySchema.parse(response.data);
};

const updatePenalty = async ({
  id,
  ...data
}: {
  id: string | number;
} & Partial<ContractPenalty>): Promise<ContractPenalty> => {
  const response = await api.patch(`${PENALTIES_ENDPOINT}/${id}`, data);
  return ContractPenaltySchema.parse(response.data);
};

const deletePenalty = async (id: string | number): Promise<string | number> => {
  await api.delete(`${PENALTIES_ENDPOINT}/${id}`);
  return id;
};

// ─── Поставки ──────────────────────────────────────────────────────────────

const fetchDeliveriesByContract = async (
  contractId: string | number,
): Promise<ContractDelivery[]> => {
  const response = await api.get(DELIVERIES_ENDPOINT, {
    params: { contractId },
  });
  return ContractDeliveryListSchema.parse(response.data);
};

const createDelivery = async (
  delivery: ContractDelivery,
): Promise<ContractDelivery> => {
  const response = await api.post(
    DELIVERIES_ENDPOINT,
    omitEmptyReferences(delivery),
  );
  return ContractDeliverySchema.parse(response.data);
};

const updateDelivery = async ({
  id,
  ...data
}: {
  id: string | number;
} & Partial<ContractDelivery>): Promise<ContractDelivery> => {
  const response = await api.patch(`${DELIVERIES_ENDPOINT}/${id}`, data);
  return ContractDeliverySchema.parse(response.data);
};

const deleteDelivery = async (
  id: string | number,
): Promise<string | number> => {
  await api.delete(`${DELIVERIES_ENDPOINT}/${id}`);
  return id;
};

// ─── Хуки ───────────────────────────────────────────────────────────────────

export const contractRegistryQueryKey = ["contractRegistry"];

// Контракты
export const useContractRegistry = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [
      ...contractRegistryQueryKey,
      "contracts",
      String(organizationId),
    ],
    queryFn: () => fetchContractsByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContract,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useUpdateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateContract,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useDeleteContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContract,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

// Этапы
export const useContractStages = (contractId: string | number | undefined) =>
  useQuery({
    queryKey: [...contractRegistryQueryKey, "stages", String(contractId)],
    queryFn: () => fetchStagesByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

export const useCreateStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStage,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useUpdateStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateStage,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useDeleteStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteStage,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

// Платежи
export const useContractPayments = (contractId: string | number | undefined) =>
  useQuery({
    queryKey: [...contractRegistryQueryKey, "payments", String(contractId)],
    queryFn: () => fetchPaymentsByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

export const useCreatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useUpdatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updatePayment,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useDeletePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

// Неустойки
export const useContractPenalties = (contractId: string | number | undefined) =>
  useQuery({
    queryKey: [...contractRegistryQueryKey, "penalties", String(contractId)],
    queryFn: () => fetchPenaltiesByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

export const useCreatePenalty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPenalty,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useUpdatePenalty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updatePenalty,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useDeletePenalty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePenalty,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

// Поставки
export const useContractDeliveries = (
  contractId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...contractRegistryQueryKey, "deliveries", String(contractId)],
    queryFn: () => fetchDeliveriesByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

export const useCreateDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDelivery,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useUpdateDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateDelivery,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};

export const useDeleteDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDelivery,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: contractRegistryQueryKey }),
  });
};
