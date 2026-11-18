import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, FileText } from "lucide-react";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import {
  usePurchaseNotes,
  useUpdatePurchaseNote,
} from "../../services/PurchaseNote/purchaseNote.api";
import {
  PURCHASE_NOTE_STATUS_META,
  PURCHASE_NOTE_STATUSES,
  getPurchaseNoteStatusMeta,
  hasSmpSubcontractingRequirement,
  type PurchaseNote,
  type PurchaseNoteStatus,
} from "../../services/PurchaseNote/purchaseNote.schema";
import {
  exportPurchaseNoteToDocx,
  exportPurchaseNoteToPdf,
} from "../../services/PurchaseNote/purchaseNoteExport";
import PurchaseNoteStatusBadge from "./PurchaseNoteStatusBadge";
import styles from "./PurchaseNotesRegistryPage.module.scss";

type FilterStatus = "all" | PurchaseNoteStatus;

const formatMoney = (raw?: string) => {
  if (!raw) return "—";
  const num = Number(raw);
  if (!Number.isFinite(num)) return raw;
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)} ₽`;
};

const formatRuDate = (iso?: string) => {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
};

/**
 * Реестр потребностей (служебных записок по позициям планов-графиков):
 * отображает все созданные СЗ организации с визуальным индикатором статуса
 * согласования, быстрым переключением статуса уполномоченным членом КС и
 * выгрузкой каждой СЗ в .docx или .pdf для подписания вне системы.
 */
export default function PurchaseNotesRegistryPage() {
  const navigate = useNavigate();
  const { bem } = useUtils();
  const block = bem(styles, "purchase-notes-registry");

  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const organizationId = organization?.id;
  const {
    data: notes = [],
    isLoading: isNotesLoading,
    isError,
    error,
  } = usePurchaseNotes(organizationId);
  const { data: plans = [] } = usePurchasePlans(organizationId);
  const updateNote = useUpdatePurchaseNote();

  const {
    employee,
    canEditPurchaseNote,
    canDisagreeKbk,
    isLoading: isRoleLoading,
  } = useMyContractRole();
  const canApprove = Boolean(canEditPurchaseNote || canDisagreeKbk);

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const planById = useMemo(
    () => new Map(plans.map((plan) => [String(plan.id), plan])),
    [plans],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<PurchaseNoteStatus, number> = {
      draft: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };
    for (const note of notes) {
      const s = (note.status ?? "draft") as PurchaseNoteStatus;
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...notes]
      .sort((a, b) =>
        String(b.noteDate || b.createdAt || "").localeCompare(
          String(a.noteDate || a.createdAt || ""),
        ),
      )
      .filter((note) => {
        if (statusFilter !== "all" && (note.status ?? "draft") !== statusFilter) {
          return false;
        }
        if (!q) return true;
        const haystack = [
          note.noteNumber,
          note.subject,
          note.ikz,
          note.kbk,
          note.initiatorName,
          note.purchasePlanNumber,
          note.positionUniqueNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [notes, statusFilter, searchQuery]);

  const resolvePlanAndPosition = (note: PurchaseNote) => {
    const plan =
      note.purchasePlanId !== undefined && note.purchasePlanId !== null
        ? planById.get(String(note.purchasePlanId))
        : undefined;
    const position =
      plan && note.positionId !== undefined && note.positionId !== null
        ? plan.positions.find((p) => String(p.id) === String(note.positionId))
        : undefined;
    return { plan, position };
  };

  const handleExport = async (
    note: PurchaseNote,
    format: "docx" | "pdf",
  ) => {
    const key = `${String(note.id ?? note.noteNumber)}:${format}`;
    setExportingKey(key);
    setExportError(null);
    try {
      const { plan, position } = resolvePlanAndPosition(note);
      const context = { note, organization, plan, position };
      if (format === "docx") {
        await exportPurchaseNoteToDocx(context);
      } else {
        await exportPurchaseNoteToPdf(context);
      }
    } catch (err) {
      setExportError(
        `Не удалось сформировать ${format.toUpperCase()}: ${String(err)}`,
      );
    } finally {
      setExportingKey(null);
    }
  };

  const handleChangeStatus = (
    note: PurchaseNote,
    nextStatus: PurchaseNoteStatus,
  ) => {
    if (!canApprove || note.id === undefined) return;
    const emp = employee?.employee;
    const actor = emp
      ? [emp.surname, emp.name, emp.patronymic].filter(Boolean).join(" ")
      : undefined;
    updateNote.mutate({
      id: note.id,
      status: nextStatus,
      approvalUpdatedAt: new Date().toISOString().slice(0, 10),
      approvalUpdatedBy: actor || note.approvalUpdatedBy,
    });
  };

  if (isOrgLoading || isNotesLoading) {
    return (
      <p className={block("status")}>Загружаем реестр потребностей (СЗ)…</p>
    );
  }

  if (!organizationId) {
    return (
      <section className={block()}>
        <p className={block("status", ["error"])}>
          Организация заказчика не определена. Войдите под учётной записью
          организации.
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/")}
        >
          ← На главную
        </button>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={block()}>
        <p className={block("status", ["error"])}>
          Ошибка загрузки реестра потребностей: {String(error)}
        </p>
      </section>
    );
  }

  return (
    <section className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <button
            type="button"
            className={block("back")}
            onClick={() => navigate("/")}
          >
            ← На главную
          </button>
          <h1 className={block("title")}>
            Реестр потребностей (служебные записки)
          </h1>
          <p className={block("subtitle")}>
            {organization?.shortName || organization?.fullName} · всего СЗ:{" "}
            {notes.length}. Для каждой СЗ показан статус согласования и
            доступна выгрузка в .docx / .pdf для подписания вне системы.
          </p>
        </div>

        <button
          type="button"
          className={block("plan-link")}
          onClick={() => navigate("/purchase-plans")}
        >
          Перейти к планам-графикам →
        </button>
      </header>

      <div className={block("filters")}>
        <div className={block("chips")} role="group" aria-label="Фильтр по статусу">
          <button
            type="button"
            className={block("chip", statusFilter === "all" ? ["active"] : [])}
            onClick={() => setStatusFilter("all")}
          >
            Все ({notes.length})
          </button>
          {PURCHASE_NOTE_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                className={block("chip", statusFilter === st ? ["active"] : [])}
                onClick={() => setStatusFilter(st)}
              >
                <PurchaseNoteStatusBadge status={st} compact />
                <span>{statusCounts[st]}</span>
              </button>
          ))}
        </div>

        <input
          type="search"
          className={block("search")}
          placeholder="Поиск по № СЗ, предмету закупки, ИКЗ, КБК, ПГ или инициатору…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {exportError && (
        <div className={block("error-banner")} role="alert">
          {exportError}
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <div className={block("empty")}>
          <p>
            Потребностей по выбранным условиям пока нет. Сформировать СЗ можно
            из меню «Действия → Сформировать потребность» нужной позиции
            плана-графика.
          </p>
          <button
            type="button"
            className={block("plan-link")}
            onClick={() => navigate("/purchase-plans")}
          >
            Открыть планы-графики
          </button>
        </div>
      ) : (
        <ul className={block("list")}>
          {filteredNotes.map((note) => {
            const noteKey = String(note.id ?? note.noteNumber);
            const { plan, position } = resolvePlanAndPosition(note);
            const canOpenForm =
              note.purchasePlanId !== undefined &&
              note.purchasePlanId !== null &&
              note.purchasePlanId !== "" &&
              note.positionId !== undefined &&
              note.positionId !== null &&
              note.positionId !== "";
            const isExportingDocx = exportingKey === `${noteKey}:docx`;
            const isExportingPdf = exportingKey === `${noteKey}:pdf`;
            const statusMeta = getPurchaseNoteStatusMeta(note.status);

            return (
              <li
                key={noteKey}
                className={block("card", [statusMeta.tone])}
              >
                <div className={block("card-head")}>
                  <div className={block("card-title-row")}>
                    <PurchaseNoteStatusBadge status={note.status} />
                    <h2 className={block("card-title")}>
                      СЗ № {note.noteNumber || noteKey} от{" "}
                      {formatRuDate(note.noteDate)}
                    </h2>
                    {note.kbkDisagreement && (
                      <span className={block("flag", ["warn"])}>
                        Несогласие с КБК
                      </span>
                    )}
                    {hasSmpSubcontractingRequirement(note) && (
                      <span className={block("flag")}>
                        СМП {note.smpRequiredPercent ?? "?"}%
                      </span>
                    )}
                  </div>

                  <span className={block("amount")}>
                    {formatMoney(note.initialMaxPrice)}
                  </span>
                </div>

                <p className={block("subject")}>
                  {note.subject || position?.objectOfPurchase || "Предмет не указан"}
                </p>

                <dl className={block("meta")}>
                  <div>
                    <dt>Инициатор</dt>
                    <dd>{note.initiatorName || "—"}</dd>
                  </div>
                  <div>
                    <dt>План-график / Позиция</dt>
                    <dd>
                      {note.purchasePlanNumber || plan?.planNumber || "—"}
                      {note.positionSerialNumber
                        ? ` · поз. № ${note.positionSerialNumber}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>ИКЗ</dt>
                    <dd className={block("mono")}>
                      {note.ikz || position?.identificationCode || "не сформирован"}
                    </dd>
                  </div>
                  <div>
                    <dt>КБК</dt>
                    <dd className={block("mono")}>
                      {note.kbk || position?.kbk || "не указан"}
                    </dd>
                  </div>
                  {(note.approvalUpdatedBy || note.approvalUpdatedAt) && (
                    <div>
                      <dt>Согласование</dt>
                      <dd>
                        {[
                          note.approvalUpdatedBy,
                          note.approvalUpdatedAt
                            ? formatRuDate(note.approvalUpdatedAt)
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className={block("card-actions")}>
                  <div className={block("status-control")}>
                    <label
                      className={block("status-label")}
                      htmlFor={`sz-status-${noteKey}`}
                    >
                      Статус согласования:
                    </label>
                    <select
                      id={`sz-status-${noteKey}`}
                      className={block("select")}
                      value={note.status ?? "draft"}
                      disabled={
                        isRoleLoading || !canApprove || updateNote.isPending
                      }
                      onChange={(e) =>
                        handleChangeStatus(
                          note,
                          e.target.value as PurchaseNoteStatus,
                        )
                      }
                    >
                      {PURCHASE_NOTE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {PURCHASE_NOTE_STATUS_META[st].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={block("buttons")}>
                    <button
                      type="button"
                      className={block("btn")}
                      disabled={isExportingDocx || isExportingPdf}
                      onClick={() => handleExport(note, "docx")}
                      title="Выгрузить служебную записку в Word (.docx) для подписания вне системы"
                    >
                      <FileSpreadsheet size={15} aria-hidden="true" />
                      <span>
                        {isExportingDocx ? "Формирование…" : "Выгрузить .docx"}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={block("btn")}
                      disabled={isExportingDocx || isExportingPdf}
                      onClick={() => handleExport(note, "pdf")}
                      title="Выгрузить служебную записку в PDF (.pdf) для подписания вне системы"
                    >
                      <FileText size={15} aria-hidden="true" />
                      <span>
                        {isExportingPdf ? "Формирование…" : "Выгрузить .pdf"}
                      </span>
                    </button>

                    {canOpenForm && (
                      <button
                        type="button"
                        className={block("btn", ["primary"])}
                        onClick={() =>
                          navigate(
                            `/purchase-plans/${note.purchasePlanId}/positions/${note.positionId}/requirement?noteId=${note.id ?? ""}`,
                          )
                        }
                      >
                        Открыть СЗ
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
