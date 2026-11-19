import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLegalActs } from "../../services/LegalAct/legalAct.api";
import {
  formatLegalAct,
  legalActStatusLabels,
} from "../../services/LegalAct/legalAct.schema";
import {
  scanDocumentCompliance,
  type CheckIssueKind,
  type DocumentCheckCategory,
  type DocumentCheckFinding,
} from "../../services/ProcurementDocuments/documentComplianceChecker";
import styles from "./ProcurementDocumentsPage.module.scss";

interface DocumentCheckerPanelProps {
  documentText: string;
  category: DocumentCheckCategory;
  onApplyInsertClause?: (clauseText: string) => void;
  onApplyReplacement?: (target: string, replacement: string) => void;
}

interface HighlightSegment {
  text: string;
  severity?: "critical" | "high" | "medium";
  tooltip?: string;
}

const buildHighlightedSegments = (
  text: string,
  findings: DocumentCheckFinding[],
): HighlightSegment[] => {
  const spans: {
    start: number;
    end: number;
    severity: "critical" | "high" | "medium";
    tooltip: string;
  }[] = [];

  findings.forEach((f) => {
    f.matches.forEach((m) => {
      spans.push({
        start: m.start,
        end: m.end,
        severity: f.severity,
        tooltip: `${f.title} (${f.legalActLabel})`,
      });
    });
  });

  if (spans.length === 0) {
    return [{ text }];
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged: typeof spans = [];
  for (const s of spans) {
    const prev = merged[merged.length - 1];
    if (!prev || s.start >= prev.end) {
      merged.push({ ...s });
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const s of merged) {
    if (s.start > cursor) {
      segments.push({ text: text.slice(cursor, s.start) });
    }
    segments.push({
      text: text.slice(s.start, s.end),
      severity: s.severity,
      tooltip: s.tooltip,
    });
    cursor = s.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
};

export default function DocumentCheckerPanel({
  documentText,
  category,
  onApplyInsertClause,
  onApplyReplacement,
}: DocumentCheckerPanelProps) {
  const { data: legalActs = [], isLoading } = useLegalActs();
  const [kindFilter, setKindFilter] = useState<"all" | CheckIssueKind>("all");
  const [showRegistryTable, setShowRegistryTable] = useState(false);

  const report = useMemo(
    () =>
      scanDocumentCompliance({
        documentText,
        category,
        legalActs,
      }),
    [documentText, category, legalActs],
  );

  const visibleFindings = useMemo(
    () =>
      kindFilter === "all"
        ? report.findings
        : report.findings.filter((f) => f.kind === kindFilter),
    [report.findings, kindFilter],
  );

  const missingCount = report.findings.filter(
    (f) => f.kind === "missing_clause",
  ).length;
  const nonCompliantCount = report.findings.filter(
    (f) => f.kind === "non_compliant_text",
  ).length;

  const segments = useMemo(
    () => buildHighlightedSegments(documentText, report.findings),
    [documentText, report.findings],
  );

  const renderHighlighted = (): ReactNode =>
    segments.map((seg, idx) =>
      seg.severity ? (
        <mark
          key={idx}
          title={seg.tooltip}
          className={
            seg.severity === "critical"
              ? styles["mark-critical"]
              : styles["mark-warning"]
          }
        >
          {seg.text}
        </mark>
      ) : (
        <span key={idx}>{seg.text}</span>
      ),
    );

  return (
    <section className={styles.card} aria-label="Document Checker по реестру НПА">
      <div className={styles.header}>
        <div>
          <h2 className={styles["section-title"]}>
            Document Checker — проверка по действующим правовым актам
          </h2>
          <p className={styles.subtitle}>
            Автоматическое сканирование текста документа по реестру{" "}
            <Link to="/legal-acts">законодательных актов</Link> (действующих:{" "}
            {report.activeActsCount}, утративших силу: {report.inactiveActsCount}).
          </p>
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles["btn--sm"]}`}
          onClick={() => setShowRegistryTable((v) => !v)}
        >
          {showRegistryTable
            ? "Скрыть матрицу НПА"
            : `Сверка с реестром НПА (${report.registryCoverage.length})`}
        </button>
      </div>

      {isLoading ? (
        <p className={styles.subtitle}>Загрузка реестра законодательных актов…</p>
      ) : (
        <div className={styles.checker}>
          <div className={styles["score-bar"]}>
            <div>
              <div className={styles.label}>Индекс соответствия реестру НПА</div>
              <div className={styles["score-num"]}>{report.complianceScore}%</div>
            </div>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${
                  kindFilter === "all" ? styles["tab--active"] : ""
                }`}
                onClick={() => setKindFilter("all")}
              >
                Все замечания ({report.findings.length})
              </button>
              <button
                type="button"
                className={`${styles.tab} ${
                  kindFilter === "missing_clause" ? styles["tab--active"] : ""
                }`}
                onClick={() => setKindFilter("missing_clause")}
              >
                Отсутствующие положения ({missingCount})
              </button>
              <button
                type="button"
                className={`${styles.tab} ${
                  kindFilter === "non_compliant_text" ? styles["tab--active"] : ""
                }`}
                onClick={() => setKindFilter("non_compliant_text")}
              >
                Несоответствующий текст ({nonCompliantCount})
              </button>
            </div>
          </div>

          {nonCompliantCount > 0 && (
            <div>
              <div className={styles.label} style={{ marginBottom: 6 }}>
                Подсветка несоответствующих или устаревших фрагментов в тексте:
              </div>
              <div className={styles["highlighted-box"]}>
                {renderHighlighted()}
              </div>
            </div>
          )}

          {visibleFindings.length === 0 ? (
            <div className={styles["score-bar"]}>
              <span className={`${styles.badge} ${styles["badge--ok"]}`}>
                Соответствует
              </span>
              <span className={styles.subtitle}>
                Пропущенных обязательных положений и противоречий действующим
                правовым актам реестра не обнаружено.
              </span>
            </div>
          ) : (
            visibleFindings.map((item) => (
              <article key={item.id} className={styles.finding}>
                <div className={styles["finding-head"]}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span
                      className={`${styles.badge} ${
                        styles[`badge--${item.severity}`]
                      }`}
                    >
                      {item.kind === "missing_clause"
                        ? "Отсутствует положение"
                        : "Несоответствующий текст"}
                    </span>
                    <span className={styles.tag}>{item.legalActLabel}</span>
                  </div>
                </div>
                <h3 className={styles["finding-title"]}>{item.title}</h3>
                <p className={styles["finding-desc"]}>{item.description}</p>
                <p className={styles["finding-desc"]}>
                  <strong>Рекомендация:</strong> {item.recommendation}
                </p>

                {item.matches.length > 0 && (
                  <p className={styles["finding-desc"]}>
                    <strong>Найденный фрагмент:</strong> «
                    {item.matches[0].matchedText}»
                  </p>
                )}

                <div className={styles["finding-actions"]}>
                  {item.suggestedInsertClause && onApplyInsertClause && (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles["btn--subtle"]} ${styles["btn--sm"]}`}
                      onClick={() =>
                        onApplyInsertClause(item.suggestedInsertClause!)
                      }
                    >
                      + Добавить обязательную формулировку
                    </button>
                  )}
                  {item.suggestedReplacement && onApplyReplacement && (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles["btn--primary"]} ${styles["btn--sm"]}`}
                      onClick={() =>
                        onApplyReplacement(
                          item.suggestedReplacement!.target,
                          item.suggestedReplacement!.replacement,
                        )
                      }
                    >
                      Заменить на актуальную норму
                    </button>
                  )}
                </div>
              </article>
            ))
          )}

          {showRegistryTable && (
            <div className={styles["table-wrap"]}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Правовой акт</th>
                    <th>Статус в реестре</th>
                    <th>Применение в документе</th>
                  </tr>
                </thead>
                <tbody>
                  {report.registryCoverage.map((row) => (
                    <tr key={String(row.act.id ?? row.act.shortName)}>
                      <td>
                        <strong>{formatLegalAct(row.act)}</strong>
                        {row.act.scope && (
                          <div className={styles.subtitle}>{row.act.scope}</div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            row.inForce
                              ? styles["badge--ok"]
                              : styles["badge--critical"]
                          }`}
                        >
                          {legalActStatusLabels[row.act.status]}
                        </span>
                      </td>
                      <td>{row.statusNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
