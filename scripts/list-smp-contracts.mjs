/**
 * Список реестровых номеров контрактов с признаками привлечения СМП/СОНО.
 *
 * Нужен как `--numbers-file` для воркера ЕИС: режим `--smp-html-only` обновит
 * подтаблицу СМП из HTML-карточки только по этим номерам.
 *
 * Признак берётся из двух источников:
 * — реестр контрактов: `smpRequiredPercent` > 0 или номер служебки
 *   `subcontractingSmpNoteNumber` (наследуется по цепочке ПГ → СЗ → контракт);
 * — проекция карточки ЕИС: в `Smp` есть требование или субподрядчики.
 *
 * У импортированных из ЕИС контрактов процент в реестре обычно не заполнен —
 * служебной записки в системе не было, поэтому основной источник на практике —
 * проекция карточки. `--all-year` добавляет все номера года: пригодится, когда
 * требование появилось в ЕИС, но карточка ещё не переразобрана.
 *
 * Примеры:
 *   node scripts/list-smp-contracts.mjs --year 2026
 *   node scripts/list-smp-contracts.mjs --year 2026 --out .tmp/smp-2026.txt
 *   node scripts/list-smp-contracts.mjs --year 2026 --all-year
 *
 * Дальше:
 *   dotnet run --project eis-parser/src/Eis44Parser.Worker -- \
 *     --smp-html-only --numbers-file .tmp/smp-2026.txt --out <папка-проекций>
 *   node scripts/import-contract-card-projections.mjs --dir <папка-проекций>
 */

import fs from "node:fs";
import { readDb } from "./lib/db-write.mjs";

function parseArgs(argv) {
  const args = { year: 0, out: "", db: "", allYear: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--all-year") {
      args.allYear = true;
      continue;
    }
    if (!flag.startsWith("--")) continue;
    const key = flag.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) continue;
    args[key] = value;
    i += 1;
  }
  args.year = Number(args.year) || new Date().getFullYear();
  return args;
}

const isRegNumber = (value) => /^\d{19}$/.test(String(value ?? ""));

/**
 * Реестровый номер записи реестра. У импортированных из ЕИС записей
 * `eisRegistryNumber` пуст: номер лежит в `contractNumber` (19 цифр),
 * в `id` вида `eis-<номер>` или в `eisUrl`.
 */
function registryNumber(item) {
  const url = String(item.eisUrl ?? "");
  const fromUrl = url.match(/reestrNumber=(\d{19})/)?.[1];
  if (fromUrl) return fromUrl;

  const fromId = String(item.id ?? "").match(/^eis-(\d{19})$/)?.[1];
  if (fromId) return fromId;

  // Демо-записи ссылаются на несуществующую карточку (reestrNumber=1),
  // и их 19-значный contractNumber — выдумка. Печатная форма по такому
  // номеру отдаёт 404, поэтому в список такие записи не берём.
  if (/reestrNumber=\d+/.test(url)) return "";

  if (isRegNumber(item.eisRegistryNumber))
    return String(item.eisRegistryNumber);
  return isRegNumber(item.contractNumber) ? String(item.contractNumber) : "";
}

/** Год в реестровом номере — символы 12–13 (позиции 11–12 с нуля). */
function yearFromRegNumber(regNumber) {
  return Number(`20${regNumber.slice(11, 13)}`);
}

/** Требование в записи реестра: процент из служебки или её номер. */
function hasRegistryRequirement(contract) {
  const percent = Number.parseFloat(String(contract.smpRequiredPercent ?? ""));
  if (Number.isFinite(percent) && percent > 0) return true;
  return String(contract.subcontractingSmpNoteNumber ?? "").length > 0;
}

/** Требование или субподрядчики в проекции карточки ЕИС. */
function hasProjectionSmp(projection) {
  if (!Array.isArray(projection.Smp)) return false;
  return projection.Smp.some(
    (item) =>
      item?.RequirementPercent != null ||
      item?.RequirementSum != null ||
      (Array.isArray(item?.Subcontractors) && item.Subcontractors.length > 0),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = await readDb(args.db || undefined);
  const contracts = db.contractRegistry ?? [];
  const projections = db.contractCardProjections ?? [];

  const numbers = new Set();
  const fromRegistry = new Set();
  const fromProjection = new Set();
  const allYear = new Set();

  for (const contract of contracts) {
    const regNumber = registryNumber(contract);
    if (!isRegNumber(regNumber)) continue;
    if (yearFromRegNumber(regNumber) !== args.year) continue;
    allYear.add(regNumber);
    if (hasRegistryRequirement(contract)) {
      fromRegistry.add(regNumber);
      numbers.add(regNumber);
    }
  }

  for (const projection of projections) {
    const regNumber = String(
      projection.regNumber ?? projection.RegNumber ?? "",
    );
    if (!isRegNumber(regNumber)) continue;
    if (yearFromRegNumber(regNumber) !== args.year) continue;
    allYear.add(regNumber);
    if (hasProjectionSmp(projection)) {
      fromProjection.add(regNumber);
      numbers.add(regNumber);
    }
  }

  if (args.allYear) {
    for (const regNumber of allYear) numbers.add(regNumber);
  }

  const result = [...numbers].sort();
  if (args.out) {
    fs.writeFileSync(args.out, `${result.join("\n")}\n`, "utf8");
  } else {
    console.log(result.join("\n"));
  }

  console.error(
    `[smp] год ${args.year}: всего номеров ${result.length} ` +
      `(реестр ${fromRegistry.size}, проекции ${fromProjection.size}, ` +
      `всего за год ${allYear.size})`,
  );
  if (args.out) {
    console.error(`[smp] записано в ${args.out}`);
  }
}

await main();
