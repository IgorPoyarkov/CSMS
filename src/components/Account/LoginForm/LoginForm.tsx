import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../../../services/Users/user.api";
import { LoginSchema, type Login } from "../../../services/Users/user.schema";
import useUtils from "../../../hooks/useUtils";
import CustomButton from "../../UI/CustomButton";
import CustomInput from "../../UI/CustomInput";
import { loginFormButtons, loginFormFields } from "./loginForm.config";
import EdsLoginForm from "../../Eds/EdsLoginForm";
import styles from "./LoginForm.module.scss";

/**
 * Вход в личный кабинет заказчика.
 *
 * Оболочка прежняя: компактная карточка с «неоновой» анимацией и крестиком
 * в углу. Поля и кнопки — общие компоненты приложения (CustomInput и
 * CustomButton), форма входа по ЭЦП — существующий EdsLoginForm.
 */

type LoginMode = "email" | "eds";

const LoginForm = () => {
  const { isPending, mutate } = useLogin();
  const navigate = useNavigate();
  const { bem } = useUtils();
  const block = bem(styles, "login-form");

  const methods = useForm({
    resolver: zodResolver(LoginSchema),
    mode: "onSubmit",
  });

  const { handleSubmit, reset } = methods;
  const [mode, setMode] = useState<LoginMode>("email");

  const onSubmit = (formData: Login) => {
    mutate(formData, {
      onSuccess: () => {
        localStorage.setItem("user_email", formData.email || "");
        methods.reset();
        navigate("/");
      },
    });
  };

  const handleEdsLoggedIn = () => {
    // После успешного входа по ЭЦП — redirect на главную (настройку
    // localStorage берёт на себя useEdsLogin)
    methods.reset();
    navigate("/");
  };

  const handleEdsClosed = () => {
    // Закрытие без входа — возврат к форме email/пароль
    methods.reset();
    setMode("email");
  };

  return (
    <div className={block()}>
      {mode === "eds" ? (
        <EdsLoginForm
          onLoggedIn={handleEdsLoggedIn}
          onClose={handleEdsClosed}
        />
      ) : (
        <FormProvider {...methods}>
          <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
            <h2 className={block("title")}>Авторизация</h2>
            <button
              className={`${block("close")} btn`}
              type="button"
              onClick={() => navigate("/")}
              aria-label="Закрыть"
            ></button>

            <ul className={block("list")}>
              {loginFormFields.map((field) => (
                <li className={block("item")} key={field.input.name}>
                  <CustomInput configuration={field} />
                </li>
              ))}
            </ul>

            <div className={block("actions")}>
              <CustomButton
                configuration={{
                  ...loginFormButtons[0],
                  button: {
                    ...loginFormButtons[0].button,
                    disabled: isPending,
                  },
                }}
              />
              <CustomButton
                configuration={loginFormButtons[1]}
                onClick={() => {
                  navigate("/account/register");
                  reset();
                }}
              />
            </div>

            <div className={block("switch")}>
              <button
                type="button"
                className={block("switch-btn")}
                onClick={() => {
                  setMode("eds");
                  reset();
                }}
              >
                Войти по ЭЦП
              </button>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
};

export default LoginForm;
