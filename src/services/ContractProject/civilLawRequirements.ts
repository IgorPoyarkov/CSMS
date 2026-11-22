import civilSnapshot from "../../../docs/snapshots/civil-code-snapshot.json";
import {
  buildContractRequirements,
  type CivilRequirementsResult,
  type CivilSnapshot,
} from "../../../scripts/lib/civil-law-core.mjs";
import type { ContractProject } from "./contractProject.schema";

/**
 * Снимок КонсультантПлюс от 2026-11-22. Хеш зафиксирован в
 * docs/tasks/civil-code-clause-suggestions.md: версия меняется вместе со снимком.
 */
export const CIVIL_SNAPSHOT_SHA256 =
  "443E72D5AE017D7375E192A2010C9E11EC682E03792C70894B0604974EE87244";

export interface ContractCivilAnalysis extends CivilRequirementsResult {
  fetchedAt: string;
  snapshotSha256: string;
}

export const CIVIL_KIND_LABELS: Record<string, string> = {
  goods: "Товар",
  works: "Работа",
  services: "Услуга",
  unknown: "Не определено",
  ambiguous: "Неоднозначно",
};

export const CIVIL_PRIORITY_LABELS: Record<string, string> = {
  "fz44-imperative": "Императив 44-ФЗ",
  "gk-special": "Спецнорма ГК для госнужд",
  "gk-general": "Общая норма ГК",
  "gk-dispositive": "Диспозитивная норма ГК",
};

export const CIVIL_STATUS_LABELS: Record<string, string> = {
  filled: "Заполнено",
  partial: "Частично",
  missing: "Не заполнено",
  overridden: "Текст переопределён",
};

/**
 * Анализ обязательных условий проекта контракта по ГК РФ и 44-ФЗ.
 * Классификация и цитаты приходят из того же ядра, что и скрипты P0–P1:
 * фронт не изобретает собственную эвристику и не генерирует текст норм.
 */
export function analyzeContractCivilBasis(
  project: ContractProject,
): ContractCivilAnalysis {
  const result = buildContractRequirements(
    project,
    civilSnapshot as unknown as CivilSnapshot,
  );
  return {
    ...result,
    fetchedAt: civilSnapshot.fetchedAt,
    snapshotSha256: CIVIL_SNAPSHOT_SHA256,
  };
}
