import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import { useOrganizationTasks } from "../../services/Tasks/tasks.api";
import {
  type Task,
  taskDaysLeft,
  taskStepProgress,
} from "../../services/Tasks/tasks.schema";
import { contractServiceFunctionCodes } from "../../services/ContractService/contractService.schema";
import type { ContractServiceFunction } from "../../services/ContractService/contractService.schema";
import {
  contractServiceFunctionOptions,
  contractServiceRoster,
  functionLabels,
} from "../../components/ContractService/contractService.config";
import { useComplianceCheck } from "../../components/ContractService/complianceCheck";
import {
  useOrder158nPool,
  type Order158nTaskPoolItem,
} from "../../services/Tasks/order158nTaskPool";
import { useFetchOrganizationEmployees } from "../../services/StaffingTable/StaffingTable.api";
import TaskAssignModal from "./TaskAssignModal";
import styles from "./TasksPage.module.scss";
import Select from "../UI/Select";

// Категория задачи — функция контрактной службы из Раздела III приказа
// Минфина России N 158н. Задачи без функции показываются отдельной группой
const noFunctionLabel = "Задачи без функции контрактной службы";

type TasksTab = "active" | "pool";
type PoolCoverageFilter = "all" | "covered" | "unassigned";

interface TaskGroup {
  code: ContractServiceFunction | "";
  title: string;
  tasks: Task[];
}

const groupTasks = (tasks: Task[]): TaskGroup[] => {
  const groups: TaskGroup[] = contractServiceFunctionCodes.map((code) => ({
    code,
    title: functionLabels[code],
    tasks: tasks.filter((task) => task.functionCode === code),
  }));

  const withoutFunction = tasks.filter((task) => !task.functionCode);

  if (withoutFunction.length > 0) {
    groups.push({ code: "", title: noFunctionLabel, tasks: withoutFunction });
  }

  return groups.filter((group) => group.tasks.length > 0);
};

const statusLabel = (status: Task["status"]): string =>
  status === "pending"
    ? "Ожидается"
    : status === "in_progress"
      ? "В работе"
      : "Выполнена";

const statusClass = (status: Task["status"]): string =>
  status === "pending"
    ? styles["status-pending"]
    : status === "in_progress"
      ? styles["status-in-progress"]
      : styles["status-completed"];

const taskMatchesPoolItem = (task: Task, item: Order158nTaskPoolItem): boolean => {
  if (task.order158nPoolCode && task.order158nPoolCode === item.id) {
    return true;
  }
  if (task.order158nClause && task.order158nClause === item.clause) {
    return true;
  }
  return false;
};

