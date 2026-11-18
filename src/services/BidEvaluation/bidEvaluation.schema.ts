import { z } from "zod";

/**
 * Оценка заявок на участие в закупке по Положению, утверждённому
 * постановлением Правительства РФ от 31.12.2021 N 2604.
 *
 * Норма в системе хранится ссылкой на акт (`legalActs`, id `pp-2604`), а не
 * текстом: при замене методики видно, какие экраны пересчитать.
 *
 * Что здесь есть:
 * - четыре критерия оценки (цена, расходы, характеристики объекта закупки,
 *   квалификация участника) и показатели/детализирующие показатели;
 * - предельные величины значимости из приложения N 2 к Положению;
 * - расчётный движок по формулам пунктов 9, 10, 14 и 20 Положения;
 * - проверки, которые не дают сохранить конфигурацию, противоречащую норме
 *   (сумма значимости 100%, цена для конкурса, запрет показателей по цене,
 *   обязательный опыт работы для строительства и отдельных видов услуг).
 *
 * Ограничение модели: оценка нестоимостных критериев считается по среднему
 * баллу комиссии только тогда, когда баллы уже выставлены; здесь баллы
 * выводятся из предложений участников по формуле или шкале. Ручные баллы
 * члена комиссии (среднее по составу) в модель не заведены.
 */

// Норма, на которую опирается модуль
export const BID_EVALUATION_LEGAL_ACT_ID = "pp-2604";

const idSchema = () => z.union([z.string(), z.number()]).optional();

const requiredId = (message: string) =>
  z
    .union([z.string(), z.number()])
    .refine(
      (value) => value !== "" && value !== null && value !== undefined,
      message,
    );

const optionalText = (minLength: number, message: string) =>
  z
    .string()
    .refine((value) => value === "" || value.length >= minLength, message)
    .optional();

const isoDate = () =>
  z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
      "Неверный формат даты (ожидается ГГГГ-ММ-ДД)",
    )
    .optional();

// Деньги — строки, как во всех схемах проекта: json-server не знает типов,
// а форма отдаёт то, что ввёл человек
const optionalMoney = () =>
  z
    .string()
    .refine(
      (value) => value === "" || /^-?\d+(\.\d{1,2})?$/.test(value),
      "Укажите сумму числом с точностью до копеек",
    )
    .optional();

const percent = (max: number) =>
  z.coerce
    .number({ message: "Укажите процент числом" })
    .min(0, "Процент не может быть отрицательным")
    .max(max, `Процент не может превышать ${max}`);

// Необязательное число: пустая строка из формы — это «не задано», а не ноль
const optionalNumber = () =>
  z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? undefined
        : Number(value),
    z.number({ message: "Укажите число" }).optional(),
  );

const today = (): string => new Date().toISOString().slice(0, 10);

// === Виды процедур (п. 4, 5 Положения) ===

export const PROCEDURE_KINDS = [
  "tender",
  "auction",
  "quotation",
  "request_proposals",
] as const;

export type ProcedureKind = (typeof PROCEDURE_KINDS)[number];

export const procedureKindLabels: Record<ProcedureKind, string> = {
  tender: "Конкурс (в электронной форме)",
  auction: "Аукцион",
  quotation: "Запрос котировок",
  request_proposals: "Запрос предложений",
};

// === Категории объекта закупки (приложение N 2) ===

export interface ObjectCategoryLimit {
  id: string;
  label: string;
  // Минимальная значимость критерия «цена контракта...»
  minPrice: number;
  // Максимальная значимость критерия «расходы»; null — критерий не применяется
  maxExpenses: number | null;
  // Максимальная сумма значимости характеристик и квалификации
  maxNonCost: number;
}

/**
 * Приложение N 2 к Положению: предельные величины значимости критериев
 * оценки. Значения сверены с текстом Положения (ред. от 31.10.2022).
 */
