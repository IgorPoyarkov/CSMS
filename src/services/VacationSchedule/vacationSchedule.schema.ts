import { z } from "zod";
import type { Leave } from "../Calendar/calendar.schema";

/**
 * График отпусков — утилита кадрового планирования.
 *
 * Ст. 123 ТК РФ обязывает работодателя утверждать график отпусков не позднее
 * чем за две недели до наступления календарного года (на практике — до
 * 16 декабря) и знакомить с ним каждого работника под роспись не позднее чем
 * за две недели до начала отпуска. Структура документа повторяет унифициро-
 * ванную форму Т-2 (Постановление Госкомстата России от 05.01.2004 N 1):
 * реквизиты работника, отпуск без сохранения заработной платы и двенадцать
 * месячных граф с количеством календарных дней и датой начала.
 *
 * Для контрактной службы это не только кадровый документ. Сроки по 44-ФЗ
 * (размещение извещения, подписание контракта, запись в реестр) считаются
 * календарными и рабочими днями и не продлеваются из-за отсутствия
 * ответственного, поэтому график отпусков отвечает на три вопроса:
 * — кто из носителей функции выпадает из периода и когда;
 * — не «провален» ли месяц, когда в отпуске больше трети службы;
 * — у кого отпуск заканчивается в дни пика закупки.
 *
 * Фактические отсутствия живут в `leaves` (календарный учёт, п. 2.6 приказа
 * Минфина России N 158н): здесь с планом сверяется только тип «отпуск»,
 * больничный и командировка участвуют как конфликты.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

const requiredId = (message: string) =>
  z
    .union([z.string(), z.number()])
    .refine(
      (value) => value !== "" && value !== null && value !== undefined,
      message,
    );

const optionalText = (max: number) =>
  z.string().trim().max(max, "Слишком длинное значение").optional();

const optionalIsoDate = () =>
  z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
      "Неверный формат даты (ожидается ГГГГ-ММ-ДД)",
    )
    .optional();

// Дни отпуска — целые календарные дни (ст. 120 ТК РФ), поэтому строка из
// формы приводится к числу, а дробные значения отклоняются
const wholeDays = (max: number, overMessage: string) =>
  z.coerce
    .number({ message: "Укажите количество дней числом" })
    .int("Количество дней должно быть целым")
    .min(0, "Количество дней не может быть отрицательным")
    .max(max, overMessage);

// ─── Нормы, из которых считаются проверки ─────────────────────────────────

/** Продолжительность ежегодного оплачиваемого отпуска, кал. дней (ст. 115 ТК РФ) */
export const ANNUAL_LEAVE_DAYS = 28;

/** Минимальная длина одной из частей отпуска при разделении (ч. 2 ст. 125 ТК РФ) */
export const MIN_MAIN_PART_DAYS = 14;

/** Срок предупреждения работника о начале отпуска (ч. 3 ст. 123 ТК РФ) */
export const NOTICE_DAYS_BEFORE_LEAVE = 14;

/** Дата утверждения графика на следующий год — «не позднее чем за 2 недели» (ч. 1 ст. 123 ТК РФ) */
export const SCHEDULE_APPROVAL_DEADLINE_MONTH_DAY = "12-16";

/** Сколько дней отпуска без сохранения ЗП даёт ст. 128 ТК РФ по семейным обстоятельствам */
export const UNPAID_LEAVE_FAMILY_DAYS = 5;

/** Доля работников в одном месяце, после которой месяц считается «кадровым пиком» */
export const PEAK_MONTH_SHARE = 1 / 3;

// ─── Справочники ──────────────────────────────────────────────────────────

export const VACATION_SCHEDULE_STATUSES = ["draft", "approved"] as const;

export type VacationScheduleStatus =
  (typeof VACATION_SCHEDULE_STATUSES)[number];

export const vacationScheduleStatusLabels: Record<
  VacationScheduleStatus,
  string
> = {
  draft: "Черновик",
  approved: "Утверждён",
};

// Вид отпуска по графе 7 формы Т-2
export const VACATION_LEAVE_KINDS = [
  "annual_main",
  "annual_extra",
  "unpaid",
  "study",
  "maternity",
] as const;

export type VacationLeaveKind = (typeof VACATION_LEAVE_KINDS)[number];

export const vacationLeaveKindLabels: Record<VacationLeaveKind, string> = {
  annual_main: "Ежегодный оплачиваемый",
  annual_extra: "Ежегодный дополнительный оплачиваемый",
  unpaid: "Без сохранения заработной платы",
  study: "Учебный отпуск",
  maternity: "По беременности и родам, по уходу за ребёнком",
};

