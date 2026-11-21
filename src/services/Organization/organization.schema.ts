import { z } from "zod";

/**
 * Организация-заказчик по 44-ФЗ.
 *
 * Реквизиты заказчика не вводятся при формировании плана-графика: они
 * известны из учётной записи пользователя, который привязан к организации
 * (users.organizationId). Здесь описаны сами реквизиты и их снимок,
 * который сохраняется в план-график на дату его формирования.
 */

const optionalText = (minLength: number, message: string) =>
  z
    .string()
    .refine((value) => value === "" || value.length >= minLength, message)
    .optional();

const optionalPattern = (pattern: RegExp, message: string) =>
  z
    .string()
    .refine((value) => value === "" || pattern.test(value), message)
    .optional();

const optionalEmail = () =>
  z
    .string()
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Не корректный email",
    )
    .optional();

// Уровень бюджета определяет, чей план-график ведёт заказчик (РФ, регион, МО)
export const OrganizationBudgetLevelSchema = z.enum([
  "federal",
  "regional",
  "municipal",
]);

export type OrganizationBudgetLevel = z.infer<
  typeof OrganizationBudgetLevelSchema
>;

export const ORGANIZATION_BUDGET_LEVEL_LABELS: Record<
  OrganizationBudgetLevel,
  string
> = {
  federal: "Федеральный бюджет",
  regional: "Бюджет субъекта Российской Федерации",
  municipal: "Местный (муниципальный) бюджет",
};

// Реквизиты счёта заказчика, куда перечисляются денежные средства в качестве
// обеспечения заявки / исполнения контракта / гарантийных обязательств
export const OrganizationSecurityAccountSchema = z.object({
  recipientName: z.string().optional(),
  recipientInn: z.string().optional(),
  recipientKpp: z.string().optional(),
  settlementAccount: z.string().optional(),
  personalAccount: z.string().optional(),
  bik: z.string().optional(),
  bankName: z.string().optional(),
  correspondentAccount: z.string().optional(),
});

export type OrganizationSecurityAccount = z.infer<
  typeof OrganizationSecurityAccountSchema
>;

// Реквизиты счёта для перечисления денежных средств в случае, предусмотренном
// ч. 13 ст. 44 Закона № 44-ФЗ (в соответствующий бюджет бюджетной системы РФ)
export const BudgetPart13Art44RequisitesSchema = z.object({
  recipientInn: z.string().optional(),
  recipientKpp: z.string().optional(),
  incomeKbk: z.string().optional(),
  oktmo: z.string().optional(),
  singleTreasuryAccount: z.string().optional(),
  treasuryAccount: z.string().optional(),
  bikTofk: z.string().optional(),
  recipientName: z.string().optional(),
});

export type BudgetPart13Art44Requisites = z.infer<
  typeof BudgetPart13Art44RequisitesSchema
>;

// Закреплённые за организацией реквизиты и порядки предоставления обеспечений:
// вносит и актуализирует уполномоченный член КС, далее они предзаполняют СЗ и извещения.
export const OrganizationProcurementRequisitesSchema = z.object({
  securityRequisites: OrganizationSecurityAccountSchema.optional(),
  budgetPart13Art44Requisites: BudgetPart13Art44RequisitesSchema.optional(),
  defaultApplicationSecurityOrder: z.string().optional(),
  defaultContractSecurityOrder: z.string().optional(),
  defaultWarrantySecurityOrder: z.string().optional(),
  updatedAt: z.string().optional(),
  updatedByName: z.string().optional(),
});

export type OrganizationProcurementRequisites = z.infer<
  typeof OrganizationProcurementRequisitesSchema
>;

