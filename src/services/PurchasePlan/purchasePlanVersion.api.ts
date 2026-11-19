import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  PurchasePlanVersionListSchema,
  PurchasePlanVersionSchema,
  type PurchasePlanVersion,
} from "./purchasePlanVersion.schema";

const ENDPOINT = "/purchasePlanVersions";

export const purchasePlanVersionsQueryKey = ["purchasePlanVersions"];

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

const fetchVersionsByPlan = async (
  purchasePlanId: string | number,
  organizationId?: string | number,
): Promise<PurchasePlanVersion[]> => {
  const response = await api.get(ENDPOINT, {
    params: { purchasePlanId },
  });
  const parsed = PurchasePlanVersionListSchema.parse(response.data ?? []);
  return parsed
    .filter(
      (item) =>
        organizationId === undefined ||
        String(item.organizationId) === String(organizationId),
    )
    .sort((a, b) => b.versionNumber - a.versionNumber);
};

const fetchVersionsByOrg = async (
  organizationId: string | number,
): Promise<PurchasePlanVersion[]> => {
  const response = await api.get(ENDPOINT, { params: { organizationId } });
  const parsed = PurchasePlanVersionListSchema.parse(response.data ?? []);
  return parsed.sort((a, b) => b.versionNumber - a.versionNumber);
};

const createVersion = async (
  version: PurchasePlanVersion,
): Promise<PurchasePlanVersion> => {
  const response = await api.post(ENDPOINT, omitEmptyReferences(version));
  return PurchasePlanVersionSchema.parse(response.data);
};

const deleteVersion = async (id: string | number): Promise<string | number> => {
  await api.delete(`${ENDPOINT}/${id}`);
  return id;
};

export const usePurchasePlanVersions = (
  purchasePlanId: string | number | undefined,
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [
      ...purchasePlanVersionsQueryKey,
      "plan",
      String(purchasePlanId),
      String(organizationId),
    ],
    queryFn: () =>
      fetchVersionsByPlan(
        purchasePlanId as string | number,
        organizationId,
      ),
    enabled: Boolean(purchasePlanId && organizationId),
  });

export const useOrganizationPurchasePlanVersions = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...purchasePlanVersionsQueryKey, "org", String(organizationId)],
    queryFn: () => fetchVersionsByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreatePurchasePlanVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createVersion,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: purchasePlanVersionsQueryKey }),
  });
};

export const useDeletePurchasePlanVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteVersion,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: purchasePlanVersionsQueryKey }),
  });
};
