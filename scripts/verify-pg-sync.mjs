/**
 * Сверка ответов PostgreSQL-адаптера и json-server на одних и тех же запросах.
 *
 * Запуск при поднятых :3001 и :3002:
 *   node scripts/verify-pg-sync.mjs
 */

const JSON_URL = process.env.JSON_SERVER_URL || "http://localhost:3001";
const PG_URL = process.env.PG_ADAPTER_URL || "http://localhost:3002";

const requests = [
  "/purchasePlans?organizationId=6",
  "/purchaseNotes?organizationId=6",
  "/contractRegistry?organizationId=6",
  "/contractRegistry?contractNumber_like=0144",
  "/contractRegistry?organizationId=6&_page=1&_limit=10",
  "/notices",
  "/notices/eisn-0144200001826000201",
  "/procurements",
  "/organizations",
  "/users",
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

const fetchJson = async (base, path) => {
  const response = await fetch(`${base}${path}`);
  const text = await response.text();
  return {
    status: response.status,
    totalCount: response.headers.get("x-total-count"),
    body: text ? JSON.parse(text) : null,
  };
};

let failed = 0;

for (const path of requests) {
  try {
    const [json, pg] = await Promise.all([
      fetchJson(JSON_URL, path),
      fetchJson(PG_URL, path),
    ]);
    const sameBody =
      JSON.stringify(normalize(json.body)) ===
      JSON.stringify(normalize(pg.body));
    const sameHeader = json.totalCount === pg.totalCount;
    const ok = json.status === pg.status && sameBody && sameHeader;
    if (!ok) failed += 1;

    console.log(
      `${ok ? "OK  " : "FAIL"} ${path} — json ${json.status}/${Array.isArray(json.body) ? json.body.length : 1}` +
        `, pg ${pg.status}/${Array.isArray(pg.body) ? pg.body.length : 1}` +
        `, X-Total-Count ${json.totalCount}/${pg.totalCount}`,
    );

    if (!ok && !sameBody) {
      const a = JSON.stringify(normalize(json.body));
      const b = JSON.stringify(normalize(pg.body));
      const at = a.findIndex((char, i) => char !== b[i]);
      console.log("  первое расхождение:", {
        json: a.slice(Math.max(0, at - 60), at + 100),
        pg: b.slice(Math.max(0, at - 60), at + 100),
      });
    }
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${path} — ${error.message}`);
  }
}

console.log(failed === 0 ? "Все ответы совпадают" : `Расхождений: ${failed}`);
process.exitCode = failed === 0 ? 0 : 1;
