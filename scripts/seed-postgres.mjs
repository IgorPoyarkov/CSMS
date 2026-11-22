/**
 * Однократный перенос выбранных коллекций из db.json в PostgreSQL.
 *
 * db.json не удаляется и не меняется — он остаётся зеркалом и путём отката.
 * Повторный запуск просто обновляет записи по (collection, id).
 */

import fs from "node:fs";
import path from "node:path";
import {
  createPgPool,
  ensureSchema,
  seedDocuments,
} from "./lib/pg-store.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

const dbPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, "db.json");

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const pool = createPgPool();
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await ensureSchema(client);
  const report = await seedDocuments(client, db);
  await client.query("COMMIT");

  const total = Object.values(report).reduce((sum, count) => sum + count, 0);
  console.log(`Перенесено ${total} записей из ${path.basename(dbPath)}:`);
  for (const [collection, count] of Object.entries(report)) {
    console.log(`  ${collection}: ${count}`);
  }
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Ошибка переноса:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
