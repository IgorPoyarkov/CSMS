import { useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  FormProvider,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import CustomInput from "../UI/CustomInput";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import { checkOkpd2AuctionList } from "../../services/Okpd2Ref/auctionListControl";
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
  modificationDecisionOptions,
  modificationStatusOptions,
  okpd2FieldLabels,
  planPeriodLabels,
  positionStatusOptions,
  tpChangeReasonOptions,
} from "./purchasePlan.config";
import {
  AUTHORIZED_BODIES,
  getOrganizersByAuthorizedBody,
} from "./purchasePlan.mock";
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

  const [ikzBuildError, setIkzBuildError] = useState<string | null>(null);

  const methods = useForm<PurchasePlanPosition>({
    resolver: zodResolver(PurchasePlanPositionSchema),
    defaultValues: {
      ...position,
      serialNumber: position.serialNumber || String(index + 1),
      purchaseNumber: position.purchaseNumber || nextPurchaseNumber(positions),
      purchaseOrderNumber: position.purchaseOrderNumber || "000",
      status: position.status ?? "planned",
      modificationStatus: position.modificationStatus ?? (isNew ? "N" : "E"),
      modificationDecision: position.modificationDecision ?? "notSpecified",
      kbkEntries: position.kbkEntries ?? [],
      kvrEntries: position.kvrEntries ?? [],
      koksEntries: position.koksEntries ?? [],
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
  const koksEntries = useFieldArray({ control, name: "koksEntries" });

  const serialNumber = useWatch({ control, name: "serialNumber" });
  const purchaseNumber = useWatch({ control, name: "purchaseNumber" });
  const okpd2Code = useWatch({ control, name: "okpd2Code" });
  const okpd2Name = useWatch({ control, name: "okpd2Name" });
  const objectOfPurchase = useWatch({ control, name: "objectOfPurchase" });
  const positionStatus = useWatch({ control, name: "status" });
  const isConstructionWorks = useWatch({
    control,
    name: "isConstructionWorks",
  });
  const hasMultipleOkpd2 = useWatch({ control, name: "hasMultipleOkpd2" });
  const authorizedBodyName = useWatch({ control, name: "authorizedBodyName" });

  const uniqueNumber =
    getValues("uniqueNumber") ||
    buildPositionUniqueNumber(plan.planNumber, serialNumber);

  // Предельная цена единицы по ПП РФ N 926: предупреждаем прямо в записи ПГ
  const normedRef = findOkpd2ByCode(okpd2Refs, okpd2Code);
  const auctionCheck = checkOkpd2AuctionList(okpd2Code, okpd2Refs);

  // Фильтрованные организаторы по выбранному уполномоченному органу
  const organizers = getOrganizersByAuthorizedBody(authorizedBodyName);

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
    setIkzBuildError(null);
    const kbkVal = getValues("kbk") || getValues("kbkEntries.0.kbk");
    const kvrVal = getValues("kvr");
    const code = buildIdentificationCode({
      planYear: getValues("plannedPlacementYear") || plan.planYear,
      inn: plan.customer.inn,
      kpp: plan.customer.kpp,
      iku: getValues("iku"),
      purchaseNumber,
      purchaseOrderNumber: getValues("purchaseOrderNumber") || "000",
      serialNumber,
      okpd2Code: getValues("okpd2Code"),
      hasMultipleOkpd2: Boolean(getValues("hasMultipleOkpd2")),
      kvr: kvrVal,
      kbk: kbkVal,
    });

    if (!code) {
      setIkzBuildError(
        "Для формирования 36-значного ИКЗ укажите ИНН/КПП заказчика (или 20-значный ИКУ), номер закупки, КВР (3 цифры) или 20-значный КБК.",
      );
      return;
    }

    setValue("identificationCode", code, { shouldValidate: true });
  }

  function onSubmit(data: PurchasePlanPosition) {
    const resolvedKbk = data.kbk || data.kbkEntries?.[0]?.kbk || "";
    const resolvedKvr =
      data.kvr || (resolvedKbk.length >= 3 ? resolvedKbk.slice(-3) : "");
    onSave({
      ...data,
      // Номер записи и её уникальный номер выдаёт система
      serialNumber: data.serialNumber || String(index + 1),
      uniqueNumber:
        data.uniqueNumber ||
        buildPositionUniqueNumber(plan.planNumber, serialNumber),
      kbk: resolvedKbk,
      kvr: resolvedKvr,
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
              <CustomInput
                configuration={{
                  label: {
                    value: "Внешний номер позиции (extNumber, ЕИС 17.0)",
                  },
                  input: { name: "extNumber", placeholder: "PG-2026-0001" },
                }}
              />
              <CustomInput
                configuration={{
                  label: { value: "Порядковый № закупки в ИКЗ (3 знака)" },
                  input: { name: "purchaseOrderNumber", placeholder: "000" },
                }}
              />
              <CustomInput
                configuration={{
                  label: { value: "ИКУ заказчика (20 знаков, опционально)" },
                  input: { name: "iku", placeholder: "77012345677701010011" },
                }}
              />
              <CustomInput
                configuration={{
                  label: { value: "Код вида расходов — КВР (3 цифры)" },
                  input: { name: "kvr", placeholder: "244" },
                }}
              />
              <div className={block("field")}>
                <CustomInput
                  configuration={{
                    label: {
                      value: "Идентификационный код закупки (ИКЗ, 36 знаков)",
                    },
                    input: {
                      name: "identificationCode",
                      placeholder: "267701234567770101001100010003250244",
                    },
                  }}
                />
                <button
                  type="button"
                  className={block("link")}
                  onClick={fillIdentificationCode}
                >
                  Сформировать 36-значный ИКЗ автоматически (ikzCodeType)
                </button>
                {ikzBuildError && (
                  <span className={block("error")}>{ikzBuildError}</span>
                )}
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
                {auctionCheck.inAuctionList && (
                  <span className={block("hint", ["norm"])}>
                    Код {auctionCheck.code} включён в аукционный перечень (РП РФ
                    № 471-р): при конкурентной закупке обязателен электронный
                    аукцион (проведение конкурса неправомерно по ч. 6 ст. 24
                    44-ФЗ).
                  </span>
                )}
              </div>
              <CustomInput
                configuration={{
                  label: { value: "Тексарии" },
                  input: {
                    name: "objectOfPurchase",
                    placeholder: "Наименование по ОКПД2, правится заказчиком",
                  },
                }}
              />
              <CustomInput
                configuration={{
                  label: { value: "Код позиции по КТРУ (при наличии)" },
                  input: {
                    name: "ktruCode",
                    placeholder: "26.20.15.000-00000001",
                  },
                }}
              />
              <CustomInput
                configuration={{
                  label: {
                    value: "Наименование позиции по КТРУ (при наличии)",
                  },
                  input: { name: "objectName" },
                }}
              />
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("hasMultipleOkpd2")} />
                Несколько кодов ОКПД2 (в разрядах 30–33 ИКЗ ставится «0000»)
              </label>
              {hasMultipleOkpd2 && (
                <p className={block("hint")}>
                  При наличии нескольких позиций ОКПД2 в ИКЗ по XSD 17.0
                  автоматически проставляется значение «0000».
                </p>
              )}
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
              Кодов может быть сколько угодно: суммы по годам указываются,
              только когда закупка разнесена по кодам.
            </p>
          </fieldset>

          <fieldset className={block("section")}>
            <legend>Статус записи, признаки ЕИС 17.0 и изменения</legend>
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
              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="authorized-body-select"
                >
                  Уполномоченный орган (учреждение)
                </label>
                <select
                  id="authorized-body-select"
                  className={block("select")}
                  {...register("authorizedBodyName")}
                >
                  <option value="">Выберите уполномоченный орган</option>
                  {AUTHORIZED_BODIES.map((body) => (
                    <option key={body.id} value={body.name}>
                      {body.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="joint-organizer-select"
                >
                  Организатор совместной закупки
                </label>
                <select
                  id="joint-organizer-select"
                  className={block("select")}
                  {...register("jointOrganizerName")}
                >
                  <option value="">Выберите организатора</option>
                  {organizers.map((organizer) => (
                    <option key={organizer.id} value={organizer.name}>
                      {organizer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="position-mod-status">
                  Статус при передаче изменений (ЕИС 17.0)
                </label>
                <select
                  id="position-mod-status"
                  className={block("select")}
                  {...register("modificationStatus")}
                >
                  {modificationStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  {...register("isPublicDiscussionRequired")}
                />
                Необходимо обязательное общественное обсуждение (ст. 20 44-ФЗ)
              </label>
              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  {...register("isEnergyServiceContract")}
                />
                Планируется заключение энергосервисного контракта
              </label>
              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  {...register("isProvisionLendingServices")}
                />
                Закупка на оказание услуг по предоставлению кредита
              </label>
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("isConstructionWorks")} />
                Закупка в отношении ОКС / недвижимого имущества (КОКС)
              </label>
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("isNotFederalFinancing")} />
                ОКС / недвижимость без софинансирования из федерального бюджета
              </label>
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("notPublishedOnEIS")} />
                Не подлежит размещению на официальном сайте ЕИС
              </label>
            </div>

            {(positionStatus === "changed" ||
              positionStatus === "cancelled" ||
              !isNew) && (
              <div className={block("grid")}>
                <div className={block("field")}>
                  <label
                    className={block("label")}
                    htmlFor="position-change-reason"
                  >
                    Основание внесения изменений (positionModification)
                  </label>
                  <select
                    id="position-change-reason"
                    className={block("select")}
                    {...register("changeReasonCode", {
                      onChange: (e) => {
                        const found = tpChangeReasonOptions.find(
                          (item) => item.code === e.target.value,
                        );
                        setValue("changeReasonName", found?.name ?? "");
                      },
                    })}
                  >
                    <option value="">— Не выбрано —</option>
                    {tpChangeReasonOptions.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code}. {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="position-decision">
                    Вынесенное решение (decision)
                  </label>
                  <select
                    id="position-decision"
                    className={block("select")}
                    {...register("modificationDecision")}
                  >
                    {modificationDecisionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <CustomInput
                  configuration={{
                    label: { value: "Содержание изменений позиции" },
                    input: {
                      name: "modificationDescription",
                      placeholder:
                        "Обоснование корректировки или отмены позиции",
                    },
                  }}
                />
              </div>
            )}
          </fieldset>

          {(isConstructionWorks || koksEntries.fields.length > 0) && (
            <fieldset className={block("section")}>
              <legend>
                Детализация по кодам КОКС — ОКС/ОНИ ({koksEntries.fields.length}
                )
              </legend>
              <ul className={block("kbk-list")}>
                {koksEntries.fields.map((field, entryIndex) => (
                  <li className={block("kbk-row")} key={field.id}>
                    <div className={block("kbk-code")}>
                      <CustomInput
                        configuration={{
                          label: {
                            value: entryIndex === 0 ? "Код КОКС" : undefined,
                          },
                          input: {
                            name: `koksEntries.${entryIndex}.koksCode`,
                            placeholder: "25000000000000000000",
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
                              value:
                                entryIndex === 0 ? amount.label : undefined,
                            },
                            input: {
                              name: `koksEntries.${entryIndex}.${amount.key}`,
                              placeholder: "0.00",
                            },
                          }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className={block("remove")}
                      onClick={() => koksEntries.remove(entryIndex)}
                    >
                      Убрать
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={block("add")}
                onClick={() =>
                  koksEntries.append({
                    koksCode: "",
                    koksName: "",
                    amountTotal: "",
                  })
                }
              >
                Добавить КОКС
              </button>
            </fieldset>
          )}

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
