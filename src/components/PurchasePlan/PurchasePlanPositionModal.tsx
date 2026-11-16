import { useFieldArray, useForm, useWatch, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import CustomInput from "../UI/CustomInput";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import type { Okpd2Ref } from "../../services/Okpd2Ref/okpd2Ref.schema";
import {
  PurchasePlanPositionSchema,
  buildIdentificationCode,
  buildPositionUniqueNumber,
  nextPurchaseNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  formatMoney,
  okpd2FieldLabels,
  planPeriodLabels,
  positionStatusOptions,
} from "./purchasePlan.config";
import styles from "./PurchasePlanPositionModal.module.scss";

/**
 * Правка одной записи плана-графика (Tasks 7, п. 4): состав полей повторяет
 * карточку позиции из просмотра плана-графика закупок — уникальный номер
 * позиции, планируемый год размещения извещения, номер закупки, ИКЗ,
 * наименование объекта закупки, ОКПД2, объём финансового обеспечения по годам,
 * детализация по кодам бюджетной классификации, статус и обязательное
 * общественное обсуждение.
 *
 * Уникальный номер позиции и ИКЗ формируются системой: заказчику остаётся
 * проверить код, а не набирать его вручную.
 */

interface PurchasePlanPositionModalProps {
  plan: PurchasePlan;
  position: PurchasePlanPosition;
  // Номер записи в плане: нужен, когда заказчик его не указал
  index: number;
  // Все записи плана — по ним считается следующий номер закупки
  positions: PurchasePlanPosition[];
  isNew: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (position: PurchasePlanPosition) => void;
  onDelete?: () => void;
}

// Поля разбивки суммы: графы объёма финансового обеспечения и детализации по КБК
const AMOUNT_FIELDS = [
  { key: "amountTotal", label: "Всего" },
  { key: "amountCurrentYear", label: "Текущий год" },
  { key: "amountPlanPeriodFirstYear", label: "1-й год план." },
  { key: "amountPlanPeriodSecondYear", label: "2-й год план." },
  { key: "amountSubsequentYears", label: "Последующие" },
] as const;

type AmountKey = (typeof AMOUNT_FIELDS)[number]["key"];

export default function PurchasePlanPositionModal({
  plan,
  position,
  index,
  positions,
  isNew,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: PurchasePlanPositionModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "position-modal");
  const labels = planPeriodLabels(plan.planYear);
  // Справочник ОКПД2 даёт признак обязательного нормирования и предельную цену
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const methods = useForm<PurchasePlanPosition>({
    resolver: zodResolver(PurchasePlanPositionSchema),
    defaultValues: {
      ...position,
      serialNumber: position.serialNumber || String(index + 1),
      purchaseNumber: position.purchaseNumber || nextPurchaseNumber(positions),
      status: position.status ?? "planned",
      kbkEntries: position.kbkEntries ?? [],
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = methods;
  const kbkEntries = useFieldArray({ control, name: "kbkEntries" });

  const serialNumber = useWatch({ control, name: "serialNumber" });
  const purchaseNumber = useWatch({ control, name: "purchaseNumber" });
  const okpd2Code = useWatch({ control, name: "okpd2Code" });
  const okpd2Name = useWatch({ control, name: "okpd2Name" });
  const objectOfPurchase = useWatch({ control, name: "objectOfPurchase" });

  const uniqueNumber =
    getValues("uniqueNumber") ||
    buildPositionUniqueNumber(plan.planNumber, serialNumber);

  // Предельная цена единицы по ПП РФ N 926: предупреждаем прямо в записи ПГ
  const normedRef = findOkpd2ByCode(okpd2Refs, okpd2Code);

  function handleOkpd2Select(item: Okpd2Ref | null) {
    setValue("okpd2Code", item?.code ?? "", { shouldValidate: true });
    setValue("okpd2Name", item?.name ?? "", { shouldValidate: true });

    // Наименование объекта закупки по умолчанию принимает наименование по
    // ОКПД2, но остаётся редактируемым (Tasks 7, п. 4)
    if (item && !String(objectOfPurchase ?? "").trim()) {
      setValue("objectOfPurchase", item.name, { shouldValidate: true });
    }
  }

  function fillIdentificationCode() {
    const code = buildIdentificationCode({
      planYear: plan.planYear,
      inn: plan.customer.inn,
      kpp: plan.customer.kpp,
      purchaseNumber,
      serialNumber,
      kbk: getValues("kbk") || getValues("kbkEntries.0.kbk"),
    });

    if (!code) {
      window.alert(
        "ИКЗ пока не из чего собрать: нужны ИНН и КПП заказчика, номер закупки, номер записи и КБК из детализации.",
      );

      return;
    }

    setValue("identificationCode", code, { shouldValidate: true });
  }

  function onSubmit(data: PurchasePlanPosition) {
    onSave({
      ...data,
      // Номер записи и её уникальный номер выдаёт система
      serialNumber: data.serialNumber || String(index + 1),
      uniqueNumber:
        data.uniqueNumber ||
        buildPositionUniqueNumber(plan.planNumber, serialNumber),
      kbk: data.kbk || data.kbkEntries?.[0]?.kbk || "",
    });
  }

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)[path]?.message;

  return (
    <CustomModal onClose={onClose}>
      <FormProvider {...methods}>
        <form className={block()} onSubmit={handleSubmit(onSubmit)}>
        <header className={block("header")}>
          <h2 className={block("title")}>
            {isNew
              ? "Новая запись плана-графика"
              : `Запись плана-графика № ${serialNumber || index + 1}`}
          </h2>
          <p className={block("caption")}>
            План-график {plan.planNumber} · изменения касаются только этой
            записи
          </p>
        </header>

        <fieldset className={block("section")}>
          <legend>Общие сведения позиции</legend>
          <div className={block("grid")}>
            <CustomInput
              configuration={{
                label: { value: "№ п/п записи" },
                input: { name: "serialNumber", placeholder: "1" },
              }}
            />
            <div className={block("field")}>
              <span className={block("label")}>
                Уникальный номер позиции в плане-графике закупок
              </span>
              <input
                className={block("input", ["readonly"])}
                value={uniqueNumber || "сформируется при сохранении"}
                readOnly
              />
            </div>
            <div className={block("field")}>
              <CustomInput
                configuration={{
                  label: { value: "Номер закупки, включенной в план-график" },
                  input: { name: "purchaseNumber", placeholder: "0001" },
                }}
              />
              <button
                type="button"
                className={block("link")}
                onClick={() =>
                  setValue("purchaseNumber", nextPurchaseNumber(positions), {
                    shouldValidate: true,
                  })
                }
              >
                Взять следующий номер
              </button>
            </div>
            <CustomInput
              configuration={{
                label: { value: "Планируемый год размещения извещения" },
                input: { name: "plannedPlacementYear", placeholder: "2026" },
              }}
            />
            <div className={block("field")}>
              <CustomInput
                configuration={{
                  label: { value: "Идентификационный код закупки (ИКЗ)" },
                  input: {
                    name: "identificationCode",
                    placeholder: "262462904043946320123000244",
                  },
                }}
              />
              <button
                type="button"
                className={block("link")}
                onClick={fillIdentificationCode}
              >
                Сформировать ИКЗ автоматически
              </button>
            </div>
          </div>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Информация об объекте закупки</legend>
          <div className={block("grid")}>
            <div className={block("field", ["okpd2"])}>
              <label className={block("label")} htmlFor="position-okpd2">
                {okpd2FieldLabels.code}
              </label>
              <Okpd2Select
                id="position-okpd2"
                code={okpd2Code}
                name={okpd2Name}
                onSelect={handleOkpd2Select}
              />
              {errors.okpd2Code && (
                <span className={block("error")}>
                  {String(errors.okpd2Code.message)}
                </span>
              )}
              {normedRef?.isNormed && (
                <span className={block("hint", ["norm"])}>
                  Код {normedRef.code} подлежит обязательному нормированию.
                  {normedRef.normLimit !== undefined
                    ? ` Предельная цена единицы — ${formatMoney(normedRef.normLimit)}.`
                    : ""}
                </span>
              )}
            </div>
            <CustomInput
              configuration={{
                label: { value: "Наименование объекта закупки" },
                input: {
                  name: "objectOfPurchase",
                  placeholder: "Наименование по ОКПД2, правится заказчиком",
                },
              }}
            />
            <CustomInput
              configuration={{
                label: { value: "Наименование позиции по КТРУ (при наличии)" },
                input: { name: "objectName" },
              }}
            />
          </div>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Объем финансового обеспечения закупки (рублей)</legend>
          <div className={block("grid", ["amounts"])}>
            {AMOUNT_FIELDS.map((field) => (
              <CustomInput
                key={field.key}
                configuration={{
                  label: {
                    value:
                      field.key === "amountTotal"
                        ? "Всего, рублей"
                        : `Сумма на ${labelsAmountSuffix(field.key)}`,
                  },
                  input: { name: field.key, placeholder: "0.00" },
                }}
              />
            ))}
          </div>
          <p className={block("hint")}>
            {labels.currentYear}; {labels.firstPlanYear};{" "}
            {labels.secondPlanYear}; {labels.subsequentYears}.
          </p>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>
            Детализация по кодам бюджетной классификации (
            {kbkEntries.fields.length})
          </legend>

          {kbkEntries.fields.length === 0 && (
            <p className={block("hint")}>
              Коды бюджетной классификации не указаны — добавьте их кнопкой
              ниже, если закупка финансируется по нескольким кодам.
            </p>
          )}

          <ul className={block("kbk-list")}>
            {kbkEntries.fields.map((field, entryIndex) => (
              <li className={block("kbk-row")} key={field.id}>
                <div className={block("kbk-code")}>
                  <CustomInput
                    configuration={{
                      label: {
                        value:
                          entryIndex === 0
                            ? "Код бюджетной классификации"
                            : undefined,
                      },
                      input: {
                        name: `kbkEntries.${entryIndex}.kbk`,
                        placeholder: "20011000000000000000",
                      },
                    }}
                  />
                </div>
                <div className={block("kbk-amounts")}>
                  {AMOUNT_FIELDS.map((amount) => (
                    <CustomInput
                      key={amount.key}
                      configuration={{
                        label: {
                          value: entryIndex === 0 ? amount.label : undefined,
                        },
                        input: {
                          name: `kbkEntries.${entryIndex}.${amount.key}`,
                          placeholder: "0.00",
                        },
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className={block("remove")}
                  onClick={() => kbkEntries.remove(entryIndex)}
                >
                  Убрать
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={block("add")}
            onClick={() => kbkEntries.append({ kbk: "" })}
          >
            Добавить КБК
          </button>
          <p className={block("hint")}>
            Кодов может быть сколько угодно: суммы по годам указываются, только
            когда закупка разнесена по кодам.
          </p>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Статус записи и порядок проведения</legend>
          <div className={block("grid")}>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="position-status">
                Статус записи плана-графика
              </label>
              <select
                id="position-status"
                className={block("select")}
                {...register("status")}
              >
                {positionStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <CustomInput
              configuration={{
                label: {
                  value: "Дата размещения записи (прохождения контроля)",
                },
                input: { name: "statusDate", type: "date" },
              }}
            />
            <CustomInput
              configuration={{
                label: { value: "Уполномоченный орган (учреждение)" },
                input: { name: "authorizedBodyName" },
              }}
            />
            <CustomInput
              configuration={{
                label: { value: "Организатор совместной закупки" },
                input: { name: "jointOrganizerName" },
              }}
            />
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("isPublicDiscussionRequired")}
              />
              Необходимо обязательное общественное обсуждение (ст. 20 44-ФЗ)
            </label>
          </div>
        </fieldset>

        <footer className={block("footer")}>
          {errorText("amountTotal") && (
            <span className={block("error")}>{errorText("amountTotal")}</span>
          )}
          {errorText("objectOfPurchase") && (
            <span className={block("error")}>
              {errorText("objectOfPurchase")}
            </span>
          )}
          <div className={block("footer-actions")}>
            {!isNew && onDelete && (
              <button
                type="button"
                className={block("danger")}
                onClick={onDelete}
                disabled={isSaving}
              >
                Удалить запись
              </button>
            )}
            <button type="button" onClick={onClose} disabled={isSaving}>
              Отмена
            </button>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить запись"}
            </button>
          </div>
        </footer>
        </form>
      </FormProvider>
    </CustomModal>
  );

  // Подпись графы планируемого платежа по году планирования
  function labelsAmountSuffix(key: AmountKey): string {
    switch (key) {
      case "amountCurrentYear":
        return `${labels.currentYear.replace("на ", "")}`;
      case "amountPlanPeriodFirstYear":
        return `${labels.firstPlanYear.replace("на ", "")}`;
      case "amountPlanPeriodSecondYear":
        return `${labels.secondPlanYear.replace("на ", "")}`;
      case "amountSubsequentYears":
        return `${labels.subsequentYears.replace("на ", "")}`;
      default:
        return "последующие годы";
    }
  }
}
