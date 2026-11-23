/**
 * Правила применения постановления Правительства РФ от 29.12.2021 № 2571
 * «О дополнительных требованиях к участникам закупки отдельных видов товаров,
 * работ, услуг для обеспечения государственных и муниципальных нужд, а также
 * об информации и документах, подтверждающих соответствие участников закупки
 * указанным дополнительным требованиям…».
 *
 * Что здесь есть и зачем:
 * - каталог позиций приложения (номер, раздел, вид объекта, порог НМЦК по
 *   п. 3 «а», требование к опыту, подтверждающие документы);
 * - сопоставление объекта закупки (ОКПД2 / наименование) с позицией;
 * - валидатор связей «объект → позиция → НМЦК → флаг ч. 2 ст. 31 → документы»;
 * - генератор текста требования для графы «Дополнительные требования».
 *
 * Каталог намеренно содержит только те позиции, которые встречаются в
 * закупках проекта (строительство, капремонт, дороги, охрана, сохранение
 * объектов культурного наследия). Остальные позиции приложения добавляются
 * сюда же по той же схеме: номер, раздел, порог, документы.
 *
 * Источники: текст постановления и приложения (в редакции, действующей на
 * 23.11.2026) — см. PP2571_SOURCE.references.
 */

/** Уровень нужд заказчика: от него зависят пороги НМЦК по п. 3 «а». */
export type Pp2571NeedsLevel = "federal" | "regional";

/** Порог НМЦК, при превышении которого позиция применяется. */
export interface Pp2571Threshold {
  /** Нужды Российской Федерации (федеральные). */
  federal: number;
  /** Нужды субъекта РФ и муниципальные. */
  regional: number;
  /**
   * Позиции 24–31 и 33–35 «могут не применяться», если НМЦК не превышает
   * 500 тыс. руб. (п. 3 «а»). При большей НМЦК применяются обязательно.
   */
  canBeSkippedBelow?: number;
}

/** Требование к опыту исполнения договора (графа приложения). */
export interface Pp2571ExperienceRule {
  /** Требуется опыт исполнения договора. */
  required: boolean;
  /** Период, за который учитывается опыт (п. 3 «б»), лет. */
  termYears: number;
  /**
   * Минимальная цена исполненных обязательств в процентах от НМЦК.
   * Порог ступенчатый: 50 % до 100 млн, 40 % до 500 млн, 30 % далее
   * (приложение, позиции 6–13, 17, 18).
   */
  shareTiers?: Array<{ nmckUpTo: number | null; share: number }>;
}

/** Позиция приложения к ПП РФ № 2571. */
export interface Pp2571Position {
  /** Стабильный идентификатор для хранения в СЗ и извещении. */
  id: string;
  /** Номер позиции приложения. */
  number: number;
  /** Раздел приложения (римская нумерация). */
  section: string;
  /** Заголовок раздела — для подсказок в интерфейсе. */
  sectionTitle: string;
  /** Наименование вида товаров, работ, услуг (графа приложения). */
  objectName: string;
  /** Человекочитаемая метка позиции (совместима со старыми записями). */
  label: string;
  /** Порог НМЦК. */
  threshold: Pp2571Threshold;
  /** Требование к опыту. */
  experience: Pp2571ExperienceRule;
  /** Документы, подтверждающие соответствие (графа приложения). */
  documents: string[];
  /** Лицензии/разрешения, если требование установлено приложением. */
  licenses?: string[];
  /** Префиксы ОКПД2, по которым объект относится к позиции. */
  okpd2Prefixes: string[];
  /** Проверка наименования объекта закупки (ОКПД2/КТРУ/предмет). */
  matchesObjectName: (text: string) => boolean;
  /** Чем специфичнее правило, тем выше приоритет при сопоставлении. */
  priority: number;
  /** Норма-основание для сообщений валидатора. */
  legalRef: string;
}

const hasCulturalHeritage = (text: string) =>
  /культурн[а-яё]*\s+наслед|реставрац/.test(text);

const hasRoad = (text: string) => /автомобильн[а-яё]*\s+дорог/.test(text);

const hasRoadRepair = (text: string) =>
  hasRoad(text) && /ремонт|содержан/.test(text) && !/капитальн/.test(text);

