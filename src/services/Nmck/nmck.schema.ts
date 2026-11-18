import { z } from "zod";

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
  sourceType: z
    .enum(MARKET_PRICE_SOURCE_TYPES)
    .optional(),
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
  method: z.literal("market_analysis"),
  calculatedAt: z.string(),
  calculationDate: z.string(),
  calculatorName: z.string().optional(),
  subject: z.string(),
  okpd2Code: z.string().optional(),
  quantity: z.string(),
  unit: z.string(),
  applyAutoInflation: z.boolean().optional(),
  annualInflationPercent: z.string().optional(),
  selectedBasis: z.enum(["mean", "min"]).optional(),
  offers: z.array(NmckMarketOfferSchema),
  activeCount: z.number(),
  meanUnitPrice: z.number(),
  minUnitPrice: z.number(),
  maxUnitPrice: z.number(),
  stdDev: z.number(),
  cvPercent: z.number(),
  isHomogeneous: z.boolean(),
  nmckTotal: z.number(),
  nmckMinTotal: z.number(),
  notes: z.string().optional(),
});

export type NmckCalculationRecord = z.infer<typeof NmckCalculationRecordSchema>;
