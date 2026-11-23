import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import { formatMoney } from "../PurchasePlan/purchasePlan.config";
import { usePurchasePlan } from "../../services/PurchasePlan/purchasePlan.api";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import {
  buildObjectDescriptionSummaryText,
  CHARACTERISTIC_CATEGORIES,
  CHARACTERISTIC_VALUE_TYPES,
  characteristicCategoryLabels,
  characteristicValueTypeLabels,
  emptyCharacteristic,
  formatCharacteristicValue,
  STANDARD_TYPES,
  standardTypeLabels,
  TRADEMARK_RULES,
  trademarkRuleLabels,
  validateObjectDescriptionCompliance,
  type CharacteristicCategory,
  type ObjectCharacteristic,
  type ObjectDescription,
  type ObjectDescriptionStatus,
  type ObjectStandardRef,
} from "../../services/ObjectDescription/objectDescription.schema";
import {
  isGoodsObjectDescription,
  mergeKtruCharacteristics,
  ktruToObjectCharacteristics,
} from "../../services/ObjectDescription/descriptionTemplates";
import {
  findKtruByCode,
  findKtruByOkpd2,
  useCharacteristicsFillingInstructions,
  useKtruDictionary,
} from "../../services/KtruRef/ktruRef.api";
import type { KtruRef } from "../../services/KtruRef/ktruRef.schema";
import type { ContractService } from "../../services/ContractService/contractService.schema";
import type { EmployeeEducation } from "../../services/ContractService/education.schema";
import KtruSelect from "../UI/KtruSelect/KtruSelect";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import Order158nValidatorPanel from "./Order158nValidatorPanel";
import styles from "./NormingRequirementsPage.module.scss";
import Select from "../UI/Select";

interface ObjectDescriptionEditorProps {
  initialValue: ObjectDescription;
  /** Организация заказчика — нужна, чтобы прочитать исходный план-график */
  organizationId?: string | number;
  templatesByCode: Record<string, ObjectDescription>;
  contractService?: ContractService | null;
  educations?: EmployeeEducation[];
  isHead: boolean;
  defaultApproverName: string;
  isSaving: boolean;
  onSave: (value: ObjectDescription) => void;
  onCancel: () => void;
}

/**
 * Структурированный редактор описания объекта закупки (ст. 33 44-ФЗ,
 * ПП РФ N 145 и п. 7 ПП РФ N 926). Работает и как самостоятельный конструктор
 * на /norming-requirements, и как основа для интеграции в СЗ и извещение.
 */
