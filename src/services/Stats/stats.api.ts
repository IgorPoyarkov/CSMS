import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../axios.instance";

/** Ответ эндпоинта `/__pg/stats`: лёгкие счётчики для главной страницы. */
export const StatsSchema = z.object({
  purchasePlans: z.number(),
  procurements: z.number(),
  purchaseNotes: z.number(),
  tasks: z.number(),
  activeTasks: z.number(),
  contractRegistryCurrentYear: z.number(),
  currentYear: z.number(),
});

export type Stats = z.infer<typeof StatsSchema>;

export const statsQueryKey = ["stats"];

const fetchStats = async (
  organizationId: string | number,
): Promise<Stats> => {
  const { data } = await api.get("/__pg/stats", {
    params: { organizationId },
  });
  return StatsSchema.parse(data);
};

/**
 * Лёгкая статистика для главной — один HTTP-запрос, сервер считает COUNT
 * в PostgreSQL. Фронт не скачивает документы, только числа.
 */
export const useStats = (organizationId: string | number | undefined) =>
  useQuery<Stats>({
    queryKey: [...statsQueryKey, String(organizationId)],
    queryFn: () => fetchStats(organizationId as string | number),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