export const OBJECT_CATEGORY_LIMITS: ObjectCategoryLimit[] = [
  {
    id: "goods",
    label: "Товары, за исключением пищевых продуктов",
    minPrice: 70,
    maxExpenses: 10,
    maxNonCost: 30,
  },
  {
    id: "works_services",
    label: "Работы, услуги (общий случай)",
    minPrice: 60,
    maxExpenses: 10,
    maxNonCost: 40,
  },
  {
    id: "construction",
    label:
      "Строительство, реконструкция, капитальный ремонт, снос объекта капитального строительства",
    minPrice: 60,
    maxExpenses: null,
    maxNonCost: 40,
  },
  {
    id: "road",
    label: "Ремонт, содержание автомобильной дороги",
    minPrice: 60,
    maxExpenses: null,
    maxNonCost: 40,
  },
  {
    id: "building_repair",
    label: "Текущий ремонт зданий, сооружений",
    minPrice: 60,
    maxExpenses: null,
    maxNonCost: 40,
  },
  {
    id: "cultural_heritage",
    label:
      "Сохранение объектов культурного наследия (памятников истории и культуры)",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "museum_restoration",
    label: "Реставрация музейных предметов и музейных коллекций",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "archive_restoration",
    label:
      "Реставрация документов Архивного фонда, особо ценных и редких документов",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "literature_art",
    label: "Создание произведения литературы или искусства",
    minPrice: 0,
    maxExpenses: null,
    maxNonCost: 100,
  },
  {
    id: "film",
    label: "Исполнение, финансирование проката или показа национального фильма",
    minPrice: 20,
    maxExpenses: null,
    maxNonCost: 80,
  },
  {
    id: "research",
    label:
      "Научно-исследовательские, опытно-конструкторские, технологические работы",
    minPrice: 20,
    maxExpenses: 10,
    maxNonCost: 80,
  },
  {
    id: "it_systems",
    label:
      "Создание, развитие, обслуживание государственных и муниципальных информационных систем и сайтов",
    minPrice: 30,
    maxExpenses: null,
    maxNonCost: 70,
  },
  {
    id: "food_catering",
    label:
      "Услуги общественного питания и (или) поставка пищевых продуктов для образовательных и медицинских организаций",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "security",
    label: "Услуги по обеспечению охраны объектов (территорий)",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "children_recreation",
    label: "Услуги по организации отдыха детей и их оздоровлению",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "medical",
    label: "Медицинские услуги",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "education",
    label: "Образовательные услуги",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "legal",
    label: "Юридические услуги",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "audit",
    label: "Аудиторские услуги",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "expertise",
    label: "Услуги по проведению экспертизы",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
];

export const OBJECT_CATEGORY_IDS = OBJECT_CATEGORY_LIMITS.map(
  (item) => item.id,
) as [string, ...string[]];

export const objectCategoryLimits = (
  category: string | undefined,
): ObjectCategoryLimit =>
  OBJECT_CATEGORY_LIMITS.find((item) => item.id === category) ??
  OBJECT_CATEGORY_LIMITS[1];

// === Критерии оценки (п. 3 Положения) ===

export const CRITERION_TYPES = [
  "price",
  "expenses",
  "characteristics",
  "qualification",
] as const;

export type CriterionType = (typeof CRITERION_TYPES)[number];

export const criterionLabels: Record<CriterionType, string> = {
  price: "Цена контракта, сумма цен единиц товара, работы, услуги",
  expenses:
    "Расходы на эксплуатацию и ремонт товаров, использование результатов работ",
  characteristics:
    "Качественные, функциональные и экологические характеристики объекта закупки",
  qualification:
    "Квалификация участников закупки (финансы, оборудование, опыт, деловая репутация, специалисты)",
};

export const criterionShortLabels: Record<CriterionType, string> = {
  price: "Цена",
  expenses: "Расходы",
  characteristics: "Характеристики объекта",
  qualification: "Квалификация",
};

// === Показатели оценки (п. 7, 8 Положения) ===

export const INDICATOR_KINDS = [
  "expense",
  "quality",
  "functional",
  "ecological",
  "financial",
  "equipment",
  "experience",
  "reputation",
  "staff",
] as const;

export type IndicatorKind = (typeof INDICATOR_KINDS)[number];

export const indicatorKindLabels: Record<IndicatorKind, string> = {
  expense: "Вид расхода",
  quality: "Качественная характеристика",
  functional: "Функциональная характеристика",
  ecological: "Экологическая характеристика",
  financial: "Финансовые ресурсы",
  equipment: "Оборудование и материальные ресурсы",
  experience: "Опыт работы по предмету контракта",
  reputation: "Деловая репутация",
  staff: "Специалисты и иные работники",
};

// Виды показателей, допустимые для критерия
export const indicatorKindsByCriterion: Record<CriterionType, IndicatorKind[]> =
  {
    price: [],
    expenses: ["expense"],
    characteristics: ["quality", "functional", "ecological"],
    qualification: [
      "financial",
      "equipment",
      "experience",
      "reputation",
      "staff",
    ],
  };

export const BEST_DIRECTIONS = ["min", "max"] as const;
export type BestDirection = (typeof BEST_DIRECTIONS)[number];

export const bestDirectionLabels: Record<BestDirection, string> = {
  min: "Лучше меньшее значение",
  max: "Лучше большее значение",
};

export const SCORING_MODES = ["formula", "scale"] as const;
export type ScoringMode = (typeof SCORING_MODES)[number];

export const scoringModeLabels: Record<ScoringMode, string> = {
  formula: "Формула (п. 20 Положения)",
  scale: "Шкала оценки (п. 22 Положения)",
};

export const IndicatorSchema = z.object({
  id: idSchema(),
  name: z.string().trim().min(1, "Укажите показатель оценки"),
  kind: z.enum(INDICATOR_KINDS).default("quality"),
  // Значимость показателя в совокупности показателей критерия — 100%
  weightPercent: percent(100).default(0),
  unit: z.string().optional(),
  // Направление: какое значение лучше
  best: z.enum(BEST_DIRECTIONS).default("max"),
  // Способ оценки: функциональная зависимость или шкала
  scoring: z.enum(SCORING_MODES).default("formula"),
  // Предельные значения характеристики (п. 18, 21 Положения)
  limitMin: optionalNumber(),
  limitMax: optionalNumber(),
  // Шкала оценки: строки «свойство = баллы», по одной на значение
  scaleText: z.string().optional(),
});

export type Indicator = z.infer<typeof IndicatorSchema>;
export type IndicatorInput = z.input<typeof IndicatorSchema>;

export interface ScaleStep {
  label: string;
  score: number;
}

/**
 * Шкала оценки хранится строкой «свойство = баллы» — так её можно править
 * в одной ячейке таблицы, не разворачивая вложенный редактор строк.
 */
export const parseScaleText = (text: string | undefined): ScaleStep[] =>
  String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes("=") ? "=" : ";";
      const [rawLabel, rawScore] = line.split(separator);
      const score = Number.parseFloat(String(rawScore ?? "").replace(",", "."));

      return {
        label: String(rawLabel ?? "").trim(),
        score: Number.isFinite(score) ? score : 0,
      };
    })
    .filter((step) => step.label.length > 0);

