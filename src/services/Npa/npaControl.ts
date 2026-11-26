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
  /** ban / restriction — приложение акта (ПП № 1875); null для прочих актов. */
  regime: NpaRuleInfo["regime"];
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

const ruleWeight = (rule: NpaRuleInfo, ruleCode = normalizeCode(rule.okpd2Code)): number =>
  ruleCode.length * 4 + statusWeight(rule) * 2 + (rule.ruleType === "exclude" ? 1 : 0);

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

    const weight = ruleWeight(rule, ruleCode);

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
    regime: best.regime ?? null,
  };
};

/** Индекс прямых правил по коду: 21 066 кодов не годятся для перебора массива. */
export type NpaRuleIndex = Map<string, NpaRuleInfo>;

export const buildNpaRuleIndex = (rules: readonly NpaRuleInfo[]): NpaRuleIndex => {
  const index: NpaRuleIndex = new Map();

  for (const rule of rules) {
    if (rule.status === "rejected") {
      continue;
    }

    const code = normalizeCode(rule.okpd2Code);
    const current = index.get(code);
    if (!current || ruleWeight(rule, code) > ruleWeight(current, code)) {
      index.set(code, rule);
    }
  }

  return index;
};

/** Сам код и все родители через точку: 32.50.13.190 → … → 32.50.13 → 32. */
const codeAncestors = (rawCode: string): string[] => {
  const code = normalizeCode(rawCode);
  const result: string[] = [];

  for (let current = code; current.length > 0; ) {
    result.push(current);
    const dot = current.lastIndexOf(".");
    if (dot < 1) {
      break;
    }
    current = current.slice(0, dot);
  }

  return result;
};

/** Быстрый аналог resolveNpaRule для массовой разметки справочника. */
export const resolveIndexedNpaRule = (
  documentCode: string,
  index: NpaRuleIndex,
  rawCode: string | undefined,
): NpaResolvedRule | null => {
  const code = normalizeCode(rawCode ?? "");
  if (!code) {
    return null;
  }

  for (const parent of codeAncestors(code)) {
    const rule = index.get(parent);
    if (!rule) {
      continue;
    }

    return {
      documentCode,
      matchedCode: parent,
      ruleType: rule.ruleType,
      conditionText: rule.conditionText,
      status: rule.status,
      needsReview: rule.status === "needs_review",
      regime: rule.regime ?? null,
    };
  }

  return null;
};

/**
 * Флаг обязательного нормирования по правилам акта (ПП РФ № 926).
 * `null` означает «нет безопасных данных»: правило требует проверки,
 * условие не вычисляется автоматически или акт ещё не разобран.
 */
export interface NpaNormingFlag {
  isNormed: boolean | null;
  needsReview: boolean;
  matchedCode: string | null;
  status: NpaRuleInfo["status"] | null;
  ruleType: NpaRuleInfo["ruleType"] | null;
}

export const normingFlagFromRule = (rule: NpaResolvedRule | null): NpaNormingFlag => {
  if (!rule) {
    return {
      isNormed: null,
      needsReview: false,
      matchedCode: null,
      status: null,
      ruleType: null,
    };
  }

  // Условное правило и предложения LLM не дают права выставлять «да»:
  // человек должен подтвердить конкретную запись через /verify.
  const isNormed =
    rule.needsReview || rule.ruleType === "conditional"
      ? null
      : rule.ruleType === "include";

  return {
    isNormed,
    needsReview: rule.needsReview,
    matchedCode: rule.matchedCode,
    status: rule.status,
    ruleType: rule.ruleType,
  };
};
