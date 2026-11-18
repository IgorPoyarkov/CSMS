import type { Okpd2Ref } from "../Okpd2Ref/okpd2Ref.schema";

/**
 * Национальный режим при закупках по Закону № 44-ФЗ (ст. 14).
 *
 * Постановление Правительства РФ от 23.12.2024 № 1875 «О мерах по
 * предоставлению национального режима при осуществлении закупок товаров,
 * работ, услуг для обеспечения государственных и муниципальных нужд»
 * (ред. от 17.10.2026) устанавливает:
 *  - приложение № 1 — перечень товаров, работ, услуг, в отношении которых
 *    установлен ЗАПРЕТ (заявки с иностранным товаром отклоняются всегда);
 *  - приложение № 2 — перечень товаров, работ, услуг, в отношении которых
 *    установлено ОГРАНИЧЕНИЕ (заявка с иностранным товаром отклоняется,
 *    если поступила хотя бы одна заявка с товаром из ЕАЭС);
 *  - преимущество (ценовая преференция) для товаров российского
 *    происхождения применяется, только если не установлены запрет
 *    или ограничение.
 *
 * Модуль проверяет код ОКПД2 по правилам префиксов приложений № 1 и № 2,
 * сверяет объявленный в служебной записке / извещении режим с ожидаемым
 * и возвращает ошибки/предупреждения для блокировки сохранения.
 *
 * ОГРАНИЧЕНИЕ ДАННЫХ: перечень приложения № 2 в коде восстановлен не
 * полностью (источник обрезан после позиции 277). Недостающие позиции
 * можно закрыть справочником `okpd2Refs` (поля `nationalRegime` и
 * `nationalRegimeNote`), который имеет приоритет над правилами.
 */

export const PP_1875_ACT_ID = "pp-1875";
export const PP_1875_ACT_TITLE =
  "Постановление Правительства РФ от 23.12.2024 № 1875 (ред. от 17.10.2026)";
export const PP_1875_EFFECTIVE_DATE = "2025-01-01";

export type NationalRegimeMode = "none" | "ban" | "restriction" | "advantage";
export type NationalRegimeExpected = "ban" | "restriction" | null;

export const NATIONAL_REGIME_MODE_LABELS: Record<NationalRegimeMode, string> = {
  none: "Не установлено",
  ban: "Запрет",
  restriction: "Ограничение",
  advantage: "Преимущество",
};

export const nationalRegimeModeLabel = (mode?: string): string =>
  NATIONAL_REGIME_MODE_LABELS[(mode ?? "none") as NationalRegimeMode] ??
  "Не установлено";

export const nationalRegimeExpectedLabel = (
  expected: NationalRegimeExpected,
): string =>
  expected ? NATIONAL_REGIME_MODE_LABELS[expected] : "не установлен";

interface RegimeRule {
  prefix: string;
  label: string;
  note?: string;
}

/**
 * Приложение № 1 к ПП РФ № 1875 — запрет.
 * Порядок внутри массива не важен: применяется самое длинное (точное)
 * совпадение, при равной длине приоритет у запрета.
 */
