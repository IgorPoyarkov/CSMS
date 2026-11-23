import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import { localIsoDate } from "../../services/ContractRegistry/contractRegistry.schema";
import {
  contractCardActAcceptedAt,
  contractCardActDecision,
  contractCardActKind,
  contractCardActPaidTotal,
  contractCardActPayment,
  contractCardActSubject,
  contractCardActSubjectFull,
  contractCardActTotal,
  contractCardActsTotal,
  contractCardDaysBetween,
  contractCardExecutionPeriod,
  contractCardPaymentAct,
  contractCardPaymentDeadline,
  contractCardPaymentsByYear,
  contractCardPaymentsTotal,
  contractCardRecipientName,
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

/** Сегодня в формате проекции: по нему проверяем, истёк ли срок оплаты. */
const todayIso = (): string => localIsoDate();

/** «просрочка 3 дн.» — единый текст для подсветки нарушенных сроков. */
const daysLabel = (days: number): string =>
  days === 1 ? "1 день" : days < 5 ? `${days} дня` : `${days} дней`;

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
 * вводом нельзя. Если выгрузки нет — секция остаётся с пояснением, почему в
 * карточке нет ни одного акта и ни одной платёжки.
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
          Ручного учёта платежей в карточке нет: платёжные документы подписаны
          в ЕИС, дублировать их ручным вводом нельзя.
        </p>
      </section>
    );
  }

  const { Acts: acts, Payments: payments, Decisions: decisions } = projection;
  const acceptedTotal = contractCardActsTotal(acts);
  const paidTotal = contractCardPaymentsTotal(payments);
  const unpaidTotal = Math.max(0, acceptedTotal - paidTotal);
  // Срок исполнения контракта целиком: по нему видно, уложился ли подрядчик в
  // срок приёмки. У этапов свои даты, но акт без этапа иначе не проверить
  const execution = contractCardExecutionPeriod(projection);
  // Разбивка оплат по годам: `paymentsSumInfo` в выгрузке не приходит, а по
  // датам платёжных поручений она считается и показывает, как идёт исполнение
  const paymentsByYear = contractCardPaymentsByYear(payments);

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
        {/* Оплаты по годам — вместо отсутствующего paymentsSumInfo */}
        {paymentsByYear.length > 1 &&
          paymentsByYear.map((row) => (
            <span key={row.year} className={styles.projectionChip}>
              {row.year}: {money(row.sum)} ₽
            </span>
          ))}
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
                <th>Вид документа</th>
                <th>Дата</th>
                <th>Предмет приёмки</th>
                <th>Сумма с НДС, ₽</th>
                <th>Решение заказчика</th>
                <th>Оплата</th>
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
                  executionEnd={execution.end}
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
                <ProjectionPaymentRow
                  key={payment.DocumentId ?? payment.FileName ?? index}
                  payment={payment}
                  acts={acts}
                  decisions={decisions}
                  onPrint={() =>
                    openDocument(() =>
                      buildPaymentOrderDocument(payment, documentContext),
                    )
                  }
                />
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

/**
 * Строка платёжного поручения из карточки ЕИС.
 *
 * Получатель и назначение платежа бывают очень длинными (назначение — до
 * нескольких сотен знаков), поэтому показываем три строки с многоточием, а
 * полный текст — в подсказке. Связка с актом приёмки проверяется обратным
 * сопоставлением: если в платёжке номер есть, а такого акта в выгрузке нет или
 * номера не совпали, это видно пометкой, а не пустой ячейкой — иначе непонятно,
 * акта нет или он просто не связан.
 */
function ProjectionPaymentRow({
  payment,
  acts,
  decisions,
  onPrint,
}: {
  payment: ContractCardPayment;
  acts: ContractCardAct[];
  decisions: ContractCardDecision[];
  onPrint: () => void;
}) {
  const act = contractCardPaymentAct(payment, acts);
  const recipient = contractCardRecipientName(payment.RecipientName);
  // Срок оплаты считается от подписания документа о приёмке (ч. 13.1 ст. 34)
  const deadline = act
    ? contractCardPaymentDeadline(contractCardActAcceptedAt(act, decisions))
    : null;
  const lateDays = deadline
    ? contractCardDaysBetween(deadline, payment.DocumentDate)
    : null;

  return (
    <tr>
      <td>
        № {payment.DocumentNumber ?? "—"}
        {payment.PaymentType && (
          <span className={styles.projectionNote}>{payment.PaymentType}</span>
        )}
      </td>
      <td>
        {shortDate(payment.DocumentDate)}
        {deadline && (
          <span
            className={`${styles.projectionNote} ${
              (lateDays ?? 0) > 0
                ? styles.projectionLate
                : styles.projectionOk
            }`}
            title={`Срок оплаты по ч. 13.1 ст. 34 — ${shortDate(deadline)}`}
          >
            {(lateDays ?? 0) > 0
              ? `позже срока на ${daysLabel(lateDays as number)}`
              : "в срок"}
          </span>
        )}
      </td>
      <td className={styles.moneyCell}>{money(payment.Sum)}</td>
      <td>
        <span
          className={styles.projectionClamp3}
          title={payment.RecipientName ?? undefined}
        >
          {recipient || "—"}
        </span>
        {payment.RecipientInn && (
          <span className={styles.projectionNote}>
            ИНН {payment.RecipientInn}
          </span>
        )}
      </td>
      <td>
        {act ? (
          <>
            № {act.ActNumber ?? "—"} от {shortDate(act.ActDate)}
            <span className={styles.projectionNote}>
              {contractCardActKind(act).label}
            </span>
          </>
        ) : payment.AcceptanceDocumentNumber ? (
          <>
            № {payment.AcceptanceDocumentNumber} от{" "}
            {shortDate(payment.AcceptanceDocumentDate)}
            <span className={`${styles.projectionNote} ${styles.projectionLate}`}>
              такого акта в выгрузке нет
            </span>
          </>
        ) : (
          <span className={styles.projectionMissing}>не сопоставлен</span>
        )}
      </td>
      <td>
        <span
          className={styles.projectionClamp3}
          title={payment.Purpose ?? undefined}
        >
          {payment.Purpose ?? "—"}
        </span>
      </td>
      <td>
        <button
          type="button"
          className={styles.projectionDocButton}
          onClick={onPrint}
          title="Печатная форма по реквизитам платёжного поручения"
        >
          Платёжка
        </button>
      </td>
    </tr>
  );
}

