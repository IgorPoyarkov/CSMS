import { z } from "zod";
import { checkOkpd2AuctionList } from "../Okpd2Ref/auctionListControl";
import type { Pp2604Mapping, Pp2604Rule } from "../Pp2604/pp2604.schema";

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

export const PROCEDURE_KINDS = ["tender", "auction", "quotation"] as const;

export type ProcedureKind = (typeof PROCEDURE_KINDS)[number];

export const procedureKindLabels: Record<ProcedureKind, string> = {
  tender: "Конкурс (в электронной форме)",
  auction: "Аукцион",
  quotation: "Запрос котировок",
};

/**
 * Применяется ли Положение N 2604 к процедуре.
 *
 * Пункт 4: при аукционе используется только критерий цены, а заявкам
 * присваивается порядковый номер — раздел II Положения не применяется.
 * Запрос котировок оценивается по цене контракта, критерии и баллы не
 * рассчитываются. Запрос предложений в 44-ФЗ с 2022 года отсутствует.
 */
export const PP_2604_APPLIES: Record<ProcedureKind, boolean> = {
  tender: true,
  auction: false,
  quotation: false,
};

export const procedureApplicabilityHint: Record<ProcedureKind, string> = {
  tender:
    "Положение применяется: не менее двух критериев, одним из которых должна быть цена (п. 5).",
  auction:
    "Положение не применяется: при аукционе заявки оцениваются только по цене, им присваивается порядковый номер (п. 4 Положения).",
  quotation:
    "Положение не применяется: в запросе котировок оценивается только цена контракта.",
};

export const pp2604Applies = (kind: ProcedureKind | undefined): boolean =>
  kind === undefined ? true : PP_2604_APPLIES[kind];

/** Способ определения поставщика из извещения/СЗ → вид процедуры */
export const procedureKindFromPlacingWay = (
  placingWayCode: string | undefined,
): ProcedureKind => {
  const code = String(placingWayCode ?? "")
    .trim()
    .toUpperCase();

  if (code.startsWith("EA")) {
    return "auction";
  }
  if (code.startsWith("ZK")) {
    return "quotation";
  }

  return "tender";
};

// === Категории объекта закупки (приложение N 2) ===

/**
 * Откуда взят текст приложения № 2. Кодов ОКПД2 в приложении нет: связи
 * строятся по наименованию позиции и наименованию кода из НСИ ЕИС и поэтому
 * всегда несут источник и признак «требует подтверждения».
 */
export const PP2604_APPENDIX2_SOURCE = {
  act: "Постановление Правительства РФ от 31.12.2021 N 2604",
  appendix: "Приложение N 2 «Предельные величины значимости критериев оценки заявок»",
  portal: "publication.pravo.gov.ru",
  eoNumber: "0001202201040005",
  pdfPages: "27–29",
  classifier: "ОКПД2, активная версия НСИ ЕИС (zakupki.gov.ru)",
} as const;

export interface ObjectCategoryLimit {
  id: string;
  label: string;
  // Номер позиции приложения № 2 — точный адрес предельных величин
  appendixRow: number;
  // Дословное (с OCR) наименование позиции приложения № 2
  appendixName: string;
  // Минимальная значимость критерия «цена контракта...»
  minPrice: number;
  // Максимальная значимость критерия «расходы»; null — критерий не применяется
  maxExpenses: number | null;
  // Максимальная сумма значимости характеристик и квалификации
  maxNonCost: number;
}

/**
 * Приложение N 2 к Положению: предельные величины значимости критериев
 * оценки. Сверено с PDF официального опубликования (страницы 27–29),
 * `eoNumber=0001202201040005`, а не с производными сайтами.
 */
