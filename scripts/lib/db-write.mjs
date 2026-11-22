/**
 * Единая точка записи db.json для скриптов импорта ЕИС.
 *
 * json-server остаётся зеркалом, поэтому файл пишется как раньше. Сразу после
 * этого те же 10 коллекций дублируются в PostgreSQL — адаптер на :3002 читает
 * уже актуальные данные без ручного `npm run pg:seed`.
 *
 * PostgreSQL — не обязателен для самого импорта: если БД недоступна, ошибка
 * только предупреждает в консоли, а db.json остаётся рабочим зеркалом и путём
 * отката. Принудительно выключить синхронизацию можно через `PG_SYNC=0`.
 */

import fs from "node:fs";
import { createPgPool, ensureSchema, seedDocuments } from "./pg-store.mjs";

/** Синхронизирует уже прочитанный db.json с PostgreSQL. */
export async function syncPostgres(db, { quiet = false } = {}) {
  if (process.env.PG_SYNC === "0") {
    if (!quiet) console.log("[pg] синхронизация отключена (PG_SYNC=0)");
    return null;
  }

  let pool;
  let client;
  try {
    pool = createPgPool();
    client = await pool.connect();
    await client.query("BEGIN");
    await ensureSchema(client);
    const counts = await seedDocuments(client, db);
    await client.query("COMMIT");

    if (!quiet) {
      const total = Object.values(counts).reduce(
        (sum, count) => sum + count,
        0,
      );
      console.log(`[pg] синхронизировано ${total} записей`);
    }
    return counts;
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.warn(
      `[pg] PostgreSQL недоступен, продолжаем с db.json как зеркалом: ${
        error.message || error.code || String(error)
      }`,
    );
    return null;
  } finally {
    if (client) client.release();
    if (pool) await pool.end().catch(() => {});
  }
}

/** Пишет db.json и дублирует PG-коллекции в PostgreSQL. */
export async function writeDb(dbPath, db, options = {}) {
  fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  return syncPostgres(db, options);
}
