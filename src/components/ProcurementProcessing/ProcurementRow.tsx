import type React from "react";
import useUtils from "../../hooks/useUtils";
import {
  noticeStatusLabel,
  type Procurement,
} from "../../services/Procurements/procurement.schema";
import CustomButton from "../UI/CustomButton";
import {
  noticeActionButtons,
  noticeDangerButtons,
  type ProcurementActionType,
} from "./procurement.config";
import styles from "./ProcurementRow.module.scss";

interface ProcurementRowProps {
  procurement: Procurement;
  onAction: (action: ProcurementActionType, item: Procurement) => void;
  isDeleting?: boolean;
  isStatusPending?: boolean;
}

const ProcurementRow: React.FC<ProcurementRowProps> = ({
  procurement,
  onAction,
  isDeleting = false,
  isStatusPending = false,
}) => {
  const { bem } = useUtils();
  const block = bem(styles, "procurement-row");

  const formattedPrice = procurement.nmck.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <li className={block()}>
      <div className={block("info")}>
        <div className={block("cell", ["main"])}>
          <span className={block("ikz")}>ИКЗ: {procurement.ikz}</span>
          <p className={block("name")}>{procurement.name}</p>
        </div>

        <div className={block("cell", ["type"])}>
          {procurement.procurementType}
        </div>

        <div className={block("cell", ["notice"])}>
          {procurement.noticeNumber ? (
            <>
              <span className={block("label")}>Извещение №</span>
              <strong>{procurement.noticeNumber}</strong>
            </>
          ) : (
            <span className={block("empty")}>Не размещено</span>
          )}
        </div>

        <div className={block("cell", ["status"])}>
          <span
            className={block("status-badge", [procurement.noticeStatus])}
            title="Статус извещения"
          >
            {noticeStatusLabel(procurement.noticeStatus)}
          </span>
        </div>

        <div className={block("cell", ["price"])}>{formattedPrice}</div>
      </div>

      <div className={block("actions")}>
        {noticeActionButtons.map(({ action, config }) => (
          <CustomButton
            key={action}
            configuration={config}
            onClick={() => onAction(action, procurement)}
          />
        ))}

        {noticeDangerButtons.map(({ action, config }) => (
          <CustomButton
            key={action}
            configuration={{
              ...config,
              button: {
                ...config.button,
                disabled:
                  action === "cancel_notice"
                    ? isStatusPending || procurement.noticeStatus === "cancelled"
                    : isDeleting,
              },
            }}
            onClick={() => onAction(action, procurement)}
          />
        ))}
      </div>
    </li>
  );
};

export default ProcurementRow;