const hasRoadBuild = (text: string) =>
  hasRoad(text) && /строительств|реконструкц|капитальн/.test(text);

const hasMajorRepair = (text: string) =>
  /капитальн[а-яё]*\s+ремонт/.test(text) && !hasRoad(text);

const hasConstruction = (text: string) =>
  /строительств|реконструкц/.test(text) &&
  !hasRoad(text) &&
  !/капитальн[а-яё]*\s+ремонт/.test(text);

const hasSecurityServices = (text: string) => /охран/.test(text);

/**
 * Каталог позиций приложения, применяемых в закупках проекта.
 *
 * Порядок в массиве не важен: сопоставление идёт по `priority`, поэтому
 * дорожные позиции проверяются раньше общих строительных.
 */
export const PP2571_POSITIONS: Pp2571Position[] = [
  {
    id: "pp2571-1",
    number: 1,
    section: "I",
    sectionTitle:
      "Дополнительные требования при закупке работ по сохранению объектов культурного наследия",
    objectName: "Работы по сохранению объектов культурного наследия",
    label:
      "Позиция 1 разд. I ПП РФ № 2571 (работы по сохранению объектов культурного наследия)",
    threshold: { federal: 500_000, regional: 500_000 },
    experience: { required: true, termYears: 3 },
    documents: [
      "исполненный договор на выполнение работ по сохранению объекта культурного наследия",
      "акт приёмки выполненных работ по сохранению объекта культурного наследия",
      "акт (акты) выполненных работ, подтверждающий цену выполненных работ",
    ],
    licenses: [
      "лицензия на осуществление деятельности по сохранению объектов культурного наследия",
    ],
    okpd2Prefixes: ["91.03", "71.11.23"],
    matchesObjectName: hasCulturalHeritage,
    priority: 30,
    legalRef: "п. 3 «а» постановления, позиция 1 приложения",
  },
  {
    id: "pp2571-17",
    number: 17,
    section: "III",
    sectionTitle:
      "Дополнительные требования при закупке работ в сфере дорожной деятельности",
    objectName:
      "Работы по строительству, реконструкции, капитальному ремонту автомобильной дороги",
    label:
      "Позиция 17 разд. III ПП РФ № 2571 (работы по строительству, реконструкции, капитальному ремонту автомобильной дороги)",
    threshold: { federal: 10_000_000, regional: 5_000_000 },
    experience: {
      required: true,
      termYears: 3,
      shareTiers: [
        { nmckUpTo: 100_000_000, share: 50 },
        { nmckUpTo: 500_000_000, share: 40 },
        { nmckUpTo: null, share: 30 },
      ],
    },
    documents: [
      "исполненный договор строительного подряда (строительство, реконструкция или капитальный ремонт автомобильной дороги)",
      "акт приёмки объекта капитального строительства",
      "акт (акты) выполненных работ, подтверждающий цену выполненных работ",
      "разрешение на ввод объекта в эксплуатацию или решение о технической готовности линейного объекта к временной эксплуатации",
    ],
    okpd2Prefixes: ["42.11"],
    matchesObjectName: hasRoadBuild,
    priority: 20,
    legalRef: "п. 3 «а» постановления, позиция 17 приложения",
  },
  {
    id: "pp2571-18",
    number: 18,
    section: "III",
    sectionTitle:
      "Дополнительные требования при закупке работ в сфере дорожной деятельности",
    objectName: "Работы по ремонту, содержанию автомобильной дороги",
    label:
      "Позиция 18 разд. III ПП РФ № 2571 (работы по ремонту, содержанию автомобильной дороги)",
    threshold: { federal: 10_000_000, regional: 5_000_000 },
    experience: {
      required: true,
      termYears: 3,
      shareTiers: [
        { nmckUpTo: 100_000_000, share: 50 },
        { nmckUpTo: 500_000_000, share: 40 },
        { nmckUpTo: null, share: 30 },
      ],
    },
    documents: [
      "исполненный договор на выполнение работ по ремонту или содержанию автомобильной дороги",
      "акт выполненных работ, подтверждающий цену выполненных работ",
    ],
    okpd2Prefixes: ["42.11"],
    matchesObjectName: hasRoadRepair,
    priority: 21,
    legalRef: "п. 3 «а» постановления, позиция 18 приложения",
  },
  {
    id: "pp2571-10",
    number: 10,
    section: "II",
    sectionTitle:
      "Дополнительные требования при закупке работ в сфере строительства",
    objectName:
      "Работы по капитальному ремонту объекта капитального строительства",
    label:
      "Позиция 10 разд. II ПП РФ № 2571 (работы по капитальному ремонту объекта капитального строительства)",
    threshold: { federal: 10_000_000, regional: 5_000_000 },
    experience: {
      required: true,
      termYears: 3,
      shareTiers: [
        { nmckUpTo: 100_000_000, share: 50 },
        { nmckUpTo: 500_000_000, share: 40 },
        { nmckUpTo: null, share: 30 },
      ],
    },
    documents: [
      "исполненный договор на выполнение работ по капитальному ремонту объекта капитального строительства",
      "акт приёмки объекта капитального строительства",
      "акт (акты) выполненных работ, подтверждающий цену выполненных работ",
    ],
    okpd2Prefixes: ["41", "42", "43"],
    matchesObjectName: hasMajorRepair,
    priority: 12,
    legalRef: "п. 3 «а» постановления, позиция 10 приложения",
  },
  {
    id: "pp2571-6",
    number: 6,
    section: "II",
    sectionTitle:
      "Дополнительные требования при закупке работ в сфере строительства",
    objectName:
      "Работы по строительству, реконструкции объекта капитального строительства",
    label:
      "Позиция 6 разд. II ПП РФ № 2571 (работы по строительству, реконструкции объекта капитального строительства)",
    threshold: { federal: 10_000_000, regional: 5_000_000 },
    experience: {
      required: true,
      termYears: 3,
      shareTiers: [
        { nmckUpTo: 100_000_000, share: 50 },
        { nmckUpTo: 500_000_000, share: 40 },
        { nmckUpTo: null, share: 30 },
      ],
    },
    documents: [
      "исполненный договор строительного подряда (строительство или реконструкция объекта капитального строительства)",
      "акт приёмки объекта капитального строительства",
      "акт (акты) выполненных работ, подтверждающий цену выполненных работ",
      "разрешение на ввод объекта в эксплуатацию",
    ],
    okpd2Prefixes: ["41", "42", "43"],
    matchesObjectName: hasConstruction,
    priority: 10,
    legalRef: "п. 3 «а» постановления, позиция 6 приложения",
  },
  {
    id: "pp2571-34",
    number: 34,
    section: "VI",
    sectionTitle: "Дополнительные требования при закупке отдельных видов услуг",
    objectName: "Услуги по обеспечению охраны объектов (территорий)",
    label:
      "Позиция 34 разд. VI ПП РФ № 2571 (услуги по обеспечению охраны объектов)",
    threshold: {
      federal: 500_000,
      regional: 500_000,
      canBeSkippedBelow: 500_000,
    },
    experience: { required: true, termYears: 3 },
    documents: [
      "исполненный договор на оказание услуг по охране объектов (территорий)",
      "акт оказанных услуг",
    ],
    licenses: ["лицензия на осуществление частной охранной деятельности"],
    okpd2Prefixes: ["80.20", "80"],
    matchesObjectName: hasSecurityServices,
    priority: 5,
    legalRef: "п. 3 «а» постановления, позиция 34 приложения",
  },
];

