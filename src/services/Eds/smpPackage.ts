import { downloadBlob, downloadText } from "../Eis/eisExport";
import { signText, type PluginCertificateInfo } from "./pluginSign";

/**
 * Подписанный пакет сведений о привлечении СМП.
 *
 * Зачем пакет, а не «просто файл с подписью»: документ и `.sig` разносятся
 * по разным файлам, и без описания потом невозможно понять, чем подписывали,
 * что именно подписано и не подменили ли документ после подписи. Манифест
 * закрывает оба вопроса: в нём снимок сертификата, SHA-256 документа и
 * оговорка, что подпись поставлена на рабочем месте и сервером не проверялась.
 *
 * Сам ключ остаётся в токене: в плагин уходит содержимое, назад — base64
 * открепленной подписи (`CADESCOM_CADES_BES`, detached).
 */

/** Один файл пакета: имя, содержимое, MIME-тип. */
export interface PackageFile {
  name: string;
  text: string;
  mime: string;
}

/** Итог подписания: что скачать и что об этом сказать заказчику. */
export interface SignedSmpPackage {
  documentName: string;
  signatureName: string;
  manifestName: string;
  /** Человекочитаемое название подписанного набора — уходит в манифест. */
  documentLabel: string;
  /** Размер документа и подписи в байтах — для отчёта в интерфейсе. */
  documentBytes: number;
  signatureBytes: number;
  /** SHA-256 документа: попадает в манифест и в журнал. */
  sha256: string;
  signedAt: string;
  certificate: PluginCertificateInfo;
  /** Открепленная подпись в base64: из неё собирается бинарный `.sig`. */
  signatureBase64: string;
}

/*
 * BOM — часть файла, а не украшение: именно эти байты уходят и в ЕИС, и в
 * подпись. Если подписывать строку без BOM, а скачивать с ним, подпись
 * перестанет сходиться у получателя.
 */
const CSV_BOM = "\uFEFF";

const base64ToBytes = (base64: string): ArrayBuffer => {
  const clean = base64
    .replace(/-----(BEGIN|END)[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return buffer;
};

const sha256Hex = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const fileStamp = (date: Date): string =>
  `${date.toISOString().slice(0, 10)}_${date
    .toTimeString()
    .slice(0, 5)
    .replace(":", "")}`;

/**
 * Подписать CSV сертификатом рабочего места и собрать пакет.
 *
 * Ничего не скачивает и не отправляет: только возвращает готовые файлы,
 * чтобы вызывающий код мог сначала показать результат, а потом отдать файлы.
 */
export const signSmpPackage = async (
  csv: string,
  certificate: PluginCertificateInfo,
  documentLabel: string,
): Promise<SignedSmpPackage> => {
  const signedAt = new Date();
  const documentText = CSV_BOM + csv;
  const stamp = fileStamp(signedAt);

  const signature = await signText(certificate, documentText, {
    detached: true,
  });

  if (signature.bytes === 0) {
    throw new Error(
      "Плагин вернул пустую подпись: вероятно, у контейнера ключа нет доступа " +
        "или сертификат без закрытого ключа. Проверьте, что в строке " +
        "«Ключ» диагностики стоит «есть».",
    );
  }

  const documentName = `smp_svedeniya_${stamp}.csv`;
  const signatureName = `${documentName}.sig`;
  const manifestName = `smp_svedeniya_${stamp}.manifest.json`;

  return {
    documentName,
    signatureName,
    manifestName,
    documentLabel,
    documentBytes: new TextEncoder().encode(documentText).length,
    signatureBytes: signature.bytes,
    sha256: await sha256Hex(documentText),
    signedAt: signedAt.toISOString(),
    certificate,
    signatureBase64: signature.value,
  };
};

/** Манифест пакета: читаемый глазами JSON, а не зашифрованный конверт. */
export const buildSmpManifest = (signed: SignedSmpPackage): string => {
  const certificate = signed.certificate;

  return JSON.stringify(
    {
      document: signed.documentName,
      signature: signed.signatureName,
      signatureFormat: "CAdES-BES",
      signatureDetached: true,
      algorithm: certificate.algorithm || "ГОСТ Р 34.10-2012",
      documentSha256: signed.sha256,
      documentBytes: signed.documentBytes,
      signatureBytes: signed.signatureBytes,
      signedAt: signed.signedAt,
      documentLabel: signed.documentLabel,
      certificate: {
        subject: certificate.subject,
        issuer: certificate.issuer,
        inn: certificate.inn,
        snils: certificate.snils,
        serialNumber: certificate.serialNumber,
        fingerprint: certificate.fingerprint,
        validFrom: certificate.validFrom,
        validTo: certificate.validTo,
      },
      tool: "CSMS · подпись на рабочем месте заказчика",
      note:
        "Подпись сформирована КриптоПро ЭЦП Browser plug-in на рабочем месте " +
        "заказчика. Сервером CSMS подпись не проверялась: проверка выполняется " +
        "средствами ЕИС при загрузке пакета.",
    },
    null,
    2,
  );
};

/** Отдать файлы пользователю: документ, открепленная подпись, манифест. */
export const downloadSmpPackage = (
  signed: SignedSmpPackage,
  csv: string,
): void => {
  downloadText(
    CSV_BOM + csv,
    signed.documentName,
    "text/csv;charset=utf-8",
  );
  downloadBlob(
    new Blob([base64ToBytes(signed.signatureBase64)], {
      type: "application/pkcs7-signature",
    }),
    signed.signatureName,
  );
  downloadText(
    buildSmpManifest(signed),
    signed.manifestName,
    "application/json;charset=utf-8",
  );
};
