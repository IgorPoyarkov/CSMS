import { useNavigate } from "react-router-dom";
import {
  useFetchEmployeeById,
  useFetchEmployees,
} from "../../../services/StaffingTable/StaffingTable.api";
import { useMemo, useState } from "react";
import CustomSelect from "../../UI/CustomSelect";
import { registerFormButtons, registerFormFields } from "./register.config";
import CustomInput from "../../UI/CustomInput";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RegisterFormSchema,
  type Register,
  type RegisterForm,
} from "../../../services/Users/user.schema";
import CustomButton from "../../UI/CustomButton";
import { useRegister } from "../../../services/Users/user.api";
import useUtils from "../../../hooks/useUtils";
import styles from "./RegisterForm.module.scss";

/**
 * Регистрация в личном кабинете заказчика.
 *
 * Учётная запись привязывается к сотруднику штатного расписания: email берётся
 * из карточки сотрудника, пароль задаёт сам пользователь. Оболочка — как
 * у входа: компактная карточка с неоновой анимацией и крестиком, поля и
 * кнопки — общие компоненты приложения.
 *
 * Список сотрудников длинный, поэтому поиск встроен в сам селект: он
 * сокращает выдачу по фамилии, имени или табельному номеру, и не нужно
 * прокручивать весь штат.
 */

export default function RegisterForm() {
  const navigate = useNavigate();
  const { fullName, bem } = useUtils();
  const block = bem(styles, "register-form");
  const { data: employees } = useFetchEmployees();
  const [currentEmployee, setCurrentEmployee] = useState<string | number>("");
  const [formError, setFormError] = useState<string | null>(null);
  const { data: employee } = useFetchEmployeeById(currentEmployee);

  function handleSelectEmployee(id: string | number) {
    setCurrentEmployee(id);
    setFormError(null);
  }

  // Однофамильцев различаем табельным номером
  const nameCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    employees?.forEach((empl) => {
      const fullNameKey = fullName(empl.employee || {}).toLowerCase();

      if (fullNameKey) {
        counts[fullNameKey] = (counts[fullNameKey] || 0) + 1;
      }
    });

    return counts;
  }, [employees, fullName]);

  const employeeLabel = (empl: NonNullable<typeof employees>[number]): string => {
    const fullNameRaw = fullName(empl.employee || {});
    const hasDuplicates = nameCounts[fullNameRaw.toLowerCase()] > 1;

    if (hasDuplicates && empl.employeeNumber) {
      return `${fullNameRaw} (ТН: ${empl.employeeNumber})`;
    }

    return fullNameRaw;
  };

  const methods = useForm({
    resolver: zodResolver(RegisterFormSchema),
    mode: "onSubmit",
  });

  const { handleSubmit, reset } = methods;

  const { mutate, isPending, error, isError } = useRegister();
  const onSubmit = (formData: RegisterForm) => {
    setFormError(null);

    if (!employee?.email) {
      setFormError(
        "Сначала выберите сотрудника из списка — регистрация идёт по его email.",
      );
      return;
    }

    const currentUser: Register = {
      email: employee.email,
      password: formData.password,
    };

    mutate(currentUser, {
      onSuccess: () => {
        reset();
        navigate("/account/login");
      },
    });
  };

  return (
    <div className={block()}>
      <h2 className={block("title")}>Регистрация</h2>
      <button
        className={`${block("close")} btn`}
        type="button"
        onClick={() => navigate("/account/login")}
        aria-label="Закрыть"
      ></button>

      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          <div className={block("field")}>
            <span className={block("label")}>Сотрудник</span>
            <CustomSelect
              listData={employees || []}
              selectedValue={currentEmployee}
              placeholder="Найдите себя в списке…"
              searchable
              searchPlaceholder="Фамилия, имя или табельный номер"
              getKey={(empl, index) => empl.id ?? index}
              getLabel={employeeLabel}
              getSearchText={(empl) =>
                `${fullName(empl.employee || {})} ${empl.employeeNumber ?? ""}`
              }
              renderItem={employeeLabel}
              onClick={handleSelectEmployee}
            />
          </div>

          {employee && (
            <p className={block("email")}>
              Ваш email:{" "}
              <strong>{employee.email || "не указан в карточке"}</strong>
            </p>
          )}

          {registerFormFields.map((field) => (
            <CustomInput configuration={field} key={field.input.name} />
          ))}

          {formError && (
            <div className={block("error")} role="alert">
              {formError}
            </div>
          )}

          {isError && (
            <div className={block("error")} role="alert">
              {String(error)}
            </div>
          )}

          <div className={block("actions")}>
            <CustomButton
              configuration={{
                ...registerFormButtons[0],
                button: {
                  ...registerFormButtons[0].button,
                  disabled: isPending,
                },
              }}
            />
            <CustomButton
              configuration={registerFormButtons[1]}
              onClick={() => {
                navigate("/account/login");
                reset();
              }}
            />
          </div>

          <div className={block("switch")}>
            <button
              type="button"
              className={block("switch-btn")}
              onClick={() => {
                navigate("/account/login");
                reset();
              }}
            >
              Уже есть аккаунт? Войти
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
