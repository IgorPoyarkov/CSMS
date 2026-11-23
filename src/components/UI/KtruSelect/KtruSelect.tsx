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
  /** Показывать фильтр по характеристикам (для карточки ООЗ) */
  showCharacteristicFilter?: boolean;
}

interface KtruOption {
  code: string;
  label: string;
  item: KtruRef | null;
}

type CharacteristicFilter = "all" | "mandatory" | "range";

const characteristicFilterLabels: Record<CharacteristicFilter, string> = {
  all: "Все позиции",
  mandatory: "С обязательными характеристиками",
  range: "С диапазонными характеристиками",
};

const hasRangeCharacteristics = (item: KtruRef) =>
  item.characteristics.some((characteristic) =>
    ["range", "min", "max"].includes(characteristic.valueType),
  );

/**
 * Выбор позиции КТРУ для позиции объекта закупки.
 *
 * Бэкенд отдаёт КТРУ вместе с привязкой к ОКПД2, поэтому список сокращается
 * до позиций выбранного кода. Используется проектный кастомный селект с
 * поиском: даже внутри одного ОКПД2 кодов может быть несколько десятков.
 * В карточке ООЗ дополнительно доступен фильтр по обязательным и диапазонным
 * характеристикам каталога (ПП РФ № 145).
 */
export default function KtruSelect({
  okpd2Code,
  ktruCode,
  onSelect,
  disabled = false,
  placeholder = "— Без КТРУ —",
  className,
  showCharacteristicFilter = false,
}: KtruSelectProps) {
  const [characteristicFilter, setCharacteristicFilter] =
    useState<CharacteristicFilter>("all");

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

  const filteredItems = useMemo(() => {
    if (characteristicFilter === "mandatory") {
      return items.filter((item) =>
        item.characteristics.some((characteristic) => characteristic.isMandatory),
      );
    }
    if (characteristicFilter === "range") {
      return items.filter(hasRangeCharacteristics);
    }
    return items;
  }, [items, characteristicFilter]);

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

  const filterOptions = useMemo(
    () =>
      (Object.keys(characteristicFilterLabels) as CharacteristicFilter[]).map(
        (value) => ({ code: value, label: characteristicFilterLabels[value] }),
      ),
    [],
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
    <div className={className}>
      {showCharacteristicFilter && (
        <CustomSelect
          listData={filterOptions}
          selectedValue={characteristicFilter}
          placeholder="Фильтр характеристик"
          getKey={(option) => option.code}
          getLabel={(option) => option.label}
          onClick={(_code, option) => setCharacteristicFilter(option.code)}
          disabled={disabled}
        />
      )}
      {filteredItems.length === 0 ? (
        <span
          style={{
            display: "block",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          {characteristicFilter === "mandatory"
            ? "Нет позиций с обязательными характеристиками — проверьте маппинг КТРУ"
            : "Нет позиций с диапазонными характеристиками — проверьте маппинг КТРУ"}
        </span>
      ) : (
        <CustomSelect
          listData={options}
          selectedValue={ktruCode ?? ""}
          placeholder={placeholder}
          getKey={(option) => option.code}
          getLabel={(option) => option.label}
          getSearchText={(option) => `${option.code} ${option.label}`}
          searchable
          searchPlaceholder="Поиск по коду или наименованию КТРУ…"
          disabled={disabled}
          onClick={(_code, option) => onSelect(option.item)}
        />
      )}
    </div>
  );
}
