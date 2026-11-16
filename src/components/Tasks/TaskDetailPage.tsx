import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import { useFetchOrganizationEmployees } from "../../services/StaffingTable/StaffingTable.api";
import { useTask, useUpdateTask } from "../../services/Tasks/tasks.api";
import { TaskSchema, type Task } from "../../services/Tasks/tasks.schema";
import { contractServiceFunctionCodes } from "../../services/ContractService/contractService.schema";
import { functionLabels } from "../../components/ContractService/contractService.config";
import {
  recommendedDueDate,
  getDeadlinesForFunction,
} from "./regulatoryDeadlines";
import type { ContractServiceFunction } from "../../services/ContractService/contractService.schema";
import TaskEvaluationForm from "./TaskEvaluationForm";
import styles from "./TaskDetailPage.module.scss";

const statusLabels: Record<Task["status"], string> = {
  pending: "Ожидается",
  in_progress: "В работе",
  completed: "Выполнена",
};

const originLabels: Record<string, string> = {
  head: "Руководитель службы",
  system: "Система",
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { bem, formatDate, fullName } = useUtils();
  const { isHead, organization, employee } = useMyContractRole();
  const { data: task, isLoading } = useTask(id);
  const { data: orgEmployees } = useFetchOrganizationEmployees(organization?.id);
  const { mutate: updateTask, isPending } = useUpdateTask();
  const [isEditing, setIsEditing] = useState(false);
  const block = bem(styles, "task-detail");

  const methods = useForm<Task>({
    resolver: zodResolver(TaskSchema) as any,
    defaultValues: task ?? ({} as Task),
  });

  if (isLoading) {
    return <div className={styles.loader}>Загрузка задачи...</div>;
  }

  if (!task) {
    return (
      <div className={block()}>
        <div className={styles.empty}>Задача не найдена</div>
        <Link className={styles.backLink} to="/tasks">
          ← К задачам организации
        </Link>
      </div>
    );
  }

  const daysLeft = taskDaysLeftValue(task);

  function onSubmit(changes: Task) {
    if (!task?.id) return;

    updateTask(
      { id: task.id, changes },
      {
        onSuccess: () => {
          setIsEditing(false);
          methods.reset({ ...task, ...changes });
        },
      },
    );
  }

  function onAssigneeChange(assigneeId: string) {
    const emp = orgEmployees?.find((e) => String(e.id) === assigneeId);

    if (emp) {
      methods.setValue("assigneeName", fullName(emp.employee ?? {}), {
        shouldValidate: true,
      });
    }
  }

  const startEditing = () => {
    methods.reset(task);
    setIsEditing(true);
  };

  return (
    <div className={block()}>
      <Link className={styles.backLink} to="/tasks">
        ← К задачам организации
      </Link>

      <div className={block("card")}>
        <div className={block("head")}>
          <h2 className={block("title")}>
            {isEditing ? (
              <input
                className={styles.input}
                {...methods.register("title")}
              />
            ) : (
              task.title
            )}
          </h2>
          <span
            className={`${block("status")} ${
              task.status === "completed"
                ? block("status", ["done"])
                : task.status === "in_progress"
                  ? block("status", ["progress"])
                  : ""
            }`}
          >
            {statusLabels[task.status]}
          </span>
        </div>

        {isEditing ? (
          <form className={block("form")} onSubmit={methods.handleSubmit(onSubmit)}>
            <div className={block("field")}>
              <label className={block("label")}>Исполнитель</label>
              <select
                className={styles.input}
                {...methods.register("assigneeId")}
                onChange={(e) => onAssigneeChange(e.target.value)}
              >
                <option value="">— Выберите исполнителя —</option>
                {orgEmployees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {fullName(emp.employee ?? {})}
                  </option>
                ))}
              </select>
              <input type="hidden" {...methods.register("assigneeName")} />
            </div>

            <div className={block("field")}>
              <label className={block("label")}>Функция (раздел III)</label>
              <select
                className={styles.input}
                {...methods.register("functionCode")}
                onChange={(e) => {
                  const code = e.target.value as ContractServiceFunction | "";
                  methods.setValue("functionCode", code || undefined);
                  methods.setValue(
                    "dueDate",
                    recommendedDueDate(code || undefined),
                  );
                }}
              >
                <option value="">— Без функции —</option>
                {contractServiceFunctionCodes.map((code) => (
                  <option key={code} value={code}>
                    {functionLabels[code]}
                  </option>
                ))}
              </select>
              {(() => {
                const code = methods.watch("functionCode");

                if (!code) return null;

                const deadlines = getDeadlinesForFunction(
                  code as ContractServiceFunction,
                );

                if (deadlines.length === 0) return null;

                return (
                  <div className={block("hint")}>
                    Регламентированные сроки:{" "}
                    {deadlines
                      .map((d) => `${d.action} (${d.days} дн.)`)
                      .join("; ")}
                  </div>
                );
              })()}
            </div>

            <div className={block("field")}>
              <label className={block("label")}>Срок выполнения</label>
              <input
                className={styles.input}
                type="date"
                {...methods.register("dueDate")}
              />
            </div>

            <div className={block("field")}>
              <label className={block("label")}>Статус</label>
              <select className={styles.input} {...methods.register("status")}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={block("field")}>
              <label className={block("label")}>Описание</label>
              <textarea
                className={styles.textarea}
                rows={3}
                {...methods.register("description")}
              />
            </div>

            <div className={block("field")}>
              <label className={block("label")}>Результат</label>
              <textarea
                className={styles.textarea}
                rows={2}
                {...methods.register("result")}
              />
            </div>

            <div className={block("actions")}>
              <button
                type="button"
                className={block("btn", ["ghost"])}
                onClick={() => setIsEditing(false)}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={block("btn", ["primary"])}
                disabled={isPending}
              >
                Сохранить
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className={block("data")}>
              <div className={block("item")}>
                <dt className={block("label")}>Исполнитель</dt>
                <dd className={block("value")}>{task.assigneeName || "—"}</dd>
              </div>
              <div className={block("item")}>
                <dt className={block("label")}>Постановщик</dt>
                <dd className={block("value")}>{task.assignedByName || "—"}</dd>
              </div>
              <div className={block("item")}>
                <dt className={block("label")}>Функция КС</dt>
                <dd className={block("value")}>
                  {task.functionCode
                    ? functionLabels[task.functionCode]
                    : "Без функции"}
                </dd>
              </div>
              <div className={block("item")}>
                <dt className={block("label")}>Срок выполнения</dt>
                <dd className={block("value")}>
                  {formatDate(task.dueDate) || "—"}
                  {daysLeft !== null && daysLeft < 0 && (
                    <span className={block("overdue")}>
                      {" "}
                      (просрочен на {Math.abs(daysLeft)} дн.)
                    </span>
                  )}
                </dd>
              </div>
              <div className={block("item")}>
                <dt className={block("label")}>Источник</dt>
                <dd className={block("value")}>
                  {originLabels[task.origin ?? ""] ?? "—"}
                </dd>
              </div>
              <div className={block("item")}>
                <dt className={block("label")}>Создана</dt>
                <dd className={block("value")}>{formatDate(task.createdAt)}</dd>
              </div>
              {task.completedAt && (
                <div className={block("item")}>
                  <dt className={block("label")}>Завершена</dt>
                  <dd className={block("value")}>
                    {formatDate(task.completedAt)}
                  </dd>
                </div>
              )}
            </dl>

            {task.description && (
              <div className={block("section")}>
                <h3 className={block("section-title")}>Описание</h3>
                <p className={block("text")}>{task.description}</p>
              </div>
            )}

            {task.result && (
              <div className={block("section")}>
                <h3 className={block("section-title")}>Результат</h3>
                <p className={block("text")}>{task.result}</p>
              </div>
            )}

            {/* Назначение и выполнение — прерогатива личного кабинета:
                руководитель правит карточку, исполнитель меняет статус у себя */}
            {isHead && (
              <div className={block("actions")}>
                <button
                  type="button"
                  className={block("btn", ["primary"])}
                  onClick={startEditing}
                >
                  Редактировать задачу
                </button>
                <span className={block("note")}>
                  Роль в КС: {employee ? "руководитель службы" : "—"}
                </span>
              </div>
            )}

            {isHead && task.status === "completed" && task.id !== undefined && (
              <div className={block("section")}>
                <h3 className={block("section-title")}>Оценка выполнения</h3>
                <TaskEvaluationForm
                  taskId={task.id}
                  assigneeName={task.assigneeName ?? ""}
                  assigneeId={task.assigneeId ?? ""}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Просрочка считается по сроку задачи: завершённые задачи не просрочиваются
function taskDaysLeftValue(task: Task): number | null {
  if (!task.dueDate || task.status === "completed") return null;

  const due = new Date(task.dueDate).getTime();

  if (Number.isNaN(due)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((due - today.getTime()) / 86400000);
}
