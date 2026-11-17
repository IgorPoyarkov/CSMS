import { extractInnFromSubject, extractSnilsFromSubject } from "./eds.schema";

/**
 * Мост к КриптоПро ЭЦП Browser plug-in по объектной модели CAdESCOM.
 *
 * Отличие от `cryptoPro.ts`: там WebCrypto-ветка `window.cp` (вход по ЭП),
 * здесь — реальный доступ к хранилищу «Мой» и подпись через
 * `CAdESCOM.CadesSignedData`. Плагин выставляет в окно именно `cadesplugin`
 * (у старых сборок `cpcsp`), поэтому детект проверяет все три имени —
 * с одним `cp` сертификаты на рабочем месте не читаются.
 *
 * Ключевой контейнер не покидает токен: в плагин уходит только содержимое,
 * наружу возвращается готовая подпись. Проверить подпись может лишь сервер
 * с открытым ключом из сертификата — json-server этого не делает, поэтому
 * результат подписи здесь не объявляется «проверенным».
 */

// Константы CAdESCOM/CAPICOM. Плагин кладёт их на сам объект, но значения
// стабильны, поэтому держим числами: не зависим от имени константы в сборке.
const CAPICOM_CURRENT_USER_STORE = 2;
const CAPICOM_MY_STORE = "My";
const CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED = 2;
const CADESCOM_BASE64_TO_BINARY = 1;
const CADESCOM_CADES_BES = 1;
const CADESCOM_ENCODE_BASE64 = 0;

/** Имя объекта плагина, который нашёлся в окне браузера. */
export type PluginKind = "cadesplugin" | "cpcsp" | "cp" | "none";

type CadesObject = Record<string, unknown>;

interface CadesApi {
  CreateObjectAsync?: (name: string) => Promise<unknown> | unknown;
  About?: (() => Promise<unknown> | unknown) | unknown;
  PluginVersion?: unknown;
  Version?: unknown;
}

interface CadesCertificate extends CadesObject {
  SubjectName?: unknown;
  IssuerName?: unknown;
  SerialNumber?: unknown;
  Thumbprint?: unknown;
  ValidFromDate?: unknown;
  ValidToDate?: unknown;
  HasPrivateKey?: unknown;
  SignatureAlgorithm?: unknown;
}

interface CadesCollection {
  Count: unknown;
  Item: (index: number) => Promise<CadesCertificate> | CadesCertificate;
}

interface CadesStore {
  Open: (location: number, name: string, mode: number) => Promise<void> | void;
  Close: () => Promise<void> | void;
  Certificates?: Promise<CadesCollection> | CadesCollection;
}

interface CadesSigner {
  Certificate?: unknown;
}

interface CadesSignedData {
  ContentEncoding?: unknown;
  Content?: unknown;
  SignCades: (
    signer: CadesSigner,
    signatureType: number,
    detached: boolean,
    encodingType: number,
  ) => Promise<unknown> | unknown;
}

const globalWindow = (): Record<string, unknown> =>
  window as unknown as Record<string, unknown>;

const cadesApi = (): CadesApi | null => {
  if (typeof window === "undefined") return null;
  const target = globalWindow();
  const api = (target.cadesplugin ?? target.cpcsp) as CadesApi | undefined;

  return api && typeof api.CreateObjectAsync === "function" ? api : null;
};

/** Создать COM-объект плагина; отсутствие фабрики — ошибка конфигурации. */
const createObject = async <T>(api: CadesApi, name: string): Promise<T> => {
  const factory = api.CreateObjectAsync;
  if (typeof factory !== "function") {
    throw new Error(PLUGIN_ABSENT_HINT);
  }

  return (await Promise.resolve(factory.call(api, name))) as T;
};

/** Есть ли в браузере канал CAdESCOM (его использует чтение и подпись). */
export const hasCadesPlugin = (): boolean => cadesApi() !== null;

/** Версия плагина, если её удаётся прочитать без ожидания. */
export const cadesPluginVersionSync = (): string => {
  const api = cadesApi();
  const direct = api?.PluginVersion ?? api?.Version;

  return typeof direct === "string" ? direct : "";
};

export const PLUGIN_ABSENT_HINT =
  "Плагин не найден в браузере. Нужны два компонента: «КриптоПро CSP» " +
  "(видит токен и сертификаты) и «КриптоПро ЭЦП Browser plug-in» " +
  "(расширение браузера, выставляет объект в окно). После установки " +
  "перезапустите браузер и обновите страницу.";

export const PLUGIN_SECURE_CONTEXT_HINT =
  "Плагин не инициализировался. Частая причина — страница открыта не по " +
  "https и не на localhost: часть версий плагина работает только в " +
  "защищённом контексте. Проверьте также, что расширение включено, а в " +
  "КриптоПро CSP → Сервис → Просмотреть сертификаты в контейнере виден " +
  "ваш сертификат.";

