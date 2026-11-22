/**
 * LLM-слой для ГК РФ + 44-ФЗ (P4).
 *
 * Принцип: модель не изобретает нормы. Ей передаются только дословные абзацы
 * зафиксированного снимка; каждый найденный вывод обязан содержать точную
 * цитату из переданного абзаца. Всё, что не прошло проверку, попадает в
 * `rejected` с причиной и не считается найденным условием.
 */
import { articleText, findNormQualifiers } from "./civil-law-core.mjs";

export const DEFAULT_CIVIL_MODEL = "qwen2.5:14b-instruct-q4_K_M";

const MODES = Object.freeze(["required", "permitted", "prohibited", "recommended"]);
const IMPERATIVE_MODES = Object.freeze(["required", "prohibited"]);
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

/**
 * Собирает жёсткий промпт: модель видит только объект закупки, предмет,
 * классификацию ядра для сверки и дословные фрагменты снимка.
 *
 * Содержимое проекта контракта сознательно НЕ передаётся: там могут быть
 * непроверенные и ложные формулировки, которые потянут модель за собой.
 */
export function buildCivilLlmPrompt({
  candidates,
  project,
  requirementsResult,
}) {
  const classification = requirementsResult?.classification ?? {};
  const procurement = {
    object: project?.subject?.objectName ?? "",
    okpd2Code: project?.subject?.okpd2Code ?? "",
  };

  return [
    "Ты помогаешь юристу проверить проект государственного контракта по 44-ФЗ.",
    "Ниже ТОЛЬКО дословные фрагменты фиксированного снимка ГК РФ и 44-ФЗ.",
    "Не используй другие нормы и не воспроизводи текст норм по памяти.",
    "",
    "Задача:",
    "1) по наименованию объекта закупки определить предмет договора и сверить его с этим объектом;",
    "2) из приведённых фрагментов выбрать нормы, которые ПРЯМО предписывают:",
    "   required — что должно быть в контракте, permitted — что может быть, prohibited — чего не должно быть;",
    "3) если прямого указания в приведённых фрагментах нет, вернуть пустой findings и объяснить это в reason;",
    "4) если обязанность отменяется или становится необязательной из-за оговорки в другом пункте той же статьи",
    "   («если иное не предусмотрено договором/соглашением сторон» и т.п.), это НЕ нарушение:",
    "   укажи mode recommended и дословно процитируй оговорку в qualifierQuote.",
    "",
    "Правила ответа:",
    "- ref и paragraph бери только из списка фрагментов;",
    "- смотри все пункты статьи, а не только выбранный абзац: оговорка может быть в соседнем пункте;",
    "- quote — необязательная подсказка: краткая дословная подстрока. Если не уверен в дословности, оставь quote пустым: система сама подставит текст абзаца из снимка;",
    "- condition — коротко, какое условие контракта следует из нормы;",
    "- не используй содержимое проекта контракта как доказательство: формулировки там могут быть непроверенными. Норма проверяется только по снимку;",
    "- не изобретай статьи и не пересказывай норму вместо цитаты;",
    "- ответ строго в JSON, без пояснений вне JSON.",
    "",
    "Объект закупки и косвенный код ОКПД2: " + JSON.stringify(procurement),
    "Предварительная классификация ядра (для сверки, не истина): " + JSON.stringify(classification),
    "",
    "Фрагменты снимка:",
    JSON.stringify(candidates.map(({ ref, paragraph, text }) => ({ ref, paragraph, text }))),
    "",
    'Формат: {"subject":{"kind":"...","consistency":"match|mismatch|unclear","reason":"..."},"findings":[{"mode":"required|permitted|prohibited|recommended","ref":"...","paragraph":1,"quote":"...","qualifierQuote":"...","condition":"..."}]}',
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
      summary: {},
      hasImperativeFindings: false,
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
      // Подсказка модели об оговорке: будет принята, только если эта фраза
      // дословно присутствует в тексте статьи снимка.
      modelQualifierQuote:
        typeof item?.qualifierQuote === "string" ? item.qualifierQuote : "",
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

  // Оговорка в статье («если иное не предусмотрено договором…») снимает
  // императивность: такой вывод не нарушение, а максимум рекомендация.
  // Фраза оговорки принимается только если она дословно есть в снимке.
  const articleCache = new Map();
  let downgraded = 0;
  for (const finding of grounded) {
    if (!articleCache.has(finding.ref)) {
      articleCache.set(finding.ref, articleText(snapshot, finding.ref) ?? "");
    }
    const whole = articleCache.get(finding.ref);
    const paragraphQualifiers = findNormQualifiers(finding.quote);
    const articleQualifiers = findNormQualifiers(whole);
    const hint = norm(finding.modelQualifierQuote);
    const hinted =
      hint.length >= 10 && norm(whole).includes(hint)
        ? [finding.modelQualifierQuote.trim()]
        : [];
    const qualifiers = [...new Set([...hinted, ...paragraphQualifiers, ...articleQualifiers])];
    delete finding.modelQualifierQuote;

    if (qualifiers.length) {
      finding.normKind = "dispositive";
      finding.qualifier = {
        type: "dispositive",
        quote: qualifiers[0],
        source: hinted.length ? "model" : paragraphQualifiers.length ? "paragraph" : "article",
      };
    }
    if (qualifiers.length && IMPERATIVE_MODES.includes(finding.mode)) {
      finding.originalMode = finding.mode;
      finding.mode = "recommended";
      downgraded += 1;
    }
  }

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
  if (downgraded > 0) {
    diagnostics.push(
      `Для ${downgraded} выводов в норме найдена оговорка: режим понижен до recommended, это не нарушение`,
    );
  }

  const summary = grounded.reduce((acc, finding) => {
    acc[finding.mode] = (acc[finding.mode] ?? 0) + 1;
    return acc;
  }, {});

  return {
    status,
    subject,
    findings: grounded,
    rejected: [...rejected, ...failed.map((item) => ({ ref: item.ref, reason: "Цитата не подтверждена снимком" }))],
    summary,
    hasImperativeFindings: grounded.some((item) => IMPERATIVE_MODES.includes(item.mode)),
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
