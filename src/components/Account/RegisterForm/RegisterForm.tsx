import { useNavigate } from "react-router-dom";
import {
  useFetchEmployeeById,
  useFetchEmployees,
} from "../../../services/StaffingTable/StaffingTable.api";
import { useMemo, useState, type ChangeEvent } from "react";
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

interface Props {}

export default function RegisterForm({}: Props) {
  const navigate = useNavigate();
  const { fullName, bem } = useUtils();
  const block = bem(styles, "register-form");
  const { data: employees } = useFetchEmployees();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [modif, setModif] = useState<string[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<string | number>("");
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
  }, [employees]);

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

  const { mutate, isPending } = useRegister();
  const onSubmit = (formData: RegisterForm) => {
    if (!employee?.email) {
      alert("Пожалуйста, сначала выберите сотрудника из списка!");
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
      <h2 className={block("title")}>Форма регистрации</h2>
      <input
        className={block("search")}
        type="search"
        placeholder="Найди себя..."
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

      {employee && <p className={block("text")}>Ваш email: {employee.email}</p>}
      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          {registerFormFields.map((field) => (
            <CustomInput configuration={field} key={field.input.name} />
          ))}

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
              {
                navigate("/account/register");
                reset();
              }
            }}
          />
        </form>
      </FormProvider>
    </div>
  );
}
