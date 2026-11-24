import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  SmpInnLookupResponseSchema,
  SmpInnLookupSchema,
  SmpRegistryListSchema,
  type SmpInnLookup,
  type SmpRegistryEntry,
} from "./smpRegistry.schema";

/** Путь точечной сверки в адаптере PG (`scripts/pg-json-server.mjs`). */
const CHECK_ENDPOINT = "/__smp/check";

export const smpRegistryQueryKey = ["smpRegistry"];

/**
 * Результаты сверок по ИНН. Справочник больше не полный перечень реестра, а
 * ответы сервиса ФНС по конкретным поставщикам, поэтому кэш короткий: записи
 * обновляет точечная проверка, а не выгрузка.
 */
export const useSmpRegistry = () =>
  useQuery<SmpRegistryEntry[]>({
    queryKey: smpRegistryQueryKey,
    queryFn: async () => {
      const { data } = await api.get("/smpRegistry");
      return SmpRegistryListSchema.parse(data ?? []);
    },
    staleTime: 5 * 60 * 1000,
    // Справочник наполняется разовыми сверками — повторять запрос незачем
    retry: 0,
  });

/**
 * Сверка ИНН с реестром МСП: спрашивает сервис ФНС и сохраняет ответ.
 *
 * Один ИНН — форма субподрядчика (проверка при вводе), несколько — сверка всех
 * коммерческих предложений одной кнопкой. Ответ приходит сразу: «в реестре
 * (категория)», «не в реестре», «исключён», «ИНН некорректен» или «сервис
 * недоступен» — последний вердиктом не считается.
 */
export const useSmpInnCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inns: string | string[]): Promise<SmpInnLookup[]> => {
      const list = (Array.isArray(inns) ? inns : [inns]).filter(Boolean);
      if (list.length === 1) {
        const { data } = await api.get(CHECK_ENDPOINT, {
          params: { inn: list[0] },
        });
        return [SmpInnLookupSchema.parse(data)];
      }

      const { data } = await api.post(CHECK_ENDPOINT, { inns: list });
      return SmpInnLookupResponseSchema.parse(data).results;
    },
    onSuccess: () => {
      // Сохранённые ответы меняют вердикты в таблицах и форме
      void queryClient.invalidateQueries({ queryKey: smpRegistryQueryKey });
    },
  });
};
