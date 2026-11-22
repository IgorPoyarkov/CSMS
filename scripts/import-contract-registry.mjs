/**
 * Инкрементальный импорт списка реестра контрактов из открытого поиска ЕИС.
 *
 * Большой проход делается один раз. Дальше хранится последний новый реестровый
 * номер; раз в день перечисляем поиск по ИНН и парсим только записи старше
 * курсора. Явный --reestr-number обрабатывается независимо от курсора —
 * пользователь может запросить контракт, который уже зарегистрирован в ЕИС.
 *
 * Внимание: `--db` задаёт только файл-дубль, запись в PostgreSQL при этом
 * сохраняется. Для локальной проверки используйте `--dry-run` или `PG_SYNC=0`.
 *
 * Примеры:
 *   node scripts/import-contract-registry.mjs --inn 4629040439 --year 2026
 *   node scripts/import-contract-registry.mjs --inn 4629040439 --incremental
 *   node scripts/import-contract-registry.mjs --reestr-number 2462904043926000006 --year 2026
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import {
  buildContractSearchUrl,
  parseContractSearchHtml,
} from "./lib/contract-registry-search.mjs";
import { readDb, writeDb } from "./lib/db-write.mjs";
import {
  datasetCursor,
  lastEisNumber,
  loadImportState,
  markChecked,
  newSinceCursor,
  saveImportState,
} from "./lib/import-state.mjs";

const CURL = process.platform === "win32" ? "curl.exe" : "curl";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function parseArgs(argv) {
  const args = {
    db: "",
    inn: "",
    year: new Date().getFullYear(),
    reestrNumber: "",
    incremental: false,
    state: "",
    limit: 500,
    pages: 20,
    // Офлайн-снимок выдачи: парсится без сети, удобно для проверки разметки.
    htmlFile: "",
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--incremental") {
      args.incremental = true;
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
    i++;
  }
  args.year = Number(args.year) || 0;
  args.limit = Number(args.limit) || 500;
  args.pages = Number(args.pages) || 20;
  return args;
}

function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const result = execFileSync(
        CURL,
        [
          "-sS",
          "-m",
          "60",
          "-A",
          USER_AGENT,
          "-H",
          "Accept-Language: ru-RU,ru;q=0.9",
          "-w",
          "\nHTTP_CODE:%{http_code}",
          url,
        ],
        { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
      );
      const buffer = Buffer.isBuffer(result) ? result : Buffer.from(result);
      const marker = Buffer.from("\nHTTP_CODE:");
      const cut = buffer.lastIndexOf(marker);
      const status = Number(
        buffer.subarray(cut + marker.length).toString("utf8").trim() || 0,
      );
      if (status === 200) return buffer.subarray(0, cut).toString("utf8");
      lastError = new Error(`ЕИС вернул HTTP ${status}`);
      sleep(status === 429 || status === 403 ? attempt * 5000 : attempt * 1200);
    } catch (error) {
      lastError = error;
      sleep(attempt * 1200);
    }
  }
  throw new Error(`${lastError?.message ?? "Ошибка запроса ЕИС"}: ${url}`);
}

/** Все страницы публичного поиска: реестровые номера и реквизиты карточки. */
async function enumerateContracts(args) {
  const found = new Map();
  if (args.htmlFile) {
    const rows = parseContractSearchHtml(fs.readFileSync(args.htmlFile, "utf8"));
    for (const row of rows) found.set(row.eisRegistryNumber, row);
    return [...found.values()].slice(0, args.limit);
  }
  for (let page = 1; page <= args.pages; page++) {
    const url = buildContractSearchUrl({
      inn: args.inn,
      regNumber: args.reestrNumber,
      page,
    });
    const rows = parseContractSearchHtml(fetchText(url));
    for (const row of rows) found.set(row.eisRegistryNumber, row);
    if (args.reestrNumber || rows.length === 0) break;
    if (found.size >= args.limit) break;
    sleep(1200);
  }
  return [...found.values()].slice(0, args.limit);
}

