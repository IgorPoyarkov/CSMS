import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { KoksRefListSchema, type KoksRef } from "./koksRef.schema";

export type { KoksRef };
export { searchKoks, findKoksByCode } from "./koksRef.schema";

/**
 * Справочник КОКС (nsiKOKS — Классификатор объектов капитального
 * строительства). Как и ОКПД2, записи общие для всех заказчиков и почти не
 * меняются: справочник загружается один раз и кэшируется, поиск по коду и
 * наименованию выполняется на клиенте (см. searchKoks).
 *
 * Источник — справочник ЕИС nsiKOKS; в бэкенде хранится снимок в коллекции
 * `koksRefs`, который пополняется выгрузкой из ЕИС.
 */
export const useKoksDictionary = () =>
  useQuery<KoksRef[]>({
    queryKey: ["koksRefs"],
    queryFn: async () => {
      const { data } = await api.get("/koksRefs");
      return KoksRefListSchema.parse(data);
    },
    staleTime: 60 * 60 * 1000,
    // Снимок справочника не меняется: повтор не ускорит появление данных
    retry: 0,
  });