/** Состояние канала плагина: что нашлось и что из этого доступно. */
export interface PluginEnv {
  kind: PluginKind;
  found: boolean;
  version: string;
  /** Чтение хранилища сертификатов через CAdESCOM. */
  canReadCertificates: boolean;
  /** Открепленная подпись `CAdESCOM.CadesSignedData`. */
  canSign: boolean;
  /** Подсказка для интерфейса, если чего-то не хватает. */
  hint: string;
}

const readAboutVersion = async (api: CadesApi): Promise<string> => {
  try {
    const about = api.About;
    if (typeof about !== "function") return "";

    const info = (await about.call(api)) as CadesObject | string;
    if (typeof info === "string") return info;

    const value = info.PluginVersion ?? info.Version;
    return typeof value === "string" ? value : "";
  } catch {
    // Версия — удобство, а не условие работы: молча идём дальше
    return "";
  }
};

/**
 * Что браузер видит прямо сейчас. Функция честно возвращает «нет плагина»
 * вместо исключения: сценарий «заказчик открыл не тот браузер» — обычный,
 * и интерфейс обязан объяснить его, а не падать.
 */
export const detectPluginEnv = async (): Promise<PluginEnv> => {
  const api = cadesApi();

  if (api) {
    const kind: PluginKind = globalWindow().cadesplugin ? "cadesplugin" : "cpcsp";
    const version = (await readAboutVersion(api)) || cadesPluginVersionSync();

    return {
      kind,
      found: true,
      version,
      canReadCertificates: true,
      canSign: true,
      hint: `Канал ${kind}${version ? `, версия ${version}` : ""}: сертификаты читаются с рабочего места, подпись доступна.`,
    };
  }

  // Ветка WebCrypto (`window.cp`): плагин нашёлся, но хранилище сертификатов
  // через неё не читается — там только подпись набора
  const cp = globalWindow().cp as
    | { version?: string; webcrypto?: Record<string, unknown> }
    | undefined;

  if (cp) {
    return {
      kind: "cp",
      found: true,
      version: cp.version ?? "",
      canReadCertificates: false,
      canSign: Boolean(cp.webcrypto?.sign ?? cp.webcrypto?.signEx),
      hint:
        "Найден объект cp (WebCrypto-ветка): подписать наборт можно, но " +
        "сертификаты из хранилища так не читаются. Для чтения сертификатов " +
        "и подписания документов нужен CAdESCOM — «КриптоПро ЭЦП Browser " +
        "plug-in».",
    };
  }

  return {
    kind: "none",
    found: false,
    version: "",
    canReadCertificates: false,
    canSign: false,
    hint: PLUGIN_ABSENT_HINT,
  };
};

// ─── Чтение сертификатов ─────────────────────────────────────────────────────

/** Сертификат рабочего места в виде, пригодном для интерфейса. */
export interface PluginCertificateInfo {
  subject: string;
  issuer: string;
  /** Серийник в HEX: плагин отдаёт десятичную строку. */
  serialNumber: string;
  fingerprint: string;
  validFrom: string;
  validTo: string;
  hasPrivateKey: boolean;
  algorithm: string;
  /** ИНН из subject — по нему сверяется сертификат с организацией. */
  inn: string;
  /** СНИЛС из subject — для физлица и МЧД. */
  snils: string;
  /** Исходный объект плагина: через него ставится подпись. Наружу не уходит. */
  raw: CadesCertificate;
}

const readValue = async (
  target: CadesCertificate,
  name: string,
): Promise<unknown> => {
  try {
    return await target[name];
  } catch {
    // Часть свойств в старых сборках отсутствует — для диагностики это норма
    return undefined;
  }
};

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // Объекты вида { Name, OID } — берём читаемое имя
  if (typeof value === "object") {
    const named = value as { Name?: unknown; name?: unknown };
    const name = named.Name ?? named.name;
    if (typeof name === "string") return name;
  }
  return "";
};

/** Плагин отдаёт дату либо Date, либо строкой «ДД.ММ.ГГГГ чч:мм:сс». */
const toIsoDay = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const text = asText(value);
  const dot = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(text);
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  return text.slice(0, 10);
};

/** Десятичный серийник из плагина — в привычный HEX. */
const serialToHex = (raw: string): string => {
  const digits = raw.replace(/\s+/g, "");
  if (!/^\d+$/.test(digits)) return digits.toUpperCase();

  try {
    let hex = BigInt(digits).toString(16).toUpperCase();
    if (hex.length % 2) hex = `0${hex}`;
    return hex;
  } catch {
    return digits;
  }
};

const formatFingerprint = (raw: string): string =>
  raw.replace(/\s+/g, "").toUpperCase();

const toCertificateInfo = async (
  raw: CadesCertificate,
): Promise<PluginCertificateInfo> => {
  const subject = asText(await readValue(raw, "SubjectName"));

  return {
    subject,
    issuer: asText(await readValue(raw, "IssuerName")),
    serialNumber: serialToHex(asText(await readValue(raw, "SerialNumber"))),
    fingerprint: formatFingerprint(asText(await readValue(raw, "Thumbprint"))),
    validFrom: toIsoDay(await readValue(raw, "ValidFromDate")),
    validTo: toIsoDay(await readValue(raw, "ValidToDate")),
    hasPrivateKey: Boolean(await readValue(raw, "HasPrivateKey")),
    algorithm: asText(await readValue(raw, "SignatureAlgorithm")),
    inn: extractInnFromSubject(subject),
    snils: extractSnilsFromSubject(subject),
    raw,
  };
};

