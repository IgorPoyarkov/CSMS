import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../axios.instance";

const ENDPOINT = "/notificationStates";

export const NotificationStateSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  notificationKey: z.string().min(1),
  acknowledgedAt: z.string(),
  acknowledgedBy: z.string().optional(),
});

export type NotificationState = z.infer<typeof NotificationStateSchema>;
export const NotificationStateListSchema = z.array(NotificationStateSchema);

export const notificationStatesQueryKey = ["notificationStates"];

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

const fetchStatesByOrg = async (
  organizationId: string | number,
): Promise<NotificationState[]> => {
  const response = await api.get(ENDPOINT, { params: { organizationId } });
  return NotificationStateListSchema.parse(response.data ?? []);
};

const acknowledge = async (
  payload: NotificationState,
): Promise<NotificationState> => {
  const response = await api.post(ENDPOINT, omitEmptyReferences(payload));
  return NotificationStateSchema.parse(response.data);
};

const removeState = async (id: string | number): Promise<string | number> => {
  await api.delete(`${ENDPOINT}/${id}`);
  return id;
};

export const useNotificationStates = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...notificationStatesQueryKey, String(organizationId)],
    queryFn: () => fetchStatesByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useAcknowledgeNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: acknowledge,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationStatesQueryKey }),
  });
};

export const useRestoreNotification = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeState,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationStatesQueryKey }),
  });
};
