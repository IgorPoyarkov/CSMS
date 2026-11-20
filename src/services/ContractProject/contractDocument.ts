import {
  CONTRACT_CONCLUSION_RULES,
  type ContractProject,
} from "./contractProject.schema";
import {
  contractKindTerms,
  contractSectionOverrideText,
  contractSectionsForKind,
  isContractSectionIncluded,
} from "./contractStructure";

/**
 * Сборка текста проекта контракта из структуры.
 *
 * Конструктор хранит поля, а этот модуль собирает из них связный документ:
 * преамбулу, нумерованные разделы по ст. 34 и приложения. Текст — черновик
 * для проверки и выгрузки; окончательная юридическая редакция остаётся
 * за контрактной службой заказчика.
 */

export interface ContractDocumentSection {
  id: string;
  number: number;
  title: string;
  article: string;
  paragraphs: string[];
}

export interface ContractDocument {
  title: string;
  preamble: string;
  sections: ContractDocumentSection[];
  appendices: { number: number; title: string; note?: string }[];
  signature: string[];
}

const text = (value?: string | null): string => (value ?? "").trim();

const money = (value?: string): string => {
  const raw = text(value);
  if (!raw) return "—";
  const num = Number(raw);
  if (!Number.isFinite(num)) return raw;
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatContractDate = (value?: string): string => {
  const raw = text(value);
  if (!raw) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return raw;
  return `${match[3]}.${match[2]}.${match[1]}`;
};

const pluralDays = (days: number): string => {
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod10 === 1 && mod100 !== 11) return `${days} рабочий день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return `${days} рабочих дня`;
  return `${days} рабочих дней`;
};

const splitLines = (value?: string): string[] =>
  text(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const paymentProcedureText = (project: ContractProject): string => {
  const terms = contractKindTerms(project.kind);
  if (project.price.paymentProcedure === "advance") {
    return `Оплата производится с авансовым платежом в размере ${text(project.price.advancePercent) || "—"} % от цены Контракта, остальная часть — после приёмки исполненного.`;
  }
  if (project.price.paymentProcedure === "staged") {
    return `Оплата производится поэтапно, в соответствии с этапами исполнения Контракта и подписанными документами о приёмке ${terms.resultNoun}.`;
  }
  return `Оплата производится после приёмки исполненного по Контракту ${terms.resultNoun} и подписания документа о приёмке.`;
};

const buildPreamble = (project: ContractProject): string => {
  const terms = contractKindTerms(project.kind);
  const customer = text(project.customerName) || "Заказчик";
  const supplier = text(project.supplierName) || terms.contractorRole;
  const signerPosition = text(project.preamble.signerPosition);
  const signerName = text(project.preamble.signerName);
  const signerBasis = text(project.preamble.signerBasis);

  const signer = signerPosition || signerName
    ? `, в лице ${[signerPosition, signerName].filter(Boolean).join(" ")}${
        signerBasis ? `, действующего на основании ${signerBasis}` : ""
      }`
    : "";

  return [
    `${customer}, именуемый в дальнейшем «${text(project.preamble.customerRole) || "Заказчик"}»${signer}, с одной стороны, и`,
    `${supplier}, именуемый в дальнейшем «${text(project.preamble.contractorRole) || terms.contractorRole}», с другой стороны,`,
    `${text(project.preamble.basis) ? `на основании ${text(project.preamble.basis)}, ` : ""}заключили настоящий Контракт о нижеследующем:`,
  ].join(" ");
};

const sectionParagraphs = (
  project: ContractProject,
  sectionId: string,
): string[] => {
  const terms = contractKindTerms(project.kind);
  const override = contractSectionOverrideText(project, sectionId);
  if (override) return splitLines(override);

  switch (sectionId) {
    case "subject": {
      const paragraphs = [
        `${text(project.preamble.contractorRole) || terms.contractorRole} обязуется ${terms.performVerb} ${terms.subjectAccusative} в соответствии с условиями Контракта, а Заказчик обязуется принять и оплатить исполненное.`,
        `Наименование объекта закупки: ${text(project.subject.objectName) || "—"}.`,
      ];
      if (text(project.subject.description)) {
        paragraphs.push(`Описание объекта закупки: ${text(project.subject.description)}`);
      }
      if (text(project.subject.objectList)) {
        paragraphs.push(`Перечень объектов: ${text(project.subject.objectList)}`);
      }
      if (text(project.subject.quantity)) {
        paragraphs.push(`Количество (объём): ${text(project.subject.quantity)}.`);
      }
      paragraphs.push(
        `Место исполнения: ${text(project.subject.deliveryPlace) || "—"}.`,
      );
      if (text(project.ikz)) {
        paragraphs.push(`Идентификационный код закупки (ИКЗ): ${text(project.ikz)}.`);
      }
      return paragraphs;
    }
    case "price": {
      const paragraphs = [
        `Цена Контракта составляет ${money(project.price.finalPrice)} ${text(project.price.currency) || "рублей"}.`,
      ];
      if (project.price.isFixed) {
        paragraphs.push(
          "Цена Контракта является твёрдой и определяется на весь срок исполнения Контракта, за исключением случаев, предусмотренных ст. 95 Закона № 44-ФЗ.",
        );
      }
      if (project.price.priceIncludesExpenses) {
        paragraphs.push(
          "Цена Контракта включает все расходы, связанные с исполнением Контракта, в том числе расходы на перевозку, страхование, уплату пошлин, налогов и иных обязательных платежей.",
        );
      }
      if (text(project.price.formula)) {
        paragraphs.push(`Формула цены Контракта: ${text(project.price.formula)}.`);
      }
      // П. 11 Положения (ПП РФ N 60): цена единицы с точностью до 11 знаков
      if (text(project.price.unitPrice)) {
        paragraphs.push(
          `Цена единицы товара, работы, услуги составляет ${text(project.price.unitPrice)} ${text(project.price.currency) || "рублей"} (округление до 11 знаков после запятой).`,
        );
      }
      if (text(project.price.unitPriceNote)) {
        paragraphs.push(text(project.price.unitPriceNote));
      }
      paragraphs.push(paymentProcedureText(project));
      paragraphs.push(
        `Срок оплаты — не позднее ${pluralDays(project.price.paymentTermDays ?? 7)} с даты подписания документа о приёмке.`,
      );
      if (text(project.price.paymentTerms)) {
        paragraphs.push(text(project.price.paymentTerms));
      }
      if (project.price.treasurySupport) {
        paragraphs.push(
          "Контракт исполняется с казначейским сопровождением в соответствии со ст. 242.23 Бюджетного кодекса Российской Федерации.",
        );
      }
      if (project.price.bankSupport) {
        paragraphs.push("Контракт исполняется с банковским сопровождением.");
      }
      return paragraphs;
    }
    case "term": {
      const paragraphs = [
        `Срок исполнения Контракта: с ${formatContractDate(project.term.startDate)} по ${formatContractDate(project.term.endDate)}.`,
      ];
      if (text(project.term.validUntil)) {
        paragraphs.push(
          `Контракт действует до ${formatContractDate(project.term.validUntil)}.`,
        );
      }
      if (text(project.term.executionProcedure)) {
        paragraphs.push(text(project.term.executionProcedure));
      }
      if (text(project.term.deliverySchedule)) {
        paragraphs.push(`График исполнения: ${text(project.term.deliverySchedule)}`);
      }
      const stages = project.term.stages ?? [];
      if (stages.length > 0) {
        paragraphs.push(
          `Контракт исполняется поэтапно: ${stages
            .map(
              (stage, index) =>
                `${index + 1}) ${stage.name} — до ${formatContractDate(stage.endDate)}${stage.amount ? `, стоимость ${money(stage.amount)} руб.` : ""}`,
            )
            .join("; ")}.`,
        );
      }
      return paragraphs;
    }
    case "acceptance": {
      const paragraphs = [
        text(project.term.acceptanceProcedure) ||
          "Приёмка исполненного по Контракту проводится в порядке, установленном ст. 94 Закона № 44-ФЗ.",
      ];
      if (project.acceptance.expertiseRequired) {
        paragraphs.push(
          text(project.acceptance.expertiseProcedure) ||
            "Заказчик проводит экспертизу результатов исполнения Контракта своими силами или с привлечением экспертов.",
        );
      }
      if (text(project.acceptance.acceptanceActForm)) {
        paragraphs.push(
          `Результаты приёмки оформляются документом: ${text(project.acceptance.acceptanceActForm)}.`,
        );
      }
      if (text(project.acceptance.documentsList)) {
        paragraphs.push(
          `Для приёмки представляются: ${text(project.acceptance.documentsList)}`,
        );
      }
      if (project.acceptance.deficienciesDeadlineDays) {
        paragraphs.push(
          `Недостатки, выявленные при приёмке, устраняются в течение ${project.acceptance.deficienciesDeadlineDays} дней.`,
        );
      }
      return paragraphs;
    }
    case "quality": {
      const paragraphs = [text(project.quality.qualityRequirements)];
      if (text(project.quality.specifications)) {
        paragraphs.push(`Требования по позициям: ${text(project.quality.specifications)}`);
      }
      if (project.quality.warrantyPeriodMonths) {
        paragraphs.push(
          `Гарантийный срок составляет ${project.quality.warrantyPeriodMonths} месяцев с даты приёмки.`,
        );
      }
      if (project.quality.serviceLifeMonths) {
        paragraphs.push(
          `Срок службы — ${project.quality.serviceLifeMonths} месяцев.`,
        );
      }
      if (text(project.quality.guaranteeObligations)) {
        paragraphs.push(text(project.quality.guaranteeObligations));
      }
      if (text(project.quality.qualityControlProcedure)) {
        paragraphs.push(text(project.quality.qualityControlProcedure));
      }
      return paragraphs.filter(Boolean);
    }
    case "rightsCustomer":
      return splitLines(
        text(project.rightsCustomer.text) ||
          "Заказчик вправе требовать надлежащего исполнения Контракта, проводить экспертизу результатов, требовать устранения недостатков; обязан принять и оплатить надлежаще исполненное.",
      );
    case "rightsSupplier":
      return splitLines(
        text(project.rightsSupplier.text) ||
          `${terms.contractorRole} обязан ${terms.performVerb} ${terms.subjectAccusative} в установленные сроки и за свой счёт устранять недостатки; вправе требовать оплаты надлежаще исполненного.`,
      );
    case "responsibility": {
      const paragraphs = [
        text(project.security.penaltyText) ||
          "За неисполнение или ненадлежащее исполнение обязательств стороны несут ответственность в соответствии с законодательством Российской Федерации и Контрактом.",
        `Пени начисляются в размере: ${text(project.security.penaltyFormula) || "1/300 ключевой ставки ЦБ РФ за каждый день просрочки"}.`,
      ];
      if (text(project.security.fixedPenaltyAmount)) {
        paragraphs.push(
          `Штраф за ненадлежащее исполнение обязательств составляет ${money(project.security.fixedPenaltyAmount)} руб.`,
        );
      }
      if (project.security.interimPenaltyEnabled) {
        paragraphs.push(
          "Неустойка начисляется также за нарушение сроков исполнения промежуточных обязательств, предусмотренных Контрактом.",
        );
      }
      if (text(project.security.finesTableNote)) {
        paragraphs.push(text(project.security.finesTableNote));
      }
      return paragraphs;
    }
    case "security": {
      const paragraphs: string[] = [];
      if (project.security.performanceSecurityRequired) {
        paragraphs.push(
          `Исполнение Контракта обеспечивается в размере ${text(project.security.performanceSecurityPercent) || "—"} % от цены Контракта, что составляет ${money(project.security.securityAmount)} руб. Форма обеспечения: ${text(project.security.securityForm) || "независимая гарантия или денежные средства"}.`,
        );
      } else {
        paragraphs.push("Обеспечение исполнения Контракта не требуется.");
      }
      if (project.security.warrantySecurityRequired) {
        paragraphs.push(
          `Гарантийные обязательства обеспечиваются в размере ${text(project.security.warrantySecurityPercent) || "—"} %${project.security.warrantySecurityAmount ? `, что составляет ${money(project.security.warrantySecurityAmount)} руб.` : "."}`,
        );
      }
      if (project.change.securityReturnDays) {
        paragraphs.push(
          `Обеспечение возвращается в течение ${pluralDays(project.change.securityReturnDays)} после исполнения обязательств (ч. 27 ст. 34 Закона № 44-ФЗ).`,
        );
      }
      return paragraphs;
    }
    case "smp": {
      if (!project.smp.required) {
        return ["Требование о привлечении субподрядчиков (соисполнителей) из числа СМП/СОНКО не установлено."];
      }
      return [
        text(project.smp.termsText) ||
          `Объём привлечения СМП/СОНКО — не менее ${text(project.smpRequiredPercent) || "5"} % от цены Контракта.`,
        text(project.smp.responsibilityText) ||
          "За непредставление сведений, нарушение сроков или представление недостоверных сведений поставщик несёт ответственность в соответствии с ПП РФ № 1466.",
      ];
    }
    case "change": {
      const paragraphs = [
        text(project.change.changeConditions) ||
          "Изменение существенных условий Контракта допускается по основаниям, предусмотренным ст. 95 Закона № 44-ФЗ.",
      ];
      if (project.change.allowQuantityChange) {
        paragraphs.push(
          "Допускается изменение количества (объёма) поставляемого товара, выполняемых работ, оказываемых услуг в случаях и пределах, установленных ст. 95 Закона № 44-ФЗ.",
        );
      }
      if (project.change.allowPriceChange) {
        paragraphs.push(
          "Допускается изменение цены Контракта в случаях, установленных ст. 95 Закона № 44-ФЗ.",
        );
      }
      if (project.change.unilateralRefusal) {
        paragraphs.push(
          "Стороны вправе принять решение об одностороннем отказе от исполнения Контракта по основаниям, предусмотренным Гражданским кодексом Российской Федерации и ч. 8–19 ст. 95 Закона № 44-ФЗ.",
        );
      }
      if (text(project.change.terminationConditions)) {
        paragraphs.push(text(project.change.terminationConditions));
      }
      if (project.change.changeNoticeDays) {
        paragraphs.push(
          `Уведомление об изменении или расторжении Контракта направляется не позднее чем за ${pluralDays(project.change.changeNoticeDays)}.`,
        );
      }
      return paragraphs;
    }
    case "management":
      return [
        text(project.management.managementProcedure) ||
          "Управление Контрактом осуществляется через представителей сторон.",
        text(project.management.customerRepresentative) &&
          `Представитель Заказчика: ${text(project.management.customerRepresentative)}.`,
        text(project.management.contractorRepresentative) &&
          `Представитель ${terms.contractorRoleGenitive}: ${text(project.management.contractorRepresentative)}.`,
        text(project.management.meetings),
      ].filter(Boolean) as string[];
    case "projectDocs":
      return [
        "Заказчик передаёт, а подрядчик использует при исполнении Контракта следующую документацию:",
        text(project.projectDocs.documentsList) || "—",
        project.projectDocs.expertiseRequired
          ? `Требуется экспертиза: ${text(project.projectDocs.expertiseSubject) || "проектной документации и результатов инженерных изысканий"}.`
          : "",
        text(project.projectDocs.transferProcedure),
      ].filter(Boolean);
    case "designRights":
      return [
        `Права на результаты работ принадлежат: ${text(project.designRights.rightsOwner) || "Заказчику"}.`,
        text(project.designRights.usageRights),
        text(project.designRights.exclusiveRightsNote),
      ].filter(Boolean) as string[];
    case "maintenance":
      return [
        `Территория (объекты): ${text(project.maintenance.regions) || "—"}.`,
        `Период: с ${formatContractDate(project.maintenance.periodStart)} по ${formatContractDate(project.maintenance.periodEnd)}.`,
        text(project.maintenance.scope),
      ].filter(Boolean) as string[];
    case "control":
      return [
        `Предмет строительного контроля: ${text(project.control.controlSubject) || "—"}.`,
        text(project.control.controlPowers),
        text(project.control.controlActForm) &&
          `Результаты контроля оформляются: ${text(project.control.controlActForm)}.`,
        text(project.control.controlPeriod) &&
          `Период контроля: ${text(project.control.controlPeriod)}.`,
      ].filter(Boolean) as string[];
    case "notifications":
      return [
        text(project.notifications.method),
        text(project.notifications.customerAddress) &&
          `Адрес Заказчика: ${text(project.notifications.customerAddress)}.`,
        text(project.notifications.supplierAddress) &&
          `Адрес ${terms.contractorRoleGenitive}: ${text(project.notifications.supplierAddress)}.`,
        text(project.notifications.customerEmail) &&
          `Email Заказчика: ${text(project.notifications.customerEmail)}.`,
        text(project.notifications.supplierEmail) &&
          `Email ${terms.contractorRoleGenitive}: ${text(project.notifications.supplierEmail)}.`,
        project.notifications.responseDays
          ? `Срок ответа на уведомление — ${pluralDays(project.notifications.responseDays)}.`
          : "",
      ].filter(Boolean) as string[];
    case "requisites": {
      const req = project.requisites;
      const agentTypeLabel =
        req.agentType === "bank_payment"
          ? "Банковский платёжный агент"
          : req.agentType === "other"
            ? "Агент"
            : "Платёжный агент";
      return [
        `Заказчик: ${text(req.customerFullName) || text(project.customerName) || "—"}; ИНН ${text(req.customerInn) || "—"}; КПП ${text(req.customerKpp) || "—"}; ОГРН ${text(req.customerOgrn) || "—"}; адрес: ${text(req.customerAddress) || "—"}; email: ${text(req.customerEmail) || "—"}; телефон: ${text(req.customerPhone) || "—"}.`,
        text(req.customerBankDetails) &&
          `Банковские реквизиты Заказчика: ${text(req.customerBankDetails)}.`,
        `${terms.contractorRole}: ${text(req.supplierFullName) || text(project.supplierName) || "—"}; ИНН ${text(req.supplierInn) || "—"}; КПП ${text(req.supplierKpp) || "—"}; ОГРН ${text(req.supplierOgrn) || "—"}; адрес: ${text(req.supplierAddress) || "—"}; email: ${text(req.supplierEmail) || "—"}; телефон: ${text(req.supplierPhone) || "—"}.`,
        text(req.supplierBankDetails) &&
          `Банковские реквизиты ${terms.contractorRoleGenitive}: ${text(req.supplierBankDetails)}.`,
        // П. 11 Положения (ПП РФ N 60): реквизиты платёжного агента
        req.isAgentInvolved &&
          `${agentTypeLabel}: ${text(req.agentFullName) || text(req.agentShortName) || "—"}; ИНН ${text(req.agentInn) || "—"}; КПП ${text(req.agentKpp) || "—"}; счёт: ${text(req.agentAccount) || "—"}.`,
        req.isAgentInvolved &&
          text(req.agentBankDetails) &&
          `Банковские реквизиты агента: ${text(req.agentBankDetails)}.`,
        // П. 11: контракт на жилое помещение с представителем собственника
        req.isResidentialPremisesPurchase &&
          `Представитель собственника жилого помещения: ${text(req.ownerRepresentativeName) || "—"}; счёт: ${text(req.ownerRepresentativeAccount) || "—"}.`,
        req.isResidentialPremisesPurchase &&
          `Счёт собственника жилого помещения: ${text(req.ownerAccount) || "—"}.`,
        req.isResidentialPremisesPurchase &&
          text(req.ownerBankDetails) &&
          `Банковские реквизиты собственника: ${text(req.ownerBankDetails)}.`,
      ].filter(Boolean) as string[];
    }
    default:
      return [];
  }
};

export const buildContractDocument = (
  project: ContractProject,
): ContractDocument => {
  const terms = contractKindTerms(project.kind);
  const sections = contractSectionsForKind(project.kind)
    .filter((section) => section.id !== "preamble" && section.id !== "appendices")
    .filter((section) => isContractSectionIncluded(project, section.id))
    .map((section) => {
      const paragraphs = sectionParagraphs(project, section.id);
      return {
        id: section.id,
        number: 0,
        title: section.title,
        article: section.article,
        paragraphs,
      };
    })
    .filter((section) => section.paragraphs.length > 0);

  const numbered = sections.map((section, index) => ({
    ...section,
    number: index + 1,
    paragraphs: section.paragraphs.map(
      (paragraph, paragraphIndex) =>
        `${index + 1}.${paragraphIndex + 1}. ${paragraph}`,
    ),
  }));

  const appendices = (project.appendices ?? [])
    .filter((item) => item.included)
    .sort((a, b) => a.number - b.number)
    .map((item) => ({
      number: item.number,
      title: item.title,
      note: item.note,
    }));

  const signature = [
    `Заказчик: ${text(project.requisites.signerPosition) || text(project.preamble.signerPosition) || "________________"}`,
    `______________ / ${text(project.requisites.signerName) || text(project.preamble.signerName) || "________________"} /`,
    `${terms.contractorRole}: ________________`,
    "______________ / ________________ /",
  ];

  return {
    title: `ПРОЕКТ КОНТРАКТА${text(project.contractNumber) ? ` № ${text(project.contractNumber)}` : ""}\n${text(project.contractName) || `Контракт на ${terms.subjectAccusative}`}`,
    preamble: buildPreamble(project),
    sections: numbered,
    appendices,
    signature,
  };
};

/** Текст срока заключения по ст. 51 для подсказки в конструкторе */
export const contractTimelineText = (): string =>
  CONTRACT_CONCLUSION_RULES.map(
    (rule) =>
      `${rule.label} — ${rule.days} ${rule.unit} (${rule.article})`,
  ).join("; ");

export const contractDocumentToText = (doc: ContractDocument): string => {
  const parts = [doc.title, "", doc.preamble, ""];
  doc.sections.forEach((section) => {
    parts.push(`${section.number}. ${section.title.toUpperCase()}`);
    parts.push(...section.paragraphs);
    parts.push("");
  });
  if (doc.appendices.length > 0) {
    parts.push("ПРИЛОЖЕНИЯ:");
    doc.appendices.forEach((appendix) => {
      parts.push(
        `${appendix.number}. ${appendix.title}${appendix.note ? ` — ${appendix.note}` : ""}`,
      );
    });
    parts.push("");
  }
  parts.push(...doc.signature);
  return parts.join("\n");
};
