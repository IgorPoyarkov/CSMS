/**
 * Сборка офлайн-снимка агента ООЗ по ГОСТ и НПА.
 *
 * Вход — уже зафиксированные снимки: отбор по ОКПД2, требования из полного
 * текста ГОСТов, полный текст НПА, каталог новых ГОСТов и снимок статей
 * 44-ФЗ/ГК. Никаких сетевых вызовов: агент не должен зависеть от доступности
 * ЕИС, pravo.gov.ru или allgosts.ru.
 *
 * Запуск: node scripts/build-ooz-agent.mjs [--out public/gost/ooz-agent.json]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildOozAgentSnapshot } from "./lib/ooz-agent.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOST_TEXT_DIR = path.join(ROOT, "docs/snapshots/gost/fulltext");
const NPA_TEXT_DIR = path.join(ROOT, "docs/snapshots/npa/fulltext");
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = async (rel) =>
  JSON.parse(await fs.readFile(path.join(ROOT, rel), "utf8"));

/** Снимки лежат в docs/, а браузер читает копию из public/ — без сети. */
const publishTexts = async (srcDir, publicRel) => {
  const destDir = path.join(ROOT, publicRel);
  await fs.mkdir(destDir, { recursive: true });
  const files = (await fs.readdir(srcDir)).filter((file) => /\.txt$/i.test(file));
  for (const file of files) {
    await fs.copyFile(path.join(srcDir, file), path.join(destDir, file));
  }
  const webDir = publicRel.replace(/^public\//, "");
  return files.map((file) => `/${webDir}/${file}`);
};

const selection = await readJson("docs/snapshots/gost/okpd2-selection.json");
const requirements = await readJson("public/gost/requirements.json");
const catalog = await readJson("public/gost/catalog.json");
const npaSnapshot = await readJson("docs/snapshots/civil-code-snapshot.json");

const gostUrls = await publishTexts(GOST_TEXT_DIR, "public/gost/fulltext");
const gostFullTextUrls = {};
for (const url of gostUrls) {
  const base = path.basename(url, ".txt");
  const designation = base.replace(/^gost-/i, "ГОСТ ");
  gostFullTextUrls[designation] = url;
}

await publishTexts(NPA_TEXT_DIR, "public/npa/fulltext");
const npaSources = await readJson("docs/snapshots/npa/fulltext/sources.json");
const npaFullTexts = await Promise.all(
  Object.entries(npaSources).map(async ([code, meta]) => ({
    code,
    sourceUrl: meta.url ?? null,
    fullTextUrl: meta.file ? `/npa/fulltext/${meta.file}` : null,
    text: meta.file
      ? await fs.readFile(path.join(NPA_TEXT_DIR, meta.file), "utf8")
      : null,
  })),
);

const snapshot = buildOozAgentSnapshot({
  selection,
  requirements,
  catalog,
  npaSnapshot,
  npaFullTexts,
  gostFullTextUrls,
});
const out = path.resolve(ROOT, arg("out", "public/gost/ooz-agent.json"));
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, `${JSON.stringify(snapshot)}\n`, "utf8");
console.log(
  `Агент ООЗ: ${snapshot.version}, документов ${snapshot.documents.length}, ` +
    `подсказок ${snapshot.suggestions.length}, ОКПД2 с документами ${
      Object.keys(snapshot.byOkpd2).length
    }`,
);
console.log(`Снимок: ${out}`);
