import { useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import {
  useStandardContractTerms,
  type StandardContractTerm,
} from "../../services/Npa/standardContractTerms.api";
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

/** Та же группа, что у остальных постановлений статического каталога. */
const TERMS_KIND = "Постановление Правительства";

type CardLink = { label: string; href: string; external?: boolean };

/** Единая модель карточки: акты из каталога и типовые условия из csms-api. */
type LibraryCard = {
  id: string;
  kind: string;
  kindLabel: string;
  number: string;
  date: string;
  title: string;
  status: NpaLibraryItem["status"];
  viewerUrl: string;
  meta: string;
  note: string;
  links: CardLink[];
  /** Признаки ПП РФ и полный текст, если акт — типовое условие контракта. */
  term?: StandardContractTerm;
};

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

  const toCard = useCallback((item: NpaLibraryItem): LibraryCard => ({
    id: item.id,
    kind: item.kind,
    kindLabel: item.shortName,
    number: item.number,
    date: formatDate(item.date),
    title: item.title,
    status: item.status,
    viewerUrl: item.viewerUrl,
    meta:
      `${STATUS_LABELS[item.status]}` +
      (item.chunks ? ` · ${item.chunks} фрагментов в индексе` : " · в поиск не попадает"),
    note: item.note,
    links: [
      item.wordUrl ? { label: "Скачать Word", href: item.wordUrl } : null,
      item.cardUrl
        ? { label: "Карточка ↗", href: item.cardUrl, external: true }
        : null,
    ].filter((link): link is CardLink => link !== null),
  }), [formatDate]);

  // Акт из csms-api подаётся в карточке каталога: те же поля, та же группировка.
  // У ПП РФ № 1466 уже есть локальный текст — помечаем существующую карточку,
  // а не дублируем её. Остальные три акта получают карточку без просмотра,
  // как и документы каталога без загруженного текста.
  const toTermCard = useCallback((item: StandardContractTerm): LibraryCard => ({
    id: `standard-${item.code}`,
    kind: TERMS_KIND,
    kindLabel: /Постановление Правительства/i.test(item.passing)
      ? `ПП РФ № ${item.number}`
      : item.passing,
    number: item.number,
    date: formatRedDate(item.redDate),
    title: item.title,
    status: "available",
    viewerUrl: "",
    meta: `${item.state} · текст из актуальной редакции pravo.gov.ru`,
    note: "",
    links: [
      { label: "Текст на pravo.gov.ru ↗", href: item.sourceUrl, external: true },
      { label: "Карточка ↗", href: item.cardUrl, external: true },
    ],
    term: item,
  }), []);

  const cards = useMemo(() => {
    const result = (library?.items ?? []).map(toCard);
    const byNumber = new Map(result.map((card) => [card.number, card]));
    for (const term of termsCatalog?.items ?? []) {
      const existing = byNumber.get(term.number);
      if (existing) existing.term = term;
      else result.push(toTermCard(term));
    }
    return result;
  }, [library, termsCatalog, toCard, toTermCard]);

  const visibleCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (termsFilter === "standard" && !card.term) return false;
      if (termsFilter === "government" && !card.term?.isGovernment) return false;
      if (kind !== "all" && card.kind !== kind) return false;
      if (status !== "all" && card.status !== status) return false;
      if (!normalized) return true;
      return [
        card.title,
        card.kindLabel,
        card.number,
        card.id,
        card.term?.passing,
        card.term?.text,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [cards, termsFilter, kind, status, query]);

  const groups = useMemo(() => {
    const map = new Map<string, LibraryCard[]>();
    for (const card of visibleCards) {
      const list = map.get(card.kind) ?? [];
      list.push(card);
      map.set(card.kind, list);
    }
    return [...map.entries()];
  }, [visibleCards]);

  // Одна разметка карточки для каталога и для csms-api: отличаются только
  // бейджи ПП РФ и раскрываемый текст у актов без локального просмотра.
  const renderCard = (card: LibraryCard) => (
    <article
      className={block("card", card.status === "available" ? [] : ["unavailable"])}
      key={card.id}
    >
      <div className={block("card-main")}>
        <p className={block("card-kind")}>
          {card.kindLabel}
          {card.number ? ` · № ${card.number}` : ""}
          {card.date ? ` · редакция от ${card.date}` : ""}
        </p>
        {card.viewerUrl ? (
          <Link className={block("card-title")} to={card.viewerUrl}>
            {card.title}
          </Link>
        ) : (
          <p className={block("card-title")}>{card.title}</p>
        )}
        {card.term && (
          <div className={block("badges")}>
            {card.term.isGovernment && (
              <span className={block("badge", ["government"])}>
                Принято Правительством РФ
              </span>
            )}
            {card.term.alwaysApplies && (
              <span className={block("badge", ["always"])}>
                Применяется всегда
              </span>
            )}
          </div>
        )}
        <p className={block("card-meta")}>{card.meta}</p>
        {card.note && <p className={block("card-note")}>{card.note}</p>}
        {card.term && !card.viewerUrl && (
          <details className={block("terms-text")}>
            <summary>Текст актуальной редакции</summary>
            <div className={block("terms-text-body")}>{card.term.text}</div>
          </details>
        )}
      </div>
      <div className={block("card-actions")}>
        {card.viewerUrl && (
          <CustomButton
            configuration={{
              button: {
                name: "open",
                value: "Открыть",
                type: "button",
              },
            }}
            ariaLabel={`Открыть ${card.kindLabel}`}
            onClick={() => navigate(card.viewerUrl)}
          />
        )}
        {card.links.map((link) => (
          <a
            className={block("card-link")}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noreferrer" : undefined}
            key={`${card.id}-${link.label}`}
          >
            {link.label}
          </a>
        ))}
      </div>
    </article>
  );

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div>
          <h1 className={block("title")}>Библиотека НПА</h1>
          <p className={block("subtitle")}>
            Все нормативные акты, которые использует проект. Документы открываются
            в том же просмотре, что и цитаты консультанта: с оглавлением по главам
            и переходом к статье. Типовые условия контрактов из csms-api подаются
            в таких же карточках и помечаются бейджем Правительства РФ.
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
        visibleCards.length === 0 && (
          <p className={block("empty")}>По выбранным фильтрам актов не найдено.</p>
        )}

      {groups.map(([groupKind, items]) => (
        <section className={block("group")} key={groupKind}>
          <h2 className={block("group-title")}>
            {groupKind} <span>{items.length}</span>
          </h2>
          <div className={block("list")}>{items.map(renderCard)}</div>
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