export const formatScaleText = (steps: ScaleStep[]): string =>
  steps.map((step) => `${step.label} = ${step.score}`).join("\n");

export const CriterionSchema = z.object({
  id: idSchema(),
  type: z.enum(CRITERION_TYPES),
  enabled: z.boolean().default(false),
  // Значимость критерия в совокупности критериев — 100% (п. 2 Положения)
  weightPercent: percent(100).default(0),
  indicators: z.array(IndicatorSchema).default([]),
  // Отдельные положения о применении критерия (раздел III формы)
  note: z.string().optional(),
});

export type Criterion = z.infer<typeof CriterionSchema>;
export type CriterionInput = z.input<typeof CriterionSchema>;

// === Заявки участников ===

export const BidValueSchema = z.object({
  // Числовое предложение участника (цена показателя, объём, срок и т. п.)
  value: z.string().optional(),
  // Выбранное свойство при оценке по шкале (совпадает с подписью шага)
  optionId: z.string().optional(),
});

export type BidValue = z.infer<typeof BidValueSchema>;

export const BidSchema = z.object({
  id: idSchema(),
  participantName: z.string().trim().min(1, "Укажите участника закупки"),
  price: optionalMoney(),
  // Ключ — id показателя оценки
  values: z.record(z.string(), BidValueSchema).default({}),
  // Итог оценки сохраняется на момент подведения итогов
  totalScore: z.coerce.number().default(0),
  rank: z.coerce.number().default(0),
});

