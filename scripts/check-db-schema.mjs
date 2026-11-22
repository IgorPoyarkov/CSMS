/**
 * Smoke-проверка демо-БД на соответствие zod-схеме реестра контрактов.
 *
 * Расхождение «данные ↔ схема» ломает useContractRegistry: React Query получает
 * ZodError и все экраны с контрактами выглядят пустыми. Скрипт собирает схему
 * rolldown'ом (в проекте уже есть такой приём для scripts/*.ts) и проверяет
 * PostgreSQL до сборки/коммита, чтобы ошибка не доходила до браузера.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readDb } from "./lib/db-write.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".tmpcheck", "contract-registry-schema.mjs");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
execFileSync(
  process.execPath,
  [
    path.join(ROOT, "node_modules", "rolldown", "bin", "cli.mjs"),
    path.join(
      ROOT,
      "src",
      "services",
      "ContractRegistry",
      "contractRegistry.schema.ts",
    ),
    "--format",
    "esm",
    "--platform",
    "node",
    "--file",
    OUT,
    "--logLevel",
    "silent",
  ],
  { stdio: "inherit" },
);

const { ContractRegistryItemListSchema } = await import(
  pathToFileURL(OUT).href
);
const db = await readDb();
const result = ContractRegistryItemListSchema.safeParse(db.contractRegistry);

if (!result.success) {
  const paths = result.error.issues
    .slice(0, 10)
    .map((issue) => issue.path.join("."))
    .join(", ");
  console.error(
    `PostgreSQL: ${result.error.issues.length} ошибок в contractRegistry. Первые поля: ${paths}`,
  );
  process.exit(1);
}

console.log(
  `OK: contractRegistry — ${result.data.length} записей проходят схему`,
);
