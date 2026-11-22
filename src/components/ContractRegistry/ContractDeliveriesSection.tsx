import { useState } from "react";
import { Link } from "react-router-dom";
import type { ContractDelivery } from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractDeliveries } from "../../services/ContractRegistry/contractRegistry.api";
import ContractDeliveryForm from "./ContractDeliveryForm";
import { DELIVERY_LABELS, formatMoney } from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

interface ContractDeliveriesSectionProps {
  contractId?: string | number;
}

/**
 * Ручной реестр поставок и приёмки (ст. 94).
 *
 * Это упрощённый учёт: полный сценарий — расхождения, отказ, регистрация в
 * ЕИС — ведётся в электронном актировании, поэтому в подвале ссылка туда.
 */
export default function ContractDeliveriesSection({
  contractId,
}: ContractDeliveriesSectionProps) {
  const { data: deliveries } = useContractDeliveries(contractId);
  const [formOpen, setFormOpen] = useState(false);

  if (!contractId) return null;

  const list = deliveries ?? [];

  return (
    <section className={styles.subSection}>
      <div className={styles.subHeader}>
        <h4 className={styles.subTitle}>
          Поставки и приёмка (ручной реестр, ст. 94)
        </h4>
        {!formOpen && (
          <button
            type="button"
            className={styles.btnSmall}
            onClick={() => setFormOpen(true)}
          >
            + Акт
          </button>
        )}
      </div>

      {formOpen && (
        <ContractDeliveryForm
          contractId={contractId}
          onDone={() => setFormOpen(false)}
        />
      )}

      {list.length === 0 ? (
        <p className={styles.projectionEmpty}>
          Поставок нет. Полный сценарий приёмки — с расхождениями, отказом и
          регистрацией в ЕИС — ведётся в электронном актировании.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Наименование</th>
              <th>Кол-во</th>
              <th>Сумма, ₽</th>
              <th>Акт</th>
              <th>Результат</th>
            </tr>
          </thead>
          <tbody>
            {list.map((delivery: ContractDelivery) => (
              <tr key={delivery.id}>
                <td>{delivery.deliveryDate}</td>
                <td>{delivery.itemName}</td>
                <td>
                  {delivery.quantity} {delivery.unit}
                </td>
                <td>{formatMoney(delivery.amount)}</td>
                <td>
                  {delivery.acceptanceActNumber}
                  {delivery.acceptanceActDate
                    ? ` от ${delivery.acceptanceActDate}`
                    : ""}
                </td>
                <td>
                  <span
                    className={`${styles.deliveryBadge} ${styles[`del_${delivery.result}`]}`}
                  >
                    {DELIVERY_LABELS[delivery.result]}
                  </span>
                  {delivery.notes && (
                    <div className={styles.notes}>{delivery.notes}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.projectionMeta}>
        <span>Новые приёмки оформляются в электронном актировании</span>
        <Link
          className={styles.projectionLink}
          to={`/acceptances?contractId=${String(contractId)}`}
        >
          Открыть приёмки по контракту
        </Link>
      </div>
    </section>
  );
}
