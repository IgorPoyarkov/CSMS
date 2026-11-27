/**
 * Проверка офлайн-агента ООЗ: снимок должен разбираться фронтовой схемой,
 * а все подсказки — иметь дословную цитату из исходного снимка ГОСТа или НПА.
 *
 * Запуск: node scripts/run-ts-check.mjs scripts/check-ooz-agent.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  findAgentDocuments,
  findAgentSuggestions,
  OozAgentSnapshotSchema,
} from "../src/services/OozAgent/oozAgent.schema";
import {
  findGostRequirements,
  GostRequirementsCatalogSchema,
} from "../src/services/GostRef/gostRequirements.schema";

const readJson = (rel: string) =>
  JSON.parse(readFileSync(path.resolve(rel), "utf8"));

const agent = OozAgentSnapshotSchema.parse(
  readJson("public/gost/ooz-agent.json"),
);
const requirements = GostRequirementsCatalogSchema.parse(
  readJson("public/gost/requirements.json"),
);
const npa = readJson("docs/snapshots/civil-code-snapshot.json");
const article33: string = npa.acts.fz44.articles["33"].text;

let checks = 0;
let failures = 0;
const assert = (condition: boolean, message: string) => {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`  ✗ ${message}`);
  }
};

assert(/^ooz-agent-\d{8}-[0-9a-f]{12}$/.test(agent.version), "версия снимка");
assert(agent.documents.length > 0, "агент нашёл документы");
assert(agent.suggestions.length > 0, "агент дал подсказки");
assert(
  agent.suggestions.every((item) => item.quote.trim().length > 0),
  "у каждой подсказки есть цитата",
);
assert(
  agent.suggestions.every((item) => item.value.trim().length > 0),
  "у каждой подсказки есть значение",
);
assert(
  agent.suggestions.every(
    (item) =>
      ["confirmed", "needs_review", "unconfirmed"].includes(item.status) &&
      item.confidence >= 0 &&
      item.confidence <= 1,
  ),
  "анти-галлюцинационные статусы подсказок заполнены",
);
assert(
  agent.suggestions
    .filter((item) => item.kind === "GOST")
    .every((item) => item.status === "confirmed" && item.confidence === 1),
  "требования ГОСТа помечены проверенными",
);
assert(
  agent.suggestions
    .filter((item) => item.kind === "NPA")
    .every((item) => item.status === "needs_review" && item.confidence < 1),
  "подсказки НПА не выдаются за доказанные",
);

for (const doc of agent.documents) {
  assert(
    doc.okpd2Codes.length > 0,
    `документ ${doc.code} привязан к ОКПД2`,
  );
}

for (const suggestion of agent.suggestions.filter((item) => item.kind === "GOST")) {
  const known = findGostRequirements(requirements, suggestion.source);
  assert(
    known.some(
      (item) =>
        item.field === suggestion.field &&
        item.value === suggestion.value &&
        item.quote === suggestion.quote,
    ),
    `цитата ГОСТа дословная: ${suggestion.source} / ${suggestion.field}`,
  );
}
for (const suggestion of agent.suggestions.filter((item) => item.kind === "NPA")) {
  assert(
    article33.includes(suggestion.quote),
    `цитата НПА дословная: ${suggestion.field}`,
  );
}

const docs = findAgentDocuments(agent, "49.31.21.110");
assert(
  docs.some((doc) => doc.code === "ГОСТ 30593-2015" && doc.kind === "GOST"),
  "ГОСТ из плана-графика попал к ОКПД2 49.31.21.110",
);
assert(
  docs.some((doc) => doc.code === "ТР ТС 018/2011" && doc.status === "needs_full_text"),
  "ТР ТС попал в агент как документ без полного текста",
);
assert(
  docs.some((doc) => doc.code.includes("220-ФЗ")),
  "ФЗ из карточки КТРУ попал в агент",
);
assert(
  findAgentSuggestions(agent, "ГОСТ 30593 - 2015").some(
    (item) => item.kind === "NPA",
  ),
  "подсказки ст. 33 доступны при выбранном ГОСТе",
);
const npaOnly = findAgentSuggestions(agent, "");
assert(
  npaOnly.length > 0 && npaOnly.every((item) => item.kind === "NPA"),
  "нормы ст. 33 доступны и без выбранного ГОСТа",
);

console.log(`Агент ООЗ: ${checks - failures}/${checks} — ок`);
if (failures) process.exitCode = 1;
