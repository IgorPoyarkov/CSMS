import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import {
  usePurchasePlan,
  useUpdatePurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  formatMoney,
  formatMoneyValue,
  ownerRoleOptions,
  pfhdTypeOptions,
  planTotalAmount,
  positionStatusLabel,
  purchasePlanStatusLabel,
} from "./purchasePlan.config";
import {
  positionKbkCodes,
  toNumber,
  type PurchasePlanPosition,
  type PurchasePlanSpecialPurchase,
} from "../../services/PurchasePlan/purchasePlan.schema";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { purchaseNotesForPosition } from "../../services/PurchaseNote/purchaseNote.schema";
import { checkOkpd2AuctionList } from "../../services/Okpd2Ref/auctionListControl";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import LegalActRefs from "../LegalAct/LegalActRefs";
import PurchaseNoteStatusBadge from "../PurchaseNote/PurchaseNoteStatusBadge";
import PageSizePicker, { type PageSizeValue } from "../UI/PageSizePicker";
import PurchasePlanVersionsModal from "./PurchasePlanVersionsModal";
import PurchasePlanSpecialPurchases from "./PurchasePlanSpecialPurchases";
import { usePurchasePlanVersions } from "../../services/PurchasePlan/purchasePlanVersion.api";
import {
  buildTenderPlan2020XmlPreview,
  validatePurchasePlanEis17,
} from "../../services/Eis/eis17Types";
import { downloadText } from "../../services/Eis/eisExport";
import styles from "./PurchasePlanCard.module.scss";

/**
 * Карточка плана-графика закупок в структуре и визуале официального ЕИС
 * (zakupki.gov.ru / pg2020):
 * - хлебные крошки и двуколоночная шапка cardMainInfo с реквизитами,
 *   статусом и совокупным объёмом финансирования;
 * - 7 вкладок ЕИС pg2020: Общая информация, Позиции, Особые закупки,
 *   Итоговые показатели, Вложения, Журнал версий, Журнал событий;
 * - двухстрочный макет таблицы позиций с ИКЗ во второй строке и tabular-nums.
 */
const ROW_COLUMNS = [
  "plannedPlacementYear",
  "purchaseNumber",
  "objectOfPurchase",
  "okpd2Code",
  "amountTotal",
  "status",
  "isPublicDiscussionRequired",
] as const;

type ColumnKey = (typeof ROW_COLUMNS)[number];

const AMOUNT_COLUMNS = ["amountTotal"] as const;

const NARROW_COLUMNS: ColumnKey[] = [
  "plannedPlacementYear",
  "purchaseNumber",
  "status",
  "isPublicDiscussionRequired",
];

const WIDE_COLUMNS: ColumnKey[] = ["objectOfPurchase"];

const PAGE_SIZES = [10, 25, 50] as const;
const ALL_PAGES = "all";

type PlanCardTab =
  | "general"
  | "positions"
  | "special"
  | "totals"
  | "attachments"
  | "versions"
  | "events";

