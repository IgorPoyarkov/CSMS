import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  planTotalAmount,
  purchasePlanStatusLabel,
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
  // Пока способ создания контрактной службы не указан (п. 2.1 приказа
  // Минфина России от 31.07.2020 N 158н), план-график не формируется
  const { data: contractService, isLoading: isContractServiceLoading } =
    useContractService(organizationId);
  const needsContractService =
    Boolean(organizationId) && !isContractServiceLoading && !contractService;
  const navigate = useNavigate();
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "purchase-plan-list");

  // Поиск по ИКЗ / ОКПД2 / КБК внутри записей ПГ
  const [searchQuery, setSearchQuery] = useState("");
  // Пагинация
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

  // Сортировка по убыванию: от последнего (самого свежего) к первому
  const sortedPlans = useMemo(
    () =>
      [...allPlans].sort((a, b) => {
        const idA = typeof a.id === "number" ? a.id : 0;
        const idB = typeof b.id === "number" ? b.id : 0;
        return idB - idA;
      }),
    [allPlans],
  );

  // Поиск: план остаётся, если хоть одна позиция содержит подстроку в ИКЗ, ОКПД2 или КБК
  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedPlans;
    return sortedPlans.filter((plan) =>
      plan.positions.some((pos) => {
        const ikz = (pos.identificationCode || "").toLowerCase();
        const okpd2 = (pos.okpd2Code || "").toLowerCase();
        const kbk = (pos.kbk || "").toLowerCase();
        return ikz.includes(q) || okpd2.includes(q) || kbk.includes(q);
      }),
    );
  }, [sortedPlans, searchQuery]);

  const overallAmount = filteredPlans.reduce(
    (total, plan) => total + planTotalAmount(plan),
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
      <nav className={block("breadcrumbs")} aria-label="Навигация">
        <span className={block("crumb-current")}>
          Реестр планов-графиков закупок (44-ФЗ)
        </span>
      </nav>

      <header className={block("header")}>
        <div className={block("header-info")}>
          <h1 className={block("title")}>Планы-графики закупок (44-ФЗ)</h1>
          <p className={block("summary")}>
            Показано: <strong>{filteredPlans.length}</strong>
            {filteredPlans.length !== allPlans.length
              ? ` из ${allPlans.length}`
              : ""}{" "}
            · Совокупный объём:{" "}
            <strong className={block("num")}>
              {formatMoney(overallAmount)}
            </strong>
          </p>
          <p className={block("current-organization")}>
            {organization
              ? `${organization.shortName || organization.fullName} (ИНН ${organization.inn}${organization.kpp ? `, КПП ${organization.kpp}` : ""})`
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
            Сформировать план-график
          </button>
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
        filteredPlans.length === 0 &&
        allPlans.length === 0 && (
          <p className={block("status")}>
            У вашей организации планов-графиков нет. Создайте первый план-график
            закупок.
          </p>
        )}

      {Boolean(organizationId) &&
        !isLoading &&
        !isError &&
        filteredPlans.length === 0 &&
        allPlans.length > 0 && (
          <p className={block("status")}>
            По запросу «{searchQuery}» планов-графиков не найдено.
          </p>
        )}

      {filteredPlans.length > 0 && (
        <div className={block("registry-panel")}>
          <div className={block("toolbar")}>
            <input
              className={block("search")}
              type="search"
              placeholder="Поиск по ИКЗ, ОКПД2, КБК…"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>

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
                  <th>Номер плана-графика</th>
                  <th>Заказчик</th>
                  <th>Период</th>
                  <th>Статус</th>
                  <th>Записей ПГ</th>
                  <th>Совокупный объём</th>
                  <th>Утверждён</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {pagePlans.map((plan) => (
                  <tr key={String(plan.id)}>
                    <td>
                      <button
                        className={block("number")}
                        type="button"
                        onClick={() => navigate(`/purchase-plans/${plan.id}`)}
                      >
                        {plan.planNumber || "без номера"}
                      </button>
                    </td>
                    <td>
                      <span className={block("customer")}>
                        {plan.customer.shortName || plan.customer.fullName}
                      </span>
                      <span className={block("requisites")}>
                        ИНН {plan.customer.inn}
                        {plan.customer.kpp ? ` / КПП ${plan.customer.kpp}` : ""}
                      </span>
                    </td>
                    <td className={block("num")}>{plan.planYear}</td>
                    <td>
                      <span className={block("status-tag", [plan.status])}>
                        {purchasePlanStatusLabel(plan.status)}
                      </span>
                    </td>
                    <td className={block("num")}>{plan.positions.length}</td>
                    <td className={block("num")}>
                      {formatMoney(planTotalAmount(plan))}
                    </td>
                    <td className={block("num")}>
                      {formatDate(plan.approvalDate)}
                    </td>
                    <td>
                      <details
                        className={block("menu")}
                        data-plan-actions
                        open={openMenuPlanId === String(plan.id)}
                        onToggle={(event) =>
                          setOpenMenuPlanId(
                            event.currentTarget.open ? String(plan.id) : null,
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
                            Открыть
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
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={block("pager")}>
              <div className={block("pager-controls")}>
                <button
                  type="button"
                  className={block("pager__button")}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                >
                  Назад
                </button>
                <span className={block("pager__info")}>
                  {start + 1}–
                  {Math.min(start + pagePlans.length, filteredPlans.length)} из{" "}
                  {filteredPlans.length}
                </span>
                <button
                  type="button"
                  className={block("pager__button")}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={safePage === totalPages}
                >
                  Вперёд
                </button>
              </div>
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
