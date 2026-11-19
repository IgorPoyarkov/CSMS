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
