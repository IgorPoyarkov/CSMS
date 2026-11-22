import assert from "node:assert/strict";
import { test } from "node:test";

import { loadCivilSnapshot } from "../lib/civil-law.mjs";
import { buildContractRequirements } from "../lib/civil-law-core.mjs";
import {
  analyzeCivilWithLlm,
  buildCandidateParagraphs,
  buildCivilLlmPrompt,
  validateCivilLlmResponse,
} from "../lib/civil-law-llm.mjs";

const snapshot = loadCivilSnapshot();
const project = {
  subject: {
    objectName: "Ремонт здания школы",
    description: "Выполнение работ по капитальному ремонту здания",
    okpd2Code: "43.21.10.000",
  },
};
const requirements = buildContractRequirements(project, snapshot);
const candidates = buildCandidateParagraphs(snapshot, requirements);

test("кандидаты берутся только из статей ядра и снимка", () => {
  assert.ok(candidates.length > 20);
  assert.ok(candidates.some((item) => item.ref === "gk2:702"));
  assert.ok(candidates.some((item) => item.ref === "fz44:34"));
  assert.ok(candidates.every((item) => item.text && item.paragraph > 0));
  assert.equal(
    new Set(candidates.map((item) => `${item.ref}#${item.paragraph}`)).size,
    candidates.length,
  );
});

test("промпт требует дословные цитаты и содержит все статьи", () => {
  const prompt = buildCivilLlmPrompt({ candidates, project, requirementsResult: requirements });
  assert.match(prompt, /дословная подстрока/);
  assert.match(prompt, /Не используй другие нормы/);
  for (const ref of new Set(candidates.map((item) => item.ref))) {
    assert.ok(prompt.includes(ref), `в промпте нет ${ref}`);
  }
});

test("дословная цитата из снимка подтверждается", () => {
  const candidate = candidates.find((item) => item.ref === "gk2:702");
  const quote = candidate.text.slice(0, 80);
  const result = validateCivilLlmResponse(
    {
      subject: { kind: "works", consistency: "match", reason: "Объект и предмет совпадают" },
      findings: [
        {
          mode: "required",
          ref: candidate.ref,
          paragraph: candidate.paragraph,
          quote,
          condition: "В контракте указать определённую работу и её результат",
        },
      ],
    },
    { candidates, snapshot, snapshotSha256: "test-sha" },
  );
  assert.equal(result.status, "confirmed");
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].grounded, true);
  assert.equal(result.findings[0].quoteSource, "model");
  assert.equal(result.findings[0].textSha256, candidate.textSha256);
  assert.equal(result.snapshotSha256, "test-sha");
});

test("пересказанная цитата заменяется текстом снимка, статья вне списка отбрасывается", () => {
  const candidate = candidates.find((item) => item.ref === "gk2:702");
  const result = validateCivilLlmResponse(
    {
      subject: { kind: "works", consistency: "match", reason: "" },
      findings: [
        {
          mode: "required",
          ref: candidate.ref,
          paragraph: candidate.paragraph,
          quote: "Заказчик обязан принять результат в течение пяти лет",
          condition: "Условие о приёмке результата",
        },
        {
          mode: "prohibited",
          ref: "gk2:999",
          paragraph: 1,
          quote: "Не допускается заключать такой контракт",
          condition: "Статьи нет в снимке",
        },
      ],
    },
    { candidates, snapshot },
  );
  assert.equal(result.status, "preliminary");
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].quoteSource, "snapshot");
  assert.equal(result.findings[0].quote, candidate.text);
  assert.equal(result.rejected.length, 1);
  assert.match(result.diagnostics[0], /пересказала цитату/);
});

test("честный отказ модели сохраняется как unconfirmed", () => {
  const result = validateCivilLlmResponse(
    {
      subject: { kind: "unknown", consistency: "unclear", reason: "Данных недостаточно" },
      findings: [],
    },
    { candidates, snapshot },
  );
  assert.equal(result.status, "unconfirmed");
  assert.equal(result.findings.length, 0);
  assert.match(result.diagnostics[0], /прямых указаний/);
});

test("оркестратор использует переданную модель и не доверяет ответу", async () => {
  const candidate = candidates.find((item) => item.ref === "gk2:703");
  const result = await analyzeCivilWithLlm({
    project,
    snapshot,
    requirementsResult: requirements,
    generate: async ({ model, prompt }) => {
      assert.equal(model, "test-model");
      assert.ok(prompt.includes("gk2:703"));
      return JSON.stringify({
        subject: { kind: "works", consistency: "match", reason: "Подряд" },
        findings: [
          {
            mode: "required",
            ref: candidate.ref,
            paragraph: candidate.paragraph,
            quote: candidate.text.slice(0, 60),
            condition: "Передать результат работы",
          },
        ],
      });
    },
    model: "test-model",
  });
  assert.equal(result.model, "test-model");
  assert.equal(result.candidateCount, candidates.length);
  assert.equal(result.requiresHumanReview, true);
  assert.equal(result.status, "confirmed");
});
