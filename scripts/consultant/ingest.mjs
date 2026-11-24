import fs from "node:fs/promises";
import path from "node:path";
import { collectSources, ROOT } from "./lib/knowledge.mjs";
import { embedTexts } from "./lib/embed.mjs";

const cfgPath = path.join(import.meta.dirname, "sources.json");
const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
const outDir = path.join(ROOT, ".tmp/consultant");
const outFile = path.join(outDir, "index.json");
const args = new Set(process.argv.slice(2));
const limitArg = [...args].find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 0;

if (!(await fs.readFile(outFile, "utf8").catch(() => null)) || args.has("--force")) {
  const started = Date.now();
  process.stdout.write("Сбор фрагментов из источников…\n");
  const { chunks: allChunks, lookup } = await collectSources(cfg);
  const chunks = limit ? allChunks.slice(0, limit) : allChunks;
  process.stdout.write(`Фрагментов: ${chunks.length}, точных правил ОКПД2: ${Object.keys(lookup).length}\n`);

  const vectors = await embedTexts(
    chunks.map((chunk) => chunk.text),
    cfg,
    32,
    (done, total) => {
      if (done % 160 === 0 || done === total) {
        process.stdout.write(`Эмбеддинги: ${done}/${total}\n`);
      }
    },
  );

  const payload = {
    version: 1,
    builtAt: new Date().toISOString(),
    embedModel: cfg.embedModel,
    chatModel: cfg.chatModel,
    chunks: chunks.map((chunk, index) => ({ ...chunk, embedding: vectors[index] })),
    lookup,
    stats: {
      bySource: chunks.reduce((acc, chunk) => {
        acc[chunk.source] = (acc[chunk.source] ?? 0) + 1;
        return acc;
      }, {}),
      elapsedMs: Date.now() - started,
    },
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(payload));
  process.stdout.write(
    `Индекс готов: ${outFile}, ${(await fs.stat(outFile)).size} байт за ${payload.stats.elapsedMs} мс\n`,
  );
} else {
  process.stdout.write(`Индекс уже есть: ${outFile} (--force для пересборки)\n`);
}
