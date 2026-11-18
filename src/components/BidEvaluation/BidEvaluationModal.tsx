import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import { useLegalActs } from "../../services/LegalAct/legalAct.api";
import { formatLegalAct } from "../../services/LegalAct/legalAct.schema";
import {
  BEST_DIRECTIONS,
  BID_EVALUATION_LEGAL_ACT_ID,
  BidEvaluationSchema,
  OBJECT_CATEGORY_LIMITS,
  PROCEDURE_KINDS,
  SCORING_MODES,
  bestDirectionLabels,
  criterionShortLabels,
  detectObjectCategory,
  emptyBidEvaluation,
  evaluateBids,
  indicatorKindLabels,
  indicatorKindsByCriterion,
  normalizeEvaluation,
  normalizeOkpd2Code,
  objectCategoryLimits,
  parseNumber,
  parseScaleText,
  pp2604Applies,
  procedureApplicabilityHint,
  procedureKindLabels,
  scoringModeLabels,
  validateBidEvaluation,
  type Bid,
  type BidEvaluation,
  type Criterion,
  type Indicator,
  type ProcedureKind,
} from "../../services/BidEvaluation/bidEvaluation.schema";
import {
  useCreateBidEvaluation,
  useUpdateBidEvaluation,
} from "../../services/BidEvaluation/bidEvaluation.api";
import styles from "./BidEvaluationModal.module.scss";

/**
 * Оценка заявок по ПП РФ N 2604.
 *
 * Форма собирает документ, который затем используется комиссией: критерии и
 * показатели со значимостью, предложения участников и расчёт баллов по
 * формулам п. 9, 10, 14 и 20 Положения. Проверки (`validateBidEvaluation`)
 * показывают, где конфигурация расходится с нормой: сумма значимости,
 * предельные величины приложения N 2, запрет показателей по цене,
 * обязательный опыт работы для строительства и отдельных видов услуг.
 */

interface BidEvaluationModalProps {
  organizationId: string | number;
  // null/undefined — создание новой оценки
  evaluation?: BidEvaluation | null;
  onClose: () => void;
}

type FieldErrorMap = Record<string, { message?: string } | undefined>;

const today = (): string => new Date().toISOString().slice(0, 10);

const money = (value: number): string =>
  value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const newId = (prefix: string): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const emptyIndicator = (kind: Indicator["kind"]): Indicator => ({
  id: newId("ind"),
  name: "",
  kind,
  weightPercent: 0,
  unit: "",
  best: kind === "expense" ? "min" : "max",
  scoring: "formula",
  limitMin: undefined,
  limitMax: undefined,
  scaleText: "",
});

