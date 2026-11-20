import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import Loader from "../UI/Loader";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import { useAcceptances } from "../../services/Acceptance/acceptance.api";
import type { AcceptanceStatus } from "../../services/Acceptance/acceptance.types";
import { readApiError } from "../../services/csmsApi";
import {
  acceptanceKindLabels,
  acceptanceResultLabels,
  acceptanceStatusLabels,
  acceptanceStatusOrder,
  acceptanceStatusTone,
  canEditAcceptance,
  formatMoney,
  issueIsError,
} from "./acceptance.config";
import styles from "./Acceptance.module.scss";

/**
 * Реестр документов о приёмке (электронное актирование, ст. 94 44-ФЗ).
 *
 * Список читается из csms-api; контракт и суммы показываются по снимку,
 * сохранённому в документе, а не по текущей карточке реестра — иначе после
 * изменения контракта история приёмок «поехала» бы задним числом.
 */
type StatusFilter = AcceptanceStatus | "all";

const statusFilters: StatusFilter[] = ["all", ...acceptanceStatusOrder];

export default function AcceptanceRegistryPage() {
  const navigate = useNavigate();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "acceptance");

  const { organization } = useMyContractRole();
  const orgId = organization ? String(organization.id) : "";
  const [searchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [contractFilter, setContractFilter] = useState(
    () => searchParams.get("contractId") ?? "",
  );

  const {
    data: acceptances = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useAcceptances(
    orgId,
    contractFilter || undefined,
    statusFilter === "all" ? undefined : statusFilter,
  );
  const { data: contracts = [] } = useContractRegistry(orgId || undefined);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: acceptances.length };

    acceptanceStatusOrder.forEach((status) => {
      result[status] = 0;
    });

    acceptances.forEach((acceptance) => {
      result[acceptance.status] = (result[acceptance.status] ?? 0) + 1;
    });

    return result;
  }, [acceptances]);

  const errorCount = (acceptance: (typeof acceptances)[number]) =>
    acceptance.issues.filter((issue) => issueIsError(issue.severity)).length;

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>Электронное актирование</h1>
          <p className={block("subtitle")}>
            Документы о приёмке по ст. 94 44-ФЗ: позиции, расхождения,
            мотивированный отказ и регистрация в ЕИС. Статус меняется только
            сценариями домена, а не кнопкой «поставить статус».
          </p>
        </div>

        <div className={block("header-actions")}>
          <button
            type="button"
            className={block("secondary")}
            onClick={() => void refetch()}
            disabled={!orgId || isFetching}
          >
            {isFetching ? "Обновление…" : "Обновить"}
          </button>
          <button
            type="button"
            className={block("primary")}
            disabled={!orgId}
            onClick={() => navigate("/acceptances/new")}
          >
            + Новая приёмка
          </button>
        </div>
      </header>

      {!orgId && (
        <p className={block("alert")}>
          Организация не определена: войдите в учётную запись сотрудника, чтобы
          работать с приёмкой.
        </p>
      )}

      {isError && (
        <div className={block("alert", ["error"])}>
          <span>
            Не удалось загрузить документы:{" "}
            {readApiError(error, "csms-api недоступен.")}
          </span>
          <button
            type="button"
            className={block("action")}
            onClick={() => void refetch()}
          >
            Повторить
          </button>
        </div>
      )}

      <div className={block("toolbar")}>
        <label className={block("filter")}>
          <span>Контракт</span>
          <select
            className={block("select")}
            value={contractFilter}
            onChange={(event) => setContractFilter(event.target.value)}
          >
            <option value="">Все контракты</option>
            {contracts.map((contract) => (
              <option key={String(contract.id)} value={String(contract.id)}>
                № {contract.contractNumber} — {contract.contractName}
              </option>
            ))}
          </select>
        </label>

        <div
          className={block("filters")}
          role="group"
          aria-label="Фильтр по статусу"
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
              {status === "all" ? "Все" : acceptanceStatusLabels[status]}
              <span className={block("chip-count")}>{counts[status] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={block("loading")}>
          <Loader count={4} size={260} />
        </div>
      ) : acceptances.length === 0 ? (
        <p className={block("empty")}>
          Документов пока нет. Создайте приёмку — форма подставит снимок
          контракта из реестра.
        </p>
      ) : (
        <ul className={block("list")}>
          {acceptances.map((acceptance) => {
            const errors = errorCount(acceptance);

            return (
              <li className={block("card")} key={acceptance.id}>
                <div className={block("card-head")}>
                  <h2 className={block("card-title")}>
                    {acceptanceKindLabels[acceptance.input.kind]} №{" "}
                    {acceptance.input.documentNumber || "—"} от{" "}
                    {formatDate(acceptance.input.documentDate ?? undefined) ||
                      "—"}
                  </h2>
                  <div className={block("card-meta")}>
                    {errors > 0 && (
                      <span className={block("badge", ["error"])}>
                        Ошибок: {errors}
                      </span>
                    )}
                    <span
                      className={block("status", [
                        acceptanceStatusTone(acceptance.status),
                      ])}
                    >
                      {acceptanceStatusLabels[acceptance.status]}
                    </span>
                  </div>
                </div>

                <dl className={block("meta")}>
                  <div className={block("meta-row")}>
                    <dt>Контракт</dt>
                    <dd>
                      № {acceptance.input.contractNumber || "—"} —{" "}
                      {acceptance.input.contractName || "—"}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Поставщик</dt>
                    <dd>{acceptance.input.supplierName || "—"}</dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Сумма акта</dt>
                    <dd>{formatMoney(acceptance.totalWithVat)} ₽</dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Итог</dt>
                    <dd>
                      {acceptance.result
                        ? acceptanceResultLabels[acceptance.result]
                        : "не определён"}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Срок рассмотрения</dt>
                    <dd>
                      {formatDate(acceptance.reviewDeadline ?? undefined) ||
                        "—"}
                    </dd>
                  </div>
                </dl>

                <div className={block("card-actions")}>
                  <Link
                    className={block("action", ["primary"])}
                    to={`/acceptances/${acceptance.id}`}
                  >
                    Открыть
                  </Link>

                  {canEditAcceptance(acceptance.status) && (
                    <Link
                      className={block("action")}
                      to={`/acceptances/${acceptance.id}/edit`}
                    >
                      Редактировать
                    </Link>
                  )}

                  <span className={block("muted")}>
                    Ревизия {acceptance.revision} · позиций{" "}
                    {acceptance.positions.length} · недостатков{" "}
                    {acceptance.defects.length}
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
