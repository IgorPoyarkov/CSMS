/** Типы общего ядра civil-law: используется конструктором проекта контракта. */

export interface CivilArticle {
  article?: string;
  url: string;
  htmlSha256?: string;
  textSha256: string;
  text: string;
}

export interface CivilSnapshot {
  kind?: string;
  fetchedAt?: string;
  method?: string;
  acts: Record<string, { articles: Record<string, CivilArticle> }>;
}

export interface CivilInstitute {
  id: string;
  label: string;
  special: boolean;
  articles: string[];
  pendingArticles: string[];
  source: string;
  priority: "special" | "general";
}

export interface CivilMismatch {
  detected: boolean;
  declared?: string;
  object?: string;
  basis?: string[];
  severity?: "high" | "medium";
}

/** Первая отсечка: вид предмета против кода ОКПД2 — сигнал к сверке, не вердикт. */
export interface CivilOkpd2Consistency {
  declared: string;
  source: "form" | "subject";
  code: string;
  signal: string;
  status: "match" | "mismatch" | "ambiguous" | "unknown";
  confidence: number;
  message: string;
}

export interface CivilClassification {
  declaredKind: string;
  objectKind: string;
  effectiveKind: string;
  okpd2Consistency: CivilOkpd2Consistency;
  institutes: CivilInstitute[];
  mismatch: CivilMismatch;
  exceptions: string[];
  reviewRequired: boolean;
  confidence: number;
  reasons: string[];
  notes: string[];
}

export interface CivilLegalBasisItem {
  reference: string;
  institute: string;
  priority: string;
  normKind: string;
  quote: string;
  sourceUrl: string;
  textSha256: string;
}

export interface CivilRequirementQuote {
  reference: string;
  quote: string;
  sourceUrl: string;
  textSha256: string;
  normKind: "imperative" | "dispositive";
  qualifiers: string[];
}

export interface CivilRequirement {
  id: string;
  title: string;
  description: string;
  sectionId: string;
  priority: "fz44-imperative" | "gk-special" | "gk-general" | "gk-dispositive";
  paths: string[];
  filledPaths: string[];
  missingPaths: string[];
  status: "filled" | "partial" | "missing" | "overridden";
  quotes: CivilRequirementQuote[];
  /** imperative — жёсткое требование; dispositive/mixed — есть оговорка «иное по договорённости». */
  normKind: "imperative" | "dispositive" | "mixed" | "unknown";
  qualifierNotes: Array<{ reference: string; quote: string }>;
  articleRefs: string[];
}

export interface CivilRequirementsResult {
  classification: CivilClassification;
  legalBasis: CivilLegalBasisItem[];
  requirements: CivilRequirement[];
  counts: {
    total: number;
    filled: number;
    partial: number;
    missing: number;
    overridden: number;
  };
  pendingArticles: Array<{
    reference: string;
    institute: string;
    label: string;
  }>;
}

export const ACT_CODES: Readonly<Record<string, string>>;
export const CIVIL_INSTITUTES: Readonly<
  Record<
    string,
    {
      label: string;
      kind: string;
      articles: string[];
      special: boolean;
      pendingArticles?: string[];
    }
  >
>;
export const FZ44_ARTICLE34_MATRIX: ReadonlyArray<{
  topic: string;
  fz44: string;
  gk: string[];
  priority: string;
}>;
export const CIVIL_CONTRACT_REQUIREMENTS: ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  sectionId: string;
  kinds?: string[];
  institutes?: string[];
  paths: string[];
  priority: string;
  quotes: Array<{ reference: string; paragraph?: string | number }>;
}>;

export function articleText(snapshot: CivilSnapshot, reference: string): string | null;
export function classifyNormKind(text: string): string;
export function findNormQualifiers(text: string): string[];
export function okpd2Signal(
  code: string | number | null | undefined,
  name?: string | null,
): {
  kind: "goods" | "works" | "services" | "ambiguous" | "unknown";
  confidence: number;
};
export function resolveOkpd2Kinds(
  items: Array<{ code: string; name?: string | null }>,
): Map<
  string,
  {
    kind: "goods" | "works" | "services" | "ambiguous" | "unknown";
    confidence: number;
  }
>;
export function normalizeDeclaredKind(value: unknown):
  | "goods"
  | "works"
  | "services"
  | "unknown";
export function classifyProcurement(input?: {
  subject?: string;
  objectName?: string;
  characteristics?: string;
  okpd2Code?: string;
  okpd2Codes?: string[];
  declaredKind?: string;
  flags?: { lifecycle?: boolean };
}): CivilClassification;
export function buildLegalBasis(
  result: CivilClassification,
  snapshot: CivilSnapshot,
): CivilLegalBasisItem[];
export function validateAgainstSnapshot(
  result: CivilClassification,
  snapshot: CivilSnapshot,
): { ok: boolean; missing: string[] };
export function buildContractRequirements(
  project: unknown,
  snapshot: CivilSnapshot,
): CivilRequirementsResult;
