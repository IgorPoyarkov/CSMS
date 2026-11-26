import fs from "node:fs";

/** Подбор карточек на publication.pravo.gov.ru (ведомственные акты — только сканы). */
const API = "http://publication.pravo.gov.ru/api/Documents?";
const OUT = ".tmp/pravo-downloads/publication-candidates.json";

const types = await (await fetch("http://publication.pravo.gov.ru/api/DocumentTypes")).json();
const typeId = (name) => types.find((x) => x.name === name)?.id ?? "";
const KIND_TYPE = {
  Приказ: typeId("Приказ"),
  "Постановление Правительства": typeId("Постановление"),
  "Постановление Госкомстата": typeId("Постановление"),
};

const catalog = JSON.parse(fs.readFileSync("scripts/consultant/pravo-catalog.json", "utf8"));
const unresolved = JSON.parse(fs.readFileSync(".tmp/pravo-downloads/unresolved.json", "utf8"));
const ids = new Set(unresolved.map((x) => x.id));

async function search(act) {
  const params = new URLSearchParams({
    Number: act.number,
    NumberSearchType: "1",
    DocumentTypes: KIND_TYPE[act.kind] ?? "",
    PageSize: "100",
  });
  if (act.nameHint) params.set("Name", act.nameHint);
  const response = await fetch(API + params);
  if (!response.ok) throw new Error(`HTTP ${response.status} для ${act.id}`);
  const json = await response.json();
  return json.items ?? [];
}

const result = {};
for (const act of catalog.acts) {
  if (!ids.has(act.id)) continue;
  try {
    const items = await search(act);
    result[act.id] = {
      short: act.short,
      year: act.year ?? "",
      hint: act.nameHint ?? act.title ?? "",
      items: items.map((x) => ({
        date: x.viewDate,
        name: (x.complexName ?? "").replace(/\s+/g, " ").trim(),
        eo: x.eoNumber,
      })),
    };
    console.log(`${act.id.padEnd(18)} ${items.length}`);
  } catch (error) {
    console.log(`${act.id.padEnd(18)} ОШИБКА: ${error.message}`);
  }
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
console.log(`Записано: ${OUT}`);
