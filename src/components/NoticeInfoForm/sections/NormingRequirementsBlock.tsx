import { useEffect } from "react";
import type { FieldArrayPath, Path } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { useNoticeFormContext } from "../noticeFieldLockHooks";
import useMyContractRole from "../../../hooks/useMyContractRole";
import useUtils from "../../../hooks/useUtils";
import { useNormingTemplates } from "../../../services/ObjectDescription/objectDescription.api";
import { formatCharacteristicValue } from "../../../services/ObjectDescription/objectDescription.schema";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../../services/Okpd2Ref/okpd2Ref.api";
import { useKtruDictionary } from "../../../services/KtruRef/ktruRef.api";
import { ktruRequirements } from "../../../services/KtruRef/ktruControl";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";
import Select from "../../UI/Select";

const REQUIREMENT_TYPES: {
  id: "consumer" | "quality" | "functional" | "other";
  label: string;
}[] = [
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
  /** Индекс позиции в purchaseObjects.items */
  index: number;
  /** Порядковый номер позиции для заголовка */
  positionNumber?: number;
}

/**
 * Набор характеристик конкретной позиции объекта закупки.
 *
 * Характеристики привязаны к выбранному объекту: у каждой позиции ОКПД2 / КТРУ
 * свой набор (п. 7 ПП РФ № 926, ПП РФ № 145). Набор подставляется из КТРУ или
 * шаблона нормирования этой позиции и редактируется вручную. Позиции без
 * характеристик остаются с пустым набором.
 */
const NormingRequirementsBlock = ({
  index,
  positionNumber,
}: NormingRequirementsBlockProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { organization } = useMyContractRole();
  const { register, control, watch, getValues, setValue } =
    useNoticeFormContext<NoticeInfoFormValues>();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const { data: ktruRefs = [] } = useKtruDictionary();
  const { byCode: templatesByCode } = useNormingTemplates(organization?.id);

  const requirementsName =
    `purchaseObjects.items.${index}.normingRequirements` as FieldArrayPath<NoticeInfoFormValues>;
  const requirementsPath = requirementsName as Path<NoticeInfoFormValues>;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: requirementsName,
  });

  // useFieldArray требует массив; старые извещения приходят без него
  useEffect(() => {
    if (!Array.isArray(getValues(requirementsPath))) {
      setValue(requirementsPath, [], { shouldDirty: false });
    }
  }, [getValues, requirementsPath, setValue]);

  const itemOkpd2 = watch(`purchaseObjects.items.${index}.okpd2OrKtruCode`);
  const itemKtru = watch(`purchaseObjects.items.${index}.ktruCode`);
  const normedRef = findOkpd2ByCode(okpd2Refs, itemOkpd2);
  const savedTemplate =
    normedRef?.isNormed && itemOkpd2 ? templatesByCode[itemOkpd2] : undefined;

  const handleLoadKtru = () => {
    const requirements = ktruRequirements(ktruRefs, itemKtru ? [itemKtru] : []);
    if (requirements.length === 0) return;
    replace(requirements);
  };

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
    <div className={block("norming-req-block", ["position"])}>
      <h4 className={block("norming-req-title")}>
        Характеристики позиции
        {positionNumber !== undefined ? ` № ${positionNumber}` : ""} (п. 7 ПП РФ
        N 926, КТРУ)
      </h4>
      <span className={block("norming-req-hint")}>
        Набор характеристик относится только к этой позиции. Источник —
        выбранное КТРУ или шаблон нормирования по ОКПД2.
      </span>

      <div className={block("inline-group")}>
        {itemKtru && (
          <button
            type="button"
            className={block("small-btn")}
            onClick={handleLoadKtru}
          >
            Подставить характеристики КТРУ {itemKtru}
          </button>
        )}
        {savedTemplate && savedTemplate.characteristics.length > 0 && (
          <button
            type="button"
            className={block("small-btn")}
            onClick={handleLoadTemplate}
          >
            Подгрузить шаблон ПП 926 из базы (
            {savedTemplate.characteristics.length})
          </button>
        )}
      </div>

      <div className={block("norming-req-list")}>
        {fields.length === 0 && (
          <span className={block("muted")}>
            Характеристики позиции пока не заданы. Добавьте требование вручную
            или подставьте характеристики КТРУ.
          </span>
        )}
        {fields.map((field, i) => (
          <div key={field.id} className={block("norming-req-item")}>
            <Select
              className={block("select")}
              {...register(
                `${requirementsName}.${i}.requirementType` as Path<NoticeInfoFormValues>,
              )}
            >
              {REQUIREMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
            <input
              type="text"
              className={block("input")}
              placeholder="Текст требования"
              {...register(
                `${requirementsName}.${i}.requirementText` as Path<NoticeInfoFormValues>,
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
