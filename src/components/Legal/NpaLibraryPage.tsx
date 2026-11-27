import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useStandardContractTerms } from "../../services/Npa/standardContractTerms.api";
import {
  useNpaLibrary,
  type NpaLibraryItem,
} from "../../services/Consultant/npaLibrary.api";
import CustomButton from "../UI/CustomButton";
import Loader from "../UI/Loader";
import Select from "../UI/Select";
import styles from "./NpaLibraryPage.module.scss";

const STATUS_LABELS: Record<NpaLibraryItem["status"], string> = {
  available: "С локальным текстом",
  "missing-card": "Нет официальной карточки",
  future: "Будущая редакция",
  archive: "Архивная редакция",
  "no-text": "Нет текста для просмотра",
};

/** Отдельный фильтр для актов, установленных Правительством РФ. */
const TERMS_FILTER_LABELS = {
  all: "Все акты и типовые условия",
  standard: "Только типовые условия контрактов",
  government: "Принятые Правительством РФ (всегда)",
} as const;

type TermsFilter = keyof typeof TERMS_FILTER_LABELS;

const isTermsFilter = (value: string): value is TermsFilter =>
  Object.hasOwn(TERMS_FILTER_LABELS, value);

/** pravo.gov.ru отдаёт дату редакции как yyyyMMdd — форматируем без Date, чтобы не сдвинуть день по таймзоне. */
const formatRedDate = (value: string) =>
  value.length === 8
    ? `${value.slice(6, 8)}.${value.slice(4, 6)}.${value.slice(0, 4)}`
    : value;