export default function BidEvaluationModal({
  organizationId,
  evaluation: source,
  onClose,
}: BidEvaluationModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "bid-evaluation-modal");

  const { data: acts = [] } = useLegalActs();
  const createEvaluation = useCreateBidEvaluation();
  const updateEvaluation = useUpdateBidEvaluation();
  const isPending = createEvaluation.isPending || updateEvaluation.isPending;
  const mutationError = createEvaluation.error ?? updateEvaluation.error;

  const initial = normalizeEvaluation(
    source ?? emptyBidEvaluation(organizationId),
  );

  const methods = useForm({
    resolver: zodResolver(BidEvaluationSchema),
    defaultValues: initial,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = methods;

  // react-hook-form выводит FieldPath из типа формы и не принимает
  // динамические пути строкой — приводим их через тип самого register
  type FormPath = Parameters<typeof register>[0];
  const fieldPath = (path: string) => path as FormPath;

  const bidsArray = useFieldArray({ control, name: "bids" });

  const watched = useWatch({ control }) as Partial<BidEvaluation> | undefined;
  const evaluation = normalizeEvaluation({
    ...initial,
    ...(watched ?? {}),
  } as Partial<BidEvaluation>);

  const issues = validateBidEvaluation(evaluation);
  const applies = pp2604Applies(evaluation.procedureKind);
  // Аукцион и запрос котировок Положением N 2604 не оцениваются
  const result = applies ? evaluateBids(evaluation) : null;

  const limits = objectCategoryLimits(evaluation.objectCategory);
  const categoryDetection = detectObjectCategory(evaluation.okpd2Codes);
  const legalActs = acts.filter(
    (act) =>
      String(act.id) === BID_EVALUATION_LEGAL_ACT_ID ||
      String(act.actNumber ?? "").includes("2604"),
  );

  const enabledCriteria = evaluation.criteria.filter(
    (criterion) => criterion.enabled,
  );

  // Колонки заявок: по показателю на каждый включённый нестоимостной критерий
  const bidColumns = (applies ? evaluation.criteria : []).flatMap(
    (criterion, criterionIndex) =>
      criterion.enabled && criterion.type !== "price"
        ? criterion.indicators
            .filter((indicator) => parseNumber(indicator.weightPercent) > 0)
            .map((indicator) => ({
              criterionIndex,
              indicator,
              indicatorId: String(indicator.id ?? indicator.name),
            }))
        : [],
  );

  const bidGridStyle = {
    gridTemplateColumns: `minmax(170px, 1.4fr) 130px ${bidColumns
      .map(() => "minmax(120px, 1fr)")
      .join(" ")} 90px 70px 32px`,
  };

  const criterionError = (index: number, key: string): string | undefined => {
    const criteria = (errors as unknown as { criteria?: FieldErrorMap[] })
      .criteria;

    return criteria?.[index]?.[key]?.message;
  };

  const indicatorError = (
    criterionIndex: number,
    indicatorIndex: number,
    key: string,
  ): string | undefined => {
    const criteria = (
      errors as unknown as {
        criteria?: { indicators?: FieldErrorMap[] }[];
      }
    ).criteria;

    return criteria?.[criterionIndex]?.indicators?.[indicatorIndex]?.[key]
      ?.message;
  };

  const bidError = (index: number, key: string): string | undefined => {
    const bids = (errors as unknown as { bids?: FieldErrorMap[] }).bids;

    return bids?.[index]?.[key]?.message;
  };

  function updateIndicators(
    criterionIndex: number,
    updater: (items: Indicator[]) => Indicator[],
  ) {
    const current = (getValues(
      fieldPath(`criteria.${criterionIndex}.indicators`),
    ) ?? []) as Indicator[];

    setValue(
      fieldPath(`criteria.${criterionIndex}.indicators`),
      updater(current) as never,
      { shouldDirty: true },
    );
  }

  function addIndicator(criterionIndex: number) {
    const criterion = evaluation.criteria[criterionIndex];
    const kind = indicatorKindsByCriterion[criterion.type][0] ?? "quality";

    updateIndicators(criterionIndex, (items) => [
      ...items,
      emptyIndicator(kind),
    ]);
  }

  function removeIndicator(criterionIndex: number, indicatorIndex: number) {
    updateIndicators(criterionIndex, (items) =>
      items.filter((_, index) => index !== indicatorIndex),
    );
  }

  function onSubmit(data: BidEvaluation) {
    const normalized = normalizeEvaluation(data);
    const evaluated = evaluateBids(normalized);

    const payload: BidEvaluation = {
      ...normalized,
      bids: normalized.bids.map((bid, index) => ({
        ...bid,
        totalScore: evaluated.bids[index]?.totalScore ?? 0,
        rank: evaluated.bids[index]?.rank ?? 0,
      })),
      updatedAt: today(),
    };

    if (source?.id) {
      updateEvaluation.mutate(
        { id: source.id, ...payload },
        { onSuccess: onClose },
      );

      return;
    }

    createEvaluation.mutate(payload, { onSuccess: onClose });
  }

  const renderIndicators = (criterion: Criterion, criterionIndex: number) => {
    const allowedKinds = indicatorKindsByCriterion[criterion.type];

    if (criterion.type === "price") {
      return (
        <p className={block("hint")}>
          По критерию «цена» показатели оценки не применяются (п. 11 Положения):
          баллы считаются по формулам п. 9 или 10.
        </p>
      );
    }

    return (
      <div className={block("indicators")}>
        <div className={block("indicator-row", ["head"])}>
          <span>Показатель оценки</span>
          <span>Вид</span>
          <span>Значимость, %</span>
          <span>Ед. изм.</span>
          <span>Лучшее значение</span>
          <span>Способ оценки</span>
          <span>Предел min</span>
          <span>Предел max</span>
          <span />
        </div>

        {criterion.indicators.length === 0 && (
          <p className={block("hint")}>
            Показатели не заданы. Для критерия нужен хотя бы один показатель,
            сумма значимости показателей — 100% (п. 7 Положения).
          </p>
        )}

        {criterion.indicators.map((indicator, indicatorIndex) => {
          const prefix = `criteria.${criterionIndex}.indicators.${indicatorIndex}`;

          return (
            <div key={String(indicator.id ?? indicatorIndex)}>
              <div className={block("indicator-row")}>
                <div className={block("cell")}>
                  <input
                    className={block("input")}
                    {...register(fieldPath(`${prefix}.name`))}
                    placeholder="Наименование показателя"
                  />
                  {indicatorError(criterionIndex, indicatorIndex, "name") && (
                    <span className={block("error")}>
                      {indicatorError(criterionIndex, indicatorIndex, "name")}
                    </span>
                  )}
                </div>

                <select
                  className={block("input")}
                  {...register(fieldPath(`${prefix}.kind`))}
                >
                  {allowedKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {indicatorKindLabels[kind]}
                    </option>
                  ))}
                </select>

                <input
                  className={block("input")}
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  {...register(fieldPath(`${prefix}.weightPercent`))}
                />

                <input
                  className={block("input")}
                  {...register(fieldPath(`${prefix}.unit`))}
                  placeholder="руб."
                />

                <select
                  className={block("input")}
                  {...register(fieldPath(`${prefix}.best`))}
                >
                  {BEST_DIRECTIONS.map((direction) => (
                    <option key={direction} value={direction}>
                      {bestDirectionLabels[direction]}
                    </option>
                  ))}
                </select>

                <select
                  className={block("input")}
                  {...register(fieldPath(`${prefix}.scoring`))}
                >
                  {SCORING_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {scoringModeLabels[mode]}
                    </option>
                  ))}
                </select>

                <input
                  className={block("input")}
                  type="number"
                  step="0.01"
                  {...register(fieldPath(`${prefix}.limitMin`))}
                  placeholder="—"
                />

                <input
                  className={block("input")}
                  type="number"
                  step="0.01"
                  {...register(fieldPath(`${prefix}.limitMax`))}
                  placeholder="—"
                />

                <button
                  type="button"
                  className={block("remove")}
                  onClick={() =>
                    removeIndicator(criterionIndex, indicatorIndex)
                  }
                  aria-label="Удалить показатель"
                  title="Удалить показатель"
                >
                  ✕
                </button>
              </div>

              {indicator.scoring === "scale" && (
                <div className={block("scale")}>
                  <label
                    className={block("label")}
                    htmlFor={`scale-${criterionIndex}-${indicatorIndex}`}
                  >
                    Шкала оценки: по строке «свойство = баллы»
                  </label>
                  <textarea
                    id={`scale-${criterionIndex}-${indicatorIndex}`}
                    className={block("textarea")}
                    rows={3}
                    {...register(fieldPath(`${prefix}.scaleText`))}
                    placeholder={
                      "соответствует требованиям = 100\nне соответствует = 0"
                    }
                  />
                  <span className={block("hint")}>
                    Шагов в шкале: {parseScaleText(indicator.scaleText).length}.
                    Оценка наличия/отсутствия — 100 и 0 баллов (п. 23
                    Положения).
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className={block("add")}
          onClick={() => addIndicator(criterionIndex)}
        >
          + Добавить показатель
        </button>
      </div>
    );
  };

  return (
    <CustomModal onClose={onClose}>
      <form className={block()} onSubmit={handleSubmit(onSubmit)}>
        <header className={block("header")}>
          <h2 className={block("title")}>
            {source?.id ? "Оценка заявок" : "Новая оценка заявок"}
          </h2>
          <p className={block("caption")}>
            ПП РФ от 31.12.2021 № 2604: критерии, показатели, значимость и
            расчёт баллов
          </p>
        </header>

        <fieldset className={block("section")}>
          <legend>Закупка</legend>
          <div className={block("grid")}>
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="evaluation-object">
                Объект закупки
              </label>
              <input
                id="evaluation-object"
                className={block("input")}
                {...register("objectName")}
                placeholder="Наименование объекта закупки"
              />
              {errors.objectName?.message && (
                <span className={block("error")}>
                  {errors.objectName.message}
                </span>
              )}
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="evaluation-okpd2">
                Коды ОКПД2 объектов закупки (через запятую)
              </label>
              <input
                id="evaluation-okpd2"
                className={block("input")}
                defaultValue={evaluation.okpd2Codes.join(", ")}
                placeholder="41.20.40, 43.31.10"
                onChange={(event) =>
                  setValue(
                    "okpd2Codes",
                    event.target.value
                      .split(/[,;\s]+/)
                      .map((code) => normalizeOkpd2Code(code))
                      .filter(Boolean),
                    { shouldDirty: true },
                  )
                }
              />
              <span className={block("hint")}>
                По кодам определяется категория приложения N 2 и проверяется
                аукционный перечень (РП РФ N 471-р).
              </span>
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="evaluation-category">
                Категория объекта (приложение № 2)
              </label>
              <select
                id="evaluation-category"
                className={block("input")}
                {...register("objectCategory")}
              >
                {OBJECT_CATEGORY_LIMITS.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              <span className={block("hint")}>
                Цена — не менее {limits.minPrice}%, расходы —{" "}
                {limits.maxExpenses === null
                  ? "не применяются"
                  : `не более ${limits.maxExpenses}%`}
                , характеристики и квалификация — не более {limits.maxNonCost}%.
              </span>
              {categoryDetection.matches.length > 0 && (
                <span className={block("hint")}>
                  По ОКПД2:{" "}
                  {categoryDetection.matches
                    .map(
                      (match) =>
                        `${match.code} → ${
                          match.category
                            ? objectCategoryLimits(match.category).label
                            : "правило не найдено"
                        }`,
                    )
                    .join("; ")}
                </span>
              )}
              {categoryDetection.category &&
                categoryDetection.category !== evaluation.objectCategory && (
                  <button
                    type="button"
                    className={block("add")}
                    onClick={() =>
                      setValue(
                        "objectCategory",
                        categoryDetection.category as never,
                      )
                    }
                  >
                    Применить категорию по ОКПД2
                  </button>
                )}
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="evaluation-procedure">
                Способ определения поставщика
              </label>
              <select
                id="evaluation-procedure"
                className={block("input")}
                {...register("procedureKind", {
                  onChange: (event) => {
                    const kind = event.target.value as ProcedureKind;

                    if (pp2604Applies(kind)) {
                      return;
                    }

                    // Аукцион и запрос котировок: Положение не применяется,
                    // оценивается только цена
                    setValue("criteria.0.enabled", true);
                    setValue("criteria.0.weightPercent", 100);
                    setValue("criteria.1.enabled", false);
                    setValue("criteria.2.enabled", false);
                    setValue("criteria.3.enabled", false);
                  },
                })}
              >
                {PROCEDURE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {procedureKindLabels[kind]}
                  </option>
                ))}
              </select>
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="evaluation-nmck">
                НМЦК, ₽
              </label>
              <input
                id="evaluation-nmck"
                className={block("input")}
                {...register("nmck")}
                placeholder="0.00"
              />
              <span className={block("hint")}>
                База для формул п. 9 «б» и п. 10 Положения.
              </span>
            </div>

            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="evaluation-act">
                Норма — оценка заявок
              </label>
              <select
                id="evaluation-act"
                className={block("input")}
                {...register("legalActId")}
              >
                <option value="">Не указана</option>
                {legalActs.map((act) => (
                  <option key={String(act.id)} value={String(act.id)}>
                    {formatLegalAct(act)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Критерии и показатели оценки</legend>

          {!applies && (
            <p className={block("hint")}>
              {procedureApplicabilityHint[evaluation.procedureKind]}
            </p>
          )}

          {evaluation.criteria.map((criterion, criterionIndex) => {
            if (!applies && criterion.type !== "price") {
              return null;
            }

            return (
              <div className={block("criterion")} key={criterion.type}>
                <div className={block("criterion-head")}>
                  <label className={block("criterion-toggle")}>
                    <input
                      type="checkbox"
                      disabled={!applies}
                      {...register(`criteria.${criterionIndex}.enabled`)}
                    />
                    <span>{criterionShortLabels[criterion.type]}</span>
                  </label>

                  <div className={block("criterion-weight")}>
                    <label
                      className={block("label")}
                      htmlFor={`criterion-weight-${criterionIndex}`}
                    >
                      Значимость, %
                    </label>
                    <input
                      id={`criterion-weight-${criterionIndex}`}
                      className={block("input", ["narrow"])}
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      disabled={!applies}
                      {...register(`criteria.${criterionIndex}.weightPercent`)}
                    />
                  </div>

                  {criterion.enabled && (
                    <span className={block("criterion-note")}>
                      {criterionLabelsHint(criterion.type)}
                    </span>
                  )}
                </div>

                {criterionError(criterionIndex, "weightPercent") && (
                  <span className={block("error")}>
                    {criterionError(criterionIndex, "weightPercent")}
                  </span>
                )}

                {criterion.enabled &&
                  renderIndicators(criterion, criterionIndex)}
              </div>
            );
          })}

          {applies && (
            <div className={block("weights")}>
              <span>
                Сумма значимости критериев:{" "}
                <strong>
                  {enabledCriteria
                    .reduce(
                      (total, criterion) =>
                        total + parseNumber(criterion.weightPercent),
                      0,
                    )
                    .toFixed(2)}
                  %
                </strong>{" "}
                — должна быть 100% (п. 5, подп. «д» Положения)
              </span>
            </div>
          )}
        </fieldset>

        <fieldset className={block("section")}>
          <legend>Заявки участников</legend>

          {evaluation.bids.length === 0 && (
            <p className={block("hint")}>
              Заявок пока нет. Добавьте предложения участников — баллы
              посчитаются автоматически.
            </p>
          )}

          {evaluation.bids.length > 0 && (
            <div className={block("bids")}>
              <div className={block("bid-row", ["head"])} style={bidGridStyle}>
                <span>Участник</span>
                <span>Цена, ₽</span>
                {bidColumns.map((column) => (
                  <span key={`${column.criterionIndex}-${column.indicatorId}`}>
                    {column.indicator.name || "Показатель"}
                    {column.indicator.unit ? `, ${column.indicator.unit}` : ""}
                  </span>
                ))}
                <span>Итог, баллов</span>
                <span>Место</span>
                <span />
              </div>

              {evaluation.bids.map((bid, bidIndex) => (
                <div
                  className={block("bid-row")}
                  key={String(bid.id ?? bidIndex)}
                  style={bidGridStyle}
                >
                  <div className={block("cell")}>
                    <input
                      className={block("input")}
                      {...register(`bids.${bidIndex}.participantName`)}
                      placeholder="Наименование участника"
                    />
                    {bidError(bidIndex, "participantName") && (
                      <span className={block("error")}>
                        {bidError(bidIndex, "participantName")}
                      </span>
                    )}
                  </div>

                  <div className={block("cell")}>
                    <input
                      className={block("input")}
                      {...register(`bids.${bidIndex}.price`)}
                      placeholder="0.00"
                    />
                    {bidError(bidIndex, "price") && (
                      <span className={block("error")}>
                        {bidError(bidIndex, "price")}
                      </span>
                    )}
                  </div>

                  {bidColumns.map((column) => {
                    const valuePrefix = `bids.${bidIndex}.values.${column.indicatorId}`;
                    const indicator = column.indicator;

                    if (indicator.scoring === "scale") {
                      return (
                        <select
                          key={`${bidIndex}-${column.indicatorId}`}
                          className={block("input")}
                          {...register(fieldPath(`${valuePrefix}.optionId`))}
                        >
                          <option value="">—</option>
                          {parseScaleText(indicator.scaleText).map((step) => (
                            <option key={step.label} value={step.label}>
                              {step.label}
                            </option>
                          ))}
                        </select>
                      );
                    }

                    return (
                      <input
                        key={`${bidIndex}-${column.indicatorId}`}
                        className={block("input")}
                        {...register(fieldPath(`${valuePrefix}.value`))}
                        placeholder="0"
                      />
                    );
                  })}

                  <span className={block("score")}>
                    {result
                      ? money(result.bids[bidIndex]?.totalScore ?? 0)
                      : "—"}
                  </span>
                  <span className={block("rank")}>
                    {result?.bids[bidIndex]?.rank ?? "—"}
                  </span>

                  <button
                    type="button"
                    className={block("remove")}
                    onClick={() => bidsArray.remove(bidIndex)}
                    aria-label="Удалить заявку"
                    title="Удалить заявку"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className={block("add")}
            onClick={() =>
              bidsArray.append({
                participantName: "",
                price: "",
                values: {},
                totalScore: 0,
                rank: 0,
              } as Bid)
            }
          >
            + Добавить заявку
          </button>
        </fieldset>

        {issues.length > 0 && (
          <ul className={block("issues")}>
            {issues.map((issue, index) => (
              <li
                className={block("issue", [issue.level])}
                key={`${issue.level}-${index}`}
              >
                {issue.level === "error" ? "Ошибка: " : "Внимание: "}
                {issue.message}
              </li>
            ))}
          </ul>
        )}

        {mutationError && (
          <p className={block("alert")}>
            Не удалось сохранить оценку заявок. Проверьте соединение с сервером
            и повторите попытку.
          </p>
        )}

        <div className={block("footer")}>
          <button
            type="button"
            className={block("action")}
            onClick={onClose}
            disabled={isPending}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={block("action", ["primary"])}
            disabled={isPending}
          >
            {isPending ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </form>
    </CustomModal>
  );
}

// Подсказки по отдельным критериям: отсылки к разделам Положения
function criterionLabelsHint(type: Criterion["type"]): string {
  switch (type) {
    case "price":
      return "Баллы — по формулам п. 9 или 10; показатели не применяются";
    case "expenses":
      return "Только количественные значения; баллы — по формуле п. 14";
    case "characteristics":
      return "Показатели: качественные, функциональные, экологические; баллы — п. 20–23";
    case "qualification":
      return "Показатели: финансы, оборудование, опыт, репутация, специалисты; баллы — п. 20–23, 26";
    default:
      return "";
  }
}
