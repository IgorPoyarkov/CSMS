import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ContractProjectSchema,
  emptyContractProject,
  sectionCompletion,
  MANDATORY_TERMS,
  conclusionDeadline,
  type ContractProject,
} from "../../services/ContractProject/contractProject.schema";
import {
  useCreateContractProject,
  useContractProject,
  useUpdateContractProject,
} from "../../services/ContractProject/contractProject.api";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import styles from "./ContractProject.module.scss";

// ─── Типы полей формы (плоские) ────────────────────────────────────────────

interface FlatForm {
  contractName: string;
  ikz: string;
  noticeNumber: string;
  customerName: string;
  supplierName: string;
  projectDate: string;
  conclusionDate: string;
  protocolOfDisagreements: boolean;
  // subject
  objectName: string;
  description: string;
  okpd2Code: string;
  kved2Code: string;
  quantity: string;
  deliveryPlace: string;
  // price
  initialMaxPrice: string;
  finalPrice: string;
  priceBasis: string;
  priceIncludesExpenses: boolean;
  paymentProcedure: string;
  advancePercent: string;
  paymentTermDays: string;
  // term
  startDate: string;
  endDate: string;
  validUntil: string;
  acceptanceProcedure: string;
  acceptanceTermDays: string;
  // quality
  qualityRequirements: string;
  warrantyPeriodMonths: string;
  serviceLifeMonths: string;
  specifications: string;
  // security
  bidSecurityRequired: boolean;
  bidSecurityPercent: string;
  performanceSecurityRequired: boolean;
  performanceSecurityPercent: string;
  warrantySecurityRequired: boolean;
  securityAmount: string;
  penaltyFormula: string;
  fixedPenaltyAmount: string;
  interimPenaltyEnabled: boolean;
  // change
  changeConditions: string;
  allowQuantityChange: boolean;
  allowPriceChange: boolean;
  terminationConditions: string;
  securityReturnDays: string;
  // stages
  stages: { name: string; endDate: string; amount: string }[];
}

const fromProject = (p: ContractProject): FlatForm => ({
  contractName: p.contractName ?? "",
  ikz: p.ikz ?? "",
  noticeNumber: p.noticeNumber ?? "",
  customerName: p.customerName ?? "",
  supplierName: p.supplierName ?? "",
  projectDate: p.projectDate ?? "",
  conclusionDate: p.conclusionDate ?? "",
  protocolOfDisagreements: p.protocolOfDisagreements ?? false,
  objectName: p.subject.objectName,
  description: p.subject.description ?? "",
  okpd2Code: p.subject.okpd2Code ?? "",
  kved2Code: p.subject.kved2Code ?? "",
  quantity: p.subject.quantity ?? "",
  deliveryPlace: p.subject.deliveryPlace ?? "",
  initialMaxPrice: p.price.initialMaxPrice ?? "",
  finalPrice: p.price.finalPrice ?? "",
  priceBasis: p.price.priceBasis ?? "",
  priceIncludesExpenses: p.price.priceIncludesExpenses ?? true,
  paymentProcedure: p.price.paymentProcedure ?? "postpayment",
  advancePercent: p.price.advancePercent ?? "",
  paymentTermDays: String(p.price.paymentTermDays ?? 7),
  startDate: p.term.startDate ?? "",
  endDate: p.term.endDate ?? "",
  validUntil: p.term.validUntil ?? "",
  acceptanceProcedure: p.term.acceptanceProcedure ?? "",
  acceptanceTermDays: String(p.term.acceptanceTermDays ?? 10),
  qualityRequirements: p.quality.qualityRequirements ?? "",
  warrantyPeriodMonths: String(p.quality.warrantyPeriodMonths ?? ""),
  serviceLifeMonths: String(p.quality.serviceLifeMonths ?? ""),
  specifications: p.quality.specifications ?? "",
  bidSecurityRequired: p.security.bidSecurityRequired ?? false,
  bidSecurityPercent: p.security.bidSecurityPercent ?? "",
  performanceSecurityRequired: p.security.performanceSecurityRequired ?? true,
  performanceSecurityPercent: p.security.performanceSecurityPercent ?? "5",
  warrantySecurityRequired: p.security.warrantySecurityRequired ?? false,
  securityAmount: p.security.securityAmount ?? "",
  penaltyFormula: p.security.penaltyFormula ?? "",
  fixedPenaltyAmount: p.security.fixedPenaltyAmount ?? "",
  interimPenaltyEnabled: p.security.interimPenaltyEnabled ?? true,
  changeConditions: p.change.changeConditions ?? "",
  allowQuantityChange: p.change.allowQuantityChange ?? false,
  allowPriceChange: p.change.allowPriceChange ?? false,
  terminationConditions: p.change.terminationConditions ?? "",
  securityReturnDays: String(p.change.securityReturnDays ?? 30),
  stages: (p.term.stages ?? []).map((s) => ({
    name: s.name,
    endDate: s.endDate ?? "",
    amount: s.amount ?? "",
  })),
});

