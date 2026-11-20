import { z } from "zod";

// Функция контрактной службы — элемент справочника. Хранится в БД как отдельная
// сущность, чтобы заказчик мог добавлять свои функции.
//
// Функция «из приказа» (isFromOrder=true) — общая для всех заказчиков,
// organizationId=null, isDeletable=false.
// Функция заказчика (isFromOrder=false) — привязана к organizationId,
// isDeletable=true, другие заказчики её не видят.
export const ContractFunctionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  code: z.string().min(1),
  paragraph: z.string().default(""),
  title: z.string().min(1),
  category: z.string().min(1),
  isFromOrder: z.boolean().default(false),
  organizationId: z.union([z.string(), z.number()]).nullable().default(null),
  isDeletable: z.boolean().default(false),
});

export type ContractFunction = z.infer<typeof ContractFunctionSchema>;

// Пустая функция для добавления
export const emptyContractFunction = (
  organizationId: string | number,
  category: string,
): Omit<ContractFunction, "id"> => ({
  code: `custom-${Date.now()}`,
  paragraph: "",
  title: "",
  category,
  isFromOrder: false,
  organizationId,
  isDeletable: true,
});

// Категории для выпадающего списка (соответствуют разделам III Приказа 158н)
export const contractFunctionCategoryOptions = [
  { value: "planning", label: "3.1 Планирование закупок" },
  { value: "procurement", label: "3.2 Определение поставщика" },
  { value: "contract_conclusion", label: "3.3 Заключение контрактов" },
  { value: "execution", label: "3.4 Исполнение, изменение, расторжение" },
  { value: "other_functions", label: "3.5 Иные функции и полномочия" },
];

export const contractFunctionCategoryLabel = (category: string): string =>
  contractFunctionCategoryOptions.find((o) => o.value === category)?.label ??
  category;
