import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ExternalLink, FileText, Upload } from "lucide-react";
import useMyContractRole from "../../../hooks/useMyContractRole";
import useUtils from "../../../hooks/useUtils";
import { useOrganizationObjectDescriptions } from "../../../services/ObjectDescription/objectDescription.api";
import { toNoticeObjectDescriptionFields } from "../../../services/ObjectDescription/objectDescription.schema";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { useKtruDictionary } from "../../../services/KtruRef/ktruRef.api";
import { checkKtruUsage } from "../../../services/KtruRef/ktruControl";
import KtruSelect from "../../UI/KtruSelect/KtruSelect";
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
 *
 * Описание формируется с ранних этапов (конструктор ООЗ) и переносится в
 * извещение. Здесь же выбирается позиция КТРУ (если код ОКПД2 есть в каталоге)
 * и прикладывается отдельный файл описания — он крепится к извещению
 * в разделе «Прилагаемые документы».
 */
const ObjectDescriptionSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "object-description");
  const eis = bem(styles, "eis-main");
  const { organization } = useMyContractRole();
  const { data: savedDescriptions = [] } = useOrganizationObjectDescriptions(
    organization?.id,
  );
  const { data: ktruRefs = [] } = useKtruDictionary();
  const { register, watch, setValue, control } =
    useFormContext<NoticeInfoFormValues>();

  const objectDescription = watch("objectDescription");
  // Код ОКПД2 описания может быть ещё не заполнен вручную, но уже выбран
  // в таблице объектов закупки — используем его для КТРУ и имени файла
  const firstItemCode = watch("purchaseObjects.items.0.okpd2OrKtruCode") || "";
  const templates = savedDescriptions.filter(
    (item) => item.kind === "object_description",
  );

  const {
    fields: attachedFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "attachedDocs",
  });
  const [draftFileName, setDraftFileName] = useState("");

  const oozDocs = useMemo(
    () =>
      attachedFields
        .map((field, index) => ({ field, index }))
        .filter(({ field }) => field.category === "object_description"),
    [attachedFields],
  );

  if (!objectDescription) {
    return null;
  }

  const effectiveOkpd2 = objectDescription.okpd2Code || firstItemCode;

  const ktruIssue = checkKtruUsage(
    ktruRefs,
    effectiveOkpd2,
    objectDescription.ktruCode,
  );

  const handleApplySaved = (selectedId: string) => {
    if (!selectedId) return;
    const found = templates.find((item) => String(item.id) === selectedId);
    if (!found) return;
    setValue("objectDescription", toNoticeObjectDescriptionFields(found), {
      shouldDirty: true,
    });
  };

  const attachFile = (fileName: string, description: string) => {
    const trimmed = fileName.trim();
    if (!trimmed) return;
    append({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: "object_description",
      fileName: trimmed,
      description:
        description.trim() ||
        "Структурированное описание объекта закупки (ст. 33 44-ФЗ, ПП РФ № 145)",
    });
  };

  // Файл формируется из текущего описания: в системе хранится имя и описание,
  // сам документ выгружается из конструктора ООЗ / печатной формы
  const handleGenerateFile = () => {
    const code = effectiveOkpd2 || "ООЗ";
    const ktru = objectDescription.ktruCode
      ? `_КТРУ_${objectDescription.ktruCode}`
      : "";
    const date = new Date().toISOString().slice(0, 10);
    attachFile(
      `Описание_объекта_закупки_${code}${ktru}_${date}.docx`,
      `Структурированное описание объекта закупки${
        objectDescription.objectName ? `: ${objectDescription.objectName}` : ""
      }${objectDescription.ktruCode ? ` (КТРУ ${objectDescription.ktruCode})` : ""}`,
    );
  };

  const handleFilePick = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setDraftFileName(file.name);
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Описание объекта закупки (ст. 33 44-ФЗ, ПП РФ N 145)
      </h2>
      <p className={block("hint")}>
        Структурированное описание в соответствии с Постановлением Правительства
        РФ от 08.02.2017 N 145. Можно выбрать готовую заготовку из конструктора
        ООЗ или заполнить поля вручную. Отдельный файл описания прикладывается к
        извещению и уходит в раздел «Прилагаемые документы».
      </p>
      <LegalActRefs component="ObjectDescriptionSection" />

      <div className={eis("inline-group")}>
        <Link to="/norming-requirements" className={eis("link-btn")}>
          Открыть конструктор ООЗ
          <ExternalLink size={12} aria-hidden="true" />
        </Link>
      </div>

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

        {/* Позиция КТРУ: если код ОКПД2 есть в каталоге, описание строится
            по позиции КТРУ (ПП РФ № 145) */}
        <div className={block("field-col", ["full"])}>
          <label className={block("label")}>Позиция КТРУ</label>
          <KtruSelect
            className={block("select")}
            okpd2Code={effectiveOkpd2}
            ktruCode={objectDescription.ktruCode}
            onSelect={(item) => {
              setValue("objectDescription.ktruCode", item?.ktruCode ?? "", {
                shouldDirty: true,
              });
              setValue("objectDescription.ktruName", item?.name ?? "", {
                shouldDirty: true,
              });
              // Код ОКПД2 берём из позиции закупки, чтобы описание и таблица
              // не расходились
              if (!objectDescription.okpd2Code && effectiveOkpd2) {
                setValue("objectDescription.okpd2Code", effectiveOkpd2, {
                  shouldDirty: true,
                });
              }
              if (item && !objectDescription.objectName) {
                setValue("objectDescription.objectName", item.name, {
                  shouldDirty: true,
                });
              }
            }}
          />
          {ktruIssue && (
            <span
              className={eis(
                ktruIssue.level === "error" ? "red-note" : "yellow-warning",
              )}
            >
              {ktruIssue.message}
            </span>
          )}
        </div>

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

      {/* Файл описания объекта закупки, который крепится к извещению */}
      <div className={block("preview")}>
        <h3 className={block("preview-title")}>
          <FileText size={14} aria-hidden="true" /> Файл описания объекта
          закупки
        </h3>
        <div className={eis("inline-group")}>
          <button
            type="button"
            className={eis("small-btn")}
            onClick={handleGenerateFile}
          >
            Сформировать файл ООЗ и приложить
          </button>
          <input type="file" onChange={(e) => handleFilePick(e.target.files)} />
          <button
            type="button"
            className={eis("small-btn")}
            disabled={!draftFileName}
            onClick={() => {
              attachFile(
                draftFileName,
                "Описание объекта закупки (файл заказчика)",
              );
              setDraftFileName("");
            }}
          >
            <Upload size={12} aria-hidden="true" /> Прикрепить выбранный файл
          </button>
        </div>

        {oozDocs.length === 0 ? (
          <span className={eis("muted")}>
            Файл описания пока не приложен — извещение можно сохранить, но ООЗ в
            составе документов будет отсутствовать.
          </span>
        ) : (
          <ul className={eis("doc-list")}>
            {oozDocs.map(({ field, index }) => (
              <li key={field.id} className={eis("doc-item")}>
                <span>
                  <strong>{field.fileName}</strong> — {field.description}
                </span>
                <button
                  type="button"
                  className={eis("small-btn", ["danger"])}
                  onClick={() => remove(index)}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
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
          {objectDescription.ktruCode
            ? `; КТРУ ${objectDescription.ktruCode}`
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
