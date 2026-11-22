import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import {
  contractCardActDecision,
  contractCardActPaidTotal,
  contractCardActTotal,
  contractCardActsTotal,
  contractCardPaymentsTotal,
  type ContractCardAct,
  type ContractCardDecision,
  type ContractCardPayment,
} from "../../services/ContractRegistry/contractCardProjection.schema";
import styles from "./ContractRegistry.module.scss";

/** Сумма как в остальной карточке: два знака и пробелы между разрядами. */
const money = (value: number | null): string =>
  value === null
    ? "—"
    : value.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/** Даты в проекции приходят как ГГГГ-ММ-ДД → показываем ДД.ММ.ГГГГ. */
const shortDate = (value: string | null): string => {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return day && month && year ? `${day}.${month}.${year}` : value;
};

/** Длинное назначение платежа не должно раздвигать таблицу. */
const clamp = (value: string | null, limit = 90): string => {
  if (!value) return "—";
  return value.length <= limit ? value : `${value.slice(0, limit)}…`;
};

interface ContractCardProjectionSectionProps {
  contractId?: string | number;
}

/**
 * Секция «Приёмка и оплата по данным карточки ЕИС».
 *
 * Показывает акты приёмки и платёжные поручения из публичной карточки
 * контракта (коллекция `contractCardProjections`, выгрузка воркера
 * `eis-parser`). Это единственный источник фактических приёмок и оплат
 * заказчика: `contractPayments` и `contractDeliveries` ведутся вручную и
 * сейчас пусты, поэтому без проекции сводка показывает «Оплачено: 0 ₽».
 *
 * Данные только для чтения: они уже подписаны в ЕИС, дублировать их ручным
 * вводом нельзя. Если выгрузки нет — секция не рисуется.
 */
export default function ContractCardProjectionSection({
  contractId,
}: ContractCardProjectionSectionProps) {
  const { data: projection } = useContractCardProjection(contractId);

  if (!projection) return null;

  const { Acts: acts, Payments: payments, Decisions: decisions } = projection;
  const acceptedTotal = contractCardActsTotal(acts);
  const paidTotal = contractCardPaymentsTotal(payments);
  const unpaidTotal = Math.max(0, acceptedTotal - paidTotal);

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>
        Приёмка и оплата по данным карточки ЕИС
      </h4>

      <div className={styles.projectionSummary}>
        <span className={styles.projectionChip}>
          Актов приёмки: {acts.length} на {money(acceptedTotal)} ₽
        </span>
        <span className={styles.projectionChip}>
          Платёжных поручений: {payments.length} на {money(paidTotal)} ₽
        </span>
        {unpaidTotal > 0 && (
          <span
            className={`${styles.projectionChip} ${styles.projectionChipAlert}`}
          >
            Принято без оплаты: {money(unpaidTotal)} ₽
          </span>
        )}
      </div>

      {acts.length === 0 && payments.length === 0 && (
        <p className={styles.projectionEmpty}>
          В выгрузке карточки ЕИС нет документов о приёмке и платёжных
          поручений по этому контракту.
        </p>
      )}

      {acts.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Акт</th>
              <th>Дата</th>
              <th>Предмет приёмки</th>
              <th>Позиций</th>
              <th>Сумма с НДС, ₽</th>
              <th>Решение заказчика</th>
              <th>Оплачено, ₽</th>
            </tr>
          </thead>
          <tbody>
            {acts.map((act, index) => (
              <ProjectionActRow
                key={act.FileName ?? `${act.ActNumber}-${act.ActDate}-${index}`}
                act={act}
                payments={payments}
                decisions={decisions}
              />
            ))}
          </tbody>
        </table>
      )}

      {payments.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Платёжное поручение</th>
              <th>Дата</th>
              <th>Сумма, ₽</th>
              <th>Акт приёмки</th>
              <th>Назначение платежа</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => (
              <tr key={payment.DocumentId ?? payment.FileName ?? index}>
                <td>
                  № {payment.DocumentNumber ?? "—"}
                  {payment.PaymentType && (
                    <span className={styles.projectionNote}>
                      {payment.PaymentType}
                    </span>
                  )}
                </td>
                <td>{shortDate(payment.DocumentDate)}</td>
                <td className={styles.moneyCell}>{money(payment.Sum)}</td>
                <td>
                  {payment.AcceptanceDocumentNumber
                    ? `№ ${payment.AcceptanceDocumentNumber} от ${shortDate(
                        payment.AcceptanceDocumentDate,
                      )}`
                    : "—"}
                </td>
                <td>
                  <span
                    className={styles.projectionPurpose}
                    title={payment.Purpose ?? undefined}
                  >
                    {clamp(payment.Purpose)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.projectionMeta}>
        <span>
          Выгрузка ЕИС: {shortDate(projection.importedAt)} · сообщений ЭДО:{" "}
          {projection.Messages.length}
        </span>
        {projection.eisUrl && (
          <a
            className={styles.projectionLink}
            href={projection.eisUrl}
            target="_blank"
            rel="noreferrer"
          >
            Карточка контракта в ЕИС
          </a>
        )}
      </div>
    </section>
  );
}

/** Строка акта приёмки: решение заказчика и оплата берутся из этой же выгрузки. */
function ProjectionActRow({
  act,
  payments,
  decisions,
}: {
  act: ContractCardAct;
  payments: ContractCardPayment[];
  decisions: ContractCardDecision[];
}) {
  const decision = contractCardActDecision(act, decisions);
  const paid = contractCardActPaidTotal(act, payments);
  const subject = act.Period?.OperationContent ?? act.ObjectName;
  const stage = act.Stage?.TechnicalSid ?? act.Stage?.Sid ?? null;

  return (
    <tr>
      <td>
        № {act.ActNumber ?? "—"}
        {stage && <span className={styles.projectionNote}>этап {stage}</span>}
      </td>
      <td>{shortDate(act.ActDate)}</td>
      <td>
        <span className={styles.projectionPurpose} title={subject ?? undefined}>
          {clamp(subject, 110)}
        </span>
      </td>
      <td>{act.WorkItems.length > 0 ? act.WorkItems.length : "—"}</td>
      <td className={styles.moneyCell}>{money(contractCardActTotal(act))}</td>
      <td>
        {decision ? (
          `подписано ${shortDate(
            decision.PostedDocumentDate ?? decision.InfoDate,
          )}`
        ) : (
          <span className={styles.projectionMissing}>нет решения</span>
        )}
      </td>
      <td className={styles.moneyCell}>{paid > 0 ? money(paid) : "—"}</td>
    </tr>
  );
}
