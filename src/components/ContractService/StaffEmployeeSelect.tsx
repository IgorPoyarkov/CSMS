import { get, useFormContext, type FieldError, type FieldPath } from "react-hook-form";
import useUtils from "../../hooks/useUtils";
import type { ContractService } from "../../services/ContractService/contractService.schema";
import type { BaseEmployee } from "../../services/StaffingTable/StaffingTable.schema";
import { employeeFullName } from "./contractService.config";
import styles from "./ContractServicePage.module.scss";
import Select from "../UI/Select";

// Один выбор работника без привязки к отделу — нужен там, где круг кандидатов
// уже ограничен снаружи (например, лицо, издающее приказ о назначении
// руководителя службы)
export interface StaffEmployeeSelectFields {
  employeeId: FieldPath<ContractService>;
  fullName: FieldPath<ContractService>;
  position: FieldPath<ContractService>;
}

interface StaffEmployeeSelectProps {
  fields: StaffEmployeeSelectFields;
  employees: BaseEmployee[];
  idPrefix: string;
  label: string;
  emptyOptionLabel?: string;
  hint?: string;
  isLoading?: boolean;
}

export default function StaffEmployeeSelect({
  fields,
  employees,
  idPrefix,
  label,
  emptyOptionLabel = "— выберите работника —",
  hint,
  isLoading,
}: StaffEmployeeSelectProps) {
  const { bem } = useUtils();
  const block = bem(styles, "contract-service");
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ContractService>();

  const errorMessage = (path: FieldPath<ContractService>): string | undefined =>
    (get(errors, path) as FieldError | undefined)?.message;

  const options = [...employees].sort((first, second) =>
    employeeFullName(first).localeCompare(employeeFullName(second), "ru"),
  );

  return (
    <div className={block("field")}>
      <label className={block("label")} htmlFor={`${idPrefix}-employee`}>
        {label}
      </label>
      <Select
        id={`${idPrefix}-employee`}
        className={block("select")}
        {...register(fields.employeeId, {
          onChange: (event) => {
            const employee = employees.find(
              (item) => String(item.id) === event.target.value,
            );

            setValue(fields.fullName, employeeFullName(employee));
            setValue(fields.position, employee?.position ?? "");
          },
        })}
      >
        <option value="">{emptyOptionLabel}</option>
        {options.map((employee) => (
          <option key={String(employee.id)} value={String(employee.id)}>
            {employeeFullName(employee)}
            {employee.position ? ` — ${employee.position}` : ""}
          </option>
        ))}
      </Select>

      {isLoading && <span className={block("hint")}>Загрузка штатного расписания...</span>}
      {!isLoading && hint && <span className={block("hint")}>{hint}</span>}
      {errorMessage(fields.employeeId) && (
        <span className={block("error")}>{errorMessage(fields.employeeId)}</span>
      )}
    </div>
  );
}
