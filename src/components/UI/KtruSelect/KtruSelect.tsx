import { useMemo } from "react";
import {
  findKtruByOkpd2,
  useKtruDictionary,
} from "../../../services/KtruRef/ktruRef.api";
import type { KtruRef } from "../../../services/KtruRef/ktruRef.schema";

interface KtruSelectProps {
  /** Код ОКПД2 позиции: выдача ограничивается позициями каталога этого кода */
  okpd2Code?: string;
  /** Выбранный код позиции КТРУ */
  ktruCode?: string;
  /** Выбор позиции; null — позиция КТРУ снята */
  onSelect: (item: KtruRef | null) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Класс нативного select (стили формы) */
  className?: string;
}

/**
 * Выбор позиции КТРУ для позиции объекта закупки.
 *
 * Бэкенд отдаёт КТРУ вместе с привязкой к ОКПД2, поэтому список сокращается
 * до позиций выбранного кода. Нативный select выбран намеренно: список
 * короткий (позиции одного ОКПД2), а выпадающий слой не обрезается
 * контейнерами таблицы.
 */
export default function KtruSelect({
  okpd2Code,
  ktruCode,
  onSelect,
  disabled = false,
  placeholder = "— Без КТРУ —",
  className,
}: KtruSelectProps) {
  const { data: dictionary = [] } = useKtruDictionary();

  const items = useMemo(
    () => findKtruByOkpd2(dictionary, okpd2Code),
    [dictionary, okpd2Code],
  );

  if (!okpd2Code) {
    return (
      <span
        style={{
          display: "block",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}
      >
        Сначала выберите код ОКПД2
      </span>
    );
  }

  if (items.length === 0) {
    return (
      <span
        style={{
          display: "block",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}
      >
        Для кода ОКПД2 позиций КТРУ нет
      </span>
    );
  }

  return (
    <select
      className={className}
      value={ktruCode ?? ""}
      disabled={disabled}
      onChange={(event) => {
        const code = event.target.value;
        const found = items.find((item) => item.ktruCode === code) ?? null;
        onSelect(found);
      }}
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.ktruCode} value={item.ktruCode}>
          {item.ktruCode} — {item.name}
        </option>
      ))}
    </select>
  );
}
