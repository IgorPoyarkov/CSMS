import { useMemo, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  FormProvider,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomInput from "../UI/CustomInput";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import { checkOkpd2AuctionList } from "../../services/Okpd2Ref/auctionListControl";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import type { Okpd2Ref } from "../../services/Okpd2Ref/okpd2Ref.schema";
import {
  IKZ_ORDER_REFERENCE,
  PurchasePlanPositionSchema,
  buildIdentificationCode,
  buildKbk,
  buildPositionUniqueNumber,
  isPurchaseNumberTaken,
  nextPurchaseNumber,
  purchaseNumbersUsed,
  splitKbk,
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  formatMoney,
  kvrOptions,
  modificationDecisionOptions,
  modificationStatusOptions,
  okpd2FieldLabels,
  placementYearOptions,
  positionStatusOptions,
  publicDiscussionOptions,
  tpChangeReasonOptions,
} from "./purchasePlan.config";
import {
  AUTHORIZED_BODIES,
  getOrganizersByAuthorizedBody,
} from "./purchasePlan.mock";
import KoksPickerModal from "./KoksPickerModal";
import type { KoksRef } from "../../services/KoksRef/koksRef.api";
import styles from "./PurchasePlanPositionForm.module.scss";

/**
 * Карточка позиции плана-графика — страница, а не модалка: состав и порядок
 * граф повторяют форму просмотра плана-графика закупок в личном кабинете ЕИС
 * («Общие сведения позиции»): сведения о закупке, информация об объекте,
 * объём финансового обеспечения по годам, детализация по КБК и КОКС,
 * обязательное общественное обсуждение, статус и изменения.
 *
 * Уникальный номер позиции и ИКЗ формируются системой: заказчику остаётся
 * проверить код, а не набирать его вручную.
 */

// Текущий год фиксируем при загрузке модуля: вызывать Date в рендере нельзя
const CURRENT_YEAR = new Date().getFullYear();

interface PurchasePlanPositionFormProps {
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

// Разряды КБК: глава 3, раздел/подраздел 4, целевая статья 10, вид расходов 3
const KBK_PART_FIELDS = [
  { key: "chapter", label: "Глава", placeholder: "200", length: 3 },
  { key: "section", label: "Раздел (подраздел)", placeholder: "1101", length: 4 },
  {
    key: "targetArticle",
    label: "Целевая статья",
    placeholder: "0000000000",
    length: 10,
  },
  { key: "expenseType", label: "Вид расходов", placeholder: "244", length: 3 },
] as const;

export default function PurchasePlanPositionForm({
  plan,
  position,
  index,
  positions,
  isNew,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: PurchasePlanPositionFormProps) {
  const { bem } = useUtils();
  const block = bem(styles, "position-form");
  // Год формирования ПГ: от него считаются графы «Сумма на … год»
  const baseYear = Number(plan.planYear) || CURRENT_YEAR;
  // Справочник ОКПД2 даёт признак обязательного нормирования и предельную цену
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const [ikzBuildError, setIkzBuildError] = useState<string | null>(null);
  // Индекс строки КОКС, для которой открыт справочник nsiKOKS
  const [koksPickerIndex, setKoksPickerIndex] = useState<number | null>(null);

  const methods = useForm<PurchasePlanPosition>({
    resolver: zodResolver(PurchasePlanPositionSchema),
    defaultValues: {
      ...position,
      serialNumber: position.serialNumber || String(index + 1),
      purchaseNumber: position.purchaseNumber || nextPurchaseNumber(positions),
      // Год по умолчанию — текущий; селект предлагает текущий и +10 лет
      plannedPlacementYear: position.plannedPlacementYear || String(CURRENT_YEAR),
      purchaseOrderNumber: position.purchaseOrderNumber || "000",
      status: position.status ?? "planned",
      modificationStatus: position.modificationStatus ?? (isNew ? "N" : "E"),
      modificationDecision: position.modificationDecision ?? "notSpecified",
      hasAuthorizedBody: Boolean(position.hasAuthorizedBody),
      hasJointOrganizer: Boolean(position.hasJointOrganizer),
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
  const plannedPlacementYear = useWatch({
    control,
    name: "plannedPlacementYear",
  });
  const okpd2Code = useWatch({ control, name: "okpd2Code" });
  const okpd2Name = useWatch({ control, name: "okpd2Name" });
  const objectOfPurchase = useWatch({ control, name: "objectOfPurchase" });
  const positionStatus = useWatch({ control, name: "status" });
  const isConstructionWorks = useWatch({
    control,
    name: "isConstructionWorks",
  });
  const isEnergyServiceContract = useWatch({
    control,
    name: "isEnergyServiceContract",
  });
  const isProvisionLendingServices = useWatch({
    control,
    name: "isProvisionLendingServices",
  });
  const isPublicDiscussionRequired = useWatch({
    control,
    name: "isPublicDiscussionRequired",
  });
  const hasAuthorizedBody = useWatch({ control, name: "hasAuthorizedBody" });
  const hasJointOrganizer = useWatch({ control, name: "hasJointOrganizer" });
  const hasMultipleOkpd2 = useWatch({ control, name: "hasMultipleOkpd2" });
  const authorizedBodyName = useWatch({ control, name: "authorizedBodyName" });
  const kbkEntriesValues = useWatch({ control, name: "kbkEntries" });
  const koksEntriesValues = useWatch({ control, name: "koksEntries" });

  const uniqueNumber =
    getValues("uniqueNumber") ||
    buildPositionUniqueNumber(plan.planNumber, serialNumber);

  // Предельная цена единицы по ПП РФ N 926: предупреждаем прямо в записи ПГ
  const normedRef = findOkpd2ByCode(okpd2Refs, okpd2Code);
  const auctionCheck = checkOkpd2AuctionList(okpd2Code, okpd2Refs);

  // Фильтрованные организаторы по выбранному уполномоченному органу
  const organizers = getOrganizersByAuthorizedBody(authorizedBodyName);

  // Селект года: текущий и следующие 10 лет
  const yearOptions = placementYearOptions(CURRENT_YEAR);
  // Номер закупки: свободные номера с 0001; занятые помечаются и блокируются
  const usedNumbers = purchaseNumbersUsed(positions, position.purchaseNumber);
  const maxUsedNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) : 0;
  const numberOptions = Array.from(
    { length: Math.max(20, maxUsedNumber + 10) },
    (_, optionIndex) => {
      const value = String(optionIndex + 1).padStart(4, "0");

      return { value, taken: usedNumbers.includes(optionIndex + 1) };
    },
  );
  const purchaseNumberTaken = isPurchaseNumberTaken(
    positions,
    purchaseNumber,
    position.purchaseNumber,
  );

  // Заголовки граф финансового обеспечения — как в форме ЕИС
  const amountHeaders: Record<AmountKey, string> = {
    amountTotal: "Всего",
    amountCurrentYear: `Сумма на ${baseYear} год`,
    amountPlanPeriodFirstYear: `Сумма на ${baseYear + 1} год`,
    amountPlanPeriodSecondYear: `Сумма на ${baseYear + 2} год`,
    amountSubsequentYears: "Сумма на последующие годы",
  };

  // Итоги по кодам бюджетной классификации — строка «Итого» под таблицей
  const kbkTotals = useMemo(() => {
    const totals = {} as Record<AmountKey, number>;

    for (const field of AMOUNT_FIELDS) {
      totals[field.key] = (kbkEntriesValues ?? []).reduce(
        (sum, entry) => sum + (toNumber(entry?.[field.key]) ?? 0),
        0,
      );
    }

    return totals;
  }, [kbkEntriesValues]);

  // Три признака ЕИС взаимоисключающие: энергосервис, кредит, ОКС.
  // «Информация, не подлежащая размещению» (notPublishedOnEIS) от них не зависит.
  const exclusiveFlags = [
    "isEnergyServiceContract",
    "isProvisionLendingServices",
    "isConstructionWorks",
  ] as const;

  function setExclusiveFlag(
    flag: (typeof exclusiveFlags)[number],
    checked: boolean,
  ) {
    for (const item of exclusiveFlags) {
      setValue(item, item === flag ? checked : false, { shouldValidate: true });
    }
  }

  // Разбивка КБК на разряды: при правке части пересобирается итоговый код
  function updateKbkPart(
    entryIndex: number,
    part: keyof ReturnType<typeof splitKbk>,
    value: string,
  ) {
    const current = kbkEntriesValues?.[entryIndex];
    const parts = { ...splitKbk(current?.kbk), [part]: value };

    setValue(`kbkEntries.${entryIndex}.${part}`, value, {
      shouldValidate: true,
    });
    setValue(`kbkEntries.${entryIndex}.kbk`, buildKbk(parts), {
      shouldValidate: true,
    });
  }

  function handleKoksSelect(item: KoksRef) {
    if (koksPickerIndex === null) {
      return;
    }

    setValue(`koksEntries.${koksPickerIndex}.koksCode`, item.code, {
      shouldValidate: true,
    });
    setValue(`koksEntries.${koksPickerIndex}.koksName`, item.name, {
      shouldValidate: true,
    });
  }

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
    // КБК может быть собран из разрядов формы
    const kbkEntriesData = (data.kbkEntries ?? []).map((entry) => ({
      ...entry,
      kbk: entry.kbk || buildKbk(entry),
    }));
    const resolvedKbk = data.kbk || kbkEntriesData[0]?.kbk || "";
    const resolvedKvr =
      data.kvr || (resolvedKbk.length >= 3 ? resolvedKbk.slice(-3) : "");

    onSave({
      ...data,
      // Номер записи и её уникальный номер выдаёт система
      serialNumber: data.serialNumber || String(index + 1),
      uniqueNumber:
        data.uniqueNumber ||
        buildPositionUniqueNumber(plan.planNumber, serialNumber),
      kbkEntries: kbkEntriesData,
      kbk: resolvedKbk,
      kvr: resolvedKvr,
      // Скрытые чекбоксом блоки не должны оставлять значения в данных
      authorizedBodyName: data.hasAuthorizedBody ? data.authorizedBodyName : "",
      jointOrganizerName: data.hasJointOrganizer ? data.jointOrganizerName : "",
    });
  }

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)[path]?.message;

  return (
    <section className={block()}>
      <header className={block("header")}>
        <button type="button" className={block("back")} onClick={onClose}>
          ← К плану-графику
        </button>
        <h1 className={block("title")}>
          План-график закупок № {plan.planNumber || "без номера"}
        </h1>
        <p className={block("caption")}>
          Общие сведения позиции
          {uniqueNumber ? ` · ${uniqueNumber}` : ""}
        </p>
        <p className={block("caption")}>
          {plan.customer?.shortName || plan.customer?.fullName}
          {plan.customer?.inn ? ` · ИНН ${plan.customer.inn}` : ""}
          {plan.customer?.kpp ? ` · КПП ${plan.customer.kpp}` : ""}
        </p>
      </header>

      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          <fieldset className={block("section")}>
            <legend>Сведения о закупке</legend>
            <div className={block("fields")}>
              <div className={block("cell", ["wide"])}>
                <span className={block("label")}>
                  Уникальный номер позиции в плане-графике закупок
                </span>
                <input
                  className={block("input", ["readonly"])}
                  value={uniqueNumber || "сформируется при сохранении"}
                  readOnly
                />
                <p className={block("hint")}>
                  24 цифры: 18 цифр реестрового номера плана-графика (год — 4,
                  код заказчика по СПЗ — 11, порядковый номер плана — 3) и 6
                  цифр номера позиции, который ЕИС присваивает автоматически и
                  не меняет при редактировании.
                </p>
              </div>
              <div className={block("cell")}>
                <label
                  className={block("label")}
                  htmlFor="position-placement-year"
                >
                  Год (планируемый год размещения извещения)
                </label>
                <select
                  id="position-placement-year"
                  className={block("select")}
                  value={plannedPlacementYear ?? ""}
                  onChange={(event) =>
                    setValue("plannedPlacementYear", event.target.value, {
                      shouldValidate: true,
                    })
                  }
                >
                  {yearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={block("cell")}>
                <CustomInput
                  configuration={{
                    label: {
                      value: "Идентификационный код заказчика (ИКУ, 20 знаков)",
                    },
                    input: { name: "iku", placeholder: "77012345677701010011" },
                  }}
                />
              </div>
              <div className={block("cell")}>
                <label
                  className={block("label")}
                  htmlFor="position-purchase-number"
                >
                  Номер закупки, включенной в план-график закупок
                </label>
                <select
                  id="position-purchase-number"
                  className={block("select")}
                  value={purchaseNumber ?? ""}
                  onChange={(event) =>
                    setValue("purchaseNumber", event.target.value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <option value="">— выберите номер —</option>
                  {numberOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.taken}
                    >
                      {option.value}
                      {option.taken ? " — занят" : ""}
                    </option>
                  ))}
                </select>
                <CustomInput
                  configuration={{
                    label: {
                      value: "Или введите свой номер (не повторяющийся)",
                    },
                    input: { name: "purchaseNumber", placeholder: "0001" },
                  }}
                />
                {purchaseNumberTaken && (
                  <span className={block("error")}>
                    Номер уже используется в этом плане-графике
                  </span>
                )}
              </div>
              <div className={block("cell")}>
                <CustomInput
                  configuration={{
                    label: { value: "Порядковый номер закупки (3 знака)" },
                    input: { name: "purchaseOrderNumber", placeholder: "000" },
                  }}
                />
              </div>
              <div className={block("cell", ["okpd2"])}>
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
              <div className={block("cell")}>
                <CustomInput
                  configuration={{
                    label: { value: "Код вида расходов — КВР (3 цифры)" },
                    input: { name: "kvr", placeholder: "244" },
                  }}
                />
              </div>
              <div className={block("cell", ["wide"])}>
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
                <p className={block("hint")}>
                  Разряды ИКЗ формируются по Порядку, утверждённому{" "}
                  {IKZ_ORDER_REFERENCE}; формат 36 цифр закреплён XSD ЕИС 17.0
                  (ikzCodeType).
                </p>
              </div>
              <div className={block("cell", ["wide"])}>
                <CustomInput
                  configuration={{
                    label: {
                      value: "Внешний номер позиции (extNumber, ЕИС 17.0)",
                    },
                    input: { name: "extNumber", placeholder: "PG-2026-0001" },
                  }}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={block("section")}>
            <legend>Информация об объекте закупки</legend>
            <div className={block("fields")}>
              <CustomInput
                configuration={{
                  label: {
                    value:
                      "Наименование товара, работы, услуги по ОКПД2",
                  },
                  input: { name: "okpd2Name" },
                }}
              />
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
              <div className={block("cell", ["wide"])}>
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
            </div>
          </fieldset>

          <fieldset className={block("section")}>
            <legend>Объем финансового обеспечения закупки (рублей)</legend>
            <div className={block("table-wrap")}>
              <table className={block("table")}>
                <thead>
                  <tr>
                    <th>Планируемые платежи, рублей</th>
                    {AMOUNT_FIELDS.map((field) => (
                      <th key={field.key}>{amountHeaders[field.key]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={block("cell", ["right"])}>Сумма, рублей</td>
                    {AMOUNT_FIELDS.map((field) => (
                      <td key={field.key}>
                        <CustomInput
                          configuration={{
                            input: { name: field.key, placeholder: "0.00" },
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {errorText("amountTotal") && (
              <span className={block("error")}>
                {errorText("amountTotal")}
              </span>
            )}
            <p className={block("hint")}>
              «Всего» должно совпадать с суммой платежей по годам: год
              формирования плана-графика и два следующих года планового
              периода, остаток — последующие годы.
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

            {kbkEntries.fields.length > 0 && (
              <div className={block("table-wrap")}>
                <table className={block("table")}>
                  <thead>
                    <tr>
                      <th colSpan={4}>Код бюджетной классификации</th>
                      {AMOUNT_FIELDS.map((field) => (
                        <th key={field.key}>{amountHeaders[field.key]}, рублей</th>
                      ))}
                      <th />
                    </tr>
                    <tr>
                      {KBK_PART_FIELDS.map((part) => (
                        <th key={part.key} className={block("th", ["sub"])}>
                          {part.label}
                        </th>
                      ))}
                      {AMOUNT_FIELDS.map((field) => (
                        <th key={field.key} className={block("th", ["sub"])}>
                          рублей
                        </th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {kbkEntries.fields.map((field, entryIndex) => {
                      const parts = splitKbk(
                        kbkEntriesValues?.[entryIndex]?.kbk,
                      );

                      return (
                        <tr key={field.id}>
                          {KBK_PART_FIELDS.map((part) => (
                            <td key={part.key}>
                              <input
                                className={block("input")}
                                value={parts[part.key]}
                                onChange={(event) =>
                                  updateKbkPart(
                                    entryIndex,
                                    part.key,
                                    event.target.value,
                                  )
                                }
                                placeholder={part.placeholder}
                                aria-label={part.label}
                                maxLength={part.length}
                                list={
                                  part.key === "expenseType"
                                    ? "kvr-options"
                                    : undefined
                                }
                              />
                            </td>
                          ))}
                          {AMOUNT_FIELDS.map((amount) => (
                            <td key={amount.key}>
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
                          <td>
                            <button
                              type="button"
                              className={block("remove")}
                              onClick={() => kbkEntries.remove(entryIndex)}
                            >
                              Убрать
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className={block("cell", ["right"])}>
                        Итого по кодам бюджетной классификации
                      </td>
                      {AMOUNT_FIELDS.map((field) => (
                        <td key={field.key} className={block("cell", ["total"])}>
                          {formatMoney(kbkTotals[field.key])}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <datalist id="kvr-options">
              {kvrOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </datalist>
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

          {(isConstructionWorks || koksEntries.fields.length > 0) && (
            <fieldset className={block("section")}>
              <legend>
                Детализация по кодам КОКС — ОКС/ОНИ ({koksEntries.fields.length})
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
                      <button
                        type="button"
                        className={block("pick")}
                        onClick={() => setKoksPickerIndex(entryIndex)}
                      >
                        Выбрать из справочника
                      </button>
                      {koksEntriesValues?.[entryIndex]?.koksName && (
                        <p className={block("hint")}>
                          {koksEntriesValues[entryIndex].koksName}
                        </p>
                      )}
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

          <fieldset className={block("section")}>
            <legend>
              Статус записи, признаки ЕИС 17.0 и изменения
            </legend>
            <div className={block("fields")}>
              <div className={block("cell")}>
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
              <div className={block("cell")}>
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
              <div className={block("cell")}>
                <label
                  className={block("label")}
                  htmlFor="position-public-discussion"
                >
                  Необходимо обязательное общественное обсуждение в
                  соответствии со ст. 20 44-ФЗ
                </label>
                <select
                  id="position-public-discussion"
                  className={block("select")}
                  value={String(Boolean(isPublicDiscussionRequired))}
                  onChange={(event) =>
                    setValue(
                      "isPublicDiscussionRequired",
                      event.target.value === "true",
                      { shouldValidate: true },
                    )
                  }
                >
                  {publicDiscussionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={block("cell")}>
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("hasAuthorizedBody")} />
                  Есть уполномоченный орган (учреждение)
                </label>
                {hasAuthorizedBody && (
                  <>
                    <label
                      className={block("label")}
                      htmlFor="authorized-body-select"
                    >
                      Наименование уполномоченного органа (учреждения)
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
                  </>
                )}
              </div>
              <div className={block("cell")}>
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("hasJointOrganizer")} />
                  Есть организатор совместной закупки
                </label>
                {hasJointOrganizer && (
                  <>
                    <label
                      className={block("label")}
                      htmlFor="joint-organizer-select"
                    >
                      Наименование организатора совместного конкурса или
                      аукциона
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
                  </>
                )}
              </div>
              <div className={block("cell", ["wide"])}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    checked={Boolean(isEnergyServiceContract)}
                    onChange={(event) =>
                      setExclusiveFlag(
                        "isEnergyServiceContract",
                        event.target.checked,
                      )
                    }
                  />
                  Закупка на заключение энергосервисного контракта (ст. 108
                  44-ФЗ)
                </label>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    checked={Boolean(isProvisionLendingServices)}
                    onChange={(event) =>
                      setExclusiveFlag(
                        "isProvisionLendingServices",
                        event.target.checked,
                      )
                    }
                  />
                  Закупка на оказание услуг по предоставлению кредита
                </label>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    checked={Boolean(isConstructionWorks)}
                    onChange={(event) =>
                      setExclusiveFlag(
                        "isConstructionWorks",
                        event.target.checked,
                      )
                    }
                  />
                  Закупка по пп. «а» п. 18 Положения № 1279 (объект
                  капитального строительства)
                </label>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("isNotFederalFinancing")}
                  />
                  ОКС / недвижимость без софинансирования из федерального
                  бюджета
                </label>
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("notPublishedOnEIS")} />
                  Информация, не подлежащая размещению на официальном сайте ЕИС
                </label>
              </div>
            </div>

            {(positionStatus === "changed" ||
              positionStatus === "cancelled" ||
              !isNew) && (
              <div className={block("fields")}>
                <div className={block("cell")}>
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
                <div className={block("cell")}>
                  <span className={block("label")}>
                    Вынесенное решение (decision)
                  </span>
                  {/* По XSD 17.0 decision — это «изменение» либо «отмена»
                      закупки; для новой записи решение ещё не принято */}
                  <div className={block("radio-row")}>
                    {modificationDecisionOptions.map((option) => (
                      <label key={option.value} className={block("radio")}>
                        <input
                          type="radio"
                          value={option.value}
                          {...register("modificationDecision")}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className={block("cell", ["wide"])}>
                  <label
                    className={block("label")}
                    htmlFor="position-modification-description"
                  >
                    Содержание изменений позиции
                  </label>
                  <textarea
                    id="position-modification-description"
                    className={block("textarea")}
                    rows={3}
                    placeholder="Обоснование корректировки или отмены позиции"
                    {...register("modificationDescription")}
                  />
                </div>
              </div>
            )}
          </fieldset>

          <footer className={block("footer")}>
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

      {/* Справочник nsiKOKS открывается поверх формы позиции */}
      {koksPickerIndex !== null && (
        <KoksPickerModal
          onClose={() => setKoksPickerIndex(null)}
          onSelect={handleKoksSelect}
        />
      )}
    </section>
  );
}
