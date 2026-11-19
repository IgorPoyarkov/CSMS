import { z } from "zod";

/**
 * Дефектовка и производные от неё документы (Tasks 8, п. 4).
 *
 * Роль «инициатор закупки» — работник подразделения-заказчика, не входящий
 * в контрактную службу, — описывает не объект закупки целиком (наименование,
 * ОКПД2, требования уже живут в ООЗ — `objectDescriptions`), а **объём работ**:
 * дефектную ведомость позициями с шифрами ГЭСН/ФЕР. Это тот вход, который
 * контрактная служба действительно не может собрать за подразделение.
 *
 * Из дефектовки вырастают два документа, которые раньше делались в Excel:
 * - **проект сметы контракта** — прямые затраты по позициям, накладные
 *   расходы, сметная прибыль, НДС; методика — приказ Минстроя России
 *   от 04.08.2020 N 421/пр (ссылка на акт в `legalActs`);
 * - **проект календарного графика** — этапы с датами и суммами; методика —
 *   приказ Минстроя России от 05.06.2018 N 336/пр (график выполнения СМР
 *   и график оплаты).
 *
 * Наименование объекта и ОКПД2 здесь не дублируются: они берутся из
 * выбранного ООЗ (`objectDescriptionId`), а `objectName` — только снимок для
 * печати, если ООЗ ещё не заведено.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

const requiredId = (message: string) =>
  z
    .union([z.string(), z.number()])
    .refine(
      (value) => value !== "" && value !== null && value !== undefined,
      message,
    );

const optionalText = (minLength: number, message: string) =>
  z
    .string()
    .refine((value) => value === "" || value.length >= minLength, message)
    .optional();

const isoDate = () =>
  z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
      "Неверный формат даты (ожидается ГГГГ-ММ-ДД)",
    )
    .optional();

// Деньги и объёмы — строки, как во всех схемах проекта: json-server не знает
// типов, а форма отдаёт то, что ввёл человек
const optionalMoney = () =>
  z
    .string()
    .refine(
      (value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value),
      "Укажите сумму числом с точностью до копеек",
    )
    .optional();

const optionalQuantity = () =>
  z
    .string()
    .refine(
      (value) => value === "" || /^\d+(\.\d{1,3})?$/.test(value),
      "Укажите количество числом (до трёх знаков после запятой)",
    )
    .optional();

const percent = (max: number) =>
  z.coerce
    .number({ message: "Укажите процент числом" })
    .min(0, "Процент не может быть отрицательным")
    .max(max, `Процент не может превышать ${max}`);

const today = (): string => new Date().toISOString().slice(0, 10);

// Роль, которая готовит дефектовку
export const DEFECT_INITIATOR_ROLE = "Инициатор закупки";

export const DEFECT_INITIATOR_ROLE_HINT =
  "Работник подразделения-заказчика вне контрактной службы: готовит " +
  "дефектовку, проект сметы контракта и проект календарного графика";

// Раздел по умолчанию: если инициатор не разбил работы по разделам
export const DEFAULT_DEFECT_SECTION = "Прочие работы";

export const DefectListStatusSchema = z.enum([
  "draft",
  "submitted",
  "accepted",
  "returned",
]);

export type DefectListStatus = z.infer<typeof DefectListStatusSchema>;

export const defectListStatusLabels: Record<DefectListStatus, string> = {
  draft: "Черновик",
  submitted: "Направлено в КС",
  accepted: "Принято в работу",
  returned: "Возвращено на доработку",
};

// === Дефектовка: позиции работ ===

export const DefectItemSchema = z.object({
  id: idSchema(),
  // Раздел дефектовки (конструктив, вид работ) — по нему же строятся этапы
  // календарного графика
  section: z.string().optional(),
  // Шифр расценки ГЭСН/ФЕР — то, что потом «парсится» в смету, в отличие от
  // свободного текста требований
  normCode: z.string().optional(),
  name: z.string().trim().min(1, "Укажите вид работ"),
  unit: z.string().optional(),
  quantity: optionalQuantity(),
  unitPrice: optionalMoney(),
});

export type DefectItem = z.infer<typeof DefectItemSchema>;

// === Проект сметы контракта (приказ Минстроя России N 421/пр) ===

export const ESTIMATE_METHODS = ["resource", "index", "analog"] as const;

export const estimateMethodLabels: Record<
  (typeof ESTIMATE_METHODS)[number],
  string
> = {
  resource: "Ресурсный",
  index: "Базисно-индексный",
  analog: "По аналогии",
};

export const ESTIMATE_NORMATIVE_BASES = ["FER", "TER", "GESN"] as const;

export const estimateNormativeBaseLabels: Record<
  (typeof ESTIMATE_NORMATIVE_BASES)[number],
  string
> = {
  FER: "ФЕР — федеральные расценки",
  TER: "ТЕР — территориальные расценки",
  GESN: "ГЭСН — элементные нормы",
};

export const ContractEstimateSchema = z.object({
  method: z.enum(ESTIMATE_METHODS).default("index"),
  normativeBase: z.enum(ESTIMATE_NORMATIVE_BASES).default("FER"),
  // Уровень цен: «IV квартал 2026», «на 01.11.2026» — свободной строкой
  priceLevel: z.string().optional(),
  // Ссылка на акт в legalActs (421/пр)
  legalActId: idSchema(),

  overheadPercent: percent(100).default(0),
  profitPercent: percent(100).default(0),
  vatPercent: percent(100).default(20),

  status: z.enum(["draft", "approved"]).default("draft"),
  approvedAt: isoDate(),
  approvedBy: z.string().optional(),
});

export type ContractEstimate = z.infer<typeof ContractEstimateSchema>;

// === Проект календарного графика (приказ Минстроя России N 336/пр) ===

export const ScheduleStageSchema = z.object({
  id: idSchema(),
  name: z.string().trim().min(1, "Укажите наименование этапа"),
  startDate: isoDate(),
  endDate: isoDate(),
  amount: optionalMoney(),
});

export type ScheduleStage = z.infer<typeof ScheduleStageSchema>;

export const ContractScheduleSchema = z.object({
  // Общий срок выполнения работ — из него разворачиваются этапы
  plannedStart: isoDate(),
  plannedEnd: isoDate(),
  stages: z.array(ScheduleStageSchema).default([]),
  // Ссылка на акт в legalActs (336/пр)
  legalActId: idSchema(),
  status: z.enum(["draft", "approved"]).default("draft"),
  approvedAt: isoDate(),
  approvedBy: z.string().optional(),
});

export type ContractSchedule = z.infer<typeof ContractScheduleSchema>;

// === Дефектовка ===

export const DefectListSchema = z.object({
  id: idSchema(),

  organizationId: requiredId(
    "Дефектовка должна быть привязана к организации заказчика",
  ),
  authorEmployeeId: requiredId(
    "Дефектовка должна быть привязана к работнику-инициатору",
  ),
  authorName: optionalText(5, "Укажите ФИО инициатора"),
  structuralUnitId: idSchema(),
  structuralUnitName: optionalText(2, "Укажите подразделение инициатора"),

  // Связь с ООЗ и цепочкой закупки: наименование и ОКПД2 не дублируем
  objectDescriptionId: idSchema(),
  procurementId: idSchema(),
  purchasePlanId: idSchema(),
  positionId: idSchema(),
  // Снимок наименования для печати, если ООЗ ещё не заведено
  objectName: optionalText(3, "Укажите объект"),

  // Основание: дефектный акт (акт осмотра) — номер и дата строкой
  basis: z.string().max(500).optional(),

  items: z.array(DefectItemSchema).default([]),
  estimate: ContractEstimateSchema.default(emptyContractEstimate()),
  schedule: ContractScheduleSchema.default(emptyContractSchedule()),

  // Движение документа: черновик → направлено в КС → принято / возвращено
  status: DefectListStatusSchema.default("draft"),
  submittedAt: isoDate(),
  reviewedAt: isoDate(),
  reviewComment: z.string().optional(),
  taskId: idSchema(),

  createdAt: isoDate(),
  updatedAt: isoDate(),
});

export type DefectList = z.infer<typeof DefectListSchema>;
export type DefectListInput = z.input<typeof DefectListSchema>;

export const DefectListListSchema = z.array(DefectListSchema);

// Срок рассмотрения дефектовки в контрактной службе
export const DEFECT_LIST_REVIEW_DAYS = 5;

export function emptyContractEstimate(): ContractEstimate {
  return {
    method: "index",
    normativeBase: "FER",
    priceLevel: "",
    legalActId: undefined,
    overheadPercent: 0,
    profitPercent: 0,
    vatPercent: 20,
    status: "draft",
    approvedAt: "",
    approvedBy: "",
  };
}

export function emptyContractSchedule(): ContractSchedule {
  return {
    plannedStart: "",
    plannedEnd: "",
    stages: [],
    legalActId: undefined,
    status: "draft",
    approvedAt: "",
    approvedBy: "",
  };
}

/**
 * Приведение значений формы к полному блоку сметы. Поля процентов объявлены
 * через z.coerce, поэтому тип входа у них `unknown` — приводим осознанно.
 */
