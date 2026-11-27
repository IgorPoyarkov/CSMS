/**
 * Сборка офлайн-снимка агента ООЗ по ГОСТ и НПА.
 *
 * Вход — уже зафиксированные снимки: отбор по ОКПД2, требования из полного
 * текста ГОСТов, каталог новых ГОСТов и снимок статей 44-ФЗ/ГК. Никаких
 * сетевых вызовов: агент не должен зависеть от доступности ЕИС или pravo.gov.ru.
 *
 * Запуск: node scripts/build-ooz-agent.mjs [--out public/gost/ooz-agent.json]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildOozAgentSnapshot } from "./lib/ooz-agent.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const readJson = async (rel) =>
  JSON.parse(await fs.readFile(path.join(ROOT, rel), "utf8"));

const selection = await readJson("docs/snapshots/gost/okpd2-selection.json");
const requirements = await readJson("public/gost/requirements.json");
const catalog = await readJson("public/gost/catalog.json");
const npaSnapshot = await readJson("docs/snapshots/civil-code-snapshot.json");

const snapshot = buildOozAgentSnapshot({
  selection,
  requirements,
  catalog,
  npaSnapshot,
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
