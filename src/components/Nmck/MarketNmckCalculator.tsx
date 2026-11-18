import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Database,
  FileDown,
  Plus,
  Save,
  Scale,
  Trash2,
} from "lucide-react";
import useUtils from "../../hooks/useUtils";
import {
  MARKET_PRICE_SOURCE_LABELS,
  MARKET_PRICE_SOURCE_TYPES,
  NMCK_METHODS,
  NMCK_METHOD_LABELS,
  type MarketPriceSourceType,
  type NmckCalculationRecord,
  type NmckMarketOffer,
  type NmckMethod,
} from "../../services/Nmck/nmck.schema";
import {
  DEFAULT_NORMATIVE_ACT,
  MAX_RECOMMENDED_CV_PERCENT,
  MIN_RECOMMENDED_SOURCES,
  buildMarketNmckBasisText,
  buildNmckCalculationRecord,
  buildNormativeCalculationRecord,
  buildNormativeNmckBasisText,
  calculateMarketNmck,
  calculateNormativeNmck,
  createEmptyMarketOffer,
  exportNmckCalculationToDocx,
  formatNmckMoney,
  parseNumericInput,
} from "../../services/Nmck/marketNmck";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import type { Okpd2Ref } from "../../services/Okpd2Ref/okpd2Ref.schema";
import { checkOkpd2AuctionList } from "../../services/Okpd2Ref/auctionListControl";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import styles from "./MarketNmckCalculator.module.scss";

export interface MarketNmckCalculatorProps {
  /** Ранее сохранённый расчёт (при повторном редактировании в СЗ) */
  initialRecord?: NmckCalculationRecord | null;
  defaultSubject?: string;
  defaultOkpd2Code?: string;
  defaultOkpd2Name?: string;
  defaultQuantity?: string | number;
  defaultUnit?: string;
  defaultIkz?: string;
  defaultCalculatorName?: string;
  organizationName?: string;
  /** Текущий лимит финансового обеспечения по позиции ПГ (₽) */
  planAmountLimit?: number | null;
  /** Контракты организации для подстановки в качестве ценового источника ЕИС */
  contractRegistryItems?: ContractRegistryItem[];
  /** Показывать ли переключатель обновления объёма финобеспечения в ПГ */
  canUpdatePlanAmount?: boolean;
  defaultUpdatePlanAmount?: boolean;
  /** Встроенный режим (внутри формы СЗ) */
  embedded?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
  saveButtonLabel?: string;
  onSaveToPosition?: (payload: {
    record: NmckCalculationRecord;
    basisText: string;
    updatePlanAmount: boolean;
  }) => void;
  onClose?: () => void;
}

/**
 * Интерактивный калькулятор НМЦК (ст. 22 Закона № 44-ФЗ, Приказ МЭР № 567):
 * - метод сопоставимых рыночных цен (анализ рынка, ч. 2–5 ст. 22);
 * - нормативный метод (ч. 7 ст. 22, ст. 19 44-ФЗ, ПП РФ № 926 / № 1047)
 *   с увязкой со справочником нормирования ОКПД2.
 */
