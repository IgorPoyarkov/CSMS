import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  FileCheck2,
  FileSignature,
  FileText,
} from "lucide-react";
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
  filterVisiblePurchaseNotes,
  getPurchaseNoteStatusMeta,
  hasSmpSubcontractingRequirement,
  type PurchaseNote,
  type PurchaseNoteStatus,
} from "../../services/PurchaseNote/purchaseNote.schema";
import { useAddProcurement } from "../../services/Procurements/procurement.api";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import PurchaseNoteStatusBadge from "./PurchaseNoteStatusBadge";
import PageSizePicker, { type PageSizeValue } from "../UI/PageSizePicker";
import {
  buildNoticeLocationState,
  buildProcurementRaw,
  hasProcurement,
  procurementRoute,
  type PurchaseNoteTarget,
} from "./purchaseNoteNavigation";
import styles from "./PurchaseNotesRegistryPage.module.scss";
import Select from "../UI/Select";

type FilterStatus = "all" | PurchaseNoteStatus;

// Масштаб страницы реестра: тот же набор, что в реестрах контрактов и НПА
const PAGE_SIZES = [10, 25, 50, "all"] as const;

// Год служебной записки для фильтра: «all» — без ограничения
const ALL_YEARS = "all";

const noteYear = (year?: string) => {
  if (!year) return "";
  const match = /^(\d{4})/.exec(year.trim());
  return match ? match[1] : "";
};

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
  // Контракты нужны, чтобы по заключённой СЗ открыть карточку контракта
  const { data: contracts = [] } = useContractRegistry(organizationId);
  const updateNote = useUpdatePurchaseNote();
  const createProcurement = useAddProcurement();

  const {
    employee,
    canEditPurchaseNote,
    canDisagreeKbk,
    isLoading: isRoleLoading,
  } = useMyContractRole();
  const canApprove = Boolean(canEditPurchaseNote || canDisagreeKbk);

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS);
  const [pageSize, setPageSize] = useState<PageSizeValue>(10);
  const [page, setPage] = useState(1);

  const visibleNotes = useMemo(
    () => filterVisiblePurchaseNotes(notes),
    [notes],
  );

  const planById = useMemo(
    () => new Map(plans.map((plan) => [String(plan.id), plan])),
    [plans],
  );

  // Набор после «мягких» условий (год и поиск): от него считаются счётчики в
  // чипах, чтобы числа совпадали с тем, что реально попадёт в список.
  const scopedNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...visibleNotes]
      .sort((a, b) =>
        String(b.noteDate || b.createdAt || "").localeCompare(
          String(a.noteDate || a.createdAt || ""),
        ),
      )
      .filter((note) => {
        if (
          yearFilter !== ALL_YEARS &&
          noteYear(note.noteDate || note.createdAt) !== yearFilter
        ) {
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
  }, [visibleNotes, searchQuery, yearFilter]);

  // Счётчики статусов — по набору выше: при выбранном годе или поисковом
  // запросе чипы показывают реальные числа, а не общий итог по всем СЗ.
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(
      PURCHASE_NOTE_STATUSES.map((status) => [status, 0]),
    ) as Record<PurchaseNoteStatus, number>;
    for (const note of scopedNotes) {
      const s = (note.status ?? "draft") as PurchaseNoteStatus;
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [scopedNotes]);

  // Годы служебных записок для фильтра: по дате СЗ, а если её нет — по дате
  // создания. Новые годы сверху, чтобы свежий период был первым.
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const note of visibleNotes) {
      const year = noteYear(note.noteDate || note.createdAt);
      if (year) years.add(year);
    }
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [visibleNotes]);

  // Статус — последнее условие: счётчики в чипах считаются до него.
  const filteredNotes = useMemo(
    () =>
      statusFilter === "all"
        ? scopedNotes
        : scopedNotes.filter(
            (note) => (note.status ?? "draft") === statusFilter,
          ),
    [scopedNotes, statusFilter],
  );

  // ─── Пагинация ────────────────────────────────────────────────────────────
  // Тот же расчёт, что в реестрах контрактов и НПА: масштаб страницы задаётся
  // PageSizePicker, «Все» выключает разбиение.
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredNotes.length / Number(pageSize)));
  const safePage = Math.min(page, totalPages);
  const start = pageSize === "all" ? 0 : (safePage - 1) * Number(pageSize);
  const pagedNotes =
    pageSize === "all"
      ? filteredNotes
      : filteredNotes.slice(start, start + Number(pageSize));

  // Смена фильтров, поиска и масштаба возвращает к первой странице: иначе
  // после сужения выборки можно остаться на странице, которой уже нет.
  // Сброс делается в обработчиках событий, а не в useEffect: эффект со
  // setState — лишний каскадный рендер (react(set-state-in-effect)).

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

  /**
   * Контракт, заключённый по этой СЗ. Связь ищем по записи закупки, а если её
   * ещё нет — по ИКЗ: реестровый номер присваивается уже после заключения.
   */
  const linkedContract = (note: PurchaseNote) => {
    const { position } = resolvePlanAndPosition(note);
    const procurementId = note.procurementId;
    const ikz = note.ikz || position?.identificationCode || "";

    return contracts.find(
      (contract) =>
        (procurementId !== undefined &&
          procurementId !== null &&
          procurementId !== "" &&
          String(contract.procurementId ?? "") === String(procurementId)) ||
        (ikz !== "" && contract.ikz === ikz),
    );
  };

  /**
   * Переход в извещение или проект контракта. Сведения СЗ передаются форме
   * состоянием для предзаполнения; запись закупки создаётся только тогда,
   * когда по СЗ её ещё нет — иначе формы не к чему привязать.
   */
  const openProcurement = (note: PurchaseNote, target: PurchaseNoteTarget) => {
    const { position } = resolvePlanAndPosition(note);
    const state = buildNoticeLocationState(note, position);

    if (hasProcurement(note)) {
      navigate(
        procurementRoute(note.procurementId as string | number, target),
        { state },
      );
      return;
    }

    createProcurement.mutate(buildProcurementRaw(note, position), {
      onSuccess: (created) => {
        if (note.id !== undefined) {
          updateNote.mutate({ id: note.id, procurementId: created.id });
        }
        navigate(procurementRoute(created.id, target), { state });
      },
    });
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
            {notes.length}. Для каждой СЗ показан статус согласования и доступна
            выгрузка в .docx / .pdf для подписания вне системы.
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
        <div
          className={block("chips")}
          role="group"
          aria-label="Фильтр по статусу"
        >
          <button
            type="button"
            className={block("chip", statusFilter === "all" ? ["active"] : [])}
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
          >
            Все
            <span className={block("chip-count")}>{scopedNotes.length}</span>
          </button>
          {PURCHASE_NOTE_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              className={block("chip", statusFilter === st ? ["active"] : [])}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              {PURCHASE_NOTE_STATUS_META[st].label}
              <span className={block("chip-count")}>{statusCounts[st]}</span>
            </button>
          ))}
        </div>

        <div className={block("filter-row")}>
          <input
            type="search"
            className={block("search")}
            placeholder="Поиск по № СЗ, предмету закупки, ИКЗ, КБК, ПГ или инициатору…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />

          <label className={block("year")}>
            <span className={block("year-caption")}>Год СЗ:</span>
            <Select
              className={block("select")}
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              disabled={yearOptions.length === 0}
            >
              <option value={ALL_YEARS}>Все годы</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </label>

          <PageSizePicker
            sizes={PAGE_SIZES}
            value={pageSize}
            onChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </div>

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
          {pagedNotes.map((note) => {
            const noteKey = String(note.id ?? note.noteNumber);
            const { position } = resolvePlanAndPosition(note);
            const canOpenForm =
              note.purchasePlanId !== undefined &&
              note.purchasePlanId !== null &&
              note.purchasePlanId !== "" &&
              note.positionId !== undefined &&
              note.positionId !== null &&
              note.positionId !== "";
            const statusMeta = getPurchaseNoteStatusMeta(note.status);
            // Карточка открывается только при известном идентификаторе
            // контракта: в импортированных из ЕИС записях id может отсутствовать
            const contractId = linkedContract(note)?.id;
            const canOpenContract =
              contractId !== undefined &&
              contractId !== null &&
              contractId !== "";
            // Согласующих может быть много: в карточке держим одну строку с
            // последним согласованием, полный список не разворачиваем
            const approvalText = [
              note.approvalUpdatedBy,
              note.approvalUpdatedAt
                ? formatRuDate(note.approvalUpdatedAt)
                : "",
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={noteKey} className={block("card", [statusMeta.tone])}>
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
                  {note.subject ||
                    position?.objectOfPurchase ||
                    "Предмет не указан"}
                </p>

                <dl className={block("meta")}>
                  <div>
                    <dt>Инициатор</dt>
                    <dd>{note.initiatorName || "—"}</dd>
                  </div>
                </dl>

                {approvalText && (
                  <p className={block("approval")} title={approvalText}>
                    <CheckCircle2 size={13} aria-hidden="true" />
                    <span>Согласовано: {approvalText}</span>
                  </p>
                )}

                <div className={block("card-actions")}>
                  <div className={block("status-control")}>
                    <label
                      className={block("status-label")}
                      htmlFor={`sz-status-${noteKey}`}
                    >
                      Статус согласования:
                    </label>
                    <Select
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
                    </Select>
                  </div>

                  <div className={block("buttons")}>
                    {canOpenForm && (
                      <button
                        type="button"
                        className={block("btn", ["primary"])}
                        // СЗ — самостоятельный документ со своим адресом
                        onClick={() => navigate(`/purchase-notes/${note.id}`)}
                      >
                        Открыть СЗ
                      </button>
                    )}

                    {/* Смежные документы закупки: извещение и проект контракта
                        предзаполняются сведениями СЗ; если записи закупки ещё
                        нет, она создаётся и связывается с СЗ */}
                    <button
                      type="button"
                      className={block("btn")}
                      // Пока создаётся запись закупки, повторный клик создал бы
                      // вторую: блокируем оба перехода на время мутации
                      disabled={createProcurement.isPending}
                      onClick={() => openProcurement(note, "notice")}
                      title="Открыть извещение с предзаполнением из СЗ. Если закупка ещё не создана, запись будет создана и связана с СЗ"
                    >
                      <FileText size={15} aria-hidden="true" />
                      <span>Извещение</span>
                    </button>

                    <button
                      type="button"
                      className={block("btn")}
                      disabled={createProcurement.isPending}
                      onClick={() => openProcurement(note, "contract-project")}
                      title="Открыть проект контракта с предзаполнением из СЗ. Если закупка ещё не создана, запись будет создана и связана с СЗ"
                    >
                      <FileSignature size={15} aria-hidden="true" />
                      <span>Проект контракта</span>
                    </button>

                    {canOpenContract && (
                      <button
                        type="button"
                        className={block("btn")}
                        onClick={() =>
                          navigate(`/contract-registry/${contractId}`)
                        }
                        title="Открыть карточку заключённого контракта"
                      >
                        <FileCheck2 size={15} aria-hidden="true" />
                        <span>Карточка контракта</span>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className={block("pager")}>
          <button
            type="button"
            className={block("pager-btn")}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
          >
            Назад
          </button>
          <span className={block("pager-info")}>
            {start + 1}–
            {Math.min(start + pagedNotes.length, filteredNotes.length)} из{" "}
            {filteredNotes.length} · страница {safePage} из {totalPages}
          </span>
          <button
            type="button"
            className={block("pager-btn")}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={safePage === totalPages}
          >
            Вперёд
          </button>
        </div>
      )}
    </section>
  );
}
