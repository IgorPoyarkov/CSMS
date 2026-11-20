import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import { useFetchOrganizationEmployees } from "../../services/StaffingTable/StaffingTable.api";
import {
  useTask,
  useUpdateTask,
  useUpdateTaskProgress,
  useUpdateTaskSteps,
} from "../../services/Tasks/tasks.api";
import {
  TaskSchema,
  taskStepProgress,
  type Task,
  type TaskExecutionStep,
} from "../../services/Tasks/tasks.schema";
import { useTaskEvaluations } from "../../services/Tasks/taskEvaluation.api";
import { contractServiceFunctionCodes } from "../../services/ContractService/contractService.schema";
import { functionLabels } from "../../components/ContractService/contractService.config";
import {
  recommendedDueDate,
  getDeadlinesForFunction,
} from "./regulatoryDeadlines";
import type { ContractServiceFunction } from "../../services/ContractService/contractService.schema";
import {
  buildDefaultGenericSteps,
  buildTaskStepsFromPoolItem,
  filterPoolItems,
  findPoolItem,
  useOrder158nPool,
} from "../../services/Tasks/order158nTaskPool";
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
  const { data: taskEvaluations = [] } = useTaskEvaluations(task?.id);
  const { data: poolData } = useOrder158nPool();
  const poolItems = poolData?.items ?? [];
  const { mutate: updateTask, isPending } = useUpdateTask();
  const { mutate: updateProgress, isPending: isProgressPending } =
    useUpdateTaskProgress();
  const { mutate: updateSteps, isPending: isStepsPending } =
    useUpdateTaskSteps();

  const [isEditing, setIsEditing] = useState(false);
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [resultDraft, setResultDraft] = useState<string | null>(null);
  const [newStepStage, setNewStepStage] = useState("Исполнение");
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepDue, setNewStepDue] = useState("");

  const block = bem(styles, "task-detail");

  const methods = useForm<Task>({
    resolver: zodResolver(TaskSchema) as any,
    defaultValues: task ?? ({} as Task),
  });

  const watchedFunctionCode = useWatch({
    control: methods.control,
    name: "functionCode",
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

  const daysLeft = taskDaysLeftValue(task, todayIso);
  const poolItem =
    findPoolItem(poolItems, task.order158nPoolCode || task.order158nClause) ??
    filterPoolItems(poolItems, task.functionCode)[0];

  const steps = task.steps ?? [];
  const stepProgress = taskStepProgress(task);
  const effectiveInputs =
    task.requiredInputs && task.requiredInputs.length > 0
      ? task.requiredInputs
      : poolItem?.requiredInputs ?? [];
  const effectiveCriteria =
    task.completionCriteria || poolItem?.completionCriteria || "";

  const isAssignee =
    Boolean(employee?.id) &&
    String(employee?.id) === String(task.assigneeId ?? "");
  const canExecute = Boolean(isHead || isAssignee);
  const actorName = employee
    ? fullName(employee.employee ?? {})
    : task.assigneeName || "Исполнитель";

  const activeResultText = resultDraft ?? task.result ?? "";

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

  const handleToggleStep = (step: TaskExecutionStep) => {
    if (!task?.id || !canExecute) return;
    const nowIso = new Date().toISOString().slice(0, 10);
    const nextDone = !step.isDone;
    const nextSteps = steps.map((s) =>
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

  const handleSaveStepNote = (stepId: string) => {
    if (!task?.id || !canExecute) return;
    const nextNote = noteDrafts[stepId] ?? "";
    const nextSteps = steps.map((s) =>
      s.id === stepId ? { ...s, note: nextNote } : s,
    );

    updateSteps({
      id: task.id,
      steps: nextSteps,
    });
  };

  const handleAddStep = () => {
    if (!task?.id || !canExecute) return;
    const title = newStepTitle.trim();
    if (!title) return;

    const nextSteps: TaskExecutionStep[] = [
      ...steps,
      {
        id: `custom-step-${steps.length + 1}-${Date.now()}`,
        order: steps.length + 1,
        stageLabel: newStepStage.trim() || "Исполнение",
        title,
        detail: "",
        expectedArtifact: "",
        dueDate: newStepDue || task.dueDate || "",
        isDone: false,
        completedAt: "",
        completedBy: "",
        note: "",
      },
    ];

    updateSteps(
      { id: task.id, steps: nextSteps },
      {
        onSuccess: () => {
          setNewStepTitle("");
          setNewStepDue("");
        },
      },
    );
  };

  const handleApplyRoute = (fromPool: boolean) => {
    if (!task?.id || !canExecute) return;
    const startRef = task.createdAt || todayIso;
    const generated =
      fromPool && poolItem
        ? buildTaskStepsFromPoolItem(poolItem, startRef, task.dueDate)
        : buildDefaultGenericSteps(startRef, task.dueDate);

    updateSteps({
      id: task.id,
      steps: generated,
      requiredInputs:
        task.requiredInputs && task.requiredInputs.length > 0
          ? undefined
          : poolItem?.requiredInputs,
      completionCriteria:
        task.completionCriteria || poolItem?.completionCriteria || undefined,
    });
  };

  const handleStartWork = () => {
    if (!task?.id) return;
    updateProgress({
      id: task.id,
      status: "in_progress",
      startedAt: task.startedAt || new Date().toISOString().slice(0, 10),
    });
  };

  const handleCompleteTask = () => {
    if (!task?.id) return;
    const trimmedResult = activeResultText.trim();
    const autoSummary =
      trimmedResult ||
      (steps.length > 0
        ? `Выполнены этапы (${stepProgress.done} из ${stepProgress.total}): ${steps
            .filter((s) => s.isDone)
            .map((s) => s.note ? `${s.title} (${s.note})` : s.title)
            .join("; ")}`
        : "Задача выполнена");

    updateProgress({
      id: task.id,
      status: "completed",
      result: autoSummary,
      startedAt: task.startedAt || task.createdAt || todayIso,
    });
  };

  const handleReopenTask = () => {
    if (!task?.id) return;
    updateProgress({
      id: task.id,
      status: "in_progress",
      startedAt: task.startedAt || todayIso,
    });
  };

  const lifecycleStages = [
    {
      key: "assigned",
      label: "1. Поставлена",
      date: task.createdAt ? formatDate(task.createdAt) : "дата не указана",
      state: "done" as const,
    },
    {
      key: "started",
      label: "2. Взята в работу",
      date: task.startedAt
        ? formatDate(task.startedAt)
        : task.status === "pending"
          ? "ожидает начала"
          : "в работе",
      state:
        task.status !== "pending"
          ? ("done" as const)
          : ("active" as const),
    },
    {
      key: "steps",
      label: "3. Исполнение этапов",
      date:
        stepProgress.total > 0
          ? `${stepProgress.done} из ${stepProgress.total} (${stepProgress.percent}%)`
          : task.status === "completed"
            ? "без этапов"
            : "настройка маршрута",
      state:
        task.status === "completed" ||
        (stepProgress.total > 0 && stepProgress.done === stepProgress.total)
          ? ("done" as const)
          : task.status === "in_progress"
            ? ("active" as const)
            : ("upcoming" as const),
    },
    {
      key: "completed",
      label: "4. Завершена",
      date: task.completedAt
        ? formatDate(task.completedAt)
        : task.dueDate
          ? `срок ${formatDate(task.dueDate)}`
          : "не завершена",
      state:
        task.status === "completed"
          ? ("done" as const)
          : task.status === "in_progress"
            ? ("upcoming" as const)
            : ("upcoming" as const),
    },
    {
      key: "evaluated",
      label: "5. Оценена руководителем",
      date:
        taskEvaluations.length > 0
          ? `${formatDate(taskEvaluations[0].createdAt)} (оценок: ${taskEvaluations.length})`
          : "ожидает оценки",
      state:
        taskEvaluations.length > 0
          ? ("done" as const)
          : task.status === "completed"
            ? ("active" as const)
            : ("upcoming" as const),
    },
  ];

  return (
    <div className={block()}>
      <Link className={styles["back-link"]} to="/tasks">
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

        {/* Линия жизненного цикла задачи от постановки до оценки */}
        {!isEditing && (
          <div className={block("lifecycle")}>
            {lifecycleStages.map((stage) => (
              <div
                key={stage.key}
                className={`${block("lifecycle-step")} ${
                  stage.state === "done"
                    ? block("lifecycle-step", ["done"])
                    : stage.state === "active"
                      ? block("lifecycle-step", ["active"])
                      : ""
                }`}
              >
                <div className={block("lifecycle-label")}>{stage.label}</div>
                <div className={block("lifecycle-date")}>{stage.date}</div>
              </div>
            ))}
          </div>
        )}

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
                  methods.setValue("order158nPoolCode", "");
                  methods.setValue("order158nClause", "");
                  methods.setValue("legalBasis", "");
                  methods.setValue(
                    "dueDate",
                    recommendedDueDate(code || undefined, poolItems),
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
            </div>

            <div className={block("field")}>
              <label className={block("label")}>
                Подфункция Приказа № 158н
              </label>
              <select
                className={styles.input}
                {...methods.register("order158nPoolCode")}
                onChange={(e) => {
                  const tpl = findPoolItem(poolItems, e.target.value);
                  methods.setValue("order158nPoolCode", tpl?.id ?? "");
                  methods.setValue("order158nClause", tpl?.clause ?? "");
                  methods.setValue(
                    "legalBasis",
                    tpl?.legalReference ?? "",
                  );
                  if (tpl) {
                    methods.setValue(
                      "dueDate",
                      recommendedDueDate(
                        tpl.functionCode,
                        poolItems,
                        tpl.recommendedDays,
                      ),
                    );
                  }
                }}
              >
                <option value="">— Не выбрана —</option>
                {filterPoolItems(
                  poolItems,
                  watchedFunctionCode as ContractServiceFunction | undefined,
                ).map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.clause} · {tpl.defaultTaskTitle} ({tpl.recommendedDays}{" "}
                    дн.)
                  </option>
                ))}
              </select>
              {(() => {
                const code = watchedFunctionCode;

                if (!code) return null;

                const deadlines = getDeadlinesForFunction(
                  code as ContractServiceFunction,
                  poolItems,
                );

                if (deadlines.length === 0) return null;

                return (
                  <div className={block("hint")}>
                    Регламентированные сроки:{" "}
                    {deadlines
                      .slice(0, 4)
                      .map((d) => `${d.action} (${d.days} дн.)`)
                      .join("; ")}
                    {deadlines.length > 4
                      ? ` и ещё ${deadlines.length - 4}...`
                      : ""}
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
              <label className={block("label")}>Критерий приёмки результата</label>
              <textarea
                className={styles.textarea}
                rows={2}
                {...methods.register("completionCriteria")}
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
              {task.order158nClause && (
                <div className={block("item")}>
                  <dt className={block("label")}>Пункт Приказа № 158н</dt>
                  <dd className={block("value")}>
                    {task.order158nClause}
                    {task.legalBasis ? ` · ${task.legalBasis}` : ""}
                  </dd>
                </div>
              )}
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
              {task.startedAt && (
                <div className={block("item")}>
                  <dt className={block("label")}>Взята в работу</dt>
                  <dd className={block("value")}>
                    {formatDate(task.startedAt)}
                  </dd>
                </div>
              )}
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

            {/* Входные данные, критерий приёмки и переход в рабочий экран системы */}
            {(effectiveInputs.length > 0 ||
              effectiveCriteria ||
              poolItem?.appRoute) && (
              <div className={block("section")}>
                <div className={block("section-head")}>
                  <h3 className={block("section-title")}>
                    Постановка и условия приёмки
                  </h3>
                  {poolItem?.appRoute && poolItem?.appRouteLabel && (
                    <Link
                      to={poolItem.appRoute}
                      className={block("module-link")}
                    >
                      Открыть модуль «{poolItem.appRouteLabel}» →
                    </Link>
                  )}
                </div>

                {effectiveInputs.length > 0 && (
                  <div className={block("inputs-box")}>
                    <div className={block("subhead")}>
                      Необходимые входные данные и документы:
                    </div>
                    <ul className={block("inputs-list")}>
                      {effectiveInputs.map((req, idx) => (
                        <li key={`req-${idx}`}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {effectiveCriteria && (
                  <div className={block("criteria-box")}>
                    <strong>Критерий приёмки результата:</strong>{" "}
                    {effectiveCriteria}
                  </div>
                )}
              </div>
            )}

            {/* Пошаговый маршрут исполнения задачи */}
            <div className={block("section")}>
              <div className={block("section-head")}>
                <h3 className={block("section-title")}>
                  Детализация исполнения ({stepProgress.done} из{" "}
                  {stepProgress.total} · {stepProgress.percent}%)
                </h3>
              </div>

              {steps.length > 0 && (
                <div className={block("progress-track")}>
                  <div
                    className={block("progress-fill")}
                    style={{ width: `${stepProgress.percent}%` }}
                  />
                </div>
              )}

              {steps.length === 0 ? (
                <div className={block("empty-steps")}>
                  <p className={block("text")}>
                    Для этой задачи пока не сформирован пошаговый маршрут.
                  </p>
                  {canExecute && task.status !== "completed" && (
                    <div className={block("actions")}>
                      {poolItem && (
                        <button
                          type="button"
                          className={block("btn", ["primary"])}
                          disabled={isStepsPending}
                          onClick={() => handleApplyRoute(true)}
                        >
                          Загрузить маршрут по {poolItem.clause} (
                          {poolItem.steps.length} этапов)
                        </button>
                      )}
                      <button
                        type="button"
                        className={block("btn", ["ghost"])}
                        disabled={isStepsPending}
                        onClick={() => handleApplyRoute(false)}
                      >
                        Добавить типовые 4 этапа
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <ol className={block("steps-list")}>
                  {steps.map((step) => {
                    const draftValue = noteDrafts[step.id] ?? step.note ?? "";
                    const isNoteDirty = draftValue !== (step.note ?? "");

                    return (
                      <li
                        key={step.id}
                        className={`${block("step-card")} ${
                          step.isDone ? block("step-card", ["done"]) : ""
                        }`}
                      >
                        <div className={block("step-top")}>
                          <label className={block("step-check")}>
                            <input
                              type="checkbox"
                              checked={step.isDone}
                              disabled={
                                !canExecute ||
                                isStepsPending ||
                                task.status === "completed"
                              }
                              onChange={() => handleToggleStep(step)}
                            />
                            <span className={block("step-order")}>
                              Этап {step.order}
                            </span>
                            <span className={block("step-stage")}>
                              {step.stageLabel}
                            </span>
                          </label>

                          <div className={block("step-dates")}>
                            {step.dueDate && (
                              <span>План: {formatDate(step.dueDate)}</span>
                            )}
                            {step.isDone && step.completedAt && (
                              <span className={block("step-done-badge")}>
                                Выполнено {formatDate(step.completedAt)}
                                {step.completedBy
                                  ? ` (${step.completedBy})`
                                  : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={block("step-title")}>{step.title}</div>
                        {step.detail && (
                          <div className={block("step-detail")}>
                            {step.detail}
                          </div>
                        )}
                        {step.expectedArtifact && (
                          <div className={block("step-artifact")}>
                            Ожидаемый документ / результат:{" "}
                            <strong>{step.expectedArtifact}</strong>
                          </div>
                        )}

                        {canExecute && task.status !== "completed" ? (
                          <div className={block("step-note-row")}>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="Реквизиты документа, № ЕИС, комментарий по этапу..."
                              value={draftValue}
                              onChange={(e) =>
                                setNoteDrafts((prev) => ({
                                  ...prev,
                                  [step.id]: e.target.value,
                                }))
                              }
                            />
                            {isNoteDirty && (
                              <button
                                type="button"
                                className={block("btn", ["ghost"])}
                                disabled={isStepsPending}
                                onClick={() => handleSaveStepNote(step.id)}
                              >
                                Сохранить отметку
                              </button>
                            )}
                          </div>
                        ) : (
                          step.note && (
                            <div className={block("step-note-view")}>
                              <strong>Отметка исполнителя:</strong> {step.note}
                            </div>
                          )
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {canExecute &&
                task.status !== "completed" &&
                steps.length > 0 && (
                  <div className={block("add-step")}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Стадия (напр. Проверка)"
                      value={newStepStage}
                      onChange={(e) => setNewStepStage(e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Добавить дополнительный шаг исполнения..."
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                    />
                    <input
                      type="date"
                      className={styles.input}
                      value={newStepDue}
                      onChange={(e) => setNewStepDue(e.target.value)}
                      aria-label="Срок нового шага"
                    />
                    <button
                      type="button"
                      className={block("btn", ["ghost"])}
                      disabled={isStepsPending || !newStepTitle.trim()}
                      onClick={handleAddStep}
                    >
                      + Добавить шаг
                    </button>
                  </div>
                )}
            </div>

            {/* Панель перевода статуса и фиксации итога исполнения */}
            {canExecute && task.status !== "completed" && (
              <div className={block("section")}>
                <h3 className={block("section-title")}>
                  Исполнение и завершение задачи
                </h3>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="task-result-box">
                    Итоговый результат / реквизиты исполнения
                  </label>
                  <textarea
                    id="task-result-box"
                    className={styles.textarea}
                    rows={2}
                    placeholder="Укажите итог: № реестровой записи ЕИС, подписанного контракта, расчёта НМЦК или СЗ..."
                    value={activeResultText}
                    onChange={(e) => setResultDraft(e.target.value)}
                  />
                </div>

                {stepProgress.total > 0 &&
                  stepProgress.done < stepProgress.total && (
                    <div className={block("hint")}>
                      Осталось невыполненных этапов:{" "}
                      {stepProgress.total - stepProgress.done}. Рекомендуется
                      отметить все шаги перед закрытием задачи.
                    </div>
                  )}

                <div className={block("actions")}>
                  {task.status === "pending" && (
                    <button
                      type="button"
                      className={block("btn", ["ghost"])}
                      disabled={isProgressPending}
                      onClick={handleStartWork}
                    >
                      Взять в работу
                    </button>
                  )}
                  <button
                    type="button"
                    className={block("btn", ["primary"])}
                    disabled={isProgressPending}
                    onClick={handleCompleteTask}
                  >
                    Завершить задачу
                  </button>
                </div>
              </div>
            )}

            {task.result && (
              <div className={block("section")}>
                <h3 className={block("section-title")}>Результат</h3>
                <p className={block("text")}>{task.result}</p>
              </div>
            )}

            {isHead && (
              <div className={block("actions")}>
                <button
                  type="button"
                  className={block("btn", ["primary"])}
                  onClick={startEditing}
                >
                  Редактировать задачу
                </button>
                {task.status === "completed" && (
                  <button
                    type="button"
                    className={block("btn", ["ghost"])}
                    disabled={isProgressPending}
                    onClick={handleReopenTask}
                  >
                    Вернуть в работу
                  </button>
                )}
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
function taskDaysLeftValue(task: Task, todayIso: string): number | null {
  if (!task.dueDate || task.status === "completed") return null;

  const due = new Date(`${task.dueDate}T00:00:00Z`).getTime();
  const today = new Date(`${todayIso}T00:00:00Z`).getTime();

  if (Number.isNaN(due) || Number.isNaN(today)) return null;

  return Math.round((due - today) / 86400000);
}
