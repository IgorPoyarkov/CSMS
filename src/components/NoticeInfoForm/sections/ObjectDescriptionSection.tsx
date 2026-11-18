import { useFormContext } from "react-hook-form";
import useMyContractRole from "../../../hooks/useMyContractRole";
import useUtils from "../../../hooks/useUtils";
import { useOrganizationObjectDescriptions } from "../../../services/ObjectDescription/objectDescription.api";
import { toNoticeObjectDescriptionFields } from "../../../services/ObjectDescription/objectDescription.schema";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import LegalActRefs from "../../LegalAct/LegalActRefs";
import styles from "../NoticeInfoForm.module.scss";

type ObjectDescriptionFieldKey = keyof NonNullable<
  NoticeInfoFormValues["objectDescription"]
>;

const DESCRIPTION_FIELDS: {
  name: ObjectDescriptionFieldKey;
  label: string;
  placeholder: string;
}[] = [
  {
    name: "objectName",
    label: "Наименование объекта закупки",
    placeholder: "Наименование товара, работы или услуги",
  },
  {
    name: "okpd2Code",
    label: "Код ОКПД2",
    placeholder: "Например, 32.50.13.190",
  },
  {
    name: "okpd2Name",
    label: "Наименование по ОКПД2",
    placeholder: "Товар, работа или услуга по ОКПД2",
  },
  {
    name: "consumerProperties",
    label: "Потребительские свойства",
    placeholder: "Свойства, существенные для потребителя",
  },
  {
    name: "qualityCharacteristics",
    label: "Качественные характеристики",
    placeholder: "Показатели качества товара/работы/услуги",
  },
  {
    name: "functionalProperties",
    label: "Функциональные свойства",
    placeholder: "Функции, которые должен выполнять объект",
  },
  {
    name: "environmentalCharacteristics",
    label: "Экологические характеристики",
    placeholder: "Влияние на окружающую среду (при наличии)",
  },
];

/**
 * Структурированное описание объекта закупки (ПП РФ от 08.02.2017 № 145).
 * Позволяет подставить готовое ООЗ из конструктора (/norming-requirements)
 * или заполнить поля вручную.
 */
const ObjectDescriptionSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "object-description");
  const { organization } = useMyContractRole();
  const { data: savedDescriptions = [] } = useOrganizationObjectDescriptions(
    organization?.id,
  );
  const { register, watch, setValue } = useFormContext<NoticeInfoFormValues>();

  const objectDescription = watch("objectDescription");
  const templates = savedDescriptions.filter(
    (item) => item.kind === "object_description",
  );

  if (!objectDescription) {
    return null;
  }

  const handleApplySaved = (selectedId: string) => {
    if (!selectedId) return;
    const found = templates.find((item) => String(item.id) === selectedId);
    if (!found) return;
    setValue("objectDescription", toNoticeObjectDescriptionFields(found), {
      shouldDirty: true,
    });
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Описание объекта закупки (ст. 33 44-ФЗ, ПП РФ N 145)
      </h2>
      <p className={block("hint")}>
        Структурированное описание в соответствии с Постановлением
        Правительства РФ от 08.02.2017 N 145. Можно выбрать готовую заготовку из
        конструктора ООЗ или заполнить поля вручную.
      </p>
      <LegalActRefs component="ObjectDescriptionSection" />

      {templates.length > 0 && (
        <div className={block("field-col", ["full"])}>
          <label className={block("label")} htmlFor="ooz-preset-select">
            Подставить из конструктора ООЗ
          </label>
          <select
            id="ooz-preset-select"
            className={block("select")}
            defaultValue=""
            onChange={(e) => handleApplySaved(e.target.value)}
          >
            <option value="">
              — Выберите сохранённое описание объекта закупки —
            </option>
            {templates.map((tpl) => (
              <option key={String(tpl.id)} value={String(tpl.id)}>
                {tpl.title} (ОКПД2 {tpl.okpd2Code}, хар-к:{" "}
                {tpl.characteristics.length})
              </option>
            ))}
          </select>
        </div>
      )}

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
            placeholder="Дополнительные требования к объекту закупки (стандарты, гарантия, инструкция участнику)"
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
