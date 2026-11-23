import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useContractService } from "../../services/ContractService/contractService.api";
import { useFetchOrganizationEmployees } from "../../services/StaffingTable/StaffingTable.api";
import { useOrganizationEducations } from "../../services/ContractService/education.api";
import { useOrganizationLeaves } from "../../services/Calendar/calendar.api";
import { useAccessRequests } from "../../services/AccessRequest/accessRequest.api";
import { useOrganizationTasks } from "../../services/Tasks/tasks.api";
import { useAllTaskEvaluations } from "../../services/Tasks/taskEvaluation.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { useOrganizationObjectDescriptions } from "../../services/ObjectDescription/objectDescription.api";
import { useOkpd2Dictionary } from "../../services/Okpd2Ref/okpd2Ref.api";
import { useOrganizationDefectLists } from "../../services/DefectList/defectList.api";
import { useGetProcurements } from "../../services/Procurements/procurement.api";
import { useOrganizationBidEvaluations } from "../../services/BidEvaluation/bidEvaluation.api";
import { useOrganizationContractProjects } from "../../services/ContractProject/contractProject.api";
import {
  useAllContractPayments,
  useAllContractPenalties,
  useContractRegistry,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useSmnpReports } from "../../services/Reports/smnpSonek.api";
import { useSignatureEvents } from "../../services/Eds/eds.api";
import {
  ORDER_158N_PERIOD_TYPE_LABELS,
  ORDER_158N_QUARTER_LABELS,
  ORDER_158N_REPORT_STATUS_LABELS,
  buildOrder158nActivityReport,
  type Order158nCheckStatus,
  type Order158nQuarter,
  type Order158nReport,
  type Order158nReportPeriodType,
} from "../../services/Reports/order158nReport.schema";
import {
  useCreateOrder158nReport,
  useDeleteOrder158nReport,
  useOrder158nReports,
  useUpdateOrder158nReport,
} from "../../services/Reports/order158nReport.api";
import {
  exportOrder158nReportToDocx,
  exportOrder158nReportToPdf,
} from "../../services/Reports/order158nReportExport";
import {
  contractServiceFunctionParagraph,
  employeeFullName,
} from "../ContractService/contractService.config";
import LegalActRefs from "../LegalAct/LegalActRefs";
import styles from "./Order158nReportsPage.module.scss";
import Select from "../UI/Select";

type ReportTab = "overview" | "functions" | "staff" | "archive";

const CHECK_STATUS_TEXT: Record<Order158nCheckStatus, string> = {
  pass: "Соответствует",
  warning: "Требует внимания",
  fail: "Нарушение",
};

const formatMoney = (value: number): string =>
  `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ₽`;

