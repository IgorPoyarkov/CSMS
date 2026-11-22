/**
 * Единая точка чтения/записи данных ЕИС.
 *
 * PostgreSQL — единственный источник. Файл db.json больше не Required: он
 * используется только если явно передан существующий путь (например, тестовая
 * копия или миграция со старого зеркала). Обычные скрипты читают и пишут PG.
 *
 * Если БД недоступна, работа продолжается с файлом — это аварийный режим для
 * офлайн-импорта, а не основной путь. `PG_SYNC=0` выключает запись в PG.
 */

import fs from "node:fs";
import {
  createPgPool,
  ensureSchema,
  loadDbFromPg,
  seedDocuments,
} from "./pg-store.mjs";

/** Читает db из PostgreSQL; если передан существующий файл — из него. */
export async function readDb(dbPath) {
  if (dbPath && fs.existsSync(dbPath)) {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  }

  const pool = createPgPool();
  const client = await pool.connect();
  try {
    return await loadDbFromPg(client);
  } finally {
    client.release();
    await pool.end();
  }
}

/** Записывает данные в PostgreSQL и, если файл есть, дублирует в него. */
export async function writeDb(dbPath, db, { quiet = false } = {}) {
  // Файл пишется только когда он уже существует: не воскрешаем удалённый
  // db.json как второй источник истины.
  if (dbPath && fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }

  if (process.env.PG_SYNC === "0") {
    if (!quiet) console.log("[pg] запись в PostgreSQL отключена (PG_SYNC=0)");
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
      `[pg] PostgreSQL недоступен, запись не выполнена: ${
        error.message || error.code || String(error)
      }`,
    );
    return null;
  } finally {
    if (client) client.release();
    if (pool) await pool.end().catch(() => {});
  }
}
