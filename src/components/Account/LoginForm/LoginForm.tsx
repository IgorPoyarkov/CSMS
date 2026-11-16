import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../../../services/Users/user.api";
import { LoginSchema, type Login } from "../../../services/Users/user.schema";
import useUtils from "../../../hooks/useUtils";
import CustomButton from "../../UI/CustomButton";
import CustomInput from "../../UI/CustomInput";
import { loginFormButtons, loginFormFields } from "./loginForm.config";
import styles from "./LoginForm.module.scss";

interface LoginFormProps {}

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

  return (
    <div className={block()}>
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
        </form>
      </FormProvider>
    </div>
  );
};

export default LoginForm;
