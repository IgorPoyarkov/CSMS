import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  OozAgentSnapshotSchema,
  type OozAgentSnapshot,
} from "./oozAgent.schema";

/**
 * Агент ООЗ по ГОСТ и НПА читает статический снимок: ни ЕИС, ни LLM при
 * открытии редактора не вызываются. Снимок пересобирается явно через
 * `node scripts/build-ooz-agent.mjs` из зафиксированных доказательств.
 */
export const oozAgentQueryKey = ["oozAgent"];

export const useOozAgent = () =>
  useQuery<OozAgentSnapshot>({
    queryKey: oozAgentQueryKey,
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data } = await axios.get<unknown>("/gost/ooz-agent.json", {
        timeout: 10_000,
      });
      return OozAgentSnapshotSchema.parse(data);
    },
  });
