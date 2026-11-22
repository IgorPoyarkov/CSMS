/**
 * Точечный догруз карточек ЕИС, которые basic-импорт пропустил из-за 403.
 *
 * Полный прогон `import-eis-client.mjs` при выгрузке за несколько лет упирается
 * в антибот ЕИС: часть printForm-страниц отдаёт 403. Перепрогонять все 183
 * карточки ради 8 пропущенных не нужно — этот скрипт берёт номера из
 * `db.eisImportSummary.detailFailures`, подтягивает только их и пересобирает
 * СЗ/цепочки/задачи теми же функциями, что и основной импорт.
 *
 * Запуск:
 *   node scripts/retry-eis-notice-details.mjs --db db.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  fetchNoticesCsv,
  fetchNoticeDetail,
  mapNotice,
  mapProcurement,
} from "./import-eis-client.mjs";
import { buildImportPurchaseNotes } from "./lib/import-eis-notes.mjs";
import { applyEisChain, buildNoticeTasks } from "./link-eis-chain.mjs";
import { writeDb } from "./lib/db-write.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const argv = process.argv.slice(2);
const dbArg = argv[argv.indexOf("--db") + 1];
const dbPath =
  dbArg && !dbArg.startsWith("--") ? dbArg : path.join(ROOT, "db.json");
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

const summary = db.eisImportSummary;
if (!summary)
  throw new Error("В db.json нет eisImportSummary — сначала запустите импорт");

const failedNumbers = [
  ...new Set(
    (summary.detailFailures ?? []).map((item) => item.number).filter(Boolean),
  ),
];
if (failedNumbers.length === 0) {
  console.log(
    JSON.stringify(
      { retried: 0, message: "Пропущенных карточек нет" },
      null,
      2,
    ),
  );
  process.exit(0);
}

const org =
  db.organizations.find((item) => item.inn === summary.inn) ??
  db.organizations.find((item) => item.id === 6);
const employee =
  db.employees.find((item) => item.userId === 7) ??
  db.employees.find((item) => item.email === "poyarkova_nyy@mail.ru");
if (!org || !employee)
  throw new Error("Не найдены организация или ответственный работник");

const found = await fetchNoticesCsv(
  summary.inn,
  summary.noticeFrom,
  summary.to,
  500,
);
const wanted = found.notices.filter((item) =>
  failedNumbers.includes(item.number),
);
if (wanted.length !== failedNumbers.length) {
  console.log(
    JSON.stringify(
      {
        detailFailures: failedNumbers,
        foundInCsv: wanted.map((item) => item.number),
      },
      null,
      2,
    ),
  );
  throw new Error("Не все пропущенные номера нашлись в CSV ЕИС");
}

const existingNumbers = new Set(
  (db.notices ?? []).map((notice) => notice.generalInfo?.noticeNumber),
);
const template = db.notices[0] ?? {};
const plans = db.purchasePlans ?? [];
const added = [];
const stillFailed = [];
const methodField =
  "Способ определения поставщика (подрядчика, исполнителя), подрядной организации (размещения закупки)";

for (const item of wanted) {
  try {
    const detail = await fetchNoticeDetail(item.number);
    if (existingNumbers.has(item.number)) {
      console.log(`Уже есть: ${item.number}`);
      continue;
    }
    const notice = mapNotice(item, detail, template, org, plans, {
      ...summary,
      method: item.row[methodField],
    });
    db.notices.push(notice);
    db.procurements.push(mapProcurement(notice));
    existingNumbers.add(item.number);
    added.push(item.number);
    // ЕИС режет частые запросы, поэтому между карточками держим паузу.
    sleep(1800);
  } catch (error) {
    stillFailed.push({
      number: item.number,
      error: String(error?.message ?? error),
    });
  }
}

if (added.length > 0) {
  const years = [
    Number.parseInt(summary.noticeFrom.slice(-4), 10),
    Number.parseInt(summary.to.slice(-4), 10),
  ];
  const purchaseNotes = buildImportPurchaseNotes({
    plans,
    notices: db.notices,
    organization: org,
    employee,
    importedAt: summary.importedAt,
    years,
  });
  db.purchaseNotes = purchaseNotes.notes;

  const chain = applyEisChain(db);
  const valid = new Set(db.procurements.map((item) => item.id));
  const linkedContracts = db.contractRegistry.filter((contract) =>
    valid.has(contract.procurementId),
  );
  db.tasks = buildNoticeTasks({
    plans,
    notices: db.notices,
    contracts: linkedContracts,
    org,
    head: employee,
    staffByNotice: chain.byNotice,
    count: 12,
  });

  summary.noticesImported = db.notices.length;
  summary.noticeNumbers = db.notices.map(
    (notice) => notice.generalInfo.noticeNumber,
  );
  summary.purchaseNotesCreated = purchaseNotes.created.length;
  summary.purchaseNotesSkipped = purchaseNotes.skippedNotices.length;
  summary.contractLinks = chain.notices.length;
  summary.detailFailures = stillFailed;
  db.eisImportSummary = summary;
}

await writeDb(dbPath, db);
console.log(
  JSON.stringify(
    {
      retried: failedNumbers.length,
      added,
      stillFailed,
      notices: db.notices.length,
      purchaseNotes: db.purchaseNotes.length,
    },
    null,
    2,
  ),
);
