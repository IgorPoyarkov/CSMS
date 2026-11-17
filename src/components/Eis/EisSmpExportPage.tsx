import { useMemo, useState } from "react";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import { useAllContractSmpRecords } from "../../services/ContractSmp/contractSmp.api";
import {
  contractSmpDocumentTypeLabels,
  contractSmpStatusLabels,
  isRecordAccepted,
  type ContractSmpRecord,
} from "../../services/ContractSmp/contractSmp.schema";
import {
  buildSmpExportCsv,
  exportContractsToCsv,
  usePushSmpRecordsToEis,
} from "../../services/Eis/eisSmpExport.api";
import useUtils from "../../hooks/useUtils";
import EdsSignModal from "../Eds/EdsSignModal";
import { useLogSignatureEvent } from "../../services/Eds/eds.api";
import type { SignatureEvent } from "../../services/Eds/eds.schema";
import {
  readStoreCertificates,
  type PluginCertificateInfo,
} from "../../services/Eds/pluginSign";
import {
  downloadSmpPackage,
  signSmpPackage,
  type SignedSmpPackage,
} from "../../services/Eds/smpPackage";
import styles from "./EisSmpExportPage.module.scss";

/**
 * Страница выгрузки сведений о привлечении СМП/СОНКО в ЕИС (ч. 3 ст. 103 44-ФЗ).
 *
 * Требование о привлечении СМП появляется на этапе служебки; контракты
 * без неё сюда не попадают. Два действия: скачать CSV по полям реестра
 * и отметить принятые записи выгруженными.
 */

/** Ключ сертификата в списке: отпечаток стабильнее серийника и индекса. */
const certKeyOf = (certificate: PluginCertificateInfo, index: number): string =>
  certificate.fingerprint || certificate.serialNumber || `cert-${index}`;

