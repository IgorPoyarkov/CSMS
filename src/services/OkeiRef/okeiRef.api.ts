import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { OkeiUnitListSchema, type OkeiUnit } from "./okeiRef.schema";

export const OKEI_LIMIT = 40;

// Часто используемые в закупках коды ОКЕИ показываем первыми при пустом поиске
const PRIORITY_OKEI_CODES = [
  "796", // Штука (шт)
  "876", // Условная единица (усл. ед)
  "839", // Комплект (компл)
  "778", // Упаковка (упак)
  "166", // Килограмм (кг)
  "163", // Грамм (г)
  "168", // Тонна (т)
  "112", // Литр (л)
  "006", // Метр (м)
  "003", // Миллиметр (мм)
  "055", // Квадратный метр (м2)
  "113", // Кубический метр (м3)
  "356", // Час (ч)
  "359", // Сутки (сут)
  "362", // Месяц (мес)
  "212", // Ватт (Вт)
  "214", // Киловатт (кВт)
];

const priorityRank = new Map<string, number>(
  PRIORITY_OKEI_CODES.map((code, idx) => [code, idx]),
);

/**
 * Справочник единиц измерения ОКЕИ, получаемый из публичного API через /api/okei.
 * Справочник содержит ~543 записи и практически неизменен, поэтому кэшируется на час.
 */
export const useOkeiDictionary = () =>
  useQuery<OkeiUnit[]>({
    queryKey: ["okeiRefs"],
    queryFn: async () => {
      const { data } = await api.get("/okei");
      return OkeiUnitListSchema.parse(data);
    },
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

const normalize = (value: string) =>
  value.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/**
 * Клиентский поиск по коду ОКЕИ, условному обозначению (рус./межд.),
 * наименованию, группе и синонимам.
 */
export const searchOkei = (
  dictionary: OkeiUnit[],
  query: string,
  limit = OKEI_LIMIT,
): OkeiUnit[] => {
  const needle = normalize(query);

  if (!needle) {
    const prioritized = [...dictionary].sort((a, b) => {
      const ra = priorityRank.get(a.code) ?? Number.MAX_SAFE_INTEGER;
      const rb = priorityRank.get(b.code) ?? Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return a.code.localeCompare(b.code);
    });
    return prioritized.slice(0, limit);
  }

  const exact: OkeiUnit[] = [];
  const starts: OkeiUnit[] = [];
  const contains: OkeiUnit[] = [];

  for (const item of dictionary) {
    const code = normalize(item.code);
    const name = normalize(item.name);
    const symbolRu = normalize(item.symbolRu);
    const symbolEn = normalize(item.symbolEn);
    const group = normalize(item.group);
    const syns = item.synonyms.map(normalize);

    if (code === needle || symbolRu === needle || name === needle) {
      exact.push(item);
    } else if (
      code.startsWith(needle) ||
      symbolRu.startsWith(needle) ||
      name.startsWith(needle) ||
      symbolEn.startsWith(needle)
    ) {
      starts.push(item);
    } else if (
      code.includes(needle) ||
      symbolRu.includes(needle) ||
      name.includes(needle) ||
      symbolEn.includes(needle) ||
      group.includes(needle) ||
      syns.some((s) => s.includes(needle))
    ) {
      contains.push(item);
    }
  }

  return [...exact, ...starts, ...contains].slice(0, limit);
};

/**
 * Поиск позиции ОКЕИ по сохранённому строковому значению
 * (условное обозначение «шт», наименование «Штука» или код «796»).
 */
export const findOkeiByValue = (
  dictionary: OkeiUnit[],
  value: string | undefined,
): OkeiUnit | undefined => {
  if (!value) {
    return undefined;
  }

  const needle = normalize(value);
  if (!needle) {
    return undefined;
  }

  return (
    dictionary.find((item) => normalize(item.code) === needle) ??
    dictionary.find((item) => normalize(item.symbolRu) === needle) ??
    dictionary.find((item) => normalize(item.name) === needle) ??
    dictionary.find((item) => normalize(item.symbolEn) === needle)
  );
};
