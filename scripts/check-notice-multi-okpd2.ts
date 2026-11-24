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
import { buildExtraPurchaseItems } from "../src/services/Procurements/noticePurchaseObjects";

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

const base = {
  id: "sz-item-1",
  externalSid: "",
  productType: "PRODUCT",
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
  takeMissingOkpd2Codes(getObjectDescriptionOkpd2Codes(desc), new Set(["19.20.21"])).map(
    (item) => item.code,
  ),
  ["42.11.20.200", "71.12.14"],
);

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
const xml = buildNotification2020XmlPreview(notice);
assert.equal((xml.match(/<OKPD2>/g) ?? []).length, 3);
console.log(
  "OK: ООЗ с 3 кодами → 3 позиции извещения → 3 блока OKPD2 в XML ЕИС 17.0",
);
