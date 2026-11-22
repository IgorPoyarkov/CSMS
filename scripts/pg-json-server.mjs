/**
 * Адаптер PostgreSQL с контрактом json-server — единственный бэкенд данных.
 *
 * Фронт по-прежнему думает, что общается с json-server: те же пути, параметры
 * фильтрации, пагинации и `_expand`, тот же «голый» JSON и X-Total-Count.
 * Все коллекции читаются и пишутся в PG.
 *
 * Запуск: node scripts/pg-json-server.mjs
 */

import express from "express";
import {
  createPgPool,
  ensureSchema,
  PG_COLLECTIONS,
  PG_SCHEMA,
  upsertDocument,
} from "./lib/pg-store.mjs";

const PORT = Number(process.env.PG_ADAPTER_PORT || 3002);

/** Ключи запроса, которые маппятся в вынесенные колонки. */
const FILTER_COLUMNS = {
  id: "doc_id",
  organizationId: "organization_id",
  inn: "inn",
  ikz: "ikz",
  positionUniqueNumber: "position_unique_number",
  planNumber: "plan_number",
  plan2020Number: "plan_number",
  purchasePlanNumber: "plan_number",
  contractNumber: "contract_number",
  contractId: "contract_id",
  purchaseNoteId: "purchase_note_id",
  procurementId: "procurement_id",
};

const pool = createPgPool();
const app = express();

