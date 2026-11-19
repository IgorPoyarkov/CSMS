import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { KtruRefListSchema, type KtruRef } from "./ktruRef.schema";

/**
 * Справочник КТРУ, который отдаёт бэкенд.
 *
 * Как и ОКПД2, справочник общий и меняется редко — кэшируется на час.
 * Если коллекция ещё не заведена на стенде (404) или бэкенд недоступен,
 * возвращается пустой список: отсутствие КТРУ не должно блокировать
 * заполнение служебной записки или извещения.
 */
export const useKtruDictionary = () =>
  useQuery<KtruRef[]>({
    queryKey: ["ktruRefs"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/ktruRefs");
        return KtruRefListSchema.parse(data);
      } catch {
        return [];
      }
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const KTRU_LIMIT = 30;

/**
 * Поиск позиций КТРУ по коду и наименованию. Если передан код ОКПД2,
 * выдача ограничивается позициями этого кода — в таблице позиций
 * заказчику показываются только допустимые варианты каталога.
 */
export const searchKtru = (
  dictionary: KtruRef[],
  query: string,
  okpd2Code?: string,
  limit = KTRU_LIMIT,
): KtruRef[] => {
  const needle = normalize(query);
  const scoped = okpd2Code
    ? dictionary.filter(
        (item) => normalize(item.okpd2Code) === normalize(okpd2Code),
      )
    : dictionary;

  if (!needle) {
    return scoped.slice(0, limit);
  }

  const starts: KtruRef[] = [];
  const contains: KtruRef[] = [];

  for (const item of scoped) {
    const code = normalize(item.ktruCode);
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

/** Позиция КТРУ по коду */
export const findKtruByCode = (
  dictionary: KtruRef[],
  ktruCode: string | undefined,
): KtruRef | undefined => {
  if (!ktruCode) return undefined;
  const needle = normalize(ktruCode);
  return dictionary.find((item) => normalize(item.ktruCode) === needle);
};

/** Позиции КТРУ, привязанные к коду ОКПД2 */
export const findKtruByOkpd2 = (
  dictionary: KtruRef[],
  okpd2Code: string | undefined,
): KtruRef[] => {
  if (!okpd2Code) return [];
  const needle = normalize(okpd2Code);
  return dictionary.filter((item) => normalize(item.okpd2Code) === needle);
};