export default function MarketNmckCalculator({
  initialRecord,
  defaultSubject = "",
  defaultOkpd2Code = "",
  defaultOkpd2Name = "",
  defaultQuantity = "1",
  defaultUnit = "шт",
  defaultIkz = "",
  defaultCalculatorName = "",
  organizationName = "",
  planAmountLimit = null,
  contractRegistryItems = [],
  canUpdatePlanAmount = true,
  defaultUpdatePlanAmount = false,
  embedded = false,
  isSaving = false,
  disabled = false,
  saveButtonLabel = "Сохранить обоснование в СЗ",
  onSaveToPosition,
  onClose,
}: MarketNmckCalculatorProps) {
  const { bem } = useUtils();
  const block = bem(styles, "market-nmck");
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));

  const [method, setMethod] = useState<NmckMethod>(
    () => initialRecord?.method ?? "market_analysis",
  );
  const [subject, setSubject] = useState(
    () => initialRecord?.subject || defaultSubject,
  );
  const [okpd2Code, setOkpd2Code] = useState(
    () => initialRecord?.okpd2Code || defaultOkpd2Code,
  );
  const [okpd2Name, setOkpd2Name] = useState(
    () => initialRecord?.okpd2Name || defaultOkpd2Name,
  );
  const [quantity, setQuantity] = useState(() => {
    const raw = initialRecord?.quantity ?? defaultQuantity ?? "1";
    const parsed = parseNumericInput(raw);
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "1";
  });
  const [unit, setUnit] = useState(
    () => initialRecord?.unit || defaultUnit || "шт",
  );
  const [calculationDate, setCalculationDate] = useState(
    () => initialRecord?.calculationDate || todayIso,
  );
  const [calculatorName, setCalculatorName] = useState(
    () => initialRecord?.calculatorName || defaultCalculatorName,
  );
  const [notes, setNotes] = useState(() => initialRecord?.notes || "");
  const [updatePlanAmount, setUpdatePlanAmount] = useState(
    defaultUpdatePlanAmount,
  );

  // Поля метода сопоставимых рыночных цен (анализ рынка)
  const [applyAutoInflation, setApplyAutoInflation] = useState(
    () => initialRecord?.applyAutoInflation ?? false,
  );
  const [annualInflationPercent, setAnnualInflationPercent] = useState(
    () => initialRecord?.annualInflationPercent || "7.5",
  );
  const [selectedBasis, setSelectedBasis] = useState<"mean" | "min">(
    () => initialRecord?.selectedBasis ?? "mean",
  );
  const [offers, setOffers] = useState<NmckMarketOffer[]>(() =>
    initialRecord?.offers && initialRecord.offers.length > 0
      ? initialRecord.offers
      : [
          createEmptyMarketOffer(0, todayIso, "commercial_offer"),
          createEmptyMarketOffer(1, todayIso, "commercial_offer"),
          createEmptyMarketOffer(2, todayIso, "commercial_offer"),
        ],
  );
  const [selectedContractId, setSelectedContractId] = useState("");

  // Поля нормативного метода (ст. 19, ч. 7 ст. 22 44-ФЗ, увязка с ОКПД2)
  const [normativeUnitPrice, setNormativeUnitPrice] = useState(() => {
    if (initialRecord?.normativeUnitPrice !== undefined) {
      return initialRecord.normativeUnitPrice.toFixed(2);
    }
    if (initialRecord?.normLimitUnitPrice !== undefined) {
      return initialRecord.normLimitUnitPrice.toFixed(2);
    }
    return "";
  });
  const [normativeAct, setNormativeAct] = useState(
    () => initialRecord?.normativeAct || DEFAULT_NORMATIVE_ACT,
  );
  const [normativeDocument, setNormativeDocument] = useState(
    () => initialRecord?.normativeDocument || "",
  );

  const [isExporting, setIsExporting] = useState(false);

  const matchedOkpd2 = useMemo(
    () => findOkpd2ByCode(okpd2Refs, okpd2Code),
    [okpd2Refs, okpd2Code],
  );
  const auctionCheck = useMemo(
    () => checkOkpd2AuctionList(okpd2Code, okpd2Refs),
    [okpd2Code, okpd2Refs],
  );

  // Если цена норматива ещё не заполнена, но для выбранного ОКПД2 уже подгрузился
  // предел нормирования из справочника — отображаем его как эффективную цену по умолчанию
  const effectiveNormUnitPrice = useMemo(() => {
    if (normativeUnitPrice.trim() !== "") return normativeUnitPrice;
    if (matchedOkpd2?.isNormed && matchedOkpd2.normLimit !== undefined) {
      return matchedOkpd2.normLimit.toFixed(2);
    }
    return "";
  }, [normativeUnitPrice, matchedOkpd2]);

  const marketResult = useMemo(
    () =>
      calculateMarketNmck({
        quantity,
        calculationDate,
        applyAutoInflation,
        annualInflationPercent,
        selectedBasis,
        offers,
      }),
    [
      quantity,
      calculationDate,
      applyAutoInflation,
      annualInflationPercent,
      selectedBasis,
      offers,
    ],
  );

  const normResult = useMemo(
    () =>
      calculateNormativeNmck({
        quantity,
        unitPrice: effectiveNormUnitPrice,
        okpd2Ref: matchedOkpd2,
      }),
    [quantity, effectiveNormUnitPrice, matchedOkpd2],
  );

  const currentNmckTotal =
    method === "normative" ? normResult.nmckTotal : marketResult.nmckTotal;

  const marketNormLimitExceeded =
    method === "market_analysis" &&
    matchedOkpd2?.isNormed &&
    matchedOkpd2.normLimit !== undefined &&
    marketResult.activeCount > 0 &&
    (selectedBasis === "min"
      ? marketResult.minUnitPrice
      : marketResult.meanUnitPrice) > matchedOkpd2.normLimit;

  const planLimitExceeded =
    planAmountLimit !== null &&
    Number.isFinite(planAmountLimit) &&
    planAmountLimit > 0 &&
    currentNmckTotal > planAmountLimit;

  const availableContracts = useMemo(
    () =>
      contractRegistryItems.filter(
        (c) =>
          c.status !== "terminated" && parseNumericInput(c.contractPrice) > 0,
      ),
    [contractRegistryItems],
  );

  const handleSelectOkpd2 = (selected: Okpd2Ref | null) => {
    const nextCode = selected?.code ?? "";
    const nextName = selected?.name ?? "";
    setOkpd2Code(nextCode);
    setOkpd2Name(nextName);

    if (selected?.isNormed && selected.normLimit !== undefined) {
      setNormativeUnitPrice(selected.normLimit.toFixed(2));
    }
  };

  const handleSwitchMethod = (nextMethod: NmckMethod) => {
    setMethod(nextMethod);
    if (
      nextMethod === "normative" &&
      normativeUnitPrice.trim() === "" &&
      matchedOkpd2?.isNormed &&
      matchedOkpd2.normLimit !== undefined
    ) {
      setNormativeUnitPrice(matchedOkpd2.normLimit.toFixed(2));
    }
  };

  const updateOffer = (idx: number, patch: Partial<NmckMarketOffer>) => {
    setOffers((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
  };

  const handleAddOffer = (type: MarketPriceSourceType = "commercial_offer") => {
    setOffers((prev) => [
      ...prev,
      createEmptyMarketOffer(prev.length, calculationDate || todayIso, type),
    ]);
  };

  const handleAddFromRegistry = () => {
    const found = availableContracts.find(
      (c) => String(c.id ?? c.contractNumber) === selectedContractId,
    );
    if (!found) return;
    setOffers((prev) => [
      ...prev,
      {
        id: `offer-eis-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        sourceType: "eis_contract",
        supplierName: found.supplierName,
        sourceDocument: `Контракт № ${found.contractNumber} (${found.contractName})`,
        offerDate: found.contractDate || calculationDate || todayIso,
        unitPrice: String(found.contractPrice),
        vatMode: "with_vat",
        inflationCoeff: "1",
        commercialCoeff: "1",
        adjustmentComment:
          "Из реестра контрактов организации (при необходимости скорректируйте на количество)",
        included: true,
      },
    ]);
    setSelectedContractId("");
  };

  const handleRemoveOffer = (idx: number) => {
    if (offers.length <= 1) return;
    setOffers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExcludeMaxOutlier = () => {
    if (marketResult.maxDeviationOfferIndex === null) return;
    updateOffer(marketResult.maxDeviationOfferIndex, { included: false });
  };

  const buildCurrentRecordAndBasis = (): {
    record: NmckCalculationRecord;
    basisText: string;
  } => {
    const resolvedOkpd2Name = okpd2Name || matchedOkpd2?.name || undefined;

    if (method === "normative") {
      const record = buildNormativeCalculationRecord({
        subject,
        okpd2Code,
        okpd2Name: resolvedOkpd2Name,
        quantity,
        unit,
        calculationDate,
        calculatorName,
        normativeAct,
        normativeDocument,
        notes,
        result: normResult,
      });
      const basisText = buildNormativeNmckBasisText({
        result: normResult,
        unit,
        okpd2Code,
        normativeAct,
        normativeDocument,
      });
      return { record, basisText };
    }

    const record = buildNmckCalculationRecord({
      subject,
      okpd2Code,
      okpd2Name: resolvedOkpd2Name,
      quantity,
      unit,
      calculationDate,
      calculatorName,
      applyAutoInflation,
      annualInflationPercent,
      selectedBasis,
      offers,
      notes,
      result: marketResult,
      normLimitUnitPrice: matchedOkpd2?.normLimit ?? null,
    });
    const basisText = buildMarketNmckBasisText(marketResult, unit);
    return { record, basisText };
  };

  const handleSave = () => {
    if (!onSaveToPosition || currentNmckTotal <= 0) return;
    const { record, basisText } = buildCurrentRecordAndBasis();
    onSaveToPosition({ record, basisText, updatePlanAmount });
  };

  const handleDownloadDocx = async () => {
    setIsExporting(true);
    try {
      const { record } = buildCurrentRecordAndBasis();
      await exportNmckCalculationToDocx({
        organizationName,
        ikz: defaultIkz,
        record,
        marketResult: method === "market_analysis" ? marketResult : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const outlierCandidate =
    method === "market_analysis" &&
    !marketResult.isHomogeneous &&
    marketResult.maxDeviationOfferIndex !== null
      ? marketResult.evaluatedOffers[marketResult.maxDeviationOfferIndex]
      : undefined;

  const canSaveOrExport =
    method === "normative"
      ? normResult.nmckTotal > 0
      : marketResult.activeCount > 0 && marketResult.nmckTotal > 0;

  return (
    <div className={block("", embedded ? ["embedded"] : [])}>
      <div className={block("head")}>
        <div className={block("title-row")}>
          <Calculator size={18} aria-hidden="true" />
          <h3>Калькулятор и обоснование НМЦК (ст. 22 Закона № 44-ФЗ)</h3>
        </div>
        {onClose && (
          <button
            type="button"
            className={block("btn", ["compact"])}
            onClick={onClose}
          >
            Закрыть
          </button>
        )}
      </div>

      {/* Выбор метода определения НМЦК */}
      <div className={block("method-tabs")} role="tablist">
        {NMCK_METHODS.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            disabled={disabled}
            className={block(
              "method-tab",
              method === m ? ["active"] : [],
            )}
            onClick={() => handleSwitchMethod(m)}
          >
            {m === "normative" ? (
              <Scale size={14} aria-hidden="true" />
            ) : (
              <Calculator size={14} aria-hidden="true" />
            )}
            {NMCK_METHOD_LABELS[m]}
          </button>
        ))}
      </div>

      <p className={block("subtitle")}>
        {method === "market_analysis"
          ? `Метод сопоставимых рыночных цен (анализ рынка) — ч. 2–5 ст. 22 Закона № 44-ФЗ и Методические рекомендации МЭР № 567. Рекомендуется ≥ ${MIN_RECOMMENDED_SOURCES} источников и коэффициент вариации V ≤ ${MAX_RECOMMENDED_CV_PERCENT}%.`
          : "Нормативный метод — ч. 7 ст. 22, ст. 19 Закона № 44-ФЗ, ПП РФ от 02.09.2015 № 926 и ПП РФ от 13.10.2014 № 1047. Автоматически подтягивает предельные цены из справочника нормирования ОКПД2."}
      </p>

      {/* Параметры объекта закупки и расчёта */}
      <div className={block("params")}>
        <div className={block("field", ["wide"])}>
          <label className={block("label")} htmlFor="nmck-subject">
            Объект закупки
          </label>
          <input
            id="nmck-subject"
            className={block("input")}
            disabled={disabled}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Наименование товара, работы, услуги"
          />
        </div>

        <div className={block("field", ["wide"])}>
          <label className={block("label")} htmlFor="nmck-okpd2">
            Код ОКПД2 (связь с нормированием и аукционным перечнем)
          </label>
          <Okpd2Select
            id="nmck-okpd2"
            code={okpd2Code}
            name={okpd2Name || matchedOkpd2?.name}
            disabled={disabled}
            onSelect={handleSelectOkpd2}
          />
        </div>

        <div className={block("field")}>
          <label className={block("label")} htmlFor="nmck-quantity">
            Количество (объём) *
          </label>
          <input
            id="nmck-quantity"
            className={block("input", ["num"])}
            disabled={disabled}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
          />
        </div>

        <div className={block("field")}>
          <label className={block("label")} htmlFor="nmck-unit">
            Единица измерения (ОКЕИ)
          </label>
          <OkeiSelect
            id="nmck-unit"
            compact
            disabled={disabled}
            value={unit}
            valueMode="symbol"
            onChange={(val) => setUnit(val)}
          />
        </div>

        <div className={block("field")}>
          <label className={block("label")} htmlFor="nmck-calc-date">
            Дата расчёта НМЦК
          </label>
          <input
            id="nmck-calc-date"
            type="date"
            className={block("input")}
            disabled={disabled}
            value={calculationDate}
            onChange={(e) => setCalculationDate(e.target.value)}
          />
        </div>

        {method === "market_analysis" && (
          <div className={block("field")}>
            <label className={block("label")} htmlFor="nmck-basis-mode">
              Основание итоговой НМЦК
            </label>
            <select
              id="nmck-basis-mode"
              className={block("select")}
              disabled={disabled}
              value={selectedBasis}
              onChange={(e) =>
                setSelectedBasis(e.target.value === "min" ? "min" : "mean")
              }
            >
              <option value="mean">
                Средняя приведённая цена (п. 3.21 МЭР № 567)
              </option>
              <option value="min">Минимальная цена по выборке</option>
            </select>
          </div>
        )}

        <div className={block("field")}>
          <label className={block("label")} htmlFor="nmck-author">
            Исполнитель расчёта
          </label>
          <input
            id="nmck-author"
            className={block("input")}
            disabled={disabled}
            value={calculatorName}
            onChange={(e) => setCalculatorName(e.target.value)}
            placeholder="ФИО специалиста КС / инициатора"
          />
        </div>
      </div>

      {/* Индикатор увязки ОКПД2 с обязательным нормированием и аукционным перечнем */}
      {matchedOkpd2?.isNormed ? (
        <div className={block("norm-banner")} role="status">
          <span>
            <Scale
              size={14}
              style={{ verticalAlign: "text-bottom", marginRight: 6 }}
              aria-hidden="true"
            />
            <strong>Увязка с ОКПД2 ({matchedOkpd2.code}):</strong> позиция
            подлежит обязательному нормированию (ст. 19 44-ФЗ, ПП РФ № 926).
            {matchedOkpd2.normLimit !== undefined
              ? ` Установленная предельная цена единицы: ${formatNmckMoney(matchedOkpd2.normLimit)} ₽.`
              : " Предельная цена единицы устанавливается ведомственным перечнем."}
          </span>
          {method === "market_analysis" && !disabled && (
            <button
              type="button"
              className={block("btn", ["compact"])}
              onClick={() => handleSwitchMethod("normative")}
            >
              Применить нормативный метод по ОКПД2
            </button>
          )}
        </div>
      ) : (
        okpd2Code.trim() !== "" &&
        method === "normative" && (
          <div className={block("norm-banner", ["muted"])} role="status">
            <span>
              Код ОКПД2 {okpd2Code} отсутствует в перечне типового нормирования
              (ПП РФ № 926). Вы можете указать предельную цену из ведомственного
              перечня заказчика вручную.
            </span>
          </div>
        )
      )}

      {method === "market_analysis" ? (
        <>
          {/* Настройки индексации ИПЦ */}
          <div className={block("options-bar")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={applyAutoInflation}
                onChange={(e) => setApplyAutoInflation(e.target.checked)}
              />
              <span>
                Автоматически индексировать цены по дате источника (ИПЦ)
              </span>
            </label>

            {applyAutoInflation && (
              <div className={block("inline-group")}>
                <label className={block("label")} htmlFor="nmck-cpi-rate">
                  Годовой индекс инфляции (%):
                </label>
                <input
                  id="nmck-cpi-rate"
                  className={`${block("input", ["num"])} ${block("inline-input")}`}
                  disabled={disabled}
                  value={annualInflationPercent}
                  onChange={(e) => setAnnualInflationPercent(e.target.value)}
                />
              </div>
            )}

            {auctionCheck.inAuctionList && (
              <span className={block("subtitle")}>
                ОКПД2 {auctionCheck.code}: входит в аукционный перечень (РП РФ №
                471-р).
              </span>
            )}
          </div>

          {/* Таблица ценовых источников */}
          <div className={block("table-wrap")}>
            <table className={block("table")}>
              <thead>
                <tr>
                  <th title="Учитывать источник в расчёте">Учт.</th>
                  <th>№</th>
                  <th>Тип и источник ценовой информации</th>
                  <th>Документ / № / Дата</th>
                  <th>Цена ед., ₽</th>
                  <th title="Коэффициент инфляции (ИПЦ)">k инф</th>
                  <th title="Коэффициент коммерческих и финансовых условий (п. 3.17 МЭР № 567)">
                    k ком
                  </th>
                  <th>Приведённая цена ед.</th>
                  <th>Удалить</th>
                </tr>
              </thead>
              <tbody>
                {marketResult.evaluatedOffers.map((item) => {
                  const isMaxOutlier =
                    !marketResult.isHomogeneous &&
                    marketResult.maxDeviationOfferIndex === item.index;
                  const rowMods: string[] = [];
                  if (!item.isIncluded) rowMods.push("excluded");
                  else if (isMaxOutlier) rowMods.push("outlier");

                  return (
                    <tr key={item.offer.id} className={block("row", rowMods)}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Учитывать источник № ${item.index + 1}`}
                          disabled={disabled}
                          checked={item.isIncluded}
                          onChange={(e) =>
                            updateOffer(item.index, {
                              included: e.target.checked,
                            })
                          }
                        />
                      </td>
                      <td>{item.index + 1}</td>
                      <td>
                        <div className={block("source-stack")}>
                          <select
                            className={block("select")}
                            disabled={disabled}
                            value={
                              item.offer.sourceType ?? "commercial_offer"
                            }
                            onChange={(e) =>
                              updateOffer(item.index, {
                                sourceType: e.target
                                  .value as MarketPriceSourceType,
                              })
                            }
                          >
                            {MARKET_PRICE_SOURCE_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {MARKET_PRICE_SOURCE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                          <input
                            className={block("input")}
                            disabled={disabled}
                            value={item.offer.supplierName}
                            onChange={(e) =>
                              updateOffer(item.index, {
                                supplierName: e.target.value,
                              })
                            }
                            placeholder="Поставщик / реестровая запись"
                          />
                          <input
                            className={block("input")}
                            disabled={disabled}
                            value={item.offer.adjustmentComment ?? ""}
                            onChange={(e) =>
                              updateOffer(item.index, {
                                adjustmentComment: e.target.value,
                              })
                            }
                            placeholder="Условия оплаты/поставки или поправка (необяз.)"
                          />
                        </div>
                      </td>
                      <td>
                        <div className={block("doc-stack")}>
                          <input
                            className={block("input")}
                            disabled={disabled}
                            value={item.offer.sourceDocument ?? ""}
                            onChange={(e) =>
                              updateOffer(item.index, {
                                sourceDocument: e.target.value,
                              })
                            }
                            placeholder="Исх. № КП / ЕИС №"
                          />
                          <input
                            type="date"
                            className={block("input")}
                            disabled={disabled}
                            value={item.offer.offerDate ?? ""}
                            onChange={(e) =>
                              updateOffer(item.index, {
                                offerDate: e.target.value,
                              })
                            }
                          />
                          {item.isOutdated && (
                            <span className={block("badge")}>
                              Старше 6 мес. ({item.ageDays} дн.)
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <input
                          className={`${block("input", ["num"])} ${block("price-input")}`}
                          disabled={disabled}
                          value={item.offer.unitPrice}
                          onChange={(e) =>
                            updateOffer(item.index, {
                              unitPrice: e.target.value,
                            })
                          }
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input
                          className={`${block("input", ["num"])} ${block("coeff-input")}`}
                          disabled={disabled || applyAutoInflation}
                          value={
                            applyAutoInflation
                              ? item.effectiveInflationCoeff.toFixed(4)
                              : (item.offer.inflationCoeff ?? "1")
                          }
                          onChange={(e) =>
                            updateOffer(item.index, {
                              inflationCoeff: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className={`${block("input", ["num"])} ${block("coeff-input")}`}
                          disabled={disabled}
                          value={item.offer.commercialCoeff ?? "1"}
                          onChange={(e) =>
                            updateOffer(item.index, {
                              commercialCoeff: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className={block("computed-cell")}>
                        <strong>
                          {item.isValidPrice
                            ? `${formatNmckMoney(item.adjustedUnitPrice)} ₽`
                            : "—"}
                        </strong>
                        {item.isValidPrice && marketResult.activeCount >= 2 && (
                          <span
                            className={block(
                              "dev",
                              Math.abs(item.deviationPercent) > 25
                                ? ["high"]
                                : [],
                            )}
                          >
                            {item.deviationPercent >= 0 ? "+" : ""}
                            {item.deviationPercent.toFixed(1)}% от ср.
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={block("btn", ["danger"])}
                          disabled={disabled || offers.length <= 1}
                          onClick={() => handleRemoveOffer(item.index)}
                          title="Удалить источник цены"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Кнопки добавления источников */}
          <div className={block("actions-row")}>
            <div className={block("add-group")}>
              <button
                type="button"
                className={block("btn", ["compact"])}
                disabled={disabled}
                onClick={() => handleAddOffer("commercial_offer")}
              >
                <Plus size={14} aria-hidden="true" /> Добавить КП
              </button>
              <button
                type="button"
                className={block("btn", ["compact"])}
                disabled={disabled}
                onClick={() => handleAddOffer("public_price")}
              >
                <Plus size={14} aria-hidden="true" /> Добавить прайс / оферту
              </button>
              {availableContracts.length > 0 && (
                <>
                  <select
                    className={block("select")}
                    style={{ width: "auto", maxWidth: 280 }}
                    disabled={disabled}
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                    aria-label="Выбрать контракт из реестра организации"
                  >
                    <option value="">
                      — Подтянуть из реестра контрактов (
                      {availableContracts.length}) —
                    </option>
                    {availableContracts.map((c) => {
                      const key = String(c.id ?? c.contractNumber);
                      return (
                        <option key={key} value={key}>
                          № {c.contractNumber} · {c.supplierName} (
                          {formatNmckMoney(Number(c.contractPrice))} ₽)
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    className={block("btn", ["compact"])}
                    disabled={disabled || !selectedContractId}
                    onClick={handleAddFromRegistry}
                  >
                    <Database size={14} aria-hidden="true" /> Добавить из
                    реестра
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Сводные показатели анализа рынка */}
          <div className={block("metrics")}>
            <div className={block("metric")}>
              <span className={block("metric-label")}>Учтено источников</span>
              <span className={block("metric-value")}>
                {marketResult.activeCount} из {offers.length}
              </span>
              <span className={block("metric-sub")}>
                Норма МЭР № 567: ≥ {MIN_RECOMMENDED_SOURCES}
              </span>
            </div>

            <div className={block("metric")}>
              <span className={block("metric-label")}>
                Средняя приведённая ед.
              </span>
              <span className={block("metric-value")}>
                {formatNmckMoney(marketResult.meanUnitPrice)} ₽
              </span>
              <span className={block("metric-sub")}>
                Мин: {formatNmckMoney(marketResult.minUnitPrice)} ₽ · Макс:{" "}
                {formatNmckMoney(marketResult.maxUnitPrice)} ₽
              </span>
            </div>

            <div
              className={block("metric", [
                marketResult.activeCount >= 2
                  ? marketResult.isHomogeneous
                    ? "ok"
                    : "warn"
                  : "default",
              ])}
            >
              <span className={block("metric-label")}>
                Коэффициент вариации (V)
              </span>
              <span className={block("metric-value")}>
                {marketResult.cvPercent.toFixed(2)}%
              </span>
              <span className={block("metric-sub")}>
                {marketResult.activeCount < 2
                  ? "СКО: — (нужно ≥ 2)"
                  : marketResult.isHomogeneous
                    ? `Однородна (≤ ${MAX_RECOMMENDED_CV_PERCENT}%), СКО: ${formatNmckMoney(marketResult.stdDev)} ₽`
                    : `Неоднородна (> ${MAX_RECOMMENDED_CV_PERCENT}%), СКО: ${formatNmckMoney(marketResult.stdDev)} ₽`}
              </span>
            </div>

            <div className={block("metric", ["primary"])}>
              <span className={block("metric-label")}>
                Итоговая НМЦК (× {marketResult.quantity} {unit || "ед."})
              </span>
              <span className={block("metric-value")}>
                {formatNmckMoney(marketResult.nmckTotal)} ₽
              </span>
              <span className={block("metric-sub")}>
                {selectedBasis === "min"
                  ? `По мин. цене (средняя: ${formatNmckMoney(marketResult.nmckMeanTotal)} ₽)`
                  : `По средней цене (мин.: ${formatNmckMoney(marketResult.nmckMinTotal)} ₽)`}
              </span>
            </div>
          </div>

          {marketResult.activeCount > 0 && !marketResult.hasEnoughSources && (
            <div className={block("alert", ["warning"])} role="status">
              <span>
                <AlertTriangle size={14} aria-hidden="true" /> Учтено{" "}
                {marketResult.activeCount} ценовых источника(ов). По п. 3.19
                Методических рекомендаций МЭР № 567 рекомендуется использовать не
                менее 3 источников ценовой информации.
              </span>
            </div>
          )}

          {!marketResult.isHomogeneous && marketResult.activeCount >= 2 && (
            <div className={block("alert", ["warning"])} role="alert">
              <span>
                <AlertTriangle size={14} aria-hidden="true" /> Коэффициент
                вариации составляет{" "}
                <strong>{marketResult.cvPercent.toFixed(2)}%</strong> (выше
                порога 33%). По п. 3.20.2 Приказа МЭР № 567 выборка неоднородна
                —
                {outlierCandidate
                  ? ` наибольшее отклонение у источника № ${outlierCandidate.index + 1} «${outlierCandidate.offer.supplierName || "без названия"}» (${outlierCandidate.deviationPercent >= 0 ? "+" : ""}${outlierCandidate.deviationPercent.toFixed(1)}%).`
                  : " уточните сопоставимость предложений или исключите выбросы."}
              </span>
              {outlierCandidate && !disabled && (
                <button
                  type="button"
                  className={block("btn", ["compact"])}
                  onClick={handleExcludeMaxOutlier}
                >
                  Исключить выброс (№ {outlierCandidate.index + 1})
                </button>
              )}
            </div>
          )}

          {marketResult.outdatedCount > 0 && (
            <div className={block("alert", ["warning"])} role="status">
              <span>
                <AlertTriangle size={14} aria-hidden="true" /> Обнаружены
                ценовые источники старше 6 месяцев ({marketResult.outdatedCount}{" "}
                шт.). Согласно п. 3.16 МЭР № 567 рекомендуется применить индекс
                инфляции (ИПЦ) или актуализировать КП.
              </span>
            </div>
          )}

          {marketNormLimitExceeded && matchedOkpd2?.normLimit !== undefined && (
            <div className={block("alert", ["danger"])} role="alert">
              <span>
                Превышена предельная цена единицы по обязательному нормированию
                (ПП РФ № 926): рассчитано{" "}
                {formatNmckMoney(
                  selectedBasis === "min"
                    ? marketResult.minUnitPrice
                    : marketResult.meanUnitPrice,
                )}{" "}
                ₽ при нормативе {formatNmckMoney(matchedOkpd2.normLimit)} ₽!
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Поля нормативного метода с увязкой по ОКПД2 */}
          <div className={block("params")}>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="nmck-norm-unit-price">
                Предельная цена единицы по нормативу, ₽ *
              </label>
              <input
                id="nmck-norm-unit-price"
                className={block("input", ["num"])}
                disabled={disabled}
                value={effectiveNormUnitPrice}
                onChange={(e) => setNormativeUnitPrice(e.target.value)}
                placeholder="0.00"
              />
              {matchedOkpd2?.isNormed &&
                matchedOkpd2.normLimit !== undefined &&
                !disabled && (
                  <button
                    type="button"
                    className={block("btn", ["compact"])}
                    style={{ alignSelf: "flex-start", marginTop: 4 }}
                    onClick={() =>
                      setNormativeUnitPrice(matchedOkpd2.normLimit!.toFixed(2))
                    }
                  >
                    Взять лимит из ОКПД2 (
                    {formatNmckMoney(matchedOkpd2.normLimit)} ₽)
                  </button>
                )}
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="nmck-norm-act">
                Нормативный правовой акт / основание нормирования *
              </label>
              <input
                id="nmck-norm-act"
                className={block("input")}
                disabled={disabled}
                value={normativeAct}
                onChange={(e) => setNormativeAct(e.target.value)}
                placeholder={DEFAULT_NORMATIVE_ACT}
              />
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="nmck-norm-doc">
                Ведомственный перечень / пункт / реквизиты норматива
              </label>
              <input
                id="nmck-norm-doc"
                className={block("input")}
                disabled={disabled}
                value={normativeDocument}
                onChange={(e) => setNormativeDocument(e.target.value)}
                placeholder="Например: Ведомственный перечень отдельных видов ТРУ, п. 4 (приказ от … № …)"
              />
            </div>
          </div>

          {/* Сводные показатели нормативного метода */}
          <div className={block("metrics")}>
            <div className={block("metric")}>
              <span className={block("metric-label")}>
                Предел из справочника ОКПД2
              </span>
              <span className={block("metric-value")}>
                {normResult.normLimitUnitPrice !== null
                  ? `${formatNmckMoney(normResult.normLimitUnitPrice)} ₽`
                  : normResult.isNormedOkpd2
                    ? "Без числового лимита"
                    : "Вне перечня ОКПД2"}
              </span>
              <span className={block("metric-sub")}>
                {okpd2Code ? `ОКПД2: ${okpd2Code}` : "Код ОКПД2 не выбран"}
              </span>
            </div>

            <div className={block("metric")}>
              <span className={block("metric-label")}>
                Принятая цена единицы (Ц_пред)
              </span>
              <span className={block("metric-value")}>
                {formatNmckMoney(normResult.unitPrice)} ₽
              </span>
              <span className={block("metric-sub")}>
                Количество (v): {normResult.quantity} {unit || "ед."}
              </span>
            </div>

            <div
              className={block("metric", [
                normResult.exceedsNormLimit
                  ? "danger"
                  : normResult.normLimitUnitPrice !== null
                    ? "ok"
                    : "default",
              ])}
            >
              <span className={block("metric-label")}>
                Контроль нормирования
              </span>
              <span className={block("metric-value")}>
                {normResult.exceedsNormLimit
                  ? "Превышение предела"
                  : normResult.normLimitUnitPrice !== null
                    ? "Норматив соблюдён"
                    : "Задано вручную"}
              </span>
              <span className={block("metric-sub")}>
                {normResult.exceedsNormLimit
                  ? `+${formatNmckMoney(normResult.excessUnit)} ₽/ед. (итого +${formatNmckMoney(normResult.excessTotal)} ₽)`
                  : "ч. 7 ст. 22, ст. 19 44-ФЗ"}
              </span>
            </div>

            <div className={block("metric", ["primary"])}>
              <span className={block("metric-label")}>
                Итоговая НМЦК (v × Ц_пред)
              </span>
              <span className={block("metric-value")}>
                {formatNmckMoney(normResult.nmckTotal)} ₽
              </span>
              <span className={block("metric-sub")}>
                {normResult.normLimitTotal !== null
                  ? `Предел по ОКПД2: ${formatNmckMoney(normResult.normLimitTotal)} ₽`
                  : "Нормативный расчёт"}
              </span>
            </div>
          </div>

          {normResult.exceedsNormLimit &&
            normResult.normLimitUnitPrice !== null && (
              <div className={block("alert", ["danger"])} role="alert">
                <span>
                  <AlertTriangle size={14} aria-hidden="true" /> Указанная цена
                  единицы ({formatNmckMoney(normResult.unitPrice)} ₽) превышает
                  предельную цену по ОКПД2 (
                  {formatNmckMoney(normResult.normLimitUnitPrice)} ₽) на{" "}
                  {formatNmckMoney(normResult.excessUnit)} ₽/ед.!
                </span>
                {!disabled && (
                  <button
                    type="button"
                    className={block("btn", ["compact"])}
                    onClick={() =>
                      setNormativeUnitPrice(
                        normResult.normLimitUnitPrice!.toFixed(2),
                      )
                    }
                  >
                    Снизить до норматива (
                    {formatNmckMoney(normResult.normLimitUnitPrice)} ₽)
                  </button>
                )}
              </div>
            )}
        </>
      )}

      {planLimitExceeded && planAmountLimit !== null && (
        <div className={block("alert", ["warning"])} role="status">
          <span>
            Рассчитанная НМЦК ({formatNmckMoney(currentNmckTotal)} ₽) превышает
            текущий объём финансового обеспечения позиции ПГ (
            {formatNmckMoney(planAmountLimit)} ₽).
          </span>
        </div>
      )}

      <div className={block("field")}>
        <label className={block("label")} htmlFor="nmck-notes">
          Пояснение / примечание к обоснованию НМЦК
        </label>
        <textarea
          id="nmck-notes"
          rows={2}
          className={block("textarea")}
          disabled={disabled}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Например: условия поставки, срок гарантии, НДС, источники запросов в ЕИС / реквизиты ведомственного норматива…"
        />
      </div>

      {/* Нижняя панель действий */}
      <div className={block("footer")}>
        {canUpdatePlanAmount && onSaveToPosition && (
          <label className={block("checkbox")}>
            <input
              type="checkbox"
              disabled={disabled || isSaving}
              checked={updatePlanAmount}
              onChange={(e) => setUpdatePlanAmount(e.target.checked)}
            />
            <span>
              Также обновить плановый объём финобеспечения позиции ПГ
              (обоснование сохраняется только в СЗ)
            </span>
          </label>
        )}

        <div className={block("footer-buttons")}>
          <button
            type="button"
            className={block("btn")}
            disabled={isExporting || !canSaveOrExport}
            onClick={handleDownloadDocx}
          >
            <FileDown size={14} aria-hidden="true" />{" "}
            {isExporting ? "Формирование…" : "Выгрузить обоснование (.docx)"}
          </button>

          {onSaveToPosition && (
            <button
              type="button"
              className={block("btn", ["primary"])}
              disabled={disabled || isSaving || currentNmckTotal <= 0}
              onClick={handleSave}
            >
              {isSaving ? (
                "Сохранение…"
              ) : (
                <>
                  <Save size={14} aria-hidden="true" /> {saveButtonLabel}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {method === "market_analysis" &&
        marketResult.activeCount > 0 &&
        marketResult.isHomogeneous &&
        marketResult.hasEnoughSources && (
          <p className={block("subtitle")}>
            <CheckCircle2
              size={13}
              style={{ verticalAlign: "text-bottom", marginRight: 4 }}
              aria-hidden="true"
            />
            Выборка соответствует требованиям ст. 22 44-ФЗ и Приказа МЭР № 567
            (источников ≥ 3, коэффициент вариации V ≤ 33%).
          </p>
        )}

      {method === "normative" &&
        normResult.nmckTotal > 0 &&
        !normResult.exceedsNormLimit && (
          <p className={block("subtitle")}>
            <CheckCircle2
              size={13}
              style={{ verticalAlign: "text-bottom", marginRight: 4 }}
              aria-hidden="true"
            />
            Расчёт нормативным методом сформирован (ч. 7 ст. 22, ст. 19 Закона
            № 44-ФЗ).
          </p>
        )}
    </div>
  );
}