// Короткие подписи для ячеек месячной сетки и печати
export const vacationLeaveKindShortLabels: Record<VacationLeaveKind, string> = {
  annual_main: "Основной",
  annual_extra: "Доп.",
  unpaid: "Б/З",
  study: "Учебный",
  maternity: "Декрет",
};

export const vacationLeaveKindRules: Record<VacationLeaveKind, string> = {
  annual_main: "ст. 115 ТК РФ",
  annual_extra: "ст. 116-118 ТК РФ",
  unpaid: "ст. 128 ТК РФ",
  study: "ст. 173 ТК РФ",
  maternity: "ст. 255-256 ТК РФ",
};

// Оплачиваемые виды, которые суммируются с «двадцатью восемью днями»
const PAID_ANNUAL_KINDS: VacationLeaveKind[] = ["annual_main", "annual_extra"];

export const isPaidAnnualKind = (kind: VacationLeaveKind): boolean =>
  PAID_ANNUAL_KINDS.includes(kind);

export const MONTH_LABELS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

export const MONTH_SHORT_LABELS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
] as const;

// ─── Модель ───────────────────────────────────────────────────────────────

/** Одна часть отпуска: вид, количество календарных дней и дата начала */
export const VacationPartSchema = z.object({
  id: idSchema(),
  kind: z.enum(VACATION_LEAVE_KINDS).default("annual_main"),
  daysCount: wholeDays(
    120,
    "Больше 120 календарных дней — проверьте вид отпуска и основание",
  ),
  // Дата начала может оставаться неопределённой в черновике: часть отпуска
  // согласовывают позже, но без неё нельзя посчитать срок предупреждения
  startDate: optionalIsoDate(),
  // Отметка, что работника предупредили о начале отпуска (ч. 3 ст. 123 ТК РФ)
  notifiedAt: optionalIsoDate(),
});

export type VacationPart = z.infer<typeof VacationPartSchema>;

/** Строка графика — работник и его части отпуска (графы 3-18 формы Т-2) */
export const VacationRowSchema = z.object({
  id: idSchema(),
  // Ссылка на штатное расписание может отсутствовать: в график попадают
  // внешние совместители и уволенные, чьих записей в `employees` уже нет
  employeeId: idSchema(),
  employeeName: z
    .string()
    .trim()
    .min(1, "Укажите фамилию и инициалы работника"),
  position: optionalText(160),
  structuralUnitName: optionalText(160),
  // Графа 4 формы Т-2 — дата принятия на работу (от неё считается стаж для
  // права на отпуск в первом году, ст. 121-122 ТК РФ)
  adoptionDate: optionalIsoDate(),
  // Графа 5 формы Т-2 — количество календарных дней отпуска без сохранения
  // заработной платы (ст. 128 ТК РФ)
  unpaidLeaveDays: wholeDays(
    365,
    "Слишком большое количество дней без сохранения заработной платы",
  ).default(0),
  parts: z.array(VacationPartSchema).default([]),
  note: optionalText(300),
});

export type VacationRow = z.infer<typeof VacationRowSchema>;

/** Годовой график отпусков организации */
export const VacationScheduleSchema = z.object({
  id: idSchema(),
  organizationId: requiredId(
    "График отпусков должен быть привязан к организации",
  ),
  year: z.coerce
    .number({ message: "Укажите год числом" })
    .int("Год должен быть целым")
    .min(2000, "Неверный год")
    .max(2100, "Неверный год"),
  status: z.enum(VACATION_SCHEDULE_STATUSES).default("draft"),
  rows: z.array(VacationRowSchema).default([]),
  // Реквизиты приказа об утверждении графика
  orderNumber: optionalText(60),
  orderDate: optionalIsoDate(),
  approvedByEmployeeId: idSchema(),
  approvedByName: optionalText(160),
  approvedAt: optionalIsoDate(),
  note: optionalText(500),
  createdAt: optionalIsoDate(),
});

export type VacationSchedule = z.infer<typeof VacationScheduleSchema>;
export type VacationScheduleInput = z.input<typeof VacationScheduleSchema>;

export const VacationScheduleListSchema = z.array(VacationScheduleSchema);

// ─── Работа с датами ──────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

const parseIso = (value: string | undefined): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));

  return isNaN(date.getTime()) ? null : date;
};

const toIso = (date: Date): string => date.toISOString().slice(0, 10);

export const isoToday = (): string => toIso(new Date());

export const addIsoDays = (value: string, days: number): string => {
  const date = parseIso(value);
  if (!date) return value;

  return toIso(new Date(date.getTime() + days * DAY_MS));
};

