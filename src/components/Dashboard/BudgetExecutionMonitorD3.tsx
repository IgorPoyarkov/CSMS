import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as d3 from "d3";
import type {
  BudgetContractItem,
  DashboardAnalyticsData,
} from "../../services/Dashboard/dashboardAnalytics";
import styles from "./BudgetExecutionMonitorD3.module.scss";

interface BudgetExecutionMonitorD3Props {
  analytics: DashboardAnalyticsData;
}

type MonitorMode = "contracts" | "years";

interface HoverState {
  x: number;
  y: number;
  title: string;
  lines: { label: string; value: string; color?: string }[];
}

const formatRub = (v: number) =>
  `${v.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₽`;

const formatCompact = (v: number) => {
  if (v === 0) return "0";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} млн`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} тыс`;
  return String(Math.round(v));
};

export default function BudgetExecutionMonitorD3({
  analytics,
}: BudgetExecutionMonitorD3Props) {
  const [mode, setMode] = useState<MonitorMode>("contracts");
  const [selectedContract, setSelectedContract] =
    useState<BudgetContractItem | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [containerWidth, setContainerWidth] = useState(840);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { budgetContracts, budgetByYear, kpis } = analytics;

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const updateWidth = () => {
      const next = Math.max(320, Math.floor(node.clientWidth - 24));
      setContainerWidth(next);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svgNode = svgRef.current;
    if (!svgNode) return;

    const svg = d3.select(svgNode);
    svg.selectAll("*").remove();

    if (mode === "contracts") {
      if (budgetContracts.length === 0) return;

      const margin = { top: 14, right: 80, bottom: 30, left: 165 };
      const innerWidth = Math.max(200, containerWidth - margin.left - margin.right);
      const rowHeight = 52;
      const innerHeight = budgetContracts.length * rowHeight;
      const totalHeight = innerHeight + margin.top + margin.bottom;

      svg.attr("viewBox", `0 0 ${containerWidth} ${totalHeight}`).attr("height", totalHeight);

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const maxVal =
        d3.max(budgetContracts, (d) =>
          Math.max(d.plannedNmck, d.contractPrice, d.paidAmount + d.scheduledAmount),
        ) ?? 1;

      const x = d3.scaleLinear().domain([0, maxVal * 1.06]).nice().range([0, innerWidth]);
      const y = d3
        .scaleBand<string>()
        .domain(budgetContracts.map((d) => d.contractId))
        .range([0, innerHeight])
        .padding(0.28);

      // Вертикальная сетка
      g.append("g")
        .attr("class", "grid")
        .call(
          d3
            .axisBottom(x)
            .ticks(5)
            .tickSize(innerHeight)
            .tickFormat(() => ""),
        )
        .call((axis) => {
          axis.select(".domain").remove();
          axis
            .selectAll("line")
            .attr("stroke", "var(--border)")
            .attr("stroke-dasharray", "3,3");
        });

      // Ось X
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(5)
            .tickFormat((d) => formatCompact(Number(d))),
        )
        .call((axis) => {
          axis.select(".domain").attr("stroke", "var(--border-strong)");
          axis
            .selectAll("text")
            .attr("fill", "var(--text-secondary)")
            .attr("font-size", 11);
        });

      // Ось Y (номера контрактов)
      const labelById = new Map(
        budgetContracts.map((c) => [c.contractId, c.contractNumber]),
      );
      g.append("g")
        .call(
          d3
            .axisLeft(y)
            .tickFormat((id) => labelById.get(id) ?? id)
            .tickSize(0),
        )
        .call((axis) => {
          axis.select(".domain").remove();
          axis
            .selectAll("text")
            .attr("fill", "var(--text-primary)")
            .attr("font-size", 11)
            .attr("font-weight", 600);
        });

      const rows = g
        .selectAll<SVGGElement, BudgetContractItem>(".budget-row")
        .data(budgetContracts)
        .enter()
        .append("g")
        .attr("class", "budget-row")
        .style("cursor", "pointer")
        .on("mouseenter", function (event, d) {
          d3.select(this).select(".row-bg").attr("fill-opacity", 0.12);
          setHover({
            x: event.clientX,
            y: event.clientY,
            title: `Контракт № ${d.contractNumber}`,
            lines: [
              { label: "Статус", value: d.statusLabel },
              { label: "План (НМЦК)", value: formatRub(d.plannedNmck), color: "#94a3b8" },
              { label: "Цена контракта", value: formatRub(d.contractPrice), color: "#3b82f6" },
              { label: "Оплачено", value: formatRub(d.paidAmount), color: "#16a34a" },
              { label: "В графике", value: formatRub(d.scheduledAmount), color: "#d97706" },
              { label: "Исполнение", value: `${d.executionPercent}%` },
            ],
          });
        })
        .on("mousemove", (event) => {
          setHover((prev) =>
            prev ? { ...prev, x: event.clientX, y: event.clientY } : null,
          );
        })
        .on("mouseleave", function () {
          d3.select(this).select(".row-bg").attr("fill-opacity", 0);
          setHover(null);
        })
        .on("click", (_, d) => {
          setSelectedContract((prev) =>
            prev?.contractId === d.contractId ? null : d,
          );
        });

      const bw = y.bandwidth();

      rows
        .append("rect")
        .attr("class", "row-bg")
        .attr("x", 0)
        .attr("y", (d) => (y(d.contractId) ?? 0) - 4)
        .attr("width", innerWidth)
        .attr("height", bw + 8)
        .attr("rx", 6)
        .attr("fill", "var(--accent)")
        .attr("fill-opacity", 0);

      // 1. Фон планового лимита (НМЦК)
      rows
        .append("rect")
        .attr("x", 0)
        .attr("y", (d) => y(d.contractId) ?? 0)
        .attr("width", (d) => Math.max(2, x(d.plannedNmck)))
        .attr("height", bw * 0.44)
        .attr("rx", 4)
        .attr("fill", "#94a3b8")
        .attr("fill-opacity", 0.35);

      // 2. Цена заключённого контракта
      rows
        .append("rect")
        .attr("x", 0)
        .attr("y", (d) => (y(d.contractId) ?? 0) + bw * 0.14)
        .attr("width", (d) => Math.max(2, x(d.contractPrice)))
        .attr("height", bw * 0.38)
        .attr("rx", 4)
        .attr("fill", "#3b82f6")
        .attr("fill-opacity", 0.85);

      // 3. Фактически оплачено
      rows
        .append("rect")
        .attr("x", 0)
        .attr("y", (d) => (y(d.contractId) ?? 0) + bw * 0.58)
        .attr("width", 0)
        .attr("height", bw * 0.38)
        .attr("rx", 4)
        .attr("fill", "#16a34a")
        .transition()
        .duration(450)
        .attr("width", (d) => Math.max(0, x(d.paidAmount)));

      // 4. Запланированные платежи (поверх оплаченного)
      rows
        .append("rect")
        .attr("x", (d) => x(d.paidAmount))
        .attr("y", (d) => (y(d.contractId) ?? 0) + bw * 0.58)
        .attr("width", (d) => Math.max(0, x(d.scheduledAmount)))
        .attr("height", bw * 0.38)
        .attr("rx", 3)
        .attr("fill", "#d97706")
        .attr("fill-opacity", 0.85);

      // Подпись процента исполнения справа
      rows
        .append("text")
        .attr(
          "x",
          (d) =>
            Math.max(
              x(d.plannedNmck),
              x(d.contractPrice),
              x(d.paidAmount + d.scheduledAmount),
            ) + 8,
        )
        .attr("y", (d) => (y(d.contractId) ?? 0) + bw * 0.65)
        .attr("fill", "var(--text-primary)")
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .text((d) => `${d.executionPercent}%`);

      return;
    }

    // Режим «По годам финансирования» (Grouped Bar Chart в D3)
    if (budgetByYear.length === 0) return;

    const margin = { top: 18, right: 20, bottom: 34, left: 70 };
    const innerWidth = Math.max(220, containerWidth - margin.left - margin.right);
    const innerHeight = 250;
    const totalHeight = innerHeight + margin.top + margin.bottom;

    svg.attr("viewBox", `0 0 ${containerWidth} ${totalHeight}`).attr("height", totalHeight);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const seriesKeys = [
      { key: "plannedAmount" as const, label: "План-график", color: "#3b82f6" },
      { key: "contractedAmount" as const, label: "Законтрактовано", color: "#0d9488" },
      { key: "paidAmount" as const, label: "Фактически оплачено", color: "#16a34a" },
    ];

    const x0 = d3
      .scaleBand<string>()
      .domain(budgetByYear.map((b) => b.yearLabel))
      .range([0, innerWidth])
      .padding(0.25);

    const x1 = d3
      .scaleBand<string>()
      .domain(seriesKeys.map((s) => s.key))
      .range([0, x0.bandwidth()])
      .padding(0.1);

    const maxY =
      d3.max(budgetByYear, (b) =>
        Math.max(b.plannedAmount, b.contractedAmount, b.paidAmount),
      ) ?? 1;

    const y = d3.scaleLinear().domain([0, maxY * 1.1]).nice().range([innerHeight, 0]);

    g.append("g")
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => ""),
      )
      .call((axis) => {
        axis.select(".domain").remove();
        axis
          .selectAll("line")
          .attr("stroke", "var(--border)")
          .attr("stroke-dasharray", "3,3");
      });

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0))
      .call((axis) => {
        axis.select(".domain").attr("stroke", "var(--border-strong)");
        axis
          .selectAll("text")
          .attr("fill", "var(--text-primary)")
          .attr("font-size", 12)
          .attr("font-weight", 600);
      });

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatCompact(Number(d))))
      .call((axis) => {
        axis.select(".domain").remove();
        axis
          .selectAll("text")
          .attr("fill", "var(--text-secondary)")
          .attr("font-size", 11);
      });

    const groups = g
      .selectAll(".year-group")
      .data(budgetByYear)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${x0(d.yearLabel) ?? 0},0)`);

    groups
      .selectAll("rect")
      .data((d) =>
        seriesKeys.map((s) => ({
          yearLabel: d.yearLabel,
          key: s.key,
          label: s.label,
          color: s.color,
          value: d[s.key],
          bucket: d,
        })),
      )
      .enter()
      .append("rect")
      .attr("x", (d) => x1(d.key) ?? 0)
      .attr("width", x1.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .attr("rx", 4)
      .attr("fill", (d) => d.color)
      .on("mouseenter", (event, d) => {
        setHover({
          x: event.clientX,
          y: event.clientY,
          title: `${d.yearLabel} год — ${d.label}`,
          lines: [
            { label: "План-график", value: formatRub(d.bucket.plannedAmount), color: "#3b82f6" },
            { label: "Законтрактовано", value: formatRub(d.bucket.contractedAmount), color: "#0d9488" },
            { label: "Фактически оплачено", value: formatRub(d.bucket.paidAmount), color: "#16a34a" },
          ],
        });
      })
      .on("mousemove", (event) => {
        setHover((prev) =>
          prev ? { ...prev, x: event.clientX, y: event.clientY } : null,
        );
      })
      .on("mouseleave", () => setHover(null))
      .transition()
      .duration(450)
      .attr("y", (d) => y(d.value))
      .attr("height", (d) => Math.max(0, innerHeight - y(d.value)));
  }, [mode, budgetContracts, budgetByYear, containerWidth]);

  return (
    <div className={styles.monitor}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>
            Монитор исполнения бюджета (D3.js — План / Контракты / Факт)
          </h2>
          <p className={styles.subtitle}>
            Интерактивное сопоставление плановых лимитов (НМЦК и ПГ), цены
            заключённых контрактов и кассовых выплат. Наведите на полосы или
            нажмите на контракт для детализации.
          </p>
        </div>

        <div className={styles["mode-switch"]} role="tablist">
          <button
            type="button"
            className={`${styles["mode-btn"]} ${
              mode === "contracts" ? styles["mode-btn--active"] : ""
            }`}
            onClick={() => setMode("contracts")}
          >
            По контрактам ({budgetContracts.length})
          </button>
          <button
            type="button"
            className={`${styles["mode-btn"]} ${
              mode === "years" ? styles["mode-btn--active"] : ""
            }`}
            onClick={() => setMode("years")}
          >
            По годам финансирования
          </button>
        </div>
      </div>

      <div className={styles["kpi-strip"]}>
        <div className={styles["kpi-box"]}>
          <span className={styles["kpi-label"]}>План-график (всего)</span>
          <span className={styles["kpi-value"]}>
            {formatRub(kpis.totalPlannedPG)}
          </span>
        </div>
        <div className={styles["kpi-box"]}>
          <span className={styles["kpi-label"]}>Законтрактовано</span>
          <span className={styles["kpi-value"]}>
            {formatRub(kpis.totalContracted)}
          </span>
        </div>
        <div className={styles["kpi-box"]}>
          <span className={styles["kpi-label"]}>Оплачено фактически</span>
          <span
            className={`${styles["kpi-value"]} ${styles["kpi-value--success"]}`}
          >
            {formatRub(kpis.totalPaid)} ({kpis.executionPercent}%)
          </span>
        </div>
        <div className={styles["kpi-box"]}>
          <span className={styles["kpi-label"]}>В графике к оплате</span>
          <span className={styles["kpi-value"]}>
            {formatRub(kpis.totalScheduled)}
          </span>
        </div>
        <div className={styles["kpi-box"]}>
          <span className={styles["kpi-label"]}>Экономия от НМЦК</span>
          <span className={styles["kpi-value"]}>
            {formatRub(kpis.savingsAmount)}
          </span>
        </div>
        <div className={styles["kpi-box"]}>
          <span className={styles["kpi-label"]}>Начислено неустоек</span>
          <span
            className={`${styles["kpi-value"]} ${
              kpis.totalPenalties > 0 ? styles["kpi-value--danger"] : ""
            }`}
          >
            {formatRub(kpis.totalPenalties)}
          </span>
        </div>
      </div>

      <div className={styles.legend}>
        {mode === "contracts" ? (
          <>
            <span className={styles["legend-item"]}>
              <span
                className={styles["legend-swatch"]}
                style={{ background: "rgba(148,163,184,0.45)" }}
              />
              Плановая НМЦК
            </span>
            <span className={styles["legend-item"]}>
              <span
                className={styles["legend-swatch"]}
                style={{ background: "#3b82f6" }}
              />
              Цена контракта
            </span>
            <span className={styles["legend-item"]}>
              <span
                className={styles["legend-swatch"]}
                style={{ background: "#16a34a" }}
              />
              Оплачено фактически
            </span>
            <span className={styles["legend-item"]}>
              <span
                className={styles["legend-swatch"]}
                style={{ background: "#d97706" }}
              />
              Запланировано к оплате
            </span>
          </>
        ) : (
          <>
            <span className={styles["legend-item"]}>
              <span
                className={styles["legend-swatch"]}
                style={{ background: "#3b82f6" }}
              />
              План-график
            </span>
            <span className={styles["legend-item"]}>
              <span
                className={styles["legend-swatch"]}
                style={{ background: "#0d9488" }}
              />
              Законтрактовано
            </span>
            <span className={styles["legend-item"]}>
              <span
                className={styles["legend-swatch"]}
                style={{ background: "#16a34a" }}
              />
              Оплачено фактически
            </span>
          </>
        )}
      </div>

      <div ref={wrapRef} className={styles["chart-wrap"]}>
        {(mode === "contracts" && budgetContracts.length === 0) ||
        (mode === "years" && budgetByYear.length === 0) ? (
          <div className={styles.empty}>
            Нет данных по контрактам и планам-графикам для визуализации бюджета.
          </div>
        ) : (
          <svg ref={svgRef} className={styles.svg} />
        )}
      </div>

      {selectedContract && (
        <div className={styles.inspector}>
          <div>
            <strong>
              Контракт № {selectedContract.contractNumber} —{" "}
              {selectedContract.contractName}
            </strong>
            <div className={styles.subtitle}>
              Поставщик: {selectedContract.supplierName} · Статус:{" "}
              {selectedContract.statusLabel} · Этапов завершено:{" "}
              {selectedContract.completedStagesCount} из{" "}
              {selectedContract.stagesCount}
            </div>
            <div className={styles["inspector-metrics"]}>
              <span>Цена: {formatRub(selectedContract.contractPrice)}</span>
              <span>Оплачено: {formatRub(selectedContract.paidAmount)}</span>
              <span>
                Остаток к оплате: {formatRub(selectedContract.remainingToPay)}
              </span>
              {selectedContract.penaltiesAmount > 0 && (
                <span>
                  Неустойки: {formatRub(selectedContract.penaltiesAmount)}
                </span>
              )}
            </div>
          </div>
          <Link className={styles["inspector-link"]} to="/contract-registry">
            Открыть в реестре контрактов →
          </Link>
        </div>
      )}

      {hover && (
        <div
          className={styles.tooltip}
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{hover.title}</div>
          {hover.lines.map((line) => (
            <div
              key={line.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span style={{ color: line.color ?? "var(--text-secondary)" }}>
                {line.label}:
              </span>
              <strong>{line.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
