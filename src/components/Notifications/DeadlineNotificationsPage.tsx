import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  useAllContractPayments,
  useAllContractStages,
  useContractRegistry,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useOrganizationContractProjects } from "../../services/ContractProject/contractProject.api";
import { useGetProcurements } from "../../services/Procurements/procurement.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import { useOrganizationTasks } from "../../services/Tasks/tasks.api";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import {
  buildProcurementNotifications,
  summarizeNotifications,
  type NotificationCategory,
  type NotificationSeverity,
} from "../../services/Notifications/deadlineNotifications";
import {
  useAcknowledgeNotification,
  useNotificationStates,
  useRestoreNotification,
} from "../../services/Notifications/notifications.api";
import styles from "./DeadlineNotificationsPage.module.scss";
import Select from "../UI/Select";

const SEVERITY_LABELS: Record<NotificationSeverity, string> = {
  critical: "Критично / Просрочка",
  warning: "Срочно (≤ 10 дн.)",
  info: "Плановый контроль",
};

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  contract: "Контракты (ст. 103)",
  stage: "Этапы исполнения",
  payment: "Платежи (ч. 13.1 ст. 34)",
  procurement: "Закупки и проекты (ст. 51)",
  task: "Задачи КС (№ 158н)",
};

export default function DeadlineNotificationsPage() {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "page");
  const card = bem(styles, "card");

  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [severityFilter, setSeverityFilter] = useState<
    NotificationSeverity | "all"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<
    NotificationCategory | "all"
  >("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const { data: user } = useFetchCurrentUser();
  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;

  const { data: contracts = [] } = useContractRegistry(orgId);
  const { data: allStages = [] } = useAllContractStages(Boolean(orgId));
  const { data: allPayments = [] } = useAllContractPayments(Boolean(orgId));
  const { data: contractProjects = [] } = useOrganizationContractProjects(orgId);
  const { data: plans = [] } = usePurchasePlans(orgId);
  const { data: procurements = [] } = useGetProcurements();
  const { data: tasks = [] } = useOrganizationTasks(orgId);
  const { data: ackStates = [] } = useNotificationStates(orgId);

  const acknowledgeMut = useAcknowledgeNotification();
  const restoreMut = useRestoreNotification();

  const orgProcurements = useMemo(() => {
    const planIkz = new Set(
      plans.flatMap((p) => (p.positions ?? []).map((pos) => pos.identificationCode)),
    );
    const linkedProcIds = new Set(
      [
        ...contractProjects.map((p) => String(p.procurementId ?? "")),
        ...contracts.map((c) => String(c.procurementId ?? "")),
      ].filter(Boolean),
    );
    return procurements.filter(
      (p) => planIkz.has(p.ikz) || linkedProcIds.has(String(p.id)),
    );
  }, [plans, procurements, contractProjects, contracts]);

  const allAlerts = useMemo(
    () =>
      buildProcurementNotifications({
        todayIso,
        contracts,
        stages: allStages,
        payments: allPayments,
        contractProjects,
        procurements: orgProcurements,
        tasks,
      }),
    [
      todayIso,
      contracts,
      allStages,
      allPayments,
      contractProjects,
      orgProcurements,
      tasks,
    ],
  );

  const ackMap = useMemo(() => {
    const map = new Map<string, (typeof ackStates)[number]>();
    ackStates.forEach((s) => map.set(s.notificationKey, s));
    return map;
  }, [ackStates]);

  const activeAlerts = useMemo(
    () => allAlerts.filter((a) => !ackMap.has(a.id)),
    [allAlerts, ackMap],
  );

  const stats = useMemo(
    () => summarizeNotifications(activeAlerts),
    [activeAlerts],
  );

  const visibleAlerts = useMemo(
    () =>
      allAlerts.filter((item) => {
        if (!showAcknowledged && ackMap.has(item.id)) return false;
        if (severityFilter !== "all" && item.severity !== severityFilter) {
          return false;
        }
        if (categoryFilter !== "all" && item.category !== categoryFilter) {
          return false;
        }
        return true;
      }),
    [allAlerts, ackMap, showAcknowledged, severityFilter, categoryFilter],
  );

  const formatDaysLabel = (days: number | null) => {
    if (days === null) return "Без точной даты";
    if (days < 0) return `Просрочено на ${Math.abs(days)} дн.`;
    if (days === 0) return "Истекает сегодня";
    return `Осталось ${days} дн.`;
  };

  return (
    <section className={block()}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Уведомления о сроках и предотвращение санкций 44-ФЗ
          </h1>
          <p className={styles.subtitle}>
            Автоматический мониторинг контрактов, этапов, платежей (ч. 13.1 ст.
            34), ЕИС (ч. 3 ст. 103), проектов контрактов и задач КС на {formatDate(todayIso)}.
          </p>
        </div>
      </header>

      <div className={styles["kpi-grid"]}>
        <div className={styles["kpi-card"]}>
          <span className={styles["kpi-label"]}>Активных предупреждений</span>
          <span className={styles["kpi-value"]}>{stats.total}</span>
        </div>
        <div className={styles["kpi-card"]}>
          <span className={styles["kpi-label"]}>Критических / Просрочка</span>
          <span
            className={`${styles["kpi-value"]} ${styles["kpi-value--critical"]}`}
          >
            {stats.critical}
          </span>
        </div>
        <div className={styles["kpi-card"]}>
          <span className={styles["kpi-label"]}>Срочных (до 10 дней)</span>
          <span
            className={`${styles["kpi-value"]} ${styles["kpi-value--warning"]}`}
          >
            {stats.warning}
          </span>
        </div>
        <div className={styles["kpi-card"]}>
          <span className={styles["kpi-label"]}>Подтверждено / В работе</span>
          <span className={`${styles["kpi-value"]} ${styles["kpi-value--info"]}`}>
            {ackStates.length}
          </span>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles["filter-group"]}>
          <button
            type="button"
            className={`${styles["filter-btn"]} ${
              severityFilter === "all" ? styles["filter-btn--active"] : ""
            }`}
            onClick={() => setSeverityFilter("all")}
          >
            Все уровни
          </button>
          {(["critical", "warning", "info"] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              className={`${styles["filter-btn"]} ${
                severityFilter === sev ? styles["filter-btn--active"] : ""
              }`}
              onClick={() => setSeverityFilter(sev)}
            >
              {SEVERITY_LABELS[sev]}
            </button>
          ))}
        </div>

        <div className={styles["filter-group"]}>
          <Select
            className={styles["filter-btn"]}
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as NotificationCategory | "all")
            }
            aria-label="Фильтр по разделу"
          >
            <option value="all">Все разделы</option>
            {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map(
              (cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ),
            )}
          </Select>

          <label className={styles["toggle-label"]}>
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
            />
            Показывать подтверждённые ({ackStates.length})
          </label>
        </div>
      </div>

      {visibleAlerts.length === 0 ? (
        <div className={styles.empty}>
          По выбранным фильтрам активных предупреждений о нарушении сроков 44-ФЗ
          не найдено.
        </div>
      ) : (
        <div className={styles.list}>
          {visibleAlerts.map((alert) => {
            const ack = ackMap.get(alert.id);
            return (
              <article
                key={alert.id}
                className={card(undefined, ack ? ["acknowledged"] : [])}
              >
                <div className={styles["card-top"]}>
                  <div className={styles["card-meta"]}>
                    <span
                      className={`${styles.severity} ${
                        styles[`severity--${alert.severity}`]
                      }`}
                    >
                      {SEVERITY_LABELS[alert.severity]}
                    </span>
                    <span>{CATEGORY_LABELS[alert.category]}</span>
                    {alert.entityNumber && <span>№ {alert.entityNumber}</span>}
                  </div>
                  <span className={styles["due-tag"]}>
                    {alert.dueDate ? `${formatDate(alert.dueDate)} · ` : ""}
                    {formatDaysLabel(alert.daysRemaining)}
                  </span>
                </div>

                <h2 className={styles["card-title"]}>{alert.title}</h2>
                <p className={styles["card-desc"]}>{alert.description}</p>

                <div className={styles["card-legal"]}>
                  <div>
                    <span className={styles["legal-label"]}>
                      Риск санкций (44-ФЗ / КоАП РФ)
                    </span>
                    <span>{alert.penaltyRisk44Fz}</span>
                  </div>
                  <div>
                    <span className={styles["legal-label"]}>
                      Рекомендуемое действие
                    </span>
                    <span>{alert.recommendation}</span>
                  </div>
                </div>

                <div className={styles["card-actions"]}>
                  <Link className={styles["link-btn"]} to={alert.linkTo}>
                    Перейти к объекту →
                  </Link>
                  {orgId &&
                    (ack ? (
                      <button
                        type="button"
                        className={styles["ack-btn"]}
                        disabled={restoreMut.isPending}
                        onClick={() =>
                          ack.id !== undefined && restoreMut.mutate(ack.id)
                        }
                      >
                        Вернуть в активные
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles["ack-btn"]}
                        disabled={acknowledgeMut.isPending}
                        onClick={() =>
                          acknowledgeMut.mutate({
                            organizationId: orgId,
                            notificationKey: alert.id,
                            acknowledgedAt: todayIso,
                            acknowledgedBy: user?.email ?? "Специалист КС",
                          })
                        }
                      >
                        Взято в работу / Подтвердить
                      </button>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
