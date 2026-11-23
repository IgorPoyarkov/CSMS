import { useState } from "react";
import {
  paymentDeadlineDate,
  paymentXsdCodeFor,
  type ContractPayment,
} from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractPayments } from "../../services/ContractRegistry/contractRegistry.api";
import ContractPaymentForm from "./ContractPaymentForm";
import {
  PAYMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  formatMoney,
} from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

interface ContractPaymentsSectionProps {
  contractId?: string | number;
}

/**
 * Платежи ручного учёта (ст. 34 ч. 12, 13.1).
 *
 * Направление сообщения — исходящее: платёжные документы формирует и
 * направляет заказчик, в отличие от входящих документов о приёмке. Секция
 * показывает это прямо в заголовке, чтобы две соседние секции не читались как
 * одно и то же.
 *
 * Живёт в карточке контракта: реестр показывает только процент оплаты,
 * полный список платёжных документов грузится при открытии карточки.
 */
export default function ContractPaymentsSection({
  contractId,
}: ContractPaymentsSectionProps) {
  const { data: payments } = useContractPayments(contractId);
  const [formOpen, setFormOpen] = useState(false);

  if (!contractId) return null;

  const list = payments ?? [];

  return (
    <section className={styles.subSection}>
      <div className={styles.subHeader}>
        <h4 className={styles.subTitle}>
          Платежи — исходящие сообщения в ЕИС (ручной учёт, ст. 34 ч. 12, 13.1)
        </h4>
        {!formOpen && (
          <button
            type="button"
            className={styles.btnSmall}
            onClick={() => setFormOpen(true)}
          >
            + Платёж
          </button>
        )}
      </div>

      <p className={styles.projectionEmpty}>
        Исходящее сообщение: платёжный документ формирует заказчик и направляет
        его в ЕИС. Входящие документы поставщика — приёмка — в соседней секции
        выше.
      </p>

      {formOpen && (
        <ContractPaymentForm
          contractId={contractId}
          onDone={() => setFormOpen(false)}
        />
      )}

      {list.length === 0 ? (
        <p className={styles.projectionEmpty}>
          Ручных платежей нет. Фактическая оплата из выгрузки ЕИС — в хронологии
          «Исполнение контракта».
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Документ</th>
              <th>Дата</th>
              <th>Тип</th>
              <th>Код XSD</th>
              <th>Сумма, ₽</th>
              <th>Банковский документ</th>
              <th>Реестровый номер исполнения</th>
              <th>Срок оплаты</th>
              <th>Статус</th>
              <th>Казначейство</th>
            </tr>
          </thead>
          <tbody>
            {list.map((payment: ContractPayment) => (
              <tr key={payment.id}>
                <td>{payment.paymentDocumentNumber || "—"}</td>
                <td>{payment.paymentDate || "—"}</td>
                <td>{PAYMENT_LABELS[payment.paymentType]}</td>
                <td>
                  {payment.paymentTypeCode ||
                    paymentXsdCodeFor(payment.paymentType)}
                </td>
                <td>{formatMoney(payment.amount)}</td>
                <td>{payment.bankDocumentNumber || "—"}</td>
                <td>{payment.regNumberExecution || "—"}</td>
                <td>{paymentDeadlineDate(payment) || "—"}</td>
                <td>
                  <span
                    className={`${styles.payBadge} ${styles[`pay_${payment.status}`]}`}
                  >
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </span>
                </td>
                <td>{payment.treasuryExecution ? "Да" : "Нет"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
