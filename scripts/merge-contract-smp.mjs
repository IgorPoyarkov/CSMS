/**
 * Точечное обновление подтаблицы СМП в проекциях карточек ЕИС.
 *
 * Зачем отдельный скрипт: `import-contract-card-projections.mjs` кладёт JSON
 * целиком и перезаписывает документ. Если обновляли только `Smp` (HTML-парсер
 * воркера, режим `--smp-html-only`), в каталоге могут лежать проекции с более
 * старыми `Acts`/`Payments` — полный импорт откатил бы их. Здесь меняется
 * ровно одно поле `Smp`, остальные данные в PostgreSQL остаются как есть.
 *
 * Примеры:
 *   node scripts/merge-contract-smp.mjs --dir .tmpcheck/cards --dry-run
 *   node scripts/merge-contract-smp.mjs --dir .tmpcheck/cards
 */

import fs from "node:fs";
import path from "node:path";
import { createPgPool, PG_SCHEMA } from "./lib/pg-store.mjs";

const COLLECTION = "contractCardProjections";

function parseArgs(argv) {
  const args = { dir: "", numbersFile: "", dryRun: false, limit: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (!flag.startsWith("--")) continue;
    const key = flag.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) continue;
    args[key] = value;
    i += 1;
  }
  args.limit = Number(args.limit) || 0;
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dir) throw new Error("Укажите --dir <каталог с проекциями *.json>");
  if (!fs.existsSync(args.dir))
    throw new Error(`Каталог не найден: ${args.dir}`);

  let files;
  if (args.numbersFile) {
    // Обновляем только перечисленные номера: в каталоге могут лежать
    // проекции, которые в этот прогон не переразбирались.
    if (!fs.existsSync(args.numbersFile)) {
      throw new Error(`Файл номеров не найден: ${args.numbersFile}`);
    }
    files = fs
      .readFileSync(args.numbersFile, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d{19}$/.test(line))
      .map((number) => `${number}.json`)
      .filter((name) => fs.existsSync(path.join(args.dir, name)));
  } else {
    files = fs
      .readdirSync(args.dir)
      .filter((name) => /^\d{19}\.json$/.test(name))
      .sort();
  }
  if (args.limit > 0) files.splice(args.limit);

  const pool = createPgPool();
  const client = await pool.connect();
  const updated = [];
  const missing = [];
  const failed = [];

  try {
    await client.query("BEGIN");

    for (const file of files) {
      const regNumber = path.basename(file, ".json");
      try {
        const projection = JSON.parse(
          fs.readFileSync(path.join(args.dir, file), "utf8"),
        );
        const smp = Array.isArray(projection.Smp) ? projection.Smp : [];

        const result = await client.query(
          `UPDATE ${PG_SCHEMA}.documents
              SET doc = jsonb_set(doc, '{Smp}', $3::jsonb, true),
                  updated_at = now()
            WHERE collection = $1 AND doc_id = $2`,
          [COLLECTION, regNumber, JSON.stringify(smp)],
        );

        if (result.rowCount === 0) {
          missing.push(regNumber);
        } else {
          updated.push(regNumber);
        }
      } catch (error) {
        failed.push(`${regNumber}: ${error.message || error.code || error}`);
      }
    }

    if (args.dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }

  const subcontractors = updated.length;
  console.log(
    JSON.stringify(
      {
        mode: args.dryRun ? "dry-run" : "apply",
        files: files.length,
        updated: updated.length,
        missing: missing.length,
        failed: failed.length,
        subcontractorContracts: subcontractors,
      },
      null,
      2,
    ),
  );
  if (missing.length) {
    console.error(`[smp] нет проекций в PG: ${missing.join(", ")}`);
  }
  for (const failure of failed) {
    console.error(`[smp] ошибка ${failure}`);
  }
}

await main();
