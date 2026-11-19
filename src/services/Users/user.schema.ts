import { z } from "zod";

export const BaseUserSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  email: z.string().email("Не корректный email").optional(),
  password: z
    .string()
    .min(6, "Пароль не может быть менее 6 символов")
    .optional(),
  // Организация-заказчик (44-ФЗ), к которой привязана учётная запись
  organizationId: z.union([z.string(), z.number()]).optional(),
  // Связь с сотрудником из штатного расписания: нужен личному кабинету для
  // загрузки задач, образования и роли в контрактной службе
  employeeId: z.union([z.string(), z.number()]).optional(),
});

export type BaseUser = z.infer<typeof BaseUserSchema>;

export const LoginSchema = BaseUserSchema.pick({
  email: true,
  password: true,
});

export type Login = z.infer<typeof LoginSchema>;

export const RegisterFormSchema = BaseUserSchema.pick({
  email: true,
  password: true,
})
  .extend({
    confirmPassword: z.string().min(1, "Повторите пароль").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterForm = z.infer<typeof RegisterFormSchema>;

export const RegisterSchema = BaseUserSchema.pick({
  email: true,
  password: true,
});

export type Register = z.infer<typeof RegisterSchema>;
