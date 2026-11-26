import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import CustomButton from "../UI/CustomButton";
import CustomModal from "../UI/CustomModal";
import Select from "../UI/Select";
import useUtils from "../../hooks/useUtils";
import {
  useAskConsultant,
  useConsultantStatus,
  type ConsultantAnswer,
} from "../../services/Consultant/consultant.api";
import { useNpaLibrary } from "../../services/Consultant/npaLibrary.api";
import styles from "./ConsultantPage.module.scss";
import {
  anchorFromRef,
  parseLawDocument,
  splitDocumentRefs,
  type DocBlock,
} from "./consultantDocument";

// Модули из карты «модуль → валидация → норма» в docs/legal/ai-consultant-44fz.md.
const MODULES = [
  { value: "", label: "Общий вопрос" },
  { value: "PurchasePlan", label: "План-график" },
  { value: "PurchaseNote", label: "СЗ / ООЗ / НМЦК" },
  { value: "NoticeInfo", label: "Извещение" },
  { value: "ContractProject", label: "Проект контракта" },
  { value: "ContractRegistry", label: "Реестр контрактов" },
  { value: "ContractSmp", label: "СМП / СОНКО" },
  { value: "Acceptance", label: "Приёмка" },
  { value: "ContractChange", label: "Изменение контракта" },
];

const EXAMPLES = [
  "Можно ли изменить существенные условия контракта?",
  "Что указывать в описании объекта закупки?",
  "Что входит в исполнение контракта?",
];

const EDITION_ROLES: Record<string, string> = {
  actual: "действующая",
  future: "будущая",
  archive: "архивная",
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  answer?: ConsultantAnswer;
}

