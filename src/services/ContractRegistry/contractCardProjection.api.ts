import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ContractCardProjectionListSchema,
  type ContractCardProjection,
} from "./contractCardProjection.schema";

/**
 * Проекции публичных карточек ЕИС (`contractCardProjections`).
 *
 * Коллекция наполняется парсером воркера и импортом
 * `scripts/import-contract-card-projections.mjs`; импорт проставляет
 * `contractId` своей записи реестра, поэтому адресной выборки по контракту
 * достаточно — адаптер фильтрует по вынесенной колонке `contract_id`.
 *
 * Кроме актов, решений, платежей и сообщений ЭДО проекция содержит блок `Smp` —
 * подтаблицу контракта «Информация о привлечении СМП, СОНО» из XML карточки.
 * У выгрузок, сделанных до её появления, поля нет: схема подставляет пустой
 * массив, и карточка показывает не «нет сведений», а «не выгружали».
 */
const PROJECTIONS_ENDPOINT = "/contractCardProjections";

/** Один контракт может иметь несколько выгрузок — берём самую свежую. */
const fetchProjectionByContract = async (
  contractId: string | number,
): Promise<ContractCardProjection | null> => {
  const response = await api.get(PROJECTIONS_ENDPOINT, {
    params: { contractId },
  });
  const rows = ContractCardProjectionListSchema.parse(response.data ?? []);
  if (rows.length === 0) return null;

  return [...rows].sort((a, b) =>
    String(b.importedAt ?? "").localeCompare(String(a.importedAt ?? "")),
  )[0];
};

/**
 * Все проекции одной выборкой — для индикаторов исполнения в списке реестра.
 *
 * Строк на странице до 25, но проекция нужна каждой из них (оплата и приёмка у
 * контрактов из ЕИС есть только здесь), поэтому 25 адресных запросов заменены
 * одним: адаптер отдаёт колонку целиком, а индекс по `contractId` строится на
 * клиенте. Выборка читается раз в 5 минут и переиспользуется при перелистывании
 * страниц — новый запрос на каждую строку списка не нужен.
 */
export const useAllContractCardProjections = (enabled = true) =>
  useQuery({
    queryKey: ["contractCardProjections", "all"],
    queryFn: async (): Promise<ContractCardProjection[]> => {
      const response = await api.get(PROJECTIONS_ENDPOINT);
      return ContractCardProjectionListSchema.parse(response.data ?? []);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

/**
 * Снимок карточки ЕИС по контракту реестра. Ошибка (коллекции нет, адаптер не
 * перезапущен) и отсутствие выгрузки различаются на уровне секции: ошибка —
 * повод не рисовать блок вовсе, отсутствие выгрузки — показать пояснение.
 */
export const useContractCardProjection = (
  contractId?: string | number,
) =>
  useQuery({
    queryKey: ["contractCardProjections", String(contractId)],
    queryFn: () => fetchProjectionByContract(contractId as string | number),
    enabled: Boolean(contractId),
    // Проекция — снимок выгрузки, а не живые данные: лишний запрос при каждом
    // раскрытии контракта не нужен.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
