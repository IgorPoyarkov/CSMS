/**
 * Оболочка интеграционного пакета ЕИС 17.0 (`as2PacketType`).
 *
 * Превью документов раньше начиналось сразу с корня документа
 * (`<tenderPlan2020>`, `<notificationEF2020>`, `<contractProject>`), и такой XML
 * ЕИС не принимает. По Альбому 17.0 (`fcsIntegration.xsd`) пакет — это
 * глобальный корневой элемент пакета с индексной карточкой `index` и блоком
 * `data`, внутри которого уже лежит сам документ.
 *
 * Три правила, проверенные валидацией по `schemas/17.0`:
 *
 * 1. `index` и `data` — в пространстве `http://zakupki.gov.ru/oos/integration/1`,
 *    а документ внутри `data` — в пространстве имён своего типа. Поэтому корень
 *    выводится с префиксом `p:`, а `xmlns` по умолчанию переключён на
 *    пространство документа: тело документа остаётся без префиксов и при этом
 *    попадает в правильное пространство имён.
 * 2. У `data` обязателен атрибут `schemeVersion` — именно у документа, а не у
 *    корня пакета (у корня атрибутов нет вовсе).
 * 3. `index/signature` обязателен, но заполняется при подписании. В превью он
 *    пустой: `xs:base64Binary` допускает пустое значение, а придумывать
 *    фальшивую подпись нельзя.
 */

/** Пространство имён элементов пакета (`fcsIntegration.xsd`, targetNamespace). */
export const EIS_INTEGRATION_NAMESPACE =
  "http://zakupki.gov.ru/oos/integration/1";

/** Версия Альбома форматов, под которую собраны превью. */
export const EIS_SCHEMA_VERSION = "17.0";

/** Тип подписи, допустимый XSD (`base:signatureType`). */
export const EIS_PACKET_SIGNATURE_TYPE = "CAdES-BES";

export type EisPacketMode = "PROD" | "TEST";

/** В CSMS шлюз работает с тестовым контуром, поэтому по умолчанию `TEST`. */
export const EIS_PACKET_DEFAULT_MODE: EisPacketMode = "TEST";

/**
 * AS2-адреса отправителя и получателя. Шлюз подменяет их на реальные
 * идентификаторы ЭДО, здесь достаточно честных заглушек.
 */
export const EIS_PACKET_DEFAULT_SENDER = "CSMS";
export const EIS_PACKET_DEFAULT_RECEIVER = "EIS";

/** Описание пакета: глобальный корень, код объекта обмена и namespace документа. */
export interface EisPacketDescriptor {
  /** Глобальный корневой элемент из `fcsIntegration.xsd`. */
  root: string;
  /** Код объекта обмена для `index/objectType`. */
  objectType: string;
  /** Пространство имён документа внутри `data`. */
  dataNamespace: string;
}

/**
 * Корни и коды объектов обмена по таблице `csms-api/docs/eis-xsd-roots.md`.
 *
 * Важно: в Альбоме 17.0 нет глобальных корней для извещений ЕОК/ЭЗК/ЭЗТ/ЕМЗ —
 * есть только `fcsNotificationEF`, `fcsNotificationEFDateChange`,
 * `fcsNotificationCancel` и корни других способов из `fcsIntegration.xsd`.
 */
export const EIS_PACKET_DESCRIPTORS = {
  tenderPlan: {
    root: "tenderPlan2020",
    objectType: "TP2020",
    dataNamespace: "http://zakupki.gov.ru/oos/TPtypes/1",
  },
  notificationEF: {
    root: "fcsNotificationEF",
    objectType: "EF",
    dataNamespace: "http://zakupki.gov.ru/oos/types/1",
  },
  notificationCancel: {
    root: "fcsNotificationCancel",
    objectType: "EF",
    dataNamespace: "http://zakupki.gov.ru/oos/types/1",
  },
  contractProject: {
    root: "cpContractProject",
    objectType: "CP",
    dataNamespace: "http://zakupki.gov.ru/oos/CPtypes/1",
  },
  contract: {
    root: "contract",
    objectType: "CT",
    dataNamespace: "http://zakupki.gov.ru/oos/types/1",
  },
  contractExecution: {
    root: "contractExecution",
    objectType: "CT",
    dataNamespace: "http://zakupki.gov.ru/oos/CETypes/1",
  },
  customerReportSmallScaleBusiness: {
    root: "fcsCustomerReportSmallScaleBusiness",
    objectType: "OZ",
    dataNamespace: "http://zakupki.gov.ru/oos/types/1",
  },
} as const satisfies Record<string, EisPacketDescriptor>;

