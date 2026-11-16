import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import z from "zod";
import { api } from "../axios.instance";
import { BaseEmployeeSchema } from "../StaffingTable/StaffingTable.schema";
import { BaseUserSchema } from "../Users/user.schema";
import { OrganizationListSchema } from "../Organization/organization.schema";
import { resolveEdsAccount, type EdsLoginResolution } from "./edsAuth";
import type { PluginSignature } from "./cryptoPro";
import {
  EdsCertificateSchema,
  EdsCertificateListSchema,
  SignatureEventSchema,
  SignatureEventListSchema,
  certificateBelongsToOrganization,
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

// ─── Вход по ЭП ──────────────────────────────────────────────────────────────

// json-server при мутации удаляет записи с пустыми внешними ссылками,
// поэтому пустые *Id в payload не отдаём
const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

// Момент входа важен до минут — по нему журнал сверяют с часами ЕИС
const nowLocalDateTime = (): string => {
  const d = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * plugin — наборт подписан крипто-плагином на рабочем месте;
 * registry — вход по записи реестра без проверки подписи (плагина нет или он
 * отказался подписать), помечается и в журнале, и в интерфейсе.
 */
export type EdsLoginMode = "plugin" | "registry";

export interface EdsLoginRequest {
  certificate: EdsCertificate;
  mode: EdsLoginMode;
  signature?: PluginSignature | null;
}

export interface EdsLoginOutcome {
  resolution: EdsLoginResolution;
  // Попала ли попытка в журнал
  logged: boolean;
}

/**
 * Вход по электронной подписи (Tasks 9, п. 1).
 *
 * Состав решения: сертификат → организация по ИННЮЛ → работник по ФИО в
 * штатном расписании → учётная запись по `employees.userId`. Отказ всегда
 * именован и показывается пользователю, а не превращается в «неверный пароль».
 *
 * Честное ограничение стенда: подпись набора проверяет сервер, а json-server
 * её не проверяет. Поэтому режим `registry` possible, но он не подтверждает
 * владение ключом — в журнале такая запись помечена как вход без проверки
 * подписи. На реальном бэкенде этот режим закрывается.
 */
export const useEdsLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ certificate, mode, signature }: EdsLoginRequest) => {
      let organizations, employees, users;

      try {
        const [orgResponse, employeeResponse, userResponse] = await Promise.all(
          [api.get("/organizations"), api.get("/employees"), api.get("/users")],
        );

        organizations = OrganizationListSchema.parse(orgResponse.data ?? []);
        employees = z
          .array(BaseEmployeeSchema)
          .parse(employeeResponse.data ?? []);
        users = z.array(BaseUserSchema).parse(userResponse.data ?? []);
      } catch {
        throw "Сервер не отвечает — сопоставить сертификат с учётной записью не удалось";
      }

      const resolution = resolveEdsAccount(certificate, {
        organizations,
        employees,
        users,
        today: new Date().toISOString().slice(0, 10),
      });

      // Без организации писать некуда: события привязаны к заказчику, а
      // organizationId: "" json-server считает битой ссылкой
      let logged = Boolean(resolution.organization?.id);

      if (logged) {
        const event: SignatureEvent = {
          organizationId: resolution.organization?.id ?? "",
          userId: resolution.user?.id,
          userLabel: resolution.user?.email ?? resolution.certificateOwner,
          action: "eds_login",
          entityType: "session",
          entityId:
            resolution.user?.id ?? certificate.serialNumber ?? "unknown",
          documentLabel:
            `Вход по ЭП · ${resolution.organization?.shortName || resolution.organization?.fullName || "заказчик не определён"}` +
            (mode === "registry" ? " · без проверки подписи" : ""),
          certificateId: certificate.id,
          certificateOwner: resolution.certificateOwner,
          certificateInn: resolution.certificateInn,
          certificateSerial: certificate.serialNumber,
          certificateFingerprint: certificate.fingerprint,
          certificateAlgorithm:
            signature?.algorithm || certificate.signatureAlgorithm,
          certificateValidTo: certificate.validTo,
          innMatched: certificateBelongsToOrganization(
            certificate,
            resolution.organization?.inn,
          ),
          certificateSource: certificate.source,
          result: resolution.ok
            ? "signed"
            : resolution.status === "account_org_mismatch"
              ? "rejected_certificate"
              : "failed",
          comment:
            resolution.message +
            (signature
              ? ` · подпись набора ${signature.value.slice(0, 12)}…`
              : " · наборт не подписан"),
          createdAt: nowLocalDateTime(),
        };

        try {
          await api.post(
            EVENT_ENDPOINT,
            omitEmptyReferences(SignatureEventSchema.parse(event)),
          );
          queryClient.invalidateQueries({ queryKey: edsEventsQueryKey });
        } catch {
          // Журнал — аудит, он не должен отменять или блокировать сам вход
          logged = false;
        }
      }

      if (resolution.ok && resolution.user?.email) {
        localStorage.setItem("user_email", resolution.user.email);
        queryClient.setQueryData(
          ["user", resolution.user.email],
          resolution.user,
        );
        queryClient.invalidateQueries();
      }

      return { resolution, logged };
    },
  });
};
