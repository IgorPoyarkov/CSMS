import { Fragment, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import {
  useDeletePurchasePlan,
  usePurchasePlan,
  useUpdatePurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.api";
import { useAddProcurement } from "../../services/Procurements/procurement.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  formatMoney,
  formatMoneyValue,
  planTotalAmount,
  positionStatusLabel,
  purchasePlanStatusLabel,
} from "./purchasePlan.config";
import {
  emptyPurchasePlanPosition,
  positionKbkCodes,
  toNumber,
  type PurchasePlanPosition,
} from "../../services/PurchasePlan/purchasePlan.schema";
import PurchasePlanPositionModal from "./PurchasePlanPositionModal";
import PurchaseNoteModal from "../PurchaseNote/PurchaseNoteModal";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import {
  latestPurchaseNoteForPosition,
  purchaseNotesForPosition,
} from "../../services/PurchaseNote/purchaseNote.schema";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import type { RawProcurement } from "../../services/Procurements/procurement.schema";
import LegalActRefs from "../LegalAct/LegalActRefs";
import PageSizePicker, { type PageSizeValue } from "../UI/PageSizePicker";
import { DEFAULT_PROCUREMENT_TYPES } from "../ProcurementProcessing/procurement.config";
import styles from "./PurchasePlanCard.module.scss";

/**
 * Графы записи ПГ — по форме просмотра плана-графика закупок
 * (Tasks 7, п. 4). Порядок слева направо:
 *
 * 1. планируемый год размещения извещения, направления приглашения,
 *    заключения контракта с единственным поставщиком;
 * 2. номер закупки, включённой в план-график;
 * 3. наименование объекта (объектов) закупки;
 * 4. наименование товара, работы, услуги по ОКПД2 — код, выбранный
 *    пользователем; у нормируемых позиций рядом стоит знак «i»;
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
  const { mutate: deletePlan, isPending: isDeleting } = useDeletePurchasePlan();
  const { mutate: createSz, isPending: isCreatingSz } = useAddProcurement();
  // Справочник ОКПД2 нужен, чтобы у позиции ПГ показать обязательное
  // нормирование и предельную цену единицы (ПП РФ N 926)
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  // Служебные записки по позициям ПГ — носители требования по СМП
  const { data: purchaseNotes = [] } = usePurchaseNotes(organizationId);
  const [notePosition, setNotePosition] = useState<PurchasePlanPosition | null>(
    null,
  );
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "purchase-plan-card");

  // Поиск и постраничный показ записей: их в плане-графике бывает несколько
  // сотен (Tasks 3 п. 2, подтверждение — Tasks 5 п. 2)
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<PageSizeValue>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  // Правка отдельной записи плана-графика (Tasks 7, п. 4): изменяется одна
  // позиция, а не весь документ. Индекс — положение записи в плане
  const [editing, setEditing] = useState<{
    position: PurchasePlanPosition;
    index: number;
    isNew: boolean;
  } | null>(null);
  const { mutate: updatePlan, isPending: isSavingPosition } =
    useUpdatePurchasePlan();

  // Создание СЗ (закупки) из позиции ПГ. НМЦК и способ определения
  // поставщика в записи ПГ не указываются, поэтому стартом СЗ берём объём
  // финансового обеспечения, а тип закупки — нейтральный из справочника.
  // Требование о привлечении СМП передаётся из служебки по этой позиции —
  // дальше по цепочке его подхватывает извещение (Tasks 9, п. 7, п/п 3)
  function handleCreateSz(position: PurchasePlanPosition) {
    const raw: RawProcurement = {
      "Идентификационный код закупки": position.identificationCode || "",
      "Наименование закупки": position.objectOfPurchase,
      "Начальная (максимальная) цена контракта, руб":
        toNumber(position.amountTotal) ?? 0,
      "Тип закупки":
        DEFAULT_PROCUREMENT_TYPES[DEFAULT_PROCUREMENT_TYPES.length - 1],
    };
    const note = latestPurchaseNoteForPosition(purchaseNotes, position.id);
    createSz(raw, {
      onSuccess: (created) => {
        navigate(`/procurement-processing/${created.id}/notice-info`, {
          state: {
            ikz: position.identificationCode,
            name: position.objectOfPurchase,
            procurementType: raw["Тип закупки"],
            smpRequiredPercent: note?.smpRequiredPercent,
            purchaseNoteNumber: note ? String(note.noteNumber) : undefined,
          },
        });
      },
    });
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
        Number(pageSize),
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
  // Вложенные функции вызываются после проверок загрузки, но TypeScript не
  // переносит в них сужение plan, поэтому план передаётся через const
  const currentPlan = plan;

  function handleDelete() {
    if (window.confirm("Удалить план-график и все его записи?")) {
      deletePlan(
        { id: planId, organizationId },
        { onSuccess: () => navigate("/purchase-plans") },
      );
    }
  }

  // Правка отдельной записи: план-график перезаписывается целиком (json-server
  // не умеет точечного обновления вложенного массива), но из содержательных
  // изменений получает только выбранную позицию
  function savePosition(position: PurchasePlanPosition) {
    if (!editing) {
      return;
    }

    const nextPositions = editing.isNew
      ? [...positions, position]
      : positions.map((current, index) =>
          index === editing.index ? position : current,
        );

    updatePlan(
      { id: planId, data: { ...currentPlan, positions: nextPositions } },
      { onSuccess: () => setEditing(null) },
    );
  }

  function removePosition(index: number) {
    if (!window.confirm("Удалить запись плана-графика?")) {
      return;
    }

    updatePlan(
      {
        id: planId,
        data: {
          ...currentPlan,
          positions: positions.filter((_, i) => i !== index),
        },
      },
      { onSuccess: () => setEditing(null) },
    );
  }

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
        // Код, выбранный пользователем; расшифровка не дублируется —
        // наименование объекта и есть наименование по ОКПД2
        const normedRef = findOkpd2ByCode(okpd2Refs, position.okpd2Code);
        const normTip = normedRef?.isNormed
          ? normedRef.normLimit !== undefined
            ? `Обязательное нормирование: цена единицы не выше ${formatMoney(normedRef.normLimit)} (ПП РФ N 926)`
            : "Обязательное нормирование: предельная цена единицы устанавливается правовым актом (ПП РФ N 926)"
          : undefined;

        return (
          <span className={block("okpd2")}>
            {position.okpd2Code ? (
              <span className={block("code")}>{position.okpd2Code}</span>
            ) : (
              "—"
            )}
            {normTip && (
              <span
                className={block("info")}
                title={normTip}
                aria-label={normTip}
              >
                i
              </span>
            )}
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

        return (
          <>
            <span className={block("status-tag", [status, "compact"])}>
              {positionStatusLabel(status)}
            </span>
            {position.statusDate && (
              <span className={block("sub", ["compact"])}>
                от {formatDate(position.statusDate)}
              </span>
            )}
          </>
        );
      }
      case "isPublicDiscussionRequired":
        return position.isPublicDiscussionRequired ? "Да" : "Нет";
      default:
        return "—";
    }
  }

  // Действия по записи плана-графика: правка только своей записи (не всего
  // плана-графика), служебка по позиции и создание закупки из позиции
  function renderActionsCell(position: PurchasePlanPosition): React.ReactNode {
    const positionNotes = purchaseNotesForPosition(purchaseNotes, position.id);

    return (
      <div className={block("row-actions")}>
        <button
          className={block("edit-btn")}
          type="button"
          onClick={() =>
            setEditing({
              position,
              index: positions.indexOf(position),
              isNew: false,
            })
          }
        >
          Изменить
        </button>
        <button
          className={block("action-btn")}
          type="button"
          onClick={() => setNotePosition(position)}
        >
          Создать служебку
        </button>
        {positionNotes.length > 0 && (
          <span className={block("row-actions-note")}>
            СЗ {positionNotes.map((note) => `№${note.noteNumber}`).join(", ")}
            {positionNotes.some((note) => note.smpRequiredPercent !== undefined)
              ? ` · СМП ${Math.max(
                  ...positionNotes.map((note) =>
                    Number(note.smpRequiredPercent ?? 0),
                  ),
                )}%`
              : ""}
          </span>
        )}
        <button
          className={block("action-btn")}
          type="button"
          disabled={isCreatingSz}
          onClick={() => handleCreateSz(position)}
        >
          Создать СЗ
        </button>
      </div>
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
                ...(key === "status" || key === "isPublicDiscussionRequired"
                  ? ["center"]
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
          <td className={block("cell", ["ikz"])} colSpan={2}>
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
          <p className={block("customer-name")}>{customer.fullName}</p>
        </div>
        <div className={block("header-actions")}>
          <span className={block("status-tag", [plan.status])}>
            {purchasePlanStatusLabel(plan.status)}
          </span>
          <div className={block("actions")}>
            <button
              type="button"
              onClick={() => navigate(`/purchase-plans/${plan.id}/edit`)}
            >
              Изменить
            </button>
            <button type="button" disabled={isDeleting} onClick={handleDelete}>
              Удалить
            </button>
          </div>
        </div>
      </header>

      <fieldset className={block("section")}>
        <legend>Сведения о плане</legend>

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
        </ul>
        <p className={block("note")}>
          {customer.shortName || customer.fullName}
          {customer.inn ? ` · ИНН ${customer.inn}` : ""}
          {customer.kpp ? ` · КПП ${customer.kpp}` : ""}
        </p>
        {/* Форма записи и состав граф берутся из актов реестра: при правке
            нормы меняется запись реестра, а не подписи в таблице */}
        <LegalActRefs component="PurchasePlanCard" />
      </fieldset>

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

              {/* Новая запись заводится без перехода в режим правки всего
                  плана-графика */}
              <button
                type="button"
                className={block("add-btn")}
                onClick={() =>
                  setEditing({
                    position: {
                      ...emptyPurchasePlanPosition(),
                      serialNumber: String(positions.length + 1),
                    },
                    index: positions.length,
                    isNew: true,
                  })
                }
              >
                Добавить запись
              </button>
            </div>

            {visiblePositions.length === 0 ? (
              <p className={block("status")}>
                По заданным условиям записей плана-графика не найдено.
              </p>
            ) : (
              <div className={block("table-wrapper")}>
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
                      <th className={block("th", ["narrow"])}>
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
                      <th rowSpan={2} aria-label="Действия" />
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

      {/* Правка отдельной записи плана-графика */}
      {editing && (
        <PurchasePlanPositionModal
          plan={plan}
          position={editing.position}
          index={editing.index}
          positions={positions}
          isNew={editing.isNew}
          isSaving={isSavingPosition}
          onClose={() => setEditing(null)}
          onSave={savePosition}
          onDelete={
            editing.isNew ? undefined : () => removePosition(editing.index)
          }
        />
      )}
      {/* Служебная записка по позиции плана-графика (Tasks 9, п. 7, п/п 3) */}
      {notePosition && organizationId !== undefined && (
        <PurchaseNoteModal
          organizationId={organizationId}
          plan={plan}
          position={notePosition}
          onClose={() => setNotePosition(null)}
        />
      )}
    </section>
  );
}
