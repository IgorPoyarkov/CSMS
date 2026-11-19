import { useMemo, useState } from "react";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import { useLegalActs } from "../../services/LegalAct/legalAct.api";
import { formatLegalAct } from "../../services/LegalAct/legalAct.schema";
import {
  BID_EVALUATION_LEGAL_ACT_ID,
  bidEvaluationStatusLabels,
  criterionShortLabels,
  evaluateBids,
  hasValidationErrors,
  objectCategoryLimits,
  parseNumber,
  pp2604Applies,
  procedureApplicabilityHint,
  procedureKindLabels,
  sortBidEvaluations,
  validateBidEvaluation,
  type BidEvaluation,
  type BidEvaluationStatus,
} from "../../services/BidEvaluation/bidEvaluation.schema";
import {
  useDeleteBidEvaluation,
  useOrganizationBidEvaluations,
  useUpdateBidEvaluation,
} from "../../services/BidEvaluation/bidEvaluation.api";
import BidEvaluationModal from "./BidEvaluationModal";
import styles from "./BidEvaluationsPage.module.scss";

/**
 * Оценка заявок по ПП РФ N 2604.
 *
 * Экран ведёт документ оценки от черновика до подведения итогов:
 * - черновик — состав критериев и показателей можно менять;
 * - «опубликовано» — порядок оценки зафиксирован, проверки не пропустят
 *   конфигурацию, противоречащую Положению;
 * - «заявки оценены» — по предложениям участников посчитаны баллы и места.
 *
 * Для аукциона применяется только критерий цены (п. 4 Положения), для
 * конкурса — не менее двух критериев, одним из которых должна быть цена
 * (п. 5). Предельные величины значимости — приложение N 2.
 */

type StatusFilter = BidEvaluationStatus | "all";

const statusFilters: StatusFilter[] = [
  "all",
  "draft",
  "published",
  "evaluated",
];

const today = (): string => new Date().toISOString().slice(0, 10);

