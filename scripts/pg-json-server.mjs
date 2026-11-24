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
import {
  docToAnswer,
  isLookupFresh,
  lookupInn,
  unavailableAnswer,
} from "./lib/smp-lookup.mjs";

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

/** SQL-выражение поля: вынесенная колонка либо ключ jsonb. */
const fieldExpr = (key) => FILTER_COLUMNS[key] ?? null;

/**
 * Счётчики по значению поля — для чипов-фильтров реестра.
 *
 * Раньше счётчики считались на клиенте по всей выгруженной коллекции: чтобы
 * показать «Размещено: 183», фронт скачивал все 183 записи. Здесь — один
 * `GROUP BY`, документы на сет не уходят.
 *
 * Фильтры принимаются те же, что у списка (`<поле>=`, `_ne`, `_like`,
 * `_search`), поэтому счётчики могут соответствовать активной выборке.
 * Ответ: `{ "<значение поля>": <число> }`, отсутствующее поле — в ключе "".
 */
app.get("/__pg/facets/:collection", async (req, res) => {
  const collection = req.params.collection;
  const field = String(req.query.field ?? "").trim();

  if (!PG_COLLECTIONS.includes(collection) || !field) {
    res.status(400).json({ error: "Нужны коллекция и параметр field" });
    return;
  }

  // Параметр field задаёт поле группировки, а не условие фильтрации
  const { field: _facetField, ...filters } = req.query;
  const { where, params } = buildWhere(collection, filters);

  // Вынесенная колонка либо ключ jsonb: во втором случае имя поля — параметр
  const column = fieldExpr(field);
  const target = column ?? `doc->>$${params.length + 1}`;
  const values = column ? params : [...params, field];

  try {
    const result = await pool.query(
      `SELECT coalesce(${target}, '') AS value, count(*)::int AS total
       FROM ${PG_SCHEMA}.documents
       WHERE ${where}
       GROUP BY 1
       ORDER BY 2 DESC`,
      values,
    );
    res.json(
      Object.fromEntries(result.rows.map((row) => [row.value, row.total])),
    );
  } catch (error) {
    console.error(`[pg] facets ${req.originalUrl}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Собирает WHERE по параметрам запроса в стиле json-server.
 *
 * Поддержаны операторы, которые используют реестры фронта:
 *  - `<поле>=` — точное совпадение (значение всегда строка, как в json-server);
 *  - `<поле>_like` — подстрока без учёта регистра;
 *  - `<поле>_ne` — «не равно». Отсутствующее поле считается не равным
 *    (`IS DISTINCT FROM`): в json-server сравнение `undefined !== value` тоже
 *    истинно, и запись без поля проходит фильтр.
 * Плюс расширение для поиска по реестрам: `_search=<подстрока>` по перечню
 * полей `_searchFields=a,b` — условие OR между полями (json-server умеет
 * только AND, а поиск «по названию или номеру» требует OR).
 */
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
    const isNe = !isLike && rawKey.endsWith("_ne");
    const key = isLike
      ? rawKey.slice(0, -5)
      : isNe
        ? rawKey.slice(0, -3)
        : rawKey;
    const target = fieldExpr(key);

    if (target) {
      const placeholder = add(String(rawValue));
      if (isNe) clauses.push(`${target} IS DISTINCT FROM ${placeholder}`);
      else if (isLike)
        clauses.push(`${target} ILIKE '%' || ${placeholder} || '%'`);
      else clauses.push(`${target} = ${placeholder}`);
    } else {
      const keyPlaceholder = add(key);
      const valuePlaceholder = add(String(rawValue));
      if (isNe)
        clauses.push(
          `doc->>${keyPlaceholder} IS DISTINCT FROM ${valuePlaceholder}`,
        );
      else if (isLike)
        clauses.push(
          `doc->>${keyPlaceholder} ILIKE '%' || ${valuePlaceholder} || '%'`,
        );
      else clauses.push(`doc->>${keyPlaceholder} = ${valuePlaceholder}`);
    }
  }

  clauses.push(buildSearchClause(query, add, fieldExpr));

  return { where: clauses.filter(Boolean).join(" AND "), params };
}

/**
 * Условие `_search` по перечню `_searchFields` (через запятую).
 *
 * Спецсимволы ILIKE (`%`, `_`) и обратный слэш экранируются: поиск по строке
 * «50%» не должен превращаться в «что угодно после 50».
 */
function buildSearchClause(query, add, fieldExpr) {
  const needle = String(query._search ?? "").trim();
  if (!needle) return "";

  const fields = String(query._searchFields ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  if (fields.length === 0) return "";

  const pattern = `%${needle.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  const patternPlaceholder = add(pattern);

  const conditions = fields.map((field) => {
    const target = fieldExpr(field) ?? `doc->>${add(field)}`;
    return `${target} ILIKE ${patternPlaceholder}`;
  });

  return `(${conditions.join(" OR ")})`;
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

// ─── Реестр МСП: точечная сверка ИНН ───────────────────────────────────────

/**
 * Сверка ИНН с реестром МСП по запросу: полный перечень справочника не нужен.
 *
 * Заказчик и подрядчик проверяют конкретных поставщиков — при вводе
 * субподрядчика и при сверке коммерческих предложений. Ответ сервиса ФНС
 * складывается в `smpRegistry` как результат сверки с датой: «в реестре
 * (категория, дата включения)», «не в реестре», «исключён». Свежий ответ
 * (TTL `SMP_REGISTRY_TTL_DAYS`, по умолчанию 30 дней) отдаётся из базы, чтобы
 * не дёргать ФНС на каждое открытие формы. Если сервис недоступен, статус —
 * `unavailable`: вердикт не выдумывается.
 */
const SMP_CHECK_PATHS = ["/__smp/check", "/pg-api/__smp/check"];

/** Ответ ФНС по ИНН, уже сохранённый в справочнике. */
const findLookupDoc = async (inn) => {
  const result = await pool.query(
    `SELECT doc FROM ${PG_SCHEMA}.documents
     WHERE collection = 'smpRegistry' AND inn = $1
     ORDER BY seq ASC LIMIT 1`,
    [inn],
  );
  return result.rows[0]?.doc ?? null;
};

const checkInn = async (rawInn, { refresh = false } = {}) => {
  const inn = String(rawInn ?? "").replace(/\D/g, "");
  if (!inn) {
    return {
      inn,
      found: false,
      status: "invalid",
      cached: false,
      error: "ИНН не указан",
    };
  }

  const cached = await findLookupDoc(inn);
  if (cached && !refresh && isLookupFresh(cached)) {
    return docToAnswer(cached, true);
  }

  try {
    const answer = await lookupInn(inn);
    // Невалидный ИНН в справочник не пишем: это опечатка, а не сверка
    if (answer.status === "invalid") return answer;

    const { status: _status, cached: _cached, ...doc } = answer;
    const saved = { ...doc, id: cached?.id ?? inn };
    await upsertDocument(pool, "smpRegistry", saved);
    // Ответ отдаём нормированным: кэш и свежий запрос выглядят одинаково
    return docToAnswer(saved, false);
  } catch (error) {
    console.error(`[pg] сверка ИНН ${inn}:`, error.message);
    return unavailableAnswer(inn, error);
  }
};

app.get(SMP_CHECK_PATHS, async (req, res) => {
  try {
    const answer = await checkInn(req.query.inn, {
      refresh: req.query.refresh === "1" || req.query.refresh === "true",
    });
    res.json(answer);
  } catch (error) {
    console.error(`[pg] GET ${req.originalUrl}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Пакетная сверка: заказчик проверяет все ИНН из коммерческих предложений
 * одной кнопкой. ИНН идут последовательно — ФНС не любит параллельные запросы
 * с одного адреса, а их обычно не больше пяти.
 */
app.post(SMP_CHECK_PATHS, async (req, res) => {
  const inns = Array.isArray(req.body?.inns) ? req.body.inns : [];
  const unique = [...new Set(inns.map((inn) => String(inn ?? "").trim()))]
    .filter(Boolean)
    .slice(0, 50);

  try {
    const results = [];
    for (const inn of unique) {
      results.push(
        await checkInn(inn, { refresh: req.body?.refresh === true }),
      );
    }
    res.json({ results });
  } catch (error) {
    console.error(`[pg] POST ${req.originalUrl}:`, error);
    res.status(500).json({ error: error.message });
  }
});

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
