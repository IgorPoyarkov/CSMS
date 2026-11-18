import type { CostItemCategory } from "./nmck.schema";

/**
 * Справочник регулируемых тарифов из официальных источников (ФАС России,
 * региональные органы тарифного регулирования, ФГИС ЕИАС) для тарифного метода
 * определения НМЦК (ч. 8 ст. 22 Закона № 44-ФЗ, разд. V Приказа МЭР № 567).
 */
export interface OfficialTariffEntry {
  id: string;
  name: string;
  okpd2Prefixes: string[];
  unit: string;
  unitPrice: number;
  sourceName: string;
  document: string;
  validFrom: string;
  validTo: string;
  officialUrl: string;
}

export const OFFICIAL_REGULATED_TARIFFS: OfficialTariffEntry[] = [
  {
    id: "tariff-elec-kursk-2026",
    name: "Электроэнергия для бюджетных и прочих потребителей (регулируемый сбытовой тариф)",
    okpd2Prefixes: ["35.11", "35.13", "35.14"],
    unit: "кВт·ч",
    unitPrice: 7.84,
    sourceName: "Комитет по тарифам и ценам Курской области (ФГИС ЕИАС / ФАС России)",
    document: "Постановление Комитета по тарифам и ценам Курской области от 19.12.2025 № 64",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://eias.fas.gov.ru",
  },
  {
    id: "tariff-heat-kursk-2026",
    name: "Тепловая энергия (отопление и подогрев воды для бюджетных учреждений)",
    okpd2Prefixes: ["35.30"],
    unit: "Гкал",
    unitPrice: 2486.4,
    sourceName: "Комитет по тарифам и ценам Курской области (ФГИС ЕИАС)",
    document: "Постановление Комитета по тарифам и ценам Курской области от 18.12.2025 № 58",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://eias.fas.gov.ru",
  },
  {
    id: "tariff-gas-fas-2026",
    name: "Природный газ (оптовая цена + тариф на транспортировку по сетям ГРО)",
    okpd2Prefixes: ["35.22", "35.23"],
    unit: "тыс. м³",
    unitPrice: 7890.0,
    sourceName: "ФАС России / Региональная служба по тарифам",
    document: "Приказ ФАС России от 15.11.2025 № 892/25",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://fas.gov.ru",
  },
  {
    id: "tariff-water-cold-2026",
    name: "Холодное питьевое водоснабжение (централизованная система)",
    okpd2Prefixes: ["36.00"],
    unit: "м³",
    unitPrice: 41.82,
    sourceName: "Комитет по тарифам и ценам Курской области (ФГИС ЕИАС)",
    document: "Постановление Комитета по тарифам и ценам Курской области от 12.12.2025 № 47",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://eias.fas.gov.ru",
  },
  {
    id: "tariff-wastewater-2026",
    name: "Водоотведение (приём и очистка сточных вод)",
    okpd2Prefixes: ["37.00"],
    unit: "м³",
    unitPrice: 34.15,
    sourceName: "Комитет по тарифам и ценам Курской области (ФГИС ЕИАС)",
    document: "Постановление Комитета по тарифам и ценам Курской области от 12.12.2025 № 48",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://eias.fas.gov.ru",
  },
  {
    id: "tariff-tko-2026",
    name: "Услуги регионального оператора по обращению с твёрдыми коммунальными отходами (ТКО)",
    okpd2Prefixes: ["38.11", "38.21"],
    unit: "м³",
    unitPrice: 642.5,
    sourceName: "Комитет по тарифам и ценам Курской области (ГИС «Тарифы»)",
    document: "Постановление Комитета по тарифам и ценам Курской области от 16.12.2025 № 52",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://eias.fas.gov.ru",
  },
  {
    id: "tariff-post-fas-2026",
    name: "Услуги общедоступной почтовой связи (пересылка простой письменной корреспонденции до 20 г)",
    okpd2Prefixes: ["53.10"],
    unit: "шт",
    unitPrice: 31.0,
    sourceName: "Федеральная антимонопольная служба (ФАС России)",
    document: "Приказ ФАС России от 10.12.2025 № 965/25",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://fas.gov.ru",
  },
  {
    id: "tariff-telecom-fas-2026",
    name: "Услуги общедоступной электросвязи (предоставление абонентской линии в пользование)",
    okpd2Prefixes: ["61.10"],
    unit: "мес",
    unitPrice: 420.0,
    sourceName: "Федеральная антимонопольная служба (ФАС России)",
    document: "Приказ ФАС России от 04.12.2025 № 940/25",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://fas.gov.ru",
  },
  {
    id: "tariff-transport-2026",
    name: "Перевозки пассажиров по регулируемым тарифам / городским маршрутам",
    okpd2Prefixes: ["49.31", "49.32"],
    unit: "поезд",
    unitPrice: 36.0,
    sourceName: "Комитет по тарифам и ценам Курской области",
    document: "Постановление Комитета по тарифам и ценам Курской области от 20.12.2025 № 71",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    officialUrl: "https://pravo.gov.ru",
  },
];

/**
 * Подбирает подходящие регулируемые тарифы по коду ОКПД2 (или его префиксу).
 */
export function findMatchingTariffsByOkpd2(
  okpd2Code?: string,
): OfficialTariffEntry[] {
  const normalized = (okpd2Code ?? "").trim();
  if (!normalized) return [];

  return OFFICIAL_REGULATED_TARIFFS.filter((tariff) =>
    tariff.okpd2Prefixes.some(
      (prefix) => normalized === prefix || normalized.startsWith(prefix),
    ),
  );
}

/**
 * Типовые статьи затрат для быстрого заполнения затратного метода
 * (ч. 10–11 ст. 22 Закона № 44-ФЗ, разд. VI Приказа МЭР № 567).
 */
export interface CostItemTemplate {
  category: CostItemCategory;
  name: string;
  basis: string;
}

export const DEFAULT_COST_ITEM_TEMPLATES: CostItemTemplate[] = [
  {
    category: "materials",
    name: "Прямые затраты: материалы, сырьё и комплектующие",
    basis: "Спецификация и прайс-листы производителей",
  },
  {
    category: "labor",
    name: "Прямые затраты: оплата труда основного персонала (ФОТ и страховые взносы 30,2%)",
    basis: "Штатный расчёт трудоёмкости (чел.-час × ставка)",
  },
  {
    category: "equipment",
    name: "Амортизация, эксплуатация оборудования и энергоносители",
    basis: "Расчёт машино-часов и норм расхода энергии",
  },
  {
    category: "overhead",
    name: "Косвенные (накладные), транспортные и общехозяйственные расходы",
    basis: "Смета накладных расходов и логистики",
  },
];
