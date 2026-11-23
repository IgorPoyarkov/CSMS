import { useCallback, useMemo } from "react";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryClient,
} from "@tanstack/react-query";
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
  ContractEventListSchema,
  ContractEventSchema,
  totalPaid,
  type ContractRegistryItem,
  type ContractStage,
  type ContractPayment,
  type ContractPenalty,
  type ContractDelivery,
  type ContractEvent,
} from "./contractRegistry.schema";

const CONTRACTS_ENDPOINT = "/contractRegistry";
const STAGES_ENDPOINT = "/contractStages";
const PAYMENTS_ENDPOINT = "/contractPayments";
const PENALTIES_ENDPOINT = "/contractPenalties";
const DELIVERIES_ENDPOINT = "/contractDeliveries";
const EVENTS_ENDPOINT = "/contractEvents";

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
  /** Чем сработало совпадение: точным номером или его фрагментом. */
  matchedBy: "exact" | "partial" | null;
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

/**
 * Размер порции реестра при прогрессивной загрузке. Кратен всем масштабам
 * `PageSizePicker` (5 / 10 / 25), поэтому первая порция сразу закрывает первую
 * страницу любого размера и не заставляет перезапрашивать данные.
 */
export const CONTRACT_REGISTRY_PAGE_SIZE = 25;

/** Одна порция реестра: строки страницы и всего контрактов у организации. */
export interface ContractRegistryPortion {
  items: ContractRegistryItem[];
  total: number;
}

/**
 * Порция реестра через `_page/_limit`. Адаптер в стиле json-server отдаёт
 * общее число записей в `X-Total-Count` — по нему решаем, есть ли ещё строки.
 * Без заголовка (старый json-server) считаем, что порция последняя.
 */
const fetchContractsPortion = async (
  organizationId: string | number,
  page: number,
  limit: number,
): Promise<ContractRegistryPortion> => {
  const response = await api.get(CONTRACTS_ENDPOINT, {
    params: { organizationId, _page: page, _limit: limit },
  });
  const items = ContractRegistryItemListSchema.parse(response.data);
  const header = response.headers["x-total-count"];
  const total = header === undefined ? items.length : Number(header);
  return { items, total: Number.isFinite(total) ? total : items.length };
};

/** Один контракт по id — карточке не нужен весь реестр организации. */
const fetchContractById = async (
  contractId: string | number,
): Promise<ContractRegistryItem> => {
  const response = await api.get(
    `${CONTRACTS_ENDPOINT}/${String(contractId)}`,
  );
  return ContractRegistryItemSchema.parse(response.data);
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
  const response = await api.patch(
    `${CONTRACTS_ENDPOINT}/${id}`,
    omitEmptyReferences(data),
  );
  return ContractRegistryItemSchema.parse(response.data);
};

const deleteContract = async (
  id: string | number,
): Promise<string | number> => {
  await api.delete(`${CONTRACTS_ENDPOINT}/${id}`);
  return id;
};

/**
 * Номер реестровой записи пользователь вводит с клавиатуры или копирует из ЕИС,
 * поэтому убираем пробелы (в т.ч. неразрывный), дефисы и неразрывные переносы.
 * Сам номер при этом не меняем — сравнение остаётся по фактическим символам.
 */
export const normalizeContractNumber = (value: string): string =>
  value.replace(/[\s\u00A0\u2116-]/g, "");

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
 * Поиск по фрагменту номера (`_like` в json-server) — спасает, когда ввели
 * не весь номер или ошиблись в его конце. Фильтр по организации сохраняется.
 */
