/**
 * Сверка ответов PostgreSQL-адаптера с документами из PostgreSQL.
 *
 * Раньше скрипт сравнивал json-server (:3001) и адаптер (:3002). Теперь
 * json-server удалён вместе с db.json, поэтому эталон берётся из самой БД.
 *
 * Запуск при поднятом :3002:
 *   node scripts/verify-pg-sync.mjs
 */

import { createPgPool, loadDbFromPg } from "./lib/pg-store.mjs";

const ADAPTER_URL = process.env.PG_ADAPTER_URL || "http://localhost:3002";

const contains = (value, needle) =>
  String(value ?? "")
    .toLowerCase()
    .includes(String(needle).toLowerCase());

const requests = [
  {
    path: "/purchasePlans?organizationId=6",
    expected: (db) =>
      db.purchasePlans.filter((d) => String(d.organizationId) === "6"),
  },
  {
    path: "/purchaseNotes?organizationId=6",
    expected: (db) =>
      db.purchaseNotes.filter((d) => String(d.organizationId) === "6"),
  },
  {
    path: "/contractRegistry?organizationId=6",
    expected: (db) =>
      db.contractRegistry.filter((d) => String(d.organizationId) === "6"),
  },
  {
    path: "/contractRegistry?contractNumber_like=0144",
    expected: (db) =>
      db.contractRegistry.filter((d) => contains(d.contractNumber, "0144")),
  },
  {
    path: "/contractRegistry?organizationId=6&_page=1&_limit=10",
    expected: (db) =>
      db.contractRegistry.filter((d) => String(d.organizationId) === "6"),
    limit: 10,
  },
  { path: "/notices", expected: (db) => db.notices },
  {
    path: "/notices/eisn-0144200001826000201",
    expected: (db) =>
      db.notices.filter((d) => d.id === "eisn-0144200001826000201"),
    single: true,
  },
  { path: "/procurements", expected: (db) => db.procurements },
  { path: "/organizations", expected: (db) => db.organizations },
  { path: "/users", expected: (db) => db.users },
  {
    path: "/employees?_expand=structuralUnit",
    expected: (db) =>
      db.employees.map((employee) => ({
        ...employee,
        structuralUnit:
          db.structuralUnits.find(
            (unit) => String(unit.id) === String(employee.structuralUnitId),
          ) ?? null,
      })),
  },
];

const normalize = (value) => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return value;
};

const pool = createPgPool();
const client = await pool.connect();
const db = await loadDbFromPg(client);
client.release();
await pool.end();

let failed = 0;

for (const check of requests) {
  try {
    const response = await fetch(`${ADAPTER_URL}${check.path}`);
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    const all = check.expected(db);
    const expected = check.single
      ? all[0]
      : check.limit
        ? all.slice(0, check.limit)
        : all;
    const sameBody =
      JSON.stringify(normalize(body)) === JSON.stringify(normalize(expected));
    const expectedTotal = check.limit ? String(all.length) : null;
    const actualTotal = response.headers.get("x-total-count");
    const sameHeader = expectedTotal === null || expectedTotal === actualTotal;
    const ok = response.status === 200 && sameBody && sameHeader;
    if (!ok) failed += 1;

    console.log(
      `${ok ? "OK  " : "FAIL"} ${check.path} — адаптер ${response.status}/${
        Array.isArray(body) ? body.length : 1
      }, PG ${Array.isArray(expected) ? expected.length : 1}` +
        (check.limit ? `, X-Total-Count ${actualTotal}/${expectedTotal}` : ""),
    );

    if (!ok && !sameBody) {
      const a = JSON.stringify(normalize(body));
      const b = JSON.stringify(normalize(expected));
      const at = a.findIndex((char, i) => char !== b[i]);
      console.log("  первое расхождение:", {
        adapter: a.slice(Math.max(0, at - 60), at + 100),
        postgres: b.slice(Math.max(0, at - 60), at + 100),
      });
    }
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${check.path} — ${error.message}`);
  }
}

console.log(
  failed === 0
    ? "Все ответы адаптера совпадают с PostgreSQL"
    : `Расхождений: ${failed}`,
);
process.exitCode = failed === 0 ? 0 : 1;
