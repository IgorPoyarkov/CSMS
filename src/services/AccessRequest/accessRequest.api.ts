import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  AccessRequestListSchema,
  AccessRequestSchema,
  isAccessRequestOpen,
  type AccessRequest,
} from "./accessRequest.schema";

const ENDPOINT = "/accessRequests";

export const accessRequestsQueryKey = ["accessRequests"];

/**
 * Заявки на образование/квалификацию. Отправляются из карточки контрактной
 * службы и из личного кабинета, поэтому список берётся по организации: у
 * заказчика свои заявки, чужие ему недоступны.
 */
const fetchAccessRequests = async (
  organizationId: string | number,
): Promise<AccessRequest[]> => {
  const { data } = await api.get(ENDPOINT, { params: { organizationId } });

  return AccessRequestListSchema.parse(data);
};

export const useAccessRequests = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...accessRequestsQueryKey, "organization", String(organizationId)],
    queryFn: () => fetchAccessRequests(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

// Работник уже обращался по поводу образования — кнопку не дублируем
export const hasOpenAccessRequest = (
  requests: AccessRequest[],
  employeeId: string | number | undefined,
): boolean =>
  employeeId !== undefined &&
  requests.some(
    (request) =>
      String(request.employeeId) === String(employeeId) &&
      isAccessRequestOpen(request),
  );

export const useCreateAccessRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AccessRequest) => {
      const { data } = await api.post(ENDPOINT, AccessRequestSchema.parse(request));

      return AccessRequestSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessRequestsQueryKey });
    },
  });
};