export const OBJECT_CATEGORY_LIMITS: ObjectCategoryLimit[] = [
  {
    id: "goods",
    label: "Товары, кроме пищевых продуктов из позиции 13",
    appendixRow: 1,
    appendixName:
      "Товары, за исключением пищевых продуктов, предусмотренных позицией 13 настоящего приложения",
    minPrice: 70,
    maxExpenses: 10,
    maxNonCost: 30,
  },
  {
    id: "works_services",
    label: "Работы, услуги (общий случай)",
    appendixRow: 2,
    appendixName:
      "Работы, услуги, за исключением услуг, предусмотренных позициями 3 — 20 настоящего приложения",
    minPrice: 60,
    maxExpenses: 10,
    maxNonCost: 40,
  },
  {
    id: "construction",
    label:
      "Строительство, реконструкция, капитальный ремонт, снос объекта капитального строительства",
    appendixRow: 3,
    appendixName:
      "Работы по строительству, реконструкции, капитальному ремонту, сносу объекта капитального строительства (в том числе линейного объекта), включая контракт жизненного цикла",
    minPrice: 60,
    maxExpenses: null,
    maxNonCost: 40,
  },
  {
    id: "road",
    label: "Ремонт, содержание автомобильной дороги",
    appendixRow: 4,
    appendixName: "Работы по ремонту, содержанию автомобильной дороги",
    minPrice: 60,
    maxExpenses: null,
    maxNonCost: 40,
  },
  {
    id: "building_repair",
    label: "Текущий ремонт зданий, сооружений",
    appendixRow: 5,
    appendixName: "Работы по текущему ремонту зданий, сооружений",
    minPrice: 60,
    maxExpenses: null,
    maxNonCost: 40,
  },
  {
    id: "cultural_heritage",
    label:
      "Сохранение объектов культурного наследия (памятников истории и культуры)",
    appendixRow: 6,
    appendixName:
      "Работы по сохранению объектов культурного наследия (памятников истории и культуры народов Российской Федерации)",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "museum_restoration",
    label: "Реставрация музейных предметов и музейных коллекций",
    appendixRow: 7,
    appendixName:
      "Работы по реставрации музейных предметов и музейных коллекций, включенных в состав Музейного фонда Российской Федерации",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "archive_restoration",
    label:
      "Реставрация документов Архивного фонда, особо ценных и редких документов",
    appendixRow: 8,
    appendixName:
      "Работы по реставрации документов Архивного фонда Российской Федерации, особо ценных и редких документов, входящих в состав библиотечных фондов",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "literature_art",
    label: "Создание произведения литературы или искусства",
    appendixRow: 9,
    appendixName: "Работы по созданию произведения литературы или искусства",
    minPrice: 0,
    maxExpenses: null,
    maxNonCost: 100,
  },
  {
    id: "film",
    label: "Исполнение, финансирование проката или показа национального фильма",
    appendixRow: 10,
    appendixName:
      "Исполнение, финансирование проката или показа национального фильма",
    minPrice: 20,
    maxExpenses: null,
    maxNonCost: 80,
  },
  {
    id: "research",
    label:
      "Научно-исследовательские, опытно-конструкторские, технологические работы",
    appendixRow: 11,
    appendixName:
      "Научно-исследовательские, опытно-конструкторские, технологические работы",
    minPrice: 20,
    maxExpenses: 10,
    maxNonCost: 80,
  },
  {
    id: "it_systems",
    label:
      "Создание, развитие, обслуживание государственных и муниципальных информационных систем и сайтов",
    appendixRow: 12,
    appendixName:
      "Работы по созданию, развитию, функционированию, обслуживанию государственных, муниципальных информационных систем, официальных сайтов государственных, муниципальных органов, учреждений",
    minPrice: 30,
    maxExpenses: null,
    maxNonCost: 70,
  },
  {
    id: "food_catering",
    label:
      "Общественное питание и поставка пищевых продуктов для образовательных, медицинских, социальных организаций и отдыха детей",
    appendixRow: 13,
    appendixName:
      "Услуги общественного питания и (или) поставка пищевых продуктов, закупаемых для образовательных организаций, организаций, осуществляющих медицинскую деятельность, организаций социального обслуживания, организаций отдыха детей и их оздоровления",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "security",
    label: "Охрана объектов образовательных и научных организаций",
    appendixRow: 14,
    appendixName:
      "Услуги по обеспечению охраны объектов (территорий) образовательных организаций и научных организаций",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "children_recreation",
    label: "Услуги по организации отдыха детей и их оздоровлению",
    appendixRow: 15,
    appendixName: "Услуги по организации отдыха детей и их оздоровлению",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "medical",
    label: "Медицинские услуги",
    appendixRow: 16,
    appendixName: "Медицинские услуги",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "education",
    label: "Образовательные услуги",
    appendixRow: 17,
    appendixName: "Образовательные услуги",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "legal",
    label: "Юридические услуги",
    appendixRow: 18,
    appendixName: "Юридические услуги",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "audit",
    label: "Аудиторские услуги",
    appendixRow: 19,
    appendixName: "Аудиторские услуги",
    minPrice: 40,
    maxExpenses: null,
    maxNonCost: 60,
  },
  {
    id: "expertise",
    label: "Услуги по проведению экспертизы",
    appendixRow: 20,
    appendixName: "Услуги по проведению экспертизы",
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
  mapping: Pp2604Mapping = PP2604_OFFLINE_MAPPING,
): ObjectCategoryLimit =>
  mapping.categories.find((item) => item.id === category) ??
  mapping.categories[1];

// === Связь кода ОКПД2 с позицией приложения N 2 ===

/**
 * Связь «код ОКПД2 → позиция приложения № 2» всегда выводимая: сам акт
 * коды не перечисляет. `classifier` — совпадение наименования кода из НСИ
 * ЕИС с наименованием позиции; `purpose` — зависимость от цели закупки;
 * `residual` — остаточный случай «работы, услуги» (поз. 2).
 */
export type Okpd2RuleBasis = "classifier" | "purpose" | "residual";

export interface Okpd2CategoryRule {
  prefix: string;
  category: string;
  row: number;
  basis: Okpd2RuleBasis;
  classifierName: string;
  condition?: string;
  needsReview?: boolean;
}

const sourceOf = (rule: Okpd2CategoryRule): string =>
  `${PP2604_APPENDIX2_SOURCE.act}, ${PP2604_APPENDIX2_SOURCE.appendix}, поз. ${rule.row}; ОКПД2 ${rule.prefix} — ${rule.classifierName}`;

/** Названия разделов ОКПД2, по которым позиция 1 отнесена к товарам. */
const GOODS_SECTIONS: Record<string, string> = {
  "01": "Продукция и услуги сельского хозяйства и охоты",
  "02": "Продукция лесоводства, лесозаготовок и связанные с этим услуги",
  "03": "Рыба и прочая продукция рыболовства и рыбоводства",
  "05": "Уголь",
  "06": "Нефть и газ природный",
  "07": "Руды металлические",
  "08": "Продукция горнодобывающих производств прочая",
  "12": "Изделия табачные",
  "13": "Текстиль и изделия текстильные",
  "14": "Одежда",
  "15": "Кожа и изделия из кожи",
  "16": "Древесина и изделия из дерева и пробки, кроме мебели",
  "17": "Бумага и изделия из бумаги",
  "19": "Кокс и нефтепродукты",
  "20": "Вещества химические и продукты химические",
  "21": "Средства лекарственные и материалы, применяемые в медицинских целях",
  "22": "Изделия резиновые и пластмассовые",
  "23": "Продукты минеральные неметаллические прочие",
  "24": "Металлы основные",
  "25": "Изделия металлические готовые, кроме машин и оборудования",
  "26": "Оборудование компьютерное, электронное и оптическое",
  "27": "Оборудование электрическое",
  "28": "Машины и оборудование, не включенные в другие группировки",
  "29": "Средства автотранспортные, прицепы и полуприцепы",
  "30": "Средства транспортные и оборудование, прочие",
  "31": "Мебель",
  "32": "Изделия готовые прочие",
};

/**
 * Правила отнесения кода ОКПД2 к позиции приложения № 2. Порядок важен:
 * частные правила стоят выше общих; последнее правило с пустым префиксом —
 * остаточный случай «работы, услуги». Каждое правило несёт источник связи,
 * чтобы проверяющий видел, что это вывод, а не текст постановления.
 */
export const OKPD2_CATEGORY_RULES: Okpd2CategoryRule[] = [
  // Поз. 4 — автодороги (42.11 точнее общего раздела 42)
  {
    prefix: "42.11",
    category: "road",
    row: 4,
    basis: "classifier",
    classifierName:
      "Дороги автомобильные и автомагистрали; строительные работы по строительству автомобильных дорог и автомагистралей",
    condition:
      "код включает также работы по ремонту и содержанию автомобильных дорог",
  },
  // Поз. 5 — текущий ремонт зданий (43.3 точнее общего раздела 43)
  {
    prefix: "43.3",
    category: "building_repair",
    row: 5,
    basis: "classifier",
    classifierName: "Работы завершающие и отделочные в зданиях и сооружениях",
    needsReview: true,
    condition:
      "позиция 5 говорит о текущем ремонте; код 43.3 — завершающие и отделочные работы, подтвердите вид работ",
  },
  // Поз. 3 — строительство в целом
  {
    prefix: "41",
    category: "construction",
    row: 3,
    basis: "classifier",
    classifierName: "Здания и работы по возведению зданий",
  },
  {
    prefix: "42",
    category: "construction",
    row: 3,
    basis: "classifier",
    classifierName:
      "Сооружения и строительные работы в области гражданского строительства",
  },
  {
    prefix: "43",
    category: "construction",
    row: 3,
    basis: "classifier",
    classifierName: "Работы строительные специализированные",
  },
  // Поз. 6–8 — реставрация и сохранение
  {
    prefix: "91.03",
    category: "cultural_heritage",
    row: 6,
    basis: "classifier",
    classifierName:
      "Услуги, связанные с деятельностью по использованию исторических мест, зданий и аналогичных туристических достопримечательностей",
    needsReview: true,
    condition:
      "позиция 6 — сохранение объектов культурного наследия; код 91.03 покрывает не только работы по сохранению",
  },
  {
    prefix: "71.11.23",
    category: "cultural_heritage",
    row: 6,
    basis: "classifier",
    classifierName:
      "Услуги в области архитектуры, связанные с реставрацией исторических зданий",
    needsReview: true,
    condition:
      "наименование указывает на реставрацию исторических зданий, но это архитектурные услуги, а не работы по сохранению объектов культурного наследия",
  },
  {
    prefix: "91.02",
    category: "museum_restoration",
    row: 7,
    basis: "classifier",
    classifierName: "Услуги музеев",
    needsReview: true,
    condition:
      "позиция 7 — реставрация предметов и коллекций Музейного фонда, а не любые услуги музеев",
  },
  {
    prefix: "91.01",
    category: "archive_restoration",
    row: 8,
    basis: "classifier",
    classifierName: "Услуги библиотек и архивов",
    needsReview: true,
    condition:
      "позиция 8 — реставрация документов Архивного фонда и библиотечных фондов",
  },
  // Поз. 15–20 — услуги с отдельными пределами
  {
    prefix: "86",
    category: "medical",
    row: 16,
    basis: "classifier",
    classifierName: "Услуги в области здравоохранения",
  },
  {
    prefix: "85.4",
    category: "children_recreation",
    row: 15,
    basis: "classifier",
    classifierName: "Услуги по дополнительному образованию",
    needsReview: true,
    condition:
      "в ОКПД2 нет отдельного кода «отдых детей и их оздоровление»; 85.4 выбран по близости наименования, нужна цель закупки",
  },
  {
    prefix: "85",
    category: "education",
    row: 17,
    basis: "classifier",
    classifierName: "Услуги в области образования",
  },
  {
    prefix: "69.1",
    category: "legal",
    row: 18,
    basis: "classifier",
    classifierName: "Услуги юридические",
  },
  {
    prefix: "69.2",
    category: "audit",
    row: 19,
    basis: "classifier",
    classifierName:
      "Услуги в области бухгалтерского учета; по проведению финансового аудита; по налоговому консультированию",
    needsReview: true,
    condition:
      "позиция 19 — аудиторские услуги; код 69.2 включает также бухгалтерский учёт и налоговое консультирование",
  },
  {
    prefix: "71.2",
    category: "expertise",
    row: 20,
    basis: "classifier",
    classifierName:
      "Услуги в области технических испытаний, исследований, анализа и сертификации",
    needsReview: true,
    condition:
      "позиция 20 — услуги по проведению экспертизы; код 71.2 шире (испытания, сертификация)",
  },
  {
    prefix: "72",
    category: "research",
    row: 11,
    basis: "classifier",
    classifierName:
      "Услуги и работы, связанные с научными исследованиями и экспериментальными разработками",
  },
  {
    prefix: "62",
    category: "it_systems",
    row: 12,
    basis: "classifier",
    classifierName:
      "Продукты программные и услуги по разработке программного обеспечения; консультационные услуги в области ИТ",
    needsReview: true,
    condition:
      "позиция 12 — только государственные/муниципальные информационные системы и официальные сайты",
  },
  {
    prefix: "63",
    category: "it_systems",
    row: 12,
    basis: "classifier",
    classifierName: "Услуги в области информационных технологий",
    needsReview: true,
    condition:
      "позиция 12 — только государственные/муниципальные информационные системы и официальные сайты",
  },
  {
    prefix: "80",
    category: "security",
    row: 14,
    basis: "classifier",
    classifierName: "Услуги по обеспечению безопасности и проведению расследований",
    needsReview: true,
    condition:
      "позиция 14 — охрана объектов образовательных и научных организаций; код 80 шире",
  },
  {
    prefix: "90",
    category: "literature_art",
    row: 9,
    basis: "classifier",
    classifierName: "Услуги в области творчества, искусства и развлечений",
    needsReview: true,
    condition:
      "позиция 9 — создание произведения литературы или искусства; код 90 включает иные развлекательные услуги",
  },
  {
    prefix: "59.1",
    category: "film",
    row: 10,
    basis: "classifier",
    classifierName:
      "Услуги по производству кинофильмов, видеофильмов и телевизионных программ",
    needsReview: true,
    condition:
      "позиция 10 — национальный фильм; код 59.1 покрывает любую кинопродукцию",
  },
  // Поз. 13 — общественное питание
  {
    prefix: "56",
    category: "food_catering",
    row: 13,
    basis: "classifier",
    classifierName: "Услуги общественного питания",
  },
  // Поз. 1 — товары. 09, 18, 33 — услуги, поэтому уходят в поз. 2
  ...Object.entries(GOODS_SECTIONS).map(
    ([prefix, classifierName]): Okpd2CategoryRule => ({
      prefix,
      category: "goods",
      row: 1,
      basis: "classifier",
      classifierName,
    }),
  ),
  {
    prefix: "10",
    category: "goods",
    row: 1,
    basis: "classifier",
    classifierName: "Продукты пищевые",
    condition:
      "позиция 1 исключает пищевые продукты из позиции 13; при поставке для образовательных, медицинских, социальных организаций и отдыха детей применяется позиция 13",
    needsReview: true,
  },
  {
    prefix: "11",
    category: "goods",
    row: 1,
    basis: "classifier",
    classifierName: "Напитки",
    condition:
      "при поставке для образовательных, медицинских, социальных организаций и отдыха детей применяется позиция 13",
    needsReview: true,
  },
  {
    prefix: "09",
    category: "works_services",
    row: 2,
    basis: "classifier",
    classifierName: "Услуги в области добычи полезных ископаемых",
  },
  {
    prefix: "18",
    category: "works_services",
    row: 2,
    basis: "classifier",
    classifierName: "Услуги печатные и услуги по копированию",
  },
  {
    prefix: "33",
    category: "works_services",
    row: 2,
    basis: "classifier",
    classifierName: "Услуги по ремонту и монтажу машин и оборудования",
  },
  // Остаток: любые другие услуги и работы — позиция 2
  {
    prefix: "",
    category: "works_services",
    row: 2,
    basis: "residual",
    classifierName: "код ОКПД2 вне перечисленных разделов",
    condition:
      "остаточное правило позиции 2; для товаров проверьте, не подпадает ли код под позицию 1",
  },
];

const stripCodeDots = (code: string): string => code.replace(/\./g, "");

export const normalizeOkpd2Code = (code: string | undefined): string =>
  String(code ?? "")
    .trim()
    .replace(/,/g, ".")
    .replace(/\s+/g, "");

const OKPD2_CODE_PATTERN = /^\d{2}(?:\.\d{1,3}){0,3}$/;

export const isOkpd2CodeFormatValid = (code: string | undefined): boolean =>
  OKPD2_CODE_PATTERN.test(normalizeOkpd2Code(code));

/** Цель закупки, из-за которой пищевые продукты попадают в позицию 13. */
export type Okpd2PurchasePurpose = "food_for_social_orgs";

export const PP2604_FOOD_PURPOSE_RULE: Okpd2CategoryRule = {
  prefix: "10, 11",
  category: "food_catering",
  row: 13,
  basis: "purpose",
  classifierName: "Продукты пищевые / Напитки",
  condition:
    "поставка для образовательных организаций, организаций здравоохранения, социального обслуживания и отдыха детей",
};

export interface Okpd2CategoryResolution {
  code: string;
  category?: string;
  row?: number;
  basis?: Okpd2RuleBasis;
  source?: string;
  needsReview: boolean;
  reason?: string;
}

/**
 * Приоритет: цель закупки → самое длинное совпадение префикса → остаток.
 * Возвращает источник связи и признак ручной проверки вместе с категорией.
 */
export const resolveOkpd2Category = (
  code: string | undefined,
  purpose?: Okpd2PurchasePurpose,
  mapping: Pp2604Mapping = PP2604_OFFLINE_MAPPING,
): Okpd2CategoryResolution => {
  const normalized = normalizeOkpd2Code(code);
  const clean = stripCodeDots(normalized);

  if (!clean) {
    return {
      code: normalized,
      needsReview: true,
      reason: "Код ОКПД2 не указан",
    };
  }

  if (!OKPD2_CODE_PATTERN.test(normalized)) {
    return {
      code: normalized,
      needsReview: true,
      reason: `Код ОКПД2 «${normalized}» имеет некорректный формат`,
    };
  }

  if (purpose === "food_for_social_orgs" && /^(10|11)/.test(clean)) {
    const byPurpose = mapping.rules.find(
      (item) => item.purpose === "food_for_social_orgs",
    );
    if (byPurpose) {
      return {
        code: normalized,
        category: byPurpose.category,
        row: byPurpose.row,
        basis: byPurpose.basis,
        source: byPurpose.source,
        needsReview: byPurpose.needsReview,
        reason: byPurpose.condition ?? undefined,
      };
    }
  }

  // Самый длинный префикс побеждает общий раздел. src — в БД или офлайн-снимке.
  const prefixLength = (prefix: string) => stripCodeDots(prefix).length;
  const rule = mapping.rules
    .filter(
      (item) =>
        item.purpose === null && clean.startsWith(stripCodeDots(item.prefix)),
    )
    .sort(
      (a, b) => prefixLength(b.prefix) - prefixLength(a.prefix) || a.sortOrder - b.sortOrder,
    )[0];

  if (!rule) {
    return {
      code: normalized,
      needsReview: true,
      reason: "Не удалось подобрать правило ОКПД2",
    };
  }

  return {
    code: normalized,
    category: rule.category,
    row: rule.row,
    basis: rule.basis,
    source: rule.source,
    needsReview: rule.needsReview,
    reason: rule.condition ?? undefined,
  };
};

/** Категория приложения N 2 по коду ОКПД2 (undefined — код не указан/невалиден) */
export const categoryFromOkpd2 = (
  code: string | undefined,
  purpose?: Okpd2PurchasePurpose,
  mapping: Pp2604Mapping = PP2604_OFFLINE_MAPPING,
): string | undefined => resolveOkpd2Category(code, purpose, mapping).category;

export type Okpd2CategoryMatch = Okpd2CategoryResolution;

export interface Okpd2CategoryDetection {
  // Категория, если все коды дали одно значение; иначе undefined
  category?: string;
  matches: Okpd2CategoryMatch[];
  // Коды, для которых не удалось определить категорию
  unmatched: string[];
  // Объекты закупки попали в разные категории приложения N 2
  conflict: boolean;
  // Есть связь, которую нужно подтвердить человеку
  needsReview: boolean;
}

/**
 * Определяет категорию объекта закупки по кодам ОКПД2 позиций СЗ/плана-графика.
 * Если коды расходятся по категориям, категорию нужно выбрать вручную —
 * `conflict: true`. Каждое совпадение несёт источник связи.
 */
export const detectObjectCategory = (
  codes: (string | undefined)[],
  purpose?: Okpd2PurchasePurpose,
  mapping: Pp2604Mapping = PP2604_OFFLINE_MAPPING,
): Okpd2CategoryDetection => {
  const matches: Okpd2CategoryMatch[] = [];
  const unmatched: string[] = [];

  codes.forEach((rawCode) => {
    const resolution = resolveOkpd2Category(rawCode, purpose, mapping);

    if (!resolution.code || !isOkpd2CodeFormatValid(resolution.code)) {
      unmatched.push(resolution.code);
      return;
    }

    matches.push(resolution);
  });

  const categories = new Set(
    matches.map((item) => item.category).filter(Boolean) as string[],
  );

  return {
    category: categories.size === 1 ? [...categories][0] : undefined,
    matches,
    unmatched,
    conflict: categories.size > 1,
    needsReview: matches.some((item) => item.needsReview),
  };
};

/**
 * Офлайн-снимок на случай, когда csms-api недоступен. Основной источник —
 * активная версия каталога из `/api/pp2604/mapping`: она импортируется из
 * официального PDF и может меняться без правок фронтенда.
 */
export const PP2604_OFFLINE_MAPPING: Pp2604Mapping = {
  version: "offline",
  rulesVersion: "pp2604-rules-v1",
  eoNumber: PP2604_APPENDIX2_SOURCE.eoNumber,
  apiUrl: "",
  pdfUrl: "",
  pdfSha256: "",
  documentTitle: PP2604_APPENDIX2_SOURCE.act,
  documentDate: null,
  publishDate: null,
  pagesCount: null,
  appendixPages: PP2604_APPENDIX2_SOURCE.pdfPages,
  extractionMethod: "снимок во фронтенде",
  importedAt: "",
  source: PP2604_APPENDIX2_SOURCE,
  categories: OBJECT_CATEGORY_LIMITS.map((item) => ({
    ...item,
    sourcePage: 27,
  })),
  rules: [
    ...["10", "11"].map((prefix, index): Pp2604Rule => ({
      ...PP2604_FOOD_PURPOSE_RULE,
      prefix,
      condition: PP2604_FOOD_PURPOSE_RULE.condition ?? null,
      needsReview: false,
      purpose: "food_for_social_orgs",
      source: sourceOf(PP2604_FOOD_PURPOSE_RULE),
      sortOrder: index - 2,
    })),
    ...OKPD2_CATEGORY_RULES.map((rule, index): Pp2604Rule => ({
      ...rule,
      condition: rule.condition ?? null,
      needsReview: Boolean(rule.needsReview),
      purpose: null,
      source: sourceOf(rule),
      sortOrder: index,
    })),
  ],
};

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

/**
 * Критерий Положения N 2604 → тип критерия в извещении
 * (`noticeInfo.schema`, `EvaluationCriterionSchema`).
 */
export const criterionToNoticeType: Record<CriterionType, string> = {
  price: "price",
  expenses: "exploitation_expenses",
  characteristics: "qualitative_characteristics",
  qualification: "qualification",
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

/**
 * Тексты формул Положения N 2604 для формы: пользователь видит, по какой
 * зависимости считается балл, не открывая отдельный экран оценки.
 */
export const criterionFormulaText: Record<CriterionType, string> = {
  price:
    "БЦi = (Цнач − Цi) / Цнач × 100 (п. 9); при предложении ниже нуля — (Цнач + |Цi|) / Цнач × 100",
  expenses:
    "БРi = (Рнач − Рi) / Рнач × 100 (п. 10), где Рнач — начальная сумма расходов",
  characteristics:
    "Бij = (Xij − Xmin) / (Xmax − Xmin) × 100 при «лучше большее»; (Xmax − Xij) / (Xmax − Xmin) × 100 при «лучше меньшее» (п. 20)",
  qualification:
    "Бij = (Xij − Xmin) / (Xmax − Xmin) × 100 при «лучше большее»; (Xmax − Xij) / (Xmax − Xmin) × 100 при «лучше меньшее» (п. 20)",
};

export const indicatorFormulaHint =
  "Итог по критерию: БКi = Σ(Бij × Зij) / 100, где Зij — значимость показателя (сумма 100%). Итог по заявке: Бi = Σ(БКi × Зк) / 100, где Зк — значимость критерия (сумма 100%).";

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
  // Коды ОКПД2 объектов закупки: по ним определяется категория приложения N 2
  // и проверяется аукционный перечень (РП РФ N 471-р)
  okpd2Codes: z.array(z.string()).default([]),
  // Цель закупки, из-за которой пищевые продукты (10, 11) попадают в поз. 13
  okpd2Purpose: z.enum(["food_for_social_orgs"]).optional(),
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
  okpd2Codes: [],
  okpd2Purpose: undefined,
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

export interface ValidationOptions {
  // Проверять показатели критериев: в СЗ они настраиваются на отдельном экране
  checkIndicators?: boolean;
  // Проверять состав заявок: в СЗ заявок ещё нет
  checkBids?: boolean;
  // Активная версия каталога 2604; по умолчанию офлайн-снимок
  mapping?: Pp2604Mapping;
}

/**
 * Проверки перед сохранением/публикацией: то, что в Положении сформулировано
 * императивно. Ошибки блокируют публикацию, предупреждения — нет.
 *
 * Связь с планом-графиком: по кодам ОКПД2 объектов проверяется категория
 * приложения N 2 и аукционный перечень (РП РФ N 471-р, ч. 6 ст. 24 44-ФЗ).
 */
export const validateBidEvaluation = (
  config: Pick<
    BidEvaluation,
    | "procedureKind"
    | "objectCategory"
    | "criteria"
    | "bids"
    | "status"
    | "nmck"
    | "okpd2Codes"
    | "okpd2Purpose"
  >,
  options: ValidationOptions = {},
): ValidationIssue[] => {
  const checkIndicators = options.checkIndicators ?? true;
  const checkBids = options.checkBids ?? true;
  const mapping = options.mapping ?? PP2604_OFFLINE_MAPPING;
  const issues: ValidationIssue[] = [];
  const enabled = config.criteria.filter((criterion) => criterion.enabled);
  const error = (message: string) => issues.push({ level: "error", message });
  const warning = (message: string) =>
    issues.push({ level: "warning", message });

  if (enabled.length === 0) {
    error("Не выбран ни один критерий оценки.");

    return issues;
  }

  // Аукцион и запрос котировок: Положение N 2604 не применяется
  if (!pp2604Applies(config.procedureKind)) {
    const nonPrice = enabled.filter((criterion) => criterion.type !== "price");

    if (nonPrice.length > 0) {
      error(
        `${procedureApplicabilityHint[config.procedureKind]} Отключите критерии: ${nonPrice
          .map((criterion) => criterionShortLabels[criterion.type])
          .join(", ")}.`,
      );
    }

    if (
      enabled.some(
        (criterion) =>
          criterion.type === "price" && criterion.indicators.length > 0,
      )
    ) {
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
  const limits = objectCategoryLimits(config.objectCategory, mapping);
  const price = enabled.find((criterion) => criterion.type === "price");
  const expenses = enabled.find((criterion) => criterion.type === "expenses");

  if (price && parseNumber(price.weightPercent) < limits.minPrice) {
    error(
      `Минимальная значимость критерия «цена» для категории «${limits.label}» — ${limits.minPrice}% (приложение N 2, поз. ${limits.appendixRow}).`,
    );
  }

  if (
    expenses &&
    limits.maxExpenses !== null &&
    parseNumber(expenses.weightPercent) > limits.maxExpenses
  ) {
    error(
      `Максимальная значимость критерия «расходы» для категории «${limits.label}» — ${limits.maxExpenses}% (приложение N 2, поз. ${limits.appendixRow}).`,
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
      `Сумма значимости характеристик объекта и квалификации — ${nonCostSum}%, максимум для категории «${limits.label}» — ${limits.maxNonCost}% (приложение N 2, поз. ${limits.appendixRow}).`,
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

  // Связь с ОКПД2 позиций плана-графика/СЗ
  const codes = (config.okpd2Codes ?? [])
    .map((code) => normalizeOkpd2Code(code))
    .filter(Boolean);

  if (codes.length === 0) {
    warning(
      `Код ОКПД2 не указан: категорию и пределы значимости проверить автоматически нельзя. Выберите категорию вручную (${PP2604_APPENDIX2_SOURCE.appendix}).`,
    );
  } else {
    const detection = detectObjectCategory(codes, config.okpd2Purpose, mapping);

    detection.matches.forEach((match) => {
      if (match.needsReview) {
        warning(
          `Код ОКПД2 ${match.code}: соответствие позиции ${
            match.row ?? "?"
          } приложения N 2 требует подтверждения. ${match.reason ?? ""} Источник: ${
            match.source ?? PP2604_APPENDIX2_SOURCE.appendix
          }.`,
        );
      }
    });

    if (detection.unmatched.length > 0) {
      error(
        `Код ОКПД2 ${detection.unmatched.join(
          ", ",
        )} не распознан: проверьте формат и наличие кода в активном справочнике НСИ ЕИС.`,
      );
    }

    if (detection.conflict) {
      warning(
        `Коды ОКПД2 объектов закупки попали в разные позиции приложения N 2 — выберите категорию вручную. ${detection.matches
          .map((match) => `${match.code} → поз. ${match.row ?? "?"} (${match.source ?? "источник не найден"})`)
          .join("; ")}.`,
      );
    } else if (
      detection.category &&
      detection.category !== config.objectCategory
    ) {
      const expected = objectCategoryLimits(detection.category, mapping);
      error(
        `Категория «${limits.label}» (поз. ${limits.appendixRow}) не соответствует ОКПД2 ${codes.join(
          ", ",
        )}: по приложению N 2 ожидается «${expected.label}» (поз. ${expected.appendixRow}). Источник связи: ${
          detection.matches[0]?.source ?? PP2604_APPENDIX2_SOURCE.appendix
        }.`,
      );
    }

    if (config.procedureKind === "tender") {
      const auctionRequired = codes.filter(
        (code) => checkOkpd2AuctionList(code).inAuctionList,
      );

      if (auctionRequired.length > 0) {
        error(
          `Код ОКПД2 ${auctionRequired.join(
            ", ",
          )} входит в аукционный перечень (РП РФ N 471-р): проведение конкурса запрещено (ч. 6 ст. 24 44-ФЗ), выберите электронный аукцион.`,
        );
      }
    }
  }

  // Показатели: суммы значимости и обязательность
  if (checkIndicators) {
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
  }

  if (checkBids) {
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
    okpd2Codes: value?.okpd2Codes ?? base.okpd2Codes,
    criteria: normalizeCriteria(value?.criteria),
    bids: (value?.bids ?? []).map((bid, index) => ({
      ...bid,
      id: bid.id ?? `bid-${index}`,
      values: bid.values ?? {},
    })) as Bid[],
    legalActId: value?.legalActId ?? BID_EVALUATION_LEGAL_ACT_ID,
  } as BidEvaluation;
};