export type Bid = z.infer<typeof BidSchema>;
export type BidInput = z.input<typeof BidSchema>;

// === Документ оценки ===

export const BID_EVALUATION_STATUSES = [
  "draft",
  "published",
  "evaluated",
] as const;

export type BidEvaluationStatus = (typeof BID_EVALUATION_STATUSES)[number];

export const bidEvaluationStatusLabels: Record<BidEvaluationStatus, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  evaluated: "Заявки оценены",
};

export const BidEvaluationSchema = z.object({
  id: idSchema(),
  organizationId: requiredId(
    "Оценка заявок должна быть привязана к организации заказчика",
  ),
  // Связь с цепочкой закупки: извещение/закупка, если она уже заведена
  procurementId: idSchema(),
  noticeInfoId: idSchema(),
  objectName: optionalText(3, "Укажите объект закупки"),
  objectCategory: z.enum(OBJECT_CATEGORY_IDS).default("works_services"),
  procedureKind: z.enum(PROCEDURE_KINDS).default("tender"),
  // Начальная (максимальная) цена контракта — база для формул п. 9 и 10
  nmck: optionalMoney(),

  criteria: z.array(CriterionSchema).default([]),
  bids: z.array(BidSchema).default([]),

  legalActId: idSchema(),
  status: z.enum(BID_EVALUATION_STATUSES).default("draft"),
  publishedAt: isoDate(),
  evaluatedAt: isoDate(),

  createdAt: isoDate(),
  updatedAt: isoDate(),
});

export type BidEvaluation = z.infer<typeof BidEvaluationSchema>;
export type BidEvaluationInput = z.input<typeof BidEvaluationSchema>;

export const BidEvaluationListSchema = z.array(BidEvaluationSchema);

// === Заготовки ===

export const emptyCriterion = (type: CriterionType): Criterion => ({
  type,
  enabled: false,
  weightPercent: 0,
  indicators: [],
  note: "",
});

/**
 * Заготовка для конкурса на работы/услуги: цена 60% и квалификация 40% —
 * типовая конфигурация в пределах приложения N 2.
 */
export const defaultCriteria = (): Criterion[] => [
  {
    type: "price",
    enabled: true,
    weightPercent: 60,
    indicators: [],
    note: "",
  },
  {
    type: "expenses",
    enabled: false,
    weightPercent: 0,
    indicators: [],
    note: "",
  },
  {
    type: "characteristics",
    enabled: false,
    weightPercent: 0,
    indicators: [],
    note: "",
  },
  {
    type: "qualification",
    enabled: true,
    weightPercent: 40,
    indicators: [
      {
        name: "Общая цена исполненных договоров, сопоставимых с предметом контракта",
        kind: "experience",
        weightPercent: 100,
        unit: "руб.",
        best: "max",
        scoring: "formula",
        scaleText: "",
      },
    ],
    note: "",
  },
];

export const emptyBidEvaluation = (
  organizationId: string | number = "",
): BidEvaluation => ({
  organizationId,
  objectName: "",
  objectCategory: "works_services",
  procedureKind: "tender",
  nmck: "",
  criteria: defaultCriteria(),
  bids: [],
  legalActId: BID_EVALUATION_LEGAL_ACT_ID,
  status: "draft",
  publishedAt: "",
  evaluatedAt: "",
  createdAt: today(),
  updatedAt: today(),
});

