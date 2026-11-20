import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import type { BaseOrganization } from "../../services/Organization/organization.schema";
import {
  SMNP_REPORT_238_MIN_SHARE_PERCENT,
  SMNP_REPORT_238_STATUS_LABELS,
  emptySmnpReport238,
  normalizeSmnpReport238,
  validateSmnpReport238,
  type SmnpReport238Applicability,
  type SmnpReport238Customer,
  type SmnpReport238Draft,
  type SmnpReport238Excluded,
  type SmnpReport238SectionIIInput,
  type SmnpReport238SectionIIIExcluded,
  type SmnpReport238Signature,
  type SmnpReport238Status,
} from "../../services/Reports/smnpReport238.schema";
import {
  SmnpReport238ValidationError,
  buildSmnpReport238Xml,
  downloadSmnpReport238Xml,
  validateSmnpReport238Xml,
} from "../../services/Reports/smnpReport238.xml";
import {
  useDeleteSmnpReport238,
  useSaveSmnpReport238,
  useSmnpReports238,
} from "../../services/Reports/smnpReport238.api";
import styles from "./SmnpReport238Form.module.scss";

interface SmnpReport238FormProps {
  organization?: BaseOrganization | null;
}

const SECTION_II_EXCLUDED_FIELDS: Array<{
  key: keyof SmnpReport238Excluded;
  code: string;
  label: string;
  applicability?: keyof SmnpReport238Applicability;
}> = [
  {
    key: "defense",
    code: "2.1",
    label:
      "Контракты, заключаемые для обеспечения обороны страны и безопасности государства",
  },
  {
    key: "creditServices",
    code: "2.2",
    label:
      "Контракты, заключаемые на оказание услуг по предоставлению кредитов",
  },
  {
    key: "soleSupplier",
    code: "2.3",
    label:
      "Контракты с единственным поставщиком (подрядчиком, исполнителем) по части 1 (за исключением пункта 25 части 1 статьи 93 по результатам несостоявшегося определения) и части 12 статьи 93 Федерального закона",
  },
  {
    key: "atomicEnergy",
    code: "2.4",
    label:
      "Контракты, заключаемые на выполнение работ в области использования атомной энергии",
  },
  {
    key: "closedMethods",
    code: "2.5",
    label:
      "Контракты, заключаемые по результатам закрытых способов определения поставщиков (подрядчиков, исполнителей)",
  },
  {
    key: "spaceActivity",
    code: "2.6",
    label:
      "Контракты на поставку товаров, выполнение работ, оказание услуг для осуществления космической деятельности",
    applicability: "spaceActivity",
  },
  {
    key: "narcoticDrugs",
    code: "2.7",
    label:
      "Контракты на поставку наркотических средств, психотропных веществ и их прекурсоров, включённых в перечень, утверждённый постановлением Правительства Российской Федерации от 30 июня 1998 г. № 681",
  },
  {
    key: "medicines",
    code: "2.8",
    label:
      "Контракты на поставку лекарственных препаратов для медицинского применения (за исключением наркотических средств, психотропных веществ и их прекурсоров)",
    applicability: "medicines",
  },
  {
    key: "medicalDevices",
    code: "2.9",
    label: "Контракты на поставку медицинских изделий",
    applicability: "medicalDevices",
  },
];

const SECTION_III_EXCLUDED_FIELDS: Array<{
  key: keyof SmnpReport238SectionIIIExcluded;
  code: string;
  label: string;
  applicability?: keyof SmnpReport238Applicability;
}> = [
  {
    key: "creditServices",
    code: "3.1",
    label: "Контракты на оказание услуг по предоставлению кредитов",
  },
  {
    key: "soleSupplier",
    code: "3.2",
    label:
      "Контракты с единственным поставщиком по частям 1 и 12 статьи 93 Федерального закона, за исключением пункта 25 части 1 статьи 93",
  },
  {
    key: "failedSoleSupplier",
    code: "3.3",
    label:
      "Контракты по пункту 25 части 1 статьи 93 по результатам несостоявшегося определения поставщиков, проведённого по пункту 1 части 1 статьи 30 Федерального закона",
  },
  {
    key: "atomicEnergy",
    code: "3.4",
    label:
      "Контракты на выполнение работ в области использования атомной энергии",
  },
  {
    key: "closedMethods",
    code: "3.5",
    label:
      "Контракты, при осуществлении которых применяются закрытые способы определения поставщиков",
  },
  {
    key: "spaceActivity",
    code: "3.6",
    label:
      "Контракты на поставку товаров, выполнение работ, оказание услуг для осуществления космической деятельности",
    applicability: "spaceActivity",
  },
  {
    key: "narcoticDrugs",
    code: "3.7",
    label:
      "Контракты на поставку наркотических средств, психотропных веществ и их прекурсоров",
  },
  {
    key: "medicines",
    code: "3.8",
    label:
      "Контракты на поставку лекарственных препаратов для медицинского применения",
    applicability: "medicines",
  },
  {
    key: "medicalDevices",
    code: "3.9",
    label: "Контракты на поставку медицинских изделий",
    applicability: "medicalDevices",
  },
];

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  readOnly?: boolean;
  type?: "text" | "date" | "number";
  placeholder?: string;
}

