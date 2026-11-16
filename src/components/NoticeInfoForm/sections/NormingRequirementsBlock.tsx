import { useFieldArray, useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { findOkpd2ByCode } from "../../../services/Okpd2Ref/okpd2Ref.api";
import { useOkpd2Dictionary } from "../../../services/Okpd2Ref/okpd2Ref.api";
import styles from "../NoticeInfoForm.module.scss";

const REQUIREMENT_TYPES: { id: string; label: string }[] = [
  { id: "consumer", label: "Потребительские свойства" },
  { id: "quality", label: "Качественные свойства" },
  { id: "functional", label: "Функциональные свойства" },
  { id: "other", label: "Иные требования" },
];

interface NormingRequirementsBlockProps {
  index: number;
  okpd2OrKtruCode: string;
}

/**
 * Блок типовых требований по п. 7 ПП РФ N 926 для нормируемой позиции.
 * Показывается только если код ОКПД2 помечен в справочнике как подлежащий
 * обязательному нормированию (isNormed).
 */
const NormingRequirementsBlock = ({
  index,
  okpd2OrKtruCode,
}: NormingRequirementsBlockProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, control } =
    useFormContext<NoticeInfoFormValues>();

  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const matched = findOkpd2ByCode(okpd2Refs, okpd2OrKtruCode);
  const isNormed = Boolean(matched?.isNormed);

  if (!isNormed) {
    return null;
  }

  const { fields, append, remove } = useFieldArray({
    control,
    name: `purchaseObjects.items.${index}.normingRequirements`,
  });

  return (
    <div className={block("norming-req-block")}>
      <h3 className={block("norming-req-title")}>
        Типовые требования (п. 7 ПП РФ N 926)
      </h3>
      <span className={block("norming-req-hint")}>
        Код {matched?.code} — обязательное нормирование. Укажите
        потребительские, качественные и функциональные свойства товара.
      </span>

      <div className={block("norming-req-list")}>
        {fields.map((field, i) => (
          <div key={field.id} className={block("norming-req-item")}>
            <select
              className={block("select")}
              {...register(`purchaseObjects.items.${index}.normingRequirements.${i}.requirementType`)}
            >
              {REQUIREMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              className={block("input")}
              placeholder="Текст требования"
              {...register(
                `purchaseObjects.items.${index}.normingRequirements.${i}.requirementText`,
              )}
            />
            <button
              type="button"
              className={block("small-btn", ["danger"])}
              onClick={() => remove(i)}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={block("small-btn")}
        onClick={() =>
          append({
            id: String(Date.now()),
            requirementType: "consumer",
            requirementText: "",
          })
        }
      >
        + Добавить требование
      </button>
    </div>
  );
};

export default NormingRequirementsBlock;
