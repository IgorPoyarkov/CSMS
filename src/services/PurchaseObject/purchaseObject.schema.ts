import { z } from "zod";
import {
  getObjectDescriptionOkpd2Codes,
  ObjectCharacteristicSchema,
  ObjectStandardRefSchema,
  type ObjectDescription,
} from "../ObjectDescription/objectDescription.schema";

/**
 * Объект закупки — отдельная сущность, а не строка в плоском списке ООЗ.
 *
 * Один ООЗ может описывать несколько объектов (ПП РФ № 1875 / ЕИС 17.0
 * допускает один ОКПД2 на позицию), у каждого объекта свои характеристики,
 * единица, количество, КТРУ, связь с позицией плана-графика и СЗ. Дочерний
 * объект ссылается на родительский (WORK/SERVICE) через `parentObjectId`
 * либо внешний `parentExternalSid` — в ЕИС это `parentPurchaseObject`.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();
const optionalString = () => z.string().optional().default("");

export const PURCHASE_OBJECT_SOURCES = [
  "manual",
  "template",
  "history",
] as const;
export type PurchaseObjectSource = (typeof PURCHASE_OBJECT_SOURCES)[number];

export const PURCHASE_OBJECT_PRODUCT_TYPES = [
  "PRODUCT",
  "WORK",
  "SERVICE",
] as const;
export type PurchaseObjectProductType =
  (typeof PURCHASE_OBJECT_PRODUCT_TYPES)[number];

export const PurchaseObjectSchema = z.object({
  id: idSchema(),
  organizationId: idSchema(),

  // Связи: ООЗ описывает объект, позиция ПГ и СЗ определяют закупку.
  // До создания СЗ объект связывается напрямую с позицией плана-графика.
  objectDescriptionId: idSchema(),
  purchasePlanId: idSchema(),
  positionId: idSchema(),
  purchaseNoteId: idSchema(),
  // Реквизиты позиции ПГ: по ним в ЕИС 17.0 строятся отдельные
  // customerRequirementInfo/tenderPlan2020Info и ИКЗ на объект.
  plan2020Number: optionalString(),
  positionUniqueNumber: optionalString(),
  positionSerialNumber: optionalString(),
  ikz: optionalString(),

  // Внешние идентификаторы ЕИС: по externalSid связываются дочерние объекты.
  externalSid: z.string().optional(),

  name: z.string(),
  okpd2Code: z.string(),
  okpd2Name: optionalString(),
  ktruCode: optionalString(),
  ktruName: optionalString(),
  okeiCode: optionalString(),
  unit: optionalString(),
  quantity: optionalString(),
  isIndeterminateVolume: z.boolean().optional().default(false),
  productType: z
    .enum(PURCHASE_OBJECT_PRODUCT_TYPES)
    .optional()
    .default("PRODUCT"),

  // Характеристики и стандарты — свои у каждого объекта, а не общие на ООЗ.
  characteristics: z.array(ObjectCharacteristicSchema).default([]),
  standards: z.array(ObjectStandardRefSchema).default([]),
  useKtru: z.boolean().optional().default(false),

  // «Входит в состав работы или услуги»: родительский объект закупки.
  // Родитель в ЕИС может быть только WORK или SERVICE.
  isPartOfWorkService: z.boolean().optional().default(false),
  parentObjectId: idSchema(),
  parentExternalSid: z.string().optional(),
  parentOkpd2Code: z.string().optional(),
  parentOkpd2Name: z.string().optional(),

  // Повторное использование: объект найден в шаблоне или истории закупок.
  source: z
    .enum(PURCHASE_OBJECT_SOURCES)
    .optional()
    .default("manual"),
  sourceObjectId: idSchema(),

  status: z.enum(["draft", "approved"]).optional().default("draft"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PurchaseObject = z.infer<typeof PurchaseObjectSchema>;
export type PurchaseObjectInput = z.input<typeof PurchaseObjectSchema>;
export const PurchaseObjectListSchema = z.array(PurchaseObjectSchema);

export const emptyPurchaseObject = (): PurchaseObjectInput => ({
  name: "",
  okpd2Code: "",
  okpd2Name: "",
  ktruCode: "",
  ktruName: "",
  okeiCode: "",
  unit: "",
  quantity: "1",
  isIndeterminateVolume: false,
  productType: "PRODUCT",
  characteristics: [],
  standards: [],
  useKtru: false,
  isPartOfWorkService: false,
  source: "manual",
  status: "draft",
});

/**
 * Одноразовая миграция плоских полей ООЗ: каждый код ОКПД2 становится
 * отдельным объектом. Характеристики старого ООЗ переходят первому объекту —
 * остальные остаются без характеристик и заполняются пользователем.
 */
export const buildPurchaseObjectsFromDescription = (
  desc: Pick<
    ObjectDescription,
    | "id"
    | "organizationId"
    | "purchasePlanId"
    | "positionId"
    | "ikz"
    | "okpd2Code"
    | "okpd2Name"
    | "okpd2Items"
    | "title"
    | "ktruCode"
    | "ktruName"
    | "unit"
    | "quantity"
    | "isIndeterminateVolume"
    | "characteristics"
    | "standards"
    | "useKtru"
    | "status"
  >,
): PurchaseObjectInput[] =>
  getObjectDescriptionOkpd2Codes(desc).map((code, index) => ({
    ...emptyPurchaseObject(),
    // Старые ООЗ уже сохранены: жёстко привязываем объекты к ним, чтобы
    // повторный вызов миграции не создал дубли.
    objectDescriptionId: desc.id,
    organizationId: desc.organizationId ?? undefined,
    purchasePlanId: desc.purchasePlanId,
    positionId: desc.positionId,
    ikz: desc.ikz,
    name: index === 0 ? desc.title : code.name || desc.title,
    okpd2Code: code.code,
    okpd2Name: code.name ?? desc.okpd2Name,
    ktruCode: index === 0 ? desc.ktruCode : "",
    ktruName: index === 0 ? desc.ktruName : "",
    unit: desc.unit,
    quantity: desc.quantity,
    isIndeterminateVolume: desc.isIndeterminateVolume,
    useKtru: index === 0 ? desc.useKtru : false,
    characteristics: index === 0 ? desc.characteristics : [],
    standards: index === 0 ? desc.standards : [],
    status: desc.status === "approved" ? "approved" : "draft",
  }));
