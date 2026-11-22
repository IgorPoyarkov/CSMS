import {
  EdsCertificateSchema,
  extractInnFromSubject,
  extractNameFromSubject,
  extractSnilsFromSubject,
  type EdsCertificate,
} from "./eds.schema";
import {
  cadesPluginVersionSync,
  hasCadesPlugin,
  readStoreCertificates,
  type PluginCertificateInfo,
} from "./pluginSign";

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
  getThumbprint?: (
    algorithm?: string,
  ) => ArrayBuffer | string | Promise<ArrayBuffer | string>;
}

interface CryptoProApiLike {
  version?: string;
  webcrypto?: {
    getCertificates?: () =>
      | PluginCertificateLike[]
      | Promise<PluginCertificateLike[]>;
    // Подпись набора: разные версии плагина называют метод по-разному и
    // ждут разные аргументы, поэтому перебираем известные варианты вызова
    sign?: (...args: unknown[]) => unknown;
    signEx?: (...args: unknown[]) => unknown;
  };
}

type WindowWithCryptoPro = Window & { cp?: CryptoProApiLike };

const plugin = (): CryptoProApiLike | null => {
  if (typeof window === "undefined") return null;
  return (window as WindowWithCryptoPro).cp ?? null;
};

export interface CryptoProStatus {
  installed: boolean;
  // Подписать наборт плагин умеет не всегда: чтение сертификатов и
  // подписание — разные вызовы
  canSign: boolean;
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
  const viaWebcrypto = Boolean(cp?.webcrypto?.getCertificates);
  // Реальный плагин выставляет cadesplugin/cpcsp, а не cp: без этой ветки
  // журнал на рабочем месте заказчика показывал «плагин не найден»
  const viaCades = hasCadesPlugin();
  const version = cadesPluginVersionSync() || cp?.version || "";

  const installed = viaCades || viaWebcrypto;
  const canSign =
    viaCades || Boolean(cp?.webcrypto?.sign || cp?.webcrypto?.signEx);

