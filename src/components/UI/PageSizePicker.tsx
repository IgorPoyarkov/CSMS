import useUtils from "../../hooks/useUtils";
import styles from "./PageSizePicker.module.scss";

// Сколько записей показывать на странице: число или «все»
export type PageSizeValue = number | "all";

interface PageSizePickerProps {
  sizes: readonly PageSizeValue[];
  value: PageSizeValue;
  onChange: (size: PageSizeValue) => void;
  caption?: string;
  allLabel?: string;
}

/**
 * Выбор масштаба пагинации. Раньше это был нативный select: в светлой теме его
 * закрытое состояние не отличалось от фона панели, и по выбранному значению
 * нельзя было понять масштаб (Tasks 6, п. 2). Здесь группа кнопок с общей
 * обводкой, а выбранный масштаб залит акцентом.
 */
const PageSizePicker = ({
  sizes,
  value,
  onChange,
  caption = "Показывать по",
  allLabel = "Все",
}: PageSizePickerProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "page-size");

  return (
    <div className={block()}>
      <span className={block("caption")}>{caption}</span>
      <div className={block("group")} role="group" aria-label={caption}>
        {sizes.map((size) => (
          <button
            key={String(size)}
            type="button"
            className={block("option", value === size ? ["active"] : [])}
            aria-pressed={value === size}
            onClick={() => onChange(size)}
          >
            {size === "all" ? allLabel : size}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PageSizePicker;
