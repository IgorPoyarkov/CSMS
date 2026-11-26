/**
 * Запрос коммерческих предложений: формирование XML и скачивание.
 *
 * Заказчик направляет потенциальным подрядчикам запрос цены с условиями оплаты,
 * поставки и приёмки. Ответы (КП) затем заносятся в расчёт НМЦК методом
 * сопоставимых рыночных цен. XML собирается в простом структурированном виде,
 * совместимом с реквизитами ЕИС (контрагенты — по ИНН, как в справочнике).
 */

export interface CommercialRequestRecipient {
  inn: string;
  name: string;
  email?: string;
}

export interface CommercialRequestContext {
  organizationName: string;
  subject: string;
  okpd2Code: string;
  quantity: string;
  unit: string;
  ikz?: string;
  recipients: CommercialRequestRecipient[];
  paymentTerms?: string;
  deliveryTerms?: string;
  acceptanceTerms?: string;
  deadline?: string;
}

const esc = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const buildCommercialRequestXml = (
  context: CommercialRequestContext,
): string => {
  const recipients = context.recipients
    .map(
      (r) =>
        `  <recipient>\n    <inn>${esc(r.inn)}</inn>\n    <name>${esc(r.name)}</name>${
          r.email ? `\n    <email>${esc(r.email)}</email>` : ""
        }\n  </recipient>`,
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<commercialProposalRequest>",
    `  <customer>${esc(context.organizationName)}</customer>`,
    `  <ikz>${esc(context.ikz ?? "")}</ikz>`,
    `  <subject>${esc(context.subject)}</subject>`,
    `  <okpd2Code>${esc(context.okpd2Code)}</okpd2Code>`,
    `  <quantity>${esc(context.quantity)}</quantity>`,
    `  <unit>${esc(context.unit)}</unit>`,
    "  <terms>",
    `    <payment>${esc(context.paymentTerms ?? "")}</payment>`,
    `    <delivery>${esc(context.deliveryTerms ?? "")}</delivery>`,
    `    <acceptance>${esc(context.acceptanceTerms ?? "")}</acceptance>`,
    "  </terms>",
    `  <deadline>${esc(context.deadline ?? "")}</deadline>`,
    "  <recipients>",
    recipients,
    "  </recipients>",
    "</commercialProposalRequest>",
  ].join("\n");
};

export const downloadCommercialRequestXml = (
  context: CommercialRequestContext,
  fileName?: string,
): void => {
  const xml = buildCommercialRequestXml(context);
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "Запрос_коммерческих_предложений.xml";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
