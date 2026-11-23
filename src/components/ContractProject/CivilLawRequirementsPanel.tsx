import { useMemo, useState } from "react";
import {
  analyzeContractCivilBasis,
  CIVIL_KIND_LABELS,
  CIVIL_PRIORITY_LABELS,
  CIVIL_STATUS_LABELS,
} from "../../services/ContractProject/civilLawRequirements";
import { CONTRACT_SECTION_DEFS } from "../../services/ContractProject/contractStructure";
import type { ContractProject } from "../../services/ContractProject/contractProject.schema";
import styles from "./CivilLawRequirementsPanel.module.scss";

interface CivilLawRequirementsPanelProps {
  project: ContractProject;
  onNavigateSection: (sectionId: string) => void;
}

const SECTION_TITLES = new Map(
  CONTRACT_SECTION_DEFS.map((section) => [section.id, section.title]),
);
const FIELD_LABELS = new Map(
  CONTRACT_SECTION_DEFS.flatMap((section) =>
    section.fields.map((field) => [field.path, field.label]),
  ),
);

const ACT_LABELS: Record<string, string> = {
  gk1: "ГК РФ ч. 1",
  gk2: "ГК РФ ч. 2",
  fz44: "44-ФЗ",
};

function referenceLabel(reference: string) {
  const [act, number] = String(reference).split(":");
  const actLabel = ACT_LABELS[act] ?? act;
  return number ? `${actLabel} ст. ${number}` : actLabel;
}

const fieldLabel = (path: string) => FIELD_LABELS.get(path) ?? path;

/**
 * Условия контракта, которые следуют из ГК РФ и 44-ФЗ, с проверкой заполнения
 * и дословными цитатами из зафиксированного снимка. Текст норм не генерируется.
 */
