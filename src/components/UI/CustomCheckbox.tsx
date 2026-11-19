import type { ComponentPropsWithRef, ReactNode } from "react";
import useUtils from "../../hooks/useUtils";
import styles from "./ChoiceControl.module.scss";

export interface CustomCheckboxProps extends Omit<
  ComponentPropsWithRef<"input">,
  "type"
> {
  /** Текст рядом с флажком */
  label?: ReactNode;
  /** Пояснение под текстом */
  hint?: ReactNode;
  /** Класс обёртки-label (например, для раскладки в grid) */
  wrapperClassName?: string;
  /** Компактный вид для таблиц и фильтров */
  compact?: boolean;
}

/**
 * Кастомный чекбокс.
 *
 * Прокидывает все нативные пропсы (включая `ref` из react-hook-form) на input,
 * поэтому используется так же, как обычный `<input type="checkbox">`:
 *
 *     <CustomCheckbox label="Текст" {...register("field")} />
 */
export default function CustomCheckbox({
  label,
  hint,
  wrapperClassName,
  compact = false,
  className,
  disabled,
  ...rest
}: CustomCheckboxProps) {
  const { bem } = useUtils();
  const block = bem(styles, "choice");
  const mods = [
    ...(compact ? ["compact"] : []),
    ...(disabled ? ["disabled"] : []),
  ];

  return (
    <label
      className={`${block("", mods)}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
    >
      <input
        type="checkbox"
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
