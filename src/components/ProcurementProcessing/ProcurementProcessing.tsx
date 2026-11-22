import type React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import PageSizePicker, { type PageSizeValue } from "../UI/PageSizePicker";
import {
  useDeleteProcurement,
  useGetProcurements,
  useUpdateProcurementStatus,
} from "../../services/Procurements/procurement.api";
import {
  NOTICE_FILTER_STATUSES,
  noticeStatusLabel,
  type NoticeStatus,
  type Procurement,
} from "../../services/Procurements/procurement.schema";

import type { ProcurementActionType } from "./procurement.config";
import ProcurementRow from "./ProcurementRow";
import styles from "./ProcurementProcessing.module.scss";
import Loader from "../UI/Loader";

type StatusFilter = NoticeStatus | "all";

// Масштаб страницы: тот же набор, что в остальных реестрах проекта
const PAGE_SIZES = [10, 25, 50, "all"] as const;

const ProcurementProcessing: React.FC = () => {
  const { bem } = useUtils();
  const block = bem(styles, "procurement-processing");
  const navigate = useNavigate();

  const { data: procurements = [], isLoading, isError } = useGetProcurements();
  const { mutate: deleteProcurement, isPending: isDeleting } =
    useDeleteProcurement();
  const { mutate: updateStatus, isPending: isStatusPending } =
    useUpdateProcurementStatus();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<PageSizeValue>(10);
  const [page, setPage] = useState(1);

  // В разделе — только текущие извещения: отменённые записи скрыты
  const currentProcurements = useMemo(
    () => procurements.filter((item) => item.noticeStatus !== "cancelled"),
    [procurements],
  );

  // Счётчики по статусам для фильтра
  const statusCounts = useMemo(() => {
    const counts = new Map<NoticeStatus, number>();
    currentProcurements.forEach((item) => {
      counts.set(item.noticeStatus, (counts.get(item.noticeStatus) ?? 0) + 1);
    });
    return counts;
  }, [currentProcurements]);

  const visibleProcurements = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return currentProcurements.filter((item) => {
      if (statusFilter !== "all" && item.noticeStatus !== statusFilter) {
        return false;
      }
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        (item.noticeNumber ?? "").toLowerCase().includes(needle)
      );
    });
  }, [currentProcurements, statusFilter, query]);

  // ─── Пагинация ────────────────────────────────────────────────────────────
  // Как в реестрах контрактов и НПА: масштаб задаётся PageSizePicker, «Все»
  // выключает разбиение. Смена фильтров, поиска и масштаба возвращает на
  // первую страницу — setPage(1) в обработчиках событий, без useEffect
  // со setState (каскадный рендер).
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(visibleProcurements.length / Number(pageSize)));
  const safePage = Math.min(page, totalPages);
  const start = pageSize === "all" ? 0 : (safePage - 1) * Number(pageSize);
  const pagedProcurements =
    pageSize === "all"
      ? visibleProcurements
      : visibleProcurements.slice(start, start + Number(pageSize));

  const handleAction = (action: ProcurementActionType, item: Procurement) => {
    switch (action) {
      case "view_notice":
      case "edit_notice":
        // Оба действия открывают форму извещения: просмотр доступен по правам,
        // «Внести изменения» ведёт туда же, но с явным намерением правки
        navigate(`/procurement-processing/${item.id}/notice-info`, {
          state: {
            ikz: item.ikz,
            name: item.name,
            procurementType: item.procurementType,
            nmck: item.nmck,
            noticeNumber: item.noticeNumber ?? undefined,
            kbk: item.kbk ?? undefined,
          },
        });
        break;

      case "create_contract_project":
        // Прямой вход в конструктор проекта контракта по сохранённому
        // извещению: реестр /contract-projects для этого не нужен
        navigate(`/procurement-processing/${item.id}/contract-project`, {
          state: {
            procurementId: item.id,
            ikz: item.ikz,
            name: item.name,
            procurementType: item.procurementType,
            nmck: item.nmck,
            noticeNumber: item.noticeNumber ?? undefined,
            kbk: item.kbk ?? undefined,
          },
        });
        break;

      case "cancel_notice":
        if (
          window.confirm(
            `Отменить извещение ${item.noticeNumber || item.ikz}? Запись останется в системе со статусом «Отменено» и будет скрыта из текущих.`,
          )
        ) {
          updateStatus({ id: item.id, status: "cancelled" });
        }
        break;

      case "generate_docs":
        navigate(
          `/documents?procurementId=${item.id}&docType=commission_order`,
        );
        break;

      case "delete_procurement":
        if (
          window.confirm(
            "Удалить запись закупки без возможности восстановления?",
          )
        ) {
          deleteProcurement(item.id);
        }
        break;
    }
  };

  return (
    <section className={block()}>
      <header className={block("header")}>
        <h1 className={block("title")}>Извещения (текущие)</h1>
        <button
          type="button"
          className={`${block("close")} btn`}
          onClick={() => navigate("/")}
          aria-label="Закрыть"
        >
          ✕
        </button>
      </header>

      {isLoading && <Loader modifer="pendulum" />}
      {isError && (
        <p className={block("status", ["error"])}>
          Ошибка загрузки данных с сервера
        </p>
      )}

      <div className={block("toolbar")}>
        <div className={block("toolbar-row")}>
          <input
            type="search"
            className={block("search")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Поиск по названию или номеру извещения…"
            aria-label="Поиск по названию или номеру извещения"
          />

          <PageSizePicker
            sizes={PAGE_SIZES}
            value={pageSize}
            onChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>

        <div
          className={block("filters")}
          role="group"
          aria-label="Фильтр по статусу извещения"
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
            <span className={block("chip-count")}>
              {currentProcurements.length}
            </span>
          </button>
          {NOTICE_FILTER_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={block(
                "chip",
                statusFilter === status ? ["active"] : [],
              )}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
            >
              {noticeStatusLabel(status)}
              <span className={block("chip-count")}>
                {statusCounts.get(status) ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {visibleProcurements.length === 0 ? (
        <p className={block("status")}>
          {query.trim()
            ? "По запросу ничего не найдено"
            : statusFilter === "all"
              ? "Текущих извещений нет"
              : `Нет извещений со статусом «${noticeStatusLabel(statusFilter)}»`}
        </p>
      ) : (
        <>
          <ul className={block("list")}>
            {pagedProcurements.map((item) => (
              <ProcurementRow
                key={item.id}
                procurement={item}
                onAction={handleAction}
                isDeleting={isDeleting}
                isStatusPending={isStatusPending}
              />
            ))}
          </ul>

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
                {Math.min(
                  start + pagedProcurements.length,
                  visibleProcurements.length,
                )}{" "}
                из {visibleProcurements.length} · страница {safePage} из{" "}
                {totalPages}
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
        </>
      )}
    </section>
  );
};

export default ProcurementProcessing;