export default function CivilLawRequirementsPanel({
  project,
  onNavigateSection,
}: CivilLawRequirementsPanelProps) {
  const analysis = useMemo(() => analyzeContractCivilBasis(project), [project]);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = onlyMissing
    ? analysis.requirements.filter((item) => item.status !== "filled")
    : analysis.requirements;
  const { classification, counts } = analysis;
  const primaryInstitute = classification.institutes[0];

  return (
    <div className={styles.panel} aria-label="Условия контракта по ГК РФ и 44-ФЗ">
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            Какие поля нужны в контракте по ГК РФ и 44-ФЗ
          </h3>
          <p className={styles.subtitle}>
            Состав условий определён по предмету закупки. Цитаты взяты дословно
            из снимка КонсультантПлюс; текст формулировок не генерируется.
          </p>
        </div>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((value) => (value ? null : "all"))}
        >
          {expanded ? "Свернуть цитаты" : "Развернуть цитаты"}
        </button>
      </div>

      <div className={styles.summary}>
        <span className={styles.chip}>
          Институт: <strong>{primaryInstitute?.label ?? "не определён"}</strong>
        </span>
        <span className={styles.chip}>
          Предмет:{" "}
          <strong>{CIVIL_KIND_LABELS[classification.declaredKind] ?? classification.declaredKind}</strong>
          {" → объект: "}
          <strong>{CIVIL_KIND_LABELS[classification.effectiveKind] ?? classification.effectiveKind}</strong>
        </span>
        <span className={styles.chip}>
          Условия: <strong>{counts.filled}/{counts.total}</strong> заполнено
        </span>
        {classification.reviewRequired && (
          <span className={`${styles.chip} ${styles.chipWarning}`}>
            Требуется проверка предмета
          </span>
        )}
      </div>

      {classification.mismatch.detected && (
        <div className={styles.alert}>
          <strong>
            Расхождение предмета и объекта: заявлено{" "}
            {CIVIL_KIND_LABELS[classification.mismatch.declared ?? ""] ?? classification.mismatch.declared},
            по ГК —{" "}
            {CIVIL_KIND_LABELS[classification.mismatch.object ?? ""] ?? classification.mismatch.object}
          </strong>
          <span>
            Статьи для проверки:{" "}
            {(classification.mismatch.basis ?? [])
              .map(referenceLabel)
              .join("; ") || "не определены"}
          </span>
          {classification.reasons.map((reason) => (
            <span key={reason}>{reason}</span>
          ))}
        </div>
      )}

      {analysis.pendingArticles.length > 0 && (
        <div className={styles.pending}>
          Статьи без текста в снимке — вставки по ним не выдаются:{" "}
          {analysis.pendingArticles
            .map((item) => referenceLabel(item.reference))
            .join("; ")}
          .
        </div>
      )}

      <div className={styles.filters}>
        <button
          type="button"
          className={`${styles.filter} ${!onlyMissing ? styles.filterActive : ""}`}
          onClick={() => setOnlyMissing(false)}
        >
          Все условия ({counts.total})
        </button>
        <button
          type="button"
          className={`${styles.filter} ${onlyMissing ? styles.filterActive : ""}`}
          onClick={() => setOnlyMissing(true)}
        >
          Требуют заполнения ({counts.total - counts.filled})
        </button>
      </div>

      <div className={styles.requirements}>
        {visible.map((item) => {
          const isOpen = expanded === "all" || expanded === item.id;
          return (
            <article key={item.id} className={styles.requirement}>
              <div className={styles.requirementHead}>
                <div className={styles.requirementTitle}>
                  <span className={styles.sectionRef}>
                    {SECTION_TITLES.get(item.sectionId) ?? item.sectionId}
                  </span>
                  <strong>{item.title}</strong>
                </div>
                <div className={styles.badges}>
                  <span
                    className={`${styles.badge} ${styles[`priority-${item.priority}`]}`}
                  >
                    {CIVIL_PRIORITY_LABELS[item.priority] ?? item.priority}
                  </span>
                  <span
                    className={`${styles.badge} ${styles[`status-${item.status}`]}`}
                  >
                    {CIVIL_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                  {(item.normKind === "dispositive" || item.normKind === "mixed") && (
                    <span
                      className={`${styles.badge} ${styles.badgeRecommendation}`}
                      title={item.qualifierNotes
                        .map((note) => `${note.reference}: ${note.quote}`)
                        .join("\n")}
                    >
                      рекомендация{item.normKind === "mixed" ? " (часть)" : ""}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.link}
                    onClick={() => onNavigateSection(item.sectionId)}
                  >
                    Перейти к полям
                  </button>
                </div>
              </div>

              <p className={styles.description}>{item.description}</p>

              <div className={styles.fields}>
                {item.paths.map((path) => {
                  const filled = item.filledPaths.includes(path);
                  return (
                    <span
                      key={path}
                      className={`${styles.field} ${filled ? styles.fieldFilled : styles.fieldMissing}`}
                      title={path}
                    >
                      {filled ? "✓" : "○"} {fieldLabel(path)}
                    </span>
                  );
                })}
              </div>

              <div className={styles.articles}>
                {item.articleRefs.map((reference) => (
                  <span key={reference} className={styles.article}>
                    {referenceLabel(reference)}
                  </span>
                ))}
                <button
                  type="button"
                  className={styles.link}
                  onClick={() =>
                    setExpanded((value) =>
                      value === item.id || value === "all" ? null : item.id,
                    )
                  }
                >
                  {isOpen ? "Скрыть текст нормы" : "Показать текст нормы"}
                </button>
              </div>

              {isOpen &&
                item.quotes.map((quote) => (
                  <blockquote key={`${quote.reference}-${quote.textSha256}`} className={styles.quote}>
                    <span className={styles.quoteHead}>
                      <strong>{referenceLabel(quote.reference)}</strong>
                      <a href={quote.sourceUrl} target="_blank" rel="noreferrer">
                        Источник
                      </a>
                      <span title={`SHA-256 текста: ${quote.textSha256}`}>
                        ред. {quote.textSha256.slice(0, 10)}
                      </span>
                    </span>
                    {quote.quote}
                  </blockquote>
                ))}
            </article>
          );
        })}
      </div>

      <details className={styles.basis}>
        <summary>
          Правовое обоснование института ({analysis.legalBasis.length} статей)
        </summary>
        <ul>
          {analysis.legalBasis.map((item) => (
            <li key={`${item.reference}-${item.institute}`}>
              <span className={styles.basisMeta}>
                <strong>{referenceLabel(item.reference)}</strong>
                <span>{item.institute}</span>
                <span>{item.priority}</span>
                <span>{item.normKind}</span>
              </span>
              <span className={styles.basisQuote}>{item.quote}</span>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                Источник
              </a>
            </li>
          ))}
        </ul>
      </details>

      <p className={styles.footer}>
        Снимок от {analysis.fetchedAt.slice(0, 10)} · SHA-256{" "}
        {analysis.snapshotSha256.slice(0, 12)}… · это обоснование для
        проверяющего, а не готовый текст пункта контракта.
      </p>
    </div>
  );
}
