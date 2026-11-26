import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { EisNewsFeedSchema, type EisNewsFeed } from "./eisNews.schema";

/**
 * Новости ЕИС приходят через адаптер PG (`scripts/lib/eis-news.mjs`):
 * браузер не может читать RSS zakupki.gov.ru напрямую из-за CORS,
 * а сервер кэширует ленту на 15 минут.
 */
const ENDPOINT = "/__rss/eis-news";

export const eisNewsQueryKey = ["eisNews"];

const fetchEisNews = async (limit: number): Promise<EisNewsFeed> => {
  try {
    const { data } = await api.get(ENDPOINT, { params: { limit } });
    return EisNewsFeedSchema.parse(data);
  } catch (error) {
    // ЕИС может ответить ошибкой, но отдать последний удачный кэш:
    // страница остаётся с новостями, только помечает их как устаревшие
    const fallback = (error as { response?: { data?: unknown } }).response?.data;
    const parsed = EisNewsFeedSchema.safeParse(fallback);
    if (parsed.success && parsed.data.items.length > 0) return parsed.data;
    throw error;
  }
};

export const useEisNews = (limit = 8) =>
  useQuery<EisNewsFeed>({
    queryKey: [...eisNewsQueryKey, limit],
    queryFn: () => fetchEisNews(limit),
    // Лента обновляется несколько раз в день — чаще спрашивать смысла нет
    staleTime: 10 * 60 * 1000,
    // Локальный адаптер может быть не запущен: не долбим его повторами
    retry: 0,
  });
