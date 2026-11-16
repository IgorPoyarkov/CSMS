import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  SmnpSonekPlanListSchema,
  SmnpSonekPlanSchema,
  SmnpSonekReportListSchema,
  SmnpSonekReportSchema,
  SmnpSonekProcurementListSchema,
  SmnpSonekProcurementSchema,
  type SmnpSonekPlan,
  type SmnpSonekReport,
  type SmnpSonekProcurement,
} from "./smnpSonek.schema";

const PLAN_ENDPOINT = "/smnpPlans";
const REPORT_ENDPOINT = "/smnpReports";
const PROCUREMENT_ENDPOINT = "/smnpProcurements";

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

// ─── Планы ──────────────────────────────────────────────────────────────────

const fetchPlansByOrg = async (
  organizationId: string | number,
): Promise<SmnpSonekPlan[]> => {
  const response = await api.get(PLAN_ENDPOINT, { params: { organizationId } });
  return SmnpSonekPlanListSchema.parse(response.data);
};

const createPlan = async (plan: SmnpSonekPlan): Promise<SmnpSonekPlan> => {
  const response = await api.post(PLAN_ENDPOINT, omitEmptyReferences(plan));
  return SmnpSonekPlanSchema.parse(response.data);
};

const updatePlan = async ({
  id,
  ...data
}: { id: string | number } & Partial<SmnpSonekPlan>): Promise<SmnpSonekPlan> => {
  const response = await api.patch(`${PLAN_ENDPOINT}/${id}`, data);
  return SmnpSonekPlanSchema.parse(response.data);
};

const deletePlan = async (id: string | number): Promise<string | number> => {
  await api.delete(`${PLAN_ENDPOINT}/${id}`);
  return id;
};

// ─── Отчёты ─────────────────────────────────────────────────────────────────

const fetchReportsByOrg = async (
  organizationId: string | number,
): Promise<SmnpSonekReport[]> => {
  const response = await api.get(REPORT_ENDPOINT, { params: { organizationId } });
  return SmnpSonekReportListSchema.parse(response.data);
};

const createReport = async (
  report: SmnpSonekReport,
): Promise<SmnpSonekReport> => {
  const response = await api.post(REPORT_ENDPOINT, omitEmptyReferences(report));
  return SmnpSonekReportSchema.parse(response.data);
};

const updateReport = async ({
  id,
  ...data
}: { id: string | number } & Partial<SmnpSonekReport>): Promise<SmnpSonekReport> => {
  const response = await api.patch(`${REPORT_ENDPOINT}/${id}`, data);
  return SmnpSonekReportSchema.parse(response.data);
};

const deleteReport = async (id: string | number): Promise<string | number> => {
  await api.delete(`${REPORT_ENDPOINT}/${id}`);
  return id;
};

// ─── Закупки у СМП/СОНКО ───────────────────────────────────────────────────

const fetchProcurementsByOrg = async (
  organizationId: string | number,
): Promise<SmnpSonekProcurement[]> => {
  const response = await api.get(PROCUREMENT_ENDPOINT, {
    params: { organizationId },
  });
  return SmnpSonekProcurementListSchema.parse(response.data);
};

const createProcurement = async (
  procurement: SmnpSonekProcurement,
): Promise<SmnpSonekProcurement> => {
  const response = await api.post(PROCUREMENT_ENDPOINT, omitEmptyReferences(procurement));
  return SmnpSonekProcurementSchema.parse(response.data);
};

const updateProcurement = async ({
  id,
  ...data
}: { id: string | number } & Partial<SmnpSonekProcurement>): Promise<SmnpSonekProcurement> => {
  const response = await api.patch(`${PROCUREMENT_ENDPOINT}/${id}`, data);
  return SmnpSonekProcurementSchema.parse(response.data);
};

const deleteProcurement = async (
  id: string | number,
): Promise<string | number> => {
  await api.delete(`${PROCUREMENT_ENDPOINT}/${id}`);
  return id;
};

// ─── Хуки ───────────────────────────────────────────────────────────────────

export const smnpQueryKey = ["smnpSonek"];

// Планы
export const useSmnpPlans = (organizationId: string | number | undefined) =>
  useQuery({
    queryKey: [...smnpQueryKey, "plans", String(organizationId)],
    queryFn: () => fetchPlansByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreateSmnpPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};

export const useUpdateSmnpPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updatePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};

export const useDeleteSmnpPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};

// Отчёты
export const useSmnpReports = (organizationId: string | number | undefined) =>
  useQuery({
    queryKey: [...smnpQueryKey, "reports", String(organizationId)],
    queryFn: () => fetchReportsByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreateSmnpReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};

export const useUpdateSmnpReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};

export const useDeleteSmnpReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};

// Закупки
export const useSmnpProcurements = (organizationId: string | number | undefined) =>
  useQuery({
    queryKey: [...smnpQueryKey, "procurements", String(organizationId)],
    queryFn: () => fetchProcurementsByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreateSmnpProcurement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProcurement,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};

export const useUpdateSmnpProcurement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProcurement,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};

export const useDeleteSmnpProcurement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProcurement,
    onSuccess: () => qc.invalidateQueries({ queryKey: smnpQueryKey }),
  });
};
