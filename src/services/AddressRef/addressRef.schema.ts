import { z } from "zod";

/**
 * Адресный справочник для каскада «Место поставки товара, выполнения работы
 * или оказания услуги» (Tasks 7, п. 2).
 *
 * Место поставки указывается последовательностью выборов по уровням: страна,
 * субъект Российской Федерации, муниципальное образование, населённый пункт,
 * адрес. Полную иерархию ведёт ФИАС (ГАР), но доступ к API ФНС выдаётся по
 * мастер-токену, поэтому систему обеспечиваем перечнем субъектов РФ и
 * подсказками по муниципальным образованиям, а недостающие уровни заказчик
 * вводит руками — требование ст. 33 ч. 1 п. 1 44-ФЗ при этом выполняется.
 */

export const AddressRegionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  kind: z.string().optional(),
  country: z.string().optional(),
});

export type AddressRegion = z.infer<typeof AddressRegionSchema>;

export const AddressMunicipalitySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  regionId: z.union([z.string(), z.number()]),
  name: z.string(),
  kind: z.string().optional(),
});

export type AddressMunicipality = z.infer<typeof AddressMunicipalitySchema>;

// Уровень «страна» в закупках по 44-ФЗ почти всегда один и тот же, поэтому он
// подставляется по умолчанию, а не выбирается каждый раз
export const RUSSIA = "Российская Федерация";

// Уровни места поставки: порядок соответствует формулировке извещения
export const DeliveryAddressPartsSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  municipality: z.string().optional(),
  settlement: z.string().optional(),
  address: z.string().optional(),
  additionalInfo: z.string().optional(),
});

export type DeliveryAddressParts = z.infer<typeof DeliveryAddressPartsSchema>;

/**
 * Строка места поставки для документов: «Российская Федерация, обл Курская,
 * г.о. город Курск, г Курск, Транспортная развязка на улице Карла Маркса в
 * месте примыкания проспекта Победы». Пустые уровни не печатаются, чтобы в
 * строке не появлялось пустых запятых.
 */
export const formatDeliveryAddress = (
  parts: DeliveryAddressParts | undefined,
): string =>
  [
    parts?.country,
    parts?.region,
    parts?.municipality,
    parts?.settlement,
    parts?.address,
    parts?.additionalInfo,
  ]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(", ");
