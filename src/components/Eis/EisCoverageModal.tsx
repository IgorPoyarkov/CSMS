import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import { useEisSchemaCatalog } from "../../services/Eis/eisSchemaCatalog";
import {
  EIS_XSD_COVERAGE,
  EIS_XSD_SNAPSHOT_VERSION,
  eisCoverageStatusLabels,
  eisCoverageSummary,
  eisXsdDoc,
  type EisCoverageStatus,
  type EisTypeCoverage,
} from "../../services/Eis/types";
import CustomModal from "../UI/CustomModal";
import styles from "./EisCoverageModal.module.scss";

/**
 * Быстрый визуальный чек-лист: насколько наши типы покрывают XSD ЕИС.
 *
 * Модалка открывается из шапки и показывает карту `EIS_XSD_COVERAGE`:
 * какие поля переносятся один в один, какие требуют преобразования, чего
 * у нас нет и что ЕИС заполняет сама. Это не генератор XML и не заменяет
 * обозреватель схем `/eis/schemas`.
 */

const DOMAIN_LABELS: Record<string, string> = {
  PurchasePlan: "План закупок",
  PurchasePlanPosition: "План-график",
  NoticeInfoFormValues: "Извещение",
  ContractRegistryItem: "Контракт",
  ContractSmpRecord: "СМП",
  ContractPayment: "Оплата",
  ContractDelivery: "Приёмка",
  ContractStage: "Этапы",
  SmnpReport: "Отчёт СМП",
};

const STATUS_ORDER: EisCoverageStatus[] = [
  "mapped",
  "partial",
  "missing",
  "derived",
];

// Порядок табов повторяет движение документа: ПГ → извещение → контракт → СМП.
const DOMAIN_ORDER = [
  "PurchasePlan",
  "PurchasePlanPosition",
  "NoticeInfoFormValues",
  "ContractRegistryItem",
  "ContractSmpRecord",
  "ContractPayment",
  "ContractDelivery",
  "ContractStage",
  "SmnpReport",
];

const domainRank = (domain: string): number => {
  const index = DOMAIN_ORDER.indexOf(domain);

  return index === -1 ? DOMAIN_ORDER.length : index;
};

const STATUS_MODIFIERS: Record<EisCoverageStatus, string> = {
  mapped: "mapped",
  partial: "partial",
  missing: "missing",
  derived: "derived",
};

interface EisCoverageModalProps {
  onClose: () => void;
}

const EisCoverageModal = ({ onClose }: EisCoverageModalProps) => {
  const { bem } = useUtils();
  const modal = bem(styles, "eis-coverage");
  // Описания «что написано рядом» лежат в каталоге XSD, а не в карте:
  // каталог грузится один раз и кэшируется react-query.
  const { data: schemaCatalog } = useEisSchemaCatalog();
  const [activeDomain, setActiveDomain] = useState<string>(
    EIS_XSD_COVERAGE.find((item) => item.domain === "PurchasePlanPosition")
      ?.domain ??
      EIS_XSD_COVERAGE[0]?.domain ??
      "",
  );
  const domains = useMemo(
    () =>
      [...EIS_XSD_COVERAGE].sort(
        (left, right) => domainRank(left.domain) - domainRank(right.domain),
      ),
    [],
  );

  const active = useMemo<EisTypeCoverage | null>(
    () => EIS_XSD_COVERAGE.find((item) => item.domain === activeDomain) ?? null,
    [activeDomain],
  );
  const summary = useMemo(
    () => eisCoverageSummary(active ? [active] : []),
    [active],
  );

  return (
    <CustomModal onClose={onClose}>
      <div className={modal()}>
        <header className={modal("header")}>
          <div>
            <h2 className={modal("title")}>Покрытие XSD ЕИС</h2>
            <p className={modal("subtitle")}>
              Снимок {EIS_XSD_SNAPSHOT_VERSION}: что из наших типов уже
              переносится, а что ещё нет. Это чек-лист для маппера, а не
              генератор XML.
            </p>
          </div>
          <button
            type="button"
            className={modal("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className={modal("domains")} role="tablist" aria-label="Наши типы">
          {domains.map((item) => (
            <button
              key={item.domain}
              type="button"
              role="tab"
              aria-selected={item.domain === activeDomain}
              className={modal("domain", [
                ...(item.domain === activeDomain ? ["active"] : []),
              ])}
              onClick={() => setActiveDomain(item.domain)}
            >
              {DOMAIN_LABELS[item.domain] ?? item.domain}
            </button>
          ))}
        </div>

        {active ? (
          <>
            <div className={modal("summary")}>
              {STATUS_ORDER.map((status) => (
                <span
                  key={status}
                  className={modal("summary-item", [STATUS_MODIFIERS[status]])}
                >
                  <span className={modal("summary-value")}>
                    {summary[status]}
                  </span>
                  <span className={modal("summary-label")}>
                    {eisCoverageStatusLabels[status]}
                  </span>
                </span>
              ))}
              <span className={modal("summary-item")}>
                <span className={modal("summary-value")}>{summary.total}</span>
                <span className={modal("summary-label")}>полей всего</span>
              </span>
            </div>

            <div className={modal("type-info")}>
              <div>
                <span className={modal("type-label")}>Наша модель</span>
                <code className={modal("code")}>{active.domain}</code>
              </div>
              <div>
                <span className={modal("type-label")}>XSD-тип</span>
                <code className={modal("code")}>{active.xsdType}</code>
              </div>
              <div>
                <span className={modal("type-label")}>Файл снимка</span>
                <code className={modal("code")}>
                  {active.xsdFile}
                  {active.xsdLine ? `:${active.xsdLine}` : ""}
                </code>
              </div>
            </div>

            <div className={modal("table-wrap")}>
              <table className={modal("table")}>
                <thead>
                  <tr>
                    <th>Наше поле</th>
                    <th>XSD</th>
                    <th>Что написано рядом</th>
                    <th>Статус</th>
                    <th>Что это значит</th>
                  </tr>
                </thead>
                <tbody>
                  {active.fields.map((field) => {
                    const doc = eisXsdDoc(
                      schemaCatalog,
                      active.xsdType,
                      field.xsd,
                      field.xsdDoc,
                    );

                    return (
                      <tr key={`${field.field}-${field.xsd ?? "none"}`}>
                        <td>
                          <span className={modal("field")}>{field.field}</span>
                          {field.required === true ? (
                            <span className={modal("required", ["yes"])}>
                              обяз.
                            </span>
                          ) : field.required === false ? (
                            <span className={modal("required", ["no"])}>
                              опц.
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <code className={modal("code")}>
                            {field.xsd ?? "—"}
                          </code>
                        </td>
                        <td className={modal("doc")}>{doc ?? ""}</td>
                        <td>
                          <span
                            className={modal("status", [
                              STATUS_MODIFIERS[field.status],
                            ])}
                          >
                            {eisCoverageStatusLabels[field.status]}
                          </span>
                        </td>
                        <td className={modal("note")}>{field.note ?? ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {active.notes.length > 0 && (
              <ul className={modal("notes")}>
                {active.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        <footer className={modal("footer")}>
          <span>
            Номера строк — подсказка для версии {EIS_XSD_SNAPSHOT_VERSION}; при
            обновлении Альбома они сдвинутся.
          </span>
          <button
            type="button"
            className={modal("footer-close")}
            onClick={onClose}
          >
            Закрыть
          </button>
        </footer>
      </div>
    </CustomModal>
  );
};

export default EisCoverageModal;
