/**
 * Отбор документов, которые реально нужны позициям плана-графика.
 *
 * Источник соответствия — КТРУ: у карточки КТРУ есть код ОКПД2 (parentCode)
 * и перечень нормативных документов в payloadJson.standards. Из всех
 * позиций ПГ собираются коды ОКПД2, затем по ним — КТРУ и документы.
 * Дополнительно поднимаются ГОСТы с аналогичными названиями из снимка
 * scripts/collect-gosts-by-okpd2-name.mjs: у дорожных и многих других карточек
 * ЕИС поле стандартов пустое, но каталог Росстандарта такие ГОСТы знает.
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
  const names = new Map();
  let positionCount = 0;
  for (const plan of plans) {
    for (const position of plan.positions ?? []) {
      positionCount += 1;
      for (const [code, name] of [
        [position.okpd2Code, position.okpd2Name],
        ...(position.okpd2Items ?? []).map((item) => [item.okpd2Code, item.okpd2Name]),
      ]) {
        if (!code) continue;
        codes.set(code, (codes.get(code) ?? 0) + 1);
        if (name && !names.has(code)) names.set(code, String(name));
      }
    }
  }
  return { codes, names, planCount: plans.length, positionCount };
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

const { codes, names, planCount, positionCount } = await okpd2FromPlans();
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
      title: null,
    };
    record.okpd2.add(okpd2);
    record.ktruCodes.add(item.code);
    record.standardNames.add(name);
    byName.set(key, record);
  }
}

/**
 * ГОСТы с аналогичными названиями: снимок ищет по словам названия ОКПД2 на
 * protect.gost.ru. Здесь отбираем действующие документы с достаточным
 * совпадением и ограничиваем список на код — иначе агент захлебнётся тыщами
 * косвенно связанных стандартов.
 */
const SIGNIFICANT = /[а-яё]{4,}/gi;
const GENERIC = new Set([
  "работы", "услуги", "прочие", "включенные", "другие", "группировки", "общего",
]);
const significant = (value) =>
  (String(value ?? "").toLowerCase().match(SIGNIFICANT) ?? []).filter(
    (word) => !GENERIC.has(word),
  );
// Код 42.11.20.200 наследует название родителя 42.11: «Дороги автомобильные…»
// должен находиться и на дочерних позициях ПГ, а не только на родительской.
const parentNames = new Map();
for (const code of codes.keys()) {
  const chain = [];
  for (const prefix of codes.keys()) {
    if (code.startsWith(prefix) && names.has(prefix)) chain.push(names.get(prefix));
  }
  parentNames.set(code, chain);
}
const nameGosts = JSON.parse(
  await fs.readFile(path.join(ROOT, "docs/snapshots/gost/pg-name-gosts.json"), "utf8"),
);
const byCode = new Map();
for (const item of nameGosts.items ?? []) {
  if (!item.current || !item.designation) continue;
  const titleWords = significant(item.title).slice(0, 2);
  for (const matched of item.okpd2Codes ?? []) {
    if (!codes.has(matched)) continue;
    for (const code of codes.keys()) {
      if (!code.startsWith(matched)) continue;
      const score = item.scores?.[matched] ?? 0;
      // Заголовок с тем же началом, что у названия ОКПД2 или его родителя,
      // важнее простого совпадения случайного слова.
      let exact = 0;
      for (const name of parentNames.get(code) ?? []) {
        const words = significant(name);
        if (titleWords[0] && words[0] === titleWords[0]) {
          exact = Math.max(exact, 3 + (words[1] === titleWords[1] ? 2 : 0));
        }
      }
      const rank = score + exact;
      if (rank < 2) continue;
      const list = byCode.get(code) ?? [];
      list.push({ item, rank, score });
      byCode.set(code, list);
    }
  }
}
let nameMatched = 0;
for (const [code, list] of byCode) {
  list.sort(
    (a, b) =>
      b.rank - a.rank ||
      b.score - a.score ||
      a.item.designation.localeCompare(b.item.designation),
  );
  for (const { item } of list.slice(0, 80)) {
    const key = item.designation;
    const record = byName.get(key) ?? {
      designation: key,
      name: key,
      okpd2: new Set(),
      ktruCodes: new Set(),
      standardNames: new Set(),
      sourceUrl: item.sourceUrl ?? null,
      title: item.title,
    };
    record.okpd2.add(code);
    record.standardNames.add(item.title);
    byName.set(key, record);
    nameMatched += 1;
  }
}

const sources = JSON.parse(
  await fs.readFile(path.join(ROOT, "docs/snapshots/gost/fulltext/sources.json"), "utf8"),
);
const toItem = (record) => ({
  designation: record.designation,
  name: record.title ?? record.name,
  okpd2Codes: [...record.okpd2].sort(),
  ktruCodes: [...record.ktruCodes].sort(),
  standardNames: [...record.standardNames].sort(),
  sourceUrl: record.designation
    ? sources[record.designation] ?? record.sourceUrl ?? null
    : null,
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
  nameSelectionGeneratedAt: nameGosts.generatedAt,
  nameQueryCount: nameGosts.queryCount,
  nameMatched,
  selectionSha256: createHash("sha256")
    .update(JSON.stringify({ selected, otherStandards }))
    .digest("hex"),
  selected,
  otherStandards,
});
await fs.writeFile(OUT, payload + "\n", "utf8");
console.log(
  `Планов: ${planCount}, позиций: ${positionCount}, кодов ОКПД2: ${codes.size}, ` +
    `КТРУ: ${ktruItems.length}, названий по ОКПД2: ${nameMatched}, ` +
    `ГОСТов: ${selected.length}, прочих документов: ${otherStandards.length}`,
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
