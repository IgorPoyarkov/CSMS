/**
 * Контракт будущего транспорта альтернативной интеграции ЕИС (ЛК, логин/пароль).
 *
 * Модуль НЕ делает сетевых вызовов сам: он читает конфигурацию, проверяет её,
 * строит SOAP-конверт и разбирает ответ. При выключенном флаге отправитель
 * выбрасывает ошибку до вызова fetch. Это заготовка для этапа P0: когда
 * заказчик выдаст техническую пару и WSDL, меняется только сетевой адаптер,
 * а не форматы данных и статусы пакетов.
 *
 * Секреты (логин/пароль) никогда не попадают в сообщения об ошибках и логи.
 */

export const GATEWAY_AUTH_MODES = ["soap-username-token", "http-basic"];
export const GATEWAY_TRANSPORTS = ["mock", "soap"];
export const GATEWAY_TLS_MODES = ["local-agent", "gost-tunnel"];

export const DEFAULT_GATEWAY_CONFIG = Object.freeze({
  enabled: false,
  transport: "mock",
  endpoint: "",
  login: "",
  password: "",
  authMode: "soap-username-token",
  tlsMode: "local-agent",
  schemaVersion: "17.0",
  pollIntervalMs: 15000,
});

const asBool = (value, fallback) =>
  value === undefined ? fallback : /^(1|true|yes|on)$/i.test(String(value));

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return value === undefined || Number.isNaN(parsed) ? fallback : parsed;
};

/** Читает конфигурацию из окружения (.NET-стиль EisGateway__*). */
export function readGatewayConfig(env = process.env) {
  return {
    enabled: asBool(env.EisGateway__Enabled, DEFAULT_GATEWAY_CONFIG.enabled),
    transport:
      env.EisGateway__Transport || DEFAULT_GATEWAY_CONFIG.transport,
    endpoint: env.EisGateway__Endpoint || "",
    login: env.EisGateway__Login || "",
    password: env.EisGateway__Password || "",
    authMode: env.EisGateway__AuthMode || DEFAULT_GATEWAY_CONFIG.authMode,
    tlsMode: env.EisGateway__TlsMode || DEFAULT_GATEWAY_CONFIG.tlsMode,
    schemaVersion:
      env.EisGateway__SchemaVersion || DEFAULT_GATEWAY_CONFIG.schemaVersion,
    pollIntervalMs: asNumber(
      env.EisGateway__PollIntervalMs,
      DEFAULT_GATEWAY_CONFIG.pollIntervalMs,
    ),
  };
}

/**
 * Диагностика без утечки секретов: в текстах нет ни логина, ни пароля.
 * Выключенный шлюз считается корректным — это наш обычный офлайн-режим.
 */
export function gatewayProblems(config) {
  const problems = [];
  if (!config.enabled || config.transport === "mock") return problems;

  if (!/^https:\/\//i.test(config.endpoint)) {
    problems.push("EisGateway__Endpoint: требуется HTTPS-URL шлюза");
  }
  if (!config.login) problems.push("EisGateway__Login: не задан");
  if (!config.password) problems.push("EisGateway__Password: не задан");
  if (!GATEWAY_AUTH_MODES.includes(config.authMode)) {
    problems.push("EisGateway__AuthMode: неизвестный способ авторизации");
  }
  if (!GATEWAY_TLS_MODES.includes(config.tlsMode)) {
    problems.push("EisGateway__TlsMode: неизвестный режим TLS");
  }
  if (config.pollIntervalMs < 1000) {
    problems.push("EisGateway__PollIntervalMs: минимум 1000 мс");
  }
  return problems;
}

export function assertGatewayReady(config) {
  if (!config.enabled || config.transport === "mock") {
    throw new Error(
      "Шлюз ЕИС выключен (EisGateway__Enabled=false или Transport=mock); отправка запрещена",
    );
  }
  const problems = gatewayProblems(config);
  if (problems.length) throw new Error(`Шлюз ЕИС не настроен: ${problems.join("; ")}`);
}

export const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Шаблон SOAP 1.1-конверта. Точный вид security-заголовка и SOAPAction
 * подтверждается по WSDL конкретной версии интерфейса (см. задачу P1).
 * `bodyXml` вставляется как готовый XML — его экранировать нельзя.
 */
export function buildSoapEnvelope({ method, bodyXml, config, authMode }) {
  if (!method || !/^[A-Za-z][\w.:-]*$/.test(method)) {
    throw new Error("Некорректное имя SOAP-метода");
  }
  const mode = authMode || config?.authMode || "soap-username-token";
  if (!GATEWAY_AUTH_MODES.includes(mode)) {
    throw new Error("EisGateway__AuthMode: неизвестный способ авторизации");
  }

  const security =
    mode === "soap-username-token" && config?.login
      ? `<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" soap:mustUnderstand="1">` +
        `<wsse:UsernameToken><wsse:Username>${escapeXml(config.login)}</wsse:Username>` +
        `<wsse:Password>${escapeXml(config.password)}</wsse:Password>` +
        `</wsse:UsernameToken></wsse:Security>`
      : "";

  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Header>${security}</soap:Header>` +
    `<soap:Body><${method}>${bodyXml ?? ""}</${method}></soap:Body>` +
    `</soap:Envelope>`
  );
}

const localName = (tag) => String(tag).split(":").pop();

/** Разбор квитанции/протокола: GUID, статус и ошибки ФЛК. */
export function parseGatewayResponse(xml) {
  const text = String(xml ?? "");
  const result = { guid: null, status: null, errors: [] };
  // Только «листья»: вложенные конверты не съедают дочерние теги.
  const tagPattern = /<([A-Za-z_][\w.:-]*)([^>]*)>([^<]*)<\/[A-Za-z_][\w.:-]*>/g;

  for (const match of text.matchAll(tagPattern)) {
    const name = localName(match[1]);
    const value = match[3].trim();
    if (!value) continue;
    if (/^(guid|packetguid|packetid|requestguid|requestid|transactionid)$/i.test(name)) {
      result.guid = value;
    } else if (/^(status|state)$/i.test(name) && !result.status) {
      result.status = value;
    } else if (/error|fault/i.test(name)) {
      const code = match[2].match(/code="([^"]+)"/i)?.[1] ?? name;
      result.errors.push({ code, message: value });
    }
  }
  return result;
}

/**
 * Фабрика отправителя. Если шлюз выключен — выбрасывает ошибку, не вызывая
 * fetch. Для тестов сетевой вызов подменяется через fetchImpl.
 */
export function createGatewaySender({ config, fetchImpl = globalThis.fetch }) {
  return async function sendGatewayPacket({ method, bodyXml }) {
    assertGatewayReady(config);
    const envelope = buildSoapEnvelope({ method, bodyXml, config });
    const headers = {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: method,
    };
    if (config.authMode === "http-basic") {
      const token = Buffer.from(`${config.login}:${config.password}`).toString("base64");
      headers.Authorization = `Basic ${token}`;
    }

    const response = await fetchImpl(config.endpoint, {
      method: "POST",
      headers,
      body: envelope,
    });
    if (!response.ok) {
      throw new Error(`Шлюз ЕИС вернул HTTP ${response.status}`);
    }
    return parseGatewayResponse(await response.text());
  };
}
