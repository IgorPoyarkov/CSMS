/**
 * Добавляет сиды для утилиты "График отпусков" в db.json:
 *   1. Акт tk-rf в legalActs
 *   2. Коллекцию vacationSchedules (3 графика)
 *   3. Фактические отпуска 2027 в leaves (для проверки конфликтов)
 *
 * Запуск: node scripts/seed-vacation-schedule.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

// ── Сиды ────────────────────────────────────────────────────────────────────

/** Акт ТК РФ для страницы VacationSchedulePage */
const tkRfAct = {
  id: "tk-rf",
  shortName: "ТК РФ",
  fullName:
    "Трудовой кодекс Российской Федерации от 30.12.2001 № 197-ФЗ",
  actType: "federal-law",
  adoptedBy: "Государственная Дума",
  actNumber: "197-ФЗ",
  adoptedDate: "2001-12-30",
  effectiveDate: "2002-02-01",
  status: "active",
  scope: "",
  components: [
    "VacationSchedule",
    "DefectList",
    "ContractService",
    "PurchasePlan",
    "ProcurementProcessing",
    "ContractRegistry",
    "BidEvaluation",
  ],
  sourceUrl: "http://www.consultant.ru/document/cons_doc_LAW_34683/",
  lastCheckedDate: "2026-11-18",
  isVerified: true,
  notes: "",
};

