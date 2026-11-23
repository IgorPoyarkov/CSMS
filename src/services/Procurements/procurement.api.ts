import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ProcurementListSchema,
  type BudgetObligation,
  type NoticeStatus,
  type Procurement,
  type RawProcurement,
} from "./procurement.schema";
import { api } from "../axios.instance";

export const useGetProcurements = () => {
  return useQuery<Procurement[]>({
    queryKey: ["procurements"],
    queryFn: async () => {
      const { data } = await api.get("/procurements");
      return ProcurementListSchema.parse(data);
    },
  });
};

export const useAddProcurement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (procurement: RawProcurement) => {
      const { data } = await api.post("/procurements", procurement);
      return data as Procurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurements"] });
    },
  });
};

/**
 * Смена статуса извещения. Статус хранится в самой записи закупки
 * (поле «Статус извещения»), чтобы список текущих извещений и фильтр
 * работали без отдельной коллекции.
 */
export const useUpdateProcurementStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string | number;
      status: NoticeStatus;
    }) => {
      const { data } = await api.patch(`/procurements/${id}`, {
        "Статус извещения": status,
      });
      return data as Procurement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurements"] });
    },
  });
};

export const useBudgetObligations = () => {
  return useQuery<BudgetObligation[]>({
    queryKey: ["budgetObligations"],
    queryFn: async () => {
      const { data } = await api.get<BudgetObligation[]>("/budgetObligations");
      return Array.isArray(data) ? data : [];
    },
  });
};

/** Формирование бюджетного обязательства по извещению. */
export const useCreateBudgetObligation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BudgetObligation) => {
      const { data } = await api.post("/budgetObligations", payload);
      return data as BudgetObligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetObligations"] });
    },
  });
};

export const useDeleteProcurement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/procurements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurements"] });
    },
  });
};

/**
 * Пагинированная порция закупок для реестра извещений.
 *
 * В отличие от `useGetProcurements` (возвращает полный массив для отчётов
 * и дашбордов), этот хук отдаёт одну страницу и общее число — сервер
 * фильтрует, ищет по двум полям и считает X-Total-Count.
 *
 * `placeholderData: keepPreviousData` не показывает «нет данных» при
 * переключении страницы — пользователь видит предыдущую страницу
 * до загрузки новой.
 */
export interface ProcurementPageParams {
  page: number;
  pageSize: number | "all";
  status: NoticeStatus | "all";
  search: string;
}

export interface ProcurementPageResult {
  items: Procurement[];
  total: number;
}

export const useGetProcurementPage = ({
  page,
  pageSize,
  status,
  search,
}: ProcurementPageParams) =>
  useQuery<ProcurementPageResult>({
    queryKey: ["procurements", "page", page, pageSize, status, search],
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (typeof pageSize === "number") {
        params._page = page;
        params._limit = pageSize;
      }

      if (status !== "all") {
        params["Статус извещения"] = status;
      } else {
        params["Статус извещения_ne"] = "cancelled";
      }

      if (search) {
        params._search = search;
        params._searchFields = "Наименование закупки,Номер извещения";
      }

      const response = await api.get("/procurements", { params });
      const items = ProcurementListSchema.parse(response.data);
      const header = response.headers["x-total-count"];
      const total = header === undefined ? items.length : Number(header);
      return {
        items,
        total: Number.isFinite(total) ? total : items.length,
      };
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

/**
 * Счётчики по статусам для чипов-фильтров реестра.
 *
 * Один GROUP BY вместо выгрузки всех записей на клиент.
 * Фильтры передаются такие же, как у списка, чтобы счётчики
 * соответствовали текущей выборке (например, поиск по названию).
 */
export const useNoticeStatusFacets = ({
  status,
  search,
}: {
  status: NoticeStatus | "all";
  search: string;
}) =>
  useQuery<Record<string, number>>({
    queryKey: ["procurements", "facets", status, search],
    queryFn: async () => {
      const params: Record<string, unknown> = { field: "Статус извещения" };

      if (status !== "all") {
        params["Статус извещения"] = status;
      } else {
        params["Статус извещения_ne"] = "cancelled";
      }

      if (search) {
        params._search = search;
        params._searchFields = "Наименование закупки,Номер извещения";
      }

      const { data } = await api.get("/__pg/facets/procurements", {
        params,
      });
      return data as Record<string, number>;
    },
    staleTime: 15_000,
  });