const toProject = (f: FlatForm, orgId: string | number): ContractProject => ({
  organizationId: orgId,
  contractName: f.contractName,
  ikz: f.ikz,
  noticeNumber: f.noticeNumber,
  customerName: f.customerName,
  supplierName: f.supplierName,
  projectDate: f.projectDate,
  conclusionDate: f.conclusionDate,
  protocolOfDisagreements: f.protocolOfDisagreements,
  subject: {
    objectName: f.objectName,
    description: f.description,
    okpd2Code: f.okpd2Code,
    kved2Code: f.kved2Code,
    quantity: f.quantity,
    deliveryPlace: f.deliveryPlace,
  },
  price: {
    initialMaxPrice: f.initialMaxPrice,
    finalPrice: f.finalPrice,
    priceBasis: f.priceBasis,
    priceIncludesExpenses: f.priceIncludesExpenses,
    paymentProcedure: f.paymentProcedure as any,
    advancePercent: f.advancePercent,
    paymentTermDays: f.paymentTermDays ? Number(f.paymentTermDays) : undefined,
  },
  term: {
    startDate: f.startDate,
    endDate: f.endDate,
    validUntil: f.validUntil,
    stages: f.stages.filter((s) => s.name),
    acceptanceProcedure: f.acceptanceProcedure,
    acceptanceTermDays: f.acceptanceTermDays
      ? Number(f.acceptanceTermDays)
      : undefined,
  },
  quality: {
    qualityRequirements: f.qualityRequirements,
    warrantyPeriodMonths: f.warrantyPeriodMonths
      ? Number(f.warrantyPeriodMonths)
      : undefined,
    serviceLifeMonths: f.serviceLifeMonths
      ? Number(f.serviceLifeMonths)
      : undefined,
    specifications: f.specifications,
  },
  security: {
    bidSecurityRequired: f.bidSecurityRequired,
    bidSecurityPercent: f.bidSecurityPercent,
    performanceSecurityRequired: f.performanceSecurityRequired,
    performanceSecurityPercent: f.performanceSecurityPercent,
    warrantySecurityRequired: f.warrantySecurityRequired,
    securityAmount: f.securityAmount,
    penaltyFormula: f.penaltyFormula,
    fixedPenaltyAmount: f.fixedPenaltyAmount,
    interimPenaltyEnabled: f.interimPenaltyEnabled,
  },
  change: {
    changeConditions: f.changeConditions,
    allowQuantityChange: f.allowQuantityChange,
    allowPriceChange: f.allowPriceChange,
    terminationConditions: f.terminationConditions,
    securityReturnDays: f.securityReturnDays
      ? Number(f.securityReturnDays)
      : undefined,
  },
  status: "draft",
  createdAt: f.projectDate,
  updatedAt: new Date().toISOString().slice(0, 10),
});

// ─── Компонент ─────────────────────────────────────────────────────────────

