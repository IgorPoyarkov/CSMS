import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import useUtils from "../../hooks/useUtils";
import styles from "./Select.module.scss";

/**
 * Выпадающий список, заменяющий нативный `<select>`.
 *
 * Зачем: в нативном `<select>` браузер рисует выпадающий список сам, и в
 * тёмной теме он остаётся белым со светлыми буквами. Здесь список рисуется
 * приложением на переменных текущей темы.
 *
 * API намеренно повторяет нативный select: `value`, `defaultValue`,
 * `onChange`, `name`, `disabled`, `children` из `<option>`, поэтому
 * `{...register("field")}` из react-hook-form работает без переписывания
 * форм. Для RHF внутри остаётся настоящий (скрытый) `<select>`: он получает
 * ref, name, value и change-событие, а видимый список лишь управляет им.
 */
export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  | "value"
  | "defaultValue"
  | "onChange"
  | "onBlur"
  | "children"
  | "size"
  | "multiple"
> {
  children?: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (event: FocusEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}

interface SelectOption {
  value: string;
  label: ReactNode;
  text: string;
  disabled: boolean;
  group?: string;
}

const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }

  return "";
};

/**
 * Разбирает `<option>` и `<optgroup>` из children в плоский список.
 * Подписи сохраняются как ReactNode — в списке можно показывать разметку.
 */
