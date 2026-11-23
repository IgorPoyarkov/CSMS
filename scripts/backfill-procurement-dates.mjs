/**
 * Backfill дат процедуры и статуса извещения в записи закупки.
 *
 * Реестр извещений (`/procurement-processing`) читает коллекцию `procurements`,
 * а сроки процедуры (`collectingStartDT`, `submissionEndDate`, `summingUpDate`,
 * `firstPartsDate`) жили только в `notices.procedureInfo`. Запись закупки
 * содержала только ИКЗ, наименование, номер, НМЦК и тип — без дат.
 *
 * Скрипт находит каждое извещение по `procurementId`, извлекает даты из
 * `procedureInfo` и проставляет «Статус извещения» (published / preparing).
 *
 * Повторный запуск безопасен: `upsertDocument` перезаписывает по ключу.
 *
 * Использование:
 *   node scripts/backfill-procurement-dates.mjs
 *   node scripts/backfill-procurement-dates.mjs --dry-run
 */

import {
  buildSeedContext,
  createPgPool,
  ensureSchema,
  loadDbFromPg,
  upsertDocument,
} from "./lib/pg-store.mjs";
import {
  procedureDateFields,
  noticeStatusField,
} from "./lib/notice-procedure-dates.mjs";

const dryRun = process.argv.includes("--dry-run");
const pool = createPgPool();
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await ensureSchema(client);
  const db = await loadDbFromPg(client);

  const procurements = db.procurements ?? [];
  const notices = db.notices ?? [];

  // Индекс: procurementId → notice
  const noticeByProcurementId = new Map(
    notices.map((n) => [String(n.procurementId), n]),
  );

  // buildSeedContext — общий контекст для organizationOf/innByOrg,
  // извлекает organization_id через notices → purchaseNotes → organizations.
  const seedCtx = buildSeedContext(db);

  let updated = 0;
  let skipped = 0;
  const missing = [];

  for (const procurement of procurements) {
    const notice = noticeByProcurementId.get(String(procurement.id));
    if (!notice) {
      skipped++;
      missing.push(procurement.id);
      continue;
    }

    const dateFields = procedureDateFields(notice.procedureInfo);
    const noticeNumber = notice.generalInfo?.noticeNumber;
    const currentStatus = procurement["Статус извещения"];
    const statusField = noticeStatusField(currentStatus, Boolean(noticeNumber));

    // Не пишем, если нет изменений
    let changed = false;
    const merged = { ...procurement };

    for (const [key, value] of Object.entries(dateFields)) {
      if (merged[key] !== value) {
        merged[key] = value;
        changed = true;
      }
    }
    if (statusField && merged["Статус извещения"] !== statusField) {
      merged["Статус извещения"] = statusField;
      changed = true;
    }

    if (!changed) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      await upsertDocument(client, "procurements", merged, seedCtx);
    }

    updated++;
  }

  if (dryRun) {
    // Пробный прогон не должен оставлять открытую транзакцию в пуле
    await client.query("ROLLBACK");
    console.log(`[DRY RUN] Обновлено: ${updated}, без изменений: ${skipped}`);
    if (missing.length > 0) {
      console.log(
        `[DRY RUN] Нет извещений для ${missing.length} закупок: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`,
      );
    }
  } else {
    await client.query("COMMIT");
    console.log(`Обновлено: ${updated}, без изменений: ${skipped}`);
    if (missing.length > 0) {
      console.log(
        `Нет извещений для ${missing.length} закупок: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`,
      );
    }
  }
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Ошибка backfill:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
