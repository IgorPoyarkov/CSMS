import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProcurementListSchema,
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
