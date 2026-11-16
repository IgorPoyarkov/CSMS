import { useMemo } from "react";
import { useForm } from "react-hook-form";
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
  type TaskOrigin,
} from "../../services/Tasks/tasks.schema";
import styles from "./TaskAssignModal.module.scss";

interface TaskAssignModalProps {
  onClose: () => void;
}

interface AssignFormValues {
  organizationId: string | number;
  categoryCode: string;
  functionCode: string;
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

// Функция, которую назначают, — первое поле: по п. 2.4 Типового положения
// руководитель службы сначала определяет функцию и полномочие, и только потом
// выбирает работника, который её закрывает. Поэтому список исполнителей
// строится из выбранной функции, а до выбора поле исполнителя недоступно.
const assignTaskSchema = TaskSchema.extend({
  functionCode: TaskSchema.shape.functionCode,
});

export default function TaskAssignModal({ onClose }: TaskAssignModalProps) {
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

  const block = bem(styles, "task-assign");

  const methods = useForm<AssignFormValues>({
    resolver: zodResolver(assignTaskSchema) as any,
    defaultValues: {
      organizationId: organization?.id ?? "",
      categoryCode: "",
      functionCode: "",
      assigneeId: "",
      assigneeName: "",
      title: "",
      description: "",
      status: "pending",
      origin: "head",
      assignedByEmployeeId: me?.id ?? "",
      assignedByName: fullName(me?.employee ?? {}),
      dueDate: "",
      createdAt: new Date().toISOString().slice(0, 10),
      completedAt: "",
      result: "",
    },
  });

  const { handleSubmit, watch, reset } = methods;
  const categoryCode = watch("categoryCode");
  const functionCode = watch("functionCode");
  const dueDate = watch("dueDate");

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

    createTask(values as unknown as Task, {
      onSuccess: () => {
        reset(methods.formState.defaultValues);
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
          <h3 className={block("title")}>Назначение задачи</h3>
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
            <select
              id="assign-category"
              className={block("input")}
              {...methods.register("categoryCode")}
              onChange={(event) => {
                methods.setValue("categoryCode", event.target.value);
                // Сбрасываем функцию и исполнителя при смене категории
                methods.setValue("functionCode", "");
                methods.setValue("assigneeId", "");
                methods.setValue("assigneeName", "");
                methods.clearErrors(["functionCode", "assigneeId"]);
              }}
            >
              <option value="">— Выберите категорию —</option>
              {contractServiceFunctionCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Функция раздела III — определяет, кого можно назначать */}
          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-function">
              Функция, которую назначаете
            </label>
            <select
              id="assign-function"
              className={block("input")}
              disabled={!categoryCode}
              {...methods.register("functionCode")}
              onChange={(event) => {
                methods.setValue("functionCode", event.target.value);
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
            </select>
            {methods.formState.errors.functionCode && (
              <span className={block("error")}>
                Укажите функцию, которую назначаете
              </span>
            )}
          </div>

          {/* Исполнитель — доступен только после выбора функции */}
          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-assignee">
              Исполнитель
            </label>
            <select
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
            </select>

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

          <div className={block("field")}>
            <label className={block("label")} htmlFor="assign-due">
              Срок выполнения
            </label>
            <input
              id="assign-due"
              type="date"
              className={block("input")}
              {...methods.register("dueDate")}
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
            <select
              id="assign-origin"
              className={block("input")}
              {...methods.register("origin")}
            >
              {Object.entries(originLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
