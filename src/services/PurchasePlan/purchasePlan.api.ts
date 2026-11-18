import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  PurchasePlanListSchema,
  PurchasePlanSchema,
  isPlanOfOrganization,
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
} from "./purchasePlan.schema";
import {
  buildPositionFinancePatch,
  roundMoney,
} from "../Nmck/marketNmck";

const ENDPOINT = "/purchasePlans";

export const purchasePlansQueryKey = ["purchasePlans"];

// Планы-графики отдаются только по организации заказчика: фильтрует
// json-server параметром organizationId, чтобы чужие документы не попадали
// в выборку
const fetchPurchasePlans = async (
  organizationId: string | number,
): Promise<PurchasePlan[]> => {
  const response = await api.get(ENDPOINT, { params: { organizationId } });

  const plans = PurchasePlanListSchema.parse(response.data);

  return plans.filter((plan) => isPlanOfOrganization(plan, organizationId));
};

const fetchPurchasePlanById = async (
  id: string | number,
  organizationId: string | number | undefined,
): Promise<PurchasePlan> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  const plan = PurchasePlanSchema.parse(response.data);

  // Прямая ссылка на чужой план-график считается недоступной
  if (
    organizationId !== undefined &&
    !isPlanOfOrganization(plan, organizationId)
  ) {
    throw new Error("План-график принадлежит другому заказчику");
  }

  return plan;
};

const createPurchasePlan = async (
  plan: PurchasePlan,
): Promise<PurchasePlan> => {
  if (!plan.organizationId) {
    throw new Error("Не указана организация — владелец плана-графика");
  }

  const response = await api.post(ENDPOINT, plan);

  return PurchasePlanSchema.parse(response.data);
};

const updatePurchasePlan = async ({
  id,
  data,
}: {
  id: string | number;
  data: PurchasePlan;
}): Promise<PurchasePlan> => {
  // Владелец плана-графика неизменен: перевод документа на другую
  // организацию запрещён
  const current = await fetchPurchasePlanById(id, data.organizationId);

  if (String(current.organizationId) !== String(data.organizationId)) {
    throw new Error("Нельзя изменить организацию — владельца плана-графика");
  }

  // В документе остаются сведения более позднего этапа (НМЦК, даты контракта,
  // способ определения поставщика), которых схема планирования не касается.
  // План-график перезаписывается целиком — берём хранящиеся поля из БД и
  // объединяем записи по идентификаторам, чтобы правка одной записи не стирала
  // остальное
  const stored = await api.get(`${ENDPOINT}/${id}`);
  const storedPositions: Record<string, unknown>[] = Array.isArray(
    stored.data?.positions,
  )
    ? stored.data.positions
    : [];
  const positions = data.positions.map((position) => {
    const previous = storedPositions.find(
      (item) => String(item.id ?? "") === String(position.id ?? ""),
    );

    return previous
      ? ({ ...previous, ...position } as PurchasePlanPosition)
      : position;
  });

  const response = await api.put(`${ENDPOINT}/${id}`, {
    ...stored.data,
    ...data,
    positions,
  });

  return PurchasePlanSchema.parse(response.data);
};

const deletePurchasePlan = async ({
  id,
  organizationId,
}: {
  id: string | number;
  organizationId: string | number | undefined;
}): Promise<string | number> => {
  // Удаление возможно только для плана своей организации
  await fetchPurchasePlanById(id, organizationId);
  await api.delete(`${ENDPOINT}/${id}`);

  return id;
};

export interface UpdatePositionPlanAmountPayload {
  planId: string | number;
  organizationId: string | number | undefined;
  positionId: string | number;
  amountTotal: number;
}

const updatePositionPlanAmount = async ({
  planId,
  organizationId,
  positionId,
  amountTotal,
}: UpdatePositionPlanAmountPayload): Promise<PurchasePlan> => {
  await fetchPurchasePlanById(planId, organizationId);
  const stored = await api.get(`${ENDPOINT}/${planId}`);
  const rawPlan = stored.data as PurchasePlan & Record<string, unknown>;
  const rawPositions = Array.isArray(rawPlan.positions)
    ? rawPlan.positions
    : [];

  let found = false;
  const nextPositions = rawPositions.map((pos) => {
    if (String(pos.id ?? "") !== String(positionId)) {
      return pos;
    }
    found = true;
    const financePatch = buildPositionFinancePatch(pos, amountTotal);
    return {
      ...pos,
      ...financePatch,
    };
  });

  if (!found) {
    throw new Error("Позиция плана-графика не найдена");
  }

  let nextTotalAmount = rawPlan.totalAmount;
  if (rawPlan.totalAmount !== undefined && rawPlan.totalAmount !== "") {
    const sumTotal = nextPositions.reduce(
      (acc, pos) => acc + (toNumber(pos.amountTotal) ?? 0),
      0,
    );
    nextTotalAmount = roundMoney(sumTotal).toFixed(2);
  }

  const response = await api.put(`${ENDPOINT}/${planId}`, {
    ...rawPlan,
    totalAmount: nextTotalAmount,
    positions: nextPositions,
  });

  return PurchasePlanSchema.parse(response.data);
};

export const usePurchasePlans = (
  organizationId: string | number | undefined,
) => {
  return useQuery({
    queryKey: [
      ...purchasePlansQueryKey,
      "organization",
      String(organizationId),
    ],
    queryFn: () => fetchPurchasePlans(organizationId as string | number),
    // Пока заказчик не определён (нет учётной записи или привязанной
    // организации), список не запрашивается
    enabled: Boolean(organizationId),
  });
};

export const usePurchasePlan = (
  id: string | number | undefined,
  organizationId: string | number | undefined,
) => {
  return useQuery({
    queryKey: [
      ...purchasePlansQueryKey,
      id,
      "organization",
      String(organizationId),
    ],
    queryFn: () => fetchPurchasePlanById(id as string | number, organizationId),
    enabled: Boolean(id && organizationId),
  });
};

export const useCreatePurchasePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPurchasePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasePlansQueryKey });
    },
  });
};

export const useUpdatePurchasePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePurchasePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasePlansQueryKey });
    },
  });
};

export const useDeletePurchasePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePurchasePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasePlansQueryKey });
    },
  });
};

export const useUpdatePositionPlanAmount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePositionPlanAmount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasePlansQueryKey });
    },
  });
};
