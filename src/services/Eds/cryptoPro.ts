import {
  EdsCertificateSchema,
  extractInnFromSubject,
  extractNameFromSubject,
  extractSnilsFromSubject,
  type EdsCertificate,
} from "./eds.schema";

/**
 * Мост к криптографическому плагину на рабочем месте заказчика.
 *
 * Ключевой контейнер заказчика не покидает его компьютер: атрибуты
 * сертификата читаются плагином браузера (КриптоПро ЭЦП Browser plug-in,
 * он же Госключ, либо КриптоПро JCP на их сервере), а само подписание —
 * `CPSignEx`/`crypto.sign` — следующий шаг после того, как работает журнал.
 * Здесь только чтение: нам важно зафиксировать, КЕМ именно расписались.
 *
 * Плагин ставится на машине заказчика и добавляет в окно браузера объект
 * `cp` (у старых версий — `cp.cspGetContainerName` и компания). Если плагина
 * нет или браузер его заблокировал, интерфейс не ломается: атрибуты
 * сертификата вносятся вручную с карточки токена, а в журнале появляется
 * пометка об источнике данных (source: manual).
 */

// Фрагмент WebCrypto-подобного API плагина: описываем только то, что читаем
interface PluginCertificateLike {
  subject?: { name?: string } | string;
  issuer?: { name?: string } | string;
  serialNumber?: string;
  validFrom?: Date | string;
  validTo?: Date | string;
  signatureAlgorithm?: { name?: string } | string;
  getThumbprint?: (algorithm?: string) => ArrayBuffer | string | Promise<ArrayBuffer | string>;
}

interface CryptoProApiLike {
  version?: string;
  webcrypto?: {
    getCertificates?: () =>
      | PluginCertificateLike[]
      | Promise<PluginCertificateLike[]>;
  };
}

type WindowWithCryptoPro = Window & { cp?: CryptoProApiLike };

const plugin = (): CryptoProApiLike | null => {
  if (typeof window === "undefined") return null;
  return (window as WindowWithCryptoPro).cp ?? null;
};

export interface CryptoProStatus {
  installed: boolean;
  version: string;
  // Подсказка для интерфейса: что делать заказчику, если плагина нет
  hint: string;
}

export const CRYPTO_PRO_INSTALL_HINT =
  "КриптоПро ЭЦП Browser plug-in не найден в браузере. Установите плагин и " +
  "перезапустите браузер, либо внесите атрибуты сертификата вручную — они " +
  "видны в КриптоПро CSP (Сервис → Просмотреть сертификаты в контейнере) и в " +
  "карточке рабочего места заказчика.";

export const describeCryptoPro = (): CryptoProStatus => {
  const cp = plugin();
  const canRead = Boolean(cp?.webcrypto?.getCertificates);

  return {
    installed: canRead,
    version: cp?.version ?? "",
    hint: canRead
      ? `Плагин обнаружен${cp?.version ? `, версия ${cp.version}` : ""}: список сертификатов читается с рабочего места автоматически.`
      : CRYPTO_PRO_INSTALL_HINT,
  };
};

// Дата из плагина приходит объектом Date, из ручного ввода — строкой
const toIsoDate = (value: Date | string | undefined): string => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const subjectName = (value: PluginCertificateLike["subject"]): string => {
  if (!value) return "";
  return typeof value === "string" ? value : (value.name ?? "");
};

const algorithmName = (
  value: PluginCertificateLike["signatureAlgorithm"],
): string => {
  if (!value) return "";
  return typeof value === "string" ? value : (value.name ?? "");
};

// Отпечаток плагин отдаёт ArrayBuffer'ом — приводим к привычной HEX-записи
const formatThumbprint = (value: ArrayBuffer | string): string => {
  if (typeof value === "string") return value;
  return Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(":");
};

const readThumbprint = async (
  certificate: PluginCertificateLike,
): Promise<string> => {
  if (!certificate.getThumbprint) return "";
  try {
    const raw = await certificate.getThumbprint("SHA-256");
    return raw ? formatThumbprint(raw) : "";
  } catch {
    // Разные версии плагина по-разному называют алгоритм отпечатка
    return "";
  }
};

const toEdsCertificate = async (
  certificate: PluginCertificateLike,
  organizationId: string | number,
): Promise<EdsCertificate> => {
  const subject = subjectName(certificate.subject);

  return EdsCertificateSchema.parse({
    organizationId,
    ownerName: extractNameFromSubject(subject) || "Владелец не определён",
    ownerSnils: extractSnilsFromSubject(subject),
    inn: extractInnFromSubject(subject),
    subject,
    issuer: subjectName(certificate.issuer),
    serialNumber: certificate.serialNumber ?? "",
    fingerprint: await readThumbprint(certificate),
    signatureAlgorithm: algorithmName(certificate.signatureAlgorithm),
    validFrom: toIsoDate(certificate.validFrom),
    validTo: toIsoDate(certificate.validTo),
    isRevoked: false,
    isProxy: false,
    source: "plugin",
  });
};

/**
 * Сертификаты, которые плагин видит на рабочем месте заказчика.
 * Пустой массив и installed: false — сценарий «плагина нет», он не ошибка.
 */
export const readPluginCertificates = async (
  organizationId: string | number,
): Promise<EdsCertificate[]> => {
  const getCertificates = plugin()?.webcrypto?.getCertificates;
  if (!getCertificates) return [];

  try {
    const raw = await getCertificates();
    const list = Array.isArray(raw) ? raw : [];
    return await Promise.all(
      list.map((certificate) => toEdsCertificate(certificate, organizationId)),
    );
  } catch {
    // Плагин может отказать, если пользователь закрыл окно доступа к токенам
    return [];
  }
};
