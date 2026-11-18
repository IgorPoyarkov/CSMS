import { useEffect, useMemo, useRef, useState } from "react";
import useUtils from "../../../hooks/useUtils";
import {
  findOkeiByValue,
  searchOkei,
  useOkeiDictionary,
} from "../../../services/OkeiRef/okeiRef.api";
import type { OkeiUnit } from "../../../services/OkeiRef/okeiRef.schema";
import styles from "./OkeiSelect.module.scss";

interface OkeiSelectProps {
  /** Текущее строковое значение единицы измерения */
  value?: string;
  /** Возвращает выбранное/введённое значение и найденную запись ОКЕИ (если есть) */
  onChange: (value: string, item?: OkeiUnit | null) => void;
  /** Что подставлять в поле при выборе позиции из ОКЕИ: краткое обозначение (шт) или наименование (Штука) */
  valueMode?: "symbol" | "name";
  /** Компактный режим для таблиц и плотных строк характеристик */
  compact?: boolean;
  /** Показывать ли под полем распознанный код ОКЕИ */
  showCodeHint?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Выпадающий справочник единиц измерения по ОКЕИ с поиском по коду,
 * условному обозначению, наименованию и синонимам (данные из публичного API /api/okei).
 */
export default function OkeiSelect({
  value = "",
  onChange,
  valueMode = "symbol",
  compact = false,
  showCodeHint = false,
  placeholder = "шт, кг, м (ОКЕИ)…",
  disabled = false,
  id,
}: OkeiSelectProps) {
  const { bem } = useUtils();
  const block = bem(styles, "okei-select");
  const { data: dictionary = [], isLoading, isError } = useOkeiDictionary();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const matchedUnit = useMemo(
    () => findOkeiByValue(dictionary, value),
    [dictionary, value],
  );

  const items = useMemo(
    () => searchOkei(dictionary, query),
    [dictionary, query],
  );

  const canUseTypedValue =
    isOpen &&
    query.trim().length >= 1 &&
    !items.some(
      (item) =>
        item.symbolRu.toLowerCase() === query.trim().toLowerCase() ||
        item.name.toLowerCase() === query.trim().toLowerCase(),
    );

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Удержание подсвеченной строки в видимой области списка
  useEffect(() => {
    const list = listRef.current;
    const active = list?.children[highlighted] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setQuery("");
    setHighlighted(0);
  };

  const pick = (item: OkeiUnit) => {
    const nextValue =
      valueMode === "name" ? item.name : item.symbolRu || item.name;
    onChange(nextValue, item);
    setIsOpen(false);
    setQuery("");
  };

  const applyTypedValue = () => {
    const typed = query.trim();
    if (!typed) return;
    onChange(typed, findOkeiByValue(dictionary, typed) ?? null);
    setIsOpen(false);
    setQuery("");
  };

  const typedIndex = items.length;
  const optionCount = items.length + (canUseTypedValue ? 1 : 0);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      setHighlighted((cur) => (optionCount === 0 ? 0 : (cur + 1) % optionCount));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((cur) =>
        optionCount === 0 ? 0 : (cur - 1 + optionCount) % optionCount,
      );
    } else if (event.key === "Enter") {
      if (!isOpen) return;
      event.preventDefault();
      if (highlighted === typedIndex && canUseTypedValue) {
        applyTypedValue();
      } else if (items[highlighted]) {
        pick(items[highlighted]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  };

  const modifiers: string[] = [];
  if (isOpen) modifiers.push("open");
  if (compact) modifiers.push("compact");

  return (
    <div ref={wrapperRef} className={block("", modifiers)}>
      <div className={block("wrapper")}>
        <input
          id={id}
          className={block("input")}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          title={
            matchedUnit
              ? `ОКЕИ ${matchedUnit.code} — ${matchedUnit.name}${matchedUnit.symbolRu ? ` (${matchedUnit.symbolRu})` : ""}`
              : value || placeholder
          }
          value={isOpen ? query : value}
          onFocus={open}
          onClick={open}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
            if (!isOpen) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />
        <span className={block("arrow")}>▼</span>
      </div>

      {showCodeHint && matchedUnit && (
        <span className={block("hint")}>
          ОКЕИ {matchedUnit.code} — {matchedUnit.name}
          {matchedUnit.symbolRu ? ` (${matchedUnit.symbolRu})` : ""}
        </span>
      )}

      {isOpen && (
        <ul ref={listRef} className={block("list")} role="listbox">
          {isLoading && (
            <li className={block("item")}>Загрузка справочника ОКЕИ…</li>
          )}

          {!isLoading && isError && items.length === 0 && !canUseTypedValue && (
            <li className={block("item")}>
              Публичный API ОКЕИ временно недоступен — введите единицу вручную
            </li>
          )}

          {!isLoading && !isError && items.length === 0 && !canUseTypedValue && (
            <li className={block("item")}>
              {query
                ? `Единиц по запросу «${query}» не найдено`
                : "Справочник ОКЕИ пуст"}
            </li>
          )}

          {!isLoading &&
            items.map((item, index) => (
              <li
                key={item.code}
                role="option"
                aria-selected={index === highlighted}
                className={block(
                  "item",
                  index === highlighted ? ["active"] : [],
                )}
                title={`ОКЕИ ${item.code} — ${item.name}${item.group ? ` (${item.group})` : ""}`}
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(item);
                }}
              >
                <span className={block("code")}>{item.code}</span>
                <span className={block("name")}>{item.name}</span>
                {item.symbolRu && (
                  <span className={block("symbol")}>{item.symbolRu}</span>
                )}
              </li>
            ))}

          {canUseTypedValue && (
            <li
              role="option"
              aria-selected={highlighted === typedIndex}
              className={block(
                "item",
                highlighted === typedIndex ? ["active"] : [],
              )}
              onMouseEnter={() => setHighlighted(typedIndex)}
              onMouseDown={(event) => {
                event.preventDefault();
                applyTypedValue();
              }}
            >
              <span className={block("name")}>
                Использовать «{query.trim()}» вручную
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
