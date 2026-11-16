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
  formatKbk,
  formatMoney,
  formatMoneyValue,
  planTotalAmount,
  positionStatusLabel,
  purchasePlanStatusLabel,
} from "./purchasePlan.config";
import {
  buildPositionUniqueNumber,
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

interface GroupEntry {
  kbk: string;
  positions: PurchasePlanPosition[];
  total: number;
}

/**
 * Столбцы карточки записи ПГ — графы позиции из просмотра плана-графика
 * закупок (Tasks 7, п. 4), в порядке формы:
 *
 * 1. № п/п (под ним — уникальный номер позиции);
 * 2. планируемый год размещения извещения, направления приглашения,
 *    заключения контракта с единственным поставщиком;
 * 3. номер закупки, включённой в план-график;
 * 4. наименование объекта (объектов) закупки;
 * 5. идентификационный код закупки (ИКЗ) — отдельная графа, а не подпись
 *    под объектом: в форме это самостоятельная графа;
 * 6. наименование товара, работы, услуги по ОКПД2;
 * 7. объём финансового обеспечения, всего (рублей) — одна графа, как в форме
 *    (разбивка по годам живёт в записи плана, а не в графах позиции);
 * 8. статус (и дата размещения, когда план-график прошёл контроль);
 * 9. обязательное общественное обсуждение;
 * 10. действия (вне формы ЕИС).
 *
 * КБК отдельной графой не идёт: код стоит над суммой, к которой относится, и
 * остаётся кнопкой группировки. Уполномоченный орган и организатор совместной
 * закупки в графы позиции не входят — они читаются в карточке записи.
 */
const COLUMN_DEFS = [
  { key: "serialNumber", title: "№ п/п" },
  {
    key: "plannedPlacementYear",
    title:
      "Планируемый год размещения извещения, направления приглашения, заключения контракта с единственным поставщиком (подрядчиком, исполнителем)",
  },
  { key: "purchaseNumber", title: "Номер закупки, включенной в план-график" },
  { key: "objectOfPurchase", title: "Наименование объекта (объектов) закупки" },
  { key: "identificationCode", title: "Идентификационный код закупки" },
  {
    key: "okpd2Code",
    title: "Наименование товара, работы, услуги по ОКПД2",
  },
  {
    key: "amountTotal",
    title: "Объём финансового обеспечения, всего (рублей)",
  },
  { key: "status", title: "Статус" },
  { key: "isPublicDiscussionRequired", title: "Обязательное общественное обсуждение" },
  { key: "actions", title: "Действия" },
] as const;

type ColumnKey = (typeof COLUMN_DEFS)[number]["key"];

// Узкие графы: содержимое короткое, ширину на себя тянуть не должно
const NARROW_COLUMNS: ColumnKey[] = [
  "serialNumber",
  "plannedPlacementYear",
  "purchaseNumber",
  "status",
  "isPublicDiscussionRequired",
];

// Широкие графы: наименования режутся в две строки, поэтому им нужен запас
const WIDE_COLUMNS: ColumnKey[] = [
  "objectOfPurchase",
  "okpd2Code",
  "identificationCode",
];

// Строка итогов по КБК: подпись занимает графы до ОКПД2, дальше — количество
// записей, объём финансового обеспечения и пустые ячейки до конца строки
const GROUP_SUMMARY_COLSPAN = 5;

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

  const [groupKbk, setGroupKbk] = useState<string | null>(null);
  // Поиск, фильтр по КБК и постраничный показ записей: их в плане-графике
  // бывает несколько сотен (Tasks 3 п. 2, подтверждение — Tasks 5 п. 2)
  const [searchQuery, setSearchQuery] = useState("");
  const [kbkFilter, setKbkFilter] = useState("");
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

  // Варианты фильтра КБК собираем из самого плана-графика: заказчику нужны его
  // коды, а не весь справочник классификации. У записи кодов может быть
  // несколько — каждый попадает в список
  const kbkOptions = useMemo(() => {
    const codes = new Set<string>();

    positions.forEach((position) => {
      positionKbkCodes(position).forEach((code) => codes.add(code));
    });

    return [...codes].sort((first, second) => first.localeCompare(second));
  }, [positions]);

  const filteredPositions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const compactQuery = query.replace(/\s/g, "");

    return positions.filter((position) => {
      if (kbkFilter && !positionKbkCodes(position).includes(kbkFilter)) {
        return false;
      }

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
  }, [positions, searchQuery, kbkFilter]);

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

  // Группировка по выбранному КБК: позиции кода и его итоги по годам. Запись
  // с несколькими кодами попадает в каждую из групп — как детализация по КБК
  // в просмотре плана-графика
  const groups: GroupEntry[] | null = useMemo(() => {
    if (!groupKbk) return null;
    const map = new Map<string, PurchasePlanPosition[]>();
    for (const position of filteredPositions) {
      const keys = positionKbkCodes(position);

      for (const key of keys.length > 0 ? keys : ["Без КБК"]) {
        const list = map.get(key) ?? [];
        list.push(position);
        map.set(key, list);
      }
    }
    const result: GroupEntry[] = [];
    for (const [kbk, list] of map.entries()) {
      const total = list.reduce(
        (sum, position) => sum + (toNumber(position.amountTotal) ?? 0),
        0,
      );
      result.push({ kbk, positions: list, total });
    }
    result.sort((first, second) => first.kbk.localeCompare(second.kbk));
    return result;
  }, [filteredPositions, groupKbk]);

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

  // Рендер ячейки столбца
  function renderCell(
    key: ColumnKey,
    position: PurchasePlanPosition,
  ): React.ReactNode {
    if (key === "actions") return "—"; // действия обрабатываются отдельно
    const value = position[key as Exclude<ColumnKey, "actions">];
    switch (key) {
      // Номер записи и её уникальный номер: номер плана-графика и
      // шестизначный порядковый номер записи
      case "serialNumber": {
        const order =
          position.serialNumber || String(positions.indexOf(position) + 1);
        const unique =
          position.uniqueNumber ||
          buildPositionUniqueNumber(currentPlan.planNumber, order);

        return (
          <>
            <span className={block("object")}>{order}</span>
            {unique && (
              <span
                className={block("sub")}
                title="Уникальный номер позиции в плане-графике закупок"
              >
                {unique}
              </span>
            )}
          </>
        );
      }
      case "plannedPlacementYear":
        return value || "—";
      case "purchaseNumber":
        return value ? String(value).padStart(4, "0") : "—";
      case "objectOfPurchase":
        // ИКЗ теперь отдельная графа формы — под объектом его больше не дублируем
        return <span className={block("object")}>{value || "—"}</span>;
      case "identificationCode":
        return value ? (
          <span className={block("code", ["ikz"])}>{value}</span>
        ) : (
          "—"
        );
      case "amountTotal": {
        // КБК относится к суммам записи, поэтому стоит над своим итогом и
        // остаётся кнопкой группировки. Кодов у записи может быть несколько —
        // показываем первый и число остальных
        const codes = positionKbkCodes(position);

        return (
          <>
            {codes.length > 0 && (
              <button
                className={block("kbk-btn")}
                type="button"
                title={
                  codes.length > 1
                    ? `Коды бюджетной классификации записи: ${codes
                        .map(formatKbk)
                        .join("; ")}`
                    : "Сгруппировать записи плана-графика по этому КБК"
                }
                onClick={() => {
                  const next = codes[0];
                  setGroupKbk(groupKbk === next ? null : next);
                }}
              >
                {formatKbk(codes[0])}
                {codes.length > 1 && ` +${codes.length - 1}`}
              </button>
            )}
            <span className={block("amount")}>
              {formatMoneyValue(position.amountTotal)}
            </span>
          </>
        );
      }
      // Статус записи и дата, когда она размещена (план-график прошёл контроль).
      // Записи без статуса считаются запланированными
      case "status": {
        const status = position.status ?? "planned";

        return (
          <>
            <span className={block("status-tag", [status])}>
              {positionStatusLabel(status)}
            </span>
            {position.statusDate && (
              <span className={block("sub")}>
                от {formatDate(position.statusDate)}
              </span>
            )}
          </>
        );
      }
      case "isPublicDiscussionRequired":
        return value ? "Да" : "Нет";
      case "okpd2Code": {
        const normedRef = findOkpd2ByCode(okpd2Refs, position.okpd2Code);

        return (
          <>
            {value ? <span className={block("code")}>{value}</span> : "—"}
            {/* Наименование по ОКПД2 — эта же графа в просмотре плана-графика */}
            {position.okpd2Name && (
              <span
                className={block("clip")}
                data-full={position.okpd2Name}
                title={position.okpd2Name}
              >
                <span className={block("clip-text")}>{position.okpd2Name}</span>
              </span>
            )}
            {/* Позиция подлежит обязательному нормированию: цена единицы не
                может превышать предельную (ПП РФ N 926) */}
            {normedRef?.isNormed && (
              <span className={block("norm")}>
                Нормирование
                {normedRef.normLimit !== undefined
                  ? `: не более ${formatMoney(normedRef.normLimit)} за единицу`
                  : " — предельная цена устанавливается правовым актом"}
              </span>
            )}
          </>
        );
      }
      default:
        return value || "—";
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

  // Строка позиции
  function renderPositionRow(position: PurchasePlanPosition, isSub = false) {
    return (
      <tr key={isSub ? `sub-${position.id}` : String(position.id)}>
        {COLUMN_DEFS.map((col) => {
          if (col.key === "actions") {
            return (
              <td key={col.key} className={block("cell")}>
                {renderActionsCell(position)}
              </td>
            );
          }

          return (
            <td
              key={col.key}
              className={block("cell", [
                ...(NARROW_COLUMNS.includes(col.key) ? ["narrow"] : []),
                ...(WIDE_COLUMNS.includes(col.key) ? ["wide"] : []),
              ])}
              style={
                isSub
                  ? { background: "var(--stripe)", fontSize: "12px" }
                  : undefined
              }
            >
              {renderCell(col.key, position)}
            </td>
          );
        })}
      </tr>
    );
  }

  // Итог группы по графе объёма финансового обеспечения
  function groupAmounts(group: GroupEntry) {
    return group.positions.reduce(
      (sum, position) => sum + (toNumber(position.amountTotal) ?? 0),
      0,
    );
  }

  // Строка итогов по группе КБК: подпись занимает графы до ОКПД2 включительно,
  // дальше количество записей, объём финансового обеспечения и пустые ячейки
  // до конца строки
  function groupAmountsRow(group: GroupEntry) {
    const total = groupAmounts(group);
    const filledColumns = GROUP_SUMMARY_COLSPAN + 2;

    return (
      <tr key={`sum-${group.kbk}`} className={block("group-row")}>
        <td className={block("cell")} colSpan={GROUP_SUMMARY_COLSPAN}>
          <strong>Итого по КБК {formatKbk(group.kbk)}</strong>
        </td>
        <td className={block("cell")}>Позиций: {group.positions.length}</td>
        <td className={block("cell")}>
          <span className={block("amount")}>{formatMoneyValue(total)}</span>
        </td>
        {Array.from({
          length: Math.max(0, COLUMN_DEFS.length - filledColumns),
        }).map((_, i) => (
          <td key={i} />
        ))}
      </tr>
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

              <label className={block("toolbar-item")}>
                <span className={block("toolbar-label")}>КБК</span>
                <select
                  className={block("select")}
                  value={kbkFilter}
                  onChange={(event) => {
                    setKbkFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">все коды</option>
                  {kbkOptions.map((code) => (
                    <option key={code} value={code}>
                      {formatKbk(code)}
                    </option>
                  ))}
                </select>
              </label>

              <PageSizePicker
                sizes={[...PAGE_SIZES, ALL_PAGES]}
                value={pageSize}
                allLabel="все"
                onChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />

              {groupKbk && (
                <button
                  type="button"
                  className={block("group-exit")}
                  onClick={() => setGroupKbk(null)}
                >
                  Снять группировку по {formatKbk(groupKbk)}
                </button>
              )}

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
                    <tr>
                      {COLUMN_DEFS.map((col) => (
                        <th
                          key={col.key}
                          className={block(
                            "th",
                            NARROW_COLUMNS.includes(col.key) ? ["narrow"] : [],
                          )}
                        >
                          {col.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups
                      ? groups.map((group) => (
                          <Fragment key={group.kbk}>
                            {groupAmountsRow(group)}
                            {group.positions.map((position) =>
                              renderPositionRow(position, true),
                            )}
                          </Fragment>
                        ))
                      : visiblePositions.map((position) =>
                          renderPositionRow(position),
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