/** Идентификаторы позиций каталога. */
export const PP2571_POSITION_IDS = PP2571_POSITIONS.map(
  (position) => position.id,
);

/**
 * Человекочитаемые метки позиций — для выгрузки и обратной совместимости
 * со старыми записями, где в `pp2571Positions` лежали готовые строки.
 */
export const PP2571_POSITION_LABELS = PP2571_POSITIONS.map(
  (position) => position.label,
);

/** Источник правил: что именно и на какую дату сверялось. */
export const PP2571_SOURCE = {
  act: "Постановление Правительства РФ от 29.12.2021 № 2571",
  appendix: "Приложение к постановлению",
  checkedAt: "2026-11-23",
  references: [
    "https://rulaws.ru/goverment/Postanovlenie-Pravitelstva-RF-ot-29.12.2021-N-2571/",
    "https://sudact.ru/law/postanovlenie-pravitelstva-rf-ot-29122021-n-2571/",
  ],
} as const;

/** Нормализация кода ОКПД2: «42,11.21 » → «42.11.21». */
export const normalizeOkpd2Code = (code?: string): string =>
  (code ?? "").trim().replace(/,/g, ".").replace(/\s+/g, "");

/**
 * Поиск позиции каталога по сохранённому значению.
 *
 * Поддерживаются три формы записи, чтобы старые СЗ не теряли требования:
 * - идентификатор каталога («pp2571-6»);
 * - полная метка позиции («Позиция 6 разд. II ПП РФ № 2571 (…)»);
 * - просто номер («6») или упоминание номера в произвольной строке.
 */
