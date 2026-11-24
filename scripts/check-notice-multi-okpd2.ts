import assert from "node:assert/strict";
import {
  buildNotification2020XmlPreview,
  mapNoticeInfoToEis17,
} from "../src/services/Eis/eis17Types";
import {
  getObjectDescriptionOkpd2Codes,
  takeMissingOkpd2Codes,
  toNoticeObjectDescriptionFields,
} from "../src/services/ObjectDescription/objectDescription.schema";
import type { NoticeInfoFormValues } from "../src/services/Procurements/noticeInfo.schema";
import {
  buildExtraPurchaseItems,
  buildNoticeItemsFromPurchaseObjects,
} from "../src/services/Procurements/noticePurchaseObjects";

/**
 * Smoke-проверка связи ООЗ с несколькими кодами ОКПД2 и извещением.
 *
 * ЕИС 17.0 принимает один код ОКПД2 на позицию объекта закупки, поэтому
 * дополнительные коды из ООЗ должны разворачиваться в отдельные позиции
 * извещения и попадать в XML отдельными блоками <OKPD2>.
 *
 * Запуск: npm run check:notice-okpd2.
 */
const desc = {
  id: 1,
  kind: "object_description",
  status: "draft",
  title: "Тестовый объект",
  okpd2Code: "42.11.20.200",
  okpd2Name: "Работы по ремонту автомобильных дорог",
  okpd2Items: [
    { code: "19.20.21", name: "Топливо моторное" },
    { code: "71.12.14", name: "Проектирование" },
  ],
  characteristics: [],
  standards: [],
} as any;

const fields = toNoticeObjectDescriptionFields(desc);
assert.deepEqual(fields.okpd2Items, [
  { code: "19.20.21", name: "Топливо моторное" },
  { code: "71.12.14", name: "Проектирование" },
]);
assert.equal(
  fields.otherRequirements?.includes("Дополнительные коды ОКПД2"),
  false,
);

const ikz1 = "1".repeat(36);
const ikz2 = "2".repeat(36);

const base = {
  id: "sz-item-1",
  externalSid: "sz-item-1-sid",
  ikz: ikz1,
  positionUniqueNumber: "PG-1",
  positionSerialNumber: "7",
  // Родительская работа/услуга: дочерние OBJECT ссылаются на её externalSid.
  productType: "SERVICE",
  okpd2OrKtruCode: "42.11.20.200",
  okpd2Code: "42.11.20.200",
  name: "Тестовый объект",
  unit: "компл",
  quantity: 1,
  unitPrice: 100,
  totalPrice: 100,
  volumeSpecifyingMethod: "QF",
  nationalRegimeType: "none",
  imposibilityBan: false,
  imposibilityBanReason: "",
} as any;

const usedCodes = new Set<string>(["42.11.20.200"]);
const extras = buildExtraPurchaseItems(
  base,
  getObjectDescriptionOkpd2Codes(desc),
  usedCodes,
  "okpd2-1",
);
assert.equal(extras.length, 2);
assert.deepEqual(
  extras.map((item) => item.okpd2Code),
  ["19.20.21", "71.12.14"],
);
assert.equal(extras.every((item) => item.totalPrice === 0), true);
assert.deepEqual(
  extras.map((item) => item.externalSid),
  ["sz-item-1-sid-okpd2-1-1", "sz-item-1-sid-okpd2-1-2"],
);
assert.deepEqual(
  takeMissingOkpd2Codes(getObjectDescriptionOkpd2Codes(desc), new Set(["19.20.21"])).map(
    (item) => item.code,
  ),
  ["42.11.20.200", "71.12.14"],
);

// Дочерний объект «входит в состав работы или услуги»: ссылка на родителя
// и карточка родителя уходят в разные блоки XML ЕИС 17.0.
(extras[0] as any).parentObjectId = base.id;
(extras[0] as any).parentExternalSid = base.externalSid;
(extras[0] as any).parentOkpd2Code = base.okpd2Code;
(extras[0] as any).parentOkpd2Name = base.name;

// Вторая позиция из другой ПГ: в XML должно быть два customerRequirementInfo.
(extras[1] as any).ikz = ikz2;
(extras[1] as any).positionUniqueNumber = "PG-2";
(extras[1] as any).positionSerialNumber = "9";

