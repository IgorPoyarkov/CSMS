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
  planTotalAmount,
  positionStatusLabel,
} from "./purchasePlan.config";
import {
  positionKbkCodes,
  type PurchasePlanPosition,
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
import { usePurchasePlanVersions } from "../../services/PurchasePlan/purchasePlanVersion.api";
import {
  buildTenderPlan2020XmlPreview,
  validatePurchasePlanEis17,
} from "../../services/Eis/eis17Types";
import { downloadText } from "../../services/Eis/eisExport";
import styles from "./PurchasePlanCard.module.scss";

/**
 * Графы записи ПГ — по форме просмотра плана-графика закупок
 * (Tasks 7, п. 4). Порядок слева направо:
 *
 * 1. планируемый год размещения извещения, направления приглашения,
 *    заключения контракта с единственным поставщиком;
 * 2. номер закупки, включённой в план-график;
 * 3. наименование объекта (объектов) закупки;
 * 4. наименование товара, работы, услуги по ОКПД2 — название выбранного
 *    кода и сам код мелкой строкой; у нормируемых позиций рядом стоит «i»;
 * 5. объём финансового обеспечения, всего (рублей) — одна итоговая графа:
 *    разбивка по годам живёт в записи плана, а не в графах позиции;
 * 6. статус (и дата размещения, когда план-график прошёл контроль);
 * 7. обязательное общественное обсуждение.
 *
 * ИКЗ печатается второй строкой записи под графами «Номер закупки» и
 * «Наименование объекта закупки» — как в форме, отдельной строкой таблицы.
 * Действия — вне формы ЕИС, идут последней графой без заголовка.
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

// Ценовая графа записи: в таблице показывается только итоговая сумма, а
// разбивка по годам остаётся в записи плана
const AMOUNT_COLUMNS = ["amountTotal"] as const;

// Узкие графы: содержимое короткое, ширину на себя тянуть не должно
const NARROW_COLUMNS: ColumnKey[] = [
  "plannedPlacementYear",
  "purchaseNumber",
  "status",
  "isPublicDiscussionRequired",
];

// Широкая графа: наименование объекта — главный текст таблицы, ему нужен запас.
// Код ОКПД2 короткий, ширину под него не резервируем
const WIDE_COLUMNS: ColumnKey[] = ["objectOfPurchase"];

// Сколько записей показывать: как в списке планов и в личном кабинете ЕИС
const PAGE_SIZES = [10, 25, 50] as const;
const ALL_PAGES = "all";

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
  // Справочник ОКПД2 нужен, чтобы у позиции ПГ показать обязательное
  // нормирование и предельную цену единицы (ПП РФ N 926)
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  // Потребности / служебные записки по позициям ПГ
  const { data: purchaseNotes = [] } = usePurchaseNotes(organizationId);
  const { data: planVersions = [] } = usePurchasePlanVersions(id, organizationId);
  const [confirmDeletePositionId, setConfirmDeletePositionId] = useState<
    string | null
  >(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [showEisXml, setShowEisXml] = useState(false);
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "purchase-plan-card");

  // Поиск и постраничный показ записей: их в плане-графике бывает несколько
  // сотен (Tasks 3 п. 2, подтверждение — Tasks 5 п. 2)
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<PageSizeValue>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);

  // Выпадающий список действий по открытой записи плана-графика
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

      // КБК и ИКЗ ищутся и слитно, и по маске: код могли ввести с пробелами
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

  // Рендер ячейки графы записи
  function renderCell(
    key: ColumnKey,
    position: PurchasePlanPosition,
  ): React.ReactNode {
    switch (key) {
      case "plannedPlacementYear":
        return position.plannedPlacementYear || "—";
      case "purchaseNumber":
        return position.purchaseNumber
          ? String(position.purchaseNumber).padStart(4, "0")
          : "—";
      case "objectOfPurchase":
        return (
          <span className={block("object")}>
            {position.objectOfPurchase || "—"}
          </span>
        );
      case "okpd2Code": {
        // Наименование по ОКПД2, выбранное пользователем, и сам код мелкой
        // строкой под ним; у нормируемых позиций рядом стоит знак «i»
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

        return (
          <span className={block("okpd2")}>
            {position.okpd2Code && (
              <span className={block("code")}>{position.okpd2Code}</span>
            )}
            <span className={block("okpd2-name")}>
              {okpd2Name || position.okpd2Code || "—"}
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
      // Статус записи и дата, когда она размещена (план-график прошёл контроль).
      // Записи без статуса считаются запланированными
      case "status": {
        const status = position.status ?? "planned";
        const posNotes = purchaseNotesForPosition(purchaseNotes, position.id);

        return (
          <div className={block("status-stack")}>
            <span className={block("status-tag", [status, "compact"])}>
              {positionStatusLabel(status)}
            </span>
            {position.statusDate && (
              <span className={block("sub", ["compact"])}>
                от {formatDate(position.statusDate)}
              </span>
            )}
            {posNotes.map((note) => (
              <div key={String(note.id ?? note.noteNumber)} className={block("note-status-line")}>
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

  // Действия по записи плана-графика: правка позиции, единый поинт
  // «Сформировать потребность» (СЗ), расчёт НМЦК и удаление текущей позиции ПГ.
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

  // Запись плана-графика — две строки таблицы: все графы, кроме номера
  // закупки и объекта, занимают обе строки (rowSpan=2), а под номером и
  // объектом второй строкой идёт ИКЗ — как в форме ПГ. Действия тоже на две
  // строки. striped — полоса чётных записей.
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
                // Текстовые графы (объект закупки, ОКПД2) читаются слева
                ...(key === "objectOfPurchase" || key === "okpd2Code"
                  ? []
                  : ["center"]),
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
      <header className={block("header")}>
        <div>
          <button
            type="button"
            className={block("back")}
            onClick={() => navigate("/purchase-plans")}
          >
            ← К списку планов-графиков
          </button>
          <h1 className={block("title")}>
            План-график {plan.planNumber || "без номера"}
          </h1>
        </div>
        <div className={block("actions")}>
          <button
            type="button"
            onClick={() => setIsVersionsOpen(true)}
          >
            История версий ({planVersions.length})
          </button>
          <button
            type="button"
            onClick={() => setShowEisXml((prev) => !prev)}
          >
            {showEisXml ? "Скрыть ЕИС 17.0" : "Проверка ЕИС 17.0 / XML"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/purchase-notes")}
          >
            Реестр потребностей (СЗ)
          </button>
        </div>
      </header>

      <fieldset className={block("section")}>
        <legend>Сведения о плане-графике</legend>

        <ul className={block("fields")}>
          <li className={block("field")}>
            <span className={block("field-label")}>Номер плана</span>
            <span className={block("field-value")}>{plan.planNumber}</span>
          </li>
          <li className={block("field")}>
            <span className={block("field-label")}>Дата утверждения</span>
            <span className={block("field-value")}>
              {formatDate(plan.approvalDate)}
            </span>
          </li>
          <li className={block("field")}>
            <span className={block("field-label")}>
              Публикация на zakupki.gov.ru
            </span>
            <span className={block("field-value")}>
              {plan.publishDate
                ? formatDate(plan.publishDate)
                : "не опубликован"}
            </span>
          </li>
          <li className={block("field")}>
            <span className={block("field-label")}>
              Объём финансового обеспечения (сумма записей)
            </span>
            <span className={block("field-value", ["total"])}>
              {formatMoney(planTotalAmount(plan))}
            </span>
          </li>
          <li className={block("field")}>
            <span className={block("field-label")}>Записей в плане</span>
            <span className={block("field-value")}>{positions.length}</span>
          </li>
          <li className={block("field")}>
            <span className={block("field-label")}>
              ЕИС 17.0 (роль / ПФХД / период)
            </span>
            <span className={block("field-value")}>
              {plan.ownerRole ?? "CU"} / {plan.pfhdType ?? "IND"} ·{" "}
              {plan.planYear}–
              {plan.planPeriodSecondYear || Number(plan.planYear) + 2}
            </span>
          </li>
        </ul>
        <p className={block("note")}>
          {customer.shortName || customer.fullName}
          {customer.inn ? ` · ИНН ${customer.inn}` : ""}
          {customer.kpp ? ` · КПП ${customer.kpp}` : ""}
          {customer.regNum ? ` · СПЗ ${customer.regNum}` : ""}
        </p>

        {showEisXml && (() => {
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

        {/* Форма записи и состав граф берутся из актов реестра: при правке
            нормы меняется запись реестра, а не подписи в таблице */}
        <LegalActRefs component="PurchasePlanCard" />
      </fieldset>

      {/* Основная кнопка добавления записи — над таблицей записей */}
      <button
        type="button"
        className={block("add-btn")}
        onClick={() => navigate(`/purchase-plans/${planId}/positions/new`)}
      >
        Добавить запись
      </button>

      <fieldset className={block("section")}>
        <legend>
          Записи плана-графика ({filteredPositions.length} из {positions.length}
          )
        </legend>

        {positions.length === 0 ? (
          <p className={block("status")}>
            Записи плана-графика не внесены — добавьте их в режиме
            редактирования.
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
                    {/* Шапка в две строки, как в форме ПГ: под «Номером
                        закупки» и «Наименованием объекта закупки» стоит ИКЗ,
                        остальные графы занимают обе строки */}
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
      </fieldset>

      {isVersionsOpen && (
        <PurchasePlanVersionsModal
          plan={plan}
          onClose={() => setIsVersionsOpen(false)}
        />
      )}
    </section>
  );
}
