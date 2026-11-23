import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TaskEvaluationSchema,
  type TaskEvaluationScore,
  type TaskEvaluation,
} from "../../services/Tasks/taskEvaluation.schema";
import { useCreateEvaluation } from "../../services/Tasks/taskEvaluation.api";
import useUtils from "../../hooks/useUtils";
import { useFetchEmployeeByUserId } from "../../services/StaffingTable/StaffingTable.api";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import styles from "./TaskEvaluationForm.module.scss";
import Select from "../UI/Select";

const evaluationFormSchema = TaskEvaluationSchema.omit({
  id: true,
  evaluatedByEmployeeId: true,
  createdAt: true,
});

interface TaskEvaluationFormProps {
  taskId: string | number;
  assigneeName: string;
  assigneeId: string | number;
  onCreated?: () => void;
}

const scoreLabels: Record<TaskEvaluationScore, string> = {
  excellent: "Отлично (+2)",
  good: "Хорошо (+1)",
  satisfactory: "Удовлетворительно (0)",
  needs_improvement: "Требует улучшений (−1)",
  violation: "Нарушение (−3)",
};

export default function TaskEvaluationForm({
  taskId,
  assigneeName,
  assigneeId,
  onCreated,
}: TaskEvaluationFormProps) {
  const { bem } = useUtils();
  const { data: user } = useFetchCurrentUser();
  const { data: employee } = useFetchEmployeeByUserId(user?.id);
  const { mutate } = useCreateEvaluation();

  const form = bem(styles, "evaluation-form");

  const methods = useForm({
    resolver: zodResolver(evaluationFormSchema) as any,
    defaultValues: {
      taskId,
      evaluatedEmployeeId: assigneeId,
      evaluatedEmployeeName: assigneeName,
      evaluatedByName: "",
      score: "satisfactory" as TaskEvaluationScore,
      comment: "",
      createdAt: new Date().toISOString().slice(0, 10),
    },
  });

  const { handleSubmit } = methods;

  function onSubmit(data: Record<string, unknown>) {
    const evaluation = {
      ...data,
      evaluatedByEmployeeId: employee?.id,
      evaluatedByName: employee ? assigneeName : "",
    } as unknown as TaskEvaluation;

    mutate(evaluation, {
      onSuccess: () => {
        methods.reset();
        onCreated?.();
      },
    });
  }

  return (
    <div className={form()}>
      <h4 className={form("title")}>Оценка выполнения задачи</h4>

      <form className={form("form")} onSubmit={handleSubmit(onSubmit)}>
        <div className={form("group")}>
          <label className={form("label")}>Исполнитель</label>
          <input className={form("input")} value={assigneeName} readOnly />
        </div>

        <div className={form("group")}>
          <label className={form("label")}>Оценка</label>
          <Select className={form("select")} {...methods.register("score")}>
            {Object.entries(scoreLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {methods.formState.errors.score && (
            <span className={form("error")}>
              {methods.formState.errors.score.message}
            </span>
          )}
        </div>

        <div className={form("group")}>
          <label className={form("label")}>Комментарий</label>
          <textarea
            className={form("textarea")}
            {...methods.register("comment")}
            placeholder="Почему такая оценка"
            rows={2}
          />
        </div>

        <button type="submit" className={form("submit")}>
          Сохранить оценку
        </button>
      </form>
    </div>
  );
}
