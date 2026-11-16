import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { useOkpd2Dictionary } from "../../../services/Okpd2Ref/okpd2Ref.api";
import { collectNormingViolations } from "../../../services/Okpd2Ref/normingControl";
import CustomButton from "../../UI/CustomButton";
import styles from "../NoticeInfoForm.module.scss";

interface NormingSubmitButtonProps {
  isSaving: boolean;
}

/**
 * Кнопка сохранения извещения с учётом контроля нормирования (ПП РФ N 926):
 * пока цена единицы нормируемой позиции превышает предельную и обоснование
 * нарушения не подписано главным подписантом, извещение не сохраняется.
 */
const NormingSubmitButton = ({ isSaving }: NormingSubmitButtonProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { watch } = useFormContext<NoticeInfoFormValues>();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const items = watch("purchaseObjects.items") ?? [];
  const signedByName = watch("normingControl.breachConfirmedByName");

  const violations = signedByName
    ? []
    : collectNormingViolations(
        items.map((item) => ({
          code: item.okpd2OrKtruCode,
          unitPrice: item.unitPrice,
        })),
        okpd2Refs,
      );

  return (
    <>
      {violations.length > 0 && (
        <span className={block("red-note")}>
          Сохранение невозможно: превышены предельные цены единиц по позициям (
          {violations.length}). Требуется подпись главного подписанта в разделе
          «Контроль нормирования».
        </span>
      )}
      <CustomButton
        configuration={{
          button: {
            name: "saveNotice",
            type: "submit",
            value: isSaving ? "Сохранение..." : "Сохранить извещение",
            modifier: ["primary"],
            disabled: isSaving || violations.length > 0,
          },
        }}
      />
    </>
  );
};

export default NormingSubmitButton;
