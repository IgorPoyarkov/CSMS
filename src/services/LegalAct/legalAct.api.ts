import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  LegalActListSchema,
  LegalActSchema,
  type LegalAct,
} from "./legalAct.schema";

const ENDPOINT = "/legalActs";

export const legalActsQueryKey = ["legalActs"];

/**
 * Реестр законодательных актов. Записей немного, они меняются редко (разве что
 * при правке норм), поэтому реестр грузится один раз и надолго, а поиск,
 * фильтр и пагинация живут на клиенте — как в справочнике ОКПД2.
 */
export const useLegalActs = () =>
  useQuery<LegalAct[]>({
    queryKey: legalActsQueryKey,
    queryFn: async () => {
      const { data } = await api.get(ENDPOINT);
      return LegalActListSchema.parse(data);
    },
    staleTime: 60 * 60 * 1000,
    // Реестр актов меняется правками, а не сам по себе: повтор не нужен
    retry: 0,
  });

/**
 * Акты заказчика: общие для всех (organizationId пустой или null) плюс
 * собственные акты организации — например ведомственные приказы конкретного
 * заказчика. Фильтруем на клиенте, чтобы не тянуть несколько запросов.
 */
export const visibleLegalActs = (
  acts: LegalAct[],
  organizationId: string | number | undefined,
): LegalAct[] =>
  acts.filter((act) => {
    if (act.organizationId === undefined || act.organizationId === null) {
      return true;
    }
    if (organizationId === undefined) return false;
    return String(act.organizationId) === String(organizationId);
  });

export const useCreateLegalAct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (act: LegalAct) => {
      const { data } = await api.post(ENDPOINT, LegalActSchema.parse(act));
      return LegalActSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalActsQueryKey });
    },
  });
};

// Правка нужна для отслеживания изменений: пометка о сверке, новая редакция,
// дата утраты силы
export const useUpdateLegalAct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      changes,
    }: {
      id: string | number;
      changes: Partial<LegalAct>;
    }) => {
      const { data } = await api.patch(`${ENDPOINT}/${id}`, changes);
      return LegalActSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: legalActsQueryKey });
    },
  });
};
