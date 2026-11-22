import { Fragment, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  readContractorSession,
  useContractorContracts,
  useContractorLogout,
  useContractorOrganizations,
  useContractorSmpRecords,
} from "../../services/Contractor/contractor.api";
import {
  contractorActionOf,
  groupContractsByCustomer,
  hasSmpRequirement,
  type ContractorAction,
} from "../../services/Contractor/contractor.schema";
import { computeSmpVolume } from "../../services/ContractSmp/contractSmp.schema";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import { contractSmpStatusLabels } from "../../services/ContractSmp/contractSmp.schema";
import ContractorSmpSection from "./ContractorSmpSection";
import useUtils from "../../hooks/useUtils";
import styles from "./Contractor.module.scss";

/**
 * Личный кабинет подрядчика: реестр контрактов по заказчикам и направление
 * сведений о привлечении СМП (Tasks 9, п. 6, Tasks 10 п. 1 — «вход подрядчика
 * по ссылке-приглашению», здесь реализован вход по ИНН).
 *
 * Контрактная служба видит реестр по своей организации, подрядчик — по своему
 * ИНН, то есть с другой стороны той же таблицы. Группировка по заказчикам
 * оставлена намеренно: у подрядчика-СМП заказчиков обычно несколько, и думать
 * он хочет «что я должен вот этому заказчику», а не листать общий реестр.
 *
 * Требование о привлечении СМП приходит из служебки заказчика и лежит в
 * карточке контракта (`smpRequiredPercent`), поэтому объём, просрочка и
 * недогруз подрядчик считает по тем же правилам, что и заказчик, — функции
 * одни и те же (`computeSmpVolume`, `computeSmpDeadlines`).
 */

const ACTION_LABELS: Record<ContractorAction, string> = {
  nothing: "СМП не требуется",
  submit: "Нужно направить сведения",
  shortfall: "Недобор объёма",
  closed: "Объём закрыт",
  rejected: "Есть отклонённые",
};

const STATUS_LABELS: Record<ContractRegistryItem["status"], string> = {
  signed: "Заключён",
  in_execution: "Исполняется",
  completed: "Исполнен",
  terminated: "Расторгнут",
  suspended: "Приостановлен",
};

const money = (value: number): string => value.toLocaleString("ru-RU");

type StatusChoice = "all" | ContractRegistryItem["status"] | "smp";