// SF остался только в старых извещениях: в ЕИС 17.0 допустимы QF и VTF
(extras[0] as any).volumeSpecifyingMethod = "SF";

const notice = {
  notificationType: "EF2020",
  versionNumber: "1",
  generalInfo: {
    placingWayCode: "OKP20",
    noticeNumber: "1",
    orderName: "Тест",
    initialUnitPriceSum: 100,
    maxContractPrice: 100,
    nmck: 100,
    ikz: ikz1,
    // 27–29 разряды ИКЗ: в XML это IKZInfo/purchaseOrderNumber.
    positionSerialNumber: "7",
  },
  procedureInfo: {},
  contactInfo: { phoneNum: {}, faxNum: {} },
  contractConditions: { deliveryPlaces: [], currencyCode: "643" },
  participantsRequirements: { evaluationCriteria: [] },
  purchaseObjects: {
    items: [base, ...extras],
    isStructuredForm: true,
    medicines: [],
  },
  supplierRequirements: {},
  generalRequirements: {},
  attachedDocs: [],
  objectDescription: fields,
} as unknown as NoticeInfoFormValues;

const dto = mapNoticeInfoToEis17(notice);
assert.equal(dto.notificationInfo.purchaseObjectsInfo.objects.length, 3);
assert.deepEqual(
  dto.notificationInfo.purchaseObjectsInfo.objects.map(
    (item) => item.volumeSpecifyingMethod,
  ),
  ["QF", "VTF", "QF"],
);
assert.equal(
  dto.notificationInfo.customerRequirementInfos?.length,
  2,
  "два объекта из разных позиций ПГ → два требования заказчика",
);
assert.equal(
  dto.notificationInfo.purchaseObjectsInfo.parentObjects.length,
  1,
  "должна быть карточка родительского объекта",
);
assert.equal(
  dto.notificationInfo.purchaseObjectsInfo.parentObjects[0]?.productType,
  "SERVICE",
);
assert.equal(
  dto.notificationInfo.purchaseObjectsInfo.objects[1]?.parentPurchaseObject
    ?.externalSid,
  "sz-item-1-sid",
  "дочерняя позиция должна ссылаться на родителя",
);

const xml = buildNotification2020XmlPreview(notice);
// 3 позиции + карточка родителя (у неё тоже обязателен OKPD2 по XSD).
assert.equal(
  (xml.match(/<OKPD2>/g) ?? []).length,
  4,
  "3 позиции + карточка родителя",
);
assert.equal(
  xml.includes("<volumeSpecifyingMethod>VTF</volumeSpecifyingMethod>"),
  true,
);
assert.equal(xml.includes("<volumeSpecifyingMethod>SF<"), false);
assert.equal(xml.includes("<externalSid>sz-item-1-sid</externalSid>"), true);
assert.equal(
  xml.includes(
    "<parentPurchaseObject><externalSid>sz-item-1-sid</externalSid></parentPurchaseObject>",
  ),
  true,
  "parentPurchaseObject в позиции",
);
assert.equal(
  (xml.match(/<customerRequirementInfo>/g) ?? []).length,
  2,
  "два блока customerRequirementInfo в XML",
);
assert.equal(
  xml.includes("<purchaseOrderNumber>009</purchaseOrderNumber>"),
  true,
  "второй ИКЗ из другой позиции ПГ",
);
assert.equal(
  xml.includes("<notDrugPurchaseParentObjectsInfo>"),
  true,
  "карточка родителя в XML",
);
const nonDrugObjectsBlock =
  xml.match(/<notDrugPurchaseObjectsInfo>([\s\S]*?)<\/notDrugPurchaseObjectsInfo>/)?.[1] ??
  "";
