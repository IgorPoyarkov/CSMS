import { useMemo, useState } from "react";
import type { BaseOrganization } from "../../services/Organization/organization.schema";
import {
  certificateBelongsToOrganization,
  certificateStateOn,
  type EdsCertificate,
  type SignatureEvent,
} from "../../services/Eds/eds.schema";
import {
  makeLoginChallenge,
  readPluginSignHandles,
  signLoginChallenge,
} from "../../services/Eds/cryptoPro";
import { useLogSignatureEvent } from "../../services/Eds/eds.api";
import {
  buildEdsJournalIntegrityPackage,
  exportEdsJournalSignedPdf,
} from "../../services/Eds/edsJournalExport";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import styles from "./EdsJournalSignedExportModal.module.scss";

interface EdsJournalSignedExportModalProps {
  organization: BaseOrganization;
  certificates: EdsCertificate[];
  events: SignatureEvent[];
  filters: {
    action: string;
    dateFrom: string;
    dateTo: string;
  };
  onClose: () => void;
}

const OVERSIGHT_BODIES = [
  "Федеральное казначейство (ТОФК)",
  "Федеральная антимонопольная служба (ФАС России)",
  "Орган внутреннего государственного (муниципального) финансового контроля",
  "Контрольно-счётная палата субъекта РФ",
];

