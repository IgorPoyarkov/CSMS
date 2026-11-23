import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import { useFetchOrganizationEmployees } from "../../services/StaffingTable/StaffingTable.api";
import { useOrganizationLeaves } from "../../services/Calendar/calendar.api";
import {
  isEmployeeAbsentOn,
  type Leave,
} from "../../services/Calendar/calendar.schema";
import {
  contractServiceRoster,
  contractServiceFunctionCategories,
  contractServiceFunctionOptions,
} from "../ContractService/contractService.config";
import { type ContractServiceFunction } from "../../services/ContractService/contractService.schema";
import { useCreateTask } from "../../services/Tasks/tasks.api";
import {
  TaskSchema,
  type Task,
  type TaskExecutionStep,
  type TaskOrigin,
} from "../../services/Tasks/tasks.schema";
import {
  buildDefaultGenericSteps,
  buildTaskStepsFromPoolItem,
  filterPoolItems,
  findPoolItem,
  recalculateStepDueDates,
  useOrder158nPool,
  type Order158nTaskPoolItem,
} from "../../services/Tasks/order158nTaskPool";
import { recommendedDueDate } from "./regulatoryDeadlines";
import styles from "./TaskAssignModal.module.scss";
import Select from "../UI/Select";

interface TaskAssignModalProps {
  onClose: () => void;
  initialTemplate?: Order158nTaskPoolItem | null;
}

interface AssignFormValues {
  organizationId: string | number;
  categoryCode: string;
  functionCode: string;
  order158nPoolCode?: string;
  order158nClause?: string;
  legalBasis?: string;
  assigneeId: string | number;
  assigneeName?: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  origin: TaskOrigin;
  assignedByEmployeeId?: string | number;
  assignedByName?: string;
  dueDate?: string;
  createdAt?: string;
  completedAt?: string;
  result?: string;
}

const originLabels: Record<TaskOrigin, string> = {
  head: "Руководитель службы",
  system: "Система",
};

const findCategoryForFunction = (
  functionCode?: ContractServiceFunction,
): string => {
  if (!functionCode) return "";
  return (
    contractServiceFunctionCategories.find((cat) =>
      cat.functions.includes(functionCode),
    )?.id ?? ""
  );
};

// Функция, которую назначают, — первое поле: по п. 2.4 Типового положения
// руководитель службы сначала определяет функцию и полномочие, и только потом
// выбирает работника, который её закрывает. Поэтому список исполнителей
// строится из выбранной функции, а до выбора поле исполнителя недоступно.
const assignTaskSchema = TaskSchema.extend({
  functionCode: TaskSchema.shape.functionCode,
});

