import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import {
  useFetchOrganizationEmployees,
  useFetchStructuralUnits,
} from "../../services/StaffingTable/StaffingTable.api";
import { useOrganizationLeaves } from "../../services/Calendar/calendar.api";
import { useLegalActs } from "../../services/LegalAct/legalAct.api";
import { formatLegalAct } from "../../services/LegalAct/legalAct.schema";
import {
  useCreateVacationSchedule,
  useDeleteVacationSchedule,
  useUpdateVacationSchedule,
  useVacationSchedule,
} from "../../services/VacationSchedule/vacationSchedule.api";
import {
  ANNUAL_LEAVE_DAYS,
  MONTH_LABELS,
  MONTH_SHORT_LABELS,
  NOTICE_DAYS_BEFORE_LEAVE,
  approvalDeadlineInfo,
  emptyVacationSchedule,
  fillRowsFromStaff,
  initialsName,
  isPaidAnnualKind,
  isVacationScheduleEditable,
  isoToday,
  leaveConflicts,
  partEndDate,
  partsOfMonth,
  rowPaidAnnualDays,
  rowTotalDays,
  rowUnpaidDays,
  staffWithoutRow,
  vacationLeaveKindShortLabels,
  vacationNoticeList,
  vacationScheduleStatusLabels,
  vacationSummary,
  validateVacationSchedule,
  type VacationRow,
  type VacationSchedule,
  type VacationStaffMember,
} from "../../services/VacationSchedule/vacationSchedule.schema";
import {
  buildVacationNoticeText,
  downloadVacationScheduleCsv,
  exportVacationScheduleToDocx,
} from "../../services/VacationSchedule/vacationScheduleExport";
import VacationRowModal from "./VacationRowModal";
import styles from "./VacationSchedulePage.module.scss";
import Select from "../UI/Select";

/**
 * «График отпусков» — утилита планирования отсутствия работников.
 *
 * Ст. 123 ТК РФ требует утверждать график не позднее чем за две недели до
 * начала календарного года (на практике — до 16 декабря) и предупреждать
 * каждого работника о начале отпуска минимум за две недели. Экран строит
 * годовой график по форме Т-2 (Постановление Госкомстата России от
 * 05.01.2004 N 1), проверяет его по ст. 115, 122-126 и 128 ТК РФ и выгружает
 * в .docx и .csv.
 *
 * Для контрактной службы это ещё и контроль доступности: сроки по 44-ФЗ
 * считаются рабочими днями и на отсутствие ответственного не
 * приостанавливаются, поэтому «проваленный» месяц отпуска — риск для всей
 * цепочки закупки.
 */

const today = (): string => isoToday();

// График на следующий год составляют зимой: с ноября показываем будущий год,
// иначе у утилиты полгода не было бы рабочего объекта
const defaultYear = (): number => {
  const now = new Date();

  return now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
};

