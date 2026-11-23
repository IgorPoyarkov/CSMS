import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  readReferenceItems,
  referenceApi,
  type ReferenceItemInfo,
} from "../Eis/referenceData.api";
import {
  KTRU_VALUE_TYPES,
  KtruRefListSchema,
  type KtruCharacteristic,
  type KtruRef,
  type KtruValueType,
} from "./ktruRef.schema";

/**
 * Позиция снимка НСИ → форма справочника КТРУ. Экспортируется, чтобы
 * серверные выборки (`useKtruByOkpd2`, `useKtruSearch`) отдавали тот же
 * тип, что и полный каталог из `useKtruDictionary`.
 */

/** Строка characteristics из payload НСИ → характеристика справочника КТРУ. */
const ktruCharacteristicFromRaw = (
  raw: unknown,
  code: string,
  index: number,
): KtruCharacteristic | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.name !== "string" || !row.name.trim()) return null;

  const valueType = KTRU_VALUE_TYPES.find((type) => type === row.valueType);
  const text = (key: string) =>
    typeof row[key] === "string" && (row[key] as string).trim()
      ? (row[key] as string)
      : undefined;

  return {
    id: `${code}-char-${index}`,
    name: row.name,
    unit: text("unit"),
    valueType: (valueType ?? "text") as KtruValueType,
    valueText: text("valueText") ?? text("value"),
    minValue: text("minValue"),
    maxValue: text("maxValue"),
    // В снимке ЕИС обязательность может отсутствовать: по ПП 145
    // характеристики позиции считаем обязательными по умолчанию.
    isMandatory: typeof row.isMandatory === "boolean" ? row.isMandatory : true,
    instruction: text("instruction"),
    characteristicsFillingInstructionCode: (() => {
      const ref = row.characteristicsFillingInstruction;
      if (typeof ref === "string") return ref;
      if (ref && typeof ref === "object") {
        const code = (ref as Record<string, unknown>).code;
        return typeof code === "string" && code.trim() ? code : undefined;
      }
      return undefined;
    })(),
  };
};

export const ktruFromReferenceItem = (
  item: ReferenceItemInfo,
): KtruRef | null => {
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
      const characteristic = ktruCharacteristicFromRaw(raw, code, index);
      return characteristic ? [characteristic] : [];
    }),
    note:
      typeof payload.actualTo === "string" && payload.actualTo
        ? `Действует до ${payload.actualTo}`
        : undefined,
  };
};

/**
 * Справочник ЕИС «Инструкции по заполнению характеристик в заявке»
 * (nsiCharacteristicsFillingInstructions). Код берётся из характеристики
 * КТРУ, текст — из активной версии справочника, а не генерируется локально.
 */
export const useCharacteristicsFillingInstructions = () =>
  useQuery<Record<string, string>>({
    queryKey: ["characteristicsFillingInstructions"],
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const byCode: Record<string, string> = {};
      try {
        const { data } = await referenceApi.get(
          "/api/references/nsiCharacteristicsFillingInstructions/items",
          { params: { take: 500 } },
        );
        for (const item of readReferenceItems(data)) {
          let name = item.name ?? "";
          try {
            const payload = item.payloadJson ? JSON.parse(item.payloadJson) : {};
            if (typeof payload.name === "string" && payload.name.trim()) {
              name = payload.name;
            }
          } catch {
            // Оставляем имя из самой записи справочника.
          }
          if (name) byCode[item.code] = name;
        }
      } catch {
        // Справочник не импортирован — поле останется без текста из ЕИС.
      }
      return byCode;
    },
  });

/**
 * Справочник КТРУ: основной источник — активный снимок НСИ в PostgreSQL,
 * локальный db.json остаётся оверлеем для позиций, которых нет в снимке.
 * Если API недоступен, формы продолжают работать на локальных данных.
 */
export const useKtruDictionary = (enabled = true) =>
  useQuery<KtruRef[]>({
    queryKey: ["ktruRefs"],
    enabled,
    queryFn: async () => {
      const merged = new Map<string, KtruRef>();

      try {
        // /nsiKTRU/all не отдаёт payloadJson, а он нужен для единицы измерения
        // и характеристик; /items отдаёт не больше 500 записей за запрос,
        // поэтому обходим страницы, пока не вернётся короткая выдача.
        const pageSize = 500;
        for (let skip = 0; skip < 5000; skip += pageSize) {
          const { data } = await referenceApi.get(
            "/api/references/nsiKTRU/items",
            { params: { take: pageSize, skip } },
          );
          const page = readReferenceItems(data);
          for (const reference of page) {
            const item = ktruFromReferenceItem(reference);
            if (item) merged.set(item.ktruCode, item);
          }
          if (page.length < pageSize) break;
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

/**
 * Позиции КТРУ одного кода ОКПД2 — серверная выборка по `parentCode`.
 *
 * Выпадающему списку в таблице позиций не нужен весь каталог (до 5 000
 * записей, 10 страниц по 500): у одного ОКПД2 обычно десятки позиций.
 * `take: 200` покрывает такие группы с запасом.
 */
export const useKtruByOkpd2 = (okpd2Code: string | undefined) =>
  useQuery<KtruRef[]>({
    queryKey: ["ktruByOkpd2", okpd2Code ?? ""],
    enabled: Boolean(okpd2Code),
    staleTime: 60 * 60 * 1000,
    retry: 0,
    // Переключение между кодами ОКПД2 не должно обнулять список на мгновение
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const { data } = await referenceApi.get("/api/references/nsiKTRU/items", {
        params: { parentCode: okpd2Code, take: 200 },
        signal,
      });

      return readReferenceItems(data)
        .map(ktruFromReferenceItem)
        .filter((item): item is KtruRef => item !== null);
    },
  });

/**
 * Серверный поиск КТРУ по коду или наименованию — для витрин и подсказок,
 * которым не нужен полный каталог. Пустой запрос возвращает начало каталога
 * (как раньше вёл себя клиентский `searchKtru`).
 */
export const useKtruSearch = (query: string, limit = 20) => {
  const search = query.trim();

  return useQuery<KtruRef[]>({
    queryKey: ["ktruSearch", search, limit],
    staleTime: 10 * 60_000,
    retry: 0,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const { data } = await referenceApi.get("/api/references/nsiKTRU/items", {
        params: { search: search || undefined, take: limit },
        signal,
      });

      return readReferenceItems(data)
        .map(ktruFromReferenceItem)
        .filter((item): item is KtruRef => item !== null);
    },
  });
};

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
