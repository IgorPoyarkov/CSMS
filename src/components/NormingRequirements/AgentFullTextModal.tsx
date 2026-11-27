import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import useUtils from "../../hooks/useUtils";
import CustomButton from "../UI/CustomButton";
import CustomModal from "../UI/CustomModal";
import Loader from "../UI/Loader";
import type { OozAgentDocument } from "../../services/OozAgent/oozAgent.schema";
import styles from "./AgentFullTextModal.module.scss";

interface AgentFullTextModalProps {
  document: OozAgentDocument;
  onClose: () => void;
}

/**
 * Просмотр зафиксированного полного текста документа агента ООЗ.
 * Текст лежит в public/ и читается через React Query — ни ЕИС, ни LLM,
 * ни внешние сайты при открытии окна не вызываются.
 */
const AgentFullTextModal = ({ document, onClose }: AgentFullTextModalProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "agent-full-text");
  const url = document.fullTextUrl;

  const { data: text, isLoading, isError } = useQuery<string>({
    queryKey: ["oozAgentFullText", url],
    enabled: Boolean(url),
    retry: 1,
    queryFn: async () => {
      const { data } = await axios.get<string>(url as string, {
        timeout: 15_000,
      });
      return String(data);
    },
  });

  return (
    <CustomModal onClose={onClose}>
      <div className={block()}>
        <div className={block("head")}>
          <div className={block("heading")}>
            <h3 className={block("title")}>{document.name}</h3>
            <span className={block("meta")}>
              Зафиксированный текст из локального снимка
              {document.sourceUrl ? " · проверьте первоисточник" : ""}
            </span>
          </div>
          <CustomButton
            configuration={{
              button: { name: "close", value: "Закрыть", type: "button" },
            }}
            ariaLabel="Закрыть полный текст"
            onClick={onClose}
          />
        </div>
        {document.sourceUrl && (
          <a
            className={block("source")}
            href={document.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Открыть источник: {document.sourceUrl}
          </a>
        )}
        {isLoading && <Loader count={8} size={140} />}
        {isError && (
          <p className={block("error")}>
            Не удалось прочитать локальный снимок текста.
          </p>
        )}
        {text && <pre className={block("body")}>{text}</pre>}
      </div>
    </CustomModal>
  );
};

export default AgentFullTextModal;
