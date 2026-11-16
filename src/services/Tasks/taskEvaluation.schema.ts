import { z } from "zod";

/**
 * Оценка выполнения задачи руководителем КС.
 *
 * Раздел III: каждая выполненная задача должна оцениваться и отражаться
 * в табельном документе, в кабинете сотрудника и влиять на уровень дохода.
 * Нарушения идут со знаком «−», досрочное и качественное выполнение — «+».
 */

export const TaskEvaluationScoreSchema = z.enum([
  "excellent",
  "good",
  "satisfactory",
  "needs_improvement",
  "violation",
]);

export type TaskEvaluationScore = z.infer<typeof TaskEvaluationScoreSchema>;

export const TaskEvaluationSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  taskId: z.union([z.string(), z.number()]).optional(),
  // Сотрудник, который оценивает (руководитель службы или контрактный управляющий)
  evaluatedByEmployeeId: z.union([z.string(), z.number()]).optional(),
  // Сотрудник, которого оценивают
  evaluatedEmployeeId: z.union([z.string(), z.number()]).optional(),
  // Оценщик указывает ФИО снимком, чтобы оценка сохранилась даже при увольнении
  evaluatedEmployeeName: z.string().optional(),
  evaluatedByName: z.string().optional(),
  score: TaskEvaluationScoreSchema.default("satisfactory"),
  // Краткое описание: почему такая оценка
  comment: z.string().optional(),
  createdAt: z.string().optional(),
});

export type TaskEvaluation = z.infer<typeof TaskEvaluationSchema>;

export const TaskEvaluationListSchema = z.array(TaskEvaluationSchema);

// Очки для расчёта влияния на ЗП: excellent +2, good +1, satisfactory 0,
// needs_improvement −1, violation −3
export const scorePoints: Record<TaskEvaluationScore, number> = {
  excellent: 2,
  good: 1,
  satisfactory: 0,
  needs_improvement: -1,
  violation: -3,
};

// Максимальный положительный вклад — 2 балла за задачу
export const MAX_POSITIVE_SCORE = 2;

// Минимальный — −3 (нарушение)
export const MIN_NEGATIVE_SCORE = -3;
