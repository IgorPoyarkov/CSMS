/**
 * Служебные записки (потребности) по позициям плана-графика, для которых
 * выгрузка принесла извещение.
 *
 * СЗ в системе — не просто звено цепочки, а ИСТОЧНИК ПРЕДЗАПОЛНЕНИЯ извещения.
 * `NoticeInfoForm` находит СЗ (по `purchaseNoteId`, `procurementId` или ИКЗ) и
 * переносит в извещение каждый одобренный («зелёный») блок: критерии оценки,
 * требования ст. 31 / ПП 1482 / ПП 2571, обеспечение заявки и контракта,
 * гарантию, условия контракта, место поставки.
 *
 * Публичная карточка ЕИС таких СЗ не содержит, а `pruneDb()` в импорте очищает
 * `purchaseNotes`. Поэтому при выгрузке СЗ восстанавливается из уже загруженного
 * извещения: в неё переносятся все включённые блоки вместе со значениями.
 * Иначе открытие извещения в форме предзаполнилось бы пустой СЗ и затерло бы
 * данные выгрузки, а сама СЗ не была бы источником предзаполнения.
 *
 * Ключи сопоставления — те же, что использует `matchesNote()` в eisChainBuilder:
 * positionId, positionUniqueNumber и ИКЗ позиции.
 */

const text = (value) => String(value ?? "").trim();

const sameId = (left, right) =>
  left !== null &&
  left !== undefined &&
  right !== null &&
  right !== undefined &&
  String(left) === String(right);

const assign = (target, key, value) => {
  if (value !== undefined && value !== null && value !== "") {
    target[key] = value;
  }
};

const money = (value) => {
  const parsed = Number.parseFloat(
    text(value).replace(/\s/g, "").replace(",", "."),
  );
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "";
};

/** Процент для поля optionalPercent() схемы СЗ: строка вида «30» или «12.5». */
const percent = (value) => {
  const parsed = Number.parseFloat(
    text(value).replace(/\s/g, "").replace(",", "."),
  );
  return Number.isFinite(parsed) ? String(Math.round(parsed * 100) / 100) : "";
};

