import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import {
  ANNUAL_LEAVE_DAYS,
  MIN_MAIN_PART_DAYS,
  NOTICE_DAYS_BEFORE_LEAVE,
  UNPAID_LEAVE_FAMILY_DAYS,
  VacationRowSchema,
  addIsoDays,
  isoToday,
  overlappingPartsOfRow,
  partEndDate,
  rowPaidAnnualDays,
  rowUnpaidDays,
  vacationLeaveKindLabels,
  vacationLeaveKindRules,
  type VacationLeaveKind,
  type VacationRow,
  type VacationStaffMember,
} from "../../services/VacationSchedule/vacationSchedule.schema";
import styles from "./VacationRowModal.module.scss";

/**
 * Строка графика отпусков (графы 3-18 формы Т-2).
 *
 * Работника берут из штатного расписания: ФИО, должность и подразделение
 * сохраняются снимком, чтобы график не «поехал», когда человека переведут или
 * уволят. Далее — дни без сохранения заработной платы (ст. 128 ТК РФ) и части
 * отпуска: вид, количество календарных дней (ст. 120 ТК РФ) и дата начала.
 *
 * Подсказки внутри формы считают то же, что и проверки экрана: 28 дней
 * ежегодного отпуска (ст. 115 ТК РФ), обязательные 14 дней в одной из частей
 * при разделении (ч. 2 ст. 125 ТК РФ) и пересечения частей. Кнопка «Разбить»
 * предлагает схему 14 + 14 — самый частый вариант согласования.
 */

interface VacationRowModalProps {
  year: number;
  // null — новая строка
  row: VacationRow | null;
  staff: VacationStaffMember[];
  onClose: () => void;
  onSave: (row: VacationRow) => void;
}

const KINDS: VacationLeaveKind[] = [
  "annual_main",
  "annual_extra",
  "unpaid",
  "study",
  "maternity",
];

const emptyRow = (): VacationRow => ({
  id: `row-${Date.now()}`,
  employeeId: "",
  employeeName: "",
  position: "",
  structuralUnitName: "",
  adoptionDate: "",
  unpaidLeaveDays: 0,
  parts: [],
  note: "",
});

