import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import type { ContractSmpRecord } from "../ContractSmp/contractSmp.schema";
import {
  ContractSmpRecordSchema,
  contractSmpPriceTypeLabels,
} from "../ContractSmp/contractSmp.schema";
import { contractSmpQueryKey } from "../ContractSmp/contractSmp.api";
import type { ContractRegistryItem } from "../ContractRegistry/contractRegistry.schema";
import { contractRegistryQueryKey } from "../ContractRegistry/contractRegistry.api";
import { recordsToCsv, downloadCsv, type CsvRow } from "./eisExport";

/**
 * Выгрузка сведений о привлечении СМП в ЕИС (ч. 3 ст. 103 44-ФЗ).
 *
 * Пока нет обмена с ЕИС (PROJECT.md, п. 9), поэтому экспорт — это
 * CSV по полям реестра: заказчик скачивает и загружает в карточку ЕИС
 * вручную. Отметка о выгрузке — помечаем записи статусом pushedToEis.
 */

const SMP_ENDPOINT = "/contractSmpRecords";

/**
 * Отметить одну запись выгруженной.
 */
const markRecordPushed = async (
  record: ContractSmpRecord,
): Promise<ContractSmpRecord> => {
  const { data } = await api.patch(`${SMP_ENDPOINT}/${record.id}`, {
    status: "pushedToEis",
    eisPublishDate: new Date().toISOString().slice(0, 10),
    eisRecordNumber: `EIS-SMP-${record.id}`,
  });

  return ContractSmpRecordSchema.parse(data);
};

export const usePushSmpRecordsToEis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: ContractSmpRecord[]) => {
      const pushed: ContractSmpRecord[] = [];
      const errors: string[] = [];

      for (const record of records) {
        try {
          pushed.push(await markRecordPushed(record));
        } catch {
          errors.push(
            `${record.documentType} № ${record.documentNumber} от ${record.documentDate}`,
          );
        }
      }

      return { pushed: pushed.length, errors };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractSmpQueryKey });
      queryClient.invalidateQueries({ queryKey: contractRegistryQueryKey });
    },
  });
};

/**
 * Собрать CSV по контрактам. Возвращает число строк в файле.
 * 0 — нечего экспортировать.
 */
export const exportContractsToCsv = (
  contracts: ContractRegistryItem[],
  allRecords: ContractSmpRecord[],
): number => {
  const { csv, count } = buildSmpExportCsv(contracts, allRecords);
  if (count === 0) return 0;

  downloadCsv(csv, `smp_export_${new Date().toISOString().slice(0, 10)}.csv`);
  return count;
};

/**
 * Собрать содержимое файла без скачивания.
 *
 * Нужна отдельно, потому что подпись ставится под конкретными байтами:
 * подписанный пакет обязан содержать ровно то, что подписывали, поэтому
 * и скачивание, и подпись берут одну и ту же строку.
 */
export const buildSmpExportCsv = (
  contracts: ContractRegistryItem[],
  allRecords: ContractSmpRecord[],
): { csv: string; count: number } => {
  const rows: CsvRow[] = [];

  for (const contract of contracts) {
    const contractRecords = allRecords.filter(
      (r) => String(r.contractId) === String(contract.id),
    );

    if (contractRecords.length === 0) continue;

    for (const record of contractRecords) {
      rows.push({
        contractNumber: contract.contractNumber,
        contractDate: contract.contractDate ?? "",
        supplierName: contract.supplierName,
        supplierInn: contract.supplierInn ?? "",
        documentType: contractSmpDocTypeLabel(record.documentType),
        documentNumber: record.documentNumber,
        documentDate: record.documentDate,
        amount: record.amount ?? "",
        okpd2Code: record.okpd2Code ?? "",
        priceType: contractSmpPriceTypeLabels[record.priceType] ?? "",
        unitPrice: record.unitPrice ?? "",
        supplierFull:
          record.supplierName +
          (record.supplierInn ? ` (ИНН ${record.supplierInn})` : ""),
        isSmpSubject: record.isSmpSubject ? "Да" : "Нет",
        receivedAt: record.receivedAt || "",
        status: contractSmpStatusLabel(record.status),
        supplierConfirmedAt: record.supplierConfirmedAt || "",
        customerConfirmedAt: record.customerConfirmedAt || "",
      });
    }
  }

  return { csv: rows.length ? recordsToCsv(rows) : "", count: rows.length };
};

// ─── Вспомогательные подписи ──────────────────────────────────────────────

const contractSmpDocTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    subContract: "Договор",
    declaration: "Декларация",
    acceptance: "Акт",
    payment: "Платёжное поручение",
  };
  return map[type] ?? type;
};

const contractSmpStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    submitted: "Поданы подрядчиком",
    accepted: "Приняты заказчиком",
    rejected: "Отклонены",
    pushedToEis: "Выгружены в ЕИС",
  };
  return map[status] ?? status;
};