export default function TaskAssignModal({
  onClose,
  initialTemplate = null,
}: TaskAssignModalProps) {
  const { bem, fullName, formatDate } = useUtils();
  const { mutate: createTask, isPending } = useCreateTask();
  const {
    organization,
    contractService,
    employee: me,
    isHead,
  } = useMyContractRole();

  const { data: orgEmployees } = useFetchOrganizationEmployees(
    organization?.id,
  );
  // График отпусков организации: работник в отпуске не может быть исполнителем
  // задачи, срок которой попадает в период его отсутствия
  const { data: orgLeaves } = useOrganizationLeaves(organization?.id);
  const { data: poolData } = useOrder158nPool();
  const poolItems = useMemo(() => poolData?.items ?? [], [poolData]);

  const block = bem(styles, "task-assign");
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));

  const initialDue = initialTemplate
    ? recommendedDueDate(
        initialTemplate.functionCode,
        poolItems,
        initialTemplate.recommendedDays,
      )
    : "";

  const [requiredInputs, setRequiredInputs] = useState<string[]>(() =>
    initialTemplate ? [...initialTemplate.requiredInputs] : [],
  );
  const [newInputText, setNewInputText] = useState("");
  const [completionCriteria, setCompletionCriteria] = useState<string>(
    () => initialTemplate?.completionCriteria ?? "",
  );
  const [steps, setSteps] = useState<TaskExecutionStep[]>(() =>
    initialTemplate
      ? buildTaskStepsFromPoolItem(initialTemplate, todayIso, initialDue)
      : [],
  );
  const [newStepTitle, setNewStepTitle] = useState("");
  const [newStepStage, setNewStepStage] = useState("Исполнение");

  const methods = useForm<AssignFormValues>({
    resolver: zodResolver(assignTaskSchema) as any,
    defaultValues: {
      organizationId: organization?.id ?? "",
      categoryCode: initialTemplate
        ? findCategoryForFunction(initialTemplate.functionCode)
        : "",
      functionCode: initialTemplate?.functionCode ?? "",
      order158nPoolCode: initialTemplate?.id ?? "",
      order158nClause: initialTemplate?.clause ?? "",
      legalBasis: initialTemplate?.legalReference ?? "",
      assigneeId: "",
      assigneeName: "",
      title: initialTemplate?.defaultTaskTitle ?? "",
      description: initialTemplate?.defaultTaskDescription ?? "",
      status: "pending",
      origin: "head",
      assignedByEmployeeId: me?.id ?? "",
      assignedByName: fullName(me?.employee ?? {}),
      dueDate: initialDue,
      createdAt: todayIso,
      completedAt: "",
      result: "",
    },
  });

  const { handleSubmit, control, reset } = methods;
  const categoryCode = useWatch({ control, name: "categoryCode" }) ?? "";
  const functionCode = useWatch({ control, name: "functionCode" }) ?? "";
  const order158nPoolCode =
    useWatch({ control, name: "order158nPoolCode" }) ?? "";
  const dueDate = useWatch({ control, name: "dueDate" }) ?? "";

  useEffect(() => {
    if (!initialTemplate) return;
    const recDue = recommendedDueDate(
      initialTemplate.functionCode,
      poolItems,
      initialTemplate.recommendedDays,
    );
    reset({
      organizationId: organization?.id ?? "",
      categoryCode: findCategoryForFunction(initialTemplate.functionCode),
      functionCode: initialTemplate.functionCode,
      order158nPoolCode: initialTemplate.id,
      order158nClause: initialTemplate.clause,
      legalBasis: initialTemplate.legalReference,
      assigneeId: "",
      assigneeName: "",
      title: initialTemplate.defaultTaskTitle,
      description: initialTemplate.defaultTaskDescription,
      status: "pending",
      origin: "head",
      assignedByEmployeeId: me?.id ?? "",
      assignedByName: fullName(me?.employee ?? {}),
      dueDate: recDue,
      createdAt: todayIso,
      completedAt: "",
      result: "",
    });
  }, [initialTemplate, organization?.id, me, reset, fullName, todayIso, poolItems]);

  const poolTemplates = useMemo(
    () => filterPoolItems(poolItems, functionCode as ContractServiceFunction),
    [functionCode, poolItems],
  );

  const selectedTemplate = useMemo(
    () => findPoolItem(poolItems, order158nPoolCode),
    [order158nPoolCode, poolItems],
  );

  // Кандидаты по выбранной функции. Способ службы решает, где искать носителей
  // функции: у службы-подразделения функции принадлежат всему подразделению,
  // у службы из работников и у контрактного управляющего — конкретным людям
  const candidates = useMemo(() => {
    if (!functionCode || !contractService || !orgEmployees) return [];

    const employees = orgEmployees;

    if (contractService.creationMethod === "structural_unit") {
      return employees.filter(
        (emp) =>
          String(emp.structuralUnitId ?? "") ===
          String(contractService.structuralUnitId ?? ""),
      );
    }

    const holderIds = new Set(
      contractServiceRoster(contractService)
        .filter((row) =>
          (row.functions ?? []).includes(
            functionCode as ContractServiceFunction,
          ),
        )
        .map((row) => String(row.employeeId ?? "")),
    );

    return employees.filter((emp) => holderIds.has(String(emp.id)));
  }, [functionCode, contractService, orgEmployees]);

  // Отсутствие работника на срок задачи: утверждённый или активный период
  const absences = useMemo(() => {
    const map = new Map<string, Leave>();
    if (!dueDate) return map;

    for (const leave of orgLeaves ?? []) {
      if (leave.status !== "approved" && leave.status !== "ongoing") continue;
      if (leave.startDate <= dueDate && dueDate <= leave.endDate) {
        map.set(String(leave.employeeId), leave);
      }
    }

    return map;
  }, [orgLeaves, dueDate]);

  const handleTemplateSelect = (poolId: string) => {
    methods.setValue("order158nPoolCode", poolId);
    const tpl = findPoolItem(poolItems, poolId);
    if (!tpl) {
      methods.setValue("order158nClause", "");
      methods.setValue("legalBasis", "");
      setRequiredInputs([]);
      setCompletionCriteria("");
      setSteps([]);
      return;
    }

    const recDue = recommendedDueDate(tpl.functionCode, poolItems, tpl.recommendedDays);
    methods.setValue("order158nClause", tpl.clause);
    methods.setValue("legalBasis", tpl.legalReference);
    methods.setValue("title", tpl.defaultTaskTitle, { shouldValidate: true });
    methods.setValue("description", tpl.defaultTaskDescription);
    methods.setValue("dueDate", recDue);
    methods.clearErrors(["title", "dueDate"]);

    setRequiredInputs([...tpl.requiredInputs]);
    setCompletionCriteria(tpl.completionCriteria);
    setSteps(buildTaskStepsFromPoolItem(tpl, todayIso, recDue));
  };

  const handleDueDateChange = (nextDue: string) => {
    methods.setValue("dueDate", nextDue);
    setSteps((prev) =>
      prev.length > 0 ? recalculateStepDueDates(prev, todayIso, nextDue) : prev,
    );
  };

  const handleAddInput = () => {
    const trimmed = newInputText.trim();
    if (!trimmed) return;
    setRequiredInputs((prev) => [...prev, trimmed]);
    setNewInputText("");
  };

  const handleRemoveInput = (index: number) => {
    setRequiredInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepTitleChange = (stepId: string, nextTitle: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, title: nextTitle } : step,
      ),
    );
  };

  const handleStepDueDateChange = (stepId: string, nextDue: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, dueDate: nextDue } : step,
      ),
    );
  };

  const handleRemoveStep = (stepId: string) => {
    setSteps((prev) =>
      prev
        .filter((step) => step.id !== stepId)
        .map((step, index) => ({ ...step, order: index + 1 })),
    );
  };

  const handleAddStep = () => {
    const trimmed = newStepTitle.trim();
    if (!trimmed) return;
    setSteps((prev) => [
      ...prev,
      {
        id: `custom-step-${prev.length + 1}-${Date.now()}`,
        order: prev.length + 1,
        stageLabel: newStepStage.trim() || "Исполнение",
        title: trimmed,
        detail: "",
        expectedArtifact: "",
        dueDate: dueDate || "",
        isDone: false,
        completedAt: "",
        completedBy: "",
        note: "",
      },
    ]);
    setNewStepTitle("");
  };

  const onSubmit = (values: AssignFormValues) => {
    const absence = isEmployeeAbsentOn(
      orgLeaves ?? [],
      values.assigneeId,
      values.dueDate ?? "",
    );

    if (absence) {
      methods.setError("assigneeId", {
        message: `${values.assigneeName || "Исполнитель"} отсутствует до ${formatDate(
          absence.endDate,
        )} — выберите другой срок или другого работника`,
      });
      return;
    }

    const cleanedSteps = steps
      .filter((s) => s.title.trim().length > 0)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    const payload: Task = {
      ...(values as unknown as Task),
      organizationId: values.organizationId || organization?.id || "",
      assignedByEmployeeId: values.assignedByEmployeeId || me?.id || "",
      assignedByName: values.assignedByName || fullName(me?.employee ?? {}),
      order158nPoolCode: values.order158nPoolCode || undefined,
      order158nClause: values.order158nClause || undefined,
      legalBasis: values.legalBasis || undefined,
      requiredInputs:
        requiredInputs.length > 0 ? requiredInputs : undefined,
      completionCriteria: completionCriteria.trim() || undefined,
      steps: cleanedSteps.length > 0 ? cleanedSteps : undefined,
    };

    createTask(payload, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  // Право назначать задачи есть у руководителя службы и контрактного
  // управляющего. Сотрудник без такого права функционал не видит вообще
  if (!isHead) return null;

  return (
    <div className={block()} onClick={onClose}>
      <div
        className={block("window")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={block("head")}>
          <h3 className={block("title")}>Назначение задачи (Приказ № 158н)</h3>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          {/* Категория функции — первый фильтр: чтобы не показывать все функции
              сразу и сузить выбор, пользователь сначала выбирает категорию */}
          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-category">
              Категория функции
            </label>
            <Select
              id="assign-category"
              className={block("input")}
              {...methods.register("categoryCode")}
              onChange={(event) => {
                methods.setValue("categoryCode", event.target.value);
                // Сбрасываем функцию, шаблон и исполнителя при смене категории
                methods.setValue("functionCode", "");
                methods.setValue("order158nPoolCode", "");
                methods.setValue("order158nClause", "");
                methods.setValue("legalBasis", "");
                methods.setValue("assigneeId", "");
                methods.setValue("assigneeName", "");
                setRequiredInputs([]);
                setCompletionCriteria("");
                setSteps([]);
                methods.clearErrors(["functionCode", "assigneeId"]);
              }}
            >
              <option value="">— Выберите категорию —</option>
              {contractServiceFunctionCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Функция раздела III — определяет, кого можно назначать */}
          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-function">
              Функция, которую назначаете
            </label>
            <Select
              id="assign-function"
              className={block("input")}
              disabled={!categoryCode}
              {...methods.register("functionCode")}
              onChange={(event) => {
                const nextFn = event.target.value as
                  | ContractServiceFunction
                  | "";
                methods.setValue("functionCode", nextFn);
                methods.setValue("order158nPoolCode", "");
                methods.setValue("order158nClause", "");
                methods.setValue("legalBasis", "");
                setRequiredInputs([]);
                setCompletionCriteria("");
                setSteps([]);
                if (nextFn && !dueDate) {
                  methods.setValue(
                    "dueDate",
                    recommendedDueDate(nextFn, poolItems),
                  );
                }
                // Исполнитель выбран под предыдущую функцию — сбрасываем
                methods.setValue("assigneeId", "");
                methods.setValue("assigneeName", "");
                methods.clearErrors("assigneeId");
              }}
            >
              <option value="">
                {categoryCode
                  ? "— Выберите функцию —"
                  : "— Сначала выберите категорию —"}
              </option>
              {contractServiceFunctionCategories
                .find((cat) => cat.id === categoryCode)
                ?.functions.map((code) => {
                  const opt = contractServiceFunctionOptions.find(
                    (o) => o.value === code,
                  );

                  return (
                    <option key={code} value={code}>
                      {opt?.paragraph} · {opt?.label}
                    </option>
                  );
                })}
            </Select>
            {methods.formState.errors.functionCode && (
              <span className={block("error")}>
                Укажите функцию, которую назначаете
              </span>
            )}
          </div>

          {/* Выбор конкретной подфункции (пункта) из полного пула Приказа № 158н */}
          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-pool-template">
              Подфункция и типовая задача по Приказу № 158н
            </label>
            <Select
              id="assign-pool-template"
              className={block("input")}
              disabled={!functionCode}
              value={order158nPoolCode}
              onChange={(event) => handleTemplateSelect(event.target.value)}
            >
              <option value="">
                {functionCode
                  ? "— Своя формулировка или выберите пункт № 158н —"
                  : "— Сначала выберите функцию —"}
              </option>
              {poolTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.clause} · {tpl.defaultTaskTitle} ({tpl.recommendedDays}{" "}
                  дн.)
                </option>
              ))}
            </Select>
          </div>

          {selectedTemplate && (
            <div className={block("template-card")}>
              <div>
                <strong>{selectedTemplate.clause}:</strong>{" "}
                {selectedTemplate.officialFormulation}
              </div>
              <div>
                <strong>Регламентный срок:</strong>{" "}
                {selectedTemplate.recommendedDays} дн. (
                {selectedTemplate.deadlineBasis}) ·{" "}
                {selectedTemplate.legalReference}
              </div>
            </div>
          )}

          {/* Исполнитель — доступен только после выбора функции */}
          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-assignee">
              Исполнитель
            </label>
            <Select
              id="assign-assignee"
              className={block("input")}
              disabled={!functionCode}
              {...methods.register("assigneeId")}
              onChange={(event) => {
                methods.setValue("assigneeId", event.target.value);

                const employee = candidates.find(
                  (emp) => String(emp.id) === event.target.value,
                );

                if (employee) {
                  methods.setValue(
                    "assigneeName",
                    fullName(employee.employee ?? {}),
                    { shouldValidate: true },
                  );
                }
              }}
            >
              <option value="">
                {functionCode
                  ? "— Выберите исполнителя —"
                  : "— Сначала выберите функцию —"}
              </option>
              {candidates.map((emp) => {
                const absence = absences.get(String(emp.id));

                return (
                  <option
                    key={emp.id}
                    value={emp.id}
                    disabled={Boolean(absence)}
                  >
                    {fullName(emp.employee ?? {})}
                    {absence
                      ? ` — отсутствует до ${formatDate(absence.endDate)}`
                      : ""}
                  </option>
                );
              })}
            </Select>

            {functionCode && candidates.length === 0 && (
              <span className={block("hint")}>
                В контрактной службе нет работников с такой функцией
              </span>
            )}

            {functionCode && candidates.length > 0 && !dueDate && (
              <span className={block("hint")}>
                Укажите срок — список учтёт график отпусков
              </span>
            )}

            {methods.formState.errors.assigneeId && (
              <span className={block("error")}>
                {methods.formState.errors.assigneeId.message}
              </span>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-title">
              Название задачи
            </label>
            <input
              id="assign-title"
              className={block("input")}
              {...methods.register("title")}
              placeholder="Что нужно сделать"
            />
            {methods.formState.errors.title && (
              <span className={block("error")}>
                {methods.formState.errors.title.message}
              </span>
            )}
          </div>

          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-description">
              Описание
            </label>
            <textarea
              id="assign-description"
              className={block("input", ["textarea"])}
              {...methods.register("description")}
              placeholder="Подробности задачи"
              rows={3}
            />
          </div>

          <div className={block("row")}>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="assign-due">
                Срок выполнения
              </label>
              <input
                id="assign-due"
                type="date"
                className={block("input")}
                value={dueDate}
                onChange={(event) => handleDueDateChange(event.target.value)}
              />
              {methods.formState.errors.dueDate && (
                <span className={block("error")}>
                  {methods.formState.errors.dueDate.message}
                </span>
              )}
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="assign-origin">
                Источник задачи
              </label>
              <Select
                id="assign-origin"
                className={block("input")}
                {...methods.register("origin")}
              >
                {Object.entries(originLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Детализация от постановки до исполнения: входные данные, этапы, критерий приёмки */}
          <div className={block("lifecycle-box")}>
            <div className={block("lifecycle-head")}>
              <span className={block("label")}>
                Детализация жизненного цикла ({steps.length} этапов)
              </span>
              {steps.length === 0 && (
                <button
                  type="button"
                  className={block("btn-mini")}
                  onClick={() =>
                    setSteps(buildDefaultGenericSteps(todayIso, dueDate))
                  }
                >
                  + Типовые 4 этапа (от постановки до отчёта)
                </button>
              )}
            </div>

            <div className={block("subblock")}>
              <span className={block("sublabel")}>
                Необходимые входные данные ({requiredInputs.length})
              </span>
              {requiredInputs.length > 0 && (
                <ul className={block("inputs-list")}>
                  {requiredInputs.map((item, index) => (
                    <li key={`${item}-${index}`} className={block("inputs-row")}>
                      <span>{item}</span>
                      <button
                        type="button"
                        className={block("btn-remove")}
                        onClick={() => handleRemoveInput(index)}
                        aria-label="Удалить входное требование"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className={block("inline-add")}>
                <input
                  type="text"
                  className={block("input")}
                  placeholder="Добавить исходный документ / условие..."
                  value={newInputText}
                  onChange={(e) => setNewInputText(e.target.value)}
                />
                <button
                  type="button"
                  className={block("btn-mini")}
                  onClick={handleAddInput}
                >
                  Добавить
                </button>
              </div>
            </div>

            <div className={block("subblock")}>
              <span className={block("sublabel")}>
                Этапы исполнения задачи (от постановки до завершения)
              </span>
              {steps.length > 0 ? (
                <div className={block("steps-list")}>
                  {steps.map((step) => (
                    <div key={step.id} className={block("step-row")}>
                      <span className={block("step-num")}>{step.order}</span>
                      <div className={block("step-body")}>
                        <div className={block("step-meta")}>
                          <span className={block("step-stage")}>
                            {step.stageLabel}
                          </span>
                          <input
                            type="date"
                            className={block("step-date")}
                            value={step.dueDate ?? ""}
                            onChange={(e) =>
                              handleStepDueDateChange(step.id, e.target.value)
                            }
                            aria-label={`Срок этапа ${step.order}`}
                          />
                        </div>
                        <input
                          type="text"
                          className={block("input")}
                          value={step.title}
                          onChange={(e) =>
                            handleStepTitleChange(step.id, e.target.value)
                          }
                          aria-label={`Название этапа ${step.order}`}
                        />
                        {step.expectedArtifact && (
                          <span className={block("step-artifact")}>
                            Ожидаемый результат: {step.expectedArtifact}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={block("btn-remove")}
                        onClick={() => handleRemoveStep(step.id)}
                        aria-label="Удалить этап"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <span className={block("hint")}>
                  Выберите подфункцию Приказа № 158н или добавьте этапы вручную
                </span>
              )}

              <div className={block("inline-add")}>
                <input
                  type="text"
                  className={block("input", ["stage-input"])}
                  placeholder="Стадия (напр. Согласование)"
                  value={newStepStage}
                  onChange={(e) => setNewStepStage(e.target.value)}
                />
                <input
                  type="text"
                  className={block("input")}
                  placeholder="Новый шаг исполнения..."
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                />
                <button
                  type="button"
                  className={block("btn-mini")}
                  onClick={handleAddStep}
                >
                  + Шаг
                </button>
              </div>
            </div>

            <div className={block("subblock")}>
              <label className={block("sublabel")} htmlFor="assign-criteria">
                Критерий приёмки результата
              </label>
              <textarea
                id="assign-criteria"
                className={block("input", ["textarea"])}
                rows={2}
                placeholder="По каким документам / результатам задача считается выполненной"
                value={completionCriteria}
                onChange={(e) => setCompletionCriteria(e.target.value)}
              />
            </div>
          </div>

          <div className={block("actions")}>
            <button
              type="button"
              className={block("btn", ["ghost"])}
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={block("btn", ["primary"])}
              disabled={isPending}
            >
              Создать задачу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
