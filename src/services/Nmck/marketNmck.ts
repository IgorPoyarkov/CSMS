import {
  MARKET_PRICE_SOURCE_LABELS,
  type MarketPriceSourceType,
  type NmckCalculationRecord,
  type NmckMarketOffer,
} from "./nmck.schema";

/**
 * Чистый модуль расчёта и документирования НМЦК методом сопоставимых рыночных
 * цен (анализ рынка) в соответствии со ст. 22 Закона № 44-ФЗ и Методическими
 * рекомендациями Минэкономразвития России от 02.10.2013 № 567.
 */

export const MAX_RECOMMENDED_CV_PERCENT = 33;
export const MIN_RECOMMENDED_SOURCES = 3;
export const MAX_OFFER_AGE_DAYS = 180; // ~6 месяцев (п. 3.16 № 567)

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

/**
 * Основной расчёт НМЦК методом сопоставимых рыночных цен (анализ рынка).
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

  // Среднее квадратическое отклонение по п. 3.20.1 Приказа МЭР № 567
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

/** Формирует снимок расчёта для сохранения в карточку позиции плана закупок */
export function buildNmckCalculationRecord(params: {
  subject: string;
  okpd2Code?: string;
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
}): NmckCalculationRecord {
  return {
    method: "market_analysis",
    calculatedAt: new Date().toISOString().slice(0, 10),
    calculationDate: params.calculationDate,
    calculatorName: params.calculatorName?.trim() || undefined,
    subject: params.subject.trim() || "Объект закупки",
    okpd2Code: params.okpd2Code?.trim() || undefined,
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
    notes: params.notes?.trim() || undefined,
  };
}

/** Текстовое обоснование НМЦК для СЗ и протокола */
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

/**
 * Пересчитывает поля финансового обеспечения позиции плана-графика при
 * обновлении суммы из НМЦК, гарантируя совпадение `amountTotal` и суммы по годам
 * (требование refine в PurchasePlanPositionSchema).
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
 * Экспорт обоснования НМЦК в Microsoft Word (.docx) по форме Приложения № 1
 * к Методическим рекомендациям Минэкономразвития № 567.
 */
export async function exportMarketNmckToDocx(params: {
  title?: string;
  organizationName?: string;
  ikz?: string;
  subject: string;
  okpd2Code?: string;
  quantity: number;
  unit: string;
  calculationDate: string;
  calculatorName?: string;
  result: MarketNmckResult;
  notes?: string;
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

  const rows = [
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
    ...params.result.evaluatedOffers.map((item, idx) =>
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
  ];

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
                text: `Объект закупки: ${params.subject || "—"}${params.okpd2Code ? ` · ОКПД2: ${params.okpd2Code}` : ""}${params.ikz ? ` · ИКЗ: ${params.ikz}` : ""}`,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `Количество (объём): ${params.quantity} ${params.unit || "ед."} · Дата расчёта: ${params.calculationDate || "—"}`,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Метод определения НМЦК: метод сопоставимых рыночных цен (анализ рынка), ст. 22 Федерального закона № 44-ФЗ, Приказ Минэкономразвития России от 02.10.2013 № 567.",
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders,
            rows,
          }),
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              new TextRun({
                text: `Средняя приведённая цена единицы: ${formatNmckMoney(params.result.meanUnitPrice)} ₽ · Мин.: ${formatNmckMoney(params.result.minUnitPrice)} ₽ · Макс.: ${formatNmckMoney(params.result.maxUnitPrice)} ₽`,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `Среднее квадратическое отклонение (σ): ${formatNmckMoney(params.result.stdDev)} ₽ · Коэффициент вариации (V): ${params.result.cvPercent.toFixed(2)}% (${params.result.isHomogeneous ? "выборка однородна <= 33%" : "превышает 33%, требуется уточнение выборки"})`,
                size: 20,
                font: "Times New Roman",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Итоговая НМЦК (${params.result.selectedBasis === "min" ? "по минимальной цене выборки" : "по средней цене выборки"}): ${formatNmckMoney(params.result.nmckTotal)} ₽`,
                bold: true,
                size: 22,
                font: "Times New Roman",
              }),
            ],
          }),
          ...(params.notes
            ? [
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: `Примечание: ${params.notes}`,
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
                text: `Расчёт выполнил: ${params.calculatorName || "____________________"}   Дата: ${params.calculationDate || "__________"}`,
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
    `Обоснование_НМЦК_${(params.ikz || params.subject || "расчёт").replace(/[^\wа-яА-ЯёЁ-]+/g, "_").slice(0, 40)}.docx`;

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
