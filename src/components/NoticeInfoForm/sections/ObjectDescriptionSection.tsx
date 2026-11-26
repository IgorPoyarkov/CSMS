import { Link } from "react-router-dom";
import {
  useNoticeFieldLock,
  useNoticeFormContext,
} from "../noticeFieldLockHooks";
import { CheckCircle2, ExternalLink, FileText, Lock } from "lucide-react";
import useMyContractRole from "../../../hooks/useMyContractRole";
import useUtils from "../../../hooks/useUtils";
import { useOrganizationObjectDescriptions } from "../../../services/ObjectDescription/objectDescription.api";
import {
  characteristicCategoryLabels,
  formatCharacteristicValue,
  getObjectDescriptionOkpd2Codes,
  standardTypeLabels,
  toNoticeObjectDescriptionFields,
  trademarkRuleLabels,
} from "../../../services/ObjectDescription/objectDescription.schema";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import {
  buildExtraPurchaseItems,
  buildNoticeItemsFromPurchaseObjects,
} from "../../../services/Procurements/noticePurchaseObjects";
import { usePurchaseObjects } from "../../../services/PurchaseObject/purchaseObject.api";
import { useKtruDictionary } from "../../../services/KtruRef/ktruRef.api";
import { checkKtruUsage } from "../../../services/KtruRef/ktruControl";
import KtruSelect from "../../UI/KtruSelect/KtruSelect";
import LegalActRefs from "../../LegalAct/LegalActRefs";
import styles from "../NoticeInfoForm.module.scss";
import Select from "../../UI/Select";

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
 * извещение. Здесь же выбирается позиция КТРУ (если код ОКПД2 есть в каталоге).
 * Файл ООЗ отдельно здесь не формируется: он создаётся в служебной записке и
 * после её согласования автоматически попадает в раздел «Прилагаемые документы».
 */
const ObjectDescriptionSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "object-description");
  const eis = bem(styles, "eis-main");
  const { organization } = useMyContractRole();
  const { data: savedDescriptions = [] } = useOrganizationObjectDescriptions(
    organization?.id,
  );
  const { data: allPurchaseObjects = [] } = usePurchaseObjects(
    organization?.id,
  );
  const { data: ktruRefs = [] } = useKtruDictionary();
  const { register, watch, setValue, getValues } =
    useNoticeFormContext<NoticeInfoFormValues>();
  const { isLocked } = useNoticeFieldLock();
  const descriptionLocked = isLocked("objectDescription");

  const objectDescription = watch("objectDescription");
  // Код ОКПД2 описания может быть ещё не заполнен вручную, но уже выбран
  // в таблице объектов закупки — используем его для КТРУ
  const firstItemCode = watch("purchaseObjects.items.0.okpd2OrKtruCode") || "";
  const templates = savedDescriptions.filter(
    (item) => item.kind === "object_description",
  );

  // Полный ООЗ, из которого предзаполнено извещение: нужен для read-only
  // просмотра характеристик, стандартов и реквизитов утверждения.
  const objectDescriptionId = watch("objectDescriptionId");
  const selectedOoz = savedDescriptions.find(
    (item) =>
      item.kind === "object_description" &&
      objectDescriptionId !== undefined &&
      objectDescriptionId !== null &&
      objectDescriptionId !== "" &&
      String(item.id) === String(objectDescriptionId),
  );
  const oozApproved = selectedOoz?.status === "approved";

  if (!objectDescription) {
    return null;
  }

  const allOkpd2 = getObjectDescriptionOkpd2Codes(objectDescription);
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

    // Выбранный ООЗ может описывать несколько объектов: добавляем позиции
    // для кодов, которых ещё нет в извещении (ЕИС принимает по одному коду).
    const items = getValues("purchaseObjects.items") ?? [];
    if (items.length === 0) return;
    const usedCodes = new Set(
      items
        .map((item) => item.okpd2Code || item.okpd2OrKtruCode)
        .filter(Boolean)
        .map((code) => code.trim().toLowerCase()),
    );
    const descriptionObjects = allPurchaseObjects.filter(
      (object) =>
        object.objectDescriptionId !== undefined &&
        String(object.objectDescriptionId) === String(found.id),
    );
    const extraItems = items.flatMap((item, idx) =>
      descriptionObjects.length > 0
        ? buildNoticeItemsFromPurchaseObjects(
            descriptionObjects,
            item,
            usedCodes,
            `object-${idx + 1}`,
          )
        : buildExtraPurchaseItems(
            item,
            getObjectDescriptionOkpd2Codes(found),
            usedCodes,
            `ooz-${idx + 1}`,
          ),
    );
    if (extraItems.length > 0) {
      setValue("purchaseObjects.items", [...items, ...extraItems], {
        shouldDirty: true,
      });
    }
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Описание объекта закупки (ст. 33 44-ФЗ, ПП РФ N 145)
        {oozApproved && (
          <span className={block("badge", ["approved"])}>
            <CheckCircle2 size={12} aria-hidden="true" /> Утверждено
          </span>
        )}
      </h2>
      <p className={block("hint")}>
        Структурированное описание в соответствии с Постановлением Правительства
        РФ от 08.02.2017 N 145. Можно выбрать готовую заготовку из конструктора
        ООЗ или заполнить поля вручную. Файл описания готовится в служебной
        записке и после согласования приходит в раздел «Прилагаемые документы».
      </p>
      <LegalActRefs component="ObjectDescriptionSection" />

      <div className={eis("inline-group")}>
        <Link to="/norming-requirements" className={eis("link-btn")}>
          Открыть конструктор ООЗ
          <ExternalLink size={12} aria-hidden="true" />
        </Link>
      </div>

      {templates.length > 0 && !descriptionLocked && (
        <div className={block("field-col", ["full"])}>
          <label className={block("label")} htmlFor="ooz-preset-select">
            Подставить из конструктора ООЗ
          </label>
          <Select
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
          </Select>
        </div>
      )}

      {descriptionLocked && (
        <p className={block("locked-note")}>
          <Lock size={12} aria-hidden="true" /> Описание объекта закупки
          утверждено в конструкторе ООЗ. Поля доступны только для просмотра:
          изменить их можно на странице «Нормирование и ООЗ».
        </p>
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
            disabled={descriptionLocked}
            onSelect={(item) => {
              if (descriptionLocked) return;
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

      {/* Файл ООЗ живёт в прилагаемых документах и не дублируется здесь */}
      <div className={block("preview")}>
        <h3 className={block("preview-title")}>
          <FileText size={14} aria-hidden="true" /> Файл описания объекта
          закупки
        </h3>
        <span className={eis("muted")}>
          Файл ООЗ формируется и прикрепляется в служебной записке. После её
          согласования он автоматически попадает в раздел «Прилагаемые
          документы» — отдельно прикреплять его к извещению не нужно.
        </span>
      </div>

      {allOkpd2.length > 1 && (
        <div className={block("preview")}>
          <h3 className={block("preview-title")}>
            Коды ОКПД2 объекта закупки ({allOkpd2.length})
          </h3>
          <p className={block("preview-text")}>
            Коды пришли из связанного ООЗ. Формат ЕИС 17.0 допускает только один
            код ОКПД2 на позицию, поэтому каждый код выведен отдельной позицией
            в разделе «Объекты закупки». Проверьте количество и стоимость
            добавленных позиций перед сохранением.
          </p>
          <ul className={block("preview-text")}>
            {allOkpd2.map((item) => (
              <li key={item.code}>
                {item.code}
                {item.name ? ` — ${item.name}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedOoz && (
        <div className={block("preview")}>
          <h3 className={block("preview-title")}>
            <FileText size={14} aria-hidden="true" /> Полное описание из
            конструктора ООЗ (только просмотр)
          </h3>
          <dl className={block("details")}>
            <div className={block("details-row")}>
              <dt className={block("details-term")}>Наименование</dt>
              <dd className={block("details-value")}>{selectedOoz.title}</dd>
            </div>
            <div className={block("details-row")}>
              <dt className={block("details-term")}>ОКПД2</dt>
              <dd className={block("details-value")}>
                {getObjectDescriptionOkpd2Codes(selectedOoz)
                  .map((item) => item.code)
                  .join(", ")}
              </dd>
            </div>
            {selectedOoz.useKtru && selectedOoz.ktruCode && (
              <div className={block("details-row")}>
                <dt className={block("details-term")}>Позиция КТРУ</dt>
                <dd className={block("details-value")}>
                  {selectedOoz.ktruCode}
                </dd>
              </div>
            )}
            <div className={block("details-row")}>
              <dt className={block("details-term")}>Товарный знак</dt>
              <dd className={block("details-value")}>
                {trademarkRuleLabels[selectedOoz.trademarkRule]}
                {selectedOoz.trademarkName
                  ? ` — ${selectedOoz.trademarkName}`
                  : ""}
              </dd>
            </div>
            {(selectedOoz.warrantyTermMonths ||
              selectedOoz.warrantyRequirements) && (
              <div className={block("details-row")}>
                <dt className={block("details-term")}>Гарантия</dt>
                <dd className={block("details-value")}>
                  {selectedOoz.warrantyTermMonths
                    ? `${selectedOoz.warrantyTermMonths} мес.`
                    : ""}
                  {selectedOoz.warrantyRequirements
                    ? `${selectedOoz.warrantyTermMonths ? " — " : ""}${selectedOoz.warrantyRequirements}`
                    : ""}
                </dd>
              </div>
            )}
            {oozApproved && (
              <div className={block("details-row")}>
                <dt className={block("details-term")}>Утверждено</dt>
                <dd className={block("details-value")}>
                  {selectedOoz.approvedByName || "—"}
                  {selectedOoz.approvedDate
                    ? ` · ${selectedOoz.approvedDate}`
                    : ""}
                </dd>
              </div>
            )}
          </dl>

          {selectedOoz.characteristics.length > 0 && (
            <div className={block("chars")}>
              <h4 className={block("chars-title")}>
                Характеристики объекта ({selectedOoz.characteristics.length})
              </h4>
              <ul className={block("chars-list")}>
                {selectedOoz.characteristics.map((characteristic) => (
                  <li key={characteristic.id} className={block("chars-item")}>
                    <span className={block("chars-category")}>
                      {characteristicCategoryLabels[characteristic.category]}
                    </span>
                    <span className={block("chars-name")}>
                      {characteristic.name}
                    </span>
                    <span className={block("chars-value")}>
                      {formatCharacteristicValue(characteristic)}
                    </span>
                    {characteristic.isMandatoryFromKtru && (
                      <span className={block("chars-tag")}>обяз. КТРУ</span>
                    )}
                    {characteristic.isAdditionalOverKtru && (
                      <span className={block("chars-tag")}>сверх КТРУ</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedOoz.standards.length > 0 && (
            <div className={block("chars")}>
              <h4 className={block("chars-title")}>
                Стандарты и техрегламенты ({selectedOoz.standards.length})
              </h4>
              <ul className={block("chars-list")}>
                {selectedOoz.standards.map((standard) => (
                  <li key={standard.id} className={block("chars-item")}>
                    <span className={block("chars-category")}>
                      {standardTypeLabels[standard.standardType]}
                    </span>
                    <span className={block("chars-name")}>{standard.code}</span>
                    <span className={block("chars-value")}>
                      {standard.title || ""}
                      {standard.hasDeviation ? " · отклонение обосновано" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={eis("inline-group")}>
            <Link to="/norming-requirements" className={eis("link-btn")}>
              Открыть ООЗ в конструкторе
              <ExternalLink size={12} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

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
