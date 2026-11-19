import type { ComponentPropsWithRef, ReactNode } from "react";
import useUtils from "../../hooks/useUtils";
import styles from "./ChoiceControl.module.scss";

export interface CustomRadioProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type"
> {
  /** Текст рядом с радиокнопкой */
  label?: ReactNode;
  /** Пояснение под текстом */
  hint?: ReactNode;
  /** Класс обёртки-label */
  wrapperClassName?: string;
  /** Компактный вид для таблиц и фильтров */
  compact?: boolean;
}

/**
 * Кастомная радиокнопка. Как и CustomCheckbox, прокид��вает `ref` и нативные
 * пропсы на input, поэтому совместима с `register()` из react-hook-form.
 */
export default function CustomRadio({
  label,
  hint,
  wrapperClassName,
  compact = false,
  className,
  disabled,
  ...rest
}: CustomRadioProps) {
  const { bem } = useUtils();
  const block = bem(styles, "choice");
  const mods = [
    "radio",
    ...(compact ? ["compact"] : []),
    ...(disabled ? ["disabled"] : []),
  ];

  return (
    <label
      className={`${block("", mods)}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
    >
      <input
        type="radio"
        className={`${block("input")}${className ? ` ${className}` : ""}`}
        disabled={disabled}
        {...rest}
      />
      <span className={block("box")} aria-hidden="true" />
      {(label || hint) && (
        <span className={block("text")}>
          {label && <span className={block("label")}>{label}</span>}
          {hint && <span className={block("hint")}>{hint}</span>}
        </span>
      )}
    </label>
  );
}
