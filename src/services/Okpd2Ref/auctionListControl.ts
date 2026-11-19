import { NPA_DOCUMENT_CODES } from "../Npa/npa.api";
import { isNpaIndexLoaded, resolveNpaRule } from "../Npa/npaControl";
import type { Okpd2Ref } from "./okpd2Ref.schema";

export const AUCTION_LIST_ACT_TITLE =
  "Распоряжение Правительства РФ от 21.03.2016 № 471-р (ред. от 31.10.2022)";

interface PrefixRule {
  prefix: string;
  label: string;
  note?: string;
}

interface ExclusionRule {
  prefix: string;
  reason: string;
}

/**
 * Позиции перечня товаров, работ, услуг, при закупке которых заказчик обязан
 * проводить аукцион в электронной форме (ч. 6 ст. 24 Закона № 44-ФЗ,
 * Распоряжение Правительства РФ от 21.03.2016 № 471-р в ред. от 31.10.2022).
 */
const INCLUDED_PREFIX_RULES: PrefixRule[] = [
  { prefix: "01", label: "Продукция и услуги сельского хозяйства и охоты (кроме 01.4, 01.7)" },
  { prefix: "02", label: "Продукция лесоводства и лесозаготовок" },
  { prefix: "03", label: "Рыба и прочая продукция рыболовства" },
  { prefix: "05", label: "Уголь" },
  { prefix: "06", label: "Нефть сырая и газ природный" },
  { prefix: "07", label: "Руды металлические" },
  { prefix: "08", label: "Продукция горнодобывающих производств прочая" },
  { prefix: "09", label: "Услуги в области добычи полезных ископаемых" },
  { prefix: "10", label: "Продукты пищевые" },
  { prefix: "11", label: "Напитки" },
  { prefix: "12", label: "Изделия табачные" },
  { prefix: "13", label: "Текстиль и изделия текстильные" },
  { prefix: "14", label: "Одежда" },
  { prefix: "15", label: "Кожа и изделия из кожи" },
  { prefix: "16", label: "Древесина и изделия из дерева и пробки (кроме мебели)" },
  { prefix: "17", label: "Бумага и изделия из бумаги" },
  { prefix: "18", label: "Услуги полиграфические и копирование носителей" },
  { prefix: "19.1", label: "Продукция коксовых печей" },
  { prefix: "19.2", label: "Нефтепродукты" },
  { prefix: "19.30.11", label: "Уголь и антрацит агломерированный" },
  { prefix: "20", label: "Вещества химические и продукты химические" },
  { prefix: "21", label: "Средства лекарственные и материалы медицинские" },
  { prefix: "22", label: "Изделия резиновые и пластмассовые" },
  { prefix: "23", label: "Продукты минеральные неметаллические прочие" },
  { prefix: "24", label: "Металлы основные" },
  { prefix: "25", label: "Изделия металлические готовые, кроме машин и оборудования" },
  { prefix: "26", label: "Оборудование компьютерное, электронное и оптическое" },
  { prefix: "27", label: "Оборудование электрическое" },
  { prefix: "28", label: "Машины и оборудование, не включенные в другие группировки" },
  { prefix: "29", label: "Средства автотранспортные, прицепы и полуприцепы" },
  { prefix: "30", label: "Средства транспортные прочие и оборудование" },
  { prefix: "31", label: "Мебель" },
  { prefix: "32", label: "Изделия готовые прочие" },
  { prefix: "33", label: "Услуги по ремонту и монтажу машин и оборудования" },
  { prefix: "35", label: "Электроэнергия, газ, пар и кондиционирование воздуха" },
  { prefix: "36", label: "Вода природная; услуги по очистке и распределению воды" },
  { prefix: "37", label: "Услуги по водоотведению" },
  { prefix: "38", label: "Услуги по сбору, обработке и утилизации отходов" },
  { prefix: "45", label: "Торговля и ремонт автотранспортных средств" },
  { prefix: "46", label: "Услуги оптовой торговли (кроме автотранспорта)" },
  { prefix: "47", label: "Услуги розничной торговли (кроме автотранспорта)" },
  { prefix: "49", label: "Услуги сухопутного и трубопроводного транспорта" },
  { prefix: "58", label: "Услуги издательские" },
  { prefix: "61", label: "Услуги телекоммуникационные" },
];

