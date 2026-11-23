import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import { useLegalActs } from "../../services/LegalAct/legalAct.api";
import { formatLegalAct } from "../../services/LegalAct/legalAct.schema";
import {
  ESTIMATE_METHODS,
  ESTIMATE_NORMATIVE_BASES,
  defectItemAmount,
  defectListStatusLabels,
  estimateMethodLabels,
  estimateNormativeBaseLabels,
  type DefectItem,
  type DefectList,
} from "../../services/DefectList/defectList.schema";
import {
  useOrganizationDefectLists,
  useUpdateDefectList,
} from "../../services/DefectList/defectList.api";
import {
  ContractEstimateDocumentSchema,
  canApproveEstimate,
  canEditEstimate,
  createEstimateFromDefect,
  emptyEstimateDocument,
  estimateDocumentStatusLabels,
  estimateNmckDelta,
  estimateNmckTotal,
  estimateScheduleDelta,
  estimateScheduleTotal,
  estimateTotals,
  findEstimateForDefect,
  isEstimateScheduleEmpty,
  isEstimateStale,
  rebuildEstimateSchedule,
  syncEstimateItemsFromDefect,
  syncScheduleFromDefect,
  todayIso,
  type ContractEstimateDocument,
  type EstimateActor,
} from "../../services/Estimate/estimate.schema";
import {
  useCreateEstimate,
  useEstimateDocument,
  useOrganizationEstimates,
  useUpdateEstimate,
} from "../../services/Estimate/estimate.api";
import {
  estimateValidationSummary,
  validateEstimateDocument,
} from "../../services/Estimate/estimate.validation";
import MarketNmckCalculator from "../Nmck/MarketNmckCalculator";
import styles from "./Estimate.module.scss";
import Select from "../UI/Select";

/**
 * Редактор сквозного документа «смета + обоснование НМЦК».
 *
 * Вкладки повторяют путь процесса:
 * 1) смета — позиции из дефектовки, накладные/прибыль/НДС (421/пр);
 * 2) график СМР и оплаты — этапы по разделам сметы (336/пр);
 * 3) обоснование НМЦК — встроенный калькулятор (ст. 22 44-ФЗ, приказ № 567);
 * 4) проверка — расхождения, связь с дефектовкой и утверждение в КС.
 */

type Tab = "estimate" | "schedule" | "nmck" | "checks";

