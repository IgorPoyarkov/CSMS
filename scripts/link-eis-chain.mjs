/**
 * Связывание импортированных извещений ЕИС с контрактами реестра.
 *
 * Точное совпадение ИКЗ из извещения и из реестра контрактов встречается редко:
 * в ИКЗ зашит номер позиции плана-графика (разряды 20–26), и у извещения он
 * свой, а у контракта — свой. Поэтому связь ищется по «идентичности» ИКЗ
 * (год + ИНН + КПП + код позиции) и подтверждается точной ценой контракта.
 *
 * Никаких неоднозначных связей по префиксу ИКЗ не делаем: если кандидатов
 * несколько или цена не совпала, извещение остаётся без контракта, а причина
 * пишется в `eisImport.contractLink`.
 *
 * Используется и при импорте (`import-eis-client.mjs`), и отдельно:
 *   node scripts/link-eis-chain.mjs [--db path/to/db.json] [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

export function parseArgs(argv) {
  const args = { db: path.join(ROOT, "db.json"), dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (argv[i] === "--db" && argv[i + 1]) {
      args.db = path.resolve(argv[++i]);
    }
  }
  return args;
}

function money(value) {
  if (typeof value === "number") return value;
  const text = String(value ?? "").replace(/\s/g, "").replace(",", ".");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : NaN;
}

/** Ключ ИКЗ без разрядов, которые различаются у извещения и контракта. */
export function ikzIdentity(ikz) {
  if (!/^\d{36}$/.test(String(ikz ?? ""))) return null;
  return [
    ikz.slice(0, 2), // год планирования
    ikz.slice(3, 13), // ИНН заказчика
    ikz.slice(13, 19), // КПП заказчика
    ikz.slice(19, 26), // код позиции плана-графика
  ].join("|");
}

/**
 * Связывает извещения с контрактами. Возвращает отчёт по каждому извещению.
 * Изменения применяются к переданному объекту `db`.
 */
export function linkNoticesToContracts(db) {
  const notices = Array.isArray(db.notices) ? db.notices : [];
  const contracts = Array.isArray(db.contractRegistry) ? db.contractRegistry : [];
  const linkedIds = new Set();
  const report = [];

  for (const notice of notices) {
    const ikz = notice.generalInfo?.ikz ?? notice.ikz ?? null;
    const identity = ikzIdentity(ikz);
    const price = money(notice.generalInfo?.nmck);
    const candidates = identity
      ? contracts.filter((item) => ikzIdentity(item.ikz) === identity)
      : [];

    // Уровень 1 — полное совпадение ИКЗ.
    let match = ikz ? contracts.find((item) => item.ikz === ikz) : null;
    let method = "exactIkz";

    // Уровень 2 — та же идентичность ИКЗ и точное совпадение цены.
    if (!match && Number.isFinite(price) && price > 0) {
      const byPrice = candidates.filter(
        (item) => Math.abs(money(item.contractPrice) - price) < 0.01,
      );
      if (byPrice.length === 1) {
        match = byPrice[0];
        method = "ikzPositionAndPrice";
      }
    }

    // Уровень 3 — единственный кандидат с той же идентичностью ИКЗ.
    if (!match && candidates.length === 1) {
      match = candidates[0];
      method = "ikzPosition";
    }

    // Один контракт не может подтверждать два извещения.
    if (match && linkedIds.has(match.id)) match = null;

    const number = notice.generalInfo?.noticeNumber ?? notice.id;
    if (match) {
      const procurementId = notice.procurementId ?? `eis-${number}`;
      match.procurementId = procurementId;
      notice.contractId = match.id;
      const procurement = (db.procurements ?? []).find(
        (item) => String(item.id) === String(procurementId),
      );
      if (procurement) procurement.contractId = match.id;
      notice.eisImport = {
        ...(notice.eisImport ?? {}),
        contractLink: { contractId: match.id, method },
      };
      linkedIds.add(match.id);
      report.push({
        notice: number,
        contractId: match.id,
        method,
        candidates: candidates.length,
      });
    } else {
      notice.eisImport = {
        ...(notice.eisImport ?? {}),
        contractLink: { status: "not_found", candidates: candidates.length },
      };
      report.push({
        notice: number,
        contractId: null,
        method: "not_found",
        candidates: candidates.length,
      });
    }
  }

  return report;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = JSON.parse(fs.readFileSync(args.db, "utf8"));
  const report = linkNoticesToContracts(db);
  if (!args.dryRun) {
    db.eisImportSummary = {
      ...(db.eisImportSummary ?? {}),
      contractLinks: report,
    };
    fs.writeFileSync(args.db, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
