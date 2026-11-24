import { useEffect, useMemo, useRef, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  getObjectDescriptionOkpd2Codes,
  OBJECT_DESCRIPTION_PRODUCT_TYPE_LABELS,
  OBJECT_DESCRIPTION_PRODUCT_TYPES,
  type ObjectDescription,
} from "../../services/ObjectDescription/objectDescription.schema";
import {
  useCreatePurchaseObject,
  useDeletePurchaseObject,
  usePurchaseObjects,
  useUpdatePurchaseObject,
} from "../../services/PurchaseObject/purchaseObject.api";
import {
  buildPurchaseObjectsFromDescription,
  emptyPurchaseObject,
  type PurchaseObject,
  type PurchaseObjectInput,
} from "../../services/PurchaseObject/purchaseObject.schema";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import styles from "./NormingRequirementsPage.module.scss";

interface PurchaseObjectsSectionProps {
  description: ObjectDescription;
  organizationId?: string | number;
  activeObjectId?: string | number | null;
  allowedCodes?: string[];
  disabled?: boolean;
  /** Типовые ООЗ, из которых можно повторно использовать объекты. */
  templates?: ObjectDescription[];
  /** Реквизиты текущей позиции ПГ для объектов из шаблона/истории. */
  positionRequisites?: {
    plan2020Number?: string;
    positionUniqueNumber?: string;
    positionSerialNumber?: string;
  };
  onSelect: (object: PurchaseObject) => void;
}

interface ReusableObjectCandidate {
  key: string;
  label: string;
  source: "template" | "history";
  sourceObjectId?: string | number;
  payload: PurchaseObjectInput;
}

/**
 * Список полноценных объектов закупки в карточке ООЗ.
 *
 * Раньше дополнительные коды ОКПД2 хранились плоским списком внутри ООЗ и
 * все объекты делили одни характеристики. Здесь каждый объект — отдельный
 * документ (`purchaseObjects`) со своим кодом, КТРУ, единицей, количеством,
 * характеристиками и ссылкой на родительский объект (ЕИС 17.0).
 */
