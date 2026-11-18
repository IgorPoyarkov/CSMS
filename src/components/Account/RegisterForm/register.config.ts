import type { RegisterForm } from "../../../services/Users/user.schema";
import type { ConfigurationButton } from "../../UI/CustomButton";
import type { ConfigurationInput } from "../../UI/CustomInput";

export const registerFormFields: ConfigurationInput<RegisterForm>[] = [
  {
    label: { value: "Пароль" },
    input: {
      name: "password",
      type: "password",
      placeholder: "не менее 6 символов",
      defaultValue: "",
    },
  },
  {
    label: { value: "Повторите пароль" },
    input: {
      name: "confirmPassword",
      type: "password",
      placeholder: "повторите пароль",
    },
  },
];

export const registerFormButtons: ConfigurationButton[] = [
  {
    button: {
      name: "",
      type: "submit",
      value: "Зарегистрироваться",
      modifier: ["main"],
    },
  },
  {
    button: {
      name: "",
      type: "button",
      value: "Войти",
    },
  },
];
