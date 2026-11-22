import type { ContractStage } from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractStages } from "../../services/ContractRegistry/contractRegistry.api";
import { STAGE_LABELS, formatMoney } from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

interface ContractStagesSectionProps {
  contractId?: string | number;
}

/**
 * Этапы исполнения контракта.
 *
 * Секция вынесена из реестра: реестр больше не грузит этапы на каждое
 * раскрытие строки, их показывает только карточка контракта.
 */
export default function ContractStagesSection({
  contractId,
}: ContractStagesSectionProps) {
  const { data: stages } = useContractStages(contractId);

  if (!stages || stages.length === 0) return null;

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
