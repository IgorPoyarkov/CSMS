import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, Lock } from "lucide-react";
import useMyContractRole from "../../../hooks/useMyContractRole";
import useUtils from "../../../hooks/useUtils";
import type { ContractProject } from "../../../services/ContractProject/contractProject.schema";
import { useOrganizationContractProjects } from "../../../services/ContractProject/contractProject.api";
import { useNoticeFormContext } from "../noticeFieldLockHooks";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";

const STATUS_LABELS: Record<ContractProject["status"], string> = {
  draft: "Черновик",
  published: "Размещён",
  signed: "Подписан",
  terminated: "Расторгнут",
};

/**
 * Read-only просмотр утверждённого проекта контракта.
 *
 * Источник — сохранённый проект контракта, связанный с закупкой по
 * procurementId или ИКЗ. В извещении отображаются ключевые условия
 * (предмет, цена, сроки, обеспечения, СМП) и ссылка на карточку проекта.
 */
const ContractProjectPreviewSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "contract-project-preview");
  const { organization } = useMyContractRole();
  const { data: projects = [] } = useOrganizationContractProjects(
    organization?.id,
  );
  const { watch } = useNoticeFormContext<NoticeInfoFormValues>();

  const contractProjectId = watch("contractProjectId");
  const procurementId = watch("procurementId");
  const ikz = watch("generalInfo.ikz");

  const matchedProject = useMemo(() => {
    // 1. По id из формы
    if (contractProjectId !== undefined && contractProjectId !== "") {
      const byId = projects.find(
        (p) => String(p.id) === String(contractProjectId),
      );
      if (byId) return byId;
    }
    // 2. По procurementId (если procurementId был подставлен из route state)
    if (procurementId !== undefined && procurementId !== "") {
      const byProc = projects.find(
        (p) => String(p.procurementId ?? "") === String(procurementId),
      );
      if (byProc) return byProc;
    }
    // 3. По ИКЗ
    if (ikz) {
      return projects.find((p) => p.ikz === ikz);
    }
    return undefined;
  }, [projects, contractProjectId, procurementId, ikz]);

  if (!matchedProject) {
    return (
      <section className={block("section")}>
        <h2 className={block("section-title")}>
          <FileText size={14} aria-hidden="true" />
          Проект контракта
        </h2>
        <p className={block("hint")}>
          Проект контракта формируется после публикации извещения в модуле
          «Проект контракта». Утверждённый проект автоматически фиксирует
          условия закупки в извещении.
        </p>
      </section>
    );
  }

  const isPublished = matchedProject.status !== "draft";
  const subject = matchedProject.subject;
  const price = matchedProject.price;

  const formatMoney = (value?: string): string => {
    const num = Number.parseFloat(value ?? "");
    if (!Number.isFinite(num) || num <= 0) return "—";
    return `${num.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₽`;
  };

  const formatDate = (value?: string): string => {
    if (!value) return "—";
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        <FileText size={14} aria-hidden="true" />
        Проект контракта
        <span
          className={block("badge", [
            matchedProject.status === "signed"
              ? "signed"
              : matchedProject.status === "published"
                ? "published"
                : "draft",
          ])}
        >
          {STATUS_LABELS[matchedProject.status]}
        </span>
        {isPublished && (
          <span className={block("badge", ["approved"])}>
            <Lock size={12} /> Условия зафиксированы
          </span>
        )}
      </h2>

      <div className={block("grid")}>
        <div className={block("field-col", ["full"])}>
          <span className={block("label")}>Наименование</span>
          <span className={block("value")}>
            {matchedProject.contractName || "—"}
          </span>
        </div>
        {matchedProject.contractNumber && (
          <div className={block("field-col")}>
            <span className={block("label")}>Номер проекта</span>
            <span className={block("value")}>
              {matchedProject.contractNumber}
            </span>
          </div>
        )}
        <div className={block("field-col")}>
          <span className={block("label")}>Вид контракта</span>
          <span className={block("value")}>{matchedProject.kind || "—"}</span>
        </div>
        {subject?.objectName && (
          <div className={block("field-col", ["full"])}>
            <span className={block("label")}>Предмет</span>
            <span className={block("value")}>{subject.objectName}</span>
          </div>
        )}
        {subject?.description && (
          <div className={block("field-col", ["full"])}>
            <span className={block("label")}>Описание предмета</span>
            <span className={block("value")}>{subject.description}</span>
          </div>
        )}
        {price?.finalPrice && (
          <div className={block("field-col")}>
            <span className={block("label")}>Цена контракта</span>
            <span className={block("value", ["highlight"])}>
              {formatMoney(price.finalPrice)}
            </span>
          </div>
        )}
        {price?.currency && (
          <div className={block("field-col")}>
            <span className={block("label")}>Валюта</span>
            <span className={block("value")}>{price.currency}</span>
          </div>
        )}
        {matchedProject.term?.startDate && (
          <div className={block("field-col")}>
            <span className={block("label")}>Начало исполнения</span>
            <span className={block("value")}>
              {formatDate(matchedProject.term.startDate)}
            </span>
          </div>
        )}
        {matchedProject.term?.endDate && (
          <div className={block("field-col")}>
            <span className={block("label")}>Окончание исполнения</span>
            <span className={block("value")}>
              {formatDate(matchedProject.term.endDate)}
            </span>
          </div>
        )}
        {price?.paymentTermDays && (
          <div className={block("field-col")}>
            <span className={block("label")}>Срок оплаты (раб. дн.)</span>
            <span className={block("value")}>{price.paymentTermDays}</span>
          </div>
        )}
        {matchedProject.smp?.required && (
          <div className={block("field-col")}>
            <span className={block("label")}>СМП/СОНКО</span>
            <span className={block("value")}>
              {matchedProject.smpRequiredPercent
                ? `${matchedProject.smpRequiredPercent}%`
                : "требование установлено"}
            </span>
          </div>
        )}
      </div>

      <div className={block("actions")}>
        <Link
          to={`/procurement-processing/${matchedProject.procurementId ?? ikz}/contract-project`}
          className={block("link-btn")}
        >
          Открыть проект контракта
          <ExternalLink size={12} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default ContractProjectPreviewSection;
