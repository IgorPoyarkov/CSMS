/**
 * Пилот LLM-анализа ГК РФ по одному контракту из контрольного набора.
 *
 * Пример:
 *   node scripts/civil-law-llm-pilot.mjs --contract 2462904043926000001
 *
 * Модель получает только абзацы зафиксированного снимка; ответ проходит
 * проверку дословных цитат в scripts/lib/civil-law-llm.mjs.
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

const subjects = JSON.parse(readFileSync(SUBJECTS_PATH, "utf8"));
const wanted = arg("contract", subjects.items[0]?.regNumber);
const item = subjects.items.find((entry) => entry.regNumber === wanted);
if (!item) throw new Error(`Контракт ${wanted} не найден в ${SUBJECTS_PATH}`);

const snapshot = loadCivilSnapshot(SNAPSHOT_PATH);
const snapshotSha256 = createHash("sha256")
  .update(readFileSync(SNAPSHOT_PATH, "utf8"))
  .digest("hex")
  .toUpperCase();

const project = {
  subject: {
    objectName: item.contractName,
    description: "",
    okpd2Code: "",
  },
};
const requirementsResult = buildContractRequirements(project, snapshot);
const model = arg("model", DEFAULT_CIVIL_MODEL);
const maxCandidates = Number(arg("max-candidates", "120"));

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
    20 * 60 * 1000,
  );
  return body.response;
};

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
  contract: wanted,
  contractName: item.contractName,
  deterministic: {
    kind: requirementsResult.classification.effectiveKind,
    institutes: requirementsResult.classification.institutes.map((entry) => entry.id),
  },
  ...result,
  elapsedMs,
};

const outPath = arg(
  "out",
  path.join(os.tmpdir(), "opencode", `gk-llm-${wanted}.json`),
);
writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

const byMode = output.findings.reduce((acc, finding) => {
  acc[finding.mode] = (acc[finding.mode] ?? 0) + 1;
  return acc;
}, {});
console.log(
  JSON.stringify(
    {
      contract: wanted,
      status: output.status,
      subject: output.subject,
      findings: byMode,
      rejected: output.rejected.length,
      candidates: output.candidateCount,
      model,
      elapsedMs,
      outPath,
    },
    null,
    2,
  ),
);
