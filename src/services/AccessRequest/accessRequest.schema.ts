import { z } from "zod";

/**
 * Заявка работника контрактной службы в подразделение, которое ведёт сведения
 * об образовании (отдел кадров либо иной отдел, указанный заказчиком).
 *
 * Основание — п. 2.5 Типового положения (приказ Минфина России N 158н): работник
 * службы должен иметь высшее образование или ДПО в сфере закупок. Если сведения
 * об образовании отсутствуют, возможно, их просто не внесли в реестр — тогда
 * работник направляет заявку, а не «чинит» себе квалификацию сам.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

export const AccessRequestStatusSchema = z.enum([
  "new",
  "in_progress",
  "satisfied",
  "rejected",
]);

export type AccessRequestStatus = z.infer<typeof AccessRequestStatusSchema>;

export const AccessRequestSchema = z.object({
  id: idSchema(),
  organizationId: z.union([z.string(), z.number()]),
  employeeId: z.union([z.string(), z.number()]),
  employeeName: z.string(),
  // Основание заявки: сейчас только отсутствие профильного образования
  type: z.string().default("missing_education"),
  message: z.string().default(""),
  recipientStructuralUnitId: z.union([z.string(), z.number()]).optional(),
  recipientStructuralUnitName: z.string().default(""),
  status: AccessRequestStatusSchema.default("new"),
  createdAt: z.string().default(""),
});

export type AccessRequest = z.infer<typeof AccessRequestSchema>;

export const AccessRequestListSchema = z.array(AccessRequestSchema);

// Заявка считается отправленной по работнику, пока она не закрыта отказом:
// «satisfied» и «rejected» возвращают кнопку в активное состояние
export const isAccessRequestOpen = (request: AccessRequest): boolean =>
  request.status === "new" || request.status === "in_progress";
