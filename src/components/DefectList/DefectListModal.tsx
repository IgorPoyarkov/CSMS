import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import { useLegalActs } from "../../services/LegalAct/legalAct.api";
import { formatLegalAct } from "../../services/LegalAct/legalAct.schema";
import { useOrganizationObjectDescriptions } from "../../services/ObjectDescription/objectDescription.api";
import {
  DEFECT_LIST_REVIEW_DAYS,
  DefectListSchema,
  ESTIMATE_METHODS,
  ESTIMATE_NORMATIVE_BASES,
  buildScheduleStages,
  computeEstimateTotals,
  defectDirectCost,
  defectItemAmount,
  emptyDefectList,
  estimateMethodLabels,
  estimateNormativeBaseLabels,
  normalizeEstimate,
  normalizeSchedule,
  scheduleDifference,
  scheduleTotal,
  type DefectItem,
  type DefectList,
  type DefectListAuthor,
} from "../../services/DefectList/defectList.schema";
import {
  useCreateDefectList,
  useUpdateDefectList,
} from "../../services/DefectList/defectList.api";
import styles from "./DefectListModal.module.scss";
import Select from "../UI/Select";

/**
 * Дефектовка с проектом сметы контракта и проектом календарного графика
 * (Tasks 8, п. 4).
 *
 * Порядок работы: подразделение-заказчик указывает объект (связь с ООЗ),
 * основание (дефектный акт) и объёмы работ; из позиций собираются прямые
 * затраты, из них — проект сметы (накладные, сметная прибыль, НДС), из сметы
 * — проект календарного графика по разделам работ. Смета опирается на
 * методику 421/пр, график — на 336/пр; обе ссылки ведут в реестр актов.
 */

interface DefectListModalProps {
  organizationId: string | number;
  author: DefectListAuthor;
  // null/undefined — создание новой дефектовки
  list?: DefectList | null;
  onClose: () => void;
}

type FieldErrorMap = Record<string, { message?: string } | undefined>;

const money = (value: number): string =>
  value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const today = (): string => new Date().toISOString().slice(0, 10);

