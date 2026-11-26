import { useMemo, useState } from "react";
import {
  findKtruByOkpd2,
  useKtruByOkpd2,
  useKtruDictionary,
} from "../../../services/KtruRef/ktruRef.api";
import type { KtruRef } from "../../../services/KtruRef/ktruRef.schema";
import CustomSelect from "../CustomSelect";

interface KtruSelectProps {
  /** Код ОКПД2 позиции: выдача ограничивается позициями каталога этого кода */
  okpd2Code?: string;
  /** Выбранный код позиции КТРУ */
  ktruCode?: string;
  /** Выбор позиции; null — позиция КТРУ снята */
  onSelect: (item: KtruRef | null) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Класс обёртки селекта (стили формы) */
  className?: string;
  /** Код КТРУ из позиции ПГ — открываем список сразу на нём */
  initialQuery?: string;
}

interface KtruOption {
  code: string;
  label: string;
  item: KtruRef | null;
}

/**
 * Выбор позиции КТРУ для позиции объекта закупки.
 *
 * Бэкенд отдаёт КТРУ вместе с привязкой к ОКПД2, поэтому список сокращается
 * до позиций выбранного кода. Используется проектный кастомный селект с
 * поиском: даже внутри одного ОКПД2 кодов может быть несколько десятков.
 * Поиск по наименованию характеристики помогает найти позицию по показателю;
 * переключатель «только обязательные» живёт в карточке ООЗ рядом со списком
 * полей выбранной позиции.
 */
export default function KtruSelect({
  okpd2Code,
  ktruCode,
  onSelect,
  disabled = false,
  placeholder = "— Без КТРУ —",
  className,
  initialQuery = "",
}: KtruSelectProps) {
  // Фильтр по наименованию характеристики: помогает найти позицию КТРУ по
  // ключевому показателю (мощность, материал, диаметр и т. п.)
  const [characteristicQuery, setCharacteristicQuery] = useState("");

  // Серверная выборка по коду ОКПД2: выпадающему списку в таблице позиций
  // не нужен весь каталог (до 5 000 записей, 10 страниц по 500)
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

  // Уже выбранная позиция: фильтр сужает только выдачу, но не должен
  // «выкидывать» текущий выбор — иначе поля ОЗ исчезают из карточки.
  const selectedItem = useMemo(
    () => items.find((item) => item.ktruCode === ktruCode) ?? null,
    [items, ktruCode],
  );

  const filteredItems = useMemo(() => {
    const needle = characteristicQuery.trim().toLowerCase();
    if (!needle) return items;
    const matched = items.filter((item) =>
      item.characteristics.some((characteristic) =>
        characteristic.name.toLowerCase().includes(needle),
      ),
    );
    // Выбранная позиция остаётся в списке даже если не проходит фильтр:
    // фильтр только сокращает варианты выбора и не исключает поля ОЗ.
    if (
      selectedItem &&
      !matched.some((item) => item.ktruCode === selectedItem.ktruCode)
    ) {
      return [selectedItem, ...matched];
    }
    return matched;
  }, [items, characteristicQuery, selectedItem]);

  // Пустая позиция нужна, чтобы снять уже выбранный КТРУ
  const options = useMemo<KtruOption[]>(
    () => [
      { code: "", label: placeholder, item: null },
      ...filteredItems.map((item) => {
        const mandatory = item.characteristics.filter(
          (characteristic) => characteristic.isMandatory,
        ).length;
        const range = item.characteristics.filter((characteristic) =>
          ["range", "min", "max"].includes(characteristic.valueType),
        ).length;
        const hints = [
          mandatory ? `обяз. ${mandatory}` : "",
          range ? `диапаз. ${range}` : "",
        ].filter(Boolean);

        return {
          code: item.ktruCode,
          label: `${item.ktruCode} — ${item.name}${hints.length ? ` (${hints.join(", ")})` : ""}`,
          item,
        };
      }),
    ],
    [filteredItems, placeholder],
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
        {loading ? "Загрузка позиций КТРУ…" : "Для кода ОКПД2 позиций КТРУ нет"}
      </span>
    );
  }

  return (
    <div className={className}>
      {/* В ЕИС фильтр характеристик — переключатель внутри карточки позиции.
          Здесь в списке позиций остаётся только поиск по показателю. */}
      <input
        type="search"
        value={characteristicQuery}
        disabled={disabled}
        placeholder="Поиск по показателю КТРУ (мощность, материал…)"
        aria-label="Поиск по наименованию характеристики КТРУ"
        onChange={(event) => setCharacteristicQuery(event.target.value)}
        style={{
          padding: "6px 8px",
          border: "1px solid var(--border-strong)",
          borderRadius: 6,
          background: "var(--surface-field)",
          color: "var(--text-primary)",
          fontSize: "0.8rem",
        }}
      />
      {filteredItems.length === 0 && (
        <span
          style={{
            display: "block",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          Позиций с таким показателем нет — измените запрос.
        </span>
      )}
      <CustomSelect
        listData={options}
        selectedValue={ktruCode ?? ""}
        placeholder={placeholder}
        getKey={(option) => option.code}
        getLabel={(option) => option.label}
        getSearchText={(option) => `${option.code} ${option.label}`}
        searchable
        searchPlaceholder="Поиск по коду или наименованию КТРУ…"
        initialQuery={initialQuery}
        disabled={disabled}
        onClick={(_code, option) => onSelect(option.item)}
      />
    </div>
  );
}
