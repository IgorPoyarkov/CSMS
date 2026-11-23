import {
  defectItemAmount,
  parseAmount,
  type DefectList,
} from "../DefectList/defectList.schema";
import {
  estimateNmckDelta,
  estimateNmckTotal,
  estimateTotals,
  isEstimateStale,
  type ContractEstimateDocument,
} from "./estimate.schema";

/**
 * Проверки сквозного процесса «дефектовка → смета → обоснование НМЦК».
 *
 * Возвращаются уровни, а не boolean: ошибки блокируют передачу в КС и
 * утверждение, предупреждения показываются, но не мешают сохранить черновик.
 * Проверки чистые — их использует и редактор, и тестовый скрипт.
 */

export type EstimateIssueLevel = "error" | "warning" | "info";

export interface EstimateValidationIssue {
  level: EstimateIssueLevel;
  code: string;
  message: string;
  field?: string;
}

export interface EstimateValidationOptions {
  /** Связанная дефектовка, если она загружена. */
  defect?: DefectList | null;
  /** Проверять ли связь с дефектовкой (в списке она может быть не загружена). */
  checkDefect?: boolean;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const validateEstimateDocument = (
  document: ContractEstimateDocument,
  options: EstimateValidationOptions = {},
): EstimateValidationIssue[] => {
  const issues: EstimateValidationIssue[] = [];
  const { defect, checkDefect = Boolean(options.defect) } = options;

  if (!document.organizationId) {
    issues.push({
      level: "error",
      code: "organization-required",
      message: "Смета не привязана к организации заказчика.",
      field: "organizationId",
    });
  }

  if (document.items.length === 0) {
    issues.push({
      level: "error",
      code: "items-empty",
      message:
        "В смете нет позиций. Соберите её из дефектовки или добавьте работы вручную.",
      field: "items",
    });
  }

  document.items.forEach((item, index) => {
    const prefix = `items.${index}`;
    const quantity = parseAmount(item.quantity);
    const unitPrice = parseAmount(item.unitPrice);

    if (!item.name?.trim()) {
      issues.push({
        level: "error",
        code: "item-name",
        message: `Позиция ${index + 1}: не указан вид работ.`,
        field: `${prefix}.name`,
      });
    }
    if (!item.unit?.trim()) {
      issues.push({
        level: "warning",
        code: "item-unit",
        message: `Позиция ${index + 1}: не указана единица измерения.`,
        field: `${prefix}.unit`,
      });
    }
    if (quantity <= 0) {
      issues.push({
        level: "error",
        code: "item-quantity",
        message: `Позиция ${index + 1}: количество должно быть больше нуля.`,
        field: `${prefix}.quantity`,
      });
    }
    if (unitPrice <= 0) {
      issues.push({
        level: "error",
        code: "item-price",
        message: `Позиция ${index + 1}: цена за единицу должна быть больше нуля.`,
        field: `${prefix}.unitPrice`,
      });
    }
    if (defectItemAmount(item) <= 0 && quantity > 0 && unitPrice > 0) {
      issues.push({
        level: "warning",
        code: "item-amount",
        message: `Позиция ${index + 1}: стоимость получилась нулевой.`,
        field: `${prefix}.quantity`,
      });
    }
  });

  const { overheadPercent, profitPercent, vatPercent } = document.estimate;

  if (overheadPercent < 0 || overheadPercent > 100) {
    issues.push({
      level: "error",
      code: "overhead-percent",
      message: "Накладные расходы должны быть в пределах 0–100 %.",
      field: "estimate.overheadPercent",
    });
  }
  if (profitPercent < 0 || profitPercent > 100) {
    issues.push({
      level: "error",
      code: "profit-percent",
      message: "Сметная прибыль должна быть в пределах 0–100 %.",
      field: "estimate.profitPercent",
    });
  }
  if (vatPercent < 0 || vatPercent > 100) {
    issues.push({
      level: "error",
      code: "vat-percent",
      message: "НДС должен быть в пределах 0–100 %.",
      field: "estimate.vatPercent",
    });
  }

  const totals = estimateTotals(document);
  const nmckTotal = estimateNmckTotal(document);

  if (nmckTotal === null) {
    issues.push({
      level:
        document.status === "review" || document.status === "approved"
          ? "error"
          : "warning",
      code: "nmck-missing",
      message:
        document.status === "review" || document.status === "approved"
          ? "Для проверки и утверждения нужно рассчитать обоснование НМЦК."
          : "Обоснование НМЦК ещё не рассчитано.",
      field: "nmck",
    });
  } else {
    if (nmckTotal <= 0) {
      issues.push({
        level: "error",
        code: "nmck-zero",
        message: "Итог НМЦК должен быть больше нуля.",
        field: "nmck.record.nmckTotal",
      });
    }

    const delta = estimateNmckDelta(document);

    if (delta !== null && Math.abs(delta) > 0.01) {
      issues.push({
        level: "warning",
        code: "nmck-mismatch",
        message: `Итог сметы ${round2(totals.total).toLocaleString("ru-RU")} ₽ не совпадает с НМЦК ${round2(nmckTotal).toLocaleString("ru-RU")} ₽ (расхождение ${round2(Math.abs(delta)).toLocaleString("ru-RU")} ₽).`,
        field: "nmck.record.nmckTotal",
      });
    }

    const record = document.nmck?.record;

    if (record && record.method !== "market_analysis") {
      const okpd2 = record.okpd2Code?.trim();
      if (!okpd2) {
        issues.push({
          level: "warning",
          code: "nmck-okpd2",
          message:
            "Для нормативного, тарифного и затратного методов желательно указать ОКПД2 — по нему проверяются ограничения и нормирование.",
          field: "nmck.record.okpd2Code",
        });
      }
    }
  }

  if (document.status === "approved") {
    if (!document.approvedAt) {
      issues.push({
        level: "error",
        code: "approved-at",
        message: "Не указана дата утверждения сметы.",
        field: "approvedAt",
      });
    }
    if (!document.approvedBy?.trim()) {
      issues.push({
        level: "error",
        code: "approved-by",
        message: "Не указано лицо, утвердившее смету.",
        field: "approvedBy",
      });
    }
  }

  if (checkDefect) {
    if (document.defectListId === undefined || document.defectListId === "") {
      issues.push({
        level: "warning",
        code: "defect-missing-link",
        message:
          "Смета не связана с дефектовкой. Соберите её из дефектовки, чтобы объёмы и цены были прослеживаемы.",
        field: "defectListId",
      });
    } else if (!defect) {
      issues.push({
        level: "error",
        code: "defect-not-found",
        message: "Связанная дефектовка не найдена в организации.",
        field: "defectListId",
      });
    } else {
      if (isEstimateStale(document, defect)) {
        issues.push({
          level: "warning",
          code: "defect-stale",
          message:
            "Дефектовка изменена после формирования сметы. Нажмите «Обновить из дефектовки», чтобы подтянуть новые объёмы.",
          field: "items",
        });
      }

      if (defect.items.length !== document.items.length) {
        issues.push({
          level: "warning",
          code: "defect-items-drift",
          message: `Количество позиций расходится с дефектовкой: ${document.items.length} против ${defect.items.length}.`,
          field: "items",
        });
      }

      if (defect.status === "draft" || defect.status === "returned") {
        issues.push({
          level:
            document.status === "review" || document.status === "approved"
              ? "warning"
              : "info",
          code: "defect-not-submitted",
          message:
            "Дефектовка ещё не принята в работу. Смету можно подготовить, но перед утверждением дефектовку должна проверить КС.",
          field: "defectListId",
        });
      }
    }
  }

  return issues;
};

export const estimateValidationSummary = (
  issues: EstimateValidationIssue[],
): { errors: number; warnings: number; canSubmit: boolean } => {
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.filter((issue) => issue.level === "warning").length;

  return { errors, warnings, canSubmit: errors === 0 };
};