export default function DefectListModal({
  organizationId,
  author,
  list,
  onClose,
}: DefectListModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "defect-list-modal");

  const { data: acts = [] } = useLegalActs();
  const { data: objectDescriptions = [] } =
    useOrganizationObjectDescriptions(organizationId);

  const createList = useCreateDefectList();
  const updateList = useUpdateDefectList();
  const isPending = createList.isPending || updateList.isPending;
  const mutationError = createList.error ?? updateList.error;

  const methods = useForm({
    resolver: zodResolver(DefectListSchema),
    defaultValues: list ?? emptyDefectList(organizationId, author),
  });

  const {
    register,
    handleSubmit,
    setValue,
    control,
    getValues,
    formState: { errors },
  } = methods;

  const itemsArray = useFieldArray({ control, name: "items" });
  const stagesArray = useFieldArray({ control, name: "schedule.stages" });

  // useWatch вместо watch: watch в рендере React Compiler не мемоизирует
  const watchedItems = (useWatch({ control, name: "items" }) ??
    []) as DefectItem[];
  const watchedEstimate = useWatch({ control, name: "estimate" });
  const watchedSchedule = useWatch({ control, name: "schedule" });
  const watchedObjectId = useWatch({ control, name: "objectDescriptionId" });

  const estimate = normalizeEstimate(watchedEstimate);
  const schedule = normalizeSchedule(watchedSchedule);
  const stages = schedule.stages;
  const totals = computeEstimateTotals({ items: watchedItems, estimate });
  const directCost = defectDirectCost(watchedItems);
  const scheduleSum = scheduleTotal(stages);
  const difference = scheduleDifference({
    items: watchedItems,
    estimate,
    schedule,
  });

  const objectOptions = objectDescriptions.filter(
    (item) => item.kind === "object_description",
  );
  const ministryOrders = acts.filter(
    (act) => act.actType === "ministry-order",
  );

  const itemError = (index: number, key: string): string | undefined => {
    const items = (errors as unknown as { items?: FieldErrorMap[] }).items;

    return items?.[index]?.[key]?.message;
  };

  const stageError = (index: number, key: string): string | undefined => {
    const schedule = (
      errors as unknown as { schedule?: { stages?: FieldErrorMap[] } }
    ).schedule;

    return schedule?.stages?.[index]?.[key]?.message;
  };

  function pickObjectDescription(id: string) {
    const selected = objectOptions.find((item) => String(item.id) === id);

    setValue("objectDescriptionId", selected?.id);
    setValue("objectName", selected?.title ?? "");

    if (selected?.procurementId) {
      setValue("procurementId", selected.procurementId);
    }
    if (selected?.purchasePlanId) {
      setValue("purchasePlanId", selected.purchasePlanId);
    }
    if (selected?.positionId) {
      setValue("positionId", selected.positionId);
    }
  }

  function generateSchedule() {
    const values = getValues();

    stagesArray.replace(
      buildScheduleStages({
        items: (values.items ?? []) as DefectItem[],
        estimate: normalizeEstimate(values.estimate),
        schedule: normalizeSchedule(values.schedule),
      }),
    );
  }

  function onSubmit(data: DefectList) {
    const payload = { ...data, updatedAt: today() };

    if (list?.id) {
      updateList.mutate({ ...payload, id: list.id }, { onSuccess: onClose });

      return;
    }

    createList.mutate(payload, { onSuccess: onClose });
  }

  return (
    <CustomModal onClose={onClose}>
      <form className={block()} onSubmit={handleSubmit(onSubmit)}>
        <header className={block("header")}>
          <h2 className={block("title")}>
            {list ? "Дефектовка и документы по ней" : "Новая дефектовка"}
          </h2>
          <p className={block("caption")}>
            Инициатор: {author.employeeName || "—"}
            {author.structuralUnitName ? ` · ${author.structuralUnitName}` : ""}
          </p>
        </header>

        <fieldset className={block("section")}>
          <legend>Объект и основание</legend>
          <div className={block("grid")}>
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="defect-object">
                Объект закупки (описание объекта закупки)
              </label>
              <Select
                id="defect-object"
                className={block("input")}
                value={String(watchedObjectId ?? "")}
                onChange={(event) => pickObjectDescription(event.target.value)}
              >
                <option value="">
                  Без связи с ООЗ — укажите объект вручную
                </option>
                {objectOptions.map((item) => (
                  <option key={String(item.id)} value={String(item.id)}>
                    {item.title}
                    {item.okpd2Code ? ` · ${item.okpd2Code}` : ""}
                  </option>
                ))}
              </Select>
              <p className={block("hint")}>
                Наименование и ОКПД2 не дублируются: они берутся из описания
                объекта закупки. Здесь фиксируются только объёмы работ.
              </p>
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="defect-object-name">
                Объект (снимок для печати)
              </label>
              <input
                id="defect-object-name"
                className={block("input")}
                {...register("objectName")}
                placeholder="Заполняется из ООЗ; можно уточнить формулировку"
              />
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="defect-basis">
                Основание — дефектный акт (номер и дата)
              </label>
              <input
                id="defect-basis"
                className={block("input")}
                {...register("basis")}
                placeholder="Дефектный акт № 14 от 03.11.2026"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Дефектовка — объёмы работ</legend>

          {itemsArray.fields.length === 0 ? (
            <p className={block("hint")}>
              Позиций пока нет. Добавьте виды работ с объёмом и расценкой —
              из них соберутся прямые затраты сметы.
            </p>
          ) : (
            <div className={block("table")}>
              <div className={block("row", ["head"])}>
                <span>Раздел</span>
                <span>Вид работ</span>
                <span>Шифр ГЭСН/ФЕР</span>
                <span>Ед.</span>
                <span>Объём</span>
                <span>Цена, ₽</span>
                <span>Сумма, ₽</span>
                <span />
              </div>

              {itemsArray.fields.map((field, index) => (
                <div key={field.id} className={block("row")}>
                  <input
                    className={block("input")}
                    {...register(`items.${index}.section`)}
                    placeholder="Отопление"
                  />
                  <div className={block("cell")}>
                    <input
                      className={block("input")}
                      {...register(`items.${index}.name`)}
                      placeholder="Вид работ"
                    />
                    {itemError(index, "name") && (
                      <span className={block("error")}>
                        {itemError(index, "name")}
                      </span>
                    )}
                  </div>
                  <input
                    className={block("input")}
                    {...register(`items.${index}.normCode`)}
                    placeholder="16-02-001-01"
                  />
                  <input
                    className={block("input")}
                    {...register(`items.${index}.unit`)}
                    placeholder="м²"
                  />
                  <div className={block("cell")}>
                    <input
                      className={block("input")}
                      {...register(`items.${index}.quantity`)}
                      placeholder="0"
                    />
                    {itemError(index, "quantity") && (
                      <span className={block("error")}>
                        {itemError(index, "quantity")}
                      </span>
                    )}
                  </div>
                  <div className={block("cell")}>
                    <input
                      className={block("input")}
                      {...register(`items.${index}.unitPrice`)}
                      placeholder="0.00"
                    />
                    {itemError(index, "unitPrice") && (
                      <span className={block("error")}>
                        {itemError(index, "unitPrice")}
                      </span>
                    )}
                  </div>
                  <span className={block("sum")}>
                    {money(
                      defectItemAmount({
                        id: field.id,
                        section: field.section,
                        normCode: field.normCode,
                        name: field.name,
                        unit: field.unit,
                        quantity: watchedItems[index]?.quantity,
                        unitPrice: watchedItems[index]?.unitPrice,
                      }),
                    )}
                  </span>
                  <button
                    type="button"
                    className={block("remove")}
                    onClick={() => itemsArray.remove(index)}
                    aria-label="Удалить позицию"
                    title="Удалить позицию"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={block("row-footer")}>
            <button
              type="button"
              className={block("add")}
              onClick={() =>
                itemsArray.append({
                  name: "",
                  section: "",
                  normCode: "",
                  unit: "",
                  quantity: "",
                  unitPrice: "",
                })
              }
            >
              + Добавить позицию
            </button>
            <span className={block("total")}>
              Прямые затраты: {money(directCost)} ₽
            </span>
          </div>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Проект сметы контракта</legend>
          <div className={block("grid")}>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="estimate-method">
                Метод расчёта
              </label>
              <Select
                id="estimate-method"
                className={block("input")}
                {...register("estimate.method")}
              >
                {ESTIMATE_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {estimateMethodLabels[method]}
                  </option>
                ))}
              </Select>
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="estimate-base">
                Нормативная база
              </label>
              <Select
                id="estimate-base"
                className={block("input")}
                {...register("estimate.normativeBase")}
              >
                {ESTIMATE_NORMATIVE_BASES.map((base) => (
                  <option key={base} value={base}>
                    {estimateNormativeBaseLabels[base]}
                  </option>
                ))}
              </Select>
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="estimate-price-level">
                Уровень цен
              </label>
              <input
                id="estimate-price-level"
                className={block("input")}
                {...register("estimate.priceLevel")}
                placeholder="IV квартал 2026"
              />
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="estimate-act">
                Норма — методика определения сметной стоимости
              </label>
              <Select
                id="estimate-act"
                className={block("input")}
                {...register("estimate.legalActId")}
              >
                <option value="">Не указана</option>
                {ministryOrders.map((act) => (
                  <option key={String(act.id)} value={String(act.id)}>
                    {formatLegalAct(act)}
                  </option>
                ))}
              </Select>
              <p className={block("hint")}>
                Смета контракта считается по методике Минстроя России
                № 421/пр от 04.08.2020; акт хранится в реестре
                законодательных актов, поэтому при его замене видно, что
                пересчитать.
              </p>
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="estimate-overhead">
                Накладные расходы, %
              </label>
              <input
                id="estimate-overhead"
                className={block("input")}
                type="number"
                min={0}
                max={100}
                step="0.1"
                {...register("estimate.overheadPercent")}
              />
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="estimate-profit">
                Сметная прибыль, %
              </label>
              <input
                id="estimate-profit"
                className={block("input")}
                type="number"
                min={0}
                max={100}
                step="0.1"
                {...register("estimate.profitPercent")}
              />
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="estimate-vat">
                НДС, %
              </label>
              <input
                id="estimate-vat"
                className={block("input")}
                type="number"
                min={0}
                max={100}
                step="0.1"
                {...register("estimate.vatPercent")}
              />
            </div>
          </div>

          <dl className={block("totals")}>
            <div>
              <dt>Прямые затраты</dt>
              <dd>{money(totals.directCost)} ₽</dd>
            </div>
            <div>
              <dt>Накладные расходы</dt>
              <dd>{money(totals.overhead)} ₽</dd>
            </div>
            <div>
              <dt>Сметная прибыль</dt>
              <dd>{money(totals.profit)} ₽</dd>
            </div>
            <div>
              <dt>НДС</dt>
              <dd>{money(totals.vat)} ₽</dd>
            </div>
            <div className={block("totals-row", ["total"])}>
              <dt>Итого по проекту сметы</dt>
              <dd>{money(totals.total)} ₽</dd>
            </div>
          </dl>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Проект календарного графика</legend>

          <div className={block("grid")}>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="schedule-start">
                Начало работ
              </label>
              <input
                id="schedule-start"
                className={block("input")}
                type="date"
                {...register("schedule.plannedStart")}
              />
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="schedule-end">
                Окончание работ
              </label>
              <input
                id="schedule-end"
                className={block("input")}
                type="date"
                {...register("schedule.plannedEnd")}
              />
            </div>
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="schedule-act">
                Норма — методика составления графика
              </label>
              <Select
                id="schedule-act"
                className={block("input")}
                {...register("schedule.legalActId")}
              >
                <option value="">Не указана</option>
                {ministryOrders.map((act) => (
                  <option key={String(act.id)} value={String(act.id)}>
                    {formatLegalAct(act)}
                  </option>
                ))}
              </Select>
              <p className={block("hint")}>
                График выполнения СМР и график оплаты составляются по методике
                Минстроя России № 336/пр от 05.06.2018.
              </p>
            </div>
          </div>

          {stages.length > 0 && (
            <div className={block("table", ["stages"])}>
              <div className={block("row", ["head"])}>
                <span>Этап</span>
                <span>Начало</span>
                <span>Окончание</span>
                <span>Сумма, ₽</span>
                <span />
              </div>

              {stagesArray.fields.map((field, index) => (
                <div key={field.id} className={block("row")}>
                  <div className={block("cell")}>
                    <input
                      className={block("input")}
                      {...register(`schedule.stages.${index}.name`)}
                      placeholder="Этап работ"
                    />
                    {stageError(index, "name") && (
                      <span className={block("error")}>
                        {stageError(index, "name")}
                      </span>
                    )}
                  </div>
                  <input
                    className={block("input")}
                    type="date"
                    {...register(`schedule.stages.${index}.startDate`)}
                  />
                  <input
                    className={block("input")}
                    type="date"
                    {...register(`schedule.stages.${index}.endDate`)}
                  />
                  <div className={block("cell")}>
                    <input
                      className={block("input")}
                      {...register(`schedule.stages.${index}.amount`)}
                      placeholder="0.00"
                    />
                    {stageError(index, "amount") && (
                      <span className={block("error")}>
                        {stageError(index, "amount")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={block("remove")}
                    onClick={() => stagesArray.remove(index)}
                    aria-label="Удалить этап"
                    title="Удалить этап"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={block("row-footer")}>
            <button
              type="button"
              className={block("add")}
              onClick={generateSchedule}
            >
              Сформировать из сметы
            </button>
            <button
              type="button"
              className={block("add")}
              onClick={() =>
                stagesArray.append({
                  name: "",
                  startDate: "",
                  endDate: "",
                  amount: "",
                })
              }
            >
              + Добавить этап
            </button>
            <span
              className={block("total", [
                difference !== 0 ? "warning" : "ok",
              ])}
            >
              График: {money(scheduleSum)} ₽ из {money(totals.total)} ₽
              {difference !== 0
                ? ` · расхождение ${money(Math.abs(difference))} ₽`
                : " · сходится со сметой"}
            </span>
          </div>
        </fieldset>

        <footer className={block("footer")}>
          {mutationError && (
            <span className={block("error")}>
              Дефектовка не сохранена: {String(mutationError)}
            </span>
          )}
          <p className={block("hint")}>
            После сохранения дефектовку можно направить в контрактную службу —
            там появится задача проверить документы и поставить позицию в
            план-график (срок рассмотрения — {DEFECT_LIST_REVIEW_DAYS} дней).
          </p>
          {list?.id !== undefined && list.id !== null && (
            <p className={block("estimate-link")}>
              {list.estimateDocumentId ? (
                <Link to={`/estimates/${list.estimateDocumentId}`}>
                  Открыть смету и обоснование НМЦК
                </Link>
              ) : (
                <Link to={`/estimates/new?defectListId=${String(list.id)}`}>
                  Сформировать смету и обоснование НМЦК
                </Link>
              )}
            </p>
          )}
          <div className={block("footer-actions")}>
            <button type="button" onClick={onClose} disabled={isPending}>
              Отмена
            </button>
            <button type="submit" disabled={isPending}>
              {isPending
                ? "Сохранение..."
                : list
                  ? "Сохранить изменения"
                  : "Сохранить черновик"}
            </button>
          </div>
        </footer>
      </form>
    </CustomModal>
  );
}
