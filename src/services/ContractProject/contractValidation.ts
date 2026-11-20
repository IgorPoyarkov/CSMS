import {
  addCalendarDays,
  type ContractProject,
} from "./contractProject.schema";
import {
  contractKindTerms,
  contractSectionsForKind,
} from "./contractStructure";

/**
 * Проверки проекта контракта.
 *
 * Блокирующие ошибки — не выполнены обязательные условия ст. 34 или нарушены
 * пределы, установленные законом (обеспечение, СМП, сроки). Предупреждения —
 * данные заполнены, но требуют осознанного решения заказчика (например,
 * сумма этапов не совпадает с ценой или срок оплаты меньше рекомендованного).
 */

export type ContractIssueSeverity = "error" | "warning";

export interface ContractIssue {
  severity: ContractIssueSeverity;
  sectionId: string;
  field?: string;
  message: string;
  article: string;
}

const has = (value?: string | null): boolean => Boolean((value ?? "").trim());

const num = (value?: string | null): number => {
  const parsed = Number.parseFloat((value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const stageSum = (project: ContractProject): number =>
  (project.term.stages ?? []).reduce(
    (sum, stage) => sum + num(stage.amount),
    0,
  );

export const validateContractProject = (
  project: ContractProject,
): ContractIssue[] => {
  const issues: ContractIssue[] = [];
  const terms = contractKindTerms(project.kind);

  const error = (
    sectionId: string,
    field: string,
    message: string,
    article: string,
  ) => issues.push({ severity: "error", sectionId, field, message, article });

  const warning = (
    sectionId: string,
    field: string,
    message: string,
    article: string,
  ) => issues.push({ severity: "warning", sectionId, field, message, article });

  // ─── Преамбула ───────────────────────────────────────────────────────────
  if (!has(project.contractName)) {
    error(
      "preamble",
      "contractName",
      "Не указано наименование контракта",
      "ст. 34 ч. 1",
    );
  }
  if (!has(project.customerName)) {
    error("preamble", "customerName", "Не указан заказчик", "ст. 34 ч. 1");
  }
  if (!has(project.supplierName)) {
    warning(
      "preamble",
      "supplierName",
      `Не указан ${terms.contractorRole.toLowerCase()} — победитель процедуры`,
      "ст. 51",
    );
  }
  if (!has(project.preamble.basis)) {
    warning(
      "preamble",
      "preamble.basis",
      "Не указано основание заключения контракта (протокол процедуры)",
      "ст. 51 ч. 1",
    );
  }

  // ─── Предмет ─────────────────────────────────────────────────────────────
  if (!has(project.subject.objectName)) {
    error(
      "subject",
      "subject.objectName",
      "Не указан предмет контракта",
      "ст. 34 ч. 1 п. 1",
    );
  }
  if (!has(project.subject.description)) {
    error(
      "subject",
      "subject.description",
      "Не описано исполняемое обязательство (объект закупки)",
      "ст. 34 ч. 1 п. 1, ст. 33",
    );
  }
  if (!has(project.subject.deliveryPlace)) {
    error(
      "subject",
      "subject.deliveryPlace",
      "Не указано место поставки / выполнения работ",
      "ст. 34 ч. 1 п. 3",
    );
  }

  // ─── Цена и оплата ───────────────────────────────────────────────────────
  const finalPrice = num(project.price.finalPrice);
  if (finalPrice <= 0) {
    error(
      "price",
      "price.finalPrice",
      "Не указана цена контракта",
      "ст. 34 ч. 1 п. 2",
    );
  }
  if (!has(project.price.priceBasis)) {
    error(
      "price",
      "price.priceBasis",
      "Не указано обоснование цены контракта",
      "ст. 34 ч. 1 п. 2, ст. 22",
    );
  }
  const paymentDays = project.price.paymentTermDays ?? 0;
  const maxPaymentDays = project.price.treasurySupport ? 10 : 7;
  if (paymentDays > maxPaymentDays) {
    error(
      "price",
      "price.paymentTermDays",
      `Срок оплаты ${paymentDays} рабочих дней превышает предел ${maxPaymentDays} рабочих дней`,
      "ч. 13.1 ст. 34",
    );
  }
  if (
    project.price.paymentProcedure === "advance" &&
    !has(project.price.advancePercent)
  ) {
    warning(
      "price",
      "price.advancePercent",
      "Выбран авансовый порядок оплаты, но не указан размер аванса",
      "ст. 34 ч. 12",
    );
  }

  // ─── Цена единицы (п. 11 Положения, ПП РФ N 60) ──────────────────────────
  if (has(project.price.unitPrice)) {
    if (!/^\d+(\.\d{1,11})?$/.test(project.price.unitPrice!)) {
      error(
        "price",
        "price.unitPrice",
        "Цена единицы товара, работы, услуги округляется до 11 цифр после запятой",
        "п. 11 Положения (ПП РФ N 60)",
      );
    }
  } else if (project.eisInfo.quantityUndefined) {
    warning(
      "price",
      "price.unitPrice",
      "Объём нельзя определить, но цена единицы не указана",
      "п. 11 Положения (ПП РФ N 60), ч. 24 ст. 22",
    );
  }

  // П. 15 Раздела 1 формы извещения: код валюты по ОКВ
  if (!/^\d{3}$/.test(project.price.currencyCode || "643")) {
    warning(
      "price",
      "price.currencyCode",
      "Код валюты по ОКВ должен состоять из трёх цифр (по умолчанию 643)",
      "п. 15 Раздела 1 (ПП РФ N 60)",
    );
  }

  // ─── Агент и представитель собственника (п. 11 Положения) ────────────────
  const req = project.requisites;
  if (req.isAgentInvolved) {
    if (!has(req.agentFullName)) {
      error(
        "requisites",
        "requisites.agentFullName",
        "Укажите полное (сокращённое) наименование или ФИО платёжного агента",
        "п. 11 Положения (ПП РФ N 60)",
      );
    }
    if (!has(req.agentInn)) {
      error(
        "requisites",
        "requisites.agentInn",
        "Укажите ИНН платёжного агента",
        "п. 11 Положения (ПП РФ N 60)",
      );
    }
    if (!has(req.agentAccount)) {
      error(
        "requisites",
        "requisites.agentAccount",
        "Укажите реквизиты счёта платёжного агента",
        "п. 11 Положения (ПП РФ N 60)",
      );
    }
  }
  if (req.isResidentialPremisesPurchase) {
    if (!has(req.ownerRepresentativeName)) {
      error(
        "requisites",
        "requisites.ownerRepresentativeName",
        "Укажите наименование представителя собственника жилого помещения",
        "п. 11 Положения (ПП РФ N 60)",
      );
    }
    if (!has(req.ownerRepresentativeAccount)) {
      error(
        "requisites",
        "requisites.ownerRepresentativeAccount",
        "Укажите реквизиты счёта представителя собственника",
        "п. 11 Положения (ПП РФ N 60)",
      );
    }
    if (!has(req.ownerAccount)) {
      error(
        "requisites",
        "requisites.ownerAccount",
        "Укажите реквизиты счёта собственника жилого помещения",
        "п. 11 Положения (ПП РФ N 60)",
      );
    }
  }

  // ─── Сроки ───────────────────────────────────────────────────────────────
  if (!has(project.term.endDate)) {
    error(
      "term",
      "term.endDate",
      "Не указан срок исполнения контракта",
      "ст. 34 ч. 1 п. 3",
    );
  }
  if (
    has(project.term.startDate) &&
    has(project.term.endDate) &&
    project.term.startDate! > project.term.endDate!
  ) {
    error(
      "term",
      "term.startDate",
      "Дата начала исполнения позже даты окончания",
      "ст. 34 ч. 1 п. 3",
    );
  }
  if (
    has(project.term.validUntil) &&
    has(project.term.endDate) &&
    project.term.validUntil! < project.term.endDate!
  ) {
    warning(
      "term",
      "term.validUntil",
      "Срок действия контракта раньше срока исполнения",
      "ст. 34 ч. 1 п. 3",
    );
  }
  const stages = project.term.stages ?? [];
  if (stages.length > 0 && finalPrice > 0) {
    const sum = stageSum(project);
    if (sum > 0 && Math.abs(sum - finalPrice) > 0.01) {
      warning(
        "term",
        "term.stages",
        `Сумма этапов ${sum.toFixed(2)} руб. не совпадает с ценой контракта ${finalPrice.toFixed(2)} руб.`,
        "ст. 33 ч. 1 п. 1.1",
      );
    }
  }

  // ─── Приёмка ─────────────────────────────────────────────────────────────
  if (
    !has(project.term.acceptanceProcedure) &&
    !has(project.acceptance.acceptanceActForm)
  ) {
    error(
      "acceptance",
      "term.acceptanceProcedure",
      "Не установлен порядок приёмки исполненного",
      "ст. 34 ч. 1 п. 4, ст. 94",
    );
  }
  if (!has(project.acceptance.documentsList)) {
    warning(
      "acceptance",
      "acceptance.documentsList",
      "Не указан перечень документов, подтверждающих исполнение",
      "ст. 94",
    );
  }

  // ─── Качество ────────────────────────────────────────────────────────────
  if (!has(project.quality.qualityRequirements)) {
    error(
      "quality",
      "quality.qualityRequirements",
      "Не установлены требования к качеству",
      "ст. 34 ч. 1 п. 1, ст. 33",
    );
  }

  // ─── Ответственность ─────────────────────────────────────────────────────
  if (!has(project.security.penaltyFormula)) {
    error(
      "responsibility",
      "security.penaltyFormula",
      "Не установлен размер пеней за просрочку",
      "ст. 34 ч. 1 п. 5, ч. 5",
    );
  }
  if (
    !has(project.security.penaltyText) &&
    !has(project.security.fixedPenaltyAmount)
  ) {
    warning(
      "responsibility",
      "security.penaltyText",
      "Не описаны штрафы за ненадлежащее исполнение (ПП РФ № 1042)",
      "ст. 34 ч. 5-8",
    );
  }

  // ─── Обеспечение ─────────────────────────────────────────────────────────
  if (project.security.performanceSecurityRequired) {
    const percent = num(project.security.performanceSecurityPercent);
    if (percent < 0.5 || percent > 30) {
      error(
        "security",
        "security.performanceSecurityPercent",
        "Обеспечение исполнения контракта должно быть от 0,5 до 30 %",
        "ч. 6 ст. 34, ст. 96",
      );
    }
    if (finalPrice > 0 && has(project.security.securityAmount)) {
      const expected = (finalPrice * percent) / 100;
      if (Math.abs(num(project.security.securityAmount) - expected) > 1) {
        warning(
          "security",
          "security.securityAmount",
          `Сумма обеспечения ${num(project.security.securityAmount).toFixed(2)} руб. не соответствует ${percent} % от цены контракта (${expected.toFixed(2)} руб.)`,
          "ч. 6 ст. 34",
        );
      }
    }
  }
  if (project.security.warrantySecurityRequired) {
    const percent = num(project.security.warrantySecurityPercent);
    if (percent > 10) {
      error(
        "security",
        "security.warrantySecurityPercent",
        "Обеспечение гарантийных обязательств не может превышать 10 %",
        "ч. 7 ст. 34, ст. 96",
      );
    }
  }

  // ─── СМП/СОНКО ───────────────────────────────────────────────────────────
  const smpRequired = Boolean(
    project.smp?.required ||
    (project.smpRequiredPercent && num(project.smpRequiredPercent) > 0),
  );
  if (smpRequired) {
    const percent = num(project.smpRequiredPercent);
    if (percent < 5) {
      error(
        "smp",
        "smpRequiredPercent",
        "Объём привлечения СМП/СОНКО не может быть менее 5 % от цены контракта",
        "ч. 5 ст. 30, п. 1 ПП РФ № 1466",
      );
    }
    if (!has(project.smp?.termsText)) {
      warning(
        "smp",
        "smp.termsText",
        "Не описан порядок представления сведений о привлечении СМП/СОНКО",
        "ПП РФ № 1466",
      );
    }
  }

  // ─── Изменение и расторжение ─────────────────────────────────────────────
  if (
    !has(project.change.changeConditions) &&
    !has(project.change.terminationConditions)
  ) {
    error(
      "change",
      "change.changeConditions",
      "Не установлены условия изменения и расторжения контракта",
      "ст. 34 ч. 1 п. 6, ст. 95",
    );
  }

  // ─── Сроки заключения (ст. 51) ───────────────────────────────────────────
  if (has(project.projectDate) && has(project.conclusionDate)) {
    const earliest = addCalendarDays(project.projectDate!, 5);
    if (earliest && project.conclusionDate! < earliest) {
      warning(
        "preamble",
        "conclusionDate",
        `Дата заключения раньше ориентировочного срока подписания победителем (${earliest})`,
        "ч. 2 ст. 51",
      );
    }
  }

  // ─── Специальные разделы по виду контракта ───────────────────────────────
  const sectionIds = contractSectionsForKind(project.kind).map((s) => s.id);

  if (
    sectionIds.includes("projectDocs") &&
    !has(project.projectDocs.documentsList)
  ) {
    error(
      "projectDocs",
      "projectDocs.documentsList",
      "Не указан перечень проектной и технической документации",
      "ст. 34, ст. 48, 52 ГрК РФ",
    );
  }
  if (
    project.kind === "design_survey" &&
    !has(project.designRights.rightsOwner)
  ) {
    error(
      "designRights",
      "designRights.rightsOwner",
      "Не определена принадлежность прав на результаты проектно-изыскательских работ",
      "ст. 1296 ГК РФ",
    );
  }
  if (
    (project.kind === "services_maintenance" ||
      project.kind === "works_maintenance") &&
    (!has(project.maintenance.regions) || !has(project.maintenance.periodEnd))
  ) {
    error(
      "maintenance",
      "maintenance.regions",
      "Не указаны территория и период содержания",
      "ст. 34 ч. 1 п. 3",
    );
  }
  if (
    project.kind === "works_construction_control" &&
    !has(project.control.controlSubject)
  ) {
    error(
      "control",
      "control.controlSubject",
      "Не указан предмет строительного контроля",
      "ст. 53 ГрК РФ",
    );
  }

  // ─── Приложения ──────────────────────────────────────────────────────────
  (project.appendices ?? []).forEach((appendix) => {
    if (appendix.required && !appendix.included) {
      error(
        "appendices",
        "appendices",
        `Обязательное приложение «${appendix.title}» исключено из контракта`,
        "ст. 34, ст. 33",
      );
    }
  });

  return issues;
};

export const contractIssueCounts = (issues: ContractIssue[]) => ({
  errors: issues.filter((issue) => issue.severity === "error").length,
  warnings: issues.filter((issue) => issue.severity === "warning").length,
});

export const hasBlockingIssues = (issues: ContractIssue[]): boolean =>
  issues.some((issue) => issue.severity === "error");
