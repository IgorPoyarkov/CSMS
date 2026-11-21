import { useQuery } from "@tanstack/react-query";
import {
  readReferenceItems,
  referenceApi,
} from "../Eis/referenceData.api";

/**
 * Справочник «Типы особых закупок для планов-графиков с 01.01.2020»
 * (nsiSpecialPurchases2020, Альбом ЕИС 17.0).
 *
 * Источник истины — снимок НСИ в csms-api. Пользователю показываем только
 * наименования, код хранится в данных для выгрузки в ЕИС. Пока официальный
 * датасет не импортирован, используется резервный перечень пунктов ч. 1
 * ст. 93 44-ФЗ с кодами того же формата (P<пункт>_1_93), что и у значений,
 * уже загруженных из ЕИС в планы-графики.
 */
export interface SpecialPurchaseType {
  code: string;
  name: string;
}

const DATASET = "nsiSpecialPurchases2020";

export interface SpecialPurchaseTypesResult {
  items: SpecialPurchaseType[];
  /** true — данные пришли из НСИ, false — используется резервный перечень. */
  fromNsi: boolean;
}

// Названия двух типов, реально встречающихся в выгрузках ЕИС, оставляем
// полностью — они являются подписями справочника, а не сокращениями.
const KNOWN_NAMES: Record<string, string> = {
  P4_1_93:
    "Закупки в соответствии с п. 4 ч. 1 ст. 93 Федерального закона № 44-ФЗ",
  P23_1_93:
    "Услуги по содержанию и ремонту одного или нескольких нежилых помещений, " +
    "переданных в безвозмездное пользование или оперативное управление " +
    "заказчику, услуги по водо-, тепло-, газо- и энергоснабжению, услуги по " +
    "охране, услуги по вывозу бытовых отходов в случае, если такие услуги " +
    "оказываются другому лицу или другим лицам, пользующимся нежилыми " +
    "помещениями, находящимися в здании, в котором расположены помещения, " +
    "переданные заказчику в безвозмездное пользование или оперативное " +
    "управление (п.23 ч.1 ст.93 Федерального закона №44-ФЗ)",
};

export const fallbackSpecialPurchaseTypes: SpecialPurchaseType[] = Array.from(
  { length: 32 },
  (_, index) => {
    const clause = index + 1;
    const code = `P${clause}_1_93`;

    return {
      code,
      name:
        KNOWN_NAMES[code] ??
        `Закупки в соответствии с п. ${clause} ч. 1 ст. 93 Федерального закона № 44-ФЗ`,
    };
  },
);

const fetchSnapshot = async (
  signal?: AbortSignal,
): Promise<SpecialPurchaseTypesResult> => {
  try {
    const { data } = await referenceApi.get<unknown>(
      `/api/references/${DATASET}/all`,
      { signal },
    );
    const items = readReferenceItems(data)
      .filter((item) => item.code.trim() && item.actual !== false)
      .map((item) => ({ code: item.code, name: item.name }));

    if (items.length) {
      return { items, fromNsi: true };
    }
  } catch {
    // csms-api может быть недоступен — ниже используем резервный перечень
  }

  return { items: fallbackSpecialPurchaseTypes, fromNsi: false };
};

export const useSpecialPurchaseTypes = () =>
  useQuery<SpecialPurchaseTypesResult>({
    queryKey: ["specialPurchaseTypes", DATASET],
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: ({ signal }) => fetchSnapshot(signal),
  });
