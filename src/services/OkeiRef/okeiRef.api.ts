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

const okeiUnit = (
  code: string,
  name: string,
  symbolRu: string,
  symbolEn = "",
  synonyms: string[] = [],
): OkeiUnit => ({
  code,
  name,
  symbolRu,
  symbolEn,
  section: "",
  group: "",
  synonyms,
});

/**
 * Локальный снимок часто используемых в закупках единиц ОКЕИ.
 *
 * Публичный API через /api/okei в рабочем контуре недоступен (404), поэтому
 * без снимка выпадающий список оставался пустым и заказчик не мог выбрать
 * реальную единицу измерения. Снимок не заменяет полный справочник: если API
 * отвечает, его записи объединяются с локальным снимком.
 */
const FALLBACK_OKEI_UNITS: OkeiUnit[] = [
  okeiUnit("796", "Штука", "шт", "pc", ["штука", "шт"]),
  okeiUnit("876", "Условная единица", "усл. ед", "", ["условная единица"]),
  okeiUnit("839", "Комплект", "компл", "", ["комплект"]),
  okeiUnit("778", "Упаковка", "упак", "", ["упаковка"]),
  okeiUnit("166", "Килограмм", "кг", "kg", ["килограмм"]),
  okeiUnit("163", "Грамм", "г", "g", ["грамм"]),
  okeiUnit("168", "Тонна", "т", "t", ["тонна"]),
  okeiUnit("112", "Литр", "л", "l", ["литр"]),
  okeiUnit("006", "Метр", "м", "m", ["метр"]),
  okeiUnit("005", "Километр", "км", "km", ["километр"]),
  okeiUnit("004", "Сантиметр", "см", "cm", ["сантиметр"]),
  okeiUnit("003", "Миллиметр", "мм", "mm", ["миллиметр"]),
  okeiUnit("055", "Квадратный метр", "м2", "m2", ["квадратный метр"]),
  okeiUnit("113", "Кубический метр", "м3", "m3", ["кубический метр"]),
  okeiUnit("356", "Час", "ч", "h", ["час"]),
  okeiUnit("359", "Сутки", "сут", "", ["сутки", "день"]),
  okeiUnit("362", "Месяц", "мес", "", ["месяц"]),
  okeiUnit("212", "Ватт", "Вт", "W", ["ватт"]),
  okeiUnit("214", "Киловатт", "кВт", "kW", ["киловатт"]),
  okeiUnit("383", "Рубль", "руб", "", ["рубль", "руб."]),
  okeiUnit("384", "Тысяча рублей", "тыс. руб", "", ["тысяча рублей"]),
];

const mergeOkeiUnits = (...lists: OkeiUnit[][]): OkeiUnit[] =>
  Array.from(
    new Map(lists.flat().map((unit) => [unit.code, unit])).values(),
  );

/**
 * Справочник единиц измерения ОКЕИ: локальный снимок плюс данные публичного
 * API через /api/okei, если он доступен. Статичен, поэтому кэшируется на час.
 */
export const useOkeiDictionary = () =>
  useQuery<OkeiUnit[]>({
    queryKey: ["okeiRefs"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/okei");
        return mergeOkeiUnits(FALLBACK_OKEI_UNITS, OkeiUnitListSchema.parse(data));
      } catch {
        // API НСИ в контуре недоступен — работаем на локальном снимке,
        // иначе селект единиц измерения остаётся пустым.
        return FALLBACK_OKEI_UNITS;
      }
    },
    staleTime: 60 * 60 * 1000,
    // Официальный справочник статичен: одна неудачная попытка — достаточно
    retry: 0,
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
