import {
  SmnpReport238Schema,
  normalizeSmnpReport238,
  smnpReport238IssuesFromError,
  type SmnpReport238,
  type SmnpReport238Draft,
  type SmnpReport238Issue,
} from "./smnpReport238.schema";

/**
 * XML-представление отчёта об объёме закупок у СМП и СОНКО (ПП РФ № 238).
 *
 * Корневой элемент smnpReport и имена дочерних элементов совпадают с полями
 * схемы отчёта, поэтому бэкенд разбирает документ без промежуточного
 * преобразования. Денежные показатели передаются в тысячах рублей, доля —
 * в процентах, даты — в формате ГГГГ-ММ-ДД.
 */

export const SMNP_REPORT_238_XML_NAMESPACE = "urn:csms:reports:smnp238:1.0";
export const SMNP_REPORT_238_XML_SCHEMA_VERSION = "1.0";
export const SMNP_REPORT_238_XML_ROOT = "smnpReport";

const XML_AMP = "&";

const escapeXml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, `${XML_AMP}amp;`)
    .replace(/</g, `${XML_AMP}lt;`)
    .replace(/>/g, `${XML_AMP}gt;`)
    .replace(/"/g, `${XML_AMP}quot;`)
    .replace(/'/g, `${XML_AMP}apos;`);

export class SmnpReport238ValidationError extends Error {
  readonly issues: SmnpReport238Issue[];

  constructor(issues: SmnpReport238Issue[]) {
    super(`Отчёт не прошёл проверку: ${issues.length}`);
    this.name = "SmnpReport238ValidationError";
    this.issues = issues;
  }
}

const registryListXml = (
  tag: string,
  values: string[],
  indent: string,
): string => {
  const items = values
    .filter(Boolean)
    .map(
      (value) =>
        `${indent}  <registryNumber>${escapeXml(value)}</registryNumber>`,
    )
    .join("\n");

  return items
    ? `${indent}<${tag}>\n${items}\n${indent}</${tag}>`
    : `${indent}<${tag}/>`;
};

const renderSmnpReport238Xml = (report: SmnpReport238): string => {
  const { customer, applicability, sectionII, sectionIII, signature } = report;

  const excluded = sectionII.excluded;
  const excludedSection = sectionIII.excludedProcurementContracts;

  return `<?xml version="1.0" encoding="UTF-8"?>
<${SMNP_REPORT_238_XML_ROOT} xmlns="${SMNP_REPORT_238_XML_NAMESPACE}" schemaVersion="${SMNP_REPORT_238_XML_SCHEMA_VERSION}" currency="RUB" unit="thousand">
  <organizationId>${escapeXml(report.organizationId)}</organizationId>
  ${
    report.id !== undefined && report.id !== ""
      ? `<reportId>${escapeXml(report.id)}</reportId>`
      : ""
  }
  <reportYear>${report.year}</reportYear>
  <reportDate>${escapeXml(report.reportDate)}</reportDate>
  <status>${escapeXml(report.status)}</status>
  <customer>
    <fullName>${escapeXml(customer.fullName)}</fullName>
    <legalForm>${escapeXml(customer.legalForm)}</legalForm>
    <addressPhoneEmail>${escapeXml(customer.addressPhoneEmail)}</addressPhoneEmail>
    <inn>${escapeXml(customer.inn)}</inn>
    <kpp>${escapeXml(customer.kpp)}</kpp>
    <okopf>${escapeXml(customer.okopf)}</okopf>
    <okpo>${escapeXml(customer.okpo)}</okpo>
    <oktmo>${escapeXml(customer.oktmo)}</oktmo>
  </customer>
  <applicability>
    <spaceActivity>${applicability.spaceActivity}</spaceActivity>
    <medicines>${applicability.medicines}</medicines>
    <medicalDevices>${applicability.medicalDevices}</medicalDevices>
  </applicability>
  <sectionII>
    <totalAnnualVolume>${escapeXml(sectionII.totalAnnualVolume)}</totalAnnualVolume>
    <excludedVolume>
      <total>${escapeXml(sectionII.excludedTotal)}</total>
      <defense>${escapeXml(excluded.defense)}</defense>
      <creditServices>${escapeXml(excluded.creditServices)}</creditServices>
      <soleSupplier>${escapeXml(excluded.soleSupplier)}</soleSupplier>
      <atomicEnergy>${escapeXml(excluded.atomicEnergy)}</atomicEnergy>
      <closedMethods>${escapeXml(excluded.closedMethods)}</closedMethods>
      <spaceActivity>${escapeXml(excluded.spaceActivity)}</spaceActivity>
      <narcoticDrugs>${escapeXml(excluded.narcoticDrugs)}</narcoticDrugs>
      <medicines>${escapeXml(excluded.medicines)}</medicines>
      <medicalDevices>${escapeXml(excluded.medicalDevices)}</medicalDevices>
    </excludedVolume>
    <adjustedAnnualVolume>${escapeXml(sectionII.adjustedAnnualVolume)}</adjustedAnnualVolume>
    <requiredSmpVolume>${escapeXml(sectionII.requiredSmpVolume)}</requiredSmpVolume>
    <smpVolumeByResults>${escapeXml(sectionII.smpVolumeByResults)}</smpVolumeByResults>
    <subcontractingVolume>${escapeXml(sectionII.subcontractingVolume)}</subcontractingVolume>
    <smpVolumeTotal>${escapeXml(sectionII.smpVolumeTotal)}</smpVolumeTotal>
    <smpSharePercent>${escapeXml(sectionII.smpSharePercent)}</smpSharePercent>
    <failedProcurementsNmckSum>${escapeXml(sectionII.failedProcurementsNmckSum)}</failedProcurementsNmckSum>
  </sectionII>
  <sectionIII>
${registryListXml("smpContracts", sectionIII.smpContracts, "    ")}
${registryListXml("subcontractingContracts", sectionIII.subcontractingContracts, "    ")}
    <excludedProcurementContracts>
${registryListXml("creditServices", excludedSection.creditServices, "      ")}
${registryListXml("soleSupplier", excludedSection.soleSupplier, "      ")}
${registryListXml("failedSoleSupplier", excludedSection.failedSoleSupplier, "      ")}
${registryListXml("atomicEnergy", excludedSection.atomicEnergy, "      ")}
${registryListXml("closedMethods", excludedSection.closedMethods, "      ")}
${registryListXml("spaceActivity", excludedSection.spaceActivity, "      ")}
${registryListXml("narcoticDrugs", excludedSection.narcoticDrugs, "      ")}
${registryListXml("medicines", excludedSection.medicines, "      ")}
${registryListXml("medicalDevices", excludedSection.medicalDevices, "      ")}
    </excludedProcurementContracts>
  </sectionIII>
  <signature>
    <position>${escapeXml(signature.position)}</position>
    <name>${escapeXml(signature.name)}</name>
    <date>${escapeXml(signature.date)}</date>
  </signature>
  ${report.comment ? `<comment>${escapeXml(report.comment)}</comment>` : ""}
</${SMNP_REPORT_238_XML_ROOT}>`;
};

/**
 * Формирует XML отчёта. Если отчёт не прошёл проверку требований ПП РФ № 238,
 * выбрасывается SmnpReport238ValidationError со списком нарушений.
 */
export const buildSmnpReport238Xml = (draft: SmnpReport238Draft): string => {
  const normalized = normalizeSmnpReport238(draft);
  const parsed = SmnpReport238Schema.safeParse(normalized);

  if (!parsed.success) {
    throw new SmnpReport238ValidationError(
      smnpReport238IssuesFromError(parsed.error),
    );
  }

  return renderSmnpReport238Xml(parsed.data);
};

export interface SmnpReport238XmlCheck {
  valid: boolean;
  issues: string[];
}

/**
 * Проверяет XML перед отправкой на бэкенд: корректность разметки, корневой
 * элемент, пространство имён и наличие обязательных разделов формы.
 */
export const validateSmnpReport238Xml = (
  xml: string,
): SmnpReport238XmlCheck => {
  const issues: string[] = [];

  if (!xml.trim()) {
    return { valid: false, issues: ["XML не сформирован"] };
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = document.getElementsByTagName("parsererror")[0];

  if (parserError) {
    return {
      valid: false,
      issues: [parserError.textContent?.trim() || "Нарушена структура XML"],
    };
  }

  const root = document.documentElement;

  if (root.localName !== SMNP_REPORT_238_XML_ROOT) {
    issues.push(`Корневой элемент должен быть ${SMNP_REPORT_238_XML_ROOT}`);
  }

  if (root.namespaceURI !== SMNP_REPORT_238_XML_NAMESPACE) {
    issues.push(
      `Неверное пространство имён: ${root.namespaceURI ?? "отсутствует"}`,
    );
  }

  const requiredChildren = [
    "organizationId",
    "reportYear",
    "reportDate",
    "status",
    "customer",
    "applicability",
    "sectionII",
    "sectionIII",
    "signature",
  ];
  const presentChildren = new Set(
    Array.from(root.children).map((child) => child.localName),
  );

  requiredChildren.forEach((tag) => {
    if (!presentChildren.has(tag)) {
      issues.push(`Отсутствует обязательный раздел ${tag}`);
    }
  });

  const sectionII = Array.from(root.children).find(
    (child) => child.localName === "sectionII",
  );
  const requiredSectionII = [
    "totalAnnualVolume",
    "excludedVolume",
    "adjustedAnnualVolume",
    "requiredSmpVolume",
    "smpVolumeByResults",
    "subcontractingVolume",
    "smpVolumeTotal",
    "smpSharePercent",
    "failedProcurementsNmckSum",
  ];

  if (sectionII) {
    const presentSectionII = new Set(
      Array.from(sectionII.children).map((child) => child.localName),
    );
    requiredSectionII.forEach((tag) => {
      if (!presentSectionII.has(tag)) {
        issues.push(`В разделе II отсутствует показатель ${tag}`);
      }
    });
  }

  const customer = Array.from(root.children).find(
    (child) => child.localName === "customer",
  );
  const requiredCustomer = [
    "fullName",
    "legalForm",
    "addressPhoneEmail",
    "inn",
    "kpp",
    "okopf",
    "okpo",
    "oktmo",
  ];

  if (customer) {
    const presentCustomer = new Set(
      Array.from(customer.children).map((child) => child.localName),
    );
    requiredCustomer.forEach((tag) => {
      if (!presentCustomer.has(tag)) {
        issues.push(`В разделе I отсутствует показатель ${tag}`);
      }
    });
  }

  return { valid: issues.length === 0, issues };
};

export const smnpReport238XmlFileName = (year: number): string =>
  `Отчёт_СМП_СОНКО_ПП238_${year}.xml`;

export const downloadSmnpReport238Xml = (xml: string, year: number): void => {
  const blob = new Blob([xml], {
    type: "application/xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = smnpReport238XmlFileName(year);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
