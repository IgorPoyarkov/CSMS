import {
  formatCharacteristicValue,
  takeMissingOkpd2Codes,
} from "../ObjectDescription/objectDescription.schema";
import type { PurchaseObject } from "../PurchaseObject/purchaseObject.schema";
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

/**
 * Разворот отдельной коллекции объектов закупки в позиции извещения.
 * В отличие от плоского `okpd2Items`, здесь переносятся свои характеристики,
 * КТРУ, единица, количество и связь «входит в состав работы или услуги».
 */
export const buildNoticeItemsFromPurchaseObjects = (
  objects: PurchaseObject[],
  base: NoticePurchaseItem,
  usedCodes: Set<string>,
  suffix: string,
): NoticePurchaseItem[] =>
  objects.flatMap((object, idx) => {
    const code = object.okpd2Code.trim();
    const key = code.toLowerCase();
    if (!key || usedCodes.has(key)) return [];
    usedCodes.add(key);

    const quantity = Number.parseFloat(String(object.quantity ?? ""));
    const parentExternalSid =
      object.parentExternalSid ||
      (object.parentObjectId !== undefined
        ? String(object.parentObjectId)
        : "");

    return [
      {
        ...base,
        id: `${base.id}-${suffix}-${idx + 1}`,
        externalSid:
          object.externalSid || `${base.externalSid || base.id}-${suffix}-${idx + 1}`,
        purchaseObjectId: object.id,
        objectDescriptionId:
          object.objectDescriptionId ?? base.objectDescriptionId,
        purchasePlanId: object.purchasePlanId,
        positionId: object.positionId,
        plan2020Number: object.plan2020Number || undefined,
        positionUniqueNumber: object.positionUniqueNumber || undefined,
        positionSerialNumber: object.positionSerialNumber || undefined,
        ikz: object.ikz || undefined,
        parentObjectId: object.parentObjectId,
        parentExternalSid: parentExternalSid || undefined,
        parentOkpd2Code: object.parentOkpd2Code || undefined,
        parentOkpd2Name: object.parentOkpd2Name || undefined,
        productType: object.productType ?? "PRODUCT",
        okpd2OrKtruCode: code,
        okpd2Code: code,
        ktruCode: object.ktruCode ?? "",
        ktruName: object.ktruName ?? "",
        name: object.name || base.name,
        unit: object.unit || base.unit,
        quantity:
          Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        unitPrice: 0,
        totalPrice: 0,
        normingRequirements: (object.characteristics ?? []).map((c) => ({
          id: c.id,
          requirementType: (["consumer", "quality", "functional"].includes(
            c.category,
          )
            ? c.category
            : "other") as "consumer" | "quality" | "functional" | "other",
          requirementText: `${c.name}: ${formatCharacteristicValue(c)}`,
        })),
      },
    ];
  });