type PartialRecord<T> = Partial<Record<keyof T, unknown>>;

export const normalizeEstimate = (
  value?: PartialRecord<ContractEstimate> | null,
): ContractEstimate => ({
  method: (value?.method as ContractEstimate["method"]) ?? "index",
  normativeBase:
    (value?.normativeBase as ContractEstimate["normativeBase"]) ?? "FER",
  priceLevel: (value?.priceLevel as string | undefined) ?? "",
  legalActId: value?.legalActId as string | number | undefined,
  overheadPercent: Number(value?.overheadPercent ?? 0),
  profitPercent: Number(value?.profitPercent ?? 0),
  vatPercent: Number(value?.vatPercent ?? 20),
  status: (value?.status as ContractEstimate["status"]) ?? "draft",
  approvedAt: (value?.approvedAt as string | undefined) ?? "",
  approvedBy: (value?.approvedBy as string | undefined) ?? "",
});

export const normalizeSchedule = (
  value?: PartialRecord<ContractSchedule> | null,
): ContractSchedule => ({
  plannedStart: (value?.plannedStart as string | undefined) ?? "",
  plannedEnd: (value?.plannedEnd as string | undefined) ?? "",
  stages: (value?.stages as ScheduleStage[] | undefined) ?? [],
  legalActId: value?.legalActId as string | number | undefined,
  status: (value?.status as ContractSchedule["status"]) ?? "draft",
  approvedAt: (value?.approvedAt as string | undefined) ?? "",
  approvedBy: (value?.approvedBy as string | undefined) ?? "",
});

