import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import {
  PURCHASE_DESCRIPTION_REVIEW_DAYS,
  PurchaseDescriptionSchema,
  emptyPurchaseDescription,
  purchaseDescriptionItemAmount,
  purchaseDescriptionTotal,
  type PurchaseDescription,
  type PurchaseDescriptionAuthor,
} from "../../services/PurchaseDescription/purchaseDescription.schema";
import {
  useCreatePurchaseDescription,
  useUpdatePurchaseDescription,
} from "../../services/PurchaseDescription/purchaseDescription.api";
import styles from "./PurchaseDescriptionModal.module.scss";

/**
 * Черновик описания объекта закупки (Tasks 8, п. 4).
 *
 * Заполняет инициатор закупки — подразделение-заказчик, не входящее в
 * контрактную службу. Поля повторяют структуру описания по ПП РФ от
 * 08.02.2017 N 145 (наименование, ОКПД2, требования) и позволяют сразу
 * посчитать смету (дефектовку) позициями, а не в Excel.
 *
 * Направление в КС — отдельное действие на странице: черновик можно
 * сохранить и вернуться к нему позже.
 */

interface PurchaseDescriptionModalProps {
  organizationId: string | number;
  author: PurchaseDescriptionAuthor;
  // null/undefined — создание нового описания
  description?: PurchaseDescription | null;
  onClose: () => void;
}

type FieldErrorMap = Record<string, { message?: string } | undefined>;

// Дата изменения — на модульном уровне: вызов Date внутри компонента
// React Compiler считает нечистой функцией при рендере
const today = (): string => new Date().toISOString().slice(0, 10);

