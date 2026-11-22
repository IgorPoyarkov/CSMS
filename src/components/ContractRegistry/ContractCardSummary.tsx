import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  paymentPercent,
  type ContractRegistryItem,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  prefetchContract,
  useContractPaymentsSummary,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useContractSmpVolume } from "../../services/ContractSmp/contractSmp.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useAcceptanceSummary } from "../ContractAcceptance/acceptanceSummary";
import { formatMoney, percentOf, plural } from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

interface ContractCardSummaryProps {
  contract: ContractRegistryItem;
  /** Ссылка на полную карточку: в реестре нужна, внутри карточки — нет. */
  cardLink?: string;
}

/** Пустой объём СМП до загрузки: цифры не прыгают при раскрытии строки. */
const EMPTY_SMP_VOLUME = {
  required: 0,
  actual: 0,
  shortfall: 0,
  progress: 0,
  isComplete: false,
};

/**
 * Сводка исполнения контракта: оплата, приёмка, СМП — цифры и прогресс.
 *
 * Зачем отдельный компонент: реестр раньше на каждое раскрытие строки
 * монтировал восемь секций и делал столько же запросов, из-за чего список
 * «задумывался». Здесь три запроса с общими ключами react-query (платежи,
 * приёмки, СМП), а полные таблицы живут на роуте карточки контракта.
 *
 * Агрегаты считаются селекторами в API-слоях (`useContractPaymentsSummary`,
 * `useAcceptanceSummary`, `useContractSmpVolume`): данные в кэше общие с
 * секциями карточки, а суммы пересчитываются только при их изменении.
 */
export default function ContractCardSummary({
  contract,
  cardLink,
}: ContractCardSummaryProps) {
  const contractId = contract.id;
  const queryClient = useQueryClient();
  const { data: organization } = useCurrentOrganization();
  const organizationId = organization ? String(organization.id) : "";

  const { data: paymentsSummary } = useContractPaymentsSummary(contractId);
  const { data: acceptanceSummary } = useAcceptanceSummary(
    organizationId || undefined,
    contractId === undefined ? undefined : String(contractId),
  );
  const { data: smpVolume } = useContractSmpVolume(
    contractId,
    contract.contractPrice,
    contract.smpRequiredPercent,
  );

  const paymentCount = paymentsSummary?.count ?? 0;
  const paid = paymentsSummary?.paid ?? "0";
  const paidPercent = paymentPercent(paid, contract.contractPrice);

  // Принятая сумма — только по состоявшимся приёмкам: черновики и отказы
  // в исполнение не идут
  const acceptedCount = acceptanceSummary?.acceptedCount ?? 0;
  const acceptedTotal = acceptanceSummary?.acceptedTotal ?? 0;
  const acceptedPercent = percentOf(acceptedTotal, contract.contractPrice);
  const inReview = acceptanceSummary?.onReview ?? 0;

  const smp = smpVolume ?? EMPTY_SMP_VOLUME;
  const smpPercent = Math.round(smp.progress);

  // Наведение на ссылку заранее тянет карточку: переход открывается из кэша
  const prefetch = () => {
    if (contractId === undefined || contractId === null) return;
    void prefetchContract(queryClient, contractId);
  };

  return (
    <section className={styles.summarySection}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Оплата</span>
          <strong className={styles.summaryValue}>{formatMoney(paid)} ₽</strong>
          <span className={styles.summaryHint}>
            из {formatMoney(contract.contractPrice)} ₽ · {paymentCount}{" "}
            {plural(paymentCount, ["платёж", "платежа", "платежей"])}
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
            {acceptedCount}{" "}
            {plural(acceptedCount, ["документ", "документа", "документов"])} ·{" "}
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
          <Link
            className={styles.btnPrimary}
            to={cardLink}
            onMouseEnter={prefetch}
            onFocus={prefetch}
          >
            Открыть карточку контракта
          </Link>
        </div>
      )}
    </section>
  );
}
