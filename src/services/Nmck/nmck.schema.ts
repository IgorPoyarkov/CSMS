import { z } from "zod";

/**
 * Методы определения НМЦК (ч. 1 ст. 22 Закона № 44-ФЗ):
 * - market_analysis — метод сопоставимых рыночных цен (анализ рынка, ч. 2–5 ст. 22);
 * - normative — нормативный метод (ч. 7 ст. 22, ст. 19 44-ФЗ, ПП РФ № 926 / № 1047);
 * - tariff — тарифный метод (ч. 8 ст. 22 44-ФЗ, разд. V Приказа МЭР № 567);
 * - cost — затратный метод (ч. 10–11 ст. 22 44-ФЗ, разд. VI Приказа МЭР № 567).
 */
export const NMCK_METHODS = [
  "market_analysis",
  "normative",
  "tariff",
  "cost",
] as const;
export type NmckMethod = (typeof NMCK_METHODS)[number];

export const NMCK_METHOD_LABELS: Record<NmckMethod, string> = {
  market_analysis: "Метод сопоставимых рыночных цен (анализ рынка)",
  normative: "Нормативный метод (ст. 19, ч. 7 ст. 22 44-ФЗ)",
  tariff: "Тарифный метод (ч. 8 ст. 22 44-ФЗ)",
  cost: "Затратный метод (ч. 10–11 ст. 22 44-ФЗ)",
};

/**
 * Категории статей затрат для затратного метода расчёта НМЦК
 * (ч. 10–11 ст. 22 Закона № 44-ФЗ, разд. VI Приказа МЭР № 567).
 */
export const COST_ITEM_CATEGORIES = [
  "materials",
  "labor",
  "equipment",
  "overhead",
  "other",
] as const;
export type CostItemCategory = (typeof COST_ITEM_CATEGORIES)[number];

export const COST_ITEM_CATEGORY_LABELS: Record<CostItemCategory, string> = {
  materials: "Материалы и комплектующие",
  labor: "Оплата труда и страховые взносы",
  equipment: "Оборудование и амортизация",
  overhead: "Накладные и транспортные расходы",
  other: "Прочие прямые затраты",
};

export const NmckCostItemSchema = z.object({
  id: z.string(),
  category: z.enum(COST_ITEM_CATEGORIES).optional(),
  name: z.string(),
  basis: z.string().optional(),
  amount: z.string(),
});

export type NmckCostItem = z.infer<typeof NmckCostItemSchema>;

/**
 * Типы источников ценовой информации для метода сопоставимых рыночных цен
 * (п. 3.7 Методических рекомендаций, утв. Приказом МЭР России от 02.10.2013 № 567).
 */
export const MARKET_PRICE_SOURCE_TYPES = [
  "commercial_offer",
  "eis_contract",
  "public_price",
  "tariff",
] as const;

export type MarketPriceSourceType = (typeof MARKET_PRICE_SOURCE_TYPES)[number];

export const MARKET_PRICE_SOURCE_LABELS: Record<MarketPriceSourceType, string> = {
  commercial_offer: "Коммерческое предложение (КП)",
  eis_contract: "Реестр контрактов (ЕИС)",
  public_price: "Общедоступная цена / прайс-лист",
  tariff: "Тариф / статистика (Росстат)",
};

export const MARKET_PRICE_SOURCE_SHORT: Record<MarketPriceSourceType, string> = {
  commercial_offer: "КП",
  eis_contract: "ЕИС",
  public_price: "Прайс",
  tariff: "Тариф",
};

export const NmckMarketOfferSchema = z.object({
  id: z.string(),
  sourceType: z.enum(MARKET_PRICE_SOURCE_TYPES).optional(),
  supplierName: z.string(),
  sourceDocument: z.string().optional(),
  offerDate: z.string().optional(),
  unitPrice: z.string(),
  vatMode: z.enum(["with_vat", "without_vat"]).optional(),
  inflationCoeff: z.string().optional(),
  commercialCoeff: z.string().optional(),
  adjustmentComment: z.string().optional(),
  included: z.boolean().optional(),
});

export type NmckMarketOffer = z.infer<typeof NmckMarketOfferSchema>;

export const NmckCalculationRecordSchema = z.object({
  method: z.enum(NMCK_METHODS),
  calculatedAt: z.string(),
  calculationDate: z.string(),
  calculatorName: z.string().optional(),
  subject: z.string(),
  okpd2Code: z.string().optional(),
  okpd2Name: z.string().optional(),
  quantity: z.string(),
  unit: z.string(),

  // Поля метода сопоставимых рыночных цен (анализ рынка)
  applyAutoInflation: z.boolean().optional(),
  annualInflationPercent: z.string().optional(),
  selectedBasis: z.enum(["mean", "min"]).optional(),
  offers: z.array(NmckMarketOfferSchema).default([]),
  activeCount: z.number().default(0),
  meanUnitPrice: z.number().default(0),
  minUnitPrice: z.number().default(0),
  maxUnitPrice: z.number().default(0),
  stdDev: z.number().default(0),
  cvPercent: z.number().default(0),
  isHomogeneous: z.boolean().default(true),
  nmckMinTotal: z.number().default(0),

  // Поля нормативного метода (ч. 7 ст. 22, ст. 19 44-ФЗ, увязка с ОКПД2)
  normativeAct: z.string().optional(),
  normativeDocument: z.string().optional(),
  normLimitUnitPrice: z.number().optional(),
  normativeUnitPrice: z.number().optional(),
  normLimitTotal: z.number().optional(),
  exceedsNormLimit: z.boolean().optional(),

  // Поля тарифного метода (ч. 8 ст. 22 44-ФЗ, разд. V Приказа МЭР № 567)
  tariffId: z.string().optional(),
  tariffName: z.string().optional(),
  tariffSourceName: z.string().optional(),
  tariffDocument: z.string().optional(),
  tariffValidFrom: z.string().optional(),
  tariffValidTo: z.string().optional(),
  tariffUnitPrice: z.number().optional(),
  tariffExpired: z.boolean().optional(),

  // Поля затратного метода (ч. 10–11 ст. 22 44-ФЗ, разд. VI Приказа МЭР № 567)
  costItems: z.array(NmckCostItemSchema).optional(),
  costInputScope: z.enum(["total", "unit"]).optional(),
  costSubtotal: z.number().optional(),
  costProfitCoeff: z.number().optional(),
  costProfitPercent: z.number().optional(),
  costProfitAmount: z.number().optional(),
  costProfitBasis: z.string().optional(),
  costUnitPrice: z.number().optional(),

  nmckTotal: z.number(),
  notes: z.string().optional(),
});

export type NmckCalculationRecord = z.infer<typeof NmckCalculationRecordSchema>;
