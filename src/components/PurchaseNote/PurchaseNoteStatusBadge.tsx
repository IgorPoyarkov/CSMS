import {
  Ban,
  CheckCircle2,
  Clock,
  FileClock,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import useUtils from "../../hooks/useUtils";
import {
  getPurchaseNoteStatusMeta,
  type PurchaseNoteStatus,
} from "../../services/PurchaseNote/purchaseNote.schema";
import styles from "./PurchaseNoteStatusBadge.module.scss";

interface PurchaseNoteStatusBadgeProps {
  status?: PurchaseNoteStatus | string;
  compact?: boolean;
  title?: string;
}

/**
 * Визуальный индикатор статуса согласования служебной записки (потребности):
 * «В работе», «На согласовании», «На доработке», «Одобрено КС»,
 * «Утверждено», «Отклонено», «Аннулировано».
 */
export default function PurchaseNoteStatusBadge({
  status,
  compact = false,
  title,
}: PurchaseNoteStatusBadgeProps) {
  const { bem } = useUtils();
  const block = bem(styles, "purchase-note-status-badge");
  const meta = getPurchaseNoteStatusMeta(status);

  const renderIcon = () => {
    const size = compact ? 12 : 14;
    switch (status) {
      case "approved":
        return <CheckCircle2 size={size} aria-hidden="true" />;
      case "ks_approved":
        return <ShieldCheck size={size} aria-hidden="true" />;
      case "revision":
        return <RotateCcw size={size} aria-hidden="true" />;
      case "in_review":
        return <FileClock size={size} aria-hidden="true" />;
      case "rejected":
        return <XCircle size={size} aria-hidden="true" />;
      case "cancelled":
        return <Ban size={size} aria-hidden="true" />;
      case "draft":
      default:
        return <Clock size={size} aria-hidden="true" />;
    }
  };

  return (
    <span
      className={block(undefined, [meta.tone, ...(compact ? ["compact"] : [])])}
      title={title ?? `Статус согласования СЗ: ${meta.label}`}
      aria-label={`Статус согласования СЗ: ${meta.label}`}
    >
      {renderIcon()}
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}