const ContractorDashboardPage = () => {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "contractor");
  const navigate = useNavigate();

  const session = readContractorSession();
  const logout = useContractorLogout();
  const inn = session?.inn ?? "";

  // Хуки ниже вызываются всегда в одном порядке: отсутствие сессии — это
  // редирект в конце, а не ранний выход из рендера
  const { data: contracts = [], isLoading } = useContractorContracts(inn);
  const { data: organizations = [] } = useContractorOrganizations();
  const { data: smpRecords = [] } = useContractorSmpRecords(contracts);

  const [statusFilter, setStatusFilter] = useState<StatusChoice>("all");
  const [expanded, setExpanded] = useState<string>("");

  const recordsByContract = useMemo(() => {
    const map = new Map<string, typeof smpRecords>();
    for (const record of smpRecords) {
      const key = String(record.contractId);
      const list = map.get(key) ?? [];
      list.push(record);
      map.set(key, list);
    }
    return map;
  }, [smpRecords]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return contracts;
    if (statusFilter === "smp") return contracts.filter(hasSmpRequirement);
    return contracts.filter((contract) => contract.status === statusFilter);
  }, [contracts, statusFilter]);

  const groups = useMemo(
    () => groupContractsByCustomer(filtered, organizations),
    [filtered, organizations],
  );

  // Счётчик заказчиков в сводке — по всему портфелю, а не по фильтру
  const customerCount = useMemo(
    () => groupContractsByCustomer(contracts, organizations).length,
    [contracts, organizations],
  );

  // Итоги по всему портфелю, а не по фильтру: подрядчик должен видеть, сколько
  // на него всего висит, даже когда смотрит только действующие контракты
  const totals = useMemo(() => {
    let required = 0;
    let actual = 0;
    let pending = 0;
    let obligationContracts = 0;

    for (const contract of contracts) {
      if (!hasSmpRequirement(contract)) continue;
      obligationContracts += 1;
      const records = recordsByContract.get(String(contract.id)) ?? [];
      const volume = computeSmpVolume(
        records,
        contract.contractPrice,
        contract.smpRequiredPercent,
      );
      required += volume.required;
      actual += volume.actual;
      pending += records.filter(
        (record) =>
          record.status === "submitted" &&
          record.documentType === "subContract",
      ).length;
    }

    return { required, actual, pending, obligationContracts };
  }, [contracts, recordsByContract]);

  function volumeOf(contract: ContractRegistryItem) {
    return computeSmpVolume(
      recordsByContract.get(String(contract.id)) ?? [],
      contract.contractPrice,
      contract.smpRequiredPercent,
    );
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/contractor"),
    });
  }

  // Сессия подрядчика отдельная от учётки заказчика: без неё прямо на вход
  if (!session) return <Navigate to="/contractor" replace />;

  return (
    <div className={block()}>
      {/* ─── Шапка кабинета ──────────────────────────────────────────────── */}

      <header className={block("head")}>
        <div className={block("identity")}>
          <p className={block("eyebrow")}>ЦСМС · контур подрядчика</p>
          <h1 className={block("title")}>{session.name}</h1>
          <p className={block("requisites")}>
            ИНН {session.inn}
            {session.representative &&
              ` · представитель: ${session.representative}`}
            {session.position && ` (${session.position})`}
          </p>
        </div>
        <div className={block("headActions")}>
          <button
            type="button"
            className={styles.btnSmall}
            onClick={handleLogout}
          >
            Выйти
          </button>
          <button
            type="button"
            className={styles.btnSmall}
            onClick={() => navigate("/")}
          >
            К кабинету заказчика
          </button>
        </div>
      </header>

      {/* ─── Итоги ────────────────────────────────────────────────────────── */}

      <section className={block("summary")}>
        <div className={block("stat")}>
          <span className={block("statLabel")}>Контрактов</span>
          <strong className={block("statValue")}>{contracts.length}</strong>
          <span className={block("statNote")}>
            заказчиков: {customerCount}
          </span>
        </div>
        <div className={block("stat")}>
          <span className={block("statLabel")}>С обязательством по СМП</span>
          <strong className={block("statValue")}>
            {totals.obligationContracts}
          </strong>
          <span className={block("statNote")}>ч. 5, 6 ст. 30 44-ФЗ</span>
        </div>
        <div className={block("stat")}>
          <span className={block("statLabel")}>Зачтено объёма</span>
          <strong
            className={block("statValue")}
            style={{
              color:
                totals.required > 0 && totals.actual >= totals.required
                  ? "var(--state-success)"
                  : "var(--text-primary)",
            }}
          >
            {money(totals.actual)} ₽{" "}
            <span className={block("statOf")}>
              из {money(totals.required)} ₽
            </span>
          </strong>
          <span className={block("statNote")}>
            считают только принятые заказчиком договоры
          </span>
        </div>
        <div className={block("stat")}>
          <span className={block("statLabel")}>Ждут приёмки</span>
          <strong className={block("statValue")}>{totals.pending}</strong>
          <span className={block("statNote")}>записей в статусе «поданы»</span>
        </div>
      </section>

      {/* ─── Фильтр ───────────────────────────────────────────────────────── */}

      <div className={block("toolbar")}>
        <label className={block("filter")}>
          <span>Показывать</span>
          <select
            className={block("filterSelect")}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusChoice)
            }
          >
            <option value="all">Все контракты</option>
            <option value="smp">Только с обязательством по СМП</option>
            <option value="in_execution">Исполняются</option>
            <option value="signed">Заключённые</option>
            <option value="completed">Исполненные</option>
            <option value="terminated">Расторгнутые</option>
            <option value="suspended">Приостановленные</option>
          </select>
        </label>
        <p className={block("hint")}>
          Нажмите на строку, чтобы раскрыть карточку контракта и направить
          сведения о привлечении СМП.
        </p>
      </div>

      {/* ─── Реестр по заказчикам ─────────────────────────────────────────── */}

      {isLoading && (
        <p className={block("loading")}>Загружаем реестр контрактов…</p>
      )}

      {!isLoading && groups.length === 0 && (
        <p className={block("empty")}>
          Контрактов подрядчика {session.name} (ИНН {session.inn}) в реестре
          нет. Если вы только что выиграли закупку, сведения о контракте ещё не
          внесены заказчиком в реестр — они появятся здесь после размещения.
        </p>
      )}

      {groups.map((group) => (
        <section
          className={block("group")}
          key={group.organizationId || group.customerName}
        >
          <div className={block("groupHead")}>
            <h2 className={block("customer")}>{group.customerName}</h2>
            <p className={block("groupMeta")}>
              {group.customerInn && `ИНН ${group.customerInn} · `}
              контрактов: {group.contracts.length} · сумма:{" "}
              {money(group.totalPrice)} ₽
              {group.smpContracts > 0 &&
                ` · с обязательством по СМП: ${group.smpContracts}`}
            </p>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Номер контракта</th>
                <th>Предмет</th>
                <th>Цена</th>
                <th>Срок исполнения</th>
                <th>Статус</th>
                <th>СМП</th>
              </tr>
            </thead>
            <tbody>
              {group.contracts.map((contract) => {
                const id = String(contract.id);
                const volume = volumeOf(contract);
                const records = recordsByContract.get(id) ?? [];
                const action = contractorActionOf(contract, records, volume);
                const isOpen = expanded === id;

                return (
                  <Fragment key={id}>
                    <tr
                      className={block("row", isOpen ? ["open"] : [])}
                      onClick={() => setExpanded(isOpen ? "" : id)}
                    >
                      <td className={styles.contractNumber}>
                        {contract.contractNumber}
                        <br />
                        <span className={block("sub")}>
                          от {formatDate(contract.contractDate)}
                        </span>
                      </td>
                      <td>
                        {contract.contractName}
                        {contract.eisRegistryNumber && <br />}
                        {contract.eisRegistryNumber && (
                          <span className={block("sub")}>
                            реестровый № {contract.eisRegistryNumber}
                          </span>
                        )}
                      </td>
                      <td className={styles.moneyCell}>
                        {money(
                          Number.parseFloat(contract.contractPrice ?? "0") || 0,
                        )}{" "}
                        ₽
                      </td>
                      <td className={block("dates")}>
                        {formatDate(contract.executionStartDate)}
                        {" — "}
                        {formatDate(contract.executionEndDate)}
                      </td>
                      <td>
                        <span
                          className={styles.statusBadge}
                          style={{
                            background:
                              contract.status === "completed"
                                ? "var(--state-success-soft)"
                                : contract.status === "terminated"
                                  ? "var(--state-danger-soft)"
                                  : contract.status === "in_execution"
                                    ? "var(--state-warning-soft)"
                                    : "var(--surface-raised)",
                            color:
                              contract.status === "completed"
                                ? "var(--state-success)"
                                : contract.status === "terminated"
                                  ? "var(--state-danger)"
                                  : contract.status === "in_execution"
                                    ? "var(--state-warning)"
                                    : "var(--text-secondary)",
                          }}
                        >
                          {STATUS_LABELS[contract.status]}
                        </span>
                      </td>
                      <td>
                        <span
                          className={block("action", [action.action])}
                          title={action.hint}
                        >
                          {ACTION_LABELS[action.action]}
                        </span>
                        {hasSmpRequirement(contract) && <br />}
                        {hasSmpRequirement(contract) && (
                          <span className={block("sub")}>
                            {contract.smpRequiredPercent}% ·{" "}
                            {volume.progress.toFixed(0)}% закрыто
                          </span>
                        )}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${id}-detail`} className={block("detailRow")}>
                        <td colSpan={6}>
                          <div className={block("detail")}>
                            <div className={block("detailGrid")}>
                              <div>
                                <p className={block("detailLabel")}>Заказчик</p>
                                <p className={block("detailValue")}>
                                  {contract.customerName}
                                </p>
                              </div>
                              <div>
                                <p className={block("detailLabel")}>
                                  ИКЗ / закупка
                                </p>
                                <p className={block("detailValue")}>
                                  {contract.ikz || "—"}
                                </p>
                              </div>
                              <div>
                                <p className={block("detailLabel")}>
                                  Основание требования СМП
                                </p>
                                <p className={block("detailValue")}>
                                  {contract.subcontractingSmpNoteNumber
                                    ? `служебная записка № ${contract.subcontractingSmpNoteNumber}`
                                    : "не указана"}
                                </p>
                              </div>
                              <div>
                                <p className={block("detailLabel")}>
                                  Принято заказчиком
                                </p>
                                <p className={block("detailValue")}>
                                  {records.length > 0
                                    ? records
                                        .map(
                                          (record) =>
                                            contractSmpStatusLabels[
                                              record.status
                                            ],
                                        )
                                        .filter(
                                          (value, index, self) =>
                                            self.indexOf(value) === index,
                                        )
                                        .join(", ")
                                    : "сведений нет"}
                                </p>
                              </div>
                            </div>

                            <p className={block("actionHint")}>{action.hint}</p>

                            <ContractorSmpSection
                              contract={contract}
                              records={records}
                              session={session}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
};

export default ContractorDashboardPage;