export default function VacationRowModal({
  year,
  row,
  staff,
  onClose,
  onSave,
}: VacationRowModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "vacation-row-modal");

  const methods = useForm({
    resolver: zodResolver(VacationRowSchema),
    defaultValues: row ?? emptyRow(),
  });

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = methods;

  const partsArray = useFieldArray({ control, name: "parts" });
  const values = (useWatch({ control }) ?? emptyRow()) as VacationRow;

  // Снимок строки для живых подсказок: форма отдаёт дни строкой, поэтому
  // значения приводятся к числу до расчётов
  const draftRow: VacationRow = {
    ...values,
    unpaidLeaveDays: Number(values.unpaidLeaveDays || 0),
    parts: (values.parts ?? []).map((part) => ({
      ...part,
      kind: (part.kind ?? "annual_main") as VacationLeaveKind,
      daysCount: Number(part.daysCount || 0),
    })),
  };

  const paidDays = rowPaidAnnualDays(draftRow);
  const unpaidDays = rowUnpaidDays(draftRow);
  const overlaps = overlappingPartsOfRow(draftRow);
  const mainParts = draftRow.parts.filter(
    (part) => part.kind === "annual_main",
  );
  const splitWithoutLongPart =
    mainParts.length > 1 &&
    !mainParts.some((part) => part.daysCount >= MIN_MAIN_PART_DAYS);

  const handlePickEmployee = (value: string) => {
    const member = staff.find((item) => String(item.id) === value);

    if (!member) return;

    setValue("employeeId", member.id ?? "", { shouldDirty: true });
    setValue("employeeName", member.fullName, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("position", member.position ?? "", { shouldDirty: true });
    setValue("structuralUnitName", member.structuralUnitName ?? "", {
      shouldDirty: true,
    });
    setValue("adoptionDate", member.adoptionDate ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleAddPart = (kind: VacationLeaveKind) => {
    partsArray.append({
      id: `part-${Date.now()}-${partsArray.fields.length}`,
      kind,
      daysCount:
        kind === "annual_main" ? ANNUAL_LEAVE_DAYS : MIN_MAIN_PART_DAYS,
      startDate: `${year}-07-01`,
      notifiedAt: "",
    });
  };

  // Разбивка 14 + 14: одна из частей — обязательные 14 дней (ч. 2 ст. 125 ТК РФ)
  const handleSplitMainLeave = () => {
    const first = ANNUAL_LEAVE_DAYS - MIN_MAIN_PART_DAYS;

    partsArray.replace([
      {
        id: `part-${Date.now()}-1`,
        kind: "annual_main",
        daysCount: first,
        startDate: `${year}-07-01`,
        notifiedAt: "",
      },
      {
        id: `part-${Date.now()}-2`,
        kind: "annual_main",
        daysCount: MIN_MAIN_PART_DAYS,
        startDate: `${year}-12-01`,
        notifiedAt: "",
      },
    ]);
  };

  // Строка уже получила id при открытии модалки (newVacationRow / emptyRow),
  // поэтому здесь id только переносим, а не генерируем: Date.now() внутри
  // обработчика, который react-hook-form вызывает из рендера, нарушает чистоту
  const onSubmit = (data: VacationRow) => {
    onSave({
      ...data,
      id: data.id ?? row?.id,
      unpaidLeaveDays: Number(data.unpaidLeaveDays || 0),
      parts: (data.parts ?? []).map((part) => ({
        ...part,
        daysCount: Number(part.daysCount || 0),
      })),
    });
  };

  return (
    <div className={block()} onClick={onClose}>
      <div
        className={block("window")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={block("head")}>
          <h3 className={block("title")}>
            {row
              ? row.employeeName || "Строка графика"
              : "Новая строка графика"}
          </h3>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form className={block("body")} onSubmit={handleSubmit(onSubmit)}>
          {/* === Работник: снимок из штатного расписания === */}
          <fieldset className={block("group")}>
            <legend className={block("legend")}>Работник</legend>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="vrm-staff">
                Работник штатного расписания
              </label>
              <select
                id="vrm-staff"
                className={block("input")}
                value={String(values.employeeId ?? "")}
                onChange={(event) => handlePickEmployee(event.target.value)}
              >
                <option value="">— внести вручную —</option>
                {staff.map((member) => (
                  <option key={String(member.id)} value={String(member.id)}>
                    {member.fullName}
                    {member.position ? ` · ${member.position}` : ""}
                    {member.structuralUnitName
                      ? ` · ${member.structuralUnitName}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className={block("grid")}>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="vrm-name">
                  Фамилия, Имя, Отчество
                </label>
                <input
                  id="vrm-name"
                  className={block("input")}
                  {...register("employeeName")}
                />
                {errors.employeeName && (
                  <span className={block("error")}>
                    {errors.employeeName.message}
                  </span>
                )}
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="vrm-position">
                  Должность
                </label>
                <input
                  id="vrm-position"
                  className={block("input")}
                  {...register("position")}
                />
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="vrm-unit">
                  Подразделение
                </label>
                <input
                  id="vrm-unit"
                  className={block("input")}
                  {...register("structuralUnitName")}
                />
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="vrm-adoption">
                  Дата принятия на работу
                </label>
                <input
                  id="vrm-adoption"
                  className={block("input")}
                  type="date"
                  {...register("adoptionDate")}
                />
                {errors.adoptionDate && (
                  <span className={block("error")}>
                    {(errors.adoptionDate as { message?: string }).message}
                  </span>
                )}
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="vrm-unpaid">
                  Без сохранения ЗП, кал. дней
                </label>
                <input
                  id="vrm-unpaid"
                  className={block("input")}
                  type="number"
                  min={0}
                  {...register("unpaidLeaveDays")}
                />
                {unpaidDays > 0 && (
                  <span className={block("hint")}>
                    ст. 128 ТК РФ: по семейным обстоятельствам — до{" "}
                    {UNPAID_LEAVE_FAMILY_DAYS} дней, для отдельных категорий
                    больше. Основание укажите в примечании.
                  </span>
                )}
              </div>
            </div>
          </fieldset>

          {/* === Части отпуска === */}
          <fieldset className={block("group")}>
            <legend className={block("legend")}>
              Части отпуска
              <span className={block("legend-count")}>
                оплачиваемых дней {paidDays} из {ANNUAL_LEAVE_DAYS} (ст. 115 ТК
                РФ)
              </span>
            </legend>

            <div className={block("parts-actions")}>
              {KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={block("chip")}
                  onClick={() => handleAddPart(kind)}
                >
                  + {vacationLeaveKindLabels[kind]}
                </button>
              ))}
              <button
                type="button"
                className={block("chip", ["split"])}
                onClick={handleSplitMainLeave}
                title={`${MIN_MAIN_PART_DAYS} + ${
                  ANNUAL_LEAVE_DAYS - MIN_MAIN_PART_DAYS
                } кал. дней — частый вариант согласования`}
              >
                Разбить {ANNUAL_LEAVE_DAYS} дней
              </button>
            </div>

            {draftRow.parts.length === 0 && (
              <p className={block("hint")}>
                Части отпуска не указаны — добавьте их кнопками выше или
                разбейте {ANNUAL_LEAVE_DAYS} дней на две части.
              </p>
            )}

            <ul className={block("parts")}>
              {partsArray.fields.map((field, index) => {
                const part = draftRow.parts[index];
                const partErrors = errors.parts?.[index];

                return (
                  <li className={block("part")} key={field.id}>
                    <div className={block("part-field")}>
                      <span className={block("part-label")}>Вид отпуска</span>
                      <select
                        className={block("input")}
                        {...register(`parts.${index}.kind` as const)}
                      >
                        {KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {vacationLeaveKindLabels[kind]} (
                            {vacationLeaveKindRules[kind]})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={block("part-field", ["short"])}>
                      <span className={block("part-label")}>Кал. дней</span>
                      <input
                        className={block("input")}
                        type="number"
                        min={1}
                        {...register(`parts.${index}.daysCount` as const)}
                      />
                      {partErrors?.daysCount && (
                        <span className={block("error")}>
                          {partErrors.daysCount.message}
                        </span>
                      )}
                    </div>

                    <div className={block("part-field")}>
                      <span className={block("part-label")}>Дата начала</span>
                      <input
                        className={block("input")}
                        type="date"
                        {...register(`parts.${index}.startDate` as const)}
                      />
                      {partErrors?.startDate && (
                        <span className={block("error")}>
                          {partErrors.startDate.message}
                        </span>
                      )}
                      {part?.startDate && (
                        <span className={block("part-end")}>
                          по {partEndDate(part)} · предупредить до{" "}
                          {addIsoDays(
                            part.startDate,
                            -NOTICE_DAYS_BEFORE_LEAVE,
                          )}
                        </span>
                      )}
                    </div>

                    <label className={block("checkbox")}>
                      <input
                        type="checkbox"
                        checked={Boolean(part?.notifiedAt)}
                        onChange={(event) =>
                          setValue(
                            `parts.${index}.notifiedAt`,
                            event.target.checked ? isoToday() : "",
                            { shouldDirty: true },
                          )
                        }
                      />
                      Предупреждение вручено (ч. 3 ст. 123 ТК РФ)
                      {part?.notifiedAt ? ` · ${part.notifiedAt}` : ""}
                    </label>

                    <button
                      type="button"
                      className={block("part-remove")}
                      onClick={() => partsArray.remove(index)}
                      aria-label="Удалить часть отпуска"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>

            {splitWithoutLongPart && (
              <p className={block("warn")}>
                Отпуск разделён на {mainParts.length} части, но ни одна не
                достигает {MIN_MAIN_PART_DAYS} календарных дней: по ч. 2 ст. 125
                ТК РФ хотя бы одна часть должна быть не меньше{" "}
                {MIN_MAIN_PART_DAYS} дней.
              </p>
            )}

            {overlaps.length > 0 && (
              <p className={block("error-block")}>
                Части отпуска пересекаются:{" "}
                {overlaps
                  .map(
                    ([first, second]) =>
                      `${first.startDate} — ${partEndDate(first)} и ${
                        second.startDate
                      } — ${partEndDate(second)}`,
                  )
                  .join("; ")}
                . Работник не может быть в двух отпусках одновременно.
              </p>
            )}

            {paidDays > ANNUAL_LEAVE_DAYS && (
              <p className={block("error-block")}>
                Оплачиваемых дней больше {ANNUAL_LEAVE_DAYS}: по ст. 115 ТК РФ
                ежегодный отпуск — {ANNUAL_LEAVE_DAYS} календарных дней,
                дополнительные дни оформляйте видом «Ежегодный дополнительный».
              </p>
            )}

            {paidDays > 0 &&
              paidDays < ANNUAL_LEAVE_DAYS &&
              mainParts.length > 0 && (
                <p className={block("hint")}>
                  Запланировано {paidDays} оплачиваемых дней из{" "}
                  {ANNUAL_LEAVE_DAYS}. Остаток переносится на следующий год или
                  заменяется компенсацией (ст. 126 ТК РФ).
                </p>
              )}
          </fieldset>

          <fieldset className={block("group")}>
            <legend className={block("legend")}>Примечание</legend>
            <textarea
              className={block("input", ["textarea"])}
              rows={2}
              placeholder="Перенос по согласованию сторон, льготная категория, основание для дней без сохранения зарплаты"
              {...register("note")}
            />
          </fieldset>

          <div className={block("actions")}>
            <button
              type="button"
              className={block("btn", ["ghost"])}
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={block("btn", ["primary"])}
              disabled={overlaps.length > 0 || methods.formState.isSubmitting}
              title={
                overlaps.length > 0
                  ? "Сначала устраните пересечение частей отпуска"
                  : undefined
              }
            >
              {methods.formState.isSubmitting
                ? "Сохранение…"
                : "Сохранить строку"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
