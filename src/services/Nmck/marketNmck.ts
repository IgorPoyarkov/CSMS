import {
  COST_ITEM_CATEGORY_LABELS,
  MARKET_PRICE_SOURCE_LABELS,
  type CostItemCategory,
  type MarketPriceSourceType,
  type NmckCalculationRecord,
  type NmckCostItem,
  type NmckMarketOffer,
} from "./nmck.schema";
import type { Okpd2Ref } from "../Okpd2Ref/okpd2Ref.schema";

/**
 * Чистый модуль расчёта и документирования НМЦК (ст. 22 Закона № 44-ФЗ,
 * Приказ Минэкономразвития России от 02.10.2013 № 567):
 * 1) метод сопоставимых рыночных цен (анализ рынка, ч. 2–5 ст. 22);
 * 2) нормативный метод (ч. 7 ст. 22, ст. 19 44-ФЗ, ПП РФ № 926 и № 1047)
 *    с автоматической увязкой с нормируемыми позициями ОКПД2;
 * 3) тарифный метод (ч. 8 ст. 22 44-ФЗ, разд. V Приказа МЭР № 567);
 * 4) затратный метод / метод сложения затрат (ч. 10–11 ст. 22 44-ФЗ, разд. VI № 567).
 */

export const MAX_RECOMMENDED_CV_PERCENT = 33;
export const MIN_RECOMMENDED_SOURCES = 3;
export const MAX_OFFER_AGE_DAYS = 180; // ~6 месяцев (п. 3.16 № 567)
export const HIGH_PROFIT_PERCENT_THRESHOLD = 30;

export const DEFAULT_NORMATIVE_ACT =
  "Ст. 19, ч. 7 ст. 22 Закона № 44-ФЗ; ПП РФ от 02.09.2015 № 926; ПП РФ от 13.10.2014 № 1047";

export const DEFAULT_TARIFF_ACT =
  "Ч. 8 ст. 22 Закона № 44-ФЗ, разд. V Методических рекомендаций (Приказ МЭР России от 02.10.2013 № 567)";

export const DEFAULT_COST_PROFIT_BASIS =
  "Ч. 10–11 ст. 22 Закона № 44-ФЗ, разд. VI Методических рекомендаций № 567 (обычная прибыль для данной сферы деятельности)";

export interface MarketNmckInput {
  quantity: number | string;
  calculationDate: string;
  applyAutoInflation?: boolean;
  annualInflationPercent?: number | string;
  selectedBasis?: "mean" | "min";
  offers: NmckMarketOffer[];
}

export interface EvaluatedOffer {
  offer: NmckMarketOffer;
  index: number;
  baseUnitPrice: number;
  effectiveInflationCoeff: number;
  effectiveCommercialCoeff: number;
  adjustedUnitPrice: number;
  isIncluded: boolean;
  isValidPrice: boolean;
  isOutdated: boolean;
  ageDays: number | null;
  deviationPercent: number;
}

export interface MarketNmckResult {
  quantity: number;
  selectedBasis: "mean" | "min";
  evaluatedOffers: EvaluatedOffer[];
  activeOffers: EvaluatedOffer[];
  activeCount: number;
  meanUnitPrice: number;
  minUnitPrice: number;
  maxUnitPrice: number;
  stdDev: number;
  cvPercent: number;
  isHomogeneous: boolean;
  hasEnoughSources: boolean;
  outdatedCount: number;
  maxDeviationOfferIndex: number | null;
  nmckMeanTotal: number;
  nmckMinTotal: number;
  nmckTotal: number;
}

export interface NormativeNmckInput {
  quantity: number | string;
  unitPrice: number | string;
  okpd2Ref?: Okpd2Ref;
}

export interface NormativeNmckResult {
  quantity: number;
  unitPrice: number;
  isValidUnitPrice: boolean;
  isNormedOkpd2: boolean;
  normLimitUnitPrice: number | null;
  normLimitTotal: number | null;
  exceedsNormLimit: boolean;
  excessUnit: number;
  excessTotal: number;
  nmckTotal: number;
}

export interface TariffNmckInput {
  quantity: number | string;
  unitPrice: number | string;
  validTo?: string;
  calculationDate?: string;
}

export interface TariffNmckResult {
  quantity: number;
  unitPrice: number;
  isValidUnitPrice: boolean;
  isExpired: boolean;
  nmckTotal: number;
}

export interface CostNmckInput {
  quantity: number | string;
  costInputScope?: "total" | "unit";
  items: NmckCostItem[];
  profitCoeff: number | string;
}

export interface EvaluatedCostItem {
  item: NmckCostItem;
  index: number;
  numericAmount: number;
  isValidAmount: boolean;
  sharePercent: number;
}

export interface CostNmckResult {
  quantity: number;
  costInputScope: "total" | "unit";
  evaluatedItems: EvaluatedCostItem[];
  validItemsCount: number;
  rawItemsSum: number;
  costSubtotal: number;
  profitCoeff: number;
  isValidProfitCoeff: boolean;
  profitPercent: number;
  profitAmount: number;
  highProfitWarning: boolean;
  unitPrice: number;
  nmckTotal: number;
}

export const roundMoney = (val: number): number =>
  Math.round((val + Number.EPSILON) * 100) / 100;

export const roundCoeff = (val: number): number =>
  Math.round((val + Number.EPSILON) * 10000) / 10000;

export const formatNmckMoney = (val: number): string =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(val) ? val : 0);

