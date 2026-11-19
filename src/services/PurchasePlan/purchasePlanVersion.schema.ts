import { z } from "zod";
import { PurchasePlanSchema } from "./purchasePlan.schema";

/**
 * Снимок версии плана-графика закупок (история редакций: черновики,
 * утверждённые редакции, публикации в ЕИС, импорт и откаты).
 */

export const PlanVersionKindSchema = z.enum([
  "draft",
  "approved",
  "published",
  "imported",
  "rollback",
]);

export type PlanVersionKind = z.infer<typeof PlanVersionKindSchema>;

export const planVersionKindLabels: Record<PlanVersionKind, string> = {
  draft: "Черновик",
  approved: "Утверждённая редакция",
  published: "Опубликована в ЕИС",
  imported: "Импорт из файла / ЕИС",
  rollback: "Восстановлена из архива",
};

export const PurchasePlanVersionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  purchasePlanId: z.union([z.string(), z.number()]),
  organizationId: z.union([z.string(), z.number()]),
  versionNumber: z.number().int().min(1),
  versionLabel: z.string().min(2, "Укажите название версии"),
  snapshotStatus: PlanVersionKindSchema.default("draft"),
  createdAt: z.string().min(4),
  createdBy: z.string().optional(),
  comment: z.string().optional(),
  snapshot: PurchasePlanSchema,
});

export type PurchasePlanVersion = z.infer<typeof PurchasePlanVersionSchema>;
export const PurchasePlanVersionListSchema = z.array(
  PurchasePlanVersionSchema,
);