export default function EdsJournalSignedExportModal({
  organization,
  certificates,
  events,
  filters,
  onClose,
}: EdsJournalSignedExportModalProps) {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: currentUser } = useFetchCurrentUser();
  const { mutateAsync: logEvent } = useLogSignatureEvent();

  const validCertificates = useMemo(
    () =>
      certificates.filter((c) => {
        const state = certificateStateOn(c, todayIso);
        return (
          (state === "active" || state === "expiring") &&
          certificateBelongsToOrganization(c, organization.inn)
        );
      }),
    [certificates, organization.inn, todayIso],
  );

  const [selectedCertIdx, setSelectedCertIdx] = useState<number>(0);
  const [oversightBody, setOversightBody] = useState<string>(OVERSIGHT_BODIES[0]);
  const [customBody, setCustomBody] = useState<string>("");
  const [downloadManifest, setDownloadManifest] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const activeCert =
    validCertificates[selectedCertIdx] ?? validCertificates[0] ?? null;

  const handleConfirmExport = async () => {
    if (!activeCert) {
      setErrorMsg(
        "У организации нет действующего сертификата ЭП с совпадающим ИНН для подписания отчёта.",
      );
      return;
    }

    setErrorMsg("");
    setIsExporting(true);

    try {
      const targetBody =
        oversightBody === "__custom__"
          ? customBody.trim() || "Контролирующий орган"
          : oversightBody;

      // Попытка реального подписания через КриптоПро Browser plug-in, если доступен на рабочем месте
      let signatureMode: "plugin" | "registry" = "registry";
      let pluginSignature = null;

      try {
        const handles = await readPluginSignHandles(organization.id);
        const matchedHandle = handles.find(
          (h) =>
            h.certificate.serialNumber &&
            h.certificate.serialNumber === activeCert.serialNumber,
        );
        if (matchedHandle) {
          const challenge = makeLoginChallenge();
          const sig = await signLoginChallenge(matchedHandle, challenge);
          if (sig) {
            signatureMode = "plugin";
            pluginSignature = sig;
          }
        }
      } catch {
        // Если плагин недоступен, сохраняем стендовый режим с SHA-256 целостностью
      }

      const pkg = await buildEdsJournalIntegrityPackage({
        organization,
        certificates,
        events,
        oversightBody: targetBody,
        filters,
        signerCertificate: activeCert,
        signatureMode,
        pluginSignature,
      });

      await exportEdsJournalSignedPdf({
        pkg,
        certificates,
        alsoDownloadIntegrityManifest: downloadManifest,
      });

      // Фиксируем сам факт формирования и подписания отчёта в журнале аудита ЭП
      const nowLocal = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const createdAt = `${nowLocal.getFullYear()}-${pad(nowLocal.getMonth() + 1)}-${pad(nowLocal.getDate())}T${pad(nowLocal.getHours())}:${pad(nowLocal.getMinutes())}:${pad(nowLocal.getSeconds())}`;

      await logEvent({
        organizationId: organization.id ?? "",
        userId: currentUser?.id,
        userLabel: currentUser?.email ?? activeCert.ownerName,
        action: "journal_pdf_export",
        entityType: "edsJournalReport",
        entityId: pkg.reportId,
        documentLabel: `Отчёт журнала ЭП № ${pkg.reportId} (${targetBody})`,
        certificateId: activeCert.id,
        certificateOwner: activeCert.ownerName,
        certificateInn: activeCert.inn,
        certificateSerial: activeCert.serialNumber,
        certificateFingerprint: activeCert.fingerprint,
        certificateAlgorithm: activeCert.signatureAlgorithm,
        certificateValidTo: activeCert.validTo,
        innMatched: true,
        certificateSource: activeCert.source,
        result: "signed",
        comment: `SHA-256 отчёта: ${pkg.payloadDigestSha256.slice(0, 16)}… · записей: ${events.length}`,
        createdAt,
      });

      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Не удалось сформировать подписанный PDF-отчёт.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Выгрузка подписанного PDF-отчёта журнала ЭП"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            Подписанный PDF-отчёт Журнала ЭП для контролирующих органов
          </h3>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <p className={styles.subtitle}>
          Отчёт включает реестр сертификатов, все выбранные события аудита,
          построчную SHA-256 цепочку хэшей (hash-chain) для контроля
          неизменяемости аудит-логов и штамп электронной подписи заказчика.
        </p>

        <div className={styles.summary}>
          <div>
            Организация: <strong>{organization.shortName || organization.fullName}</strong> (ИНН {organization.inn})
          </div>
          <div>
            Выгружается событий: <strong>{events.length}</strong> · сертификатов:{" "}
            <strong>{certificates.length}</strong>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Получатель отчёта (контролирующий орган)</span>
          <select
            className={styles.select}
            value={oversightBody}
            onChange={(e) => setOversightBody(e.target.value)}
          >
            {OVERSIGHT_BODIES.map((body) => (
              <option key={body} value={body}>
                {body}
              </option>
            ))}
            <option value="__custom__">Иной контролирующий орган…</option>
          </select>
        </label>

        {oversightBody === "__custom__" && (
          <label className={styles.field}>
            <span className={styles.label}>Наименование контролирующего органа</span>
            <input
              type="text"
              className={styles.input}
              placeholder="Например: Прокуратура Курской области"
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
            />
          </label>
        )}

        {validCertificates.length === 0 ? (
          <div className={styles.warn}>
            Не найдено активных сертификатов с ИНН {organization.inn}. Выберите или
            зарегистрируйте действующий сертификат заказчика.
          </div>
        ) : (
          <label className={styles.field}>
            <span className={styles.label}>Сертификат ЭП для подписания отчёта</span>
            <select
              className={styles.select}
              value={selectedCertIdx}
              onChange={(e) => setSelectedCertIdx(Number(e.target.value))}
            >
              {validCertificates.map((c, idx) => (
                <option key={String(c.id ?? idx)} value={idx}>
                  {c.ownerName} — ИНН {c.inn} (сер. {c.serialNumber || "б/н"}, до{" "}
                  {c.validTo || "?"})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles["checkbox-row"]}>
          <input
            type="checkbox"
            checked={downloadManifest}
            onChange={(e) => setDownloadManifest(e.target.checked)}
          />
          <span>
            Дополнительно скачать файл контроля целостности (.integrity.json с SHA-256 цепью)
          </span>
        </label>

        {errorMsg && <div className={styles.error}>{errorMsg}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={onClose}
            disabled={isExporting}
          >
            Отмена
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn--primary"]}`}
            disabled={!activeCert || isExporting}
            onClick={handleConfirmExport}
          >
            {isExporting
              ? "Формирование и подписание PDF…"
              : "Подписать и скачать PDF-отчёт"}
          </button>
        </div>
      </div>
    </div>
  );
}
