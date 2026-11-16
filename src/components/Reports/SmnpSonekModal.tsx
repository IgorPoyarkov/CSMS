import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import {
  SmnpSonekPlanSchema,
  SmnpSonekReportSchema,
  SmnpSonekProcurementSchema,
  emptySmnpPlan,
  emptySmnpReport,
  emptySmnpProcurement,
  MINIMUM_SMNP_SHARE,
  type SmnpSonekRecord,
} from "../../services/Reports/smnpSonek.schema";
import {
  useCreateSmnpPlan,
  useUpdateSmnpPlan,
  useCreateSmnpReport,
  useUpdateSmnpReport,
  useCreateSmnpProcurement,
  useUpdateSmnpProcurement,
} from "../../services/Reports/smnpSonek.api";
import type {
  PurchasePlan,
  PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import styles from "./SmnpSonek.module.scss";

/** Тип записи, которую создаём/редактируем */
export type SmnpRecordType = "plan" | "report" | "procurement";

export interface SmnpSonekModalProps {
  organizationId: string | number;
  plan?: PurchasePlan;
  position?: PurchasePlanPosition;
  recordType: SmnpRecordType;
  existingRecord?: SmnpSonekRecord;
  onClose: () => void;
  onSaved?: (record: SmnpSonekRecord) => void;
}

/**
 * Универсальная модалка для создания/редактирования планов, отчётов
 * и закупок СМП/СОНКО (Tasks 9, п. 7, п/п 2 — исправление схемы).
 */

export default function SmnpSonekModal({
  organizationId,
  plan,
  position,
  recordType,
  existingRecord,
  onClose,
  onSaved,
}: SmnpSonekModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "smnp-modal");

  const createFn =
    recordType === "plan"
      ? useCreateSmnpPlan
      : recordType === "report"
        ? useCreateSmnpReport
        : useCreateSmnpProcurement;

  const updateFn =
    recordType === "plan"
      ? useUpdateSmnpPlan
      : recordType === "report"
        ? useUpdateSmnpReport
        : useUpdateSmnpProcurement;

  const createMutation = createFn();
  const updateMutation = updateFn();

  const isEditing = !!existingRecord?.id;
  const resolver =
    recordType === "plan"
      ? zodResolver(SmnpSonekPlanSchema)
      : recordType === "report"
        ? zodResolver(SmnpSonekReportSchema)
        : zodResolver(SmnpSonekProcurementSchema);

  const emptyFn =
    recordType === "plan"
      ? emptySmnpPlan
      : recordType === "report"
        ? emptySmnpReport
        : emptySmnpProcurement;

  const methods = useForm<any>({
    resolver: resolver as any,
    defaultValues: isEditing
      ? existingRecord
      : {
          ...emptyFn(organizationId),
          ...(plan && recordType !== "procurement"
            ? { purchasePlanId: plan.id }
            : {}),
          ...(position && recordType !== "procurement"
            ? { positionId: position.id }
            : {}),
        },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = methods;

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)?.[path]?.message;

  function onSubmit(data: any) {
    const saveFn = isEditing ? updateMutation : createMutation;
    saveFn.mutate(data, {
      onSuccess: (created) => {
        onSaved?.(created);
        onClose();
      },
    });
  }

  const type = watch("type");

  const titleMap: Record<string, string> = {
    plan: isEditing ? "Редактирование плана" : "Новый план закупок у СМП/СОНКО",
    report: isEditing
      ? "Редактирование отчёта"
      : "Новый отчёт о закупках у СМП/СОНКО",
    procurement: isEditing
      ? "Редактирование закупки"
      : "Новая закупка у СМП/СОНКО",
  };

  return (
    <CustomModal onClose={onClose}>
      <form className={block()} onSubmit={handleSubmit(onSubmit)}>
        <header className={block("header")}>
          <h2 className={block("title")}>{titleMap[recordType]}</h2>
          {plan && (
            <p className={block("caption")}>
              План-график {plan.planNumber} ·{" "}
              {position ? `позиция №${position.serialNumber}` : ""}
            </p>
          )}
        </header>

        {/* ===== Общие поля ===== */}
        <fieldset className={block("section")}>
          <legend>Период</legend>
          <div className={block("grid")}>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="year">
                Год
              </label>
              <input
                id="year"
                className={block("input")}
                type="number"
                min={2000}
                max={2100}
                {...register("year")}
              />
              {errorText("year") && (
                <span className={block("error")}>{errorText("year")}</span>
              )}
            </div>
            {type !== "annual" && (
              <div className={block("field")}>
                <label className={block("label")} htmlFor="quarter">
                  Квартал
                </label>
                <select
                  id="quarter"
                  className={block("input")}
                  {...register("quarter")}
                >
                  <option value="q1">Q1</option>
                  <option value="q2">Q2</option>
                  <option value="q3">Q3</option>
                  <option value="q4">Q4</option>
                </select>
              </div>
            )}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="type">
                Тип
              </label>
              <select
                id="type"
                className={block("input")}
                {...register("type")}
                onChange={(e) => {
                  const newType = e.target.value as "annual" | "quarterly";
                  methods.setValue("type", newType, {
                    shouldValidate: true,
                  });
                  if (newType === "annual") {
                    reset(
                      { ...methods.getValues(), quarter: undefined },
                      { keepValues: true },
                    );
                  }
                }}
              >
                <option value="annual">Годовой</option>
                <option value="quarterly">Квартальный</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* ===== Поля плана ===== */}
        {recordType === "plan" && (
          <fieldset className={block("section")}>
            <legend>Плановые показатели</legend>
            <div className={block("grid")}>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="plannedSmnpAmount">
                  План СМП, рублей
                </label>
                <input
                  id="plannedSmnpAmount"
                  className={block("input")}
                  placeholder="0.00"
                  {...register("plannedSmnpAmount")}
                />
                {errorText("plannedSmnpAmount") && (
                  <span className={block("error")}>
                    {errorText("plannedSmnpAmount")}
                  </span>
                )}
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="plannedSonekAmount">
                  План СОНКО, рублей
                </label>
                <input
                  id="plannedSonekAmount"
                  className={block("input")}
                  placeholder="0.00"
                  {...register("plannedSonekAmount")}
                />
                {errorText("plannedSonekAmount") && (
                  <span className={block("error")}>
                    {errorText("plannedSonekAmount")}
                  </span>
                )}
              </div>
              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="totalProcurementAmount"
                >
                  Всего закупок, рублей
                </label>
                <input
                  id="totalProcurementAmount"
                  className={block("input")}
                  placeholder="0.00"
                  {...register("totalProcurementAmount")}
                />
                {errorText("totalProcurementAmount") && (
                  <span className={block("error")}>
                    {errorText("totalProcurementAmount")}
                  </span>
                )}
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="plannedSmnpPercent">
                  Плановая доля СМП, %
                </label>
                <input
                  id="plannedSmnpPercent"
                  className={block("input")}
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  {...register("plannedSmnpPercent")}
                />
                {errorText("plannedSmnpPercent") && (
                  <span className={block("error")}>
                    {errorText("plannedSmnpPercent")}
                  </span>
                )}
                <p className={block("hint")}>
                  Минимальная доля СМП: {MINIMUM_SMNP_SHARE}% (ч. 1 ст. 30
                  ФЗ-44)
                </p>
              </div>
            </div>
          </fieldset>
        )}

        {/* ===== Поля отчёта ===== */}
        {recordType === "report" && (
          <fieldset className={block("section")}>
            <legend>Фактические показатели</legend>
            <div className={block("grid")}>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="actualSmnpAmount">
                  Факт СМП, рублей
                </label>
                <input
                  id="actualSmnpAmount"
                  className={block("input")}
                  placeholder="0.00"
                  {...register("actualSmnpAmount")}
                />
                {errorText("actualSmnpAmount") && (
                  <span className={block("error")}>
                    {errorText("actualSmnpAmount")}
                  </span>
                )}
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="actualSonekAmount">
                  Факт СОНКО, рублей
                </label>
                <input
                  id="actualSonekAmount"
                  className={block("input")}
                  placeholder="0.00"
                  {...register("actualSonekAmount")}
                />
                {errorText("actualSonekAmount") && (
                  <span className={block("error")}>
                    {errorText("actualSonekAmount")}
                  </span>
                )}
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="reportTotal">
                  Всего закупок, рублей
                </label>
                <input
                  id="reportTotal"
                  className={block("input")}
                  placeholder="0.00"
                  {...register("totalProcurementAmount")}
                />
                {errorText("totalProcurementAmount") && (
                  <span className={block("error")}>
                    {errorText("totalProcurementAmount")}
                  </span>
                )}
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="actualSmnpPercent">
                  Фактическая доля СМП, %
                </label>
                <input
                  id="actualSmnpPercent"
                  className={block("input")}
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  {...register("actualSmnpPercent")}
                />
                {errorText("actualSmnpPercent") && (
                  <span className={block("error")}>
                    {errorText("actualSmnpPercent")}
                  </span>
                )}
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="status">
                  Статус
                </label>
                <select
                  id="status"
                  className={block("input")}
                  {...register("status")}
                >
                  <option value="draft">Черновик</option>
                  <option value="review">На проверке</option>
                  <option value="published">Опубликован</option>
                  <option value="archived">Архив</option>
                </select>
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="eisPublishDate">
                  Дата размещения в ЕИС
                </label>
                <input
                  id="eisPublishDate"
                  className={block("input")}
                  type="date"
                  {...register("eisPublishDate")}
                />
              </div>
            </div>
          </fieldset>
        )}

        {/* ===== Поля закупки ===== */}
        {recordType === "procurement" && (
          <>
            <fieldset className={block("section")}>
              <legend>Реквизиты закупки</legend>
              <div className={block("grid")}>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="supplierType">
                    Тип поставщика
                  </label>
                  <select
                    id="supplierType"
                    className={block("input")}
                    {...register("supplierType")}
                  >
                    <option value="smnp">СМП</option>
                    <option value="sonek">СОНКО</option>
                  </select>
                </div>
                <div className={block("field", ["wide"])}>
                  <label className={block("label")} htmlFor="procurementName">
                    Наименование закупки
                  </label>
                  <input
                    id="procurementName"
                    className={block("input")}
                    {...register("procurementName")}
                    placeholder="Поставка канцелярских товаров"
                  />
                  {errorText("procurementName") && (
                    <span className={block("error")}>
                      {errorText("procurementName")}
                    </span>
                  )}
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="ikz">
                    ИКЗ
                  </label>
                  <input
                    id="ikz"
                    className={block("input")}
                    {...register("ikz")}
                    placeholder="0132100000012345678"
                  />
                  {errorText("ikz") && (
                    <span className={block("error")}>{errorText("ikz")}</span>
                  )}
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="procurementMethod">
                    Способ закупки
                  </label>
                  <input
                    id="procurementMethod"
                    className={block("input")}
                    {...register("procurementMethod")}
                    placeholder="Аукцион, конкурентный..."
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className={block("section")}>
              <legend>Ценовые показатели</legend>
              <div className={block("grid")}>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="initialPrice">
                    НМЦК, рублей
                  </label>
                  <input
                    id="initialPrice"
                    className={block("input")}
                    placeholder="0.00"
                    {...register("initialPrice")}
                  />
                  {errorText("initialPrice") && (
                    <span className={block("error")}>
                      {errorText("initialPrice")}
                    </span>
                  )}
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="contractPrice">
                    Цена контракта, рублей
                  </label>
                  <input
                    id="contractPrice"
                    className={block("input")}
                    placeholder="0.00"
                    {...register("contractPrice")}
                  />
                  {errorText("contractPrice") && (
                    <span className={block("error")}>
                      {errorText("contractPrice")}
                    </span>
                  )}
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="savingsAmount">
                    Экономия, рублей
                  </label>
                  <input
                    id="savingsAmount"
                    className={block("input")}
                    placeholder="0.00"
                    {...register("savingsAmount")}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className={block("section")}>
              <legend>Даты</legend>
              <div className={block("grid")}>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="noticeDate">
                    Дата размещения извещения
                  </label>
                  <input
                    id="noticeDate"
                    className={block("input")}
                    type="date"
                    {...register("noticeDate")}
                  />
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="contractDate">
                    Дата заключения контракта
                  </label>
                  <input
                    id="contractDate"
                    className={block("input")}
                    type="date"
                    {...register("contractDate")}
                  />
                </div>
                <div className={block("field")}>
                  <label className={block("label")} htmlFor="eisDate">
                    Дата размещения в ЕИС
                  </label>
                  <input
                    id="eisDate"
                    className={block("input")}
                    type="date"
                    {...register("eisDate")}
                  />
                </div>
              </div>
            </fieldset>
          </>
        )}

        {/* ===== Общие поля для всех типов ===== */}
        <fieldset className={block("section")}>
          <legend>Дополнительно</legend>
          <div className={block("grid")}>
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="comment">
                Комментарий
              </label>
              <input
                id="comment"
                className={block("input")}
                {...register("comment")}
                placeholder="Необязательно"
              />
            </div>
            <div className={block("field")}>
              <label className={block("checkboxLabel")}>
                <input type="checkbox" {...register("publishedInEis")} />
                Размещено в ЕИС
              </label>
            </div>
          </div>
        </fieldset>

        <footer className={block("footer")}>
          {(createMutation.isError || updateMutation.isError) && (
            <span className={block("error")}>
              Не сохранено:{" "}
              {String(createMutation.error ?? updateMutation.error)}
            </span>
          )}
          <div className={block("footer-actions")}>
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Сохранение..."
                : "Сохранить"}
            </button>
          </div>
        </footer>
      </form>
    </CustomModal>
  );
}
