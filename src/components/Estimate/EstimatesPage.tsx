import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import {
  defectListStatusLabels,
  defectDirectCost,
} from "../../services/DefectList/defectList.schema";
import { useOrganizationDefectLists } from "../../services/DefectList/defectList.api";
import {
  canEditEstimate,
  canViewEstimate,
  estimateDocumentStatusLabels,
  estimateNmckDelta,
  estimateNmckTotal,
  estimateTotals,
  type ContractEstimateDocument,
  type EstimateActor,
  type EstimateDocumentStatus,
} from "../../services/Estimate/estimate.schema";
import {
  useDeleteEstimate,
  useOrganizationEstimates,
} from "../../services/Estimate/estimate.api";
import styles from "./Estimate.module.scss";

/**
 * Реестр смет и обоснований НМЦК — отдельный модуль сквозного процесса.
 *
 * Вход: дефектовка (объёмы работ). Внутри: проект сметы (421/пр) и
 * обоснование НМЦК (ст. 22 44-ФЗ, приказ МЭР № 567). Выход: утверждённый
 * документ, связанный с дефектовкой и доступный из неё.
 */

type StatusFilter = EstimateDocumentStatus | "all";

const statusFilters: StatusFilter[] = [
  "all",
  "draft",
  "review",
  "approved",
  "returned",
];

