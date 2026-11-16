import { z } from "zod";

/**
 * Справочник ОКПД2 (Одиннадцать классификаций товаров, работ, услуг).
 *
 * Код: 6-12 цифр с точками (2.1.23.456 или 2.1.23).
 * `isNormed` — помечает позиции, подпадающие под обязательное нормирование
 * (ПП 926 «Общие правила определения требований…», ПП 1047 «Нормативные затраты»).
 * `normLimit` — предельная цена (руб.) для нормируемых позиций, если установлена.
 */

export const Okpd2RefSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  code: z
    .string()
    .regex(/^\d{1,3}(?:\.\d{1,3}){1,5}$/, "Код ОКПД2 должен содержать 1-6 разрядов через точку"),
  name: z.string().min(2, "Укажите наименование товара, работы, услуги по ОКПД2"),
  isNormed: z.boolean().default(false),
  normLimit: z.coerce.number().min(0).optional(),
});

export type Okpd2Ref = z.infer<typeof Okpd2RefSchema>;
export const Okpd2RefListSchema = z.array(Okpd2RefSchema);
