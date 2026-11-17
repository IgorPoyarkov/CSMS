import { extractInnFromSubject, extractSnilsFromSubject } from "./eds.schema";
import { loadCadesApi, awaitCadesPluginReady } from "./cadesApiLoader";

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
export type PluginKind = "cadesplugin" | "none";

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

/**
 * Что вообще лежит в окне браузера под именами плагина.
 *
 * Расширение «CryptoPro Extension for CAdES Browser Plug-in» само по себе
 * инъекцию не делает: объект появляется, только когда рядом стоит нативная
 * часть (msi плагина). Экран показывает `typeof` по каждому имени, чтобы
 * «расширение установлено, а ничего нет» не приходилось угадывать.
 */
export interface PluginProbe {
  name: string;
  type: string;
}

const PLUGIN_GLOBALS = [
  "cadesplugin",
  "cpcsp_chrome_nmcades",
  "cp",
] as const;

export const probePluginGlobals = (): PluginProbe[] => {
  const target = globalWindow();

  return PLUGIN_GLOBALS.map((name) => ({
    name,
    type: typeof target[name],
  }));
};

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

/**
 * Подсказка про имя расширения перенесена в `PLUGIN_BRIDGE_ABSENT_HINT`:
 * в списке дополнений оно называется «Extension for CAdES Browser Plugin» —
 * слова CryptoPro в названии нет, поэтому его обычно и не находят.
 */

/** Состояние канала плагина: что нашлось и что из этого доступно. */
export interface PluginEnv {
  kind: PluginKind;
  found: boolean;
  version: string;
  /**
   * Мост расширения `window.cpcsp_chrome_nmcades` есть в окне.
   *
   * Это отдельный признак, и он экономит целый круг диагностики: мост
   * внедряет контент-скрипт расширения, значит расширение включено и страницу
   * не игнорирует. Если мост есть, а плагин молчит — виновата нативная часть
   * (служба плагина, регистрация хоста native messaging). Если моста нет —
   * виновато само расширение.
   */
  bridge: boolean;
  /** Чтение хранилища сертификатов через CAdESCOM. */
  canReadCertificates: boolean;
  /** Открепленная подпись `CAdESCOM.CadesSignedData`. */
  canSign: boolean;
  /** Подсказка для интерфейса, если чего-то не хватает. */
  hint: string;
}

/** Мост расширения: его создаёт `nmcades_plugin_api.js` в контент-скрипте. */
const hasExtensionBridge = (): boolean =>
  typeof window !== "undefined" &&
  Boolean(globalWindow().cpcsp_chrome_nmcades);

export const PLUGIN_BRIDGE_ABSENT_HINT =
  "Расширение не внедрилось в страницу: в окне нет моста " +
  "cpcsp_chrome_nmcades. Проверьте, что «Extension for CAdES Browser " +
  "Plugin» включено и браузер полностью перезапущен (Яндекс держит фоновые " +
  "процессы после закрытия окон), затем откройте этот же адрес в Chrome — " +
  "так сразу видно, дело в браузере или в расширении.";

export const PLUGIN_BRIDGE_NO_ANSWER_HINT =
  "Расширение внедрилось (мост cpcsp_chrome_nmcades есть), но плагин не " +
  "ответил — значит дело не в браузере, а в нативной части. Две частые " +
  "причины: не зарегистрирован хост native messaging ru.cryptopro.nmcades " +
  "(известный сбой x64-установщика плагина) и не запущена служба самого " +
  "плагина. Проверьте в КриптоПро CSP, что виден токен и сертификат.";

/**
 * Дождаться ответа плагина.
 *
 * Возвращает текст ошибки или `""`, если плагин готов. Именно `""`, а не
 * исключение: «плагина нет» — штатный сценарий для браузера без расширения,
 * и вызывающий код обрабатывает его как понятное сообщение, а не как сбой.
 */
const readinessError = async (): Promise<string> => {
  try {
    await awaitCadesPluginReady();
    return "";
  } catch (error) {
    return `${describePluginError(error)} ${
      hasExtensionBridge()
        ? PLUGIN_BRIDGE_NO_ANSWER_HINT
        : PLUGIN_BRIDGE_ABSENT_HINT
    }`;
  }
};

const readPluginVersion = async (): Promise<string> => {
  const api = cadesApi();
  if (!api) return "";

  try {
    const about = await createObject<CadesObject>(api, "CAdESCOM.About");
    const version = await readValue(about, "PluginVersion");

    return typeof version === "string" ? version : "";
  } catch {
    // Версия — удобство, а не условие работы: молча идём дальше
    return "";
  }
};

/**
 * Что браузер видит прямо сейчас.
 *
 * Сначала подключается `cadesplugin_api.js` — без него глобального объекта нет
 * вообще. Затем ожидается готовность: `cadesplugin` — это Promise, который
 * отклоняется, если расширение не ответило. «Объект объявлен» и «плагин
 * работает» — разные состояния, и второе проверяется только ожиданием.
 */
