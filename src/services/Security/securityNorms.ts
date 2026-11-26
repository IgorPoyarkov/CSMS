/**
 * Нормы размеров обеспечений по Закону № 44-ФЗ.
 *
 * Единый источник правил для служебной записки, извещения, проекта контракта и
 * реестра обеспечений. До появления модуля пределы были продублированы в схемах
 * и расходились: СЗ допускала 0…100 %, извещение — 0…5/0…30 %, проект контракта
 * — 0,5…30 %, а проверки проекта ни на что не влияли.
 *
 * Уровни замечаний:
 * — «error» — нарушение нормы: обеспечение заявки (ч. 1 ст. 44), обеспечение
 *   гарантийных обязательств (ч. 7 ст. 34) и обеспечение исполнения в общем
 *   случае (ч. 6 ст. 96). Ошибки блокируют утверждение СЗ и сохранение
 *   извещения, в проекте контракта показываются красным в панели проверок;
 * — «warning» — допустимое отклонение: исполнение выше 30 %, когда аванс
 *   превышает 30 % НМЦК (размер устанавливается не ниже аванса), и расхождение
 *   суммы с процентом (сумма пересчитывается при изменении цены контракта).
 *
 * Черновики не блокируются: правку норм нельзя требовать до того, как посчитана
 * НМЦК, поэтому проверки работают на утверждении и сохранении итогового
 * документа, а не на каждом автосохранении.
 *
 * Источники норм: docs/legal/consultant-qa-44fz-200.source.md,
 * docs/legal/consultant-qa-gz-100.source.md.
 */

export const SECURITY_NORMS = {
  /** Обеспечение заявки: ч. 1 ст. 44 — 0,5–1 % до 20 млн, 0,5–5 % свыше. */
  applicationMin: 0.5,
  applicationMaxLow: 1,
  applicationMaxHigh: 5,
  applicationThreshold: 20_000_000,
  /** Обеспечение исполнения контракта: ч. 6 ст. 96 — 0,5–30 %. */
  performanceMin: 0.5,
  performanceMax: 30,
  /** Аванс свыше 30 % НМЦК: обеспечение не может быть меньше аванса. */
  advanceThreshold: 30,
  /** Обеспечение гарантийных обязательств: ч. 7 ст. 34 — не более 10 %. */
  warrantyMax: 10,
} as const;

export const SECURITY_NORMS_SOURCE = {
  application: "ч. 1 ст. 44 Закона № 44-ФЗ",
  performance: "ч. 6 ст. 96 Закона № 44-ФЗ",
  advance: "ч. 6 ст. 96 Закона № 44-ФЗ",
  warranty: "ч. 7 ст. 34, ст. 96 Закона № 44-ФЗ",
} as const;

/**
 * Уровень замечания: «error» блокирует утверждение документа, «warning» —
 * только информирует (законное отклонение или пересчитываемая величина).
 */
export type SecurityNormsLevel = "error" | "warning";

/** Вид обеспечения — по нему вызывающий код сопоставляет поле формы. */
export type SecurityNormsField = "application" | "performance" | "warranty";

export interface SecurityNormsIssue {
  /** Код правила — по нему пишутся тесты и фильтры в интерфейсе. */
  code: string;
  level: SecurityNormsLevel;
  field: SecurityNormsField;
  /** Путь поля в служебной записке и извещении. */
  path: Array<string | number>;
  message: string;
  /** Пункт закона, из которого следует проверка. */
  legalRef: string;
}

export interface SecurityNormsPart {
  /** Требуется ли обеспечение по документу. */
  required?: boolean;
  /** Размер в процентах: число или строка формы (пустая строка — не задан). */
  percent?: number | string | null;
  /** Сумма в рублях — только для обеспечения исполнения контракта. */
  amount?: number | string | null;
}

export interface SecurityNormsInput {
  /** НМЦК или цена контракта в рублях; 0/пусто — ещё не рассчитана. */
  price?: number | string | null;
  application?: SecurityNormsPart;
  performance?: SecurityNormsPart;
  warranty?: SecurityNormsPart;
  /** Аванс: процент от цены и казначейское сопровождение. */
  advance?: { percent?: number | string | null; treasurySupport?: boolean };
}

