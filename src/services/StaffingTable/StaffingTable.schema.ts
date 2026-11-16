import z from "zod";
import { BaseUserSchema } from "../Users/user.schema";

export const BaseStaffingTableSchema = z.object({});

export const BaseHumanSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().min(1, "Укажите имя").optional(),
  surname: z.string().min(1, "Укажите фамилию").optional(),
  patronymic: z.string().min(1, "Укажите отчество").optional(),
  birthDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Неверный формат даты рождения (ожидается ГГГГ-ММ-ДД)",
    )
    .optional(),
  birthPlace: z.string().min(1, "Укажите место рождения").optional(),
});

export type BaseHuman = z.infer<typeof BaseHumanSchema>;

export const BaseStructuralUnitSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z
    .string()
    .min(1, "Название структурного подразделения должно быть указано")
    .optional(),
  conventionalSymbol: z
    .string()
    .min(1, "Вы не указали сокращённое название структурного подразделения"),
  email: z.string().email("Не корректный email").optional(),
  subordination: z.boolean().default(false).optional(),
  presenceManager: z.boolean().default(true).optional(),
  countPresenceManager: z.number().default(1).optional(),
  // Организация-заказчик (44-ФЗ): штатное расписание принадлежит конкретной
  // организации, поэтому подразделения другой организации недоступны при
  // выборе (например, при указании контрактной службы заказчика)
  organizationId: z.union([z.string(), z.number()]).optional(),
});

export type BaseStructuralUnit = z.infer<typeof BaseStructuralUnitSchema>;

export const BaseEmployeeSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  email: z.string().email("Некорректный email").optional(),
  user: BaseUserSchema.optional(),
  // Учётная запись, под которой работник входит в систему (users.id). Связь
  // нужна личному кабинету: по id сотрудника подбираются его задачи, роль в
  // контрактной службе и документы об образовании. Хранится отдельным полем,
  // а не вложенным user, потому что json-server раскрывает связь через _expand,
  // а фильтрация по вложенному объекту невозможна.
  userId: z.union([z.string(), z.number()]).optional(),
  employee: BaseHumanSchema.optional(),
  phone: z.string().optional(),
  employeeNumber: z
    .string()
    .min(1, "Должен быть указан табельный номер сотрудника")
    .optional(),
  // Должность по штатному расписанию: нужна, например, при назначении
  // контрактного управляющего или состава контрактной службы
  position: z.string().optional(),
  admissionDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Неверный формат даты приема сотрудника (ожидается ГГГГ-ММ-ДД)",
    )
    .optional(),
  structuralUnitId: z.union([z.string(), z.number()]).optional(),
  structuralUnit: BaseStructuralUnitSchema.optional(),
  // Организация-заказчик (44-ФЗ), в которой служит сотрудник
  organizationId: z.union([z.string(), z.number()]).optional(),
  avatar: z.string().optional(),
});

export type BaseEmployee = z.infer<typeof BaseEmployeeSchema>;

export const EmployeeRegisterSchema = BaseEmployeeSchema.pick({
  id: true,
  employee: true,
  email: true,
  employeeNumber: true,
});

export type EmployeeRegister = z.infer<typeof EmployeeRegisterSchema>;

// Поля профиля, которые работник ведёт сам в личном кабинете. Должность,
// подразделение, табельный номер и ФИО задаёт отдел кадров в штатном
// расписании — работник их не меняет.
export const EmployeeProfileSchema = z.object({
  phone: z
    .string()
    .refine(
      (value) => value === "" || /^[\d\s+()-]{5,20}$/.test(value),
      "Укажите телефон в формате +7 495 100-01-01",
    )
    .optional(),
  avatar: z.string().optional(),
});

export type EmployeeProfileChanges = z.infer<typeof EmployeeProfileSchema>;