// === Расчёты по Положению ===

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const parseNumber = (value: string | number | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Пункты 9 и 10 Положения.
 *
 * - Если все предложения неотрицательны: БЦi = Цл / Цi × 100 (п. 9 «а»);
 *   при отрицательном результате — БЦi = (Цнач − Цi) / Цнач × 100 (п. 9 «б»).
 * - Если подано предложение ниже нуля (п. 10): для предложений не ниже нуля
 *   БЦi = (Цнач − Цi) / Цнач × 100, для предложений ниже нуля —
 *   БЦi = (Цнач + |Цi|) / Цнач × 100. Вторая формула — зеркальная к первой
 *   (п. 11 «б» требует брать значения без знака «минус») и непрерывна в нуле.
 */
export const scorePriceBids = (prices: number[], nmck: number): number[] => {
  if (prices.length === 0) {
    return [];
  }

  if (prices.some((price) => price < 0)) {
    return prices.map((price) => {
      if (nmck <= 0) {
        return 0;
      }

      const absolute = Math.abs(price);

      return round2(
        price >= 0
          ? ((nmck - price) / nmck) * 100
          : ((nmck + absolute) / nmck) * 100,
      );
    });
  }

  const best = Math.min(...prices);

  if (best === 0) {
    return prices.map(() => 100);
  }

  const scores = prices.map((price) =>
    price === 0 ? 0 : (best / price) * 100,
  );

  if (scores.some((score) => score < 0)) {
    return prices.map((price) =>
      nmck > 0 ? round2(((nmck - price) / nmck) * 100) : 0,
    );
  }

  return scores.map(round2);
};

/**
 * Пункт 14 Положения: БРi = (Рmax − Рi) / (Рmax − Рmin) × 100.
 * Меньшие расходы выгоднее заказчику, поэтому лучшим является минимум.
 */
export const scoreExpenseValues = (values: number[]): number[] => {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return values.map(() => 100);
  }

  return values.map((value) => round2(((max - value) / (max - min)) * 100));
};

export interface CharacteristicOptions {
  best: BestDirection;
  limitMin?: number;
  limitMax?: number;
}

/**
 * Пункт 20 Положения: функциональная зависимость баллов от значения
 * характеристики. Предельные значения (п. 18, 21) заменяют в формуле
 * соответствующую границу диапазона, а значения за пределом оцениваются
 * как предельные.
 */
export const scoreCharacteristicValues = (
  rawValues: number[],
  options: CharacteristicOptions,
): number[] => {
  if (rawValues.length === 0) {
    return [];
  }

  const limitMin = options.limitMin;
  const limitMax = options.limitMax;

  // Пункт 21: значение выше/ниже предела оценивается как предел
  const values = rawValues.map((value) => {
    let result = value;

    if (limitMin !== undefined && result < limitMin) {
      result = limitMin;
    }
    if (limitMax !== undefined && result > limitMax) {
      result = limitMax;
    }

    return result;
  });

  const min = Math.min(...values);
  const max = Math.max(...values);
  const lower = limitMin !== undefined ? limitMin : min;
  const upper = limitMax !== undefined ? limitMax : max;

  if (upper === lower) {
    return values.map(() => 100);
  }

  return values.map((value) => {
    const score =
      options.best === "min"
        ? ((upper - value) / (upper - lower)) * 100
        : ((value - lower) / (upper - lower)) * 100;

    return round2(Math.max(0, Math.min(100, score)));
  });
};

/** Оценка по шкале (п. 22): балл берётся из шага, выбранного участником */
export const scoreScaleValue = (
  indicator: Indicator,
  optionId: string | undefined,
): number => {
  const steps = parseScaleText(indicator.scaleText);
  const step = steps.find(
    (item) => item.label === String(optionId ?? "").trim(),
  );

  return step ? step.score : 0;
};

export interface EvaluatedBid extends Bid {
  // Баллы по каждому критерию
  criterionScores: Record<string, number>;
  totalScore: number;
  rank: number;
}

export interface BidEvaluationResult {
  bids: EvaluatedBid[];
  winnerId?: string | number;
}

const criterionKey = (criterion: Criterion, index: number): string =>
  String(criterion.id ?? `criterion-${index}`);

/**
 * Итоговая оценка заявок: баллы по критериям, взвешенный итог и места.
 * Итог = сумма (балл по критерию × значимость критерия / 100).
 */
