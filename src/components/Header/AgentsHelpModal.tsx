import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import { AGENTS_HELP, type AgentHelpStatus } from "./agentsHelp.config";
import styles from "./AgentsHelpModal.module.scss";

interface AgentsHelpModalProps {
  onClose: () => void;
}

const STATUS_TITLE: Record<AgentHelpStatus, string> = {
  ok: "Работает",
  partial: "Частично",
  blocked: "Ограничено",
};

/**
 * Справка из шапки: короткая карта программных агентов CSMS.
 *
 * Полный текст лежит в csms-api/docs/agents.md; здесь оставлено только то,
 * что нужно вспомнить по памяти: кто что делает, где живёт и что мешает.
 * Это не ассистенты-разработчики (Koda, Google AI Studio), а воркеры системы.
 */
const AgentsHelpModal = ({ onClose }: AgentsHelpModalProps) => {
  const { bem } = useUtils();
  const modal = bem(styles, "agents-help");

  return (
    <CustomModal onClose={onClose}>
      <div className={modal()} role="dialog" aria-modal="true">
        <header className={modal("header")}>
          <div>
            <h2 className={modal("title")}>Справка: агенты CSMS</h2>
            <p className={modal("subtitle")}>
              Программные агенты и воркеры системы. Полная карта —{" "}
              <code>csms-api/docs/agents.md</code>.
            </p>
          </div>
          <button
            type="button"
            className={modal("close")}
            onClick={onClose}
            aria-label="Закрыть справку"
          >
            ×
          </button>
        </header>

        <div className={modal("body")}>
          {AGENTS_HELP.map((agent) => (
            <article className={modal("card")} key={agent.title}>
              <div className={modal("card-head")}>
                <div>
                  <h3 className={modal("card-title")}>{agent.title}</h3>
                  <span className={modal("kind")}>{agent.kind}</span>
                </div>
                <span className={modal("status", [agent.status])}>
                  {STATUS_TITLE[agent.status]}: {agent.statusLabel}
                </span>
              </div>

              <p className={modal("summary")}>{agent.summary}</p>
              <div className={modal("place")}>
                <span>Где:</span> <code>{agent.place}</code>
              </div>

              <ul className={modal("details")}>
                {agent.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <footer className={modal("footer")}>
          Брифы для следующих агентов — <code>csms-api/docs/tasks/</code>.
          Первые абзацы брифов НПА устарели: второй агент уже реализован.
        </footer>
      </div>
    </CustomModal>
  );
};

export default AgentsHelpModal;
