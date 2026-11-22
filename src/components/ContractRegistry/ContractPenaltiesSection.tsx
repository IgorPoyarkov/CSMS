import {
  totalPenalties,
  type ContractPenalty,
} from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractPenalties } from "../../services/ContractRegistry/contractRegistry.api";
import {
  PENALTY_LABELS,
  PENALTY_STATUS_LABELS,
  formatMoney,
} from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

interface ContractPenaltiesSectionProps {
  contractId?: string | number;
}

/** Неустойки по контракту (ст. 34 ч. 5). Секция карточки, не реестра. */
export default function ContractPenaltiesSection({
  contractId,
}: ContractPenaltiesSectionProps) {
  const { data: penalties } = useContractPenalties(contractId);

  if (!penalties || penalties.length === 0) return null;

  const total = totalPenalties(penalties);

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>
        Неустойки (ст. 34 ч. 5) — итого: {formatMoney(total)} ₽
      </h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Выявлено</th>
            <th>Тип</th>
            <th>Нарушение</th>
            <th>Сумма, ₽</th>
            <th>Статус</th>
            <th>Основание</th>
          </tr>
        </thead>
        <tbody>
          {penalties.map((penalty: ContractPenalty) => (
            <tr key={penalty.id}>
              <td>{penalty.detectedDate}</td>
              <td>{PENALTY_LABELS[penalty.type]}</td>
              <td className={styles.description}>{penalty.description}</td>
              <td className={styles.cellDanger}>{formatMoney(penalty.amount)}</td>
              <td>{PENALTY_STATUS_LABELS[penalty.status]}</td>
              <td className={styles.reference}>{penalty.reference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