export const evaluateBids = (
  config: Pick<BidEvaluation, "nmck" | "criteria" | "bids">,
): BidEvaluationResult => {
  const enabled = config.criteria.filter(
    (criterion) =>
      criterion.enabled && parseNumber(criterion.weightPercent) > 0,
  );

  const criterionScores: Record<string, number>[] = config.bids.map(() => ({}));

  enabled.forEach((criterion, criterionIndex) => {
    const key = criterionKey(criterion, criterionIndex);

    if (criterion.type === "price") {
      const prices = config.bids.map((bid) => parseNumber(bid.price));
      const scores = scorePriceBids(prices, parseNumber(config.nmck));

      scores.forEach((score, bidIndex) => {
        criterionScores[bidIndex][key] = score;
      });

      return;
    }

    const indicators = criterion.indicators.filter(
      (indicator) => parseNumber(indicator.weightPercent) > 0,
    );

    // Баллы по каждому показателю считаются по всем заявкам сразу: формулы
    // п. 20 опираются на минимальное и максимальное предложение
    const indicatorScores = new Map<string, number[]>();

    indicators.forEach((indicator) => {
      const indicatorId = String(indicator.id ?? indicator.name);

      if (indicator.scoring === "scale") {
        indicatorScores.set(
          indicatorId,
          config.bids.map((bid) =>
            scoreScaleValue(indicator, bid.values?.[indicatorId]?.optionId),
          ),
        );

        return;
      }

      const values = config.bids.map((bid) =>
        parseNumber(bid.values?.[indicatorId]?.value),
      );

      indicatorScores.set(
        indicatorId,
        scoreCharacteristicValues(values, {
          best: indicator.best,
          limitMin: indicator.limitMin,
          limitMax: indicator.limitMax,
        }),
      );
    });

    config.bids.forEach((_bid, bidIndex) => {
      const criterionScore = indicators.reduce((total, indicator) => {
        const indicatorId = String(indicator.id ?? indicator.name);
        const score = indicatorScores.get(indicatorId)?.[bidIndex] ?? 0;

        return total + (score * parseNumber(indicator.weightPercent)) / 100;
      }, 0);

      criterionScores[bidIndex][key] = round2(criterionScore);
    });
  });

  const evaluated = config.bids.map((bid, bidIndex) => {
    const totalScore = round2(
      enabled.reduce((total, criterion, criterionIndex) => {
        const key = criterionKey(criterion, criterionIndex);
        const score = criterionScores[bidIndex][key] ?? 0;

        return total + (score * parseNumber(criterion.weightPercent)) / 100;
      }, 0),
    );

    return {
      ...bid,
      criterionScores: criterionScores[bidIndex],
      totalScore,
      rank: 0,
    };
  });

  // Места: равные баллы делят место (порядок — по индексу заявки)
  const sorted = [...evaluated].sort((a, b) => b.totalScore - a.totalScore);
  let previousScore: number | undefined;
  let previousRank = 0;

  sorted.forEach((bid, index) => {
    if (previousScore !== undefined && bid.totalScore === previousScore) {
      bid.rank = previousRank;
    } else {
      bid.rank = index + 1;
      previousRank = bid.rank;
      previousScore = bid.totalScore;
    }
  });

  const winner = sorted[0];

  return {
    bids: evaluated,
    winnerId: winner?.id ?? (winner ? 0 : undefined),
  };
};

// === Проверки конфигурации ===

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
}

const sumWeights = (items: { weightPercent: number | string }[]): number =>
  round2(
    items.reduce((total, item) => total + parseNumber(item.weightPercent), 0),
  );

// Категории, для которых опыт работы обязателен (п. 31–35 Положения)
const EXPERIENCE_REQUIRED_CATEGORIES = [
  "construction",
  "road",
  "building_repair",
  "children_recreation",
  "security",
];

/**
 * Проверки перед сохранением/публикацией: то, что в Положении сформулировано
 * императивно. Ошибки блокируют публикацию, предупреждения — нет.
 */