export default function PurchaseObjectsSection({
  description,
  organizationId,
  activeObjectId,
  allowedCodes = [],
  disabled = false,
  templates = [],
  positionRequisites,
  onSelect,
}: PurchaseObjectsSectionProps) {
  const { bem } = useUtils();
  const block = bem(styles, "norming-requirements");

  const { data: allObjects = [], isLoading } = usePurchaseObjects(
    organizationId ?? description.organizationId ?? undefined,
  );
  const createObject = useCreatePurchaseObject();
  const updateObject = useUpdatePurchaseObject();
  const deleteObject = useDeletePurchaseObject();

  const objects = useMemo(
    () =>
      allObjects.filter(
        (item) =>
          item.objectDescriptionId !== undefined &&
          String(item.objectDescriptionId) === String(description.id),
      ),
    [allObjects, description.id],
  );

  // ООЗ без отдельных объектов (в том числе старые с плоским okpd2Items)
  // мигрируются один раз: каждый код становится отдельным объектом,
  // характеристики остаются у первого. ООЗ без кода просто не даёт объектов.
  const migratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!description.id || isLoading || objects.length > 0) return;
    const key = String(description.id);
    if (migratedRef.current === key) return;
    const codes = getObjectDescriptionOkpd2Codes(description);
    if (codes.length === 0) return;
    migratedRef.current = key;
    buildPurchaseObjectsFromDescription(description).forEach((payload) =>
      createObject.mutate(payload),
    );
  }, [description, isLoading, objects.length, createObject]);

  const parents = objects.filter(
    (item) => item.productType === "WORK" || item.productType === "SERVICE",
  );

  // Повторное использование: объект ищется в типовых ООЗ и в истории закупок
  // организации. Характеристики и стандарты копируются целиком, а связь с
  // текущей позицией ПГ и ООЗ назначается заново.
  const candidates = useMemo<ReusableObjectCandidate[]>(() => {
    const seen = new Set<string>();
    const fromTemplates = templates.flatMap((template) =>
      buildPurchaseObjectsFromDescription(template).map((object) => ({
        key: `template-${template.id}-${object.okpd2Code}`,
        label: `[Шаблон] ${object.name || template.title} (${object.okpd2Code}) — ${template.title}`,
        source: "template" as const,
        sourceObjectId: template.id,
        payload: object,
      })),
    );
    const fromHistory = allObjects
      .filter(
        (item) =>
          item.objectDescriptionId === undefined ||
          String(item.objectDescriptionId) !== String(description.id),
      )
      .map((item) => ({
        key: `history-${item.id}`,
        label: `[История] ${item.name} (${item.okpd2Code})${item.source === "template" ? " — из шаблона" : ""}`,
        source: (item.source === "template" ? "template" : "history") as
          | "template"
          | "history",
        sourceObjectId: item.id,
        payload: item,
      }));
    return [...fromTemplates, ...fromHistory].filter((candidate) => {
      const key = `${candidate.source}:${candidate.payload.okpd2Code}:${candidate.payload.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [templates, allObjects, description.id]);

  const [selectedCandidate, setSelectedCandidate] = useState("");

  const handleAddObject = () => {
    createObject.mutate(
      {
        ...emptyPurchaseObject(),
        organizationId:
          organizationId ?? description.organizationId ?? undefined,
        objectDescriptionId: description.id,
        purchasePlanId: description.purchasePlanId,
        positionId: description.positionId,
        ikz: description.ikz ?? "",
        plan2020Number: positionRequisites?.plan2020Number ?? "",
        positionUniqueNumber: positionRequisites?.positionUniqueNumber ?? "",
        positionSerialNumber: positionRequisites?.positionSerialNumber ?? "",
        okpd2Code: allowedCodes[0] ?? description.okpd2Code ?? "",
        okpd2Name: description.okpd2Name ?? "",
        name: description.title,
        unit: description.unit ?? "",
        quantity: description.quantity || "1",
      },
      { onSuccess: onSelect },
    );
  };

  const handleReuseObject = () => {
    const candidate = candidates.find(
      (item) => item.key === selectedCandidate,
    );
    if (!candidate) return;
    const payload: PurchaseObjectInput = { ...candidate.payload };
    // Идентификаторы и старые связи не копируются: новый объект получает
    // собственный sid, привязку к текущему ООЗ/ПГ и чистую родительскую связь.
    delete payload.id;
    delete payload.objectDescriptionId;
    delete payload.purchaseNoteId;
    delete payload.externalSid;
    delete payload.parentObjectId;
    delete payload.parentExternalSid;
    delete payload.createdAt;
    delete payload.updatedAt;
    createObject.mutate(
      {
        ...payload,
        organizationId:
          organizationId ?? description.organizationId ?? undefined,
        objectDescriptionId: description.id,
        purchasePlanId: description.purchasePlanId,
        positionId: description.positionId,
        ikz: description.ikz ?? "",
        plan2020Number:
          positionRequisites?.plan2020Number ?? payload.plan2020Number ?? "",
        positionUniqueNumber:
          positionRequisites?.positionUniqueNumber ??
          payload.positionUniqueNumber ??
          "",
        positionSerialNumber:
          positionRequisites?.positionSerialNumber ??
          payload.positionSerialNumber ??
          "",
        source: candidate.source,
        sourceObjectId: candidate.sourceObjectId,
        status: "draft",
      },
      {
        onSuccess: (created) => {
          setSelectedCandidate("");
          onSelect(created);
        },
      },
    );
  };

  return (
    <div className={block("okpd2-list")}>
      <div className={block("label-row")}>
        <span className={block("label")}>
          Объекты закупки ({objects.length})
        </span>
        <button
          type="button"
          className={block("inline-btn")}
          disabled={disabled || !description.id || createObject.isPending}
          onClick={handleAddObject}
        >
          + Добавить объект
        </button>
      </div>
      {!description.id && (
        <p className={block("field-hint")}>
          Сохраните описание закупки, чтобы добавлять отдельные объекты.
        </p>
      )}

      {candidates.length > 0 && (
        <div className={block("reuse-row")}>
          <div className={block("field", ["grow"])}>
            <label className={block("label")}>
              Повторное использование из шаблона или истории
            </label>
            <select
              className={block("select")}
              value={selectedCandidate}
              disabled={disabled || !description.id || createObject.isPending}
              onChange={(event) => setSelectedCandidate(event.target.value)}
            >
              <option value="">— Выберите объект —</option>
              {candidates.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={block("secondary-btn")}
            disabled={
              disabled ||
              !description.id ||
              !selectedCandidate ||
              createObject.isPending
            }
            onClick={handleReuseObject}
          >
            Добавить выбранный объект
          </button>
        </div>
      )}

      {isLoading && (
        <p className={block("field-hint")}>Загружаем объекты закупки…</p>
      )}

      {objects.map((object, index) => {
        const active = String(object.id) === String(activeObjectId);
        return (
          <div
            className={block("okpd2-item")}
            key={String(object.id)}
            data-active={active ? "true" : undefined}
          >
            <button
              type="button"
              className={block("secondary-btn")}
              disabled={disabled}
              onClick={() => onSelect(object)}
            >
              {active ? "✓ Объект " : "Выбрать объект "}
              {index + 1}
              {object.source && object.source !== "manual" && (
                <span className={block("source-badge")}>
                  {object.source === "template" ? "шаблон" : "история"}
                </span>
              )}
            </button>

            <div className={block("field", ["grow"])}>
              <label className={block("label")}>Наименование объекта</label>
              <input
                className={block("input")}
                value={object.name}
                disabled={disabled}
                onChange={(event) =>
                  updateObject.mutate({
                    id: object.id!,
                    name: event.target.value,
                  })
                }
              />
            </div>

            <div className={block("field", ["grow"])}>
              <label className={block("label")}>Код ОКПД2</label>
              <Okpd2Select
                code={object.okpd2Code}
                name={object.okpd2Name}
                allowedCodes={allowedCodes}
                initialQuery={object.okpd2Code || allowedCodes[0] || ""}
                onSelect={(item) =>
                  updateObject.mutate({
                    id: object.id!,
                    okpd2Code: item?.code ?? "",
                    okpd2Name: item?.name ?? "",
                  })
                }
              />
            </div>

            <div className={block("field")}>
              <label className={block("label")}>Тип</label>
              <select
                className={block("select")}
                value={object.productType ?? "PRODUCT"}
                disabled={disabled}
                onChange={(event) =>
                  updateObject.mutate({
                    id: object.id!,
                    productType: event.target.value as PurchaseObject["productType"],
                  })
                }
              >
                {OBJECT_DESCRIPTION_PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {OBJECT_DESCRIPTION_PRODUCT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className={block("field")}>
              <label className={block("label")}>Количество</label>
              <input
                className={block("input")}
                value={object.quantity ?? ""}
                disabled={disabled}
                onChange={(event) =>
                  updateObject.mutate({
                    id: object.id!,
                    quantity: event.target.value,
                  })
                }
              />
            </div>

            <label className={block("checkbox-label")}>
              <input
                type="checkbox"
                checked={Boolean(object.isPartOfWorkService)}
                disabled={disabled}
                onChange={(event) =>
                  updateObject.mutate({
                    id: object.id!,
                    isPartOfWorkService: event.target.checked,
                  })
                }
              />
              Входит в состав работы или услуги
            </label>

            {object.isPartOfWorkService && (
              <div className={block("field", ["grow"])}>
                <label className={block("label")}>Родительский объект</label>
                <select
                  className={block("select")}
                  value={
                    object.parentObjectId !== undefined
                      ? String(object.parentObjectId)
                      : ""
                  }
                  disabled={disabled}
                  onChange={(event) => {
                    const parent = parents.find(
                      (item) => String(item.id) === event.target.value,
                    );
                    updateObject.mutate({
                      id: object.id!,
                      parentObjectId: parent?.id,
                      parentExternalSid: parent?.externalSid || String(parent?.id ?? ""),
                      parentOkpd2Code: parent?.okpd2Code,
                      parentOkpd2Name: parent?.okpd2Name,
                    });
                  }}
                >
                  <option value="">— Не выбран —</option>
                  {parents
                    .filter((item) => String(item.id) !== String(object.id))
                    .map((item) => (
                      <option key={String(item.id)} value={String(item.id)}>
                        {item.name} ({item.okpd2Code})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className={block("secondary-btn")}
              disabled={disabled}
              onClick={() => deleteObject.mutate(object.id!)}
            >
              Удалить
            </button>
          </div>
        );
      })}

      {description.id && objects.length === 0 && !isLoading && (
        <p className={block("field-hint")}>
          Объекты ещё не добавлены. Нажмите «Добавить объект» — у каждого будут
          свои характеристики, единица и количество.
        </p>
      )}
    </div>
  );
}