const money = (value: number): string =>
  value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function EstimateEditorPage() {
  const { bem, formatDate, fullName } = useUtils();
  const block = bem(styles, "estimate-editor");

  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedDefectId = searchParams.get("defectListId") ?? "";

  const {
    organization,
    employee,
    isContractServiceMember,
    isHead,
    myFunctions,
  } = useMyContractRole();
  const orgId = organization?.id;

  const { data: existing, isLoading: isEstimateLoading } = useEstimateDocument(
    isNew ? undefined : id,
  );
  const { data: estimates = [] } = useOrganizationEstimates(orgId);
  const { data: defects = [], isLoading: areDefectsLoading } =
    useOrganizationDefectLists(orgId);
  const { data: acts = [] } = useLegalActs();

  const createEstimate = useCreateEstimate();
  const updateEstimate = useUpdateEstimate();
  const updateDefect = useUpdateDefectList();

  const [activeTab, setActiveTab] = useState<Tab>("estimate");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const author = useMemo(
    () => ({
      employeeId: employee?.id,
      employeeName: fullName(employee?.employee ?? {}),
      structuralUnitName: employee?.structuralUnit?.name ?? "",
    }),
    [
      employee?.id,
      employee?.employee,
      employee?.structuralUnit?.name,
      fullName,
    ],
  );

  const methods = useForm({
    resolver: zodResolver(ContractEstimateDocumentSchema),
    defaultValues: emptyEstimateDocument(orgId ?? "", author),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = methods;

  const itemsArray = useFieldArray({ control, name: "items" });
  const stagesArray = useFieldArray({ control, name: "schedule.stages" });
  const watched = useWatch({ control }) as Partial<ContractEstimateDocument>;

  const document = useMemo(
    () =>
      ({
        ...emptyEstimateDocument(orgId ?? "", author),
        ...watched,
      }) as ContractEstimateDocument,
    [orgId, author, watched],
  );

  // Инициализация нового документа из дефектовки.
  const newInitialisedRef = useRef(false);
  useEffect(() => {
    if (!isNew || newInitialisedRef.current) return;
    if (!requestedDefectId) return;

    const defect = defects.find(
      (item) => String(item.id) === String(requestedDefectId),
    );

    if (!defect) return;

    reset(createEstimateFromDefect(defect, author));
    newInitialisedRef.current = true;
  }, [isNew, requestedDefectId, defects, author, reset]);

  // Загрузка сохранённого документа (один раз на id).
  const loadedIdRef = useRef<string>("");
  useEffect(() => {
    if (!existing) return;
    const key = String(existing.id ?? "");
    if (loadedIdRef.current === key) return;

    loadedIdRef.current = key;
    reset(existing);
  }, [existing, reset]);

  const selectedDefect = useMemo(() => {
    const defectId = document.defectListId || requestedDefectId;
    if (!defectId) return undefined;

    return defects.find((item) => String(item.id) === String(defectId));
  }, [document.defectListId, requestedDefectId, defects]);

  const eligibleDefects = useMemo(
    () =>
      defects.filter((defect) => !findEstimateForDefect(estimates, defect.id)),
    [defects, estimates],
  );

  const totals = estimateTotals(document);
  const nmckTotal = estimateNmckTotal(document);
  const nmckDelta = estimateNmckDelta(document);
  const scheduleSum = estimateScheduleTotal(document);
  const scheduleDelta = estimateScheduleDelta(document);
  const issues = validateEstimateDocument(document, {
    defect: selectedDefect,
    checkDefect: Boolean(selectedDefect || document.defectListId),
  });
  const summary = estimateValidationSummary(issues);

  // Проверка «как будет после действия»: для передачи в КС НМЦК уже
  // обязательна, для утверждения — ещё и подпись.
  const validateAs = (status: "review" | "approved") =>
    estimateValidationSummary(
      validateEstimateDocument(
        {
          ...document,
          status,
          ...(status === "approved"
            ? {
                approvedAt: document.approvedAt || todayIso(),
                approvedBy: document.approvedBy || authorName,
              }
            : {}),
        },
        {
          defect: selectedDefect,
          checkDefect: Boolean(selectedDefect || document.defectListId),
        },
      ),
    );

  const reviewSummary = validateAs("review");
  const approvalSummary = validateAs("approved");

  const actor: EstimateActor = {
    employeeId: employee?.id,
    isContractServiceMember,
    isHead,
    myFunctions,
  };

  const canEdit = canEditEstimate(document, actor);
  const canApprove = canApproveEstimate(document, actor) && !isNew;
  const isReadOnly = !canEdit;
  const authorName =
    fullName(employee?.employee ?? {}) || document.authorName || "—";
  const formErrorCount = Object.keys(errors).length;
  const ministryOrders = acts.filter((act) => act.actType === "ministry-order");

  const linkDefect = (saved: ContractEstimateDocument) => {
    if (selectedDefect?.id === undefined) return;

    updateDefect.mutate({
      id: selectedDefect.id,
      estimateDocumentId: saved.id,
      estimate: saved.estimate,
    });
  };

  const persist = (
    values: ContractEstimateDocument,
    overrides: Partial<ContractEstimateDocument> = {},
    after?: (saved: ContractEstimateDocument) => void,
  ) => {
    const payload: ContractEstimateDocument = {
      ...values,
      organizationId: values.organizationId || orgId || "",
      updatedAt: todayIso(),
      ...overrides,
    };

    setActionError("");

    if (isNew) {
      createEstimate.mutate(payload, {
        onSuccess: (saved) => {
          linkDefect(saved);
          after?.(saved);
          navigate(`/estimates/${saved.id}`, { replace: true });
        },
        onError: () => {
          setActionError(
            "Смета не сохранена. Проверьте обязательные поля и повторите попытку.",
          );
        },
      });

      return;
    }

    updateEstimate.mutate(
      { id: id as string, ...payload },
      {
        onSuccess: (saved) => {
          linkDefect(saved);
          after?.(saved);
          setMessage("Смета сохранена.");
        },
        onError: () => {
          setActionError(
            "Изменения не сохранены. Проверьте обязательные поля и повторите попытку.",
          );
        },
      },
    );
  };

  const onSubmit = handleSubmit((data) => {
    if (isReadOnly) return;
    persist(data as ContractEstimateDocument);
  });

  const handleRefreshFromDefect = () => {
    if (!selectedDefect || isReadOnly) return;

    reset(
      syncEstimateItemsFromDefect(
        getValues() as ContractEstimateDocument,
        selectedDefect,
      ),
    );
    setMessage(
      "Позиции обновлены из дефектовки. Настройки сметы и обоснование НМЦК сохранены.",
    );
  };

  const handleRebuildSchedule = () => {
    if (isReadOnly) return;

    reset(rebuildEstimateSchedule(getValues() as ContractEstimateDocument));
    setMessage(
      "Этапы графика сформированы из сметы: разделы стали этапами, сумма этапов равна итогу сметы (336/пр).",
    );
  };

  const handleScheduleFromDefect = () => {
    if (!selectedDefect || isReadOnly) return;

    reset(
      syncScheduleFromDefect(
        getValues() as ContractEstimateDocument,
        selectedDefect,
      ),
    );
    setMessage(
      "График перенесён из дефектовки. Суммы этапов сверены со сметой.",
    );
  };

  const handleSendToReview = () => {
    if (!canEdit) return;

    if (!reviewSummary.canSubmit) {
      setActionError(
        "Перед передачей в КС устраните ошибки проверки: без них смету нельзя согласовать.",
      );
      return;
    }

    persist(
      getValues() as ContractEstimateDocument,
      { status: "review" },
      () => {
        setMessage("Смета передана в контрактную службу на проверку.");
      },
    );
  };

  const handleApprove = () => {
    if (!canApprove) return;

    if (!approvalSummary.canSubmit) {
      setActionError("Утверждение заблокировано: есть ошибки проверки.");
      return;
    }

    persist(
      getValues() as ContractEstimateDocument,
      {
        status: "approved",
        approvedAt: todayIso(),
        approvedBy: authorName,
      },
      (saved) => {
        if (selectedDefect?.id !== undefined) {
          updateDefect.mutate({
            id: selectedDefect.id,
            estimateDocumentId: saved.id,
            estimate: saved.estimate,
            status: "accepted",
            reviewedAt: todayIso(),
            reviewComment: `Смета и обоснование НМЦК утверждены: ${saved.approvedBy ?? ""}`,
          });
        }
        setMessage("Смета и обоснование НМЦК утверждены.");
      },
    );
  };

  const handleReturn = () => {
    if (!canApprove) return;

    const values = getValues() as ContractEstimateDocument;

    persist(values, { status: "returned" }, (saved) => {
      if (selectedDefect?.id !== undefined) {
        updateDefect.mutate({
          id: selectedDefect.id,
          estimateDocumentId: saved.id,
          estimate: saved.estimate,
          status: "returned",
          reviewedAt: todayIso(),
          reviewComment:
            values.reviewComment || "Смета возвращена на доработку.",
        });
      }
      setMessage(
        "Смета возвращена на доработку, дефектовка получила статус «Возвращено».",
      );
    });
  };

  const defectOptions = (defect: DefectList) =>
    `${defect.objectName || "Объект без названия"} · ${defect.items.length} поз. · ${defectListStatusLabels[defect.status]}`;

  if (!isNew && isEstimateLoading) {
    return <p className={block("subtitle")}>Загрузка сметы…</p>;
  }

  if (!isNew && !existing) {
    return (
      <main className={block()}>
        <p className={block("subtitle")}>
          Смета не найдена.{" "}
          <Link className={block("link")} to="/estimates">
            Вернуться к реестру
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <Link className={block("back")} to="/estimates">
            ← Сметы и НМЦК
          </Link>
          <h1 className={block("title")}>
            {document.objectName || "Смета и обоснование НМЦК"}
          </h1>
          <p className={block("subtitle")}>
            {isNew
              ? "Новый документ: позиции и настройки переносятся из дефектовки."
              : `Автор: ${document.authorName || "—"} · обновлено ${formatDate(document.updatedAt) || "—"}`}
          </p>
        </div>

        <div className={block("header-main")}>
          <span className={block("badge", [document.status])}>
            {estimateDocumentStatusLabels[document.status]}
          </span>
          <span className={block("status-note")}>
            {summary.errors > 0
              ? `Ошибок: ${summary.errors}, предупреждений: ${summary.warnings}`
              : summary.warnings > 0
                ? `Предупреждений: ${summary.warnings}`
                : "Проверки пройдены"}
          </span>
        </div>
      </header>

      {message && <p className={block("hint")}>{message}</p>}
      {actionError && (
        <p className={block("issue", ["error"])} role="alert">
          {actionError}
        </p>
      )}

      {isNew && !selectedDefect && (
        <fieldset className={block("section")}>
          <legend>Шаг 1. Выберите дефектовку</legend>
          {areDefectsLoading ? (
            <p className={block("hint")}>Загрузка дефектовок…</p>
          ) : eligibleDefects.length === 0 ? (
            <p className={block("hint")}>
              Нет дефектовок без сметы. Создайте дефектовку в разделе{" "}
              <Link className={block("link")} to="/defect-lists">
                «Дефектовки»
              </Link>
              , затем вернитесь сюда.
            </p>
          ) : (
            <ul className={block("issues")}>
              {eligibleDefects.map((defect) => (
                <li className={block("issue")} key={String(defect.id)}>
                  <button
                    type="button"
                    className={block("secondary")}
                    onClick={() =>
                      navigate(
                        `/estimates/new?defectListId=${String(defect.id)}`,
                        { replace: true },
                      )
                    }
                  >
                    {defectOptions(defect)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}

      {(selectedDefect || !isNew) && (
        <>
          <nav className={block("tabs")} aria-label="Разделы сметы">
            <button
              type="button"
              className={block("tab", [
                activeTab === "estimate" ? "active" : "",
              ])}
              onClick={() => setActiveTab("estimate")}
            >
              1. Смета
            </button>
            <button
              type="button"
              className={block("tab", [
                activeTab === "schedule" ? "active" : "",
              ])}
              onClick={() => setActiveTab("schedule")}
            >
              2. График СМР (336/пр)
            </button>
            <button
              type="button"
              className={block("tab", [activeTab === "nmck" ? "active" : ""])}
              onClick={() => setActiveTab("nmck")}
            >
              3. Обоснование НМЦК
            </button>
            <button
              type="button"
              className={block("tab", [activeTab === "checks" ? "active" : ""])}
              onClick={() => setActiveTab("checks")}
            >
              4. Проверка и утверждение
            </button>
          </nav>

          <form onSubmit={onSubmit}>
            {activeTab === "estimate" && (
              <>
                <fieldset className={block("section")} disabled={isReadOnly}>
                  <legend>Параметры проекта сметы</legend>

                  <div className={block("grid")}>
                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor="estimate-method"
                      >
                        Метод
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
                      <label
                        className={block("label")}
                        htmlFor="estimate-price-level"
                      >
                        Уровень цен
                      </label>
                      <input
                        id="estimate-price-level"
                        className={block("input")}
                        placeholder="IV квартал 2026"
                        {...register("estimate.priceLevel")}
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
                      <span className={block("hint")}>
                        Смета контракта считается по методике Минстроя России №
                        421/пр от 04.08.2020; акт хранится в реестре
                        законодательных актов.
                      </span>
                    </div>

                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor="estimate-overhead"
                      >
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
                      <label
                        className={block("label")}
                        htmlFor="estimate-profit"
                      >
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
                </fieldset>

                <fieldset className={block("section")} disabled={isReadOnly}>
                  <legend>Позиции сметы (из дефектовки)</legend>

                  <div className={block("table")}>
                    <div className={block("row", ["head"])}>
                      <span>Раздел</span>
                      <span>Шифр ГЭСН/ФЕР</span>
                      <span>Вид работ</span>
                      <span>Ед.</span>
                      <span>Кол-во</span>
                      <span>Цена, ₽</span>
                      <span>Сумма, ₽</span>
                      <span />
                    </div>

                    {itemsArray.fields.length === 0 && (
                      <p className={block("hint")}>
                        Позиций нет. Добавьте работы вручную или обновите
                        документ из дефектовки.
                      </p>
                    )}

                    {itemsArray.fields.map((field, index) => {
                      const item = document.items[index] ?? ({} as DefectItem);

                      return (
                        <div key={field.id} className={block("row")}>
                          <input
                            className={block("input")}
                            placeholder="Раздел"
                            {...register(`items.${index}.section`)}
                          />
                          <input
                            className={block("input")}
                            placeholder="ГЭСН/ФЕР"
                            {...register(`items.${index}.normCode`)}
                          />
                          <div className={block("cell")}>
                            <input
                              className={block("input")}
                              placeholder="Вид работ"
                              {...register(`items.${index}.name`)}
                            />
                          </div>
                          <input
                            className={block("input")}
                            placeholder="ед."
                            {...register(`items.${index}.unit`)}
                          />
                          <input
                            className={block("input")}
                            placeholder="0"
                            inputMode="decimal"
                            {...register(`items.${index}.quantity`)}
                          />
                          <input
                            className={block("input")}
                            placeholder="0.00"
                            inputMode="decimal"
                            {...register(`items.${index}.unitPrice`)}
                          />
                          <span className={block("amount")}>
                            {money(defectItemAmount(item))}
                          </span>
                          <button
                            type="button"
                            className={block("remove")}
                            aria-label="Удалить позицию"
                            title="Удалить позицию"
                            onClick={() => itemsArray.remove(index)}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className={block("row-footer")}>
                    <div className={block("actions")}>
                      <button
                        type="button"
                        className={block("secondary")}
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

                      {selectedDefect && (
                        <button
                          type="button"
                          className={block("secondary")}
                          onClick={handleRefreshFromDefect}
                        >
                          Обновить из дефектовки
                        </button>
                      )}
                    </div>

                    <span className={block("hint")}>
                      Прямые затраты: {money(totals.directCost)} ₽
                    </span>
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
              </>
            )}

            {activeTab === "schedule" && (
              <>
                <fieldset className={block("section")} disabled={isReadOnly}>
                  <legend>Период выполнения работ и основание</legend>

                  <div className={block("grid")}>
                    <div className={block("field")}>
                      <label
                        className={block("label")}
                        htmlFor="schedule-start"
                      >
                        Начало работ
                      </label>
                      <input
                        id="schedule-start"
                        type="date"
                        className={block("input")}
                        {...register("schedule.plannedStart")}
                      />
                    </div>

                    <div className={block("field")}>
                      <label className={block("label")} htmlFor="schedule-end">
                        Окончание работ
                      </label>
                      <input
                        id="schedule-end"
                        type="date"
                        className={block("input")}
                        {...register("schedule.plannedEnd")}
                      />
                    </div>

                    <div className={block("field", ["wide"])}>
                      <label className={block("label")} htmlFor="schedule-act">
                        Норма — методика графика СМР и оплаты
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
                      <span className={block("hint")}>
                        График составляется по методике Минстроя России № 336/пр
                        от 05.06.2018: этапы — разделы сметы, сумма этапов равна
                        итогу сметы.
                      </span>
                    </div>
                  </div>

                  <div className={block("actions")}>
                    <button
                      type="button"
                      className={block("secondary")}
                      onClick={handleRebuildSchedule}
                      disabled={isReadOnly || document.items.length === 0}
                      title={
                        document.items.length === 0
                          ? "Сначала добавьте позиции в смету"
                          : undefined
                      }
                    >
                      Сформировать этапы из сметы
                    </button>

                    {selectedDefect && (
                      <button
                        type="button"
                        className={block("secondary")}
                        onClick={handleScheduleFromDefect}
                        disabled={isReadOnly}
                      >
                        Перенести из дефектовки
                      </button>
                    )}

                    <span className={block("hint")}>
                      Этапы собираются из разделов сметы; остаток округления
                      забирает последний этап.
                    </span>
                  </div>
                </fieldset>

                <fieldset className={block("section")} disabled={isReadOnly}>
                  <legend>Этапы графика</legend>

                  <div className={block("table")}>
                    <div className={block("row", ["head", "schedule"])}>
                      <span>Этап</span>
                      <span>Начало</span>
                      <span>Окончание</span>
                      <span>Сумма, ₽</span>
                      <span />
                    </div>

                    {stagesArray.fields.length === 0 && (
                      <p className={block("hint")}>
                        Этапов нет. Сформируйте их из сметы или добавьте вручную
                        — суммы должны сойтись с итогом сметы.
                      </p>
                    )}

                    {stagesArray.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className={block("row", ["schedule"])}
                      >
                        <input
                          className={block("input")}
                          placeholder="Наименование этапа"
                          {...register(`schedule.stages.${index}.name`)}
                        />
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
                        <input
                          className={block("input")}
                          placeholder="0.00"
                          inputMode="decimal"
                          {...register(`schedule.stages.${index}.amount`)}
                        />
                        <button
                          type="button"
                          className={block("remove")}
                          aria-label="Удалить этап"
                          title="Удалить этап"
                          onClick={() => stagesArray.remove(index)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={block("row-footer")}>
                    <div className={block("actions")}>
                      <button
                        type="button"
                        className={block("secondary")}
                        onClick={() =>
                          stagesArray.append({
                            name: "",
                            startDate: document.schedule.plannedStart ?? "",
                            endDate: document.schedule.plannedEnd ?? "",
                            amount: "",
                          })
                        }
                      >
                        + Добавить этап
                      </button>
                    </div>

                    <span className={block("hint")}>
                      Сумма этапов: {money(scheduleSum)} ₽
                    </span>
                  </div>

                  <dl className={block("totals")}>
                    <div>
                      <dt>Итог сметы</dt>
                      <dd>{money(totals.total)} ₽</dd>
                    </div>
                    <div>
                      <dt>Сумма этапов</dt>
                      <dd>{money(scheduleSum)} ₽</dd>
                    </div>
                    <div
                      className={block("totals-row", [
                        Math.abs(scheduleDelta) > 0.01 ? "warning" : "total",
                      ])}
                    >
                      <dt>Расхождение</dt>
                      <dd>{money(Math.abs(scheduleDelta))} ₽</dd>
                    </div>
                  </dl>

                  <p className={block("hint")}>
                    {isEstimateScheduleEmpty(document)
                      ? "График не составлен: для строительных закупок он обязателен по 336/пр."
                      : Math.abs(scheduleDelta) > 0.01
                        ? "Сумма этапов не сходится со сметой — устраните расхождение до утверждения."
                        : "Суммы сходятся: график соответствует смете (336/пр)."}
                  </p>
                </fieldset>
              </>
            )}

            {activeTab === "nmck" && (
              <fieldset className={block("section")}>
                <legend>Обоснование НМЦК</legend>

                {nmckTotal !== null && (
                  <dl className={block("totals")}>
                    <div>
                      <dt>НМЦК</dt>
                      <dd>{money(nmckTotal)} ₽</dd>
                    </div>
                    <div>
                      <dt>Итог сметы</dt>
                      <dd>{money(totals.total)} ₽</dd>
                    </div>
                    <div
                      className={block("totals-row", [
                        nmckDelta !== null && Math.abs(nmckDelta) > 0.01
                          ? "warning"
                          : "total",
                      ])}
                    >
                      <dt>Расхождение</dt>
                      <dd>
                        {nmckDelta === null
                          ? "—"
                          : `${money(Math.abs(nmckDelta))} ₽`}
                      </dd>
                    </div>
                  </dl>
                )}

                <MarketNmckCalculator
                  embedded
                  initialRecord={document.nmck?.record ?? null}
                  defaultSubject={document.objectName || ""}
                  defaultQuantity="1"
                  defaultUnit="компл."
                  defaultCalculatorName={authorName}
                  organization={organization ?? null}
                  canUpdatePlanAmount={false}
                  disabled={isReadOnly}
                  isSaving={updateEstimate.isPending}
                  saveButtonLabel="Сохранить обоснование в смету"
                  onSaveToPosition={({ record, basisText }) => {
                    if (isReadOnly) return;

                    setValue("nmck", {
                      method: record.method,
                      record,
                      basisText,
                      calculatedAt: record.calculatedAt,
                      calculatedBy: record.calculatorName,
                    });
                    setMessage(
                      "Обоснование НМЦК рассчитано. Сохраните смету, чтобы зафиксировать его.",
                    );
                    setActiveTab("checks");
                  }}
                  onClose={() => setActiveTab("estimate")}
                />
              </fieldset>
            )}

            {activeTab === "checks" && (
              <>
                <fieldset className={block("section")}>
                  <legend>Связь с дефектовкой</legend>

                  {selectedDefect ? (
                    <>
                      <dl className={block("totals")}>
                        <div>
                          <dt>Дефектовка</dt>
                          <dd>
                            {selectedDefect.objectName || "объект без названия"}
                          </dd>
                        </div>
                        <div>
                          <dt>Статус</dt>
                          <dd>
                            {defectListStatusLabels[selectedDefect.status]}
                          </dd>
                        </div>
                        <div>
                          <dt>Позиций</dt>
                          <dd>
                            {selectedDefect.items.length} /{" "}
                            {document.items.length}
                          </dd>
                        </div>
                        <div>
                          <dt>Актуальность</dt>
                          <dd>
                            {isEstimateStale(document, selectedDefect)
                              ? "дефектовка изменена"
                              : "актуально"}
                          </dd>
                        </div>
                        <div>
                          <dt>График 336/пр</dt>
                          <dd>
                            {isEstimateScheduleEmpty(document)
                              ? "не составлен"
                              : `${document.schedule.stages.length} эт. · ${money(scheduleSum)} ₽`}
                          </dd>
                        </div>
                      </dl>

                      <div className={block("actions")}>
                        <Link className={block("link")} to="/defect-lists">
                          Открыть дефектовку
                        </Link>
                        <button
                          type="button"
                          className={block("secondary")}
                          onClick={handleRefreshFromDefect}
                          disabled={isReadOnly}
                        >
                          Обновить из дефектовки
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className={block("hint")}>
                      {document.defectListId
                        ? "Связанная дефектовка не найдена в организации."
                        : "Смета не связана с дефектовкой — объёмы введены вручную."}
                    </p>
                  )}
                </fieldset>

                <fieldset className={block("section")}>
                  <legend>Проверки</legend>

                  {formErrorCount > 0 && (
                    <p className={block("issue", ["error"])}>
                      В форме есть незаполненные или некорректные поля (
                      {formErrorCount}). Проверьте разделы «Смета» и
                      «Обоснование НМЦК».
                    </p>
                  )}

                  {issues.length === 0 ? (
                    <p className={block("hint")}>
                      Ошибок и предупреждений нет: смета сходится с НМЦК,
                      дефектовка актуальна.
                    </p>
                  ) : (
                    <ul className={block("issues")}>
                      {issues.map((issue) => (
                        <li
                          key={`${issue.code}-${issue.field ?? ""}`}
                          className={block("issue", [issue.level])}
                        >
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </fieldset>

                <fieldset className={block("section")} disabled={isReadOnly}>
                  <legend>Согласование</legend>

                  <div className={block("field", ["wide"])}>
                    <label
                      className={block("label")}
                      htmlFor="estimate-review-comment"
                    >
                      Комментарий контрактной службы
                    </label>
                    <input
                      id="estimate-review-comment"
                      className={block("input")}
                      placeholder="Например: проверить объёмы по разделу 2…"
                      {...register("reviewComment")}
                    />
                  </div>

                  <div className={block("actions")}>
                    <button
                      type="submit"
                      className={block("primary")}
                      disabled={isReadOnly}
                    >
                      {createEstimate.isPending || updateEstimate.isPending
                        ? "Сохранение…"
                        : "Сохранить"}
                    </button>

                    <button
                      type="button"
                      className={block("secondary")}
                      onClick={handleSendToReview}
                      disabled={isReadOnly}
                    >
                      Передать в КС
                    </button>

                    <button
                      type="button"
                      className={block("primary")}
                      onClick={handleApprove}
                      disabled={!canApprove}
                      title={
                        canApprove
                          ? undefined
                          : "Утверждает руководитель КС или работник с функцией описания объекта / НМЦК"
                      }
                    >
                      Утвердить
                    </button>

                    <button
                      type="button"
                      className={block("secondary")}
                      onClick={handleReturn}
                      disabled={!canApprove}
                    >
                      Вернуть на доработку
                    </button>
                  </div>

                  {document.status === "approved" && (
                    <p className={block("status-note")}>
                      Утверждено {formatDate(document.approvedAt) || "—"}
                      {document.approvedBy ? ` · ${document.approvedBy}` : ""}
                    </p>
                  )}
                </fieldset>
              </>
            )}
          </form>
        </>
      )}
    </main>
  );
}