export const validateBidEvaluation = (
  config: Pick<
    BidEvaluation,
    "procedureKind" | "objectCategory" | "criteria" | "bids" | "status" | "nmck"
  >,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const enabled = config.criteria.filter((criterion) => criterion.enabled);
  const error = (message: string) => issues.push({ level: "error", message });
  const warning = (message: string) =>
    issues.push({ level: "warning", message });

  if (enabled.length === 0) {
    error("Не выбран ни один критерий оценки.");

    return issues;
  }

  // Пункт 4: при проведении аукциона применяется только цена
  if (config.procedureKind === "auction") {
    if (enabled.length !== 1 || enabled[0].type !== "price") {
      error(
        "При проведении аукциона применяется только критерий «цена контракта, сумма цен единиц товара, работы, услуги» (п. 4 Положения).",
      );
    }

    if (Math.abs(parseNumber(enabled[0]?.weightPercent) - 100) > 0.01) {
      warning("Для аукциона значимость цены принимается равной 100%.");
    }

    if (enabled.some((criterion) => criterion.indicators.length > 0)) {
      error(
        "По критерию «цена» показатели оценки не применяются (п. 11 Положения).",
      );
    }

    return issues;
  }

  // Пункт 5: конкурс — не менее двух критериев, один из них цена
  if (enabled.length < 2) {
    error(
      "При проведении конкурса применяются не менее двух критериев, одним из которых должна быть цена (п. 5, подп. «а» Положения).",
    );
  }

  if (!enabled.some((criterion) => criterion.type === "price")) {
    warning(
      "Критерий «цена контракта...» не применяется. Это допустимо только при закупке по регулируемым ценам (тарифам) (п. 5, подп. «б» Положения).",
    );
  }

  const weightSum = sumWeights(enabled);

  if (Math.abs(weightSum - 100) > 0.01) {
    error(
      `Сумма значимости критериев — ${weightSum}%, должна составлять 100% (п. 5, подп. «д» Положения).`,
    );
  }

  // Приложение N 2: предельные величины значимости
  const limits = objectCategoryLimits(config.objectCategory);
  const price = enabled.find((criterion) => criterion.type === "price");
  const expenses = enabled.find((criterion) => criterion.type === "expenses");

  if (price && parseNumber(price.weightPercent) < limits.minPrice) {
    error(
      `Минимальная значимость критерия «цена» для категории «${limits.label}» — ${limits.minPrice}% (приложение N 2 к Положению).`,
    );
  }

  if (
    expenses &&
    limits.maxExpenses !== null &&
    parseNumber(expenses.weightPercent) > limits.maxExpenses
  ) {
    error(
      `Максимальная значимость критерия «расходы» для категории «${limits.label}» — ${limits.maxExpenses}% (приложение N 2 к Положению).`,
    );
  }

  const nonCost = enabled.filter(
    (criterion) =>
      criterion.type === "characteristics" ||
      criterion.type === "qualification",
  );
  const nonCostSum = sumWeights(nonCost);

  if (nonCostSum > limits.maxNonCost) {
    error(
      `Сумма значимости характеристик объекта и квалификации — ${nonCostSum}%, максимум для категории «${limits.label}» — ${limits.maxNonCost}% (приложение N 2 к Положению).`,
    );
  }

  if (
    expenses &&
    price &&
    parseNumber(expenses.weightPercent) > parseNumber(price.weightPercent)
  ) {
    error(
      "Значимость критерия «расходы» не должна превышать значимость критерия «цена» (п. 5, подп. «г» Положения).",
    );
  }

  // Показатели: суммы значимости и обязательность
  enabled
    .filter((criterion) => criterion.type !== "price")
    .forEach((criterion) => {
      const indicators = criterion.indicators;

      if (indicators.length === 0) {
        error(
          `По критерию «${criterionShortLabels[criterion.type]}» укажите показатели оценки (п. 7 Положения).`,
        );

        return;
      }

      const indicatorsSum = sumWeights(indicators);

      if (Math.abs(indicatorsSum - 100) > 0.01) {
        error(
          `Сумма значимости показателей по критерию «${criterionShortLabels[criterion.type]}» — ${indicatorsSum}%, должна составлять 100% (п. 7, подп. «б» Положения).`,
        );
      }

      indicators.forEach((indicator) => {
        const allowed = indicatorKindsByCriterion[criterion.type];

        if (!allowed.includes(indicator.kind)) {
          error(
            `Показатель «${indicator.name}» не относится к критерию «${criterionShortLabels[criterion.type]}».`,
          );
        }

        if (
          indicator.scoring === "scale" &&
          parseScaleText(indicator.scaleText).length === 0
        ) {
          error(
            `Показатель «${indicator.name}»: задайте шкалу оценки (п. 22 Положения).`,
          );
        }
      });
    });

  // Пункт 11 «в»: показатели по цене не применяются
  if (price && price.indicators.length > 0) {
    error(
      "По критерию «цена» показатели оценки не применяются (п. 11 Положения).",
    );
  }

  // Пункты 31–35: для отдельных видов закупок обязателен опыт работы
  if (EXPERIENCE_REQUIRED_CATEGORIES.includes(config.objectCategory)) {
    const qualification = enabled.find(
      (criterion) => criterion.type === "qualification",
    );

    if (qualification) {
      const experience = qualification.indicators.find(
        (indicator) => indicator.kind === "experience",
      );

      if (!experience) {
        error(
          "Для этой категории закупки обязательно применяется показатель «опыт работы, связанный с предметом контракта» (п. 31–35 Положения).",
        );
      } else if (parseNumber(experience.weightPercent) < 60) {
        error(
          "Значимость показателя «опыт работы» должна составлять не менее 60% (п. 31–35 Положения).",
        );
      }
    }
  }

  // Заявки: цена и значения показателей
  // Заявки появляются после вскрытия конвертов: требование относится только
  // к подведению итогов, а не к публикации порядка оценки
  if (config.bids.length < 2 && config.status === "evaluated") {
    error("Для оценки заявок нужно не менее двух заявок.");
  }

  config.bids.forEach((bid, index) => {
    if (price && String(bid.price ?? "").trim() === "") {
      warning(
        `Заявка № ${index + 1} («${bid.participantName}»): не указана цена контракта.`,
      );
    }
  });

  if (parseNumber(config.nmck) <= 0 && price) {
    warning(
      "Не указана начальная (максимальная) цена контракта: формула п. 9 «б» и п. 10 Положения не применится.",
    );
  }

  return issues;
};

