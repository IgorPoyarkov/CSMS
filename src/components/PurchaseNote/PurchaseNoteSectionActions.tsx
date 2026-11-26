import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./PurchaseNoteModal.module.scss";
import type { PurchaseNoteSectionReview } from "../../services/PurchaseNote/purchaseNote.schema";

interface PurchaseNoteSectionActionsProps {
  review?: PurchaseNoteSectionReview;
  /** Доступны ли действия согласования блока (есть права КС и нет read-only). */
  canReview: boolean;
  onApprove: () => void;
  onRevision: () => void;
  /** Ссылка на конструктор, если для блока предусмотрен внешний конструктор. */
  constructorLink?: { to: string; label: string };
  /** Действие открытия конструктора, если конструктор открывается без навигации. */
  constructorOnClick?: { label: string; onClick: () => void };
}

/**
 * Панель действий отдельного блока СЗ: отметка согласования, «Утвердить» /
 * «Направить на доработку» и кнопка «Открыть конструктор», если для блока
 * предусмотрен отдельный конструктор (ООЗ, НМЦК, проект контракта).
 */
export default function PurchaseNoteSectionActions({
  review,
  canReview,
  onApprove,
  onRevision,
  constructorLink,
  constructorOnClick,
}: PurchaseNoteSectionActionsProps) {
  const approved = review?.status === "approved";
  const inRevision = review?.status === "revision";

  return (
    <div className={styles["purchase-note-modal__section-actions"]}>
      {approved && (
        <span
          className={styles["purchase-note-modal__section-review-badge"]}
          title={`Утверждено${review?.updatedBy ? ` — ${review.updatedBy}` : ""}`}
        >
          Блок утверждён
        </span>
      )}
      {inRevision && (
        <span
          className={[
            styles["purchase-note-modal__section-review-badge"],
            styles["purchase-note-modal__section-review-badge--revision"],
          ].join(" ")}
          title={`На доработке${review?.updatedBy ? ` — ${review.updatedBy}` : ""}`}
        >
          Блок на доработке
        </span>
      )}
      {constructorLink && (
        <Link
          to={constructorLink.to}
          className={styles["purchase-note-modal__inline-link"]}
        >
          {constructorLink.label}
          <ExternalLink size={12} aria-hidden="true" />
        </Link>
      )}
      {constructorOnClick && (
        <button
          type="button"
          className={styles["purchase-note-modal__link-btn"]}
          onClick={constructorOnClick.onClick}
        >
          {constructorOnClick.label}
        </button>
      )}
      {canReview && (
        <div className={styles["purchase-note-modal__footer-actions"]}>
          <button
            type="button"
            className={styles["purchase-note-modal__btn-accent"]}
            onClick={onApprove}
            disabled={approved}
          >
            Утвердить
          </button>
          <button
            type="button"
            onClick={onRevision}
            disabled={inRevision}
          >
            Направить на доработку
          </button>
        </div>
      )}
    </div>
  );
}