export interface ReadCertificatesResult {
  certificates: PluginCertificateInfo[];
  /** Ошибка самого плагина (например, пользователь закрыл окно доступа). */
  error: string;
}

/**
 * Сертификаты из хранилища «Мой» текущего пользователя.
 *
 * Читаются все, включая просроченные и без закрытого ключа: интерфейс должен
 * показать, что нашлось, — иначе «сертификат не виден» невозможно объяснить.
 */
export const readStoreCertificates = async (): Promise<ReadCertificatesResult> => {
  const api = cadesApi();
  if (!api) {
    return { certificates: [], error: PLUGIN_ABSENT_HINT };
  }

  let store: CadesStore | null = null;

  try {
    store = await createObject<CadesStore>(api, "CAdESCOM.Store");

    await Promise.resolve(
      store.Open(
        CAPICOM_CURRENT_USER_STORE,
        CAPICOM_MY_STORE,
        CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED,
      ),
    );

    if (!store.Certificates) {
      return { certificates: [], error: "Плагин не вернул хранилище сертификатов." };
    }

    const collection = await Promise.resolve(store.Certificates);
    const count = Number(await Promise.resolve(collection.Count)) || 0;

    const certificates: PluginCertificateInfo[] = [];
    for (let index = 1; index <= count; index += 1) {
      const item = await Promise.resolve(collection.Item(index));
      certificates.push(await toCertificateInfo(item));
    }

    return { certificates, error: "" };
  } catch (error) {
    return { certificates: [], error: describePluginError(error) };
  } finally {
    try {
      if (store) await Promise.resolve(store.Close());
    } catch {
      // Закрывать нечего — не мешает показать прочитанное
    }
  }
};

// ─── Подпись ─────────────────────────────────────────────────────────────────

export const SIGN_CHECK_PREFIX = "CSMS-EDS-CHECK";

export interface SignatureResult {
  /** Открепленная подпись в base64 — так её и ждёт ЕИС. */
  value: string;
  algorithm: string;
  detached: boolean;
  /** Размер подписи в байтах: по нему видно, что пришло не пустое. */
  bytes: number;
  contentBytes: number;
}

const utf8ToBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary);
};

const base64Bytes = (base64: string): number => {
  const clean = base64.replace(/[\r\n\s]/g, "");
  if (!clean) return 0;

  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;

  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
};

export interface SignOptions {
  /** true — открепленная подпись (файл + .sig), false — содержимое внутри CMS. */
  detached?: boolean;
}

/**
 * Подписать строку сертификатом рабочего места.
 *
 * `CAdESCOM.CadesSignedData` ждёт содержимое в base64 при
 * `ContentEncoding = CADESCOM_BASE64_TO_BINARY`, поэтому строку переводим
 * в UTF-8 и base64. Открепленная подпись — то, что нужно для отправки в ЕИС:
 * документ и `.sig` уезжают файлами.
 */
export const signText = async (
  certificate: PluginCertificateInfo,
  text: string,
  options: SignOptions = {},
): Promise<SignatureResult> => {
  const api = cadesApi();
  if (!api) throw new Error(PLUGIN_ABSENT_HINT);

  const detached = options.detached ?? true;
  const content = utf8ToBase64(text);

  const signer = await createObject<CadesSigner>(api, "CAdESCOM.CPSigner");
  signer.Certificate = certificate.raw;

  const signedData = await createObject<CadesSignedData>(
    api,
    "CAdESCOM.CadesSignedData",
  );
  signedData.ContentEncoding = CADESCOM_BASE64_TO_BINARY;
  signedData.Content = content;

  const value = await Promise.resolve(
    signedData.SignCades(
      signer,
      CADESCOM_CADES_BES,
      detached,
      CADESCOM_ENCODE_BASE64,
    ),
  );

  const signature = typeof value === "string" ? value : "";

  return {
    value: signature,
    algorithm: certificate.algorithm || "ГОСТ Р 34.10-2012",
    detached,
    bytes: base64Bytes(signature),
    contentBytes: base64Bytes(content),
  };
};

/**
 * Тестовая строка с меткой времени: подпись нельзя перенести из прошлого
 * прогона, а по содержимому видно, что подписывалось именно сейчас.
 */
export const makeSignCheckText = (): string =>
  `${SIGN_CHECK_PREFIX}:${Date.now()}`;

/** Ошибку плагина показываем как есть плюс подсказку, что проверить. */
export const describePluginError = (error: unknown): string => {
  const message =
    error instanceof Error
      ? error.message || error.name
      : typeof error === "string"
        ? error
        : asText((error as CadesObject | null)?.message);

  const base = message.trim() || "Плагин вернул пустой ответ.";

  return `${base} Проверьте: подключён ли токен, вставлен ли он до открытия браузера, виден ли сертификат в КриптоПро CSP и не истёк ли срок его действия.`;
};
