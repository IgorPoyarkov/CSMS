import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  SmpRegistryListSchema,
  type SmpRegistryEntry,
} from "./smpRegistry.schema";

/**
 * Реестр МСП для проверки поставщиков из коммерческих предложений.
 * Справочник общий и меняется редко, поэтому кэшируется на час: проверка
 * выполняется на клиенте (см. analyzeNmckSmpComposition).
 */
export const useSmpRegistry = () =>
  useQuery<SmpRegistryEntry[]>({
    queryKey: ["smpRegistry"],
    queryFn: async () => {
      const { data } = await api.get("/smpRegistry");
      return SmpRegistryListSchema.parse(data ?? []);
    },
    staleTime: 60 * 60 * 1000,
  });