export const PP_1875_BAN_RULES: RegimeRule[] = [
  // Продукция пищевая
  { prefix: "10.20.1", label: "Рыба переработанная и консервированная" },
  {
    prefix: "10.20.2",
    label: "Ракообразные переработанные и консервированные",
  },
  {
    prefix: "10.20.3",
    label: "Моллюски и прочие беспозвоночные переработанные",
  },
  // Текстиль, одежда, кожа, обувь
  { prefix: "13.2", label: "Ткани текстильные готовые" },
  { prefix: "13.9", label: "Изделия текстильные готовые прочие" },
  { prefix: "14.1", label: "Одежда трикотажная и вязаная" },
  { prefix: "14.20", label: "Одежда из натуральной кожи" },
  { prefix: "14.3", label: "Одежда трикотажная прочая" },
  { prefix: "15.1", label: "Кожа выделанная и отделанная" },
  { prefix: "15.2", label: "Обувь" },
  // Древесина, бумага
  { prefix: "16.21.13", label: "Плиты древесноволокнистые" },
  { prefix: "16.21.14", label: "Плиты древесностружечные" },
  { prefix: "17.12", label: "Бумага и картон" },
  // Химическая продукция
  { prefix: "20.30", label: "Краски, лаки и аналогичные покрытия" },
  { prefix: "20.52", label: "Клеи" },
  { prefix: "20.59.1", label: "Материалы фотографические химические" },
  // Резина и пластмассы
  { prefix: "22.11.1", label: "Шины пневматические резиновые новые" },
  { prefix: "22.19.73", label: "Изделия из вулканизированной резины прочие" },
  { prefix: "22.29.29.190", label: "Изделия пластмассовые прочие" },
  // Минеральные продукты
  { prefix: "23.19.25", label: "Изделия из асбеста" },
  { prefix: "23.91.11", label: "Круги шлифовальные и аналогичные изделия" },
  // Металлические изделия
  { prefix: "25.11.23.110", label: "Конструкции металлические строительные" },
  { prefix: "25.21.11.130", label: "Радиаторы отопительные металлические" },
  {
    prefix: "25.71.14",
    label: "Приборы столовые и изделия кухонные металлические",
  },
  {
    prefix: "25.73.30",
    label: "Инструмент ручной с механизированным приводом",
  },
  { prefix: "25.73.40", label: "Инструмент ручной прочий" },
  { prefix: "25.73.60", label: "Инструмент сменный для станков" },
  // Компьютерное и электронное оборудование
  { prefix: "26.11.3", label: "Приборы полупроводниковые" },
  { prefix: "26.12.3", label: "Платы печатные" },
  { prefix: "26.20.40.150", label: "Устройства ввода/вывода данных" },
  {
    prefix: "26.51.63.130",
    label: "Приборы для измерения электрических величин",
  },
  // Электрооборудование
  { prefix: "27.11.4", label: "Электродвигатели малой мощности" },
  { prefix: "27.11.50.120", label: "Трансформаторы электрические" },
  { prefix: "27.12.22", label: "Выключатели автоматические" },
  { prefix: "27.12.31", label: "Пульты и панели управления" },
  { prefix: "27.12.32", label: "Шкафы распределительные" },
  { prefix: "27.20.21", label: "Батареи аккумуляторные свинцовые" },
  { prefix: "27.32", label: "Провода и кабели прочие" },
  { prefix: "27.40.39", label: "Оборудование электрическое для освещения" },
  { prefix: "27.90.11.900", label: "Оборудование электрическое прочее" },
  { prefix: "27.90.31.110", label: "Конденсаторы электрические" },
  { prefix: "27.90.40.190", label: "Оборудование электрическое прочее" },
  // Машины и оборудование
  { prefix: "28.13.2", label: "Насосы прочие" },
  { prefix: "28.15.10", label: "Приводы гидравлические и пневматические" },
  { prefix: "28.21.13.111", label: "Печи и камеры промышленные" },
  { prefix: "28.21.13.119", label: "Печи и камеры промышленные прочие" },
  { prefix: "28.22.11.112", label: "Краны мостовые" },
  { prefix: "28.22.11.190", label: "Краны прочие" },
  { prefix: "28.22.14", label: "Краны, клапаны, вентили" },
  { prefix: "28.22.15.110", label: "Клапаны и задвижки" },
  { prefix: "28.22.15.120", label: "Клапаны регулирующие" },
  { prefix: "28.22.16.111", label: "Подшипники скольжения" },
  { prefix: "28.22.17.111", label: "Передачи зубчатые" },
  { prefix: "28.22.18.150", label: "Конвейеры ленточные" },
  { prefix: "28.22.18.261", label: "Оборудование подъёмно-транспортное" },
  {
    prefix: "28.22.18.269",
    label: "Оборудование подъёмно-транспортное прочее",
  },
  {
    prefix: "28.22.18.314",
    label: "Оборудование подъёмно-транспортное прочее",
  },
  { prefix: "28.24.1", label: "Инструмент ручной с механизированным приводом" },
  { prefix: "28.24.2", label: "Инструмент ручной прочий" },
  {
    prefix: "28.25.12.110",
    label: "Оборудование для кондиционирования воздуха",
  },
  { prefix: "28.25.13.111", label: "Оборудование для охлаждения" },
  { prefix: "28.25.13.112", label: "Оборудование для охлаждения" },
  { prefix: "28.25.13.114", label: "Оборудование для охлаждения" },
  { prefix: "28.25.13.115", label: "Оборудование для охлаждения" },
  { prefix: "28.29.50.000", label: "Оборудование для мойки и очистки" },
  { prefix: "28.29.70", label: "Оборудование для взвешивания и дозирования" },
  { prefix: "28.30", label: "Машины и оборудование для сельского хозяйства" },
  { prefix: "28.41.1", label: "Станки металлорежущие" },
  { prefix: "28.41.2", label: "Станки деревообрабатывающие" },
  { prefix: "28.41.3", label: "Станки прочие" },
  {
    prefix: "28.41.4",
    label: "Машины и оборудование для обработки материалов",
  },
  { prefix: "28.49.1", label: "Оборудование для производства прочее" },
  { prefix: "28.49.2", label: "Оборудование для производства прочее" },
  { prefix: "28.92.21", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.22", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.24", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.25", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.26", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.27", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.28", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.29", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.30", label: "Машины и оборудование строительные" },
  { prefix: "28.92.40", label: "Машины и оборудование строительные" },
  { prefix: "28.92.50", label: "Машины и оборудование строительные" },
  { prefix: "28.93.15", label: "Оборудование для пищевой промышленности" },
  { prefix: "28.93.17", label: "Оборудование для пищевой промышленности" },
  { prefix: "28.96.10.122", label: "Оборудование для обработки пластмасс" },
  { prefix: "28.96.10.123", label: "Оборудование для обработки пластмасс" },
  {
    prefix: "28.99.39.200",
    label: "Оборудование специального назначения прочее",
  },
  // Транспортные средства
  { prefix: "29.10.2", label: "Автомобили грузовые" },
  { prefix: "29.10.3", label: "Автомобили грузовые" },
  { prefix: "29.10.4", label: "Автомобили грузовые" },
  { prefix: "29.10.51", label: "Шасси с двигателями для автомобилей" },
  { prefix: "29.10.52", label: "Автомобили специального назначения" },
  { prefix: "29.10.59", label: "Автомобили прочие" },
  { prefix: "29.20.21", label: "Прицепы и полуприцепы" },
  { prefix: "29.20.23", label: "Прицепы и полуприцепы прочие" },
  { prefix: "30.11.21", label: "Суда морские" },
  { prefix: "30.11.22", label: "Суда морские" },
  { prefix: "30.11.23", label: "Суда морские" },
  { prefix: "30.11.24", label: "Суда морские" },
  { prefix: "30.11.31", label: "Суда речные" },
  { prefix: "30.11.32", label: "Суда речные" },
  { prefix: "30.11.33", label: "Суда речные" },
  { prefix: "30.11.40", label: "Плавучие средства" },
  { prefix: "30.11.50", label: "Суда прочие" },
  { prefix: "30.12", label: "Суда прогулочные и спортивные" },
  { prefix: "30.20.1", label: "Локомотивы железнодорожные" },
  { prefix: "30.20.2", label: "Локомотивы железнодорожные" },
  { prefix: "30.20.3", label: "Вагоны железнодорожные" },
  { prefix: "30.20.4", label: "Вагоны железнодорожные" },
  { prefix: "30.30.31", label: "Летательные аппараты" },
  { prefix: "30.30.32", label: "Летательные аппараты" },
  { prefix: "30.30.34", label: "Летательные аппараты" },
  // Мебель и готовые изделия
  { prefix: "31.03.1", label: "Мебель металлическая" },
  { prefix: "31.09.11", label: "Мебель прочая" },
  {
    prefix: "32.20.11.120",
    label: "Аппаратура для записи и воспроизведения звука",
  },
  { prefix: "32.50.13.190", label: "Оборудование медицинское для диагностики" },
  { prefix: "32.50.21.121", label: "Инструменты и приспособления медицинские" },
  { prefix: "32.50.21.122", label: "Инструменты и приспособления медицинские" },
  { prefix: "32.50.21.123", label: "Инструменты и приспособления медицинские" },
  { prefix: "32.50.30.110", label: "Мебель медицинская" },
  { prefix: "32.50.30.111", label: "Мебель медицинская" },
  { prefix: "32.50.30.119", label: "Мебель медицинская" },
  { prefix: "32.50.50.181", label: "Изделия медицинские прочие" },
  { prefix: "32.50.50.190", label: "Изделия медицинские прочие" },
  { prefix: "32.99.11.130", label: "Изделия прочие" },
  { prefix: "32.99.11.140", label: "Изделия прочие" },
  { prefix: "32.99.11.160", label: "Изделия прочие" },
  { prefix: "32.99.11.190", label: "Изделия прочие" },
  // Услуги
  { prefix: "58.2", label: "Услуги по изданию программного обеспечения" },
  { prefix: "61", label: "Услуги телекоммуникационные" },
  { prefix: "62", label: "Услуги в области информационных технологий" },
  { prefix: "63", label: "Услуги в области информации и связи прочие" },
  { prefix: "64", label: "Услуги финансовые" },
  { prefix: "66.19.91", label: "Услуги в области обеспечения безопасности" },
  { prefix: "69.20.1", label: "Услуги в области бухгалтерского учёта" },
  { prefix: "69.20.2", label: "Услуги в области аудита" },
  { prefix: "69.20.3", label: "Услуги в области налогового консультирования" },
  { prefix: "70.22.12", label: "Услуги в области связи" },
];

