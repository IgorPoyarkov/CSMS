import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  BidEvaluationListSchema,
  BidEvaluationSchema,
  type BidEvaluation,
} from "./bidEvaluation.schema";

const ENDPOINT = "/bidEvaluations";

export const bidEvaluationsQueryKey = ["bidEvaluations"];

const fetchBidEvaluations = async (
  organizationId: string | number,
): Promise<BidEvaluation[]> => {
  const { data } = await api.get(ENDPOINT, { params: { organizationId } });

  return BidEvaluationListSchema.parse(data);
};

/**
 * json-server удаляет записи с «битыми» ссылками (*Id, которых нет в связанной
 * коллекции), а пустая строка — тоже битая ссылка. Поэтому пустые
 * идентификаторы вырезаем, включая вложенные критерии, показатели и заявки.
 */
const cleanIds = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

const prepareCriterion = (
  criterion: Record<string, unknown>,
): Record<string, unknown> => ({
  ...cleanIds(criterion),
  indicators: Array.isArray(criterion.indicators)
    ? criterion.indicators.map((indicator) =>
        cleanIds(indicator as Record<string, unknown>),
      )
    : [],
});

const prepareForSave = <T extends Record<string, unknown>>(data: T): T => ({
  ...cleanIds(data),
  ...(Array.isArray(data.criteria)
    ? {
        criteria: data.criteria.map((criterion) =>
          prepareCriterion(criterion as Record<string, unknown>),
        ),
      }
    : {}),
  ...(Array.isArray(data.bids)
    ? {
        bids: data.bids.map((bid) => cleanIds(bid as Record<string, unknown>)),
      }
    : {}),
});

export const useOrganizationBidEvaluations = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [
      ...bidEvaluationsQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () => fetchBidEvaluations(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreateBidEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evaluation: BidEvaluation) => {
      const { data } = await api.post(
        ENDPOINT,
        BidEvaluationSchema.parse(
          prepareForSave(evaluation as unknown as Record<string, unknown>),
        ),
      );

      return BidEvaluationSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bidEvaluationsQueryKey });
    },
  });
};

export const useUpdateBidEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: { id: string | number } & Partial<BidEvaluation>) => {
      const { data } = await api.patch(
        `${ENDPOINT}/${id}`,
        prepareForSave(changes as Record<string, unknown>),
      );

      return BidEvaluationSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bidEvaluationsQueryKey });
    },
  });
};

export const useDeleteBidEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`${ENDPOINT}/${id}`);

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bidEvaluationsQueryKey });
    },
  });
};
