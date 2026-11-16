import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import { useOrganizationTasks } from "../../services/Tasks/tasks.api";
import { type Task, taskDaysLeft } from "../../services/Tasks/tasks.schema";
import { contractServiceFunctionCodes } from "../../services/ContractService/contractService.schema";
import type { ContractServiceFunction } from "../../services/ContractService/contractService.schema";
import { functionLabels } from "../../components/ContractService/contractService.config";
import { useComplianceCheck } from "../../components/ContractService/complianceCheck";
import styles from "./TasksPage.module.scss";

// Категория задачи — функция контрактной службы из Раздела III приказа
// Минфина России N 158н. Задачи без функции показываются отдельной группой
const noFunctionLabel = "Задачи без функции контрактной службы";

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

export default function TasksPage() {
  const { bem, formatDate } = useUtils();
  const { user, organization, contractService, isHead } = useMyContractRole();
  const { data: orgTasks, isLoading } = useOrganizationTasks(organization?.id);
  const compliance = useComplianceCheck(
    organization?.id,
    contractService ?? undefined,
  );
  const task = bem(styles, "task");

  const groups = groupTasks(orgTasks ?? []);

  return (
    <div className={task()}>
      <h2 className={styles["title"]}>Задачи организации</h2>

      <p className={styles["hint"]}>
        Список всех задач организации по функциям контрактной службы. Назначить
        задачу и отметить её выполнение можно в личном кабинете.
      </p>

      {!user && (
        <div className={styles["empty-state"]}>
          Войдите в систему, чтобы видеть задачи организации
        </div>
      )}

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

                  return (
                    <li key={taskItem.id} className={styles["task-item"]}>
                      <div className={styles["task-item__header"]}>
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
                      </div>

                      {taskItem.description && (
                        <p className={styles["task-item__desc"]}>
                          {taskItem.description}
                        </p>
                      )}

                      {taskItem.result && (
                        <div className={styles["task-item__result"]}>
                          <strong>Результат:</strong> {taskItem.result}
                        </div>
                      )}

                      <div className={styles["task-item__meta"]}>
                        {taskItem.assignedByName && (
                          <span>Постановщик: {taskItem.assignedByName}</span>
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
    </div>
  );
}
