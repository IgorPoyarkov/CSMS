import type { Task } from "../../services/Tasks/tasks.schema";
import type { ConfigurationInput } from "../UI/CustomInput";

// Конфигурация полей формы создания задачи.
// Замечание: текущая реализация Task.tsx не использует этот массив —
// форма собирается вручную через register() для поддержки <select>.
// Конфиг сохранён как справочник и может быть подхвачен рефакторингом.

export const taskConfig: ConfigurationInput<Task>[] = [
  {
    label: { value: "Название задачи" },
    input: {
      name: "title",
      placeholder: "Что нужно сделать",
      type: "text",
    },
  },
  {
    label: { value: "Описание задачи" },
    input: {
      name: "description",
      placeholder: "Подробности",
      type: "text",
    },
  },
  {
    label: { value: "Срок выполнения" },
    input: {
      name: "dueDate",
      type: "date",
    },
  },
];

export default taskConfig;
