import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  BaseEmployeeSchema,
  type BaseEmployee,
} from "../StaffingTable/StaffingTable.schema";
import type { NoticeInfoFormValues } from "./noticeInfo.schema";

export interface OrganizationDto {
  id: number | string;
  fullName: string;
  postalAddress: string;
  legalAddress: string;
  email: string;
  phone: string;
}

export const useGetOrganizationById = (
  organizationId?: string | number
) => {
  return useQuery<OrganizationDto>({
    queryKey: ["organization", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto>(
        `/organizations/${organizationId}`
      );
      return data;
    },
  });
};

export const useGetEmployeeByEmail = (email?: string) => {
  return useQuery<BaseEmployee | null>({
    queryKey: ["employeeByEmail", email],
    enabled: Boolean(email),
    queryFn: async () => {
      const { data } = await api.get<BaseEmployee[]>(
        `/employees?email=${email}`
      );
      if (data && data.length > 0) {
        return BaseEmployeeSchema.parse(data);
      }
      return null;
    },
  });
};

export const useCreateNotice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: NoticeInfoFormValues) => {
      const { data } = await api.post("/notices", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
};
