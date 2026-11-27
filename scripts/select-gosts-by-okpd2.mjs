/**
 * Отбор документов, которые реально нужны позициям плана-графика.
 *
 * Источник соответствия — КТРУ: у карточки КТРУ есть код ОКПД2 (parentCode)
 * и перечень нормативных документов в payloadJson.standards. Из всех
 * позиций ПГ собираются коды ОКПД2, затем по ним — КТРУ и документы.
 * ГОСТы (ГОСТ/ГОСТ Р/ПНСТ) идут в selected и в дальнейшем получают полный
 * текст; остальные нормативные документы (ТР ТС, законы и т.п.) сохраняются
 * в otherStandards, чтобы не терять связи из карточек КТРУ.
 *
 * Запуск (нужны локальные pg-адаптер на :3002 и csms-api на :5099):
 *   node scripts/select-gosts-by-okpd2.mjs
 *
 * На выходе — docs/snapshots/gost/okpd2-selection.json. Это только список:
 * полный текст выгружается отдельно через scripts/browser/export-article.js.
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PG_URL = process.env.PG_JSON_SERVER ?? "http://localhost:3002";
const API_URL = process.env.CSMS_API ?? "http://localhost:5099";
const OUT = path.join(ROOT, "docs/snapshots/gost/okpd2-selection.json");

const json = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};

/** Все позиции всех планов; одна позиция может нести несколько кодов ОКПД2. */
async function okpd2FromPlans() {
  const plans = await json(`${PG_URL}/purchasePlans?_limit=1000`);
  const codes = new Map();
  let positionCount = 0;
  for (const plan of plans) {
    for (const position of plan.positions ?? []) {
      positionCount += 1;
      for (const code of [position.okpd2Code, ...(position.okpd2Items ?? []).map((item) => item.okpd2Code)]) {
        if (code) codes.set(code, (codes.get(code) ?? 0) + 1);
      }
    }
  }
  return { codes, planCount: plans.length, positionCount };
}

/** API справочников отдаёт не больше 500 записей за запрос. */
async function allKtruItems() {
  const items = [];
  for (let skip = 0; skip < 5000; skip += 500) {
    const batch = await json(`${API_URL}/api/references/nsiKTRU/items?take=500&skip=${skip}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < 500) break;
  }
  return items;
}

const { codes, planCount, positionCount } = await okpd2FromPlans();
const ktruItems = await allKtruItems();
const byName = new Map();

for (const item of ktruItems) {
  const payload = JSON.parse(item.payloadJson ?? "{}");
  const okpd2 = item.parentCode ?? payload.okpd2Code ?? "";
  if (!codes.has(okpd2)) continue;
  for (const standard of payload.standards ?? []) {
    const name = String(standard.name ?? "").replace(/\s+/g, " ").trim();
    if (!name) continue;
    // ГОСТ Р 123-2026 и ПНСТ тоже подходят; законы и ТР ТС идут отдельно.
    const designation = /^((?:ГОСТ(?: Р)?|ПНСТ)\s*[\d.]+-[\d]{4})/i.exec(name)?.[1];
    const key = (designation ?? name).replace(/\s+/g, " ");
    const record = byName.get(key) ?? {
      designation: designation ? key : null,
      name: key,
      okpd2: new Set(),
      ktruCodes: new Set(),
      standardNames: new Set(),
    };
    record.okpd2.add(okpd2);
    record.ktruCodes.add(item.code);
    record.standardNames.add(name);
    byName.set(key, record);
  }
}

const sources = JSON.parse(
  await fs.readFile(path.join(ROOT, "docs/snapshots/gost/fulltext/sources.json"), "utf8"),
);
const toItem = (record) => ({
  designation: record.designation,
  name: record.name,
  okpd2Codes: [...record.okpd2].sort(),
  ktruCodes: [...record.ktruCodes].sort(),
  standardNames: [...record.standardNames].sort(),
  sourceUrl: record.designation ? sources[record.designation] ?? null : null,
});
const records = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
const selected = records.filter((record) => record.designation).map(toItem);
const otherStandards = records.filter((record) => !record.designation).map(toItem);

const payload = JSON.stringify({
  generatedAt: new Date().toISOString(),
  planCount,
  positionCount,
  okpd2Codes: [...codes.keys()].sort(),
  ktruScanned: ktruItems.length,
  selectionSha256: createHash("sha256")
    .update(JSON.stringify({ selected, otherStandards }))
    .digest("hex"),
  selected,
  otherStandards,
});
await fs.writeFile(OUT, payload + "\n", "utf8");
console.log(
  `Планов: ${planCount}, позиций: ${positionCount}, кодов ОКПД2: ${codes.size}, ` +
    `КТРУ: ${ktruItems.length}, ГОСТов: ${selected.length}, прочих документов: ${otherStandards.length}`,
);
for (const [title, list] of [
  ["ГОСТы", selected],
  ["Прочие документы", otherStandards],
]) {
  if (!list.length) continue;
  console.log(`${title}:`);
  console.log(list.map((item) => `  ${item.name} [${item.okpd2Codes.join(", ")}]`).join("\n"));
}
console.log(`Список: ${OUT}`);
