/**
 * Общее хранилище документов PostgreSQL для адаптера json-server.
 *
 * Документ кладётся в jsonb целиком — структура по-прежнему описана zod-схемами
 * на фронте. В отдельные колонки вынесены только ключи, по которым идут связи
 * ПГ → СЗ → Извещение → Контракт и фильтр по заказчику. Никаких новых схем
 * данных не создаём: таблица — просто контейнер для уже существующих JSON.
 */

import pg from "pg";

/**
 * Все коллекции, включая справочники и пользовательские данные.
 * PostgreSQL — единственный источник: json-server больше не используется.
 */
export const PG_COLLECTIONS = [
  "users",
  "employees",
  "organizations",
  "structuralUnits",
  "contractServices",
  "purchasePlans",
  // Объекты закупки: отдельные документы со своими характеристиками,
  // связями с ООЗ/ПГ/СЗ и родительским объектом (ЕИС 17.0).
  "purchaseObjects",
  "procurements",
  "notices",
  "employeeEducations",
  "tasks",
  "taskEvaluations",
  "leaves",
  "contractProjects",
  "smnpPlans",
  "smnpReports",
  "smnpProcurements",
  "contractRegistry",
  // Полные DTO публичной карточки ЕИС (Acts/Decisions/Payments/...), не entity.
  "contractCardProjections",
  "contractStages",
  "contractPayments",
  "contractPenalties",
  "contractDeliveries",
  "contractFunctions",
  "okpd2Refs",
  "legalActs",
  "purchaseNotes",
  "smpRegistry",
  // Справочник контрагентов: реквизиты поставщиков и субподрядчиков вводятся
  // один раз, а вердикт реестра МСП берётся из smpRegistry по ИНН
  "counterparties",
  "contractSmpRecords",
  "accessRequests",
  "addressRegions",
  "addressMunicipalities",
  "edsCertificates",
  "edsSignatureEvents",
  "objectDescriptions",
  "defectLists",
  // Смета контракта + обоснование НМЦК (отдельный документ сквозного процесса)
  "contractEstimates",
  "bidEvaluations",
  "contractEvents",
  "vacationSchedules",
  "ktruRefs",
  "order158nReports",
  "notificationStates",
  "purchasePlanVersions",
  "koksRefs",
  "smnpReports238",
  "eisTestAccessRequests",
];

/** Один объект верхнего уровня, который не является коллекцией. */
export const PG_META_COLLECTION = "_meta";

export const PG_SCHEMA = "csms";

export const pgConfig = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5433),
  database: process.env.PGDATABASE || "csms_eis",
  user: process.env.PGUSER || "postgres",
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT || 5000),
  ...(process.env.PGPASSWORD ? { password: process.env.PGPASSWORD } : {}),
};

export const createPgPool = () =>
  new pg.Pool({ ...pgConfig, max: Number(process.env.PGPOOL_MAX || 20) });