export default function ObjectDescriptionEditor({
  initialValue,
  organizationId,
  templatesByCode,
  contractService,
  educations = [],
  isHead,
  defaultApproverName,
  isSaving,
  onSave,
  onCancel,
}: ObjectDescriptionEditorProps) {
  const { bem } = useUtils();
  const block = bem(styles, "norming-requirements");
  const { data: okpd2Dictionary = [] } = useOkpd2Dictionary();

  const [draft, setDraft] = useState<ObjectDescription>(initialValue);
  const [categoryFilter, setCategoryFilter] = useState<
    CharacteristicCategory | "all"
  >("all");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const matchedOkpd2 = useMemo(
    () => findOkpd2ByCode(okpd2Dictionary, draft.okpd2Code),
    [okpd2Dictionary, draft.okpd2Code],
  );
  const templateForCode = draft.okpd2Code
    ? templatesByCode[draft.okpd2Code]
    : undefined;

  // Выбранная позиция КТРУ: единица измерения и характеристики берутся из неё,
  // поэтому справочник нужен даже если селект уже вернул код при выборе
  const {
    data: ktruDictionary = [],
    isLoading: ktruDictionaryLoading,
  } = useKtruDictionary();
  const { data: fillingInstructions = {} } =
    useCharacteristicsFillingInstructions();
  const instructionOptions = useMemo(
    () => Object.entries(fillingInstructions),
    [fillingInstructions],
  );
  const ktruForOkpd2 = useMemo(
    () => findKtruByOkpd2(ktruDictionary, draft.okpd2Code),
    [ktruDictionary, draft.okpd2Code],
  );
  const hasKtruForOkpd2 = ktruForOkpd2.length > 0;
  // Пока справочник грузится (или недоступен), флаг не прячем: иначе он
  // «мигнёт» на время загрузки или исчезнет при сбое НСИ.
  const ktruDictionaryUnavailable =
    !ktruDictionaryLoading && ktruDictionary.length === 0;
  const hideKtruFlag =
    Boolean(draft.okpd2Code) && !ktruDictionaryUnavailable && !hasKtruForOkpd2;
  const selectedKtru = useMemo(
    () => findKtruByCode(ktruDictionary, draft.ktruCode),
    [ktruDictionary, draft.ktruCode],
  );
  const ktruUnit = selectedKtru?.unit?.trim() ? selectedKtru.unit : "";
  const unitFromKtru = draft.useKtru && Boolean(ktruUnit);
  // Пока КТРУ не выбран, единицу не трогаем: она придёт из каталога
  const unitWaitingForKtru = draft.useKtru && !selectedKtru;
  const showNewGoodsRequirement = isGoodsObjectDescription(draft);

  // ОКПД2 обязан быть общим с позицией плана-графика: иначе закупка не связана
  // с ПГ, и сохранение блокируется до внесения изменений в план-график.
  const { data: purchasePlan, isLoading: purchasePlanLoading } = usePurchasePlan(
    draft.purchasePlanId,
    organizationId ?? draft.organizationId ?? undefined,
  );
  const planPosition = useMemo(
    () =>
      purchasePlan?.positions.find(
        (item) => String(item.id) === String(draft.positionId),
      ),
    [purchasePlan, draft.positionId],
  );
  const planOkpd2Codes = useMemo(() => {
    if (!planPosition) return [];
    return [
      planPosition.okpd2Code,
      ...(planPosition.okpd2Items ?? []).map((item) => item.okpd2Code),
    ]
      .filter((code): code is string => Boolean(code?.trim()))
      .map((code) => code.trim().toLowerCase());
  }, [planPosition]);
  const planContextExpected = Boolean(draft.purchasePlanId || draft.positionId);
  const planPositionMissing =
    planContextExpected && !purchasePlanLoading && !planPosition;
  const planOkpd2Mismatch =
    (Boolean(planPosition) || planPositionMissing) &&
    !planOkpd2Codes.some(
      (code) => code === draft.okpd2Code.trim().toLowerCase(),
    );
  const planCheckPending =
    Boolean(draft.purchasePlanId) &&
    (purchasePlanLoading || (!purchasePlan && Boolean(organizationId)));
  const planBlocked =
    planOkpd2Mismatch || planPositionMissing || planCheckPending;

  // Инструкция участнику — текст из ЕИС. Если справочник подгрузился позже
  // позиции КТРУ, формулировку по сохранённому коду берём при показе и сохранении.
  const instructionText = (item: ObjectCharacteristic) =>
    (item.instructionSourceCode &&
      fillingInstructions[item.instructionSourceCode]) ||
    item.instructionForParticipant;

  const complianceIssues = useMemo(
    () =>
      validateObjectDescriptionCompliance(draft, {
        hasKtruForOkpd2: ktruDictionaryUnavailable
          ? undefined
          : hasKtruForOkpd2,
      }),
    [draft, hasKtruForOkpd2, ktruDictionaryUnavailable],
  );
  const blockingErrors = complianceIssues.filter((i) => i.level === "error");

  const visibleCharacteristics = useMemo(() => {
    if (categoryFilter === "all") {
      return draft.characteristics.map((item, idx) => ({ item, idx }));
    }
    return draft.characteristics
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.category === categoryFilter);
  }, [draft.characteristics, categoryFilter]);

  const previewText = useMemo(
    () => buildObjectDescriptionSummaryText(draft),
    [draft],
  );

  const patch = <K extends keyof ObjectDescription>(
    key: K,
    value: ObjectDescription[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSubmitError("");
  };

  const handleSelectKtru = (item: KtruRef | null) => {
    setDraft((prev) => {
      const next: ObjectDescription = {
        ...prev,
        ktruCode: item?.ktruCode ?? "",
        ktruName: item?.name ?? "",
        // Единица измерения из КТРУ: пока позиция выбрана, поле не редактируется
        unit: item?.unit?.trim() ? item.unit : prev.unit,
      };
      if (item) {
        next.characteristics = mergeKtruCharacteristics(
          next.characteristics,
          ktruToObjectCharacteristics(item),
        );
      }
      return next;
    });
    setSubmitError("");
  };

  const handleApplyKtruCharacteristics = () => {
    if (!selectedKtru) return;
    patch(
      "characteristics",
      mergeKtruCharacteristics(
        draft.characteristics,
        ktruToObjectCharacteristics(selectedKtru),
      ),
    );
  };

  const handleApplyNormingTemplate = () => {
    if (!templateForCode || templateForCode.characteristics.length === 0) {
      return;
    }
    const existingNames = new Set(
      draft.characteristics.map((c) => c.name.trim().toLowerCase()),
    );
    const cloned = templateForCode.characteristics
      .filter((c) => !existingNames.has(c.name.trim().toLowerCase()))
      .map((c) => ({
        ...c,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }));
    if (cloned.length === 0) {
      return;
    }
    const cleanedCurrent = draft.characteristics.filter((c) => c.name.trim());
    patch("characteristics", [...cleanedCurrent, ...cloned]);
  };

  const addCharacteristic = (
    category: CharacteristicCategory = categoryFilter === "all"
      ? "consumer"
      : categoryFilter,
  ) => {
    patch("characteristics", [
      ...draft.characteristics,
      emptyCharacteristic(category),
    ]);
  };

  const updateCharacteristic = (
    idx: number,
    changes: Partial<ObjectCharacteristic>,
  ) => {
    const next = [...draft.characteristics];
    next[idx] = { ...next[idx], ...changes };
    patch("characteristics", next);
  };

  const removeCharacteristic = (idx: number) => {
    const next = [...draft.characteristics];
    next.splice(idx, 1);
    patch("characteristics", next);
  };

  const addStandard = () => {
    const item: ObjectStandardRef = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      standardType: "GOST",
      code: "",
      title: "",
      hasDeviation: false,
      deviationJustification: "",
    };
    patch("standards", [...draft.standards, item]);
  };

  const updateStandard = (
    idx: number,
    changes: Partial<ObjectStandardRef>,
  ) => {
    const next = [...draft.standards];
    next[idx] = { ...next[idx], ...changes };
    patch("standards", next);
  };

  const removeStandard = (idx: number) => {
    const next = [...draft.standards];
    next.splice(idx, 1);
    patch("standards", next);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowPreview(true);
    }
  };

  /**
   * Сохранение — это действие, а не значение поля: черновик, передача в КС
   * и утверждение руководителем выбираются кнопками внизу карточки.
   */
  const saveWithStatus = (requestedStatus: ObjectDescriptionStatus) => {
    const status =
      requestedStatus === "approved" && !isHead ? "ready" : requestedStatus;

    // Общий код ОКПД2 с позицией ПГ — обязательное условие связки закупки.
    // Пока расхождение не устранено, любые действия с ООЗ недоступны.
    if (planCheckPending) {
      setSubmitError(
        "Дождитесь проверки ОКПД2 по позиции плана-графика.",
      );
      return;
    }
    if (planOkpd2Mismatch || planPositionMissing) {
      setSubmitError(
        "ОКПД2 ООЗ не совпадает с ОКПД2 позиции плана-графика. Внесите изменения в ПГ (добавьте общий код ОКПД2) или выберите код из позиции ПГ.",
      );
      return;
    }

    if (!draft.title.trim()) {
      setSubmitError("Укажите наименование объекта закупки.");
      return;
    }
    if (!draft.okpd2Code.trim()) {
      setSubmitError("Выберите код ОКПД2.");
      return;
    }

    const emptyChar = draft.characteristics.find((c) => !c.name.trim());
    if (emptyChar) {
      setSubmitError(
        "У каждой добавленной характеристики должно быть заполнено наименование показателя (или удалите пустую строку).",
      );
      return;
    }

    const emptyStd = draft.standards.find((s) => !s.code.trim());
    if (emptyStd) {
      setSubmitError(
        "Укажите обозначение каждого добавленного стандарта (ГОСТ / ТР ТС / ТУ) или удалите пустую строку.",
      );
      return;
    }

    // Блокируем перевод в статус «Готово» / «Утверждено», пока есть ошибки по 44-ФЗ / ПП 145
    if (status !== "draft" && blockingErrors.length > 0) {
      setSubmitError(
        "Устраните обязательные нарушения ст. 33 44-ФЗ / ПП РФ N 145 или сохраните документ как «Черновик».",
      );
      return;
    }

    const nextToSave: ObjectDescription = {
      ...draft,
      status,
      // Текст инструкции показателя фиксируем из ЕИС на момент сохранения
      characteristics: draft.characteristics.map((item) => ({
        ...item,
        instructionForParticipant: instructionText(item),
      })),
      // При неопределённом объёме в ООЗ фиксируем 1 — ЕИС требует числовое значение
      quantity: draft.isIndeterminateVolume ? "1" : draft.quantity,
      approvedByName:
        status === "approved"
          ? draft.approvedByName || defaultApproverName
          : draft.approvedByName,
      approvedDate:
        status === "approved"
          ? draft.approvedDate || new Date().toISOString().slice(0, 10)
          : draft.approvedDate,
    };

    onSave(nextToSave);
  };

  return (
    <form
      className={block("editor")}
      onSubmit={(event) => event.preventDefault()}
    >
      <div className={block("editor-head")}>
        <div>
          <h2 className={block("editor-title")}>
            {draft.id
              ? "Редактирование описания объекта закупки"
              : "Новое структурированное описание объекта закупки"}
          </h2>
          <p className={block("hint")}>
            Структура сформирована по ст. 33 44-ФЗ, ПП РФ № 145 (Правила КТРУ)
            и п. 7 ПП РФ № 926 (нормирование).
          </p>
          <div className={block("head-meta")}>
            {draft.ikz ? (
              <span className={block("ikz-badge")} title="ИКЗ из позиции плана-графика">
                ИКЗ: {draft.ikz}
              </span>
            ) : (
              <span className={block("ikz-badge", ["empty"])}>
                ИКЗ не сформирован в плане-графике
              </span>
            )}
            <span className={block("status-badge", [draft.status])}>
              {draft.status === "draft"
                ? "Черновик"
                : draft.status === "ready"
                  ? "Готово к согласованию"
                  : "Утверждено"}
            </span>
          </div>
        </div>
        <div className={block("editor-actions")}>
          <button
            type="button"
            className={block("secondary-btn")}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Скрыть макет ТЗ" : "Макет ТЗ"}
          </button>
          <button
            type="button"
            className={block("secondary-btn")}
            onClick={onCancel}
          >
            ← К списку ООЗ
          </button>
        </div>
      </div>

      {/* Секция 1: Идентификация объекта, ОКПД2 и КТРУ */}
      <fieldset className={block("fieldset")}>
        <legend className={block("legend")}>
          1. Идентификация объекта закупки (ОКПД2 / КТРУ / объём)
        </legend>

        <div className={block("grid")}>
          <div className={block("field", ["full"])}>
            <label className={block("label")} htmlFor="ooz-title">
              Наименование объекта закупки *
            </label>
            <textarea
              id="ooz-title"
              className={block("textarea")}
              rows={2}
              placeholder="Например: Поставка медицинской функциональной кровати"
              value={draft.title}
              onChange={(e) => patch("title", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")}>Код по ОКПД2 *</label>
            <Okpd2Select
              code={draft.okpd2Code}
              name={draft.okpd2Name}
              multilineLabel
              onSelect={(item) => {
                const nextCode = item?.code ?? "";
                // Позиций КТРУ по коду нет — флаг применения каталога
                // показывать и сохранять нельзя.
                const ktruAvailable =
                  !nextCode ||
                  ktruDictionaryLoading ||
                  ktruDictionary.length === 0 ||
                  findKtruByOkpd2(ktruDictionary, nextCode).length > 0;
                setDraft((prev) => ({
                  ...prev,
                  okpd2Code: nextCode,
                  okpd2Name: item?.name ?? "",
                  title:
                    prev.title.trim() || !item?.name ? prev.title : item.name,
                  useKtru: ktruAvailable ? prev.useKtru : false,
                  ktruCode: ktruAvailable ? prev.ktruCode : "",
                  ktruName: ktruAvailable ? prev.ktruName : "",
                  characteristics: ktruAvailable
                    ? prev.characteristics
                    : prev.characteristics.map((c) => ({
                        ...c,
                        isMandatoryFromKtru: false,
                      })),
                }));
                setSubmitError("");
              }}
            />
            {(planOkpd2Mismatch || planPositionMissing) && (
              <p className={block("error-msg")}>
                Код ОКПД2 не совпадает ни с одним кодом ОКПД2 позиции
                плана-графика (или позиция не найдена). Внесите изменения в ПГ
                — добавьте общий код ОКПД2 в позицию, — либо выберите код из
                позиции ПГ. Действия с ООЗ заблокированы.
              </p>
            )}
            {planCheckPending && (
              <p className={block("field-hint")}>
                Проверяем код ОКПД2 по позиции плана-графика…
              </p>
            )}
            {matchedOkpd2?.isNormed && (
              <div className={block("norming-banner")}>
                <span>
                  Код <strong>{matchedOkpd2.code}</strong> подлежит
                  обязательному нормированию (ПП РФ N 926).
                  {matchedOkpd2.normLimit !== undefined
                    ? ` Предельная цена единицы: ${formatMoney(matchedOkpd2.normLimit)}.`
                    : ""}
                </span>
                {templateForCode && (
                  <button
                    type="button"
                    className={block("inline-btn")}
                    onClick={handleApplyNormingTemplate}
                  >
                    + Подставить типовые требования ПП 926 (
                    {templateForCode.characteristics.length})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-unit">
              Единица измерения (ОКЕИ)
            </label>
            <OkeiSelect
              id="ooz-unit"
              value={draft.unit}
              valueMode="symbol"
              showCodeHint
              disabled={unitFromKtru || unitWaitingForKtru}
              placeholder="шт, компл, усл. ед, кг (ОКЕИ)…"
              onChange={(nextUnit) => patch("unit", nextUnit)}
            />
            {unitFromKtru ? (
              <span className={block("field-hint")}>
                Единица подставлена из позиции КТРУ — снимите КТРУ, чтобы
                выбрать другую.
              </span>
            ) : (
              <span className={block("field-hint")}>
                {unitWaitingForKtru
                  ? "Сначала выберите позицию КТРУ — единица подставится из каталога."
                  : "Выберите единицу вручную (КТРУ не применяется)."}
              </span>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("checkbox-label")}>
              <input
                type="checkbox"
                checked={draft.isIndeterminateVolume}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDraft((prev) => ({
                    ...prev,
                    isIndeterminateVolume: checked,
                    // ЕИС всё равно требует число: при неопределённом объёме
                    // фиксируем 1 и блокируем редактирование поля
                    quantity: checked ? "1" : prev.quantity,
                  }));
                  setSubmitError("");
                }}
              />
              <span>Невозможно определить объём (ч. 24 ст. 22 44-ФЗ)</span>
            </label>
            <label className={block("label")} htmlFor="ooz-qty">
              Количество (объём)
            </label>
            <input
              id="ooz-qty"
              className={block("input")}
              type="text"
              disabled={draft.isIndeterminateVolume}
              placeholder="1"
              value={draft.isIndeterminateVolume ? "1" : draft.quantity}
              onChange={(e) => patch("quantity", e.target.value)}
            />
          </div>

          {!hideKtruFlag && (
            <div className={block("field")}>
              <label className={block("label")} htmlFor="ooz-ktru">
                Применение КТРУ (ПП РФ № 145)
              </label>
              <label className={block("checkbox-label")}>
                <input
                  type="checkbox"
                  checked={draft.useKtru}
                  onChange={(e) => patch("useKtru", e.target.checked)}
                />
                <span>Включать позицию каталога товаров, работ, услуг</span>
              </label>
              {draft.useKtru && (
                <>
                  <KtruSelect
                    className={block("ktru-select")}
                    okpd2Code={draft.okpd2Code}
                    ktruCode={draft.ktruCode}
                    onSelect={handleSelectKtru}
                    disabled={!draft.okpd2Code}
                    showCharacteristicFilter
                  />
                  {selectedKtru?.characteristics.length ? (
                    <button
                      type="button"
                      className={block("inline-btn")}
                      onClick={handleApplyKtruCharacteristics}
                    >
                      + Подставить характеристики КТРУ (
                      {selectedKtru.characteristics.length})
                    </button>
                  ) : null}
                </>
              )}
              {draft.useKtru && !draft.ktruRefusalReason && !draft.ktruCode && (
                <span className={block("field-hint")}>
                  Если позиция КТРУ не подходит, укажите обоснование отказа —
                  оно сохранится в ООЗ.
                </span>
              )}
            </div>
          )}
        </div>
      </fieldset>

      {/* Секция 2: Структурированные характеристики */}
      <fieldset className={block("fieldset")}>
        <legend className={block("legend")}>
          2. Структурированные характеристики (ст. 33 44-ФЗ / ПП 145 / ПП 926)
        </legend>

        <div className={block("char-toolbar")}>
          <div className={block("chips")}>
            <button
              type="button"
              className={block("chip", categoryFilter === "all" ? ["active"] : [])}
              onClick={() => setCategoryFilter("all")}
            >
              Все ({draft.characteristics.length})
            </button>
            {CHARACTERISTIC_CATEGORIES.map((cat) => {
              const count = draft.characteristics.filter(
                (c) => c.category === cat,
              ).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={block(
                    "chip",
                    categoryFilter === cat ? ["active"] : [],
                  )}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {characteristicCategoryLabels[cat]} ({count})
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={block("add-btn")}
            onClick={() => addCharacteristic()}
          >
            + Добавить характеристику
          </button>
        </div>

        {visibleCharacteristics.length === 0 ? (
          <p className={block("empty-inline")}>
            В выбранной категории пока нет характеристик.
          </p>
        ) : (
          <div className={block("char-list")}>
            {visibleCharacteristics.map(({ item, idx }) => (
              <div key={item.id} className={block("char-card")}>
                <div className={block("char-row-main")}>
                  <div className={block("field")}>
                    <label className={block("label")}>Категория</label>
                    <Select
                      className={block("select")}
                      value={item.category}
                      onChange={(e) =>
                        updateCharacteristic(idx, {
                          category: e.target.value as CharacteristicCategory,
                        })
                      }
                    >
                      {CHARACTERISTIC_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {characteristicCategoryLabels[cat]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className={block("field", ["grow"])}>
                    <label className={block("label")}>
                      Наименование показателя *
                    </label>
                    <input
                      className={block("input")}
                      type="text"
                      placeholder="Например: Мощность, Диагональ, Материал корпуса"
                      value={item.name}
                      onChange={(e) =>
                        updateCharacteristic(idx, { name: e.target.value })
                      }
                    />
                  </div>

                  <div className={block("field", ["unit"])}>
                    <label className={block("label")}>Ед. изм.</label>
                    <OkeiSelect
                      compact
                      value={item.unit}
                      valueMode="symbol"
                      placeholder="мм, кг, Вт"
                      onChange={(nextUnit) =>
                        updateCharacteristic(idx, { unit: nextUnit })
                      }
                    />
                  </div>

                  <div className={block("field")}>
                    <label className={block("label")}>Вид значения</label>
                    <Select
                      className={block("select")}
                      value={item.valueType}
                      onChange={(e) =>
                        updateCharacteristic(idx, {
                          valueType: e.target
                            .value as ObjectCharacteristic["valueType"],
                        })
                      }
                    >
                      {CHARACTERISTIC_VALUE_TYPES.map((vt) => (
                        <option key={vt} value={vt}>
                          {characteristicValueTypeLabels[vt]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <button
                    type="button"
                    className={block("req-remove")}
                    onClick={() => removeCharacteristic(idx)}
                    title="Удалить характеристику"
                  >
                    ✕
                  </button>
                </div>

                <div className={block("char-row-values")}>
                  {item.valueType === "range" ? (
                    <>
                      <div className={block("field")}>
                        <label className={block("label")}>От (минимум)</label>
                        <input
                          className={block("input")}
                          type="text"
                          placeholder="Нижняя граница"
                          value={item.minValue}
                          onChange={(e) =>
                            updateCharacteristic(idx, {
                              minValue: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className={block("field")}>
                        <label className={block("label")}>До (максимум)</label>
                        <input
                          className={block("input")}
                          type="text"
                          placeholder="Верхняя граница"
                          value={item.maxValue}
                          onChange={(e) =>
                            updateCharacteristic(idx, {
                              maxValue: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  ) : item.valueType === "min" ? (
                    <div className={block("field")}>
                      <label className={block("label")}>Не менее</label>
                      <input
                        className={block("input")}
                        type="text"
                        placeholder="Минимальное значение"
                        value={item.minValue}
                        onChange={(e) =>
                          updateCharacteristic(idx, {
                            minValue: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : item.valueType === "max" ? (
                    <div className={block("field")}>
                      <label className={block("label")}>Не более</label>
                      <input
                        className={block("input")}
                        type="text"
                        placeholder="Максимальное значение"
                        value={item.maxValue}
                        onChange={(e) =>
                          updateCharacteristic(idx, {
                            maxValue: e.target.value,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className={block("field", ["wide"])}>
                      <label className={block("label")}>
                        {item.valueType === "enum"
                          ? "Допустимые варианты (через ;)"
                          : "Значение / формулировка требования"}
                      </label>
                      <input
                        className={block("input")}
                        type="text"
                        placeholder="Укажите значение или описание требования"
                        value={item.valueText}
                        onChange={(e) =>
                          updateCharacteristic(idx, {
                            valueText: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <div className={block("field", ["wide"])}>
                    <label className={block("label")}>
                      Инструкция участнику по показателю (п. 2 ч. 1 ст. 33)
                    </label>
                    {/* Текст берётся из справочника ЕИС: пользователь выбирает
                        формулировку, но не пишет её от руки. */}
                    <select
                      className={block("input")}
                      value={item.instructionSourceCode}
                      disabled={instructionOptions.length === 0}
                      onChange={(e) => {
                        const code = e.target.value;
                        updateCharacteristic(idx, {
                          instructionSourceCode: code,
                          instructionForParticipant:
                            fillingInstructions[code] ?? "",
                        });
                      }}
                    >
                      <option value="">Не выбрана</option>
                      {instructionOptions.map(([code, text]) => (
                        <option key={code} value={code} title={text}>
                          {text}
                        </option>
                      ))}
                    </select>
                    {instructionText(item) && (
                      <input
                        className={block("input")}
                        type="text"
                        readOnly
                        title={instructionText(item)}
                        value={instructionText(item)}
                      />
                    )}
                    {instructionOptions.length === 0 && (
                      <span className={block("field-hint")}>
                        Справочник ЕИС «Инструкции по заполнению характеристик
                        в заявке» не загружен. Загрузите его в разделе
                        справочников НСИ и повторите.
                      </span>
                    )}
                  </div>
                </div>

                <div className={block("char-flags")}>
                  {draft.useKtru && (
                    <>
                      <label className={block("checkbox-label")}>
                        <input
                          type="checkbox"
                          checked={item.isMandatoryFromKtru}
                          onChange={(e) =>
                            updateCharacteristic(idx, {
                              isMandatoryFromKtru: e.target.checked,
                              isAdditionalOverKtru: e.target.checked
                                ? false
                                : item.isAdditionalOverKtru,
                            })
                          }
                        />
                        <span>Обязательная характеристика из КТРУ</span>
                      </label>
                      <label className={block("checkbox-label")}>
                        <input
                          type="checkbox"
                          checked={item.isAdditionalOverKtru}
                          onChange={(e) =>
                            updateCharacteristic(idx, {
                              isAdditionalOverKtru: e.target.checked,
                              isMandatoryFromKtru: e.target.checked
                                ? false
                                : item.isMandatoryFromKtru,
                            })
                          }
                        />
                        <span>
                          Дополнительная характеристика сверх КТРУ (требует
                          обоснования по ПП 145)
                        </span>
                      </label>
                    </>
                  )}
                  <span className={block("char-preview-badge")}>
                    Итого: {formatCharacteristicValue(item)}
                  </span>
                </div>

                {draft.useKtru && item.isAdditionalOverKtru && (
                  <div className={block("justification-box")}>
                    <label className={block("label")}>
                      Обоснование необходимости дополнительной характеристики
                      сверх КТРУ (п. 6 Правил использования КТРУ, ПП 145) *
                    </label>
                    <textarea
                      className={block("textarea")}
                      rows={2}
                      placeholder="Укажите технологическую, медицинскую, санитарную или эксплуатационную необходимость…"
                      value={item.additionalJustification}
                      onChange={(e) =>
                        updateCharacteristic(idx, {
                          additionalJustification: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {/* Секция 3: Товарный знак, ГОСТ, гарантии и инструкция */}
      <fieldset className={block("fieldset")}>
        <legend className={block("legend")}>
          3. Стандарты, товарные знаки и гарантии (ст. 33 44-ФЗ)
        </legend>

        <div className={block("grid")}>
          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-trademark-rule">
              Указание товарного знака (п. 1 ч. 1 ст. 33)
            </label>
            <Select
              id="ooz-trademark-rule"
              className={block("select")}
              value={draft.trademarkRule}
              onChange={(e) =>
                patch(
                  "trademarkRule",
                  e.target.value as ObjectDescription["trademarkRule"],
                )
              }
            >
              {TRADEMARK_RULES.map((rule) => (
                <option key={rule} value={rule}>
                  {trademarkRuleLabels[rule]}
                </option>
              ))}
            </Select>
          </div>

          {draft.trademarkRule !== "none" && (
            <>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="ooz-trademark-name">
                  Наименование товарного знака *
                </label>
                <input
                  id="ooz-trademark-name"
                  className={block("input")}
                  type="text"
                  value={draft.trademarkName}
                  onChange={(e) => patch("trademarkName", e.target.value)}
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="ooz-trademark-just">
                  Параметры эквивалентности / обоснование *
                </label>
                <input
                  id="ooz-trademark-just"
                  className={block("input")}
                  type="text"
                  placeholder="Критерии эквивалентности или обоснование совместимости"
                  value={draft.trademarkJustification}
                  onChange={(e) =>
                    patch("trademarkJustification", e.target.value)
                  }
                />
              </div>
            </>
          )}
        </div>

        <div className={block("standards-block")}>
          <div className={block("standards-head")}>
            <span className={block("label")}>
              Нормативные документы, ГОСТ и технические регламенты (п. 2 ч. 1
              ст. 33)
            </span>
            <button
              type="button"
              className={block("add-btn")}
              onClick={addStandard}
            >
              + Добавить ГОСТ / регламент
            </button>
          </div>

          {draft.standards.map((std, idx) => (
            <div key={std.id} className={block("standard-row")}>
              <Select
                className={block("select")}
                value={std.standardType}
                onChange={(e) =>
                  updateStandard(idx, {
                    standardType: e.target
                      .value as ObjectStandardRef["standardType"],
                  })
                }
              >
                {STANDARD_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {standardTypeLabels[st]}
                  </option>
                ))}
              </Select>
              <input
                className={block("input")}
                type="text"
                placeholder="Номер (например, ГОСТ Р 50444-2020)"
                value={std.code}
                onChange={(e) => updateStandard(idx, { code: e.target.value })}
              />
              <input
                className={block("input")}
                type="text"
                placeholder="Наименование стандарта"
                value={std.title}
                onChange={(e) => updateStandard(idx, { title: e.target.value })}
              />
              <label className={block("checkbox-label")}>
                <input
                  type="checkbox"
                  checked={std.hasDeviation}
                  onChange={(e) =>
                    updateStandard(idx, { hasDeviation: e.target.checked })
                  }
                />
                <span>Отклонение от показателей стандарта</span>
              </label>
              <button
                type="button"
                className={block("req-remove")}
                onClick={() => removeStandard(idx)}
                title="Удалить стандарт"
              >
                ✕
              </button>
              {std.hasDeviation && (
                <div className={block("justification-box", ["full"])}>
                  <input
                    className={block("input")}
                    type="text"
                    placeholder="Обоснование необходимости использования нестандартных показателей (п. 2 ч. 1 ст. 33) *"
                    value={std.deviationJustification}
                    onChange={(e) =>
                      updateStandard(idx, {
                        deviationJustification: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={block("grid")}>
          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-warranty-months">
              Гарантийный срок, месяцев (ч. 4 ст. 33)
            </label>
            <input
              id="ooz-warranty-months"
              className={block("input")}
              type="text"
              placeholder="Например: 24"
              value={draft.warrantyTermMonths}
              onChange={(e) => patch("warrantyTermMonths", e.target.value)}
            />
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="ooz-author">
              Составитель ООЗ (специалист заказчика)
            </label>
            <input
              id="ooz-author"
              className={block("input")}
              type="text"
              value={draft.authorName}
              onChange={(e) => patch("authorName", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-warranty-req">
              Требования к объёму гарантии, монтажу и обучению (ч. 4 ст. 33)
            </label>
            <textarea
              id="ooz-warranty-req"
              className={block("textarea")}
              rows={2}
              placeholder="Порядок гарантийного обслуживания, расходы на доставку, монтаж, наладку, обучение персонала..."
              value={draft.warrantyRequirements}
              onChange={(e) => patch("warrantyRequirements", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-instruction">
              Инструкция по объекту закупки для участника (п. 2 ч. 1 ст. 33)
            </label>
            <p className={block("field-hint")}>
              Инструкция по отдельному показателю заполняется из справочника
              ЕИС и редактируется в карточке показателя.
            </p>
            <textarea
              id="ooz-instruction"
              className={block("textarea", ["instruction"])}
              rows={3}
              placeholder="Дополнительные пояснения к объекту закупки, если они нужны…"
              value={draft.participantInstruction}
              onChange={(e) => patch("participantInstruction", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            <label className={block("label")} htmlFor="ooz-other">
              Иные требования (упаковка, маркировка, сопутствующие документы)
            </label>
            <textarea
              id="ooz-other"
              className={block("textarea")}
              rows={2}
              value={draft.otherRequirements}
              onChange={(e) => patch("otherRequirements", e.target.value)}
            />
          </div>

          <div className={block("field", ["wide"])}>
            {showNewGoodsRequirement && (
              <label className={block("checkbox-label")}>
                <input
                  type="checkbox"
                  checked={draft.isNewGoodsRequired}
                  onChange={(e) =>
                    patch("isNewGoodsRequired", e.target.checked)
                  }
                />
                <span>
                  Поставляемый товар должен быть новым (не бывшим в
                  употреблении, п. 7 ч. 1 ст. 33)
                </span>
              </label>
            )}
            <label className={block("checkbox-label")}>
              <input
                type="checkbox"
                checked={draft.noRestrictionDeclaration}
                onChange={(e) =>
                  patch("noRestrictionDeclaration", e.target.checked)
                }
              />
              <span>
                Подтверждаю, что в ООЗ не включены требования, влекущие
                ограничение количества участников закупки (п. 1 ч. 1 ст. 33
                44-ФЗ)
              </span>
            </label>
          </div>
        </div>
      </fieldset>

      {/* Секция 4: Автоконтроль соответствия 44-ФЗ / ПП 145 */}
      <div className={block("compliance-panel")}>
        <h3 className={block("compliance-title")}>
          Проверка соответствия ст. 33 44-ФЗ и ПП РФ № 145
        </h3>
        {complianceIssues.length === 0 ? (
          <p className={block("compliance-ok")}>
            Нарушений и замечаний не выявлено — описание готово к включению в СЗ
            и извещение.
          </p>
        ) : (
          <ul className={block("compliance-list")}>
            {complianceIssues.map((issue) => (
              <li
                key={issue.code}
                className={block("compliance-item", [issue.level])}
              >
                <strong>
                  {issue.level === "error" ? "Ошибка:" : "Предупреждение:"}
                </strong>{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Секция 5: Живая проверка по Приказу Минфина № 158н */}
      <Order158nValidatorPanel
        compact
        descriptions={[draft]}
        selectedId={draft.id ?? "draft"}
        contractService={contractService}
        educations={educations}
        okpd2Dictionary={okpd2Dictionary}
      />

      {showPreview && (
        <div className={block("preview-box")}>
          <div className={block("preview-head")}>
            <h3>Структурированный макет ТЗ (ООЗ)</h3>
            <button
              type="button"
              className={block("inline-btn")}
              onClick={handleCopyText}
            >
              {copied ? "Скопировано ✓" : "Копировать текст"}
            </button>
          </div>
          <pre className={block("preview-pre")}>{previewText}</pre>
        </div>
      )}

      {submitError && <p className={block("error-msg")}>{submitError}</p>}

      <footer className={block("editor-footer")}>
        <button
          type="button"
          className={block("secondary-btn")}
          onClick={onCancel}
          disabled={isSaving}
        >
          Отмена
        </button>
        <button
          type="button"
          className={block("secondary-btn")}
          onClick={() => saveWithStatus("draft")}
          disabled={isSaving || planBlocked}
          title={planBlocked ? "Сначала устраните расхождение ОКПД2 с ПГ" : undefined}
        >
          Сохранить как черновик
        </button>
        <button
          type="button"
          className={block("primary-btn")}
          onClick={() => saveWithStatus("ready")}
          disabled={isSaving || planBlocked}
          title={planBlocked ? "Сначала устраните расхождение ОКПД2 с ПГ" : undefined}
        >
          {isSaving ? "Сохранение…" : "Сохранить и направить в КС"}
        </button>
        {/* Утверждение — отдельное действие руководителя КС: оно открывает
            следующие этапы. Нац режим по ПП РФ № 1875 здесь не проверяем:
            его задаёт КС позже, при подготовке извещения. */}
        <button
          type="button"
          className={block("approve-btn")}
          onClick={() => saveWithStatus("approved")}
          disabled={isSaving || planBlocked || !isHead}
          title={
            planBlocked
              ? "Сначала устраните расхождение ОКПД2 с ПГ"
              : isHead
                ? "Утвердить ООЗ и открыть следующие этапы закупки"
                : "Утверждает руководитель контрактной службы"
          }
        >
          Утвердить
        </button>
      </footer>
      <p className={block("footer-hint")}>
        Национальный режим по ПП РФ № 1875 на этапе ООЗ не проверяется — его
        устанавливает контрактная служба на следующих этапах закупки.
      </p>
    </form>
  );
}
