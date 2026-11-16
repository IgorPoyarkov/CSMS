import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { LeaveListSchema, LeaveSchema, type Leave } from "./calendar.schema";

const ENDPOINT = "/leaves";

const omitEmptyReferences = (leave: Leave): Leave =>
  Object.fromEntries(
    Object.entries(leave).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as Leave;

const fetchLeavesForOrganization = async (
  organizationId: string | number,
): Promise<Leave[]> => {
  const response = await api.get(ENDPOINT, { params: { organizationId } });
  return LeaveListSchema.parse(response.data);
};

const fetchLeavesForEmployee = async (
  employeeId: string | number,
): Promise<Leave[]> => {
  const response = await api.get(ENDPOINT, { params: { employeeId } });
  return LeaveListSchema.parse(response.data);
};

const createLeave = async (leave: Leave): Promise<Leave> => {
  const response = await api.post(ENDPOINT, omitEmptyReferences(leave));
  return LeaveSchema.parse(response.data);
};

const updateLeave = async (
  id: string | number,
  data: Partial<Leave>,
): Promise<Leave> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return LeaveSchema.parse(response.data);
};

const deleteLeave = async (id: string | number): Promise<string | number> => {
  await api.delete(`${ENDPOINT}/${id}`);
  return id;
};

export const leavesQueryKey = ["leaves"];

export const useOrganizationLeaves = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...leavesQueryKey, "org", String(organizationId)],
    queryFn: () =>
      fetchLeavesForOrganization(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useEmployeeLeaves = (employeeId: string | number | undefined) =>
  useQuery({
    queryKey: [...leavesQueryKey, "employee", String(employeeId)],
    queryFn: () => fetchLeavesForEmployee(employeeId as string | number),
    enabled: Boolean(employeeId),
  });

export const useCreateLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLeave,
    onSuccess: () => qc.invalidateQueries({ queryKey: leavesQueryKey }),
  });
};

export const useUpdateLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string | number } & Partial<Leave>) =>
      updateLeave(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: leavesQueryKey }),
  });
};

export const useDeleteLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLeave,
    onSuccess: () => qc.invalidateQueries({ queryKey: leavesQueryKey }),
  });
};
