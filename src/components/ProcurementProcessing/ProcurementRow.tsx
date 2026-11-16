import type React from "react";
import useUtils from "../../hooks/useUtils";
import type { Procurement } from "../../services/Procurements/procurement.schema";
import CustomButton from "../UI/CustomButton";
import {
  deleteButtonConfig,
  leftRowButtons,
  remarksButtonConfig,
  rightColOneButtons,
  type ProcurementActionType,
} from "./procurement.config";
import styles from "./ProcurementRow.module.scss";

interface ProcurementRowProps {
  procurement: Procurement;
  onAction: (action: ProcurementActionType, item: Procurement) => void;
  onDelete: (id: string | number) => void;
  isDeleting?: boolean;
}

const ProcurementRow: React.FC<ProcurementRowProps> = ({
  procurement,
  onAction,
  onDelete,
  isDeleting = false,
}) => {
  const { bem } = useUtils();
  const block = bem(styles, "procurement-row");

  const formattedPrice = procurement.nmck.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <li className={block()}>
      <div className={block("actions-left")}>
        {leftRowButtons.map(({ action, config }) => (
          <CustomButton
            key={action}
            configuration={config}
            onClick={() => onAction(action, procurement)}
          />
        ))}
      </div>

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

        <div className={block("cell", ["price"])}>{formattedPrice}</div>
      </div>

      <div className={block("actions-right")}>
        <div className={block("actions-col")}>
          {rightColOneButtons.map(({ action, config }) => (
            <CustomButton
              key={action}
              configuration={config}
              onClick={() => onAction(action, procurement)}
            />
          ))}
        </div>

        <div className={block("actions-col")}>
          <CustomButton
            configuration={remarksButtonConfig}
            onClick={() => onAction("create_remarks", procurement)}
          />
          <CustomButton
            configuration={{
              ...deleteButtonConfig,
              button: {
                ...deleteButtonConfig.button,
                disabled: isDeleting,
              },
            }}
            onClick={() => onDelete(procurement.id)}
          />
        </div>
      </div>
    </li>
  );
};

export default ProcurementRow;
