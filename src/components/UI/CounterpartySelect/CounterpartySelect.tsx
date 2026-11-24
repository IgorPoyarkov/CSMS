import { useEffect, useMemo, useRef, useState } from "react";
import useUtils from "../../../hooks/useUtils";
import {
  useCounterpartiesWithSmp,
  useSaveCounterparty,
} from "../../../services/Counterparty/counterparty.api";
import {
  counterpartySearchText,
  createCounterpartyDraft,
  isCounterpartyInnComplete,
  type Counterparty,
  type CounterpartyWithSmp,
} from "../../../services/Counterparty/counterparty.schema";
import { normalizeInn } from "../../../services/ContractSmp/smpRegistry.schema";
import styles from "./CounterpartySelect.module.scss";

interface CounterpartySelectProps {
  /** ИНН, сохранённый в форме */
  inn?: string;
  /** Наименование, сохранённое в форме (для подписи выбранного) */
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  /** Разрешить создавать карточку по введённому ИНН */
  allowCreate?: boolean;
  /** Выбор из справочника: реквизиты дальше копирует вызывающая форма */
  onSelect: (counterparty: Counterparty) => void;
}

const MAX_OPTIONS = 10;

const smpBadge = (
  counterparty: CounterpartyWithSmp,
): { text: string; modifier: string } | null => {
  switch (counterparty.smp.status) {
    case "in_registry":
      return { text: "в реестре МСП", modifier: "smp" };
    case "out_of_registry":
      return { text: "не в реестре МСП", modifier: "not-smp" };
    case "excluded":
      return { text: "исключён из МСП", modifier: "not-smp" };
    default:
      return null;
  }
};

/**
 * Выбор контрагента из справочника с поиском по ИНН и наименованию.
 *
 * Смысл — не вводить реквизиты поставщика заново в каждой форме: в строке
 * ищется уже заведённая карточка, при выборе форма получает наименование, ИНН и
 * КПП. Если ИНН новый, здесь же создаётся карточка: реквизиты дозаполняются
 * позже (сверка с реестром МСП подсказывает наименование и категорию).
 *
 * Признак МСП показывается из результатов сверок: в справочнике он не хранится,
 * поэтому не может устареть отдельно от самого вердикта.
 */
export default function CounterpartySelect({
  inn = "",
  name = "",
  placeholder = "Наименование или ИНН контрагента…",
  disabled = false,
  id,
  allowCreate = true,
  onSelect,
}: CounterpartySelectProps) {
  const { bem } = useUtils();
  const block = bem(styles, "counterparty-select");
  const { data: list = [], isLoading } = useCounterpartiesWithSmp();
  const saveCounterparty = useSaveCounterparty();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const digits = normalizeInn(inn);
  const selectedLabel = digits
    ? `${name || "Без наименования"} · ИНН ${digits}`
    : "";

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? list.filter((item) => counterpartySearchText(item).includes(needle))
      : list;

    return filtered.slice(0, MAX_OPTIONS);
  }, [list, query]);

  const typedInn = normalizeInn(query);
  const canCreate =
    allowCreate &&
    isCounterpartyInnComplete(typedInn) &&
    !list.some((item) => normalizeInn(item.inn) === typedInn);

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

  useEffect(() => {
    const ul = listRef.current;
    const active = ul?.children[highlighted] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const optionCount = options.length + (canCreate ? 1 : 0);

  const open = () => {
    if (disabled) return;

    setIsOpen(true);
    setQuery("");
    setHighlighted(0);
  };

  const pick = (counterparty: Counterparty) => {
    onSelect(counterparty);
    setIsOpen(false);
    setQuery("");
  };

  const create = async () => {
    if (!canCreate || saveCounterparty.isPending) return;

    const saved = await saveCounterparty.mutateAsync(
      createCounterpartyDraft(typedInn),
    );

    pick(saved);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
      if (!isOpen) return;

      event.preventDefault();

      if (canCreate && highlighted === options.length) {
        void create();
      } else if (options[highlighted]) {
        pick(options[highlighted]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={wrapperRef} className={block("", isOpen ? ["open"] : [])}>
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
          value={isOpen ? query : selectedLabel}
          onFocus={open}
          onClick={open}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <span className={block("arrow")}>▼</span>
      </div>

      {isOpen && (
        <ul ref={listRef} className={block("list")} role="listbox">
          {isLoading && <li className={block("item")}>Загрузка справочника…</li>}

          {!isLoading && options.length === 0 && !canCreate && (
            <li className={block("empty")}>
              {query
                ? "Контрагент не найден — введите ИНН (10 или 12 цифр), чтобы завести карточку"
                : "Справочник пуст — введите ИНН, чтобы завести первого контрагента"}
            </li>
          )}

          {options.map((item, index) => {
            const badge = smpBadge(item);

            return (
              <li
                key={String(item.id ?? item.inn)}
                role="option"
                aria-selected={index === highlighted}
                className={block(
                  "item",
                  index === highlighted ? ["active"] : [],
                )}
                title={`${item.name} · ИНН ${item.inn}`}
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={(event) => {
                  // mousedown, а не click: список не должен закрыться раньше выбора
                  event.preventDefault();
                  pick(item);
                }}
              >
                <span className={block("name")}>{item.name}</span>
                <span className={block("inn")}>ИНН {item.inn}</span>
                {badge && (
                  <span className={block("badge", [badge.modifier])}>
                    {badge.text}
                  </span>
                )}
              </li>
            );
          })}

          {canCreate && (
            <li
              role="option"
              aria-selected={highlighted === options.length}
              className={block(
                "item",
                highlighted === options.length ? ["active"] : [],
              )}
              onMouseEnter={() => setHighlighted(options.length)}
              onMouseDown={(event) => {
                event.preventDefault();
                void create();
              }}
            >
              <span className={block("name")}>
                {saveCounterparty.isPending
                  ? "Создаём карточку…"
                  : `Добавить контрагента с ИНН ${typedInn}`}
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
