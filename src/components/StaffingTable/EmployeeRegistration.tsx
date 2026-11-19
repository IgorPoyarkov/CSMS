import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import {
  BaseEmployeeSchema,
  type BaseEmployee,
} from "../../services/StaffingTable/StaffingTable.schema";
import { useCreateEmployee } from "../../services/StaffingTable/StaffingTable.api";
import React from "react";
import CustomInput from "../UI/CustomInput";
import {
  employmentFields,
  personalFields,
} from "./employeeRegistration.config";

export default function EmployeeRegistration() {
  const { mutate, isPending } = useCreateEmployee();

  // CustomInput получает register через useFormContext, поэтому форма отдаётся
  // провайдером, а не пропсом
  const methods = useForm<BaseEmployee>({
    resolver: zodResolver(BaseEmployeeSchema),
    mode: "onSubmit",
  });

  const { reset, handleSubmit } = methods;

  function onSubmit(formData: BaseEmployee) {
    mutate(formData, { onSuccess: () => reset() });
  }

  return (
    <div className="employee-registration">
      <FormProvider {...methods}>
        <form
          className="employee-registration__form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <fieldset className="employee-registration__section">
            <legend>Персональные данные</legend>
            <ul className="employee-registration__list">
              {personalFields.map((field) => (
                <React.Fragment key={field.input.name}>
                  <li className="employee-registration__item">
                    <CustomInput configuration={field} prefixPath="employee" />
                  </li>
                </React.Fragment>
              ))}
            </ul>
          </fieldset>

          <fieldset className="employee-registration__section">
            <legend>Данные сотрудника</legend>
            <ul className="employee-registration__list">
              {employmentFields.map((field) => (
                <React.Fragment key={field.input.name}>
                  <li className="employee-registration__item">
                    <CustomInput configuration={field} />
                  </li>
                </React.Fragment>
              ))}
            </ul>
          </fieldset>

          <button
            className="employee-registration__btn btn"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Сохранение..." : "Сохранить сотрудника"}
          </button>
        </form>
      </FormProvider>
    </div>
  );
}