/** Парсинг положительного числа из пользовательского ввода */
export function parseNumericInput(
  raw: string | number | undefined | null,
): number {
  if (raw === undefined || raw === null) return Number.NaN;
  const cleaned = String(raw).replace(/\s+/g, "").replace(",", ".");
  if (!cleaned) return Number.NaN;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/** Разница в календарных днях между YYYY-MM-DD датами (to - from) */
export function diffCalendarDays(
  fromIso: string | undefined,
  toIso: string | undefined,
): number | null {
  if (!fromIso || !toIso) return null;
  const fromMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromIso.trim());
  const toMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toIso.trim());
  if (!fromMatch || !toMatch) return null;

  const fromUtc = Date.UTC(
    Number(fromMatch[1]),
    Number(fromMatch[2]) - 1,
    Number(fromMatch[3]),
  );
  const toUtc = Date.UTC(
    Number(toMatch[1]),
    Number(toMatch[2]) - 1,
    Number(toMatch[3]),
  );
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

/**
 * Коэффициент индексации на уровень инфляции (ИПЦ) от даты ценовой
 * информации к дате расчёта (п. 3.16 Приказа МЭР № 567).
 */
export function computeDateInflationCoeff(
  offerDate: string | undefined,
  calculationDate: string | undefined,
  annualInflationPercent: number | string | undefined,
): number {
  const days = diffCalendarDays(offerDate, calculationDate);
  const annualPct = parseNumericInput(annualInflationPercent);
  if (days === null || days <= 0 || !Number.isFinite(annualPct) || annualPct <= 0) {
    return 1;
  }
  const factor = Math.pow(1 + annualPct / 100, days / 365);
  return roundCoeff(factor);
}