export default function PurchasePlanCard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const organizationId = organization?.id;
  const {
    data: plan,
    isLoading,
    isError,
    error,
  } = usePurchasePlan(id, organizationId);
  const { mutate: updatePlan, isPending: isUpdatingPlan } =
    useUpdatePurchasePlan();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const { data: purchaseNotes = [] } = usePurchaseNotes(organizationId);
  const { data: planVersions = [] } = usePurchasePlanVersions(
    id,
    organizationId,
  );
  const [confirmDeletePositionId, setConfirmDeletePositionId] = useState<
    string | null
  >(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [showEisXml, setShowEisXml] = useState(false);
  const [activeTab, setActiveTab] = useState<PlanCardTab>("general");
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "purchase-plan-card");

  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<PageSizeValue>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);

  const [openActionsPositionId, setOpenActionsPositionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node | null;

      if (
        target instanceof Element &&
        !target.closest("details[data-plan-actions]")
      ) {
        setOpenActionsPositionId(null);
        setConfirmDeletePositionId(null);
      }
    }

    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  function handleSaveSpecialPurchases(items: PurchasePlanSpecialPurchase[]) {
    if (!plan?.id) return;
    updatePlan({
      id: plan.id,
      data: {
        ...plan,
        specialPurchases: items,
      },
    });
  }

  function handleDeletePosition(positionId: string | number | undefined) {
    if (!plan || !plan.id || positionId === undefined) return;
    const nextPositions = (plan.positions ?? []).filter(
      (item) => String(item.id) !== String(positionId),
    );
    updatePlan(
      {
        id: plan.id,
        data: {
          ...plan,
          positions: nextPositions,
        },
      },
      {
        onSuccess: () => {
          setConfirmDeletePositionId(null);
          setOpenActionsPositionId(null);
        },
      },
    );
  }

  const positions = useMemo(() => plan?.positions ?? [], [plan]);
  const specialPurchases = useMemo(
    () => plan?.specialPurchases ?? [],
    [plan],
  );

  // Агрегаты для вкладки «Итоговые показатели» (без изменения данных ПГ)
  const financialTotals = useMemo(() => {
    const sumField = (
      items: Array<{
        amountTotal?: string | number;
        amountCurrentYear?: string | number;
        amountPlanPeriodFirstYear?: string | number;
        amountPlanPeriodSecondYear?: string | number;
        amountSubsequentYears?: string | number;
      }>,
      key:
        | "amountTotal"
        | "amountCurrentYear"
        | "amountPlanPeriodFirstYear"
        | "amountPlanPeriodSecondYear"
        | "amountSubsequentYears",
    ) => items.reduce((acc, item) => acc + (toNumber(item[key]) ?? 0), 0);

    const posTotals = {
      total: sumField(positions, "amountTotal"),
      current: sumField(positions, "amountCurrentYear"),
      first: sumField(positions, "amountPlanPeriodFirstYear"),
      second: sumField(positions, "amountPlanPeriodSecondYear"),
      subsequent: sumField(positions, "amountSubsequentYears"),
    };

    const specTotals = {
      total: sumField(specialPurchases, "amountTotal"),
      current: sumField(specialPurchases, "amountCurrentYear"),
      first: sumField(specialPurchases, "amountPlanPeriodFirstYear"),
      second: sumField(specialPurchases, "amountPlanPeriodSecondYear"),
      subsequent: sumField(specialPurchases, "amountSubsequentYears"),
    };

    return {
      positions: posTotals,
      special: specTotals,
      grand: {
        total: posTotals.total + specTotals.total,
        current: posTotals.current + specTotals.current,
        first: posTotals.first + specTotals.first,
        second: posTotals.second + specTotals.second,
        subsequent: posTotals.subsequent + specTotals.subsequent,
      },
    };
  }, [positions, specialPurchases]);

  const filteredPositions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const compactQuery = query.replace(/\s/g, "");

    return positions.filter((position) => {
      if (!query) {
        return true;
      }

      const haystack = [
        position.identificationCode,
        position.uniqueNumber,
        position.purchaseNumber,
        position.objectOfPurchase,
        position.objectName,
        position.okpd2Code,
        position.okpd2Name,
        ...positionKbkCodes(position),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        haystack.includes(query) ||
        positionKbkCodes(position)
          .join("")
          .replace(/\s/g, "")
          .includes(compactQuery) ||
        (position.identificationCode ?? "").toLowerCase().includes(compactQuery)
      );
    });
  }, [positions, searchQuery]);

  const isPaged = pageSize !== ALL_PAGES;
  const totalPages = isPaged
    ? Math.max(1, Math.ceil(filteredPositions.length / Number(pageSize)))
    : 1;
  const currentPage = Math.min(page, totalPages);
  const visiblePositions = isPaged
    ? filteredPositions.slice(
        (currentPage - 1) * Number(pageSize),
        currentPage * Number(pageSize),
      )
    : filteredPositions;

  if (isOrgLoading) {
    return (
      <p className={block("status")}>Определяем организацию заказчика...</p>
    );
  }

  if (!organizationId) {
    return (
      <div className={block()}>
        <p className={block("status", ["error"])}>
          К вашей учётной записи не привязана организация-заказчик, поэтому
          планы-графики недоступны. Обратитесь к администратору системы.
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-plans")}
        >
          К списку планов-графиков
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <p className={block("status")}>Загрузка плана-графика...</p>;
  }

  if (isError || !plan) {
    return (
      <div className={block()}>
        <p className={block("status", ["error"])}>
          План-график недоступен: {String(error)}
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-plans")}
        >
          К списку планов-графиков
        </button>
      </div>
    );
  }

  const { customer } = plan;
  const planId = plan.id as string | number;
  const baseYear = Number(plan.planYear) || 2026;
  const periodSecondYear =
    plan.planPeriodSecondYear || String(baseYear + 2);
  const ownerRoleLabel =
    ownerRoleOptions.find((o) => o.value === (plan.ownerRole ?? "CU"))?.label ??
    "CU";
  const pfhdLabel =
    pfhdTypeOptions.find((o) => o.value === (plan.pfhdType ?? "IND"))?.label ??
    "IND";

  // Журнал событий: только реальные даты карточки, без выдуманных записей.
  const planEvents: Array<{ date: string; title: string; details?: string }> =
    [];
  if (plan.approvalDate) {
    planEvents.push({
      date: plan.approvalDate,
      title: "План-график утверждён",
      details: plan.approvalAuthor || undefined,
    });
  }
  if (plan.publishDate) {
    planEvents.push({
      date: plan.publishDate,
      title: "План-график размещён в ЕИС",
    });
  }
  const modifiedPositions = positions
    .filter((item) => item.statusDate && item.modificationDescription)
    .sort((a, b) => String(b.statusDate).localeCompare(String(a.statusDate)))
    .slice(0, 5);
  for (const item of modifiedPositions) {
    planEvents.push({
      date: String(item.statusDate),
      title: `Изменение позиции ${item.serialNumber ?? ""}`.trim(),
      details: item.modificationDescription,
    });
  }
  planEvents.sort((a, b) => b.date.localeCompare(a.date));

  const versionKindLabel: Record<string, string> = {
    draft: "Черновик",
    approved: "Утверждённая редакция",
    published: "Опубликована в ЕИС",
  };

  function renderCell(
    key: ColumnKey,
    position: PurchasePlanPosition,
  ): React.ReactNode {
    switch (key) {
      case "plannedPlacementYear":
        return position.plannedPlacementYear || "—";
      case "purchaseNumber":
        return position.purchaseNumber ? (
          <span className={block("mono")}>
            {String(position.purchaseNumber).padStart(4, "0")}
          </span>
        ) : (
          "—"
        );
      case "objectOfPurchase":
        return (
          <span className={block("object")}>
            {position.objectOfPurchase || "—"}
          </span>
        );
      case "okpd2Code": {
        const normedRef = findOkpd2ByCode(okpd2Refs, position.okpd2Code);
        const auctionCheck = checkOkpd2AuctionList(
          position.okpd2Code,
          okpd2Refs,
        );
        const okpd2Name = position.okpd2Name || normedRef?.name;
        const normTip = normedRef?.isNormed
          ? normedRef.normLimit !== undefined
            ? `Обязательное нормирование: цена единицы не выше ${formatMoney(normedRef.normLimit)} (ПП РФ N 926)`
            : "Обязательное нормирование: предельная цена единицы устанавливается правовым актом (ПП РФ N 926)"
          : undefined;
        const auctionTip = auctionCheck.inAuctionList
          ? `Аукционный перечень (РП РФ от 21.03.2016 № 471-р, ред. от 31.10.2022): при конкурентной закупке обязателен электронный аукцион`
          : undefined;

        // Наименование по ОКПД2 бывает в разы длиннее остальных граф
        // (до 191 символа в импорте ЕИС), поэтому текст переносится по словам
        // без ограничения числа строк: высота строки таблицы задаётся
        // содержимым соседних граф, а не обрезкой многоточием.
        return (
          <span className={block("okpd2")}>
            {position.okpd2Code && (
              <span className={block("code")}>{position.okpd2Code}</span>
            )}
            <span className={block("okpd2-line")}>
              <span className={block("okpd2-name")}>
                {okpd2Name || "—"}
              </span>
              {normTip && (
                <span
                  className={block("info")}
                  title={normTip}
                  aria-label={normTip}
                >
                  i
                </span>
              )}
              {auctionTip && (
                <span
                  className={block("info")}
                  title={auctionTip}
                  aria-label={auctionTip}
                >
                  А
                </span>
              )}
            </span>
          </span>
        );
      }
      case "amountTotal":
        return (
          <span className={block("amount")}>
            {formatMoneyValue(position[key])}
          </span>
        );
      case "status": {
        const status = position.status ?? "planned";
        const posNotes = purchaseNotesForPosition(purchaseNotes, position.id);

        return (
          <div className={block("status-stack")}>
            <span
              className={block("status-tag", [status, "compact", "plain"])}
            >
              {positionStatusLabel(status)}
            </span>
            {position.statusDate && (
              <span className={block("sub", ["compact"])}>
                {formatDate(position.statusDate)}
              </span>
            )}
            {posNotes.map((note) => (
              <div
                key={String(note.id ?? note.noteNumber)}
                className={block("note-status-line")}
              >
                <span className={block("sub", ["compact"])}>
                  СЗ №{note.noteNumber}:
                </span>
                <PurchaseNoteStatusBadge status={note.status} compact />
              </div>
            ))}
          </div>
        );
      }
      case "isPublicDiscussionRequired":
        return position.isPublicDiscussionRequired ? "Да" : "Нет";
      default:
        return "—";
    }
  }

  function renderActionsCell(position: PurchasePlanPosition): React.ReactNode {
    const positionKey = String(position.id ?? "");
    const isConfirmingDelete = confirmDeletePositionId === positionKey;

    return (
      <details
        className={block("menu")}
        data-plan-actions
        open={openActionsPositionId === positionKey}
        onToggle={(event) => {
          const isOpen = event.currentTarget.open;
          setOpenActionsPositionId(isOpen ? positionKey : null);
          if (!isOpen) {
            setConfirmDeletePositionId(null);
          }
        }}
      >
        <summary className={block("menu-trigger")}>Действия</summary>
        <div className={block("menu-list")}>
          <button
            className={block("menu-item")}
            type="button"
            onClick={() => {
              setOpenActionsPositionId(null);
              navigate(
                `/purchase-plans/${planId}/positions/${position.id}/edit`,
              );
            }}
          >
            Изменить
          </button>
          <button
            className={block("menu-item")}
            type="button"
            disabled={position.id === undefined}
            onClick={() => {
              setOpenActionsPositionId(null);
              navigate(
                `/nmck-calculator?planId=${planId}&positionId=${position.id}`,
              );
            }}
          >
            Рассчитать НМЦК
          </button>
          <button
            className={block("menu-item")}
            type="button"
            disabled={position.id === undefined}
            onClick={() => {
              setOpenActionsPositionId(null);
              navigate(
                `/purchase-plans/${planId}/positions/${position.id}/requirement`,
              );
            }}
          >
            Сформировать потребность
          </button>
          {!isConfirmingDelete ? (
            <button
              className={block("menu-item", ["danger"])}
              type="button"
              disabled={isUpdatingPlan || position.id === undefined}
              onClick={() => setConfirmDeletePositionId(positionKey)}
            >
              Удалить
            </button>
          ) : (
            <div className={block("menu-confirm")}>
              <span>Удалить эту позицию ПГ?</span>
              <div className={block("menu-confirm-actions")}>
                <button
                  type="button"
                  className={block("menu-confirm-btn")}
                  disabled={isUpdatingPlan}
                  onClick={() => handleDeletePosition(position.id)}
                >
                  {isUpdatingPlan ? "Удаление..." : "Да, удалить"}
                </button>
                <button
                  type="button"
                  disabled={isUpdatingPlan}
                  onClick={() => setConfirmDeletePositionId(null)}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </details>
    );
  }

  function renderPositionRow(position: PurchasePlanPosition, striped = false) {
    const rowClass = block("row", [...(striped ? ["striped"] : [])]);

    return (
      <Fragment key={String(position.id)}>
        <tr className={rowClass}>
          {ROW_COLUMNS.map((key) => (
            <td
              key={key}
              rowSpan={
                key === "purchaseNumber" || key === "objectOfPurchase" ? 1 : 2
              }
              className={block("cell", [
                ...(NARROW_COLUMNS.includes(key) ? ["narrow"] : []),
                ...(WIDE_COLUMNS.includes(key) ? ["wide"] : []),
                ...((AMOUNT_COLUMNS as readonly ColumnKey[]).includes(key)
                  ? ["amount"]
                  : []),
                ...(key === "okpd2Code" ? ["okpd2"] : []),
                ...(key === "objectOfPurchase" || key === "okpd2Code"
                  ? []
                  : ["center"]),
                // Статус и «Обязательное общественное обсуждение» —
                // по центру и по горизонтали, и по вертикали.
                ...(key === "status" || key === "isPublicDiscussionRequired"
                  ? ["middle"]
                  : []),
              ])}
            >
              {renderCell(key, position)}
            </td>
          ))}
          <td className={block("cell", ["actions"])} rowSpan={2}>
            {renderActionsCell(position)}
          </td>
        </tr>
        <tr className={block("row", ["ikz", ...(striped ? ["striped"] : [])])}>
          <td className={block("cell", ["ikz", "center"])} colSpan={2}>
            {position.identificationCode ? (
              <span className={block("code", ["ikz"])}>
                {position.identificationCode}
              </span>
            ) : (
              <span className={block("ikz-label")}>не сформирован</span>
            )}
          </td>
        </tr>
      </Fragment>
    );
  }

  return (
    <section className={block()}>
      <nav className={block("breadcrumbs")} aria-label="Навигация">
        <button
          type="button"
          className={block("crumb")}
          onClick={() => navigate("/purchase-plans")}
        >
          Планы-графики закупок (44-ФЗ)
        </button>
        <span className={block("crumb-sep")} aria-hidden="true">
          /
        </span>
        <span className={block("crumb-current")}>
          План-график № {plan.planNumber || "без номера"}
        </span>
      </nav>

      {/* Официальная шапка карточки ПГ ЕИС (cardMainInfo) */}
      <header className={block("card-main")}>
        <div className={block("card-main-left")}>
          <div className={block("status-line")}>
            <span className={block("status-tag", [plan.status])}>
              {purchasePlanStatusLabel(plan.status)}
            </span>
            <span className={block("meta-sep")} aria-hidden="true">
              ·
            </span>
            <span className={block("meta-text")}>
              Версия № {plan.versionNumber || "1"}
            </span>
            <span className={block("meta-sep")} aria-hidden="true">
              ·
            </span>
            <span className={block("meta-text")}>
              Период {plan.planYear}–{periodSecondYear} гг.
            </span>
          </div>

          <h1 className={block("title")}>
            План-график закупок № {plan.planNumber || "без номера"}
          </h1>

          <div className={block("customer-summary")}>
            <span className={block("customer-name")}>
              {customer.shortName || customer.fullName}
            </span>
            <p className={block("note")}>
              {customer.inn ? `ИНН ${customer.inn}` : ""}
              {customer.kpp ? ` · КПП ${customer.kpp}` : ""}
              {customer.regNum ? ` · СПЗ ${customer.regNum}` : ""}
              {customer.okopf ? ` · ОКОПФ ${customer.okopf}` : ""}
              {customer.okfs ? ` · ОКФС ${customer.okfs}` : ""}
              {customer.oktmo ? ` · ОКТМО ${customer.oktmo}` : ""}
            </p>
            {plan.ownerRole === "OA" && (
              <p className={block("note")}>
                Полномочия заказчика переданы:{" "}
                {plan.authorizedOrganization?.fullName ||
                  "организация не указана"}
                {plan.authorizedOrganization?.inn
                  ? ` · ИНН ${plan.authorizedOrganization.inn}`
                  : ""}
                {plan.authorizedOrganization?.kpp
                  ? ` · КПП ${plan.authorizedOrganization.kpp}`
                  : ""}
                {plan.authorizedOrganization?.oktmo
                  ? ` · ОКТМО ${plan.authorizedOrganization.oktmo}`
                  : ""}
              </p>
            )}
          </div>

          <div className={block("actions")}>
            <button
              type="button"
              className={block("action-btn")}
              onClick={() => navigate(`/purchase-plans/${planId}/edit`)}
            >
              Изменить реквизиты ПГ
            </button>
            <button
              type="button"
              className={block("action-btn")}
              onClick={() => setIsVersionsOpen(true)}
            >
              История версий ({planVersions.length})
            </button>
            <button
              type="button"
              className={block("action-btn")}
              onClick={() => setShowEisXml((prev) => !prev)}
            >
              {showEisXml ? "Скрыть ЕИС 17.0" : "Проверка ЕИС 17.0 / XML"}
            </button>
            <button
              type="button"
              className={block("action-btn")}
              onClick={() => navigate("/purchase-notes")}
            >
              Реестр потребностей (СЗ)
            </button>
          </div>
        </div>

        <aside className={block("card-main-right")}>
          <div className={block("kpi-total")}>
            <span className={block("kpi-label")}>
              Совокупный объём финансового обеспечения
            </span>
            <strong className={block("kpi-value")}>
              {formatMoney(planTotalAmount(plan))}
            </strong>
            <span className={block("kpi-sub")}>
              ОКЕИ: {plan.okeiCode || "383"} ({plan.okeiName || "рубль"})
            </span>
          </div>

          <dl className={block("kpi-grid")}>
            <div className={block("kpi-item")}>
              <dt>Дата утверждения</dt>
              <dd>{formatDate(plan.approvalDate)}</dd>
            </div>
            <div className={block("kpi-item")}>
              <dt>Размещение в ЕИС</dt>
              <dd>
                {plan.publishDate ? formatDate(plan.publishDate) : "не размещён"}
              </dd>
            </div>
            <div className={block("kpi-item")}>
              <dt>Позиций / Особых закупок</dt>
              <dd>
                {positions.length} / {specialPurchases.length}
              </dd>
            </div>
            <div className={block("kpi-item")}>
              <dt>ЕИС 17.0 (роль / ПФХД)</dt>
              <dd>
                {plan.ownerRole ?? "CU"} / {plan.pfhdType ?? "IND"}
              </dd>
            </div>
          </dl>
        </aside>
      </header>

      {showEisXml &&
        (() => {
          const validation = validatePurchasePlanEis17(plan);
          const xmlPreview = buildTenderPlan2020XmlPreview(plan);
          return (
            <div className={block("eis-preview")}>
              <div className={block("eis-preview-head")}>
                <strong>
                  Контроль схемы ЕИС 17.0 (tenderPlan2020Type):{" "}
                  {validation.valid
                    ? "ошибок XSD нет"
                    : `ошибок: ${validation.errorsCount}`}
                  {validation.warningsCount > 0
                    ? `, предупреждений: ${validation.warningsCount}`
                    : ""}
                </strong>
                <button
                  type="button"
                  className={block("edit-btn")}
                  onClick={() =>
                    downloadText(
                      xmlPreview,
                      `tenderPlan2020_${plan.planNumber || "draft"}.xml`,
                      "application/xml;charset=utf-8",
                    )
                  }
                >
                  Скачать XML 17.0
                </button>
              </div>
              {validation.issues.length > 0 && (
                <ul className={block("eis-issues")}>
                  {validation.issues.map((issue, idx) => (
                    <li
                      key={`${issue.field}-${idx}`}
                      className={block("eis-issue", [issue.severity])}
                    >
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
              <pre className={block("eis-xml")}>{xmlPreview}</pre>
            </div>
          );
        })()}

      {/* Вкладки ЕИС pg2020 в порядке официальной карточки */}
      <nav className={block("tabs")} aria-label="Разделы плана-графика">
        <button
          type="button"
          className={block("tab", activeTab === "general" ? ["active"] : [])}
          onClick={() => setActiveTab("general")}
        >
          Общая информация
        </button>
        <button
          type="button"
          className={block("tab", activeTab === "positions" ? ["active"] : [])}
          onClick={() => setActiveTab("positions")}
        >
          Позиции плана-графика ({positions.length})
        </button>
        <button
          type="button"
          className={block("tab", activeTab === "special" ? ["active"] : [])}
          onClick={() => setActiveTab("special")}
        >
          Особые закупки ({specialPurchases.length})
        </button>
        <button
          type="button"
          className={block("tab", activeTab === "totals" ? ["active"] : [])}
          onClick={() => setActiveTab("totals")}
        >
          Итоговые показатели
        </button>
        <button
          type="button"
          className={block("tab", activeTab === "attachments" ? ["active"] : [])}
          onClick={() => setActiveTab("attachments")}
        >
          Вложения
        </button>
        <button
          type="button"
          className={block("tab", activeTab === "versions" ? ["active"] : [])}
          onClick={() => setActiveTab("versions")}
        >
          Журнал версий ({planVersions.length})
        </button>
        <button
          type="button"
          className={block("tab", activeTab === "events" ? ["active"] : [])}
          onClick={() => setActiveTab("events")}
        >
          Журнал событий
        </button>
      </nav>

      {activeTab === "positions" && (
        <section className={block("section")}>
          <div className={block("section-head")}>
            <h2 className={block("section-title")}>
              Позиции плана-графика ({filteredPositions.length} из{" "}
              {positions.length})
            </h2>
            <button
              type="button"
              className={block("add-btn")}
              onClick={() =>
                navigate(`/purchase-plans/${planId}/positions/new`)
              }
            >
              + Добавить позицию
            </button>
          </div>

          {positions.length === 0 ? (
            <p className={block("status")}>
              Записи плана-графика не внесены — добавьте позицию кнопкой выше.
            </p>
          ) : (
            <>
              <div className={block("toolbar")}>
                <input
                  className={block("search")}
                  type="search"
                  placeholder="Поиск по ИКЗ, номеру закупки, объекту закупки, ОКПД2 или КБК…"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                />

                <PageSizePicker
                  sizes={[...PAGE_SIZES, ALL_PAGES]}
                  value={pageSize}
                  allLabel="все"
                  onChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>

              {visiblePositions.length === 0 ? (
                <p className={block("status")}>
                  По заданным условиям записей плана-графика не найдено.
                </p>
              ) : (
                <div
                  className={
                    openActionsPositionId
                      ? block("table-wrapper", ["open"])
                      : block("table-wrapper")
                  }
                >
                  <table className={block("table")}>
                    <thead>
                      <tr>
                        <th rowSpan={2} className={block("th", ["year"])}>
                          Планируемый год размещения извещения, направления
                          приглашения, заключения контракта с единственным
                          поставщиком (подрядчиком, исполнителем)
                        </th>
                        <th
                          className={block("th", ["narrow"])}
                          data-col="number"
                        >
                          Номер закупки, включенной в план-график
                        </th>
                        <th>Наименование объекта (объектов) закупки</th>
                        <th rowSpan={2}>
                          Наименование товара, работы, услуги по ОКПД2
                        </th>
                        <th rowSpan={2}>
                          Объём финансового обеспечения, всего (рублей)
                        </th>
                        <th rowSpan={2} className={block("th", ["narrow"])}>
                          Статус
                        </th>
                        <th rowSpan={2} className={block("th", ["narrow"])}>
                          Обязательное общественное обсуждение
                        </th>
                        <th rowSpan={2}>Действия</th>
                      </tr>
                      <tr>
                        <th colSpan={2}>Идентификационный код закупки</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePositions.map((position, index) =>
                        renderPositionRow(position, index % 2 === 1),
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {isPaged && filteredPositions.length > 0 && (
                <div className={block("pagination")}>
                  <button
                    type="button"
                    className={block("page-btn")}
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    ← Назад
                  </button>
                  <span className={block("page-info")}>
                    Страница {currentPage} из {totalPages}
                  </span>
                  <button
                    type="button"
                    className={block("page-btn")}
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Вперёд →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === "special" && (
        <PurchasePlanSpecialPurchases
          plan={plan}
          positions={positions}
          isSaving={isUpdatingPlan}
          onSave={handleSaveSpecialPurchases}
        />
      )}

      {activeTab === "general" && (
        <div className={block("general-stack")}>
          <section className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title")}>
                Общие сведения о плане-графике закупок
              </h2>
            </div>

            <dl className={block("info-grid")}>
              <div className={block("info-item")}>
                <dt>Реестровый номер плана-графика</dt>
                <dd className={block("mono")}>{plan.planNumber || "—"}</dd>
              </div>
              <div className={block("info-item")}>
                <dt>Период планирования</dt>
                <dd>
                  {plan.planYear}–{periodSecondYear} гг. (финансовый год{" "}
                  {plan.planYear}, плановый период{" "}
                  {plan.planPeriodFirstYear || baseYear + 1}–{periodSecondYear})
                </dd>
              </div>
              <div className={block("info-item")}>
                <dt>Номер версии и статус</dt>
                <dd>
                  Версия {plan.versionNumber || "1"} ·{" "}
                  {purchasePlanStatusLabel(plan.status)}
                </dd>
              </div>
              <div className={block("info-item")}>
                <dt>Дата утверждения плана-графика</dt>
                <dd>{formatDate(plan.approvalDate)}</dd>
              </div>
              <div className={block("info-item")}>
                <dt>Дата утверждения обоснования</dt>
                <dd>{formatDate(plan.approveDate)}</dd>
              </div>
              <div className={block("info-item")}>
                <dt>Утвердил (должность, ФИО)</dt>
                <dd>{plan.approvalAuthor || "—"}</dd>
              </div>
              <div className={block("info-item")}>
                <dt>Дата размещения на официальном сайте ЕИС</dt>
                <dd>
                  {plan.publishDate
                    ? formatDate(plan.publishDate)
                    : "не опубликован"}
                </dd>
              </div>
              <div className={block("info-item")}>
                <dt>Дата направления на контроль (ч. 5 ст. 99)</dt>
                <dd>{formatDate(plan.directDate)}</dd>
              </div>
              <div className={block("info-item")}>
                <dt>Роль владельца версии (ЕИС 17.0)</dt>
                <dd>{ownerRoleLabel}</dd>
              </div>
              <div className={block("info-item")}>
                <dt>Вид ПФХД (tenderPlan2020)</dt>
                <dd>{pfhdLabel}</dd>
              </div>
              <div className={block("info-item")}>
                <dt>Единица измерения (ОКЕИ)</dt>
                <dd>
                  {plan.okeiCode || "383"} — {plan.okeiName || "рубль"}
                </dd>
              </div>
              <div className={block("info-item")}>
                <dt>Примечание</dt>
                <dd>{plan.remarks || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title")}>
                Сведения о заказчике и ответственном за планирование
              </h2>
            </div>

            <dl className={block("info-grid")}>
              <div className={block("info-item")}>
                <dt>Полное наименование заказчика</dt>
                <dd>{customer.fullName || "—"}</dd>
              </div>
              <div className={block("info-item")}>
                <dt>ИНН / КПП / ОГРН</dt>
                <dd className={block("mono")}>
                  {customer.inn || "—"} / {customer.kpp || "—"} /{" "}
                  {customer.ogrn || "—"}
                </dd>
              </div>
              <div className={block("info-item")}>
                <dt>Код по СПЗ / Сводному реестру</dt>
                <dd className={block("mono")}>
                  {customer.regNum || "—"} /{" "}
                  {customer.consRegistryNum || "—"}
                </dd>
              </div>
              <div className={block("info-item")}>
                <dt>ОКТМО / ОКОПФ / ОКФС</dt>
                <dd className={block("mono")}>
                  {customer.oktmo || "—"} / {customer.okopf || "—"} /{" "}
                  {customer.okfs || "—"}
                </dd>
              </div>
              <div className={block("info-item")}>
                <dt>Ответственный за планирование</dt>
                <dd>
                  {plan.responsibleContactInfo?.fullName ||
                    customer.responsiblePerson ||
                    "—"}
                  {plan.responsibleContactInfo?.position
                    ? ` (${plan.responsibleContactInfo.position})`
                    : ""}
                </dd>
              </div>
              <div className={block("info-item")}>
                <dt>Контакты ответственного</dt>
                <dd>
                  {plan.responsibleContactInfo?.phone ||
                    customer.responsiblePhone ||
                    "—"}
                  {plan.responsibleContactInfo?.email
                    ? ` · ${plan.responsibleContactInfo.email}`
                    : ""}
                </dd>
              </div>
            </dl>

            <LegalActRefs component="PurchasePlanCard" />
          </section>
        </div>
      )}

      {activeTab === "totals" && (
        <section className={block("section")}>
          <div className={block("section-head")}>
            <h2 className={block("section-title")}>
              Итоговые показатели финансового обеспечения плана-графика
            </h2>
          </div>

          <div className={block("table-wrap")}>
            <table className={block("totals-table")}>
              <thead>
                <tr>
                  <th>Раздел показателей</th>
                  <th>Всего, ₽</th>
                  <th>{baseYear} год, ₽</th>
                  <th>{baseYear + 1} год, ₽</th>
                  <th>{baseYear + 2} год, ₽</th>
                  <th>Последующие годы, ₽</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Позиции плана-графика ({positions.length})</td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.positions.total)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.positions.current)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.positions.first)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.positions.second)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.positions.subsequent)}
                  </td>
                </tr>
                <tr>
                  <td>Особые закупки ({specialPurchases.length})</td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.special.total)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.special.current)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.special.first)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.special.second)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.special.subsequent)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Итого по плану-графику</td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.grand.total)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.grand.current)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.grand.first)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.grand.second)}
                  </td>
                  <td className={block("num")}>
                    {formatMoneyValue(financialTotals.grand.subsequent)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {activeTab === "attachments" && (
        <section className={block("section")}>
          <div className={block("section-head")}>
            <h2 className={block("section-title")}>Вложения плана-графика</h2>
          </div>
          <p className={block("status")}>
            Публичная карточка ЕИС не отдаёт вложения. Доступны печатная форма
            XML 17.0 и ссылка на официальную карточку плана-графика.
          </p>
          <div className={block("attachments")}>
            <button
              type="button"
              className={block("add-btn")}
              onClick={() =>
                downloadText(
                  buildTenderPlan2020XmlPreview(plan),
                  `tenderPlan2020_${plan.planNumber || "draft"}.xml`,
                  "application/xml;charset=utf-8",
                )
              }
            >
              Скачать XML 17.0
            </button>
            {plan.eisUrl && (
              <a
                className={block("eis-link")}
                href={plan.eisUrl}
                target="_blank"
                rel="noreferrer"
              >
                Открыть карточку в ЕИС ↗
              </a>
            )}
          </div>
        </section>
      )}

      {activeTab === "versions" && (
        <section className={block("section")}>
          <div className={block("section-head")}>
            <h2 className={block("section-title")}>Журнал версий</h2>
            <button
              type="button"
              className={block("add-btn")}
              onClick={() => setIsVersionsOpen(true)}
            >
              Сравнить редакции
            </button>
          </div>
          {planVersions.length === 0 ? (
            <p className={block("status")}>
              Сохранённых версий пока нет — зафиксируйте снимок в истории версий.
            </p>
          ) : (
            <div className={block("table-wrap")}>
              <table className={block("journal-table")}>
                <thead>
                  <tr>
                    <th>Редакция</th>
                    <th>Дата</th>
                    <th>Тип</th>
                    <th>Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {[...planVersions]
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((version) => (
                      <tr key={version.id ?? version.versionNumber}>
                        <td>
                          v.{version.versionNumber} — {version.versionLabel}
                        </td>
                        <td>{formatDate(version.createdAt)}</td>
                        <td>
                          {versionKindLabel[version.snapshotStatus] ??
                            version.snapshotStatus}
                        </td>
                        <td>{version.comment || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "events" && (
        <section className={block("section")}>
          <div className={block("section-head")}>
            <h2 className={block("section-title")}>Журнал событий</h2>
          </div>
          {planEvents.length === 0 ? (
            <p className={block("status")}>Событий по плану-графику нет.</p>
          ) : (
            <ol className={block("events")}>
              {planEvents.map((event, index) => (
                <li key={`${event.date}-${index}`} className={block("event")}>
                  <time className={block("event-date")}>
                    {formatDate(event.date)}
                  </time>
                  <div>
                    <strong>{event.title}</strong>
                    {event.details && (
                      <p className={block("event-details")}>{event.details}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {isVersionsOpen && (
        <PurchasePlanVersionsModal
          plan={plan}
          onClose={() => setIsVersionsOpen(false)}
        />
      )}
    </section>
  );
}