export const isoDaysBetween = (from: string, to: string): number | null => {
  const start = parseIso(from);
  const end = parseIso(to);
  if (!start || !end) return null;

  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
};

/**
 * Дата окончания части отпуска. Отпуск считается календарными днями
 * (ст. 120 ТК РФ), нерабочие праздничные дни в его число не входят — они
 * выпадают из отпуска, но в утилите не размечаются: календарь праздников
 * живёт в `calendar.schema.ts` и применяется к срокам закупок.
 */
export const partEndDate = (part: VacationPart): string =>
  part.startDate ? addIsoDays(part.startDate, part.daysCount - 1) : "";

export const partPeriod = (
  part: VacationPart,
): { start: string; end: string } | null => {
  if (!part.startDate) return null;

  return { start: part.startDate, end: partEndDate(part) };
};

export const periodsOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean =>
  Boolean(aStart) && Boolean(bStart) && aStart <= bEnd && bStart <= aEnd;

export const partOverlapsPeriod = (
  part: VacationPart,
  start: string,
  end: string,
): boolean => {
  const period = partPeriod(part);
  if (!period) return false;

  return periodsOverlap(period.start, period.end, start, end);
};

/** Месяц (1-12), в котором начинается часть отпуска; 0 — дата не указана */
export const partMonth = (part: VacationPart): number => {
  const date = parseIso(part.startDate);

  return date ? date.getUTCMonth() + 1 : 0;
};

export const partsOfMonth = (row: VacationRow, month: number): VacationPart[] =>
  (row.parts ?? []).filter((part) => partMonth(part) === month);

// ─── Расчёты по строке ────────────────────────────────────────────────────

export const rowPaidAnnualDays = (row: VacationRow): number =>
  (row.parts ?? [])
    .filter((part) => isPaidAnnualKind(part.kind))
    .reduce((total, part) => total + Number(part.daysCount || 0), 0);

export const rowMainAnnualDays = (row: VacationRow): number =>
  (row.parts ?? [])
    .filter((part) => part.kind === "annual_main")
    .reduce((total, part) => total + Number(part.daysCount || 0), 0);

export const rowUnpaidDays = (row: VacationRow): number =>
  Number(row.unpaidLeaveDays || 0) +
  (row.parts ?? [])
    .filter((part) => part.kind === "unpaid")
    .reduce((total, part) => total + Number(part.daysCount || 0), 0);

export const rowTotalDays = (row: VacationRow): number =>
  (row.parts ?? []).reduce(
    (total, part) => total + Number(part.daysCount || 0),
    0,
  ) + Number(row.unpaidLeaveDays || 0);

/** Пары пересекающихся частей одной строки (нельзя быть в двух отпусках сразу) */
export const overlappingPartsOfRow = (
  row: VacationRow,
): [VacationPart, VacationPart][] => {
  const parts = (row.parts ?? []).filter((part) => Boolean(part.startDate));
  const pairs: [VacationPart, VacationPart][] = [];

  for (let index = 0; index < parts.length; index++) {
    for (let next = index + 1; next < parts.length; next++) {
      const first = parts[index] as VacationPart;
      const second = parts[next] as VacationPart;

      if (
        partOverlapsPeriod(
          first,
          (second.startDate as string) ?? "",
          partEndDate(second),
        )
      ) {
        pairs.push([first, second]);
      }
    }
  }

  return pairs;
};

/** Частей основного отпуска больше одной — отпуск разделён (ч. 1 ст. 125 ТК РФ) */
export const isAnnualLeaveSplit = (row: VacationRow): boolean =>
  (row.parts ?? []).filter((part) => part.kind === "annual_main").length > 1;

// ─── Построение графика ───────────────────────────────────────────────────

export const newVacationPart = (
  year: number,
  kind: VacationLeaveKind = "annual_main",
): VacationPart => ({
  id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  kind,
  daysCount: kind === "annual_main" ? ANNUAL_LEAVE_DAYS : MIN_MAIN_PART_DAYS,
  startDate: `${year}-07-01`,
  notifiedAt: "",
});

export const newVacationRow = (): VacationRow => ({
  id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  employeeId: "",
  employeeName: "",
  position: "",
  structuralUnitName: "",
  adoptionDate: "",
  unpaidLeaveDays: 0,
  parts: [],
  note: "",
});

// Работник штатки в том виде, который нужен строке графика. Тип описан
// локально, чтобы сервис планирования отпусков не зависел от StaffingTable.
export interface VacationStaffMember {
  id?: string | number;
  fullName: string;
  position?: string;
  structuralUnitName?: string;
  adoptionDate?: string;
}

