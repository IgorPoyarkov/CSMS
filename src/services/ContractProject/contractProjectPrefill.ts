import type { BaseOrganization } from "../Organization/organization.schema";
import type { NoticeInfoFormValues } from "../Procurements/noticeInfo.schema";
import type { PurchaseNote } from "../PurchaseNote/purchaseNote.schema";
import type { ObjectDescription } from "../ObjectDescription/objectDescription.schema";
import { buildObjectDescriptionSummaryText } from "../ObjectDescription/objectDescription.schema";
import { PLACING_WAYS_ALL } from "../Procurements/noticeInfo.config";
import {
  addCalendarDays,
  emptyContractProject,
  type ContractKind,
  type ContractProject,
} from "./contractProject.schema";
import {
  buildDefaultAppendices,
  contractKindTerms,
  detectContractKind,
} from "./contractStructure";

/**
 * Предзаполнение проекта контракта по цепочке.
 *
 * Проект контракта — уровень контракта, но он «знает» всю структуру
 * извещения: предмет и объект, цену, сроки и этапы, приёмку, качество,
 * обеспечения, СМП, сопровождение и реквизиты. Источники по убыванию
 * приоритета:
 *   1) сохранённый проект (не перезаписываем);
 *   2) извещение (ст. 33, 34, 51 44-ФЗ);
 *   3) служебная записка по позиции ПГ (исходные требования);
 *   4) структурированное ООЗ (описание объекта);
 *   5) карточка организации (реквизиты заказчика).
 */

export interface ContractPrefillSources {
  organizationId: string | number;
  notice?: NoticeInfoFormValues | null;
  note?: PurchaseNote | null;
  objectDescription?: ObjectDescription | null;
  organization?: BaseOrganization | null;
  procurementType?: string;
  supplierName?: string;
  ikz?: string;
  noticeNumber?: string;
  nmck?: number;
  contractName?: string;
  today?: string;
}

const toMoney = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return num.toFixed(2);
};

const formatAddress = (place: {
  country?: string;
  region?: string;
  municipality?: string;
  settlement?: string;
  address?: string;
  additionalInfo?: string;
}): string =>
  [
    place.country,
    place.region,
    place.municipality,
    place.settlement,
    place.address,
    place.additionalInfo,
  ]
    .filter(Boolean)
    .join(", ");

const placingWayLabel = (code?: string): string =>
  PLACING_WAYS_ALL.find((way) => way.code === code)?.label ?? "";

const defaultChangeConditions = (kind: ContractKind): string =>
  kind === "goods"
    ? "Изменение существенных условий Контракта допускается по основаниям, предусмотренным ст. 95 Закона № 44-ФЗ, в том числе при снижении цены Контракта без изменения количества товара и при изменении количества товара не более чем на 10 %."
    : "Изменение существенных условий Контракта допускается по основаниям, предусмотренным ст. 95 Закона № 44-ФЗ, в том числе при изменении объёма работ (услуг) не более чем на 10 % и при изменении цены в сторону уменьшения без изменения объёма.";

const defaultTerminationConditions = (): string =>
  "Расторжение Контракта допускается по соглашению сторон, по решению суда, а также в связи с односторонним отказом стороны от исполнения Контракта по основаниям, предусмотренным Гражданским кодексом Российской Федерации и ч. 8–19 ст. 95 Закона № 44-ФЗ.";

const defaultCustomerRights = (kind: ContractKind): string => {
  const terms = contractKindTerms(kind);
  return [
    `Заказчик вправе требовать от ${terms.contractorRoleGenitive} надлежащего исполнения обязательств по Контракту, а также требовать устранения выявленных недостатков в установленный срок.`,
    "Заказчик обязан принять исполненное по Контракту в порядке, предусмотренном разделом «Порядок приёмки», и оплатить его в установленный срок при условии надлежащего исполнения.",
    "Заказчик вправе проводить экспертизу результатов исполнения Контракта своими силами или с привлечением экспертов (ч. 3 ст. 94 Закона № 44-ФЗ).",
  ].join("\n");
};

