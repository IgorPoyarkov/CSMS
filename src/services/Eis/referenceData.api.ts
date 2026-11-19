import { useEffect } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Клиент справочников НСИ того же шлюза csms-api, что и пакеты ЕИС.
 *
 * Это не json-server: версии хранятся в PostgreSQL, а источник данных —
 * официальный сайт ЕИС. Фронт только читает готовые снимки и не решает,
 * какие коды и поля считать правильными.
 */

const BASE_URL = import.meta.env.VITE_EIS_API_URL || "http://localhost:5099";

const referenceApi = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export interface ReferenceDatasetInfo {
  code: string;
  version: string;
  sourceDocument: string | null;
  sourceUrl: string | null;
  sourceSha256: string | null;
  publishedAt: string | null;
  importedAt: string;
  itemCount: number;
  hash: string;
  isActive: boolean;
}

export const referenceDatasetsQueryKey = ["referenceDatasets"];

export const useReferenceDatasets = () =>
  useQuery({
    queryKey: referenceDatasetsQueryKey,
    // Версии меняются только при явном импорте на бэке; SSE добирает обновления
    staleTime: 30_000,
    queryFn: async (): Promise<ReferenceDatasetInfo[]> => {
      const { data } = await referenceApi.get<ReferenceDatasetInfo[]>(
        "/api/references/datasets",
      );

      return data;
    },
  });

/**
 * Подписка на импорт новых версий. Бэк публикует `ready` с текущими наборами
 * и `references-updated` после публикации, поэтому шапка обновляется без
 * перезагрузки страницы.
 */
export interface ReferenceItemInfo {
  code: string;
  name: string;
  parentCode?: string | null;
  actual?: boolean;
}

export interface ReferenceItemQuery {
  search?: string;
  parentCode?: string;
  take?: number;
}

/**
 * Запись справочника НСИ, как её отдаёт `GET /api/references/{dataset}/items`.
 * Бэк нормализует `code`/`name`/`parentCode`/`actual` и кладёт исходный объект
 * строкой `payloadJson`; форму ответа (массив или конверт с `items`) не
 * фиксируем жёстко — парсер терпим к обоим вариантам.
 */
const readReferenceItems = (data: unknown): ReferenceItemInfo[] => {
  const container = data as { items?: unknown } | unknown[] | null;
  const list = Array.isArray(container)
    ? container
    : Array.isArray(container?.items)
      ? container.items
      : [];

  return list.flatMap((raw) => {
    const item = raw as Record<string, unknown>;

    if (typeof item.code !== "string" || typeof item.name !== "string") {
      return [];
    }

    return [
      {
        code: item.code,
        name: item.name,
        parentCode:
          typeof item.parentCode === "string" ? item.parentCode : undefined,
        actual: typeof item.actual === "boolean" ? item.actual : undefined,
      },
    ];
  });
};

/**
 * Поиск по снимку НСИ на бэке (Tasks 16). Нужен как дополнение к локальному
 * справочнику `db.json`: официальный снимок ОКПД2 содержит все 21 066 кодов,
 * а локальный — только используемые заказчиком. Ошибка или отсутствие
 * сервиса не должны ломать форму, поэтому `retry: false` и пустая выдача.
 */
export const useReferenceItems = (
  dataset: string,
  query: ReferenceItemQuery,
  enabled = true,
) =>
  useQuery({
    queryKey: ["referenceItems", dataset, query.search ?? "", query.parentCode ?? "", query.take ?? 0],
    enabled: enabled && Boolean(query.search || query.parentCode),
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: async (): Promise<ReferenceItemInfo[]> => {
      const { data } = await referenceApi.get(`/api/references/${dataset}/items`, {
        params: {
          search: query.search || undefined,
          parentCode: query.parentCode || undefined,
          take: query.take,
        },
      });

      return readReferenceItems(data);
    },
  });

export const useReferenceDatasetEvents = (enabled: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;

    const events = new EventSource(`${BASE_URL}/api/references/events`);
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: referenceDatasetsQueryKey });
    };

    events.addEventListener("ready", invalidate);
    events.addEventListener("references-updated", invalidate);

    return () => {
      events.removeEventListener("ready", invalidate);
      events.removeEventListener("references-updated", invalidate);
      events.close();
    };
  }, [enabled, queryClient]);
};
