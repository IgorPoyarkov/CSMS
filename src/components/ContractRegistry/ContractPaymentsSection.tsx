import { useState } from "react";
import {
  paymentDeadlineDate,
  paymentXsdCodeFor,
  type ContractPayment,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  eisXmlIssuesText,
  eisXmlReadinessBadge,
  paymentEisReadiness,
  type EisContractIdentifiers,
} from "../../services/Eis/eisExecutionReadiness";
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
  /**
   * Реквизиты контракта для проверки XML ЕИС: реестровый номер адресует
   * сведения об исполнении, ИНН поставщика нужен для получателя платежа.
   */
  contract: EisContractIdentifiers;
}

/**
 * Платежи ручного учёта (ст. 34 ч. 12, 13.1).
 *
 * Направление сообщения — исходящее: платёжные документы формирует и
 * направляет заказчик, в отличие от входящих документов о приёмке. Секция
 * показывает это прямо в заголовке, чтобы две соседние секции не читались как
 * одно и то же.
 *
 * Колонка «ЕИС XML» отвечает на вопрос, который иначе выяснялся бы отказом
 * шлюза: пройдёт ли документ валидацию Альбома 17.0. Проверка считается на
 * каждый рендер, потому что правится тут же, в форме.
 */
export default function ContractPaymentsSection({
  contractId,
  contract,
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
        выше. Поля заполняются по схеме исполнения контракта (Альбом 17.0),
        чтобы пакет прошёл валидацию без доработки.
      </p>

      {formOpen && (
        <ContractPaymentForm
          contractId={contractId}
          contract={contract}
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
              <th>Основание</th>
              <th>КБК</th>
              <th>Сумма, ₽</th>
              <th>Банковский документ</th>
              <th>Реестровый номер исполнения</th>
              <th>Срок оплаты</th>
              <th>Статус</th>
              <th>Казначейство</th>
              <th>ЕИС XML</th>
            </tr>
          </thead>
          <tbody>
            {list.map((payment: ContractPayment) => {
              const readiness = paymentEisReadiness(payment, contract);

              return (
                <tr key={payment.id}>
                  <td>{payment.paymentDocumentNumber || "—"}</td>
                  <td>{payment.paymentDate || "—"}</td>
                  <td>{PAYMENT_LABELS[payment.paymentType]}</td>
                  <td>
                    {payment.paymentTypeCode ||
                      paymentXsdCodeFor(payment.paymentType)}
                  </td>
                  <td>{payment.baseDocumentType ?? "C"}</td>
                  <td>{payment.kbk || "—"}</td>
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
                  <td>
                    <span
                      className={`${styles.xmlBadge} ${
                        readiness.ok
                          ? styles.xmlBadge_ok
                          : styles.xmlBadge_error
                      }`}
                      title={eisXmlIssuesText(readiness)}
                    >
                      {eisXmlReadinessBadge(readiness)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
