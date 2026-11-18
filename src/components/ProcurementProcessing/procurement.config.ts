import type { ConfigurationButton } from "../UI/CustomButton";

/**
 * Действия над текущим извещением. Список сокращён до рабочего контура:
 * просмотр/редактирование, внесение изменений, бюджетное обязательство,
 * отмена и удаление. «Сформировать документы», «приказ» и «замечания»
 * убраны — они относятся к подготовительным шагам, а не к текущим извещениям.
 */
export type ProcurementActionType =
  | "view_notice" // Просмотр / редактирование извещения
  | "edit_notice" // Внесение изменений в извещение
  | "budget_obligation" // Формирование бюджетного обязательства
  | "cancel_notice" // Отмена извещения
  | "delete_procurement"; // Удаление записи

export const noticeActionButtons: Array<{
  action: ProcurementActionType;
  config: ConfigurationButton;
}> = [
  {
    action: "view_notice",
    config: {
      button: {
        name: "view_notice",
        type: "button",
        value: "Просмотр / редактирование",
        modifier: ["primary"],
      },
    },
  },
  {
    action: "edit_notice",
    config: {
      button: {
        name: "edit_notice",
        type: "button",
        value: "Внести изменения",
        modifier: ["info"],
      },
    },
  },
  {
    action: "budget_obligation",
    config: {
      button: {
        name: "budget_obligation",
        type: "button",
        value: "Бюджетное обязательство",
        modifier: ["primary"],
      },
    },
  },
];

export const noticeDangerButtons: Array<{
  action: ProcurementActionType;
  config: ConfigurationButton;
}> = [
  {
    action: "cancel_notice",
    config: {
      button: {
        name: "cancel_notice",
        type: "button",
        value: "Отмена извещения",
        modifier: ["danger"],
      },
    },
  },
  {
    action: "delete_procurement",
    config: {
      button: {
        name: "delete_procurement",
        type: "button",
        value: "Удалить",
        modifier: ["danger"],
      },
    },
  },
];

// Дефолтный список типов закупок (в дальнейшем будет подтягиваться из справочника организации)
export const DEFAULT_PROCUREMENT_TYPES = [
  "Ремонт",
  "Содержание",
  "Строительство (реконструкция)",
  "Капитальный ремонт",
  "Проектные работы",
  "Строительный контроль",
  "Авторский надзор",
  "Прочее",
];