export type EisPacketKind = keyof typeof EIS_PACKET_DESCRIPTORS;


/** Индексная карточка пакета. Незаполненные поля подставляются по умолчанию. */
export interface EisPacketIndex {
  /** Глобальный идентификатор пакета — ровно 36 символов. */
  id?: string;
  sender?: string;
  receiver?: string;
  /** Время формирования; по умолчанию — текущее. */
  createDateTime?: string;
  /** Реестровый номер объекта обмена (номер ПГ, ИКЗ, номер контракта). */
  objectId?: string;
  indexNum?: number;
  mode?: EisPacketMode;
  /** Номер тестового случая — только для `TEST`. */
  testCase?: number;
}

export const escapeXml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const pad2 = (value: number): string => String(value).padStart(2, "0");

/**
 * `xs:dateTime` с часовым поясом. По умолчанию — московское время (+03:00),
 * потому что весь контур заказчиков работает по нему.
 */
export const toEisDateTime = (date = new Date(), offsetMinutes = 180): string => {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const offsetHours = pad2(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetRest = pad2(Math.abs(offsetMinutes) % 60);

  return (
    `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}` +
    `T${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}:${pad2(shifted.getUTCSeconds())}` +
    `${sign}${offsetHours}:${offsetRest}`
  );
};

/** Запасной генератор, если `crypto.randomUUID` недоступен (незащищённый контекст). */
const fallbackPacketId = (): string => {
  const chunk = (): string =>
    Math.floor(Math.random() * 0x1_0000)
      .toString(16)
      .padStart(4, "0");

  return `${chunk()}${chunk()}-${chunk()}-4${chunk().slice(1)}-a${chunk().slice(1)}-${chunk()}${chunk()}${chunk()}`;
};

/** `index/id` — строго 36 символов, иначе XSD отклонит пакет. */
const resolvePacketId = (id?: string): string => {
  const candidate = (id ?? "").trim();

  if (candidate.length === 36) {
    return candidate;
  }

  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return fallbackPacketId();
};

const indexDate = (createDateTime?: string): string =>
  createDateTime && createDateTime.trim()
    ? createDateTime.trim()
    : toEisDateTime();

/**
 * Собирает XML пакета: `index` + `data` вокруг готового тела документа.
 *
 * @param descriptor корень, код объекта обмена и namespace документа
 * @param bodyXml тело документа (уже без собственного корня)
 */
export const buildEisPacket = (
  descriptor: EisPacketDescriptor,
  bodyXml: string,
  index: EisPacketIndex = {},
): string => {
  const id = resolvePacketId(index.id);
  const sender = (index.sender ?? "").trim() || EIS_PACKET_DEFAULT_SENDER;
  const receiver = (index.receiver ?? "").trim() || EIS_PACKET_DEFAULT_RECEIVER;
  const mode = index.mode ?? EIS_PACKET_DEFAULT_MODE;
  const objectId = (index.objectId ?? "").trim();

  // Порядок детей index задан последовательностью XSD — переставлять нельзя
  return `<?xml version="1.0" encoding="UTF-8"?>
<p:${descriptor.root} xmlns:p="${EIS_INTEGRATION_NAMESPACE}" xmlns="${descriptor.dataNamespace}">
  <p:index>
    <p:id>${escapeXml(id)}</p:id>
    <p:sender>${escapeXml(sender)}</p:sender>
    <p:receiver>${escapeXml(receiver)}</p:receiver>
    <p:createDateTime>${escapeXml(indexDate(index.createDateTime))}</p:createDateTime>
    <p:objectType>${descriptor.objectType}</p:objectType>
    ${objectId ? `<p:objectId>${escapeXml(objectId.slice(0, 36))}</p:objectId>` : ""}
    ${index.indexNum !== undefined ? `<p:indexNum>${index.indexNum}</p:indexNum>` : ""}
    <p:signature type="${EIS_PACKET_SIGNATURE_TYPE}"></p:signature>
    <p:mode>${mode}</p:mode>
    ${
      mode === "TEST" && index.testCase !== undefined
        ? `<p:testCase>${index.testCase}</p:testCase>`
        : ""
    }
  </p:index>
  <p:data schemeVersion="${EIS_SCHEMA_VERSION}">${bodyXml}</p:data>
</p:${descriptor.root}>`;
};
