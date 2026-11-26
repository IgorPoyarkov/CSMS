import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
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

export default function NpaLibraryPage() {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "npa-library");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: library, isLoading, isError, error } = useNpaLibrary();

  // Фильтры живут в URL: ссылку на выбранный вид/статус можно скопировать.
  const query = searchParams.get("q") ?? "";
  const kind = searchParams.get("kind") ?? "all";
  const status = searchParams.get("status") ?? "all";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const visible = useMemo(() => {
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
  }, [library, query, kind, status]);

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
            и переходом к статье. По умолчанию показывается текущая редакция.
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
      </div>

      {isLoading && (
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

      {!isLoading && !isError && visible.length === 0 && (
        <p className={block("empty")}>По выбранным фильтрам актов не найдено.</p>
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
        </p>
      )}
    </section>
  );
}
