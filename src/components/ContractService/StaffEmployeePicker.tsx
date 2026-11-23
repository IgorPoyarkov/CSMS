import {
  get,
  useFormContext,
  useWatch,
  type FieldError,
  type FieldPath,
} from "react-hook-form";
import useUtils from "../../hooks/useUtils";
import type { ContractService } from "../../services/ContractService/contractService.schema";
import type {
  BaseEmployee,
  BaseStructuralUnit,
} from "../../services/StaffingTable/StaffingTable.schema";
import { employeeFullName } from "./contractService.config";
import styles from "./ContractServicePage.module.scss";
import Select from "../UI/Select";

// Пути полей одного «выбора работника из штатки». Состав службы, контрактный
// управляющий и работник, указавший сведения, устроены одинаково: сначала
// отдел, затем человек из него, поэтому поля описываются один раз, а имена
// путей подставляет вызывающая сторона.
export interface StaffEmployeeFields {
  unitId: FieldPath<ContractService>;
  unitName: FieldPath<ContractService>;
  employeeId: FieldPath<ContractService>;
  fullName: FieldPath<ContractService>;
  position: FieldPath<ContractService>;
  // Табельный есть не у всех снимков (у указавшего сведения он не нужен)
  employeeNumber?: FieldPath<ContractService>;
}

interface StaffEmployeePickerProps {
  fields: StaffEmployeeFields;
  units: BaseStructuralUnit[];
  employees: BaseEmployee[];
  idPrefix: string;
  unitLabel?: string;
  employeeLabel?: string;
  // У контрактного управляющего подразделения может не быть — он в прямом
  // подчинении руководителя заказчика
  unitOptional?: boolean;
  unitOptionalHint?: string;
  isUnitsLoading?: boolean;
  isEmployeesLoading?: boolean;
}

export default function StaffEmployeePicker({
  fields,
  units,
  employees,
  idPrefix,
  unitLabel = "Структурное подразделение (отдел)",
  employeeLabel = "Работник подразделения",
  unitOptional = false,
  unitOptionalHint = "— выберите подразделение —",
  isUnitsLoading,
  isEmployeesLoading,
}: StaffEmployeePickerProps) {
  const { bem } = useUtils();
  const block = bem(styles, "contract-service");
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ContractService>();

  const selectedUnitId = useWatch({ name: fields.unitId });

  const errorMessage = (path: FieldPath<ContractService>): string | undefined =>
    (get(errors, path) as FieldError | undefined)?.message;

  // Список работников ограничивается выбранным отделом — «идём по списку из
  // штатки»: сначала отдел, затем нужный человек из него
  const unitEmployees = employees.filter(
    (employee) =>
      String(employee.structuralUnitId) === String(selectedUnitId ?? ""),
  );

  const unitOptions = [...units].sort((first, second) =>
    String(first.name).localeCompare(String(second.name), "ru"),
  );

  return (
    <div className={block("grid")}>
      <div className={block("field")}>
        <label className={block("label")} htmlFor={`${idPrefix}-unit`}>
          {unitLabel}
        </label>
        <Select
          id={`${idPrefix}-unit`}
          className={block("select")}
          {...register(fields.unitId, {
            onChange: (event) => {
              const unit = units.find(
                (item) => String(item.id) === event.target.value,
              );

              setValue(fields.unitName, unit?.name ?? "");

              // Работник относился к прежнему отделу — выбор сбрасываем
              setValue(fields.employeeId, "");
              setValue(fields.fullName, "");
              setValue(fields.position, "");

              if (fields.employeeNumber) {
                setValue(fields.employeeNumber, "");
              }
            },
          })}
        >
          <option value="">{unitOptionalHint}</option>
          {unitOptions.map((unit) => (
            <option key={String(unit.id)} value={String(unit.id)}>
              {unit.name}
              {unit.conventionalSymbol ? ` (${unit.conventionalSymbol})` : ""}
            </option>
          ))}
        </Select>
        {isUnitsLoading && (
          <span className={block("hint")}>Загрузка подразделений...</span>
        )}
        {errorMessage(fields.unitId) && (
          <span className={block("error")}>{errorMessage(fields.unitId)}</span>
        )}
      </div>

      <div className={block("field")}>
        <label className={block("label")} htmlFor={`${idPrefix}-employee`}>
          {employeeLabel}
        </label>
        <Select
          id={`${idPrefix}-employee`}
          className={block("select")}
          {...register(fields.employeeId, {
            onChange: (event) => {
              const employee = unitEmployees.find(
                (item) => String(item.id) === event.target.value,
              );

              // Данные работника переносятся снимком: отдел и должность
              // берутся из штатного расписания, а не вводятся вручную
              setValue(fields.fullName, employeeFullName(employee));
              setValue(fields.position, employee?.position ?? "");

              if (fields.employeeNumber) {
                setValue(fields.employeeNumber, employee?.employeeNumber ?? "");
              }
            },
          })}
        >
          <option value="">— выберите работника —</option>
          {unitEmployees.map((employee) => (
            <option key={String(employee.id)} value={String(employee.id)}>
              {employeeFullName(employee)}
              {employee.employeeNumber
                ? ` (таб. ${employee.employeeNumber})`
                : ""}
            </option>
          ))}
        </Select>

        {!selectedUnitId && (
          <span className={block("hint")}>
            {unitOptional
              ? "Сначала выберите подразделение (если работник в нём состоит)"
              : "Сначала выберите подразделение"}
          </span>
        )}
        {Boolean(selectedUnitId) &&
          !isEmployeesLoading &&
          unitEmployees.length === 0 && (
            <span className={block("hint")}>
              В подразделении нет работников штатного расписания
            </span>
          )}
        {errorMessage(fields.employeeId) && (
          <span className={block("error")}>
            {errorMessage(fields.employeeId)}
          </span>
        )}
      </div>
    </div>
  );
}
