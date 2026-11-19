/**
 * Регламентированные сроки выполнения задач по функциям раздела III
 * Типового положения (приказ Минфина России от 31.07.2020 № 158н)
 * и Федерального закона № 44-ФЗ.
 *
 * Синхронизированы с полным пулом функций ORDER_158N_TASK_POOL.
 */

import type { ContractServiceFunction } from "../../services/ContractService/contractService.schema";
import { ORDER_158N_TASK_POOL } from "../../services/Tasks/order158nTaskPool";

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

// Полный перечень регламентированных сроков из пула Приказа Минфина № 158н
export const regulatoryDeadlines: RegulatoryDeadline[] =
  ORDER_158N_TASK_POOL.map((item) => ({
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
): number => {
  if (!functionCode) return 10;

  const filtered = regulatoryDeadlines.filter(
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
  customDays?: number,
): string => {
  const days =
    typeof customDays === "number" && customDays > 0
      ? customDays
      : averageDeadlineByFunction(functionCode);
  const date = new Date();

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
};

// Подобрать подходящие регламентированные сроки для функции
export const getDeadlinesForFunction = (
  functionCode: ContractServiceFunction | undefined,
): RegulatoryDeadline[] => {
  if (!functionCode) return [];

  return regulatoryDeadlines.filter((d) => d.functionCode === functionCode);
};
