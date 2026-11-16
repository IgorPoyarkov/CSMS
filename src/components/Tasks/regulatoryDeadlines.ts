/**
 * Регламентированные сроки выполнения задач по функциям раздела III
 * Типового положения (приказ Минфина России от 31.07.2020 N 158н)
 * и Федерального закона N 44-ФЗ.
 *
 * Используются для:
 *  — автоподстановки срока при создании задачи руководителем;
 *  — предупреждения о приближении/нарушении срока;
 *  — формирования статистики по соблюдению сроков в табеле.
 */

import type { ContractServiceFunction } from "../../services/ContractService/contractService.schema";

export interface RegulatoryDeadline {
  functionCode: ContractServiceFunction;
  // Краткое описание действия
  action: string;
  // Нормативный срок: количество календарных дней
  days: number;
  // От чего отсчитывается срок
  basis: string;
  // Нормативное основание (статья, пункт)
  reference: string;
}

// Планирование (раздел 3.1)
const planningDeadlines: RegulatoryDeadline[] = [
  {
    functionCode: "planning",
    action: "Разместить план-график в ЕИС",
    days: 10,
    basis: "с даты доведения объёма финансового обеспечения",
    reference: "п. 10 ПП РФ от 05.06.2015 N 552",
  },
  {
    functionCode: "planning",
    action: "Разместить изменения в план-график",
    days: 3,
    basis: "с даты принятия решения об изменении",
    reference: "п. 11 ПП РФ от 05.06.2015 N 552",
  },
  {
    functionCode: "planning",
    action: "Разместить обоснование закупок",
    days: 10,
    basis: "с даты размещения плана-графика",
    reference: "п. 3 ст. 18 ФЗ-44",
  },
];

// Описание объекта закупки (раздел 3.2.2.2)
const purchaseDescriptionDeadlines: RegulatoryDeadline[] = [
  {
    functionCode: "purchase_description",
    action: "Разместить извещение о конкурентной процедуре",
    days: 15,
    basis: "до даты окончания срока подачи заявок",
    reference: "ч. 2 ст. 42 ФЗ-44",
  },
  {
    functionCode: "purchase_description",
    action: "Разместить извещение о закупке у СМП/СОНКО",
    days: 7,
    basis: "до даты окончания срока подачи заявок",
    reference: "ч. 3 ст. 30 ФЗ-44",
  },
  {
    functionCode: "purchase_description",
    action: "Разместить запрос котировок",
    days: 4,
    basis: "до даты окончания срока подачи заявок",
    reference: "ч. 1 ст. 26.1 ФЗ-44",
  },
  {
    functionCode: "purchase_description",
    action: "Разместить извещение об аукционе/конкурсе с НМЦК > 300 млн",
    days: 30,
    basis: "до даты окончания срока подачи заявок",
    reference: "ч. 2 ст. 42 ФЗ-44",
  },
];

// Определение поставщика (раздел 3.2)
const supplierDeterminationDeadlines: RegulatoryDeadline[] = [
  {
    functionCode: "supplier_determination",
    action: "Разместить протокол подведения итогов",
    days: 3,
    basis: "с даты подписания протокола",
    reference: "ч. 12 ст. 50 ФЗ-44",
  },
  {
    functionCode: "supplier_determination",
    action: "Разместить разъяснения положений извещения",
    days: 2,
    basis: "с даты поступления запроса",
    reference: "ч. 4 ст. 50 ФЗ-44",
  },
  {
    functionCode: "supplier_determination",
    action: "Разместить отмену определения поставщика",
    days: 1,
    basis: "с даты принятия решения",
    reference: "ч. 4 ст. 24 ФЗ-44",
  },
];

// Заключение контракта (раздел 3.3)
const contractConclusionDeadlines: RegulatoryDeadline[] = [
  {
    functionCode: "contract_conclusion",
    action: "Заключить контракт с победителем",
    days: 10,
    basis: "с даты размещения протокола подведения итогов",
    reference: "ч. 4 ст. 51 ФЗ-44",
  },
  {
    functionCode: "contract_conclusion",
    action: "Разместить проект контракта с протоколом разногласий",
    days: 4,
    basis: "с даты поступления протокола разногласий",
    reference: "ч. 4 ст. 51 ФЗ-44",
  },
  {
    functionCode: "contract_conclusion",
    action: "Направить сведения о контракте в Казначейство",
    days: 3,
    basis: "с даты заключения контракта",
    reference: "ч. 3 ст. 103 ФЗ-44",
  },
];

// Исполнение контракта (раздел 3.4)
const contractExecutionDeadlines: RegulatoryDeadline[] = [
  {
    functionCode: "contract_execution",
    action: "Оплатить поставленный товар (работу, услугу)",
    days: 7,
    basis: "с даты подписания документа о приёмке",
    reference: "ч. 13.1 ст. 34 ФЗ-44",
  },
  {
    functionCode: "contract_execution",
    action: "Разместить сведения об исполнении контракта",
    days: 10,
    basis: "с даты исполнения обязательства",
    reference: "ч. 3 ст. 103 ФЗ-44",
  },
  {
    functionCode: "contract_execution",
    action: "Вернуть обеспечение исполнения контракта",
    days: 30,
    basis: "с даты исполнения обязательств по контракту",
    reference: "ч. 27 ст. 34 ФЗ-44",
  },
  {
    functionCode: "contract_execution",
    action: "Направить требование об уплате неустойки",
    days: 5,
    basis: "с даты выявления просрочки",
    reference: "ч. 5 ст. 34 ФЗ-44",
  },
];

// Полный перечень регламентированных сроков
export const regulatoryDeadlines: RegulatoryDeadline[] = [
  ...planningDeadlines,
  ...purchaseDescriptionDeadlines,
  ...supplierDeterminationDeadlines,
  ...contractConclusionDeadlines,
  ...contractExecutionDeadlines,
];

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

// Рассчитать рекомендованный срок: дата + days
export const recommendedDueDate = (functionCode: ContractServiceFunction | undefined): string => {
  const days = averageDeadlineByFunction(functionCode);
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