/**
 * Исключения внутри включённых классов и позиции, выведенные из перечня № 471-р.
 */
const EXCLUSION_RULES: ExclusionRule[] = [
  {
    prefix: "01.4",
    reason: "Исключение РП РФ № 471-р: код 01.4 (продукция животноводства) выведен из аукционного перечня.",
  },
  {
    prefix: "01.7",
    reason: "Исключение РП РФ № 471-р: код 01.7 (охота, отлов) выведен из аукционного перечня.",
  },
  {
    prefix: "26.60.11",
    reason: "Исключение РП РФ № 471-р для сложной медицинской диагностической техники (код 26.60.11): допустим конкурс.",
  },
  {
    prefix: "26.60.12",
    reason: "Исключение РП РФ № 471-р для электродиагностической медицинской техники (код 26.60.12): допустим конкурс.",
  },
  {
    prefix: "28.22.18.150",
    reason: "Исключение РП РФ № 471-р: код 28.22.18.150 выведен из аукционного перечня.",
  },
  {
    prefix: "28.99.39.150",
    reason: "Исключение РП РФ № 471-р: код 28.99.39.150 выведен из аукционного перечня.",
  },
  {
    prefix: "30.1",
    reason: "Исключение РП РФ № 471-р: судостроение (код 30.1) не требует обязательного аукциона.",
  },
  {
    prefix: "30.3",
    reason: "Исключение РП РФ № 471-р: авиастроение (код 30.3) не требует обязательного аукциона.",
  },
  {
    prefix: "30.92.2",
    reason: "Исключение РП РФ № 471-р: детские коляски и части (код 30.92.2) выведены из перечня.",
  },
  {
    prefix: "32.50.22.120",
    reason: "Исключение РП РФ № 471-р: ортопедическая обувь и спецэлементы (код 32.50.22.120).",
  },
  {
    prefix: "41",
    reason: "Строительные работы (раздел 41) исключены из обязательного аукционного перечня РП РФ от 25.06.2020 № 1675-р — возможен конкурс или аукцион.",
  },
  {
    prefix: "42",
    reason: "Работы на сооружениях (раздел 42) исключены из обязательного аукционного перечня РП РФ от 25.06.2020 № 1675-р — возможен конкурс или аукцион.",
  },
  {
    prefix: "43",
    reason: "Специализированные строительные работы (раздел 43) исключены из обязательного аукционного перечня РП РФ от 25.06.2020 № 1675-р — возможен конкурс или аукцион.",
  },
  {
    prefix: "49.1",
    reason: "Исключение РП РФ № 471-р: железнодорожные перевозки (код 49.1).",
  },
  {
    prefix: "49.31.21",
    reason: "Исключение РП РФ № 471-р: регулярные перевозки (код 49.31.21).",
  },
  {
    prefix: "49.39.11",
    reason: "Исключение РП РФ № 471-р: междугородние пассажирские перевозки (код 49.39.11).",
  },
  {
    prefix: "49.5",
    reason: "Исключение РП РФ № 471-р: трубопроводный транспорт (код 49.5).",
  },
  {
    prefix: "58.19.12",
    reason: "Исключение РП РФ № 471-р: печатные издания (код 58.19.12).",
  },
  {
    prefix: "58.19.15",
    reason: "Исключение РП РФ № 471-р: печатные издания (код 58.19.15).",
  },
];

const normalizeCode = (code?: string): string =>
  (code ?? "").trim().replace(/,/g, ".").replace(/\s+/g, "");

