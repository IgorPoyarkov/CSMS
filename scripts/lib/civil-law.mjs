/**
 * Node-обвязка слоя «предмет/объект закупки → институт ГК РФ» (P0–P1).
 *
 * Чистая логика вынесена в `civil-law-core.mjs` и используется и скриптами,
 * и конструктором проекта контракта. Здесь остаются только чтение снимка
 * с диска и проверка хешей: браузер получает тот же снимок через импорт JSON.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export * from "./civil-law-core.mjs";

export const CIVIL_SNAPSHOT_PATH = path.resolve(
  "docs/snapshots/civil-code-snapshot.json",
);

/** Читает снимок и проверяет его внутреннюю целостность. */
export function loadCivilSnapshot(snapshotPath = CIVIL_SNAPSHOT_PATH) {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const problems = [];
  for (const act of Object.values(snapshot.acts || {})) {
    for (const article of Object.values(act.articles || {})) {
      const actual = crypto
        .createHash("sha256")
        .update(article.text)
        .digest("hex")
        .toUpperCase();
      if (actual !== article.textSha256) {
        problems.push(`Не совпал хеш текста: ${article.url}`);
      }
      const hasHeading = new RegExp(`Статья\\s+${article.article}\\.`).test(
        article.text,
      );
      if (!hasHeading && !/^\d+\./.test(article.text)) {
        problems.push(`Подозрительный текст статьи: ${article.url}`);
      }
    }
  }
  if (problems.length) throw new Error(problems.join("; "));
  return snapshot;
}
