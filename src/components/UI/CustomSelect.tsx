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
}: CustomSelectProps<TItem>) {
  const { bem } = useUtils();
  const select = bem(styles, "custom-select");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItem = listData.find((item, index) => {
    const key = getKey ? getKey(item, index) : String(item);
    return key === selectedValue;
  });

  const displayLabel = selectedItem
    ? getLabel
      ? getLabel(selectedItem)
      : String(selectedItem)
    : placeholder;

  const handleSelectItem = (key: string | number, item: TItem) => {
    onClick(key, item);
    if (!isMulti) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={select("", isOpen ? [...modifier, "open"] : modifier)}
    >
      <button
        type="button"
        className={select("trigger")}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span
          className={select("value", !selectedItem ? ["placeholder"] : [])}
        >
          {displayLabel}
        </span>
        <span className={select("arrow")}>▼</span>
      </button>

      {isOpen && (
        <ul className={select("list")}>
          {listData.map((item, index) => {
            const key = getKey ? getKey(item, index) : String(item);
            const isSelected = key === selectedValue;

            return (
              <li
                className={select("item", isSelected ? ["active"] : [])}
                key={key}
                onClick={() => handleSelectItem(key, item)}
              >
                <span>{renderItem ? renderItem(item) : String(item)}</span>
                {isMulti && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
