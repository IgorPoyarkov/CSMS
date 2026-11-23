/**
 * Пилот LLM-анализа ГК РФ по контрольным предметам закупок.
 *
 * Пример одного контракта:
 *   node scripts/civil-law-llm-pilot.mjs --contract 2462904043926000003
 *
 * Ограниченная выборка (не прогон всех 112 контрактов):
 *   node scripts/civil-law-llm-pilot.mjs --contract ... --contract ... --max-minutes 110
 *   --request-timeout-minutes 35 поднимает лимит одного ответа Ollama.
 *
 * В контекст модели попадают только объект закупки, код ОКПД2 как косвенный
 * сигнал и дословные абзацы снимка. Содержимое проекта контракта не
 * передаётся: там могут быть непроверенные формулировки. Ответ проходит
 * проверку дословных цитат и оговорок в scripts/lib/civil-law-llm.mjs.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_CIVIL_MODEL,
  analyzeCivilWithLlm,
} from "./lib/civil-law-llm.mjs";
import {
  buildContractRequirements,
  loadCivilSnapshot,
} from "./lib/civil-law.mjs";

const SUBJECTS_PATH = "docs/snapshots/contract-subjects-2026.json";
const SNAPSHOT_PATH = "docs/snapshots/civil-code-snapshot.json";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function args(name, fallback = []) {
  const values = [];
  process.argv.forEach((value, index) => {
    if (value === `--${name}` && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
    }
  });
  return values.length ? values : fallback;
}

/**
 * Обычный fetch в Node имеет 5-минутный headers timeout: модель на большом
 * промпте отвечает дольше. Здесь таймаут задан явно через node:http.
 */
function postJson(url, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify(payload);
    const request = http.request(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Ollama ${response.statusCode}: ${text.slice(0, 500)}`));
            return;
          }
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(new Error(`Ollama вернул не JSON: ${text.slice(0, 500)}`));
          }
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("Таймаут Ollama")));
    request.on("error", reject);
    request.end(body);
  });
}

const subjects = JSON.parse(readFileSync(SUBJECTS_PATH, "utf8"));
const contractNumbers = args("contract", [subjects.items[0]?.regNumber]);
const items = contractNumbers.map((number) => {
  const item = subjects.items.find((entry) => entry.regNumber === number);
  if (!item) throw new Error(`Контракт ${number} не найден в ${SUBJECTS_PATH}`);
  return item;
});

const snapshot = loadCivilSnapshot(SNAPSHOT_PATH);
const snapshotSha256 = createHash("sha256")
  .update(readFileSync(SNAPSHOT_PATH, "utf8"))
  .digest("hex")
  .toUpperCase();

const model = arg("model", DEFAULT_CIVIL_MODEL);
const maxCandidates = Number(arg("max-candidates", "120"));
const maxMinutes = Number(arg("max-minutes", "110"));
// Один ответ 14B-модели на длинном промпте может идти дольше 20 минут.
// Таймаут вынесен в аргумент, чтобы не падал весь пакет на последнем контракте.
const requestTimeoutMinutes = Number(arg("request-timeout-minutes", "20"));
const outdir = arg("outdir", path.join(os.tmpdir(), "opencode"));
const generate = async ({ model: modelName, prompt }) => {
  const body = await postJson(
    `${OLLAMA_URL}/api/generate`,
    {
      model: modelName,
      prompt,
      stream: false,
      format: "json",
      options: { temperature: 0, num_ctx: 32768 },
    },
    requestTimeoutMinutes * 60 * 1000,
  );
  return body.response;
};

const batchStartedAt = Date.now();
const summary = [];
for (const item of items) {
  const elapsedBefore = Date.now() - batchStartedAt;
  if (elapsedBefore > maxMinutes * 60 * 1000) {
    console.log(`Лимит ${maxMinutes} мин исчерпан, дальше не прогоняем`);
    break;
  }

  // Только объект закупки: ни описания из проекта контракта, ни filledPaths.
  const project = { subject: { objectName: item.contractName, okpd2Code: "" } };
  const requirementsResult = buildContractRequirements(project, snapshot);
  const startedAt = Date.now();
  const result = await analyzeCivilWithLlm({
    project,
    snapshot,
    requirementsResult,
    generate,
    model,
    snapshotSha256,
    maxCandidates,
  });
  const elapsedMs = Date.now() - startedAt;
  const output = {
    contract: item.regNumber,
    contractName: item.contractName,
    deterministic: {
      kind: requirementsResult.classification.effectiveKind,
      institutes: requirementsResult.classification.institutes.map((entry) => entry.id),
      // В снимке предметов кодов ОКПД2 нет, поэтому сверка здесь будет unknown.
      okpd2Consistency: requirementsResult.classification.okpd2Consistency,
    },
    ...result,
    elapsedMs,
  };
  const outPath = path.join(outdir, `gk-llm-${item.regNumber}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  summary.push({
    contract: item.regNumber,
    status: output.status,
    subject: output.subject,
    modes: output.summary,
    hasImperativeFindings: output.hasImperativeFindings,
    rejected: output.rejected.length,
    diagnostics: output.diagnostics,
    elapsedMs,
    outPath,
  });
  console.log(JSON.stringify(summary[summary.length - 1], null, 2));
}

writeFileSync(
  path.join(outdir, "gk-llm-batch-summary.json"),
  JSON.stringify(
    { model, maxCandidates, maxMinutes, requestTimeoutMinutes, summary },
    null,
    2,
  ),
  "utf8",
);
