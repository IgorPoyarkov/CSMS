import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import {
  useAllContractPayments,
  useAllContractPenalties,
  useAllContractStages,
  useContractRegistry,
} from "../../services/ContractRegistry/contractRegistry.api";
import { buildDashboardAnalytics } from "../../services/Dashboard/dashboardAnalytics";
import ProcurementChartsDashboard from "../../components/Dashboard/ProcurementChartsDashboard";
import BudgetExecutionMonitorD3 from "../../components/Dashboard/BudgetExecutionMonitorD3";
import useUtils from "../../hooks/useUtils";
import styles from "./AnalyticsPage.module.scss";

/**
 * Аналитика вынесена с главной на отдельный ленивый маршрут.
 *
 * Recharts и D3 весят больше остального интерфейса, а на рабочем столе нужны
 * только счётчики и быстрые переходы. Поэтому главная не импортирует графики
 * вовсе, а этот экран грузится по требованию (React.lazy в App.tsx).
 */
const AnalyticsPage = () => {
  const { bem } = useUtils();
  const page = bem(styles, "analytics");
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );

  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;
  const { data: plans } = usePurchasePlans(orgId);
  const { data: registryContracts } = useContractRegistry(orgId);
  const { data: stages = [] } = useAllContractStages(Boolean(orgId));
  const { data: payments = [] } = useAllContractPayments(Boolean(orgId));
  const { data: penalties = [] } = useAllContractPenalties(Boolean(orgId));

  const analytics = useMemo(
    () =>
      buildDashboardAnalytics({
        plans: plans ?? [],
        contracts: registryContracts ?? [],
        stages,
        payments,
        penalties,
        selectedYear,
      }),
    [plans, registryContracts, stages, payments, penalties, selectedYear],
  );

  return (
    <main className={page()}>
      <header className={page("head")}>
        <div className={page("head-main")}>
          <Link className={page("back")} to="/">
            ← На главную
          </Link>
          <h1 className={page("title")}>Аналитика закупок</h1>
          <p className={page("subtitle")}>
            Помесячная динамика плана-графика, контрактов и оплат, а также
            монитор исполнения бюджета «план / контракты / факт». Тяжёлые
            графики живут на отдельном экране, поэтому рабочий стол заказчика
            открывается без ожидания Recharts и D3.
          </p>
        </div>
      </header>

      {orgId ? (
        <>
          <section className={page("card")}>
            <ProcurementChartsDashboard
              analytics={analytics}
              onYearChange={setSelectedYear}
            />
          </section>

          <section className={page("card")}>
            <BudgetExecutionMonitorD3 analytics={analytics} />
          </section>
        </>
      ) : (
        <section className={page("empty")}>
          <p className={page("empty-title")}>Организация не определена</p>
          <p className={page("empty-text")}>
            Аналитика считается по данным заказчика. Войдите учётной записью,
            привязанной к организации, чтобы увидеть графики.
          </p>
          <Link className={page("empty-link")} to="/account/login">
            Войти
          </Link>
        </section>
      )}
    </main>
  );
};

export default AnalyticsPage;
