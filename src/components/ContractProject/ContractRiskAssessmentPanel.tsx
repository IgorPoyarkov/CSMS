import { useMemo, useState } from "react";
import {
  assessDraftContractRisk,
  type ContractFormSectionId,
  type RiskSeverity,
} from "../../services/ContractProject/contractRiskAssessment";
import type { ContractProject } from "../../services/ContractProject/contractProject.schema";
import type { NoticeInfo } from "../../services/Procurements/noticeInfo.schema";
import type { PurchaseNote } from "../../services/PurchaseNote/purchaseNote.schema";
import { useOkpd2Dictionary } from "../../services/Okpd2Ref/okpd2Ref.api";
import styles from "./ContractRiskAssessmentPanel.module.scss";

interface ContractRiskAssessmentPanelProps {
  project: ContractProject;
  notice?: NoticeInfo;
  purchaseNote?: PurchaseNote;
  onNavigateSection: (sectionId: ContractFormSectionId) => void;
}

const SEVERITY_LABELS: Record<RiskSeverity, string> = {
  critical: "Критический риск",
  high: "Высокий риск",
  medium: "Средний риск",
  low: "Низкий риск",
};

export default function ContractRiskAssessmentPanel({
  project,
  notice,
  purchaseNote,
  onNavigateSection,
}: ContractRiskAssessmentPanelProps) {
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMode, setFilterMode] = useState<"risks" | "all">("risks");
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const assessment = useMemo(
    () =>
      assessDraftContractRisk(project, {
        notice,
        purchaseNote,
        okpd2Refs,
        todayIso,
      }),
    [project, notice, purchaseNote, okpd2Refs, todayIso],
  );

  const visibleFindings = useMemo(
    () =>
      filterMode === "risks"
        ? assessment.findings.filter((f) => !f.passed)
        : assessment.findings,
    [assessment.findings, filterMode],
  );

  return (
    <section className={styles.panel} aria-label="Анализ рисков проекта контракта 44-ФЗ">
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            Автоматическая оценка рисков проекта контракта (44-ФЗ)
          </h3>
          <p className={styles.subtitle}>
            Проверка типовых нарушений практики ФАС и Казначейства: ч. 13.1 ст.
            34 (сроки оплаты), ст. 37 (антидемпинг), ст. 96 (аванс и обеспечение),
            ПП № 1042 (неустойки), ч. 5 ст. 30 (СМП).
          </p>
        </div>

        <div className={styles["score-box"]}>
          <span className={styles["score-value"]}>
            {assessment.complianceScore}%
          </span>
          <span
            className={`${styles["level-badge"]} ${
              styles[`level-badge--${assessment.overallLevel}`]
            }`}
          >
            {assessment.overallLabel}
          </span>
          <button
            type="button"
            className={styles.tab}
            onClick={() => setIsExpanded((v) => !v)}
          >
            {isExpanded ? "Свернуть" : "Развернуть"}
          </button>
        </div>
      </div>

      <div className={styles["summary-row"]}>
        <div className={styles.counts}>
          <span>
            Пройдено проверок:{" "}
            <strong>
              {assessment.passedCount}/{assessment.findings.length}
            </strong>
          </span>
          <span>
            Критических: <strong>{assessment.bySeverity.critical}</strong>
          </span>
          <span>
            Высоких: <strong>{assessment.bySeverity.high}</strong>
          </span>
          <span>
            Средних: <strong>{assessment.bySeverity.medium}</strong>
          </span>
          <span>
            Низких: <strong>{assessment.bySeverity.low}</strong>
          </span>
        </div>

        <div className={styles["filter-tabs"]}>
          <button
            type="button"
            className={`${styles.tab} ${
              filterMode === "risks" ? styles["tab--active"] : ""
            }`}
            onClick={() => setFilterMode("risks")}
          >
            Выявленные риски ({assessment.failedCount})
          </button>
          <button
            type="button"
            className={`${styles.tab} ${
              filterMode === "all" ? styles["tab--active"] : ""
            }`}
            onClick={() => setFilterMode("all")}
          >
            Все правила ({assessment.findings.length})
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.findings}>
          {visibleFindings.length === 0 ? (
            <p className={styles.subtitle}>
              По всем 12 контрольным правилам 44-ФЗ нарушений и правовых рисков не
              выявлено.
            </p>
          ) : (
            visibleFindings.map((item) => (
              <article
                key={item.id}
                className={`${styles.finding} ${
                  item.passed ? styles["finding--passed"] : ""
                }`}
              >
                <div className={styles["finding-top"]}>
                  <div className={styles["finding-meta"]}>
                    <span
                      className={`${styles.sev} ${
                        item.passed
                          ? styles["sev--ok"]
                          : styles[`sev--${item.severity}`]
                      }`}
                    >
                      {item.passed
                        ? "Соответствует"
                        : SEVERITY_LABELS[item.severity]}
                    </span>
                    <span>{item.ruleCode}</span>
                    <span>·</span>
                    <span>{item.category}</span>
                    <span>·</span>
                    <span>{item.legalBasis}</span>
                  </div>

                  {!item.passed && (
                    <button
                      type="button"
                      className={styles["jump-btn"]}
                      onClick={() => onNavigateSection(item.sectionTarget)}
                    >
                      Исправить в «{item.sectionLabel}» →
                    </button>
                  )}
                </div>

                <h4 className={styles["finding-title"]}>{item.title}</h4>
                <p className={styles["finding-desc"]}>{item.description}</p>

                {!item.passed && (
                  <div className={styles["finding-footer"]}>
                    <div>
                      <strong>Риск:</strong> {item.penaltyConsequence} ·{" "}
                      <strong>Рекомендация:</strong> {item.recommendation}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