/** График org1, 2027, черновик — содержит ошибки и предупреждения для демонстрации */
const scheduleOrg1_2027_draft = {
  id: 1,
  organizationId: 1,
  year: 2027,
  status: "draft",
  rows: [
    // Иванова — 28 дней (14+14), чистый, но sick_overlap с id 7
    {
      id: 1,
      employeeId: 6,
      employeeName: "Иванова Анна Сергеевна",
      position: "Начальник отдела закупок",
      structuralUnitName: "Отдел закупок",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-06-01",
          endDate: "2027-06-14",
          kind: "annual_main",
        },
        {
          id: 2,
          startDate: "2027-09-01",
          endDate: "2027-09-14",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
    // Петров — 30 дней: annual_days_exceeded + sick_overlap (id 8)
    {
      id: 2,
      employeeId: 7,
      employeeName: "Петров Сергей Николаевич",
      position: "Ведущий специалист по закупкам",
      structuralUnitName: "Отдел закупок",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-07-01",
          endDate: "2027-07-30",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
    // Сидорова — 10 дней: min_part_14 + annual_days_incomplete
    {
      id: 3,
      employeeId: 8,
      employeeName: "Сидорова Мария Ивановна",
      position: "Юрисконсульт",
      structuralUnitName: "Правовое управление",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-06-01",
          endDate: "2027-06-10",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
    // Кузнецова — 28 дней (14+14), чистый
    {
      id: 4,
      employeeId: 9,
      employeeName: "Кузнецова Ольга Петровна",
      position: "Главный бухгалтер",
      structuralUnitName: "Центральная бухгалтерия",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-06-01",
          endDate: "2027-06-14",
          kind: "annual_main",
        },
        {
          id: 2,
          startDate: "2027-12-01",
          endDate: "2027-12-14",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
    // Пояркова — 28 дней в августе: peak_month
    {
      id: 5,
      employeeId: 14,
      employeeName: "Пояркова София Игоревна",
      position: "Главный врач",
      structuralUnitName: "Руководство",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-08-01",
          endDate: "2027-08-14",
          kind: "annual_main",
        },
        {
          id: 2,
          startDate: "2027-08-15",
          endDate: "2027-08-28",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
    // Смирнова — 5 дней без сохранения ЗП без примечания: unpaid_without_note
    {
      id: 6,
      employeeId: 15,
      employeeName: "Смирнова Анна Викторовна",
      position: "Начальник отдела кадров",
      structuralUnitName: "Отдел кадров",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-05-01",
          endDate: "2027-05-05",
          kind: "unpaid",
        },
      ],
      unpaidLeaveDays: 5,
      notifiedAt: "",
      note: "",
    },
    // Фомин — 14 дней: trip_overlap с id 8 (командировка)
    {
      id: 7,
      employeeId: 16,
      employeeName: "Фомин Игорь Николаевич",
      position: "Экономист по планированию закупок",
      structuralUnitName: "Экономический отдел",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-10-01",
          endDate: "2027-10-14",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
    // Егорова — 28 дней (14+14), чистый
    {
      id: 8,
      employeeId: 17,
      employeeName: "Егорова Мария Петровна",
      position: "Заведующий хозяйством",
      structuralUnitName: "Хозяйственный отдел",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-06-01",
          endDate: "2027-06-14",
          kind: "annual_main",
        },
        {
          id: 2,
          startDate: "2027-11-01",
          endDate: "2027-11-14",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
  ],
  orderNumber: "",
  orderDate: "",
  approvedByName: "",
  approvedAt: "",
  note: "",
  createdAt: "2026-11-15",
};

/** График org1, 2026, утверждённый — проверяем fact_without_plan + approved */
const scheduleOrg1_2026_approved = {
  id: 2,
  organizationId: 1,
  year: 2026,
  status: "approved",
  rows: [
    // Кузнецова — 28 дней, чистый
    {
      id: 1,
      employeeId: 9,
      employeeName: "Кузнецова Ольга Петровна",
      position: "Главный бухгалтер",
      structuralUnitName: "Центральная бухгалтерия",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2026-06-01",
          endDate: "2026-06-14",
          kind: "annual_main",
        },
        {
          id: 2,
          startDate: "2026-12-01",
          endDate: "2026-12-14",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
    // Пояркова — 28 дней, чистый
    {
      id: 2,
      employeeId: 14,
      employeeName: "Пояркова София Игоревна",
      position: "Главный врач",
      structuralUnitName: "Руководство",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2026-07-01",
          endDate: "2026-07-14",
          kind: "annual_main",
        },
        {
          id: 2,
          startDate: "2026-12-15",
          endDate: "2026-12-28",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
    // Смирнова — 28 дней, чистый
    {
      id: 3,
      employeeId: 15,
      employeeName: "Смирнова Анна Викторовна",
      position: "Начальник отдела кадров",
      structuralUnitName: "Отдел кадров",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2026-08-01",
          endDate: "2026-08-14",
          kind: "annual_main",
        },
        {
          id: 2,
          startDate: "2026-12-21",
          endDate: "2026-12-31",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
  ],
  orderNumber: "Отп-001",
  orderDate: "2026-01-15",
  approvedByName: "Эпинцев Виталий Александрович",
  approvedAt: "2026-01-15",
  note: "",
  createdAt: "2025-12-20",
};

/** График org6 (Курскавтодор), 2027, черновик — 1 сотрудник (Говоров) */
const scheduleOrg6_2027_draft = {
  id: 3,
  organizationId: 6,
  year: 2027,
  status: "draft",
  rows: [
    {
      id: 1,
      employeeId: 41,
      employeeName: "Говоров Андрей Николаевич",
      position: "Начальник управления государственных закупок",
      structuralUnitName: "Управление государственных закупок",
      adoptionDate: "",
      parts: [
        {
          id: 1,
          startDate: "2027-06-01",
          endDate: "2027-06-14",
          kind: "annual_main",
        },
        {
          id: 2,
          startDate: "2027-12-01",
          endDate: "2027-12-14",
          kind: "annual_main",
        },
      ],
      unpaidLeaveDays: 0,
      notifiedAt: "",
      note: "",
    },
  ],
  orderNumber: "",
  orderDate: "",
  approvedByName: "",
  approvedAt: "",
  note: "",
  createdAt: "2026-11-16",
};

/** Фактические отпуска 2027 для проверки конфликтов */
const leaves2027 = [
  {
    id: 7,
    organizationId: 1,
    employeeId: 6,
    employeeName: "Иванова Анна Сергеевна",
    type: "sick_leave",
    startDate: "2027-06-10",
    endDate: "2027-06-20",
    status: "scheduled",
    daysCount: 10,
    orderNumber: "ЛН-2027/001",
    orderDate: "2027-06-10",
    comment: "Пересечение с ежегодным отпуском 01.06–14.06",
    createdAt: "2027-06-09",
  },
  {
    id: 8,
    organizationId: 1,
    employeeId: 7,
    employeeName: "Петров Сергей Николаевич",
    type: "sick_leave",
    startDate: "2027-07-10",
    endDate: "2027-07-25",
    status: "scheduled",
    daysCount: 14,
    orderNumber: "ЛН-2027/002",
    orderDate: "2027-07-10",
    comment: "Пересечение с ежегодным отпуском 01.07–30.07",
    createdAt: "2027-07-09",
  },
  {
    id: 9,
    organizationId: 1,
    employeeId: 16,
    employeeName: "Фомин Игорь Николаевич",
    type: "business_trip",
    startDate: "2027-10-05",
    endDate: "2027-10-20",
    status: "scheduled",
    daysCount: 2,
    orderNumber: "Ком-2027/003",
    orderDate: "2027-10-01",
    comment: "Командировка в Москву — пересечение с отпуском 01.10–14.10",
    createdAt: "2027-10-01",
  },
  {
    id: 10,
    organizationId: 1,
    employeeId: 36,
    employeeName: "Козлова Мария Дмитриевна",
    type: "vacation",
    startDate: "2027-03-14",
    endDate: "2027-03-25",
    status: "approved",
    daysCount: 10,
    orderNumber: "Отп-2027/004",
    orderDate: "2027-03-10",
    comment: "Отпуск без графика: план на июль, факт в марте",
    createdAt: "2027-03-10",
  },
];

// ── Основная логика ─────────────────────────────────────────────────────────

const db = JSON.parse(readFileSync("db.json", "utf-8"));

// 1. legalActs — добавляем ТК РФ
const tkExists = db.legalActs?.some((a) => a.id === "tk-rf");
if (tkExists) {
  console.log("✓ tk-rf уже есть в legalActs");
} else {
  // Вставляем после первого федерально-законодательного акта
  const lawIdx = db.legalActs.findIndex(
    (a) => a.actType === "federal-law",
  );
  if (lawIdx >= 0) {
    db.legalActs.splice(lawIdx, 0, tkRfAct);
  } else {
    db.legalActs.unshift(tkRfAct);
  }
  console.log("✓ Добавлен tk-rf в legalActs");
}

// 2. vacationSchedules — новая коллекция
db.vacationSchedules = [scheduleOrg1_2027_draft, scheduleOrg1_2026_approved, scheduleOrg6_2027_draft];
console.log("✓ Добавлена коллекция vacationSchedules (3 графика)");

// 3. leaves — добавляем 2027 факты
const existingLeafIds = new Set((db.leaves ?? []).map((l) => l.id));
let addedLeaves = 0;
for (const leaf of leaves2027) {
  if (existingLeafIds.has(leaf.id)) continue;
  if (!db.leaves) db.leaves = [];
  db.leaves.push(leaf);
  addedLeaves++;
}
console.log(`✓ Добавлено ${addedLeaves} записей leaves (2027)`);

writeFileSync("db.json", JSON.stringify(db, null, 2) + "\n", "utf-8");
console.log("✓ db.json обновлён");
