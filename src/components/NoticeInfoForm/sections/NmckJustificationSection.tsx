import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, CheckCircle2, Lock } from "lucide-react";
import useMyContractRole from "../../../hooks/useMyContractRole";
import useUtils from "../../../hooks/useUtils";
import {
  NMCK_METHOD_LABELS,
  type NmckCalculationRecord,
} from "../../../services/Nmck/nmck.schema";
import { formatNmckMoney } from "../../../services/Nmck/marketNmck";
import { usePurchaseNotes } from "../../../services/PurchaseNote/purchaseNote.api";
import { useNoticeFormContext } from "../noticeFieldLockHooks";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { usePurchaseObjects } from "../../../services/PurchaseObject/purchaseObject.api";
import styles from "../NoticeInfoForm.module.scss";

/**
 * Read-only просмотр утверждённого обоснования НМЦК.
 *
 * Источник данных — связанная служебная записка: расчёт (nmckCalculation),
 * подпись ЭП (nmckSignature), итоговая цена (initialMaxPrice).
 * Если расчёт подписан в ЭП — блок помечается как утверждённый и НМЦК
 * фиксируется в извещении (блокируется для редактирования).
 */
const NmckJustificationSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "nmck-preview");
  const { organization } = useMyContractRole();
  const { data: purchaseNotes = [] } = usePurchaseNotes(organization?.id);
  const { data: allPurchaseObjects = [] } = usePurchaseObjects(
    organization?.id,
  );
  const { watch } = useNoticeFormContext<NoticeInfoFormValues>();

  const purchaseNoteId = watch("purchaseNoteId");
  const ikz = watch("generalInfo.ikz");

  const matchedNote = useMemo(() => {
    if (purchaseNoteId !== undefined && purchaseNoteId !== "") {
      const byId = purchaseNotes.find(
        (n) => String(n.id) === String(purchaseNoteId),
      );
      if (byId) return byId;
    }
    if (ikz) {
      return purchaseNotes.find((n) => n.ikz === ikz);
    }
    return undefined;
  }, [purchaseNotes, purchaseNoteId, ikz]);

  const record = matchedNote?.nmckCalculation as
    | NmckCalculationRecord
    | undefined;
  const signature = matchedNote?.nmckSignature;
  const isApproved = Boolean(signature);

  // Дополнительные коды ОКПД2 из purchaseObjects
  const objects = useMemo(() => {
    if (!matchedNote) return [];
    return allPurchaseObjects.filter(
      (o) =>
        o.objectDescriptionId !== undefined &&
        String(o.objectDescriptionId) ===
          String(matchedNote.objectDescriptionId ?? ""),
    );
  }, [allPurchaseObjects, matchedNote]);

  if (!record) {
    return (
      <section className={block("section")}>
        <h2 className={block("section-title")}>
          <FileText size={14} aria-hidden="true" />
          Обоснование НМЦК (ст. 22 Закона № 44-ФЗ)
        </h2>
        <p className={block("hint")}>
          Обоснование формируется в модуле расчёта НМЦК и сохраняется в
          служебную записку. Подписанное в ЭП обоснование автоматически
          подставляется в извещение и фиксируется для редактирования.
        </p>
      </section>
    );
  }

  const methodLabel = NMCK_METHOD_LABELS[record.method] ?? record.method;
  const nmckTotal = record.nmckTotal ?? matchedNote?.initialMaxPrice ?? 0;
  const totalLabel =
    Number.isFinite(nmckTotal) && nmckTotal > 0
      ? formatNmckMoney(nmckTotal)
      : "—";

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        <FileText size={14} aria-hidden="true" />
        Обоснование НМЦК (ст. 22 Закона № 44-ФЗ)
        {isApproved && (
          <span className={block("badge", ["approved"])}>
            <CheckCircle2 size={12} /> Утверждено
          </span>
        )}
      </h2>

      <div className={block("grid")}>
        <div className={block("field-col")}>
          <span className={block("label")}>Метод</span>
          <span className={block("value")}>{methodLabel}</span>
        </div>
        <div className={block("field-col")}>
          <span className={block("label")}>Дата расчёта</span>
          <span className={block("value")}>{record.calculatedAt ?? "—"}</span>
        </div>
        <div className={block("field-col")}>
          <span className={block("label")}>Предмет</span>
          <span className={block("value")}>
            {record.subject || matchedNote?.subject || "—"}
          </span>
        </div>
        <div className={block("field-col")}>
          <span className={block("label")}>ОКПД2</span>
          <span className={block("value")}>
            {record.okpd2Code
              ? `${record.okpd2Code}${record.okpd2Name ? ` — ${record.okpd2Name}` : ""}`
              : matchedNote?.okpd2Code
                ? `${matchedNote.okpd2Code}${matchedNote.okpd2Name ? ` — ${matchedNote.okpd2Name}` : ""}`
                : "—"}
          </span>
        </div>
        <div className={block("field-col")}>
          <span className={block("label")}>Количество</span>
          <span className={block("value")}>
            {record.quantity || matchedNote?.quantity || "—"}{" "}
            {record.unit || matchedNote?.unit || ""}
          </span>
        </div>
        <div className={block("field-col")}>
          <span className={block("label")}>Итоговая НМЦК</span>
          <span className={block("value", ["highlight"])}>{totalLabel}</span>
        </div>
        {record.notes && (
          <div className={block("field-col", ["full"])}>
            <span className={block("label")}>Примечание</span>
            <span className={block("value")}>{record.notes}</span>
          </div>
        )}
        {matchedNote?.priceBasis && (
          <div className={block("field-col", ["full"])}>
            <span className={block("label")}>Обоснование</span>
            <span className={block("value")}>{matchedNote.priceBasis}</span>
          </div>
        )}
      </div>

      {isApproved && (
        <div className={block("approval")}>
          <Lock size={12} aria-hidden="true" />
          <span>
            Обоснование подписано в ЭП: {signature?.signedBy ?? "—"} (
            {signature?.signedAt ?? "—"}). Цена зафиксирована.
          </span>
        </div>
      )}

      {objects.length > 0 && (
        <div className={block("preview")}>
          <h3 className={block("preview-title")}>
            Дополнительные коды ОКПД2 ({objects.length})
          </h3>
          <ul className={block("preview-text")}>
            {objects.map((o) => (
              <li key={o.id}>
                {o.okpd2Code || "—"}
                {o.okpd2Name ? ` — ${o.okpd2Name}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={block("actions")}>
        {matchedNote!.id && (
          <Link
            to={`/purchase-notes/${matchedNote!.id}`}
            className={block("link-btn")}
          >
            Открыть служебную записку
            <ExternalLink size={12} aria-hidden="true" />
          </Link>
        )}
        {matchedNote!.purchasePlanId && matchedNote!.positionId && (
          <Link
            to={`/nmck-calculator?planId=${matchedNote!.purchasePlanId}&positionId=${matchedNote!.positionId}&noteId=${matchedNote!.id}`}
            className={block("link-btn")}
          >
            Открыть расчёт НМЦК
            <ExternalLink size={12} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
};

export default NmckJustificationSection;
