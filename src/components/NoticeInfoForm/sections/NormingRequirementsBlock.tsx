import { useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
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

/**
 * Единый набор характеристик объекта закупки.
 *
 * Раньше блок повторялся в каждой позиции, и заказчик заполнял характеристики
 * отдельно для каждой строки. Теперь набор один на закупку (п. 7 ПП РФ № 926):
 * он подставляется из шаблонов нормирования, из позиций КТРУ или
 * редактируется вручную. Позиции объекта закупки живут в сводной таблице
 * выше и на набор характеристик не влияют.
 */
const NormingRequirementsBlock = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { organization } = useMyContractRole();
  const { register, control, watch, getValues, setValue } =
    useFormContext<NoticeInfoFormValues>();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const { data: ktruRefs = [] } = useKtruDictionary();
  const { byCode: templatesByCode } = useNormingTemplates(organization?.id);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "purchaseObjects.normingRequirements",
  });

  // useFieldArray требует массив; старые извещения приходят без него
  useEffect(() => {
    if (!Array.isArray(getValues("purchaseObjects.normingRequirements"))) {
      setValue("purchaseObjects.normingRequirements", [], {
        shouldDirty: false,
      });
    }
  }, [getValues, setValue]);

  const items = watch("purchaseObjects.items") ?? [];
  const ktruCodes = items
    .map((item) => item.ktruCode)
    .filter((code): code is string => Boolean(code));
  const firstNormedCode = items
    .map((item) => item.okpd2OrKtruCode)
    .find((code) => Boolean(findOkpd2ByCode(okpd2Refs, code)?.isNormed));
  const savedTemplate = firstNormedCode
    ? templatesByCode[firstNormedCode]
    : undefined;

  const handleLoadKtru = () => {
    const requirements = ktruRequirements(ktruRefs, ktruCodes);
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
    <div className={block("norming-req-block")}>
      <h3 className={block("norming-req-title")}>
        Набор характеристик объекта закупки (п. 7 ПП РФ N 926, КТРУ)
      </h3>
      <span className={block("norming-req-hint")}>
        Один набор характеристик на всю закупку. Позиции ОКПД2 / КТРУ выбираются
        в сводной таблице выше; характеристики КТРУ и шаблоны нормирования
        подставляются кнопками.
      </span>

      <div className={block("inline-group")}>
        {ktruCodes.length > 0 && (
          <button
            type="button"
            className={block("small-btn")}
            onClick={handleLoadKtru}
          >
            Подставить характеристики КТРУ ({ktruCodes.length})
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
            Набор характеристик пока пуст. Добавьте требование вручную или
            подставьте характеристики КТРУ.
          </span>
        )}
        {fields.map((field, i) => (
          <div key={field.id} className={block("norming-req-item")}>
            <select
              className={block("select")}
              {...register(
                `purchaseObjects.normingRequirements.${i}.requirementType`,
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
                `purchaseObjects.normingRequirements.${i}.requirementText`,
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
