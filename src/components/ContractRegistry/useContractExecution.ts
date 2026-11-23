import { useMemo } from "react";
import { useAcceptances } from "../../services/Acceptance/acceptance.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useAllContractPayments } from "../../services/ContractRegistry/contractRegistry.api";
import {
  totalPaid,
  type ContractPayment,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  contractCardActsTotal,
  contractCardPaymentsTotal,
  contractCardSmpRequirement,
  contractCardSmpRows,
  contractCardSmpTotal,
  type ContractCardProjection,
} from "../../services/ContractRegistry/contractCardProjection.schema";
import { useAllContractCardProjections } from "../../services/ContractRegistry/contractCardProjection.api";
import { useAllContractSmpRecords } from "../../services/ContractSmp/contractSmp.api";
import {
  smpActualAmount,
  type ContractSmpRecord,
} from "../../services/ContractSmp/contractSmp.schema";
import {
  acceptedAcceptanceStatuses,
  reviewAcceptanceStatuses,
} from "../ContractAcceptance/acceptance.config";

/**
 * Агрегаты исполнения одного контракта для строки реестра.
 *
 * Только деньги и счётчики: расшифровка документов живёт в сводке раскрытия и
 * в карточке. Суммы считаются теми же функциями, что и там (`totalPaid`,
 * `contractCardActsTotal`, `smpActualAmount`), чтобы строка списка и карточка
 * не расходились в цифрах.
 */
export interface ContractExecutionEntry {
  /** Оплачено: ручные платёжные поручения, а если их нет — платежи из ЕИС. */
  paid: number;
  /** Платёжных документов в источнике — для подсказки при наведении. */
  paymentCount: number;
  /** Принято: документы электронного актирования либо акты из карточки ЕИС. */
  accepted: number;
  acceptedCount: number;
  /** Документов о приёмке в работе (направлены или возвращены). */
  onReview: number;
  /** Факт привлечения СМП: принятые договоры вручную либо субдоговоры из ЕИС. */
  smpActual: number;
  /** Требуемый процент привлечения из карточки ЕИС — если своего в записи нет. */
  smpEisPercent: number | null;
}

export interface ContractExecutionIndex {
  /** Агрегаты по id контракта; записи нет — по контракту ещё нет данных. */
  byContract: Map<string, ContractExecutionEntry>;
  /** Первая загрузка любого источника: вместо нулей строки показывают прочерк. */
  loading: boolean;
}

/** Группировка плоского списка по контракту: пустые ссылки пропускаем. */
const groupByContract = <T>(
  rows: T[],
  contractIdOf: (row: T) => unknown,
): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const id = contractIdOf(row);
    if (id === undefined || id === null || id === "") continue;
    const key = String(id);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
};

/** Свежая выгрузка на контракт: один контракт может иметь несколько версий. */
const newestProjectionByContract = (
  projections: ContractCardProjection[],
): Map<string, ContractCardProjection> => {
  const map = new Map<string, ContractCardProjection>();
  for (const projection of projections) {
    const id = projection.contractId;
    if (id === undefined || id === null || id === "") continue;
    const key = String(id);
    const current = map.get(key);
    if (
      !current ||
      String(projection.importedAt ?? "").localeCompare(
        String(current.importedAt ?? ""),
      ) > 0
    ) {
      map.set(key, projection);
    }
  }
  return map;
};

/**
 * Индекс исполнения по всем контрактам организации — для индикаторов в списке.
 *
 * Список реестра не раскрывает строки, поэтому агрегаты считаются заранее и
 * одним проходом: платежи, документы о приёмке, сведения СМП и проекции карточек
 * ЕИС читаются org-уровневыми запросами (по одному на источник) и группируются
 * по `contractId`. Строка списка собственных запросов не делает: сколько бы
 * контрактов ни было на странице, запросов остаётся четыре.
 */
export const useContractExecutionIndex = (): ContractExecutionIndex => {
  const { data: organization } = useCurrentOrganization();
  const organizationId = organization ? String(organization.id) : undefined;

  const { data: payments, isLoading: paymentsLoading } =
    useAllContractPayments(Boolean(organizationId));
  const { data: acceptances, isLoading: acceptancesLoading } = useAcceptances(
    organizationId,
  );
  const { data: smpRecords, isLoading: smpLoading } =
    useAllContractSmpRecords(Boolean(organizationId));
  const { data: projections, isLoading: projectionsLoading } =
    useAllContractCardProjections(Boolean(organizationId));

  const byContract = useMemo(() => {
    const paymentBuckets = groupByContract(
      payments ?? [],
      (payment: ContractPayment) => payment.contractId,
    );
    const acceptanceBuckets = groupByContract(
      acceptances ?? [],
      (acceptance) => acceptance.input.contractId,
    );
    const smpBuckets = groupByContract(
      smpRecords ?? [],
      (record: ContractSmpRecord) => record.contractId,
    );
    const projectionBuckets = newestProjectionByContract(projections ?? []);

    const index = new Map<string, ContractExecutionEntry>();
    const keys = new Set<string>([
      ...projectionBuckets.keys(),
      ...paymentBuckets.keys(),
      ...acceptanceBuckets.keys(),
      ...smpBuckets.keys(),
    ]);

    for (const key of keys) {
      const projection = projectionBuckets.get(key);

      // Оплата: ручные платёжные поручения приоритетнее, у выгрузок ЕИС их нет
      const manualPayments = paymentBuckets.get(key) ?? [];
      const eisPayments = projection?.Payments ?? [];
      const usesEisPayments =
        manualPayments.length === 0 && eisPayments.length > 0;
      const paid = usesEisPayments
        ? contractCardPaymentsTotal(eisPayments)
        : Number(totalPaid(manualPayments));
      const paymentCount = usesEisPayments
        ? eisPayments.length
        : manualPayments.length;

      // Приёмка: только состоявшиеся документы; акты из ЕИС уже подписаны
      const contractAcceptances = acceptanceBuckets.get(key) ?? [];
      const accepted = contractAcceptances.filter((acceptance) =>
        acceptedAcceptanceStatuses.includes(acceptance.status),
      );
      const onReview = contractAcceptances.filter((acceptance) =>
        reviewAcceptanceStatuses.includes(acceptance.status),
      ).length;
      const eisActs = projection?.Acts ?? [];
      const usesEisActs = accepted.length === 0 && eisActs.length > 0;
      const acceptedTotal = usesEisActs
        ? contractCardActsTotal(eisActs)
        : accepted.reduce(
            (sum, acceptance) => sum + acceptance.totalWithVat,
            0,
          );

      // СМП: факт из принятых договоров, иначе субдоговоры из карточки ЕИС
      const manualSmp = smpActualAmount(smpBuckets.get(key) ?? []);
      const eisSmpRows = contractCardSmpRows(projection?.Smp ?? []);
      const smpActual =
        manualSmp > 0 ? manualSmp : contractCardSmpTotal(eisSmpRows);

      index.set(key, {
        paid,
        paymentCount,
        accepted: acceptedTotal,
        acceptedCount: usesEisActs ? eisActs.length : accepted.length,
        onReview,
        smpActual,
        smpEisPercent: contractCardSmpRequirement(projection?.Smp ?? []).percent,
      });
    }

    return index;
  }, [payments, acceptances, smpRecords, projections]);

  return {
    byContract,
    loading:
      paymentsLoading || acceptancesLoading || smpLoading || projectionsLoading,
  };
};