  return {
    installed,
    canSign,
    version,
    hint: viaCades
      ? `Плагин обнаружен${version ? `, версия ${version}` : ""}: сертификаты читаются с рабочего места (CAdESCOM), подпись доступна.`
      : viaWebcrypto
        ? `Плагин обнаружен${version ? `, версия ${version}` : ""}: список сертификатов читается с рабочего места автоматически.`
        : "Плагин подключается по требованию (cadesplugin_api.js), поэтому здесь он не виден. Полная проверка рабочего места — на странице «Проверка ЭП».",
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
  organizationId?: string | number,
): Promise<EdsCertificate> => {
  const subject = subjectName(certificate.subject);

  return EdsCertificateSchema.parse({
    // До входа в систему организация неизвестна: при входе по ЭП атрибуты
    // читаются «в пустоту», а заказчик определяется по ИНН из subject
    organizationId: organizationId ?? "",
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

const readRawCertificates = async (): Promise<PluginCertificateLike[]> => {
  const getCertificates = plugin()?.webcrypto?.getCertificates;
  if (!getCertificates) return [];

  try {
    const raw = await getCertificates();
    return Array.isArray(raw) ? raw : [];
  } catch {
    // Плагин может отказать, если пользователь закрыл окно доступа к токенам
    return [];
  }
};

/**
 * Сертификат вместе с «ручкой» плагина: атрибуты — это строки, а чтобы
 * подписать наборт, нужен исходный объект сертификата из хранилища.
 */
export interface PluginSignHandle {
  certificate: EdsCertificate;
  raw: PluginCertificateLike;
}

/**
 * Сертификаты рабочего места вместе с ручками для подписи.
 * Пустой массив и installed: false — сценарий «плагина нет», он не ошибка.
 */
export const readPluginSignHandles = async (
  organizationId?: string | number,
): Promise<PluginSignHandle[]> => {
  const list = await readRawCertificates();

  return Promise.all(
    list.map(async (raw) => ({
      raw,
      certificate: await toEdsCertificate(raw, organizationId),
    })),
  );
};

/**
 * Сертификаты, которые плагин видит на рабочем месте заказчика.
 *
 * Два источника по очереди: WebCrypto-ветка `window.cp` (старые сборки и
 * Госключ) и хранилище «Мой» через CAdESCOM. Второй — рабочий путь
 * «КриптоПро ЭЦП Browser plug-in»: именно он отдаёт сертификат с токена,
 * поэтому без него список оставался пустым на живой машине.
 */
export const readPluginCertificates = async (
  organizationId?: string | number,
): Promise<EdsCertificate[]> => {
  const handles = await readPluginSignHandles(organizationId);
  if (handles.length > 0) return handles.map((handle) => handle.certificate);

  const store = await readStoreCertificates().catch(() => null);
  if (!store || store.certificates.length === 0) return [];

  return store.certificates.map((info) =>
    storeCertificateToEds(info, organizationId),
  );
};

/** Сертификат из хранилища «Мой» в форме, принятой в журнале ЭП. */
export const storeCertificateToEds = (
  info: PluginCertificateInfo,
  organizationId?: string | number,
): EdsCertificate =>
  EdsCertificateSchema.parse({
    // До входа в систему организация неизвестна — как и в остальных ветках
    organizationId: organizationId ?? "",
    ownerName: extractNameFromSubject(info.subject) || "Владелец не определён",
    ownerSnils: info.snils || extractSnilsFromSubject(info.subject),
    inn: info.inn || extractInnFromSubject(info.subject),
    subject: info.subject,
    issuer: info.issuer,
    serialNumber: info.serialNumber,
    fingerprint: info.fingerprint,
    signatureAlgorithm: info.algorithm,
    validFrom: info.validFrom,
    validTo: info.validTo,
    isRevoked: false,
    isProxy: false,
    source: "plugin",
  });

// ─── Вход по ЭП: наборт и подпись ────────────────────────────────────────────

export const LOGIN_CHALLENGE_PREFIX = "CSMS-EDS-LOGIN";

/**
 * Одноразовый наборт, который предлагается подписать при входе. Смысл тот же,
 * что в challenge-response: подпись ставится не на заготовленном тексте,
 * поэтому её нельзя перенести из прошлого входа. Настоящая проверка подписи
 * возможна только на сервере — json-server её не выполняет.
 */
export const makeLoginChallenge = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `${LOGIN_CHALLENGE_PREFIX}:${Date.now()}:${nonce}`;
};

export interface PluginSignature {
  algorithm: string;
  value: string;
}

// Имена алгоритмов подписи в плагине нестабильны: у Госключа свои написания,
// в старых версиях встречались латинические, поэтому пробуем по очереди
const SIGN_ALGORITHM_CANDIDATES = [
  "ГОСТ Р 34.10-2012/256",
  "GOST R 34.10-2012/256",
  "GOST3410-2012/256",
  "RSASSA-PKCS1-v1_5",
];

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const normalizeSignature = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value instanceof ArrayBuffer) return toBase64(new Uint8Array(value));
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return toBase64(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength),
    );
  }
  return "";
};

/**
 * Попытка подписать наборт на рабочем месте заказчика.
 *
 * Вызов и имена алгоритмов различаются между версиями плагина, поэтому
 * перебираются известные формы аргументов. `null` означает не «отказано», а
 * «подписать не удалось»: плагин может быть без права подписи, без доступа к
 * контейнеру или с непредставленной здесь сигнатурой. Интерфейс обязан
 * объяснить это пользователю, а не показывать «неверная подпись».
 */
export const signLoginChallenge = async (
  handle: PluginSignHandle,
  challenge: string,
): Promise<PluginSignature | null> => {
  const webcrypto = plugin()?.webcrypto;
  const sign = webcrypto?.sign ?? webcrypto?.signEx;
  if (!sign) return null;

  const data = new TextEncoder().encode(challenge);

  const attempts: { algorithm: string; args: unknown[] }[] = [];
  for (const algorithm of SIGN_ALGORITHM_CANDIDATES) {
    attempts.push({ algorithm, args: [algorithm, handle.raw, data] });
    attempts.push({ algorithm, args: [{ name: algorithm }, handle.raw, data] });
  }
  attempts.push({ algorithm: "", args: [handle.raw, data] });

  for (const attempt of attempts) {
    try {
      const value = normalizeSignature(await sign(...attempt.args));
      if (value) {
        return {
          algorithm:
            attempt.algorithm || handle.certificate.signatureAlgorithm || "",
          value,
        };
      }
    } catch {
      // Эта форма вызова не подошла — пробуем следующую
    }
  }

  return null;
};