export const vacationRowFromStaff = (
  member: VacationStaffMember,
): VacationRow => ({
  ...newVacationRow(),
  employeeId: member.id ?? "",
  employeeName: member.fullName,
  position: member.position ?? "",
  structuralUnitName: member.structuralUnitName ?? "",
  adoptionDate: member.adoptionDate ?? "",
});

/**
 * Строки по штатному расписанию: уже заполненные работники не дублируются,
 * новые добавляются пустыми — планировать даты отпуска человек будет сам.
 */
export const fillRowsFromStaff = (
  rows: VacationRow[],
  staff: VacationStaffMember[],
): VacationRow[] => {
  const known = new Set(
    rows
      .map((row) => String(row.employeeId ?? ""))
      .filter((value) => value !== ""),
  );
  const knownNames = new Set(
    rows.map((row) => row.employeeName.trim().toLowerCase()),
  );

  const added = staff
    .filter(
      (member) =>
        !(member.id !== undefined && known.has(String(member.id))) &&
        !knownNames.has(member.fullName.trim().toLowerCase()),
    )
    .map(vacationRowFromStaff);

  return [...rows, ...added];
};

export const emptyVacationSchedule = (
  organizationId: string | number,
  year: number,
): VacationSchedule => ({
  organizationId,
  year,
  status: "draft",
  rows: [],
  orderNumber: "",
  orderDate: "",
  approvedByName: "",
  approvedAt: "",
  note: "",
  createdAt: isoToday(),
});

/**
 * Рекомендуемая разбивка ежегодного отпуска на две части (ч. 2 ст. 125 ТК РФ:
 * хотя бы одна из частей — не менее 14 дней). Используется кнопкой
 * «Разбить пополам» в форме строки, а не применяется автоматически: даты
 * человек согласовывает с работником сам.
 */
export const splitAnnualLeave = (
  year: number,
  firstStart: string,
): VacationPart[] => [
  {
    id: `part-${Date.now()}-1`,
    kind: "annual_main",
    daysCount: ANNUAL_LEAVE_DAYS - MIN_MAIN_PART_DAYS,
    startDate: firstStart || `${year}-06-01`,
    notifiedAt: "",
  },
  {
    id: `part-${Date.now()}-2`,
    kind: "annual_main",
    daysCount: MIN_MAIN_PART_DAYS,
    startDate: `${year}-12-01`,
    notifiedAt: "",
  },
];

// ─── Сверка плана с фактом и сроки ────────────────────────────────────────

export interface VacationNoticeItem {
  row: VacationRow;
  part: VacationPart;
  startDate: string;
  endDate: string;
  /** Дата, до которой нужно вручить предупреждение (ч. 3 ст. 123 ТК РФ) */
  noticeDeadline: string;
  daysToStart: number;
  notified: boolean;
  isOverdue: boolean;
}

/**
 * Части отпуска, по которым подходит или просрочен срок предупреждения
 * (ч. 3 ст. 123 ТК РФ — не позднее чем за две недели до начала отпуска).
 * Horizons: ближайшие `horizonDays` и уже начавшиеся без отметки.
 */
export const vacationNoticeList = (
  schedule: VacationSchedule,
  today: string = isoToday(),
  horizonDays: number = NOTICE_DAYS_BEFORE_LEAVE,
): VacationNoticeItem[] => {
  const items: VacationNoticeItem[] = [];

  (schedule.rows ?? []).forEach((row) => {
    (row.parts ?? []).forEach((part) => {
      if (!part.startDate) return;

      const daysToStart = isoDaysBetween(today, part.startDate) ?? 0;
      if (daysToStart > horizonDays) return;

      items.push({
        row,
        part,
        startDate: part.startDate,
        endDate: partEndDate(part),
        noticeDeadline: addIsoDays(part.startDate, -NOTICE_DAYS_BEFORE_LEAVE),
        daysToStart,
        notified: Boolean(part.notifiedAt),
        isOverdue: !part.notifiedAt && daysToStart < NOTICE_DAYS_BEFORE_LEAVE,
      });
    });
  });

  return items.sort((first, second) =>
    String(first.startDate).localeCompare(String(second.startDate)),
  );
};

/** Работники штатки, которых нет в графике (ч. 2 ст. 123 — график на всех) */
export const staffWithoutRow = (
  schedule: VacationSchedule,
  staff: VacationStaffMember[],
): VacationStaffMember[] => {
  const covered = new Set(
    (schedule.rows ?? []).map((row) => String(row.employeeId ?? "")),
  );
  const coveredNames = new Set(
    (schedule.rows ?? []).map((row) => row.employeeName.trim().toLowerCase()),
  );

  return staff.filter(
    (member) =>
      !covered.has(String(member.id ?? "")) &&
      !coveredNames.has(member.fullName.trim().toLowerCase()),
  );
};

