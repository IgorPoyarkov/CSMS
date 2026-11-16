import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  TaskListSchema,
  TaskSchema,
  type Task,
  type TaskStatus,
} from "./tasks.schema";

export type { Task };

const ENDPOINT = "/tasks";

export const tasksQueryKey = ["tasks"];

// json-server удаляет документы с «битыми» ссылками: если поле вида *Id
// ссылается на несуществующую запись связанной коллекции, документ считается
// удаляемым. Пустая строка — как раз такая ссылка, поэтому пустые id из
// сохранения вырезаем: поля просто нет в записи.
const isBlank = (value: unknown): boolean =>
  value === "" || value === null || value === undefined;

const omitEmptyReferences = (task: Task): Task =>
  Object.fromEntries(
    Object.entries(task).filter(
      ([key, value]) => !/Id$/.test(key) || !isBlank(value),
    ),
  ) as Task;

const fetchTasks = async (
  filters: Record<string, string | number>,
): Promise<Task[]> => {
  const response = await api.get(ENDPOINT, { params: filters });

  return TaskListSchema.parse(response.data);
};

// Задачи организации — их видит руководитель службы при назначении
const fetchOrganizationTasks = async (
  organizationId: string | number,
): Promise<Task[]> => fetchTasks({ organizationId });

// Задачи конкретного исполнителя — личный кабинет
const fetchAssigneeTasks = async (
  assigneeId: string | number,
): Promise<Task[]> => fetchTasks({ assigneeId });

// Карточка задачи — доступна по ссылке из списка задач организации
const fetchTaskById = async (id: string | number): Promise<Task> => {
  const response = await api.get(`${ENDPOINT}/${id}`);

  return TaskSchema.parse(response.data);
};

const createTask = async (task: Task): Promise<Task> => {
  const response = await api.post(ENDPOINT, omitEmptyReferences(task));

  return TaskSchema.parse(response.data);
};

// Сотрудник меняет только статус и результат: срок, функцию и исполнителя
// задаёт тот, кто поставил задачу
const updateTaskProgress = async ({
  id,
  status,
  result,
}: {
  id: string | number;
  status: TaskStatus;
  result?: string;
}): Promise<Task> => {
  const changes: Record<string, unknown> = { status };

  if (result !== undefined) {
    changes.result = result;
  }

  // Дату завершения проставляем системой, чтобы её нельзя было подправить
  changes.completedAt =
    status === "completed" ? new Date().toISOString().slice(0, 10) : "";

  const response = await api.patch(`${ENDPOINT}/${id}`, changes);

  return TaskSchema.parse(response.data);
};

const deleteTask = async (id: string | number): Promise<string | number> => {
  await api.delete(`${ENDPOINT}/${id}`);

  return id;
};

// Руководитель службы правит карточку задачи: срок, исполнителя, функцию и
// результат. Пустые ссылки вырезаются, иначе json-server считает запись битой
const updateTask = async ({
  id,
  changes,
}: {
  id: string | number;
  changes: Partial<Task>;
}): Promise<Task> => {
  const response = await api.patch(
    `${ENDPOINT}/${id}`,
    omitEmptyReferences(changes as Task),
  );

  return TaskSchema.parse(response.data);
};

export const useOrganizationTasks = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...tasksQueryKey, "organization", String(organizationId)],
    queryFn: () => fetchOrganizationTasks(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useAssigneeTasks = (assigneeId: string | number | undefined) =>
  useQuery({
    queryKey: [...tasksQueryKey, "assignee", String(assigneeId)],
    queryFn: () => fetchAssigneeTasks(assigneeId as string | number),
    enabled: Boolean(assigneeId),
  });

export const useTask = (id: string | number | undefined) =>
  useQuery({
    queryKey: [...tasksQueryKey, "detail", String(id)],
    queryFn: () => fetchTaskById(id as string | number),
    enabled: Boolean(id),
  });

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
};

export const useUpdateTaskProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
};

// Редактирование карточки задачи руководителем службы
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: (task) => {
      queryClient.setQueryData(
        [...tasksQueryKey, "detail", String(task.id)],
        task,
      );
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    },
  });
};