export const hasValidationErrors = (issues: ValidationIssue[]): boolean =>
  issues.some((issue) => issue.level === "error");

// === Сортировка ===

export const sortBidEvaluations = (list: BidEvaluation[]): BidEvaluation[] =>
  [...list].sort((a, b) =>
    String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
      String(a.updatedAt ?? a.createdAt ?? ""),
    ),
  );

// === Приведение данных формы к полной модели ===

/**
 * Критерии всегда хранятся четырьмя слотами в порядке п. 3 Положения:
 * так индексы полей формы остаются стабильными, а состав критериев
 * (например, для аукциона — только цена) задаётся флагом `enabled`.
 */
export const normalizeCriteria = (
  criteria: Criterion[] | undefined,
): Criterion[] =>
  CRITERION_TYPES.map((type, typeIndex) => {
    const source = (criteria ?? []).find((item) => item.type === type);

    if (!source) {
      return emptyCriterion(type);
    }

    return {
      ...emptyCriterion(type),
      ...source,
      id: source.id ?? `crit-${type}-${typeIndex}`,
      indicators: (source.indicators ?? []).map((indicator, index) => ({
        ...indicator,
        id: indicator.id ?? `ind-${type}-${index}`,
      })),
    };
  });

/**
 * Значения формы приходят частичными (z.coerce/предобработка чисел), поэтому
 * перед расчётом и сохранением собираем полный документ.
 */
export const normalizeEvaluation = (
  value?: (Partial<BidEvaluation> & { criteria?: Criterion[] }) | null,
): BidEvaluation => {
  const base = emptyBidEvaluation(value?.organizationId ?? "");

  return {
    ...base,
    ...value,
    organizationId: value?.organizationId ?? base.organizationId,
    criteria: normalizeCriteria(value?.criteria),
    bids: (value?.bids ?? []).map((bid, index) => ({
      ...bid,
      id: bid.id ?? `bid-${index}`,
      values: bid.values ?? {},
    })) as Bid[],
    legalActId: value?.legalActId ?? BID_EVALUATION_LEGAL_ACT_ID,
  } as BidEvaluation;
};
