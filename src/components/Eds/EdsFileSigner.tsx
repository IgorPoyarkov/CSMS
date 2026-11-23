import { useState, type ChangeEvent } from "react";
import useUtils from "../../hooks/useUtils";
import { downloadBlob } from "../../services/Eis/eisExport";
import {
  base64ToBytes,
  readStoreCertificates,
  signBytes,
  verifyBytesSignature,
  type PluginCertificateInfo,
} from "../../services/Eds/pluginSign";
import styles from "./EdsFileSigner.module.scss";
import Select from "../UI/Select";

/**
 * Подпись произвольного файла документом заказчика.
 *
 * Зачем отдельный блок: в карточку контракта ЕИС прикрепляют сам документ —
 * скан договора с субподрядчиком, PDF акта, платёжное поручение. Подписывать
 * при этом нужно байты файла, а не текст: любое перекодирование ломает
 * подпись. Поэтому файл читается как `ArrayBuffer` и уходит в плагин без
 * изменений, а рядом скачивается `<имя>.sig`.
 *
 * Сразу после подписи выполняется локальная проверка тем же плагином: она
 * показывает, что подпись сходится именно с этим файлом. Цепочку УЦ и
 * полномочия подписанта проверяет уже ЕИС.
 */

interface SignedFile {
  fileName: string;
  signatureName: string;
  signatureBytes: number;
  verified: boolean;
  message: string;
}

const certKeyOf = (certificate: PluginCertificateInfo, index: number): string =>
  certificate.fingerprint || certificate.serialNumber || `cert-${index}`;

const describeCertificate = (certificate: PluginCertificateInfo): string => {
  const owner = certificate.subject || "Владелец не определён";
  const inn = certificate.inn ? ` · ИНН ${certificate.inn}` : "";
  const validTo = certificate.validTo ? ` · до ${certificate.validTo}` : "";

  return `${owner}${inn}${validTo}`;
};

export default function EdsFileSigner() {
  const { bem } = useUtils();
  const block = bem(styles, "eds-file");

  const [certificates, setCertificates] = useState<PluginCertificateInfo[]>([]);
  const [certKey, setCertKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState<SignedFile | null>(null);

  async function loadCertificates() {
    setLoading(true);
    setError("");

    try {
      const result = await readStoreCertificates();
      const usable = result.certificates.filter((cert) => cert.hasPrivateKey);
      setCertificates(usable);

      if (result.error) {
        setError(result.error);
      } else if (usable.length === 0) {
        setError(
          "В хранилище «Мой» нет сертификатов с закрытым ключом — подписывать нечем. " +
            "Проверьте токен на странице «Проверка ЭП».",
        );
      }

      if (usable[0]) setCertKey(certKeyOf(usable[0], 0));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setFile(picked);
    setSigned(null);
    setError("");

    // Сертификаты читаются при первом выборе файла, а не при открытии
    // страницы: на машине без плагина это ожидание никому не нужно
    if (picked && certificates.length === 0 && !loading) {
      await loadCertificates();
    }
  }

  async function signFile() {
    const certificate = certificates.find(
      (item, index) => certKeyOf(item, index) === certKey,
    );
    if (!file || !certificate) return;

    setBusy(true);
    setError("");
    setSigned(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const signature = await signBytes(certificate, bytes);

      if (signature.bytes === 0) {
        throw new Error(
          "Плагин вернул пустую подпись: вероятно, нет доступа к контейнеру " +
            "закрытого ключа.",
        );
      }

      const verification = await verifyBytesSignature(bytes, signature.value);
      const signatureName = `${file.name}.sig`;

      downloadBlob(
        new Blob([base64ToBytes(signature.value)], {
          type: "application/pkcs7-signature",
        }),
        signatureName,
      );

      setSigned({
        fileName: file.name,
        signatureName,
        signatureBytes: signature.bytes,
        verified: verification.valid,
        message: verification.message,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={block()}>
      <h3 className={block("title")}>Подписать файл документа для ЕИС</h3>

      <p className={block("lead")}>
        Выберите документ, который прикрепляете в карточку контракта — скан
        договора с субподрядчиком, PDF акта, платёжное поручение. Файл уходит в
        плагин байтами, без перекодирования, а рядом скачивается{" "}
        <b>&lt;имя&gt;.sig</b>. Сам ключ остаётся в токене.
      </p>

      <div className={block("row")}>
        <input
          type="file"
          className={block("file")}
          onChange={pickFile}
          accept=".pdf,.doc,.docx,.xml,.zip,.rar,.csv,.txt,.jpg,.jpeg,.png,.tif,.tiff"
        />

        {loading && <span className={block("meta")}>Читаю сертификаты…</span>}
      </div>

      {certificates.length > 0 && (
        <label className={block("field")}>
          <span className={block("label")}>Сертификат</span>
          <Select
            className={block("select")}
            value={certKey}
            onChange={(event) => setCertKey(event.target.value)}
          >
            {certificates.map((certificate, index) => {
              const key = certKeyOf(certificate, index);

              return (
                <option key={key} value={key}>
                  {describeCertificate(certificate)}
                </option>
              );
            })}
          </Select>
        </label>
      )}

      {error && <div className={block("error")}>{error}</div>}

      {signed && (
        <div
          className={block("result", [signed.verified ? "ok" : "bad"])}
        >
          Подписан {signed.fileName}: подпись {signed.signatureBytes} байт,
          файл <b>{signed.signatureName}</b> скачан.
          <br />
          {signed.verified
            ? "Плагин проверил: подпись сходится именно с этим файлом."
            : `Локальная проверка не прошла: ${signed.message}`}
        </div>
      )}

      <div className={block("actions")}>
        <button
          type="button"
          className={block("btn", ["primary"])}
          onClick={signFile}
          disabled={busy || !file || !certKey}
        >
          {busy ? "Подписываю…" : "Подписать файл"}
        </button>
        {file && (
          <span className={block("meta")}>
            {file.name} · {(file.size / 1024).toFixed(0)} КБ
          </span>
        )}
      </div>
    </div>
  );
}
