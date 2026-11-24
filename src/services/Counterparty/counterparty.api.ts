import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { normalizeInn } from "../ContractSmp/smpRegistry.schema";
import { useSmpRegistry } from "../ContractSmp/smpRegistry.api";
import {
  CounterpartyListSchema,
  CounterpartySchema,
  withSmpVerdict,
  type Counterparty,
  type CounterpartyDraft,
  type CounterpartyWithSmp,
} from "./counterparty.schema";

const ENDPOINT = "/counterparties";

export const counterpartiesQueryKey = ["counterparties"];

const fetchCounterparties = async (): Promise<Counterparty[]> => {
  const { data } = await api.get(ENDPOINT);

  return CounterpartyListSchema.parse(data ?? []);
};

/**
 * Справочник контрагентов: реквизиты вводятся один раз, дальше формы берут их
 * по ИНН. Кэш короткий — карточки правят вручную, а не выгрузкой.
 */
export const useCounterparties = (enabled = true) =>
  useQuery<Counterparty[]>({
    queryKey: counterpartiesQueryKey,
    queryFn: fetchCounterparties,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

/**
 * Справочник вместе с вердиктом реестра МСП.
 *
 * Вердикт берётся из `smpRegistry` (ответ сервиса ФНС с датой сверки), а не
 * копируется в карточку: сверка обновляет одно место, и признак МСП не может
 * разойтись между справочником и результатами проверок.
 */
export const useCounterpartiesWithSmp = (enabled = true) => {
  const counterparties = useCounterparties(enabled);
  const registry = useSmpRegistry();

  const entries = registry.data ?? [];
  const data = (counterparties.data ?? [])
    .map((item) => withSmpVerdict(item, entries))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return {
    ...counterparties,
    data,
    isLoading: counterparties.isLoading || registry.isLoading,
  };
};

/**
 * Карточка по ИНН вместе с вердиктом реестра МСП — из уже загруженных
 * справочников, без отдельного запроса по каждому ИНН.
 */
export const useCounterpartyByInn = (inn?: string) => {
  const query = useCounterpartiesWithSmp();
  const digits = normalizeInn(inn);
  const counterparty = digits
    ? (query.data ?? []).find((item) => normalizeInn(item.inn) === digits)
    : undefined;

  return { ...query, counterparty };
};

/**
 * Сохранение карточки: ключ — ИНН.
 *
 * Формы вызывают одно и то же действие и когда контрагент выбран из списка
 * (дозаполнить реквизиты), и когда ИНН введён впервые. Существующая карточка
 * обновляется, новая создаётся; пустое наименование не затирает заполненное.
 */
export const useSaveCounterparty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CounterpartyDraft): Promise<Counterparty> => {
      const inn = normalizeInn(input.inn);
      const list = await queryClient.ensureQueryData({
        queryKey: counterpartiesQueryKey,
        queryFn: fetchCounterparties,
      });
      const existing = list.find((item) => normalizeInn(item.inn) === inn);
      const now = new Date().toISOString();

      if (existing?.id !== undefined && existing.id !== null) {
        const { data } = await api.patch(`${ENDPOINT}/${existing.id}`, {
          ...input,
          inn,
          name: input.name.trim() || existing.name,
          updatedAt: now,
        });

        return CounterpartySchema.parse(data);
      }

      const { data } = await api.post(ENDPOINT, {
        ...input,
        inn,
        createdAt: now,
        updatedAt: now,
      });

      return CounterpartySchema.parse(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: counterpartiesQueryKey });
    },
  });
};

/** Удаление карточки: справочник чистят вручную, когда поставщик заведён дважды. */
export const useDeleteCounterparty = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);

      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: counterpartiesQueryKey });
    },
  });
};

export type { Counterparty, CounterpartyWithSmp };
