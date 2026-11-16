import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import PageSizePicker from "../UI/PageSizePicker";
import {
  sortTasksByDeadline,
  taskDaysLeft,
  taskStatusLabels,
  taskSummary,
  type Task,
  type TaskStatus,
} from "../../services/Tasks/tasks.schema";
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
  const { formatDate } = useUtils();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageSize, setPageSize] = useState<PageSize>(5);
  const [view, setView] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);

  const summary = taskSummary(tasks);

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

            return (
              <li key={String(task.id)} className={styles["task-item"]}>
                <div className={styles["task-item__header"]}>
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
                </div>

                {task.description && (
                  <p className={styles["task-item__desc"]}>
                    {task.description}
                  </p>
                )}

                {task.result && (
                  <div className={styles["task-item__result"]}>
                    <strong>Результат:</strong> {task.result}
                  </div>
                )}

                {task.status !== "completed" && task.id && (
                  <div className={styles["task-item__actions"]}>
                    <button
                      type="button"
                      className={styles["btn-small"]}
                      onClick={() => onAdvance(task.id!, task)}
                    >
                      {task.status === "pending" ? "Начать" : "Завершить"}
                    </button>
                  </div>
                )}
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
