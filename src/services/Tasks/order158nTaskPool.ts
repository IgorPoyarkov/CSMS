import { useQuery } from "@tanstack/react-query";
import type { ContractServiceFunction } from "../ContractService/contractService.schema";
import { npaApi } from "../Npa/npa.api";
import type { TaskExecutionStep } from "./tasks.schema";

/**
 * Пул функций и типовых задач по Приказу № 158н.
 *
 * Данные не лежат в клиентском бандле: API отдаёт активную версию справочника
 * `order158nPool` из БД (41 пункт). На клиенте остаются только чистые функции
 * сборки маршрута и регламентных сроков.
 */

export interface Order158nTaskStepTemplate {
  stageLabel: string;
  title: string;
  detail: string;
  expectedArtifact: string;
  /** Доля планового срока (от 0 до 1) для расчёта контрольной даты этапа */
  relativeProgress: number;
}

export interface Order158nTaskPoolItem {
  id: string;
  clause: string;
  sectionTitle: string;
  functionCode: ContractServiceFunction;
  officialFormulation: string;
  defaultTaskTitle: string;
  defaultTaskDescription: string;
  recommendedDays: number;
  deadlineBasis: string;
  legalReference: string;
  appRoute?: string;
  appRouteLabel?: string;
  requiredInputs: string[];
  completionCriteria: string;
  steps: Order158nTaskStepTemplate[];
  /** Порядок пункта в официальном приказе, приходит из БД. */
  sortIndex: number;
}

export interface Order158nPoolResponse {
  version: string;
  sourceDocument: string;
  sourceUrl: string | null;
  sourceSha256: string | null;
  importedAt: string;
  count: number;
  items: Order158nTaskPoolItem[];
}

export const ORDER_158N_POOL_QUERY_KEY = ["order158nPool"];

export const fetchOrder158nPool = async (
  signal?: AbortSignal,
): Promise<Order158nPoolResponse> => {
  const { data } = await npaApi.get<Order158nPoolResponse>(
    "/api/order158n/pool",
    { signal },
  );

  return data;
};

/** Пул загружается из csms-api один раз и живёт в react-query до перезагрузки. */
export const useOrder158nPool = () =>
  useQuery<Order158nPoolResponse>({
    queryKey: ORDER_158N_POOL_QUERY_KEY,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: ({ signal }) => fetchOrder158nPool(signal),
  });

export const filterPoolItems = (
  pool: Order158nTaskPoolItem[],
  functionCode: ContractServiceFunction | undefined,
): Order158nTaskPoolItem[] =>
  functionCode
    ? pool.filter((item) => item.functionCode === functionCode)
    : pool;

export const findPoolItem = (
  pool: Order158nTaskPoolItem[],
  idOrClause?: string,
): Order158nTaskPoolItem | undefined => {
  if (!idOrClause) return undefined;
  return pool.find(
    (item) => item.id === idOrClause || item.clause === idOrClause,
  );
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDay = (iso?: string): number | null => {
  if (!iso || !ISO_DATE_RE.test(iso)) return null;
  const ms = new Date(`${iso}T00:00:00Z`).getTime();
  return Number.isNaN(ms) ? null : ms;
};

const formatIsoDay = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

export const interpolateStepDueDate = (
  startIso: string | undefined,
  dueIso: string | undefined,
  relativeProgress: number,
): string => {
  const dueMs = parseIsoDay(dueIso);
  if (dueMs === null) return "";

  const startMs = parseIsoDay(startIso);
  if (startMs === null || startMs >= dueMs) {
    return formatIsoDay(dueMs);
  }

  const clamped = Math.max(0, Math.min(1, relativeProgress));
  const targetMs = Math.round(startMs + (dueMs - startMs) * clamped);
  return formatIsoDay(targetMs);
};

export const buildTaskStepsFromPoolItem = (
  item: Order158nTaskPoolItem,
  startIso?: string,
  dueIso?: string,
): TaskExecutionStep[] =>
  item.steps.map((step, index) => ({
    id: `${item.id}-step-${index + 1}`,
    order: index + 1,
    stageLabel: step.stageLabel,
    title: step.title,
    detail: step.detail,
    expectedArtifact: step.expectedArtifact,
    dueDate: interpolateStepDueDate(startIso, dueIso, step.relativeProgress),
    isDone: false,
    completedAt: "",
    completedBy: "",
    note: "",
  }));

export const DEFAULT_GENERIC_STEPS: Order158nTaskStepTemplate[] = [
  {
    stageLabel: "Постановка и анализ",
    title: "Изучить задание и проверить полноту исходных документов",
    detail:
      "Уточнить нормативные требования, сроки и необходимые документы от инициатора/руководителя.",
    expectedArtifact: "Перечень исходных документов и план действий",
    relativeProgress: 0.25,
  },
  {
    stageLabel: "Подготовка",
    title: "Подготовить проект документа / расчёта / сведений",
    detail:
      "Выполнить основную проработку материала и сверить с действующими нормами 44-ФЗ и № 158н.",
    expectedArtifact: "Проект документа / черновик записи в системе",
    relativeProgress: 0.6,
  },
  {
    stageLabel: "Исполнение и согласование",
    title: "Провести согласование, подписание или размещение в ЕИС",
    detail:
      "Обеспечить визирование, подписание ЭП и выполнение предусмотренных процедурных действий.",
    expectedArtifact: "Подписанный / опубликованный документ",
    relativeProgress: 0.85,
  },
  {
    stageLabel: "Завершение и отчёт",
    title: "Зафиксировать итог исполнения и передать результат руководителю",
    detail:
      "Указать реквизиты итогового документа, закрыть этапы и сохранить материалы в архиве КС.",
    expectedArtifact: "Отчётный итог и реквизиты завершения задачи",
    relativeProgress: 1.0,
  },
];

export const buildDefaultGenericSteps = (
  startIso?: string,
  dueIso?: string,
): TaskExecutionStep[] =>
  DEFAULT_GENERIC_STEPS.map((step, index) => ({
    id: `generic-step-${index + 1}`,
    order: index + 1,
    stageLabel: step.stageLabel,
    title: step.title,
    detail: step.detail,
    expectedArtifact: step.expectedArtifact,
    dueDate: interpolateStepDueDate(startIso, dueIso, step.relativeProgress),
    isDone: false,
    completedAt: "",
    completedBy: "",
    note: "",
  }));

export const recalculateStepDueDates = (
  steps: TaskExecutionStep[],
  startIso?: string,
  dueIso?: string,
): TaskExecutionStep[] => {
  if (steps.length === 0) return steps;
  return steps.map((step, index) => {
    const progress = (index + 1) / steps.length;
    return {
      ...step,
      order: index + 1,
      dueDate: interpolateStepDueDate(startIso, dueIso, progress),
    };
  });
};
