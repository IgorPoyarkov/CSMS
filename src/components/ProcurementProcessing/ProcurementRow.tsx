import type React from "react";
import useUtils from "../../hooks/useUtils";
import {
  noticeStatusLabel,
  type Procurement,
} from "../../services/Procurements/procurement.schema";
import { noticeActions, type ProcurementActionType } from "./procurement.config";
import styles from "./ProcurementRow.module.scss";

interface ProcurementRowProps {
  procurement: Procurement;
  onAction: (action: ProcurementActionType, item: Procurement) => void;
  isDeleting?: boolean;
  isStatusPending?: boolean;
}

/** Дата из ЕИС приходит в ISO или уже в русском формате — приводим к ДД.ММ.ГГГГ. */
const formatRuDate = (raw?: string | null): string => {
  if (!raw) return "—";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (iso) {
    return `${iso[3]}.${iso[2]}.${iso[1]}`;
  }
  return raw;
};

/** Ссылка на карточку извещения в ЕИС по номеру (общий доступ). */
const eisNoticeUrl = (noticeNumber: string): string =>
  `https://zakupki.gov.ru/epz/order/extendedsearch/results.html?searchString=${encodeURIComponent(
    noticeNumber,
  )}`;

const ProcurementRow: React.FC<ProcurementRowProps> = ({
  procurement,
  onAction,
  isDeleting = false,
  isStatusPending = false,
}) => {
  const { bem } = useUtils();
  const block = bem(styles, "notice-card");

  const formattedPrice = procurement.nmck.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isActionDisabled = (action: ProcurementActionType): boolean => {
    if (action === "cancel_notice") {
      return isStatusPending || procurement.noticeStatus === "cancelled";
    }
    if (action === "delete_procurement") {
      return isDeleting;
    }
    return false;
  };

  return (
    <li className={block()}>
      <div className={block("head")}>
        <div className={block("head-main")}>
          {procurement.noticeNumber ? (
            <a
              className={block("number")}
              href={eisNoticeUrl(procurement.noticeNumber)}
              target="_blank"
              rel="noreferrer"
              title="Открыть извещение в ЕИС"
            >
              № {procurement.noticeNumber}
            </a>
          ) : (
            <span className={block("number", ["empty"])}>
              Извещение не размещено
            </span>
          )}
          <span
            className={block("status", [procurement.noticeStatus])}
            title="Статус извещения"
          >
            {noticeStatusLabel(procurement.noticeStatus)}
          </span>
        </div>
        <span className={block("price")}>{formattedPrice} ₽</span>
      </div>

      <p className={block("name")}>{procurement.name}</p>

      <dl className={block("meta")}>
        <div className={block("meta-item")}>
          <dt>Способ закупки</dt>
          <dd>{procurement.procurementType}</dd>
        </div>
        <div className={block("meta-item")}>
          <dt>Начало подачи заявок</dt>
          <dd>{formatRuDate(procurement.applicationStartDate)}</dd>
        </div>
        <div className={block("meta-item")}>
          <dt>Окончание подачи заявок</dt>
          <dd>{formatRuDate(procurement.applicationEndDate)}</dd>
        </div>
        <div className={block("meta-item")}>
          <dt>Рассмотрение заявок</dt>
          <dd>{formatRuDate(procurement.reviewDate)}</dd>
        </div>
        <div className={block("meta-item")}>
          <dt>Подведение итогов</dt>
          <dd>{formatRuDate(procurement.summingUpDate)}</dd>
        </div>
      </dl>

      <div className={block("actions")}>
        {noticeActions.map(({ action, label, title, icon, tone }) => (
          <button
            key={action}
            type="button"
            className={block("action", [tone])}
            title={title}
            disabled={isActionDisabled(action)}
            onClick={() => onAction(action, procurement)}
          >
            <span className={block("action-icon")} aria-hidden="true">
              {icon}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </li>
  );
};

export default ProcurementRow;
