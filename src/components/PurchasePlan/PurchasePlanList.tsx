import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import PageSizePicker from "../UI/PageSizePicker";
import {
  useDeletePurchasePlan,
  usePurchasePlans,
} from "../../services/PurchasePlan/purchasePlan.api";
import { useContractService } from "../../services/ContractService/contractService.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import { type PurchasePlan } from "../../services/PurchasePlan/purchasePlan.schema";
import {
  formatMoney,
  formatMoneyValue,
  planTotalAmount,
  purchasePlanStatusLabel,
  purchasePlanStatusOptions,
} from "./purchasePlan.config";
import PurchasePlanImportModal from "./PurchasePlanImportModal";
import PurchasePlanVersionsModal from "./PurchasePlanVersionsModal";
import styles from "./PurchasePlanList.module.scss";

// Пагинация: по умолчанию 10, далее 25, 50 и все записи сразу
const PAGE_SIZES = [10, 25, 50, "all"] as const;
type PageSize = (typeof PAGE_SIZES)[number];

export default function PurchasePlanList() {
  const { data: user } = useFetchCurrentUser();
  const {
    data: organization,
    isLoading: isOrganizationLoading,
    isError: isOrganizationError,
  } = useCurrentOrganization();
  const organizationId = organization?.id;
  const {
    data: plans,
    isLoading,
    isError,
    error,
  } = usePurchasePlans(organizationId);
  const { mutate: deletePlan, isPending: isDeleting } = useDeletePurchasePlan();
  const { data: contractService, isLoading: isContractServiceLoading } =
    useContractService(organizationId);
  const needsContractService =
    Boolean(organizationId) && !isContractServiceLoading && !contractService;
  const navigate = useNavigate();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "purchase-plan-list");

  // Фильтры реестра планов-графиков (поиск по номеру ПГ, ИКЗ, ОКПД2, КБК + статус + год)
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);
  const [openMenuPlanId, setOpenMenuPlanId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [versionsPlan, setVersionsPlan] = useState<PurchasePlan | null>(null);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node | null;

      if (
        target instanceof Element &&
        !target.closest("details[data-plan-actions]")
      ) {
        setOpenMenuPlanId(null);
      }
    }

    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  function handleDelete(plan: PurchasePlan) {
    if (
      window.confirm(
        `Удалить план-график № ${plan.planNumber} за ${plan.planYear} год?`,
      )
    ) {
      deletePlan({
        id: plan.id as string | number,
        organizationId,
      });
    }
  }

  const allPlans = useMemo(() => plans ?? [], [plans]);

  const sortedPlans = useMemo(
    () =>
      [...allPlans].sort((a, b) => {
        const idA = typeof a.id === "number" ? a.id : 0;
        const idB = typeof b.id === "number" ? b.id : 0;
        return idB - idA;
      }),
    [allPlans],
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const p of allPlans) {
      if (p.planYear) years.add(String(p.planYear));
    }
    return Array.from(years).sort().reverse();
  }, [allPlans]);

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedPlans.filter((plan) => {
      if (statusFilter !== "all" && plan.status !== statusFilter) {
        return false;
      }
      if (yearFilter !== "all" && String(plan.planYear) !== yearFilter) {
        return false;
      }
      if (!q) return true;

      if (
        (plan.planNumber || "").toLowerCase().includes(q) ||
        (plan.customer.shortName || "").toLowerCase().includes(q) ||
        (plan.customer.fullName || "").toLowerCase().includes(q) ||
        (plan.customer.inn || "").toLowerCase().includes(q)
      ) {
        return true;
      }

      return plan.positions.some((pos) => {
        const ikz = (pos.identificationCode || "").toLowerCase();
        const okpd2 = (pos.okpd2Code || "").toLowerCase();
        const kbk = (pos.kbk || "").toLowerCase();
        const obj = (pos.objectOfPurchase || "").toLowerCase();
        return (
          ikz.includes(q) ||
          okpd2.includes(q) ||
          kbk.includes(q) ||
          obj.includes(q)
        );
      });
    });
  }, [sortedPlans, searchQuery, statusFilter, yearFilter]);

  const overallAmount = filteredPlans.reduce(
    (total, plan) => total + planTotalAmount(plan),
    0,
  );
  const publishedCount = filteredPlans.filter(
    (p) => p.status === "published",
  ).length;
  const totalPositionsCount = filteredPlans.reduce(
    (acc, p) => acc + (p.positions?.length ?? 0),
    0,
  );

  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = pageSize === "all" ? 0 : (safePage - 1) * pageSize;
  const pagePlans =
    pageSize === "all"
      ? filteredPlans
      : filteredPlans.slice(start, start + pageSize);

  const hasNoAccount = !user;
  const hasNoOrganization =
    !isOrganizationLoading && !isOrganizationError && !organization;

  return (
    <section className={block()}>
      <nav className={block("breadcrumbs")} aria-label="Навигационная цепочка">
        <Link to="/" className={block("crumb")}>
          Главная
        </Link>
        <span className={block("crumb-sep")} aria-hidden="true">
          /
        </span>
        <span className={block("crumb", ["current"])}>
          Планы-графики закупок (44-ФЗ)
        </span>
      </nav>

      <header className={block("header")}>
        <div className={block("header-info")}>
          <span className={block("eyebrow")}>
            Реестр документов планирования · 44-ФЗ
          </span>
          <h1 className={block("title")}>Планы-графики закупок</h1>
          <p className={block("current-organization")}>
            {organization
              ? `${organization.fullName || organization.shortName} · ИНН ${organization.inn}${
                  organization.kpp ? ` · КПП ${organization.kpp}` : ""
                }`
              : "Организация-заказчик не определена"}
          </p>
        </div>

        <div className={block("header-actions")}>
          <button
            className={block("import-button")}
            type="button"
            disabled={!organizationId || needsContractService}
            onClick={() => setIsImportOpen(true)}
          >
            Загрузить из файла / ЕИС
          </button>
          <button
            className={block("create-button")}
            type="button"
            disabled={!organizationId || needsContractService}
            onClick={() => navigate("/purchase-plans/new")}
          >
            + Сформировать план-график
          </button>
        </div>

        <div className={block("kpi-strip")}>
          <div className={block("kpi-item")}>
            <span className={block("kpi-label")}>Найдено планов</span>
            <strong className={block("kpi-value")}>
              {filteredPlans.length}
              {filteredPlans.length !== allPlans.length
                ? ` из ${allPlans.length}`
                : ""}
            </strong>
          </div>
          <div className={block("kpi-item")}>
            <span className={block("kpi-label")}>Размещено в ЕИС</span>
            <strong className={block("kpi-value")}>{publishedCount}</strong>
          </div>
          <div className={block("kpi-item")}>
            <span className={block("kpi-label")}>Позиций во всех ПГ</span>
            <strong className={block("kpi-value")}>
              {totalPositionsCount}
            </strong>
          </div>
          <div className={block("kpi-item")}>
            <span className={block("kpi-label")}>
              Совокупный объём финансирования
            </span>
            <strong className={block("kpi-value")}>
              {formatMoney(overallAmount)}
            </strong>
          </div>
        </div>
      </header>

      {isOrganizationLoading && (
        <p className={block("status")}>Определяем организацию заказчика...</p>
      )}

      {hasNoAccount && (
        <div className={block("status", ["warning"])}>
          <p className={block("status-text")}>
            Чтобы увидеть планы-графики своей организации, войдите в систему.
          </p>
          <button
            type="button"
            className={block("login-button")}
            onClick={() => navigate("/account/login")}
          >
            Войти
          </button>
        </div>
      )}

      {(hasNoOrganization || isOrganizationError) && (
        <p className={block("status", ["error"])}>
          К вашей учётной записи не привязана организация-заказчик, поэтому
          планы-графики недоступны. Обратитесь к администратору системы.
        </p>
      )}

      {needsContractService && (
        <div className={block("status", ["warning"])}>
          <p className={block("status-text")}>
            Контрактная служба заказчика ещё не указана. По п. 2.1 Типового
            положения (регламента), утверждённого приказом Минфина России от
            31.07.2020 N 158н, контрактный управляющий или руководитель
            заказчика обязан указать, каким образом она создана. До этого
            план-график сформировать нельзя.
          </p>
          <button
            type="button"
            className={block("login-button")}
            onClick={() => navigate("/contract-service")}
          >
            Указать способ создания
          </button>
        </div>
      )}

      {Boolean(organizationId) && isLoading && (
        <p className={block("status")}>Загрузка планов-графиков...</p>
      )}

      {Boolean(organizationId) && isError && (
        <p className={block("status", ["error"])}>
          Не удалось загрузить планы-графики: {String(error)}
        </p>
      )}

      {Boolean(organizationId) &&
        !isLoading &&
        !isError &&
        allPlans.length === 0 && (
          <div className={block("panel")}>
            <p className={block("status")}>
              У вашей организации планов-графиков нет. Сформируйте первый
              план-график закупок или загрузите из ЕИС XML / CSV.
            </p>
          </div>
        )}

      {allPlans.length > 0 && (
        <div className={block("panel")}>
          <div className={block("toolbar")}>
            <input
              className={block("search")}
              type="search"
              placeholder="Поиск по номеру ПГ, ИКЗ, объекту закупки, ОКПД2, КБК…"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
            />
            <select
              className={block("filter-select")}
              aria-label="Фильтр по статусу ПГ"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Все статусы</option>
              {purchasePlanStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {availableYears.length > 1 && (
              <select
                className={block("filter-select")}
                aria-label="Фильтр по году планирования"
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Все годы</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} год
                  </option>
                ))}
              </select>
            )}
          </div>

          {filteredPlans.length === 0 ? (
            <p className={block("status")}>
              По заданным параметрам поиска планов-графиков не найдено.
            </p>
          ) : (
            <div
              className={
                openMenuPlanId
                  ? block("table-wrapper", ["open"])
                  : block("table-wrapper")
              }
            >
              <table className={block("table")}>
                <thead>
                  <tr>
                    <th>Реестровый номер ПГ</th>
                    <th>Заказчик</th>
                    <th>Период</th>
                    <th>Версия / Статус</th>
                    <th>Позиций</th>
                    <th className={block("th-amount")}>
                      Объём финансового обеспечения (₽)
                    </th>
                    <th>Утверждён / Размещён</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {pagePlans.map((plan, idx) => {
                    const firstYr =
                      plan.planPeriodFirstYear || Number(plan.planYear) + 1;
                    const secondYr =
                      plan.planPeriodSecondYear || Number(plan.planYear) + 2;
                    return (
                      <tr
                        key={String(plan.id)}
                        className={idx % 2 === 1 ? block("row-striped") : ""}
                      >
                        <td>
                          <button
                            className={block("number")}
                            type="button"
                            onClick={() =>
                              navigate(`/purchase-plans/${plan.id}`)
                            }
                          >
                            {plan.planNumber || "без номера"}
                          </button>
                          {plan.remarks && (
                            <span className={block("sub-note")}>
                              {plan.remarks}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={block("customer")}>
                            {plan.customer.shortName || plan.customer.fullName}
                          </span>
                          <span className={block("requisites")}>
                            ИНН {plan.customer.inn}
                            {plan.customer.kpp
                              ? ` / КПП ${plan.customer.kpp}`
                              : ""}
                            {plan.customer.regNum
                              ? ` · СПЗ ${plan.customer.regNum}`
                              : ""}
                          </span>
                        </td>
                        <td className={block("td-center")}>
                          <strong>{plan.planYear}</strong>
                          <span className={block("requisites")}>
                            {firstYr}–{secondYr}
                          </span>
                        </td>
                        <td>
                          <div className={block("status-col")}>
                            <span className={block("status-tag", [plan.status])}>
                              {purchasePlanStatusLabel(plan.status)}
                            </span>
                            <span className={block("requisites")}>
                              Версия № {plan.versionNumber || "1"}
                            </span>
                          </div>
                        </td>
                        <td className={block("td-center")}>
                          <button
                            type="button"
                            className={block("pos-link")}
                            onClick={() =>
                              navigate(
                                `/purchase-plans/${plan.id}?tab=positions`,
                              )
                            }
                          >
                            {plan.positions.length}
                          </button>
                        </td>
                        <td className={block("td-amount")}>
                          <strong>
                            {formatMoneyValue(planTotalAmount(plan))}
                          </strong>
                        </td>
                        <td>
                          <div className={block("dates-col")}>
                            <span>
                              Утв.:{" "}
                              {plan.approvalDate
                                ? formatDate(plan.approvalDate)
                                : "—"}
                            </span>
                            <span className={block("requisites")}>
                              ЕИС:{" "}
                              {plan.publishDate
                                ? formatDate(plan.publishDate)
                                : "не размещён"}
                            </span>
                          </div>
                        </td>
                        <td className={block("td-center")}>
                          <details
                            className={block("menu")}
                            data-plan-actions
                            open={openMenuPlanId === String(plan.id)}
                            onToggle={(event) =>
                              setOpenMenuPlanId(
                                event.currentTarget.open
                                  ? String(plan.id)
                                  : null,
                              )
                            }
                          >
                            <summary className={block("menu-trigger")}>
                              Действия
                            </summary>
                            <div className={block("menu-list")}>
                              <button
                                type="button"
                                className={block("menu-item")}
                                onClick={() => {
                                  setOpenMenuPlanId(null);
                                  navigate(`/purchase-plans/${plan.id}`);
                                }}
                              >
                                Карточка ПГ (Общая информация)
                              </button>
                              <button
                                type="button"
                                className={block("menu-item")}
                                onClick={() => {
                                  setOpenMenuPlanId(null);
                                  navigate(
                                    `/purchase-plans/${plan.id}?tab=positions`,
                                  );
                                }}
                              >
                                Позиции плана-графика ({plan.positions.length})
                              </button>
                              <button
                                type="button"
                                className={block("menu-item")}
                                onClick={() => {
                                  setOpenMenuPlanId(null);
                                  navigate(`/purchase-plans/${plan.id}/edit`);
                                }}
                              >
                                Изменить
                              </button>
                              <button
                                type="button"
                                className={block("menu-item")}
                                onClick={() => {
                                  setOpenMenuPlanId(null);
                                  setVersionsPlan(plan);
                                }}
                              >
                                История версий
                              </button>
                              <button
                                type="button"
                                className={block("menu-item", ["danger"])}
                                disabled={isDeleting}
                                onClick={() => {
                                  setOpenMenuPlanId(null);
                                  handleDelete(plan);
                                }}
                              >
                                Удалить
                              </button>
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredPlans.length > 0 && (
            <div className={block("pager")}>
              {totalPages > 1 ? (
                <div className={block("pager-controls")}>
                  <button
                    type="button"
                    className={block("pager__button")}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={safePage === 1}
                  >
                    ← Назад
                  </button>
                  <span className={block("pager__info")}>
                    {start + 1}–
                    {Math.min(start + pagePlans.length, filteredPlans.length)}{" "}
                    из {filteredPlans.length}
                  </span>
                  <button
                    type="button"
                    className={block("pager__button")}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={safePage === totalPages}
                  >
                    Вперёд →
                  </button>
                </div>
              ) : (
                <span className={block("pager__info")}>
                  Всего записей: {filteredPlans.length}
                </span>
              )}
              <PageSizePicker
                sizes={PAGE_SIZES}
                value={pageSize}
                onChange={(size) => {
                  setPageSize(size as PageSize);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}

      {isImportOpen && organization && (
        <PurchasePlanImportModal
          organization={organization}
          existingPlans={allPlans}
          onClose={() => setIsImportOpen(false)}
        />
      )}

      {versionsPlan && (
        <PurchasePlanVersionsModal
          plan={versionsPlan}
          onClose={() => setVersionsPlan(null)}
        />
      )}
    </section>
  );
}