// Локальное время для журнала: по нему сверяются с часами ЕИС и логином
const nowLocalDateTime = (): string => {
  const d = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
  const logSignature = useLogSignatureEvent();

  // Выгрузка в ЕИС — действие с ЭП: сначала журнал, потом отметка записей
  const [signing, setSigning] = useState<ContractSmpRecord[] | null>(null);

  /*
   * Пакет с открепленной подписью.
   *
   * Журнал фиксирует «кто расписался», пакет — «что подписано». Это разные
   * вещи: без файлов отправлять в ЕИС нечего, а без записи в журнале потом
   * невозможно доказать, чьим ключом подписан документ.
   */
  const [packageOpen, setPackageOpen] = useState(false);
  const [packageLoading, setPackageLoading] = useState(false);
  const [packageCerts, setPackageCerts] = useState<PluginCertificateInfo[]>([]);
  const [packageCertKey, setPackageCertKey] = useState("");
  const [packageBusy, setPackageBusy] = useState(false);
  const [packageError, setPackageError] = useState("");
  const [packageResult, setPackageResult] = useState<SignedSmpPackage | null>(
    null,
  );

  const packageTargets = () =>
    selected.size
      ? smpContracts.filter((c) => selected.has(String(c.id)))
      : smpContracts;

  async function openPackage() {
    setPackageOpen(true);
    setPackageError("");
    setPackageResult(null);
    setPackageCerts([]);
    setPackageLoading(true);

    try {
      const result = await readStoreCertificates();
      // Подписывать можно только тем сертификатом, у которого есть закрытый
      // ключ: публичная часть в хранилище есть у всех, а ключ — не у всех
      const usable = result.certificates.filter((c) => c.hasPrivateKey);
      setPackageCerts(usable);

      if (result.error) {
        setPackageError(result.error);
      } else if (usable.length === 0) {
        setPackageError(
          "В хранилище «Мой» нет сертификатов с закрытым ключом — подписывать нечем. " +
            "Проверьте токен и страницу «Проверка ЭП».",
        );
      }

      // Своя ЭП заказчика важнее любой другой: подпись чужим ключом ЕИС не примет
      const orgInn = organization?.inn ?? "";
      const preferred =
        usable.find((certificate) => orgInn && certificate.inn === orgInn) ??
        usable[0];
      const preferredIndex = preferred ? usable.indexOf(preferred) : -1;
      setPackageCertKey(
        preferredIndex >= 0 ? certKeyOf(preferred, preferredIndex) : "",
      );
    } catch (caught) {
      setPackageError(
        caught instanceof Error ? caught.message : String(caught),
      );
    } finally {
      setPackageLoading(false);
    }
  }

  async function signPackage() {
    const certificate = packageCerts.find(
      (item, index) => certKeyOf(item, index) === packageCertKey,
    );
    if (!certificate) return;

    const targets = packageTargets();
    const { csv, count } = buildSmpExportCsv(targets, allRecords);

    if (count === 0) {
      setPackageError(
        "Нечего подписывать: в выбранных контрактах нет сведений о СМП.",
      );
      return;
    }

    const label =
      `Сведения о привлечении СМП: строк ${count}, контрактов ${targets.length}` +
      `, от ${new Date().toISOString().slice(0, 10)}`;

    setPackageBusy(true);
    setPackageError("");

    try {
      const signed = await signSmpPackage(csv, certificate, label);
      downloadSmpPackage(signed, csv);
      setPackageResult(signed);

      const innMatches = Boolean(
        certificate.inn &&
          organization?.inn &&
          certificate.inn === organization.inn,
      );
      const targetRecords = targets.flatMap(
        (contract) => recordsByContract.get(String(contract.id)) ?? [],
      );

      // Без ИНН журнал не пройдёт валидацию: запись имеет смысл только с
      // владельцем сертификата, иначе это строка «что-то подписано»
      if (certificate.inn) {
        logSignature.mutate({
          organizationId: organization?.id ?? "",
          contractId: targets[0]?.id,
          action: "smp_eis_export",
          entityType: "contractSmpRecord",
          entityId: targetRecords[0]?.id ?? "smp-export",
          documentLabel: label,
          certificateOwner: certificate.subject.slice(0, 200),
          certificateInn: certificate.inn,
          certificateSerial: certificate.serialNumber,
          certificateFingerprint: certificate.fingerprint,
          certificateAlgorithm: certificate.algorithm,
          certificateValidTo: certificate.validTo,
          innMatched: innMatches,
          certificateSource: "plugin",
          result: innMatches ? "signed" : "rejected_certificate",
          comment:
            `Пакет ${signed.documentName}, подпись ${signed.signatureName}, ` +
            `SHA-256 ${signed.sha256}. Подпись поставлена на рабочем месте, ` +
            "сервером не проверялась.",
          createdAt: nowLocalDateTime(),
        });
      }
    } catch (caught) {
      setPackageError(
        caught instanceof Error ? caught.message : String(caught),
      );
    } finally {
      setPackageBusy(false);
    }
  }

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

    return {
      contracts: smpContracts.length,
      records,
      accepted,
      pushed,
      amount,
    };
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
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
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
    setSigning(pendingRecords);
  }

  function handleSigned(event: SignatureEvent) {
    if (!signing) return;
    logSignature.mutate(event);
    pushToEis.mutate(signing);
    setSigning(null);
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
          <span className={block("statValue")}>
            {stats.amount.toLocaleString("ru-RU")} ₽
          </span>
        </div>
      </div>

      <div className={block("actions")}>
        <button
          className={block("btn")}
          onClick={exportCsv}
          disabled={stats.records === 0}
        >
          Скачать CSV для ЕИС
        </button>
        <button
          className={block("btn", ["primary"])}
          onClick={openPackage}
          disabled={stats.records === 0}
        >
          Подписать пакет (ЭП)
        </button>
        <button
          className={block("btn", ["primary"])}
          onClick={pushSelected}
          disabled={pushToEis.isPending || pendingRecords.length === 0}
        >
          {pushToEis.isPending
            ? "Выгрузка..."
            : `Отметить выгруженными (${pendingRecords.length})`}
        </button>
        <button
          className={block("btn")}
          onClick={() =>
            setSelected(new Set(smpContracts.map((c) => String(c.id))))
          }
        >
          Выбрать все
        </button>
        <button className={block("btn")} onClick={() => setSelected(new Set())}>
          Снять выделение
        </button>
      </div>

      {packageOpen && (
        <div className={block("signer")}>
          <div className={block("signerHead")}>
            <h3 className={block("signerTitle")}>
              Пакет с открепленной подписью
            </h3>
            <button
              type="button"
              className={block("signerClose")}
              onClick={() => setPackageOpen(false)}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>

          <p className={block("signerLead")}>
            Подписывается тот же CSV, что скачивается кнопкой «Скачать CSV для
            ЕИС». Ключ остаётся в токене: наружу выходит только подпись.
            Скачаются три файла — документ, открепленная подпись <b>.sig</b> и
            манифест с отпечатком сертификата и SHA-256 документа.
          </p>

          {packageLoading && (
            <p className={block("signerMeta")}>
              Читаю сертификаты с рабочего места…
            </p>
          )}

          {packageCerts.length > 0 && (
            <div className={block("signerList")}>
              {packageCerts.map((certificate, index) => {
                const key = certKeyOf(certificate, index);

                return (
                  <label key={key} className={block("signerItem")}>
                    <input
                      type="radio"
                      name="smp-package-cert"
                      checked={packageCertKey === key}
                      onChange={() => setPackageCertKey(key)}
                    />
                    <span className={block("signerInfo")}>
                      <span className={block("signerSubject")}>
                        {certificate.subject || "Владелец не определён"}
                      </span>
                      <span className={block("signerMeta")}>
                        ИНН {certificate.inn || "—"} · действует до{" "}
                        {certificate.validTo || "—"} · серийник{" "}
                        {certificate.serialNumber || "—"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {packageError && <div className={block("error")}>{packageError}</div>}

          {packageResult && (
            <div className={block("success")}>
              Подписано: {packageResult.documentName} ·{" "}
              {packageResult.documentBytes} байт · подпись{" "}
              {packageResult.signatureBytes} байт · SHA-256{" "}
              {packageResult.sha256.slice(0, 16)}…
              <br />
              Подпись поставлена на этом компьютере и сервером не проверена —
              её проверяет ЕИС при загрузке пакета.
            </div>
          )}

          <div className={block("actions")}>
            <button
              className={block("btn", ["primary"])}
              onClick={signPackage}
              disabled={packageBusy || !packageCertKey}
            >
              {packageBusy ? "Подписываю…" : "Подписать и скачать пакет"}
            </button>
            <button
              className={block("btn")}
              onClick={() => setPackageOpen(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

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
          {pushToEis.data.errors.length > 0 &&
            ` · Ошибки: ${pushToEis.data.errors.join(", ")}`}
        </div>
      )}

      {/* Модалка подписания ЭП при выгрузке (Tasks 9, п. 1) */}
      {signing && signing.length > 0 && (
        <EdsSignModal
          action="smp_eis_export"
          documentLabel={`Выгрузка ${signing.length} сведений о СМП в ЕИС · ${signing[0].documentType} № ${signing[0].documentNumber} от ${signing[0].documentDate}`}
          entityType="contractSmpRecord"
          entityId={signing[0].id!}
          onClose={() => setSigning(null)}
          onSigned={handleSigned}
        />
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
    <div
      className={`${block("card")} ${selected ? block("card", ["selected"]) : ""}`}
    >
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
          Требование:{" "}
          {contract.smpRequiredPercent
            ? `${contract.smpRequiredPercent}%`
            : "—"}
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
                className={
                  record.status === "rejected" ? block("rowRejected") : ""
                }
              >
                <td>{contractSmpDocumentTypeLabels[record.documentType]}</td>
                <td>
                  № {record.documentNumber} от {record.documentDate}
                </td>
                <td>
                  {record.supplierName}
                  {record.supplierInn && (
                    <>
                      <br />
                      <span className={block("inn")}>
                        ИНН {record.supplierInn}
                      </span>
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
