/**
 * Восстановить СЗ после уже выполненной выгрузки ЕИС, не повторяя саму выгрузку.
 *
 * Скрипт проходит по извещениям, находит позицию ПГ по уникальному номеру
 * (затем по ИКЗ) и создаёт недостающие purchaseNotes, не перезаписывая
 * существующие. Используется, когда import-eis-client.mjs уже очистил
 * purchaseNotes, но запускать сетевой импорт повторно нельзя.
 *
 * Пример:
 *   node scripts/repair-eis-notes.mjs --dry-run
 *   node scripts/repair-eis-notes.mjs --db db.json
 */

import fs from "node:fs";
import path from "node:path";
import { buildImportPurchaseNotes } from "./lib/import-eis-notes.mjs";

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const dryRun = args.includes("--dry-run");
const dbPath = path.resolve(argValue("--db", "db.json"));

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const result = buildImportPurchaseNotes({
  plans: db.purchasePlans ?? [],
  notices: db.notices ?? [],
  organization: db.organizations?.[0] ?? {},
  employee: db.employees?.[0] ?? {},
  importedAt: new Date().toISOString(),
  existingNotes: db.purchaseNotes ?? [],
});

console.log(
  JSON.stringify(
    {
      db: dbPath,
      dryRun,
      notices: (db.notices ?? []).length,
      notesBefore: (db.purchaseNotes ?? []).length,
      notesAfter: result.notes.length,
      created: result.created.map((note) => ({
        id: note.id,
        noteNumber: note.noteNumber,
        positionId: note.positionId,
        positionUniqueNumber: note.positionUniqueNumber,
        subject: note.subject,
      })),
      alreadyLinked: result.linked - result.created.length,
    },
    null,
    2,
  ),
);

if (!dryRun) {
  db.purchaseNotes = result.notes;
  fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}
