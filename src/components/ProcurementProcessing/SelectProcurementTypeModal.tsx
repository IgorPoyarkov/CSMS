import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import type { Procurement } from "../../services/Procurements/procurement.schema";
import CustomButton from "../UI/CustomButton";
import CustomModal from "../UI/CustomModal";
import CustomSelect from "../UI/CustomSelect";
import { DEFAULT_PROCUREMENT_TYPES } from "./procurement.config";
import styles from "./SelectProcurementTypeModal.module.scss";

interface SelectProcurementTypeModalProps {
  procurement: Procurement;
  availableTypes?: string[];
  onClose: () => void;
}

const SelectProcurementTypeModal = ({
  procurement,
  availableTypes = DEFAULT_PROCUREMENT_TYPES,
  onClose,
}: SelectProcurementTypeModalProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "select-type-modal");
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState<string>(
    availableTypes.includes(procurement.procurementType)
      ? procurement.procurementType
      : ""
  );

  const handleNext = () => {
    if (!selectedType) return;

    navigate(`/procurement-processing/${procurement.id}/notice-info`, {
      state: {
        dsvz: "Сведения для извещения",
        ikz: procurement.ikz,
        name: procurement.name,
        procurementType: selectedType,
        nmck: procurement.nmck,
        authorizedBodyName: procurement.authorizedBodyName ?? undefined,
        jointOrganizerName: procurement.jointOrganizerName ?? undefined,
        kbk: procurement.kbk ?? undefined,
      },
    });
  };

  return (
    <CustomModal onClose={onClose}>
      <div className={block()}>
        <h2 className={block("title")}>Выберите тип закупки</h2>

        <div className={block("field")}>
          <CustomSelect
            listData={availableTypes}
            selectedValue={selectedType}
            placeholder="-- Выберите тип закупки организации --"
            getKey={(item) => item}
            getLabel={(item) => item}
            onClick={(id) => setSelectedType(String(id))}
          />
        </div>

        <div className={block("actions")}>
          <CustomButton
            configuration={{
              button: {
                name: "back",
                type: "button",
                value: "Назад",
                modifier: ["secondary"],
              },
            }}
            onClick={onClose}
          />
          <CustomButton
            configuration={{
              button: {
                name: "next",
                type: "button",
                value: "Далее",
                modifier: ["primary"],
                disabled: !selectedType,
              },
            }}
            onClick={handleNext}
          />
        </div>
      </div>
    </CustomModal>
  );
};

export default SelectProcurementTypeModal;
