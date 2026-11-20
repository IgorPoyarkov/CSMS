/**
 * Регламентированные сроки выполнения задач по функциям раздела III
 * Типового положения (приказ Минфина России от 31.07.2020 № 158н)
 * и Федерального закона № 44-ФЗ.
 *
 * Список сроков строится из активной версии пула в API: после отказа от
 * статического массива больше нет второго источника регламентных дней.
 */

import type { ContractServiceFunction } from "../../services/ContractService/contractService.schema";
import type { Order158nTaskPoolItem } from "../../services/Tasks/order158nTaskPool";

export interface RegulatoryDeadline {
  functionCode: ContractServiceFunction;
  clause?: string;
  // Краткое описание действия
  action: string;
  // Нормативный срок: количество календарных дней
  days: number;
  // От чего отсчитывается срок
  basis: string;
  // Нормативное основание (статья, пункт)
  reference: string;
}

export const regulatoryDeadlinesFromPool = (
  pool: Order158nTaskPoolItem[],
): RegulatoryDeadline[] =>
  pool.map((item) => ({
    functionCode: item.functionCode,
    clause: item.clause,
    action: `${item.clause}: ${item.defaultTaskTitle}`,
    days: item.recommendedDays,
    basis: item.deadlineBasis,
    reference: item.legalReference,
  }));

// Средний срок по функции: автоподстановка в форму задачи
export const averageDeadlineByFunction = (
  functionCode: ContractServiceFunction | undefined,
  pool: Order158nTaskPoolItem[],
): number => {
  if (!functionCode) return 10;

  const filtered = regulatoryDeadlinesFromPool(pool).filter(
    (d) => d.functionCode === functionCode,
  );

  if (filtered.length === 0) return 10;

  return Math.round(
    filtered.reduce((sum, d) => sum + d.days, 0) / filtered.length,
  );
};

// Рассчитать рекомендованный срок: дата + days (либо средний по функции)
export const recommendedDueDate = (
  functionCode: ContractServiceFunction | undefined,
  pool: Order158nTaskPoolItem[],
  customDays?: number,
): string => {
  const days =
    typeof customDays === "number" && customDays > 0
      ? customDays
      : averageDeadlineByFunction(functionCode, pool);
  const date = new Date();

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
};

// Подобрать подходящие регламентированные сроки для функции
export const getDeadlinesForFunction = (
  functionCode: ContractServiceFunction | undefined,
  pool: Order158nTaskPoolItem[],
): RegulatoryDeadline[] => {
  if (!functionCode) return [];

  return regulatoryDeadlinesFromPool(pool).filter(
    (d) => d.functionCode === functionCode,
  );
};