const money = (value: number): string =>
  value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function BidEvaluationsPage() {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "bid-evaluations");

  const { organization } = useMyContractRole();
  const orgId = organization?.id;

  const { data: evaluations = [], isLoading } =
    useOrganizationBidEvaluations(orgId);
  const { data: acts = [] } = useLegalActs();

  const updateEvaluation = useUpdateBidEvaluation();
  const deleteEvaluation = useDeleteBidEvaluation();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalEvaluation, setModalEvaluation] = useState<
    BidEvaluation | null | undefined
  >(undefined);
  const [actionError, setActionError] = useState("");

  const legalAct = acts.find(
    (act) => String(act.id) === BID_EVALUATION_LEGAL_ACT_ID,
  );

  const visible = useMemo(() => sortBidEvaluations(evaluations), [evaluations]);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      all: visible.length,
      draft: 0,
      published: 0,
      evaluated: 0,
    };

    visible.forEach((evaluation) => {
      result[evaluation.status] += 1;
    });

    return result;
  }, [visible]);

  const filtered =
    statusFilter === "all"
      ? visible
      : visible.filter((evaluation) => evaluation.status === statusFilter);

  const ensureValid = (
    evaluation: BidEvaluation,
    status: BidEvaluationStatus,
  ): boolean => {
    const issues = validateBidEvaluation({ ...evaluation, status });
    const errors = issues.filter((issue) => issue.level === "error");

    if (hasValidationErrors(issues)) {
      setActionError(errors[0].message);

      return false;
    }

    setActionError("");

    return true;
  };

  const handlePublish = (evaluation: BidEvaluation) => {
    if (!ensureValid(evaluation, "published")) {
      return;
    }

    updateEvaluation.mutate({
      id: evaluation.id as string | number,
      status: "published",
      publishedAt: today(),
      updatedAt: today(),
    });
  };

  const handleEvaluate = (evaluation: BidEvaluation) => {
    if (!ensureValid(evaluation, "evaluated")) {
      return;
    }

    const result = evaluateBids(evaluation);

    updateEvaluation.mutate({
      id: evaluation.id as string | number,
      status: "evaluated",
      evaluatedAt: today(),
      updatedAt: today(),
      bids: evaluation.bids.map((bid, index) => ({
        ...bid,
        totalScore: result.bids[index]?.totalScore ?? 0,
        rank: result.bids[index]?.rank ?? 0,
      })),
    });
  };

  const handleDelete = (evaluation: BidEvaluation) => {
    if (
      !window.confirm(
        `Удалить оценку заявок «${evaluation.objectName || "без объекта"}»? Действие необратимо.`,
      )
    ) {
      return;
    }

    deleteEvaluation.mutate(evaluation.id as string | number);
  };

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>Оценка заявок</h1>
          <p className={block("subtitle")}>
            Критерии и показатели оценки, предельные величины значимости и
            расчёт баллов по Положению, утверждённому постановлением
            Правительства РФ от 31.12.2021 № 2604.
          </p>
          {legalAct && (
            <p className={block("norm")}>
              Норма в реестре: {formatLegalAct(legalAct)}
              {legalAct.isVerified ? " · сверено" : ""}
            </p>
          )}
        </div>

        <div className={block("header-actions")}>
          <button
            type="button"
            className={block("primary")}
            disabled={!orgId}
            onClick={() => setModalEvaluation(null)}
          >
            + Новая оценка
          </button>
        </div>
      </header>

      {actionError && <p className={block("alert")}>{actionError}</p>}

      <div
        className={block("filters")}
        role="group"
        aria-label="Фильтр по статусу"
      >
        {statusFilters.map((status) => (
          <button
            key={status}
            type="button"
            className={block("chip", [statusFilter === status ? "active" : ""])}
            onClick={() => setStatusFilter(status)}
          >
            {status === "all" ? "Все" : bidEvaluationStatusLabels[status]}
            <span className={block("chip-count")}>{counts[status]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className={block("empty")}>Загрузка оценок…</p>
      ) : filtered.length === 0 ? (
        <p className={block("empty")}>
          {visible.length === 0
            ? "Оценок пока нет. Создайте документ — критерии и значимость задаются один раз, баллы считаются по предложениям участников."
            : "Нет оценок с выбранным статусом."}
        </p>
      ) : (
        <ul className={block("list")}>
          {filtered.map((evaluation) => {
            const applies = pp2604Applies(evaluation.procedureKind);
            const result = evaluateBids(evaluation);
            const winnerIndex = result.bids.findIndex((bid) => bid.rank === 1);
            const winner =
              winnerIndex >= 0 ? evaluation.bids[winnerIndex] : undefined;
            const enabled = evaluation.criteria.filter(
              (criterion) => criterion.enabled,
            );
            const issues = validateBidEvaluation(evaluation);
            const errors = issues.filter((issue) => issue.level === "error");
            const warnings = issues.filter(
              (issue) => issue.level === "warning",
            );
            const limits = objectCategoryLimits(evaluation.objectCategory);
            const isBusy =
              updateEvaluation.isPending &&
              String(updateEvaluation.variables?.id) === String(evaluation.id);

            return (
              <li className={block("card")} key={String(evaluation.id)}>
                <div className={block("card-head")}>
                  <div>
                    <h2 className={block("card-title")}>
                      {evaluation.objectName || "Объект не указан"}
                    </h2>
                    <p className={block("card-subtitle")}>
                      {procedureKindLabels[evaluation.procedureKind]} ·{" "}
                      {limits.label}
                      {!applies ? " · Положение N 2604 не применяется" : ""}
                    </p>
                  </div>
                  <span className={block("status", [evaluation.status])}>
                    {bidEvaluationStatusLabels[evaluation.status]}
                  </span>
                </div>

                <dl className={block("meta")}>
                  <div className={block("meta-row")}>
                    <dt>НМЦК</dt>
                    <dd>{money(parseNumber(evaluation.nmck))} ₽</dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Критерии</dt>
                    <dd>
                      {enabled.length > 0
                        ? enabled
                            .map(
                              (criterion) =>
                                `${criterionShortLabels[criterion.type]} ${parseNumber(
                                  criterion.weightPercent,
                                )}%`,
                            )
                            .join(" · ")
                        : "не заданы"}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Заявки</dt>
                    <dd>
                      {evaluation.bids.length === 0
                        ? "не введены"
                        : !applies
                          ? `${evaluation.bids.length} · оцениваются по цене`
                          : evaluation.status === "evaluated"
                            ? `${evaluation.bids.length} · лидер: ${
                                winner?.participantName || "—"
                              } (${money(result.bids[winnerIndex]?.totalScore ?? 0)} баллов)`
                            : `${evaluation.bids.length} · итоги не подведены`}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Проверки</dt>
                    <dd>
                      {errors.length === 0
                        ? warnings.length === 0
                          ? "замечаний нет"
                          : `${warnings.length} предупрежд.`
                        : `${errors.length} ошибок, ${warnings.length} предупрежд.`}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Изменено</dt>
                    <dd>
                      {formatDate(evaluation.updatedAt) || "—"}
                      {evaluation.evaluatedAt
                        ? ` · итоги ${formatDate(evaluation.evaluatedAt)}`
                        : evaluation.publishedAt
                          ? ` · опубликовано ${formatDate(evaluation.publishedAt)}`
                          : ""}
                    </dd>
                  </div>
                </dl>

                {errors.length > 0 && (
                  <ul className={block("issues")}>
                    {errors.slice(0, 3).map((issue, index) => (
                      <li className={block("issue", ["error"])} key={index}>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                )}

                <div className={block("card-actions")}>
                  <button
                    type="button"
                    className={block("action")}
                    onClick={() => setModalEvaluation(evaluation)}
                  >
                    Редактировать
                  </button>

                  {evaluation.status === "draft" && (
                    <button
                      type="button"
                      className={block("action", ["primary"])}
                      disabled={isBusy}
                      onClick={() => handlePublish(evaluation)}
                    >
                      Опубликовать порядок оценки
                    </button>
                  )}

                  {applies && evaluation.status === "published" && (
                    <button
                      type="button"
                      className={block("action", ["primary"])}
                      disabled={isBusy}
                      onClick={() => handleEvaluate(evaluation)}
                    >
                      Оценить заявки
                    </button>
                  )}

                  {applies && evaluation.status === "evaluated" && (
                    <button
                      type="button"
                      className={block("action", ["primary"])}
                      disabled={isBusy}
                      onClick={() => handleEvaluate(evaluation)}
                    >
                      Пересчитать баллы
                    </button>
                  )}

                  {!applies && (
                    <span className={block("task-note")}>
                      {procedureApplicabilityHint[evaluation.procedureKind]}
                    </span>
                  )}

                  <button
                    type="button"
                    className={block("action", ["danger"])}
                    onClick={() => handleDelete(evaluation)}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalEvaluation !== undefined && (
        <BidEvaluationModal
          organizationId={orgId ?? ""}
          evaluation={modalEvaluation}
          onClose={() => setModalEvaluation(undefined)}
        />
      )}
    </main>
  );
}
