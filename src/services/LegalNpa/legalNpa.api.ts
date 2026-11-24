import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  NpaActListSchema,
  NpaActSchema,
  type NpaAct,
  type NpaVersion,
} from "./legalNpa.schema";

const ENDPOINT = "/legalActs";

export const npaActsQueryKey = ["npaActs"];

/**
 * Акты с редакциями. Актов немного (десятки), поэтому список грузится один раз,
 * а поиск, фильтры и пагинация живут на клиенте — как в реестре ОКПД2.
 */
export const useNpaActs = () =>
  useQuery<NpaAct[]>({
    queryKey: npaActsQueryKey,
    queryFn: async () => {
      const { data } = await api.get(ENDPOINT);
      return NpaActListSchema.parse(data);
    },
    staleTime: 10 * 60 * 1000,
    retry: 0,
  });

export const useNpaAct = (id: string | number | undefined) => {
  const query = useNpaActs();

  return {
    ...query,
    data: query.data?.find((act) => String(act.id) === String(id)),
  };
};

/**
 * Сохранение редакций акта. Отправляем только `versions` и `isVerified`:
 * PATCH в json-server-адаптере мержит верхний уровень, остальные поля акта
 * (наименование, номер, источник) не затираются.
 */
export const useSaveNpaVersions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actId,
      versions,
      isVerified,
    }: {
      actId: string | number;
      versions: NpaVersion[];
      isVerified?: boolean;
    }) => {
      const { data } = await api.patch(`${ENDPOINT}/${actId}`, {
        versions,
        ...(isVerified === undefined ? {} : { isVerified }),
      });
      return NpaActSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: npaActsQueryKey });
    },
  });
};

/** Подтверждение одной редакции администратором НПА. */
export const useVerifyNpaVersion = () => {
  const save = useSaveNpaVersions();

  return {
    ...save,
    verify: (act: NpaAct, versionId: string, verified: boolean) =>
      save.mutate({
        actId: act.id,
        versions: act.versions.map((version) =>
          version.id === versionId ? { ...version, verified } : version,
        ),
        isVerified: act.versions.every(
          (version) => version.id === versionId || version.verified,
        ),
      }),
  };
};