export const resolvePp2571Position = (
  value?: string,
): Pp2571Position | undefined => {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;

  const direct = PP2571_POSITIONS.find(
    (position) =>
      position.id === raw || position.label.toLowerCase() === raw.toLowerCase(),
  );
  if (direct) return direct;

  const numberMatch =
    raw.match(/позиц[а-яё]*\s+(\d{1,2})/i) ?? raw.match(/^(\d{1,2})$/);
  if (!numberMatch) return undefined;

  const number = Number(numberMatch[1]);
  const byNumber = PP2571_POSITIONS.filter(
    (position) => position.number === number,
  );
  if (byNumber.length === 0) return undefined;

  // Номер позиции повторяется в разных разделах — уточняем по разделу.
  const sectionMatch = raw.match(/разд\.?\s*([IVX]+)/i);
  if (byNumber.length > 1 && sectionMatch) {
    const bySection = byNumber.find(
      (position) =>
        position.section.toLowerCase() === sectionMatch[1].toLowerCase(),
    );
    if (bySection) return bySection;
  }

  return byNumber[0];
};

/** Приведение массива позиций к идентификаторам каталога без дублей. */
export const normalizePp2571Positions = (values?: string[]): string[] => {
  const result: string[] = [];
  (values ?? []).forEach((value) => {
    const position = resolvePp2571Position(value);
    if (position && !result.includes(position.id)) result.push(position.id);
  });
  return result;
};

/** Подпись позиции по любому сохранённому значению. */
export const pp2571PositionLabel = (value?: string): string =>
  resolvePp2571Position(value)?.label ?? (value ?? "");

/**
 * ПП РФ № 2571 применяется только при конкурентных способах (п. 3 «а»).
 * Незаполненный способ не считается нарушением: документ ещё в работе.
 */
const NON_COMPETITIVE_PLACING_WAYS = new Set(["EP93", "EZT20", "EMZ2025"]);

export const isCompetitivePlacingWay = (code?: string): boolean => {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) return true;
  return !NON_COMPETITIVE_PLACING_WAYS.has(normalized);
};

/** Порог НМЦК для позиции с учётом уровня нужд (п. 3 «а»). */
export const pp2571Threshold = (
  position: Pp2571Position,
  level: Pp2571NeedsLevel = "regional",
): number => position.threshold[level];

/** Минимальная доля опыта в процентах от НМЦК (приложение). */
export const pp2571ExperienceShare = (
  position: Pp2571Position,
  nmck: number,
): number | undefined => {
  const tiers = position.experience.shareTiers;
  if (!tiers || tiers.length === 0) return undefined;
  const tier = tiers.find((item) => item.nmckUpTo === null || nmck <= item.nmckUpTo);
  return (tier ?? tiers[tiers.length - 1]).share;
};

