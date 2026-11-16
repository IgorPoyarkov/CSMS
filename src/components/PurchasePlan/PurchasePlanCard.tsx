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
  planPeriodLabels,
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

interface GroupEntry {
  kbk: string;
  positions: PurchasePlanPosition[];
  total: number;
}

/**
 * Графы записи ПГ — по форме просмотра плана-графика закупок
 * (Tasks 7, п. 4). Порядок слева направо:
 *
 * 1. планируемый год размещения извещения, направления приглашения,
 *    заключения контракта с единственным поставщиком;
 * 2. номер закупки, включённой в план-график;
 * 3. наименование объекта (объектов) закупки;
 * 4. наименование товара, работы, услуги по ОКПД2;
 * 5. код бюджетной классификации — один на все ценовые графы записи;
 * 6. объём финансового обеспечения, всего (рублей) — группа из пяти граф:
 *    всего, текущий год, 1-й и 2-й годы планового периода, последующие годы;
 * 7. статус (и дата размещения, когда план-график прошёл контроль);
 * 8. обязательное общественное обсуждение.
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
  "kbk",
  "amountTotal",
  "amountCurrentYear",
  "amountPlanPeriodFirstYear",
  "amountPlanPeriodSecondYear",
  "amountSubsequentYears",
  "status",
  "isPublicDiscussionRequired",
] as const;

type ColumnKey = (typeof ROW_COLUMNS)[number];

// Ценовые графы записи: под общей шапкой «Объём финансового обеспечения»
const AMOUNT_COLUMNS = [
  "amountTotal",
  "amountCurrentYear",
  "amountPlanPeriodFirstYear",
  "amountPlanPeriodSecondYear",
  "amountSubsequentYears",
] as const;

type AmountKey = (typeof AMOUNT_COLUMNS)[number];

// Узкие графы: содержимое короткое, ширину на себя тянуть не должно
const NARROW_COLUMNS: ColumnKey[] = [
  "plannedPlacementYear",
  "purchaseNumber",
  "status",
  "isPublicDiscussionRequired",
];

// Широкие графы: наименования режутся в две строки, поэтому им нужен запас
const WIDE_COLUMNS: ColumnKey[] = ["objectOfPurchase", "okpd2Code"];

// Строка итогов по КБК: подпись занимает графы до КБК включительно, дальше —
// пять ценовых граф, затем пустые ячейки до конца строки
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
  const labels = planPeriodLabels(plan.planYear);
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
      case "kbk": {
        // КБК один на все ценовые графы записи и остаётся кнопкой
        // группировки. Кодов у записи может быть несколько — показываем
        // первый и число остальных
        const codes = positionKbkCodes(position);
        if (codes.length === 0) return "—";

        return (
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
        );
      }
      case "amountTotal":
      case "amountCurrentYear":
      case "amountPlanPeriodFirstYear":
      case "amountPlanPeriodSecondYear":
      case "amountSubsequentYears":
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
        return position.isPublicDiscussionRequired ? "Да" : "Нет";
      case "okpd2Code": {
        const normedRef = findOkpd2ByCode(okpd2Refs, position.okpd2Code);

        return (
          <>
            {position.okpd2Code ? (
              <span className={block("code")}>{position.okpd2Code}</span>
            ) : (
              "—"
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

  // Запись плана-графика — две строки таблицы: первая с графами, вторая с ИКЗ
  // под «Номером закупки» и «Наименованием объекта закупки» (как в форме ПГ).
  // Действия занимают обе строки. striped — полоса чётных записей.
  function renderPositionRow(
    position: PurchasePlanPosition,
    isSub = false,
    striped = false,
  ) {
    const rowClass = block("row", [
      ...(striped ? ["striped"] : []),
      ...(isSub ? ["sub"] : []),
    ]);

    return (
      <Fragment key={String(position.id)}>
        <tr className={rowClass}>
          {ROW_COLUMNS.map((key) => (
            <td
              key={key}
              className={block("cell", [
                ...(NARROW_COLUMNS.includes(key) ? ["narrow"] : []),
                ...(WIDE_COLUMNS.includes(key) ? ["wide"] : []),
                ...((AMOUNT_COLUMNS as readonly ColumnKey[]).includes(key)
                  ? ["amount"]
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
          {/* Под графой «Планируемый год» — пусто, тянется фоновой линией */}
          <td className={block("cell", ["narrow"])} />
          <td className={block("cell", ["ikz"])} colSpan={2}>
            {position.identificationCode ? (
              <span className={block("code", ["ikz"])}>
                {position.identificationCode}
              </span>
            ) : (
              <span className={block("ikz-label")}>не сформирован</span>
            )}
          </td>
          {/* Пустые ячейки под остальными графами первой строки */}
          {Array.from({
            length:
              ROW_COLUMNS.length -
              // год (1) и номер+объект (2) уже заняты
              3,
          }).map((_, index) => (
            <td key={`ikz-empty-${index}`} className={block("cell")} />
          ))}
        </tr>
      </Fragment>
    );
  }

  // Итоги группы по пяти ценовым графам записи
  function groupAmounts(group: GroupEntry): Record<AmountKey, number> {
    return group.positions.reduce(
      (acc, position) => {
        acc.amountTotal += toNumber(position.amountTotal) ?? 0;
        acc.amountCurrentYear += toNumber(position.amountCurrentYear) ?? 0;
        acc.amountPlanPeriodFirstYear +=
          toNumber(position.amountPlanPeriodFirstYear) ?? 0;
        acc.amountPlanPeriodSecondYear +=
          toNumber(position.amountPlanPeriodSecondYear) ?? 0;
        acc.amountSubsequentYears +=
          toNumber(position.amountSubsequentYears) ?? 0;
        return acc;
      },
      {
        amountTotal: 0,
        amountCurrentYear: 0,
        amountPlanPeriodFirstYear: 0,
        amountPlanPeriodSecondYear: 0,
        amountSubsequentYears: 0,
      },
    );
  }

  // Строка итогов по группе КБК: подпись занимает графы до КБК включительно,
  // дальше пять ценовых граф и пустые ячейки до конца строки
  function groupAmountsRow(group: GroupEntry) {
    const amounts = groupAmounts(group);
    const filledColumns = GROUP_SUMMARY_COLSPAN + AMOUNT_COLUMNS.length;

    return (
      <tr key={`sum-${group.kbk}`} className={block("group-row")}>
        <td className={block("cell")} colSpan={GROUP_SUMMARY_COLSPAN}>
          <strong>Итого по КБК {formatKbk(group.kbk)}</strong>
          <span className={block("sub")}>
            Позиций в группе: {group.positions.length}
          </span>
        </td>
        {AMOUNT_COLUMNS.map((key) => (
          <td key={key} className={block("cell", ["amount"])}>
            <span className={block("amount")}>
              {formatMoneyValue(amounts[key])}
            </span>
          </td>
        ))}
        {Array.from({
          length: Math.max(0, ROW_COLUMNS.length + 1 - filledColumns),
        }).map((_, index) => (
          <td key={`sum-empty-${index}`} />
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
                    {/* Шапка в две строки, как в форме ПГ: под «Номером
                        закупки» и «Наименованием объекта закупки» стоит ИКЗ,
                        а «Объём финансового обеспечения» раскрыт по годам */}
                    <tr>
                      <th rowSpan={2} className={block("th", ["year"])}>
                        Планируемый год размещения извещения, направления
                        приглашения, заключения контракта с единственным
                        поставщиком (подрядчиком, исполнителем)
                      </th>
                      <th>Номер закупки, включенной в план-график</th>
                      <th>Наименование объекта (объектов) закупки</th>
                      <th rowSpan={2}>Наименование товара, работы, услуги по ОКПД2</th>
                      <th rowSpan={2}>Код бюджетной классификации</th>
                      <th
                        colSpan={AMOUNT_COLUMNS.length}
                        className={block("th", ["amount"])}
                      >
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
                      <th>{labels.total}</th>
                      <th>{labels.currentYear}</th>
                      <th>{labels.firstPlanYear}</th>
                      <th>{labels.secondPlanYear}</th>
                      <th>{labels.subsequentYears}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups
                      ? groups.map((group) => (
                          <Fragment key={group.kbk}>
                            {groupAmountsRow(group)}
                            {group.positions.map((position, index) =>
                              renderPositionRow(position, true, index % 2 === 1),
                            )}
                          </Fragment>
                        ))
                      : visiblePositions.map((position, index) =>
                          renderPositionRow(position, false, index % 2 === 1),
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
