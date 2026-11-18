import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
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
 * Оформление повторяет остальные модальные окна системы: карточка с рамкой
 * modal-frame, шапка с заголовком и подзаголовком, тело с полями и футер
 * с действиями. Раньше форма была отдельной «неоновой» карточкой с собственной
 * анимацией и крестиком, из-за чего выбивалась из общего интерфейса.
 */

type LoginMode = "email" | "eds";

const LoginForm = () => {
  const { isPending, mutate, error, isError } = useLogin();
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
    <div className={block("window")}>
      <header className={block("head")}>
        <div>
          <h2 className={block("title")}>
            {mode === "eds" ? "Вход по электронной подписи" : "Вход в систему"}
          </h2>
          <p className={block("subtitle")}>
            {mode === "eds"
              ? "Выберите сертификат заказчика на рабочем месте"
              : "Личный кабинет заказчика по 44-ФЗ"}
          </p>
        </div>
        <button
          type="button"
          className={block("close")}
          onClick={() => navigate("/")}
          aria-label="Закрыть"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className={block("body")}>
        {mode === "eds" ? (
          <EdsLoginForm
            onLoggedIn={handleEdsLoggedIn}
            onClose={handleEdsClosed}
          />
        ) : (
          <FormProvider {...methods}>
            <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
              <ul className={block("list")}>
                {loginFormFields.map((field) => (
                  <li className={block("item")} key={field.input.name}>
                    <CustomInput configuration={field} />
                  </li>
                ))}
              </ul>

              {isError && (
                <div className={block("error")} role="alert">
                  {String(error)}
                </div>
              )}

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
    </div>
  );
};

export default LoginForm;
