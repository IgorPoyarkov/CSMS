import { useEffect, useMemo, useRef, useState } from "react";
import useUtils from "../../../hooks/useUtils";
import { checkOkpd2AuctionList } from "../../../services/Okpd2Ref/auctionListControl";
import {
  OKPD2_LIMIT,
  searchOkpd2,
  useOkpd2Dictionary,
} from "../../../services/Okpd2Ref/okpd2Ref.api";
import type { Okpd2Ref } from "../../../services/Okpd2Ref/okpd2Ref.schema";
import { useReferenceItems } from "../../../services/Eis/referenceData.api";
import styles from "./Okpd2Select.module.scss";

interface Okpd2SelectProps {
  /** Выбранный код ОКПД2 (то, что хранится в записи) */
  code?: string;
  /** Выбранное наименование ОКПД2 */
  name?: string;
  /** Вызов при выборе позиции справочника; null — выбор сброшен */
  onSelect: (item: Okpd2Ref | null) => void;
  /**
   * Коды ОКПД2, доступные для выбора — позиции плана-графика заказчика.
   * Если массив передан и не пуст, остальные коды справочника скрываются,
   * а ввод кода вручную вне списка запрещается.
   */
  allowedCodes?: string[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const formatMoney = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Выдача справочника — по возрастанию кода ОКПД2. Сравниваем как числа
// в пределах разрядов: «2.10» идёт после «2.9», а не наоборот
const compareOkpd2ByCode = (a: Okpd2Ref, b: Okpd2Ref): number =>
  a.code.localeCompare(b.code, "ru", { numeric: true });

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
  allowedCodes,
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

  // Ограничение по плану-графику: если коды заданы, справочник фильтруется
  const allowedSet = useMemo(
    () =>
      allowedCodes && allowedCodes.length > 0
        ? new Set(allowedCodes)
        : undefined,
    [allowedCodes],
  );
  const availableDictionary = useMemo(
    () =>
      allowedSet
        ? (dictionary ?? []).filter((item) => allowedSet.has(item.code))
        : (dictionary ?? []),
    [dictionary, allowedSet],
  );

  // Текст выбранной позиции, когда список закрыт
  const selectedLabel = code ? `${code}${name ? ` — ${name}` : ""}` : "";
  const items = useMemo(
    () =>
      searchOkpd2(availableDictionary, query)
        .slice()
        .sort(compareOkpd2ByCode),
    [availableDictionary, query],
  );

  const typed = query.trim();
  const typedAllowed = !allowedSet || allowedSet.has(typed);

  // Официальный снимок ОКПД2 на бэке (Tasks 16, `/api/references/nsiOKPD2`):
  // дополняет локальный справочник, когда в нём нет нужного кода. Без сервиса
  // выдача пустая и форма работает по `db.json` как раньше.
  const { data: referenceItems = [], isFetching: isReferenceLoading } =
    useReferenceItems(
      "nsiOKPD2",
      { search: typed, take: OKPD2_LIMIT },
      isOpen && !allowedSet && typed.length >= 2 && items.length === 0,
    );

  // Выдача = локальные позиции + коды из снимка ЕИС (без дублей)
  const options = useMemo<Okpd2Ref[]>(() => {
    if (referenceItems.length === 0) {
      return items;
    }

    const localCodes = new Set(items.map((item) => item.code));
    const extra = referenceItems
      .filter((item) => !localCodes.has(item.code))
      .map<Okpd2Ref>((item) => {
        // Признаки нормирования и нацрежима остаются за локальным
        // справочником: снимок НСИ отдаёт только код и наименование
        const auctionCheck = checkOkpd2AuctionList(item.code, dictionary);

        return {
          code: item.code,
          name: item.name,
          isNormed: false,
          isAuctionRequired: auctionCheck.inAuctionList,
          auctionNote: auctionCheck.note,
        };
      });

    return [...items, ...extra].sort(compareOkpd2ByCode);
  }, [items, referenceItems, dictionary]);

  // Справочник пополняется выгрузкой из ЕИС и может не содержать нужного кода,
  // поэтому введённый вручную код оставляем доступным для выбора. Но только
  // если он есть в плане-графике — иначе связь с позицией плана теряется.
  const canUseTypedCode =
    isOpen &&
    typed.length >= 2 &&
    typedAllowed &&
    !options.some((item) => item.code === typed);

  // Введён код, которого нет в плане-графике: показываем отказ
  const typedNotAllowed =
    isOpen && typed.length >= 2 && Boolean(allowedSet) && !typedAllowed;

  // Сохранённый код вне плана-графика (старые записи) — предупреждаем
  const selectedNotAllowed = Boolean(
    code && allowedSet && !allowedSet.has(code),
  );

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
  const typedCodeIndex = options.length;
  const optionCount =
    options.length + (canUseTypedCode ? 1 : 0) + (typedNotAllowed ? 1 : 0);

  function applyTypedCode() {
    const typed = query.trim();

    // Ручной ввод разрешён только для кодов из плана-графика
    if (!typed || (allowedSet && !allowedSet.has(typed))) {
      return;
    }

    const auctionCheck = checkOkpd2AuctionList(typed, dictionary);
    onSelect({
      id: undefined,
      code: typed,
      name: name ?? "",
      isNormed: false,
      isAuctionRequired: auctionCheck.inAuctionList,
      auctionNote: auctionCheck.note,
    });
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
      } else if (options[highlighted]) {
        pick(options[highlighted]);
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

      {selectedNotAllowed && (
        <span className={block("hint")}>
          Код {code} отсутствует в плане-графике заказчика — выберите позицию из
          плана.
        </span>
      )}

      {isOpen && (
        <ul ref={listRef} className={block("list")} role="listbox">
          {isLoading && (
            <li className={block("item")}>Загрузка справочника ОКПД2...</li>
          )}

          {isReferenceLoading && (
            <li className={block("item")}>
              Поиск в справочнике ЕИС (nsiOKPD2)…
            </li>
          )}

          {!isLoading &&
            !isReferenceLoading &&
            options.length === 0 &&
            !canUseTypedCode &&
            !typedNotAllowed && (
              <li className={block("item")}>
                {query
                  ? allowedSet
                    ? `Код «${query}» отсутствует в плане-графике заказчика`
                    : `Позиций ОКПД2 по запросу «${query}» не найдено`
                  : allowedSet
                    ? "В позициях плана-графика не заполнены коды ОКПД2"
                    : "Справочник ОКПД2 пуст"}
              </li>
            )}

          {typedNotAllowed && (
            <li className={block("item", ["disabled"])}>
              <span className={block("name")}>
                Код «{typed}» отсутствует в плане-графике заказчика — выбрать
                его нельзя.
              </span>
            </li>
          )}

          {!isLoading &&
            options.map((item, index) => {
              const auctionRes = checkOkpd2AuctionList(item.code, dictionary);
              return (
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
                  {auctionRes.inAuctionList && (
                    <span
                      className={block("badge", ["auction"])}
                      title="Код входит в аукционный перечень (РП РФ от 21.03.2016 № 471-р, ред. от 31.10.2022) — обязателен электронный аукцион"
                    >
                      аукц. 471-р
                    </span>
                  )}
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
              );
            })}

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
