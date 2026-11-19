import type { NpaRuleInfo } from "./npa.api";

/**
 * Синхронный доступ к правилам НПА для проверок, которые исторически считаются
 * внутри формы (zod-схемы, useMemo, обработчики onChange). Индекс публикует
 * `useOkpd2Dictionary`: когда справочник загружен, все такие проверки видят
 * актуальные правила 471-р / 1875 вместо жёстко зашитых префиксов.
 */
export interface NpaResolvedRule {
  documentCode: string;
  matchedCode: string;
  ruleType: NpaRuleInfo["ruleType"];
  conditionText: string | null;
  status: NpaRuleInfo["status"];
  needsReview: boolean;
}

type DirectRuleIndex = Record<string, NpaRuleInfo[]>;

let directRules: DirectRuleIndex = {};

export const setNpaDirectRules = (rules: DirectRuleIndex | null): void => {
  // Ключи сохраняем даже для пустых актов: это признак того, что индекс
  // загружен и fallback на устаревшие префиксы больше не нужен.
  directRules = rules ?? {};
};

export const isNpaIndexLoaded = (documentCode: string): boolean =>
  Object.prototype.hasOwnProperty.call(directRules, documentCode);

/** Код ОКПД2 в каноническом виде — как `NpaRuleSets.NormalizeCode` на бэке. */
const normalizeCode = (raw: string): string =>
  raw.trim().replace(/,/g, ".").replace(/\s/g, "").replace(/^\.+|\.+$/g, "");

/** Код-потомок: 01.4 не является родителем 01.41 (граница по точке). */
const isUnder = (code: string, parent: string): boolean =>
  code.length > parent.length &&
  code.startsWith(parent) &&
  code[parent.length] === ".";

const statusWeight = (rule: NpaRuleInfo): number =>
  rule.status === "needs_review" || rule.status === "rejected" ? 0 : 1;

/**
 * Самый длинный префикс побеждает. При равной длине сначала идёт правило,
 * подтверждённое автоматически, затем исключение (как и в дереве бэка).
 */
export const resolveNpaRule = (
  documentCode: string,
  rawCode: string | undefined,
): NpaResolvedRule | null => {
  const code = normalizeCode(rawCode ?? "");
  if (!code) {
    return null;
  }

  let best: NpaRuleInfo | null = null;
  let bestCode = "";
  let bestWeight = -1;

  for (const rule of directRules[documentCode] ?? []) {
    if (rule.status === "rejected") {
      continue;
    }

    const ruleCode = normalizeCode(rule.okpd2Code);
    if (ruleCode !== code && !isUnder(code, ruleCode)) {
      continue;
    }

    const weight =
      ruleCode.length * 4 + statusWeight(rule) * 2 + (rule.ruleType === "exclude" ? 1 : 0);

    if (weight > bestWeight) {
      best = rule;
      bestCode = ruleCode;
      bestWeight = weight;
    }
  }

  if (!best) {
    return null;
  }

  return {
    documentCode,
    matchedCode: bestCode,
    ruleType: best.ruleType,
    conditionText: best.conditionText,
    status: best.status,
    needsReview: best.status === "needs_review",
  };
};