export default function Order158nReportsPage() {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "order158n-reports");
  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const orgId = organization?.id;
  const { employee, isHead, isInContractService } = useMyContractRole();

  // Параметры конструктора отчёта (инициализация даты вне рендера)
  const [initialClock] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      iso: now.toISOString().slice(0, 10),
    };
  });

  const [periodType, setPeriodType] =
    useState<Order158nReportPeriodType>("annual");
  const [year, setYear] = useState<number>(initialClock.year);
  const [quarter, setQuarter] = useState<Order158nQuarter>("q4");
  const [customStart, setCustomStart] = useState<string>(
    `${initialClock.year}-01-01`,
  );
  const [customEnd, setCustomEnd] = useState<string>(initialClock.iso);
  const [reportNumber, setReportNumber] = useState<string>(
    `158н-${initialClock.year}-01`,
  );
  const [reportDate, setReportDate] = useState<string>(initialClock.iso);

  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [selectedArchiveReport, setSelectedArchiveReport] =
    useState<Order158nReport | null>(null);
  const [draftConclusionOverride, setDraftConclusionOverride] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Данные деятельности КС по всем модулям организации
  const { data: contractService = null } = useContractService(orgId);
  const { data: employees = [] } = useFetchOrganizationEmployees(orgId);
  const { data: educations = [] } = useOrganizationEducations(orgId);
  const { data: leaves = [] } = useOrganizationLeaves(orgId);
  const { data: accessRequests = [] } = useAccessRequests(orgId);
  const { data: tasks = [] } = useOrganizationTasks(orgId);
  const { data: taskEvaluations = [] } = useAllTaskEvaluations(Boolean(orgId));
  const { data: plans = [] } = usePurchasePlans(orgId);
  const { data: purchaseNotes = [] } = usePurchaseNotes(orgId);
  const { data: objectDescriptions = [] } =
    useOrganizationObjectDescriptions(orgId);
  const { data: okpd2Dictionary = [] } = useOkpd2Dictionary();
  const { data: defectLists = [] } = useOrganizationDefectLists(orgId);
  const { data: procurements = [] } = useGetProcurements();
  const { data: bidEvaluations = [] } = useOrganizationBidEvaluations(orgId);
  const { data: contractProjects = [] } =
    useOrganizationContractProjects(orgId);
  const { data: contracts = [] } = useContractRegistry(orgId);
  const { data: payments = [] } = useAllContractPayments(Boolean(orgId));
  const { data: penalties = [] } = useAllContractPenalties(Boolean(orgId));
  const { data: smnpReports = [] } = useSmnpReports(orgId);
  const { data: edsEvents = [] } = useSignatureEvents(orgId);

  const { data: savedReports = [], isLoading: isReportsLoading } =
    useOrder158nReports(orgId);
  const createReport = useCreateOrder158nReport();
  const updateReport = useUpdateOrder158nReport();
  const deleteReport = useDeleteOrder158nReport();

  const preparedByName = employee ? employeeFullName(employee) : undefined;

  // Автоматический расчёт актуального отчёта из живых данных системы
  const liveGeneratedReport = useMemo<Order158nReport | null>(() => {
    if (!organization) return null;
    return buildOrder158nActivityReport({
      organization,
      contractService,
      employees,
      educations,
      leaves,
      accessRequests,
      tasks,
      taskEvaluations,
      plans,
      purchaseNotes,
      objectDescriptions,
      okpd2Dictionary,
      defectLists,
      procurements,
      bidEvaluations,
      contractProjects,
      contracts,
      payments,
      penalties,
      smnpReports,
      edsEvents,
      periodConfig: {
        periodType,
        year,
        quarter,
        customStart,
        customEnd,
        reportNumber,
        reportDate,
      },
      preparedByName,
    });
  }, [
    organization,
    contractService,
    employees,
    educations,
    leaves,
    accessRequests,
    tasks,
    taskEvaluations,
    plans,
    purchaseNotes,
    objectDescriptions,
    okpd2Dictionary,
    defectLists,
    procurements,
    bidEvaluations,
    contractProjects,
    contracts,
    payments,
    penalties,
    smnpReports,
    edsEvents,
    periodType,
    year,
    quarter,
    customStart,
    customEnd,
    reportNumber,
    reportDate,
    preparedByName,
  ]);

  const activeReport = selectedArchiveReport ?? liveGeneratedReport;
  const effectiveConclusion =
    draftConclusionOverride ?? activeReport?.conclusionNote ?? "";

  const handleRebuildFromLiveData = () => {
    setSelectedArchiveReport(null);
    setDraftConclusionOverride(null);
    setFeedback({
      text: "Отчёт пересчитан автоматически по актуальным данным деятельности контрактной службы.",
    });
  };

  const handleSaveReport = async (targetStatus: "formed" | "approved") => {
    if (!activeReport || !orgId) return;
    setFeedback(null);

    const payload: Order158nReport = {
      ...activeReport,
      status: targetStatus,
      conclusionNote: effectiveConclusion,
      approvedByName:
        targetStatus === "approved"
          ? activeReport.approvedByName ||
            preparedByName ||
            organization?.responsiblePerson
          : activeReport.approvedByName,
    };

    try {
      if (selectedArchiveReport?.id) {
        const updated = await updateReport.mutateAsync({
          id: selectedArchiveReport.id,
          ...payload,
        });
        setSelectedArchiveReport(updated);
        setDraftConclusionOverride(null);
        setFeedback({
          text:
            targetStatus === "approved"
              ? `Отчёт № ${updated.reportNumber} утверждён и обновлён в реестре.`
              : `Отчёт № ${updated.reportNumber} обновлён в реестре.`,
        });
      } else {
        const created = await createReport.mutateAsync(payload);
        setSelectedArchiveReport(created);
        setDraftConclusionOverride(null);
        setFeedback({
          text:
            targetStatus === "approved"
              ? `Отчёт № ${created.reportNumber} сформирован, утверждён и сохранён в архиве.`
              : `Отчёт № ${created.reportNumber} сохранён в реестр отчётов № 158н.`,
        });
      }
    } catch (error) {
      setFeedback({
        text: `Не удалось сохранить отчёт: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      });
    }
  };

  const handleApproveFromArchive = async (report: Order158nReport) => {
    if (!report.id) return;
    try {
      const updated = await updateReport.mutateAsync({
        id: report.id,
        status: "approved",
        approvedByName:
          report.approvedByName ||
          preparedByName ||
          organization?.responsiblePerson,
      });
      if (selectedArchiveReport?.id === updated.id) {
        setSelectedArchiveReport(updated);
      }
      setFeedback({ text: `Отчёт № ${updated.reportNumber} утверждён.` });
    } catch (error) {
      setFeedback({
        text: `Ошибка утверждения: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      });
    }
  };

  const handleDeleteArchive = async (report: Order158nReport) => {
    if (!report.id) return;
    try {
      await deleteReport.mutateAsync(report.id);
      if (selectedArchiveReport?.id === report.id) {
        setSelectedArchiveReport(null);
        setDraftConclusionOverride(null);
      }
      setFeedback({ text: `Отчёт № ${report.reportNumber} удалён из реестра.` });
    } catch (error) {
      setFeedback({
        text: `Ошибка удаления: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      });
    }
  };

  const handleExportPdf = async (reportToExport: Order158nReport | null) => {
    if (!reportToExport) return;
    setIsExportingPdf(true);
    try {
      const ready: Order158nReport = {
        ...reportToExport,
        conclusionNote:
          reportToExport === activeReport
            ? effectiveConclusion
            : reportToExport.conclusionNote,
      };
      const fileName = await exportOrder158nReportToPdf(ready, organization);
      setFeedback({ text: `Сформирован PDF-документ: ${fileName}` });
    } catch (error) {
      setFeedback({
        text: `Ошибка экспорта PDF: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportDocx = async (reportToExport: Order158nReport | null) => {
    if (!reportToExport) return;
    setIsExportingDocx(true);
    try {
      const ready: Order158nReport = {
        ...reportToExport,
        conclusionNote:
          reportToExport === activeReport
            ? effectiveConclusion
            : reportToExport.conclusionNote,
      };
      const fileName = await exportOrder158nReportToDocx(ready, organization);
      setFeedback({ text: `Сформирован документ Word: ${fileName}` });
    } catch (error) {
      setFeedback({
        text: `Ошибка экспорта DOCX: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      });
    } finally {
      setIsExportingDocx(false);
    }
  };

  if (isOrgLoading) {
    return (
      <div className={block()}>
        <p>Загружаем сведения организации и данные контрактной службы...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className={block()}>
        <div className={block("notice")}>
          Войдите в учётную запись сотрудника организации, чтобы сформировать
          отчёт о деятельности контрактной службы по Приказу Минфина № 158н.
        </div>
      </div>
    );
  }

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div>
          <h1 className={block("title")}>
            Отчётность по Приказу Минфина № 158н
          </h1>
          <p className={block("subtitle")}>
            Автоматическое формирование сводного отчёта о деятельности
            контрактной службы (Разделы II–III) на основе состава КС, планов,
            СЗ, НМЦК, ООЗ, закупок, контрактов, ЭП, задач и образования
            сотрудников.
          </p>
        </div>

        <div className={block("header-actions")}>
          <Link className={block("btn-secondary")} to="/contract-service">
            Карточка КС
          </Link>
          <Link className={block("btn-secondary")} to="/tasks">
            Задачи КС
          </Link>
        </div>
      </header>

      <LegalActRefs component="Order158nReportsPage" />

      {/* ===== Конструктор периода и действия ===== */}
      <section className={block("panel")}>
        <h2 className={block("panel-title")}>
          Параметры автоматического формирования отчёта
        </h2>
        <div className={block("controls-grid")}>
          <div className={block("field")}>
            <label htmlFor="r158-period-type">Тип отчётного периода</label>
            <Select
              id="r158-period-type"
              value={periodType}
              onChange={(e) => {
                setSelectedArchiveReport(null);
                setPeriodType(e.target.value as Order158nReportPeriodType);
              }}
            >
              {(
                Object.entries(ORDER_158N_PERIOD_TYPE_LABELS) as [
                  Order158nReportPeriodType,
                  string,
                ][]
              ).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className={block("field")}>
            <label htmlFor="r158-year">Отчётный год</label>
            <input
              id="r158-year"
              type="number"
              min={2020}
              max={2100}
              value={year}
              onChange={(e) => {
                setSelectedArchiveReport(null);
                setYear(Number(e.target.value) || initialClock.year);
              }}
            />
          </div>

          {periodType === "quarterly" && (
            <div className={block("field")}>
              <label htmlFor="r158-quarter">Квартал</label>
              <Select
                id="r158-quarter"
                value={quarter}
                onChange={(e) => {
                  setSelectedArchiveReport(null);
                  setQuarter(e.target.value as Order158nQuarter);
                }}
              >
                {(
                  Object.entries(ORDER_158N_QUARTER_LABELS) as [
                    Order158nQuarter,
                    string,
                  ][]
                ).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {periodType === "custom" && (
            <>
              <div className={block("field")}>
                <label htmlFor="r158-start">Дата начала</label>
                <input
                  id="r158-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => {
                    setSelectedArchiveReport(null);
                    setCustomStart(e.target.value);
                  }}
                />
              </div>
              <div className={block("field")}>
                <label htmlFor="r158-end">Дата окончания</label>
                <input
                  id="r158-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => {
                    setSelectedArchiveReport(null);
                    setCustomEnd(e.target.value);
                  }}
                />
              </div>
            </>
          )}

          <div className={block("field")}>
            <label htmlFor="r158-num">Номер отчёта</label>
            <input
              id="r158-num"
              type="text"
              value={reportNumber}
              onChange={(e) => {
                setSelectedArchiveReport(null);
                setReportNumber(e.target.value);
              }}
            />
          </div>

          <div className={block("field")}>
            <label htmlFor="r158-date">Дата отчёта</label>
            <input
              id="r158-date"
              type="date"
              value={reportDate}
              onChange={(e) => {
                setSelectedArchiveReport(null);
                setReportDate(e.target.value);
              }}
            />
          </div>
        </div>

        <div className={block("actions-bar")}>
          <div className={block("btn-group")}>
            <button
              type="button"
              className={block("btn-primary")}
              onClick={handleRebuildFromLiveData}
            >
              Сформировать отчёт автоматически
            </button>

            <button
              type="button"
              className={block("btn-secondary")}
              disabled={createReport.isPending || updateReport.isPending}
              onClick={() => void handleSaveReport("formed")}
            >
              {selectedArchiveReport?.id
                ? "Обновить в реестре"
                : "Сохранить в реестр"}
            </button>

            {(isHead || isInContractService) && (
              <button
                type="button"
                className={block("btn-secondary")}
                disabled={createReport.isPending || updateReport.isPending}
                onClick={() => void handleSaveReport("approved")}
              >
                Утвердить отчёт
              </button>
            )}
          </div>

          <div className={block("btn-group")}>
            <button
              type="button"
              className={block("btn-secondary")}
              disabled={isExportingPdf || !activeReport}
              onClick={() => void handleExportPdf(activeReport)}
            >
              {isExportingPdf ? "Формирование PDF..." : "Выгрузить PDF (158н)"}
            </button>
            <button
              type="button"
              className={block("btn-secondary")}
              disabled={isExportingDocx || !activeReport}
              onClick={() => void handleExportDocx(activeReport)}
            >
              {isExportingDocx
                ? "Формирование DOCX..."
                : "Выгрузить Word (.docx)"}
            </button>
          </div>
        </div>

        {selectedArchiveReport && (
          <p className={block("kpi-meta")} style={{ marginTop: 10 }}>
            Просмотр сохранённого отчёта № {selectedArchiveReport.reportNumber}{" "}
            ({ORDER_158N_REPORT_STATUS_LABELS[selectedArchiveReport.status]}).
            Нажмите «Сформировать отчёт автоматически», чтобы вернуться к
            текущему живому срезу.
          </p>
        )}

        {feedback && (
          <div
            className={block(
              "feedback",
              feedback.isError ? ["error"] : [],
            )}
          >
            {feedback.text}
          </div>
        )}
      </section>

      {activeReport && (
        <>
          {/* ===== Ключевые KPI ===== */}
          <section className={block("kpi-grid")}>
            <article
              className={block("kpi-card", [activeReport.complianceStatus])}
            >
              <span className={block("kpi-label")}>Соответствие № 158н</span>
              <strong className={block("kpi-value")}>
                {activeReport.complianceScorePercent}%
              </strong>
              <span className={block("kpi-meta")}>
                {CHECK_STATUS_TEXT[activeReport.complianceStatus]} · проверок:{" "}
                {activeReport.complianceChecks.length}
              </span>
            </article>

            <article className={block("kpi-card")}>
              <span className={block("kpi-label")}>
                Контрактная служба (п. 2.1–2.2)
              </span>
              <strong className={block("kpi-value")}>
                {activeReport.headcount} чел.
              </strong>
              <span className={block("kpi-meta")}>
                {activeReport.creationMethodLabel}
              </span>
            </article>

            <article className={block("kpi-card")}>
              <span className={block("kpi-label")}>
                Образование п. 2.5
              </span>
              <strong className={block("kpi-value")}>
                {activeReport.educationCompliantCount} /{" "}
                {activeReport.educationTotalChecked}
              </strong>
              <span className={block("kpi-meta")}>
                Заявок на обучение: {activeReport.openEducationRequestsCount}
              </span>
            </article>

            <article className={block("kpi-card")}>
              <span className={block("kpi-label")}>
                Задачи КС и дисциплина
              </span>
              <strong className={block("kpi-value")}>
                {activeReport.tasksCompletedCount} /{" "}
                {activeReport.tasksTotalCount}
              </strong>
              <span className={block("kpi-meta")}>
                В срок: {activeReport.tasksOnTimeRate}% · просрочено:{" "}
                {activeReport.tasksOverdueCount}
              </span>
            </article>

            <article className={block("kpi-card")}>
              <span className={block("kpi-label")}>
                Закупки, СЗ и НМЦК (п. 3.1–3.3)
              </span>
              <strong className={block("kpi-value")}>
                {activeReport.procurementsCount} закуп.
              </strong>
              <span className={block("kpi-meta")}>
                СЗ с НМЦК: {activeReport.notesWithNmckCount} из{" "}
                {activeReport.notesTotalCount} · ООЗ: {activeReport.oozTotalCount}
              </span>
            </article>

            <article className={block("kpi-card")}>
              <span className={block("kpi-label")}>
                Контракты и СМП (п. 3.4–3.5)
              </span>
              <strong className={block("kpi-value")}>
                {activeReport.contractsTotalCount} контр.
              </strong>
              <span className={block("kpi-meta")}>
                Сумма: {formatMoney(activeReport.contractsTotalAmount)} · СМП:{" "}
                {activeReport.smnpSharePercent}%
              </span>
            </article>
          </section>

          {/* ===== Вкладки детализации ===== */}
          <nav className={block("tabs")} aria-label="Разделы отчёта 158н">
            <button
              type="button"
              className={block(
                "tab",
                activeTab === "overview" ? ["active"] : [],
              )}
              onClick={() => setActiveTab("overview")}
            >
              Организация КС и соответствие № 158н
            </button>
            <button
              type="button"
              className={block(
                "tab",
                activeTab === "functions" ? ["active"] : [],
              )}
              onClick={() => setActiveTab("functions")}
            >
              Деятельность по Разделу III (п. 3.1–3.5)
            </button>
            <button
              type="button"
              className={block(
                "tab",
                activeTab === "staff" ? ["active"] : [],
              )}
              onClick={() => setActiveTab("staff")}
            >
              Персонал, образование (п. 2.5) и KPI
            </button>
            <button
              type="button"
              className={block(
                "tab",
                activeTab === "archive" ? ["active"] : [],
              )}
              onClick={() => setActiveTab("archive")}
            >
              Реестр отчётов ({savedReports.length})
            </button>
          </nav>

          {/* ===== TAB 1: Паспорт и контроль 158н ===== */}
          {activeTab === "overview" && (
            <>
              <section className={block("panel")}>
                <h2 className={block("panel-title")}>
                  1. Паспорт контрактной службы заказчика (Раздел I–II № 158н)
                </h2>
                <dl className={block("requisites")}>
                  <div>
                    <dt>Заказчик</dt>
                    <dd>
                      {activeReport.organizationFullName}
                      {activeReport.organizationInn
                        ? ` (ИНН ${activeReport.organizationInn})`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Отчётный период</dt>
                    <dd>{activeReport.periodLabel}</dd>
                  </div>
                  <div>
                    <dt>Способ создания КС (п. 2.1)</dt>
                    <dd>
                      {activeReport.creationMethodLabel}
                      {activeReport.structuralUnitName
                        ? ` («${activeReport.structuralUnitName}»)`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Приказ о создании</dt>
                    <dd>
                      {activeReport.orderNumber
                        ? `№ ${activeReport.orderNumber} от ${formatDate(activeReport.orderDate)}`
                        : "Не указан"}
                    </dd>
                  </div>
                  <div>
                    <dt>Руководитель КС / КУ (п. 2.3)</dt>
                    <dd>
                      {activeReport.headName
                        ? `${activeReport.headName}${activeReport.headOrderNumber ? ` (приказ № ${activeReport.headOrderNumber} от ${formatDate(activeReport.headOrderDate)})` : ""}`
                        : "Не назначен"}
                    </dd>
                  </div>
                  <div>
                    <dt>СГОЗ по плану-графику</dt>
                    <dd>{formatMoney(activeReport.annualPlannedVolume)}</dd>
                  </div>
                </dl>
              </section>

              <section className={block("panel")}>
                <h2 className={block("panel-title")}>
                  2. Контроль соблюдения требований Приказа Минфина № 158н
                </h2>
                <ul className={block("check-list")}>
                  {activeReport.complianceChecks.map((check) => (
                    <li
                      key={check.id}
                      className={block("check-item", [check.status])}
                    >
                      <div className={block("check-head")}>
                        <span className={block("clause")}>{check.clause}</span>
                        <strong>{check.title}</strong>
                        <span className={block("pill", [check.status])}>
                          {CHECK_STATUS_TEXT[check.status]}
                        </span>
                      </div>
                      <p className={block("check-detail")}>{check.detail}</p>
                      {check.actionTo && check.actionLabel && (
                        <Link
                          className={block("check-link")}
                          to={check.actionTo}
                        >
                          {check.actionLabel} →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className={block("panel")}>
                <h2 className={block("panel-title")}>
                  3. Итоговые выводы и рекомендации
                </h2>
                <ul className={block("rec-list")}>
                  {activeReport.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>

                <div className={block("field")}>
                  <label htmlFor="r158-conclusion">
                    Заключение руководителя контрактной службы / пояснительная
                    записка (попадает в PDF и Word)
                  </label>
                  <textarea
                    id="r158-conclusion"
                    rows={3}
                    value={effectiveConclusion}
                    onChange={(e) => setDraftConclusionOverride(e.target.value)}
                  />
                </div>
              </section>
            </>
          )}

          {/* ===== TAB 2: Деятельность по Разделу III (п. 3.1-3.5) ===== */}
          {activeTab === "functions" && (
            <section className={block("panel")}>
              <h2 className={block("panel-title")}>
                Исполнение функций и полномочий Раздела III Приказа № 158н
              </h2>
              <div className={block("table-wrap")}>
                <table className={block("table")}>
                  <thead>
                    <tr>
                      <th>Пункт</th>
                      <th>Функция и полномочия</th>
                      <th>Ответственные в КС</th>
                      <th>Задачи за период</th>
                      <th>Ср. балл</th>
                      <th>Детализация деятельности</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeReport.functionActivities.map((fn) => (
                      <tr key={fn.functionCode}>
                        <td>
                          <strong>{fn.paragraph}</strong>
                        </td>
                        <td>{fn.title}</td>
                        <td>
                          <strong>{fn.assignedEmployeesCount} чел.</strong>
                          {fn.assignedEmployeeNames.length > 0 && (
                            <div className={block("kpi-meta")}>
                              {fn.assignedEmployeeNames.join(", ")}
                            </div>
                          )}
                        </td>
                        <td>
                          Всего: <strong>{fn.tasksTotal}</strong>
                          <div className={block("kpi-meta")}>
                            Вып.: {fn.tasksCompleted} · В работе:{" "}
                            {fn.tasksInProgress} · Ожид.: {fn.tasksPending}
                            {fn.tasksOverdue > 0
                              ? ` · Проср.: ${fn.tasksOverdue}`
                              : ""}
                          </div>
                        </td>
                        <td>
                          {fn.averageScore !== null &&
                          fn.averageScore !== undefined
                            ? `${fn.averageScore} б.`
                            : "—"}
                        </td>
                        <td>
                          <strong>
                            {fn.keyMetricLabel}: {fn.keyMetricValue}
                          </strong>
                          <ul className={block("sub-list")}>
                            {fn.subIndicators.map((sub, idx) => (
                              <li key={idx}>
                                {sub.label}: <strong>{sub.value}</strong>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ===== TAB 3: Кадры КС, п. 2.5 и KPI ===== */}
          {activeTab === "staff" && (
            <section className={block("panel")}>
              <h2 className={block("panel-title")}>
                Персональный состав КС, соответствие образованию (п. 2.5) и KPI
              </h2>
              {activeReport.employeePerformances.length === 0 ? (
                <div className={block("empty")}>
                  В организации не назначены работники контрактной службы или
                  контрактный управляющий.
                </div>
              ) : (
                <div className={block("table-wrap")}>
                  <table className={block("table")}>
                    <thead>
                      <tr>
                        <th>Сотрудник и роль</th>
                        <th>Функции (Раздел III)</th>
                        <th>Образование / ДПО (п. 2.5)</th>
                        <th>Отсутствия</th>
                        <th>Задачи и сроки</th>
                        <th>Оценки и KPI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeReport.employeePerformances.map((emp, idx) => (
                        <tr key={`${emp.fullName}-${idx}`}>
                          <td>
                            <strong>{emp.fullName}</strong>
                            <div className={block("kpi-meta")}>
                              {emp.role} · {emp.position}
                            </div>
                            <div className={block("kpi-meta")}>
                              {emp.structuralUnitName}
                            </div>
                          </td>
                          <td>
                            {emp.functions.length > 0 ? (
                              <div className={block("fn-chips")}>
                                {emp.functions.map((f) => (
                                  <span key={f} className={block("fn-chip")}>
                                    {contractServiceFunctionParagraph(f)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className={block("kpi-meta")}>
                                Не назначены
                              </span>
                            )}
                          </td>
                          <td>
                            <div
                              className={block("status-text", [
                                emp.dpoExpired
                                  ? "bad"
                                  : !emp.hasProfileEducation ||
                                      emp.dpoExpiringSoon
                                    ? "warn"
                                    : "ok",
                              ])}
                            >
                              {emp.educationSummary}
                            </div>
                            {emp.educationWarning && (
                              <div className={block("kpi-meta")}>
                                {emp.educationWarning}
                              </div>
                            )}
                            {emp.hasOpenEducationRequest && (
                              <div className={block("kpi-meta")}>
                                Направлена заявка на обучение
                              </div>
                            )}
                          </td>
                          <td>
                            {emp.leavesCount > 0
                              ? `${emp.leavesCount} пер. (${emp.leaveDaysCount} раб. дн.)`
                              : "Нет"}
                          </td>
                          <td>
                            Всего: <strong>{emp.tasksTotal}</strong> (вып.:{" "}
                            {emp.tasksCompleted})
                            <div className={block("kpi-meta")}>
                              В срок: {emp.onTimeRate}% · просрочено:{" "}
                              {emp.tasksOverdue}
                            </div>
                          </td>
                          <td>
                            {emp.evaluationsCount > 0 ? (
                              <>
                                <strong>
                                  {emp.averageScore} б. (сумм.{" "}
                                  {emp.totalScorePoints})
                                </strong>
                                <div className={block("kpi-meta")}>
                                  {emp.salaryImpactText} (оценок:{" "}
                                  {emp.evaluationsCount})
                                </div>
                              </>
                            ) : (
                              <span className={block("kpi-meta")}>
                                Нет оценок
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ===== TAB 4: Реестр сохранённых отчётов ===== */}
          {activeTab === "archive" && (
            <section className={block("panel")}>
              <h2 className={block("panel-title")}>
                Реестр сохранённых отчётов по Приказу № 158н
              </h2>
              {isReportsLoading ? (
                <p>Загрузка сохранённых отчётов...</p>
              ) : savedReports.length === 0 ? (
                <div className={block("empty")}>
                  Сохранённых отчётов пока нет. Нажмите «Сохранить в реестр»
                  выше, чтобы зафиксировать текущий отчёт.
                </div>
              ) : (
                <div className={block("table-wrap")}>
                  <table className={block("table")}>
                    <thead>
                      <tr>
                        <th>Номер и дата</th>
                        <th>Период</th>
                        <th>Соответствие</th>
                        <th>Статус</th>
                        <th>Сформировал</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedReports.map((rep) => (
                        <tr key={String(rep.id)}>
                          <td>
                            <strong>№ {rep.reportNumber}</strong>
                            <div className={block("kpi-meta")}>
                              от {formatDate(rep.reportDate)}
                            </div>
                          </td>
                          <td>{rep.periodLabel}</td>
                          <td>
                            <strong>{rep.complianceScorePercent}%</strong> (
                            {CHECK_STATUS_TEXT[rep.complianceStatus]})
                          </td>
                          <td>
                            {ORDER_158N_REPORT_STATUS_LABELS[rep.status]}
                          </td>
                          <td>{rep.preparedByName || "—"}</td>
                          <td>
                            <div className={block("btn-group")}>
                              <button
                                type="button"
                                className={block("btn-secondary")}
                                onClick={() => {
                                  setSelectedArchiveReport(rep);
                                  setDraftConclusionOverride(null);
                                  setActiveTab("overview");
                                }}
                              >
                                Открыть
                              </button>
                              {rep.status !== "approved" &&
                                (isHead || isInContractService) && (
                                  <button
                                    type="button"
                                    className={block("btn-secondary")}
                                    onClick={() => void handleApproveFromArchive(rep)}
                                  >
                                    Утвердить
                                  </button>
                                )}
                              <button
                                type="button"
                                className={block("btn-secondary")}
                                onClick={() => void handleExportPdf(rep)}
                              >
                                PDF
                              </button>
                              <button
                                type="button"
                                className={block("btn-secondary")}
                                onClick={() => void handleExportDocx(rep)}
                              >
                                DOCX
                              </button>
                              <button
                                type="button"
                                className={block("btn-danger")}
                                onClick={() => void handleDeleteArchive(rep)}
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