/**
 * Строка акта приёмки. Вид документа берём из КНД (`1115131` — УПД), предмет —
 * из состава акта (`WorkItems`), а не из названия файла: в актах работ там
 * перечислены позиции сметы, в УПД — отгруженные товары. Сроки проверяются по
 * двум правилам: приёмка — в срок исполнения контракта, оплата — 7 рабочих дней
 * с подписания документа о приёмке (ч. 13.1 ст. 34 44-ФЗ).
 */
function ProjectionActRow({
  act,
  payments,
  decisions,
  executionEnd,
  onPrint,
}: {
  act: ContractCardAct;
  payments: ContractCardPayment[];
  decisions: ContractCardDecision[];
  /** Дата окончания исполнения из карточки: null — срок не выгружен. */
  executionEnd: string;
  onPrint: () => void;
}) {
  const decision = contractCardActDecision(act, decisions);
  const paid = contractCardActPaidTotal(act, payments);
  const payment = contractCardActPayment(act, payments);
  const kind = contractCardActKind(act);
  const subject = contractCardActSubject(act);
  const subjectFull = contractCardActSubjectFull(act);
  const stage = act.Stage?.TechnicalSid ?? act.Stage?.Sid ?? null;
  // Акт после срока исполнения — нарушение подрядчика, а не заказчика
  const lateDays = executionEnd
    ? contractCardDaysBetween(executionEnd, act.ActDate)
    : null;
  const acceptedAt = contractCardActAcceptedAt(act, decisions);
  const deadline = contractCardPaymentDeadline(acceptedAt);
  // Просрочка заказчика: платёж позже срока либо срока нет и он уже истёк
  const paidLateDays =
    payment && deadline
      ? contractCardDaysBetween(deadline, payment.DocumentDate)
      : null;
  const unpaidLateDays = payment ? null : contractCardDaysBetween(deadline, todayIso());

  return (
    <tr>
      <td>
        № {act.ActNumber ?? "—"}
        {stage && <span className={styles.projectionNote}>этап {stage}</span>}
      </td>
      <td>
        <span className={kind.isUpd ? styles.projectionChip : undefined}>
          {kind.label}
        </span>
        {kind.code && (
          <span className={styles.projectionNote}>КНД {kind.code}</span>
        )}
      </td>
      <td>
        {shortDate(act.ActDate)}
        {lateDays !== null && lateDays > 0 && (
          <span className={`${styles.projectionNote} ${styles.projectionLate}`}>
            позже срока на {daysLabel(lateDays)}
          </span>
        )}
      </td>
      <td>
        <span className={styles.projectionClamp3} title={subjectFull}>
          {subject || "—"}
        </span>
      </td>
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
      <td className={styles.moneyCell}>
        {paid > 0 ? money(paid) : "—"}
        {payment && (
          <span className={styles.projectionNote}>
            {shortDate(payment.DocumentDate)}
          </span>
        )}
        {deadline && (
          <span
            className={`${styles.projectionNote} ${
              (paidLateDays ?? 0) > 0 || (unpaidLateDays ?? 0) > 0
                ? styles.projectionLate
                : styles.projectionOk
            }`}
            title={`Срок оплаты по ч. 13.1 ст. 34 — ${shortDate(deadline)}`}
          >
            {payment
              ? (paidLateDays ?? 0) > 0
                ? `оплата позже срока на ${daysLabel(paidLateDays as number)}`
                : "в срок"
              : (unpaidLateDays ?? 0) > 0
                ? `срок истёк ${shortDate(deadline)}`
                : `оплатить до ${shortDate(deadline)}`}
          </span>
        )}
      </td>
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
