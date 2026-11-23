import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import type { ContractService } from "../../services/ContractService/contractService.schema";
import type { EmployeeEducation } from "../../services/ContractService/education.schema";
import type { ObjectDescription } from "../../services/ObjectDescription/objectDescription.schema";
import {
  validateOrder158nCompliance,
  type Order158nCheckStatus,
} from "../../services/ObjectDescription/order158nValidator";
import type { Okpd2Ref } from "../../services/Okpd2Ref/okpd2Ref.schema";
import styles from "./NormingRequirementsPage.module.scss";
import Select from "../UI/Select";

interface Order158nValidatorPanelProps {
  descriptions: ObjectDescription[];
  selectedId: string | number | null;
  onSelectId?: (id: string | number) => void;
  contractService?: ContractService | null;
  educations?: EmployeeEducation[];
  okpd2Dictionary?: Okpd2Ref[];
  /** Компактный режим для встраивания прямо внутрь редактора ООЗ */
  compact?: boolean;
}

const statusLabel: Record<Order158nCheckStatus, string> = {
  pass: "Соответствует",
  warning: "Требует внимания",
  fail: "Нарушение",
};

/**
 * Интерактивный валидатор соответствия ООЗ требованиям Приказа Минфина России
 * от 31.07.2020 № 158н (Типовое положение о контрактной службе).
 */
export default function Order158nValidatorPanel({
  descriptions,
  selectedId,
  onSelectId,
  contractService,
  educations = [],
  okpd2Dictionary = [],
  compact = false,
}: Order158nValidatorPanelProps) {
  const { bem } = useUtils();
  const block = bem(styles, "norming-requirements");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const activeDescription = useMemo(() => {
    if (descriptions.length === 0) return null;
    if (selectedId !== null && selectedId !== undefined) {
      const found = descriptions.find(
        (d) => String(d.id ?? "") === String(selectedId),
      );
      if (found) return found;
    }
    return descriptions[0];
  }, [descriptions, selectedId]);

  const report = useMemo(() => {
    if (!activeDescription) return null;
    return validateOrder158nCompliance(activeDescription, {
      contractService,
      educations,
      okpd2Dictionary,
    });
  }, [activeDescription, contractService, educations, okpd2Dictionary]);

  if (!activeDescription || !report) {
    return null;
  }

  const visibleChecks = onlyIssues
    ? report.checks.filter((c) => c.status !== "pass")
    : report.checks;

  return (
    <section
      className={block("validator", compact ? ["compact"] : [])}
      aria-label="Валидатор Приказа Минфина № 158н"
    >
      <div className={block("validator-head")}>
        <div className={block("validator-title-row")}>
          <span
            className={block("validator-overall", [report.overallStatus])}
          >
            {statusLabel[report.overallStatus]}
          </span>
          <h2 className={block("validator-title")}>
            Валидатор соответствия Приказу Минфина № 158н
          </h2>
        </div>

        <div className={block("validator-controls")}>
          {!compact && descriptions.length > 1 && onSelectId && (
            <Select
              className={block("select")}
              aria-label="Выбор ООЗ для проверки"
              value={String(activeDescription.id ?? "")}
              onChange={(e) => onSelectId(e.target.value)}
            >
              {descriptions.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>
                  {d.title} (ОКПД2 {d.okpd2Code})
                </option>
              ))}
            </Select>
          )}

          <label className={block("checkbox-label")}>
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => setOnlyIssues(e.target.checked)}
            />
            <span>Только замечания</span>
          </label>

          <button
            type="button"
            className={block("secondary-btn")}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? "Развернуть проверку" : "Свернуть"}
          </button>
        </div>
      </div>

      <div className={block("validator-metrics")}>
        <span className={block("compliance-badge", ["ok"])}>
          Выполнено: {report.passedCount}
        </span>
        <span className={block("compliance-badge", ["warning"])}>
          Внимание: {report.warningCount}
        </span>
        <span className={block("compliance-badge", ["error"])}>
          Нарушения: {report.failCount}
        </span>
        <span className={block("hint")}>
          Проверяемый объект: <strong>{activeDescription.title || "Новый проект ООЗ"}</strong>
        </span>
      </div>

      {!collapsed && (
        <ul className={block("validator-list")}>
          {visibleChecks.length === 0 ? (
            <li className={block("validator-empty")}>
              По выбранному описанию объекта закупки нарушений и замечаний по
              Приказу Минфина № 158н не выявлено.
            </li>
          ) : (
            visibleChecks.map((check) => (
              <li
                key={check.id}
                className={block("validator-item", [check.status])}
              >
                <div className={block("validator-item-head")}>
                  <span className={block("validator-clause")}>
                    {check.clause}
                  </span>
                  <strong className={block("validator-item-title")}>
                    {check.title}
                  </strong>
                  <span className={block("validator-pill", [check.status])}>
                    {statusLabel[check.status]}
                  </span>
                </div>
                <p className={block("validator-item-detail")}>{check.detail}</p>
                {check.actionTo && check.actionLabel && (
                  <Link className={block("validator-link")} to={check.actionTo}>
                    {check.actionLabel} →
                  </Link>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
