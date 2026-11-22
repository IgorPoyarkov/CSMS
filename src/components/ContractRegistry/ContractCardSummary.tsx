import { useMemo, type ReactNode } from "react";
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
import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import {
  contractCardActsTotal,
  contractCardPaymentsTotal,
  contractCardSmpRequirement,
  contractCardSmpRows,
  contractCardSmpTotal,
  type ContractCardAct,
  type ContractCardPayment,
} from "../../services/ContractRegistry/contractCardProjection.schema";
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

/** Пустые выгрузки ЕИС — чтобы не создавать новый массив на каждом рендере. */
const EMPTY_EIS_ACTS: ContractCardAct[] = [];
const EMPTY_EIS_PAYMENTS: ContractCardPayment[] = [];

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
 *
 * Факт по контрактам из ЕИС берётся из выгрузки карточки
 * (`useContractCardProjection`): ручные платежи и электронное актирование по
 * ним не ведутся, поэтому оплата, приёмка и объём СМП подставляются из неё.
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

  // Требование о привлечении СМП может быть только в ЕИС: у контрактов из
  // реестра своего процента нет, и без этой ветки сводка показывала
  // «требуется 0,00 ₽», хотя в карточке ЕИС условие заполнено
  const { data: projection } = useContractCardProjection(contractId);
  const eisRequirement = useMemo(
    () => contractCardSmpRequirement(projection?.Smp ?? []),
    [projection],
  );
  const eisActual = useMemo(
    () => contractCardSmpTotal(contractCardSmpRows(projection?.Smp ?? [])),
    [projection],
  );

  const ownPercent =
    Number(contract.smpRequiredPercent ?? 0) > 0
      ? contract.smpRequiredPercent
      : undefined;
  const smpPercentSource = ownPercent ?? eisRequirement.percent ?? undefined;

  const { data: smpVolume } = useContractSmpVolume(
    contractId,
    contract.contractPrice,
    smpPercentSource,
    eisActual > 0 ? eisActual : undefined,
  );

  // Оплата и приёмка: ручные записи и электронное актирование приоритетнее, но
  // у контрактов из ЕИС их нет вовсе — тогда показываем фактические акты и
  // платёжные поручения из выгрузки карточки. Без этой ветки сводка всегда
  // писала «0,00 ₽ · 0 платежей», хотя в ЕИС оплата и приёмка есть
  const eisActs = projection?.Acts ?? EMPTY_EIS_ACTS;
  const eisPayments = projection?.Payments ?? EMPTY_EIS_PAYMENTS;
  const eisPaidTotal = contractCardPaymentsTotal(eisPayments);
  const eisAcceptedTotal = contractCardActsTotal(eisActs);

  const manualPaymentCount = paymentsSummary?.count ?? 0;
  const manualPaid = Number(paymentsSummary?.paid ?? 0);
  const usesEisPayments = manualPaymentCount === 0 && eisPayments.length > 0;

  const paymentCount = usesEisPayments ? eisPayments.length : manualPaymentCount;
  const paid = usesEisPayments ? eisPaidTotal : manualPaid;
  const paidPercent = paymentPercent(
    String(paid),
    String(contract.contractPrice ?? 0),
  );

  // Принятая сумма — только по состоявшимся приёмкам: черновики и отказы
  // в исполнение не идут. Акты из ЕИС уже подписаны заказчиком
  const manualAcceptedCount = acceptanceSummary?.acceptedCount ?? 0;
  const usesEisActs = manualAcceptedCount === 0 && eisActs.length > 0;

  const acceptedCount = usesEisActs ? eisActs.length : manualAcceptedCount;
  const acceptedTotal = usesEisActs
    ? eisAcceptedTotal
    : (acceptanceSummary?.acceptedTotal ?? 0);
  const acceptedPercent = percentOf(acceptedTotal, contract.contractPrice);
  const inReview = acceptanceSummary?.onReview ?? 0;

  const smp = smpVolume ?? EMPTY_SMP_VOLUME;
  const smpPercent = Math.round(smp.progress);
  // Требование о привлечении СМП есть не в каждом контракте: без условия и без
  // объёма плитки просто нет. Раньше она висела у всех и писала «0 из 0»,
  // хотя привлекать субподрядчиков по такому контракту не обязаны
  const showSmpTile =
    Boolean(smpPercentSource) || smp.required > 0 || smp.actual > 0;

  // Наведение на ссылку заранее тянет карточку: переход открывается из кэша
  const prefetch = () => {
    if (contractId === undefined || contractId === null) return;
    void prefetchContract(queryClient, contractId);
  };

  return (
    <section className={styles.summarySection}>
      <div className={styles.summaryGrid}>
        <SummaryTile
          label="Оплата"
          value={`${formatMoney(paid)} ₽`}
          hint={
            <>
              из {formatMoney(contract.contractPrice)} ₽ · {paymentCount}{" "}
              {plural(paymentCount, ["платёж", "платежа", "платежей"])}
            </>
          }
          percent={paidPercent}
          complete={paidPercent >= 100}
          title="Перейти к платёжным поручениям"
          to={cardLink ? `${cardLink}#contract-payments` : undefined}
          href={cardLink ? undefined : "#contract-payments"}
          onPrefetch={prefetch}
        />

        <SummaryTile
          label="Приёмка"
          value={`${formatMoney(acceptedTotal)} ₽`}
          hint={
            <>
              {acceptedCount}{" "}
              {plural(acceptedCount, ["документ", "документа", "документов"])} ·{" "}
              {inReview > 0
                ? `на рассмотрении: ${inReview}`
                : "нет документов в работе"}
            </>
          }
          percent={acceptedPercent}
          complete={acceptedPercent >= 100}
          title="Перейти к документам о приёмке"
          to={cardLink ? `${cardLink}#contract-acceptance` : undefined}
          href={cardLink ? undefined : "#contract-acceptance"}
          onPrefetch={prefetch}
        />

        {showSmpTile && (
          <SummaryTile
            label="Привлечение СМП"
            badge="СМП"
            value={`${formatMoney(smp.actual)} ₽`}
            hint={
              <>
                требуется {formatMoney(smp.required)} ₽
                {smpPercentSource ? ` (${smpPercentSource}%)` : ""}
                {smp.shortfall > 0
                  ? ` · дефицит ${formatMoney(smp.shortfall)} ₽`
                  : ""}
              </>
            }
            percent={smpPercent}
            complete={smpPercent >= 100}
            title="Перейти к сведениям о привлечении СМП"
            to={cardLink ? `${cardLink}#contract-smp` : undefined}
            href={cardLink ? undefined : "#contract-smp"}
            onPrefetch={prefetch}
          />
        )}
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

interface SummaryTileProps {
  label: string;
  value: string;
  hint: ReactNode;
  percent: number;
  /** Полоса зелёная, когда показатель закрыт на 100 %. */
  complete: boolean;
  /** Переход в другое место приложения: реестр → карточка с якорем. */
  to?: string;
  /** Якорь внутри карточки: секция, о которой говорит плитка. */
  href?: string;
  title?: string;
  /** Пометка в углу плитки: у контрактов с СМП — «СМП». */
  badge?: string;
  onPrefetch?: () => void;
}

/**
 * Плитка сводки: заголовок, сумма, пояснение и прогресс.
 *
 * Строки заданы сеткой с фиксированным местом подсказки: полоса прогресса у
 * соседних плиток стоит на одной линии, даже если пояснение заняло одну
 * строку, а не две.
 *
 * Плитка кликабельна: оплата ведёт к платёжным поручениям, приёмка — к актам,
 * СМП — к сведениям о привлечении. Стрелка в заголовке появляется при
 * наведении: видно, что это переход, а не просто цифра.
 */
function SummaryTile({
  label,
  value,
  hint,
  percent,
  complete,
  to,
  href,
  title,
  badge,
  onPrefetch,
}: SummaryTileProps) {
  const content = (
    <>
      <span className={styles.summaryHead}>
        <span className={styles.summaryLabel}>{label}</span>
        {badge && <span className={styles.summaryBadge}>{badge}</span>}
        <span className={styles.summaryArrow} aria-hidden="true">
          →
        </span>
      </span>
      <strong className={styles.summaryValue}>{value}</strong>
      <span className={styles.summaryHint}>{hint}</span>
      <div className={styles.summaryTrack}>
        <div
          className={`${styles.summaryFill} ${
            complete ? styles.summaryFillOk : ""
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={styles.summaryPercent}>{percent}%</span>
    </>
  );

  if (to) {
    return (
      <Link
        className={`${styles.summaryCard} ${styles.summaryCardLink}`}
        to={to}
        title={title}
        onMouseEnter={onPrefetch}
        onFocus={onPrefetch}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        className={`${styles.summaryCard} ${styles.summaryCardLink}`}
        href={href}
        title={title}
      >
        {content}
      </a>
    );
  }

  return <div className={styles.summaryCard}>{content}</div>;
}

