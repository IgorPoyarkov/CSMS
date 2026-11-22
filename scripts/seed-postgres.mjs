/**
 * Перенос коллекций из файла в PostgreSQL.
 *
 * Сейчас данные уже живут в PG: без аргумента скрипт просто сообщает об этом.
 * Явно указанный путь к бэкапу позволяет восстановить БД.
 * Повторный запуск обновляет записи по (collection, id).
 */

import fs from "node:fs";
import path from "node:path";
import { createPgPool, ensureSchema, seedDocuments } from "./lib/pg-store.mjs";

const arg = process.argv[2];
const dbPath = arg ? path.resolve(arg) : "";

if (!fs.existsSync(dbPath)) {
  if (arg) {
    console.error(`Файл не найден: ${dbPath}`);
    process.exit(1);
  }
  console.log(
    "Данные уже в PostgreSQL. Для переноса из файла: npm run pg:seed -- <путь>",
  );
  process.exit(0);
}

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
