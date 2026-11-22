import { useAcceptances } from "../../services/Acceptance/acceptance.api";
import type { AcceptanceResponse } from "../../services/Acceptance/acceptance.types";
import {
  acceptedAcceptanceStatuses,
  issueIsError,
  reviewAcceptanceStatuses,
} from "./acceptance.config";

/**
 * Проекция списка приёмок для сводок карточки контракта и реестра.
 *
 * Один и тот же запрос `useAcceptances` используется в двух местах: в сводке
 * (`ContractCardSummary`) нужны только суммы и количество, в секции карточки —
 * ещё и строки, отсортированные по дате документа. Селектор считается один раз
 * на изменение данных и не повторяется на каждом рендере.
 */
export interface AcceptanceSummary {
  /** Всего документов о приёмке. */
  count: number;
  /** Документов, по которым приёмка состоялась. */
  acceptedCount: number;
  /** Принятая сумма с НДС. */
  acceptedTotal: number;
  /** Документов в работе (направлены или возвращены на уточнение). */
  onReview: number;
  /** Ошибок проверки по всем документам. */
  errors: number;
  /** Строки для таблицы: свежие документы первыми. */
  rows: AcceptanceResponse[];
}

const summarizeAcceptances = (
  acceptances: AcceptanceResponse[],
): AcceptanceSummary => {
  let acceptedCount = 0;
  let acceptedTotal = 0;
  let onReview = 0;
  let errors = 0;

  for (const acceptance of acceptances) {
    if (acceptedAcceptanceStatuses.includes(acceptance.status)) {
      acceptedCount += 1;
      acceptedTotal += acceptance.totalWithVat;
    }

    if (reviewAcceptanceStatuses.includes(acceptance.status)) {
      onReview += 1;
    }

    errors += acceptance.issues.filter((issue) =>
      issueIsError(issue.severity),
    ).length;
  }

  const rows = [...acceptances].sort((a, b) =>
    (b.input.documentDate ?? "").localeCompare(a.input.documentDate ?? ""),
  );

  return {
    count: acceptances.length,
    acceptedCount,
    acceptedTotal,
    onReview,
    errors,
    rows,
  };
};

/** Сводка приёмок по контракту — с общей проекцией для всех секций карточки. */
export const useAcceptanceSummary = (
  organizationId: string | undefined,
  contractId?: string,
) =>
  useAcceptances(
    organizationId,
    contractId,
    undefined,
    summarizeAcceptances,
  );