const fetchContractsByNumberPart = async (
  contractNumberPart: string,
  organizationId?: string | number,
): Promise<ContractRegistryItem[]> => {
  const response = await api.get(CONTRACTS_ENDPOINT, {
    params: {
      contractNumber_like: contractNumberPart,
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
 * Порядок поиска: точное совпадение среди своих → свой контракт по фрагменту
 * номера → чужие контракты (только чтобы отличить «нет в реестре» от «контракт
 * другого заказчика», его сведения не возвращаются). Разграничение по
 * организации выполняется на уровне запроса.
 */
export const lookupContractByNumber = async (
  contractNumber: string,
  organizationId: string | number,
): Promise<ContractLookup> => {
  const needle = normalizeContractNumber(contractNumber);

  const ownExact = await fetchContractsByNumber(needle, organizationId);
  if (ownExact.length > 0) {
    return {
      contract: pickLatestContract(ownExact),
      matchedBy: "exact",
      anotherOrganization: false,
    };
  }

  const ownPart = await fetchContractsByNumberPart(needle, organizationId);
  if (ownPart.length > 0) {
    return {
      contract: pickLatestContract(ownPart),
      matchedBy: "partial",
      anotherOrganization: false,
    };
  }

  const foreignExact = await fetchContractsByNumber(needle);
  if (foreignExact.length > 0) {
    return { contract: null, matchedBy: null, anotherOrganization: true };
  }

  const foreignPart = await fetchContractsByNumberPart(needle);
  return {
    contract: null,
    matchedBy: null,
    anotherOrganization: foreignPart.length > 0,
  };
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
  const response = await api.patch(
    `${STAGES_ENDPOINT}/${id}`,
    omitEmptyReferences(data),
  );
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
  const response = await api.patch(
    `${PAYMENTS_ENDPOINT}/${id}`,
    omitEmptyReferences(data),
  );
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
  const response = await api.patch(
    `${PENALTIES_ENDPOINT}/${id}`,
    omitEmptyReferences(data),
  );
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
  const response = await api.patch(
    `${DELIVERIES_ENDPOINT}/${id}`,
    omitEmptyReferences(data),
  );
  return ContractDeliverySchema.parse(response.data);
};

const deleteDelivery = async (
  id: string | number,
): Promise<string | number> => {
  await api.delete(`${DELIVERIES_ENDPOINT}/${id}`);
  return id;
};

// ─── Чекпоинты процесса (Tasks 8 п. 2 б) ───────────────────────────────────

const fetchEventsByContract = async (
  contractId: string | number,
): Promise<ContractEvent[]> => {
  const response = await api.get(EVENTS_ENDPOINT, {
    params: { contractId },
  });
  return ContractEventListSchema.parse(response.data);
};

const createEvent = async (event: ContractEvent): Promise<ContractEvent> => {
  const response = await api.post(EVENTS_ENDPOINT, omitEmptyReferences(event));
  return ContractEventSchema.parse(response.data);
};

const updateEvent = async ({
  id,
  ...data
}: {
  id: string | number;
} & Partial<ContractEvent>): Promise<ContractEvent> => {
  const response = await api.patch(
    `${EVENTS_ENDPOINT}/${id}`,
    omitEmptyReferences(data),
  );
  return ContractEventSchema.parse(response.data);
};

const deleteEvent = async (id: string | number): Promise<string | number> => {
  await api.delete(`${EVENTS_ENDPOINT}/${id}`);
  return id;
};

// ─── Хуки ───────────────────────────────────────────────────────────────────

export const contractRegistryQueryKey = ["contractRegistry"];

// ─── Ключи кэша ─────────────────────────────────────────────────────────────
// Точечные ключи нужны, чтобы мутация одной сущности не перезагружала весь
// реестр: раньше любое сохранение инвалидировало contractRegistryQueryKey
// целиком — контракты, этапы, платежи, неустойки, поставки и события сразу.

const contractsKey = [...contractRegistryQueryKey, "contracts"] as const;

const contractKey = (contractId: string | number) =>
  [...contractRegistryQueryKey, "contract", String(contractId)] as const;

const stagesKey = (contractId: string | number) =>
  [...contractRegistryQueryKey, "stages", String(contractId)] as const;

const paymentsKey = (contractId: string | number) =>
  [...contractRegistryQueryKey, "payments", String(contractId)] as const;

const penaltiesKey = (contractId: string | number) =>
  [...contractRegistryQueryKey, "penalties", String(contractId)] as const;

const deliveriesKey = (contractId: string | number) =>
  [...contractRegistryQueryKey, "deliveries", String(contractId)] as const;

const eventsKey = (contractId: string | number) =>
  [...contractRegistryQueryKey, "events", String(contractId)] as const;

const allStagesKey = [...contractRegistryQueryKey, "stages", "all"] as const;
const allPaymentsKey = [...contractRegistryQueryKey, "payments", "all"] as const;
const allPenaltiesKey = [...contractRegistryQueryKey, "penalties", "all"] as const;

/**
 * Предзагрузка карточки контракта по наведению на строку реестра. Запрос
 * уходит в тот же ключ, что у `useContractById`, поэтому открытие карточки
 * сразу получает данные из кэша.
 */
export const prefetchContract = (
  queryClient: QueryClient,
  contractId: string | number,
): Promise<void> =>
  queryClient.prefetchQuery({
    queryKey: contractKey(contractId),
    queryFn: () => fetchContractById(contractId),
    staleTime: 60_000,
  });

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

/**
 * Реестр для списка: первая порция — только пагинальные строки, остальные
 * догружаются по мере необходимости (`loadMore` / `loadAll`).
 *
 * Полный список по-прежнему отдаёт `useContractRegistry`: он нужен отчётам,
 * дашборду и формам, где реестр читается целиком. Здесь же ключ кэша другой
 * (`…/rows`), поэтому два режима не мешают друг другу.
 */
export const useContractRegistryRows = (
  organizationId: string | number | undefined,
) => {
  const query = useInfiniteQuery({
    queryKey: [
      ...contractRegistryQueryKey,
      "contracts",
      String(organizationId),
      "rows",
    ],
    queryFn: ({ pageParam }) =>
      fetchContractsPortion(
        organizationId as string | number,
        pageParam,
        CONTRACT_REGISTRY_PAGE_SIZE,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return lastPage.items.length > 0 && loaded < lastPage.total
        ? pages.length + 1
        : undefined;
    },
    // Смена организации не должна схлопывать список в полноэкранный лоадер:
    // старые строки остаются на месте, пока не пришла первая порция новой.
    placeholderData: keepPreviousData,
    enabled: Boolean(organizationId),
  });

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const contracts = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.items),
    [data],
  );
  const total = data?.pages[0]?.total ?? 0;

  /** Догрузить одну порцию; повторный вызов во время загрузки игнорируется. */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /**
   * Догрузить реестр до конца — когда пользователь явно попросил весь список
   * («Все» в масштабе страницы, пустое состояние, кнопка «Загрузить остальные»).
   * Ограничение по числу шагов — страховка от бесконечного цикла, если сервер
   * отдаёт пустые порции.
   */
  const loadAll = useCallback(async (): Promise<void> => {
    for (let guard = 0; guard < 500; guard += 1) {
      if (!hasNextPage || isFetchingNextPage) return;
      const result = await fetchNextPage();
      if (!result.hasNextPage || result.isError) return;
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /**
   * Догрузить порции, пока загруженных строк не станет не меньше `rows`
   * (или реестр не кончится). Нужно пейджеру: прыжок на дальнюю страницу
   * не должен показывать пустую таблицу, пока строка не прочитана.
   */
  const loadUntil = useCallback(
    async (rows: number): Promise<void> => {
      const countRows = (pages?: typeof data) =>
        (pages?.pages ?? []).reduce((sum, page) => sum + page.items.length, 0);

      let loaded = countRows(data);
      let hasNext = Boolean(hasNextPage);
      for (let guard = 0; guard < 500 && hasNext && loaded < rows; guard += 1) {
        const result = await fetchNextPage();
        if (result.isError) return;
        hasNext = Boolean(result.hasNextPage);
        loaded = countRows(result.data);
      }
    },
    [data, hasNextPage, fetchNextPage],
  );

  return {
    ...query,
    contracts,
    total,
    loaded: contracts.length,
    hasMore: Boolean(hasNextPage),
    loadMore,
    loadAll,
    loadUntil,
  };
};

/**
 * Инвалидирует только затронутую ветку кэша. Если у сущности нет contractId
 * (удаление по id), обновляется вся ветка типа, но не весь реестр.
 */
const invalidateScoped = (
  queryClient: QueryClient,
  scope: string,
  contractId: string | number | null | undefined,
  allKey: readonly unknown[],
): void => {
  if (contractId === undefined || contractId === null || contractId === "") {
    void queryClient.invalidateQueries({
      queryKey: [...contractRegistryQueryKey, scope],
    });
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: [...contractRegistryQueryKey, scope, String(contractId)],
  });
  void queryClient.invalidateQueries({ queryKey: allKey });
};

/** Один контракт по id: карточка не тянет весь реестр организации. */
export const useContractById = (contractId: string | number | undefined) =>
  useQuery({
    queryKey: contractKey(contractId as string | number),
    queryFn: () => fetchContractById(contractId as string | number),
    enabled: Boolean(contractId),
    // Карточка по id либо есть, либо нет: повторять запрос к 404 незачем,
    // иначе «Контракт не найден» показывался бы через три таймаута
    retry: false,
  });

export const useCreateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContract,
    onSuccess: (contract) => {
      void qc.invalidateQueries({ queryKey: contractsKey });
      if (contract.id !== undefined && contract.id !== null) {
        void qc.invalidateQueries({ queryKey: contractKey(contract.id) });
      }
    },
  });
};

export const useUpdateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateContract,
    onSuccess: (contract) => {
      void qc.invalidateQueries({ queryKey: contractsKey });
      if (contract.id !== undefined && contract.id !== null) {
        void qc.invalidateQueries({ queryKey: contractKey(contract.id) });
      }
    },
  });
};