/** Сколько работников начинается отпуск в каждом месяце года — поиск «провала» */
export const monthLoad = (
  schedule: VacationSchedule,
): { month: number; label: string; employees: number; days: number }[] =>
  MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const rows = (schedule.rows ?? []).filter((row) =>
      partsOfMonth(row, month).some((part) => isPaidAnnualKind(part.kind)),
    );
    const days = rows.reduce(
      (total, row) =>
        total +
        partsOfMonth(row, month)
          .filter((part) => isPaidAnnualKind(part.kind))
          .reduce((sum, part) => sum + Number(part.daysCount || 0), 0),
      0,
    );

    return { month, label, employees: rows.length, days };
  });

// Типы отсутствий, которые конфликтуют с отпуском: больничный прерывает или
// переносит отпуск (ч. 1 ст. 124 ТК РФ), командировка с отпуском совпадать
// не может — работник уже исполняет поручение работодателя
const CONFLICTING_LEAVE_TYPES: Leave["type"][] = [
  "sick_leave",
  "business_trip",
];

const isVacationLikeLeave = (leave: Leave): boolean =>
  leave.type === "vacation" ||
  leave.type === "unpaid_leave" ||
  leave.type === "maternity";

// Статусы отсутствия, которые считаются состоявшимся или идущим
const REAL_LEAVE_STATUSES: Leave["status"][] = [
  "approved",
  "ongoing",
  "completed",
];

/**
 * Фактические отпуска, не покрытые планом, — признак переноса или отпуска
 * «вне графика» (ч. 2 ст. 123 ТК РФ: использование отпуска не планируется,
 * если перенос не согласован).
 */
export const unplannedVacations = (
  schedule: VacationSchedule,
  leaves: Leave[],
): { employeeName: string; startDate: string; endDate: string }[] => {
  const rowsByEmployee = new Map<string, VacationRow[]>();

  (schedule.rows ?? []).forEach((row) => {
    const key = String(row.employeeId ?? row.employeeName);
    rowsByEmployee.set(key, [...(rowsByEmployee.get(key) ?? []), row]);
  });

  return leaves
    .filter(
      (leave) =>
        isVacationLikeLeave(leave) &&
        REAL_LEAVE_STATUSES.includes(leave.status),
    )
    .filter((leave) => {
      const rows =
        rowsByEmployee.get(String(leave.employeeId)) ??
        rowsByEmployee.get(String(leave.employeeName ?? "")) ??
        [];

      return !rows.some((row) =>
        (row.parts ?? []).some((part) =>
          partOverlapsPeriod(part, leave.startDate, leave.endDate),
        ),
      );
    })
    .map((leave) => ({
      employeeName: String(leave.employeeName ?? ""),
      startDate: leave.startDate,
      endDate: leave.endDate,
    }));
};

/** Конфликты частей отпуска с больничными и командировками (`leaves`) */
export const leaveConflicts = (
  schedule: VacationSchedule,
  leaves: Leave[],
): {
  employeeName: string;
  leaveType: Leave["type"];
  leaveStart: string;
  leaveEnd: string;
  partStart: string;
  partEnd: string;
}[] => {
  const conflicts: {
    employeeName: string;
    leaveType: Leave["type"];
    leaveStart: string;
    leaveEnd: string;
    partStart: string;
    partEnd: string;
  }[] = [];

  (schedule.rows ?? []).forEach((row) => {
    const own = leaves.filter(
      (leave) =>
        CONFLICTING_LEAVE_TYPES.includes(leave.type) &&
        REAL_LEAVE_STATUSES.includes(leave.status) &&
        (String(leave.employeeId) === String(row.employeeId ?? "") ||
          String(leave.employeeName ?? "") === row.employeeName),
    );

    own.forEach((leave) => {
      (row.parts ?? []).forEach((part) => {
        if (!partOverlapsPeriod(part, leave.startDate, leave.endDate)) return;

        conflicts.push({
          employeeName: row.employeeName,
          leaveType: leave.type,
          leaveStart: leave.startDate,
          leaveEnd: leave.endDate,
          partStart: part.startDate ?? "",
          partEnd: partEndDate(part),
        });
      });
    });
  });

  return conflicts;
};

/** Крайний срок утверждения графика на год (ч. 1 ст. 123 ТК РФ) */
export const scheduleApprovalDeadline = (year: number): string =>
  `${year - 1}-${SCHEDULE_APPROVAL_DEADLINE_MONTH_DAY}`;