export default function NpaLibraryPage() {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "npa-library");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: library, isLoading, isError, error } = useNpaLibrary();
  const {
    data: termsCatalog,
    isLoading: isTermsLoading,
    isError: isTermsError,
    error: termsError,
  } = useStandardContractTerms();

  // Фильтры живут в URL: ссылку на выбранный вид/статус можно скопировать.
  const query = searchParams.get("q") ?? "";
  const kind = searchParams.get("kind") ?? "all";
  const status = searchParams.get("status") ?? "all";
  const rawTerms = searchParams.get("terms") ?? "all";
  const termsFilter: TermsFilter = isTermsFilter(rawTerms) ? rawTerms : "all";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  // Статический каталог и типовые условия — разные источники. При выборе
  // отдельного фильтра остаются только акты csms-api с признаком ПП РФ.
  const visible = useMemo(() => {
    if (termsFilter !== "all") return [];
    const normalized = query.trim().toLowerCase();
    const items = library?.items ?? [];
    return items.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (status !== "all" && item.status !== status) return false;
      if (!normalized) return true;
      return [item.title, item.shortName, item.number, item.id, item.actId]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [library, query, kind, status, termsFilter]);

  const visibleTerms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = termsCatalog?.items ?? [];
    return items.filter((item) => {
      if (termsFilter === "government" && !item.isGovernment) return false;
      if (!normalized) return true;
      return [item.title, item.number, item.code, item.passing, item.text]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [termsCatalog, termsFilter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, NpaLibraryItem[]>();
    for (const item of visible) {
      const list = map.get(item.kind) ?? [];
      list.push(item);
      map.set(item.kind, list);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div>
          <h1 className={block("title")}>Библиотека НПА</h1>
          <p className={block("subtitle")}>
            Все нормативные акты, которые использует проект. Документы открываются
            в том же просмотре, что и цитаты консультанта: с оглавлением по главам
            и переходом к статье. Типовые условия контрактов приходят из csms-api
            и показываются в актуальной редакции pravo.gov.ru.
          </p>
        </div>
        {library && (
          <div className={block("totals")}>
            <span className={block("total", ["ok"])}>
              <b>{library.available}</b> с текстом
            </span>
            <span className={block("total", ["warn"])}>
              <b>{library.missingCard}</b> без карточки
            </span>
            <span className={block("total")}>
              <b>{library.indexedChunks}</b> фрагментов в индексе
            </span>
            {termsCatalog && (
              <span className={block("total", ["ok"])}>
                <b>{termsCatalog.items.length}</b> типовых условий контрактов
              </span>
            )}
          </div>
        )}
      </header>

      <div className={block("filters")}>
        {/* Как и в соседнем реестре НПА, поиск — обычное поле type="search":
            это не поле формы и не значение react-hook-form. */}
        <input
          className={block("search")}
          type="search"
          value={query}
          placeholder="Название, номер или аббревиатура"
          onChange={(event) => setParam("q", event.target.value)}
          aria-label="Поиск по библиотеке НПА"
        />
        <Select
          className={block("select")}
          value={kind}
          onChange={(event) => setParam("kind", event.target.value)}
          aria-label="Вид акта"
        >
          <option value="all">Все виды</option>
          {(library?.kinds ?? []).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select
          className={block("select")}
          value={status}
          onChange={(event) => setParam("status", event.target.value)}
          aria-label="Доступность текста"
        >
          <option value="all">Любой статус</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          className={block("select", ["terms"])}
          value={termsFilter}
          onChange={(event) => setParam("terms", event.target.value)}
          aria-label="Типовые условия контрактов"
        >
          {Object.entries(TERMS_FILTER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {(isLoading || isTermsLoading) && (
        <div className={block("loading")} aria-label="Загрузка каталога">
          <Loader count={8} size={120} />
        </div>
      )}

      {isError && (
        <p className={block("error")}>
          Не удалось загрузить каталог НПА: {String((error as Error)?.message ?? "")}
          . Пересоберите его командой `node scripts/consultant/build-npa-library.mjs`.
        </p>
      )}

      {isTermsError && (
        <p className={block("error")}>
          Не удалось загрузить типовые условия контрактов из csms-api:{" "}
          {String((termsError as Error)?.message ?? "")}. Остальные акты доступны.
        </p>
      )}

      {!isLoading &&
        !isTermsLoading &&
        !isError &&
        !isTermsError &&
        visible.length === 0 &&
        visibleTerms.length === 0 && (
          <p className={block("empty")}>По выбранным фильтрам актов не найдено.</p>
        )}

      {visibleTerms.length > 0 && (
        <section className={block("group")}>
          <h2 className={block("group-title")}>
            Типовые условия контрактов <span>{visibleTerms.length}</span>
          </h2>
          <p className={block("group-hint")}>
            Установлены Правительством РФ по ч. 11 ст. 34 44-ФЗ и подлежат
            применению заказчиками — работают всегда. Текст — дословно из
            актуальной редакции pravo.gov.ru.
          </p>
          <div className={block("list")}>
            {visibleTerms.map((item) => (
              <article className={block("card", ["official"])} key={item.code}>
                <div className={block("card-main")}>
                  <p className={block("card-kind")}>
                    {item.passing}
                    {` · редакция от ${formatRedDate(item.redDate)}`}
                  </p>
                  <p className={block("card-title")}>{item.title}</p>
                  <div className={block("badges")}>
                    {item.isGovernment && (
                      <span className={block("badge", ["government"])}>
                        Принято Правительством РФ
                      </span>
                    )}
                    {item.alwaysApplies && (
                      <span className={block("badge", ["always"])}>
                        Применяется всегда
                      </span>
                    )}
                  </div>
                  <p className={block("card-meta")}>{item.state}</p>
                  <details className={block("terms-text")}>
                    <summary>Текст актуальной редакции</summary>
                    <div className={block("terms-text-body")}>{item.text}</div>
                  </details>
                </div>
                <div className={block("card-actions")}>
                  <a
                    className={block("card-link")}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Текст на pravo.gov.ru ↗
                  </a>
                  <a
                    className={block("card-link")}
                    href={item.cardUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Карточка ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {groups.map(([groupKind, items]) => (
        <section className={block("group")} key={groupKind}>
          <h2 className={block("group-title")}>
            {groupKind} <span>{items.length}</span>
          </h2>
          <div className={block("list")}>
            {items.map((item) => (
              <article
                className={block("card", item.status === "available" ? [] : ["unavailable"])}
                key={item.id}
              >
                <div className={block("card-main")}>
                  <p className={block("card-kind")}>
                    {item.shortName}
                    {item.number ? ` · № ${item.number}` : ""}
                    {item.date ? ` · редакция от ${formatDate(item.date)}` : ""}
                  </p>
                  {item.viewerUrl ? (
                    <Link className={block("card-title")} to={item.viewerUrl}>
                      {item.title}
                    </Link>
                  ) : (
                    <p className={block("card-title")}>{item.title}</p>
                  )}
                  <p className={block("card-meta")}>
                    {STATUS_LABELS[item.status]}
                    {item.chunks ? ` · ${item.chunks} фрагментов в индексе` : " · в поиск не попадает"}
                  </p>
                  {item.note && <p className={block("card-note")}>{item.note}</p>}
                </div>
                <div className={block("card-actions")}>
                  {item.viewerUrl && (
                    <CustomButton
                      configuration={{
                        button: {
                          name: "open",
                          value: "Открыть",
                          type: "button",
                        },
                      }}
                      ariaLabel={`Открыть ${item.shortName}`}
                      onClick={() => navigate(item.viewerUrl)}
                    />
                  )}
                  {item.wordUrl && (
                    <a className={block("card-link")} href={item.wordUrl}>
                      Скачать Word
                    </a>
                  )}
                  {item.cardUrl && (
                    <a
                      className={block("card-link")}
                      href={item.cardUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Карточка ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {library && (
        <p className={block("footnote")}>
          Каталог собран {formatDate(library.builtAt)} из карточек pravo.gov.ru и
          загруженных локальных копий. Акты без официальной карточки не индексируются и
          не цитируются консультантом.
          {termsCatalog &&
            ` Типовые условия обновлены в csms-api ${formatDate(termsCatalog.generatedAt)}.`}
        </p>
      )}
    </section>
  );
}
