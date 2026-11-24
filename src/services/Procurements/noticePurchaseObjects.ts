import { takeMissingOkpd2Codes } from "../ObjectDescription/objectDescription.schema";
import type { NoticeInfoFormValues } from "./noticeInfo.schema";

export type NoticePurchaseItem =
  NoticeInfoFormValues["purchaseObjects"]["items"][number];

/**
 * ЕИС 17.0 принимает один код ОКПД2 на позицию объекта закупки, поэтому
 * дополнительные коды ООЗ разворачиваются в отдельные позиции. Цена и объём
 * новых позиций не копируются с основной: иначе НМЦК вырастет в разы.
 */
export const buildExtraPurchaseItems = (
  base: NoticePurchaseItem,
  allOkpd2: Array<{ code: string; name?: string }>,
  usedCodes: Set<string>,
  suffix: string,
): NoticePurchaseItem[] =>
  takeMissingOkpd2Codes(allOkpd2, usedCodes).map((entry, idx) => ({
    ...base,
    id: `${base.id}-${suffix}-${idx + 1}`,
    // Внешний SID должен быть уникальным и у дополнительных позиций:
    // по нему ЕИС связывает дочерний объект с родительским.
    externalSid: `${base.externalSid || base.id}-${suffix}-${idx + 1}`,
    okpd2OrKtruCode: entry.code,
    okpd2Code: entry.code,
    ktruCode: "",
    ktruName: "",
    name: entry.name?.trim() || base.name,
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
  }));