export interface ApprovalDeadlineInfo {
  deadline: string;
  daysLeft: number | null;
  isPast: boolean;
}

export const approvalDeadlineInfo = (
  year: number,
  today: string = isoToday(),
): ApprovalDeadlineInfo => {
  const deadline = scheduleApprovalDeadline(year);

  return {
    deadline,
    daysLeft: isoDaysBetween(today, deadline),
    isPast: today > deadline,
  };
};

// ─── Проверки графика ─────────────────────────────────────────────────────

export type VacationIssueSeverity = "error" | "warning";

export interface VacationIssue {
  code: string;
  severity: VacationIssueSeverity;
  /** Что не так и что сделать — текст для панели проверок и печати */
  message: string;
  /** Норма, из которой проверка — подпись в интерфейсе и ссылка в реестре актов */
  rule: string;
  rowId?: string | number;
}

export interface VacationValidationContext {
  /** Штатное расписание организации — проверяет, что график покрывает всех */
  staff?: VacationStaffMember[];
  /** Фактические отсутствия (`leaves`) — сверка плана с фактом */
  leaves?: Leave[];
  today?: string;
}

/**
 * Проверки графика отпусков. Ошибки блокируют утверждение, предупреждения
 * остаются видимыми и в утверждённом графике — они про сроки и риски,
 * которые возникают уже после утверждения.
 */