const stripDots = (code: string): string => code.replace(/\./g, "");

const matchesPrefix = (code: string, prefix: string): boolean => {
  const cleanCode = stripDots(code);
  const cleanPrefix = stripDots(prefix);
  if (cleanPrefix.length < 2) return false;
  return cleanCode.startsWith(cleanPrefix);
};

export interface AuctionListCheckResult {
  code: string;
  inAuctionList: boolean;
  excludedByException: boolean;
  groupLabel?: string;
  note?: string;
  legalBasis: string;
  /** Правило из акта неоднозначно и ждёт решения человека. */
  needsReview?: boolean;
}

/**
 * Проверяет код ОКПД2 на вхождение в «аукционный перечень» по
 * Распоряжению Правительства РФ от 21.03.2016 № 471-р (ред. от 31.10.2022).
 * Работает как по справочнику из БД (`isAuctionRequired`), так и по правилам
 * префиксов ОКПД2 для любых вручную введённых кодов.
 */
export const checkOkpd2AuctionList = (
  rawCode: string | undefined,
  dictionary?: Okpd2Ref[],
): AuctionListCheckResult => {
  const code = normalizeCode(rawCode);
  if (!code) {
    return {
      code: "",
      inAuctionList: false,
      excludedByException: false,
      legalBasis: AUCTION_LIST_ACT_TITLE,
    };
  }

  // Источник истины — правила НПА, разобранные агентом из официального текста.
  // Пока индекс не загружен, используется исторический эталон 471-р 2022 года.
  if (isNpaIndexLoaded(NPA_DOCUMENT_CODES.auctionList)) {
    const npa = resolveNpaRule(NPA_DOCUMENT_CODES.auctionList, code);
    const excluded = npa?.ruleType === "exclude";

    return {
      code,
      inAuctionList: Boolean(npa) && !excluded,
      excludedByException: excluded ?? false,
      groupLabel: npa?.conditionText ?? undefined,
      note: npa?.needsReview
        ? "Правило 471-р требует проверки человеком (needs_review)."
        : (npa?.conditionText ??
          (!npa
            ? "Код ОКПД2 не найден в аукционном перечне 471-р по данным csms-api."
            : undefined)),
      legalBasis: AUCTION_LIST_ACT_TITLE,
      needsReview: npa?.needsReview,
    };
  }

  const exclusion = EXCLUSION_RULES.find((rule) => matchesPrefix(code, rule.prefix));
  const included = INCLUDED_PREFIX_RULES.find((rule) => matchesPrefix(code, rule.prefix));
  const dictEntry = dictionary?.find((item) => normalizeCode(item.code) === code);

  if (dictEntry && dictEntry.isAuctionRequired !== undefined) {
    return {
      code,
      inAuctionList: dictEntry.isAuctionRequired,
      excludedByException: Boolean(exclusion && !dictEntry.isAuctionRequired),
      groupLabel: included?.label,
      note: dictEntry.auctionNote ?? exclusion?.reason,
      legalBasis: AUCTION_LIST_ACT_TITLE,
    };
  }

  if (exclusion) {
    return {
      code,
      inAuctionList: false,
      excludedByException: true,
      groupLabel: included?.label,
      note: exclusion.reason,
      legalBasis: AUCTION_LIST_ACT_TITLE,
    };
  }

  if (included) {
    return {
      code,
      inAuctionList: true,
      excludedByException: false,
      groupLabel: included.label,
      note: included.note,
      legalBasis: AUCTION_LIST_ACT_TITLE,
    };
  }

  return {
    code,
    inAuctionList: false,
    excludedByException: false,
    note: "Код ОКПД2 не включён в аукционный перечень № 471-р: допустим выбор конкурса или аукциона.",
    legalBasis: AUCTION_LIST_ACT_TITLE,
  };
};

export const isContestPlacingWay = (placingWayCode?: string): boolean => {
  const code = (placingWayCode ?? "").trim().toUpperCase();
  return code.startsWith("OK") || code.startsWith("EOK");
};