export const useDeleteContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContract,
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: contractsKey });
      void qc.invalidateQueries({ queryKey: contractKey(id) });
    },
  });
};

// Этапы
export const useContractStages = (contractId: string | number | undefined) =>
  useQuery({
    queryKey: stagesKey(contractId as string | number),
    queryFn: () => fetchStagesByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

export const useCreateStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStage,
    onSuccess: (stage) => invalidateScoped(qc, "stages", stage.contractId, allStagesKey),
  });
};

export const useUpdateStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateStage,
    onSuccess: (stage) => invalidateScoped(qc, "stages", stage.contractId, allStagesKey),
  });
};

export const useDeleteStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteStage,
    onSuccess: () => invalidateScoped(qc, "stages", null, allStagesKey),
  });
};

// Платежи
export const useContractPayments = (contractId: string | number | undefined) =>
  useQuery({
    queryKey: paymentsKey(contractId as string | number),
    queryFn: () => fetchPaymentsByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

/** Компактная сводка оплаты: количество документов и уплаченная сумма. */
export interface ContractPaymentsSummary {
  count: number;
  /** Сумма в том же строковом виде, что и `totalPaid` (деньги не теряют точность). */
  paid: string;
}

const selectPaymentsSummary = (
  payments: ContractPayment[],
): ContractPaymentsSummary => ({
  count: payments.length,
  paid: totalPaid(payments),
});

/**
 * Сводка по платежам для реестра и карточки: запрос тот же, что у
 * `useContractPayments`, но в компонент попадают только два числа. Селектор
 * стабилен по ссылке, поэтому сумма пересчитывается лишь при изменении данных,
 * а не на каждом рендере строки реестра.
 */
export const useContractPaymentsSummary = (
  contractId: string | number | undefined,
) =>
  useQuery({
    queryKey: paymentsKey(contractId as string | number),
    queryFn: () => fetchPaymentsByContract(contractId as string | number),
    enabled: Boolean(contractId),
    select: selectPaymentsSummary,
  });

export const useCreatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: (payment) =>
      invalidateScoped(qc, "payments", payment.contractId, allPaymentsKey),
  });
};

