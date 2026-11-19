/**
 * Действия над текущим извещением.
 *
 * Список сокращён до рабочего контура и оформлен компактными кнопками
 * с иконкой и подсказкой: просмотр/редактирование, внесение изменений,
 * отмена и удаление.
 *
 * БО (направление сведений в контрольный орган) здесь отсутствует:
 * оно относится к этапу заключения контракта, а не к извещению.
 */
export type ProcurementActionType =
  | "view_notice" // Просмотр / редактирование извещения
  | "edit_notice" // Внесение изменений в извещение
  | "cancel_notice" // Отмена извещения
  | "generate_docs" // Типовые документы (приказ о комиссии, протокол заявок)
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
    action: "cancel_notice",
    label: "Отмена",
    title: "Отменить извещение",
    icon: "⊘",
    tone: "danger",
  },
  {
    action: "generate_docs",
    label: "Документы",
    title: "Комиссия / Протокол / Приказ (Документы)",
    icon: "📄",
    tone: "info",
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
