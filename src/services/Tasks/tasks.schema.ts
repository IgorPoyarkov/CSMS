import { z } from "zod";
import { ContractServiceFunctionSchema } from "../ContractService/contractService.schema";

/**
 * Задача работника контрактной службы.
 *
 * Пункт 2.4 Типового положения: руководитель службы распределяет функции и
 * полномочия между работниками. Раздел III требует увязать эти функции с
 * регламентированными сроками выполнения, а каждую поставленную задачу —
 * доставлять в личный кабинет сотрудника.
 *
 * Отсюда состав задачи: исполнитель (работник службы), функция раздела III,
 * по которой поставлена задача, срок выполнения и статус. Задачу может
 * поставить руководитель службы (origin "head") или система — например,
 * напоминание об обновлении ДПО по п. 2.5 (origin "system").
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

const requiredId = (message: string) =>
  z
    .union([z.string(), z.number()])
    .refine(
      (value) => value !== "" && value !== null && value !== undefined,
      message,
    );

const optionalText = (minLength: number, message: string) =>
  z
    .string()
    .refine((value) => value === "" || value.length >= minLength, message)
    .optional();

const optionalDate = (message: string) =>
  z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
      message,
    )
    .optional();

// Даты создаются на клиенте и хранятся как есть: json-server не знает типов,
// поэтому в базе всегда строка ГГГГ-ММ-ДД
const today = (): string => new Date().toISOString().slice(0, 10);

export const TaskStatusSchema = z.enum(["pending", "in_progress", "completed"]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// Подписи статусов для списков и фильтра: одна формулировка в карточке задачи,
// в списке личного кабинета и в фильтре
export const taskStatusLabels: Record<TaskStatus, string> = {
  pending: "Ожидается",
  in_progress: "В работе",
  completed: "Выполнена",
};

// Кто поставил задачу: руководитель службы либо система по регламенту
export const TaskOriginSchema = z.enum(["head", "system"]);

export type TaskOrigin = z.infer<typeof TaskOriginSchema>;

export const TaskSchema = z.object({
  id: idSchema(),
  // Заказчик-владелец задачи: нужен, чтобы руководитель видел задачи только
  // своей организации
  organizationId: requiredId(
    "Задача должна принадлежать организации заказчика",
  ),
  title: z.string().min(5, "Укажите, что нужно сделать"),
  description: z.string().optional(),
  status: TaskStatusSchema.default("pending"),
  origin: TaskOriginSchema.default("head"),

  // Функция и полномочия по разделу III, в рамках которой поставлена задача.
  // Необязательна: поручение может быть и вне служебных функций
  functionCode: ContractServiceFunctionSchema.optional(),

  // Исполнитель — работник из штатного расписания (employees.id). ФИО
  // сохраняются снимком: задача остаётся читаемой, даже если работник уволится
  assigneeId: requiredId("Выберите исполнителя задачи"),
  assigneeName: optionalText(5, "Укажите ФИО исполнителя"),

  // Кто поставил задачу (п. 2.4 — руководитель службы)
  assignedByEmployeeId: idSchema(),
  assignedByName: optionalText(3, "Укажите, кто поставил задачу"),

  // Регламентированный срок выполнения
  dueDate: optionalDate(
    "Неверный формат срока выполнения (ожидается ГГГГ-ММ-ДД)",
  ),

  createdAt: optionalDate("Неверный формат даты постановки задачи"),
  completedAt: optionalDate("Неверный формат даты завершения задачи"),

  // Результат: чем завершилась работа — попадает в табельный учёт выполнения
  result: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const TaskListSchema = z.array(TaskSchema);

export const emptyTask = (organizationId: string | number = ""): Task => ({
  organizationId,
  title: "",
  description: "",
  status: "pending",
  origin: "head",
  functionCode: undefined,
  assigneeId: "",
  assigneeName: "",
  assignedByEmployeeId: "",
  assignedByName: "",
  dueDate: "",
  createdAt: today(),
  completedAt: "",
  result: "",
});

const dueMoment = (task: Task): number | null => {
  if (!task.dueDate) {
    return null;
  }

  const due = new Date(`${task.dueDate}T23:59:59`);

  return isNaN(due.getTime()) ? null : due.getTime();
};

// Просрочена ли задача: срок прошёл, а работы не завершены
export const isTaskOverdue = (task: Task, now: Date = new Date()): boolean => {
  if (task.status === "completed") {
    return false;
  }

  const due = dueMoment(task);

  return due !== null && due < now.getTime();
};

// Сколько дней осталось до срока: отрицательное — просрочено
export const taskDaysLeft = (
  task: Task,
  now: Date = new Date(),
): number | null => {
  const due = dueMoment(task);

  return due === null ? null : Math.ceil((due - now.getTime()) / 86_400_000);
};

// Задачи сотрудника: сравнение через String, потому что json-server отдаёт
// id числом, а из формы значение приходит строкой
export const employeeTasks = (
  tasks: Task[],
  employeeId: string | number | undefined,
): Task[] => {
  if (employeeId === undefined || employeeId === null || employeeId === "") {
    return [];
  }

  return tasks.filter((task) => String(task.assigneeId) === String(employeeId));
};

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export const taskSummary = (tasks: Task[]): TaskSummary =>
  tasks.reduce<TaskSummary>(
    (summary, task) => {
      summary.total += 1;

      if (isTaskOverdue(task)) {
        summary.overdue += 1;
      }

      if (task.status === "completed") {
        summary.completed += 1;
      } else if (task.status === "in_progress") {
        summary.inProgress += 1;
      } else {
        summary.pending += 1;
      }

      return summary;
    },
    { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 },
  );

// Ближайшие к сроку идут первыми: в кабинете сотрудник должен видеть не
// «что поставили», а «что горит»
export const sortTasksByDeadline = (tasks: Task[]): Task[] =>
  [...tasks].sort((first, second) => {
    if (Boolean(first.dueDate) !== Boolean(second.dueDate)) {
      return first.dueDate ? -1 : 1;
    }

    return String(first.dueDate ?? "").localeCompare(
      String(second.dueDate ?? ""),
    );
  });

// Задачи ещё можно перевыставить, завершённые — только читать
export const canChangeTaskStatus = (task: Task): boolean =>
  task.status !== "completed";
