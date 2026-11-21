import { useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  FormProvider,
} from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
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
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  formatMoney,
  modificationDecisionOptions,
  modificationStatusOptions,
  okpd2FieldLabels,
  planPeriodLabels,
  positionStatusLabel,
  positionStatusOptions,
  tpChangeReasonOptions,
} from "./purchasePlan.config";
import styles from "./PurchasePlanPositionModal.module.scss";

interface PurchasePlanPositionModalProps {
  plan: PurchasePlan;
  position: PurchasePlanPosition;
  index: number;
  positions: PurchasePlanPosition[];
  isNew: boolean;
  isSaving: boolean;
  asPage?: boolean;
  onClose: () => void;
  onSave: (position: PurchasePlanPosition) => void;
  onDelete?: () => void;
}

const AMOUNT_FIELDS = [
  { key: "amountTotal", label: "Всего, ₽" },
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
  asPage = false,
  onClose,
  onSave,
  onDelete,
}: PurchasePlanPositionModalProps) {
  const navigate = useNavigate();
  const { bem } = useUtils();
  const block = bem(styles, "position-modal");
  const labels = planPeriodLabels(plan.planYear);
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const [ikzBuildError, setIkzBuildError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const methods = useForm<PurchasePlanPosition>({
    resolver: zodResolver(PurchasePlanPositionSchema),
    defaultValues: {
      ...position,
      serialNumber: position.serialNumber || String(index + 1),
      purchaseNumber: position.purchaseNumber || nextPurchaseNumber(positions),
      purchaseOrderNumber: position.purchaseOrderNumber || "000",
      plannedPlacementYear:
        position.plannedPlacementYear || String(plan.planYear),
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
  const identificationCode = useWatch({ control, name: "identificationCode" });
  const okpd2Code = useWatch({ control, name: "okpd2Code" });
  const okpd2Name = useWatch({ control, name: "okpd2Name" });
  const objectOfPurchase = useWatch({ control, name: "objectOfPurchase" });
  const positionStatus = useWatch({ control, name: "status" });
  const isConstructionWorks = useWatch({
    control,
    name: "isConstructionWorks",
  });
  const hasMultipleOkpd2 = useWatch({ control, name: "hasMultipleOkpd2" });
  const amountTotalWatch = useWatch({ control, name: "amountTotal" });
  const amountCurWatch = useWatch({ control, name: "amountCurrentYear" });
  const amount1Watch = useWatch({
    control,
    name: "amountPlanPeriodFirstYear",
  });
  const amount2Watch = useWatch({
    control,
    name: "amountPlanPeriodSecondYear",
  });
  const amountSubWatch = useWatch({ control, name: "amountSubsequentYears" });

  const uniqueNumber =
    getValues("uniqueNumber") ||
    buildPositionUniqueNumber(plan.planNumber, serialNumber);

  const yearsBreakdownSum =
    (toNumber(amountCurWatch) ?? 0) +
    (toNumber(amount1Watch) ?? 0) +
    (toNumber(amount2Watch) ?? 0) +
    (toNumber(amountSubWatch) ?? 0);
  const declaredAmountTotal = toNumber(amountTotalWatch) ?? 0;
  const amountsMatched = Math.abs(declaredAmountTotal - yearsBreakdownSum) < 0.01;

  const normedRef = findOkpd2ByCode(okpd2Refs, okpd2Code);
  const auctionCheck = checkOkpd2AuctionList(okpd2Code, okpd2Refs);

  function handleOkpd2Select(item: Okpd2Ref | null) {
    setValue("okpd2Code", item?.code ?? "", { shouldValidate: true });
    setValue("okpd2Name", item?.name ?? "", { shouldValidate: true });

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

  function recalcTotalFromYears() {
    setValue("amountTotal", yearsBreakdownSum.toFixed(2), {
      shouldValidate: true,
    });
  }

  function onSubmit(data: PurchasePlanPosition) {
    const resolvedKbk = data.kbk || data.kbkEntries?.[0]?.kbk || "";
    const resolvedKvr =
      data.kvr || (resolvedKbk.length >= 3 ? resolvedKbk.slice(-3) : "");
    onSave({
      ...data,
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

  const ikzClean = String(identificationCode ?? "").trim();
  const is36DigitIkz = /^\d{36}$/.test(ikzClean);

  const formContent = (
    <FormProvider {...methods}>
      <form
        className={block(undefined, asPage ? ["page"] : [])}
        onSubmit={handleSubmit(onSubmit)}
      >
        {asPage && (
          <nav
            className={block("breadcrumbs")}
            aria-label="Навигационная цепочка"
          >
            <Link to="/" className={block("crumb")}>
              Главная
            </Link>
            <span className={block("crumb-sep")} aria-hidden="true">
              /
            </span>
            <Link to="/purchase-plans" className={block("crumb")}>
              Планы-графики (44-ФЗ)
            </Link>
            <span className={block("crumb-sep")} aria-hidden="true">
              /
            </span>
            <Link
              to={`/purchase-plans/${plan.id}?tab=positions`}
              className={block("crumb")}
            >
              План-график № {plan.planNumber}
            </Link>
            <span className={block("crumb-sep")} aria-hidden="true">
              /
            </span>
            <span className={block("crumb", ["current"])}>
              {isNew
                ? "Новая позиция"
                : `Позиция № ${purchaseNumber || serialNumber || index + 1}`}
            </span>
          </nav>
        )}

        {/* Шапка карточки позиции плана-графика в стиле ЕИС pg2020 */}
        <header className={block("card-header")}>
          <div className={block("card-main")}>
            <div className={block("doc-top")}>
              <div className={block("doc-eyebrow-row")}>
                <span className={block("doc-type")}>
                  Позиция плана-графика · 44-ФЗ
                </span>
                <span
                  className={block("status-tag", [positionStatus ?? "planned"])}
                >
                  {positionStatusLabel(positionStatus ?? "planned")}
                </span>
                {uniqueNumber && (
                  <span className={block("code-pill")}>
                    УНП: {uniqueNumber}
                  </span>
                )}
              </div>

              <h1 className={block("title")}>
                {isNew
                  ? "Новая позиция плана-графика закупок"
                  : `Позиция плана-графика № ${
                      purchaseNumber || serialNumber || index + 1
                    }${
                      objectOfPurchase ? ` — ${objectOfPurchase}` : ""
                    }`}
              </h1>

              <p className={block("caption")}>
                План-график № {plan.planNumber} ({plan.planYear} г.) · Заказчик:{" "}
                {plan.customer.shortName || plan.customer.fullName}
              </p>
            </div>

            <div className={block("finance-kpi")}>
              <span className={block("finance-kpi-label")}>
                Объём финансового обеспечения (всего)
              </span>
              <span className={block("finance-kpi-value")}>
                {formatMoney(declaredAmountTotal)}
              </span>
              <span
                className={block("finance-kpi-check", [
                  amountsMatched ? "ok" : "warn",
                ])}
              >
                {amountsMatched
                  ? `Сумма по годам совпадает: ${formatMoney(yearsBreakdownSum)}`
                  : `Сумма по годам: ${formatMoney(yearsBreakdownSum)}`}
              </span>
            </div>
          </div>

          <div className={block("header-toolbar")}>
            <button
              type="button"
              className={block("btn")}
              onClick={onClose}
              disabled={isSaving}
            >
              ← К позициям плана-графика
            </button>
            {!isNew && position.id !== undefined && (
              <>
                <button
                  type="button"
                  className={block("btn")}
                  onClick={() =>
                    navigate(
                      `/nmck-calculator?planId=${plan.id}&positionId=${position.id}`,
                    )
                  }
                >
                  Рассчитать НМЦК
                </button>
                <button
                  type="button"
                  className={block("btn")}
                  onClick={() =>
                    navigate(
                      `/purchase-plans/${plan.id}/positions/${position.id}/requirement`,
                    )
                  }
                >
                  Сформировать потребность (СЗ)
                </button>
              </>
            )}
          </div>
        </header>

        {/* Раздел 1: Общие сведения позиции и ИКЗ */}
        <section className={block("section")}>
          <h2 className={block("section-title")}>
            1. Общие сведения позиции и идентификационный код закупки (ИКЗ)
          </h2>

          <div className={block("grid")}>
            <CustomInput
              configuration={{
                label: { value: "№ п/п записи" },
                input: { name: "serialNumber", placeholder: "1" },
              }}
            />
            <div className={block("field")}>
              <span className={block("label")}>
                Уникальный номер позиции в ПГ
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
                  label: { value: "Номер закупки, включенной в ПГ (4 цифры)" },
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
                label: { value: "Внешний номер позиции (extNumber, ЕИС 17.0)" },
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
          </div>

          <div className={block("ikz-box")}>
            <div className={block("ikz-row")}>
              <div className={block("ikz-input-wrap")}>
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
              </div>
              <button
                type="button"
                className={block("btn")}
                onClick={fillIdentificationCode}
              >
                Сформировать 36-значный ИКЗ (ikzCodeType)
              </button>
            </div>

            {ikzBuildError && (
              <span className={block("error")}>{ikzBuildError}</span>
            )}

            {is36DigitIkz && (
              <div className={block("ikz-segments")}>
                <span>
                  Год: <strong>{ikzClean.slice(0, 2)}</strong>
                </span>
                <span>
                  ИКУ (20): <strong>{ikzClean.slice(2, 22)}</strong>
                </span>
                <span>
                  № закупки: <strong>{ikzClean.slice(22, 26)}</strong>
                </span>
                <span>
                  Порядок: <strong>{ikzClean.slice(26, 29)}</strong>
                </span>
                <span>
                  ОКПД2 (4): <strong>{ikzClean.slice(29, 33)}</strong>
                </span>
                <span>
                  КВР (3): <strong>{ikzClean.slice(33, 36)}</strong>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Раздел 2: Сведения об объекте закупки */}
        <section className={block("section")}>
          <h2 className={block("section-title")}>
            2. Сведения об объекте закупки (ОКПД2 / КТРУ)
          </h2>

          <div className={block("grid")}>
            <div className={block("field", ["full"])}>
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
                <span className={block("callout", ["warn"])}>
                  Код {normedRef.code} подлежит обязательному нормированию (ПП РФ
                  № 926).
                  {normedRef.normLimit !== undefined
                    ? ` Предельная цена единицы — ${formatMoney(normedRef.normLimit)}.`
                    : ""}
                </span>
              )}
              {auctionCheck.inAuctionList && (
                <span className={block("callout", ["warn"])}>
                  Код {auctionCheck.code} включён в аукционный перечень (РП РФ
                  № 471-р): при конкурентной закупке обязателен электронный
                  аукцион (ч. 6 ст. 24 44-ФЗ).
                </span>
              )}
            </div>

            <div className={block("field", ["full"])}>
              <CustomInput
                configuration={{
                  label: { value: "Наименование объекта закупки" },
                  input: {
                    name: "objectOfPurchase",
                    placeholder: "Наименование по ОКПД2, правится заказчиком",
                  },
                }}
              />
            </div>

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
                label: { value: "Уточнённое наименование (КТРУ / своб. форма)" },
                input: { name: "objectName" },
              }}
            />

            <div className={block("field", ["full"])}>
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("hasMultipleOkpd2")} />
                Несколько кодов ОКПД2 (в разрядах 30–33 ИКЗ автоматически ставится
                «0000»)
              </label>
              {hasMultipleOkpd2 && (
                <p className={block("hint")}>
                  При наличии нескольких позиций ОКПД2 в 36-значном ИКЗ по XSD
                  17.0 проставляется «0000».
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Раздел 3: Объём финансового обеспечения */}
        <section className={block("section")}>
          <div className={block("section-head")}>
            <h2 className={block("section-title", ["inline"])}>
              3. Объём финансового обеспечения закупки (рублей)
            </h2>
            <button
              type="button"
              className={block("btn", ["small"])}
              onClick={recalcTotalFromYears}
            >
              Вычислить «Всего» из суммы по годам
            </button>
          </div>

          <div className={block("grid", ["amounts"])}>
            {AMOUNT_FIELDS.map((field) => (
              <CustomInput
                key={field.key}
                configuration={{
                  label: {
                    value:
                      field.key === "amountTotal"
                        ? "Всего, ₽"
                        : `На ${labelsAmountSuffix(field.key)}`,
                  },
                  input: { name: field.key, placeholder: "0.00" },
                }}
              />
            ))}
          </div>
          <p className={block("hint")}>
            Планируемые платежи распределяются по периодам: {labels.currentYear};{" "}
            {labels.firstPlanYear}; {labels.secondPlanYear};{" "}
            {labels.subsequentYears}.
          </p>
        </section>

        {/* Раздел 4: Детализация по КБК (и КОКС при ОКС) */}
        <section className={block("section")}>
          <div className={block("section-head")}>
            <h2 className={block("section-title", ["inline"])}>
              4. Детализация по кодам бюджетной классификации (КБК:{" "}
              {kbkEntries.fields.length})
            </h2>
            <button
              type="button"
              className={block("btn", ["small"])}
              onClick={() => kbkEntries.append({ kbk: "" })}
            >
              + Добавить КБК
            </button>
          </div>

          {kbkEntries.fields.length === 0 ? (
            <p className={block("hint")}>
              Коды бюджетной классификации не добавлены — нажмите «+ Добавить
              КБК», если закупка детализируется по КБК.
            </p>
          ) : (
            <div className={block("table-wrap")}>
              <table className={block("sub-table")}>
                <thead>
                  <tr>
                    <th>КБК (20 цифр)</th>
                    {AMOUNT_FIELDS.map((amount) => (
                      <th key={amount.key}>{amount.label}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {kbkEntries.fields.map((field, entryIndex) => (
                    <tr key={field.id}>
                      <td className={block("td-code")}>
                        <CustomInput
                          configuration={{
                            input: {
                              name: `kbkEntries.${entryIndex}.kbk`,
                              placeholder: "20011000000000000000",
                            },
                          }}
                        />
                      </td>
                      {AMOUNT_FIELDS.map((amount) => (
                        <td key={amount.key} className={block("td-amount")}>
                          <CustomInput
                            configuration={{
                              input: {
                                name: `kbkEntries.${entryIndex}.${amount.key}`,
                                placeholder: "0.00",
                              },
                            }}
                          />
                        </td>
                      ))}
                      <td className={block("td-action")}>
                        <button
                          type="button"
                          className={block("remove")}
                          onClick={() => kbkEntries.remove(entryIndex)}
                        >
                          Убрать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(isConstructionWorks || koksEntries.fields.length > 0) && (
            <div className={block("koks-block")}>
              <div className={block("section-head")}>
                <h3 className={block("sub-title")}>
                  Детализация по кодам КОКС — ОКС / ОНИ (
                  {koksEntries.fields.length})
                </h3>
                <button
                  type="button"
                  className={block("btn", ["small"])}
                  onClick={() =>
                    koksEntries.append({
                      koksCode: "",
                      koksName: "",
                      amountTotal: "",
                    })
                  }
                >
                  + Добавить КОКС
                </button>
              </div>

              {koksEntries.fields.length > 0 && (
                <div className={block("table-wrap")}>
                  <table className={block("sub-table")}>
                    <thead>
                      <tr>
                        <th>Код КОКС</th>
                        {AMOUNT_FIELDS.map((amount) => (
                          <th key={amount.key}>{amount.label}</th>
                        ))}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {koksEntries.fields.map((field, entryIndex) => (
                        <tr key={field.id}>
                          <td className={block("td-code")}>
                            <CustomInput
                              configuration={{
                                input: {
                                  name: `koksEntries.${entryIndex}.koksCode`,
                                  placeholder: "25000000000000000000",
                                },
                              }}
                            />
                          </td>
                          {AMOUNT_FIELDS.map((amount) => (
                            <td key={amount.key} className={block("td-amount")}>
                              <CustomInput
                                configuration={{
                                  input: {
                                    name: `koksEntries.${entryIndex}.${amount.key}`,
                                    placeholder: "0.00",
                                  },
                                }}
                              />
                            </td>
                          ))}
                          <td className={block("td-action")}>
                            <button
                              type="button"
                              className={block("remove")}
                              onClick={() => koksEntries.remove(entryIndex)}
                            >
                              Убрать
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Раздел 5: Статус, органы, признаки и изменения ЕИС 17.0 */}
        <section className={block("section")}>
          <h2 className={block("section-title")}>
            5. Статус позиции, организаторы и признаки ЕИС 17.0
          </h2>

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
          </div>

          <div className={block("flags-grid")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("isPublicDiscussionRequired")}
              />
              Необходимо обязательное общественное обсуждение (ст. 20 44-ФЗ)
            </label>
            <label className={block("checkbox")}>
              <input type="checkbox" {...register("isEnergyServiceContract")} />
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
            <div className={block("mod-box")}>
              <h3 className={block("sub-title")}>
                Сведения об изменении / отмене позиции (positionModification)
              </h3>
              <div className={block("grid")}>
                <div className={block("field")}>
                  <label
                    className={block("label")}
                    htmlFor="position-change-reason"
                  >
                    Основание внесения изменений
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
                <div className={block("field", ["full"])}>
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
              </div>
            </div>
          )}
        </section>

        {/* Нижняя панель действий */}
        <footer className={block("footer")}>
          <div className={block("footer-errors")}>
            {errorText("amountTotal") && (
              <span className={block("error")}>{errorText("amountTotal")}</span>
            )}
            {errorText("objectOfPurchase") && (
              <span className={block("error")}>
                {errorText("objectOfPurchase")}
              </span>
            )}
          </div>

          <div className={block("footer-actions")}>
            {!isNew && onDelete && !confirmDelete && (
              <button
                type="button"
                className={block("danger")}
                onClick={() => setConfirmDelete(true)}
                disabled={isSaving}
              >
                Удалить позицию
              </button>
            )}
            {!isNew && onDelete && confirmDelete && (
              <div className={block("confirm-delete")}>
                <span>Удалить эту позицию?</span>
                <button
                  type="button"
                  className={block("danger-solid")}
                  onClick={onDelete}
                  disabled={isSaving}
                >
                  Да, удалить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isSaving}
                >
                  Отмена
                </button>
              </div>
            )}
            <button type="button" onClick={onClose} disabled={isSaving}>
              Отмена
            </button>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить позицию"}
            </button>
          </div>
        </footer>
      </form>
    </FormProvider>
  );

  if (asPage) {
    return formContent;
  }

  return <CustomModal onClose={onClose}>{formContent}</CustomModal>;

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
