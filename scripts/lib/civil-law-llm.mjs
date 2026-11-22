/**
 * LLM-слой для ГК РФ + 44-ФЗ (P4).
 *
 * Принцип: модель не изобретает нормы. Ей передаются только дословные абзацы
 * зафиксированного снимка; каждый найденный вывод обязан содержать точную
 * цитату из переданного абзаца. Всё, что не прошло проверку, попадает в
 * `rejected` с причиной и не считается найденным условием.
 */
import { articleText } from "./civil-law-core.mjs";

export const DEFAULT_CIVIL_MODEL = "qwen2.5:14b-instruct-q4_K_M";

const MODES = Object.freeze(["required", "permitted", "prohibited"]);
const CONSISTENCY = Object.freeze(["match", "mismatch", "unclear"]);

const norm = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

/** Статьи, без которых нельзя судить о предмете договора и госнуждах. */
const CORE_REFERENCES = Object.freeze([
  "fz44:34",
  "gk1:432",
  "gk1:424",
  "gk2:454",
  "gk2:506",
  "gk2:702",
  "gk2:703",
  "gk2:779",
]);

/**
 * Готовит плоский список абзацев снимка, которые можно показать модели.
 * Источник — только статьи из ядра P0–P1): ничего внешнего и никаких новых
 * формулировок.
 */
export function buildCandidateParagraphs(
  snapshot,
  requirementsResult,
  { maxCandidates = 120 } = {},
) {
  const refs = new Set(CORE_REFERENCES);
  for (const basis of requirementsResult?.legalBasis ?? []) {
    if (basis?.reference) refs.add(basis.reference);
  }
  for (const requirement of requirementsResult?.requirements ?? []) {
    for (const reference of requirement?.articleRefs ?? []) refs.add(reference);
  }

  // Берём абзацы «по кругу»: так все статьи остаются представленными, даже
  // если лимит кандидатов меньше общего числа абзацев снимка.
  const byReference = new Map();
  for (const reference of refs) {
    const text = articleText(snapshot, reference);
    if (!text) continue;
    const [act, heading] = String(reference).split(":");
    const meta = snapshot.acts?.[act]?.articles?.[heading];
    const paragraphs = [];
    text.split("\n").forEach((line, index) => {
      const clean = norm(line);
      if (!clean || new RegExp(`^Статья\\s+${heading}\\.`).test(clean)) return;
      paragraphs.push({
        ref: reference,
        paragraph: index + 1,
        text: clean,
        sourceUrl: meta?.url ?? null,
        textSha256: meta?.textSha256 ?? null,
      });
    });
    if (paragraphs.length) byReference.set(reference, paragraphs);
  }

  const candidates = [];
  const orderedRefs = [...byReference.keys()].sort();
  for (let index = 0; candidates.length < maxCandidates; index += 1) {
    let added = false;
    for (const reference of orderedRefs) {
      const paragraph = byReference.get(reference)[index];
      if (!paragraph) continue;
      candidates.push(paragraph);
      added = true;
      if (candidates.length >= maxCandidates) break;
    }
    if (!added) break;
  }
  return candidates;
}

/** Собирает жёсткий промпт: модель видит только переданные фрагменты. */
export function buildCivilLlmPrompt({
  candidates,
  project,
  requirementsResult,
}) {
  const classification = requirementsResult?.classification ?? {};
  const subject = {
    objectName: project?.subject?.objectName ?? "",
    description: project?.subject?.description ?? "",
    okpd2Code: project?.subject?.okpd2Code ?? "",
  };
  const filledFields = (requirementsResult?.requirements ?? [])
    .flatMap((item) => item?.filledPaths ?? [])
    .filter((value, index, all) => all.indexOf(value) === index);

  return [
    "Ты помогаешь юристу проверить проект государственного контракта по 44-ФЗ.",
    "Ниже ТОЛЬКО дословные фрагменты фиксированного снимка ГК РФ и 44-ФЗ.",
    "Не используй другие нормы и не воспроизводи текст норм по памяти.",
    "",
    "Задача:",
    "1) по описанию предмета определить вид договора и сверить его с указанным объектом контракта;",
    "2) из приведённых фрагментов выбрать нормы, которые ПРЯМО предписывают:",
    "   required — что должно быть в контракте, permitted — что может быть, prohibited — чего не должно быть;",
    "3) если прямого указания в приведённых фрагментах нет, вернуть пустой findings и объяснить это в reason.",
    "",
    "Правила ответа:",
    "- ref и paragraph бери только из списка фрагментов;",
    "- quote — необязательная подсказка: краткая дословная подстрока. Если не уверен в дословности, оставь quote пустым: система сама подставит текст абзаца из снимка;",
    "- condition — коротко, какое условие контракта следует из нормы;",
    "- не пересказывай норму вместо цитаты и не изобретай другие статьи;",
    "- ответ строго в JSON, без пояснений вне JSON.",
    "",
    "Предмет контракта: " + JSON.stringify(subject),
    "Классификация ядра: " + JSON.stringify(classification),
    "Уже заполненные поля: " + JSON.stringify(filledFields),
    "",
    "Фрагменты снимка:",
    JSON.stringify(candidates.map(({ ref, paragraph, text }) => ({ ref, paragraph, text }))),
    "",
    'Формат: {"subject":{"kind":"...","consistency":"match|mismatch|unclear","reason":"..."},"findings":[{"mode":"required|permitted|prohibited","ref":"...","paragraph":1,"quote":"...","condition":"..."}]}',
  ].join("\n");
}