/** Форматирование суммы для сообщений валидатора и подсказок. */
export const formatPp2571Money = (value: number): string =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} руб.`;

/** Объект закупки в объёме, нужном для сопоставления с приложением. */
export interface Pp2571ObjectInput {
  name?: string;
  okpd2Code?: string;
  okpd2Name?: string;
  ktruCode?: string;
  ktruName?: string;
}

/** Основание, по которому объект отнесён к позиции. */
export type Pp2571MatchConfidence = "code" | "keyword";

export interface Pp2571ObjectMatch {
  position: Pp2571Position;
  confidence: Pp2571MatchConfidence;
  reason: string;
}

const objectHaystack = (item: Pp2571ObjectInput): string =>
  [item.name, item.okpd2Name, item.ktruName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

/**
 * Сопоставление одного объекта закупки с позицией приложения.
 *
 * Сначала проверяется наименование (ОКПД2/КТРУ/предмет), затем код ОКПД2:
 * наименование точнее различает строительство, капремонт и дорожные работы,
 * а код страхует от пустых формулировок. Из совпадений побеждает более
 * специфичное правило (priority), а совпадение по наименованию — кодовое.
 */
export const matchPp2571Position = (
  item: Pp2571ObjectInput,
): Pp2571ObjectMatch | undefined => {
  const text = objectHaystack(item);
  const code = normalizeOkpd2Code(item.okpd2Code);

  const candidates = [...PP2571_POSITIONS].sort(
    (a, b) => b.priority - a.priority,
  );

  let best: Pp2571ObjectMatch | undefined;

  for (const position of candidates) {
    const keywordHit = position.matchesObjectName(text);
    const codeHit =
      code !== "" &&
      position.okpd2Prefixes.some((prefix) => code.startsWith(prefix));

    if (!keywordHit && !codeHit) continue;

    const candidate: Pp2571ObjectMatch = {
      position,
      confidence: keywordHit ? "keyword" : "code",
      reason: keywordHit
        ? `наименование объекта указывает на позицию ${position.number} приложения`
        : `код ОКПД2 ${code} относится к позиции ${position.number} приложения`,
    };

    if (!best || (best.confidence === "code" && keywordHit)) {
      best = candidate;
    }
  }

  return best;
};

/** Входные данные для определения применимости позиций в СЗ/извещении. */
export interface Pp2571ApplicabilityInput {
  nmck: number;
  level?: Pp2571NeedsLevel;
  placingWayCode?: string;
  items: Pp2571ObjectInput[];
  selectedPositions?: string[];
}

/** Применимость одной позиции приложения к конкретной закупке. */
export interface Pp2571ApplicabilityItem {
  position: Pp2571Position;
  /** Индексы объектов, из которых следует позиция. */
  matchedItems: number[];
  /** Чем подтверждено соответствие: кодом ОКПД2 или наименованием. */
  matchedBy: Pp2571MatchConfidence | "none";
  reason?: string;
  /** Порог НМЦК по п. 3 «а» для текущего уровня нужд. */
  threshold: number;
  nmckExceeds: boolean;
  competitive: boolean;
  selected: boolean;
  /** Позиция применима: объект соответствует, НМЦК выше порога, способ конкурентный. */
  applicable: boolean;
}

/**
 * Применимость всех позиций каталога к закупке.
 *
 * Функция используется интерфейсом (подсказки и автоподбор) и валидатором,
 * поэтому правила порога и сопоставления объектов не дублируются.
 */
export const getPp2571Applicability = (
  input: Pp2571ApplicabilityInput,
): Pp2571ApplicabilityItem[] => {
  const level = input.level ?? "regional";
  const selected = normalizePp2571Positions(input.selectedPositions);
  const competitive = isCompetitivePlacingWay(input.placingWayCode);

  return PP2571_POSITIONS.map((position) => {
    const matchedItems: number[] = [];
    let matchedBy: Pp2571ApplicabilityItem["matchedBy"] = "none";
    let reason: string | undefined;

    input.items.forEach((item, index) => {
      const match = matchPp2571Position(item);
      if (!match || match.position.id !== position.id) return;
      matchedItems.push(index);
      if (match.confidence === "keyword" || matchedBy === "none") {
        matchedBy = match.confidence;
        reason = match.reason;
      }
    });

    const threshold = pp2571Threshold(position, level);
    const nmckExceeds = input.nmck > threshold;

    return {
      position,
      matchedItems,
      matchedBy,
      reason,
      threshold,
      nmckExceeds,
      competitive,
      selected: selected.includes(position.id),
      applicable: matchedItems.length > 0 && nmckExceeds && competitive,
    };
  });
};

/**
 * Текст требования для графы «Дополнительные требования к участникам
 * закупки» по выбранным позициям приложения.
 *
 * Собирает срок опыта (п. 3 «б»), минимальную долю от НМЦК (приложение),
 * лицензии и перечень подтверждающих документов, чтобы заказчик не
 * формулировал требование вручную и не терял обязательные документы.
 */
export const buildPp2571RequirementText = (
  positionValues: string[] | undefined,
  nmck: number,
): string => {
  const positions = normalizePp2571Positions(positionValues)
    .map((id) => resolvePp2571Position(id))
    .filter((position): position is Pp2571Position => Boolean(position));

  if (positions.length === 0) return "";

  return positions
    .map((position) => {
      const share = pp2571ExperienceShare(position, nmck);
      const parts = [
        `Позиция ${position.number} приложения (${position.objectName.toLowerCase()}):`,
        `опыт исполнения договора за последние ${position.experience.termYears} года до даты подачи заявки.`,
      ];

      if (share !== undefined) {
        parts.push(
          `Цена выполненных работ (оказанных услуг) должна составлять не менее ${share} % начальной (максимальной) цены контракта.`,
        );
      }
      if (position.licenses && position.licenses.length > 0) {
        parts.push(`Дополнительно требуется ${position.licenses.join(", ")}.`);
      }
      parts.push(
        `Подтверждающие документы: ${position.documents.join("; ")}.`,
      );

      return parts.join(" ");
    })
    .join("\n\n");
};

/** Уровень замечания: ошибка блокирует сохранение, предупреждение — нет. */
export type Pp2571IssueLevel = "error" | "warning";

export interface Pp2571Issue {
  /** Код правила — по нему пишутся тесты и фильтры в интерфейсе. */
  code: string;
  level: Pp2571IssueLevel;
  /** Путь поля формы, к которому относится замечание. */
  path: Array<string | number>;
  message: string;
  /** Пункт постановления, из которого следует проверка. */
  legalRef: string;
}

/** Входные данные валидатора требований ПП РФ № 2571. */
export interface Pp2571ValidationInput {
  /** НМЦК закупки в рублях (0 — ещё не рассчитана). */
  nmck: number;
  level?: Pp2571NeedsLevel;
  placingWayCode?: string;
  items?: Pp2571ObjectInput[];
  selectedPositions?: string[];
  additionalRequirementsPart2Art31?: boolean;
  additionalRequirementsPart2Art31Text?: string;
  point4Requirement?: boolean;
  point4RequirementText?: string;
  requirementsPart2_1Art31?: boolean;
  requirementsPart1_1Art31?: boolean;
  sanctionsRnpRequirement?: boolean;
  /**
   * Черновик СЗ: требования, которые ещё нельзя выполнить (НМЦК, объекты),
   * дают предупреждение вместо ошибки, чтобы заявку можно было сохранить.
   */
  isDraft?: boolean;
  /**
   * false — пороги НМЦК и связи с объектами остаются предупреждениями.
   * Используется в извещении, где настройки приходят из СЗ и не должны
   * блокировать уже созданный документ.
   */
  strict?: boolean;
}

/**
 * Проверки требований ПП РФ № 2571 для СЗ и извещения.
 *
 * Каждое правило содержит ссылку на норму и понятное сообщение с номерами
 * позиций, порогами и суммами. Возвращаются и ошибки, и предупреждения:
 * ошибки попадают в zod-схему и блокируют сохранение, предупреждения
 * показываются в интерфейсе и не мешают работе.
 */
export const validatePp2571Requirements = (
  input: Pp2571ValidationInput,
): Pp2571Issue[] => {
  const issues: Pp2571Issue[] = [];
  const level = input.level ?? "regional";
  const strict = input.strict ?? true;
  const items = input.items ?? [];
  const selected = normalizePp2571Positions(input.selectedPositions);
  const nmck = Number.isFinite(input.nmck) && input.nmck > 0 ? input.nmck : 0;
  const competitive = isCompetitivePlacingWay(input.placingWayCode);
  const part2Enabled = Boolean(input.additionalRequirementsPart2Art31);
  const part2Text = (input.additionalRequirementsPart2Art31Text ?? "").trim();
  const severity = (): Pp2571IssueLevel =>
    strict && !input.isDraft ? "error" : "warning";

  // 1. П. 3 «а»: постановление применяется только при конкурентных способах.
  if (selected.length > 0 && !competitive) {
    issues.push({
      code: "pp2571-non-competitive",
      level: "error",
      path: ["pp2571Positions"],
      legalRef: "п. 3 «а» постановления",
      message:
        "ПП РФ № 2571 применяется только при конкурентных способах определения поставщика. Для закупки у единственного поставщика позиции приложения не устанавливаются.",
    });
  }

  // 2. П. 1 «а»: позиции приложения — это и есть дополнительные требования
  // ч. 2 ст. 31, поэтому флаг и перечень позиций должны быть согласованы.
  if (selected.length > 0 && !part2Enabled) {
    issues.push({
      code: "pp2571-part2-flag",
      level: "error",
      path: ["additionalRequirementsPart2Art31"],
      legalRef: "п. 1 «а» постановления, ч. 2 ст. 31 Закона № 44-ФЗ",
      message:
        "Выбраны позиции приложения ПП РФ № 2571, но дополнительные требования по ч. 2 ст. 31 не включены: позиции не попадут в извещение.",
    });
  }

  if (part2Enabled && selected.length === 0) {
    issues.push({
      code: "pp2571-part2-no-positions",
      level: "error",
      path: ["pp2571Positions"],
      legalRef: "п. 1 «а» постановления",
      message:
        "Включены дополнительные требования по ч. 2 ст. 31, но не выбрана ни одна позиция приложения ПП РФ № 2571. Укажите позицию, соответствующую объекту закупки.",
    });
  }

  // 3. П. 3 «а» и приложение: выбранная позиция должна применяться к этой
  // закупке — по объекту и по порогу НМЦК. Иначе требование ограничивает
  // конкуренцию и будет снято контрольным органом.
  const objectMatches = items.map((item) => matchPp2571Position(item));
  const matchedPositionIds = new Set(
    objectMatches
      .filter((match): match is Pp2571ObjectMatch => Boolean(match))
      .map((match) => match.position.id),
  );

  selected.forEach((id) => {
    const position = resolvePp2571Position(id);
    if (!position) {
      issues.push({
        code: "pp2571-unknown-position",
        level: "error",
        path: ["pp2571Positions"],
        legalRef: "приложение к постановлению",
        message: `Позиция «${id}» не найдена в приложении ПП РФ № 2571. Выберите позицию из справочника.`,
      });
      return;
    }

    const threshold = pp2571Threshold(position, level);

    if (nmck === 0) {
      issues.push({
        code: "pp2571-nmck-missing",
        level: "warning",
        path: ["initialMaxPrice"],
        legalRef: "п. 3 «а» постановления",
        message: `Для позиции ${position.number} приложения не проверен порог применения: НМЦК не заполнена (порог — ${formatPp2571Money(threshold)}).`,
      });
      return;
    }

    if (nmck <= threshold) {
      issues.push({
        code: "pp2571-threshold",
        level: "error",
        path: ["pp2571Positions"],
        legalRef: position.legalRef,
        message: `Позиция ${position.number} приложения применяется, если НМЦК превышает ${formatPp2571Money(threshold)} — текущая НМЦК ${formatPp2571Money(nmck)}, позицию нужно исключить.`,
      });
    }

    if (items.length === 0) return;

    const matchesPosition = objectMatches.some(
      (match) => match?.position.id === position.id,
    );

    if (!matchesPosition && matchedPositionIds.size > 0) {
      const otherNumbers = Array.from(matchedPositionIds)
        .map((otherId) => resolvePp2571Position(otherId)?.number)
        .filter((number): number is number => number !== undefined)
        .sort((a, b) => a - b)
        .join(", ");

      issues.push({
        code: "pp2571-object-mismatch",
        level: severity(),
        path: ["pp2571Positions"],
        legalRef: "приложение к постановлению, ч. 2 ст. 31 Закона № 44-ФЗ",
        message: `Позиция ${position.number} приложения не соответствует объектам закупки: ОКПД2 и наименования указывают на позиции ${otherNumbers}. Требование по чужой позиции ограничивает количество участников.`,
      });
    } else if (!matchesPosition) {
      issues.push({
        code: "pp2571-object-unresolved",
        level: "warning",
        path: ["pp2571Positions"],
        legalRef: "приложение к постановлению",
        message: `Не удалось связать позицию ${position.number} приложения с объектами закупки: укажите ОКПД2 и наименование объекта так, как они названы в графе приложения.`,
      });
    }
  });

  // 4. П. 1 «а» + п. 3 «а»: если объект и НМЦК подпадают под позицию, а
  // требование не установлено, заказчик нарушает ч. 2 ст. 31.
  getPp2571Applicability({
    nmck,
    level,
    placingWayCode: input.placingWayCode,
    items,
    selectedPositions: selected,
  })
    .filter((item) => item.applicable && !item.selected)
    .forEach((item) => {
      issues.push({
        code: "pp2571-required-by-object",
        level: severity(),
        path: ["pp2571Positions"],
        legalRef: item.position.legalRef,
        message: `Объект закупки соответствует позиции ${item.position.number} приложения (${item.position.objectName.toLowerCase()}), НМЦК ${formatPp2571Money(nmck)} превышает порог ${formatPp2571Money(item.threshold)} — дополнительное требование обязательно.`,
      });
    });

  // 5. Графа приложения «Информация и документы…»: без описания перечня
  // документов требование не считается установленным.
  if (part2Enabled && !part2Text) {
    issues.push({
      code: "pp2571-documents-description",
      level: "warning",
      path: ["additionalRequirementsPart2Art31Text"],
      legalRef: "п. 1 «а» постановления, графа приложения",
      message:
        "Не описан перечень информации и документов, подтверждающих соответствие участника дополнительным требованиям. Заполните описание по графе приложения ПП РФ № 2571.",
    });
  }

  // 6. П. 4: требование применяется вместе с ч. 2.1 ст. 31 и требует текста.
  if (input.point4Requirement && !input.requirementsPart2_1Art31) {
    issues.push({
      code: "pp2571-point4-without-part2-1",
      level: "error",
      path: ["pp2571Point4Requirement"],
      legalRef: "п. 4 постановления, ч. 2.1 ст. 31 Закона № 44-ФЗ",
      message:
        "Требование по п. 4 ПП РФ № 2571 устанавливается вместе с требованиями ч. 2.1 ст. 31 Закона № 44-ФЗ. Включите ч. 2.1 ст. 31 или снимите это требование.",
    });
  }

  if (input.point4Requirement && !(input.point4RequirementText ?? "").trim()) {
    issues.push({
      code: "pp2571-point4-text",
      level: "error",
      path: ["pp2571Point4RequirementText"],
      legalRef: "п. 4 постановления",
      message:
        "Укажите текст требования по п. 4 ПП РФ № 2571: порядок подтверждения опыта (правопреемство, неустойки, документы о приёмке).",
    });
  }

  // 7. П. 1 «б»: если ч. 1.1 ст. 31 не установлена, требование об отсутствии
  // санкционного РНП устанавливается обязательно.
  if (
    input.requirementsPart1_1Art31 === false &&
    !input.sanctionsRnpRequirement
  ) {
    issues.push({
      code: "pp2571-sanctions-rnp",
      level: "error",
      path: ["sanctionsRnpRequirement"],
      legalRef: "п. 1 «б» постановления",
      message:
        "Требование ч. 1.1 ст. 31 не установлено, поэтому по п. 1 «б» ПП РФ № 2571 заказчик обязан установить требование об отсутствии в РНП информации об отказе от исполнения контракта из-за санкций.",
    });
  }

  // 8. Ч. 2.1 ст. 31 применяется при НМЦК 20 млн руб. и более; при меньшей
  // НМЦК требование преждевременно (предупреждение, не блокирует черновик).
  if (input.requirementsPart2_1Art31 && nmck > 0 && nmck < 20_000_000) {
    issues.push({
      code: "pp2571-part2-1-threshold",
      level: "warning",
      path: ["requirementsPart2_1Art31"],
      legalRef: "ч. 2.1 ст. 31 Закона № 44-ФЗ",
      message: `Требования ч. 2.1 ст. 31 устанавливаются при НМЦК 20 млн руб. и более. Текущая НМЦК — ${formatPp2571Money(nmck)}.`,
    });
  }

  return issues;
};



