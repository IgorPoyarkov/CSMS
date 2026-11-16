import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";

const DESCRIPTION_FIELDS: { name: keyof NoticeInfoFormValues["objectDescription"]; label: string; placeholder: string }[] = [
  { name: "objectName", label: "Наименование объекта закупки", placeholder: "Наименование товара, работы или услуги" },
  { name: "okpd2Code", label: "Код ОКПД2", placeholder: "Например, 32.50.13.190" },
  { name: "okpd2Name", label: "Наименование по ОКПД2", placeholder: "Товар, работа или услуга по ОКПД2" },
  { name: "consumerProperties", label: "Потребительские свойства", placeholder: "Свойства, существенные для потребителя" },
  { name: "qualityCharacteristics", label: "Качественные характеристики", placeholder: "Показатели качества товара/работы/услуги" },
  { name: "functionalProperties", label: "Функциональные свойства", placeholder: "Функции, которые должен выполнять объект" },
  { name: "environmentalCharacteristics", label: "Экологические характеристики", placeholder: "Влияние на окружающую среду (при наличии)" },
  { name: "otherRequirements", label: "Иные требования", placeholder: "Дополнительные требования к объекту закупки" },
];

/**
 * Структурированное описание объекта закупки (ПП РФ от 08.02.2017 № 145).
 * Дополняет типовые требования ТРУ (ПП 926 п. 7) и позиции объекта закупки.
 */
const ObjectDescriptionSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "object-description");
  const { register, watch, control } =
    useFormContext<NoticeInfoFormValues>();

  const objectDescription = watch("objectDescription");

  if (!objectDescription) {
    return null;
  }

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Описание объекта закупки (ПП РФ N 145)
      </h2>
      <p className={block("hint")}>
        Структурированное описание в соответствии с Постановлением
        Правительства РФ от 08.02.2017 N 145 «Об утверждении Требований к
        описанию объекта закупки».
      </p>

      <div className={block("grid")}>
        {DESCRIPTION_FIELDS.map((field) => (
          <div key={field.name} className={block("field-col")}>
            <label className={block("label")}>{field.label}</label>
            <input
              type="text"
              className={block("input")}
              placeholder={field.placeholder}
              {...register(`objectDescription.${field.name}`)}
            />
          </div>
        ))}
        <div className={block("field-col", ["full"])}>
          <label className={block("label")}>Иные требования</label>
          <textarea
            className={block("textarea")}
            rows={3}
            placeholder="Дополнительные требования к объекту закупки"
            {...register("objectDescription.otherRequirements")}
          />
        </div>
      </div>

      <div className={block("preview")}>
        <h3 className={block("preview-title")}>Краткое описание</h3>
        <p className={block("preview-text")}>
          {objectDescription.objectName || "—"}{" "}
          {objectDescription.okpd2Code
            ? `(ОКПД2 ${objectDescription.okpd2Code}${
                objectDescription.okpd2Name
                  ? ` — ${objectDescription.okpd2Name}`
                  : ""
              })`
            : ""}
          {objectDescription.consumerProperties
            ? `; потребительские свойства: ${objectDescription.consumerProperties}`
            : ""}
          {objectDescription.qualityCharacteristics
            ? `; качество: ${objectDescription.qualityCharacteristics}`
            : ""}
          {objectDescription.functionalProperties
            ? `; функции: ${objectDescription.functionalProperties}`
            : ""}
        </p>
      </div>
    </section>
  );
};

export default ObjectDescriptionSection;