export default function ContractProjectForm() {
  const { id } = useParams();
  const location = useLocation();
  const stateData = location.state as
    | { ikz?: string; name?: string; procurementType?: string }
    | undefined;

  const { data: existing, isLoading: loadingExisting } = useContractProject(id);
  const { mutate: createProject } = useCreateContractProject();
  const { mutate: updateProject } = useUpdateContractProject();

  const [activeSection, setActiveSection] = useState("general");
  const [saved, setSaved] = useState(false);

  const orgId = 1;
  const defaultProject = existing ?? emptyContractProject(orgId);
  const defaultForm = fromProject(defaultProject);

  // Автоподстановка из закупки
  if (!existing && stateData?.ikz && !defaultForm.ikz) {
    defaultForm.ikz = stateData.ikz;
    defaultForm.contractName = `Контракт: ${stateData.name ?? ""}`;
  }

  const methods = useForm<FlatForm>({
    resolver: zodResolver(ContractProjectSchema) as any,
    defaultValues: defaultForm,
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "stages",
  });

  const watched = methods.watch();
  const completion = sectionCompletion(toProject(watched, orgId));

  const deadline = conclusionDeadline(watched.conclusionDate);

  const onSubmit = (data: FlatForm) => {
    const project = toProject(data, orgId);
    if (id) {
      updateProject({ id: Number(id), ...project });
    } else {
      createProject(project);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loadingExisting) return <div className={styles.loader}>Загрузка...</div>;

  const sections = [
    { id: "general", label: "Общие сведения" },
    { id: "subject", label: "1. Предмет (ст. 33)" },
    { id: "price", label: "2. Цена и оплата (ст. 33, 34)" },
    { id: "term", label: "3. Срок и приёмка (ст. 33, 94)" },
    { id: "quality", label: "4. Качество и гарантия (ст. 33)" },
    { id: "security", label: "5. Обеспечение и неустойка (ст. 34)" },
    { id: "change", label: "6. Изменение (ст. 95)" },
  ];

  const renderField = (
    name: keyof FlatForm,
    label: string,
    type = "text",
    placeholder = "",
    hint = "",
  ) => {
    const error = methods.formState.errors[name]?.message;
    return (
      <div className={styles.field}>
        <label className={styles.label}>
          {label}
          {hint && <span className={styles.hint}> {hint}</span>}
        </label>
        <input
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          type={type}
          placeholder={placeholder}
          {...methods.register(name)}
        />
        {error && <span className={styles.error}>{String(error)}</span>}
      </div>
    );
  };

  // ОКПД2 проекта контракта выбирается из справочника (поиск по коду и
  // наименованию), как и в плане-графике
  const renderOkpd2Field = () => {
    const error = methods.formState.errors.okpd2Code?.message;

    return (
      <div className={styles.field}>
        <label className={styles.label}>Код ОКПД2</label>
        <Okpd2Select
          code={watched.okpd2Code}
          onSelect={(item) =>
            methods.setValue("okpd2Code", item?.code ?? "", {
              shouldValidate: true,
            })
          }
        />
        {error && <span className={styles.error}>{String(error)}</span>}
      </div>
    );
  };

  const renderCheckbox = (name: keyof FlatForm, label: string) => (
    <label className={styles.checkbox}>
      <input type="checkbox" {...methods.register(name)} />
      <span>{label}</span>
    </label>
  );

  const renderTextarea = (
    name: keyof FlatForm,
    label: string,
    placeholder = "",
    hint = "",
  ) => {
    const error = methods.formState.errors[name]?.message;
    return (
      <div className={styles.field}>
        <label className={styles.label}>
          {label}
          {hint && <span className={styles.hint}> {hint}</span>}
        </label>
        <textarea
          className={`${styles.textarea} ${error ? styles.inputError : ""}`}
          placeholder={placeholder}
          rows={3}
          {...methods.register(name)}
        />
        {error && <span className={styles.error}>{String(error)}</span>}
      </div>
    );
  };

  const renderSelect = (
    name: keyof FlatForm,
    label: string,
    options: { value: string; label: string }[],
    hint = "",
  ) => {
    const error = methods.formState.errors[name]?.message;
    return (
      <div className={styles.field}>
        <label className={styles.label}>
          {label}
          {hint && <span className={styles.hint}> {hint}</span>}
        </label>
        <select
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          {...methods.register(name)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <span className={styles.error}>{String(error)}</span>}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Проект контракта {existing ? `#${existing.id}` : ""}
      </h2>

      {/* Прогресс заполнения */}
      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          Обязательные условия ст. 33:{" "}
          <strong>
            {completion.completed}/{completion.total}
          </strong>{" "}
          ({completion.percent}%)
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <div className={styles.progressTerms}>
          {MANDATORY_TERMS.map((t) => {
            const section = completion.sections.find((s) => s.id === t.id);
            return (
              <span
                key={t.id}
                className={`${styles.termChip} ${
                  section?.complete
                    ? styles.termChipComplete
                    : styles.termChipIncomplete
                }`}
                title={t.article}
              >
                {t.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Подсказка по сроку заключения */}
      {deadline && (
        <div className={styles.deadlineHint}>
          Срок заключения контракта по ст. 51 ч. 4:{" "}
          <strong>не ранее {deadline}</strong> (10 дней с даты протокола)
        </div>
      )}

      {/* Навигация по разделам */}
      <nav className={styles.nav}>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.navBtn} ${
              activeSection === s.id ? styles.navBtnActive : ""
            }`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Форма */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
          {/* === Общие сведения === */}
          {activeSection === "general" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Общие сведения</h3>
              {renderField("contractName", "Наименование контракта")}
              <div className={styles.row}>
                {renderField("ikz", "ИКЗ", "text", "0123456789012345678901234")}
                {renderField("noticeNumber", "Номер извещения")}
              </div>
              {renderField("customerName", "Заказчик")}
              {renderField("supplierName", "Поставщик (победитель)")}
              <div className={styles.row}>
                {renderField("projectDate", "Дата проекта", "date")}
                {renderField("conclusionDate", "Дата заключения", "date")}
              </div>
              {renderCheckbox(
                "protocolOfDisagreements",
                "Протокол разногласий (ст. 51 ч. 4: проект размещается в течение 4 дней)",
              )}
            </div>
          )}

          {/* === 1. Предмет контракта === */}
          {activeSection === "subject" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Предмет контракта{" "}
                <span className={styles.articleRef}>ст. 33 ч. 1 п. 1</span>
              </h3>
              {renderField("objectName", "Наименование объекта закупки")}
              {renderTextarea("description", "Описание объекта закупки")}
              <div className={styles.row}>
                {renderOkpd2Field()}
                {renderField("kved2Code", "Код КВЕД2")}
              </div>
              {renderField("quantity", "Количество / объём")}
              {renderField("deliveryPlace", "Место поставки")}
            </div>
          )}

          {/* === 2. Цена и оплата === */}
          {activeSection === "price" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Цена контракта и порядок оплаты{" "}
                <span className={styles.articleRef}>
                  ст. 33 ч. 1 п. 1, ст. 34 ч. 12
                </span>
              </h3>
              <div className={styles.row}>
                {renderField("initialMaxPrice", "НМЦК, руб")}
                {renderField("finalPrice", "Цена контракта, руб")}
              </div>
              {renderTextarea(
                "priceBasis",
                "Обоснование цены",
                "",
                "ст. 22 ФЗ-44",
              )}
              {renderCheckbox(
                "priceIncludesExpenses",
                "Включены расходы на перевозку, страхование, уплату пошлин, налогов и обязательные платежи (ст. 33 ч. 1 п. 1)",
              )}
              {renderSelect(
                "paymentProcedure",
                "Порядок оплаты (ст. 34 ч. 12)",
                [
                  { value: "postpayment", label: "Постоплата" },
                  { value: "advance", label: "Аванс" },
                  { value: "staged", label: "Поэтапная оплата" },
                ],
              )}
              <div className={styles.row}>
                {renderField("advancePercent", "Аванс, %")}
                {renderField("paymentTermDays", "Срок оплаты, раб. дней")}
              </div>
              {watched.paymentProcedure === "staged" && (
                <div className={styles.stages}>
                  <h4 className={styles.stagesTitle}>Этапы исполнения</h4>
                  {fields.map((field, index) => (
                    <div key={field.id} className={styles.stageRow}>
                      <input
                        className={styles.input}
                        placeholder="Название этапа"
                        {...methods.register(`stages.${index}.name`)}
                      />
                      <input
                        className={styles.input}
                        type="date"
                        {...methods.register(`stages.${index}.endDate`)}
                      />
                      <input
                        className={styles.input}
                        placeholder="Сумма, руб"
                        {...methods.register(`stages.${index}.amount`)}
                      />
                      <button
                        type="button"
                        className={styles.stageRemove}
                        onClick={() => remove(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.stageAdd}
                    onClick={() =>
                      append({ name: "", endDate: "", amount: "" })
                    }
                  >
                    + Добавить этап
                  </button>
                </div>
              )}
            </div>
          )}

          {/* === 3. Срок и приёмка === */}
          {activeSection === "term" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Срок исполнения и приёмка{" "}
                <span className={styles.articleRef}>
                  ст. 33 ч. 1 п. 1, ст. 94
                </span>
              </h3>
              <div className={styles.row}>
                {renderField("startDate", "Дата начала", "date")}
                {renderField("endDate", "Дата окончания", "date")}
              </div>
              {renderField("validUntil", "Срок действия контракта", "date")}
              {renderTextarea("acceptanceProcedure", "Порядок приёмки")}
              {renderField("acceptanceTermDays", "Срок приёмки, дней")}
            </div>
          )}

          {/* === 4. Качество и гарантия === */}
          {activeSection === "quality" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Качество и гарантия{" "}
                <span className={styles.articleRef}>ст. 33 ч. 1 п. 2, 6</span>
              </h3>
              {renderTextarea(
                "qualityRequirements",
                "Требования к качеству",
                "",
                "обязательное условие",
              )}
              <div className={styles.row}>
                {renderField("warrantyPeriodMonths", "Гарантия, мес.")}
                {renderField("serviceLifeMonths", "Срок службы, мес.")}
              </div>
              {renderTextarea("specifications", "Спецификация (по позициям)")}
            </div>
          )}

          {/* === 5. Обеспечение и неустойка === */}
          {activeSection === "security" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Обеспечение и неустойка{" "}
                <span className={styles.articleRef}>ст. 34 ч. 5-7</span>
              </h3>
              {renderCheckbox("bidSecurityRequired", "Обеспечение заявки")}
              {watched.bidSecurityRequired &&
                renderField(
                  "bidSecurityPercent",
                  "Обеспечение заявки, %",
                  "text",
                  "0.5–5",
                  "ст. 34 ч. 4",
                )}
              {renderCheckbox(
                "performanceSecurityRequired",
                "Обеспечение исполнения контракта",
              )}
              {watched.performanceSecurityRequired && (
                <div className={styles.row}>
                  {renderField(
                    "performanceSecurityPercent",
                    "Обеспечение, %",
                    "text",
                    "0.5–30",
                    "ст. 34 ч. 6",
                  )}
                  {renderField("securityAmount", "Сумма обеспечения, руб")}
                </div>
              )}
              {renderCheckbox(
                "warrantySecurityRequired",
                "Обеспечение гарантийных обязательств",
              )}
              <div className={styles.divider} />
              {renderField(
                "penaltyFormula",
                "Пени",
                "text",
                "",
                "ст. 34 ч. 5 п. 1",
              )}
              {renderField("fixedPenaltyAmount", "Фиксированный штраф, руб")}
              {renderCheckbox(
                "interimPenaltyEnabled",
                "Неустойка за нарушение промежуточных обязательств",
              )}
            </div>
          )}

          {/* === 6. Изменение и расторжение === */}
          {activeSection === "change" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Изменение и расторжение контракта{" "}
                <span className={styles.articleRef}>ст. 95</span>
              </h3>
              {renderTextarea(
                "changeConditions",
                "Условия изменения контракта",
              )}
              {renderCheckbox(
                "allowQuantityChange",
                "Допускается изменение количества (объёма) поставок",
              )}
              {renderCheckbox(
                "allowPriceChange",
                "Допускается изменение цены контракта",
              )}
              {renderTextarea(
                "terminationConditions",
                "Условия одностороннего отказа (ст. 95 ч. 8-9)",
              )}
              {renderField(
                "securityReturnDays",
                "Срок возврата обеспечения, дней",
                "text",
                "",
                "ст. 34 ч. 27",
              )}
            </div>
          )}

          {/* Кнопки */}
          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary}>
              {id ? "Сохранить изменения" : "Создать проект контракта"}
            </button>
            {saved && (
              <span className={styles.savedMessage}>Проект сохранён</span>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