export const validateVacationSchedule = (
  schedule: VacationSchedule,
  context: VacationValidationContext = {},
): VacationIssue[] => {
  const issues: VacationIssue[] = [];
  const today = context.today ?? isoToday();
  const rows = schedule.rows ?? [];

  const push = (issue: VacationIssue) => issues.push(issue);

  if (rows.length === 0) {
    push({
      code: "no_rows",
      severity: "error",
      message:
        "В графике нет ни одной строки. Заполните график по штатному расписанию и укажите отпуска работников.",
      rule: "ч. 2 ст. 123 ТК РФ",
    });
  }

  // Один работник — одна строка: иначе итоги по дням считаются по частям
  const seenEmployees = new Map<string, string | number | undefined>();
  rows.forEach((row) => {
    const key = String(row.employeeId || row.employeeName.trim().toLowerCase());

    if (!key) return;

    const previous = seenEmployees.get(key);

    if (previous) {
      push({
        code: "duplicate_employee",
        severity: "error",
        message: `Работник «${row.employeeName}» внесён в график дважды — объедините части отпуска в одной строке.`,
        rule: "форма Т-2, графы 3-5",
        rowId: row.id,
      });
    } else {
      seenEmployees.set(key, row.id ?? "");
    }
  });

  rows.forEach((row) => {
    const mainDays = rowMainAnnualDays(row);
    const paidDays = rowPaidAnnualDays(row);

    if (mainDays > ANNUAL_LEAVE_DAYS) {
      push({
        code: "annual_days_exceeded",
        severity: "error",
        message: `«${row.employeeName}»: ежегодного оплачиваемого отпуска запланировано ${mainDays} кал. дней — больше ${ANNUAL_LEAVE_DAYS}. Уточните вид отпуска: дополнительные дни проходят как «Ежегодный дополнительный».`,
        rule: "ст. 115 ТК РФ",
        rowId: row.id,
      });
    }

    if (paidDays > ANNUAL_LEAVE_DAYS && mainDays <= ANNUAL_LEAVE_DAYS) {
      push({
        code: "extra_days_exceeded",
        severity: "warning",
        message: `«${row.employeeName}»: основной и дополнительный отпуска вместе ${paidDays} кал. дней. Проверьте основания дополнительных дней и корректность графика при переходе отпуска на следующий год.`,
        rule: "ст. 115, 116-118 ТК РФ",
        rowId: row.id,
      });
    }

    if (mainDays > 0 && mainDays < ANNUAL_LEAVE_DAYS) {
      push({
        code: "annual_days_incomplete",
        severity: "warning",
        message: `«${row.employeeName}»: запланировано ${mainDays} из ${ANNUAL_LEAVE_DAYS} календарных дней ежегодного отпуска. Неиспользованные дни переносятся на следующий год или заменяются компенсацией (ст. 126 ТК РФ).`,
        rule: "ст. 115, 124 ТК РФ",
        rowId: row.id,
      });
    }

    if (mainDays === 0 && paidDays === 0) {
      push({
        code: "no_annual_leave",
        severity: "warning",
        message: `«${row.employeeName}»: в году графика нет ни одного дня ежегодного отпуска. Если право на отпуск ещё не наступило (стаж менее шести месяцев, ст. 122 ТК РФ) — укажите это в примечании строки.`,
        rule: "ст. 122 ТК РФ",
        rowId: row.id,
      });
    }

    if (
      rowUnpaidDays(row) > 0 &&
      rowUnpaidDays(row) <= UNPAID_LEAVE_FAMILY_DAYS + 2 &&
      (row.parts ?? []).every((part) => part.kind !== "unpaid") &&
      !row.note
    ) {
      push({
        code: "unpaid_without_note",
        severity: "warning",
        message: `«${row.employeeName}»: в графике ${rowUnpaidDays(
          row,
        )} кал. дней без сохранения заработной платы без примечания — укажите основание (ст. 128 ТК РФ: до 5 календарных дней по семейным обстоятельствам, отдельные категории — без ограничения).`,
        rule: "ст. 128 ТК РФ",
        rowId: row.id,
      });
    }

    // Разделение отпуска: хотя бы одна часть — не менее 14 календарных дней
    const mainParts = (row.parts ?? []).filter(
      (part) => part.kind === "annual_main",
    );

    if (
      mainParts.length > 1 &&
      !mainParts.some((part) => Number(part.daysCount) >= MIN_MAIN_PART_DAYS)
    ) {
      push({
        code: "min_part_14",
        severity: "error",
        message: `«${row.employeeName}»: ежегодный отпуск разбит на части, но ни одна из них не достигает ${MIN_MAIN_PART_DAYS} календарных дней. Разделение допускается, только если одна из частей не менее ${MIN_MAIN_PART_DAYS} дней.`,
        rule: "ч. 2 ст. 125 ТК РФ",
        rowId: row.id,
      });
    }

    overlappingPartsOfRow(row).forEach(([first, second]) => {
      push({
        code: "parts_overlap",
        severity: "error",
        message: `«${row.employeeName}»: части отпуска с ${first.startDate} и ${second.startDate} пересекаются. Работник не может быть в двух отпусках одновременно.`,
        rule: "ст. 123 ТК РФ",
        rowId: row.id,
      });
    });

    (row.parts ?? []).forEach((part) => {
      if (!part.startDate) {
        push({
          code: "part_without_date",
          severity: "error",
          message: `«${row.employeeName}»: у части отпуска (${vacationLeaveKindShortLabels[part.kind]}, ${part.daysCount} кал. дней) не указана дата начала — без неё нельзя рассчитать срок предупреждения и проверить доступность работника.`,
          rule: "ч. 3 ст. 123 ТК РФ",
          rowId: row.id,
        });

        return;
      }

      if (Number(part.startDate.slice(0, 4)) !== Number(schedule.year)) {
        push({
          code: "part_out_of_year",
          severity: "warning",
          message: `«${row.employeeName}»: отпуск начинается ${part.startDate} — вне года графика (${schedule.year}). Переходящий отпуск допустим, но в графике следующего года его нужно отразить отдельно.`,
          rule: "ч. 1 ст. 123 ТК РФ",
          rowId: row.id,
        });
      }

      const daysToStart = isoDaysBetween(today, part.startDate) ?? 0;

      if (!part.notifiedAt && daysToStart < NOTICE_DAYS_BEFORE_LEAVE) {
        push({
          code: "notice_missing",
          severity: "warning",
          message: `«${row.employeeName}»: отпуск с ${part.startDate} — предупреждение нужно было вручить не позднее ${addIsoDays(
            part.startDate,
            -NOTICE_DAYS_BEFORE_LEAVE,
          )}. Отметьте вручение или перенесите отпуск по согласованию сторон.`,
          rule: "ч. 3 ст. 123 ТК РФ",
          rowId: row.id,
        });
      }
    });
  });

  // Покрытие штатного расписания
  if (context.staff && context.staff.length > 0) {
    const missing = staffWithoutRow(schedule, context.staff);

    if (missing.length > 0) {
      push({
        code: "staff_not_covered",
        severity: "warning",
        message: `В графике нет ${missing.length} из ${
          context.staff.length
        } работников штатного расписания: ${missing
          .slice(0, 5)
          .map((member) => member.fullName)
          .join(", ")}${missing.length > 5 ? " и др." : ""}.`,
        rule: "ч. 2 ст. 123 ТК РФ",
      });
    }
  }

  // «Провал» месяца: в отпуске больше трети listed работников — в этот период
  // сроки по 44-ФЗ рискуют остаться без ответственного
  const load = monthLoad(schedule);
  const rowsCount = rows.length;

  if (rowsCount > 2) {
    load.forEach((month) => {
      if (month.employees / rowsCount > PEAK_MONTH_SHARE) {
        push({
          code: "peak_month",
          severity: "warning",
          message: `В ${month.label.toLowerCase()} в отпуске ${month.employees} из ${rowsCount} работников графика — больше трети. Проверьте, кто закроет функции этого периода: сроки по 44-ФЗ на отсутствие ответственного не продлеваются.`,
          rule: "ст. 123 ТК РФ, п. 2.6 приказа N 158н",
        });
      }
    });
  }

  // Сверка с фактическими отсутствиями
  const leaves = context.leaves ?? [];

  if (leaves.length > 0) {
    leaveConflicts(schedule, leaves).forEach((conflict) => {
      push({
        code:
          conflict.leaveType === "sick_leave" ? "sick_overlap" : "trip_overlap",
        severity: "warning",
        message:
          conflict.leaveType === "sick_leave"
            ? `«${conflict.employeeName}»: отпуск с ${conflict.partStart} пересекается с больничным (${conflict.leaveStart} — ${conflict.leaveEnd}). Дни болезни за счёт отпуска не идут: отпуск продлевается или переносится.`
            : `«${conflict.employeeName}»: отпуск с ${conflict.partStart} пересекается с командировкой (${conflict.leaveStart} — ${conflict.leaveEnd}). Отпуск и командировка в один период не предоставляются.`,
        rule:
          conflict.leaveType === "sick_leave"
            ? "ч. 1 ст. 124 ТК РФ"
            : "ст. 123 ТК РФ",
      });
    });

    unplannedVacations(schedule, leaves).forEach((fact) => {
      push({
        code: "fact_without_plan",
        severity: "warning",
        message: `${fact.employeeName || "Работник"}: отпуск ${fact.startDate} — ${fact.endDate} зафиксирован в учёте отсутствий, но в графике такой части нет — оформите перенос отпуска по согласованию сторон.`,
        rule: "ч. 2 ст. 123 ТК РФ",
      });
    });
  }

  // Сроки утверждения
  const deadline = approvalDeadlineInfo(Number(schedule.year), today);

  if (schedule.status === "draft" && deadline.isPast) {
    push({
      code: "approval_overdue",
      severity: "warning",
      message: `График на ${schedule.year} год не утверждён: по норме это нужно было сделать не позднее ${deadline.deadline}. Утвердите график или укажите причину задержки в примечании.`,
      rule: "ч. 1 ст. 123 ТК РФ",
    });
  }

  if (schedule.status === "approved" && !schedule.orderNumber) {
    push({
      code: "approved_without_order",
      severity: "warning",
      message:
        "График отмечен как утверждённый, но реквизиты приказа не заполнены — укажите номер и дату приказа об утверждении.",
      rule: "ч. 1 ст. 123 ТК РФ",
    });
  }

  return issues;
};

