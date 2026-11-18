/**
 * Удаляет из db.json дубли графиков, созданные вручную при проверке экрана
 * (id 4 и 5 для org 1 / 2027), и оставляет только сиды утилиты.
 *
 * Запуск: node prune-duplicate-schedules.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const db = JSON.parse(readFileSync("db.json", "utf-8"));
const keep = [1, 2, 3];
const before = db.vacationSchedules.length;

db.vacationSchedules = db.vacationSchedules.filter((item) =>
  keep.includes(Number(item.id)),
);

writeFileSync("db.json", JSON.stringify(db, null, 2) + "\n", "utf-8");
console.log(`vacationSchedules: ${before} → ${db.vacationSchedules.length}`);