/** Создаёт схему и таблицу. Идемпотентно — можно звать при каждом старте. */
export async function ensureSchema(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${PG_SCHEMA}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${PG_SCHEMA}.documents (
      seq BIGSERIAL,
      collection TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      organization_id TEXT,
      inn TEXT,
      ikz TEXT,
      position_unique_number TEXT,
      plan_number TEXT,
      contract_number TEXT,
      contract_id TEXT,
      purchase_note_id TEXT,
      procurement_id TEXT,
      doc JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (collection, doc_id)
    )
  `);

  const indexes = [
    "idx_csms_docs_org",
    "idx_csms_docs_ikz",
    "idx_csms_docs_position",
    "idx_csms_docs_plan",
    "idx_csms_docs_contract_number",
    "idx_csms_docs_contract_id",
    "idx_csms_docs_note",
    "idx_csms_docs_procurement",
  ];

  const definitions = [
    `(collection, organization_id)`,
    `(collection, ikz)`,
    `(collection, position_unique_number)`,
    `(collection, plan_number)`,
    `(collection, contract_number)`,
    `(collection, contract_id)`,
    `(collection, purchase_note_id)`,
    `(collection, procurement_id)`,
  ];

  for (let i = 0; i < indexes.length; i += 1) {
    await client.query(
      `CREATE INDEX IF NOT EXISTS ${indexes[i]} ON ${PG_SCHEMA}.documents ${definitions[i]}`,
    );
  }
}

const asText = (value) =>
  value === undefined || value === null ? null : String(value);

/**
 * Контекст для записей, у которых organizationId нет в самом документе.
 * Извещения привязываются через СЗ (purchaseNoteId), процедуры — по номеру
 * извещения или procurementId.
 */
export function buildSeedContext(db) {
  const notesById = new Map(
    (db.purchaseNotes || []).map((note) => [String(note.id), note]),
  );
  const noticesByProcurement = new Map(
    (db.notices || [])
      .filter((notice) => notice.procurementId !== undefined)
      .map((notice) => [String(notice.procurementId), notice]),
  );
  const noticesByNumber = new Map(
    (db.notices || [])
      .filter((notice) => notice.generalInfo?.noticeNumber !== undefined)
      .map((notice) => [String(notice.generalInfo.noticeNumber), notice]),
  );
  const innByOrg = new Map(
    (db.organizations || []).map((org) => [String(org.id), org.inn]),
  );

  const noteOf = (notice) =>
    notice?.purchaseNoteId === undefined
      ? undefined
      : notesById.get(String(notice.purchaseNoteId));

  const organizationOf = (doc) => {
    if (doc.organizationId !== undefined) return asText(doc.organizationId);

    const note =
      doc.purchaseNoteId !== undefined
        ? notesById.get(String(doc.purchaseNoteId))
        : undefined;
    if (note?.organizationId !== undefined) return asText(note.organizationId);

    const notice =
      noticesByProcurement.get(String(doc.id)) ??
      noticesByNumber.get(String(doc["Номер извещения"]));
    return asText(noteOf(notice)?.organizationId);
  };

  return {
    notesById,
    noticesByProcurement,
    noticesByNumber,
    innByOrg,
    organizationOf,
  };
}

/**
 * Достаёт ключи из документа. Для связей используются составной ключ
 * ПГ (planNumber + positionUniqueNumber) и ИКЗ.
 */
export function extractKeys(doc, context = {}) {
  const organizationId = context.organizationOf
    ? context.organizationOf(doc)
    : asText(doc.organizationId);
  const ikz =
    doc.ikz ??
    doc["Идентификационный код закупки"] ??
    doc.generalInfo?.ikz ??
    doc.generalInfo?.ИКЗ;

  return {
    doc_id: asText(doc.id),
    organization_id: organizationId,
    inn: asText(context.innByOrg?.get(organizationId) ?? doc.inn),
    ikz: asText(ikz),
    position_unique_number: asText(
      doc.positionUniqueNumber ?? doc.generalInfo?.positionUniqueNumber,
    ),
    plan_number: asText(
      doc.purchasePlanNumber ??
        doc.planNumber ??
        doc.generalInfo?.plan2020Number,
    ),
    contract_number: asText(doc.contractNumber),
    contract_id: asText(doc.contractId),
    purchase_note_id: asText(doc.purchaseNoteId),
    procurement_id: asText(doc.procurementId),
  };
}

const KEY_COLUMNS = [
  "organization_id",
  "inn",
  "ikz",
  "position_unique_number",
  "plan_number",
  "contract_number",
  "contract_id",
  "purchase_note_id",
  "procurement_id",
];

export async function upsertDocument(client, collection, doc, context = {}) {
  const keys = extractKeys(doc, context);
  const columns = ["collection", "doc_id", ...KEY_COLUMNS, "doc"];
  const values = [
    collection,
    keys.doc_id,
    ...KEY_COLUMNS.map((k) => keys[k]),
    JSON.stringify(doc),
  ];
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const updates = [...KEY_COLUMNS, "doc"]
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(", ");

  await client.query(
    `INSERT INTO ${PG_SCHEMA}.documents (${columns.join(", ")})
     VALUES (${placeholders})
     ON CONFLICT (collection, doc_id) DO UPDATE SET ${updates}, updated_at = now()`,
    values,
  );
}

/**
 * Переносит коллекции в PostgreSQL. Повторный прогон безопасен.
 *
 * Коллекции, которых в источнике нет, не трогаются: частичный дамп не должен
 * очищать уже перенесённые данные. Для коллекций, которые есть, лишние строки
 * удаляются — иначе пересборка СЗ с `--replace` оставляла бы старые записи в PG.
 */
export async function seedDocuments(client, db) {
  const context = buildSeedContext(db);
  const report = {};

  for (const collection of PG_COLLECTIONS) {
    const rows = db[collection];
    if (!Array.isArray(rows)) continue;

    for (const doc of rows) {
      await upsertDocument(client, collection, doc, context);
    }

    const ids = rows.map((doc) => String(doc.id));
    await client.query(
      `DELETE FROM ${PG_SCHEMA}.documents
       WHERE collection = $1 AND doc_id <> ALL($2::text[])`,
      [collection, ids],
    );
    report[collection] = rows.length;
  }

  // Сводка импорта — не коллекция, но скрипты читают её как db.eisImportSummary.
  if (db.eisImportSummary !== undefined) {
    await upsertDocument(client, PG_META_COLLECTION, {
      id: "eisImportSummary",
      value: db.eisImportSummary,
    });
  }

  return report;
}

/** Собирает объект db из PostgreSQL. */
export async function loadDbFromPg(client) {
  const result = await client.query(
    `SELECT collection, doc FROM ${PG_SCHEMA}.documents ORDER BY seq ASC`,
  );

  const db = {};
  for (const row of result.rows) {
    if (row.collection === PG_META_COLLECTION) {
      db[row.doc.doc_id ?? row.doc.id] = row.doc.value;
      continue;
    }
    if (!Array.isArray(db[row.collection])) db[row.collection] = [];
    db[row.collection].push(row.doc);
  }

  for (const collection of PG_COLLECTIONS) {
    if (!Array.isArray(db[collection])) db[collection] = [];
  }
  return db;
}