/** Неотрицательное целое (сроки, отсрочки) — число, а не строка. */
const count = (value) => {
  const parsed = Number.parseInt(text(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

/** Дата только если она реально есть: пустая строка не подставляет «сегодня». */
const dateField = (value) => {
  const source = text(value);
  return /^\d{4}-\d{2}-\d{2}/.test(source) ? source.slice(0, 10) : "";
};

const isoDate = (value) =>
  dateField(value) || new Date().toISOString().slice(0, 10);

const nextNumber = (items, field) =>
  items.reduce((max, item) => {
    const value = Number.parseInt(String(item[field] ?? ""), 10);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0) + 1;

// Шесть слотов критериев в извещении → четыре типа критериев в СЗ (п. 3
// Положения N 2604). lifecycle_cost и energy_service_expenses слота в СЗ не
// имеют — они остаются выключенными и не переносятся.
const NOTICE_CRITERION_TO_NOTE = {
  price: "price",
  exploitation_expenses: "expenses",
  qualitative_characteristics: "characteristics",
  qualification: "qualification",
};
const NOTE_CRITERION_TYPES = Object.values(NOTICE_CRITERION_TO_NOTE);
const INDICATOR_KINDS = new Set([
  "expense",
  "quality",
  "functional",
  "ecological",
  "financial",
  "equipment",
  "experience",
  "reputation",
  "staff",
]);

// Одноимённые логические и текстовые поля «Требования к участникам».
const PARTICIPANT_BOOLEANS = [
  "unifiedRequirementsPart1Art31",
  "requirementP1Part1Art31",
  "requirementsPart1_1Art31",
  "pp1482ProductionFacilities",
  "pp1482FinancialStability",
  "pp1482Specialists",
  "additionalRequirementsPart2Art31",
  "requirementsPart2_1Art31",
  "pp2571Point4Requirement",
  "sanctionsRnpRequirement",
  "advantageSmpPart3Art30",
  "requiresApplicationSecurity",
  "requiresContractSecurity",
  "requiresQualityWarranty",
  "requiresWarrantySecurity",
  "requiresTreasurySupport",
  "requiresBankSupport",
];
const PARTICIPANT_TEXTS = [
  "unifiedRequirementsPart1Art31Text",
  "requirementP1Part1Art31Text",
  "pp1482ProductionFacilitiesText",
  "pp1482FinancialStabilityText",
  "pp1482SpecialistsText",
  "additionalRequirementsPart2Art31Text",
  "requirementsPart2_1Art31Text",
  "pp2571Point4RequirementText",
  "warrantyMaintenanceInfo",
  "manufacturerWarrantyInfo",
  "warrantyTermAndVolume",
  "applicationSecurityOrder",
  "contractSecurityOrder",
  "warrantySecurityOrder",
  "treasurySupportType",
];
const SECURITY_REQUISITES = [
  "applicationSecurityRequisites",
  "applicationSecurityBudgetRequisites",
  "contractSecurityRequisites",
  "warrantySecurityRequisites",
];

/**
 * Критерии оценки: «зелёный» флаг `enabled` и значимость переносятся в СЗ,
 * откуда их снова заберёт форма извещения (normalizeCriteria).
 */
const buildApprovedCriteria = (noticeCriteria = []) => {
  const byNoteType = new Map();
  for (const criterion of noticeCriteria) {
    const noteType = NOTICE_CRITERION_TO_NOTE[criterion.type];
    if (noteType) byNoteType.set(noteType, criterion);
  }

  return NOTE_CRITERION_TYPES.map((type, index) => {
    const source = byNoteType.get(type);
    return {
      id: text(source?.id) || `crit-${type}-${index}`,
      type,
      enabled: Boolean(source?.enabled),
      weightPercent: Number.isFinite(Number(source?.weightPercent))
        ? Number(source.weightPercent)
        : 0,
      note: text(source?.note ?? source?.additionalInfo),
      indicators: (source?.indicators ?? []).map((indicator, i) => ({
        id: text(indicator.id) || `${type}-ind-${i}`,
        name: text(indicator.name) || "Показатель оценки",
        kind: INDICATOR_KINDS.has(indicator.kind) ? indicator.kind : "quality",
        weightPercent: Number.isFinite(Number(indicator.weightPercent))
          ? Number(indicator.weightPercent)
          : 0,
        unit: text(indicator.unit),
        best: text(indicator.best) || "max",
        scoring: text(indicator.scoring) || "formula",
        limitMin: indicator.limitMin,
        limitMax: indicator.limitMax,
        scaleText: text(indicator.scaleText),
      })),
    };
  });
};

/**
 * Собрать одобренные блоки СЗ из выгруженного извещения.
 * Возвращаются только те поля, которые forma извещения читает из СЗ.
 */
const buildApprovedBlocks = (notice, position, subject) => {
  const general = notice.generalInfo ?? {};
  const participants = notice.participantsRequirements ?? {};
  const contract = notice.contractConditions ?? {};
  const foundation = notice.foundationInfo ?? {};
  const items = notice.purchaseObjects?.items ?? [];
  const blocks = {};

  // Уровень извещения: способ закупки, КБК, уполномоченный орган
  assign(blocks, "placingWayCode", text(general.placingWayCode));
  assign(blocks, "kbk", text(general.kbk) || text(position.kbk));
  assign(blocks, "authorizedBodyName", text(general.authorizedBodyName));
  assign(blocks, "jointOrganizerName", text(general.jointOrganizerName));

  // Критерии и категория объекта (предельная значимость, аукционный перечень)
  blocks.evaluationCriteria = buildApprovedCriteria(
    participants.evaluationCriteria,
  );
  assign(
    blocks,
    "evaluationObjectCategory",
    text(participants.evaluationObjectCategory),
  );
  if (
    Array.isArray(participants.evaluationOkpd2Codes) &&
    participants.evaluationOkpd2Codes.length > 0
  ) {
    blocks.evaluationOkpd2Codes = participants.evaluationOkpd2Codes.map(text);
  }

  // Требования к участникам: каждый логический флаг — «зелёный» блок СЗ
  for (const name of PARTICIPANT_BOOLEANS) {
    if (typeof participants[name] === "boolean")
      blocks[name] = participants[name];
  }
  for (const name of PARTICIPANT_TEXTS) {
    assign(blocks, name, text(participants[name]));
  }
  assign(blocks, "otherRequirements", text(participants.additionalInfo));
  if (
    Array.isArray(participants.pp2571Positions) &&
    participants.pp2571Positions.length > 0
  ) {
    blocks.pp2571Positions = participants.pp2571Positions.map(text);
  }
  for (const name of [
    "applicationSecurityPercent",
    "contractSecurityPercent",
    "warrantySecurityPercent",
  ]) {
    assign(blocks, name, percent(participants[name]));
  }
  for (const name of SECURITY_REQUISITES) {
    const value = participants[name];
    if (value && typeof value === "object" && Object.keys(value).length > 0) {
      blocks[name] = value;
    }
  }
  // Процент привлечения СМП переносим только если он реально задан: при
  // advantageSmpPart3Art30 = true требование субподряда остаётся выключенным —
  // ровно так, как hasSmpSubcontractingRequirement() считает его в форме.
  const smpPercent = Number.parseFloat(
    text(participants.subcontractingSmpRequiredPercent).replace(",", "."),
  );
  if (Number.isFinite(smpPercent) && smpPercent > 0) {
    blocks.smpRequiredPercent = smpPercent;
  }

  // Условия контракта: аванс, бюджет, сроки, односторонний отказ, места поставки
  for (const name of ["hasAdvance", "allowUnilateralRefusalArt95"]) {
    if (typeof contract[name] === "boolean") blocks[name] = contract[name];
  }
  assign(blocks, "advancePercent", percent(contract.advancePercent));
  assign(blocks, "budgetLevel", text(contract.budgetLevel));
  assign(blocks, "fundingSource", text(contract.budgetName));
  if (typeof contract.isRelativeTerms === "boolean") {
    blocks.deliveryTermMode = contract.isRelativeTerms
      ? "relative"
      : "absolute";
    if (contract.isRelativeTerms) {
      assign(
        blocks,
        "deliveryStartOffsetDays",
        count(contract.startOffsetDays),
      );
      assign(blocks, "executionTermDays", count(contract.durationDays));
    } else {
      assign(blocks, "desiredStartDate", dateField(contract.startDate));
      assign(blocks, "desiredEndDate", dateField(contract.endDate));
    }
  }
  if (
    Array.isArray(contract.deliveryPlaces) &&
    contract.deliveryPlaces.length > 0
  ) {
    blocks.deliveryPlaces = contract.deliveryPlaces;
  }

  // Основание процедуры и структурированная форма проекта контракта
  for (const name of [
    "protocolName",
    "protocolNumber",
    "protocolPublishDate",
    "appNumber",
  ]) {
    assign(blocks, name, text(foundation[name]));
  }
  if (typeof foundation.isStructuredForm === "boolean") {
    blocks.isStructuredForm = foundation.isStructuredForm;
  }
  if (
    Array.isArray(foundation.contractProjectFiles) &&
    foundation.contractProjectFiles.length > 0
  ) {
    blocks.contractProjectFiles = foundation.contractProjectFiles.map(
      (file, i) => ({
        id: text(file.id) || `contract-project-${i}`,
        fileName: text(file.fileName),
        description: text(file.description),
      }),
    );
  }

  // Объекты закупки. Их форма тоже берёт из СЗ, если в извещении список пуст.
  if (items.length > 0) {
    blocks.items = items.map((item, index) => ({
      id: text(item.id) || String(index + 1),
      name: text(item.name) || subject,
      okpd2Code: text(item.okpd2Code) || text(position.okpd2Code),
      okpd2Name:
        text(item.okpd2Name) || text(position.okpd2Name) || text(item.name),
      ktruCode: text(item.ktruCode),
      ktruName: text(item.ktruName),
      unit: text(item.unit),
      quantity: text(item.quantity) || "1",
      unitPrice: money(item.unitPrice),
      totalPrice: money(item.totalPrice),
      nationalRegimeType: text(item.nationalRegimeType) || "none",
      isSupplyDuringWorks: Boolean(item.isSupplyDuringWorks),
    }));
  }

  return blocks;
};

/**
 * @param {object} options
 * @param {Array} options.plans импортированные планы-графики
 * @param {Array} options.notices импортированные извещения (им проставляется purchaseNoteId)
 * @param {object} options.organization организация заказчика
 * @param {object} options.employee ответственный работник
 * @param {string} [options.importedAt] момент выгрузки
 * @param {Array} [options.existingNotes] уже есть в БД (для восстановления без повторной выгрузки)
 */
export function buildImportPurchaseNotes({
  plans = [],
  notices = [],
  organization = {},
  employee = {},
  importedAt = "",
  existingNotes = [],
}) {
  const notes = [...existingNotes];
  const positions = plans.flatMap((plan) =>
    (plan.positions ?? []).map((position) => ({ plan, position })),
  );

  let noteId = nextNumber(notes, "id");
  let noteNumber = nextNumber(notes, "noteNumber");
  const created = [];
  let linked = 0;

  for (const notice of notices) {
    const noticeIkz = text(notice.generalInfo?.ikz) || text(notice.ikz);
    const uniqueNumber = text(notice.generalInfo?.positionUniqueNumber);
    const entry =
      positions.find(
        (item) =>
          uniqueNumber && text(item.position.uniqueNumber) === uniqueNumber,
      ) ??
      positions.find(
        (item) =>
          noticeIkz && text(item.position.identificationCode) === noticeIkz,
      );

    if (!entry) {
      continue;
    }

    const { plan, position } = entry;
    const existing = notes.find(
      (item) =>
        (item.positionId != null && sameId(item.positionId, position.id)) ||
        (text(item.positionUniqueNumber) !== "" &&
          text(item.positionUniqueNumber) === text(position.uniqueNumber)) ||
        (text(item.ikz) !== "" &&
          text(item.ikz) === text(position.identificationCode)),
    );

    if (existing) {
      notice.purchaseNoteId = existing.id;
      linked += 1;
      continue;
    }

    const noteDate = isoDate(notice.generalInfo?.publishDTInEIS || importedAt);
    const subject =
      text(notice.generalInfo?.orderName) ||
      text(position.objectOfPurchase) ||
      `Закупка по позиции ${text(position.serialNumber) || uniqueNumber}`;
    const initiatorName =
      text(notice.noticeState?.createdByFullName) ||
      text(organization.responsiblePerson) ||
      text(employee.fullName) ||
      text(organization.email) ||
      "Контрактная служба";

    const note = {
      id: noteId++,
      organizationId: plan.organizationId ?? organization.id,
      purchasePlanId: plan.id,
      purchasePlanNumber: text(plan.planNumber),
      positionId: position.id,
      positionSerialNumber: text(position.serialNumber),
      positionUniqueNumber: text(position.uniqueNumber),
      // ИКЗ извещения (из XML ЕИС) отличается от ИКЗ позиции ПГ: в нём уже
      // учтён номер процедуры. Форма извещения предзаполняет ИКЗ и его части
      // из СЗ — поэтому берём именно ИКЗ извещения, чтобы не испортить XML.
      ikz:
        text(notice.generalInfo?.ikz) ||
        text(notice.ikz) ||
        text(position.identificationCode),
      procurementId: notice.procurementId ?? null,
      noteNumber: String(noteNumber++),
      noteDate,
      initiatorName,
      subject,
      initialMaxPrice: money(notice.generalInfo?.nmck ?? position.amountTotal),
      okpd2Code:
        text(notice.purchaseObjects?.items?.[0]?.okpd2Code) ||
        text(position.okpd2Code),
      okpd2Name:
        text(notice.purchaseObjects?.items?.[0]?.okpd2Name) ||
        text(position.okpd2Name),
      // Все одобренные блоки извещения — СЗ становится их источником для
      // предзаполнения при открытии извещения в форме.
      ...buildApprovedBlocks(notice, position, subject),
      status: "approved",
      comment: `Потребность создана из данных ЕИС при выгрузке${
        importedAt ? ` ${importedAt.slice(0, 10)}` : ""
      }. Одобренные блоки перенесены в извещение при предзаполнении.`,
      createdAt: noteDate,
    };

    notes.push(note);
    created.push(note);
    notice.purchaseNoteId = note.id;
    linked += 1;
  }

  return { notes, created, linked };
}