const nextId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const ConsultantPage = () => {
  const { bem } = useUtils();
  const page = bem(styles, "consultant");
  const statusQuery = useConsultantStatus();
  const ask = useAskConsultant();
  const libraryQuery = useNpaLibrary();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [module, setModule] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docRef, setDocRef] = useState("");
  const [docBlocks, setDocBlocks] = useState<DocBlock[]>([]);
  const [docAnchor, setDocAnchor] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    () => new Set(),
  );
  const [docMissing, setDocMissing] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const docBodyRef = useRef<HTMLDivElement>(null);

  const ready = Boolean(statusQuery.data?.ready);
  const busy = ask.isPending;
  const statusText = statusQuery.isPending
    ? "Проверка индекса…"
    : statusQuery.data?.building
      ? "Индекс строится, это займёт около минуты"
      : ready
        ? `Готово: ${statusQuery.data?.chunks ?? 0} фрагментов · ${statusQuery.data?.chatModel ?? "локальная модель"}`
        : "Индекс недоступен — запустите npm run consultant:server";

  const isLocalSource = (url?: string | null) => Boolean(url && url.startsWith("/api/consultant/source/"));
  // Markdown сохраняет структуру документа: заголовки статей и части paragraphs.
  const toSourceUrl = (url: string, format: "md" | "doc") => {
    if (url.startsWith("/api/consultant/source/npa/")) {
      const u = new URL(url, window.location.origin);
      u.searchParams.set("format", format);
      return u.pathname + u.search;
    }
    return url;
  };

  // Открываем тот же просмотр в новой вкладке — сразу на нужной статье.
  const viewerHref = (url: string, ref: string, title: string) => {
    const params = new URLSearchParams({ doc: url, ref, title });
    return `/consultant?${params.toString()}`;
  };

  const chapters = useMemo(
    () => docBlocks.filter((block) => block.kind === "chapter"),
    [docBlocks],
  );
  const articles = useMemo(
    () => docBlocks.filter((block) => block.kind === "article" && block.id),
    [docBlocks],
  );
  const articlesByChapter = useMemo(() => {
    const map = new Map<string, DocBlock[]>();
    for (const article of articles) {
      if (!article.chapterId) continue;
      const list = map.get(article.chapterId) ?? [];
      list.push(article);
      map.set(article.chapterId, list);
    }
    return map;
  }, [articles]);
  const knownAnchors = useMemo(
    () =>
      new Set(
        docBlocks
          .map((block) => block.id)
          .filter((id): id is string => Boolean(id)),
      ),
    [docBlocks],
  );
  // Редакции выбираем внутри уже открытого документа, а не списком в библиотеке.
  const docSlug = docUrl?.match(/\/api\/consultant\/source\/npa\/([^?]+)/)?.[1] ?? "";
  const docEditions = useMemo(() => {
    if (!docSlug) return [];
    const item = libraryQuery.data?.items.find(
      (entry) =>
        entry.slug === docSlug ||
        entry.editions.some((edition) => edition.slug === docSlug),
    );
    return item?.editions ?? [];
  }, [docSlug, libraryQuery.data]);

  // «ч. 1 ст. 34» даёт якорь article-34-part-1, а в меню нужна сама статья.
  const selectedArticleId = docAnchor?.startsWith("article-")
    ? docAnchor.replace(/-part-.+$/, "")
    : null;

  const scrollToBlock = useCallback((id?: string | null) => {
    const body = docBodyRef.current;
    if (!body) return false;
    if (!id) {
      body.scrollTop = 0;
      return false;
    }
    const target = body.querySelector<HTMLElement>(`[id="${id}"]`);
    if (!target) {
      body.scrollTop = 0;
      return false;
    }
    // Явный scrollTop: scrollIntoView прокручивает и модальное окно, и body.
    body.scrollTop =
      target.getBoundingClientRect().top -
      body.getBoundingClientRect().top +
      body.scrollTop - 12;
    return true;
  }, []);

  const updateActiveChapter = useCallback(() => {
    const body = docBodyRef.current;
    if (!body) return;
    // scrollToBlock оставляет 12px над блоком, поэтому порог 24px:
    // иначе выбранная глава определялась бы как предыдущая.
    const top = body.getBoundingClientRect().top + 24;
    if (chapters.length) {
      let current = chapters[0].id ?? null;
      for (const chapter of chapters) {
        const element = body.querySelector<HTMLElement>(`[id="${chapter.id}"]`);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= top) current = chapter.id ?? null;
        else break;
      }
      setActiveChapter((prev) => (prev === current ? prev : current));
    }
    let currentArticle: string | null = null;
    for (const article of articles) {
      const element = body.querySelector<HTMLElement>(`[id="${article.id}"]`);
      if (!element) continue;
      if (element.getBoundingClientRect().top <= top) currentArticle = article.id ?? null;
      else break;
    }
    setActiveArticle((prev) => (prev === currentArticle ? prev : currentArticle));
  }, [chapters, articles]);

  // Переход по ссылке внутри текста закона: обновляем и прокрутку, и меню.
  const navigateToAnchor = useCallback(
    (anchor: string) => {
      scrollToBlock(anchor);
      const articleId = anchor.startsWith("article-")
        ? anchor.replace(/-part-.+$/, "")
        : null;
      const article = articleId
        ? articles.find((item) => item.id === articleId)
        : undefined;
      if (article) {
        setActiveArticle(article.id ?? null);
        setActiveChapter(article.chapterId ?? null);
        const chapterId = article.chapterId;
        if (chapterId) {
          setExpandedChapters((prev) =>
            prev.has(chapterId) ? prev : new Set(prev).add(chapterId),
          );
        }
      } else {
        requestAnimationFrame(updateActiveChapter);
      }
    },
    [articles, scrollToBlock, updateActiveChapter],
  );

  const renderLinkedText = (text: string) =>
    splitDocumentRefs(text, knownAnchors).map((segment, index) => {
      const anchor = segment.anchor;
      if (!anchor) return <Fragment key={index}>{segment.text}</Fragment>;
      return (
        <a
          key={index}
          href={`#${anchor}`}
          className={page("doc-norm-link")}
          onClick={(event) => {
            event.preventDefault();
            navigateToAnchor(anchor);
          }}
        >
          {segment.text}
        </a>
      );
    });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("doc");
    if (fromUrl && isLocalSource(fromUrl)) {
      setDocUrl(fromUrl);
      setDocTitle(params.get("title") ?? "Документ");
      setDocRef(params.get("ref") ?? "");
    }
    // При открытии страницы с параметрами — один раз, без слежения за роутом.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!docUrl) return;
    let alive = true;
    const anchor = anchorFromRef(docRef);
    setDocLoading(true);
    setDocError(null);
    setDocBlocks([]);
    setDocAnchor(anchor);
    setDocMissing(false);
    setActiveChapter(null);
    setActiveArticle(null);
    setExpandedChapters(new Set());
    fetch(toSourceUrl(docUrl, "md"), { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (alive) setDocBlocks(parseLawDocument(text));
      })
      .catch((e) => { if (alive) setDocError(e instanceof Error ? e.message : "Не удалось загрузить документ"); })
      .finally(() => { if (alive) setDocLoading(false); });
    return () => { alive = false; };
  }, [docUrl, docRef]);

  useEffect(() => {
    if (docLoading || docError || !docBlocks.length) return;
    // При выбранной норме раскрываем её статью в боковом содержании.
    const article = selectedArticleId
      ? articles.find((item) => item.id === selectedArticleId)
      : undefined;
    if (article) {
      setActiveArticle(article.id ?? null);
      const chapterId = article.chapterId;
      if (chapterId) {
        setExpandedChapters((prev) =>
          prev.has(chapterId) ? prev : new Set(prev).add(chapterId),
        );
      }
    }
    const frame = requestAnimationFrame(() => {
      const found = scrollToBlock(docAnchor);
      setDocMissing(Boolean(docAnchor) && !found);
      updateActiveChapter();
    });
    return () => cancelAnimationFrame(frame);
  }, [docBlocks, docAnchor, articles, selectedArticleId, docLoading, docError, scrollToBlock, updateActiveChapter]);

  const openDoc = (url: string, title: string, ref?: string | null) => {
    setDocTitle(title);
    setDocRef(ref ?? "");
    setDocUrl(url);
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || busy || !ready) return;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: question }]);
    setDraft("");
    ask.mutate(
      { question, module: module || undefined },
      {
        onSuccess: (answer) => {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", text: answer.answer, answer },
          ]);
          requestAnimationFrame(() =>
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
          );
        },
        onError: (error) => {
          const text = axiosMessage(error);
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", text: `Не удалось получить ответ: ${text}` },
          ]);
        },
      },
    );
  };

  return (
    <section className={page()}>
      <header className={page("head")}>
        <div>
          <h1 className={page("title")}>Консультант по 44-ФЗ</h1>
          <p className={page("subtitle")}>
            Ответы только по загруженным редакциям норм, XSD ЕИС и документации CSMS.
            Модель работает локально, данные закупок наружу не уходят.
          </p>
        </div>
        <div className={page("status", ready ? ["ready"] : ["error"])}>
          <span className={page("status-dot")} aria-hidden="true" />
          {statusText}
        </div>
      </header>

      <div className={page("toolbar")}>
        <label className={page("module")}>
          <span className={page("module-label")}>Контекст экрана</span>
          <select
            className={page("select")}
            value={module}
            onChange={(event) => setModule(event.target.value)}
          >
            {MODULES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {messages.length > 0 && (
          <button type="button" className={page("clear")} onClick={() => setMessages([])}>
            Очистить диалог
          </button>
        )}
      </div>

      <div className={page("chat")} aria-live="polite">
        {messages.length === 0 ? (
          <div className={page("empty")}>
            <p className={page("empty-title")}>Задайте вопрос по закупке</p>
            <p className={page("empty-text")}>
              Консультант связывает вопрос с нормой и показывает цитату. Если нормы в
              индексе нет — он честно откажет, а не придумает ответ.
            </p>
            <div className={page("examples")}>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className={page("example")}
                  onClick={() => setDraft(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={page("message", [message.role === "user" ? "user" : "assistant"])}
            >
              <p className={page("message-role")}>
                {message.role === "user" ? "Вы" : "Консультант"}
              </p>
              <p className={page("bubble")}>{message.text}</p>
              {message.answer?.citations && message.answer.citations.length > 0 && (
                <div className={page("citations")}>
                  <p className={page("citations-title")}>Источники ответа</p>
                  {message.answer.citations.map((citation) => (
                    <div className={page("citation")} key={`${message.id}-${citation.n}`}>
                      <span className={page("citation-num")}>{citation.n}</span>
                      <div>
                        <p className={page("citation-title")}>
                          {citation.url && isLocalSource(citation.url) ? (
                            <button type="button" className={page("citation-link")} onClick={() => openDoc(citation.url!, citation.title, citation.ref)}>
                              {citation.title}
                            </button>
                          ) : citation.url ? (
                            <a href={citation.url} target="_blank" rel="noreferrer">
                              {citation.title}
                            </a>
                          ) : (
                            citation.title
                          )}
                          {citation.ref ? ` · ${citation.ref}` : ""}
                          {citation.externalUrl && citation.externalUrl !== citation.url ? (
                            <>
                              {" "}
                              <a href={citation.externalUrl} target="_blank" rel="noreferrer">
                                внешний источник
                              </a>
                            </>
                          ) : null}
                          {citation.url && isLocalSource(citation.url) ? (
                            <>
                              {" "}
                              <a
                                href={viewerHref(citation.url, citation.ref ?? "", citation.title)}
                                target="_blank"
                                rel="noreferrer"
                                className={page("citation-ext")}
                              >
                                в статье ↗
                              </a>
                            </>
                          ) : null}
                        </p>
                        <p className={page("citation-quote")}>{citation.quote}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {message.answer && (
                <p className={page("meta")}>
                  {message.answer.refusal && !message.answer.citations?.length
                    ? "Норма в загруженном индексе не найдена"
                    : `Уверенность: ${Math.round(message.answer.confidence * 100)}%`}
                  {message.answer.latencyMs
                    ? ` · ${(message.answer.latencyMs / 1000).toFixed(1)} с`
                    : ""}
                </p>
              )}
            </article>
          ))
        )}
        {busy && <p className={page("thinking")}>Консультант читает нормы и готовит ответ…</p>}
        <div ref={bottomRef} />
      </div>

      <form className={page("form")} onSubmit={submit}>
        <input
          className={page("input")}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Например: какие сроки оплаты по 44-ФЗ?"
          aria-label="Вопрос консультанту"
          disabled={!ready || busy}
        />
        <button
          className={page("send")}
          type="submit"
          disabled={!ready || busy || !draft.trim()}
        >
          {busy ? "Ответ…" : "Спросить"}
        </button>
      </form>
      <p className={page("disclaimer")}>
        Справочно. Проверьте первоисточник и редакцию. Ответ не является юридическим
        заключением.
      </p>

      {docUrl && (
        <CustomModal onClose={() => setDocUrl(null)}>
          <div className={page("doc-modal")}>
            <div className={page("doc-close")}>
              <CustomButton
                configuration={{
                  button: { name: "close", value: "×", type: "button" },
                  defaultClass: false,
                }}
                ariaLabel="Закрыть"
                onClick={() => setDocUrl(null)}
              />
            </div>
            <div className={page("doc-head")}>
              <p className={page("doc-title")}>{docTitle || "Документ"}</p>
              <p className={page("doc-sub")}>
                Локальная копия из .tmp/pravo-downloads
                {docRef ? ` · ссылка: ${docRef}` : ""}
              </p>
            </div>
            <div className={page("doc-toolbar")}>
              {docEditions.length > 1 && (
                <label className={page("edition")}>
                  <span className={page("edition-label")}>Редакция</span>
                  <Select
                    className={page("edition-select")}
                    value={docSlug}
                    aria-label="Редакция документа"
                    onChange={(event) => {
                      const next = docEditions.find(
                        (edition) => edition.slug === event.target.value,
                      );
                      if (next) openDoc(next.sourceUrl, docTitle, docRef);
                    }}
                  >
                    {docEditions.map((edition) => {
                      const caption = edition.caption.split(",")[0];
                      return (
                        <option key={edition.slug} value={edition.slug}>
                          {edition.date}
                          {caption ? ` · ${caption}` : ""} ·{" "}
                          {EDITION_ROLES[edition.role] ?? edition.role}
                        </option>
                      );
                    })}
                  </Select>
                </label>
              )}
              <a
                className={page("doc-action")}
                href={viewerHref(docUrl, docRef, docTitle)}
                target="_blank"
                rel="noreferrer"
              >
                Открыть в статье
              </a>
              <a
                className={page("doc-action")}
                href={`${toSourceUrl(docUrl, "doc")}${docUrl.includes("?") ? "&" : "?"}download=1`}
              >
                Скачать Word
              </a>
            </div>
            <div className={page("doc-layout")}>
              {chapters.length > 0 && (
                <nav className={page("doc-nav")} aria-label="Навигация по главам">
                  <p className={page("doc-nav-title")}>Содержание</p>
                  {chapters.map((chapter) => {
                    const chapterId = chapter.id ?? "";
                    const chapterArticles = articlesByChapter.get(chapterId) ?? [];
                    const expanded = expandedChapters.has(chapterId);
                    return (
                      <div key={chapterId} className={page("doc-nav-group")}>
                        <a
                          href={`#${chapterId}`}
                          className={page("doc-nav-item", [
                            chapterId === activeChapter ? "active" : "",
                            expanded ? "expanded" : "",
                          ])}
                          aria-expanded={chapterArticles.length ? expanded : undefined}
                          aria-controls={chapterArticles.length ? `nav-${chapterId}` : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            if (chapterArticles.length) {
                              setExpandedChapters((prev) => {
                                const next = new Set(prev);
                                if (next.has(chapterId)) next.delete(chapterId);
                                else next.add(chapterId);
                                return next;
                              });
                            }
                            scrollToBlock(chapterId);
                            setActiveChapter(chapterId || null);
                          }}
                        >
                          <span className={page("doc-nav-caret")} aria-hidden="true">
                            {chapterArticles.length ? (expanded ? "▾" : "▸") : ""}
                          </span>
                          {chapter.text}
                        </a>
                        {expanded && chapterArticles.length > 0 && (
                          <div
                            id={`nav-${chapterId}`}
                            className={page("doc-nav-articles")}
                          >
                            {chapterArticles.map((article) => (
                              <a
                                key={article.id}
                                href={`#${article.id}`}
                                className={page("doc-nav-article", [
                                  article.id === activeArticle ? "active" : "",
                                ])}
                                onClick={(event) => {
                                  event.preventDefault();
                                  scrollToBlock(article.id);
                                  setActiveChapter(article.chapterId ?? null);
                                  setActiveArticle(article.id ?? null);
                                }}
                              >
                                {article.text}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              )}
              <div
                className={page("doc-body")}
                ref={docBodyRef}
                onScroll={updateActiveChapter}
              >
                {docLoading && <p className={page("thinking")}>Загрузка документа…</p>}
                {!docLoading && docError && <p className={page("doc-error")}>{docError}</p>}
                {docMissing && !docLoading && !docError && (
                  <p className={page("doc-hint")}>
                    Указанный фрагмент не найден в загруженной копии — показан весь документ.
                  </p>
                )}
                {!docLoading && !docError && docBlocks.map((block, index) => {
                  const key = `${index}-${block.id ?? ""}`;
                  if (block.kind === "chapter" || block.kind === "article") {
                    return (
                      <h3
                        key={key}
                        id={block.id}
                        className={page("doc-heading", [
                          block.kind,
                          block.id === selectedArticleId ? "target" : "",
                        ])}
                      >
                        {block.text}
                      </h3>
                    );
                  }
                  return (
                    <p
                      key={key}
                      id={block.id}
                      className={page("doc-paragraph", [
                        block.kind === "part" ? "part" : "",
                        block.kind === "item" ? "item" : "",
                        block.id && block.id === docAnchor ? "target" : "",
                      ])}
                    >
                      {renderLinkedText(block.text)}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </CustomModal>
      )}
    </section>
  );
};

function axiosMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "неизвестная ошибка";
}

export default ConsultantPage;
