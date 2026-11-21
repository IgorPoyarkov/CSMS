import { useEffect, useMemo, useState } from "react";
import {
  get,
  useFieldArray,
  useForm,
  useWatch,
  FormProvider,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomSelect from "../UI/CustomSelect";
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
  buildIkzParts,
  buildKbk,
  buildPositionUniqueNumber,
  isPurchaseNumberTaken,
  nextPurchaseNumber,
  splitKbk,
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  formatMoney,
  formatMoneyValue,
  kvrOptions,
  modificationDecisionOptions,
  okpd2FieldLabels,
  placementYearOptions,
  positionStatusLabel,
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
 * Карточка позиции плана-графика в стилистике ЕИС (pg2020):
 * - Идентификационный код закупки (ИКЗ) и уникальный номер формируются
 *   системой автоматически и защищены от ручного редактирования;
 * - Блок сведений об изменении / отмене позиции (positionModification)
 *   доступен только при изменении существующей позиции (!isNew); его поля
 *   транспонированы: слева заголовок XSD, справа — значение;
 * - Объём финансового обеспечения (ровной горизонтальной строкой),
 *   детализация по КБК / КОКС и особые признаки закупки объединены
 *   в единый финансово-классификационный раздел. Детализация КВР и поля
 *   старого блока execution/basementInfo из ПГ 2020 исключены.
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

type FinanceValues = Record<string, string | number | undefined | null>;

// «Всего» не вводится вручную: это сумма планируемых платежей по годам
const financeTotal = (entry: FinanceValues | null | undefined): number =>
  AMOUNT_FIELDS.filter((field) => field.key !== "amountTotal").reduce(
    (sum, field) => sum + (toNumber(entry?.[field.key]) ?? 0),
    0,
  );

// В форме храним число без разделителей (десятичная точка), а показываем
// с разрядами и запятой — так в графе помещаются суммы в миллиарды
const normalizeAmountInput = (value: string): string => {
  const raw = value.replace(/[\s\u00a0]/g, "").replace(",", ".");
  const [integer, ...fraction] = raw.split(".");
  const digits = integer.replace(/\D/g, "").slice(0, 15);

  if (!fraction.length) {
    return digits;
  }

  return `${digits}.${fraction.join("").replace(/\D/g, "").slice(0, 2)}`;
};

const displayAmountInput = (value: string | number | undefined): string => {
  const raw = String(value ?? "").replace(",", ".");

  if (!raw) {
    return "";
  }

  const [integer, fraction] = raw.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return fraction !== undefined ? `${grouped},${fraction}` : grouped;
};

// В блоке «Сведения о финансовом обеспечении» ЕИС показывает «Всего»
// последней графой — после лет планового периода
const EIS_AMOUNT_FIELDS = [
  ...AMOUNT_FIELDS.filter((field) => field.key !== "amountTotal"),
  AMOUNT_FIELDS[0],
] as const;

// Разряды КБК: глава 3, раздел/подраздел 4, целевая статья 10, вид расходов 3
const KBK_PART_FIELDS = [
  { key: "chapter", label: "Глава", placeholder: "200", length: 3 },
  {
    key: "section",
    label: "Раздел (подраздел)",
    placeholder: "1101",
    length: 4,
  },
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
  // Год размещения извещения выбирается селектом в разделе «Сведения о закупке»;
  // он сразу влияет на разряд года в ИКЗ
  // Справочник ОКПД2 даёт признак обязательного нормирования и предельную цену
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  // Индекс строки КОКС, для которой открыт справочник nsiKOKS
  const [koksPickerIndex, setKoksPickerIndex] = useState<number | null>(null);

  // Детализация по КБК всегда начинается с одной строки: заказчику не нужно
  // нажимать «Добавить», чтобы увидеть поля разрядов
  const initialKbkEntries = (
    position.kbkEntries?.length ? position.kbkEntries : [{ kbk: "" }]
  ).map((entry) => ({ ...splitKbk(entry.kbk), ...entry }));

  const methods = useForm<PurchasePlanPosition>({
    resolver: zodResolver(PurchasePlanPositionSchema),
    defaultValues: {
      ...position,
      serialNumber: position.serialNumber || String(index + 1),
      purchaseNumber: position.purchaseNumber || nextPurchaseNumber(positions),
      // Год размещения извещения редактируется селектом и входит в ИКЗ
      plannedPlacementYear:
        position.plannedPlacementYear || String(plan.planYear || CURRENT_YEAR),
      purchaseOrderNumber: position.purchaseOrderNumber || "000",
      status: position.status ?? "planned",
      modificationStatus: isNew ? "N" : "E",
      modificationDecision: position.modificationDecision ?? "notSpecified",
      hasAuthorizedBody: Boolean(position.hasAuthorizedBody),
      hasJointOrganizer: Boolean(position.hasJointOrganizer),
      kbkEntries: initialKbkEntries,
      kvrEntries: [],
      koksEntries: position.koksEntries ?? [],
      okpd2Items: position.okpd2Items ?? [],
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
  // Дополнительные коды ОКПД2: один основной селект и любое число добавленных
  const okpd2Items = useFieldArray({ control, name: "okpd2Items" });

  const serialNumber = useWatch({ control, name: "serialNumber" });
  const purchaseNumber = useWatch({ control, name: "purchaseNumber" });
  const okpd2Code = useWatch({ control, name: "okpd2Code" });
  const okpd2Name = useWatch({ control, name: "okpd2Name" });
  const okpd2ItemsValues = useWatch({ control, name: "okpd2Items" });
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
  const plannedPlacementYear = useWatch({
    control,
    name: "plannedPlacementYear",
  });
  // Год ИКЗ берём из формы: селект в карточке меняет первый разряд кода
  const ikzYear =
    plannedPlacementYear || position.plannedPlacementYear || plan.planYear;
  const authorizedBodyName = useWatch({ control, name: "authorizedBodyName" });
  const jointOrganizerName = useWatch({ control, name: "jointOrganizerName" });
  const kbkEntriesValues = useWatch({ control, name: "kbkEntries" });
  const koksEntriesValues = useWatch({ control, name: "koksEntries" });
  const amountSubsequentYears = useWatch({
    control,
    name: "amountSubsequentYears",
  });
  const amountCurrentYear = useWatch({ control, name: "amountCurrentYear" });
  const amountPlanPeriodFirstYear = useWatch({
    control,
    name: "amountPlanPeriodFirstYear",
  });
  const amountPlanPeriodSecondYear = useWatch({
    control,
    name: "amountPlanPeriodSecondYear",
  });
  // ИКУ заказчика в карточке не вводится: он уже есть у заказчика. Берём
  // сохранённое значение; если его нет, ИКУ соберётся из ИНН и КПП
  const iku = position.iku;
  const kvr = useWatch({ control, name: "kvr" });
  const kbk = useWatch({ control, name: "kbk" });

  const uniqueNumber =
    getValues("uniqueNumber") ||
    buildPositionUniqueNumber(plan.planNumber, serialNumber);

  // Предельная цена единицы по ПП РФ N 926: предупреждаем прямо в записи ПГ
  const normedRef = findOkpd2ByCode(okpd2Refs, okpd2Code);
  const auctionCheck = checkOkpd2AuctionList(okpd2Code, okpd2Refs);

  // Фильтрованные организаторы по выбранному уполномоченному органу
  const organizers = getOrganizersByAuthorizedBody(authorizedBodyName);

  const purchaseNumberTaken = isPurchaseNumberTaken(
    positions,
    purchaseNumber,
    position.purchaseNumber,
  );

  // Порядковый номер закупки в ИКЗ: «000», если номер закупки в плане
  // единственный; иначе инкремент по позициям с этим же номером закупки.
  // В интерфейс не выводится — нужен только для сборки ИКЗ
  const resolvedOrderNumber = useMemo(() => {
    const normalized = String(purchaseNumber ?? "").replace(/\D/g, "");

    if (!normalized) {
      return "000";
    }

    const samePurchase = positions.filter(
      (item) =>
        String(item.purchaseNumber ?? "").replace(/\D/g, "") === normalized,
    );

    if (samePurchase.length <= 1) {
      return "000";
    }

    const selfIndex = samePurchase.findIndex(
      (item) => String(item.id) === String(position.id),
    );
    const order = selfIndex >= 0 ? selfIndex + 1 : samePurchase.length + 1;

    return String(order).padStart(3, "0").slice(-3);
  }, [positions, purchaseNumber, position.id]);

  // КБК первой строки детализации; КВР — последние 3 разряда (или резерв)
  const resolvedKbk = buildKbk(kbkEntriesValues?.[0] ?? {}) || kbk || "";
  const resolvedKvr =
    resolvedKbk.length >= 3 ? resolvedKbk.slice(-3) : kvr || "";

  // Несколько кодов ОКПД2 — когда добавлена хотя бы одна дополнительная строка
  const hasMultipleOkpd2 = okpd2Items.fields.length > 0;

  // Разряды ИКЗ: предзаполненные значения для таблицы и итоговый код
  const ikzParts = useMemo(
    () =>
      buildIkzParts({
        planYear: ikzYear,
        inn: plan.customer.inn,
        kpp: plan.customer.kpp,
        iku,
        purchaseNumber,
        purchaseOrderNumber: resolvedOrderNumber,
        serialNumber,
        okpd2Code,
        hasMultipleOkpd2,
        kvr: resolvedKvr,
        kbk: resolvedKbk,
      }),
    [
      ikzYear,
      plan.customer.inn,
      plan.customer.kpp,
      iku,
      purchaseNumber,
      resolvedOrderNumber,
      serialNumber,
      okpd2Code,
      hasMultipleOkpd2,
      resolvedKvr,
      resolvedKbk,
    ],
  );

  // Заголовки граф финансового обеспечения — как в форме ЕИС
  const amountHeaders: Record<AmountKey, string> = {
    amountTotal: "Всего, руб.",
    amountCurrentYear: `Сумма на ${baseYear} год, руб.`,
    amountPlanPeriodFirstYear: `Сумма на ${baseYear + 1} год, руб.`,
    amountPlanPeriodSecondYear: `Сумма на ${baseYear + 2} год, руб.`,
    amountSubsequentYears: "Сумма на последующие годы, руб.",
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

  // «Всего» во всех таблицах расчётное и не редактируется заказчиком
  const calculatedYearAmounts = {
    amountCurrentYear,
    amountPlanPeriodFirstYear,
    amountPlanPeriodSecondYear,
    amountSubsequentYears,
  };
  const calculatedAmountTotal = financeTotal(calculatedYearAmounts);

  useEffect(() => {
    const hasYears = [
      amountCurrentYear,
      amountPlanPeriodFirstYear,
      amountPlanPeriodSecondYear,
      amountSubsequentYears,
    ].some((value) => toNumber(value) !== null);
    const totalText = hasYears ? String(calculatedAmountTotal) : "";

    if ((getValues("amountTotal") ?? "") !== totalText) {
      setValue("amountTotal", totalText, { shouldValidate: true });
    }
  }, [
    amountCurrentYear,
    amountPlanPeriodFirstYear,
    amountPlanPeriodSecondYear,
    amountSubsequentYears,
    calculatedAmountTotal,
    getValues,
    setValue,
  ]);

  useEffect(() => {
    for (const [name, entries] of [
      ["kbkEntries", kbkEntriesValues],
      ["koksEntries", koksEntriesValues],
    ] as const) {
      (entries ?? []).forEach((entry, index) => {
        const hasYears = AMOUNT_FIELDS.some(
          (field) =>
            field.key !== "amountTotal" && toNumber(entry?.[field.key]) !== null,
        );
        const totalText = hasYears ? String(financeTotal(entry)) : "";

        if ((entry?.amountTotal ?? "") !== totalText) {
          setValue(`${name}.${index}.amountTotal`, totalText);
        }
      });
    }
  }, [kbkEntriesValues, koksEntriesValues, setValue]);

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

    // Наименование объекта закупки принимает наименование выбранного ОКПД2;
    // заказчик может его отредактировать в textarea
    if (item) {
      setValue("objectOfPurchase", item.name, { shouldValidate: true });
    }
  }

  // Дополнительный код ОКПД2: пишется в okpd2Items и участвует в ИКЗ как «0000»
  function handleExtraOkpd2Select(itemIndex: number, item: Okpd2Ref | null) {
    setValue(`okpd2Items.${itemIndex}.okpd2Code`, item?.code ?? "", {
      shouldValidate: true,
    });
    setValue(`okpd2Items.${itemIndex}.okpd2Name`, item?.name ?? "", {
      shouldValidate: true,
    });
  }

  function onSubmit(data: PurchasePlanPosition) {
    // КБК может быть собран из разрядов формы
    const kbkEntriesData = (data.kbkEntries ?? []).map((entry) => ({
      ...entry,
      kbk: entry.kbk || buildKbk(entry),
    }));
    const saveKbk = kbkEntriesData[0]?.kbk || data.kbk || "";
    // КВР берём из КБК (последние 3 разряда), отдельная детализация КВР
    // в карточке позиции больше не показывается.
    const saveKvr =
      saveKbk.length >= 3 ? saveKbk.slice(-3) : data.kvr || "";

    // Несколько кодов ОКПД2 сохраняются массивом okpd2Items: это и есть
    // «склеенный» набор для бэка, а в ИКЗ ставится «0000»
    const okpd2ItemsData = (data.okpd2Items ?? []).filter(
      (item) => item.okpd2Code,
    );

    // ИКЗ собираем сами по 55н и отправляем в XSD: заказчик его не вводит
    const identificationCode = buildIdentificationCode({
      planYear: data.plannedPlacementYear || ikzYear,
      inn: plan.customer.inn,
      kpp: plan.customer.kpp,
      iku: data.iku,
      purchaseNumber: data.purchaseNumber,
      purchaseOrderNumber: resolvedOrderNumber,
      serialNumber: data.serialNumber || String(index + 1),
      okpd2Code: data.okpd2Code,
      hasMultipleOkpd2: okpd2ItemsData.length > 0,
      kvr: saveKvr,
      kbk: saveKbk,
    });

    onSave({
      ...data,
      // Номер записи и её уникальный номер выдаёт система
      serialNumber: data.serialNumber || String(index + 1),
      uniqueNumber:
        data.uniqueNumber ||
        buildPositionUniqueNumber(plan.planNumber, serialNumber),
      purchaseOrderNumber: resolvedOrderNumber,
      // Внешний номер позиции — это номер плана-графика: заказчик его не
      // вводит, при создании подставляется автоматически
      extNumber: data.extNumber || plan.planNumber || "",
      // Статус передачи изменений определяется действием: новая запись — «N»,
      // правка существующей — «E» (вручную не выбирается)
      modificationStatus: isNew ? "N" : "E",
      status: data.status || "planned",
      identificationCode: identificationCode || data.identificationCode,
      kbkEntries: kbkEntriesData,
      kbk: saveKbk,
      kvr: saveKvr,
      okpd2Items: okpd2ItemsData,
      hasMultipleOkpd2: okpd2ItemsData.length > 0,
      // Скрытые блоками не должны оставлять значения в данных
      authorizedBodyName: data.hasAuthorizedBody ? data.authorizedBodyName : "",
      jointOrganizerName: data.hasJointOrganizer ? data.jointOrganizerName : "",
    });
  }

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)[path]?.message;

  // Суммы с разрядами: значение хранится без пробелов, показывается с ними
  const renderAmountInput = (
    name: string,
    value: string | number | undefined,
  ) => {
    const error = get(errors, name) as { message?: string } | undefined;

    return (
      <>
        <input
          className={block("input", ["money"])}
          inputMode="decimal"
          placeholder="0,00"
          value={displayAmountInput(value)}
          onChange={(event) =>
            setValue(name as Parameters<typeof setValue>[0],
              normalizeAmountInput(event.target.value),
              { shouldValidate: true, shouldDirty: true },
            )
          }
        />
        {error?.message && (
          <span className={block("error")}>{error.message}</span>
        )}
      </>
    );
  };

  const positionStatus = position.status ?? "planned";

  return (
    <section className={block()}>
      <nav className={block("breadcrumbs")} aria-label="Навигация">
        <button type="button" className={block("crumb")} onClick={onClose}>
          План-график № {plan.planNumber || "без номера"}
        </button>
        <span className={block("crumb-sep")} aria-hidden="true">
          /
        </span>
        <span className={block("crumb-current")}>
          {isNew
            ? "Новая позиция плана-графика"
            : `Изменение позиции № ${purchaseNumber || position.purchaseNumber || "—"}`}
        </span>
      </nav>

      <header className={block("eis-header")}>
        <div className={block("eis-header-main")}>
          <div className={block("eis-meta-row")}>
            <span className={block("status-badge", [positionStatus])}>
              {positionStatusLabel(positionStatus)}
            </span>
            <span className={block("meta-sep")} aria-hidden="true">
              ·
            </span>
            <span className={block("meta-text")}>
              {isNew ? "Формирование новой записи (N)" : "Редактирование позиции (E)"}
            </span>
            <span className={block("meta-sep")} aria-hidden="true">
              ·
            </span>
            <span className={block("meta-text")}>
              План {plan.planYear}–{plan.planPeriodSecondYear || baseYear + 2}
            </span>
          </div>

          <h1 className={block("title")}>
            {isNew
              ? `Новая позиция плана-графика закупок № ${plan.planNumber || "без номера"}`
              : `Позиция плана-графика № ${purchaseNumber || position.purchaseNumber || "0000"} (ПГ № ${plan.planNumber || "без номера"})`}
          </h1>

          {/* В шапке оставляем только верхнюю строку и даты: ИКЗ, объект
              и сумма есть в соответствующих разделах формы */}
          <div className={block("eis-summary")}>
            <div className={block("summary-stats")}>
              <div className={block("summary-stat")}>
                <span className={block("summary-label")}>Размещено в ЕИС</span>
                <span className={block("summary-date")}>
                  {plan.publishDate || "—"}
                </span>
              </div>
              <div className={block("summary-stat")}>
                <span className={block("summary-label")}>Утверждено</span>
                <span className={block("summary-date")}>
                  {plan.approvalDate || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button type="button" className={block("back-btn")} onClick={onClose}>
          ← К плану-графику
        </button>
      </header>

      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          {/* Раздел 1: Сведения о закупке */}
          <fieldset className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title")}>1. Сведения о закупке</h2>
            </div>

            <div className={block("fields")}>
              <div className={block("cell", ["wide"])}>
                <span className={block("label")}>
                  Уникальный номер позиции в плане-графике закупок
                </span>
                {/* Номер собирает система при первом сохранении: заказчик его
                    не вводит и не редактирует */}
                {uniqueNumber ? (
                  <span className={block("value", ["mono"])}>
                    {uniqueNumber}
                  </span>
                ) : (
                  <span className={block("value", ["muted"])}>
                    Будет сформирован при первом сохранении позиции
                  </span>
                )}
                <p className={block("hint")}>
                  24 цифры: 18 цифр реестрового номера плана-графика (год — 4,
                  код заказчика по СПЗ — 11, порядковый номер плана — 3) и 6
                  цифр номера позиции. Собирается автоматически при сохранении и
                  при редактировании не меняется.
                </p>
              </div>

              <div className={block("cell", ["wide"])}>
                {/* Полный ИКЗ уже показан в шапке карточки, поэтому над
                    таблицей дублирующий заголовок не выводим */}
                <div className={block("table-wrap")}>
                  <table className={block("table", ["ikz"])}>
                    {/* Ширины граф — по числу символов в значениях; длинные
                        заголовки переносятся и колонки не растягивают */}
                    <colgroup>
                      <col className={block("col", ["ikz-year"])} />
                      <col className={block("col", ["ikz-customer"])} />
                      <col className={block("col", ["ikz-purchase"])} />
                      <col className={block("col", ["ikz-order"])} />
                      <col className={block("col", ["ikz-okpd2"])} />
                      <col className={block("col", ["ikz-kvr"])} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Год</th>
                        <th>Идентификационный код заказчика</th>
                        <th>
                          Номер закупки, включенной в план-график закупок
                        </th>
                        <th>Порядковый номер закупки</th>
                        <th>Код позиции ОКПД2</th>
                        <th>Код вида расходов</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {[
                          ikzParts.year,
                          ikzParts.customerCode,
                          ikzParts.purchaseNumber,
                          ikzParts.orderNumber,
                          ikzParts.okpd2,
                          ikzParts.kvr,
                        ].map((part, partIndex) => (
                          <td
                            key={partIndex}
                            className={block("cell", ["ikz-part"])}
                            aria-label={`Разряд ИКЗ ${partIndex + 1}`}
                          >
                            {part || "—"}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {ikzParts.code && (
                  <div className={block("ikz-actions")}>
                    <button
                      type="button"
                      className={block("copy-btn")}
                      onClick={() => {
                        void navigator.clipboard?.writeText(ikzParts.code);
                      }}
                    >
                      Скопировать
                    </button>
                  </div>
                )}
                {!ikzParts.code && (
                  <span className={block("error")}>
                    ИКЗ не собран: проверьте ИНН/КПП заказчика, номер закупки и
                    КВР/КБК.
                  </span>
                )}
                <p className={block("hint")}>
                  Разряды ИКЗ формируются автоматически по Порядку,
                  утверждённому {IKZ_ORDER_REFERENCE}; формат 36 цифр закреплён
                  XSD ЕИС 17.0 (ikzCodeType). Ручной ввод в графах ИКЗ
                  заблокирован.
                </p>
              </div>

              <div className={block("cell")}>
                <div className={block("field-inline")}>
                  <label
                    className={block("label")}
                    htmlFor="position-purchase-number"
                  >
                    Номер закупки, включенной в план-график закупок
                  </label>
                  <input
                    id="position-purchase-number"
                    className={block("input", ["mono", "plain"])}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="0001"
                    {...register("purchaseNumber")}
                  />
                </div>
                {purchaseNumberTaken && (
                  <span className={block("error")}>
                    Номер уже используется в этом плане-графике
                  </span>
                )}
                {errorText("purchaseNumber") && (
                  <span className={block("error")}>
                    {errorText("purchaseNumber")}
                  </span>
                )}
                <p className={block("hint")}>
                  Не более 9999 — до четырёх цифр. Номер закупки входит в ИКЗ
                  (разряды 23–26).
                </p>
                <div className={block("field-inline")}>
                  <label
                    className={block("label")}
                    htmlFor="position-placement-year"
                  >
                    Планируемый год размещения извещения
                  </label>
                  <select
                    id="position-placement-year"
                    className={block("select", ["plain"])}
                    {...register("plannedPlacementYear")}
                  >
                    {placementYearOptions(
                      Math.min(baseYear, Number(plannedPlacementYear) || baseYear),
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errorText("plannedPlacementYear") && (
                    <span className={block("error")}>
                      {errorText("plannedPlacementYear")}
                    </span>
                  )}
                </div>
              </div>

              {/* Уполномоченный орган и организатор совместной закупки —
                  столбиком под номером закупки и годом размещения */}
              <div className={block("cell", ["wide", "flags-stack"])}>
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("hasAuthorizedBody")} />
                  <span>Есть уполномоченный орган (учреждение)</span>
                </label>
                {hasAuthorizedBody && (
                  <div className={block("subcontrol")}>
                    <span className={block("label")}>
                      Наименование уполномоченного органа (учреждения)
                    </span>
                    <CustomSelect
                      listData={AUTHORIZED_BODIES}
                      selectedValue={authorizedBodyName ?? ""}
                      placeholder="Выберите уполномоченный орган"
                      getKey={(item) => item.name}
                      getLabel={(item) => item.name}
                      searchable
                      searchPlaceholder="Поиск уполномоченного органа…"
                      onClick={(_key, item) =>
                        setValue("authorizedBodyName", item.name, {
                          shouldValidate: true,
                        })
                      }
                    />
                  </div>
                )}
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("hasJointOrganizer")} />
                  <span>Есть организатор совместной закупки</span>
                </label>
                {hasJointOrganizer && (
                  <div className={block("subcontrol")}>
                    <span className={block("label")}>
                      Наименование организатора совместного конкурса или
                      аукциона
                    </span>
                    <CustomSelect
                      listData={organizers}
                      selectedValue={jointOrganizerName ?? ""}
                      placeholder="Выберите организатора"
                      getKey={(item) => item.name}
                      getLabel={(item) => item.name}
                      searchable
                      searchPlaceholder="Поиск организатора…"
                      onClick={(_key, item) =>
                        setValue("jointOrganizerName", item.name, {
                          shouldValidate: true,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

          </fieldset>

          {/* Раздел 2: Информация об объекте закупки (без КТРУ) */}
          <fieldset className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title")}>
                2. Информация об объекте закупки
              </h2>
            </div>

            <div className={block("fields")}>
              <div className={block("cell", ["wide"])}>
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

                {/* Дополнительные коды ОКПД2: добавляются кнопкой, в ИКЗ при
                    нескольких кодах ставится «0000» */}
                {okpd2Items.fields.map((field, itemIndex) => (
                  <div className={block("okpd2-row")} key={field.id}>
                    <Okpd2Select
                      code={okpd2ItemsValues?.[itemIndex]?.okpd2Code}
                      name={okpd2ItemsValues?.[itemIndex]?.okpd2Name}
                      onSelect={(item) =>
                        handleExtraOkpd2Select(itemIndex, item)
                      }
                    />
                    <button
                      type="button"
                      className={block("remove")}
                      onClick={() => okpd2Items.remove(itemIndex)}
                    >
                      Убрать
                    </button>
                  </div>
                ))}

                <div className={block("inline-actions")}>
                  <button
                    type="button"
                    className={block("add")}
                    onClick={() =>
                      okpd2Items.append({ okpd2Code: "", okpd2Name: "" })
                    }
                  >
                    Добавить код ОКПД2
                  </button>
                </div>

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

              <div className={block("cell", ["wide"])}>
                <label
                  className={block("label")}
                  htmlFor="position-object-of-purchase"
                >
                  Наименование объекта закупки
                </label>
                <textarea
                  id="position-object-of-purchase"
                  className={block("textarea")}
                  rows={3}
                  placeholder="Наименование по ОКПД2, правится заказчиком"
                  {...register("objectOfPurchase")}
                />
              </div>
            </div>

            {/* Специальные признаки закупки из tenderPlan2020PositionType */}
            <div className={block("subblock")}>
              <h3 className={block("subtitle")}>
                Специальные признаки закупки (ЕИС 17.0)
              </h3>
              <div className={block("flags-grid")}>
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
                  <span>
                    Планируется заключение энергосервисного контракта (ст. 108
                    44-ФЗ)
                  </span>
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
                  <span>
                    Закупка на оказание услуг по предоставлению кредита
                  </span>
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
                  <span>
                    Закупка в отношении ОКС / недвижимого имущества (КОКС, пп.
                    «а» п. 18 Положения № 1279)
                  </span>
                </label>
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("isNotFederalFinancing")} />
                  <span>
                    ОКС / недвижимость без софинансирования из федерального
                    бюджета
                  </span>
                </label>
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("notPublishedOnEIS")} />
                  <span>Не подлежит размещению на официальном сайте ЕИС</span>
                </label>
              </div>
            </div>
          </fieldset>

          {/* Раздел 3: Объём финансового обеспечения (одной ровной строкой)
              и детализация по КБК / КОКС */}
          <fieldset className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title")}>
                3. Объём финансового обеспечения закупки и детализация (КБК,
                КОКС)
              </h2>
            </div>

            <div className={block("subblock", ["first"])}>
              <h3 className={block("subtitle")}>
                Объём финансового обеспечения закупки
              </h3>
              <div className={block("table-wrap")}>
                <table className={block("table", ["amounts"])}>
                  <colgroup>
                    <col className={block("col", ["amount-label"])} />
                    {EIS_AMOUNT_FIELDS.map((field) => (
                      <col
                        key={field.key}
                        className={block("col", ["amount-value"])}
                      />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={block("th", ["first"])}>
                        Планируемые платежи
                      </th>
                      {EIS_AMOUNT_FIELDS.map((field) => (
                        <th key={field.key}>{amountHeaders[field.key]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={block("cell", ["row-label"])}>
                        Сумма
                      </td>
                      {EIS_AMOUNT_FIELDS.map((field) => (
                        <td key={field.key} className={block("cell", ["money"])}>
                          {field.key === "amountTotal" ? (
                            <span className={block("calc-total")}>
                              {formatMoneyValue(calculatedAmountTotal)}
                            </span>
                          ) : (
                            renderAmountInput(
                              field.key,
                              calculatedYearAmounts[
                                field.key as keyof typeof calculatedYearAmounts
                              ],
                            )
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              {errorText("amountTotal") && (
                <span className={block("error")}>{errorText("amountTotal")}</span>
              )}
              <p className={block("hint")}>
                «Всего» должно совпадать с суммой платежей по годам: год
                формирования плана-графика и два следующих года планового
                периода, остаток — последующие годы.
              </p>
            </div>

            <div className={block("subblock")}>
              <h3 className={block("subtitle")}>
                Детализация по кодам бюджетной классификации (КБК:{" "}
                {kbkEntries.fields.length})
              </h3>

              <div className={block("table-wrap")}>
                <table className={block("table", ["kbk"])}>
                  <colgroup>
                    <col className={block("col", ["chapter"])} />
                    <col className={block("col", ["section"])} />
                    <col className={block("col", ["target"])} />
                    <col className={block("col", ["expense"])} />
                    {EIS_AMOUNT_FIELDS.map((field) => (
                      <col
                        key={field.key}
                        className={block("col", ["kbk-money"])}
                      />
                    ))}
                    <col className={block("col", ["action"])} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th colSpan={4}>Код бюджетной классификации</th>
                      <th colSpan={EIS_AMOUNT_FIELDS.length}>
                        Объём финансового обеспечения
                      </th>
                      <th rowSpan={2}>Действие</th>
                    </tr>
                    <tr>
                      {KBK_PART_FIELDS.map((part) => (
                        <th key={part.key} className={block("th", ["sub"])}>
                          {part.label}
                        </th>
                      ))}
                      {EIS_AMOUNT_FIELDS.map((field) => (
                        <th key={field.key} className={block("th", ["sub"])}>
                          {amountHeaders[field.key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kbkEntries.fields.map((field, entryIndex) => (
                      <tr key={field.id}>
                        {KBK_PART_FIELDS.map((part) => (
                          <td key={part.key}>
                            {/* Разряды КБК — обычные поля формы: так они
                                заполняются в любой строке, а не только в первой */}
                            <input
                              className={block("input", ["mono"])}
                              placeholder={part.placeholder}
                              aria-label={part.label}
                              maxLength={part.length}
                              list={
                                part.key === "expenseType"
                                  ? "kvr-options"
                                  : undefined
                              }
                              {...register(
                                `kbkEntries.${entryIndex}.${part.key}`,
                              )}
                            />
                          </td>
                        ))}
                        {EIS_AMOUNT_FIELDS.map((amount) => (
                          <td
                            key={amount.key}
                            className={block("cell", ["money"])}
                          >
                            {amount.key === "amountTotal" ? (
                              <span className={block("calc-total")}>
                                {formatMoneyValue(
                                  financeTotal(kbkEntriesValues?.[entryIndex]),
                                )}
                              </span>
                            ) : (
                              renderAmountInput(
                                `kbkEntries.${entryIndex}.${amount.key}`,
                                kbkEntriesValues?.[entryIndex]?.[amount.key],
                              )
                            )}
                          </td>
                        ))}
                        <td className={block("cell", ["action"])}>
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
                    <tr>
                      <td colSpan={4 + AMOUNT_FIELDS.length + 1}>
                        <button
                          type="button"
                          className={block("add")}
                          onClick={() => kbkEntries.append({ kbk: "" })}
                        >
                          Добавить КБК
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className={block("cell", ["right"])}>
                        Итого по кодам бюджетной классификации
                      </td>
                      {EIS_AMOUNT_FIELDS.map((field) => (
                        <td
                          key={field.key}
                          className={block("cell", ["total"])}
                        >
                          {formatMoneyValue(kbkTotals[field.key])}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <datalist id="kvr-options">
                {kvrOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </datalist>
              <p className={block("hint")}>
                Кодов может быть сколько угодно: суммы по годам указываются,
                только когда закупка разнесена по кодам.
              </p>
            </div>

            {/* purchasesSubsecYearsInfo: правовой акт нужен только для закупок
                за пределами планового периода (сумма на последующие годы). */}
            {(toNumber(amountSubsequentYears) ?? 0) > 0 && (
              <div className={block("subblock")}>
                <h3 className={block("subtitle")}>
                  Правовой акт для закупки на последующие годы
                </h3>
                <div className={block("cell", ["wide"])}>
                  <label
                    className={block("label")}
                    htmlFor="position-subsec-years-legal-act"
                  >
                    Правовой акт (проект правового акта), предусматривающий
                    заключение контракта на срок, превышающий срок действия
                    доведенных лимитов бюджетных обязательств
                  </label>
                  <textarea
                    id="position-subsec-years-legal-act"
                    className={block("textarea")}
                    rows={3}
                    placeholder="Например, распоряжение Правительства Курской области от 01.01.2026 № 1-р"
                    {...register("subsecYearsLegalAct")}
                  />
                  {errorText("subsecYearsLegalAct") && (
                    <span className={block("error")}>
                      {errorText("subsecYearsLegalAct")}
                    </span>
                  )}
                  <p className={block("hint")}>
                    Заполняется при сумме на последующие годы: в XML ЕИС 17.0
                    попадает в purchasesSubsecYearsInfo/actInfo/docInfo.
                  </p>
                </div>
              </div>
            )}

            {(isConstructionWorks || koksEntries.fields.length > 0) && (
              <div className={block("subblock")}>
                <h3 className={block("subtitle")}>
                  Детализация по кодам КОКС — ОКС/ОНИ (
                  {koksEntries.fields.length})
                </h3>
                <div className={block("table-wrap")}>
                  <table className={block("table", ["koks"])}>
                    <colgroup>
                      <col className={block("col", ["koks-code"])} />
                      {EIS_AMOUNT_FIELDS.map((field) => (
                        <col
                          key={field.key}
                          className={block("col", ["kbk-money"])}
                        />
                      ))}
                      <col className={block("col", ["action"])} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Код КОКС (ОКС/ОНИ)</th>
                        {EIS_AMOUNT_FIELDS.map((field) => (
                          <th key={field.key}>{amountHeaders[field.key]}</th>
                        ))}
                        <th>Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {koksEntries.fields.map((field, entryIndex) => (
                        <tr key={field.id}>
                          <td>
                            <div className={block("koks-cell")}>
                              <input
                                className={block("input", ["mono"])}
                                placeholder="25000000000000000000"
                                aria-label="Код КОКС"
                                {...register(
                                  `koksEntries.${entryIndex}.koksCode`,
                                )}
                              />
                              <button
                                type="button"
                                className={block("pick")}
                                onClick={() => setKoksPickerIndex(entryIndex)}
                              >
                                Выбрать из справочника
                              </button>
                              {koksEntriesValues?.[entryIndex]?.koksName && (
                                <span className={block("koks-name")}>
                                  {koksEntriesValues[entryIndex].koksName}
                                </span>
                              )}
                            </div>
                          </td>
                          {EIS_AMOUNT_FIELDS.map((amount) => (
                            <td
                              key={amount.key}
                              className={block("cell", ["money"])}
                            >
                              {amount.key === "amountTotal" ? (
                                <span className={block("calc-total")}>
                                  {formatMoneyValue(
                                    financeTotal(koksEntriesValues?.[entryIndex]),
                                  )}
                                </span>
                              ) : (
                                renderAmountInput(
                                  `koksEntries.${entryIndex}.${amount.key}`,
                                  koksEntriesValues?.[entryIndex]?.[amount.key],
                                )
                              )}
                            </td>
                          ))}
                          <td className={block("cell", ["action"])}>
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
                      <tr>
                        <td colSpan={1 + AMOUNT_FIELDS.length + 1}>
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
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Общественное обсуждение: в XSD ПГ 2020 поле необязательное,
                но documentation требует заполнения, когда год размещения
                совпадает с годом планирования. */}
            <div className={block("subblock")}>
              <h3 className={block("subtitle")}>
                Общественное обсуждение (ЕИС 17.0)
              </h3>
              <div className={block("flags-panel")}>
                <div className={block("discussion-row")}>
                  <label
                    className={block("label")}
                    htmlFor="position-public-discussion"
                  >
                    Необходимо обязательное общественное обсуждение в
                    соответствии со ст. 20 44-ФЗ
                  </label>
                  <select
                    id="position-public-discussion"
                    className={block("select", ["compact"])}
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
              </div>
            </div>
          </fieldset>

          {/* Сведения об изменении / отмене позиции вынесены в самый низ формы:
              при создании новой позиции блока нет. Поля транспонированы под
              заголовки XSD — слева название поля, справа значение. */}
          {!isNew && (
            <div className={block("mod-box", ["bottom"])}>
              <h3 className={block("mod-title")}>
                Сведения об изменении / отмене позиции (positionModification)
              </h3>
              <div className={block("table-wrap")}>
                <table className={block("table", ["modification"])}>
                  <colgroup>
                    <col className={block("col", ["mod-label"])} />
                    <col className={block("col", ["mod-value"])} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Наименование поля</th>
                      <th>Значение</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">
                        Основание внесения изменений (changeReason)
                      </th>
                      <td>
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
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Вынесенное решение (decision)</th>
                      <td>
                        <div className={block("radio-row")}>
                          {modificationDecisionOptions.map((option) => (
                            <label
                              key={option.value}
                              className={block("radio")}
                            >
                              <input
                                type="radio"
                                value={option.value}
                                {...register("modificationDecision")}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">
                        Содержание изменений позиции (description)
                      </th>
                      <td>
                        <textarea
                          id="position-modification-description"
                          className={block("textarea")}
                          rows={3}
                          placeholder="Обоснование корректировки или отмены позиции"
                          {...register("modificationDescription")}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              <button
                type="button"
                className={block("cancel")}
                onClick={onClose}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={block("submit")}
                disabled={isSaving}
              >
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