const defaultSupplierRights = (kind: ContractKind): string => {
  const terms = contractKindTerms(kind);
  return [
    `${terms.contractorRole} обязан ${terms.performVerb} ${terms.subjectAccusative} в полном объёме, в сроки и по цене, установленные Контрактом, и передать Заказчику документы, подтверждающие исполнение.`,
    `${terms.contractorRole} вправе требовать оплаты надлежаще исполненного и принятого Заказчиком обязательства в порядке и сроки, установленные Контрактом.`,
    `${terms.contractorRole} обязан за свой счёт устранять недостатки, выявленные при приёмке и в течение гарантийного срока.`,
  ].join("\n");
};

const defaultProjectDocs = (kind: ContractKind): string => {
  if (kind === "works_capital_repair" || kind === "works_repair") {
    return [
      "в) проектная документация объекта;",
      "г) акт, утверждённый застройщиком или техническим заказчиком и содержащий перечень дефектов оснований, строительных конструкций, систем инженерно-технического обеспечения и сетей с указанием качественных и количественных характеристик таких дефектов;",
      "д) утверждённый перечень исполнительной документации объекта;",
      "е) стандарты организаций (при наличии);",
      "ж) иные документы, предусмотренные законодательством о градостроительной деятельности и необходимые для надлежащего исполнения Контракта.",
    ].join("\n");
  }
  if (kind === "design_survey") {
    return [
      "а) задание на выполнение проектно-изыскательских работ;",
      "б) исходные данные, предоставляемые Заказчиком;",
      "в) требования к составу, содержанию и оформлению проектной документации и результатов инженерных изысканий;",
      "г) иные документы, необходимые для выполнения работ по Контракту.",
    ].join("\n");
  }
  return [
    "в) результаты инженерных изысканий;",
    "г) проектная документация объекта;",
    "д) утверждённый перечень исполнительной документации объекта;",
    "е) разрешение на строительство объекта (при наличии);",
    "ж) градостроительный план земельного участка;",
    "з) технические условия подключения (технологического присоединения) объекта к сетям инженерно-технического обеспечения;",
    "и) стандарты организаций (при наличии);",
    "к) иные документы, предусмотренные законодательством о градостроительной деятельности.",
  ].join("\n");
};

const defaultSmpTerms = (
  percent: string,
  attractDays: number,
  paymentDays: number,
  reportingDays: number,
): string =>
  [
    `Объём привлечения субподрядчиков (соисполнителей) из числа субъектов малого предпринимательства и социально ориентированных некоммерческих организаций — не менее ${percent || "5"} % от цены Контракта.`,
    `В срок не более ${attractDays} рабочих дней со дня заключения договора с субподрядчиком (соисполнителем) ${"Поставщик"} представляет Заказчику декларацию о принадлежности к субъектам малого предпринимательства (СОНКО) и заверенную копию такого договора.`,
    `Оплата обязательств перед субподрядчиком (соисполнителем) производится в течение ${paymentDays} рабочих дней с даты подписания документа о приёмке.`,
    `В течение ${reportingDays} рабочих дней со дня оплаты обязательств перед субподрядчиком (соисполнителем) представляются копии документов о приёмке и копии платёжных поручений.`,
  ].join("\n");

