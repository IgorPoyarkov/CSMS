import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  Order158nReportListSchema,
  Order158nReportSchema,
  type Order158nReport,
} from "./order158nReport.schema";

const ENDPOINT = "/order158nReports";

export const order158nReportsQueryKey = ["order158nReports"];

const isBlank = (value: unknown): boolean =>
  value === "" || value === null || value === undefined;

// Исключаем пустые ссылки *Id (особенность json-server 0.17.4)
const omitEmptyReferences = <T extends Record<string, unknown>>(item: T): T =>
  Object.fromEntries(
    Object.entries(item).filter(
      ([key, value]) => !/Id$/.test(key) || !isBlank(value),
    ),
  ) as T;

const fetchOrder158nReports = async (
  organizationId: string | number,
): Promise<Order158nReport[]> => {
  const { data } = await api.get(ENDPOINT, {
    params: { organizationId },
  });
  const parsed = Order158nReportListSchema.parse(data ?? []);
  return parsed
    .filter((r) => String(r.organizationId) === String(organizationId))
    .sort((a, b) =>
      String(b.reportDate || b.generatedAt || "").localeCompare(
        String(a.reportDate || a.generatedAt || ""),
      ),
    );
};

export const useOrder158nReports = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [
      ...order158nReportsQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () => fetchOrder158nReports(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreateOrder158nReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: Order158nReport): Promise<Order158nReport> => {
      const payload = omitEmptyReferences(
        Order158nReportSchema.parse(report) as Record<string, unknown>,
      );
      const { data } = await api.post(ENDPOINT, payload);
      return Order158nReportSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: order158nReportsQueryKey });
    },
  });
};

export const useUpdateOrder158nReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<Order158nReport>): Promise<Order158nReport> => {
      const payload = omitEmptyReferences(changes as Record<string, unknown>);
      const { data } = await api.patch(`${ENDPOINT}/${id}`, payload);
      return Order158nReportSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: order158nReportsQueryKey });
    },
  });
};

export const useDeleteOrder158nReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number): Promise<string | number> => {
      await api.delete(`${ENDPOINT}/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: order158nReportsQueryKey });
    },
  });
};
