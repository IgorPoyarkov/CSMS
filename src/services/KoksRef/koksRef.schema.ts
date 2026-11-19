import { z } from "zod";

/**
 * Справочник КОКС (nsiKOKS) — Классификатор объектов капитального строительства.
 * Формируется из НСИ ЕИС, используется для выбора кода ОКС/ОНИ при
 * чекбоксе «Закупка в отношении ОКС / недвижимого имущества (КОКС)».
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

export const KoksRefSchema = z.object({
  id: idSchema(),
  code: z
    .string()
    .regex(/^\d{20}$/, "Код КОКС состоит из 20 цифр"),
  name: z.string().min(1, "Укажите наименование объекта капитального строительства"),
  address: z.string().optional().default(""),
  GRBSCode: z.string().optional().default(""),
  GRBSName: z.string().optional().default(""),
  budgetName: z.string().optional().default(""),
  dateStart: z.string().optional().default(""),
  dateEnd: z.string().optional().default(""),
});

export type KoksRef = z.infer<typeof KoksRefSchema>;

export const KoksRefListSchema = z.array(KoksRefSchema);

/**
 * Поиск по справочнику КОКС: подстрока ищется в коде и наименовании.
 */
export const searchKoks = (
  dictionary: KoksRef[],
  query: string,
  limit = 30,
): KoksRef[] => {
  const needle = query
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!needle) {
    return dictionary.slice(0, limit);
  }

  const results: KoksRef[] = [];

  for (const item of dictionary) {
    const code = item.code.replace(/\D/g, "");
    const name = item.name.toLowerCase();
    const codeNormalized = code.replace(/\D/g, "");

    if (
      name.includes(needle) ||
      codeNormalized.includes(needle) ||
      (item.GRBSName ?? "").toLowerCase().includes(needle)
    ) {
      results.push(item);
    }

    if (results.length >= limit) break;
  }

  return results;
};

export const findKoksByCode = (
  dictionary: KoksRef[],
  code: string | undefined,
): KoksRef | undefined => {
  if (!code) return undefined;

  const needle = code.replace(/\D/g, "");

  return dictionary.find(
    (item) => item.code.replace(/\D/g, "") === needle,
  );
};
