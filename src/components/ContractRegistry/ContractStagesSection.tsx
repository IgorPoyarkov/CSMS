import type {
  ContractRegistryItem,
  ContractStage,
} from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractStages } from "../../services/ContractRegistry/contractRegistry.api";
import useUtils from "../../hooks/useUtils";
import { STAGE_LABELS, formatMoney } from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

interface ContractStagesSectionProps {
  contractId?: string | number;
  /**
   * Контракт нужен, когда этапов в ЕИС нет: тогда исполнение — один этап на
   * весь срок контракта, и это надо показать, а не пустоту.
   */
  contract?: ContractRegistryItem;
}

/**
 * Этапы исполнения контракта.
 *
 * Секция вынесена из реестра: реестр больше не грузит этапы на каждое
 * раскрытие строки, их показывает только карточка контракта.
 *
 * В ЕИС контракт не обязан быть разбит на этапы — тогда этап один, и это
 * весь контракт: его срок и его цена. Раньше на таком контракте секция
 * просто исчезала, и было не понять: этапов нет или данные не загрузились.
 */
export default function ContractStagesSection({
  contractId,
  contract,
}: ContractStagesSectionProps) {
  const { data: stages } = useContractStages(contractId);
  const { formatDate } = useUtils();

  if (!stages) return null;

  if (stages.length === 0) {
    if (!contract) return null;

    const start = formatDate(contract.executionStartDate);
    const end = formatDate(contract.executionEndDate);
    const period = start && end ? `${start} — ${end}` : "срок не указан";

    return (
      <section className={styles.subSection}>
        <h4 className={styles.subTitle}>Этапы исполнения</h4>
        <p className={styles.projectionEmpty}>
          В карточке ЕИС этапы не публикуются: контракт исполняется одним
          этапом — весь его срок.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>№</th>
              <th>Идентификатор ЕИС (sid)</th>
              <th>Наименование</th>
              <th>Период</th>
              <th>Сумма, ₽</th>
              <th>По годам (paymentsSumInfo)</th>
              <th>Оплачено, ₽</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                {contract.eisRegistryNumber || contract.contractNumber || "—"}
              </td>
              <td>Весь контракт</td>
              <td>{period}</td>
              <td>{formatMoney(contract.contractPrice)}</td>
              <td>—</td>
              <td>—</td>
              <td>
                <span
                  className={`${styles.stageBadge} ${styles.stage_in_progress}`}
                >
                  {STAGE_LABELS.in_progress}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    );
  }

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Этапы исполнения</h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>№</th>
            <th>Идентификатор ЕИС (sid)</th>
            <th>Наименование</th>
            <th>Период</th>
            <th>Сумма, ₽</th>
            <th>По годам (paymentsSumInfo)</th>
            <th>Оплачено, ₽</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage: ContractStage) => (
            <tr key={stage.id}>
              <td>{stage.stageNumber}</td>
              <td>{stage.sid || "—"}</td>
              <td>{stage.name}</td>
              <td>
                {stage.startDate} — {stage.endDate}
              </td>
              <td>{formatMoney(stage.amount)}</td>
              <td>
                {[
                  stage.paymentsSumInfo?.currentYear,
                  stage.paymentsSumInfo?.firstYear,
                  stage.paymentsSumInfo?.secondYear,
                  stage.paymentsSumInfo?.subsequentYears,
                ]
                  .map((value) => formatMoney(value))
                  .join(" / ")}
              </td>
              <td>{formatMoney(stage.paidAmount)}</td>
              <td>
                <span
                  className={`${styles.stageBadge} ${styles[`stage_${stage.status}`]}`}
                >
                  {STAGE_LABELS[stage.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

