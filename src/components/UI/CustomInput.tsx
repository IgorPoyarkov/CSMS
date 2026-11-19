import {
  get,
  useFormContext,
  type FieldError,
  type FieldValues,
  type Path,
} from "react-hook-form";
import styles from "./CustomInput.module.scss";
import useUtils from "../../hooks/useUtils";

export interface ConfigurationInput<T extends FieldValues> {
  label?: {
    value?: string;
  };
  input: {
    type?: string;
    name: Path<T>;
    placeholder?: string;
    defaultValue?: any;
    step?: string | number;
  };
}

interface CustomInputProps<T extends FieldValues> {
  configuration: ConfigurationInput<T>;
  prefixPath?: string;
}

export function CustomInput<T extends FieldValues>({
  configuration: {
    label: { value: labelValue = "" } = {},
    input: {
      type = "text",
      name,
      placeholder = "",
      defaultValue = "",
      step,
    },
  },
  prefixPath,
}: CustomInputProps<T>) {
  const { bem } = useUtils();
  const block = bem(styles, "custom-input");

  const {
    register,
    formState: { errors },
  } = useFormContext();

  const fullPath = prefixPath ? `${prefixPath}.${name}` : name;
  const error = get(errors, fullPath) as FieldError | undefined;
  const errorMessage = error?.message;

  const registerOptions = type === "number" ? { valueAsNumber: true } : undefined;
  const resolvedStep = step ?? (type === "number" ? "any" : undefined);

  return (
    <div className={block()}>
      {labelValue && <label className={block("label")}>{labelValue}</label>}
      <input
        className={block("input")}
        type={type}
        step={resolvedStep}
        placeholder={placeholder}
        defaultValue={defaultValue}
        {...register(fullPath, registerOptions)}
      />
      {errorMessage && <span className={block("error")}>{errorMessage}</span>}
    </div>
  );
}

export default CustomInput;
