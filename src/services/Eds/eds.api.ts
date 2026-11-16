import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  EdsCertificateSchema,
  EdsCertificateListSchema,
  SignatureEventSchema,
  SignatureEventListSchema,
  type EdsCertificate,
  type SignatureEvent,
} from "./eds.schema";

const CERT_ENDPOINT = "/edsCertificates";
const EVENT_ENDPOINT = "/edsSignatureEvents";

// Типы проброшены отсюда: компонентам достаточно одного импорта из api
export type {
  EdsCertificate,
  EdsCertificateSource,
  EdsCertificateState,
  SignatureEvent,
  SignatureEventAction,
  SignatureEventEntityType,
  SignatureEventResult,
} from "./eds.schema";

export const edsCertificatesQueryKey = ["eds", "certificates"];
export const edsEventsQueryKey = ["eds", "events"];

// ─── Сертификаты ────────────────────────────────────────────────────────────

export const fetchCertificatesByOrg = async (
  organizationId: string | number,
): Promise<EdsCertificate[]> => {
  const { data } = await api.get(CERT_ENDPOINT, {
    params: { organizationId },
  });
  return EdsCertificateListSchema.parse(data);
};

export const useEdsCertificates = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...edsCertificatesQueryKey, String(organizationId)],
    queryFn: () => fetchCertificatesByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useCreateEdsCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (certificate: EdsCertificate) => {
      const { data } = await api.post(
        CERT_ENDPOINT,
        EdsCertificateSchema.parse(certificate),
      );
      return EdsCertificateSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: edsCertificatesQueryKey });
    },
  });
};

// ─── Журнал подписаний ──────────────────────────────────────────────────────

const fetchEventsByOrg = async (
  organizationId: string | number,
): Promise<SignatureEvent[]> => {
  const { data } = await api.get(EVENT_ENDPOINT, {
    params: { organizationId },
  });
  return SignatureEventListSchema.parse(data);
};

export const useSignatureEvents = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...edsEventsQueryKey, String(organizationId)],
    queryFn: () => fetchEventsByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

/**
 * Зарегистрировать действие с ЭП: «подписано», «отказано: сертификат не наш»
 * или «ошибка подписания». В демо без плагина событие записывается вручную
 * (через форму модалки EdsSignModal), на проде — через callback плагина.
 */
export const useLogSignatureEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: SignatureEvent) => {
      const { data } = await api.post(
        EVENT_ENDPOINT,
        SignatureEventSchema.parse(event),
      );
      return SignatureEventSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: edsEventsQueryKey });
    },
  });
};
