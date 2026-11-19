import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { Okpd2RefListSchema, type Okpd2Ref } from "./okpd2Ref.schema";

export type { Okpd2Ref };

/**
 * Справочник ОКПД2. Записей много, но они общие для всех заказчиков и почти
 * не меняются, поэтому справочник загружается один раз и кэшируется, а поиск
 * по коду/наименованию выполняется на клиенте (см. searchOkpd2) — так выдача
 * появляется без задержки на каждый символ.
 */
export const useOkpd2Dictionary = () =>
  useQuery<Okpd2Ref[]>({
    queryKey: ["okpd2Refs"],
    queryFn: async () => {
      const { data } = await api.get("/okpd2Refs");
      return Okpd2RefListSchema.parse(data);
    },
    staleTime: 60 * 60 * 1000,
  });

// Сколько строк показываем в выдаче: полный список ОКПД2 в списке не нужен
export const OKPD2_LIMIT = 30;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Поиск по справочнику: подстрока ищется и в коде, и в наименовании.
 * Код приводится к «разделённому точками» виду, чтобы запрос вида «32 50 13»
 * находил код 32.50.13.190. Пустой запрос возвращает начало справочника.
 */
export const searchOkpd2 = (
  dictionary: Okpd2Ref[],
  query: string,
  limit = OKPD2_LIMIT,
): Okpd2Ref[] => {
  const needle = normalize(query);

  if (!needle) {
    return dictionary.slice(0, limit);
  }

  const starts: Okpd2Ref[] = [];
  const contains: Okpd2Ref[] = [];

  for (const item of dictionary) {
    const code = normalize(item.code);
    const name = normalize(item.name);

    if (code.startsWith(needle) || name.startsWith(needle)) {
      starts.push(item);
    } else if (code.includes(needle) || name.includes(needle)) {
      contains.push(item);
    }

    if (starts.length >= limit) {
      break;
    }
  }

  return [...starts, ...contains].slice(0, limit);
};

/**
 * Позиция справочника по коду. Нужна, чтобы по коду, уже сохранённому в
 * записи ПГ, восстановить признак обязательного нормирования и предельную
 * цену единицы (ПП РФ N 926 / N 1047).
 */
export const findOkpd2ByCode = (
  dictionary: Okpd2Ref[],
  code: string | undefined,
): Okpd2Ref | undefined => {
  if (!code) {
    return undefined;
  }

  const needle = normalize(code);

  return dictionary.find((item) => normalize(item.code) === needle);
};
