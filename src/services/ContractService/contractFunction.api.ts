import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ContractFunctionSchema,
  type ContractFunction,
} from "./contractFunction.schema";

const BASE = "/api/contractFunctions";

// Получить все функции (клиент фильтрует по organizationId)
const fetchContractFunctions = async (): Promise<ContractFunction[]> => {
  const res = await fetch(BASE);

  if (!res.ok) {
    return [];
  }

  const json = await res.json();

  return json.map((raw: unknown) => ContractFunctionSchema.parse(raw));
};

export const useFetchContractFunctions = () =>
  useQuery({
    queryKey: ["contractFunctions"],
    queryFn: fetchContractFunctions,
  });

// Получить функции для организации (order + organization-specific)
export const useOrganizationFunctions = (organizationId?: string | number) =>
  useQuery({
    queryKey: ["contractFunctions", organizationId],
    queryFn: async () => {
      const all = await fetchContractFunctions();

      if (!organizationId) {
        return all.filter((fn) => fn.isFromOrder);
      }

      return all.filter(
        (fn) =>
          fn.isFromOrder ||
          String(fn.organizationId) === String(organizationId),
      );
    },
    enabled: !!organizationId,
  });

// Добавить функцию
export const useAddContractFunction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fn: Omit<ContractFunction, "id">) => {
      const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fn),
      });

      if (!res.ok) {
        throw new Error("Не удалось добавить функцию");
      }

      return ContractFunctionSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractFunctions"] });
    },
  });
};

// Удалить функцию (только isDeletable=true)
export const useDeleteContractFunction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });

      if (!res.ok) {
        throw new Error("Не удалось удалить функцию");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractFunctions"] });
    },
  });
};
