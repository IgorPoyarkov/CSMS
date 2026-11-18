import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      const { data } = await api.get<BudgetObligation[]>(
        "/budgetObligations",
      );
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