function toRegistryItem(row, org, id) {
  return {
    id,
    organizationId: org.id,
    ikz: "",
    eisRegistryNumber: row.eisRegistryNumber,
    contractNumber: row.contractNumber || row.eisRegistryNumber,
    contractDate: row.contractDate,
    contractName: row.contractName || `Контракт ${row.eisRegistryNumber}`,
    customerName: row.customerName,
    supplierName: "",
    supplierInn: "",
    supplierKpp: "",
    contractPrice: row.contractPrice || "0",
    executionForm: "full",
    eisUrl: `https://zakupki.gov.ru/epz/contract/contractCard/common-info.html?reestrNumber=${row.eisRegistryNumber}`,
    eisPublishDate: row.eisPublishDate,
    status: row.status,
    executionEndDate: row.executionEndDate,
    updatedAt: row.updatedAt,
  };
}

/** Старые записи часто несут номер только в eisUrl — достаём его оттуда. */
export function registryKey(item) {
  const fromUrl = String(item.eisUrl ?? "").match(/reestrNumber=(\d{19})/)?.[1];
  return String(item.eisRegistryNumber || fromUrl || item.id);
}

/** Новые записи перекрывают старые по реестровому номеру, остальные остаются. */
export function mergeUnique(existing, incoming) {
  const result = new Map(
    (existing ?? []).map((item) => [registryKey(item), item]),
  );
  for (const item of incoming) {
    result.set(registryKey(item), item);
  }
  return [...result.values()];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = await readDb(args.db);
  const org = db.organizations.find((item) => item.inn === args.inn)
    ?? db.organizations.find((item) => item.id === 6);
  if (!org) throw new Error(`В данных нет организации с ИНН ${args.inn}`);

  const state = loadImportState(args.state || undefined);
  const manual = Boolean(args.reestrNumber);
  const rows = await enumerateContracts(args);
  const forYear = args.year
    ? rows.filter((row) => !row.year || row.year === args.year)
    : rows;
  const newRows = args.incremental && !manual
    ? newSinceCursor(
        forYear.map((row) => row.eisRegistryNumber),
        datasetCursor(state, "contractRegistry"),
      ).map((number) => forYear.find((row) => row.eisRegistryNumber === number))
    : forYear;

  if (!newRows.length) {
    if (args.incremental) {
      markChecked(state, "contractRegistry", {});
      saveImportState(state, args.state || undefined);
    }
    console.log(JSON.stringify({
      mode: manual ? "manual" : args.incremental ? "incremental" : "full",
      found: rows.length,
      imported: 0,
      cursor: datasetCursor(state, "contractRegistry"),
    }, null, 2));
    return;
  }

  let id = Math.max(0, ...(db.contractRegistry ?? []).map((item) => Number(item.id) || 0)) + 1;
  const incoming = newRows.map((row) => toRegistryItem(row, org, id++));
  const finalRegistry = mergeUnique(db.contractRegistry ?? [], incoming);
  const report = {
    mode: manual ? "manual" : args.incremental ? "incremental" : "full",
    inn: args.inn,
    year: args.year,
    found: rows.length,
    imported: incoming.length,
    registryNumbers: incoming.map((item) => item.eisRegistryNumber),
    totalInBase: finalRegistry.length,
  };

  if (!args.dryRun) {
    db.contractRegistry = finalRegistry;
    if (args.incremental && !manual) {
      markChecked(state, "contractRegistry", {
        imported: incoming.length,
        cursor: lastEisNumber(incoming.map((item) => item.eisRegistryNumber)),
      });
      saveImportState(state, args.state || undefined);
    }
    await writeDb(args.db, db);
  }
  console.log(JSON.stringify({
    ...report,
    cursor: datasetCursor(state, "contractRegistry"),
  }, null, 2));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(`Ошибка импорта реестра контрактов: ${error.message}`);
    if (process.env.EIS_IMPORT_DEBUG) console.error(error.stack);
    process.exitCode = 1;
  });
}
