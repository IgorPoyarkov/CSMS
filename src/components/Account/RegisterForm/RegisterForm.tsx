import { useNavigate } from "react-router-dom";
import {
  useFetchEmployeeById,
  useFetchEmployees,
} from "../../../services/StaffingTable/StaffingTable.api";
import { useMemo, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
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
 * из карточки сотрудника, пароль задаёт сам пользователь. Оформление — как
 * у остальных модальных окон системы (карточка modal-frame, шапка, тело, футер).
 */

export default function RegisterForm() {
  const navigate = useNavigate();
  const { fullName, bem } = useUtils();
  const block = bem(styles, "register-form");
  const { data: employees } = useFetchEmployees();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [modif, setModif] = useState<string[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<string | number>("");
  const [formError, setFormError] = useState<string | null>(null);
  const { data: employee } = useFetchEmployeeById(currentEmployee);

  function changeSearch(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchQuery(value);

    if (value) {
      setModif((prev) => (prev.includes("open") ? prev : [...prev, "open"]));
    } else {
      setModif((prev) => prev.filter((m) => m !== "open"));
    }
  }

  function handleSelectEmployee(id: string | number) {
    setCurrentEmployee(id);
    setFormError(null);
  }

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

  const filteredEmployees = employees?.filter((empl) => {
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase();
    const name = empl.employee?.name?.toLowerCase() || "";
    const surname = empl.employee?.surname?.toLowerCase() || "";
    const patronymic = empl.employee?.patronymic?.toLowerCase() || "";
    const searchData = `${surname} ${name} ${patronymic}`;

    return searchData.includes(searchLower);
  });

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
    <div className={block("window")}>
      <header className={block("head")}>
        <div>
          <h2 className={block("title")}>Регистрация</h2>
          <p className={block("subtitle")}>
            Найдите себя в штатном расписании заказчика
          </p>
        </div>
        <button
          type="button"
          className={block("close")}
          onClick={() => navigate("/account/login")}
          aria-label="Закрыть"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className={block("body")}>
        <div className={block("field")}>
          <label className={block("label")} htmlFor="register-search">
            Сотрудник
          </label>
          <input
            id="register-search"
            className={block("search")}
            type="search"
            placeholder="Начните вводить фамилию…"
            value={searchQuery}
            onChange={changeSearch}
          />
          <CustomSelect
            listData={filteredEmployees || []}
            getKey={(empl, index) => empl.id || index}
            renderItem={(empl) => {
              const fullNameRaw = fullName(empl.employee || {});
              const hasDuplicates = nameCounts[fullNameRaw.toLowerCase()] > 1;

              if (hasDuplicates && empl.employeeNumber) {
                return `${fullNameRaw} (ТН: ${empl.employeeNumber})`;
              }

              return fullNameRaw;
            }}
            modifier={modif}
            onClick={handleSelectEmployee}
          />
        </div>

        {employee && (
          <p className={block("email")}>
            Ваш email: <strong>{employee.email || "не указан в карточке"}</strong>
          </p>
        )}

        <FormProvider {...methods}>
          <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
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
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
