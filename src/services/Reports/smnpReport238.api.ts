import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../axios.instance";
import {
  SmnpReport238Schema,
  SmnpReport238StatusSchema,
  normalizeSmnpReport238,
  type SmnpReport238Draft,
} from "./smnpReport238.schema";
import { buildSmnpReport238Xml } from "./smnpReport238.xml";

/**
 * Хранение отчётов по форме ПП РФ № 238.
 *
 * Запись содержит и структурированный отчёт, и готовое XML-представление.
 * Бэкенд получает обе формы в одном документе: report используется для
 * карточки и повторного редактирования, xml — для подписания и размещения.
 */

const ENDPOINT = "/smnpReports238";

export const SmnpReport238RecordSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  year: z.number().int(),
  reportDate: z.string(),
  status: SmnpReport238StatusSchema,
  xml: z.string(),
  report: SmnpReport238Schema,
});

export type SmnpReport238Record = z.infer<typeof SmnpReport238RecordSchema>;

const fetchReportsByOrg = async (
  organizationId: string | number,
): Promise<SmnpReport238Record[]> => {
  const response = await api.get(ENDPOINT, {
    params: { organizationId },
  });

  return z.array(SmnpReport238RecordSchema).parse(response.data);
};

const saveReport = async (
  draft: SmnpReport238Draft,
): Promise<SmnpReport238Record> => {
  const report = normalizeSmnpReport238(draft);
  const xml = buildSmnpReport238Xml(draft);

  const payload = {
    organizationId: report.organizationId,
    year: report.year,
    reportDate: report.reportDate,
    status: report.status,
    xml,
    report,
  };

  const response = draft.id
    ? await api.patch(`${ENDPOINT}/${draft.id}`, payload)
    : await api.post(ENDPOINT, payload);

  return SmnpReport238RecordSchema.parse(response.data);
};

const deleteReport = async (id: string | number): Promise<string | number> => {
  await api.delete(`${ENDPOINT}/${id}`);
  return id;
};

export const smnpReport238QueryKey = ["smnpReport238"];

export const useSmnpReports238 = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...smnpReport238QueryKey, "list", String(organizationId)],
    queryFn: () => fetchReportsByOrg(organizationId as string | number),
    enabled: Boolean(organizationId),
    retry: false,
  });

export const useSaveSmnpReport238 = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveReport,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: smnpReport238QueryKey,
      });
    },
  });
};

export const useDeleteSmnpReport238 = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: smnpReport238QueryKey,
      });
    },
  });
};
