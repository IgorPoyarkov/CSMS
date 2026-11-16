import { z } from "zod";

/**
 * Образование работника контрактной службы (п. 2.5 Типового положения).
 *
 * Пункт 2.5 требует, чтобы все работники контрактной службы имели:
 * - высшее образование (люгое, но желательно в сфере гос. и муниц. закупок);
 * - дополнительное профессиональное образование (ДПО) в сфере закупок.
 *
 * ДПО имеет срок действия — после истечения работник не может выполнять
 * функции контрактной службы до обновления квалификации. Система ведёт
 * реестр документов и выводит предупреждения кадровику.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

export const EducationTypeSchema = z.enum(["higher", "dpo"]);

export type EducationType = z.infer<typeof EducationTypeSchema>;

// Поле образования: если содержит «закупк» (в любой форме) — считается
// профильным. Это упрощение: в реальности требуется детальная классификация,
// но для первичной валидации достаточно.
const PROFILE_KEYWORDS = ["закупк", "44-фз", "223-фз", "контрактн", "гос"];

const isProfileEducation = (field: string): boolean =>
  PROFILE_KEYWORDS.some(
    (keyword) => field.toLowerCase().includes(keyword),
  );

export const EmployeeEducationSchema = z.object({
  id: idSchema(),
  // Работник, которому принадлежит этот документ (employee.id из штатки)
  employeeId: z.union([z.string(), z.number()]),
  // Тип: высшее или ДПО
  type: EducationTypeSchema,
  // Направление / специальность: «Закупки и гос. контракты»
  field: z.string().min(1, "Укажите направление образования"),
  // Организация, выдавшая документ (вуз или центр повышения квалификации)
  institution: z.string().min(1, "Укажите организацию"),
  // Дата выдачи / окончания обучения
  graduationDate: z
    .string()
    .regex(
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
      "Неверный формат даты (ожидается ГГГГ-ММ-ДД)",
    ),
  // Срок действия ДПО в месяцах (по умолчанию 36 — три года)
  dpoValidityMonths: z.number().int().positive().default(36),
  // Номер документа (диплом / удостоверение)
  documentNumber: z.string().optional(),
  // Статус: активен / истёк / истекает
  status: z.enum(["active", "expiring", "expired"]).default("active"),
});

export type EmployeeEducation = z.infer<typeof EmployeeEducationSchema>;

// Значение по умолчанию для нового документа
export const emptyEducation = (employeeId: string | number): EmployeeEducation =>
  ({
    employeeId,
    type: "higher",
    field: "",
    institution: "",
    graduationDate: "",
    dpoValidityMonths: 36,
    documentNumber: "",
    status: "active",
  } as EmployeeEducation);

// Проверка: имеет ли работник профильное образование
export const hasProfileEducation = (
  educations: EmployeeEducation[],
): boolean =>
  educations.some((edu) => isProfileEducation(edu.field));

// Проверка: не истёк ли срок ДПО (сегодня внутри [graduationDate, expirationDate])
export const isDpoExpired = (edu: EmployeeEducation): boolean => {
  if (edu.type !== "dpo") return false;

  const grad = new Date(edu.graduationDate);
  if (isNaN(grad.getTime())) return false;

  const expiry = new Date(grad);
  expiry.setMonth(expiry.getMonth() + edu.dpoValidityMonths);

  return Date.now() > expiry.getTime();
};

// Проверка: истекает ли ДПО в течение заданных дней
export const isDpoExpiringSoon = (
  edu: EmployeeEducation,
  days: number = 90,
): boolean => {
  if (edu.type !== "dpo") return false;

  const grad = new Date(edu.graduationDate);
  if (isNaN(grad.getTime())) return false;

  const expiry = new Date(grad);
  expiry.setMonth(expiry.getMonth() + edu.dpoValidityMonths);

  const now = Date.now();
  const threshold = expiry.getTime() - days * 86_400_000;

  // Истекает в течение [now, expiry]
  return now <= expiry.getTime() && now >= threshold;
};

// Предупреждение: нет профильного образования
export const noProfileEducationWarning = (
  employeeFullName?: string,
): string => {
  const name = employeeFullName ? `"${employeeFullName}"` : "Работник";

  return `${name} не имеет профильного образования в сфере закупок. По п. 2.5 Типового положения работник контрактной службы должен иметь высшее или дополнительное профессиональное образование в сфере закупок`;
};

// Предупреждение: ДПО истекло
export const dpoExpiredWarning = (
  employeeFullName?: string,
): string => {
  const name = employeeFullName ? `"${employeeFullName}"` : "Работник";

  return `Срок действия ДПО ${name} истёк. Работник не может выполнять функции контрактной службы до обновления квалификации`;
};

// Предупреждение: ДПО истекает
export const dpoExpiringWarning = (
  employeeFullName?: string,
): string => {
  const name = employeeFullName ? `"${employeeFullName}"` : "Работник";

  return `Срок действия ДПО ${name} истекает. Рекомендуется направить работника на курсы повышения квалификации`;
};

// Получить все образования для сотрудника
export const getEmployeeEducations = (
  educations: EmployeeEducation[],
  employeeId: string | number,
): EmployeeEducation[] =>
  educations.filter(
    (edu) => String(edu.employeeId) === String(employeeId),
  );