export interface DefectListAuthor {
  employeeId?: string | number;
  employeeName?: string;
  structuralUnitId?: string | number;
  structuralUnitName?: string;
}

export const emptyDefectList = (
  organizationId: string | number = "",
  author: DefectListAuthor = {},
): DefectList => ({
  organizationId,
  authorEmployeeId: author.employeeId ?? "",
  authorName: author.employeeName ?? "",
  structuralUnitId: author.structuralUnitId,
  structuralUnitName: author.structuralUnitName ?? "",
  objectDescriptionId: undefined,
  objectName: "",
  basis: "",
  items: [],
  estimate: emptyContractEstimate(),
  schedule: emptyContractSchedule(),
  status: "draft",
  submittedAt: "",
  reviewComment: "",
  createdAt: today(),
  updatedAt: today(),
});

// === Расчёты ===

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const parseAmount = (value: string | undefined): number => {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
};

// Сумма по позиции дефектовки: объём × цена за единицу
export const defectItemAmount = (item: DefectItem): number =>
  round2(parseAmount(item.quantity) * parseAmount(item.unitPrice));

// Прямые затраты — сумма позиций
export const defectDirectCost = (items: DefectItem[]): number =>
  round2(items.reduce((total, item) => total + defectItemAmount(item), 0));

export interface DefectSectionGroup {
  section: string;
  items: DefectItem[];
  directCost: number;
}

// Группировка позиций по разделам: из неё строятся и разделы сметы,
// и этапы календарного графика
export const groupDefectItemsBySection = (
  items: DefectItem[],
): DefectSectionGroup[] => {
  const groups = new Map<string, DefectItem[]>();

  items.forEach((item) => {
    const section = item.section?.trim() || DEFAULT_DEFECT_SECTION;
    groups.set(section, [...(groups.get(section) ?? []), item]);
  });

  return [...groups.entries()].map(([section, sectionItems]) => ({
    section,
    items: sectionItems,
    directCost: defectDirectCost(sectionItems),
  }));
};

export interface EstimateTotals {
  directCost: number;
  overhead: number;
  profit: number;
  subtotal: number;
  vat: number;
  total: number;
}

/**
 * Итоги проекта сметы контракта по 421/пр:
 * прямые затраты → накладные расходы → сметная прибыль → НДС.
 * Это упрощённая структура (без лимитированных затрат и индексов по видам
 * работ), достаточная для проекта сметы на этапе планирования.
 */
