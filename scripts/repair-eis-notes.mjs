/**
 * Пересобрать СЗ после уже выполненной выгрузки ЕИС, не повторяя саму выгрузку.
 *
 * По умолчанию создаёт только недостающие СЗ, не перезаписывая существующие.
 * Флаг `--replace` сначала удаляет ВСЕ СЗ и строит их заново строго из
 * извещений выбранного года (по умолчанию 2026); чего в извещении нет —
 * заполняется заглушкой по умолчанию из emptyPurchaseNote().
 *
 * Пример:
 *   node scripts/repair-eis-notes.mjs --dry-run
 *   node scripts/repair-eis-notes.mjs --db db.json --replace --year 2026
 *   node scripts/repair-eis-notes.mjs --db db.json --dry-run --replace
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
const replace = args.includes("--replace");
const yearArg = textYear(argValue("--year", "2026"));
const dbPath = path.resolve(argValue("--db", "db.json"));

function textYear(value) {
  const source = String(value ?? "").trim();
  if (source === "" || source.toLowerCase() === "all") return 0;
  const parsed = Number.parseInt(source, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const notices = structuredClone(db.notices ?? []);
const before = db.purchaseNotes ?? [];

// При полной пересборке старые связи с удалёнными СЗ must be сброшены,
// иначе извещения продолжат ссылаться на несуществующие id.
if (replace && !dryRun) {
  for (const notice of db.notices ?? []) {
    delete notice.purchaseNoteId;
  }
}

const result = buildImportPurchaseNotes({
  plans: db.purchasePlans ?? [],
  notices,
  organization: db.organizations?.[0] ?? {},
  employee: db.employees?.[0] ?? {},
  importedAt: new Date().toISOString(),
  existingNotes: replace ? [] : before,
  year: yearArg,
});

console.log(
  JSON.stringify(
    {
      db: dbPath,
      dryRun,
      replace,
      year: yearArg || "all",
      notices: notices.length,
      notesBefore: before.length,
      notesAfter: result.notes.length,
      removed: replace ? before.length : 0,
      created: result.created.map((note) => ({
        id: note.id,
        noteNumber: note.noteNumber,
        positionId: note.positionId,
        positionUniqueNumber: note.positionUniqueNumber,
        subject: note.subject,
        ikz: note.ikz,
        procurementId: note.procurementId,
      })),
      alreadyLinked: result.linked - result.created.length,
      skippedNotices: result.skippedNotices,
    },
    null,
    2,
  ),
);

if (!dryRun) {
  db.purchaseNotes = result.notes;
  // Generator проставляет purchaseNoteId на копии извещений — переносим
  // связи в рабочую БД (и при обычном режиме, и при полной пересборке).
  for (let index = 0; index < notices.length; index += 1) {
    const source = notices[index];
    const target = db.notices?.[index];
    if (!target) continue;
    if (source.purchaseNoteId !== undefined) {
      target.purchaseNoteId = source.purchaseNoteId;
    } else {
      delete target.purchaseNoteId;
    }
  }
  fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}
