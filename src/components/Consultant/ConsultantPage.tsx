import { useRef, useState, type FormEvent } from "react";
import useUtils from "../../hooks/useUtils";
import {
  useAskConsultant,
  useConsultantStatus,
  type ConsultantAnswer,
} from "../../services/Consultant/consultant.api";
import styles from "./ConsultantPage.module.scss";

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [module, setModule] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const ready = Boolean(statusQuery.data?.ready);
  const busy = ask.isPending;
  const statusText = statusQuery.isPending
    ? "Проверка индекса…"
    : statusQuery.data?.building
      ? "Индекс строится, это займёт около минуты"
      : ready
        ? `Готово: ${statusQuery.data?.chunks ?? 0} фрагментов · ${statusQuery.data?.chatModel ?? "локальная модель"}`
        : "Индекс недоступен — запустите npm run consultant:server";

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
                          {citation.url ? (
                            <a href={citation.url} target="_blank" rel="noreferrer">
                              {citation.title}
                            </a>
                          ) : (
                            citation.title
                          )}
                          {citation.ref ? ` · ${citation.ref}` : ""}
                        </p>
                        <p className={page("citation-quote")}>{citation.quote}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {message.answer && (
                <p className={page("meta")}>
                  {message.answer.refusal
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
    </section>
  );
};

function axiosMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "неизвестная ошибка";
}

export default ConsultantPage;
