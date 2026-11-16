import { useEffect, useMemo, useRef, useState } from "react";
import useUtils from "../../../hooks/useUtils";
import {
  searchOkpd2,
  useOkpd2Dictionary,
} from "../../../services/Okpd2Ref/okpd2Ref.api";
import type { Okpd2Ref } from "../../../services/Okpd2Ref/okpd2Ref.schema";
import styles from "./Okpd2Select.module.scss";

interface Okpd2SelectProps {
  /** Выбранный код ОКПД2 (то, что хранится в записи) */
  code?: string;
  /** Выбранное наименование ОКПД2 */
  name?: string;
  /** Вызов при выборе позиции справочника; null — выбор сброшен */
  onSelect: (item: Okpd2Ref | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const formatMoney = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Выпадающий список ОКПД2 с поиском.
 *
 * Справочник большой, поэтому поле работает как combobox: в строке ввода
 * набирается код или фрагмент наименования, выдача фильтруется по мере ввода
 * (по коду и по наименованию одновременно). Выбор позиции отдаётся наружу,
 * чтобы родитель заполнил и код, и наименование одним действием.
 */
export default function Okpd2Select({
  code,
  name,
  onSelect,
  placeholder = "Код или наименование ОКПД2…",
  disabled = false,
  id,
}: Okpd2SelectProps) {
  const { bem } = useUtils();
  const block = bem(styles, "okpd2-select");
  const { data: dictionary, isLoading } = useOkpd2Dictionary();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Текст выбранной позиции, когда список закрыт
  const selectedLabel = code ? `${code}${name ? ` — ${name}` : ""}` : "";
  const items = useMemo(
    () => searchOkpd2(dictionary ?? [], query),
    [dictionary, query],
  );

  // Справочник пополняется выгрузкой из ЕИС и может не содержать нужного кода,
  // поэтому введённый вручную код оставляем доступным для выбора
  const canUseTypedCode =
    isOpen &&
    query.trim().length >= 2 &&
    !items.some((item) => item.code === query.trim());

  // Закрытие по клику вне компонента
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

  // Подсветка перемещается — держим её в видимой части списка
  useEffect(() => {
    const list = listRef.current;
    const active = list?.children[highlighted] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  function open() {
    if (disabled) {
      return;
    }

    setIsOpen(true);
    setQuery("");
    setHighlighted(0);
  }

  function pick(item: Okpd2Ref) {
    onSelect(item);
    setIsOpen(false);
    setQuery("");
  }

  // Строка «ввести код вручную» стоит в выдаче последней
  const typedCodeIndex = items.length;
  const optionCount = items.length + (canUseTypedCode ? 1 : 0);

  function applyTypedCode() {
    const typed = query.trim();

    if (!typed) {
      return;
    }

    onSelect({ id: undefined, code: typed, name: name ?? "", isNormed: false });
    setIsOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isOpen) {
        open();

        return;
      }

      setHighlighted((current) =>
        optionCount === 0 ? 0 : (current + 1) % optionCount,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) =>
        optionCount === 0 ? 0 : (current - 1 + optionCount) % optionCount,
      );
    } else if (event.key === "Enter") {
      if (!isOpen) {
        return;
      }

      event.preventDefault();

      if (highlighted === typedCodeIndex && canUseTypedCode) {
        applyTypedCode();
      } else if (items[highlighted]) {
        pick(items[highlighted]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={wrapperRef} className={block("", isOpen ? ["open"] : [])}>
      <div className={block("wrapper")}>
        <input
          ref={inputRef}
          id={id}
          className={block("input")}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          value={isOpen ? query : selectedLabel}
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

      {isOpen && (
        <ul ref={listRef} className={block("list")} role="listbox">
          {isLoading && (
            <li className={block("item")}>Загрузка справочника ОКПД2...</li>
          )}

          {!isLoading && items.length === 0 && !canUseTypedCode && (
            <li className={block("item")}>
              {query
                ? `Позиций ОКПД2 по запросу «${query}» не найдено`
                : "Справочник ОКПД2 пуст"}
            </li>
          )}

          {!isLoading &&
            items.map((item, index) => (
              <li
                key={String(item.id ?? item.code)}
                role="option"
                aria-selected={index === highlighted}
                className={block(
                  "item",
                  index === highlighted ? ["active"] : [],
                )}
                // Полное наименование отдаём нативному тултипу: в выдаче оно
                // обрезано, а прочитать нужно целиком
                title={`${item.code} — ${item.name}`}
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={(event) => {
                  // mousedown, а не click: клик по списку не должен
                  // успеть закрыть его через обработчик «вне компонента»
                  event.preventDefault();
                  pick(item);
                }}
              >
                <span className={block("code")}>{item.code}</span>
                <span className={block("name")}>{item.name}</span>
                {item.isNormed && (
                  <span
                    className={block(
                      "badge",
                      item.normLimit ? ["limit"] : ["normed"],
                    )}
                    title={
                      item.normLimit
                        ? `Обязательное нормирование, предельная цена единицы ${formatMoney.format(item.normLimit)} ₽`
                        : "Обязательное нормирование"
                    }
                  >
                    {item.normLimit
                      ? `норм. ≤ ${formatMoney.format(item.normLimit)} ₽`
                      : "нормирование"}
                  </span>
                )}
              </li>
            ))}

          {canUseTypedCode && (
            <li
              role="option"
              aria-selected={highlighted === typedCodeIndex}
              className={block(
                "item",
                highlighted === typedCodeIndex ? ["active"] : [],
              )}
              onMouseEnter={() => setHighlighted(typedCodeIndex)}
              onMouseDown={(event) => {
                event.preventDefault();
                applyTypedCode();
              }}
            >
              <span className={block("name")}>
                Использовать «{query.trim()}» как код ОКПД2 (в справочнике нет
                такой позиции)
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
