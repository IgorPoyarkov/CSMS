import { useMemo } from "react";
import type {
  ContractRegistryItem,
  ContractStage,
} from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import { contractCardPaymentsByYear } from "../../services/ContractRegistry/contractCardProjection.schema";
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

/** Сегодня в формате ЕИС: по нему видно, истёк ли срок этапа. */
const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Этапы в порядке исполнения: номер этапа главнее дат (в ЕИС бывают опечатки). */
const sortStages = (stages: ContractStage[]): ContractStage[] =>
  [...stages].sort((left, right) => {
    const byNumber = Number(left.stageNumber) - Number(right.stageNumber);
    if (Number.isFinite(byNumber) && byNumber !== 0) return byNumber;
    return String(left.startDate ?? "").localeCompare(
      String(right.startDate ?? ""),
    );
  });

/**
 * Этапы исполнения контракта.
 *
 * Секция вынесена из реестра: реестр больше не грузит этапы на каждое
 * раскрытие строки, их показывает только карточка контракта.
 *
 * В ЕИС контракт не обязан быть разбит на этапы — тогда этап один, и это
 * весь контракт: его срок и его цена. Раньше на таком контракте секция
 * просто исчезала, и было не понять: этапов нет или данные не загрузились.
 *
 * Разбивка оплаты по годам (`paymentsSumInfo`) приходит не в каждой выгрузке:
 * для контракта целиком она считается по датам платёжных поручений, а у этапов
 * показывается «нет в выгрузке», а не нули.
 */
export default function ContractStagesSection({
  contractId,
  contract,
}: ContractStagesSectionProps) {
  const { data: stages } = useContractStages(contractId);
  const { data: projection } = useContractCardProjection(contractId);
  const { formatDate } = useUtils();

  const ordered = useMemo(() => sortStages(stages ?? []), [stages]);
  // Оплаты по годам из платёжных поручений: `paymentsSumInfo` в выгрузке нет
  const paidByYear = useMemo(
    () =>
      contractCardPaymentsByYear(projection?.Payments ?? [])
        .map((row) => `${row.year}: ${formatMoney(row.sum)} ₽`)
        .join(" / "),
    [projection],
  );

  if (!stages) return null;

  if (ordered.length === 0) {
    if (!contract) return null;

    // Срок берём из записи реестра, а если он пуст — из карточки ЕИС
    const start =
      formatDate(contract.executionStartDate) ||
      formatDate(projection?.General?.ExecutionStartDate ?? undefined);
    const end =
      formatDate(contract.executionEndDate) ||
      formatDate(projection?.General?.ExecutionEndDate ?? undefined);
    const period = start && end ? `${start} — ${end}` : "срок не указан";
    // Контракт не разбит на этапы: акты и платёжки относятся к нему целиком
    const acceptedCount = projection?.Acts.length ?? 0;
    const paidTotal =
      projection?.Payments.reduce((sum, payment) => sum + (payment.Sum ?? 0), 0) ??
      0;

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
              <th>По годам, ₽</th>
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
              <td>
                Весь контракт
                {acceptedCount > 0 && (
                  <span className={styles.projectionNote}>
                    актов приёмки: {acceptedCount}
                  </span>
                )}
              </td>
              <td>{period}</td>
              <td>{formatMoney(contract.contractPrice)}</td>
              <td>{paidByYear || "—"}</td>
              <td>{paidTotal > 0 ? formatMoney(paidTotal) : "—"}</td>
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

  const today = todayIso();

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
            <th>По годам, ₽</th>
            <th>Оплачено, ₽</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((stage) => {
            const yearly = [
              stage.paymentsSumInfo?.currentYear,
              stage.paymentsSumInfo?.firstYear,
              stage.paymentsSumInfo?.secondYear,
              stage.paymentsSumInfo?.subsequentYears,
            ];
            const hasYearly = yearly.some((value) => Number(value ?? 0) > 0);
            // Срок этапа прошёл, а этап не закрыт — просрочка подрядчика:
            // в статусе ЕИС она выставлена не всегда, поэтому считаем сами
            const end = String(stage.endDate ?? "").slice(0, 10);
            const lateDays =
              end && end < today && stage.status !== "completed"
                ? Math.round(
                    (new Date(`${today}T00:00:00`).getTime() -
                      new Date(`${end}T00:00:00`).getTime()) /
                      86_400_000,
                  )
                : 0;

            return (
              <tr key={stage.id}>
                <td>{stage.stageNumber}</td>
                <td>{stage.sid || "—"}</td>
                <td>{stage.name}</td>
                <td>
                  {formatDate(stage.startDate) || "…"} —{" "}
                  {formatDate(stage.endDate) || "…"}
                  {lateDays > 0 && (
                    <span
                      className={`${styles.projectionNote} ${styles.projectionLate}`}
                    >
                      срок истёк, просрочка {lateDays} дн.
                    </span>
                  )}
                </td>
                <td>{formatMoney(stage.amount)}</td>
                <td>
                  {hasYearly ? (
                    yearly.map((value) => formatMoney(value)).join(" / ")
                  ) : (
                    <span className={styles.projectionMissing}>
                      нет в выгрузке
                    </span>
                  )}
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
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