const TextField = ({
  label,
  value,
  onChange,
  error,
  hint,
  readOnly = false,
  type = "text",
  placeholder,
}: TextFieldProps) => (
  <label className={styles.field}>
    <span className={styles.label}>{label}</span>
    <input
      className={`${styles.input} ${error ? styles.inputError : ""}`}
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
    />
    {hint && <span className={styles.hint}>{hint}</span>}
    {error && <span className={styles.error}>{error}</span>}
  </label>
);

interface IndicatorFieldProps {
  code: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly?: boolean;
  unit: string;
}

const IndicatorField = ({
  code,
  label,
  value,
  onChange,
  error,
  readOnly = false,
  unit,
}: IndicatorFieldProps) => (
  <div className={`${styles.indicator} ${error ? styles.indicatorError : ""}`}>
    <span className={styles.indicatorCode}>{code}</span>
    <span className={styles.indicatorLabel}>{label}</span>
    {readOnly ? (
      <span className={styles.indicatorValue}>{value || "0.00"}</span>
    ) : (
      <input
        className={styles.indicatorInput}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    )}
    <span className={styles.indicatorUnit}>{unit}</span>
    {error && <span className={styles.indicatorErrorText}>{error}</span>}
  </div>
);

interface RegistryFieldProps {
  code: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  errors: string[];
  hint?: string;
}

const RegistryField = ({
  code,
  label,
  values,
  onChange,
  errors,
  hint,
}: RegistryFieldProps) => (
  <label className={styles.registryField}>
    <span className={styles.registryTitle}>
      <span className={styles.registryCode}>{code}</span>
      {label}
    </span>
    <textarea
      className={`${styles.textarea} ${errors.length ? styles.inputError : ""}`}
      rows={3}
      value={values.join("\n")}
      placeholder="По одному номеру в строке"
      onChange={(event) =>
        onChange(event.target.value.split("\n").map((value) => value.trim()))
      }
    />
    {hint && <span className={styles.hint}>{hint}</span>}
    {errors.map((message) => (
      <span className={styles.error} key={message}>
        {message}
      </span>
    ))}
  </label>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className={styles.section}>
    <h3 className={styles.sectionTitle}>{title}</h3>
    {children}
  </section>
);