export function createEmptyMarketOffer(
  index: number,
  defaultDate = "",
  sourceType: MarketPriceSourceType = "commercial_offer",
): NmckMarketOffer {
  const prefix =
    sourceType === "eis_contract"
      ? "Контракт ЕИС №"
      : sourceType === "public_price"
        ? "Прайс-лист №"
        : sourceType === "tariff"
          ? "Тариф / ИЦ №"
          : `Поставщик ${index + 1} (КП №${index + 1})`;

  return {
    id: `offer-${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
    sourceType,
    supplierName: prefix,
    sourceDocument: "",
    offerDate: defaultDate,
    unitPrice: "",
    vatMode: "with_vat",
    inflationCoeff: "1",
    commercialCoeff: "1",
    adjustmentComment: "",
    included: true,
  };
}

export function createEmptyCostItem(
  index: number,
  category: CostItemCategory = "materials",
  name = "",
  basis = "",
): NmckCostItem {
  return {
    id: `cost-${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    name: name || `Статья затрат № ${index + 1}`,
    basis,
    amount: "",
  };
}

/**
 * Расчёт НМЦК методом сопоставимых рыночных цен (анализ рынка).
 */
export function calculateMarketNmck(input: MarketNmckInput): MarketNmckResult {
  const parsedQty = parseNumericInput(input.quantity);
  const quantity = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;
  const selectedBasis = input.selectedBasis ?? "mean";
  const applyAutoInflation = Boolean(input.applyAutoInflation);

  const preliminary = input.offers.map((offer, index) => {
    const baseUnitPrice = parseNumericInput(offer.unitPrice);
    const isValidPrice = Number.isFinite(baseUnitPrice) && baseUnitPrice > 0;
    const isIncluded = offer.included !== false;

    const manualInfl = parseNumericInput(offer.inflationCoeff);
    const effectiveInflationCoeff = applyAutoInflation
      ? computeDateInflationCoeff(
          offer.offerDate,
          input.calculationDate,
          input.annualInflationPercent,
        )
      : Number.isFinite(manualInfl) && manualInfl > 0
        ? manualInfl
        : 1;

    const manualComm = parseNumericInput(offer.commercialCoeff);
    const effectiveCommercialCoeff =
      Number.isFinite(manualComm) && manualComm > 0 ? manualComm : 1;

    const adjustedUnitPrice = isValidPrice
      ? roundMoney(
          baseUnitPrice * effectiveInflationCoeff * effectiveCommercialCoeff,
        )
      : 0;

    const ageDays = diffCalendarDays(offer.offerDate, input.calculationDate);
    const isOutdated = ageDays !== null && ageDays > MAX_OFFER_AGE_DAYS;

    return {
      offer,
      index,
      baseUnitPrice: isValidPrice ? baseUnitPrice : 0,
      effectiveInflationCoeff,
      effectiveCommercialCoeff,
      adjustedUnitPrice,
      isIncluded,
      isValidPrice,
      isOutdated,
      ageDays,
      deviationPercent: 0,
    };
  });

  const active = preliminary.filter((item) => item.isIncluded && item.isValidPrice);
  const activeCount = active.length;

  if (activeCount === 0) {
    return {
      quantity,
      selectedBasis,
      evaluatedOffers: preliminary,
      activeOffers: [],
      activeCount: 0,
      meanUnitPrice: 0,
      minUnitPrice: 0,
      maxUnitPrice: 0,
      stdDev: 0,
      cvPercent: 0,
      isHomogeneous: true,
      hasEnoughSources: false,
      outdatedCount: preliminary.filter((x) => x.isIncluded && x.isOutdated).length,
      maxDeviationOfferIndex: null,
      nmckMeanTotal: 0,
      nmckMinTotal: 0,
      nmckTotal: 0,
    };
  }

  const prices = active.map((x) => x.adjustedUnitPrice);
  const sum = prices.reduce((acc, p) => acc + p, 0);
  const meanUnitPrice = sum / activeCount;
  const minUnitPrice = Math.min(...prices);
  const maxUnitPrice = Math.max(...prices);

  const variance =
    activeCount > 1
      ? prices.reduce((acc, p) => acc + (p - meanUnitPrice) ** 2, 0) /
        (activeCount - 1)
      : 0;
  const stdDev = Math.sqrt(variance);
  const cvPercent = meanUnitPrice > 0 ? (stdDev / meanUnitPrice) * 100 : 0;
  const isHomogeneous = cvPercent <= MAX_RECOMMENDED_CV_PERCENT;

  let maxAbsDev = -1;
  let maxDeviationOfferIndex: number | null = null;

  const evaluatedOffers = preliminary.map((item) => {
    if (!item.isValidPrice || meanUnitPrice <= 0) return item;
    const deviationPercent =
      ((item.adjustedUnitPrice - meanUnitPrice) / meanUnitPrice) * 100;
    if (item.isIncluded && Math.abs(deviationPercent) > maxAbsDev) {
      maxAbsDev = Math.abs(deviationPercent);
      maxDeviationOfferIndex = item.index;
    }
    return {
      ...item,
      deviationPercent,
    };
  });

  const nmckMeanTotal = roundMoney(meanUnitPrice * quantity);
  const nmckMinTotal = roundMoney(minUnitPrice * quantity);
  const nmckTotal = selectedBasis === "min" ? nmckMinTotal : nmckMeanTotal;

  return {
    quantity,
    selectedBasis,
    evaluatedOffers,
    activeOffers: evaluatedOffers.filter((x) => x.isIncluded && x.isValidPrice),
    activeCount,
    meanUnitPrice: roundMoney(meanUnitPrice),
    minUnitPrice: roundMoney(minUnitPrice),
    maxUnitPrice: roundMoney(maxUnitPrice),
    stdDev,
    cvPercent,
    isHomogeneous,
    hasEnoughSources: activeCount >= MIN_RECOMMENDED_SOURCES,
    outdatedCount: evaluatedOffers.filter((x) => x.isIncluded && x.isOutdated)
      .length,
    maxDeviationOfferIndex: activeCount >= 2 ? maxDeviationOfferIndex : null,
    nmckMeanTotal,
    nmckMinTotal,
    nmckTotal,
  };
}

/**
 * Расчёт НМЦК нормативным методом (ч. 7 ст. 22, ст. 19 Закона № 44-ФЗ,
 * разд. IV Приказа МЭР № 567): НМЦК = v × Ц_пред.
 */
export function calculateNormativeNmck(
  input: NormativeNmckInput,
): NormativeNmckResult {
  const parsedQty = parseNumericInput(input.quantity);
  const quantity = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;

  const normLimitUnitPrice =
    input.okpd2Ref?.isNormed && input.okpd2Ref.normLimit !== undefined
      ? roundMoney(input.okpd2Ref.normLimit)
      : null;

  const parsedPrice = parseNumericInput(input.unitPrice);
  const isValidUnitPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const unitPrice = isValidUnitPrice ? roundMoney(parsedPrice) : 0;

  const normLimitTotal =
    normLimitUnitPrice !== null
      ? roundMoney(normLimitUnitPrice * quantity)
      : null;
  const nmckTotal = isValidUnitPrice ? roundMoney(unitPrice * quantity) : 0;

  const exceedsNormLimit =
    normLimitUnitPrice !== null &&
    isValidUnitPrice &&
    unitPrice > normLimitUnitPrice;

  const excessUnit =
    exceedsNormLimit && normLimitUnitPrice !== null
      ? roundMoney(unitPrice - normLimitUnitPrice)
      : 0;
  const excessTotal =
    exceedsNormLimit && normLimitTotal !== null
      ? roundMoney(nmckTotal - normLimitTotal)
      : 0;

  return {
    quantity,
    unitPrice,
    isValidUnitPrice,
    isNormedOkpd2: Boolean(input.okpd2Ref?.isNormed),
    normLimitUnitPrice,
    normLimitTotal,
    exceedsNormLimit,
    excessUnit,
    excessTotal,
    nmckTotal,
  };
}

/**
 * Расчёт НМЦК тарифным методом (ч. 8 ст. 22 Закона № 44-ФЗ,
 * разд. V Приказа МЭР № 567): НМЦК = v × Ц_тариф.
 */
export function calculateTariffNmck(input: TariffNmckInput): TariffNmckResult {
  const parsedQty = parseNumericInput(input.quantity);
  const quantity = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;

  const parsedPrice = parseNumericInput(input.unitPrice);
  const isValidUnitPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
  const unitPrice = isValidUnitPrice ? roundMoney(parsedPrice) : 0;

  const daysUntilExpiry = diffCalendarDays(
    input.calculationDate,
    input.validTo,
  );
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  const nmckTotal = isValidUnitPrice ? roundMoney(unitPrice * quantity) : 0;

  return {
    quantity,
    unitPrice,
    isValidUnitPrice,
    isExpired,
    nmckTotal,
  };
}

/**
 * Расчёт НМЦК затратным методом / методом сложения затрат
 * (ч. 10–11 ст. 22 Закона № 44-ФЗ, разд. VI Приказа МЭР № 567):
 * НМЦК = (Σ Статьи затрат) × k_приб.
 */
export function calculateCostNmck(input: CostNmckInput): CostNmckResult {
  const parsedQty = parseNumericInput(input.quantity);
  const quantity = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1;
  const costInputScope = input.costInputScope === "unit" ? "unit" : "total";

  const preliminary = input.items.map((item, index) => {
    const parsedAmount = parseNumericInput(item.amount);
    const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
    return {
      item,
      index,
      numericAmount: isValidAmount ? roundMoney(parsedAmount) : 0,
      isValidAmount,
      sharePercent: 0,
    };
  });

  const validItems = preliminary.filter((row) => row.isValidAmount);
  const rawItemsSum = roundMoney(
    validItems.reduce((acc, row) => acc + row.numericAmount, 0),
  );

  const evaluatedItems = preliminary.map((row) => ({
    ...row,
    sharePercent:
      rawItemsSum > 0 && row.isValidAmount
        ? roundMoney((row.numericAmount / rawItemsSum) * 100)
        : 0,
  }));

  const costSubtotal =
    costInputScope === "unit"
      ? roundMoney(rawItemsSum * quantity)
      : rawItemsSum;

  const parsedCoeff = parseNumericInput(input.profitCoeff);
  const isValidProfitCoeff = Number.isFinite(parsedCoeff) && parsedCoeff >= 1;
  const profitCoeff = isValidProfitCoeff ? roundCoeff(parsedCoeff) : 1;
  const profitPercent = roundMoney((profitCoeff - 1) * 100);

  const nmckTotal =
    costSubtotal > 0 && isValidProfitCoeff
      ? roundMoney(costSubtotal * profitCoeff)
      : 0;
  const profitAmount =
    nmckTotal > 0 ? roundMoney(nmckTotal - costSubtotal) : 0;
  const unitPrice = nmckTotal > 0 ? roundMoney(nmckTotal / quantity) : 0;
  const highProfitWarning =
    isValidProfitCoeff && profitPercent > HIGH_PROFIT_PERCENT_THRESHOLD;

  return {
    quantity,
    costInputScope,
    evaluatedItems,
    validItemsCount: validItems.length,
    rawItemsSum,
    costSubtotal,
    profitCoeff,
    isValidProfitCoeff,
    profitPercent,
    profitAmount,
    highProfitWarning,
    unitPrice,
    nmckTotal,
  };
}

/** Снимок расчёта (анализ рынка) для сохранения в СЗ */
export function buildNmckCalculationRecord(params: {
  subject: string;
  okpd2Code?: string;
  okpd2Name?: string;
  quantity: number | string;
  unit: string;
  calculationDate: string;
  calculatorName?: string;
  applyAutoInflation: boolean;
  annualInflationPercent: string;
  selectedBasis: "mean" | "min";
  offers: NmckMarketOffer[];
  notes?: string;
  result: MarketNmckResult;
  normLimitUnitPrice?: number | null;
}): NmckCalculationRecord {
  const effectiveUnitPrice =
    params.selectedBasis === "min"
      ? params.result.minUnitPrice
      : params.result.meanUnitPrice;
  const exceedsNormLimit =
    params.normLimitUnitPrice !== undefined &&
    params.normLimitUnitPrice !== null &&
    params.result.activeCount > 0 &&
    effectiveUnitPrice > params.normLimitUnitPrice;

  return {
    method: "market_analysis",
    calculatedAt: new Date().toISOString().slice(0, 10),
    calculationDate: params.calculationDate,
    calculatorName: params.calculatorName?.trim() || undefined,
    subject: params.subject.trim() || "Объект закупки",
    okpd2Code: params.okpd2Code?.trim() || undefined,
    okpd2Name: params.okpd2Name?.trim() || undefined,
    quantity: String(params.result.quantity),
    unit: params.unit.trim() || "ед.",
    applyAutoInflation: params.applyAutoInflation,
    annualInflationPercent: params.annualInflationPercent,
    selectedBasis: params.selectedBasis,
    offers: params.offers,
    activeCount: params.result.activeCount,
    meanUnitPrice: params.result.meanUnitPrice,
    minUnitPrice: params.result.minUnitPrice,
    maxUnitPrice: params.result.maxUnitPrice,
    stdDev: roundMoney(params.result.stdDev),
    cvPercent: roundMoney(params.result.cvPercent),
    isHomogeneous: params.result.isHomogeneous,
    nmckTotal: params.result.nmckTotal,
    nmckMinTotal: params.result.nmckMinTotal,
    normLimitUnitPrice: params.normLimitUnitPrice ?? undefined,
    exceedsNormLimit,
    notes: params.notes?.trim() || undefined,
  };
}

/** Снимок расчёта (нормативный метод) для сохранения в СЗ */
export function buildNormativeCalculationRecord(params: {
  subject: string;
  okpd2Code?: string;
  okpd2Name?: string;
  quantity: number | string;
  unit: string;
  calculationDate: string;
  calculatorName?: string;
  normativeAct: string;
  normativeDocument?: string;
  notes?: string;
  result: NormativeNmckResult;
}): NmckCalculationRecord {
  return {
    method: "normative",
    calculatedAt: new Date().toISOString().slice(0, 10),
    calculationDate: params.calculationDate,
    calculatorName: params.calculatorName?.trim() || undefined,
    subject: params.subject.trim() || "Объект закупки",
    okpd2Code: params.okpd2Code?.trim() || undefined,
    okpd2Name: params.okpd2Name?.trim() || undefined,
    quantity: String(params.result.quantity),
    unit: params.unit.trim() || "ед.",
    offers: [],
    activeCount: 0,
    meanUnitPrice: params.result.unitPrice,
    minUnitPrice: params.result.unitPrice,
    maxUnitPrice: params.result.unitPrice,
    stdDev: 0,
    cvPercent: 0,
    isHomogeneous: true,
    nmckMinTotal: params.result.nmckTotal,
    normativeAct: params.normativeAct.trim() || DEFAULT_NORMATIVE_ACT,
    normativeDocument: params.normativeDocument?.trim() || undefined,
    normLimitUnitPrice: params.result.normLimitUnitPrice ?? undefined,
    normativeUnitPrice: params.result.unitPrice,
    normLimitTotal: params.result.normLimitTotal ?? undefined,
    exceedsNormLimit: params.result.exceedsNormLimit,
    nmckTotal: params.result.nmckTotal,
    notes: params.notes?.trim() || undefined,
  };
}

/** Снимок расчёта (тарифный метод) для сохранения в СЗ */
export function buildTariffCalculationRecord(params: {
  subject: string;
  okpd2Code?: string;
  okpd2Name?: string;
  quantity: number | string;
  unit: string;
  calculationDate: string;
  calculatorName?: string;
  tariffId?: string;
  tariffName?: string;
  tariffSourceName: string;
  tariffDocument: string;
  tariffValidFrom?: string;
  tariffValidTo?: string;
  notes?: string;
  result: TariffNmckResult;
}): NmckCalculationRecord {
  return {
    method: "tariff",
    calculatedAt: new Date().toISOString().slice(0, 10),
    calculationDate: params.calculationDate,
    calculatorName: params.calculatorName?.trim() || undefined,
    subject: params.subject.trim() || "Объект закупки",
    okpd2Code: params.okpd2Code?.trim() || undefined,
    okpd2Name: params.okpd2Name?.trim() || undefined,
    quantity: String(params.result.quantity),
    unit: params.unit.trim() || "ед.",
    offers: [],
    activeCount: 0,
    meanUnitPrice: params.result.unitPrice,
    minUnitPrice: params.result.unitPrice,
    maxUnitPrice: params.result.unitPrice,
    stdDev: 0,
    cvPercent: 0,
    isHomogeneous: true,
    nmckMinTotal: params.result.nmckTotal,
    tariffId: params.tariffId?.trim() || undefined,
    tariffName: params.tariffName?.trim() || undefined,
    tariffSourceName: params.tariffSourceName.trim() || undefined,
    tariffDocument: params.tariffDocument.trim() || undefined,
    tariffValidFrom: params.tariffValidFrom?.trim() || undefined,
    tariffValidTo: params.tariffValidTo?.trim() || undefined,
    tariffUnitPrice: params.result.unitPrice,
    tariffExpired: params.result.isExpired,
    nmckTotal: params.result.nmckTotal,
    notes: params.notes?.trim() || undefined,
  };
}

/** Снимок расчёта (затратный метод) для сохранения в СЗ */
export function buildCostCalculationRecord(params: {
  subject: string;
  okpd2Code?: string;
  okpd2Name?: string;
  quantity: number | string;
  unit: string;
  calculationDate: string;
  calculatorName?: string;
  items: NmckCostItem[];
  costProfitBasis?: string;
  notes?: string;
  result: CostNmckResult;
}): NmckCalculationRecord {
  return {
    method: "cost",
    calculatedAt: new Date().toISOString().slice(0, 10),
    calculationDate: params.calculationDate,
    calculatorName: params.calculatorName?.trim() || undefined,
    subject: params.subject.trim() || "Объект закупки",
    okpd2Code: params.okpd2Code?.trim() || undefined,
    okpd2Name: params.okpd2Name?.trim() || undefined,
    quantity: String(params.result.quantity),
    unit: params.unit.trim() || "ед.",
    offers: [],
    activeCount: params.result.validItemsCount,
    meanUnitPrice: params.result.unitPrice,
    minUnitPrice: params.result.unitPrice,
    maxUnitPrice: params.result.unitPrice,
    stdDev: 0,
    cvPercent: 0,
    isHomogeneous: true,
    nmckMinTotal: params.result.nmckTotal,
    costItems: params.items,
    costInputScope: params.result.costInputScope,
    costSubtotal: params.result.costSubtotal,
    costProfitCoeff: params.result.profitCoeff,
    costProfitPercent: params.result.profitPercent,
    costProfitAmount: params.result.profitAmount,
    costProfitBasis:
      params.costProfitBasis?.trim() || DEFAULT_COST_PROFIT_BASIS,
    costUnitPrice: params.result.unitPrice,
    nmckTotal: params.result.nmckTotal,
    notes: params.notes?.trim() || undefined,
  };
}

/** Текстовое обоснование НМЦК (анализ рынка) */
export function buildMarketNmckBasisText(
  result: MarketNmckResult,
  unit: string,
): string {
  const details = result.activeOffers
    .map((item) => {
      const typeLabel =
        MARKET_PRICE_SOURCE_LABELS[
          item.offer.sourceType ?? "commercial_offer"
        ];
      const docPart = item.offer.sourceDocument
        ? `, № ${item.offer.sourceDocument}`
        : "";
      const datePart = item.offer.offerDate ? ` от ${item.offer.offerDate}` : "";
      const hasAdjustment =
        Math.abs(item.effectiveInflationCoeff - 1) > 1e-4 ||
        Math.abs(item.effectiveCommercialCoeff - 1) > 1e-4;
      const priceText = hasAdjustment
        ? `${formatNmckMoney(item.baseUnitPrice)} ₽ → привед. ${formatNmckMoney(item.adjustedUnitPrice)} ₽ (kинф=${item.effectiveInflationCoeff.toFixed(4)}, kком=${item.effectiveCommercialCoeff.toFixed(4)})`
        : `${formatNmckMoney(item.adjustedUnitPrice)} ₽`;
      return `${item.offer.supplierName || typeLabel}${docPart}${datePart}: ${priceText}`;
    })
    .join("; ");

  const basisLabel =
    result.selectedBasis === "min"
      ? `по минимальной цене выборки (${formatNmckMoney(result.minUnitPrice)} ₽/ед.)`
      : `по средней приведённой цене (${formatNmckMoney(result.meanUnitPrice)} ₽/ед.)`;

  return `Метод сопоставимых рыночных цен (анализ рынка) в соответствии со ст. 22 Закона № 44-ФЗ и Приказом МЭР России № 567. Учтено источников: ${result.activeCount} (${details || "без детализации"}). Расчёт ${basisLabel} × ${result.quantity} ${unit || "ед."}. СКО: ${formatNmckMoney(result.stdDev)} ₽, коэффициент вариации V: ${result.cvPercent.toFixed(2)}% (${result.isHomogeneous ? "выборка однородна <= 33%" : "превышает 33%"}). Итоговая НМЦК: ${formatNmckMoney(result.nmckTotal)} ₽.`;
}

/** Текстовое обоснование НМЦК (нормативный метод) */
export function buildNormativeNmckBasisText(params: {
  result: NormativeNmckResult;
  unit: string;
  okpd2Code?: string;
  normativeAct: string;
  normativeDocument?: string;
}): string {
  const okpdPart = params.okpd2Code
    ? ` по коду ОКПД2 ${params.okpd2Code}`
    : "";
  const limitPart =
    params.result.normLimitUnitPrice !== null
      ? ` Предельная цена единицы по справочнику нормирования: ${formatNmckMoney(params.result.normLimitUnitPrice)} ₽ (итого по лимиту: ${formatNmckMoney(params.result.normLimitTotal ?? 0)} ₽).`
      : "";
  const docPart = params.normativeDocument
    ? ` Документ / пункт перечня: ${params.normativeDocument}.`
    : "";
  return `Нормативный метод определения НМЦК (ст. 19, ч. 7 ст. 22 Закона № 44-ФЗ, разд. IV Приказа МЭР № 567)${okpdPart}. Правовое основание: ${params.normativeAct || DEFAULT_NORMATIVE_ACT}.${docPart}${limitPart} Расчёт: ${formatNmckMoney(params.result.unitPrice)} ₽/ед. × ${params.result.quantity} ${params.unit || "ед."} = ${formatNmckMoney(params.result.nmckTotal)} ₽.`;
}

/** Текстовое обоснование НМЦК (тарифный метод) */
export function buildTariffNmckBasisText(params: {
  result: TariffNmckResult;
  unit: string;
  okpd2Code?: string;
  tariffName?: string;
  tariffSourceName: string;
  tariffDocument: string;
  tariffValidFrom?: string;
  tariffValidTo?: string;
}): string {
  const okpdPart = params.okpd2Code
    ? ` по коду ОКПД2 ${params.okpd2Code}`
    : "";
  const namePart = params.tariffName ? ` (${params.tariffName})` : "";
  const sourcePart = params.tariffSourceName
    ? ` Официальный источник / орган регулирования: ${params.tariffSourceName}.`
    : "";
  const docPart = params.tariffDocument
    ? ` Реквизиты утверждающего акта: ${params.tariffDocument}.`
    : "";
  const validityPart =
    params.tariffValidFrom || params.tariffValidTo
      ? ` Период действия тарифа: с ${params.tariffValidFrom || "—"} по ${params.tariffValidTo || "—"}.`
      : "";
  return `Тарифный метод определения НМЦК (ч. 8 ст. 22 Закона № 44-ФЗ, разд. V Приказа МЭР № 567)${okpdPart}${namePart}.${sourcePart}${docPart}${validityPart} Расчёт: ${formatNmckMoney(params.result.unitPrice)} ₽/ед. × ${params.result.quantity} ${params.unit || "ед."} = ${formatNmckMoney(params.result.nmckTotal)} ₽.`;
}

/** Текстовое обоснование НМЦК (затратный метод) */
export function buildCostNmckBasisText(params: {
  result: CostNmckResult;
  unit: string;
  okpd2Code?: string;
  costProfitBasis?: string;
}): string {
  const okpdPart = params.okpd2Code
    ? ` (ОКПД2 ${params.okpd2Code})`
    : "";
  const itemsText = params.result.evaluatedItems
    .filter((row) => row.isValidAmount)
    .map(
      (row) =>
        `${row.item.name || "Статья затрат"}: ${formatNmckMoney(row.numericAmount)} ₽`,
    )
    .join("; ");
  const scopeNote =
    params.result.costInputScope === "unit"
      ? `Сумма затрат на 1 ед.: ${formatNmckMoney(params.result.rawItemsSum)} ₽; на объём ${params.result.quantity} ${params.unit || "ед."}: ${formatNmckMoney(params.result.costSubtotal)} ₽.`
      : `Сумма статей затрат по объёму контракта: ${formatNmckMoney(params.result.costSubtotal)} ₽.`;

  return `Затратный метод (метод сложения затрат) определения НМЦК (ч. 10–11 ст. 22 Закона № 44-ФЗ, разд. VI Приказа МЭР № 567)${okpdPart}. Учтено статей затрат: ${params.result.validItemsCount} (${itemsText || "без детализации"}). ${scopeNote} Коэффициент прибыли k=${params.result.profitCoeff.toFixed(2)} (норма прибыли ${params.result.profitPercent.toFixed(2)}%, прибыль ${formatNmckMoney(params.result.profitAmount)} ₽; основание: ${params.costProfitBasis?.trim() || DEFAULT_COST_PROFIT_BASIS}). Цена ед.: ${formatNmckMoney(params.result.unitPrice)} ₽. Итоговая НМЦК: ${formatNmckMoney(params.result.nmckTotal)} ₽.`;
}

/**
 * Пересчитывает поля финансового обеспечения позиции плана-графика при
 * обновлении суммы из НМЦК (гарантирует прохождение refine amountTotal === sumOf(parts)).
 */
export function buildPositionFinancePatch(
  position: {
    amountTotal?: string | number;
    amountCurrentYear?: string | number;
    amountPlanPeriodFirstYear?: string | number;
    amountPlanPeriodSecondYear?: string | number;
    amountSubsequentYears?: string | number;
  },
  newTotal: number,
) {
  const safeTotal = roundMoney(Math.max(0, newTotal));
  const cur = parseNumericInput(position.amountCurrentYear);
  const y1 = parseNumericInput(position.amountPlanPeriodFirstYear);
  const y2 = parseNumericInput(position.amountPlanPeriodSecondYear);
  const sub = parseNumericInput(position.amountSubsequentYears);

  const curVal = Number.isFinite(cur) && cur > 0 ? cur : 0;
  const y1Val = Number.isFinite(y1) && y1 > 0 ? y1 : 0;
  const y2Val = Number.isFinite(y2) && y2 > 0 ? y2 : 0;
  const subVal = Number.isFinite(sub) && sub > 0 ? sub : 0;
  const prevPartsSum = curVal + y1Val + y2Val + subVal;

  if (prevPartsSum <= 0 || (y1Val === 0 && y2Val === 0 && subVal === 0)) {
    return {
      amountTotal: safeTotal.toFixed(2),
      amountCurrentYear: safeTotal.toFixed(2),
      amountPlanPeriodFirstYear: "0",
      amountPlanPeriodSecondYear: "0",
      amountSubsequentYears: "0",
    };
  }

  const ratio = safeTotal / prevPartsSum;
  const nextY1 = roundMoney(y1Val * ratio);
  const nextY2 = roundMoney(y2Val * ratio);
  const nextSub = roundMoney(subVal * ratio);
  const nextCur = roundMoney(safeTotal - nextY1 - nextY2 - nextSub);

  return {
    amountTotal: safeTotal.toFixed(2),
    amountCurrentYear: nextCur.toFixed(2),
    amountPlanPeriodFirstYear: nextY1.toFixed(2),
    amountPlanPeriodSecondYear: nextY2.toFixed(2),
    amountSubsequentYears: nextSub.toFixed(2),
  };
}

/**
 * Экспорт обоснования НМЦК в Microsoft Word (.docx) для обоих методов
 * (анализ рынка и нормативный метод по Приказу МЭР № 567).
 */
export async function exportNmckCalculationToDocx(params: {
  title?: string;
  organizationName?: string;
  ikz?: string;
  record: NmckCalculationRecord;
  marketResult?: MarketNmckResult;
  fileName?: string;
}): Promise<string> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = await import("docx");

  const { record } = params;
  const border = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "B4C2BA",
  };
  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };

  const makeCell = (text: string, bold = false) =>
    new TableCell({
      margins: { top: 70, bottom: 70, left: 80, right: 80 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold,
              size: 18,
              font: "Times New Roman",
            }),
          ],
        }),
      ],
    });

  const marketResult =
    params.marketResult ??
    calculateMarketNmck({
      quantity: record.quantity,
      calculationDate: record.calculationDate,
      applyAutoInflation: record.applyAutoInflation,
      annualInflationPercent: record.annualInflationPercent,
      selectedBasis: record.selectedBasis,
      offers: record.offers,
    });

  const buildBodyBlocks = () => {
    if (record.method === "normative") {
      return [
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: "Метод определения НМЦК: нормативный метод (ст. 19, ч. 7 ст. 22 Федерального закона № 44-ФЗ, разд. IV Приказа МЭР России № 567).",
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders,
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                "Код ОКПД2",
                "НПА / основание нормирования",
                "Предельная цена по нормативу, ₽/ед.",
                "Принятая цена ед., ₽",
                "Количество",
                "Итого НМЦК, ₽",
              ].map((h) => makeCell(h, true)),
            }),
            new TableRow({
              children: [
                record.okpd2Code || "—",
                `${record.normativeAct || DEFAULT_NORMATIVE_ACT}${record.normativeDocument ? `\n(${record.normativeDocument})` : ""}`,
                record.normLimitUnitPrice !== undefined
                  ? formatNmckMoney(record.normLimitUnitPrice)
                  : "Не установлена в ОКПД2",
                formatNmckMoney(
                  record.normativeUnitPrice ?? record.meanUnitPrice,
                ),
                `${record.quantity} ${record.unit}`,
                formatNmckMoney(record.nmckTotal),
              ].map((v) => makeCell(v)),
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: record.exceedsNormLimit
                ? `ВНИМАНИЕ: принятая цена единицы превышает нормативный предел (${formatNmckMoney(record.normLimitUnitPrice ?? 0)} ₽). Требуется специальное обоснование.`
                : "Предельная цена нормирования соблюдена.",
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
      ];
    }

    if (record.method === "tariff") {
      const validityStr =
        record.tariffValidFrom || record.tariffValidTo
          ? `${record.tariffValidFrom || "—"} — ${record.tariffValidTo || "—"}`
          : "Не указан";
      return [
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `Метод определения НМЦК: тарифный метод (${DEFAULT_TARIFF_ACT}).`,
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders,
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                "Регулируемый товар / услуга",
                "Официальный источник",
                "Постановление / Приказ об утверждении тарифа",
                "Срок действия",
                "Тариф ед., ₽",
                "Объём",
                "Итого НМЦК, ₽",
              ].map((h) => makeCell(h, true)),
            }),
            new TableRow({
              children: [
                record.tariffName || record.subject || "—",
                record.tariffSourceName || "—",
                record.tariffDocument || "—",
                validityStr,
                formatNmckMoney(record.tariffUnitPrice ?? record.meanUnitPrice),
                `${record.quantity} ${record.unit}`,
                formatNmckMoney(record.nmckTotal),
              ].map((v) => makeCell(v)),
            }),
          ],
        }),
        ...(record.tariffExpired
          ? [
              new Paragraph({
                spacing: { before: 120, after: 80 },
                children: [
                  new TextRun({
                    text: `ВНИМАНИЕ: срок действия выбранного тарифа (${record.tariffValidTo || "—"}) истёк на дату расчёта (${record.calculationDate || "—"}).`,
                    size: 20,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ]
          : []),
      ];
    }

    if (record.method === "cost") {
      const costEval = calculateCostNmck({
        quantity: record.quantity,
        costInputScope: record.costInputScope,
        items: record.costItems ?? [],
        profitCoeff: record.costProfitCoeff ?? 1,
      });
      return [
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: "Метод определения НМЦК: затратный метод / метод сложения затрат (ч. 10–11 ст. 22 Закона № 44-ФЗ, разд. VI Приказа МЭР России № 567).",
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders,
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                "№",
                "Категория",
                "Статья затрат",
                "Расчёт / обоснование",
                "Стоимость, ₽",
                "Доля, %",
              ].map((h) => makeCell(h, true)),
            }),
            ...costEval.evaluatedItems.map((row, idx) =>
              new TableRow({
                children: [
                  String(idx + 1),
                  COST_ITEM_CATEGORY_LABELS[row.item.category ?? "other"],
                  row.item.name || "—",
                  row.item.basis || "—",
                  row.isValidAmount
                    ? formatNmckMoney(row.numericAmount)
                    : "—",
                  row.isValidAmount ? `${row.sharePercent.toFixed(1)}%` : "—",
                ].map((v) => makeCell(v)),
              }),
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text: `Сумма статей затрат (${costEval.costInputScope === "unit" ? `на 1 ед.: ${formatNmckMoney(costEval.rawItemsSum)} ₽ × ${record.quantity} ${record.unit} = ` : ""}${formatNmckMoney(record.costSubtotal ?? costEval.costSubtotal)} ₽) · Коэффициент прибыли k = ${(record.costProfitCoeff ?? costEval.profitCoeff).toFixed(2)} (рентабельность ${(record.costProfitPercent ?? costEval.profitPercent).toFixed(2)}%, прибыль ${formatNmckMoney(record.costProfitAmount ?? costEval.profitAmount)} ₽).`,
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `Расчётная цена единицы с учётом прибыли: ${formatNmckMoney(record.costUnitPrice ?? costEval.unitPrice)} ₽ · Обоснование обычной прибыли: ${record.costProfitBasis || DEFAULT_COST_PROFIT_BASIS}`,
              size: 20,
              font: "Times New Roman",
            }),
          ],
        }),
      ];
    }

    return [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: "Метод определения НМЦК: метод сопоставимых рыночных цен (анализ рынка), ч. 2–5 ст. 22 Федерального закона № 44-ФЗ, Приказ Минэкономразвития России от 02.10.2013 № 567.",
            size: 20,
            font: "Times New Roman",
          }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders,
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              "№",
              "Источник ценовой информации / Поставщик",
              "Документ и дата",
              "Цена ед., ₽",
              "kинф × kком",
              "Привед. цена, ₽",
              "Учтено",
            ].map((h) => makeCell(h, true)),
          }),
          ...marketResult.evaluatedOffers.map((item, idx) =>
            new TableRow({
              children: [
                String(idx + 1),
                `${item.offer.supplierName || "—"}\n(${MARKET_PRICE_SOURCE_LABELS[item.offer.sourceType ?? "commercial_offer"]})`,
                `${item.offer.sourceDocument || "б/н"}${item.offer.offerDate ? ` от ${item.offer.offerDate}` : ""}`,
                item.isValidPrice ? formatNmckMoney(item.baseUnitPrice) : "—",
                `${item.effectiveInflationCoeff.toFixed(4)} × ${item.effectiveCommercialCoeff.toFixed(4)}`,
                item.isValidPrice ? formatNmckMoney(item.adjustedUnitPrice) : "—",
                item.isIncluded && item.isValidPrice ? "Да" : "Исключено",
              ].map((v) => makeCell(v)),
            }),
          ),
        ],
      }),
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({
            text: `Средняя приведённая цена единицы: ${formatNmckMoney(marketResult.meanUnitPrice)} ₽ · Мин.: ${formatNmckMoney(marketResult.minUnitPrice)} ₽ · Макс.: ${formatNmckMoney(marketResult.maxUnitPrice)} ₽`,
            size: 20,
            font: "Times New Roman",
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `Среднее квадратическое отклонение (σ): ${formatNmckMoney(marketResult.stdDev)} ₽ · Коэффициент вариации (V): ${marketResult.cvPercent.toFixed(2)}% (${marketResult.isHomogeneous ? "выборка однородна <= 33%" : "превышает 33%, требуется уточнение выборки"})`,
            size: 20,
            font: "Times New Roman",
          }),
        ],
      }),
    ];
  };

  const bodyBlocks = buildBodyBlocks();

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text:
                  params.title ||
                  "ОБОСНОВАНИЕ НАЧАЛЬНОЙ (МАКСИМАЛЬНОЙ) ЦЕНЫ КОНТРАКТА",
                bold: true,
                size: 24,
                font: "Times New Roman",
              }),
            ],
          }),
          ...(params.organizationName
            ? [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: `Заказчик: ${params.organizationName}`,
                      size: 20,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `Объект закупки: ${record.subject || "—"}${record.okpd2Code ? ` · ОКПД2: ${record.okpd2Code}` : ""}${params.ikz ? ` · ИКЗ: ${params.ikz}` : ""}`,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `Количество (объём): ${record.quantity} ${record.unit || "ед."} · Дата расчёта: ${record.calculationDate || "—"}`,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          ...bodyBlocks,
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Итоговая НМЦК: ${formatNmckMoney(record.nmckTotal)} ₽`,
                bold: true,
                size: 22,
                font: "Times New Roman",
              }),
            ],
          }),
          ...(record.notes
            ? [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: `Примечание: ${record.notes}`,
                      size: 19,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { before: 120 },
            children: [
              new TextRun({
                text: `Расчёт выполнил: ${record.calculatorName || "____________________"}   Дата: ${record.calculationDate || "__________"}`,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const fileName =
    params.fileName ||
    `Обоснование_НМЦК_${(params.ikz || record.subject || "расчёт").replace(/[^\wа-яА-ЯёЁ-]+/g, "_").slice(0, 40)}.docx`;

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
