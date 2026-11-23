/**
 * Универсальный запуск проверок, написанных на TypeScript.
 *
 * Rolldown собирает файл в ESM (Node не импортирует TS напрямую), затем
 *результат импортируется: проверка сама печатает итог и решает exit-код.
 *Раньше эта цепочка из семи одинаковых команд копировалась в package.json;
 *теперь флаги меняются в одном месте.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requested = process.argv[2];

if (!requested) {
  console.error("Укажите файл проверки: node scripts/run-ts-check.mjs scripts/check-pp2571.ts");
  process.exit(1);
}

const input = path.resolve(ROOT, requested);

if (!fs.existsSync(input)) {
  console.error(`Файл проверки не найден: ${requested}`);
  process.exit(1);
}

const name = path.basename(input, path.extname(input));
const out = path.join(ROOT, ".tmpcheck", `${name}.mjs`);

fs.mkdirSync(path.dirname(out), { recursive: true });

execFileSync(
  process.execPath,
  [
    path.join(ROOT, "node_modules", "rolldown", "bin", "cli.mjs"),
    input,
    "--format",
    "esm",
    "--platform",
    "node",
    "--file",
    out,
    "--logLevel",
    "silent",
    "--transform.define",
    "import.meta.env:{}",
  ],
  { stdio: "inherit" },
);

// Кеш-параметр нужен при повторном запуске в одном процессе (тесты/наблюдатели).
await import(`${pathToFileURL(out).href}?t=${Date.now()}`);