export default function TasksPage() {
  const { bem, formatDate, fullName } = useUtils();
  const { user, organization, contractService, isHead } = useMyContractRole();
  const { data: orgTasks = [], isLoading } = useOrganizationTasks(
    organization?.id,
  );
  const { data: orgEmployees = [] } = useFetchOrganizationEmployees(
    organization?.id,
  );
  // Пул 158н приходит из БД через csms-api; без связи показываем пустой список
  const { data: poolData, isLoading: isPoolLoading, isError: isPoolError } =
    useOrder158nPool();
  const poolItems = useMemo(() => poolData?.items ?? [], [poolData]);
  const compliance = useComplianceCheck(
    organization?.id,
    contractService ?? undefined,
  );
  const task = bem(styles, "task");

  const [activeTab, setActiveTab] = useState<TasksTab>("active");
  const [poolSearch, setPoolSearch] = useState("");
  const [poolFnFilter, setPoolFnFilter] = useState<
    ContractServiceFunction | "all"
  >("all");
  const [poolCoverageFilter, setPoolCoverageFilter] =
    useState<PoolCoverageFilter>("all");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<Order158nTaskPoolItem | null>(null);

  const groups = groupTasks(orgTasks);

  // Закреплённые исполнители КС по каждой укрупнённой функции Раздела III
  const assigneesByFunction = useMemo(() => {
    const map = new Map<ContractServiceFunction, string[]>();
    if (!contractService) return map;

    if (contractService.creationMethod === "structural_unit") {
      const unitStaffNames = orgEmployees
        .filter(
          (emp) =>
            String(emp.structuralUnitId ?? "") ===
            String(contractService.structuralUnitId ?? ""),
        )
        .map((emp) => fullName(emp.employee ?? {}))
        .filter(Boolean);

      for (const code of contractServiceFunctionCodes) {
        map.set(code, unitStaffNames);
      }
      return map;
    }

    const roster = contractServiceRoster(contractService);
    for (const code of contractServiceFunctionCodes) {
      const names = roster
        .filter((row) => (row.functions ?? []).includes(code))
        .map((row) => row.employeeFullName || "")
        .filter(Boolean);
      map.set(code, names);
    }

    return map;
  }, [contractService, orgEmployees, fullName]);

  const poolEntries = useMemo(() => {
    return poolItems.map((item) => {
      const exactTasks = orgTasks.filter((t) => taskMatchesPoolItem(t, item));
      const fnTasks = orgTasks.filter((t) => t.functionCode === item.functionCode);
      const staff = assigneesByFunction.get(item.functionCode) ?? [];

      return {
        item,
        exactTasks,
        exactCompleted: exactTasks.filter((t) => t.status === "completed")
          .length,
        exactActive: exactTasks.filter((t) => t.status !== "completed").length,
        fnTasksCount: fnTasks.length,
        staff,
        isCovered: exactTasks.length > 0,
      };
    });
  }, [orgTasks, assigneesByFunction, poolItems]);

  const filteredPoolEntries = useMemo(() => {
    const query = poolSearch.trim().toLowerCase();

    return poolEntries.filter((entry) => {
      if (poolFnFilter !== "all" && entry.item.functionCode !== poolFnFilter) {
        return false;
      }

      if (poolCoverageFilter === "covered" && !entry.isCovered) {
        return false;
      }
      if (poolCoverageFilter === "unassigned" && entry.isCovered) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        entry.item.clause,
        entry.item.sectionTitle,
        entry.item.officialFormulation,
        entry.item.defaultTaskTitle,
        entry.item.defaultTaskDescription,
        entry.item.legalReference,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [poolEntries, poolFnFilter, poolCoverageFilter, poolSearch]);

  const coveredCount = poolEntries.filter((e) => e.isCovered).length;
  const activePoolTasksCount = poolEntries.reduce(
    (sum, e) => sum + e.exactActive,
    0,
  );
  const completedPoolTasksCount = poolEntries.reduce(
    (sum, e) => sum + e.exactCompleted,
    0,
  );

  const openAssignWithTemplate = (template: Order158nTaskPoolItem | null) => {
    setSelectedTemplate(template);
    setAssignModalOpen(true);
  };

  return (
    <div className={task()}>
      <div className={styles["header-row"]}>
        <h2 className={styles["title"]}>Задачи организации</h2>
        {isHead && (
          <button
            type="button"
            className={styles["btn-primary"]}
            onClick={() => openAssignWithTemplate(null)}
          >
            + Поставить задачу
          </button>
        )}
      </div>

      <p className={styles["hint"]}>
        Реестр задач организации и полный пул регламентных функций контрактной
        службы по Приказу Минфина России от 31.07.2020 № 158н (п. 3.1.1–3.5.4 и
        раздел II).
      </p>

      <div className={styles["tabs"]} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "active"}
          className={`${styles["tab"]} ${
            activeTab === "active" ? styles["tab--active"] : ""
          }`}
          onClick={() => setActiveTab("active")}
        >
          Текущие задачи организации
          <span className={styles["tab__count"]}>{orgTasks.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pool"}
          className={`${styles["tab"]} ${
            activeTab === "pool" ? styles["tab--active"] : ""
          }`}
          onClick={() => setActiveTab("pool")}
        >
          Весь пул задач по Приказу № 158н
          <span className={styles["tab__count"]}>
            {poolItems.length}
          </span>
        </button>
      </div>

      {!user && (
        <div className={styles["empty-state"]}>
          Войдите в систему, чтобы видеть задачи организации и назначать поручения
        </div>
      )}

      {activeTab === "active" && (
        <>
          {/* П. 2.6 — соответствие работников требованиям п. 2.5, только для
              руководителя: замена оформляется задачей из личного кабинета */}
          {isHead && compliance.rows.length > 0 && (
            <section className={styles["section"]}>
              <h3 className={styles["section-title"]}>
                Проверка соответствия (п. 2.5 / 2.6)
              </h3>

              {compliance.needsAttention.length > 0 ? (
                <>
                  <div className={styles["compliance-title"]}>
                    Работники, подлежащие замене по п. 2.6:
                  </div>
                  <ul className={styles["compliance-list"]}>
                    {compliance.needsAttention.map((row) => (
                      <li
                        key={String(row.employeeId)}
                        className={styles["compliance-item"]}
                      >
                        <div className={styles["compliance-item__info"]}>
                          <div className={styles["compliance-item__name"]}>
                            {row.employeeFullName}
                          </div>
                          <div className={styles["compliance-item__role"]}>
                            {row.role}
                          </div>
                          <div className={styles["compliance-item__warning"]}>
                            {row.warning}
                          </div>
                        </div>
                        <Link
                          className={styles["btn-small"]}
                          to={"/account/profile"}
                        >
                          Назначить задачу в ЛК
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className={styles["compliance-ok"]}>
                  Все работники контрактной службы соответствуют требованиям п. 2.5
                </div>
              )}
            </section>
          )}

          <section className={styles["section"]}>
            <h3 className={styles["section-title"]}>Все задачи</h3>

            {isLoading ? (
              <div className={styles["loader"]}>Загрузка задач...</div>
            ) : groups.length === 0 ? (
              <div className={styles["empty-state"]}>Задач нет</div>
            ) : (
              groups.map((group) => (
                <div className={styles["group"]} key={group.code || "none"}>
                  <h4 className={styles["group-title"]}>
                    {group.title}
                    <span className={styles["group-count"]}>
                      {group.tasks.length}
                    </span>
                  </h4>

                  <ul className={styles["task-list"]}>
                    {group.tasks.map((taskItem) => {
                      const daysLeft = taskDaysLeft(taskItem);
                      const stepProgress = taskStepProgress(taskItem);

                      return (
                        <li key={taskItem.id} className={styles["task-item"]}>
                          <div className={styles["task-item__header"]}>
                            {taskItem.order158nClause && (
                              <span className={styles["task-item__clause"]}>
                                {taskItem.order158nClause}
                              </span>
                            )}
                            <span className={styles["task-item__title"]}>
                              {taskItem.title}
                            </span>
                            <span className={styles["task-item__assignee"]}>
                              {taskItem.assigneeName}
                            </span>
                            <span
                              className={`${styles["task-item__status"]} ${statusClass(taskItem.status)}`}
                            >
                              {statusLabel(taskItem.status)}
                            </span>
                          </div>

                          <div className={styles["task-item__due"]}>
                            Срок: {formatDate(taskItem.dueDate)}
                            {daysLeft !== null && daysLeft < 0 && (
                              <span className={styles["task-item__overdue"]}>
                                {" "}
                                (просрочена на {Math.abs(daysLeft)} дн.)
                              </span>
                            )}
                            {taskItem.startedAt && (
                              <span>
                                {" "}
                                · В работе с {formatDate(taskItem.startedAt)}
                              </span>
                            )}
                            {taskItem.legalBasis && (
                              <span> · {taskItem.legalBasis}</span>
                            )}
                          </div>

                          {taskItem.description && (
                            <p className={styles["task-item__desc"]}>
                              {taskItem.description}
                            </p>
                          )}

                          {stepProgress.total > 0 && (
                            <div className={styles["task-item__steps-bar"]}>
                              <div className={styles["task-item__steps-head"]}>
                                <span>
                                  Этапы исполнения: {stepProgress.done} из{" "}
                                  {stepProgress.total}
                                </span>
                                <span>{stepProgress.percent}%</span>
                              </div>
                              <div className={styles["task-item__steps-track"]}>
                                <div
                                  className={styles["task-item__steps-fill"]}
                                  style={{ width: `${stepProgress.percent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {taskItem.result && (
                            <div className={styles["task-item__result"]}>
                              <strong>Результат:</strong> {taskItem.result}
                            </div>
                          )}

                          <div className={styles["task-item__meta"]}>
                            {taskItem.assignedByName && (
                              <span>
                                Постановщик: {taskItem.assignedByName}
                              </span>
                            )}
                            {taskItem.id !== undefined && (
                              <Link
                                className={styles["btn-small"]}
                                to={`/tasks/${taskItem.id}`}
                              >
                                Открыть задачу
                              </Link>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {activeTab === "pool" && (
        <section className={styles["section"]}>
          {(isPoolLoading || isPoolError) && (
            <p className={styles["hint"]}>
              {isPoolLoading
                ? "Загрузка пула № 158н из csms-api…"
                : "Пул № 158н недоступен: проверьте csms-api и хранилище справочников."}
            </p>
          )}
          <div className={styles["pool-summary"]}>
            <div className={styles["pool-stat"]}>
              <span className={styles["pool-stat__value"]}>
                {poolItems.length}
              </span>
              <span className={styles["pool-stat__label"]}>
                Всего подфункций в пуле № 158н
              </span>
            </div>
            <div className={styles["pool-stat"]}>
              <span className={styles["pool-stat__value"]}>
                {coveredCount} из {poolItems.length}
              </span>
              <span className={styles["pool-stat__label"]}>
                Подфункций с точечными задачами
              </span>
            </div>
            <div className={styles["pool-stat"]}>
              <span className={styles["pool-stat__value"]}>
                {activePoolTasksCount}
              </span>
              <span className={styles["pool-stat__label"]}>
                Задач в работе / ожидании
              </span>
            </div>
            <div className={styles["pool-stat"]}>
              <span className={styles["pool-stat__value"]}>
                {completedPoolTasksCount}
              </span>
              <span className={styles["pool-stat__label"]}>
                Выполнено по пулу № 158н
              </span>
            </div>
          </div>

          <div className={styles["pool-filters"]}>
            <input
              type="search"
              className={styles["form-input"]}
              placeholder="Поиск по пункту (3.2.2.1), формулировке, норме 44-ФЗ..."
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
            />
            <Select
              className={styles["form-select"]}
              value={poolFnFilter}
              onChange={(e) =>
                setPoolFnFilter(
                  e.target.value as ContractServiceFunction | "all",
                )
              }
            >
              <option value="all">Все укрупнённые функции (п. 3.1–3.5)</option>
              {contractServiceFunctionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.paragraph} · {opt.shortLabel}
                </option>
              ))}
            </Select>
            <Select
              className={styles["form-select"]}
              value={poolCoverageFilter}
              onChange={(e) =>
                setPoolCoverageFilter(e.target.value as PoolCoverageFilter)
              }
            >
              <option value="all">Все подфункции</option>
              <option value="covered">Есть задачи в организации</option>
              <option value="unassigned">Ещё не ставились точечно</option>
            </Select>
          </div>

          {filteredPoolEntries.length === 0 ? (
            <div className={styles["empty-state"]}>
              По выбранным фильтрам подфункции Приказа № 158н не найдены
            </div>
          ) : (
            <div className={styles["pool-list"]}>
              {filteredPoolEntries.map(
                ({
                  item,
                  exactTasks,
                  exactCompleted,
                  fnTasksCount,
                  staff,
                  isCovered,
                }) => {
                  const fnOption = contractServiceFunctionOptions.find(
                    (o) => o.value === item.functionCode,
                  );

                  return (
                    <article key={item.id} className={styles["pool-card"]}>
                      <div className={styles["pool-card__top"]}>
                        <div className={styles["pool-card__badges"]}>
                          <span className={styles["task-item__clause"]}>
                            {item.clause}
                          </span>
                          <span className={styles["pool-card__fn-badge"]}>
                            {fnOption?.paragraph} · {fnOption?.shortLabel}
                          </span>
                        </div>
                        <span
                          className={
                            isCovered
                              ? styles["pool-card__status-ok"]
                              : styles["pool-card__status-empty"]
                          }
                        >
                          {isCovered
                            ? `Задач по пункту: ${exactTasks.length} (выполнено: ${exactCompleted})`
                            : `В разделе ${fnOption?.paragraph}: задач ${fnTasksCount} (точечных: 0)`}
                        </span>
                      </div>

                      <h4 className={styles["pool-card__title"]}>
                        {item.defaultTaskTitle}
                      </h4>

                      <p className={styles["pool-card__formulation"]}>
                        <strong>Формулировка № 158н:</strong>{" "}
                        {item.officialFormulation}
                      </p>

                      <p className={styles["pool-card__desc"]}>
                        {item.defaultTaskDescription}
                      </p>

                      <div className={styles["pool-card__meta"]}>
                        <span>
                          <strong>Регламентный срок:</strong>{" "}
                          {item.recommendedDays} дн. ({item.deadlineBasis})
                        </span>
                        <span>
                          <strong>Норма:</strong> {item.legalReference}
                        </span>
                        <span>
                          <strong>Ответственные в КС:</strong>{" "}
                          {staff.length > 0
                            ? staff.join(", ")
                            : "не закреплены за функцией"}
                        </span>
                      </div>

                      <details className={styles["pool-card__details"]}>
                        <summary className={styles["pool-card__summary"]}>
                          Детализация от постановки до исполнения (
                          {item.steps.length} этапов · входных данных:{" "}
                          {item.requiredInputs.length})
                        </summary>
                        <div className={styles["pool-card__route-body"]}>
                          <div>
                            <div className={styles["pool-card__subhead"]}>
                              Необходимые входные данные:
                            </div>
                            <ul className={styles["pool-card__inputs"]}>
                              {item.requiredInputs.map((req, idx) => (
                                <li key={`${item.id}-in-${idx}`}>{req}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className={styles["pool-card__subhead"]}>
                              Пошаговый маршрут исполнения:
                            </div>
                            <ol className={styles["pool-card__steps"]}>
                              {item.steps.map((step, idx) => (
                                <li
                                  key={`${item.id}-st-${idx}`}
                                  className={styles["pool-card__step"]}
                                >
                                  <div className={styles["pool-card__step-top"]}>
                                    <span
                                      className={styles["pool-card__step-stage"]}
                                    >
                                      {step.stageLabel}
                                    </span>
                                    <strong>{step.title}</strong>
                                  </div>
                                  <div className={styles["pool-card__step-detail"]}>
                                    {step.detail}
                                  </div>
                                  <div
                                    className={styles["pool-card__step-artifact"]}
                                  >
                                    Артефакт: {step.expectedArtifact}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </div>

                          <div className={styles["pool-card__criteria"]}>
                            <strong>Критерий приёмки результата:</strong>{" "}
                            {item.completionCriteria}
                          </div>
                        </div>
                      </details>

                      <div className={styles["pool-card__actions"]}>
                        {item.appRoute && item.appRouteLabel && (
                          <Link
                            to={item.appRoute}
                            className={styles["btn-link"]}
                          >
                            {item.appRouteLabel} →
                          </Link>
                        )}
                        {isHead && (
                          <button
                            type="button"
                            className={styles["btn-small"]}
                            onClick={() => openAssignWithTemplate(item)}
                          >
                            Поставить задачу по {item.clause}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      )}

      {assignModalOpen && (
        <TaskAssignModal
          key={selectedTemplate?.id ?? "custom"}
          initialTemplate={selectedTemplate}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}
