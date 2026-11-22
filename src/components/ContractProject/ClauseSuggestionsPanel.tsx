import { useClauseSuggestions } from "../../services/ContractProject/clauseTemplates.api";
import type { ClauseTemplate } from "../../services/ContractProject/clauseTemplates.api";
import styles from "./ContractProject.module.scss";

interface ClauseSuggestionsPanelProps {
  subject: string;
  contractKind: string;
  sectionId: string;
  onInsert: (template: ClauseTemplate) => void;
}

/**
 * P2: подсказки утверждённых формулировок рядом с разделом конструктора.
 * Классификация приходит из csms-api вместе с текстом вставки — браузер
 * не портит P1-обоснование собственной эвристикой.
 */
export default function ClauseSuggestionsPanel({
  subject,
  contractKind,
  sectionId,
  onInsert,
}: ClauseSuggestionsPanelProps) {
  // Один запрос на предмет/вид контракта: разделы фильтруют результат локально,
  // иначе конструктор послал бы по запросу на каждую секцию формы.
  const { data, isLoading, isError } = useClauseSuggestions(subject, contractKind);
  const suggestions = data?.templates.filter(
    ({ template }) => template.sectionId === sectionId,
  );

  if (isLoading || isError || !data || !suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={styles.clausePanel}>
      <div className={styles.clausePanelHead}>
        <strong className={styles.clausePanelTitle}>
          Готовые формулировки из конструктора
        </strong>
        {data.classification.reviewRequired && (
          <span
            className={styles.clauseReview}
            title="Предмет и объект закупки описаны одновременно как товар и работы — проверьте институт перед вставкой"
          >
            требуется проверка предмета
          </span>
        )}
      </div>

      <p className={styles.clauseBasis}>
        Институт: {data.classification.institutes.length > 0
          ? data.classification.institutes.join(", ")
          : "общие условия контракта"}
      </p>

      <div className={styles.clauseList}>
        {suggestions.map(({ template, instituteLabel }) => (
          <div key={template.key} className={styles.clauseItem}>
            <div className={styles.clauseItemHead}>
              <span className={styles.clauseItemTitle}>{template.title}</span>
              <button
                type="button"
                className={styles.clauseInsert}
                onClick={() => onInsert(template)}
              >
                Вставить
              </button>
            </div>
            <p className={styles.clauseText}>{template.body}</p>
            <div className={styles.clauseMeta}>
              <span title={instituteLabel}>{template.normReference}</span>
              <span title={`Хеш статьи: ${template.textSha256}`}>
                textSha256: {template.textSha256.slice(0, 12)}…
              </span>
              {template.sourceUrl && (
                <a
                  href={template.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  источник статьи
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