export default function SmnpReport238Form({
  organization,
}: SmnpReport238FormProps) {
  const [draft, setDraft] = useState<SmnpReport238Draft>(() =>
    emptySmnpReport238(organization),
  );
  const [showIssues, setShowIssues] = useState(false);
  const [message, setMessage] = useState("");
  const [xmlPreview, setXmlPreview] = useState("");
  const appliedOrganizationRef = useRef<string | null>(null);

  const orgId = organization?.id;

  const { data: savedReports = [], isLoading: savedLoading } =
    useSmnpReports238(orgId);
  const saveMutation = useSaveSmnpReport238();
  const deleteMutation = useDeleteSmnpReport238();

  useEffect(() => {
    if (orgId === undefined || orgId === null) return;
    const key = String(orgId);
    if (appliedOrganizationRef.current === key) return;

    appliedOrganizationRef.current = key;
    setDraft(emptySmnpReport238(organization));
    setShowIssues(false);
    setMessage("");
    setXmlPreview("");
  }, [orgId, organization]);

  const normalized = useMemo(() => normalizeSmnpReport238(draft), [draft]);
  const liveIssues = useMemo(() => validateSmnpReport238(draft), [draft]);
  const visibleIssues = showIssues ? liveIssues : [];

  const errorsFor = (prefix: string): string[] =>
    visibleIssues
      .filter(
        (issue) => issue.path === prefix || issue.path.startsWith(`${prefix}.`),
      )
      .map((issue) => issue.message);

  const firstError = (prefix: string): string | undefined =>
    errorsFor(prefix)[0];

  const updateCustomer = (key: keyof SmnpReport238Customer, value: string) =>
    setDraft((previous) => ({
      ...previous,
      customer: {
        ...previous.customer,
        [key]: value,
      } as SmnpReport238Customer,
    }));

  const updateSectionII = <K extends keyof SmnpReport238SectionIIInput>(
    key: K,
    value: SmnpReport238SectionIIInput[K],
  ) =>
    setDraft((previous) => ({
      ...previous,
      sectionII: {
        ...previous.sectionII,
        [key]: value,
      } as SmnpReport238SectionIIInput,
    }));

  const updateExcluded = (key: keyof SmnpReport238Excluded, value: string) =>
    setDraft((previous) => ({
      ...previous,
      sectionII: {
        ...previous.sectionII,
        excluded: {
          ...previous.sectionII.excluded,
          [key]: value,
        },
      },
    }));

  const updateApplicability = (
    key: keyof SmnpReport238Applicability,
    value: boolean,
  ) =>
    setDraft((previous) => {
      const applicability = {
        ...previous.applicability,
        [key]: value,
      };

      if (value) {
        return { ...previous, applicability };
      }

      const excluded = { ...previous.sectionII.excluded };
      const excludedContracts = {
        ...previous.sectionIII.excludedProcurementContracts,
      };

      if (key === "spaceActivity") {
        excluded.spaceActivity = "";
        excludedContracts.spaceActivity = [];
      }

      if (key === "medicines") {
        excluded.medicines = "";
        excludedContracts.medicines = [];
      }

      if (key === "medicalDevices") {
        excluded.medicalDevices = "";
        excludedContracts.medicalDevices = [];
      }

      return {
        ...previous,
        applicability,
        sectionII: {
          ...previous.sectionII,
          excluded,
        },
        sectionIII: {
          ...previous.sectionIII,
          excludedProcurementContracts: excludedContracts,
        },
      };
    });

  const updateSectionIIIList = (
    key: "smpContracts" | "subcontractingContracts",
    values: string[],
  ) =>
    setDraft((previous) => ({
      ...previous,
      sectionIII: {
        ...previous.sectionIII,
        [key]: values,
      },
    }));

  const updateExcludedContracts = (
    key: keyof SmnpReport238SectionIIIExcluded,
    values: string[],
  ) =>
    setDraft((previous) => ({
      ...previous,
      sectionIII: {
        ...previous.sectionIII,
        excludedProcurementContracts: {
          ...previous.sectionIII.excludedProcurementContracts,
          [key]: values,
        },
      },
    }));

  const updateSignature = (key: keyof SmnpReport238Signature, value: string) =>
    setDraft((previous) => ({
      ...previous,
      signature: {
        ...previous.signature,
        [key]: value,
      },
    }));

  const checkReport = (): boolean => {
    setShowIssues(true);

    if (liveIssues.length > 0) {
      setMessage(
        `Найдено нарушений: ${liveIssues.length}. Исправьте показатели перед выгрузкой.`,
      );
      return false;
    }

    setMessage("Отчёт соответствует требованиям формы.");
    return true;
  };

  const buildXml = (): string | null => {
    if (!checkReport()) return null;

    try {
      const xml = buildSmnpReport238Xml(draft);
      const check = validateSmnpReport238Xml(xml);

      if (!check.valid) {
        setMessage(check.issues.join("; "));
        return null;
      }

      setXmlPreview(xml);
      setMessage("XML сформирован и прошёл проверку структуры.");
      return xml;
    } catch (error) {
      if (error instanceof SmnpReport238ValidationError) {
        setMessage(
          `XML не сформирован: ${error.issues.map((issue) => issue.message).join("; ")}`,
        );
      } else {
        setMessage("Не удалось сформировать XML отчёта.");
      }
      return null;
    }
  };

  const handleDownload = () => {
    const xml = buildXml();
    if (xml) downloadSmnpReport238Xml(xml, draft.year);
  };

  const handleSave = () => {
    if (!checkReport()) return;

    saveMutation.mutate(draft, {
      onSuccess: (record) => {
        setDraft({ ...record.report, id: record.id });
        setXmlPreview(record.xml);
        setMessage("Отчёт и XML сохранены.");
      },
      onError: () => {
        setMessage("Не удалось сохранить отчёт на сервере.");
      },
    });
  };

  const handleReset = () => {
    setDraft(emptySmnpReport238(organization));
    setShowIssues(false);
    setMessage("");
    setXmlPreview("");
  };

  const openSaved = (report: (typeof savedReports)[number]) => {
    setDraft({ ...report.report, id: report.id });
    setXmlPreview(report.xml);
    setShowIssues(false);
    setMessage(`Открыт отчёт за ${report.year} год.`);
  };

  const handleDeleteSaved = (id: string | number) => {
    if (!confirm("Удалить сохранённый отчёт?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => setMessage("Сохранённый отчёт удалён."),
      onError: () => setMessage("Не удалось удалить отчёт."),
    });
  };

  return (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <div>
          <h3 className={styles.formTitle}>
            Форма отчёта об объёме закупок у СМП и СОНКО
          </h3>
          <p className={styles.formSubtitle}>
            Постановление Правительства Российской Федерации от 17.03.2015 № 238
            (ред. от 22.05.2025). Денежные показатели — в тысячах рублей.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={checkReport}
          >
            Проверить
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={buildXml}
          >
            Сформировать XML
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleDownload}
          >
            Скачать XML
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={saveMutation.isPending || orgId === undefined}
          >
            {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={handleReset}
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <TextField
          label="Отчётный год"
          type="number"
          value={String(draft.year)}
          onChange={(value) =>
            setDraft((previous) => ({
              ...previous,
              year: Number(value) || previous.year,
            }))
          }
          error={firstError("year")}
        />
        <TextField
          label="Дата размещения отчёта в ЕИС"
          type="date"
          value={draft.reportDate}
          onChange={(value) =>
            setDraft((previous) => ({
              ...previous,
              reportDate: value,
            }))
          }
          error={firstError("reportDate")}
        />
        <label className={styles.field}>
          <span className={styles.label}>Статус отчёта</span>
          <select
            className={styles.input}
            value={draft.status}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                status: event.target.value as SmnpReport238Status,
              }))
            }
          >
            {(
              Object.keys(
                SMNP_REPORT_238_STATUS_LABELS,
              ) as SmnpReport238Status[]
            ).map((status) => (
              <option key={status} value={status}>
                {SMNP_REPORT_238_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Section title="I. Сведения о заказчике">
        <div className={styles.grid}>
          <TextField
            label="Наименование"
            value={draft.customer.fullName}
            onChange={(value) => updateCustomer("fullName", value)}
            error={firstError("customer.fullName")}
          />
          <TextField
            label="Организационно-правовая форма"
            value={draft.customer.legalForm}
            onChange={(value) => updateCustomer("legalForm", value)}
            error={firstError("customer.legalForm")}
          />
          <TextField
            label="Место нахождения (адрес), телефон, адрес электронной почты"
            value={draft.customer.addressPhoneEmail}
            onChange={(value) => updateCustomer("addressPhoneEmail", value)}
            error={firstError("customer.addressPhoneEmail")}
          />
          <TextField
            label="ИНН"
            value={draft.customer.inn}
            onChange={(value) => updateCustomer("inn", value)}
            error={firstError("customer.inn")}
          />
          <TextField
            label="КПП"
            value={draft.customer.kpp}
            onChange={(value) => updateCustomer("kpp", value)}
            error={firstError("customer.kpp")}
          />
          <TextField
            label="по ОКОПФ"
            value={draft.customer.okopf}
            onChange={(value) => updateCustomer("okopf", value)}
            error={firstError("customer.okopf")}
          />
          <TextField
            label="по ОКПО"
            value={draft.customer.okpo}
            onChange={(value) => updateCustomer("okpo", value)}
            error={firstError("customer.okpo")}
          />
          <TextField
            label="по ОКТМО"
            value={draft.customer.oktmo}
            onChange={(value) => updateCustomer("oktmo", value)}
            error={firstError("customer.oktmo")}
          />
        </div>
      </Section>

      <Section title="Применимость отдельных показателей">
        <div className={styles.checkboxGrid}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.applicability.spaceActivity}
              onChange={(event) =>
                updateApplicability("spaceActivity", event.target.checked)
              }
            />
            <span>
              Организация космической деятельности: заполняются показатель 2.6 и
              контракты 3.6
            </span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.applicability.medicines}
              onChange={(event) =>
                updateApplicability("medicines", event.target.checked)
              }
            />
            <span>
              Годовой объём закупок лекарственных препаратов 20 млн рублей и
              более: заполняются показатель 2.8 и контракты 3.8
            </span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.applicability.medicalDevices}
              onChange={(event) =>
                updateApplicability("medicalDevices", event.target.checked)
              }
            />
            <span>
              Годовой объём закупок медицинских изделий 20 млн рублей и более:
              заполняются показатель 2.9 и контракты 3.9
            </span>
          </label>
        </div>
      </Section>

      <Section title="II. Информация об объёме закупок у СМП и СОНКО">
        <div className={styles.indicators}>
          <IndicatorField
            code="1."
            label="Совокупный годовой объём закупок, за исключением объёма закупок, сведения о которых составляют государственную тайну"
            value={draft.sectionII.totalAnnualVolume}
            onChange={(value) => updateSectionII("totalAnnualVolume", value)}
            error={firstError("sectionII.totalAnnualVolume")}
            unit="тыс. руб."
          />

          <div className={styles.groupTitle}>
            2. Общий объём финансового обеспечения для оплаты контрактов в
            отчётном году в рамках закупок, не подлежащих включению в расчёт
            совокупного годового объёма закупок
          </div>

          {SECTION_II_EXCLUDED_FIELDS.map((field) => {
            const disabled =
              field.applicability !== undefined &&
              !draft.applicability[field.applicability];

            return (
              <IndicatorField
                key={field.key}
                code={field.code}
                label={field.label}
                value={draft.sectionII.excluded[field.key]}
                onChange={(value) => updateExcluded(field.key, value)}
                error={firstError(`sectionII.excluded.${field.key}`)}
                readOnly={disabled}
                unit="тыс. руб."
              />
            );
          })}

          <IndicatorField
            code="2."
            label="Общий объём финансового обеспечения (сумма показателей 2.1–2.9)"
            value={normalized.sectionII.excludedTotal}
            onChange={() => undefined}
            readOnly
            error={firstError("sectionII.excludedTotal")}
            unit="тыс. руб."
          />
          <IndicatorField
            code="3."
            label="Совокупный годовой объём закупок, рассчитанный за вычетом закупок, не подлежащих включению в расчёт (показатель 1 минус показатель 2)"
            value={normalized.sectionII.adjustedAnnualVolume}
            onChange={() => undefined}
            readOnly
            error={firstError("sectionII.adjustedAnnualVolume")}
            unit="тыс. руб."
          />
          <IndicatorField
            code="4."
            label={`Объём закупок, который заказчик обязан осуществить у СМП и СОНКО в отчётном году (${SMNP_REPORT_238_MIN_SHARE_PERCENT} % от показателя 3)`}
            value={normalized.sectionII.requiredSmpVolume}
            onChange={() => undefined}
            readOnly
            error={firstError("sectionII.requiredSmpVolume")}
            unit="тыс. руб."
          />
          <IndicatorField
            code="5."
            label="Объём закупок в отчётном году, осуществлённых по результатам определения поставщиков по пункту 1 части 1 статьи 30 Федерального закона"
            value={draft.sectionII.smpVolumeByResults}
            onChange={(value) => updateSectionII("smpVolumeByResults", value)}
            error={firstError("sectionII.smpVolumeByResults")}
            unit="тыс. руб."
          />
          <IndicatorField
            code="6."
            label="Объём привлечения в отчётном году субподрядчиков и соисполнителей из числа СМП и СОНКО"
            value={draft.sectionII.subcontractingVolume}
            onChange={(value) => updateSectionII("subcontractingVolume", value)}
            error={firstError("sectionII.subcontractingVolume")}
            unit="тыс. руб."
          />
          <IndicatorField
            code="7."
            label="Объём закупок, который заказчик осуществил у СМП и СОНКО в отчётном году (показатели 5 + 6)"
            value={normalized.sectionII.smpVolumeTotal}
            onChange={() => undefined}
            readOnly
            error={firstError("sectionII.smpVolumeTotal")}
            unit="тыс. руб."
          />
          <IndicatorField
            code="8."
            label="Доля закупок, которые заказчик осуществил у СМП и СОНКО в отчётном году, в совокупном годовом объёме закупок по показателю 3"
            value={normalized.sectionII.smpSharePercent}
            onChange={() => undefined}
            readOnly
            error={firstError("sectionII.smpSharePercent")}
            unit="%"
          />
          <IndicatorField
            code="9."
            label="Сумма начальных (максимальных) цен контрактов несостоявшихся определений поставщиков с участием СМП и СОНКО, по результатам которых контракт не заключён"
            value={draft.sectionII.failedProcurementsNmckSum}
            onChange={(value) =>
              updateSectionII("failedProcurementsNmckSum", value)
            }
            error={firstError("sectionII.failedProcurementsNmckSum")}
            unit="тыс. руб."
          />
        </div>
      </Section>

      <Section title="III. Информация о заключённых контрактах">
        <div className={styles.registryGrid}>
          <RegistryField
            code="1."
            label="Контракты, заключённые заказчиком с СМП и СОНКО"
            values={draft.sectionIII.smpContracts}
            onChange={(values) => updateSectionIIIList("smpContracts", values)}
            errors={errorsFor("sectionIII.smpContracts")}
          />
          <RegistryField
            code="2."
            label="Контракты, содержащие условие о привлечении к исполнению контрактов субподрядчиков (соисполнителей) из числа СМП и СОНКО"
            values={draft.sectionIII.subcontractingContracts}
            onChange={(values) =>
              updateSectionIIIList("subcontractingContracts", values)
            }
            errors={errorsFor("sectionIII.subcontractingContracts")}
          />
        </div>

        <div className={styles.groupTitle}>
          3. Контракты, заключённые по результатам закупок, не подлежащих
          включению в расчёт совокупного годового объёма закупок
        </div>

        <div className={styles.registryGrid}>
          {SECTION_III_EXCLUDED_FIELDS.map((field) => {
            const disabled =
              field.applicability !== undefined &&
              !draft.applicability[field.applicability];

            return (
              <RegistryField
                key={field.key}
                code={field.code}
                label={field.label}
                values={
                  draft.sectionIII.excludedProcurementContracts[field.key]
                }
                onChange={(values) =>
                  updateExcludedContracts(field.key, values)
                }
                errors={errorsFor(
                  `sectionIII.excludedProcurementContracts.${field.key}`,
                )}
                hint={disabled ? "Показатель не применяется" : undefined}
              />
            );
          })}
        </div>
      </Section>

      <Section title="Подпись">
        <div className={styles.grid}>
          <TextField
            label="Должность руководителя (уполномоченного работника)"
            value={draft.signature.position}
            onChange={(value) => updateSignature("position", value)}
            error={firstError("signature.position")}
          />
          <TextField
            label="Расшифровка подписи"
            value={draft.signature.name}
            onChange={(value) => updateSignature("name", value)}
            error={firstError("signature.name")}
          />
          <TextField
            label="Дата подписания"
            type="date"
            value={draft.signature.date}
            onChange={(value) => updateSignature("date", value)}
            error={firstError("signature.date")}
          />
        </div>
      </Section>

      {message && <div className={styles.message}>{message}</div>}

      {showIssues && visibleIssues.length > 0 && (
        <div className={styles.issues}>
          <strong>Нарушения требований к заполнению формы</strong>
          <ul>
            {visibleIssues.map((issue, index) => (
              <li key={`${issue.path}-${index}`}>
                {issue.path ? `${issue.path}: ` : ""}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {xmlPreview && (
        <Section title="XML-представление отчёта">
          <pre className={styles.xmlPreview}>{xmlPreview}</pre>
        </Section>
      )}

      <Section title="Сохранённые отчёты">
        {savedLoading ? (
          <div className={styles.empty}>Загрузка...</div>
        ) : savedReports.length === 0 ? (
          <div className={styles.empty}>Сохранённых отчётов нет.</div>
        ) : (
          <div className={styles.savedList}>
            {savedReports.map((report) => (
              <div className={styles.savedItem} key={String(report.id)}>
                <span>
                  {report.year} · {SMNP_REPORT_238_STATUS_LABELS[report.status]}{" "}
                  · {report.reportDate || "дата не указана"}
                </span>
                <span className={styles.savedActions}>
                  <button
                    type="button"
                    className={styles.btnSmall}
                    onClick={() => openSaved(report)}
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() =>
                      report.id !== undefined && handleDeleteSaved(report.id)
                    }
                  >
                    Удалить
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
