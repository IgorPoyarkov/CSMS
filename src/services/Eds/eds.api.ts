import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { api } from "../axios.instance";
import {
  ACCESS_TOKEN_KEY,
  AccessProfileSchema,
  accessApi,
  type AccessProfile,
} from "../Access/access.api";
import { BaseUserSchema } from "../Users/user.schema";
import {
  EdsCertificateSchema,
  EdsCertificateListSchema,
  SignatureEventSchema,
  SignatureEventListSchema,
  extractNameFromSubject,
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

/**
 * Все сертификаты сразу — нужно экрану входа, где организация ещё неизвестна:
 * по ней нельзя отфильтровать, а сопоставить сертификат с учёткой надо.
 */
const fetchAllCertificates = async (): Promise<EdsCertificate[]> => {
  const { data } = await api.get(CERT_ENDPOINT);
  return EdsCertificateListSchema.parse(data ?? []);
};

export const useAllEdsCertificates = () =>
  useQuery({
    queryKey: [...edsCertificatesQueryKey, "all"],
    queryFn: fetchAllCertificates,
  });

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

// ─── Вход по ЭП: серверная проверка подписи ──────────────────────────────────

const EDS_AUTH_ENDPOINT = "/api/eds";

const EdsChallengeSchema = z.object({
  challengeId: z.string().min(1),
  nonce: z.string().min(1),
  expiresAt: z.string(),
});

export type EdsChallenge = z.infer<typeof EdsChallengeSchema>;

const EdsAuthResponseSchema = z.object({
  token: z.string().min(1),
  profile: AccessProfileSchema,
  certificate: z.unknown(),
  resolution: z.string(),
});

/** Атрибуты сертификата в контракте csms-api. */
export interface EdsServerCertificate {
  subject: string;
  issuer: string;
  serialNumber: string;
  fingerprint: string;
  ownerName: string;
  inn: string;
  organizationName: string;
  validFrom: string;
  validTo: string;
}

export interface EdsServerLoginRequest {
  challengeId: string;
  signatureBase64: string;
  certificate: EdsServerCertificate;
  // Необязателен: нужен только полным однофамильцам в штатном расписании
  employeeNumber?: string;
}

export interface EdsLoginSuccess {
  token: string;
  profile: AccessProfile;
  resolution: string;
}

/** Наборт выдаёт сервер: клиентский наборт нельзя защитить от подмены. */
export const fetchEdsChallenge = async (): Promise<EdsChallenge> => {
  const { data } = await accessApi.post(`${EDS_AUTH_ENDPOINT}/challenge`);
  return EdsChallengeSchema.parse(data);
};

/**
 * Подпись проверяется на сервере; только после этого выдаётся токен обычной
 * сессии csms-api и готовый профиль прав — как при входе по email/паролю.
 */
export const loginWithEds = async (
  request: EdsServerLoginRequest,
): Promise<EdsLoginSuccess> => {
  const { data } = await accessApi.post(`${EDS_AUTH_ENDPOINT}/login`, request);
  const result = EdsAuthResponseSchema.parse(data);

  localStorage.setItem(ACCESS_TOKEN_KEY, result.token);
  return {
    token: result.token,
    profile: result.profile,
    resolution: result.resolution,
  };
};

/** Организация из O= subject: кавычки в DN удвоены («КУРСКАВТОДОР»). */
const organizationFromSubject = (subject: string): string => {
  const match = subject.match(
    /(?:^|,)\s*O\s*=\s*(?:"((?:""|[^"])+)"|([^,]*))/i,
  );
  if (!match) return "";
  return (match[1] ? match[1].replace(/""/g, '"') : match[2] ?? "").trim();
};

const toServerCertificate = (
  certificate: EdsCertificate,
): EdsServerCertificate => ({
  subject: certificate.subject ?? "",
  issuer: certificate.issuer ?? "",
  serialNumber: certificate.serialNumber ?? "",
  fingerprint: certificate.fingerprint ?? "",
  ownerName:
    certificate.ownerName ||
    extractNameFromSubject(certificate.subject ?? ""),
  inn: certificate.inn ?? "",
  organizationName: organizationFromSubject(certificate.subject ?? ""),
  validFrom: certificate.validFrom ?? "",
  validTo: certificate.validTo ?? "",
});

export interface EdsLoginRequest {
  certificate: EdsCertificate;
  /** Подписать наборт сервера; вернуть откреплённую подпись в base64. */
  sign: (nonce: string) => Promise<string>;
  /** Табельный номер — дополнительный фильтр при полных однофамильцах. */
  employeeNumber?: string;
}

/**
 * Вход по ЭП: серверный наборт → подпись закрытым ключом на рабочем месте →
 * проверка на сервере → та же сессия и профиль прав, что и у входа по паролю.
 * Журнал входов (успехи и отказы) ведёт csms-api, дублировать его здесь не надо.
 */
export const useEdsLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      certificate,
      sign,
      employeeNumber,
    }: EdsLoginRequest) => {
      const challenge = await fetchEdsChallenge();
      const signatureBase64 = await sign(challenge.nonce);
      if (!signatureBase64) {
        throw new Error("Плагин не вернул подпись наборта.");
      }

      const result = await loginWithEds({
        challengeId: challenge.challengeId,
        signatureBase64,
        certificate: toServerCertificate(certificate),
        employeeNumber: employeeNumber?.trim() || undefined,
      });

      const parsedUser = BaseUserSchema.safeParse(result.profile.user);
      const email = parsedUser.success ? parsedUser.data.email || "" : "";
      if (email) localStorage.setItem("user_email", email);

      queryClient.setQueryData(
        ["user", email, result.token],
        parsedUser.success ? parsedUser.data : null,
      );
      queryClient.invalidateQueries();

      return result;
    },
  });
};
