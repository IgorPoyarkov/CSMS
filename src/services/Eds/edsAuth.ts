import { type BaseEmployee } from "../StaffingTable/StaffingTable.schema";
import { type BaseOrganization } from "../Organization/organization.schema";
import { type BaseUser } from "../Users/user.schema";
import {
  certificateStateOn,
  extractInnFromSubject,
  extractNameFromSubject,
  personNamesMatch,
  type EdsCertificate,
  type EdsCertificateState,
} from "./eds.schema";

/**
 * Сопоставление сертификата с учётной записью — вход по ЭП (Tasks 9, п. 1).
 *
 * Сертификат сам по себе не даёт права войти: он говорит, КТО им владеет и
 * КАКОЙ организации реквизиты в нём зашиты. Право входа — это связь
 * «сертификат → заказчик → работник штатного расписания → учётная запись».
 * Поэтому цепочка разбирается по шагам, а отказ всегда именован: «сертификат
 * чужой», «такого сотрудника нет в штатке», «работник не привязан к учётке» —
 * это разные ситуации и чинятся по-разному.
 *
 * Функция чистая: справочники и дата передаются аргументами, поэтому
 * сопоставление проверяется на сидах без браузера и без плагина.
 */

export const EDS_LOGIN_STATUSES = [
  "ok",
  "certificate_revoked",
  "certificate_expired",
  "unknown_organization",
  "employee_not_found",
  "no_account",
  "account_org_mismatch",
] as const;

export type EdsLoginStatus = (typeof EDS_LOGIN_STATUSES)[number];

export interface EdsLoginContext {
  organizations: BaseOrganization[];
  employees: BaseEmployee[];
  users: BaseUser[];
  // Дата оценки срока сертификата: «сегодня» приходит извне, чтобы
  // сопоставление можно было проверить на фиксированной дате
  today: string;
}

export interface EdsLoginResolution {
  status: EdsLoginStatus;
  ok: boolean;
  // Причина для пользователя и для комментария в журнале
  message: string;
  organization?: BaseOrganization;
  employee?: BaseEmployee;
  user?: BaseUser;
  certificateInn: string;
  certificateOwner: string;
  certificateState: EdsCertificateState;
}

const sameId = (left: unknown, right: unknown): boolean =>
  String(left ?? "") === String(right ?? "");

const organizationTitle = (organization: BaseOrganization): string =>
  organization.shortName || organization.fullName || "заказчик";

/**
 * Чем сертификат «цепляется» за систему: ИНН из subject (для зарегистрированной
 * записи — поле inn), затем организация, затем работник по ФИО.
 */
export const resolveEdsAccount = (
  certificate: EdsCertificate,
  context: EdsLoginContext,
): EdsLoginResolution => {
  const certificateInn =
    certificate.inn || extractInnFromSubject(certificate.subject || "");
  const certificateOwner =
    certificate.ownerName || extractNameFromSubject(certificate.subject || "");
  const certificateState = certificateStateOn(certificate, context.today);

  const base = {
    certificateInn,
    certificateOwner,
    certificateState,
  };

  if (certificateState === "revoked") {
    return {
      ...base,
      status: "certificate_revoked",
      ok: false,
      message:
        "Сертификат отозван — вход по нему невозможен. Обратитесь в удостоверяющий центр.",
    };
  }

  if (certificateState === "expired") {
    return {
      ...base,
      status: "certificate_expired",
      ok: false,
      message: `Срок действия сертификата истёк (${certificate.validTo}). Вход по ЭП запрещён, войдите по email и паролю.`,
    };
  }

  // Организация: у зарегистрированной записи она уже известна, у «живой» из
  // плагина — только по ИННЮЛ из subject
  let organization = context.organizations.find((item) =>
    sameId(item.id, certificate.organizationId),
  );

  if (!organization && certificateInn) {
    organization = context.organizations.find(
      (item) => item.inn === certificateInn,
    );
  }

  if (!organization) {
    return {
      ...base,
      status: "unknown_organization",
      ok: false,
      message: certificateInn
        ? `Заказчик с ИНН ${certificateInn} не найден среди обслуживаемых организаций — войдите по email и паролю, чтобы добавить его карточку.`
        : "В сертификате нет ИНН организации (ИННЮЛ) — идентифицировать заказчика невозможно. Такой сертификат годится для физлица, но не для входа от имени заказчика.",
    };
  }

  const baseWithOrg = { ...base, organization };

  const employees = context.employees.filter((employee) =>
    sameId(employee.organizationId, organization?.id),
  );

  const employee = employees.find((item) =>
    personNamesMatch(certificateOwner, item.employee || {}),
  );

  if (!employee) {
    return {
      ...baseWithOrg,
      status: "employee_not_found",
      ok: false,
      message: `Владелец сертификата «${certificateOwner || "не определён"}» не найден в штатном расписании организации «${organizationTitle(organization)}» (${employees.length} сотр.). Вход по ЭП разрешён только работникам заказчика.`,
    };
  }

  const baseWithEmployee = { ...baseWithOrg, employee };

  if (!employee.userId) {
    return {
      ...baseWithEmployee,
      status: "no_account",
      ok: false,
      message: `Сотрудник «${certificateOwner}» найден в штатном расписании, но его карточка не привязана к учётной записи. Свяжитесь с администратором: вход по ЭП открыт только привязанному работнику.`,
    };
  }

  const user = context.users.find((item) => sameId(item.id, employee.userId));

  if (!user) {
    return {
      ...baseWithEmployee,
      status: "no_account",
      ok: false,
      message: `Учётная запись работника «${certificateOwner}» не найдена (userId ${String(employee.userId)}).`,
    };
  }

  if (user.organizationId && !sameId(user.organizationId, organization.id)) {
    return {
      ...baseWithEmployee,
      user,
      status: "account_org_mismatch",
      ok: false,
      message: `Учётная запись ${user.email} привязана к другой организации — сертификат «${organizationTitle(organization)}» не даёт по ней доступ.`,
    };
  }

  return {
    ...baseWithEmployee,
    user,
    status: "ok",
    ok: true,
    message: `Вход по ЭП: ${certificateOwner}, ${organizationTitle(organization)}.`,
  };
};
