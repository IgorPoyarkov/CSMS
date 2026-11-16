import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import PageSizePicker from "../UI/PageSizePicker";
import {
  findOkpd2ByCode,
  searchOkpd2,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import styles from "./Okpd2Dictionary.module.scss";

// Просмотр справочника: поиск по коду и наименованию, отбор нормируемых
// позиций и порционный вывод — кодов ОКПД2 много, выводить их целиком нельзя
const PAGE_SIZES = [25, 50, 100, "all"] as const;
type PageSize = (typeof PAGE_SIZES)[number];

const money = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function Okpd2Dictionary() {
  const { bem } = useUtils();
  const block = bem(styles, "okpd2-dictionary");
  const {
    data: dictionary = [],
    isLoading,
    isError,
    error,
  } = useOkpd2Dictionary();

  const [query, setQuery] = useState("");
  const [onlyNormed, setOnlyNormed] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(1);

  const found = useMemo(() => {
    // Поиск не ограничиваем выдачей 30 строк: здесь нужен весь результат,
    // чтобы работала пагинация
    const matched = searchOkpd2(dictionary, query, Number.MAX_SAFE_INTEGER);

    return onlyNormed ? matched.filter((item) => item.isNormed) : matched;
  }, [dictionary, query, onlyNormed]);

  const normedCount = useMemo(
    () => dictionary.filter((item) => item.isNormed).length,
    [dictionary],
  );

  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(found.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = pageSize === "all" ? 0 : (safePage - 1) * pageSize;
  const pageRows =
    pageSize === "all" ? found : found.slice(start, start + pageSize);

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div>
          <h1 className={block("title")}>Справочник ОКПД2</h1>
          <p className={block("summary")}>
            Позиций в справочнике: {dictionary.length} · подлежит обязательному
            нормированию: {normedCount}
          </p>
          <p className={block("note")}>
            Код и наименование подставляются в запись плана-графика, извещение и
            проект контракта выбором из списка. Признак нормирования означает,
            что для позиции установлены общие правила определения требований и
            предельные цены (ПП РФ от 02.09.2015 N 926, ПП РФ от 13.10.2014 N
            1047).
          </p>
        </div>
      </header>

      <div className={block("toolbar")}>
        <input
          className={block("search")}
          type="search"
          placeholder="Поиск по коду или наименованию ОКПД2…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />

        <label className={block("toggle")}>
          <input
            type="checkbox"
            checked={onlyNormed}
            onChange={(event) => {
              setOnlyNormed(event.target.checked);
              setPage(1);
            }}
          />
          Только подлежащие нормированию
        </label>

        <PageSizePicker
          sizes={PAGE_SIZES}
          value={pageSize}
          onChange={(size) => {
            setPageSize(size as PageSize);
            setPage(1);
          }}
        />
      </div>

      {isLoading && <p className={block("status")}>Загрузка справочника...</p>}

      {isError && (
        <p className={block("status", ["error"])}>
          Не удалось загрузить справочник ОКПД2: {String(error)}
        </p>
      )}

      {!isLoading && !isError && found.length === 0 && (
        <p className={block("status")}>
          Позиций ОКПД2 по заданным условиям не найдено.
        </p>
      )}

      {pageRows.length > 0 && (
        <>
          <div className={block("table-wrapper")}>
            <table className={block("table")}>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Код ОКПД2</th>
                  <th>Наименование товара, работы, услуги</th>
                  <th>Обязательное нормирование</th>
                  <th>Предельная цена единицы, ₽</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((item, index) => (
                  <tr key={String(item.id ?? item.code)}>
                    <td>{start + index + 1}</td>
                    <td className={block("code")}>{item.code}</td>
                    <td>{item.name}</td>
                    <td>
                      {item.isNormed ? (
                        <span className={block("tag", ["normed"])}>Да</span>
                      ) : (
                        <span className={block("tag")}>Нет</span>
                      )}
                    </td>
                    <td>
                      {item.normLimit ? money.format(item.normLimit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={block("pager")}>
              <button
                type="button"
                className={block("pager-button")}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                Назад
              </button>
              <span className={block("pager-info")}>
                {start + 1}–{Math.min(start + pageRows.length, found.length)} из{" "}
                {found.length}
              </span>
              <button
                type="button"
                className={block("pager-button")}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={safePage === totalPages}
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}

      {/* Проверка кода: подпадает ли конкретный код под нормирование */}
      <Okpd2CodeCheck dictionary={dictionary} />
    </section>
  );
}

// Мини-проверка кода: позволяет убедиться, что позиция подпадает под
// обязательное нормирование, до внесения её в план-график
function Okpd2CodeCheck({
  dictionary,
}: {
  dictionary: ReturnType<typeof useOkpd2Dictionary>["data"];
}) {
  const { bem } = useUtils();
  const block = bem(styles, "okpd2-dictionary");
  const [code, setCode] = useState("");

  const matched = findOkpd2ByCode(dictionary ?? [], code);
  const showResult = code.trim().length >= 2;

  return (
    <div className={block("check")}>
      <label className={block("control")}>
        <span className={block("control-caption")}>
          Проверка кода на нормирование
        </span>
        <input
          className={block("search")}
          type="text"
          placeholder="Например, 31.01.11.130"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>

      {showResult && (
        <p
          className={block(
            "status",
            matched?.isNormed ? ["warning"] : matched ? [] : ["error"],
          )}
        >
          {!matched && `Код «${code}» в справочнике не найден.`}
          {matched && !matched.isNormed && (
            <>
              {matched.code} — {matched.name}. Обязательное нормирование не
              установлено.
            </>
          )}
          {matched?.isNormed && (
            <>
              {matched.code} — {matched.name}. Позиция подлежит обязательному
              нормированию
              {matched.normLimit
                ? `, предельная цена единицы — ${money.format(matched.normLimit)} ₽.`
                : "."}
            </>
          )}
        </p>
      )}
    </div>
  );
}
