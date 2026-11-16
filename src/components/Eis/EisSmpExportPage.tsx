import { useMemo, useState } from "react";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useContractRegistry, type ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.api";
import { useAllContractSmpRecords } from "../../services/ContractSmp/contractSmp.api";
import {
  contractSmpDocumentTypeLabels,
  contractSmpStatusLabels,
  isRecordAccepted,
  type ContractSmpRecord,
} from "../../services/ContractSmp/contractSmp.schema";
import {
  exportContractsToCsv,
  usePushSmpRecordsToEis,
} from "../../services/Eis/eisSmpExport.api";
import useUtils from "../../hooks/useUtils";
import styles from "./EisSmpExportPage.module.scss";

/**
 * Страница выгрузки сведений о привлечении СМП/СОНКО в ЕИС (ч. 3 ст. 103 44-ФЗ).
 *
 * Требование о привлечении СМП появляется на этапе служебки; контракты
 * без неё сюда не попадают. Два действия: скачать CSV по полям реестра
 * и отметить принятые записи выгруженными.
 */

export default function EisSmpExportPage() {
  const { bem } = useUtils();
  const block = bem(styles, "eis-page");
  const { data: organization } = useCurrentOrganization();
  const { data: contracts = [] } = useContractRegistry(organization?.id);
  const { data: allRecords = [] } = useAllContractSmpRecords();

  const smpContracts = useMemo(
    () => contracts.filter((c) => c.subcontractingSmpNoteNumber),
    [contracts],
  );

  const recordsByContract = useMemo(() => {
    const map = new Map<string, ContractSmpRecord[]>();
    for (const record of allRecords) {
      const key = String(record.contractId);
      const list = map.get(key);
      if (list) list.push(record);
      else map.set(key, [record]);
    }
    return map;
  }, [allRecords]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pushToEis = usePushSmpRecordsToEis();

  const stats = useMemo(() => {
    let records = 0;
    let accepted = 0;
    let pushed = 0;
    let amount = 0;

    for (const contract of smpContracts) {
      for (const record of recordsByContract.get(String(contract.id)) ?? []) {
        records++;
        if (isRecordAccepted(record)) accepted++;
        if (record.status === "pushedToEis") pushed++;
        if (record.isSmpSubject && isRecordAccepted(record)) {
          amount += Number.parseFloat(record.amount ?? "") || 0;
        }
      }
    }

    return { contracts: smpContracts.length, records, accepted, pushed, amount };
  }, [smpContracts, recordsByContract]);

  const pendingRecords = useMemo(() => {
    const list: ContractSmpRecord[] = [];
    for (const contract of smpContracts) {
      if (!selected.has(String(contract.id))) continue;
      for (const record of recordsByContract.get(String(contract.id)) ?? []) {
        if (record.status === "accepted") list.push(record);
      }
    }
    return list;
  }, [smpContracts, selected, recordsByContract]);

  function toggle(contractId: string | number) {
    const key = String(contractId);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function exportCsv() {
    const target = selected.size
      ? smpContracts.filter((c) => selected.has(String(c.id)))
      : smpContracts;
    const count = exportContractsToCsv(target, allRecords);
    if (count === 0) {
      alert("Нечего экспортировать: нет ни одной записи в базе.");
    }
  }

  function pushSelected() {
    if (pendingRecords.length === 0) {
      alert("В выбранных контрактах нет принятых и не выгруженных сведений.");
      return;
    }
    if (!confirm(`Отметить ${pendingRecords.length} сведений выгруженными в ЕИС?`)) return;
    pushToEis.mutate(pendingRecords);
  }

  return (
    <div className={block()}>
      <h2 className={block("title")}>
        Выгрузка сведений о СМП/СОНКО в ЕИС (ч. 3 ст. 103 44-ФЗ)
      </h2>

      <div className={block("stats")}>
        <div className={block("stat")}>
          <span className={block("statLabel")}>Контрактов с СМП</span>
          <span className={block("statValue")}>{stats.contracts}</span>
        </div>
        <div className={block("stat")}>
          <span className={block("statLabel")}>Всего сведений</span>
          <span className={block("statValue")}>{stats.records}</span>
        </div>
        <div className={block("stat")}>
          <span className={block("statLabel")}>Принято</span>
          <span className={block("statValue")}>{stats.accepted}</span>
        </div>
        <div className={block("stat")}>
          <span className={block("statLabel")}>Выгружено</span>
          <span className={block("statValue")}>{stats.pushed}</span>
        </div>
        <div className={block("stat")}>
          <span className={block("statLabel")}>Объём СМП</span>
          <span className={block("statValue")}>{stats.amount.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>

      <div className={block("actions")}>
        <button className={block("btn")} onClick={exportCsv} disabled={stats.records === 0}>
          Скачать CSV для ЕИС
        </button>
        <button
          className={block("btn", ["primary"])}
          onClick={pushSelected}
          disabled={pushToEis.isPending || pendingRecords.length === 0}
        >
          {pushToEis.isPending ? "Выгрузка..." : `Отметить выгруженными (${pendingRecords.length})`}
        </button>
        <button
          className={block("btn")}
          onClick={() => setSelected(new Set(smpContracts.map((c) => String(c.id))))}
        >
          Выбрать все
        </button>
        <button className={block("btn")} onClick={() => setSelected(new Set())}>
          Снять выделение
        </button>
      </div>

      {smpContracts.length === 0 ? (
        <div className={block("empty")}>
          Нет контрактов с требованием о привлечении СМП — оно заводится
          служебной запиской по позиции плана-графика
        </div>
      ) : (
        <div className={block("list")}>
          {smpContracts.map((contract) => (
            <ContractSmpCard
              key={contract.id}
              contract={contract}
              records={recordsByContract.get(String(contract.id)) ?? []}
              selected={selected.has(String(contract.id))}
              onToggle={() => toggle(contract.id!)}
            />
          ))}
        </div>
      )}

      {pushToEis.isSuccess && (
        <div className={block("success")}>
          Выгружено: {pushToEis.data.pushed}
          {pushToEis.data.errors.length > 0 && ` · Ошибки: ${pushToEis.data.errors.join(", ")}`}
        </div>
      )}
    </div>
  );
}

// ─── Карточка контракта ────────────────────────────────────────────────────────

function ContractSmpCard({
  contract,
  records,
  selected,
  onToggle,
}: {
  contract: ContractRegistryItem;
  records: ContractSmpRecord[];
  selected: boolean;
  onToggle: () => void;
}) {
  const { bem } = useUtils();
  const block = bem(styles, "eis-page");

  const accepted = records.filter(isRecordAccepted).length;
  const pushed = records.filter((r) => r.status === "pushedToEis").length;

  return (
    <div className={`${block("card")} ${selected ? block("card", ["selected"]) : ""}`}>
      <div className={block("cardHeader")} onClick={onToggle}>
        <label className={block("checkbox")}>
          <input type="checkbox" checked={selected} onChange={onToggle} />
        </label>
        <div className={block("cardInfo")}>
          <span className={block("cardNumber")}>{contract.contractNumber}</span>
          <span className={block("cardName")}>{contract.contractName}</span>
          <span className={block("cardSupplier")}>
            Поставщик: {contract.supplierName}
          </span>
        </div>
      </div>

      <div className={block("cardStats")}>
        <span>Сведений: {records.length}</span>
        <span>Принято: {accepted}</span>
        <span>Выгружено: {pushed}</span>
        <span>
          Требование: {contract.smpRequiredPercent ? `${contract.smpRequiredPercent}%` : "—"}
        </span>
        <span>Служебка: № {contract.subcontractingSmpNoteNumber}</span>
      </div>

      {records.length > 0 && (
        <table className={block("table")}>
          <thead>
            <tr>
              <th>Тип</th>
              <th>Номер / дата</th>
              <th>Субподрядчик</th>
              <th>Сумма, ₽</th>
              <th>СМП</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className={record.status === "rejected" ? block("rowRejected") : ""}
              >
                <td>{contractSmpDocumentTypeLabels[record.documentType]}</td>
                <td>№ {record.documentNumber} от {record.documentDate}</td>
                <td>
                  {record.supplierName}
                  {record.supplierInn && (
                    <>
                      <br />
                      <span className={block("inn")}>ИНН {record.supplierInn}</span>
                    </>
                  )}
                </td>
                <td>
                  {record.amount
                    ? Number(record.amount).toLocaleString("ru-RU")
                    : "—"}
                </td>
                <td className={block("cellCenter")}>
                  {record.isSmpSubject ? "Да" : "Нет"}
                </td>
                <td>
                  <span className={block("status")}>
                    {contractSmpStatusLabels[record.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
