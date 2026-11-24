/**
 * Точечная сверка ИНН с реестром МСП через сервис ФНС.
 *
 * Полный перечень реестра системе не нужен: заказчик и подрядчик проверяют
 * конкретных поставщиков — при вводе субподрядчика и при сверке коммерческих
 * предложений. Поэтому у сервиса ФНС спрашивается один ИНН, а ответ
 * складывается в `smpRegistry` как результат сверки: «в реестре (категория,
 * дата включения)», «не в реестре», «исключён». Запись живёт до
 * `SMP_REGISTRY_TTL_DAYS` дней, после чего ИНН перепроверяется.
 *
 * Источник — поиск по реестру на портале ФНС (rmsp.nalog.ru). Ответ сервиса:
 * `{ rowCount, data: [{ inn, name_ex, category, is_active, dtregistry, ... }] }`;
 * при отсутствии записи поля `data` нет вовсе, а `rowCount` равен нулю.
 */

/** Адрес сервиса. Меняется через окружение, если ФНС переедет или нужен шлюз. */
export const FNS_SMP_LOOKUP_URL =
  process.env.FNS_SMP_LOOKUP_URL?.trim() ||
  "https://rmsp.nalog.ru/search-proc.json";

/** Сколько дней ответ ФНС считается свежим: реестр меняется, но не ежечасно. */
export const SMP_CHECK_TTL_DAYS =
  Number(process.env.SMP_REGISTRY_TTL_DAYS ?? 30) || 30;

/** Категория субъекта МСП в ответе ФНС: 1 — микро, 2 — малые, 3 — средние. */
const CATEGORY_BY_CODE = { 1: "micro", 2: "small", 3: "medium" };

const digits = (value) => String(value ?? "").replace(/\D/g, "");

/** Контрольная сумма ИНН: 10 знаков у организаций, 12 у ИП. */
const checkDigit = (value, weights) =>
  (weights.reduce((sum, weight, index) => sum + weight * Number(value[index]), 0) %
    11) %
  10;

export const isValidInn = (value) => {
  const inn = digits(value);
  if (inn.length === 10) {
    return checkDigit(inn, [2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(inn[9]);
  }
  if (inn.length === 12) {
    return (
      checkDigit(inn, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(inn[10]) &&
      checkDigit(inn, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(inn[11])
    );
  }
  return false;
};

export const mapSmpCategory = (code) =>
  CATEGORY_BY_CODE[Number(code)] ?? undefined;

/** `10.08.2017 00:00:00` → `2017-08-10`: в справочнике даты хранятся как ISO. */
export const isoDate = (value) => {
  const dotted = String(value ?? "").match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return dotted ? `${dotted[3]}-${dotted[2]}-${dotted[1]}` : "";
};

/** Строка реестра по конкретному ИНН (сервис отвечает и на частичный запрос). */
export const pickRow = (payload, inn) => {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const target = digits(inn);
  return rows.find((row) => digits(row?.inn) === target) ?? null;
};

/**
 * Документ справочника из ответа ФНС. `found: false` — сверка выполнена и
 * ИНН в реестре не значится: это факт с датой, а не «нет данных».
 */
export const buildLookupDoc = ({ inn, row, checkedAt }) => {
  const checked = checkedAt ?? new Date().toISOString();

  if (!row) {
    return {
      inn: digits(inn),
      name: "",
      found: false,
      isActive: false,
      checkedAt: checked,
      source: "fns-live",
    };
  }

  const isActive = Number(row.is_active) === 1;
  const includedAt = isoDate(row.dtregistry);
  const category = mapSmpCategory(row.category);

  return {
    inn: digits(inn),
    name: String(row.name_ex ?? row.name ?? "").trim(),
    ...(category ? { category } : {}),
    ...(row.regioncode ? { region: String(row.regioncode) } : {}),
    ...(includedAt ? { includedAt } : {}),
    found: true,
    isActive,
    checkedAt: checked,
    source: "fns-live",
    ...(isActive ? {} : { note: "исключён из реестра МСП" }),
  };
};

/** Статус сверки — то, что интерфейс показывает человеку. */
export const lookupStatus = (doc) => {
  if (!doc.found) return "out_of_registry";
  return doc.isActive ? "in_registry" : "excluded";
};

/** Запрос к сервису ФНС: `{ found, row, checkedAt }` либо исключение. */
export const fetchInnFromFns = async (
  inn,
  { fetchImpl = fetch, url = FNS_SMP_LOOKUP_URL, timeoutMs = 15000 } = {},
) => {
  const body = new URLSearchParams({
    query: digits(inn),
    page: "1",
    pageSize: "10",
  });

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Портал ФНС отдаёт JSON только браузерным клиентам
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://rmsp.nalog.ru/search.html",
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) throw new Error(`Сервис ФНС ответил ${response.status}`);

  const payload = await response.json();
  const row = pickRow(payload, inn);
  return { found: Boolean(row), row, checkedAt: new Date().toISOString() };
};

/**
 * Полная сверка одного ИНН: проверка формата, запрос, документ справочника.
 * Ошибкой считается только недоступность сервиса — вердикта тогда нет, и
 * выдумывать «не в реестре» нельзя.
 */
export const lookupInn = async (inn, options = {}) => {
  const normalized = digits(inn);

  if (!isValidInn(normalized)) {
    return {
      inn: normalized,
      found: false,
      status: "invalid",
      cached: false,
      error: "ИНН не проходит проверку контрольной суммы",
    };
  }

  const { row, checkedAt } = await fetchInnFromFns(normalized, options);
  const doc = buildLookupDoc({ inn: normalized, row, checkedAt });

  return { ...doc, status: lookupStatus(doc), cached: false };
};

/** Ответ закэширован и ещё свежий: повторно ФНС не спрашиваем. */
export const isLookupFresh = (doc, now = Date.now()) => {
  if (!doc || typeof doc.checkedAt !== "string") return false;
  const checked = Date.parse(doc.checkedAt);
  if (Number.isNaN(checked)) return false;
  return now - checked < SMP_CHECK_TTL_DAYS * 24 * 60 * 60 * 1000;
};

/**
 * Документ справочника → ответ API (то, что видит интерфейс). Записи,
 * загруженные выгрузкой, поля `found` не имеют — они всегда «найдены».
 */
export const docToAnswer = (doc, cached = false) => {
  const found = doc.found !== false;
  const status = found
    ? doc.isActive === false
      ? "excluded"
      : "in_registry"
    : "out_of_registry";

  return {
    inn: digits(doc.inn),
    found,
    status,
    cached,
    ...(doc.name ? { name: doc.name } : {}),
    ...(doc.category ? { category: doc.category } : {}),
    ...(doc.region ? { region: doc.region } : {}),
    ...(doc.includedAt ? { includedAt: doc.includedAt } : {}),
    ...(doc.checkedAt ? { checkedAt: doc.checkedAt } : {}),
    ...(doc.note ? { note: doc.note } : {}),
  };
};

/** Ответ «сервис недоступен»: вердикта нет, вызывающий решает, что показать. */
export const unavailableAnswer = (inn, error) => ({
  inn: digits(inn),
  found: false,
  status: "unavailable",
  cached: false,
  error: String(error?.message ?? error ?? "Сервис ФНС недоступен"),
});