export const useUpdatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updatePayment,
    onSuccess: (payment) =>
      invalidateScoped(qc, "payments", payment.contractId, allPaymentsKey),
  });
};

export const useDeletePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePayment,
    onSuccess: () => invalidateScoped(qc, "payments", null, allPaymentsKey),
  });
};

// Неустойки
export const useContractPenalties = (contractId: string | number | undefined) =>
  useQuery({
    queryKey: penaltiesKey(contractId as string | number),
    queryFn: () => fetchPenaltiesByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

export const useCreatePenalty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPenalty,
    onSuccess: (penalty) =>
      invalidateScoped(qc, "penalties", penalty.contractId, allPenaltiesKey),
  });
};

export const useUpdatePenalty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updatePenalty,
    onSuccess: (penalty) =>
      invalidateScoped(qc, "penalties", penalty.contractId, allPenaltiesKey),
  });
};

export const useDeletePenalty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePenalty,
    onSuccess: () => invalidateScoped(qc, "penalties", null, allPenaltiesKey),
  });
};

// Поставки
export const useContractDeliveries = (
  contractId: string | number | undefined,
) =>
  useQuery({
    queryKey: deliveriesKey(contractId as string | number),
    queryFn: () => fetchDeliveriesByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

export const useCreateDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createDelivery,
    onSuccess: (delivery) =>
      invalidateScoped(qc, "deliveries", delivery.contractId, []),
  });
};

