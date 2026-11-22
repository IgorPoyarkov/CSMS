/**
 * Импорт готовых проекций публичных карточек контрактов в PostgreSQL.
 *
 * Проекция eis-parser — это ContractCardViewDto со всеми полями (Acts, Decisions,
 * Payments, Messages, Executions, SkippedFiles). Она не является сущностью БД,
 * поэтому кладётся в отдельную jsonb-коллекцию `contractCardProjections` целиком:
 * фронт получает все поля без потери и без новых кириллических колонок.
 *
 * Важно: поиск ЕИС по ИНН не фильтрует выдачу, поэтому по умолчанию импортируются
 * только проекции, которые удалось связать с уже известным контрактом из
 * `contractRegistry` (по реестровому или номеру контракта). Чужие карточки
 * пропускаются; `--allow-unmatched` включает их явным решением пользователя.
 *
 * Запись точечная (upsert по реестровому номеру): существующие коллекции не
 * очищаются. `--db` здесь не нужен — источник списка контрактов всегда PG.
 *
 * Примеры:
 *   node scripts/import-contract-card-projections.mjs --dir <каталог-проекций> --dry-run
 *   node scripts/import-contract-card-projections.mjs --dir <каталог-проекций>
 *   node scripts/import-contract-card-projections.mjs --dir <каталог-проекций> --allow-unmatched
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readDb } from "./lib/db-write.mjs";
import {
  createPgPool,
  ensureSchema,
  upsertDocument,
} from "./lib/pg-store.mjs";

const COLLECTION = "contractCardProjections";

function parseArgs(argv) {
  const args = {
    dir: "",
    limit: 0,
    allowUnmatched: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--allow-unmatched") {
      args.allowUnmatched = true;
      continue;
    }
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

/** Номер из eisUrl старых записей, у которых нет eisRegistryNumber. */
function registryNumber(item) {
  const fromUrl = String(item.eisUrl ?? "").match(/reestrNumber=(\d{19})/)?.[1];
  return String(item.eisRegistryNumber || fromUrl || "");
}

/** Номер контракта из проекции — им тоже можно привязать карточку к своей записи. */
function contractNumbers(projection) {
  const numbers = new Set();
  for (const act of projection.Acts ?? []) {
    if (act?.Contract?.Number) numbers.add(String(act.Contract.Number));
  }
  for (const payment of projection.Payments ?? []) {
    if (payment?.ContractNumber) numbers.add(String(payment.ContractNumber));
  }
  return [...numbers];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dir) throw new Error("Укажите --dir <каталог с проекциями *.json>");
  if (!fs.existsSync(args.dir)) throw new Error(`Каталог не найден: ${args.dir}`);

  const files = fs
    .readdirSync(args.dir)
    .filter((name) => /^\d{19}\.json$/.test(name))
    .sort();
  if (args.limit > 0) files.splice(args.limit);

  const db = await readDb();
  const byRegNumber = new Map();
  const byContractNumber = new Map();
  for (const contract of db.contractRegistry ?? []) {
    const reg = registryNumber(contract);
    if (reg) byRegNumber.set(reg, contract);
    if (contract.contractNumber) {
      byContractNumber.set(String(contract.contractNumber), contract);
    }
  }

  const docs = [];
  const skipped = [];
  for (const file of files) {
    const regNumber = path.basename(file, ".json");
    const projection = JSON.parse(fs.readFileSync(path.join(args.dir, file), "utf8"));
    const contract =
      byRegNumber.get(regNumber) ??
      contractNumbers(projection).map((n) => byContractNumber.get(n)).find(Boolean);

    if (!contract && !args.allowUnmatched) {
      skipped.push(regNumber);
      continue;
    }

    // Все поля проекции остаются на верхнем уровне: фронт читает Acts/Payments
    // как есть, а служебные ключи добавляют связь со своим реестром контрактов.
    docs.push({
      ...projection,
      id: regNumber,
      regNumber,
      contractId: contract?.id ?? null,
      organizationId: contract?.organizationId ?? null,
      contractNumber: contract?.contractNumber ?? null,
      eisUrl: `https://zakupki.gov.ru/epz/contract/contractCard/common-info.html?reestrNumber=${regNumber}`,
      source: "eis-public-card",
      importedAt: new Date().toISOString(),
    });
  }

  if (!args.dryRun && docs.length && process.env.PG_SYNC !== "0") {
    const pool = createPgPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureSchema(client);
      // Только upsert: никаких DELETE, остальные коллекции не трогаются.
      for (const doc of docs) await upsertDocument(client, COLLECTION, doc);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: args.dryRun ? "dry-run" : "import",
        files: files.length,
        imported: docs.length,
        skippedUnmatched: skipped.length,
        skippedSample: skipped.slice(0, 5),
        collection: COLLECTION,
        pgSync: process.env.PG_SYNC !== "0",
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Ошибка импорта проекций карточек: ${error.message}`);
    process.exitCode = 1;
  });
}
