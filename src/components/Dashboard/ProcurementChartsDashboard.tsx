import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardAnalyticsData } from "../../services/Dashboard/dashboardAnalytics";
import styles from "./ProcurementChartsDashboard.module.scss";

interface ProcurementChartsDashboardProps {
  analytics: DashboardAnalyticsData;
  onYearChange: (year: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  signed: "#2563eb",
  in_execution: "#d97706",
  completed: "#16a34a",
  suspended: "#7c3aed",
  terminated: "#dc2626",
};

const formatMillionsAxis = (value: number) => {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} млн`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)} тыс`;
  }
  return String(value);
};

const formatRub = (value: number) =>
  `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₽`;

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
}

function MonthlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles["tooltip-title"]}>{label}</div>
      {payload.map((entry) => (
        <div className={styles["tooltip-row"]} key={entry.name}>
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <strong>{formatRub(Number(entry.value ?? 0))}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ProcurementChartsDashboard({
  analytics,
  onYearChange,
}: ProcurementChartsDashboardProps) {
  const { selectedYear, availableYears, monthlySeries, contractStatuses } =
    analytics;

  const hasMonthlyData = monthlySeries.some(
    (m) =>
      m.plannedAmount > 0 ||
      m.contractedAmount > 0 ||
      m.paidAmount > 0 ||
      m.scheduledAmount > 0,
  );

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>
            Аналитика объёмов закупок и статусов контрактов (Recharts)
          </h2>
          <p className={styles.subtitle}>
            Помесячная динамика плана-графика, заключённых контрактов и
            фактического кассового исполнения за {selectedYear} год.
          </p>
        </div>

        <div className={styles.controls}>
          <label htmlFor="dashboard-year-select" className={styles.subtitle}>
            Финансовый год:
          </label>
          <select
            id="dashboard-year-select"
            className={styles["year-select"]}
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles["chart-panel"]}>
          <h3 className={styles["panel-title"]}>
            Динамика объёма закупок и оплат по месяцам ({selectedYear})
          </h3>
          <p className={styles["panel-note"]}>
            Сравнение объёма запланированных закупок, цены заключённых
            контрактов и фактической оплаты по платёжным документам.
          </p>

          <div className={styles["chart-box"]}>
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlySeries}
                  margin={{ top: 10, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--border-strong)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatMillionsAxis}
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip content={<MonthlyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="plannedAmount"
                    name="План-график (лимит)"
                    fill="#3b82f6"
                    fillOpacity={0.14}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Bar
                    dataKey="contractedAmount"
                    name="Заключено контрактов"
                    fill="#16a34a"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    dataKey="paidAmount"
                    name="Оплачено фактически"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    dataKey="scheduledAmount"
                    name="К оплате по графику"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                    barSize={12}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className={styles["panel-note"]}>
                За {selectedYear} год пока нет записей плана-графика, контрактов
                или платежей. Выберите другой год выше.
              </p>
            )}
          </div>
        </div>

        <div className={styles["chart-panel"]}>
          <h3 className={styles["panel-title"]}>
            Распределение контрактов по статусам
          </h3>
          <p className={styles["panel-note"]}>
            Соотношение действующих, завершённых и проблемных контрактов
            реестра организации.
          </p>

          {contractStatuses.length === 0 ? (
            <p className={styles["panel-note"]}>
              В реестре контрактов организации пока нет записей.
            </p>
          ) : (
            <>
              <div className={styles["chart-box"]} style={{ height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contractStatuses}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={76}
                      paddingAngle={2}
                    >
                      {contractStatuses.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => formatRub(Number(val ?? 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ height: 90, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={contractStatuses}
                    layout="vertical"
                    margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={106}
                      tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: unknown) => `${val} шт.`}
                    />
                    <Bar dataKey="count" name="Контрактов" radius={[0, 4, 4, 0]}>
                      {contractStatuses.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? "#64748b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <table className={styles["status-table"]}>
                <thead>
                  <tr>
                    <th>Статус</th>
                    <th>Шт.</th>
                    <th>Сумма, ₽</th>
                    <th>Доля</th>
                  </tr>
                </thead>
                <tbody>
                  {contractStatuses.map((st) => (
                    <tr key={st.status}>
                      <td>{st.label}</td>
                      <td>{st.count}</td>
                      <td>{st.amount.toLocaleString("ru-RU")}</td>
                      <td>{st.sharePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