export const buildContractProjectDraft = (
  sources: ContractPrefillSources,
): ContractProject => {
  const today = sources.today ?? new Date().toISOString().slice(0, 10);
  const notice = sources.notice ?? null;
  const note = sources.note ?? null;
  const ooz = sources.objectDescription ?? null;
  const organization = sources.organization ?? null;

  const noticeItems = notice?.purchaseObjects?.items ?? [];
  const firstItem = noticeItems[0];

  const procurementType =
    sources.procurementType ||
    note?.procurementType ||
    (notice?.generalInfo?.orderName ?? "");

  const objectTitle =
    ooz?.title ||
    notice?.objectDescription?.objectName ||
    notice?.generalInfo?.orderName ||
    note?.subject ||
    sources.contractName ||
    "";

  const kind = detectContractKind({
    procurementType,
    okpd2Code:
      notice?.objectDescription?.okpd2Code ||
      firstItem?.okpd2OrKtruCode ||
      note?.okpd2Code,
    objectName: objectTitle,
    description: note?.subject || notice?.generalInfo?.orderName,
    placingWayCode: notice?.generalInfo?.placingWayCode,
  });
  const terms = contractKindTerms(kind);
  const project = emptyContractProject(sources.organizationId, kind);

  // ─── Предмет ─────────────────────────────────────────────────────────────
  const descriptionParts: string[] = [];
  if (ooz) {
    descriptionParts.push(buildObjectDescriptionSummaryText(ooz));
  } else if (notice?.objectDescription) {
    const obj = notice.objectDescription;
    if (obj.consumerProperties)
      descriptionParts.push(
        `Потребительские свойства: ${obj.consumerProperties}`,
      );
    if (obj.qualityCharacteristics)
      descriptionParts.push(
        `Качественные характеристики: ${obj.qualityCharacteristics}`,
      );
    if (obj.functionalProperties)
      descriptionParts.push(
        `Функциональные характеристики: ${obj.functionalProperties}`,
      );
    if (obj.environmentalCharacteristics)
      descriptionParts.push(
        `Экологические характеристики: ${obj.environmentalCharacteristics}`,
      );
    if (obj.otherRequirements) descriptionParts.push(obj.otherRequirements);
  }
  if (descriptionParts.length === 0 && note) {
    descriptionParts.push(note.subject);
    if (note.otherRequirements) descriptionParts.push(note.otherRequirements);
  }
  if (descriptionParts.length === 0) {
    descriptionParts.push(
      `Объект закупки: ${objectTitle || "описание объекта закупки"}.`,
    );
  }

  const quantityText =
    notice?.purchaseObjects?.isIndeterminateVolume ||
    note?.isIndeterminateVolume
      ? "Объём не определяется (ч. 24 ст. 22 Закона № 44-ФЗ), цена единицы указана в приложении «Спецификация»"
      : noticeItems.length > 0
        ? noticeItems
            .map((item) => `${item.quantity} ${item.unit}`.trim())
            .join("; ")
        : note?.quantity
          ? `${note.quantity} ${note.unit ?? ""}`.trim()
          : "";

  const deliveryPlaces = notice?.contractConditions?.deliveryPlaces?.length
    ? notice.contractConditions.deliveryPlaces
    : (note?.deliveryPlaces ?? []);
  const deliveryPlaceText =
    deliveryPlaces.map(formatAddress).filter(Boolean).join("; ") ||
    note?.deliveryPlace ||
    "";

  const objectList = noticeItems
    .map((item, index) =>
      `${index + 1}. ${item.name} — ${item.quantity} ${item.unit}`.trim(),
    )
    .join("\n");

  project.subject = {
    objectName: objectTitle,
    description: descriptionParts.join("\n"),
    worksType: terms.defaultWorksType,
    objectList,
    okpd2Code:
      notice?.objectDescription?.okpd2Code ||
      firstItem?.okpd2OrKtruCode ||
      note?.okpd2Code ||
      "",
    kved2Code: "",
    quantity: quantityText,
    deliveryPlace: deliveryPlaceText,
  };

  // ─── Преамбула и реквизиты ───────────────────────────────────────────────
  const organizationName =
    organization?.fullName || notice?.contactInfo?.organizationName || "";
  const supplierName = sources.supplierName || "";

  project.contractName =
    sources.contractName ||
    (objectTitle
      ? `Контракт на ${terms.subjectAccusative}: ${objectTitle}`
      : `Контракт на ${terms.subjectAccusative}`);
  project.customerName = organizationName;
  project.supplierName = supplierName;
  project.ikz = notice?.generalInfo?.ikz || note?.ikz || sources.ikz || "";
  project.noticeNumber =
    notice?.generalInfo?.noticeNumber || sources.noticeNumber || "";
  project.projectDate = today;
  // Снимок полей XSD проекта контракта (contractProjectType). Номер закупки,
  // способ, ЭТП, формула цены и признак неопределённого объёма приходят из
  // извещения; протокол-основание и номер заявки появляются после процедуры.
  project.eisInfo = {
    ...project.eisInfo,
    purchaseNumber: project.noticeNumber,
    etpName: notice?.generalInfo?.etpName ?? "",
    etpUrl: notice?.generalInfo?.etpUrl ?? "",
    placingWayCode: notice?.generalInfo?.placingWayCode ?? "",
    placerRole: notice?.contactInfo?.responsibleRole ?? "CU",
    isContractPriceFormula: Boolean(
      notice?.contractConditions?.usePriceFormulaPP19,
    ),
    quantityUndefined: Boolean(
      notice?.purchaseObjects?.isIndeterminateVolume,
    ),
  };
  project.preamble = {
    place: "",
    customerRole: "Заказчик",
    contractorRole: terms.contractorRole,
    basis: notice
      ? `по результатам ${placingWayLabel(notice.generalInfo.placingWayCode) || "электронной процедуры"}${
          notice.procedureInfo?.summingUpDate
            ? ` (протокол подведения итогов от ${notice.procedureInfo.summingUpDate})`
            : ""
        }`
      : "",
    signerPosition: "",
    signerName: organization?.responsiblePerson ?? "",
    signerBasis: "",
  };

  project.requisites = {
    customerFullName: organizationName,
    customerShortName: organization?.shortName ?? "",
    customerInn: organization?.inn ?? "",
    customerKpp: organization?.kpp ?? "",
    customerOgrn: organization?.ogrn ?? "",
    customerAddress:
      organization?.legalAddress || notice?.contactInfo?.locationAddress || "",
    customerEmail:
      organization?.email || notice?.contactInfo?.placerEmail || "",
    customerPhone: organization?.phone || "",
    customerBankDetails: "",
    supplierFullName: supplierName,
    supplierShortName: "",
    supplierInn: "",
    supplierKpp: "",
    supplierOgrn: "",
    supplierAddress: "",
    supplierEmail: "",
    supplierPhone: "",
    supplierBankDetails: "",
    signerPosition: "",
    signerName: organization?.responsiblePerson ?? "",
    signerBasis: "",
  };

  project.notifications = {
    ...project.notifications,
    customerAddress:
      organization?.postalAddress ||
      notice?.contactInfo?.postalAddress ||
      organization?.legalAddress ||
      "",
    supplierAddress: "",
    customerEmail:
      organization?.email || notice?.contactInfo?.placerEmail || "",
    supplierEmail: "",
  };

  // ─── Цена и оплата ───────────────────────────────────────────────────────
  const nmckValue =
    notice?.generalInfo?.nmck && notice.generalInfo.nmck > 0
      ? notice.generalInfo.nmck
      : sources.nmck && sources.nmck > 0
        ? sources.nmck
        : Number.parseFloat(note?.initialMaxPrice ?? "") || 0;

  const treasury = Boolean(
    notice?.participantsRequirements?.requiresTreasurySupport ??
    note?.requiresTreasurySupport,
  );
  const bank = Boolean(
    notice?.participantsRequirements?.requiresBankSupport ??
    note?.requiresBankSupport,
  );
  const hasAdvance = Boolean(
    notice?.contractConditions?.hasAdvance ?? note?.hasAdvance,
  );
  const hasStages = Boolean(notice?.contractConditions?.hasMultipleStages);

  project.price = {
    ...project.price,
    currency: notice?.contractConditions?.currency || "Российский рубль",
    initialMaxPrice: toMoney(nmckValue),
    finalPrice: toMoney(nmckValue),
    priceBasis:
      note?.priceBasis ||
      note?.nmckCalculation?.notes ||
      "Обоснование начальной (максимальной) цены контракта в соответствии со ст. 22 Закона № 44-ФЗ",
    formula:
      notice?.contractConditions?.usePriceFormulaPP19 &&
      notice.contractConditions.priceFormulaText
        ? notice.contractConditions.priceFormulaText
        : "",
    unitPriceNote:
      notice?.purchaseObjects?.isIndeterminateVolume ||
      note?.isIndeterminateVolume
        ? "Цена единицы товара (работы, услуги) указана в приложении «Спецификация» и не может быть изменена при исполнении Контракта."
        : "",
    paymentProcedure: hasAdvance
      ? "advance"
      : hasStages
        ? "staged"
        : "postpayment",
    advancePercent: hasAdvance
      ? String(
          notice?.contractConditions?.advancePercent ??
            note?.advancePercent ??
            "",
        )
      : "",
    paymentTermDays:
      note?.paymentTermDays && note.paymentTermDays > 0
        ? note.paymentTermDays
        : treasury
          ? 10
          : 7,
    paymentTerms: treasury
      ? "Оплата производится после приёмки исполненного по Контракту в течение 10 рабочих дней с даты подписания документа о приёмке с учётом казначейского сопровождения."
      : "Оплата производится после приёмки исполненного по Контракту в течение 7 рабочих дней с даты подписания документа о приёмке.",
    kbk: note?.kbk || notice?.generalInfo?.kbk || "",
    treasurySupport: treasury,
    bankSupport: bank,
  };

  // ─── Сроки и этапы ───────────────────────────────────────────────────────
  const startOffset =
    note?.deliveryStartOffsetDays ??
    notice?.contractConditions?.startOffsetDays ??
    0;
  const durationDays =
    note?.executionTermDays ?? notice?.contractConditions?.durationDays ?? 0;

  const startDate =
    note?.deliveryTermMode === "absolute"
      ? (note.desiredStartDate ?? "")
      : startOffset > 0
        ? (addCalendarDays(today, startOffset) ?? "")
        : today;

  const endDate =
    note?.deliveryTermMode === "absolute"
      ? (note.desiredEndDate ?? "")
      : durationDays > 0
        ? (addCalendarDays(startDate, durationDays) ?? "")
        : "";

  const stages = hasStages
    ? (notice?.contractConditions?.stages ?? []).map((stage, index) => {
        const amount = stage.kbkRows.reduce((sum, row) => sum + row.total, 0);
        return {
          name: `Этап ${stage.stageNumber || index + 1}`,
          startDate: addCalendarDays(startDate, stage.startOffsetDays) ?? "",
          endDate:
            addCalendarDays(
              startDate,
              stage.startOffsetDays + stage.durationDays,
            ) ?? "",
          amount: amount > 0 ? amount.toFixed(2) : "",
        };
      })
    : [];

  project.term = {
    startDate,
    endDate,
    validUntil: endDate ? (addCalendarDays(endDate, 30) ?? "") : "",
    executionProcedure:
      kind === "goods"
        ? "Поставка осуществляется партиями по заявкам Заказчика в соответствии с графиком поставки."
        : "Работы (услуги) выполняются в соответствии с графиком исполнения Контракта и техническим заданием.",
    deliverySchedule: hasStages
      ? stages
          .map(
            (stage) =>
              `${stage.name}: ${stage.startDate || "—"} — ${stage.endDate || "—"}`,
          )
          .join("\n")
      : "",
    stages,
    acceptanceProcedure:
      note?.acceptanceTermMode === "date" && note.acceptanceDate
        ? `Приёмка и экспертиза результатов исполнения Контракта проводятся в срок до ${note.acceptanceDate} в порядке, установленном ст. 94 Закона № 44-ФЗ.`
        : `Приёмка и экспертиза результатов исполнения Контракта проводятся в течение ${note?.acceptanceTermDays ?? 10} рабочих дней ${note?.acceptanceEventBase || "со дня предоставления документа о приёмке"}.`,
    acceptanceTermDays: note?.acceptanceTermDays ?? 10,
  };

  // ─── Приёмка ─────────────────────────────────────────────────────────────
  project.acceptance = {
    ...project.acceptance,
    expertiseRequired: true,
    expertiseProcedure:
      "Экспертиза результатов исполнения Контракта проводится Заказчиком своими силами или с привлечением экспертов (ч. 3 ст. 94 Закона № 44-ФЗ).",
    acceptanceActForm: terms.acceptanceAct,
    documentsList:
      kind === "goods"
        ? "Товарная накладная (УПД), счёт-фактура, документы о качестве (сертификаты, декларации соответствия)."
        : kind === "design_survey"
          ? "Акт приёмки проектной документации и результатов инженерных изысканий, положительное заключение экспертизы (при необходимости)."
          : "Акт выполненных работ (оказанных услуг), исполнительная документация, счета-фактуры, документы о качестве.",
    acceptancePlace: deliveryPlaceText,
    deficienciesDeadlineDays: 10,
  };

  // ─── Качество ────────────────────────────────────────────────────────────
  const qualityParts = [
    note?.warrantyMaintenanceInfo &&
      `Гарантийное обслуживание: ${note.warrantyMaintenanceInfo}`,
    note?.manufacturerWarrantyInfo &&
      `Гарантия производителя: ${note.manufacturerWarrantyInfo}`,
    note?.warrantyTermAndVolume &&
      `Срок и объём гарантии: ${note.warrantyTermAndVolume}`,
  ].filter(Boolean) as string[];

  project.quality = {
    ...project.quality,
    qualityRequirements:
      qualityParts.join("\n") ||
      notice?.objectDescription?.qualityCharacteristics ||
      note?.otherRequirements ||
      `Качество ${terms.resultNoun} должно соответствовать требованиям ст. 33 Закона № 44-ФЗ, технических регламентов, ГОСТ и условиям Контракта.`,
    specifications: noticeItems
      .map(
        (item, index) =>
          `${index + 1}. ${item.name} (ОКПД2/КТРУ: ${item.okpd2OrKtruCode || "—"}) — ${item.quantity} ${item.unit} × ${item.unitPrice.toFixed(2)} руб. = ${item.totalPrice.toFixed(2)} руб.`,
      )
      .join("\n"),
    warrantyPeriodMonths: note?.warrantyTermMonths ?? undefined,
    serviceLifeMonths: undefined,
    guaranteeObligations:
      note?.requiresQualityWarranty || note?.requiresWarrantySecurity
        ? "Гарантийные обязательства исполняются в течение гарантийного срока, установленного Контрактом; обеспечение гарантийных обязательств предоставляется в порядке, предусмотренном разделом об обеспечении."
        : "",
    qualityControlProcedure:
      "Контроль качества осуществляется при приёмке и в течение гарантийного срока; Заказчик вправе привлекать экспертов.",
  };

  // ─── Обеспечения и ответственность ───────────────────────────────────────
  const requirements = notice?.participantsRequirements;
  const perfRequired = Boolean(
    requirements?.requiresContractSecurity ??
    note?.requiresContractSecurity ??
    true,
  );
  const perfPercent = String(
    requirements?.contractSecurityPercent ??
      note?.contractSecurityPercent ??
      "5",
  );
  const perfAmount =
    perfRequired && nmckValue > 0
      ? ((nmckValue * Number.parseFloat(perfPercent)) / 100).toFixed(2)
      : "";

  project.security = {
    ...project.security,
    bidSecurityRequired: Boolean(
      requirements?.requiresApplicationSecurity ??
      note?.requiresApplicationSecurity,
    ),
    bidSecurityPercent: String(
      requirements?.applicationSecurityPercent ??
        note?.applicationSecurityPercent ??
        "",
    ),
    performanceSecurityRequired: perfRequired,
    performanceSecurityPercent: perfPercent,
    securityAmount: perfAmount,
    warrantySecurityRequired: Boolean(
      requirements?.requiresWarrantySecurity ?? note?.requiresWarrantySecurity,
    ),
    warrantySecurityPercent: String(
      requirements?.warrantySecurityPercent ??
        note?.warrantySecurityPercent ??
        "",
    ),
    warrantySecurityAmount: "",
    fixedPenaltyAmount: "",
    penaltyText: [
      "За каждый факт неисполнения или ненадлежащего исполнения обязательств, за исключением просрочки, начисляется штраф в размере, установленном Правительством Российской Федерации (ПП РФ № 1042).",
      "За каждый день просрочки исполнения обязательств начисляются пени в размере 1/300 ключевой ставки ЦБ РФ, действующей на дату уплаты пеней, от цены Контракта, уменьшенной на сумму исполненного.",
    ].join("\n"),
    finesTableNote:
      "Размер штрафа определяется в соответствии с постановлением Правительства РФ от 30.08.2017 № 1042.",
  };

  const smpRequired = Boolean(
    note
      ? note.requiresSmpSubcontracting &&
          Number(note.smpRequiredPercent ?? 0) > 0
      : requirements?.subcontractingSmpPart5Art30,
  );
  const smpPercent = String(
    note?.smpRequiredPercent ??
      requirements?.subcontractingSmpRequiredPercent ??
      "5",
  );
  project.smpRequiredPercent = smpRequired ? smpPercent : "";
  project.subcontractingSmpNoteNumber = smpRequired
    ? requirements?.subcontractingSmpNoteNumber ||
      (note?.noteNumber ? String(note.noteNumber) : "")
    : "";
  project.smp = {
    required: smpRequired,
    attractDeadlineDays: 5,
    paymentDeadlineDays: 7,
    reportingDeadlineDays: 10,
    termsText: smpRequired
      ? defaultSmpTerms(smpPercent, 5, 7, 10).replace(
          "Поставщик",
          terms.contractorRole,
        )
      : "",
    responsibilityText: smpRequired
      ? `За непредставление сведений, нарушение сроков их представления или представление недостоверных сведений ${terms.contractorRole} несёт гражданско-правовую ответственность в соответствии с п. 6 типовых условий (ПП РФ № 1466) и условиями Контракта.`
      : "",
  };

  // ─── Изменение и расторжение ─────────────────────────────────────────────
  const allowUnilateral = Boolean(
    notice?.contractConditions?.allowUnilateralRefusalArt95 ??
    note?.allowUnilateralRefusalArt95 ??
    true,
  );
  project.change = {
    ...project.change,
    changeConditions: defaultChangeConditions(kind),
    allowQuantityChange: kind !== "goods",
    allowPriceChange: false,
    unilateralRefusal: allowUnilateral,
    terminationConditions: allowUnilateral
      ? defaultTerminationConditions()
      : "Расторжение Контракта допускается по соглашению сторон или по решению суда по основаниям, предусмотренным законодательством Российской Федерации.",
    changeNoticeDays: 3,
    securityReturnDays: 30,
  };

  // ─── Права сторон ────────────────────────────────────────────────────────
  project.rightsCustomer = { text: defaultCustomerRights(kind) };
  project.rightsSupplier = { text: defaultSupplierRights(kind) };

  // ─── Специальные разделы ─────────────────────────────────────────────────
  if (
    kind === "works_construction" ||
    kind === "works_capital_repair" ||
    kind === "works_construction_control" ||
    kind === "design_survey"
  ) {
    project.management = {
      managementProcedure:
        "Управление Контрактом осуществляется через представителей сторон; ход исполнения рассматривается на рабочих совещаниях с оформлением протоколов.",
      customerRepresentative: "",
      contractorRepresentative: "",
      meetings:
        "Рабочие совещания проводятся не реже одного раза в месяц, протоколы подписываются представителями обеих сторон.",
    };
  }

  if (
    kind === "works_repair" ||
    kind === "works_construction" ||
    kind === "works_capital_repair" ||
    kind === "works_construction_control" ||
    kind === "design_survey"
  ) {
    project.projectDocs = {
      documentsList: defaultProjectDocs(kind),
      expertiseRequired:
        kind === "works_construction" || kind === "works_capital_repair",
      expertiseSubject:
        kind === "works_construction" || kind === "works_capital_repair"
          ? "Проектная документация и результаты инженерных изысканий"
          : "",
      transferProcedure:
        "Документация передаётся Заказчику в электронном виде и на бумажном носителе в порядке, установленном Контрактом.",
    };
  }

  if (kind === "design_survey") {
    project.designRights = {
      rightsOwner: "Заказчику",
      usageRights:
        "Заказчик вправе использовать результаты работ, включая проектную документацию и результаты инженерных изысканий, для строительства, реконструкции и эксплуатации объекта без ограничения по территории и сроку.",
      exclusiveRightsNote:
        "Исключительные права на результаты работ принадлежат Заказчику с момента их передачи; подрядчик не вправе передавать результаты третьим лицам без согласия Заказчика.",
    };
  }

  if (kind === "services_maintenance" || kind === "works_maintenance") {
    project.maintenance = {
      regions: deliveryPlaceText || objectTitle,
      periodStart: startDate,
      periodEnd: endDate,
      scope: note?.subject || objectTitle,
    };
  }

  if (kind === "works_construction_control") {
    project.control = {
      controlSubject: `Строительный контроль за выполнением работ по объекту: ${objectTitle}`,
      controlPowers:
        "Исполнитель проверяет соответствие выполняемых работ проектной документации, требованиям технических регламентов и условиям Контракта, участвует в приёмке скрытых работ и подписывает соответствующие акты.",
      controlActForm:
        "Акт проверки, предписание об устранении нарушений, акт приёмки выполненных работ",
      controlPeriod: `${startDate || "—"} — ${endDate || "—"}`,
    };
  }

  // ─── Приложения ──────────────────────────────────────────────────────────
  project.appendices = buildDefaultAppendices(kind, {
    smpRequired,
    stagedPayment: hasStages,
    hasAdvance,
  });

  project.status = "draft";
  project.createdAt = today;
  project.updatedAt = today;

  return project;
};

/** Краткий список источников предзаполнения для плашки в конструкторе */
export const contractPrefillSourceLabels = (sources: {
  notice?: unknown;
  note?: unknown;
  objectDescription?: unknown;
  organization?: unknown;
}): string[] =>
  [
    sources.notice ? "извещение (44-ФЗ)" : null,
    sources.note ? "служебная записка" : null,
    sources.objectDescription ? "ООЗ" : null,
    sources.organization ? "карточка заказчика" : null,
  ].filter(Boolean) as string[];
