import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import Loader from "../UI/Loader";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import {
  useContractChangeBases,
  useContractChanges,
} from "../../services/ContractChange/contractChange.api";
import type { ContractChangeStatus } from "../../services/ContractChange/contractChange.types";
import { readApiError } from "../../services/csmsApi";
import {
  canEditContractChange,
  contractChangeKindLabels,
  contractChangeStatusLabels,
  contractChangeStatusOrder,
  contractChangeStatusTone,
  formatMoney,
  issueIsError,
} from "./contractChange.config";
import styles from "./ContractChange.module.scss";

/**
 * Реестр документов об изменении и расторжении контрактов (ст. 95 44-ФЗ).
 *
 * Список читается из csms-api; контракт и основание показываются по снимку,
 * сохранённому в документе, а не по текущей карточке реестра — иначе после
 * изменения контракта история «поехала» бы задним числом.
 */

type StatusFilter = ContractChangeStatus | "all";

const statusFilters: StatusFilter[] = ["all", ...contractChangeStatusOrder];

export default function ContractChangeRegistryPage() {
  const navigate = useNavigate();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "contract-change");

  const { organization } = useMyContractRole();
  const orgId = organization ? String(organization.id) : "";

  const {
    data: changes = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useContractChanges(orgId);
  const { data: contracts = [] } = useContractRegistry(orgId || undefined);
  const { data: bases = [] } = useContractChangeBases();

  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [contractFilter, setContractFilter] = useState(
    () => searchParams.get("contractId") ?? "",
  );

  const basisByCode = useMemo(
    () => new Map(bases.map((basis) => [basis.code, basis])),
    [bases],
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: changes.length };

    contractChangeStatusOrder.forEach((status) => {
      result[status] = 0;
    });

    changes.forEach((change) => {
      result[change.status] = (result[change.status] ?? 0) + 1;
    });

    return result;
  }, [changes]);

  const filtered = useMemo(
    () =>
      changes.filter(
        (change) =>
          (statusFilter === "all" || change.status === statusFilter) &&
          (!contractFilter || change.input.contractId === contractFilter),
      ),
    [changes, statusFilter, contractFilter],
  );

  const errorCount = (change: (typeof changes)[number]) =>
    change.issues.filter((issue) => issueIsError(issue.severity)).length;

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>Изменения и расторжения контрактов</h1>
          <p className={block("subtitle")}>
            Документы по ст. 95 44-ФЗ: основание, новые условия и комплект
            соглашений. Статус меняется только сценариями согласования,
            подписания и регистрации в ЕИС.
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
            onClick={() => navigate("/contract-changes/new")}
          >
            + Новое изменение
          </button>
        </div>
      </header>

      {!orgId && (
        <p className={block("alert")}>
          Организация не определена: войдите в учётную запись сотрудника, чтобы
          работать с контрактами.
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
              {status === "all" ? "Все" : contractChangeStatusLabels[status]}
              <span className={block("chip-count")}>{counts[status] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={block("loading")}>
          <Loader count={4} size={260} />
        </div>
      ) : filtered.length === 0 ? (
        <p className={block("empty")}>
          {changes.length === 0
            ? "Документов пока нет. Создайте изменение или расторжение — форма подставит снимок контракта из реестра."
            : "Нет документов с выбранными фильтрами."}
        </p>
      ) : (
        <ul className={block("list")}>
          {filtered.map((change) => {
            const basis = basisByCode.get(change.input.basisCode);
            const errors = errorCount(change);

            return (
              <li className={block("card")} key={change.id}>
                <div className={block("card-head")}>
                  <h2 className={block("card-title")}>
                    {contractChangeKindLabels[change.input.kind]} №{" "}
                    {change.input.contractNumber || "—"}
                  </h2>
                  <div className={block("card-meta")}>
                    {errors > 0 && (
                      <span className={block("badge", ["error"])}>
                        Ошибок: {errors}
                      </span>
                    )}
                    <span
                      className={block("status", [
                        contractChangeStatusTone(change.status),
                      ])}
                    >
                      {contractChangeStatusLabels[change.status]}
                    </span>
                  </div>
                </div>

                <dl className={block("meta")}>
                  <div className={block("meta-row")}>
                    <dt>Контракт</dt>
                    <dd>{change.input.contractName || "—"}</dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Цена контракта</dt>
                    <dd>{formatMoney(change.input.contractPrice)} ₽</dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Основание</dt>
                    <dd>
                      {basis
                        ? `${basis.article} — ${basis.title}`
                        : change.input.basisCode || "не указано"}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Дата документа</dt>
                    <dd>{formatDate(change.input.changeDate) || "—"}</dd>
                  </div>
                  {change.input.terminationDate && (
                    <div className={block("meta-row")}>
                      <dt>Дата расторжения</dt>
                      <dd>{formatDate(change.input.terminationDate)}</dd>
                    </div>
                  )}
                  <div className={block("meta-row")}>
                    <dt>Создан</dt>
                    <dd>{formatDate(change.createdAt) || "—"}</dd>
                  </div>
                </dl>

                <p className={block("muted")}>{change.input.reason}</p>

                <div className={block("card-actions")}>
                  <Link
                    className={block("action", ["primary"])}
                    to={`/contract-changes/${change.id}`}
                  >
                    Открыть
                  </Link>

                  {canEditContractChange(change.status) && (
                    <Link
                      className={block("action")}
                      to={`/contract-changes/${change.id}/edit`}
                    >
                      Редактировать
                    </Link>
                  )}

                  <span className={block("muted")}>
                    Ревизия {change.revision} · документов{" "}
                    {change.documents.length}
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