export const isAuctionPlacingWay = (placingWayCode?: string): boolean =>
  (placingWayCode ?? "").trim().toUpperCase().startsWith("EA");

export const isAuctionExemptProcedure = (placingWayCode?: string): boolean => {
  const code = (placingWayCode ?? "").trim().toUpperCase();
  return code.startsWith("ZK") || code.startsWith("EP");
};

export interface AuctionObjectInput {
  code?: string;
  name?: string;
}

export interface PlacingWayAuctionValidation {
  hasViolation: boolean;
  hasAuctionRequiredCodes: boolean;
  auctionRequiredItems: Array<{ code: string; name?: string; note?: string }>;
  warningMessage: string | null;
  infoMessage: string | null;
}

/**
 * Сверяет выбранный способ определения поставщика с кодами ОКПД2 объектов закупки.
 * Если хотя бы один объект входит в перечень № 471-р, а выбран конкурс (`OK*`/`EOK*`),
 * возвращает `hasViolation: true` и текст предупреждения (ч. 6 ст. 24 Закона № 44-ФЗ).
 */
export const validatePlacingWayAgainstAuctionList = (
  placingWayCode: string | undefined,
  items: AuctionObjectInput[],
  dictionary?: Okpd2Ref[],
): PlacingWayAuctionValidation => {
  const seen = new Set<string>();
  const auctionRequiredItems: Array<{ code: string; name?: string; note?: string }> = [];

  for (const item of items) {
    const code = normalizeCode(item.code);
    if (!code || seen.has(code)) continue;
    const result = checkOkpd2AuctionList(code, dictionary);
    if (result.inAuctionList) {
      seen.add(code);
      auctionRequiredItems.push({
        code: result.code,
        name: item.name,
        note: result.note ?? result.groupLabel,
      });
    }
  }

  if (auctionRequiredItems.length === 0) {
    return {
      hasViolation: false,
      hasAuctionRequiredCodes: false,
      auctionRequiredItems: [],
      warningMessage: null,
      infoMessage: null,
    };
  }

  const codesList = auctionRequiredItems.map((item) => item.code).join(", ");

  if (isContestPlacingWay(placingWayCode)) {
    return {
      hasViolation: true,
      hasAuctionRequiredCodes: true,
      auctionRequiredItems,
      warningMessage:
        `Неверный способ закупки! Код ОКПД2 ${codesList} входит в «аукционный перечень» ` +
        `(${AUCTION_LIST_ACT_TITLE}). В силу ч. 6 ст. 24 Закона № 44-ФЗ проведение конкурса ` +
        `запрещено — необходимо выбрать электронный аукцион (кроме случаев запроса котировок ` +
        `или закупки у единственного поставщика).`,
      infoMessage: null,
    };
  }

  if (isAuctionPlacingWay(placingWayCode)) {
    return {
      hasViolation: false,
      hasAuctionRequiredCodes: true,
      auctionRequiredItems,
      warningMessage: null,
      infoMessage: `Код ОКПД2 ${codesList} входит в аукционный перечень (${AUCTION_LIST_ACT_TITLE}) — электронный аукцион выбран правомерно.`,
    };
  }

  if (isAuctionExemptProcedure(placingWayCode)) {
    return {
      hasViolation: false,
      hasAuctionRequiredCodes: true,
      auctionRequiredItems,
      warningMessage: null,
      infoMessage:
        `Код ОКПД2 ${codesList} входит в перечень № 471-р, однако по ч. 6 ст. 24 Закона № 44-ФЗ ` +
        `электронный запрос котировок и закупка у единственного поставщика допускаются при соблюдении установленных законом ограничений.`,
    };
  }

  return {
    hasViolation: false,
    hasAuctionRequiredCodes: true,
    auctionRequiredItems,
    warningMessage: null,
    infoMessage: null,
  };
};