function parseJsonResponse(raw) {
  if (typeof raw === "object" && raw !== null) return raw;
  const text = String(raw ?? "").trim();
  const clean = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Ответ модели не содержит JSON-объекта");
  return JSON.parse(clean.slice(start, end + 1));
}

/**
 * Проверяет ответ модели по снимку. Модель выбирает статью, пункт и режим;
 * дословный текст цитаты подставляется из снимка. Пересказанная моделью
 * цитата не отбрасывает находку, а заменяется текстом абзаца — так результат
 * всегда содержит только проверенную формулировку нормы.
 */
export function validateCivilLlmResponse(raw, { candidates, snapshot, snapshotSha256 = null }) {
  const rejected = [];
  let parsed;
  try {
    parsed = parseJsonResponse(raw);
  } catch (error) {
    return {
      status: "unconfirmed",
      subject: { kind: "unknown", consistency: "unclear", reason: "" },
      findings: [],
      rejected: [],
      snapshotSha256,
      diagnostics: [`Не удалось разобрать ответ модели: ${error.message}`],
    };
  }

  const byRefParagraph = new Map(
    candidates.map((item) => [`${item.ref}#${item.paragraph}`, item]),
  );
  const normalizedCandidates = new Map(
    candidates.map((item) => [`${item.ref}#${item.paragraph}`, norm(item.text)]),
  );

  const rawSubject = parsed.subject ?? {};
  const subject = {
    kind: typeof rawSubject.kind === "string" ? rawSubject.kind : "unknown",
    consistency: CONSISTENCY.includes(rawSubject.consistency)
      ? rawSubject.consistency
      : "unclear",
    reason: typeof rawSubject.reason === "string" ? rawSubject.reason : "",
  };
  if (subject.consistency === "mismatch" && !subject.reason) {
    rejected.push({ field: "subject", reason: "Расхождение предмета и объекта без обоснования" });
    subject.consistency = "unclear";
  }

  const findings = [];
  const seen = new Set();
  const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];
  let adjustedQuotes = 0;
  for (const [index, item] of rawFindings.entries()) {
    const key = `${item?.ref}#${item?.paragraph}`;
    const candidate = byRefParagraph.get(key);
    if (!MODES.includes(item?.mode)) {
      rejected.push({ index, reason: "Неизвестный mode", raw: item });
      continue;
    }
    if (!candidate) {
      rejected.push({ index, reason: "Ссылки нет среди переданных фрагментов", raw: item });
      continue;
    }
    if (typeof item?.condition !== "string" || !item.condition.trim()) {
      rejected.push({ index, reason: "Нет формулировки условия", raw: item });
      continue;
    }
    const modelQuote = norm(item?.quote);
    const exact =
      modelQuote.length >= 10 && normalizedCandidates.get(key)?.includes(modelQuote);
    if (!exact) adjustedQuotes += 1;
    const quote = exact ? String(item.quote).trim() : candidate.text;
    const dedupe = `${key}|${item.mode}|${quote}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    findings.push({
      mode: item.mode,
      ref: item.ref,
      paragraph: item.paragraph,
      quote,
      quoteSource: exact ? "model" : "snapshot",
      condition: item.condition.trim(),
      sourceUrl: candidate.sourceUrl,
      textSha256: candidate.textSha256 ?? null,
    });
  }

  // Дополнительная страховка: даже если модель «вернула» статью, её текст
  // обязан совпадать с хешем снимка.
  for (const finding of findings) {
    const text = articleText(snapshot, finding.ref);
    if (!text || !norm(text).includes(norm(finding.quote))) {
      finding.grounded = false;
      rejected.push({ ref: finding.ref, reason: "Хеш/текст статьи снимка не подтвердил цитату" });
    } else {
      finding.grounded = true;
    }
  }
  const grounded = findings.filter((item) => item.grounded !== false);
  const failed = findings.filter((item) => item.grounded === false);

  const status =
    grounded.length === 0
      ? "unconfirmed"
      : rejected.length || failed.length
        ? "preliminary"
        : "confirmed";

  const diagnostics = [];
  if (status === "unconfirmed" && !rawFindings.length) {
    diagnostics.push("Модель не нашла прямых указаний в переданных фрагментах снимка");
  }
  if (adjustedQuotes > 0) {
    diagnostics.push(
      `Для ${adjustedQuotes} выводов модель пересказала цитату: использован дословный абзац снимка`,
    );
  }

  return {
    status,
    subject,
    findings: grounded,
    rejected: [...rejected, ...failed.map((item) => ({ ref: item.ref, reason: "Цитата не подтверждена снимком" }))],
    snapshotSha256,
    diagnostics,
  };
}

/** Полный прогон: категории → промпт → модель → валидация. */
export async function analyzeCivilWithLlm({
  project,
  snapshot,
  requirementsResult,
  generate,
  model = DEFAULT_CIVIL_MODEL,
  snapshotSha256 = null,
  maxCandidates = 120,
}) {
  const candidates = buildCandidateParagraphs(snapshot, requirementsResult, {
    maxCandidates,
  });
  const prompt = buildCivilLlmPrompt({ candidates, project, requirementsResult });
  const raw = await generate({ model, prompt });
  const validated = validateCivilLlmResponse(raw, {
    candidates,
    snapshot,
    snapshotSha256,
  });
  return {
    ...validated,
    model,
    candidateCount: candidates.length,
    requiresHumanReview: true,
  };
}