export const detectPluginEnv = async (): Promise<PluginEnv> => {
  let apiLoadError = "";

  try {
    await loadCadesApi();
  } catch (error) {
    apiLoadError = describePluginError(error);
  }

  if (!globalWindow().cadesplugin) {
    return {
      kind: "none",
      found: false,
      version: "",
      bridge: hasExtensionBridge(),
      canReadCertificates: false,
      canSign: false,
      hint: apiLoadError || PLUGIN_ABSENT_HINT,
    };
  }

  try {
    await awaitCadesPluginReady();
  } catch (error) {
    // Мост читается ПОСЛЕ ожидания: `nmcades_plugin_api.js` внедряется уже
    // после загрузки API-скрипта, поэтому замер сразу после `loadCadesApi`
    // показывал «нет» даже на рабочем плагине. К этому моменту прошло ~12 с,
    // и признак честный.
    const bridge = hasExtensionBridge();

    return {
      kind: "cadesplugin",
      found: false,
      version: "",
      bridge,
      canReadCertificates: false,
      canSign: false,
      hint: `${describePluginError(error)} ${
        bridge ? PLUGIN_BRIDGE_NO_ANSWER_HINT : PLUGIN_BRIDGE_ABSENT_HINT
      }`,
    };
  }

  const version = await readPluginVersion();

  return {
    kind: "cadesplugin",
    found: true,
    version,
    // Плагин ответил — значит мост был и работал; замеряем по факту, а не по
    // предположению, чтобы строка диагностики не противоречила сертификатам
    bridge: hasExtensionBridge(),
    canReadCertificates: true,
    canSign: true,
    hint: `Плагин ответил${version ? `, версия ${version}` : ""}: сертификаты читаются с рабочего места, подпись доступна.`,
  };
};

// ─── Чтение сертификатов ─────────────────────────────────────────────────────

/**
 * Записать свойство COM-объекта плагина.
 *
 * В CAdESCOM свойства выставляются не присваиванием, а методом: у `CPSigner`
 * это `propset_Certificate`. Прямое `signer.Certificate = cert` на актуальной
 * сборке плагина падает с «Cannot set property Certificate of #&lt;Object&gt;
 * which has only a getter» — у свойства объявлен только геттер.
 *
 * Поэтому перебираем известные формы записи: `propset_`, `put_`, затем прямое
 * присваивание (старые сборки умеют только его). Если не подошла ни одна,
 * сообщаем, что именно пробовали, — догадываться в следующем заходе не нужно.
 */
const setProperty = async (
  target: unknown,
  name: string,
  value: unknown,
): Promise<void> => {
  const object = target as Record<string, unknown>;
  const tried: string[] = [];

  for (const method of [`propset_${name}`, `put_${name}`]) {
    const candidate = object[method];
    if (typeof candidate !== "function") continue;

    tried.push(method);
    await Promise.resolve((candidate as (v: unknown) => unknown).call(target, value));
    return;
  }

  tried.push(`${name} = …`);
  try {
    object[name] = value;
    return;
  } catch (error) {
    throw new Error(
      `Плагин не дал записать свойство ${name}. Пробовали: ${tried.join(", ")}. ` +
        `Ответ плагина: ${describePluginError(error)}`,
    );
  }
};

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
  target: CadesObject,
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
  // API-скрипт подключается по требованию: без него глобального объекта нет
  await loadCadesApi().catch(() => undefined);

  const api = cadesApi();
  if (!api) {
    return { certificates: [], error: PLUGIN_ABSENT_HINT };
  }

  // Фабрика `CreateObjectAsync` появляется вместе со скриптом, а сам плагин
  // может так и не ответить (нет расширения или native host). Без ожидания
  // такой браузер отвечает сырым «Cannot read properties of undefined»,
  // и человек не понимает, что чинить
  const unready = await readinessError();
  if (unready) {
    return { certificates: [], error: unready };
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
  await loadCadesApi().catch(() => undefined);

  const api = cadesApi();
  if (!api) throw new Error(PLUGIN_ABSENT_HINT);

  // Сырая ошибка «Cannot read properties of undefined (CreateObjectAsync)»
  // означает лишь одно: плагин ещё/уже не ответил — объясняем это словами
  const unready = await readinessError();
  if (unready) throw new Error(unready);

  const detached = options.detached ?? true;
  const content = utf8ToBase64(text);

  const signer = await createObject<CadesSigner>(api, "CAdESCOM.CPSigner");
  await setProperty(signer, "Certificate", certificate.raw);

  const signedData = await createObject<CadesSignedData>(
    api,
    "CAdESCOM.CadesSignedData",
  );
  await setProperty(signedData, "ContentEncoding", CADESCOM_BASE64_TO_BINARY);
  await setProperty(signedData, "Content", content);

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

  // Внутренняя ошибка API-скрипта: он уже объявил фабрику, но объект за ней
  // ещё не создан. Человеку это имя ничего не говорит — заменяем
  if (/CreateObjectAsync|pluginObject/.test(base)) {
    return (
      "Плагин объявлен в странице, но не ответил: расширение не подключилось " +
      "к нативной части. Проверьте страницу «Проверка ЭП» — она покажет, " +
      "внедрилось ли расширение."
    );
  }

  return `${base} Проверьте: подключён ли токен, вставлен ли он до открытия браузера, виден ли сертификат в КриптоПро CSP и не истёк ли срок его действия.`;
};
