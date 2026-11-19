import type { ConfigurationInput } from "../UI/CustomInput";
import type {
  BaseEmployee,
  BaseHuman,
} from "../../services/StaffingTable/StaffingTable.schema";

// Персональные данные рендерятся с prefixPath="employee", поэтому пути полей
// берутся из BaseHuman
export const personalFields: ConfigurationInput<BaseHuman>[] = [
  {
    label: { value: "Фамилия" },
    input: { name: "surname", placeholder: "Иванов" },
  },
  {
    label: { value: "Имя" },
    input: { name: "name", placeholder: "Иван" },
  },
  {
    label: { value: "Отчество" },
    input: { name: "patronymic", placeholder: "Иванович" },
  },
];

export const employmentFields: ConfigurationInput<BaseEmployee>[] = [
  {
    label: { value: "Табельный номер" },
    input: { name: "employeeNumber", placeholder: "000123" },
  },
];
