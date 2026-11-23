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
import {
  buildAcceptanceActDocument,
  buildPaymentOrderDocument,
  printDocument,
  type ContractDocumentContext,
} from "../../services/ContractRegistry/contractExecutionDocument";
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
 * вводом нельзя. Если выгрузки нет — секция остаётся с пояснением: на неё
 * ссылаются ручные «Платежи» и «Поставки и приёмка».
 */
export default function ContractCardProjectionSection({
  contractId,
}: ContractCardProjectionSectionProps) {
  const { data: projection, isLoading, isError } =
    useContractCardProjection(contractId);

  // Пока идёт первый запрос или адаптер недоступен, секцию не рисуем: пустое
  // состояние ниже — про отсутствие выгрузки, а не про сетевую ошибку.
  if (!contractId || isLoading || isError) return null;

  // Выгрузки по контракту нет. Секцию всё равно показываем: на неё ссылаются
  // ручные «Платежи» и «Поставки и приёмка», и без неё ссылка ведёт в никуда.
  if (!projection) {
    return (
      <section id="contract-execution" className={styles.subSection}>
        <h4 className={styles.subTitle}>
          Приёмка и оплата по данным карточки ЕИС
        </h4>
        <p className={styles.projectionEmpty}>
          Выгрузки карточки ЕИС по этому контракту нет: фактических актов
          приёмки и платёжных поручений в базе нет. Выгрузку снимает воркер
          eis-parser — пока её нет, фактическая оплата в карточку не попадает.
          Ручной учёт — в секциях «Платежи» и «Поставки и приёмка» ниже.
        </p>
      </section>
    );
  }

  const { Acts: acts, Payments: payments, Decisions: decisions } = projection;
  const acceptedTotal = contractCardActsTotal(acts);
  const paidTotal = contractCardPaymentsTotal(payments);
  const unpaidTotal = Math.max(0, acceptedTotal - paidTotal);

  // Реквизиты контракта для печатных форм: блок General (HTML-карточка ЕИС),
  // а если его ещё нет — номер из импорта. Подрядчика добирает сам документ
  // из сторон акта или строки платежа.
  const documentContext: ContractDocumentContext = {
    contractNumber: projection.General?.ContractNumber ?? projection.contractNumber,
    contractDate: projection.General?.ContractDate,
    contractName: projection.General?.ContractName,
    customerName: projection.General?.CustomerName,
    customerInn: projection.General?.CustomerInn,
    customerKpp: projection.General?.CustomerKpp,
    supplierName: projection.General?.SupplierName,
    supplierInn: projection.General?.SupplierInn,
    supplierKpp: projection.General?.SupplierKpp,
    source: projection.importedAt
      ? `от ${shortDate(projection.importedAt)}`
      : null,
  };

  const openDocument = (build: () => ReturnType<typeof buildAcceptanceActDocument>) => {
    const document = build();
    if (!printDocument(document)) {
      // Попап заблокирован браузером — молчание выглядело бы как «кнопка не работает»
      alert(
        "Браузер заблокировал окно печати. Разрешите всплывающие окна для этой страницы и повторите.",
      );
    }
  };

  return (
    <section id="contract-execution" className={styles.subSection}>
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

      {/* Якоря для плиток сводки: оплата и приёмка ведут к своим таблицам.
          Обёртки есть всегда — переход не должен упираться в пустоту, когда
          документов нет */}
      <div id="contract-acceptance">
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
                <th>Документ</th>
              </tr>
            </thead>
            <tbody>
              {acts.map((act, index) => (
                <ProjectionActRow
                  key={act.FileName ?? `${act.ActNumber}-${act.ActDate}-${index}`}
                  act={act}
                  payments={payments}
                  decisions={decisions}
                  onPrint={() =>
                    openDocument(() =>
                      buildAcceptanceActDocument(act, documentContext),
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div id="contract-payments">
        {payments.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Платёжное поручение</th>
                <th>Дата</th>
                <th>Сумма, ₽</th>
                <th>Получатель (подрядчик)</th>
                <th>Акт приёмки</th>
                <th>Назначение платежа</th>
                <th>Документ</th>
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
                    {clamp(payment.RecipientName, 60)}
                    {payment.RecipientInn && (
                      <span className={styles.projectionNote}>
                        ИНН {payment.RecipientInn}
                      </span>
                    )}
                  </td>
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
                  <td>
                    <button
                      type="button"
                      className={styles.projectionDocButton}
                      onClick={() =>
                        openDocument(() =>
                          buildPaymentOrderDocument(payment, documentContext),
                        )
                      }
                      title="Печатная форма по реквизитам платёжного поручения"
                    >
                      Платёжка
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
  onPrint,
}: {
  act: ContractCardAct;
  payments: ContractCardPayment[];
  decisions: ContractCardDecision[];
  onPrint: () => void;
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
      <td>
        <button
          type="button"
          className={styles.projectionDocButton}
          onClick={onPrint}
          title="Печатная форма по реквизитам акта приёмки"
        >
          Акт
        </button>
      </td>
    </tr>
  );
}
