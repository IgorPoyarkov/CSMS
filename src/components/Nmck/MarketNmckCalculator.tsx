import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Database,
  FileDown,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import useUtils from "../../hooks/useUtils";
import {
  MARKET_PRICE_SOURCE_LABELS,
  MARKET_PRICE_SOURCE_TYPES,
  type MarketPriceSourceType,
  type NmckCalculationRecord,
  type NmckMarketOffer,
} from "../../services/Nmck/nmck.schema";
import {
  MAX_RECOMMENDED_CV_PERCENT,
  MIN_RECOMMENDED_SOURCES,
  buildMarketNmckBasisText,
  buildNmckCalculationRecord,
  calculateMarketNmck,
  createEmptyMarketOffer,
  exportMarketNmckToDocx,
  formatNmckMoney,
  parseNumericInput,
} from "../../services/Nmck/marketNmck";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import { checkOkpd2AuctionList } from "../../services/Okpd2Ref/auctionListControl";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import OkeiSelect from "../UI/OkeiSelect/OkeiSelect";
import styles from "./MarketNmckCalculator.module.scss";

export interface MarketNmckCalculatorProps {
  /** Ранее сохранённый расчёт (при повторном редактировании) */
  initialRecord?: NmckCalculationRecord | null;
  defaultSubject?: string;
  defaultOkpd2Code?: string;
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
  /** Встроенный режим (внутри модального окна карточки позиции ПГ) */
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
 * Интерактивный калькулятор НМЦК методом сопоставимых рыночных цен (анализ рынка)
 * по ст. 22 Закона № 44-ФЗ и Методическим рекомендациям Минэкономразвития № 567.
 */
export default function MarketNmckCalculator({
  initialRecord,
  defaultSubject = "",
  defaultOkpd2Code = "",
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
  saveButtonLabel = "Сохранить результат в карточку позиции ПГ",
  onSaveToPosition,
  onClose,
}: MarketNmckCalculatorProps) {
  const { bem } = useUtils();
  const block = bem(styles, "market-nmck");
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));

  const [subject, setSubject] = useState(
    () => initialRecord?.subject || defaultSubject,
  );
  const [okpd2Code, setOkpd2Code] = useState(
    () => initialRecord?.okpd2Code || defaultOkpd2Code,
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
  const [applyAutoInflation, setApplyAutoInflation] = useState(
    () => initialRecord?.applyAutoInflation ?? false,
  );
  const [annualInflationPercent, setAnnualInflationPercent] = useState(
    () => initialRecord?.annualInflationPercent || "7.5",
  );
  const [selectedBasis, setSelectedBasis] = useState<"mean" | "min">(
    () => initialRecord?.selectedBasis ?? "mean",
  );
  const [calculatorName, setCalculatorName] = useState(
    () => initialRecord?.calculatorName || defaultCalculatorName,
  );
  const [notes, setNotes] = useState(() => initialRecord?.notes || "");
  const [updatePlanAmount, setUpdatePlanAmount] = useState(
    defaultUpdatePlanAmount,
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
  const [isExporting, setIsExporting] = useState(false);

  const result = useMemo(
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

  const matchedOkpd2 = useMemo(
    () => findOkpd2ByCode(okpd2Refs, okpd2Code),
    [okpd2Refs, okpd2Code],
  );
  const auctionCheck = useMemo(
    () => checkOkpd2AuctionList(okpd2Code, okpd2Refs),
    [okpd2Code, okpd2Refs],
  );

  const normLimitExceeded =
    matchedOkpd2?.isNormed &&
    matchedOkpd2.normLimit !== undefined &&
    result.activeCount > 0 &&
    (selectedBasis === "min" ? result.minUnitPrice : result.meanUnitPrice) >
      matchedOkpd2.normLimit;

  const planLimitExceeded =
    planAmountLimit !== null &&
    Number.isFinite(planAmountLimit) &&
    planAmountLimit > 0 &&
    result.nmckTotal > planAmountLimit;

  const availableContracts = useMemo(
    () =>
      contractRegistryItems.filter(
        (c) => c.status !== "terminated" && parseNumericInput(c.contractPrice) > 0,
      ),
    [contractRegistryItems],
  );

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
        adjustmentComment: "Из реестра контрактов организации (при необходимости скорректируйте на количество)",
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
    if (result.maxDeviationOfferIndex === null) return;
    updateOffer(result.maxDeviationOfferIndex, { included: false });
  };

  const handleSave = () => {
    if (!onSaveToPosition || result.nmckTotal <= 0) return;
    const record = buildNmckCalculationRecord({
      subject,
      okpd2Code,
      quantity,
      unit,
      calculationDate,
      calculatorName,
      applyAutoInflation,
      annualInflationPercent,
      selectedBasis,
      offers,
      notes,
      result,
    });
    const basisText = buildMarketNmckBasisText(result, unit);
    onSaveToPosition({ record, basisText, updatePlanAmount });
  };

  const handleDownloadDocx = async () => {
    setIsExporting(true);
    try {
      await exportMarketNmckToDocx({
        organizationName,
        ikz: defaultIkz,
        subject,
        okpd2Code,
        quantity: result.quantity,
        unit,
        calculationDate,
        calculatorName,
        result,
        notes,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const outlierCandidate =
    !result.isHomogeneous && result.maxDeviationOfferIndex !== null
      ? result.evaluatedOffers[result.maxDeviationOfferIndex]
      : undefined;

  return (
    <div className={block("", embedded ? ["embedded"] : [])}>
      <div className={block("head")}>
        <div className={block("title-row")}>
          <Calculator size={18} aria-hidden="true" />
          <h3>
            Калькулятор НМЦК: метод сопоставимых рыночных цен (анализ рынка)
          </h3>
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

      <p className={block("subtitle")}>
        Расчёт по ч. 2–5 ст. 22 Закона № 44-ФЗ и Методическим рекомендациям
        Минэкономразвития России от 02.10.2013 № 567. Рекомендуется не менее{" "}
        {MIN_RECOMMENDED_SOURCES} сопоставимых ценовых источников и проверка
        однородности выборки (коэффициент вариации V ≤{" "}
        {MAX_RECOMMENDED_CV_PERCENT}%).
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

        <div className={block("field")}>
          <label className={block("label")} htmlFor="nmck-okpd2">
            Код ОКПД2
          </label>
          <input
            id="nmck-okpd2"
            className={block("input")}
            disabled={disabled}
            value={okpd2Code}
            onChange={(e) => setOkpd2Code(e.target.value)}
            placeholder="Например: 32.50.13.190"
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
            {result.evaluatedOffers.map((item) => {
              const isMaxOutlier =
                !result.isHomogeneous &&
                result.maxDeviationOfferIndex === item.index;
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
                        updateOffer(item.index, { included: e.target.checked })
                      }
                    />
                  </td>
                  <td>{item.index + 1}</td>
                  <td>
                    <div className={block("source-stack")}>
                      <select
                        className={block("select")}
                        disabled={disabled}
                        value={item.offer.sourceType ?? "commercial_offer"}
                        onChange={(e) =>
                          updateOffer(item.index, {
                            sourceType: e.target.value as MarketPriceSourceType,
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
                          updateOffer(item.index, { offerDate: e.target.value })
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
                        updateOffer(item.index, { unitPrice: e.target.value })
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
                    {item.isValidPrice && result.activeCount >= 2 && (
                      <span
                        className={block(
                          "dev",
                          Math.abs(item.deviationPercent) > 25 ? ["high"] : [],
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
                  — Подтянуть из реестра контрактов ({availableContracts.length}) —
                </option>
                {availableContracts.map((c) => {
                  const key = String(c.id ?? c.contractNumber);
                  return (
                    <option key={key} value={key}>
                      № {c.contractNumber} · {c.supplierName} ({formatNmckMoney(Number(c.contractPrice))} ₽)
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
                <Database size={14} aria-hidden="true" /> Добавить из реестра
              </button>
            </>
          )}
        </div>
      </div>

      {/* Сводные показатели расчёта */}
      <div className={block("metrics")}>
        <div className={block("metric")}>
          <span className={block("metric-label")}>Учтено источников</span>
          <span className={block("metric-value")}>
            {result.activeCount} из {offers.length}
          </span>
          <span className={block("metric-sub")}>
            Норма МЭР № 567: ≥ {MIN_RECOMMENDED_SOURCES}
          </span>
        </div>

        <div className={block("metric")}>
          <span className={block("metric-label")}>Средняя приведённая ед.</span>
          <span className={block("metric-value")}>
            {formatNmckMoney(result.meanUnitPrice)} ₽
          </span>
          <span className={block("metric-sub")}>
            Мин: {formatNmckMoney(result.minUnitPrice)} ₽ · Макс:{" "}
            {formatNmckMoney(result.maxUnitPrice)} ₽
          </span>
        </div>

        <div
          className={block("metric", [
            result.activeCount >= 2
              ? result.isHomogeneous
                ? "ok"
                : "warn"
              : "default",
          ])}
        >
          <span className={block("metric-label")}>
            Коэффициент вариации (V)
          </span>
          <span className={block("metric-value")}>
            {result.cvPercent.toFixed(2)}%
          </span>
          <span className={block("metric-sub")}>
            {result.activeCount < 2
              ? `СКО: — (нужно ≥ 2)`
              : result.isHomogeneous
                ? `Однородна (≤ ${MAX_RECOMMENDED_CV_PERCENT}%), СКО: ${formatNmckMoney(result.stdDev)} ₽`
                : `Неоднородна (> ${MAX_RECOMMENDED_CV_PERCENT}%), СКО: ${formatNmckMoney(result.stdDev)} ₽`}
          </span>
        </div>

        <div className={block("metric", ["primary"])}>
          <span className={block("metric-label")}>
            Итоговая НМЦК (× {result.quantity} {unit || "ед."})
          </span>
          <span className={block("metric-value")}>
            {formatNmckMoney(result.nmckTotal)} ₽
          </span>
          <span className={block("metric-sub")}>
            {selectedBasis === "min"
              ? `По мин. цене (средняя: ${formatNmckMoney(result.nmckMeanTotal)} ₽)`
              : `По средней цене (мин.: ${formatNmckMoney(result.nmckMinTotal)} ₽)`}
          </span>
        </div>
      </div>

      {/* Предупреждения и контроли */}
      {result.activeCount > 0 && !result.hasEnoughSources && (
        <div className={block("alert", ["warning"])} role="status">
          <span>
            <AlertTriangle size={14} aria-hidden="true" /> Учтено{" "}
            {result.activeCount} ценовых источника(ов). По п. 3.19 Методических
            рекомендаций МЭР № 567 рекомендуется использовать не менее 3
            источников ценовой информации.
          </span>
        </div>
      )}

      {!result.isHomogeneous && result.activeCount >= 2 && (
        <div className={block("alert", ["warning"])} role="alert">
          <span>
            <AlertTriangle size={14} aria-hidden="true" /> Коэффициент вариации
            составляет <strong>{result.cvPercent.toFixed(2)}%</strong> (выше
            порога 33%). По п. 3.20.2 Приказа МЭР № 567 выборка неоднородна —
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

      {result.outdatedCount > 0 && (
        <div className={block("alert", ["warning"])} role="status">
          <span>
            <AlertTriangle size={14} aria-hidden="true" /> Обнаружены ценовые
            источники старше 6 месяцев ({result.outdatedCount} шт.). Согласно п.
            3.16 МЭР № 567 рекомендуется применить индекс инфляции (ИПЦ) или
            актуализировать КП.
          </span>
        </div>
      )}

      {normLimitExceeded && matchedOkpd2?.normLimit !== undefined && (
        <div className={block("alert", ["danger"])} role="alert">
          <span>
            Превышена предельная цена единицы по обязательному нормированию (ПП
            РФ № 926): рассчитано{" "}
            {formatNmckMoney(
              selectedBasis === "min"
                ? result.minUnitPrice
                : result.meanUnitPrice,
            )}{" "}
            ₽ при нормативе {formatNmckMoney(matchedOkpd2.normLimit)} ₽!
          </span>
        </div>
      )}

      {planLimitExceeded && planAmountLimit !== null && (
        <div className={block("alert", ["warning"])} role="status">
          <span>
            Рассчитанная НМЦК ({formatNmckMoney(result.nmckTotal)} ₽) превышает
            текущий объём финансового обеспечения позиции ПГ (
            {formatNmckMoney(planAmountLimit)} ₽). При сохранении в позицию
            можно автоматически скорректировать сумму финансового обеспечения.
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
          placeholder="Например: условия поставки, срок гарантии, НДС, источники запросов в ЕИС / коммерческие предложения…"
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
              Обновить объём финансового обеспечения позиции ПГ (amountTotal и
              текущий год)
            </span>
          </label>
        )}

        <div className={block("footer-buttons")}>
          <button
            type="button"
            className={block("btn")}
            disabled={isExporting || result.activeCount === 0}
            onClick={handleDownloadDocx}
          >
            <FileDown size={14} aria-hidden="true" />{" "}
            {isExporting ? "Формирование…" : "Выгрузить обоснование (.docx)"}
          </button>

          {onSaveToPosition && (
            <button
              type="button"
              className={block("btn", ["primary"])}
              disabled={disabled || isSaving || result.nmckTotal <= 0}
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

      {result.activeCount > 0 && result.isHomogeneous && result.hasEnoughSources && (
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
    </div>
  );
}