/** Число из значения формы: пустое значение — null, запятая допустима. */
export const securityPercent = (
  value?: number | string | null,
): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const normalized = value.trim().replace(",", ".").replace(/\s/g, "");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export interface ApplicationSecurityRange {
  min: number;
  max: number;
  /** true — верхняя граница определена по НМЦК, false — общая 0,5–5 %. */
  byNmck: boolean;
}

/** Допустимый размер обеспечения заявки для НМЦК (ч. 1 ст. 44). */
export const applicationSecurityRange = (
  price?: number | string | null,
): ApplicationSecurityRange => {
  const nmck = securityPercent(price);
  if (nmck === null || nmck <= 0) {
    return {
      min: SECURITY_NORMS.applicationMin,
      max: SECURITY_NORMS.applicationMaxHigh,
      byNmck: false,
    };
  }
  return {
    min: SECURITY_NORMS.applicationMin,
    max:
      nmck > SECURITY_NORMS.applicationThreshold
        ? SECURITY_NORMS.applicationMaxHigh
        : SECURITY_NORMS.applicationMaxLow,
    byNmck: true,
  };
};

const percentText = (value: number): string =>
  `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} %`;

const moneyText = (value: number): string =>
  `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;

/**
 * Замечания по размерам обеспечений.
 *
 * «error» — норма нарушена (блокирует утверждение), «warning» — отклонение
 * допустимо по закону или величина пересчитывается.
 */
export const validateSecurityNorms = (
  input: SecurityNormsInput,
): SecurityNormsIssue[] => {
  const issues: SecurityNormsIssue[] = [];
  const price = securityPercent(input.price);

  const push = (
    code: string,
    level: SecurityNormsLevel,
    field: SecurityNormsField,
    path: Array<string | number>,
    message: string,
    legalRef: string,
  ) => {
    issues.push({ code, level, field, path, message, legalRef });
  };

  // Аванс свыше 30 % НМЦК: по ч. 6 ст. 96 размер обеспечения исполнения
  // устанавливается не ниже аванса, поэтому общий предел 30 % в этом случае
  // не действует. Казначейское сопровождение снимает требование обеспечения.
  const advancePercent = securityPercent(input.advance?.percent);
  const advanceAboveLimit =
    advancePercent !== null && advancePercent > SECURITY_NORMS.advanceThreshold;

  // ─── Обеспечение заявки (ч. 1 ст. 44) ────────────────────────────────────
  if (input.application?.required) {
    const percent = securityPercent(input.application.percent);
    const range = applicationSecurityRange(input.price);
    const hint =
      range.byNmck && price !== null
        ? `для НМЦК ${moneyText(price)} норма ${percentText(range.min)}–${percentText(range.max)}`
        : `норма ${percentText(range.min)}–${percentText(range.max)} (до 20 млн — 0,5–1 %, свыше 20 млн — 0,5–5 %)`;
    if (percent === null) {
      push(
        "app_percent_missing",
        "error",
        "application",
        ["participantsRequirements", "applicationSecurityPercent"],
        `Обеспечение заявки требуется, но размер не указан: ${hint}.`,
        SECURITY_NORMS_SOURCE.application,
      );
    } else if (percent < range.min || percent > range.max) {
      push(
        "app_percent_out_of_range",
        "error",
        "application",
        ["participantsRequirements", "applicationSecurityPercent"],
        `Обеспечение заявки ${percentText(percent)} вне нормы: ${hint}.`,
        SECURITY_NORMS_SOURCE.application,
      );
    }
  }

  // ─── Обеспечение исполнения контракта (ч. 6 ст. 96) ──────────────────────
  if (input.performance?.required) {
    const percent = securityPercent(input.performance.percent);
    const rangeText = `${percentText(SECURITY_NORMS.performanceMin)}–${percentText(SECURITY_NORMS.performanceMax)}`;
    if (percent === null) {
      push(
        "perf_percent_missing",
        "error",
        "performance",
        ["participantsRequirements", "contractSecurityPercent"],
        `Обеспечение исполнения контракта требуется, но размер не указан: норма ${rangeText}.`,
        SECURITY_NORMS_SOURCE.performance,
      );
    } else {
      if (percent < SECURITY_NORMS.performanceMin) {
        push(
          "perf_percent_out_of_range",
          "error",
          "performance",
          ["participantsRequirements", "contractSecurityPercent"],
          `Обеспечение исполнения контракта ${percentText(percent)} вне нормы: норма ${rangeText}.`,
          SECURITY_NORMS_SOURCE.performance,
        );
      } else if (percent > SECURITY_NORMS.performanceMax) {
        // Предел 30 % не действует, когда аванс превышает 30 % НМЦК: размер
        // обеспечения устанавливается не ниже аванса (ч. 6 ст. 96). Это не
        // ошибка, но пользователь должен понимать, откуда взялось значение.
        if (advanceAboveLimit && advancePercent !== null) {
          push(
            "perf_percent_out_of_range",
            "warning",
            "performance",
            ["participantsRequirements", "contractSecurityPercent"],
            `Обеспечение исполнения контракта ${percentText(percent)} выше общего предела ${percentText(SECURITY_NORMS.performanceMax)}, но аванс ${percentText(advancePercent)} превышает 30 % — по ч. 6 ст. 96 размер устанавливается не ниже аванса.`,
            SECURITY_NORMS_SOURCE.performance,
          );
        } else {
          push(
            "perf_percent_out_of_range",
            "error",
            "performance",
            ["participantsRequirements", "contractSecurityPercent"],
            `Обеспечение исполнения контракта ${percentText(percent)} вне нормы: норма ${rangeText}. Размер выше 30 % допускается только при авансе свыше 30 % НМЦК.`,
            SECURITY_NORMS_SOURCE.performance,
          );
        }
      }

      // Аванс свыше 30 %: обеспечение не может быть меньше аванса, кроме
      // казначейского сопровождения (там база — НМЦК за вычетом аванса).
      if (
        advanceAboveLimit &&
        advancePercent !== null &&
        input.advance?.treasurySupport !== true &&
        percent < advancePercent
      ) {
        push(
          "perf_below_advance",
          "error",
          "performance",
          ["participantsRequirements", "contractSecurityPercent"],
          `Аванс ${percentText(advancePercent)} превышает 30 %: обеспечение исполнения не может быть меньше аванса — нужно не менее ${percentText(advancePercent)}.`,
          SECURITY_NORMS_SOURCE.advance,
        );
      }

      // Сумма обеспечения должна соответствовать проценту от цены. Сумма
      // пересчитывается при изменении цены контракта, поэтому расхождение —
      // предупреждение, а не блокирующая ошибка.
      const amount = securityPercent(input.performance.amount);
      if (amount !== null && price !== null && price > 0) {
        const expected = (price * percent) / 100;
        if (Math.abs(amount - expected) > 1) {
          push(
            "perf_amount_mismatch",
            "warning",
            "performance",
            ["participantsRequirements", "contractSecurityPercent"],
            `Сумма обеспечения ${moneyText(amount)} не соответствует ${percentText(percent)} от цены ${moneyText(price)}: ожидается ${moneyText(expected)}.`,
            SECURITY_NORMS_SOURCE.performance,
          );
        }
      }
    }
  }

  // ─── Обеспечение гарантийных обязательств (ч. 7 ст. 34) ──────────────────
  if (input.warranty?.required) {
    const percent = securityPercent(input.warranty.percent);
    // 0 % при включённом требовании — фактически отсутствие обеспечения:
    // извещение приходит с дефолтом 0, и это нужно заметить до утверждения.
    if (percent === null || percent <= 0) {
      push(
        "warranty_percent_missing",
        "error",
        "warranty",
        ["participantsRequirements", "warrantySecurityPercent"],
        `Обеспечение гарантийных обязательств требуется, но размер не задан: норма — не более ${percentText(SECURITY_NORMS.warrantyMax)}.`,
        SECURITY_NORMS_SOURCE.warranty,
      );
    } else if (percent > SECURITY_NORMS.warrantyMax) {
      push(
        "warranty_percent_out_of_range",
        "error",
        "warranty",
        ["participantsRequirements", "warrantySecurityPercent"],
        `Обеспечение гарантийных обязательств ${percentText(percent)} вне нормы: не более ${percentText(SECURITY_NORMS.warrantyMax)}.`,
        SECURITY_NORMS_SOURCE.warranty,
      );
    }
  }

  return issues;
};