/**
 * Приложение № 2 к ПП РФ № 1875 — ограничение.
 * Перечень восстановлен не полностью (источник обрезан после позиции 277);
 * недостающие позиции закрываются справочником ОКПД2.
 */
export const PP_1875_RESTRICTION_RULES: RegimeRule[] = [
  { prefix: "08.12.12.140", label: "Песок природный" },
  { prefix: "17.22.12.120", label: "Изделия из бумаги и картона" },
  { prefix: "17.23.13", label: "Принадлежности канцелярские из бумаги" },
  { prefix: "20.12", label: "Красители и пигменты" },
  { prefix: "20.13", label: "Продукты химические неорганические" },
  { prefix: "20.14", label: "Продукты химические органические" },
  { prefix: "20.15", label: "Удобрения и соединения азотные" },
  { prefix: "20.16", label: "Пластмассы в первичных формах" },
  { prefix: "20.20.1", label: "Пестициды и агрохимикаты" },
  { prefix: "20.41.2", label: "Средства моющие и чистящие" },
  { prefix: "20.41.31.113", label: "Средства моющие" },
  { prefix: "20.41.32", label: "Средства чистящие" },
  { prefix: "20.42.14.130", label: "Средства парфюмерные" },
  { prefix: "20.42.15.143", label: "Средства косметические" },
  { prefix: "20.59.3", label: "Материалы смазочные" },
  { prefix: "20.59.42", label: "Продукты химические прочие" },
  { prefix: "20.59.43.130", label: "Продукты химические прочие" },
  { prefix: "20.59.52.194", label: "Продукты химические прочие" },
  { prefix: "20.59.56", label: "Продукты химические прочие" },
  { prefix: "20.59.59", label: "Продукты химические прочие" },
  { prefix: "20.60.1", label: "Волокна химические" },
  { prefix: "20.60.2", label: "Нити химические" },
  { prefix: "22.11.2", label: "Шины пневматические восстановленные" },
  { prefix: "22.19.1", label: "Трубы, трубки и шланги из резины" },
  { prefix: "22.19.2", label: "Ленты конвейерные из резины" },
  { prefix: "22.19.3", label: "Изделия из резины прочие" },
  { prefix: "22.19.4", label: "Изделия из резины прочие" },
  { prefix: "22.19.5", label: "Изделия из резины прочие" },
  { prefix: "22.19.6", label: "Изделия из резины прочие" },
  { prefix: "22.21.1", label: "Плиты, листы, трубы из пластмасс" },
  { prefix: "22.21.2", label: "Плиты, листы, трубы из пластмасс" },
  { prefix: "22.21.3", label: "Плиты, листы, трубы из пластмасс" },
  { prefix: "22.21.4", label: "Плиты, листы, трубы из пластмасс" },
  { prefix: "22.22.1", label: "Тара пластмассовая" },
  { prefix: "22.29.21", label: "Изделия пластмассовые прочие" },
  { prefix: "22.29.22", label: "Изделия пластмассовые прочие" },
  { prefix: "22.29.23", label: "Изделия пластмассовые прочие" },
  { prefix: "22.29.24", label: "Изделия пластмассовые прочие" },
  { prefix: "22.29.25", label: "Изделия пластмассовые прочие" },
  { prefix: "22.29.26", label: "Изделия пластмассовые прочие" },
  { prefix: "23.13.11.116", label: "Изделия из стекла" },
  { prefix: "23.19.12.160", label: "Изделия из стекла" },
  { prefix: "23.43.10", label: "Изделия керамические изоляторы" },
  { prefix: "23.51", label: "Цемент" },
  { prefix: "23.99.19", label: "Изделия минеральные прочие" },
  { prefix: "24.42.22", label: "Изделия из алюминия" },
  { prefix: "24.42.23", label: "Изделия из алюминия" },
  { prefix: "24.42.24", label: "Изделия из алюминия" },
  { prefix: "24.42.25", label: "Изделия из алюминия" },
  { prefix: "24.42.26", label: "Изделия из алюминия" },
  { prefix: "25.11.23.120", label: "Конструкции металлические" },
  { prefix: "25.12.10", label: "Двери, окна и рамы металлические" },
  { prefix: "25.21.11.110", label: "Котлы отопительные" },
  { prefix: "25.21.11.120", label: "Котлы отопительные" },
  { prefix: "25.21.11.150", label: "Котлы отопительные" },
  { prefix: "25.21.11.160", label: "Котлы отопительные" },
  { prefix: "25.21.12", label: "Радиаторы отопительные" },
  { prefix: "25.29.11", label: "Ёмкости металлические" },
  { prefix: "25.29.12", label: "Ёмкости металлические" },
  { prefix: "25.30.11", label: "Котлы паровые" },
  { prefix: "25.40.12.410", label: "Оружие и боеприпасы" },
  { prefix: "25.40.13.190", label: "Оружие и боеприпасы" },
  { prefix: "25.71.11", label: "Ножи и лезвия режущие" },
  { prefix: "25.72.14.120", label: "Замки и петли" },
  { prefix: "25.92.12", label: "Тара металлическая" },
  { prefix: "25.93.11.120", label: "Изделия из проволоки" },
  { prefix: "25.93.18.110", label: "Изделия из проволоки" },
  { prefix: "25.99.12.112", label: "Изделия металлические прочие" },
  { prefix: "26.11.1", label: "Элементы полупроводниковые" },
  { prefix: "26.11.2", label: "Элементы полупроводниковые" },
  { prefix: "26.12.1", label: "Платы печатные" },
  { prefix: "26.12.2", label: "Платы печатные" },
  { prefix: "26.20.11", label: "Оборудование компьютерное" },
  { prefix: "26.20.12", label: "Оборудование компьютерное" },
  { prefix: "26.20.13", label: "Оборудование компьютерное" },
  { prefix: "26.20.14", label: "Оборудование компьютерное" },
  { prefix: "26.20.15", label: "Оборудование компьютерное" },
  { prefix: "26.20.16", label: "Оборудование компьютерное" },
  { prefix: "26.20.17", label: "Оборудование компьютерное" },
  { prefix: "26.20.18", label: "Оборудование компьютерное" },
  { prefix: "26.20.2", label: "Оборудование компьютерное" },
  { prefix: "26.20.3", label: "Оборудование компьютерное" },
  { prefix: "26.20.4", label: "Оборудование компьютерное" },
  { prefix: "26.30", label: "Оборудование коммуникационное" },
  { prefix: "26.40", label: "Оборудование аудиовизуальное" },
  { prefix: "26.51", label: "Оборудование для измерений и контроля" },
  { prefix: "27.11.1", label: "Электродвигатели" },
  { prefix: "27.11.2", label: "Электродвигатели" },
  { prefix: "27.11.3", label: "Электродвигатели" },
  { prefix: "27.11.50.120", label: "Трансформаторы электрические" },
  { prefix: "27.12.10", label: "Аппаратура распределения и управления" },
  { prefix: "27.12.21", label: "Аппаратура распределения и управления" },
  { prefix: "27.12.23", label: "Аппаратура распределения и управления" },
  { prefix: "27.12.24", label: "Аппаратура распределения и управления" },
  { prefix: "27.20.22", label: "Батареи аккумуляторные" },
  { prefix: "27.20.23.130", label: "Батареи аккумуляторные" },
  { prefix: "27.32", label: "Провода и кабели" },
  { prefix: "27.33.13.130", label: "Оборудование электрическое" },
  { prefix: "27.33.13.140", label: "Оборудование электрическое" },
  { prefix: "28.11.2", label: "Двигатели и турбины" },
  { prefix: "28.13.12", label: "Насосы" },
  { prefix: "28.13.13", label: "Насосы" },
  { prefix: "28.13.14", label: "Насосы" },
  { prefix: "28.13.3", label: "Компрессоры" },
  { prefix: "28.14.11", label: "Краны и вентили" },
  { prefix: "28.14.13", label: "Краны и вентили" },
  { prefix: "28.22.14.126", label: "Клапаны и вентили" },
  { prefix: "28.22.16.112", label: "Подшипники" },
  { prefix: "28.22.17", label: "Передачи зубчатые" },
  { prefix: "28.22.18.390", label: "Оборудование подъёмно-транспортное" },
  { prefix: "28.25.11", label: "Оборудование для кондиционирования" },
  { prefix: "28.25.14", label: "Оборудование для охлаждения" },
  { prefix: "28.29.12", label: "Оборудование для очистки" },
  { prefix: "28.29.31.110", label: "Оборудование для взвешивания" },
  { prefix: "28.92.11.120", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.12.121", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.12.130", label: "Машины и оборудование горнодобывающие" },
  { prefix: "28.92.40.110", label: "Машины и оборудование строительные" },
  { prefix: "28.92.61.110", label: "Машины и оборудование строительные" },
  { prefix: "28.93.2", label: "Оборудование для пищевой промышленности" },
  { prefix: "28.99.39.190", label: "Оборудование специального назначения" },
  { prefix: "29.32.20.130", label: "Комплектующие для транспортных средств" },
  { prefix: "30.30.31.130", label: "Летательные аппараты" },
  { prefix: "30.30.32.130", label: "Летательные аппараты" },
  { prefix: "30.30.32.140", label: "Летательные аппараты" },
  { prefix: "30.30.32.150", label: "Летательные аппараты" },
  { prefix: "30.30.32.190", label: "Летательные аппараты" },
  { prefix: "30.92.2", label: "Коляски детские" },
  { prefix: "30.92.40", label: "Изделия прочие транспортные" },
  { prefix: "31.01.1", label: "Мебель для офисов" },
  { prefix: "31.02.10", label: "Мебель кухонная" },
  { prefix: "31.09.12", label: "Мебель прочая" },
  { prefix: "31.09.13", label: "Мебель прочая" },
  { prefix: "32.20.11", label: "Аппаратура аудио- и видеозаписи" },
  { prefix: "32.20.12", label: "Аппаратура аудио- и видеозаписи" },
  { prefix: "32.20.13", label: "Аппаратура аудио- и видеозаписи" },
  { prefix: "32.20.14", label: "Аппаратура аудио- и видеозаписи" },
  { prefix: "32.20.15", label: "Аппаратура аудио- и видеозаписи" },
  { prefix: "32.30.11", label: "Аппаратура для приёма и передачи данных" },
  { prefix: "32.30.12", label: "Аппаратура для приёма и передачи данных" },
  { prefix: "32.30.13", label: "Аппаратура для приёма и передачи данных" },
  { prefix: "32.30.14", label: "Аппаратура для приёма и передачи данных" },
  { prefix: "32.30.15", label: "Аппаратура для приёма и передачи данных" },
  { prefix: "32.4", label: "Игры и игрушки" },
  { prefix: "32.50.22", label: "Обувь ортопедическая" },
  { prefix: "32.50.23", label: "Изделия медицинские протезно-ортопедические" },
  { prefix: "32.50.30.110", label: "Мебель медицинская" },
  { prefix: "32.50.30.119", label: "Мебель медицинская" },
  { prefix: "32.50.50", label: "Изделия медицинские прочие" },
  { prefix: "32.91.12.140", label: "Изделия прочие" },
  { prefix: "32.99.11.199", label: "Изделия прочие" },
  { prefix: "32.99.15.140", label: "Изделия прочие" },
  { prefix: "32.99.16.110", label: "Изделия прочие" },
  { prefix: "32.99.53", label: "Изделия прочие" },
  { prefix: "42.99.12.110", label: "Сооружения и строительные работы" },
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

export interface Okpd2NationalRegimeCheck {
  code: string;
  /** Ожидаемый режим по ПП РФ № 1875: запрет, ограничение или не установлен */
  regime: NationalRegimeExpected;
  groupLabel?: string;
  note?: string;
  legalBasis: string;
  /** Источник: справочник ОКПД2 переопределяет правила приложений */
  source: "dictionary" | "rule";
}

interface RuleCandidate {
  rule: RegimeRule;
  regime: Exclude<NationalRegimeExpected, null>;
  weight: number;
}

/**
 * Ищет самое точное правило: длинное (более специфичное) совпадение
 * приоритетнее; при равной длине приоритет у запрета (приложение № 1).
 */
const findRegimeRule = (code: string): RuleCandidate | null => {
  const candidates: RuleCandidate[] = [];

  for (const rule of PP_1875_BAN_RULES) {
    if (matchesPrefix(code, rule.prefix)) {
      candidates.push({
        rule,
        regime: "ban",
        weight: stripDots(rule.prefix).length,
      });
    }
  }

  for (const rule of PP_1875_RESTRICTION_RULES) {
    if (matchesPrefix(code, rule.prefix)) {
      candidates.push({
        rule,
        regime: "restriction",
        weight: stripDots(rule.prefix).length,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (a.regime === b.regime) return 0;
    return a.regime === "ban" ? -1 : 1;
  });

  return candidates[0];
};

/**
 * Проверяет код ОКПД2 по приложениям № 1 и № 2 к ПП РФ № 1875.
 * Запись справочника ОКПД2 с заполненным `nationalRegime` имеет приоритет
 * над правилами (позволяет закрыть позиции, не вошедшие в перечень в коде).
 */
export const checkOkpd2NationalRegime = (
  rawCode: string | undefined,
  dictionary?: Okpd2Ref[],
): Okpd2NationalRegimeCheck => {
  const code = normalizeCode(rawCode);

  if (!code) {
    return {
      code: "",
      regime: null,
      legalBasis: PP_1875_ACT_TITLE,
      source: "rule",
    };
  }

  const dictEntry = dictionary?.find(
    (item) => normalizeCode(item.code) === code,
  );

  if (dictEntry?.nationalRegime) {
    return {
      code,
      regime: dictEntry.nationalRegime,
      groupLabel:
        dictEntry.nationalRegime === "ban"
          ? "Приложение № 1 (запрет)"
          : "Приложение № 2 (ограничение)",
      note: dictEntry.nationalRegimeNote,
      legalBasis: PP_1875_ACT_TITLE,
      source: "dictionary",
    };
  }

  const match = findRegimeRule(code);

  if (!match) {
    return {
      code,
      regime: null,
      note: "Код не включён в перечни приложений № 1 и № 2 к ПП РФ № 1875.",
      legalBasis: PP_1875_ACT_TITLE,
      source: "rule",
    };
  }

  return {
    code,
    regime: match.regime,
    groupLabel:
      match.regime === "ban"
        ? `Приложение № 1 (запрет): ${match.rule.label}`
        : `Приложение № 2 (ограничение): ${match.rule.label}`,
    note: match.rule.note,
    legalBasis: PP_1875_ACT_TITLE,
    source: "rule",
  };
};

export interface NationalRegimeItemInput {
  code?: string;
  name?: string;
  declaredMode?: string;
}

export type NationalRegimeIssueLevel = "error" | "warning" | "info";

export interface NationalRegimeIssue {
  level: NationalRegimeIssueLevel;
  code?: string;
  itemName?: string;
  message: string;
}

export interface NationalRegimeItemCheck extends Okpd2NationalRegimeCheck {
  itemName?: string;
  declaredMode: NationalRegimeMode;
  level: NationalRegimeIssueLevel | null;
  message: string | null;
}

export interface NationalRegimeValidation {
  expectedMode: NationalRegimeExpected;
  items: NationalRegimeItemCheck[];
  issues: NationalRegimeIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
  /** Запрет/ограничение обязательны, но не установлены — сохранение блокируется */
  blocksSave: boolean;
  summary: string | null;
}

const normalizeMode = (mode?: string): NationalRegimeMode => {
  if (mode === "ban" || mode === "restriction" || mode === "advantage") {
    return mode;
  }
  return "none";
};

const modeIssue = (
  check: Okpd2NationalRegimeCheck,
  declared: NationalRegimeMode,
): { level: NationalRegimeIssueLevel | null; message: string | null } => {
  const codeLabel = check.code ? `Код ${check.code}` : "Позиция";

  if (check.regime === "ban") {
    if (declared === "ban") {
      return { level: null, message: null };
    }
    if (declared === "restriction") {
      return {
        level: "warning",
        message:
          `${codeLabel} включён в приложение № 1 к ПП РФ № 1875 (запрет). ` +
          `Установлено ограничение — это более мягкий режим: заявки с иностранным ` +
          `товаром будут отклоняться только при наличии заявки из ЕАЭС. ` +
          `Для позиции запрета требуется режим «Запрет».`,
      };
    }
    return {
      level: "error",
      message:
        `${codeLabel} включён в приложение № 1 к ПП РФ № 1875: установлен запрет ` +
        `на допуск иностранных товаров (работ, услуг). Режим «${nationalRegimeModeLabel(declared)}» ` +
        `недопустим — выберите «Запрет».`,
    };
  }

  if (check.regime === "restriction") {
    if (declared === "restriction" || declared === "ban") {
      return { level: null, message: null };
    }
    return {
      level: "error",
      message:
        `${codeLabel} включён в приложение № 2 к ПП РФ № 1875: установлено ` +
        `ограничение допуска иностранных товаров (работ, услуг). ` +
        `Режим «${nationalRegimeModeLabel(declared)}» недопустим — выберите ` +
        `«Ограничение» или «Запрет».`,
    };
  }

  if (declared === "ban" || declared === "restriction") {
    return {
      level: "warning",
      message:
        `${codeLabel} не входит в перечни приложений № 1 и № 2 к ПП РФ № 1875, ` +
        `но установлен режим «${nationalRegimeModeLabel(declared)}». ` +
        `Установление национального режима вне перечней требует обоснования ` +
        `в извещении (ст. 14 Закона № 44-ФЗ).`,
    };
  }

  if (declared === "advantage") {
    return {
      level: "info",
      message:
        `${codeLabel} не входит в перечни ПП РФ № 1875: преимущество для товаров ` +
        `российского происхождения применяется правомерно (при отсутствии ` +
        `запрета и ограничения).`,
    };
  }

  return { level: null, message: null };
};

/**
 * Сверяет объявленный национальный режим по каждой позиции с ожидаемым
 * по ПП РФ № 1875. Возвращает ошибки (блокируют сохранение), предупреждения
 * и информационные сообщения.
 */
export const validateNationalRegime = (
  inputs: NationalRegimeItemInput[],
  dictionary?: Okpd2Ref[],
): NationalRegimeValidation => {
  const items: NationalRegimeItemCheck[] = [];
  const issues: NationalRegimeIssue[] = [];
  let hasBan = false;
  let hasRestriction = false;

  for (const input of inputs) {
    const check = checkOkpd2NationalRegime(input.code, dictionary);
    const declaredMode = normalizeMode(input.declaredMode);

    if (!check.code) {
      continue;
    }

    if (check.regime === "ban") hasBan = true;
    if (check.regime === "restriction") hasRestriction = true;

    const { level, message } = modeIssue(check, declaredMode);

    items.push({
      ...check,
      itemName: input.name,
      declaredMode,
      level,
      message,
    });

    if (level && message) {
      issues.push({
        level,
        code: check.code,
        itemName: input.name,
        message,
      });
    }
  }

  const hasErrors = issues.some((issue) => issue.level === "error");
  const hasWarnings = issues.some((issue) => issue.level === "warning");

  const expectedMode: NationalRegimeExpected = hasBan
    ? "ban"
    : hasRestriction
      ? "restriction"
      : null;

  const summary = hasErrors
    ? `Национальный режим (ПП РФ № 1875): ${issues.filter((i) => i.level === "error").length} ошибок — сохранение заблокировано.`
    : hasWarnings
      ? `Национальный режим (ПП РФ № 1875): ${issues.filter((i) => i.level === "warning").length} предупреждений.`
      : expectedMode
        ? `Национальный режим (ПП РФ № 1875): ожидается «${nationalRegimeExpectedLabel(expectedMode)}» по позициям закупки — режим установлен корректно.`
        : null;

  return {
    expectedMode,
    items,
    issues,
    hasErrors,
    hasWarnings,
    blocksSave: hasErrors,
    summary,
  };
};
