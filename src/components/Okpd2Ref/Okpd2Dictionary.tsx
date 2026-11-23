import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import PageSizePicker from "../UI/PageSizePicker";
import {
  AUCTION_LIST_ACT_TITLE,
  checkOkpd2AuctionList,
} from "../../services/Okpd2Ref/auctionListControl";
import {
  findOkpd2ByCode,
  searchOkpd2,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import { OKPD2_OBJECT_KIND_LABELS } from "../../services/Okpd2Ref/okpd2Ref.schema";
import styles from "./Okpd2Dictionary.module.scss";

// Просмотр справочника: поиск по коду и наименованию, отбор нормируемых и
// аукционных позиций (РП № 471-р) и порционный вывод
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
  const [onlyAuction, setOnlyAuction] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(1);

  const found = useMemo(() => {
    // Поиск не ограничиваем выдачей 30 строк: здесь нужен весь результат,
    // чтобы работала пагинация
    let matched = searchOkpd2(dictionary, query, Number.MAX_SAFE_INTEGER);
    if (onlyNormed) {
      matched = matched.filter((item) => item.isNormed);
    }
    if (onlyAuction) {
      matched = matched.filter(
        (item) => checkOkpd2AuctionList(item.code, dictionary).inAuctionList,
      );
    }
    return matched;
  }, [dictionary, query, onlyNormed, onlyAuction]);

  const normedCount = useMemo(
    () => dictionary.filter((item) => item.isNormed).length,
    [dictionary],
  );

  const auctionCount = useMemo(
    () =>
      dictionary.filter(
        (item) => checkOkpd2AuctionList(item.code, dictionary).inAuctionList,
      ).length,
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
            нормированию: {normedCount} · в аукционном перечне (РП № 471-р):{" "}
            {auctionCount}
          </p>
          <p className={block("note")}>
            Код и наименование подставляются в запись плана-графика, СЗ,
            извещение и проект контракта выбором из списка. Признак нормирования
            означает требования по ПП РФ от 02.09.2015 N 926 и ПП РФ от
            13.10.2014 N 1047. Позиции с признаком{" "}
            <strong>«Электронный аукцион»</strong> входят в перечень по{" "}
            {AUCTION_LIST_ACT_TITLE}: по ч. 6 ст. 24 Закона № 44-ФЗ проведение
            конкурса по ним неправомерно (за исключением запроса котировок и
            закупки у ед. поставщика).
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

        <label className={block("toggle")}>
          <input
            type="checkbox"
            checked={onlyAuction}
            onChange={(event) => {
              setOnlyAuction(event.target.checked);
              setPage(1);
            }}
          />
          Только из аукционного перечня (471-р)
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
                  <th>Вид объекта (по коду)</th>
                  <th>Аукционный перечень (471-р)</th>
                  <th>Обязательное нормирование</th>
                  <th>Предельная цена единицы, ₽</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((item, index) => {
                  const auctionCheck = checkOkpd2AuctionList(
                    item.code,
                    dictionary,
                  );
                  return (
                    <tr key={String(item.id ?? item.code)}>
                      <td>{start + index + 1}</td>
                      <td className={block("code")}>{item.code}</td>
                      <td>{item.name}</td>
                      <td>
                        <span
                          className={block("tag", [
                            item.objectKind === "ambiguous" ? "ambiguous" : "",
                          ])}
                          title="Вид выведен из раздела кода ОКПД2: это косвенный сигнал для сверки с предметом, а не юридический вывод"
                        >
                          {OKPD2_OBJECT_KIND_LABELS[item.objectKind] ??
                            OKPD2_OBJECT_KIND_LABELS.unknown}
                        </span>
                      </td>
                      <td>
                        {auctionCheck.inAuctionList ? (
                          <span
                            className={block("tag", ["auction"])}
                            title={auctionCheck.note ?? AUCTION_LIST_ACT_TITLE}
                          >
                            Электронный аукцион
                          </span>
                        ) : auctionCheck.excludedByException ? (
                          <span
                            className={block("tag", ["exception"])}
                            title={auctionCheck.note}
                          >
                            Исключение (допустим конкурс)
                          </span>
                        ) : (
                          <span
                            className={block("tag")}
                            title={auctionCheck.note}
                          >
                            Не входит
                          </span>
                        )}
                      </td>
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
                  );
                })}
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

      {/* Проверка кода: нормирование и вхождение в аукционный перечень № 471-р */}
      <Okpd2CodeCheck dictionary={dictionary} />
    </section>
  );
}

// Мини-проверка кода: позволяет убедиться, что позиция подпадает под
// обязательное нормирование и/или аукционный перечень № 471-р
function Okpd2CodeCheck({
  dictionary,
}: {
  dictionary: ReturnType<typeof useOkpd2Dictionary>["data"];
}) {
  const { bem } = useUtils();
  const block = bem(styles, "okpd2-dictionary");
  const [code, setCode] = useState("");

  const matched = findOkpd2ByCode(dictionary ?? [], code);
  const auctionCheck = checkOkpd2AuctionList(code, dictionary ?? []);
  const showResult = code.trim().length >= 2;

  return (
    <div className={block("check")}>
      <label className={block("control")}>
        <span className={block("control-caption")}>
          Проверка кода на нормирование и аукционный перечень (РП № 471-р)
        </span>
        <input
          className={block("search")}
          type="text"
          placeholder="Например, 31.01.11.130 или 62.01"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>

      {showResult && (
        <>
          <p
            className={block(
              "status",
              matched?.isNormed ? ["warning"] : matched ? [] : ["error"],
            )}
          >
            {!matched &&
              `Код «${code}» отсутствует в локальном справочнике (проверка 471-р выполнена по группировке ОКПД2).`}
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

          <p
            className={block(
              "status",
              auctionCheck.inAuctionList ? ["warning"] : [],
            )}
          >
            {auctionCheck.inAuctionList ? (
              <>
                <strong>Аукционный перечень ({AUCTION_LIST_ACT_TITLE}):</strong>{" "}
                код {auctionCheck.code} включён в перечень —{" "}
                <strong>обязателен электронный аукцион</strong> (проведение
                конкурса запрещено по ч. 6 ст. 24 Закона № 44-ФЗ, кроме запроса
                котировок и закупки у ед. поставщика).
              </>
            ) : auctionCheck.excludedByException ? (
              <>
                <strong>Аукционный перечень ({AUCTION_LIST_ACT_TITLE}):</strong>{" "}
                {auctionCheck.note}
              </>
            ) : (
              <>
                <strong>Аукционный перечень ({AUCTION_LIST_ACT_TITLE}):</strong>{" "}
                код {auctionCheck.code} не включён в перечень — допускается
                проведение как конкурса, так и электронного аукциона.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
