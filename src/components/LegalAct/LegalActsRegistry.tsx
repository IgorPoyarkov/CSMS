import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  useLegalActs,
  visibleLegalActs,
} from "../../services/LegalAct/legalAct.api";
import {
  formatActDate,
  formatActPeriod,
  legalActStatusLabels,
  legalActTypeLabels,
  LEGAL_ACT_TYPES,
  LEGAL_ACT_STATUSES,
  type LegalAct,
  type LegalActStatus,
  type LegalActType,
} from "../../services/LegalAct/legalAct.schema";
import PageSizePicker from "../UI/PageSizePicker";
import styles from "./LegalActsRegistry.module.scss";

const PAGE_SIZES = [10, 25, 50, "all"] as const;

type PageSize = (typeof PAGE_SIZES)[number];

/**
 * Реестр законодательных актов, на которые опирается система (Tasks 6, п. 3).
 *
 * Показывает не только реквизиты акта, но и компоненты системы, которые на него
 * ссылаются: так видно, что именно придётся править, когда норма изменится.
 * Это же основа для будущего отслеживания изменений актов на продакшене.
 */
export default function LegalActsRegistry() {
  const { bem } = useUtils();
  const block = bem(styles, "legal-acts");
  const { data: organization } = useCurrentOrganization();
  const { data: acts = [], isLoading, isError, error } = useLegalActs();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<LegalActType | "">("");
  const [statusFilter, setStatusFilter] = useState<LegalActStatus | "">("");
  const [onlyWithGaps, setOnlyWithGaps] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);

  const organizationActs = useMemo(
    () => visibleLegalActs(acts, organization?.id),
    [acts, organization?.id],
  );

  const found = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/ё/g, "е");

    return (
      organizationActs
        .filter((act) => {
          if (typeFilter && act.actType !== typeFilter) return false;
          if (statusFilter && act.status !== statusFilter) return false;
          // «С сверкой не всё чисто»: не сверенные или просроченная сверка
          if (onlyWithGaps && act.isVerified && isCheckFresh(act)) return false;

          if (!needle) return true;

          const haystack = [
            act.shortName,
            act.fullName,
            act.actNumber,
            act.adoptedBy,
            act.scope,
            ...(act.components ?? []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .replace(/ё/g, "е");

          return haystack.includes(needle);
        })
        // Свежие редакции выше: устаревшие и заменённые акты — вниз
        .sort((first, second) => {
          if (first.status !== second.status) {
            return first.status === "active" ? -1 : 1;
          }
          return (second.adoptedDate ?? "").localeCompare(
            first.adoptedDate ?? "",
          );
        })
    );
  }, [organizationActs, query, typeFilter, statusFilter, onlyWithGaps]);

  const totalPages = Math.max(1, Math.ceil(found.length / Number(pageSize)));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * Number(pageSize);
  const pageActs = found.slice(start, start + Number(pageSize));

  const uncheckedCount = organizationActs.filter(
    (act) => !act.isVerified || !isCheckFresh(act),
  ).length;

  return (
    <section className={block()}>
      <div className={block("header")}>
        <div>
          <h1 className={block("title")}>Законодательные акты</h1>
          <p className={block("summary")}>
            Актов в реестре: {organizationActs.length}. Проверка актуальности не
            пройдена: {uncheckedCount}.
          </p>
          <p className={block("note")}>
            Реестр связывает нормы с местами системы, где они применяются: в
            графе «Где применяется» перечислены компоненты, которые нужно
            актуализировать при изменении акта. Отметка «Сверен» означает, что
            реквизиты проверены по официальному источнику; записи без отметки
            перенесены из формулировок интерфейса и ждут сверки.
          </p>
        </div>
      </div>

      <div className={block("toolbar")}>
        <input
          className={block("search")}
          type="search"
          placeholder="Поиск по наименованию, номеру, ведомству или компоненту…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />

        <label className={block("control")}>
          <span className={block("control-caption")}>Вид акта</span>
          <select
            className={block("select")}
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as LegalActType | "");
              setPage(1);
            }}
          >
            <option value="">все</option>
            {LEGAL_ACT_TYPES.map((type) => (
              <option key={type} value={type}>
                {legalActTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className={block("control")}>
          <span className={block("control-caption")}>Статус</span>
          <select
            className={block("select")}
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as LegalActStatus | "");
              setPage(1);
            }}
          >
            <option value="">любой</option>
            {LEGAL_ACT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {legalActStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className={block("toggle")}>
          <input
            type="checkbox"
            checked={onlyWithGaps}
            onChange={(event) => {
              setOnlyWithGaps(event.target.checked);
              setPage(1);
            }}
          />
          Требуют внимания
        </label>

        <PageSizePicker
          sizes={PAGE_SIZES}
          value={pageSize}
          onChange={(size) => {
            setPageSize(size as PageSize);
            setPage(1);
          }}
        />
      </div>

      {isLoading && (
        <p className={block("status")}>Загрузка реестра актов...</p>
      )}

      {isError && (
        <p className={block("status", ["error"])}>
          Не удалось загрузить реестр актов: {String(error)}
        </p>
      )}

      {!isLoading && !isError && found.length === 0 && (
        <p className={block("status")}>
          Актов по заданным условиям не найдено.
        </p>
      )}

      {pageActs.length > 0 && (
        <>
          <div className={block("table-wrapper")}>
            <table className={block("table")}>
              <thead>
                <tr>
                  <th>Акт</th>
                  <th>Кем принят</th>
                  <th>Номер</th>
                  <th>Принят</th>
                  <th>Период действия</th>
                  <th>Статус</th>
                  <th>Где применяется</th>
                  <th>Сверка</th>
                </tr>
              </thead>
              <tbody>
                {pageActs.map((act) => (
                  <tr key={String(act.id)}>
                    <td className={block("cell")}>
                      <span className={block("name")}>{act.shortName}</span>
                      <span className={block("sub")}>{act.fullName}</span>
                      {act.scope && (
                        <span className={block("scope")}>{act.scope}</span>
                      )}
                    </td>
                    <td className={block("cell")}>{act.adoptedBy}</td>
                    <td className={block("code")}>{act.actNumber}</td>
                    <td className={block("cell")}>
                      {formatActDate(act.adoptedDate) || "—"}
                    </td>
                    <td className={block("cell")}>
                      {formatActPeriod(act) || "—"}
                    </td>
                    <td className={block("cell")}>
                      <span className={block("tag", [act.status])}>
                        {legalActStatusLabels[act.status]}
                      </span>
                      {act.supersededBy && (
                        <span className={block("sub")}>{act.supersededBy}</span>
                      )}
                    </td>
                    <td className={block("cell")}>
                      {(act.components ?? []).length === 0 ? (
                        <span className={block("sub")}>связи не указаны</span>
                      ) : (
                        <span className={block("components")}>
                          {(act.components ?? []).map((component) => (
                            <span
                              key={component}
                              className={block("component")}
                              title={`Компонент системы: ${component}`}
                            >
                              {component}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className={block("cell")}>
                      {act.isVerified ? (
                        <span className={block("check", ["done"])}>
                          Сверен
                          {act.lastCheckedDate
                            ? ` ${formatActDate(act.lastCheckedDate)}`
                            : ""}
                        </span>
                      ) : (
                        <span className={block("check", ["pending"])}>
                          Не сверен
                        </span>
                      )}
                      {act.notes && (
                        <span className={block("sub")}>{act.notes}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={block("pager")}>
              <button
                type="button"
                className={block("pager-button")}
                disabled={safePage === 1}
                onClick={() => setPage(safePage - 1)}
              >
                ← Назад
              </button>
              <span className={block("pager-info")}>
                Страница {safePage} из {totalPages}
              </span>
              <button
                type="button"
                className={block("pager-button")}
                disabled={safePage === totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// Сверку считают свежей, если она пройдена за последний год: чаще нормы не
// меняются, а чаще года без проверки акт пора пересматривать
function isCheckFresh(act: LegalAct): boolean {
  if (!act.lastCheckedDate) return false;
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  return act.lastCheckedDate >= yearAgo.toISOString().slice(0, 10);
}