export default function VacationSchedulePage() {
  const { bem, formatDate, fullName } = useUtils();
  const block = bem(styles, "vacation-schedule");

  const { organization, employee, isHead } = useMyContractRole();
  const orgId = organization?.id;

  const [year, setYear] = useState<number>(defaultYear());
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  // undefined — модалка закрыта, null — новая строка, объект — правка строки
  const [modalRow, setModalRow] = useState<VacationRow | null | undefined>(
    undefined,
  );
  const [actionError, setActionError] = useState("");
  const [noticeText, setNoticeText] = useState("");

  const { data: schedule, isLoading } = useVacationSchedule(orgId, year);
  const { data: staffEmployees = [] } = useFetchOrganizationEmployees(orgId);
  const { data: units = [] } = useFetchStructuralUnits(orgId);
  const { data: leaves = [] } = useOrganizationLeaves(orgId);
  const { data: acts = [] } = useLegalActs();

  const createSchedule = useCreateVacationSchedule();
  const updateSchedule = useUpdateVacationSchedule();
  const deleteSchedule = useDeleteVacationSchedule();

  const employeeId = employee?.id;
  // Утилитой может пользоваться любой работник организации: заполняют строки,
  // проверяют расхождения с фактом и готовят к утверждению. Сам документ
  // утверждает руководитель организации по ч. 3 ст. 123 ТК РФ.
  const canEdit = Boolean(employeeId);
  const canApprove = Boolean(employeeId);

  // Штатное расписание — источник строк графика и проверки охвата
  const staff = useMemo<VacationStaffMember[]>(
    () =>
      staffEmployees
        .map((person) => ({
          id: person.id,
          fullName: fullName(person.employee ?? {}),
          position: person.position,
          structuralUnitName:
            person.structuralUnit?.name ??
            units.find(
              (unit) => String(unit.id) === String(person.structuralUnitId),
            )?.name,
          adoptionDate: person.admissionDate,
        }))
        .filter((member) => Boolean(member.fullName)),
    [staffEmployees, units, fullName],
  );

  const unitNames = useMemo(() => {
    const names = new Set<string>();

    units.forEach((unit) => unit.name && names.add(unit.name));
    (schedule?.rows ?? []).forEach((row) =>
      row.structuralUnitName ? names.add(row.structuralUnitName) : null,
    );

    return [...names].sort((first, second) =>
      first.localeCompare(second, "ru"),
    );
  }, [units, schedule]);

  const issues = useMemo(
    () =>
      schedule
        ? validateVacationSchedule(schedule, { staff, leaves, today: today() })
        : [],
    [schedule, staff, leaves],
  );

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  const summary = vacationSummary(
    schedule ?? emptyVacationSchedule(orgId ?? "", year),
  );

  const notices = useMemo(
    () => (schedule ? vacationNoticeList(schedule, today()) : []),
    [schedule],
  );

  const conflicts = useMemo(
    () => (schedule ? leaveConflicts(schedule, leaves) : []),
    [schedule, leaves],
  );

  const missingStaff = useMemo(
    () => (schedule ? staffWithoutRow(schedule, staff) : []),
    [schedule, staff],
  );

  const deadline = approvalDeadlineInfo(year, today());
  const editable = schedule ? isVacationScheduleEditable(schedule) : false;

  const visibleRows = (schedule?.rows ?? []).filter((row) => {
    const matchesSearch =
      !search ||
      row.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      (row.position ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesUnit =
      !unitFilter || (row.structuralUnitName ?? "") === unitFilter;

    return matchesSearch && matchesUnit;
  });

  // ─── Действия ─────────────────────────────────────────────────────────

  const handleCreate = () => {
    if (!orgId) {
      setActionError(
        "Организация не определена — войдите учётной записью заказчика.",
      );

      return;
    }

    setActionError("");

    createSchedule.mutate(
      {
        ...emptyVacationSchedule(orgId, year),
        rows: fillRowsFromStaff([], staff),
      },
      {
        onError: () =>
          setActionError(
            "График не создан. Если коллекция заведена впервые — перезапустите json-server.",
          ),
      },
    );
  };

  const saveRows = (rows: VacationRow[]) => {
    if (!schedule?.id) return;

    setActionError("");
    updateSchedule.mutate(
      { id: schedule.id, rows },
      { onError: () => setActionError("Строки графика не сохранены.") },
    );
  };

  const handleFillFromStaff = () => {
    if (!schedule) return;

    const rows = fillRowsFromStaff(schedule.rows ?? [], staff);

    if (rows.length === (schedule.rows ?? []).length) {
      setActionError("Все работники штатного расписания уже внесены в график.");

      return;
    }

    saveRows(rows);
  };

  const handleSaveRow = (row: VacationRow) => {
    const rows = schedule?.rows ?? [];
    const exists = rows.some((item) => String(item.id) === String(row.id));

    saveRows(
      exists
        ? rows.map((item) => (String(item.id) === String(row.id) ? row : item))
        : [...rows, row],
    );
    setModalRow(undefined);
  };

  const handleDeleteRow = (row: VacationRow) => {
    if (
      !window.confirm(
        `Убрать «${row.employeeName}» из графика на ${year} год? Части отпуска этой строки будут удалены.`,
      )
    ) {
      return;
    }

    saveRows((schedule?.rows ?? []).filter((item) => item.id !== row.id));
  };

  const handleApprove = () => {
    if (!schedule?.id) return;

    if (errors.length > 0) {
      setActionError(
        `График не утверждён: сначала устраните ошибки (${errors.length}). Предупреждения утверждению не мешают.`,
      );

      return;
    }

    setActionError("");
    updateSchedule.mutate({
      id: schedule.id,
      status: "approved",
      approvedAt: today(),
      ...(employeeId !== undefined && employeeId !== ""
        ? { approvedByEmployeeId: employeeId }
        : {}),
      approvedByName: fullName(employee?.employee ?? {}),
    });
  };

  const handleRevoke = () => {
    if (!schedule?.id) return;

    updateSchedule.mutate({
      id: schedule.id,
      status: "draft",
      approvedAt: "",
      approvedByName: "",
    });
  };

  const handleOrderChange = (
    field: "orderNumber" | "orderDate",
    value: string,
  ) => {
    if (!schedule?.id) return;

    updateSchedule.mutate({ id: schedule.id, [field]: value });
  };

  const handleDeleteSchedule = () => {
    if (!schedule?.id) return;

    if (
      !window.confirm(
        `Удалить график отпусков на ${year} год вместе со всеми строками? Действие необратимо.`,
      )
    ) {
      return;
    }

    deleteSchedule.mutate(schedule.id);
  };

  const handleMarkNotified = (row: VacationRow, partId: string | number) => {
    const rows = (schedule?.rows ?? []).map((item) =>
      String(item.id) !== String(row.id)
        ? item
        : {
            ...item,
            parts: (item.parts ?? []).map((part) =>
              String(part.id) === String(partId)
                ? { ...part, notifiedAt: today() }
                : part,
            ),
          },
    );

    saveRows(rows);
  };

  const handleNoticeText = (row: VacationRow, partId: string | number) => {
    if (!schedule) return;

    const part = (row.parts ?? []).find(
      (item) => String(item.id) === String(partId),
    );
    if (!part) return;

    setNoticeText(
      buildVacationNoticeText(
        {
          schedule,
          organizationName: organization?.shortName || organization?.fullName,
        },
        row,
        part,
      ),
    );
  };

  const exportContext = {
    schedule: (schedule ??
      emptyVacationSchedule(orgId ?? "", year)) as VacationSchedule,
    organizationName: organization?.shortName || organization?.fullName,
    organizationHeadName: schedule?.approvedByName,
  };

  // ─── Разметка ─────────────────────────────────────────────────────────

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>График отпусков</h1>
          <p className={block("subtitle")}>
            Годовой график по форме Т-2: {ANNUAL_LEAVE_DAYS} календарных дней
            ежегодного отпуска (ст. 115 ТК РФ), при разделении на части одна из
            них — не менее 14 дней (ч. 2 ст. 125 ТК РФ), дни без сохранения
            заработной платы отдельной графой (ст. 128 ТК РФ), предупреждение
            работника — за {NOTICE_DAYS_BEFORE_LEAVE} дней (ч. 3 ст. 123 ТК РФ).
            Утверждается не позднее {deadline.deadline} — за две недели до
            начала года.
          </p>
        </div>

        <div className={block("header-side")}>
          <div className={block("year")}>
            <button
              type="button"
              className={block("year-btn")}
              onClick={() => setYear((value) => value - 1)}
              aria-label="Предыдущий год"
            >
              ‹
            </button>
            <span className={block("year-value")}>{year}</span>
            <button
              type="button"
              className={block("year-btn")}
              onClick={() => setYear((value) => value + 1)}
              aria-label="Следующий год"
            >
              ›
            </button>
          </div>

          {schedule && (
            <span className={block("status", [schedule.status])}>
              {vacationScheduleStatusLabels[schedule.status]}
            </span>
          )}

          {!canEdit && (
            <span className={block("readonly")}>
              {employeeId
                ? "Вы не входите в контрактную службу — график только для просмотра"
                : "Войдите учётной записью работника организации"}
            </span>
          )}
        </div>
      </header>

      {actionError && <p className={block("alert")}>{actionError}</p>}

      {isLoading && <p className={block("empty")}>Загрузка графика…</p>}

      {!isLoading && !schedule && (
        <section className={block("create")}>
          <h2 className={block("create-title")}>
            Графика отпусков на {year} год нет
          </h2>
          <p className={block("create-hint")}>
            График заводится один раз на год: строки можно перенести из штатного
            расписания, а даты отпусков согласовать с работниками позже. Крайний
            срок утверждения — {deadline.deadline}
            {deadline.daysLeft !== null && !deadline.isPast
              ? ` (осталось ${deadline.daysLeft} дн.)`
              : ""}
            .
          </p>
          <button
            type="button"
            className={block("primary")}
            disabled={!orgId || !canEdit || createSchedule.isPending}
            title={
              canEdit
                ? undefined
                : "Создать график может работник контрактной службы"
            }
            onClick={handleCreate}
          >
            {createSchedule.isPending
              ? "Создание…"
              : `Создать график и внести ${staff.length} работников штатки`}
          </button>
        </section>
      )}

      {schedule && (
        <>
          <section className={block("card")}>
            <div className={block("summary")}>
              <div className={block("stat")}>
                <span className={block("stat-label")}>
                  Работников в графике
                </span>
                <span className={block("stat-value")}>{summary.employees}</span>
              </div>
              <div className={block("stat")}>
                <span className={block("stat-label")}>Оплачиваемых дней</span>
                <span className={block("stat-value")}>
                  {summary.annualDays}
                </span>
              </div>
              <div className={block("stat")}>
                <span className={block("stat-label")}>
                  Дней без сохранения ЗП
                </span>
                <span className={block("stat-value")}>
                  {summary.unpaidDays}
                </span>
              </div>
              <div className={block("stat")}>
                <span className={block("stat-label")}>
                  Без запланированного отпуска
                </span>
                <span
                  className={block("stat-value", [
                    summary.withoutLeave > 0 ? "warn" : "",
                  ])}
                >
                  {summary.withoutLeave}
                </span>
              </div>
              <div className={block("stat")}>
                <span className={block("stat-label")}>
                  Предупреждений вручено
                </span>
                <span className={block("stat-value")}>
                  {summary.notifiedParts} / {summary.datedParts}
                </span>
              </div>
            </div>

            <div className={block("toolbar")}>
              <input
                className={block("search")}
                type="search"
                placeholder="Поиск по ФИО или должности"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Поиск по графику"
              />

              <Select
                className={block("select")}
                value={unitFilter}
                onChange={(event) => setUnitFilter(event.target.value)}
                aria-label="Фильтр по подразделению"
              >
                <option value="">Все подразделения</option>
                {unitNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>

              <div className={block("toolbar-actions")}>
                {canEdit && editable && (
                  <>
                    <button
                      type="button"
                      className={block("action", ["primary"])}
                      onClick={() => setModalRow(null)}
                    >
                      + Работник
                    </button>
                    <button
                      type="button"
                      className={block("action")}
                      onClick={handleFillFromStaff}
                      disabled={updateSchedule.isPending}
                      title="Добавляет работников штатки, которых ещё нет в графике"
                    >
                      Заполнить по штатке
                    </button>
                  </>
                )}

                {canApprove &&
                  (editable ? (
                    <button
                      type="button"
                      className={block("action", ["approve"])}
                      onClick={handleApprove}
                      disabled={updateSchedule.isPending}
                      title={
                        errors.length > 0
                          ? `Сначала устраните ошибки: ${errors.length}`
                          : "Ошибок нет — график можно утвердить"
                      }
                    >
                      Утвердить график
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={block("action")}
                      onClick={handleRevoke}
                      disabled={updateSchedule.isPending}
                    >
                      Вернуть в черновик
                    </button>
                  ))}

                <button
                  type="button"
                  className={block("action")}
                  onClick={() => {
                    void exportVacationScheduleToDocx(exportContext);
                  }}
                >
                  Выгрузить .docx
                </button>
                <button
                  type="button"
                  className={block("action")}
                  onClick={() => downloadVacationScheduleCsv(exportContext)}
                >
                  Выгрузить .csv
                </button>

                {canApprove && editable && (
                  <button
                    type="button"
                    className={block("action", ["danger"])}
                    onClick={handleDeleteSchedule}
                  >
                    Удалить график
                  </button>
                )}
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <p className={block("empty")}>
                {summary.employees === 0
                  ? "В графике нет строк — добавьте работника или перенесите всех из штатного расписания."
                  : "Нет строк, подходящих под фильтр."}
              </p>
            ) : (
              <div className={block("table-wrap")}>
                <table className={block("table")}>
                  <caption className={block("caption")}>
                    График отпусков на {year} год · форма Т-2 · в шапке месяца —
                    сколько работников уходит в отпуск
                  </caption>
                  <thead>
                    <tr>
                      <th className={block("th", ["num"])}>№</th>
                      <th className={block("th", ["person"])}>
                        Фамилия, И.О. · должность
                      </th>
                      <th className={block("th", ["unpaid"])}>Б/З, дн.</th>
                      {MONTH_SHORT_LABELS.map((label, index) => {
                        const going = (schedule.rows ?? []).filter((row) =>
                          partsOfMonth(row, index + 1).some((part) =>
                            isPaidAnnualKind(part.kind),
                          ),
                        ).length;

                        return (
                          <th key={label} className={block("th", ["month"])}>
                            {label}
                            {going > 0 && (
                              <span className={block("th-count")}>{going}</span>
                            )}
                          </th>
                        );
                      })}
                      <th className={block("th", ["total"])}>Всего</th>
                      {canEdit && editable && (
                        <th className={block("th", ["actions"])}>Действия</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, index) => (
                      <tr key={String(row.id)} className={block("row")}>
                        <td className={block("td", ["num"])}>{index + 1}</td>
                        <td className={block("td", ["person"])}>
                          <span className={block("person-name")}>
                            {initialsName(row.employeeName)}
                          </span>
                          <span className={block("person-sub")}>
                            {[row.position, row.structuralUnitName]
                              .filter(Boolean)
                              .join(" · ") || "должность не указана"}
                          </span>
                          {rowPaidAnnualDays(row) === 0 && (
                            <span className={block("person-flag")}>
                              нет оплачиваемых дней
                            </span>
                          )}
                          {row.note && (
                            <span className={block("person-note")}>
                              {row.note}
                            </span>
                          )}
                        </td>
                        <td className={block("td", ["unpaid"])}>
                          {rowUnpaidDays(row) || "—"}
                        </td>
                        {MONTH_LABELS.map((_, monthIndex) => {
                          const monthParts = partsOfMonth(row, monthIndex + 1);

                          return (
                            <td
                              key={monthIndex}
                              className={block("td", [
                                "month",
                                monthParts.length > 0 ? "filled" : "",
                              ])}
                            >
                              {monthParts.map((part) => (
                                <span
                                  key={String(part.id)}
                                  className={block("part", [
                                    part.kind,
                                    part.notifiedAt ? "notified" : "unnotified",
                                  ])}
                                  title={`${vacationLeaveKindShortLabels[part.kind]} · ${part.daysCount} кал. дн. · с ${formatDate(
                                    part.startDate,
                                  )} по ${formatDate(partEndDate(part))}${
                                    part.notifiedAt
                                      ? ` · предупреждение вручено ${formatDate(part.notifiedAt)}`
                                      : " · предупреждение не вручено"
                                  }`}
                                >
                                  {part.daysCount} дн.
                                  <span className={block("part-date")}>
                                    {formatDate(part.startDate).slice(0, 5)}
                                  </span>
                                </span>
                              ))}
                            </td>
                          );
                        })}
                        <td className={block("td", ["total"])}>
                          {rowTotalDays(row)}
                        </td>
                        {canEdit && editable && (
                          <td className={block("td", ["actions"])}>
                            <button
                              type="button"
                              className={block("mini")}
                              onClick={() => setModalRow(row)}
                            >
                              Изменить
                            </button>
                            <button
                              type="button"
                              className={block("mini", ["danger"])}
                              onClick={() => handleDeleteRow(row)}
                            >
                              Убрать
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* === Проверки графика === */}
          {(errors.length > 0 || warnings.length > 0) && (
            <section className={block("card")}>
              <h2 className={block("card-title")}>
                Проверки графика
                <span className={block("counters")}>
                  ошибок {errors.length} · предупреждений {warnings.length}
                </span>
              </h2>

              <ul className={block("issues")}>
                {[...errors, ...warnings].map((issue, index) => (
                  <li
                    key={`${issue.code}-${index}`}
                    className={block("issue", [issue.severity])}
                  >
                    <span className={block("issue-text")}>{issue.message}</span>
                    <span className={block("issue-rule")}>{issue.rule}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* === Кого предупредить (ч. 3 ст. 123 ТК РФ) === */}
          {notices.length > 0 && (
            <section className={block("card")}>
              <h2 className={block("card-title")}>
                Предупредить о начале отпуска
                <span className={block("counters")}>
                  срок — за {NOTICE_DAYS_BEFORE_LEAVE} дней до начала
                </span>
              </h2>

              <ul className={block("notices")}>
                {notices.map((notice) => (
                  <li
                    key={`${String(notice.row.id)}-${String(notice.part.id)}`}
                    className={block("notice", [
                      notice.notified ? "done" : notice.isOverdue ? "late" : "",
                    ])}
                  >
                    <span className={block("notice-name")}>
                      {initialsName(notice.row.employeeName)}
                    </span>
                    <span className={block("notice-period")}>
                      {formatDate(notice.startDate)} —{" "}
                      {formatDate(notice.endDate)} ·{" "}
                      {vacationLeaveKindShortLabels[notice.part.kind]} ·{" "}
                      {notice.part.daysCount} кал. дн.
                    </span>
                    <span className={block("notice-deadline")}>
                      {notice.notified
                        ? `вручено ${formatDate(String(notice.part.notifiedAt))}`
                        : `срок до ${formatDate(notice.noticeDeadline)} · через ${
                            notice.daysToStart
                          } дн.`}
                    </span>
                    {!notice.notified && canEdit && notice.part.id && (
                      <button
                        type="button"
                        className={block("mini")}
                        onClick={() =>
                          handleMarkNotified(
                            notice.row,
                            notice.part.id as string,
                          )
                        }
                      >
                        Отметить вручение
                      </button>
                    )}
                    {notice.part.id && (
                      <button
                        type="button"
                        className={block("mini")}
                        onClick={() =>
                          handleNoticeText(notice.row, notice.part.id as string)
                        }
                      >
                        Текст предупреждения
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {noticeText && (
                <pre className={block("notice-text")}>{noticeText}</pre>
              )}
            </section>
          )}

          {/* === Расхождения с учётом отсутствий === */}
          {conflicts.length > 0 && (
            <section className={block("card")}>
              <h2 className={block("card-title")}>
                План расходится с учётом отсутствий
                <span className={block("counters")}>
                  данные календаря отсутствий организации
                </span>
              </h2>
              <ul className={block("issues")}>
                {conflicts.map((conflict, index) => (
                  <li key={index} className={block("issue", ["warning"])}>
                    <span className={block("issue-text")}>
                      {initialsName(conflict.employeeName)}: отпуск с{" "}
                      {formatDate(conflict.partStart)} пересекается с{" "}
                      {conflict.leaveType === "sick_leave"
                        ? "больничным"
                        : "командировкой"}{" "}
                      {formatDate(conflict.leaveStart)} —{" "}
                      {formatDate(conflict.leaveEnd)}
                    </span>
                    <span className={block("issue-rule")}>
                      {conflict.leaveType === "sick_leave"
                        ? "ч. 1 ст. 124 ТК РФ"
                        : "ст. 123 ТК РФ"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* === Не охвачены графиком === */}
          {missingStaff.length > 0 && canEdit && (
            <section className={block("card")}>
              <h2 className={block("card-title")}>
                Нет в графике
                <span className={block("counters")}>
                  {missingStaff.length} из {staff.length} работников штатки
                </span>
              </h2>
              <ul className={block("missing")}>
                {missingStaff.map((member) => (
                  <li key={String(member.id)} className={block("missing-item")}>
                    <span>{member.fullName}</span>
                    <span className={block("missing-sub")}>
                      {[member.position, member.structuralUnitName]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* === Реквизиты утверждения === */}
          <section className={block("card")}>
            <h2 className={block("card-title")}>Утверждение</h2>

            <div className={block("approval")}>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="vs-order-number">
                  Номер приказа
                </label>
                <input
                  id="vs-order-number"
                  className={block("input")}
                  value={schedule.orderNumber ?? ""}
                  disabled={!canEdit || !editable}
                  onChange={(event) =>
                    handleOrderChange("orderNumber", event.target.value)
                  }
                  placeholder="например, 128-к"
                />
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="vs-order-date">
                  Дата приказа
                </label>
                <input
                  id="vs-order-date"
                  className={block("input")}
                  type="date"
                  value={schedule.orderDate ?? ""}
                  disabled={!canEdit || !editable}
                  onChange={(event) =>
                    handleOrderChange("orderDate", event.target.value)
                  }
                />
              </div>

              <div className={block("field")}>
                <span className={block("label")}>Утвердил</span>
                <span className={block("value")}>
                  {schedule.approvedByName || "— не утверждён —"}
                  {schedule.approvedAt
                    ? ` · ${formatDate(schedule.approvedAt)}`
                    : ""}
                </span>
              </div>

              <div className={block("field")}>
                <span className={block("label")}>Крайний срок утверждения</span>
                <span
                  className={block("value", [
                    schedule.status === "approved" || !deadline.isPast
                      ? ""
                      : "warn",
                  ])}
                >
                  {deadline.deadline}
                  {schedule.status === "approved"
                    ? " · график утверждён"
                    : deadline.isPast
                      ? " · срок прошёл"
                      : ` · осталось ${deadline.daysLeft ?? 0} дн.`}
                </span>
              </div>
            </div>

            {!isHead && (
              <p className={block("hint")}>
                По ч. 3 ст. 123 ТК РФ график отпусков утверждает руководитель
                организации. Сейчас подписантом записывается{" "}
                {employee?.position || "работник организации"} — при
                необходимости оформите отдельный приказ о возложении права
                утверждения.
              </p>
            )}

            <p className={block("footnote")}>
              Норма:{" "}
              {acts.find((act) => act.id === "tk-rf")
                ? formatLegalAct(acts.find((act) => act.id === "tk-rf")!)
                : "Трудовой кодекс Российской Федерации"}{" "}
              — ст. 115, 122-126, 128 ТК РФ; форма Т-2 — Постановление
              Госкомстата России от 05.01.2004 № 1.
            </p>
          </section>
        </>
      )}

      {modalRow !== undefined && (
        <VacationRowModal
          year={year}
          row={modalRow}
          staff={staff}
          onClose={() => setModalRow(undefined)}
          onSave={handleSaveRow}
        />
      )}
    </main>
  );
}
