import { useFieldArray, useFormContext } from "react-hook-form";
import useMyContractRole from "../../../hooks/useMyContractRole";
import useUtils from "../../../hooks/useUtils";
import { useNormingTemplates } from "../../../services/ObjectDescription/objectDescription.api";
import { formatCharacteristicValue } from "../../../services/ObjectDescription/objectDescription.schema";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../../services/Okpd2Ref/okpd2Ref.api";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";

const REQUIREMENT_TYPES: { id: "consumer" | "quality" | "functional" | "other"; label: string }[] = [
  { id: "consumer", label: "Потребительские свойства" },
  { id: "quality", label: "Качественные свойства" },
  { id: "functional", label: "Функциональные свойства" },
  { id: "other", label: "Иные требования" },
];

const mapCategoryToRequirementType = (
  category: string,
): "consumer" | "quality" | "functional" | "other" => {
  if (
    category === "consumer" ||
    category === "quality" ||
    category === "functional"
  ) {
    return category;
  }
  return "other";
};

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
  const { organization } = useMyContractRole();
  const { register, control } = useFormContext<NoticeInfoFormValues>();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const { byCode: templatesByCode } = useNormingTemplates(organization?.id);

  // Хук вызываем безусловно до условного возврата, чтобы не нарушать Rules of Hooks
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: `purchaseObjects.items.${index}.normingRequirements`,
  });

  const matched = findOkpd2ByCode(okpd2Refs, okpd2OrKtruCode);
  const isNormed = Boolean(matched?.isNormed);

  if (!isNormed) {
    return null;
  }

  const savedTemplate = matched ? templatesByCode[matched.code] : undefined;

  const handleLoadTemplate = () => {
    if (!savedTemplate || savedTemplate.characteristics.length === 0) {
      return;
    }
    replace(
      savedTemplate.characteristics.map((c, idx) => ({
        id: `${Date.now()}-${idx}`,
        requirementType: mapCategoryToRequirementType(c.category),
        requirementText: `${c.name}: ${formatCharacteristicValue(c)}`,
      })),
    );
  };

  return (
    <div className={block("norming-req-block")}>
      <h3 className={block("norming-req-title")}>
        Типовые требования (п. 7 ПП РФ N 926)
      </h3>
      <span className={block("norming-req-hint")}>
        Код {matched?.code} — обязательное нормирование. Укажите
        потребительские, качественные и функциональные свойства товара.
      </span>

      {savedTemplate && savedTemplate.characteristics.length > 0 && (
        <button
          type="button"
          className={block("small-btn")}
          onClick={handleLoadTemplate}
        >
          Подгрузить шаблон ПП 926 из базы ({savedTemplate.characteristics.length})
        </button>
      )}

      <div className={block("norming-req-list")}>
        {fields.map((field, i) => (
          <div key={field.id} className={block("norming-req-item")}>
            <select
              className={block("select")}
              {...register(
                `purchaseObjects.items.${index}.normingRequirements.${i}.requirementType`,
              )}
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
