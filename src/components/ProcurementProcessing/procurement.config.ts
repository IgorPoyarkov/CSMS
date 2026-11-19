/**
 * Действия над текущим извещением.
 *
 * Список сокращён до рабочего контура и оформлен компактными кнопками
 * с иконкой и подсказкой: просмотр/редактирование, внесение изменений,
 * направление сведений в контрольный орган (БО), отмена и удаление.
 */
export type ProcurementActionType =
  | "view_notice" // Просмотр / редактирование извещения
  | "edit_notice" // Внесение изменений в извещение
  | "budget_obligation" // БО: сведения об извещении в контрольный орган
  | "cancel_notice" // Отмена извещения
  | "delete_procurement"; // Удаление записи

export interface NoticeActionConfig {
  action: ProcurementActionType;
  label: string;
  title: string;
  icon: string;
  tone: "primary" | "info" | "danger";
}

export const noticeActions: NoticeActionConfig[] = [
  {
    action: "view_notice",
    label: "Открыть",
    title: "Просмотр и редактирование извещения",
    icon: "↗",
    tone: "primary",
  },
  {
    action: "edit_notice",
    label: "Изменить",
    title: "Внести изменения в извещение",
    icon: "✎",
    tone: "info",
  },
  {
    action: "budget_obligation",
    label: "БО",
    title:
      "БО: направить сведения об извещении в контрольный орган (доступно после подготовки извещения)",
    icon: "⇧",
    tone: "info",
  },
  {
    action: "cancel_notice",
    label: "Отмена",
    title: "Отменить извещение",
    icon: "⊘",
    tone: "danger",
  },
  {
    action: "delete_procurement",
    label: "Удалить",
    title: "Удалить запись закупки",
    icon: "🗑",
    tone: "danger",
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
