import React, { useEffect, useRef, useState } from "react";
import useUtils from "../../hooks/useUtils";
import styles from "./CustomSelect.module.scss";

interface CustomSelectProps<TItem> {
  listData: TItem[];
  selectedValue?: string | number | null;
  placeholder?: string;
  renderItem?: (item: TItem) => React.ReactNode;
  getKey?: (item: TItem, index: number) => string | number;
  getLabel?: (item: TItem) => string;
  modifier?: string[];
  isMulti?: boolean;
  onClick: (id: string | number, item: TItem) => void;
  // Поиск внутри выпадающего списка: сокращает длинный список по подстроке,
  // чтобы пользователь не прокручивал сотни строк вручную
  searchable?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (item: TItem) => string;
}

export default function CustomSelect<TItem>({
  listData,
  selectedValue = null,
  placeholder = "Выберите значение...",
  renderItem,
  getKey,
  getLabel,
  modifier = [],
  isMulti = false,
  onClick,
  searchable = false,
  searchPlaceholder = "Поиск…",
  getSearchText,
}: CustomSelectProps<TItem>) {
  const { bem } = useUtils();
  const select = bem(styles, "custom-select");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const keyOf = (item: TItem, index: number): string | number =>
    getKey ? getKey(item, index) : String(item);

  // Текст, по которому идёт поиск: явный getSearchText, иначе подпись пункта
  const searchTextOf = (item: TItem): string => {
    if (getSearchText) return getSearchText(item);
    if (getLabel) return getLabel(item);
    if (renderItem) {
      const rendered = renderItem(item);
      if (typeof rendered === "string" || typeof rendered === "number") {
        return String(rendered);
      }
    }
    return String(item);
  };

  // Ключ считается по исходному индексу: фильтрация не должна его менять,
  // иначе повторный поиск перепутает строки с одинаковым текстом
  const indexedItems = listData.map((item, index) => ({
    item,
    key: keyOf(item, index),
  }));

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems =
    searchable && normalizedQuery
      ? indexedItems.filter(({ item }) =>
          searchTextOf(item).toLowerCase().includes(normalizedQuery),
        )
      : indexedItems;

  const selectedItem = indexedItems.find(
    ({ key }) => key === selectedValue,
  )?.item;

  const displayLabel = selectedItem
    ? getLabel
      ? getLabel(selectedItem)
      : String(selectedItem)
    : placeholder;

  const toggleOpen = () => {
    if (isOpen) setQuery("");
    setIsOpen(!isOpen);
  };

  const handleSelectItem = (key: string | number, item: TItem) => {
    onClick(key, item);
    setQuery("");
    if (!isMulti) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={select("", isOpen ? [...modifier, "open"] : modifier)}
    >
      <button type="button" className={select("trigger")} onClick={toggleOpen}>
        <span className={select("value", !selectedItem ? ["placeholder"] : [])}>
          {displayLabel}
        </span>
        <span className={select("arrow")}>▼</span>
      </button>

      {isOpen && (
        <div className={select("dropdown")}>
          {searchable && (
            <input
              type="search"
              className={select("search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              // Фокус сразу в поиске: список открывают, чтобы найти нужную строку
              autoFocus
            />
          )}

          <ul className={select("list")}>
            {visibleItems.length === 0 ? (
              <li className={select("empty")}>Ничего не найдено</li>
            ) : (
              visibleItems.map(({ item, key }) => {
                const isSelected = key === selectedValue;

                return (
                  <li
                    className={select("item", isSelected ? ["active"] : [])}
                    key={key}
                    title={searchTextOf(item)}
                    onClick={() => handleSelectItem(key, item)}
                  >
                    <span className={select("item-text")}>
                      {renderItem ? renderItem(item) : String(item)}
                    </span>
                    {isMulti && (
                      <input type="checkbox" checked={isSelected} readOnly />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
