import z from "zod";

/**
 * Календарные сроки и табельный учёт (п. 2.6 Типового положения).
 *
 * Отпуска, больничные и командировки влияют на выполнение задач:
 * — если у исполнителя период отпуска пересекается со сроком задачи,
 *   задача должна быть переназначена или срок сдвинут;
 * — табельный учёт фиксирует отсутствие и влияет на расчёт ЗП.
 */

export const LeaveTypeSchema = z.enum([
  "vacation",
  "sick_leave",
  "business_trip",
  "unpaid_leave",
  "maternity",
]);

export type LeaveType = z.infer<typeof LeaveTypeSchema>;

export const LeaveStatusSchema = z.enum([
  "scheduled",
  "approved",
  "ongoing",
  "completed",
  "cancelled",
]);

export type LeaveStatus = z.infer<typeof LeaveStatusSchema>;

export const LeaveSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  employeeId: z.union([z.string(), z.number()]),
  employeeName: z.string().optional(),
  type: LeaveTypeSchema,
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (value) => value === "" || !isNaN(new Date(value).getTime()),
      "Неверный формат даты начала",
    ),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (value) => value === "" || !isNaN(new Date(value).getTime()),
      "Неверный формат даты окончания",
    ),
  status: LeaveStatusSchema.default("scheduled"),
  daysCount: z.number().optional(),
  orderNumber: z.string().optional(),
  orderDate: z.string().optional(),
  comment: z.string().optional(),
  createdAt: z.string().optional(),
});

export type Leave = z.infer<typeof LeaveSchema>;

export const LeaveListSchema = z.array(LeaveSchema);

// Количество рабочих дней в периоде (без выходных)
export const businessDaysBetween = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

/**
 * Нерабочие праздничные дни по ст. 112 ТК РФ. Нужны, чтобы срок «в рабочих
 * днях» считался как его считает контрактная служба: 5 рабочих дней со дня
 * заключения договора в начале января — это не та дата, что в июле.
 *
 * Дни переноса (их Правительство утверждает ежегодно) здесь не зашиты — при
 * необходимости их передают отдельным списком в `extraHolidays`.
 */
export const RU_NON_WORKING_HOLIDAYS: string[] = [
  "01-01",
  "01-02",
  "01-03",
  "01-04",
  "01-05",
  "01-06",
  "01-07",
  "02-23",
  "03-08",
  "05-01",
  "05-09",
  "06-12",
  "11-04",
];

const toIsoDate = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
};

// Выходной или праздник — рабочего дня в этот день нет
export const isBusinessDay = (
  isoDate: string,
  extraHolidays: string[] = [],
): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;

  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);

  if (Number.isNaN(date.getTime())) return false;

  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;

  const monthDay = isoDate.slice(5);

  return (
    !RU_NON_WORKING_HOLIDAYS.includes(monthDay) &&
    !extraHolidays.includes(isoDate)
  );
};

// Прибавить рабочие дни: сам день события не считается, отсчёт со следующего
export const addBusinessDays = (
  startIsoDate: string,
  days: number,
  extraHolidays: string[] = [],
): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIsoDate)) return "";

  const cur = new Date(
    Number(startIsoDate.slice(0, 4)),
    Number(startIsoDate.slice(5, 7)) - 1,
    Number(startIsoDate.slice(8, 10)),
  );

  let added = 0;

  while (added < days) {
    cur.setDate(cur.getDate() + 1);
    if (isBusinessDay(toIsoDate(cur), extraHolidays)) added++;
  }

  return toIsoDate(cur);
};

// Сколько рабочих дней прошло после даты `from` по дату `to` включительно.
// Нужен для «просрочка — N рабочих дней»
export const businessDaysAfter = (
  fromIsoDate: string,
  toIsoDateValue: string,
  extraHolidays: string[] = [],
): number => {
  if (!fromIsoDate || !toIsoDateValue || toIsoDateValue <= fromIsoDate) {
    return 0;
  }

  let count = 0;
  const cur = new Date(
    Number(fromIsoDate.slice(0, 4)),
    Number(fromIsoDate.slice(5, 7)) - 1,
    Number(fromIsoDate.slice(8, 10)),
  );
  const last = new Date(
    Number(toIsoDateValue.slice(0, 4)),
    Number(toIsoDateValue.slice(5, 7)) - 1,
    Number(toIsoDateValue.slice(8, 10)),
  );

  // Считаем дни строго после `from` и по `to` включительно: `<=` добавляло
  // лишний рабочий день, и просрочка в интерфейсе была на день больше
  while (cur < last) {
    cur.setDate(cur.getDate() + 1);
    if (isBusinessDay(toIsoDate(cur), extraHolidays)) count++;
  }

  return count;
};

// Рабочих дней от сегодня до даты срока (отрицательное — срок прошёл)
export const businessDaysUntil = (
  dueDate: string,
  todayIsoDate: string,
  extraHolidays: string[] = [],
): number => {
  if (!dueDate || !todayIsoDate) return 0;

  if (dueDate >= todayIsoDate) {
    return businessDaysAfter(todayIsoDate, dueDate, extraHolidays);
  }

  return -businessDaysAfter(dueDate, todayIsoDate, extraHolidays);
};

// Пересекаются ли два диапазона дат
export const dateRangesOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean => {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as <= be && bs <= ae;
};

// Задачи, пересекающиеся с периодом отсутствия
export const overlappingTasks = (
  tasks: any[],
  employeeId: string | number,
  start: string,
  end: string,
): any[] => {
  return tasks.filter((task) => {
    if (String(task.assigneeId) !== String(employeeId)) return false;
    if (task.status === "completed") return false;
    if (!task.dueDate) return false;
    return dateRangesOverlap(start, end, task.dueDate, task.dueDate);
  });
};

// Перезапуск задачи: сдвиг dueDate на количество рабочих дней отсутствия
export const rescheduleTask = (
  task: any,
  absentDays: number,
): { dueDate: string | null; daysShift: number } => {
  if (!task.dueDate) return { dueDate: null, daysShift: 0 };
  const cur = new Date(task.dueDate);
  let added = 0;
  while (added < absentDays) {
    cur.setDate(cur.getDate() + 1);
    if (cur.getDay() !== 0 && cur.getDay() !== 6) added++;
  }
  return {
    dueDate: cur.toISOString().slice(0, 10),
    daysShift: absentDays,
  };
};

// Отсутствие работника на конкретную дату: утверждённый или активный период,
// в который попадает дата. Нужен постановке задачи — нельзя назначить работу
// человеку, который в этот день в отпуске или на больничном
export const isEmployeeAbsentOn = (
  leaves: Leave[],
  employeeId: string | number,
  date: string,
): Leave | undefined => {
  if (!date || employeeId === "" || employeeId === undefined) return undefined;

  return leaves.find(
    (leave) =>
      String(leave.employeeId) === String(employeeId) &&
      (leave.status === "approved" || leave.status === "ongoing") &&
      leave.startDate <= date &&
      date <= leave.endDate,
  );
};

// Создание пустой записи
export const emptyLeave = (organizationId: string | number = ""): Leave => ({
  organizationId,
  employeeId: "",
  employeeName: "",
  type: "vacation",
  startDate: "",
  endDate: "",
  status: "scheduled",
  daysCount: 0,
  orderNumber: "",
  orderDate: "",
  comment: "",
  createdAt: new Date().toISOString().slice(0, 10),
});
