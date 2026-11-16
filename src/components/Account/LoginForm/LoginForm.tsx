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

interface LoginFormProps {}

type LoginMode = "email" | "eds";

const LoginForm = ({}: LoginFormProps) => {
  const { isPending, mutate } = useLogin();
  const navigate = useNavigate();
  const { bem } = useUtils();
  const block = bem(styles, "login-form");

  const methods = useForm({
    resolver: zodResolver(LoginSchema),
    mode: "onSubmit",
  });

  const { handleSubmit, reset } = methods;

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

  const [mode, setMode] = useState<LoginMode>("email");

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
            ></button>

            <ul className={block("list")}>
              {loginFormFields.map((field) => (
                <li className={block("item")} key={field.input.name}>
                  <CustomInput configuration={field} />
                </li>
              ))}
            </ul>

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