const collectOptions = (children: ReactNode): SelectOption[] => {
  const options: SelectOption[] = [];

  const pushOption = (
    element: ReactElement<{
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    }>,
    group?: string,
  ) => {
    const label = element.props.children;
    const value =
      element.props.value !== undefined
        ? String(element.props.value)
        : textOf(label);

    options.push({
      value,
      label,
      text: textOf(label),
      disabled: Boolean(element.props.disabled),
      group,
    });
  };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === "optgroup") {
      const groupElement = child as ReactElement<{
        label?: string;
        children?: ReactNode;
      }>;

      Children.forEach(groupElement.props.children, (nested) => {
        if (!isValidElement(nested) || nested.type !== "option") return;
        pushOption(
          nested as ReactElement<{
            value?: string | number;
            disabled?: boolean;
            children?: ReactNode;
          }>,
          groupElement.props.label,
        );
      });

      return;
    }

    if (child.type === "option") {
      pushOption(
        child as ReactElement<{
          value?: string | number;
          disabled?: boolean;
          children?: ReactNode;
        }>,
      );
    }
  });

  return options;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    children,
    value,
    defaultValue,
    onChange,
    onBlur,
    name,
    id,
    className,
    style,
    disabled,
    placeholder,
    ...rest
  },
  forwardedRef,
) {
  const { bem } = useUtils();
  const select = bem(styles, "select");
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => collectOptions(children), [children]);
  const isControlled = value !== undefined;

  const firstEnabledIndex = () =>
    options.findIndex((option) => !option.disabled);

  const [innerValue, setInnerValue] = useState<string>(() => {
    if (defaultValue !== undefined) return String(defaultValue);

    const firstEnabled = options.find((option) => !option.disabled);

    return firstEnabled?.value ?? "";
  });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  } | null>(null);

  // reset() из react-hook-form меняет value настоящего select, минуя наш
  // onChange. Читаем DOM-значение при рендере: родитель после reset
  // перерисовывается, и подпись сразу показывает новое значение.
  const domValue = isControlled ? undefined : nativeRef.current?.value;
  const currentValue =
    !isControlled && domValue !== undefined && domValue !== innerValue
      ? domValue
      : isControlled
        ? String(value)
        : innerValue;
  const currentIndex = options.findIndex(
    (option) => option.value === currentValue,
  );
  const selectedOption = currentIndex >= 0 ? options[currentIndex] : undefined;

  // react-hook-form получает настоящий select: reset() выставляет ему value,
  // а эффект ниже подхватывает это значение в видимую подпись.
  useImperativeHandle(
    forwardedRef,
    () => nativeRef.current as HTMLSelectElement,
    [],
  );

  const emitChange = (nextValue: string): ChangeEvent<HTMLSelectElement> => {
    const target = {
      name: name ?? "",
      value: nextValue,
      type: "select-one",
      selectedIndex: options.findIndex((option) => option.value === nextValue),
      options: nativeRef.current?.options,
    } as unknown as HTMLSelectElement;

    return {
      target,
      currentTarget: target,
      nativeEvent: { target } as unknown as Event,
      type: "change",
      bubbles: true,
      cancelable: false,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: true,
      timeStamp: Date.now(),
      preventDefault: () => undefined,
      isDefaultPrevented: () => false,
      stopPropagation: () => undefined,
      isPropagationStopped: () => false,
      persist: () => undefined,
    } as unknown as ChangeEvent<HTMLSelectElement>;
  };

  const commit = (nextValue: string) => {
    if (!isControlled) {
      setInnerValue(nextValue);
    }

    if (nativeRef.current) {
      nativeRef.current.value = nextValue;
    }

    onChange?.(emitChange(nextValue));
  };

  const updatePosition = () => {
    const trigger = triggerRef.current;

    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      120,
      Math.min(320, openUp ? spaceAbove : spaceBelow),
    );

    setPosition({
      left: rect.left,
      width: rect.width,
      maxHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;

      setOpen(false);
      setActiveIndex(-1);
    };

    document.addEventListener("mousedown", handleOutside);

    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;

    const node = dropdownRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );

    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const openList = () => {
    if (disabled) return;

    setOpen(true);
    setActiveIndex(currentIndex >= 0 ? currentIndex : firstEnabledIndex());
  };

  const closeList = (refocus = true) => {
    setOpen(false);
    setActiveIndex(-1);

    if (refocus) {
      triggerRef.current?.focus();
    }
  };

  const moveActive = (delta: number) => {
    if (options.length === 0) return;

    let next = activeIndex;

    for (let step = 0; step < options.length; step += 1) {
      next = (next + delta + options.length) % options.length;

      if (!options[next].disabled) {
        setActiveIndex(next);
        return;
      }
    }
  };

  const typeahead = useRef({ query: "", timer: 0 });

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (open) moveActive(1);
        else openList();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open) moveActive(-1);
        else openList();
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(firstEnabledIndex());
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();

          for (let index = options.length - 1; index >= 0; index -= 1) {
            if (!options[index].disabled) {
              setActiveIndex(index);
              break;
            }
          }
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();

        if (!open) {
          openList();
        } else if (
          activeIndex >= 0 &&
          options[activeIndex] &&
          !options[activeIndex].disabled
        ) {
          commit(options[activeIndex].value);
          closeList();
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          closeList();
        }
        break;
      case "Tab":
        if (open) closeList(false);
        break;
      default: {
        // Печатные символы — поиск по началу подписи, как в нативном select.
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          const state = typeahead.current;
          state.query += event.key.toLowerCase();
          window.clearTimeout(state.timer);
          state.timer = window.setTimeout(() => {
            state.query = "";
          }, 600);

          const found = options.findIndex(
            (option) =>
              !option.disabled &&
              option.text.toLowerCase().startsWith(state.query),
          );

          if (found >= 0) {
            if (open) {
              setActiveIndex(found);
            } else {
              commit(options[found].value);
            }
          }
        }
      }
    }
  };

  const wrapperClassName = select();
  const triggerClassName = [select("trigger"), className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={wrapperClassName}>
      {/* Настоящий select для react-hook-form и нативной валидации формы */}
      <select
        {...rest}
        ref={nativeRef}
        name={name}
        id={id ? `${id}-native` : undefined}
        className={select("native")}
        value={isControlled ? String(value) : undefined}
        defaultValue={isControlled ? undefined : innerValue}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      >
        {children}
      </select>

      <button
        ref={triggerRef}
        type="button"
        id={id}
        // Маркер для глобальных тем: правила, написанные для `select`,
        // должны применяться к видимой кнопке, а не к скрытому нативному select.
        data-csms-select=""
        className={triggerClassName}
        style={style as CSSProperties}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        aria-label={rest["aria-label"]}
        aria-labelledby={rest["aria-labelledby"]}
        aria-describedby={rest["aria-describedby"]}
        aria-invalid={rest["aria-invalid"]}
        aria-required={rest["aria-required"]}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (open) closeList(false);
        }}
      >
        <span
          className={select("value", !selectedOption ? ["placeholder"] : [])}
        >
          {selectedOption ? selectedOption.label : (placeholder ?? "")}
        </span>
        <span className={select("arrow")} aria-hidden="true">
          ▾
        </span>
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            id={listId}
            role="listbox"
            className={select("dropdown")}
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              ...(position.top !== undefined
                ? { top: position.top }
                : { bottom: position.bottom }),
            }}
          >
            {options.length === 0 && (
              <div className={select("empty")}>Нет вариантов</div>
            )}

            {options.map((option, index) => {
              const showGroup =
                option.group !== undefined &&
                options[index - 1]?.group !== option.group;

              return (
                <div key={`${option.value}-${index}`}>
                  {showGroup && (
                    <div className={select("group")}>{option.group}</div>
                  )}
                  <div
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={option.value === currentValue}
                    aria-disabled={option.disabled}
                    data-index={index}
                    className={select("option", [
                      index === activeIndex ? "active" : "",
                      option.value === currentValue ? "selected" : "",
                      option.disabled ? "disabled" : "",
                    ])}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => {
                      if (!option.disabled) setActiveIndex(index);
                    }}
                    onClick={() => {
                      if (option.disabled) return;

                      commit(option.value);
                      closeList();
                    }}
                  >
                    <span className={select("option-text")}>
                      {option.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </span>
  );
});

export default Select;
