import { useMemo } from "react";
import {
  findKtruByOkpd2,
  useKtruByOkpd2,
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
  // Серверная выборка по коду ОКПД2: выпадающему списку в таблице позиций
  // не нужен весь каталог КТРУ (до 5 000 записей, 10 страниц по 500)
  const server = useKtruByOkpd2(okpd2Code);
  // API снимка НСИ недоступен — остаётся локальный справочник db.json
  const local = useKtruDictionary(server.isError);

  const items = useMemo(
    () =>
      server.isError
        ? findKtruByOkpd2(local.data ?? [], okpd2Code)
        : (server.data ?? []),
    [server.isError, server.data, local.data, okpd2Code],
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
    const loading = server.isLoading || (server.isError && local.isLoading);

    return (
      <span
        style={{
          display: "block",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
        }}
      >
        {loading
          ? "Загрузка позиций КТРУ…"
          : "Для кода ОКПД2 позиций КТРУ нет"}
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
