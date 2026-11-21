import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  readReferenceItems,
  referenceApi,
  type ReferenceItemInfo,
} from "../Eis/referenceData.api";
import { KtruRefListSchema, type KtruRef } from "./ktruRef.schema";

/**
 * Перевод позиции НСИ в форму справочника КТРУ, которую используют формы.
 * Данные CHARACTERISTICS из печатной формы ЕИС сохраняются как текстовые
 * требования — их можно уточнить в карточке закупки, но код и наименование
 * из КТРУ подставляются автоматически.
 */
const fromReferenceItem = (item: ReferenceItemInfo): KtruRef | null => {
  let payload: Record<string, unknown> = {};
  try {
    payload = item.payloadJson ? JSON.parse(item.payloadJson) : {};
  } catch {
    payload = {};
  }

  const code =
    typeof payload.ktruCode === "string" ? payload.ktruCode : item.code;
  const okpd2Code =
    typeof payload.okpd2Code === "string"
      ? payload.okpd2Code
      : (item.parentCode ?? "");
  if (!code || !okpd2Code || !item.name) return null;

  const rawCharacteristics = Array.isArray(payload.characteristics)
    ? payload.characteristics
    : [];

  return {
    id: code,
    ktruCode: code,
    okpd2Code,
    name: item.name,
    unit: typeof payload.unit === "string" ? payload.unit : undefined,
    characteristics: rawCharacteristics.flatMap((raw, index) => {
      const row = raw as Record<string, unknown>;
      if (typeof row.name !== "string" || !row.name.trim()) return [];
      return [
        {
          id: `${code}-char-${index}`,
          name: row.name,
          valueType: "text" as const,
          valueText: typeof row.value === "string" ? row.value : undefined,
          isMandatory: true,
        },
      ];
    }),
    note:
      typeof payload.actualTo === "string" && payload.actualTo
        ? `Действует до ${payload.actualTo}`
        : undefined,
  };
};

/**
 * Справочник КТРУ: основной источник — активный снимок НСИ в PostgreSQL,
 * локальный db.json остаётся оверлеем для позиций, которых нет в снимке.
 * Если API недоступен, формы продолжают работать на локальных данных.
 */
export const useKtruDictionary = () =>
  useQuery<KtruRef[]>({
    queryKey: ["ktruRefs"],
    queryFn: async () => {
      const merged = new Map<string, KtruRef>();

      try {
        // /nsiKTRU/all не отдаёт payloadJson, а он нужен для единицы измерения
        // и характеристик; /items с большим take возвращает полные записи.
        const { data } = await referenceApi.get(
          "/api/references/nsiKTRU/items",
          { params: { take: 1000 } },
        );
        for (const reference of readReferenceItems(data)) {
          const item = fromReferenceItem(reference);
          if (item) merged.set(item.ktruCode, item);
        }
      } catch {
        // Снимок КТРУ не загружен — используем локальный оверлей.
      }

      try {
        const { data } = await api.get("/ktruRefs");
        for (const item of KtruRefListSchema.parse(data)) {
          if (!merged.has(item.ktruCode)) merged.set(item.ktruCode, item);
        }
      } catch {
        // json-server тоже может быть выключен — это не блокирует формы.
      }

      return [...merged.values()];
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
