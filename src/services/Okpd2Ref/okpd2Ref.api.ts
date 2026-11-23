import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { readReferenceItems } from "../Eis/referenceData.api";
import {
  fetchNpaDirectRules,
  NPA_DOCUMENT_CODES,
  npaApi,
} from "../Npa/npa.api";
import {
  buildNpaRuleIndex,
  normingFlagFromRule,
  resolveIndexedNpaRule,
  setNpaDirectRules,
} from "../Npa/npaControl";
import { okpd2Signal } from "../../../scripts/lib/civil-law-core.mjs";
import { Okpd2RefListSchema, type Okpd2Ref } from "./okpd2Ref.schema";

export type { Okpd2Ref };

/**
 * Справочник ОКПД2 строится по официальному снимку НСИ из csms-api
 * (`/api/references/nsiOKPD2/all`, 21 066 записей). Признак обязательного
 * нормирования (`isNormed`) берётся из правил ПП РФ № 926, разобранных агентом;
 * локальная выборка `okpd2Refs` из db.json остаётся оверлеем заказчика
 * (`normLimit`, `nationalRegime`) и запасным источником, когда API НПА недоступен.
 *
 * Поиск выполняется на клиенте: выдача появляется без задержки на каждый
 * символ, а справочник и правила НПА кэшируются react-query на час.
 */
const SNAPSHOT_DATASET = "nsiOKPD2";

const normalizeCode = (code: string): string =>
  code.trim().replace(/,/g, ".").replace(/\s/g, "").replace(/^\.+|\.+$/g, "");

const fetchSnapshot = async (signal?: AbortSignal): Promise<Okpd2Ref[]> => {
  const { data } = await npaApi.get<unknown>(
    `/api/references/${SNAPSHOT_DATASET}/all`,
    { signal },
  );

  // Не отбрасываем буквенные разделы A–U: это тоже строки официального снимка,
  // и всего их 21 066 — ровно столько, сколько отдаёт API.
  return readReferenceItems(data)
    .filter((item) => item.code.trim().length > 0)
    .map((item) => ({
      code: item.code,
      name: item.name,
      isNormed: false,
      objectKind: okpd2Signal(item.code).kind,
    }));
};

/** Признаки нормирования и нацрежима пока живут только в локальной выборке. */
const fetchLocalFlags = async (signal?: AbortSignal): Promise<Okpd2Ref[]> => {
  try {
    const { data } = await api.get<unknown>("/okpd2Refs", { signal });
    return Okpd2RefListSchema.parse(data);
  } catch {
    // json-server не обязателен для формы: официальные коды уже загружены.
    return [];
  }
};

export const useOkpd2Dictionary = () =>
  useQuery<Okpd2Ref[]>({
    queryKey: ["okpd2Refs", SNAPSHOT_DATASET],
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async ({ signal }): Promise<Okpd2Ref[]> => {
      const [official, local, npaIndex] = await Promise.all([
        fetchSnapshot(signal),
        fetchLocalFlags(signal),
        Promise.all(
          Object.values(NPA_DOCUMENT_CODES).map(async (documentCode) =>
            [
              documentCode,
              await fetchNpaDirectRules(documentCode, signal),
            ] as const,
          ),
        ).then(
          (entries) => Object.fromEntries(entries),
          () => null,
        ),
      ]);

      // Публикуем индекс до отдачи справочника: после ререндера все синхронные
      // проверки (аукционный перечень, zod-схемы) увидят свежие правила НПА.
      // При недоступности NPA-сервиса остаётся исторический эталон 471-р.
      if (npaIndex) {
        setNpaDirectRules(npaIndex);
      }

      // Массовая разметка: 21 066 кодов × правила акта. Индекс по префиксу
      // убирает вложенный перебор и работает по тем же приоритетам, что и
      // серверный `/effective`.
      const normingRules = npaIndex?.[NPA_DOCUMENT_CODES.norming];
      const normingIndex = normingRules?.length
        ? buildNpaRuleIndex(normingRules)
        : null;
      const withNormingFlag = (item: Okpd2Ref): Okpd2Ref => {
        if (!normingIndex) {
          return item;
        }

        const flag = normingFlagFromRule(
          resolveIndexedNpaRule(
            NPA_DOCUMENT_CODES.norming,
            normingIndex,
            item.code,
          ),
        );

        // needs_review и conditional не меняют флаг: человек ещё не подтвердил
        // конкретную запись, поэтому остаётся локальное значение (если есть).
        return flag.isNormed === null ? item : { ...item, isNormed: flag.isNormed };
      };

      const localByCode = new Map(
        local.map((item) => [normalizeCode(item.code), item]),
      );
      const merged = official.map<Okpd2Ref>((item) => {
        const overlay = localByCode.get(normalizeCode(item.code));
        // Вид объекта пересчитываем из официального кода: локальный оверлей
        // хранит только признаки нормирования и нацрежима.
        const objectKind = okpd2Signal(item.code).kind;
        return withNormingFlag(
          overlay
            ? { ...overlay, code: item.code, name: item.name, objectKind }
            : { ...item, objectKind },
        );
      });

      // Коды берём только из официального снимка НСИ (21 066 записей):
      // локальная выборка db.json — лишь оверлей признаков для существующих
      // кодов, она не должна добавлять «лишние» позиции в справочник.
      return merged;
    },
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
 * Код приводится к «разделённому точкам» виду, чтобы запрос вида «32 50 13»
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
