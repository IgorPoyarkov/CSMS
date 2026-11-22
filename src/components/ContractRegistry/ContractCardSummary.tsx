import { Link } from "react-router-dom";
import {
  paymentPercent,
  totalPaid,
  type ContractRegistryItem,
} from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractPayments } from "../../services/ContractRegistry/contractRegistry.api";
import { useAcceptances } from "../../services/Acceptance/acceptance.api";
import { useContractSmpRecords } from "../../services/ContractSmp/contractSmp.api";
import { computeSmpVolume } from "../../services/ContractSmp/contractSmp.schema";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  acceptedAcceptanceStatuses,
  reviewAcceptanceStatuses,
} from "../ContractAcceptance/acceptance.config";
import { formatMoney, percentOf, plural } from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

interface ContractCardSummaryProps {
  contract: ContractRegistryItem;
  /** Ссылка на полную карточку: в реестре нужна, внутри карточки — нет. */
  cardLink?: string;
}

/**
 * Сводка исполнения контракта: оплата, приёмка, СМП — цифры и прогресс.
 *
 * Зачем отдельный компонент: реестр раньше на каждое раскрытие строки
 * монтировал восемь секций и делал столько же запросов, из-за чего список
 * «задумывался». Здесь три запроса с общими ключами react-query (платежи,
 * приёмки, СМП), а полные таблицы живут на роуте карточки контракта.
 */
export default function ContractCardSummary({
  contract,
  cardLink,
}: ContractCardSummaryProps) {
  const contractId = contract.id;
  const { data: organization } = useCurrentOrganization();
  const organizationId = organization ? String(organization.id) : "";

  const { data: payments = [] } = useContractPayments(contractId);
  const { data: acceptances = [] } = useAcceptances(
    organizationId || undefined,
    contractId === undefined ? undefined : String(contractId),
  );
  const { data: smpRecords = [] } = useContractSmpRecords(contractId);

  const paid = totalPaid(payments);
  const paidPercent = paymentPercent(paid, contract.contractPrice);

  // Принятая сумма — только по состоявшимся приёмкам: черновики и отказы
  // в исполнение не идут
  const accepted = acceptances.filter((acceptance) =>
    acceptedAcceptanceStatuses.includes(acceptance.status),
  );
  const acceptedTotal = accepted.reduce(
    (sum, acceptance) => sum + acceptance.totalWithVat,
    0,
  );
  const acceptedPercent = percentOf(acceptedTotal, contract.contractPrice);
  const inReview = acceptances.filter((acceptance) =>
    reviewAcceptanceStatuses.includes(acceptance.status),
  ).length;

  const smp = computeSmpVolume(
    smpRecords,
    contract.contractPrice,
    contract.smpRequiredPercent,
  );
  const smpPercent = Math.round(smp.progress);

  return (
    <section className={styles.summarySection}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Оплата</span>
          <strong className={styles.summaryValue}>{formatMoney(paid)} ₽</strong>
          <span className={styles.summaryHint}>
            из {formatMoney(contract.contractPrice)} ₽ · {payments.length}{" "}
            {plural(payments.length, ["платёж", "платежа", "платежей"])}
          </span>
          <div className={styles.summaryTrack}>
            <div
              className={`${styles.summaryFill} ${
                paidPercent >= 100 ? styles.summaryFillOk : ""
              }`}
              style={{ width: `${Math.min(paidPercent, 100)}%` }}
            />
          </div>
          <span className={styles.summaryPercent}>{paidPercent}%</span>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Приёмка</span>
          <strong className={styles.summaryValue}>
            {formatMoney(acceptedTotal)} ₽
          </strong>
          <span className={styles.summaryHint}>
            {accepted.length}{" "}
            {plural(accepted.length, ["документ", "документа", "документов"])} ·{" "}
            {inReview > 0
              ? `на рассмотрении: ${inReview}`
              : "нет документов в работе"}
          </span>
          <div className={styles.summaryTrack}>
            <div
              className={`${styles.summaryFill} ${
                acceptedPercent >= 100 ? styles.summaryFillOk : ""
              }`}
              style={{ width: `${Math.min(acceptedPercent, 100)}%` }}
            />
          </div>
          <span className={styles.summaryPercent}>{acceptedPercent}%</span>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Привлечение СМП</span>
          <strong className={styles.summaryValue}>
            {formatMoney(smp.actual)} ₽
          </strong>
          <span className={styles.summaryHint}>
            требуется {formatMoney(smp.required)} ₽
            {contract.smpRequiredPercent
              ? ` (${contract.smpRequiredPercent}%)`
              : ""}
            {smp.shortfall > 0 ? ` · дефицит ${formatMoney(smp.shortfall)} ₽` : ""}
          </span>
          <div className={styles.summaryTrack}>
            <div
              className={`${styles.summaryFill} ${
                smpPercent >= 100 ? styles.summaryFillOk : ""
              }`}
              style={{ width: `${Math.min(smpPercent, 100)}%` }}
            />
          </div>
          <span className={styles.summaryPercent}>{smpPercent}%</span>
        </div>
      </div>

      {cardLink && (
        <div className={styles.summaryFooter}>
          <Link className={styles.btnPrimary} to={cardLink}>
            Открыть карточку контракта
          </Link>
        </div>
      )}
    </section>
  );
}