assert.match(
  nonDrugObjectsBlock,
  /<quantityUndefined>false<\/quantityUndefined>/,
  "quantityUndefined обязателен внутри нелекарственного блока",
);
assert.match(
  nonDrugObjectsBlock,
  /<isStructuredForm>true<\/isStructuredForm>/,
  "isStructuredForm внутри нелекарственного блока",
);
assert.equal(
  xml.indexOf("<notDrugPurchaseParentObjectsInfo>") >
    xml.indexOf("</notDrugPurchaseObjectsInfo>"),
  true,
  "родительский блок — sibling после позиций",
);
assert.equal(
  xml.includes(
    "<IKZInfo><purchaseOrderNumber>007</purchaseOrderNumber></IKZInfo>",
  ),
  true,
  "порядковый номер закупки в ИКЗ",
);
// Вид предмета ООЗ — доменный источник правды. В ЕИС 17.0 допустимы только
// PRODUCT/WORK/SERVICE; «товар при работе/услуге» — PRODUCT + родительский
// объект, при этом XSD-значение PRODUCT_DURING_WORK/SERVICE не отправляется.
const supplyDesc = {
  id: 77,
  kind: "object_description",
  status: "approved" as const,
  title: "Поставка расходных материалов при ремонте",
  okpd2Code: "19.20.21",
  okpd2Name: "Топливо моторное",
  okpd2Items: [],
  productType: "PRODUCT_DURING_WORK" as const,
  isIndeterminateVolume: false,
  characteristics: [],
  standards: [],
  organizationId: 1,
  createdAt: "",
  updatedAt: "",
};
const workObject = {
  id: 88,
  externalSid: "88",
  organizationId: 1,
  objectDescriptionId: 77,
  okpd2Code: "42.11.20.200",
  okpd2Name: "Работы по ремонту автомобильных дорог",
  productType: "WORK" as const,
  quantity: 1,
  unit: "Условная единица",
};
const supplyObject = {
  id: 89,
  externalSid: "89",
  organizationId: 1,
  objectDescriptionId: 77,
  okpd2Code: "19.20.21",
  okpd2Name: "Топливо моторное",
  productType: "PRODUCT_DURING_WORK" as const,
  parentObjectId: workObject.id,
  quantity: 1,
  unit: "л",
};
const supplyBase = {
  ...base,
  id: "supply-base",
  externalSid: "supply-base-sid",
  productType: "PRODUCT" as const,
  okpd2OrKtruCode: "",
  okpd2Code: "",
  name: supplyDesc.title,
};
const supplyItems = buildNoticeItemsFromPurchaseObjects(
  [workObject, supplyObject],
  supplyBase,
  new Set<string>(),
  "supply",
);
assert.equal(supplyItems.length, 2, "родительская работа и встроенная поставка");
const embedded = supplyItems.find(
  (item) => item.okpd2Code === supplyObject.okpd2Code,
);
const work = supplyItems.find(
  (item) => item.okpd2Code === workObject.okpd2Code,
);
assert.equal(
  embedded?.productType,
  "PRODUCT",
  "пятизначный тип не уходит в ЕИС",
);
assert.equal(
  embedded?.isSupplyDuringWorks,
  true,
  "флаг isSupplyDuringWorks наследуется из типа ООЗ",
);
assert.equal(
  embedded?.parentExternalSid,
  "88",
  "родительская карточка WORK связана через externalSid",
);
assert.equal(work?.productType, "WORK", "родитель остаётся WORK");
assert.equal(
  work?.isSupplyDuringWorks,
  false,
  "у родителя нет флага встроенной поставки",
);
const supplyNotice = {
  ...notice,
  purchaseObjects: { ...notice.purchaseObjects, items: supplyItems },
  objectDescription: toNoticeObjectDescriptionFields(supplyDesc),
} as NoticeInfoFormValues;
const supplyDto = mapNoticeInfoToEis17(supplyNotice);
const supplyObjects = supplyDto.notificationInfo.purchaseObjectsInfo.objects;
assert.equal(
  supplyObjects.every((item) => item.type === "PRODUCT" || item.type === "WORK"),
  true,
  "в DTO ЕИС 17.0 нет пятизначного типа",
);
assert.equal(
  supplyObjects.find((item) => item.externalSid === "89")?.parentPurchaseObject
    ?.externalSid,
  "88",
  "родитель WORK в DTO ЕИС (isSupplyDuringWorks в XML не отправляется)",
);
console.log(
  "OK: ООЗ с 3 кодами → 3 позиции, SF → VTF, parentPurchaseObject + карточка родителя, ИКЗ 007; 5-й тип → PRODUCT + isSupplyDuringWorks",
);