export const computeEstimateTotals = (
  list: Pick<DefectList, "items" | "estimate">,
): EstimateTotals => {
  const directCost = defectDirectCost(list.items);
  const overhead = round2(
    (directCost * Number(list.estimate.overheadPercent ?? 0)) / 100,
  );
  const profit = round2(
    ((directCost + overhead) * Number(list.estimate.profitPercent ?? 0)) / 100,
  );
  const subtotal = round2(directCost + overhead + profit);
  const vat = round2((subtotal * Number(list.estimate.vatPercent ?? 0)) / 100);

  return {
    directCost,
    overhead,
    profit,
    subtotal,
    vat,
    total: round2(subtotal + vat),
  };
};

// Итог календарного графика: сумма этапов
export const scheduleTotal = (stages: ScheduleStage[]): number =>
  round2(stages.reduce((total, stage) => total + parseAmount(stage.amount), 0));

// Расхождение графика со сметой: 0 — суммы сходятся
export const scheduleDifference = (
  list: Pick<DefectList, "items" | "estimate" | "schedule">,
): number =>
  round2(computeEstimateTotals(list).total - scheduleTotal(list.schedule.stages));

const dayMs = 86_400_000;

const toTime = (isoDateValue: string): number =>
  new Date(`${isoDateValue}T00:00:00`).getTime();

const toIso = (time: number): string =>
  new Date(time).toISOString().slice(0, 10);

/**
 * Проект календарного графика из дефектовки (методика 336/пр).
 *
 * Этапы = разделы дефектовки. Суммы распределяются пропорционально прямым
 * затратам раздела и в сумме дают итог сметы (последний этап забирает
 * округлительный остаток). Сроки делятся поровну на периоде выполнения работ.
 * Это черновик: человек правит даты и суммы, а система следит, чтобы итог
 * графика совпадал со сметой.
 */
export const buildScheduleStages = (
  list: Pick<DefectList, "items" | "estimate" | "schedule">,
): ScheduleStage[] => {
  const { plannedStart, plannedEnd } = list.schedule;
  const groups = groupDefectItemsBySection(list.items).filter(
    (group) => group.directCost > 0,
  );
  const totals = computeEstimateTotals(list);

  if (groups.length === 0 || totals.total <= 0) {
    return [];
  }

  const start = plannedStart ? toTime(plannedStart) : NaN;
  const end = plannedEnd ? toTime(plannedEnd) : NaN;
  const hasPeriod = !isNaN(start) && !isNaN(end) && end >= start;
  const span = hasPeriod ? Math.max(end - start, dayMs) : 0;
  const directTotal = groups.reduce(
    (sum, group) => sum + group.directCost,
    0,
  );

  let allocated = 0;

  return groups.map((group, index) => {
    const isLast = index === groups.length - 1;
    const amount = isLast
      ? round2(totals.total - allocated)
      : round2((totals.total * group.directCost) / directTotal);

    allocated = round2(allocated + amount);

    const stageStart = hasPeriod
      ? toIso(start + Math.floor((span * index) / groups.length))
      : "";
    const stageEnd = hasPeriod
      ? toIso(
          start +
            Math.floor((span * (index + 1)) / groups.length) -
            (index === groups.length - 1 ? 0 : dayMs),
        )
      : "";

    return {
      id: `stage-${index + 1}`,
      name: group.section,
      startDate: stageStart,
      endDate: stageEnd,
      amount: amount.toFixed(2),
    };
  });
};

// Править можно черновик и возвращённую дефектовку
export const isDefectListEditable = (
  list: Pick<DefectList, "status">,
): boolean => list.status === "draft" || list.status === "returned";

// Инициатор видит только свои дефектовки
export const defectListsOfEmployee = (
  lists: DefectList[],
  employeeId: string | number | undefined,
): DefectList[] =>
  employeeId === undefined || employeeId === ""
    ? []
    : lists.filter((list) => String(list.authorEmployeeId) === String(employeeId));

export const sortDefectLists = (lists: DefectList[]): DefectList[] =>
  [...lists].sort((first, second) =>
    String(second.createdAt ?? "").localeCompare(String(first.createdAt ?? "")),
  );

// Дата через N календарных дней — срок рассмотрения в КС
export const addDays = (isoDateValue: string, days: number): string => {
  const date = new Date(`${isoDateValue}T00:00:00`);

  if (isNaN(date.getTime())) {
    return isoDateValue;
  }

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
};
