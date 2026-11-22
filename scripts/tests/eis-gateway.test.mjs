import assert from "node:assert/strict";
import test from "node:test";
import {
  assertGatewayReady,
  buildSoapEnvelope,
  createGatewaySender,
  gatewayProblems,
  parseGatewayResponse,
  readGatewayConfig,
} from "../lib/eis-gateway.mjs";

test("шлюз по умолчанию выключен и не требует настроек", () => {
  const config = readGatewayConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.transport, "mock");
  assert.equal(config.schemaVersion, "17.0");
  assert.deepEqual(gatewayProblems(config), []);
  assert.throws(() => assertGatewayReady(config), /Шлюз ЕИС выключен/);
});

test("диагностика не утекает логин и пароль", () => {
  const config = readGatewayConfig({
    EisGateway__Enabled: "true",
    EisGateway__Transport: "soap",
    EisGateway__Endpoint: "http://gateway.example",
    EisGateway__Login: "SECRET_LOGIN",
    EisGateway__Password: "SECRET_PASSWORD",
    EisGateway__AuthMode: "unknown",
  });
  const problems = gatewayProblems(config);
  assert.ok(problems.some((p) => p.includes("HTTPS")));
  assert.ok(problems.some((p) => p.includes("AuthMode")));
  const report = problems.join("; ");
  assert.ok(!report.includes("SECRET_LOGIN"));
  assert.ok(!report.includes("SECRET_PASSWORD"));
});

test("SOAP-конверт экранирует данные и сохраняет XML как есть", () => {
  const config = readGatewayConfig({
    EisGateway__Login: "user&<name>",
    EisGateway__Password: "p\"ass'word",
  });
  const envelope = buildSoapEnvelope({
    method: "sendPacket",
    bodyXml: "<Packet><Number>123</Number></Packet>",
    config,
  });
  assert.match(envelope, /<sendPacket><Packet><Number>123<\/Number><\/Packet><\/sendPacket>/);
  assert.match(envelope, /<wsse:Username>user&amp;&lt;name&gt;<\/wsse:Username>/);
  assert.match(envelope, /<wsse:Password>p&quot;ass&apos;word<\/wsse:Password>/);

  const basic = buildSoapEnvelope({
    method: "sendPacket",
    bodyXml: "<Packet/>",
    config,
    authMode: "http-basic",
  });
  assert.ok(!basic.includes("wsse:Security"));
});

test("разбор квитанции вытаскивает GUID, статус и ошибки ФЛК", () => {
  const parsed = parseGatewayResponse(`
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body><sendResponse>
        <PacketGuid>abc-123</PacketGuid>
        <Status>Accepted</Status>
        <ErrorCode code="E12">Неверный формат даты</ErrorCode>
      </sendResponse></soap:Body>
    </soap:Envelope>`);
  assert.equal(parsed.guid, "abc-123");
  assert.equal(parsed.status, "Accepted");
  assert.deepEqual(parsed.errors, [{ code: "E12", message: "Неверный формат даты" }]);
});

test("отправитель не делает сетевой вызов, пока шлюз выключен", async () => {
  let calls = 0;
  const send = createGatewaySender({
    config: readGatewayConfig({}),
    fetchImpl: async () => {
      calls += 1;
      throw new Error("не должен вызываться");
    },
  });
  await assert.rejects(() => send({ method: "sendPacket", bodyXml: "<Packet/>" }));
  assert.equal(calls, 0);
});

test("настроенный отправитель шлёт конверт и возвращает разбор ответа", async () => {
  let request;
  const send = createGatewaySender({
    config: readGatewayConfig({
      EisGateway__Enabled: "true",
      EisGateway__Transport: "soap",
      EisGateway__Endpoint: "https://gateway.example/send",
      EisGateway__Login: "user",
      EisGateway__Password: "pass",
    }),
    fetchImpl: async (url, init) => {
      request = { url, init };
      return {
        ok: true,
        text: async () => "<sendResponse><PacketGuid>guid-9</PacketGuid></sendResponse>",
      };
    },
  });
  const result = await send({ method: "sendPacket", bodyXml: "<Packet/>" });
  assert.equal(result.guid, "guid-9");
  assert.equal(request.url, "https://gateway.example/send");
  assert.match(request.init.headers["Content-Type"], /text\/xml/);
  assert.match(request.init.body, /<soap:Envelope/);
});
