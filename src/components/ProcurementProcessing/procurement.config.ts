import type { ConfigurationButton } from "../UI/CustomButton";

export type ProcurementActionType =
  | "btn93_notice_docs"       // Кнопка93: Сформировать документы для извещения
  | "btn96_contract_project"  // Кнопка96: Сформировать проект контракта
  | "btn352_edit_notice"      // Кнопка352: Внести изменения в извещение
  | "btn305_edit_docs"        // Кнопка305: Внести изменения в документы к извещению
  | "btn353_create_order"     // Кнопка353: Приказ о проведении закупки
  | "create_remarks";         // Сформировать замечания по закупке

export const leftRowButtons: Array<{
  action: ProcurementActionType;
  config: ConfigurationButton;
}> = [
  {
    action: "btn93_notice_docs",
    config: {
      button: {
        name: "btn93_notice_docs",
        type: "button",
        value: "Сформировать документы для извещения",
        modifier: ["primary"],
      },
    },
  },
  {
    action: "btn96_contract_project",
    config: {
      button: {
        name: "btn96_contract_project",
        type: "button",
        value: "Сформировать проект контракта",
        modifier: ["primary"],
      },
    },
  },
];

export const rightColOneButtons: Array<{
  action: ProcurementActionType;
  config: ConfigurationButton;
}> = [
  {
    action: "btn352_edit_notice",
    config: {
      button: {
        name: "btn352_edit_notice",
        type: "button",
        value: "Внести изменения в извещение",
        modifier: ["primary"],
      },
    },
  },
  {
    action: "btn305_edit_docs",
    config: {
      button: {
        name: "btn305_edit_docs",
        type: "button",
        value: "Внести изменения в документы к извещению",
        modifier: ["primary"],
      },
    },
  },
  {
    action: "btn353_create_order",
    config: {
      button: {
        name: "btn353_create_order",
        type: "button",
        value: "Приказ о проведении закупки",
        modifier: ["info"],
      },
    },
  },
];

export const remarksButtonConfig: ConfigurationButton = {
  button: {
    name: "create_remarks",
    type: "button",
    value: "Сформировать замечания по закупке",
    modifier: ["primary", "tall"],
  },
};

export const deleteButtonConfig: ConfigurationButton = {
  button: {
    name: "delete",
    type: "button",
    value: "Удалить",
    modifier: ["danger"],
  },
};

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
