import { useQuery } from "@tanstack/react-query";
import { api } from "../axios.instance";
import { useFetchCurrentUser } from "../Users/user.api";
import {
  BaseOrganizationSchema,
  OrganizationListSchema,
  type BaseOrganization,
} from "./organization.schema";

const ENDPOINT = "/organizations";

export const organizationsQueryKey = ["organizations"];

const fetchOrganizations = async (): Promise<BaseOrganization[]> => {
  const response = await api.get(ENDPOINT);

  return OrganizationListSchema.parse(response.data);
};

const fetchOrganizationById = async (
  id: string | number,
): Promise<BaseOrganization> => {
  const response = await api.get(`${ENDPOINT}/${id}`);

  return BaseOrganizationSchema.parse(response.data);
};

export const useOrganizations = () => {
  return useQuery({
    queryKey: organizationsQueryKey,
    queryFn: fetchOrganizations,
  });
};

// Организация, к которой привязана учётная запись вошедшего пользователя:
// именно её реквизиты подставляются заказчиком в новые планы-графики.
export const useCurrentOrganization = () => {
  const { data: user } = useFetchCurrentUser();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: [...organizationsQueryKey, organizationId],
    queryFn: () => fetchOrganizationById(organizationId as string | number),
    enabled: Boolean(organizationId),
  });
};