app.use(express.json({ limit: "30mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Total-Count",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Expose-Headers", "X-Total-Count");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/__pg/health", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT collection, count(*)::int AS total
      FROM ${PG_SCHEMA}.documents
      GROUP BY collection ORDER BY collection
    `);
    res.json({
      ok: true,
      collections: Object.fromEntries(
        result.rows.map((row) => [row.collection, row.total]),
      ),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/** Собирает WHERE по параметрам запроса в стиле json-server. */
function buildWhere(collection, query) {
  const params = [];
  let index = 1;
  const add = (value) => {
    params.push(value);
    return `$${index++}`;
  };

  const clauses = [`collection = ${add(collection)}`];

  for (const [rawKey, rawValue] of Object.entries(query)) {
    if (rawKey.startsWith("_")) continue;

    const isLike = rawKey.endsWith("_like");
    const key = isLike ? rawKey.slice(0, -5) : rawKey;
    const column = FILTER_COLUMNS[key];

    if (column) {
      const placeholder = add(String(rawValue));
      clauses.push(
        isLike
          ? `${column} ILIKE '%' || ${placeholder} || '%'`
          : `${column} = ${placeholder}`,
      );
    } else {
      const keyPlaceholder = add(key);
      const valuePlaceholder = add(String(rawValue));
      clauses.push(
        isLike
          ? `doc->>${keyPlaceholder} ILIKE '%' || ${valuePlaceholder} || '%'`
          : `doc->>${keyPlaceholder} = ${valuePlaceholder}`,
      );
    }
  }

  return { where: clauses.join(" AND "), params };
}

function buildPaging(query) {
  const page = Number(query._page);
  const limit = Number(query._limit);
  const start = Number(query._start);
  const end = Number(query._end);

  if (Number.isFinite(limit) && limit > 0) {
    const offset = Number.isFinite(page) && page > 1 ? (page - 1) * limit : 0;
    return `LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`;
  }
  if (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end > start &&
    start >= 0
  ) {
    return `LIMIT ${Math.floor(end - start)} OFFSET ${Math.floor(start)}`;
  }
  return "";
}

/** Имя коллекции для `_expand=structuralUnit` → `structuralUnits`. */
function expandCollection(name) {
  if (PG_COLLECTIONS.includes(name)) return name;
  const plural = name.endsWith("y") ? `${name.slice(0, -1)}ies` : `${name}s`;
  return PG_COLLECTIONS.includes(plural) ? plural : null;
}

/** Реализация json-server `_expand`: подставляет связанный документ по `<name>Id`. */
async function applyExpand(docs, expand) {
  const fields = String(expand)
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  if (fields.length === 0 || docs.length === 0) return docs;

  for (const field of fields) {
    const collection = expandCollection(field);
    if (!collection) continue;

    const ids = docs
      .map((doc) => doc[`${field}Id`])
      .filter((id) => id !== undefined && id !== null)
      .map(String);
    if (ids.length === 0) continue;

    const result = await pool.query(
      `SELECT doc_id, doc FROM ${PG_SCHEMA}.documents
       WHERE collection = $1 AND doc_id = ANY($2::text[])`,
      [collection, ids],
    );
    const byId = new Map(result.rows.map((row) => [row.doc_id, row.doc]));
    for (const doc of docs) {
      const id = doc[`${field}Id`];
      if (id === undefined || id === null) continue;
      doc[field] = byId.get(String(id)) ?? null;
    }
  }

  return docs;
}

async function listDocuments(collection, query) {
  const { where, params } = buildWhere(collection, query);
  const base = `FROM ${PG_SCHEMA}.documents WHERE ${where}`;

  const paging = buildPaging(query);
  // json-server отдаёт X-Total-Count только при пагинации — повторяем это,
  // чтобы ответы совпадали байт в байт и не делать лишний COUNT без нужды.
  const total = paging
    ? (await pool.query(`SELECT count(*)::int AS total ${base}`, params))
        .rows[0].total
    : null;
  const rows = await pool.query(
    `SELECT doc ${base} ORDER BY seq ASC ${paging}`,
    params,
  );
  const docs = await applyExpand(
    rows.rows.map((row) => row.doc),
    query._expand,
  );

  return { docs, total };
}

async function getDocument(collection, id, query) {
  const result = await pool.query(
    `SELECT doc FROM ${PG_SCHEMA}.documents WHERE collection = $1 AND doc_id = $2`,
    [collection, String(id)],
  );
  if (!result.rows[0]) return null;
  const [doc] = await applyExpand([result.rows[0].doc], query._expand);
  return doc;
}

async function nextId(collection) {
  const result = await pool.query(
    `SELECT coalesce(max(doc_id::bigint), 0) + 1 AS next
     FROM ${PG_SCHEMA}.documents
     WHERE collection = $1 AND doc_id ~ '^[0-9]+$'`,
    [collection],
  );
  return Number(result.rows[0].next);
}

// Express 5 не поддерживает `app.all("*")` — используем middleware без пути.
app.use(async (req, res) => {
  // Vite может проксировать под префиксом /pg-api; адаптер принимает оба вида.
  const pathname = req.path.replace(/^\/pg-api/, "") || "/";
  const segments = pathname.split("/").filter(Boolean);
  const collection = segments[0];
  const id = segments[1];

  if (!collection || !PG_COLLECTIONS.includes(collection)) {
    res.status(404).json({});
    return;
  }

  try {
    if (req.method === "GET" && id === undefined) {
      const { docs, total } = await listDocuments(collection, req.query);
      if (total !== null) res.setHeader("X-Total-Count", String(total));
      res.json(docs);
      return;
    }

    if (req.method === "GET") {
      const doc = await getDocument(collection, id, req.query);
      if (!doc) {
        res.status(404).json({});
        return;
      }
      res.json(doc);
      return;
    }

    if (req.method === "POST") {
      const doc = { ...(req.body ?? {}) };
      if (doc.id === undefined) doc.id = await nextId(collection);
      await upsertDocument(pool, collection, doc);
      res.status(201).json(doc);
      return;
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const stored = await getDocument(collection, id, {});
      if (!stored) {
        res.status(404).json({});
        return;
      }
      const doc =
        req.method === "PUT"
          ? { ...(req.body ?? {}), id: stored.id }
          : { ...stored, ...(req.body ?? {}), id: stored.id };
      await upsertDocument(pool, collection, doc);
      res.json(doc);
      return;
    }

    if (req.method === "DELETE") {
      if (id === undefined) {
        await pool.query(
          `DELETE FROM ${PG_SCHEMA}.documents WHERE collection = $1`,
          [collection],
        );
      } else {
        await pool.query(
          `DELETE FROM ${PG_SCHEMA}.documents WHERE collection = $1 AND doc_id = $2`,
          [collection, String(id)],
        );
      }
      res.json({});
      return;
    }

    res.status(405).json({ error: "Метод не поддерживается" });
  } catch (error) {
    console.error(`[pg] ${req.method} ${req.originalUrl}:`, error);
    res.status(500).json({ error: error.message });
  }
});

await ensureSchema(pool);

app.listen(PORT, () => {
  console.log(`PostgreSQL-адаптер json-server: http://localhost:${PORT}`);
  console.log(`Все коллекции в PostgreSQL: ${PG_COLLECTIONS.length}`);
});
