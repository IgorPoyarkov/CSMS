import type { Login } from "../../../services/Users/user.schema";
import type { ConfigurationButton } from "../../UI/CustomButton";
import type { ConfigurationInput } from "../../UI/CustomInput";

export const loginFormFields: ConfigurationInput<Login>[] = [
  {
    label: { value: "Email" },
    input: {
      name: "email",
      type: "email",
      placeholder: "email",
      defaultValue: "",
    },
  },
  {
    label: { value: "Ваш пароль" },
    input: {
      name: "password",
      type: "password",
      placeholder: "пароль",
    },
  },
];

export const loginFormButtons: ConfigurationButton[] = [
  {
    button: {
      name: "",
      type: "submit",
      value: "Вход",
      modifier: ["main"],
    },
  },
  {
    button: {
      name: "",
      type: "button",
      value: "Зарегистрироваться",
      modifier: ["arrow"],
    },
  },
];

