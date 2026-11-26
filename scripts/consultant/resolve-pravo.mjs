#!/usr/bin/env node
/**
 * Подбор карточек actual.pravo.gov.ru для всех НПА из каталога проекта.
 * Результат (± hash и redid актуальной редакции) пишется в pravo-sources.json;
 * спорные карточки остаются в .tmp/pravo-downloads/unresolved.json.
 *
 *   node scripts/consultant/resolve-pravo.mjs --dry
 *   node scripts/consultant/resolve-pravo.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const API = "http://actual.pravo.gov.ru:8000/api/ebpi";
const HERE = import.meta.dirname;
const ROOT = path.resolve(HERE, "../..");
const CATALOG = path.join(HERE, "pravo-catalog.json");
const MANIFEST = path.join(HERE, "pravo-sources.json");
const REPORT = path.join(ROOT, ".tmp/pravo-downloads/unresolved.json");

const args = new Set(process.argv.slice(2));
const dry = args.has("--dry");
const only = [...args].find((a) => a.startsWith("--only="))?.slice(7);

const searchUrl = (number) =>
  `${API}/attrsearch/?bpa=ebpi&q=${encodeURIComponent(
    JSON.stringify([
      { AttrId: 6, AttrMode: 8, Words: [number] },
      // Без явного горизонта портал ищет только с 01.07.2022 и не отдаёт
      // старые карточки (кодексы, законы 1990-х, ранние постановления).
      { AttrId: 999, AttrMode: 1, Words: [2000, "type", "19000101", 0, 0] },
    ]),
  )}`;

const redactionsUrl = (hash) =>
  `${API}/redactions/?bpa=ebpi&${new URLSearchParams({
    t: JSON.stringify({ hash, ttl: 4 }),
  })}`;

const getJson = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "CSMS-Consultant/1.0 (local RAG)" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
};

const norm = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, " ");

/** Выбираем карточку: точный номер, вид акта, год принятия, ключевые слова. */
function pickCandidates(docs, act) {
  const kind = norm(act.kind);
  const title = norm(act.title ?? "");
  const isCode = title.includes("кодекс");
  const candidates = (docs ?? []).filter((doc) => {
    const passing = norm(doc.docpassing);
    const names = norm(doc.docnames);
    const kindOk =
      passing.includes(kind) ||
      (isCode && (passing.includes("кодекс российской федерации") || names.includes("кодекс")));
    if (!kindOk) return false;
    if (act.year && !String(doc.docpass0date ?? "").startsWith(act.year)) return false;
    const number = String(doc.docpass0number ?? "").replace(/^0+/, "");
    const suffix = number.split(/[^\d]/)[0];
    return suffix === String(Number(act.number));
  });

  const score = (doc) => {
    const passing = norm(doc.docpassing);
    const names = norm(doc.docnames);
    let value = 0;
    if (doc.docstate?.startsWith("Действует")) value += 10;
    if (doc.docimagepath) value += 3;
    if (act.title && (passing.includes(act.title) || names.includes(act.title))) value += 8;
    if (isCode && names.includes(title)) value += 10;
    if (act.kind === "Приказ" && /приказ мин|приказ федерал/i.test(passing)) value += 2;
    if (norm(doc.docstate).includes("не вступил")) value -= 5;
    return value;
  };
  return candidates.sort((a, b) => score(b) - score(a));
}

const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");

/** Актуальная редакция; для утративших силу актов — последняя действовавшая с текстом. */
function pickRedaction(redactions) {
  const list = redactions ?? [];
  const past = list.filter((red) => String(red.reddate ?? "") <= today());
  const actual = past.find((red) => red.actual === true && red.hascontent);
  if (actual) return actual;
  const inForce = past.find(
    (red) => red.hascontent && norm(red.redstatus).includes("действует"),
  );
  // Будущие редакции в индекс не попадают: если действующей ещё нет, акт
  // помечается как неразрешённый, а не скачивается «вперёд».
  return (
    inForce ??
    past.find((red) => red.hascontent) ??
    past[past.length - 1] ??
    null
  );
}

const slugDate = (value) =>
  String(value ?? "")
    .replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
    .slice(0, 10);

const catalog = JSON.parse(await fs.readFile(CATALOG, "utf8"));
const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
const existing = new Map((manifest.acts ?? []).map((act) => [act.id, act]));
const unresolved = [];
let added = 0;

for (const act of catalog.acts ?? []) {
  if (only && act.id !== only) continue;
  try {
    const found = await getJson(searchUrl(act.number));
    const candidates = pickCandidates(found.docs, act);
    if (candidates.length === 0) {
      unresolved.push({
        id: act.id,
        short: act.short,
        reason: "карточка не найдена",
        queryNumber: act.number,
        found: (found.docs ?? []).slice(0, 12).map((d) => ({
          date: d.docpass0date,
          number: d.docpass0number,
          passing: d.docpassing,
          names: d.docnames,
          state: d.docstate,
        })),
      });
      process.stdout.write(`НЕ НАЙДЕН: ${act.short}\n`);
      continue;
    }
    // Карточки изменяющих актов часто не имеют консолидированного текста —
    // берём первую карточку, у которой есть редакции.
    let candidate = null;
    let red = null;
    for (const item of candidates.slice(0, 6)) {
      const reds = await getJson(redactionsUrl(item.dochash));
      const picked = pickRedaction(reds.redactions);
      if (picked) {
        candidate = item;
        red = picked;
        break;
      }
    }
    if (!candidate || !red) {
      unresolved.push({ id: act.id, short: act.short, reason: "нет редакций ни у одной карточки", tried: candidates.slice(0, 6).map((d) => d.docpassing) });
      process.stdout.write(`НЕТ РЕДАКЦИЙ: ${act.short}\n`);
      continue;
    }

    const entry = {
      id: act.id,
      shortName: act.short,
      hash: candidate.dochash,
      cardUrl: candidate.docimagepath ?? null,
      relevantFrom: act.relevantFrom ?? null,
      maxChunks: act.maxChunks ?? null,
      documentName: candidate.docpassing,
      redactions: [
        {
          redid: red.redid,
          slug: slugDate(red.reddate),
          role:
            String(red.reddate ?? "") > today()
              ? "future"
              : red.actual === true
                ? "actual"
                : "archive",
        },
      ],
    };

    const prior = existing.get(act.id);
    if (prior?.redactions?.length > 1) {
      // Ручной набор (44-ФЗ): сохраняем все отобранные редакции.
      entry.redactions = prior.redactions;
      entry.hash = prior.hash;
      entry.cardUrl = prior.cardUrl ?? entry.cardUrl;
    }
    if (!dry) existing.set(act.id, entry);
    added += 1;
    process.stdout.write(
      `${act.short.padEnd(28)} | ${red.redid} ${slugDate(red.reddate)} ${red.actual ? "актуальная" : red.redstatus ?? "?"} | ${candidate.dochash.slice(0, 12)} | ${candidate.docpassing}\n`,
    );
  } catch (error) {
    unresolved.push({ id: act.id, short: act.short, reason: error.message });
    process.stdout.write(`ОШИБКА: ${act.short} — ${error.message}\n`);
  }
}

if (!dry) {
  manifest.acts = [...existing.values()];
  await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.mkdir(path.dirname(REPORT), { recursive: true });
  await fs.writeFile(REPORT, `${JSON.stringify(unresolved, null, 2)}\n`, "utf8");
  process.stdout.write(`Записано: ${added}, не разрешено: ${unresolved.length}\n`);
}