export default function PurchaseDescriptionModal({
  organizationId,
  author,
  description,
  onClose,
}: PurchaseDescriptionModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "purchase-description-modal");

  const createDescription = useCreatePurchaseDescription();
  const updateDescription = useUpdatePurchaseDescription();
  const isPending = createDescription.isPending || updateDescription.isPending;
  const mutationError = createDescription.error ?? updateDescription.error;

  const methods = useForm({
    resolver: zodResolver(PurchaseDescriptionSchema),
    defaultValues:
      description ?? emptyPurchaseDescription(organizationId, author),
  });

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = methods;

  // Строки сметы: добавляются и удаляются без перезагрузки формы
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const fieldError = (path: string): string | undefined =>
    (errors as unknown as FieldErrorMap)?.[path]?.message;

  const itemError = (index: number, key: string): string | undefined => {
    const items = (errors as unknown as { items?: FieldErrorMap[] }).items;

    return items?.[index]?.[key]?.message;
  };

  // useWatch вместо watch: watch внутри рендера React Compiler не мемоизирует
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const okpd2Code = useWatch({ control, name: "okpd2Code" });
  const okpd2Name = useWatch({ control, name: "okpd2Name" });
  const total = purchaseDescriptionTotal({ items: watchedItems });

  function onSubmit(data: PurchaseDescription) {
    const payload = {
      ...data,
      updatedAt: today(),
    };

    if (description?.id) {
      updateDescription.mutate(
        { ...payload, id: description.id },
        { onSuccess: onClose },
      );

      return;
    }

    createDescription.mutate(payload, { onSuccess: onClose });
  }

  return (
    <CustomModal onClose={onClose}>
      <form className={block()} onSubmit={handleSubmit(onSubmit)}>
        <header className={block("header")}>
          <h2 className={block("title")}>
            {description ? "Описание объекта закупки" : "Новое описание объекта закупки"}
          </h2>
          <p className={block("caption")}>
            Инициатор: {author.employeeName || "—"}
            {author.structuralUnitName ? ` · ${author.structuralUnitName}` : ""}
          </p>
        </header>

        <fieldset className={block("section")}>
          <legend>Объект закупки</legend>
          <div className={block("grid")}>
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="description-title">
                Наименование объекта закупки
              </label>
              <input
                id="description-title"
                className={block("input")}
                {...register("title")}
                placeholder="Поставка, работа или услуга — что именно нужно заказчику"
              />
              {fieldError("title") && (
                <span className={block("error")}>{fieldError("title")}</span>
              )}
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="description-okpd2">
                Код и наименование по ОКПД2
              </label>
              <Okpd2Select
                id="description-okpd2"
                code={okpd2Code}
                name={okpd2Name}
                onSelect={(item) => {
                  setValue("okpd2Code", item?.code ?? "");
                  setValue("okpd2Name", item?.name ?? "");
                }}
              />
              <p className={block("hint")}>
                Для нормируемых кодов действуют типовые требования по п. 7
                ПП РФ N 926 — их указывают ниже, а цену за единицу проверит
                контрактная служба при обосновании НМЦК.
              </p>
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="description-requirements">
                Требования к товару, работе, услуге
              </label>
              <textarea
                id="description-requirements"
                className={block("textarea")}
                {...register("requirements")}
                placeholder="Потребительские свойства, качественные, функциональные и экологические характеристики, иные требования"
              />
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="description-justification">
                Обоснование потребности
              </label>
              <textarea
                id="description-justification"
                className={block("textarea")}
                {...register("justification")}
                placeholder="Зачем заказчику закупка: потребность подразделения, сроки, ожидаемый результат"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Смета / дефектовка</legend>

          {fields.length === 0 ? (
            <p className={block("hint")}>
              Позиций пока нет. Смету можно не заполнять, если она готовится
              отдельно, но с ней контрактной службе проще обосновать НМЦК.
            </p>
          ) : (
            <div className={block("items")}>
              <div className={block("item-row", ["head"])}>
                <span>Наименование</span>
                <span>Ед.</span>
                <span>Кол-во</span>
                <span>Цена, ₽</span>
                <span>Сумма, ₽</span>
                <span />
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className={block("item-row")}>
                  <div className={block("item-cell")}>
                    <input
                      className={block("input")}
                      {...register(`items.${index}.name`)}
                      placeholder="Позиция сметы"
                    />
                    {itemError(index, "name") && (
                      <span className={block("error")}>
                        {itemError(index, "name")}
                      </span>
                    )}
                  </div>
                  <input
                    className={block("input")}
                    {...register(`items.${index}.unit`)}
                    placeholder="шт"
                  />
                  <div className={block("item-cell")}>
                    <input
                      className={block("input")}
                      {...register(`items.${index}.quantity`)}
                      placeholder="0"
                    />
                    {itemError(index, "quantity") && (
                      <span className={block("error")}>
                        {itemError(index, "quantity")}
                      </span>
                    )}
                  </div>
                  <div className={block("item-cell")}>
                    <input
                      className={block("input")}
                      {...register(`items.${index}.unitPrice`)}
                      placeholder="0.00"
                    />
                    {itemError(index, "unitPrice") && (
                      <span className={block("error")}>
                        {itemError(index, "unitPrice")}
                      </span>
                    )}
                  </div>
                  <span className={block("item-sum")}>
                    {purchaseDescriptionItemAmount({
                      id: field.id,
                      name: field.name,
                      unit: field.unit,
                      // Значения берём из уже подписанного watch("items"):
                      // вызов watch внутри map небезопасен для React Compiler
                      quantity: watchedItems[index]?.quantity,
                      unitPrice: watchedItems[index]?.unitPrice,
                    }).toLocaleString("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <button
                    type="button"
                    className={block("item-remove")}
                    onClick={() => remove(index)}
                    aria-label="Удалить позицию"
                    title="Удалить позицию"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={block("items-footer")}>
            <button
              type="button"
              className={block("add-item")}
              onClick={() =>
                append({ name: "", unit: "", quantity: "", unitPrice: "" })
              }
            >
              + Добавить позицию
            </button>
            <span className={block("total")}>
              Итого:{" "}
              {total.toLocaleString("ru-RU", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              ₽
            </span>
          </div>

          {total > 0 && (
            <p className={block("hint")}>
              Сумма сметы — предварительная. НМЦК обосновывает контрактная
              служба; описание нужно, чтобы у неё был состав закупки.
            </p>
          )}
        </fieldset>

        <footer className={block("footer")}>
          {mutationError && (
            <span className={block("error")}>
              Описание не сохранено: {String(mutationError)}
            </span>
          )}
          <p className={block("hint")}>
            После сохранения черновик можно направить в контрактную службу —
            там появится задача проверить описание и поставить позицию в
            план-график (срок рассмотрения — {PURCHASE_DESCRIPTION_REVIEW_DAYS}{" "}
            дней).
          </p>
          <div className={block("footer-actions")}>
            <button type="button" onClick={onClose} disabled={isPending}>
              Отмена
            </button>
            <button type="submit" disabled={isPending}>
              {isPending
                ? "Сохранение..."
                : description
                  ? "Сохранить изменения"
                  : "Сохранить черновик"}
            </button>
          </div>
        </footer>
      </form>
    </CustomModal>
  );
}
