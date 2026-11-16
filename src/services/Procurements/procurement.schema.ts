import { z } from "zod";

export const RawProcurementSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  "Идентификационный код закупки": z.string(),
  "Наименование закупки": z.string(),
  "Номер извещения": z.string().nullable().optional(),
  "Начальная (максимальная) цена контракта, руб": z.coerce.number(),
  "Тип закупки": z.string(),
});

export const ProcurementSchema = RawProcurementSchema.transform((raw) => ({
  id: raw.id ?? raw["Идентификационный код закупки"],
  ikz: raw["Идентификационный код закупки"],
  name: raw["Наименование закупки"],
  noticeNumber: raw["Номер извещения"] || null,
  nmck: raw["Начальная (максимальная) цена контракта, руб"],
  procurementType: raw["Тип закупки"],
}));

export const ProcurementListSchema = z.array(ProcurementSchema);

export type RawProcurement = z.infer<typeof RawProcurementSchema>;
export type Procurement = z.infer<typeof ProcurementSchema>;