const money = (value: number): string =>
  value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function EstimatesPage() {
  const { bem, formatDate, fullName } = useUtils();
  const block = bem(styles, "estimates");

  const {
    organization,
    employee,
    isContractServiceMember,
    isHead,
    myFunctions,
  } = useMyContractRole();
  const orgId = organization?.id;

  const { data: estimates = [], isLoading } = useOrganizationEstimates(orgId);
  const { data: defects = [] } = useOrganizationDefectLists(orgId);
  const deleteEstimate = useDeleteEstimate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionError, setActionError] = useState("");

  const actor: EstimateActor = {
    employeeId: employee?.id,
    isContractServiceMember,
    isHead,
    myFunctions,
  };

  const defectsById = useMemo(
    () => new Map(defects.map((defect) => [String(defect.id), defect])),
    [defects],
  );

  const visible = useMemo(
    () => estimates.filter((estimate) => canViewEstimate(estimate, actor)),
    // actor собирается из стабильных полей профиля
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estimates, employee?.id, isContractServiceMember],
  );

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      all: visible.length,
      draft: 0,
      review: 0,
      approved: 0,
      returned: 0,
    };

    visible.forEach((estimate) => {
      result[estimate.status] += 1;
    });

    return result;
  }, [visible]);

  const totals = useMemo(() => {
    let estimateTotal = 0;
    let nmckTotal = 0;

    visible.forEach((estimate) => {
      estimateTotal += estimateTotals(estimate).total;
      nmckTotal += estimateNmckTotal(estimate) ?? 0;
    });

    return {
      estimateTotal: Math.round(estimateTotal * 100) / 100,
      nmckTotal: Math.round(nmckTotal * 100) / 100,
    };
  }, [visible]);

  const filtered =
    statusFilter === "all"
      ? visible
      : visible.filter((estimate) => estimate.status === statusFilter);

  const authorName = fullName(employee?.employee ?? {});

  const handleDelete = (estimate: ContractEstimateDocument) => {
    if (
      !window.confirm(
        `Удалить смету «${estimate.objectName || "без объекта"}»? Дефектовка останется, связь с ней снимется.`,
      )
    ) {
      return;
    }

    setActionError("");
    deleteEstimate.mutate(estimate.id as string | number, {
      onError: () => {
        setActionError("Не удалось удалить смету. Попробуйте ещё раз.");
      },
    });
  };

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>Сметы и обоснования НМЦК</h1>
          <p className={block("subtitle")}>
            Сквозной процесс: дефектовка даёт объёмы работ, модуль собирает
            проект сметы контракта (приказ Минстроя России № 421/пр) и
            обоснование НМЦК (ст. 22 Закона № 44-ФЗ, приказ МЭР № 567).
            Утверждённый документ возвращается в дефектовку и доступен из неё.
          </p>
        </div>

        <div className={block("header-actions")}>
          <span
            className={block("role", [
              isContractServiceMember
                ? "service"
                : employee?.id
                  ? "initiator"
                  : "unknown",
            ])}
          >
            {isContractServiceMember
              ? "Контрактная служба"
              : employee?.id
                ? "Инициатор закупки"
                : "Роль не определена"}
          </span>

          <Link className={block("primary")} to="/estimates/new">
            + Смета из дефектовки
          </Link>
        </div>
      </header>

      {actionError && <p className={block("alert")}>{actionError}</p>}

      <div className={block("stats")}>
        <div className={block("stat")}>
          <span>Документов</span>
          <strong>{visible.length}</strong>
        </div>
        <div className={block("stat")}>
          <span>Итог смет</span>
          <strong>{money(totals.estimateTotal)} ₽</strong>
        </div>
        <div className={block("stat")}>
          <span>Итог НМЦК</span>
          <strong>{money(totals.nmckTotal)} ₽</strong>
        </div>
        <div className={block("stat")}>
          <span>Утверждено</span>
          <strong>{counts.approved}</strong>
        </div>
      </div>

      <div className={block("toolbar")}>
        <div
          className={block("filters")}
          role="group"
          aria-label="Фильтр по статусу сметы"
        >
          {statusFilters.map((status) => (
            <button
              key={status}
              type="button"
              className={block("chip", [
                statusFilter === status ? "active" : "",
              ])}
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "Все" : estimateDocumentStatusLabels[status]}
              <span className={block("chip-count")}>{counts[status]}</span>
            </button>
          ))}
        </div>

        <span className={block("hint")}>
          {isContractServiceMember
            ? "Контрактная служба видит все сметы организации и утверждает их."
            : "Инициатор видит свои сметы и может готовить их до проверки в КС."}
        </span>
      </div>

      {isLoading ? (
        <p className={block("empty")}>Загрузка смет…</p>
      ) : filtered.length === 0 ? (
        <p className={block("empty")}>
          {visible.length === 0
            ? "Смет пока нет. Откройте дефектовку и нажмите «Сформировать смету» — позиции, объёмы и цены перенесутся автоматически."
            : "Нет смет с выбранным статусом."}
        </p>
      ) : (
        <ul className={block("list")}>
          {filtered.map((estimate) => {
            const defect = estimate.defectListId
              ? defectsById.get(String(estimate.defectListId))
              : undefined;
            const estimateTotal = estimateTotals(estimate);
            const nmck = estimateNmckTotal(estimate);
            const delta = estimateNmckDelta(estimate);
            const editable = canEditEstimate(estimate, actor);
            const isBusy =
              deleteEstimate.isPending &&
              String(deleteEstimate.variables) === String(estimate.id);

            return (
              <li className={block("card")} key={String(estimate.id)}>
                <div className={block("card-head")}>
                  <h2 className={block("card-title")}>
                    {estimate.objectName ||
                      defect?.objectName ||
                      "Объект не указан"}
                  </h2>
                  <span className={block("status", [estimate.status])}>
                    {estimateDocumentStatusLabels[estimate.status]}
                  </span>
                </div>

                <dl className={block("meta")}>
                  <div className={block("meta-row")}>
                    <dt>Дефектовка</dt>
                    <dd>
                      {defect
                        ? `${defect.items.length} поз. · ${defectListStatusLabels[defect.status]}`
                        : estimate.defectListId
                          ? "связь есть, документ не загружен"
                          : "не связана"}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Прямые затраты</dt>
                    <dd>{money(defectDirectCost(estimate.items))} ₽</dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Проект сметы</dt>
                    <dd>
                      {money(estimateTotal.total)} ₽ · НДС{" "}
                      {money(estimateTotal.vat)} ₽
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>НМЦК</dt>
                    <dd>
                      {nmck === null
                        ? "не рассчитана"
                        : `${money(nmck)} ₽${
                            delta !== null && Math.abs(delta) > 0.01
                              ? ` · расхождение ${money(Math.abs(delta))} ₽`
                              : " · сходится со сметой"
                          }`}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Автор</dt>
                    <dd>
                      {estimate.authorName || "—"}
                      {estimate.structuralUnitName
                        ? ` · ${estimate.structuralUnitName}`
                        : ""}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Обновлено</dt>
                    <dd>{formatDate(estimate.updatedAt) || "—"}</dd>
                  </div>
                </dl>

                <div className={block("card-actions")}>
                  <Link
                    className={block("action", ["primary"])}
                    to={`/estimates/${estimate.id}`}
                  >
                    Открыть смету и НМЦК
                  </Link>

                  {estimate.defectListId && (
                    <Link className={block("action")} to="/defect-lists">
                      Дефектовка
                    </Link>
                  )}

                  {editable && (
                    <button
                      type="button"
                      className={block("action", ["danger"])}
                      disabled={isBusy}
                      onClick={() => handleDelete(estimate)}
                    >
                      {isBusy ? "Удаление…" : "Удалить"}
                    </button>
                  )}

                  <span className={block("hint")}>
                    Автор: {estimate.authorName || authorName || "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
