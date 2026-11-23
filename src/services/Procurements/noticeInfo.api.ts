import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  BaseEmployeeSchema,
  type BaseEmployee,
} from "../StaffingTable/StaffingTable.schema";
import type { NoticeInfoFormValues } from "./noticeInfo.schema";
import {
  normalizeNoticeAttachments,
  upsertNoticeAttachment,
  type NoticeAttachment,
} from "./noticeAttachment.schema";
import type {
  OrganizationBudgetLevel,
  OrganizationProcurementRequisites,
} from "../Organization/organization.schema";

export interface OrganizationDto {
  id: number | string;
  fullName: string;
  shortName?: string;
  // Реквизиты нужны для кода заказчика в ИКЗ (ИНН 10 + КПП 9 + вид организации)
  inn?: string;
  kpp?: string;
  postalAddress: string;
  legalAddress: string;
  email: string;
  phone: string;
  budgetLevel?: OrganizationBudgetLevel;
  procurementRequisites?: OrganizationProcurementRequisites;
}

export const useGetOrganizationById = (organizationId?: string | number) => {
  return useQuery<OrganizationDto>({
    queryKey: ["organization", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto>(
        `/organizations/${organizationId}`,
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
        `/employees?email=${email}`,
      );
      // json-server возвращает массив даже для одного совпадения.
      return BaseEmployeeSchema.array().parse(data ?? [])[0] ?? null;
    },
  });
};

const omitEmptyReferences = <T extends Record<string, unknown>>(data: T): T =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as T;

export const useNotices = () => {
  return useQuery<NoticeInfoFormValues[]>({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data } = await api.get<NoticeInfoFormValues[]>("/notices");
      return Array.isArray(data) ? data : [];
    },
  });
};

export const useCreateNotice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: NoticeInfoFormValues) => {
      const { data } = await api.post(
        "/notices",
        omitEmptyReferences(payload as Record<string, unknown>),
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
};

/**
 * Прикладывает документы к извещению без перезаписи остальных полей.
 *
 * Используется генераторами и модулями-источниками (приказы и протоколы,
 * ООЗ, обоснование НМЦК, проект контракта): документ не просто скачивается, а
 * становится вложением извещения со статусом и источником. Upsert идёт по паре
 * «источник + категория», поэтому повторное сохранение обновляет запись, а не
 * плодит дубли. Можно передать один документ (`attachment`) или пачку
 * (`attachments`) — например, ООЗ и НМЦК из одной служебной записки.
 */
export const useAttachNoticeAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noticeId,
      attachment,
      attachments,
    }: {
      noticeId: string | number;
      attachment?: NoticeAttachment;
      attachments?: NoticeAttachment[];
    }) => {
      const { data: notice } = await api.get<NoticeInfoFormValues>(
        `/notices/${noticeId}`,
      );
      const current = normalizeNoticeAttachments(notice.attachedDocs);
      const incoming = attachments ?? (attachment ? [attachment] : []);
      const attachedDocs = incoming.reduce(
        (acc, item) => upsertNoticeAttachment(acc, item),
        current,
      );

      const { data: saved } = await api.patch<NoticeInfoFormValues>(
        `/notices/${noticeId}`,
        { attachedDocs },
      );

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
  });
};