/** Утверждать график можно только без ошибок (предупреждения не блокируют) */
export const blockingVacationIssues = (
  issues: VacationIssue[],
): VacationIssue[] => issues.filter((issue) => issue.severity === "error");

export const isVacationScheduleEditable = (
  schedule: Pick<VacationSchedule, "status">,
): boolean => schedule.status === "draft";

/** Итоги графика для панели над таблицей */
export interface VacationSummary {
  employees: number;
  annualDays: number;
  unpaidDays: number;
  parts: number;
  withoutLeave: number;
  notifiedParts: number;
  datedParts: number;
}

export const vacationSummary = (
  schedule: VacationSchedule,
): VacationSummary => {
  const rows = schedule.rows ?? [];
  const parts = rows.flatMap((row) => row.parts ?? []);

  return {
    employees: rows.length,
    annualDays: rows.reduce((total, row) => total + rowPaidAnnualDays(row), 0),
    unpaidDays: rows.reduce((total, row) => total + rowUnpaidDays(row), 0),
    parts: parts.length,
    withoutLeave: rows.filter((row) => rowPaidAnnualDays(row) === 0).length,
    notifiedParts: parts.filter((part) => Boolean(part.notifiedAt)).length,
    datedParts: parts.filter((part) => Boolean(part.startDate)).length,
  };
};

/** Инициалы для плотной сетки: «Иванова А. С.» (в строке графы храним полное ФИО) */
export const initialsName = (fullName: string): string => {
  const [surname, ...rest] = fullName.trim().split(/\s+/);
  if (!surname) return fullName;

  const initials = rest
    .filter(Boolean)
    .map((part) => `${(part as string).charAt(0).toUpperCase()}.`)
    .join(" ");

  return initials ? `${surname} ${initials}` : surname;
};