export const OrganizationRequisitesSchema = z.object({
  fullName: z
    .string()
    .min(5, "Укажите полное наименование заказчика")
    .refine(
      (value) =>
        /федеральн|государствен|муниципал|бюджетн|автономн|казенн|учреждени|Российской|администрац|департамент|комитет/i.test(
          value,
        ),
      "План-график по 44-ФЗ ведёт орган власти или государственное (муниципальное) учреждение",
    ),
  shortName: optionalText(2, "Укажите краткое наименование заказчика"),
  inn: z
    .string()
    .regex(/^(\d{10}|\d{12})$/, "ИНН должен содержать 10 (юрлицо) или 12 (ИП) цифр"),
  kpp: optionalPattern(/^\d{9}$/, "КПП должен содержать 9 цифр"),
  ogrn: optionalPattern(
    /^(\d{13}|\d{15})$/,
    "ОГРН должен содержать 13 (юрлицо) или 15 (ИП) цифр",
  ),
  okpo: optionalPattern(/^\d{8,10}$/, "ОКПО должен содержать 8 или 10 цифр"),
  legalAddress: optionalText(5, "Укажите юридический адрес заказчика"),
  postalAddress: optionalText(5, "Укажите почтовый адрес для связи"),
  email: optionalEmail(),
  phone: optionalText(5, "Укажите контактный телефон заказчика"),
  responsiblePerson: optionalText(
    5,
    "Укажите ответственного за планирование закупок (ФИО)",
  ),
  responsiblePhone: optionalText(5, "Укажите телефон ответственного"),
  // Реквизиты организации для выгрузки в ЕИС 17.0 (tenderPlan2020OrganizationType)
  regNum: optionalPattern(/^\d{11}$/, "Код по СПЗ состоит из 11 цифр"),
  consRegistryNum: optionalText(5, "Укажите код по Сводному реестру"),
  okopf: optionalText(2, "Укажите код ОКОПФ"),
  okfs: optionalText(2, "Укажите код ОКФС"),
  oktmo: optionalPattern(/^\d{8,11}$/, "Код ОКТМО состоит из 8–11 цифр"),
  oktmoPpo: optionalText(2, "Укажите публично-правовое образование по ОКТМО"),
  // Публичные сведения карточки организации ЕИС. Используются для
  // ведомственного нормирования и справочной информации, в UI пока не выводятся.
  taxRegistrationDate: optionalText(
    8,
    "Укажите дату постановки на учёт в налоговом органе",
  ),
  organizationType: optionalText(2, "Укажите тип организации"),
  okvedCodes: z.array(z.string()).optional(),
  budgetCode: optionalText(5, "Укажите код бюджета"),
  budgetName: optionalText(3, "Укажите наименование бюджета"),
  fax: optionalText(5, "Укажите факс"),
  timeZone: optionalText(3, "Укажите часовую зону"),
  authority: z
    .object({
      code: z.string().optional(),
      inn: z.string().optional(),
      kpp: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  authorizedOrganization: z
    .object({
      code: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  authorizedBody: z
    .object({
      inn: z.string().optional(),
      kpp: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  powers: z
    .array(
      z.object({
        name: z.string(),
        since: z.string().optional(),
      }),
    )
    .optional(),
});

export type OrganizationRequisites = z.infer<
  typeof OrganizationRequisitesSchema
>;

export const BaseOrganizationSchema = OrganizationRequisitesSchema.extend({
  id: z.union([z.string(), z.number()]).optional(),
  budgetLevel: OrganizationBudgetLevelSchema.optional(),
  registryNumber: optionalText(
    5,
    "Укажите номер реестровой записи заказчика в ЕИС",
  ),
  isActive: z.boolean().optional(),
  procurementRequisites: OrganizationProcurementRequisitesSchema.optional(),
});

export type BaseOrganization = z.infer<typeof BaseOrganizationSchema>;

export const OrganizationListSchema = z.array(BaseOrganizationSchema);

// Снимок заказчика в плане-графике: план-график «запоминает» реквизиты на
// дату формирования, чтобы последующее изменение карточки организации не
// переписывало уже размещённый в ЕИС документ.
export const OrganizationCustomerSchema = OrganizationRequisitesSchema.extend({
  id: z.union([z.string(), z.number()]).optional(),
});

export type OrganizationCustomer = z.infer<typeof OrganizationCustomerSchema>;

export const organizationToCustomer = (
  organization: BaseOrganization,
): OrganizationCustomer => ({
  id: organization.id,
  fullName: organization.fullName,
  shortName: organization.shortName,
  inn: organization.inn,
  kpp: organization.kpp,
  ogrn: organization.ogrn,
  legalAddress: organization.legalAddress,
  postalAddress: organization.postalAddress,
  email: organization.email,
  phone: organization.phone,
  responsiblePerson: organization.responsiblePerson,
  responsiblePhone: organization.responsiblePhone,
  regNum: organization.regNum,
  consRegistryNum: organization.consRegistryNum,
  okopf: organization.okopf,
  okfs: organization.okfs,
  oktmo: organization.oktmo,
  oktmoPpo: organization.oktmoPpo,
  taxRegistrationDate: organization.taxRegistrationDate,
  organizationType: organization.organizationType,
  okvedCodes: organization.okvedCodes,
  budgetCode: organization.budgetCode,
  budgetName: organization.budgetName,
  fax: organization.fax,
  timeZone: organization.timeZone,
  authority: organization.authority,
  authorizedOrganization: organization.authorizedOrganization,
  authorizedBody: organization.authorizedBody,
  powers: organization.powers,
});