export const useUpdateDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateDelivery,
    onSuccess: (delivery) =>
      invalidateScoped(qc, "deliveries", delivery.contractId, []),
  });
};

export const useDeleteDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteDelivery,
    onSuccess: () => invalidateScoped(qc, "deliveries", null, []),
  });
};

// Чекпоинты процесса
export const useContractEvents = (contractId: string | number | undefined) =>
  useQuery({
    queryKey: eventsKey(contractId as string | number),
    queryFn: () => fetchEventsByContract(contractId as string | number),
    enabled: Boolean(contractId),
  });

export const useCreateContractEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: (event) =>
      invalidateScoped(qc, "events", event.contractId, []),
  });
};

export const useUpdateContractEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateEvent,
    onSuccess: (event) =>
      invalidateScoped(qc, "events", event.contractId, []),
  });
};

export const useDeleteContractEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => invalidateScoped(qc, "events", null, []),
  });
};

// Все этапы, платежи и неустойки (для сводных отчётов, мониторинга сроков и дашборда)
export const useAllContractStages = (enabled = true) =>
  useQuery({
    queryKey: [...contractRegistryQueryKey, "stages", "all"],
    queryFn: async (): Promise<ContractStage[]> => {
      const response = await api.get(STAGES_ENDPOINT);
      return ContractStageListSchema.parse(response.data ?? []);
    },
    enabled,
  });

export const useAllContractPayments = (enabled = true) =>
  useQuery({
    queryKey: [...contractRegistryQueryKey, "payments", "all"],
    queryFn: async (): Promise<ContractPayment[]> => {
      const response = await api.get(PAYMENTS_ENDPOINT);
      return ContractPaymentListSchema.parse(response.data ?? []);
    },
    enabled,
  });

export const useAllContractPenalties = (enabled = true) =>
  useQuery({
    queryKey: [...contractRegistryQueryKey, "penalties", "all"],
    queryFn: async (): Promise<ContractPenalty[]> => {
      const response = await api.get(PENALTIES_ENDPOINT);
      return ContractPenaltyListSchema.parse(response.data ?? []);
    },
    enabled,
  });
