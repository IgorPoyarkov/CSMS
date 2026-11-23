import { useMemo } from "react";
import {
  paymentPercent,
  type ContractRegistryItem,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  smpRequiredAmount,
  smpVolumeProgress,
} from "../../services/ContractSmp/contractSmp.schema";
import { formatMoney, percentOf } from "./contractRegistryFormat";
import type { ContractExecutionEntry } from "./useContractExecution";
import styles from "./ContractRegistry.module.scss";

interface ContractExecutionStripProps {
  contract: ContractRegistryItem;
  /** Агрегаты по контракту; пока данных нет — undefined, полосы показывают «—» */
  execution?: ContractExecutionEntry;
  /** Первая загрузка данных: вместо нулей честный прочерк, а не «0 %» */
  loading?: boolean;
}

/** Компактный прогресс: подпись, полоса и процент — без сумм в самой строке. */
interface ExecutionBarProps {
  label: string;
  percent: number;
  /** Полный текст для наведения: суммы и документы. */
  title: string;
  loading?: boolean;
}

const ExecutionBar = ({ label, percent, title, loading }: ExecutionBarProps) => {
  const shown = Math.round(percent);

  return (
    <span className={styles.executionBar} title={title}>
      <span className={styles.executionLabel}>{label}</span>
      <span
        className={styles.executionTrack}
        role="progressbar"
        aria-label={`${label} по контракту`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(shown, 100)}
      >
        <span
          className={`${styles.executionFill} ${
            shown >= 100 ? styles.executionFillOk : ""
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </span>
      <span className={styles.executionPercent}>
        {loading ? "—" : `${shown}%`}
      </span>
    </span>
  );
};

/**
 * Индикаторы исполнения в строке реестра: две полосы — оплата и приёмка, и
 * плашка СМП справа от них.
 *
 * Зачем в списке: чтобы состояние контракта читалось не раскрывая строку и не
 * уходя в карточку — видно, идёт исполнение или нет. Подробные цифры и
 * расшифровка документов остаются в раскрытии строки (`ContractCardSummary`) и
 * на роуте карточки, здесь — только полоса и процент.
 *
 * Полосы всегда стоят первыми и в одном порядке: плашка СМП идёт после них,
 * поэтому левый край «Оплаты» и «Приёмки» не сдвигается у контрактов без
 * условия привлечения субподрядчиков. Полосы выровнены по вертикали одна под
 * другой (одинаковая ширина подписи, полосы и процента), а сам блок в строке
 * идёт отдельной строкой под предметом контракта.
 *
 * Источники те же, что у сводки карточки, и правила те же: ручные платёжные
 * поручения и электронное актирование приоритетнее, а у выгрузок ЕИС, где их
 * нет, подставляются платёжные поручения и акты из карточки ЕИС. Плашка СМП
 * показывается только при наличии обязанности привлекать субподрядчиков —
 * у контрактов без условия её нет.
 */
export default function ContractExecutionStrip({
  contract,
  execution,
  loading,
}: ContractExecutionStripProps) {
  const price = String(contract.contractPrice ?? 0);

  const paid = execution?.paid ?? 0;
  const paidPercent = paymentPercent(String(paid), price);
  const accepted = execution?.accepted ?? 0;
  const acceptedPercent = percentOf(accepted, contract.contractPrice);

  // Процент привлечения СМП: свой из служебки, иначе из карточки ЕИС. Без
  // процента объём не считается — полосы и плашки СМП тогда просто нет
  const ownPercent =
    Number(contract.smpRequiredPercent ?? 0) > 0
      ? Number(contract.smpRequiredPercent)
      : null;
  const smpPercentSource = ownPercent ?? execution?.smpEisPercent ?? null;
  const smpActual = execution?.smpActual ?? 0;
  const smpRequired = useMemo(
    () =>
      smpPercentSource === null
        ? 0
        : (smpRequiredAmount(contract.contractPrice, smpPercentSource) ?? 0),
    [contract.contractPrice, smpPercentSource],
  );
  const smpPercent = smpVolumeProgress(smpActual, smpRequired);
  const showSmp = !loading && (smpPercentSource !== null || smpActual > 0);

  const paymentCount = execution?.paymentCount ?? 0;
  const acceptedCount = execution?.acceptedCount ?? 0;
  const onReview = execution?.onReview ?? 0;

  return (
    <span className={styles.executionStrip}>
      <ExecutionBar
        label="Оплата"
        percent={paidPercent}
        loading={loading}
        title={`Оплата: ${formatMoney(paid)} ₽ из ${formatMoney(
          contract.contractPrice,
        )} ₽ · платежей: ${paymentCount}`}
      />

      <ExecutionBar
        label="Приёмка"
        percent={acceptedPercent}
        loading={loading}
        title={`Приёмка: ${formatMoney(accepted)} ₽ из ${formatMoney(
          contract.contractPrice,
        )} ₽ · документов: ${acceptedCount}${
          onReview > 0 ? ` · в работе: ${onReview}` : ""
        }`}
      />

      {/* Плашка СМП — напротив полос, а не перед ними: иначе у контрактов с
          условием привлечения субподрядчиков полосы уезжали вправо */}
      {showSmp && (
        <span
          className={`${styles.smpBadge} ${styles.executionSmp}`}
          title={
            smpPercentSource === null
              ? `Привлечение СМП: ${formatMoney(smpActual)} ₽ по сведениям ЕИС`
              : `Привлечение СМП: ${formatMoney(smpActual)} ₽ из ${formatMoney(
                  smpRequired,
                )} ₽ (${smpPercentSource}% от цены контракта, закрыто ${Math.round(
                  smpPercent,
                )}%)`
          }
        >
          СМП
        </span>
      )}
    </span>
  );
}
