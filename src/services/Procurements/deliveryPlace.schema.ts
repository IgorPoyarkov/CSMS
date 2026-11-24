import { z } from "zod";

/**
 * Место поставки указывается каскадом уровней (Tasks 7, п. 2): страна, субъект
 * Российской Федерации, муниципальное образование, населённый пункт и адрес.
 * Промежуточные уровни необязательны — место поставки допускается описать и
 * строкой адреса, если справочник региона не подключён.
 *
 * Схема вынесена из noticeInfo.schema, чтобы СЗ не тянула за собой всё
 * извещение (там есть циклическая связь с вложениями и СЗ).
 */
export const DeliveryPlaceSchema = z.object({
  id: z.string(),
  country: z.string(),
  oksmCode: z.string().optional(),
  garGuid: z.string().optional(),
  region: z.string().optional(),
  municipality: z.string().optional(),
  settlement: z.string().optional(),
  address: z.string(),
  additionalInfo: z.string().optional(),
});

export type DeliveryPlace = z.infer<typeof DeliveryPlaceSchema>;
