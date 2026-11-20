import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import PageSizePicker from "../UI/PageSizePicker";
import { useUpdateTaskSteps } from "../../services/Tasks/tasks.api";
import {
  sortTasksByDeadline,
  taskDaysLeft,
  taskStatusLabels,
  taskStepProgress,
  taskSummary,
  type Task,
  type TaskExecutionStep,
  type TaskStatus,
} from "../../services/Tasks/tasks.schema";
import {
  findPoolItem,
  useOrder158nPool,
} from "../../services/Tasks/order158nTaskPool";
import styles from "./MyTasks.module.scss";

interface MyTasksProps {
  tasks: Task[];
  // Перевод задачи по статусу: «Начать» и «Завершить»
  onAdvance: (id: string | number, task: Task) => void;
}

type StatusFilter = TaskStatus | "all";

// Сколько задач показывать: по умолчанию пять, дальше 10, 15 и все сразу
const PAGE_SIZES = [5, 10, 15, "all"] as const;

type PageSize = (typeof PAGE_SIZES)[number];

const VIEW_LABELS = {
  list: "Списком",
  grid: "Сеткой",
} as const;

type ViewMode = keyof typeof VIEW_LABELS;

// Список «моих» задач: при сотне записей человек должен отфильтровать их по
// статусу, получить очередь по остатку срока и листать порциями
export default function MyTasks({ tasks, onAdvance }: MyTasksProps) {
  const { formatDate, fullName } = useUtils();
  const { employee } = useMyContractRole();
  const { mutate: updateSteps, isPending: isStepsPending } =
    useUpdateTaskSteps();
  const { data: poolData } = useOrder158nPool();
  const poolItems = poolData?.items ?? [];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageSize, setPageSize] = useState<PageSize>(5);
  const [view, setView] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);

  const summary = taskSummary(tasks);
  const actorName = employee ? fullName(employee.employee ?? {}) : "Исполнитель";

  const visible = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? tasks
        : tasks.filter((task) => task.status === statusFilter);

    // Порядок по умолчанию — по остатку срока: сначала то, что ближе к дедлайну
    return sortTasksByDeadline(filtered);
  }, [tasks, statusFilter]);

  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(visible.length / pageSize));

  // Фильтр или размер страницы могут сузить список до пустой страницы
  const safePage = Math.min(page, totalPages);
  const start = pageSize === "all" ? 0 : (safePage - 1) * pageSize;
  const pageTasks =
    pageSize === "all" ? visible : visible.slice(start, start + pageSize);

  const filterOptions: { value: StatusFilter; label: string; count: number }[] =
    [
      { value: "all", label: "Все", count: summary.total },
      {
        value: "pending",
        label: taskStatusLabels.pending,
        count: summary.pending,
      },
      {
        value: "in_progress",
        label: taskStatusLabels.in_progress,
        count: summary.inProgress,
      },
      {
        value: "completed",
        label: taskStatusLabels.completed,
        count: summary.completed,
      },
    ];

  const handleToggleStep = (task: Task, step: TaskExecutionStep) => {
    if (!task.id || task.status === "completed") return;
    const nowIso = new Date().toISOString().slice(0, 10);
    const nextDone = !step.isDone;
    const nextSteps = (task.steps ?? []).map((s) =>
      s.id === step.id
        ? {
            ...s,
            isDone: nextDone,
            completedAt: nextDone ? nowIso : "",
            completedBy: nextDone ? actorName : "",
          }
        : s,
    );

    updateSteps({
      id: task.id,
      steps: nextSteps,
      autoStartIfPending: true,
      currentStatus: task.status,
      startedAt: task.startedAt,
    });
  };

  if (tasks.length === 0) {
    return <div className={styles["empty-state"]}>Задач нет</div>;
  }

  return (
    <div className={styles["my-tasks"]}>
      <div className={styles["toolbar"]}>
        {/* Фильтр по статусу — счётчики сразу показывают объём каждой выборки */}
        <div
          className={styles["filters"]}
          role="group"
          aria-label="Фильтр по статусу"
        >
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles["chip"]} ${
                statusFilter === option.value ? styles["chip--active"] : ""
              }`}
              onClick={() => {
                setStatusFilter(option.value);
                setPage(1);
              }}
            >
              {option.label}
              <span className={styles["chip__count"]}>{option.count}</span>
            </button>
          ))}
        </div>

        <div className={styles["controls"]}>
          <PageSizePicker
            sizes={PAGE_SIZES}
            value={pageSize}
            onChange={(size) => {
              setPageSize(size as PageSize);
              setPage(1);
            }}
          />

          <div
            className={styles["view-toggle"]}
            role="group"
            aria-label="Вид списка"
          >
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`${styles["view-toggle__button"]} ${
                  view === mode ? styles["view-toggle__button--active"] : ""
                }`}
                onClick={() => setView(mode)}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pageTasks.length === 0 ? (
        <div className={styles["empty-state"]}>
          Нет задач с статусом «{taskStatusLabels[statusFilter as TaskStatus]}»
        </div>
      ) : (
        <ul
          className={`${styles["task-list"]} ${
            view === "grid" ? styles["task-list--grid"] : ""
          }`}
        >
          {pageTasks.map((task) => {
            const daysLeft = taskDaysLeft(task);
            const stepProgress = taskStepProgress(task);
            const steps = task.steps ?? [];
            const nextStep = steps.find((s) => !s.isDone);
            const poolItem = findPoolItem(
              poolItems,
              task.order158nPoolCode || task.order158nClause,
            );
            const criteria =
              task.completionCriteria || poolItem?.completionCriteria;

            return (
              <li key={String(task.id)} className={styles["task-item"]}>
                <div className={styles["task-item__header"]}>
                  {task.order158nClause && (
                    <span className={styles["task-item__clause"]}>
                      {task.order158nClause}
                    </span>
                  )}
                  <span className={styles["task-item__title"]}>
                    {task.title}
                  </span>
                  <span
                    className={`${styles["task-item__status"]} ${
                      styles[`status-${task.status}`]
                    }`}
                  >
                    {taskStatusLabels[task.status]}
                  </span>
                </div>

                <div className={styles["task-item__due"]}>
                  Срок: {formatDate(task.dueDate ?? "") || "не указан"}
                  {daysLeft !== null && task.status !== "completed" && (
                    <span
                      className={
                        daysLeft < 0
                          ? styles["task-item__overdue"]
                          : styles["task-item__left"]
                      }
                    >
                      {daysLeft < 0
                        ? ` просрочена на ${Math.abs(daysLeft)} дн.`
                        : ` · осталось ${daysLeft} дн.`}
                    </span>
                  )}
                  {task.startedAt && (
                    <span> · начата {formatDate(task.startedAt)}</span>
                  )}
                  {task.legalBasis && <span> · {task.legalBasis}</span>}
                </div>

                {task.description && (
                  <p className={styles["task-item__desc"]}>
                    {task.description}
                  </p>
                )}

                {stepProgress.total > 0 && (
                  <div className={styles["steps-box"]}>
                    <div className={styles["steps-box__head"]}>
                      <span>
                        Этапы: {stepProgress.done} из {stepProgress.total} (
                        {stepProgress.percent}%)
                      </span>
                      {nextStep && (
                        <span className={styles["steps-box__next"]}>
                          Следующий: {nextStep.title}
                        </span>
                      )}
                    </div>
                    <div className={styles["steps-box__track"]}>
                      <div
                        className={styles["steps-box__fill"]}
                        style={{ width: `${stepProgress.percent}%` }}
                      />
                    </div>

                    <details className={styles["steps-details"]}>
                      <summary className={styles["steps-details__summary"]}>
                        Чек-лист шагов ({stepProgress.done}/{stepProgress.total}
                        )
                      </summary>
                      <ul className={styles["steps-checklist"]}>
                        {steps.map((step) => (
                          <li
                            key={step.id}
                            className={styles["steps-checklist__item"]}
                          >
                            <label className={styles["steps-checklist__label"]}>
                              <input
                                type="checkbox"
                                checked={step.isDone}
                                disabled={
                                  isStepsPending || task.status === "completed"
                                }
                                onChange={() => handleToggleStep(task, step)}
                              />
                              <span
                                className={
                                  step.isDone
                                    ? styles["steps-checklist__done"]
                                    : ""
                                }
                              >
                                {step.order}. [{step.stageLabel}] {step.title}
                              </span>
                            </label>
                            {step.dueDate && (
                              <span className={styles["steps-checklist__date"]}>
                                {formatDate(step.dueDate)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {criteria && (
                        <div className={styles["steps-criteria"]}>
                          <strong>Критерий приёмки:</strong> {criteria}
                        </div>
                      )}
                    </details>
                  </div>
                )}

                {task.result && (
                  <div className={styles["task-item__result"]}>
                    <strong>Результат:</strong> {task.result}
                  </div>
                )}

                <div className={styles["task-item__actions"]}>
                  {task.status !== "completed" && task.id && (
                    <button
                      type="button"
                      className={styles["btn-small"]}
                      onClick={() => onAdvance(task.id!, task)}
                    >
                      {task.status === "pending" ? "Начать" : "Завершить"}
                    </button>
                  )}
                  {task.id !== undefined && (
                    <Link
                      to={`/tasks/${task.id}`}
                      className={styles["btn-link"]}
                    >
                      Детализация задачи →
                    </Link>
                  )}
                  {poolItem?.appRoute && poolItem?.appRouteLabel && (
                    <Link
                      to={poolItem.appRoute}
                      className={styles["btn-link"]}
                    >
                      {poolItem.appRouteLabel}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className={styles["pager"]}>
          <button
            type="button"
            className={styles["pager__button"]}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
          >
            Назад
          </button>
          <span className={styles["pager__info"]}>
            {start + 1}–{Math.min(start + pageTasks.length, visible.length)} из{" "}
            {visible.length}
          </span>
          <button
            type="button"
            className={styles["pager__button"]}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={safePage === totalPages}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
