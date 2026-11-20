/**
 * Контракт ответов csms-api с каталогом приложения N 2 ПП РФ N 2604.
 * Источник — официальный портал опубликования; коды ОКПД2 в приложении
 * отсутствуют, поэтому каждая связь несёт `basis`, `source` и `needsReview`.
 */
export interface Pp2604Source {
  act: string;
  appendix: string;
  portal: string;
  eoNumber: string;
  pdfPages: string;
  classifier: string;
}

export interface Pp2604Category {
  id: string;
  label: string;
  appendixRow: number;
  appendixName: string;
  minPrice: number;
  maxExpenses: number | null;
  maxNonCost: number;
  sourcePage: number;
}

export type Pp2604RuleBasis = "classifier" | "purpose" | "residual";

export interface Pp2604Rule {
  prefix: string;
  category: string;
  row: number;
  basis: Pp2604RuleBasis;
  classifierName: string;
  condition: string | null;
  needsReview: boolean;
  purpose: string | null;
  source: string;
  sortOrder: number;
}

export interface Pp2604Mapping {
  version: string;
  rulesVersion: string;
  eoNumber: string;
  apiUrl: string;
  pdfUrl: string;
  pdfSha256: string;
  documentTitle: string;
  documentDate: string | null;
  publishDate: string | null;
  pagesCount: number | null;
  appendixPages: string;
  extractionMethod: string;
  importedAt: string;
  source: Pp2604Source;
  categories: Pp2604Category[];
  rules: Pp2604Rule[];
}

export interface Pp2604Resolution {
  code: string;
  category?: string;
  row?: number;
  basis?: Pp2604RuleBasis;
  source?: string;
  needsReview: boolean;
  reason?: string;
}
