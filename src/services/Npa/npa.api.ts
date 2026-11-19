import axios from "axios";
import { useQuery } from "@tanstack/react-query";

/**
 * Клиент правил НПА из csms-api. Агент сам скачивает официальные акты и
 * публикует версии правил, фронт только читает готовый результат. Ошибка
 * сервиса не должна ломать формы, поэтому запросы не ретраятся.
 */
const BASE_URL = import.meta.env.VITE_EIS_API_URL || "http://localhost:5099";

export const npaApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

/** Коды совпадают с секцией `Npa:Documents` в appsettings.json на бэке. */
export const NPA_DOCUMENT_CODES = {
  auctionList: "rp-471",
  nationalRegime: "pp-1875",
  bidEvaluation: "pp-2604",
} as const;

export type NpaDocumentCode =
  (typeof NPA_DOCUMENT_CODES)[keyof typeof NPA_DOCUMENT_CODES];

/** Одно правило активной версии: ответ `/api/npa/documents/{code}/rules`. */
export interface NpaRuleInfo {
  code: string;
  okpd2Code: string;
  ruleType: "include" | "exclude" | "conditional";
  conditionText: string | null;
  quote: string | null;
  isInherited: boolean;
  inheritedFrom: string | null;
  confidence: number;
  status: "auto" | "needs_review" | "approved" | "rejected";
  note: string | null;
  sourcePage: number | null;
  sourceRow: number | null;
}

/** Действующее правило для кода: ответ `/effective` (авторитетный расчёт бэка). */
export interface NpaEffectiveRule {
  code: string;
  okpd2Code: string;
  matchedCode: string;
  ruleType: NpaRuleInfo["ruleType"];
  conditionText: string | null;
  isInherited: boolean;
  inheritedFrom: string | null;
  confidence: number;
  status: NpaRuleInfo["status"];
  version: string;
}

export interface NpaDocumentInfo {
  code: string;
  version: string;
  number: string | null;
  title: string;
  itemCount: number;
  unresolvedCount: number;
  isActive: boolean;
  sourceUrl: string | null;
  pdfSha256: string | null;
  /** Когда опубликована текущая версия правил. */
  fetchedAt: string;
  /** Когда официальный текст последний раз проверялся (даже без новой версии). */
  lastCheckedAt: string | null;
  /** up_to_date / published / prepared / error. */
  lastCheckStatus: string | null;
  lastCheckMessage: string | null;
}

/**
 * Время в МСК (UTC+3) без зависимости от локали браузера: «21.11.2026 03:14 МСК».
 * Москва не переводит часы, поэтому фиксированный сдвиг корректен круглый год.
 */
export const formatMskDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const msk = new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString();
  const [year, month, day] = msk.slice(0, 10).split("-");
  return `${day}.${month}.${year} ${msk.slice(11, 16)} МСК`;
};

export const npaDocumentsQueryKey = ["npaDocuments"];
export const npaRuleIndexQueryKey = ["npaRuleIndex"];

const readList = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) {
    return data as T[];
  }

  const container = data as { items?: unknown } | null;
  return Array.isArray(container?.items) ? (container.items as T[]) : [];
};

/**
 * Прямые правила акта. Унаследованные бэк материализует в БД, но браузеру
 * достаточно прямых: дерево ОКПД2 восстанавливается резолвером по префиксу.
 */
export const fetchNpaDirectRules = async (
  documentCode: string,
  signal?: AbortSignal,
): Promise<NpaRuleInfo[]> => {
  const pageSize = 5000;
  const rules: NpaRuleInfo[] = [];

  for (let skip = 0; ; skip += pageSize) {
    const { data } = await npaApi.get<unknown>(
      `/api/npa/documents/${encodeURIComponent(documentCode)}/rules`,
      { params: { directOnly: true, skip, take: pageSize }, signal },
    );

    const page = readList<NpaRuleInfo>(data);
    rules.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rules;
};

export const useNpaDocuments = () =>
  useQuery({
    queryKey: npaDocumentsQueryKey,
    staleTime: 10 * 60_000,
    // Реестр НПА должен подтянуть свежие отметки проверки после ночного цикла
    // без перезагрузки страницы.
    refetchInterval: 10 * 60_000,
    retry: false,
    queryFn: async ({ signal }): Promise<NpaDocumentInfo[]> => {
      const { data } = await npaApi.get<unknown>("/api/npa/documents", {
        signal,
      });

      return readList<NpaDocumentInfo>(data);
    },
  });

/**
 * Индекс правил всех актов для синхронных проверок в формах. Живёт в кэше
 * React Query, а `setNpaDirectRules` публикует его для не-React утилит
 * (`auctionListControl.ts`, zod-схемы), которые не могут ждать запрос.
 */
export const useNpaRuleIndex = (documentCodes: readonly string[] = []) =>
  useQuery({
    queryKey: [
      ...npaRuleIndexQueryKey,
      [...documentCodes].sort().join(","),
    ],
    staleTime: 60 * 60_000,
    retry: false,
    queryFn: async ({ signal }): Promise<Record<string, NpaRuleInfo[]>> => {
      const entries = await Promise.all(
        documentCodes.map(async (code) =>
          [code, await fetchNpaDirectRules(code, signal)] as const,
        ),
      );

      return Object.fromEntries(entries);
    },
  });

/** Действующее правило для одного кода: запрос к авторитетному расчёту бэка. */
export const useNpaEffective = (
  documentCode: string | null,
  okpd2Code: string | null,
  includePending = false,
) =>
  useQuery({
    queryKey: ["npaEffective", documentCode, okpd2Code, includePending],
    enabled: Boolean(documentCode && okpd2Code),
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: async ({ signal }): Promise<NpaEffectiveRule | null> => {
      try {
        const { data } = await npaApi.get<NpaEffectiveRule>(
          `/api/npa/documents/${encodeURIComponent(documentCode!)}/effective`,
          {
            params: { okpd2Code: okpd2Code!, includePending },
            signal,
          },
        );

        return data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }

        throw error;
      }
    },
  });
