import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  TaskEvaluationListSchema,
  TaskEvaluationSchema,
  type TaskEvaluation,
  scorePoints,
} from "./taskEvaluation.schema";
import type { Task } from "./tasks.schema";

const ENDPOINT = "/taskEvaluations";

export const taskEvaluationsQueryKey = ["taskEvaluations"];

// Вырезание пустых ссылок — json-server удаляет записи с «битыми» ссылками
const isBlank = (value: unknown): boolean =>
  value === "" || value === null || value === undefined;

const omitEmptyReferences = (
  evaluation: TaskEvaluation,
): TaskEvaluation =>
  Object.fromEntries(
    Object.entries(evaluation).filter(
      ([key, value]) => !/Id$/.test(key) || !isBlank(value),
    ),
  ) as TaskEvaluation;

const fetchEvaluationsForTask = async (
  taskId: string | number,
): Promise<TaskEvaluation[]> => {
  const response = await api.get(ENDPOINT, { params: { taskId } });

  return TaskEvaluationListSchema.parse(response.data);
};

const fetchEvaluationsForEmployee = async (
  employeeId: string | number,
): Promise<TaskEvaluation[]> => {
  const response = await api.get(ENDPOINT, {
    params: { evaluatedEmployeeId: employeeId },
  });

  return TaskEvaluationListSchema.parse(response.data);
};

const createEvaluation = async (
  evaluation: TaskEvaluation,
): Promise<TaskEvaluation> => {
  const response = await api.post(ENDPOINT, omitEmptyReferences(evaluation));

  return TaskEvaluationSchema.parse(response.data);
};

const deleteEvaluation = async (
  id: string | number,
): Promise<string | number> => {
  await api.delete(`${ENDPOINT}/${id}`);

  return id;
};

const fetchAllTaskEvaluations = async (): Promise<TaskEvaluation[]> => {
  const response = await api.get(ENDPOINT);

  return TaskEvaluationListSchema.parse(response.data ?? []);
};

export const useTaskEvaluations = (taskId: string | number | undefined) =>
  useQuery({
    queryKey: [...taskEvaluationsQueryKey, "task", String(taskId)],
    queryFn: () => fetchEvaluationsForTask(taskId as string | number),
    enabled: Boolean(taskId),
  });

export const useEmployeeEvaluations = (
  employeeId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...taskEvaluationsQueryKey, "employee", String(employeeId)],
    queryFn: () => fetchEvaluationsForEmployee(employeeId as string | number),
    enabled: Boolean(employeeId),
  });

export const useAllTaskEvaluations = (enabled = true) =>
  useQuery({
    queryKey: [...taskEvaluationsQueryKey, "all"],
    queryFn: fetchAllTaskEvaluations,
    enabled,
  });

export const useCreateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvaluation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskEvaluationsQueryKey });
    },
  });
};

export const useDeleteEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvaluation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskEvaluationsQueryKey });
    },
  });
};

// Суммарные баллы сотрудника: сумма очков всех оценок
export const employeeScoreTotal = (
  evaluations: TaskEvaluation[],
): number =>
  evaluations.reduce(
    (sum, evalItem) => sum + (scorePoints[evalItem.score] ?? 0),
    0,
  );

// Средний балл — для отображения в кабинете
export const employeeScoreAverage = (
  evaluations: TaskEvaluation[],
): number | null => {
  if (evaluations.length === 0) return null;

  const total = employeeScoreTotal(evaluations);

  return Math.round((total / evaluations.length) * 100) / 100;
};

// Рекомендация по влиянию на ЗП (упрощённо):
// средний балл >= 1.5 → премия, 0..1.5 → без изменений, < 0 → депремирование
export const salaryImpact = (
  evaluations: TaskEvaluation[],
): "bonus" | "neutral" | "penalty" | "unknown" => {
  const avg = employeeScoreAverage(evaluations);

  if (avg === null) return "unknown";
  if (avg >= 1.5) return "bonus";
  if (avg >= 0) return "neutral";

  return "penalty";
};

export const salaryImpactLabel: Record<string, string> = {
  bonus: "Премирование",
  neutral: "Без изменений",
  penalty: "Депремирование",
  unknown: "Нет оценок",
};

// Статус соблюдения сроков: доля выполненных в срок
export const onTimeCompletionRate = (
  tasks: Task[],
  evaluations: TaskEvaluation[],
): { total: number; onTime: number; late: number; rate: number } => {
  const completedTasks = tasks.filter((t) => t.status === "completed");

  if (completedTasks.length === 0) {
    return { total: 0, onTime: 0, late: 0, rate: 0 };
  }

  const lateScores = new Set(["needs_improvement", "violation"]);
  const lateTaskIds = new Set(
    evaluations
      .filter((e) => lateScores.has(e.score))
      .map((e) => String(e.taskId)),
  );

  const late = completedTasks.filter((t) =>
    lateTaskIds.has(String(t.id)),
  ).length;

  const onTime = completedTasks.length - late;
  const rate = Math.round((onTime / completedTasks.length) * 100);

  return { total: completedTasks.length, onTime, late, rate };
};
