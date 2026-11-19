import type React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
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

      case "cancel_notice":
        if (
          window.confirm(
            `Отменить извещение ${item.noticeNumber || item.ikz}? Запись останется в системе со статусом «Отменено» и будет скрыта из текущих.`,
          )
        ) {
          updateStatus({ id: item.id, status: "cancelled" });
        }
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
        <input
          type="search"
          className={block("search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по названию или номеру извещения…"
          aria-label="Поиск по названию или номеру извещения"
        />

        <div
          className={block("filters")}
          role="group"
          aria-label="Фильтр по статусу извещения"
        >
          <button
            type="button"
            className={block(
              "filter",
              statusFilter === "all" ? ["active"] : [],
            )}
            onClick={() => setStatusFilter("all")}
          >
            Все ({currentProcurements.length})
          </button>
          {NOTICE_FILTER_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={block(
                "filter",
                statusFilter === status ? ["active"] : [],
              )}
              onClick={() => setStatusFilter(status)}
            >
              {noticeStatusLabel(status)} ({statusCounts.get(status) ?? 0})
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
        <ul className={block("list")}>
          {visibleProcurements.map((item) => (
            <ProcurementRow
              key={item.id}
              procurement={item}
              onAction={handleAction}
              isDeleting={isDeleting}
              isStatusPending={isStatusPending}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export default ProcurementProcessing;
