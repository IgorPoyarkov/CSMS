import { useState } from "react";

/**
 * Денежное поле с разбивкой разрядов и двумя знаками после запятой.
 *
 * В форме хранится число, а показывается сумма в русском формате
 * (1 234 567,89). Пока поле в фокусе, пользователь видит введённый текст;
 * после потери фокуса значение приводится к формату с разбивкой.
 * Разделители разрядов и запятая при разборе игнорируются.
 */

interface MoneyInputProps {
  value?: number | string | null;
  onChange?: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  ariaLabel?: string;
  id?: string;
  name?: string;
}

const parseMoney = (raw: string): number => {
  const cleaned = raw.replace(/\s|\u00A0/g, "").replace(/,/g, ".");
  const digits = cleaned.replace(/[^\d.]/g, "");
  const [integerPart = "", ...rest] = digits.split(".");
  const fraction = rest.join("").slice(0, 2);
  const normalized = fraction ? `${integerPart}.${fraction}` : integerPart;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value?: number | string | null): string => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = Number(
    String(value)
      .replace(/\s|\u00A0/g, "")
      .replace(",", "."),
  );

  if (!Number.isFinite(parsed)) {
    return "";
  }

  return parsed.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const MoneyInput = ({
  value,
  onChange,
  className,
  placeholder = "0,00",
  disabled,
  readOnly,
  ariaLabel,
  id,
  name,
}: MoneyInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      className={className}
      value={isFocused ? draft : formatMoney(value)}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      aria-label={ariaLabel}
      onFocus={(event) => {
        setIsFocused(true);
        setDraft(formatMoney(value));
        event.currentTarget.select();
      }}
      onBlur={() => {
        setIsFocused(false);
        setDraft("");
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        onChange?.(parseMoney(next));
      }}
    />
  );
};

export default MoneyInput;
