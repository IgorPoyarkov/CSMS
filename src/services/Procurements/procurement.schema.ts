import { z } from "zod";

export const RawProcurementSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  "Идентификационный код закупки": z.string(),
  "Наименование закупки": z.string(),
  "Номер извещения": z.string().nullable().optional(),
  "Начальная (максимальная) цена контракта, руб": z.coerce.number(),
  "Тип закупки": z.string(),
  "Уполномоченный орган (учреждение)": z.string().optional(),
  "Организатор совместной закупки": z.string().optional(),
  "КБК": z.string().optional(),
});

export const ProcurementSchema = RawProcurementSchema.transform((raw) => ({
  id: raw.id ?? raw["Идентификационный код закупки"],
  ikz: raw["Идентификационный код закупки"],
  name: raw["Наименование закупки"],
  noticeNumber: raw["Номер извещения"] || null,
  nmck: raw["Начальная (максимальная) цена контракта, руб"],
  procurementType: raw["Тип закупки"],
  authorizedBodyName: raw["Уполномоченный орган (учреждение)"] || null,
  jointOrganizerName: raw["Организатор совместной закупки"] || null,
  kbk: raw["КБК"] || null,
}));

export const ProcurementListSchema = z.array(ProcurementSchema);

export type RawProcurement = z.infer<typeof RawProcurementSchema>;
export type Procurement = z.infer<typeof ProcurementSchema>;
