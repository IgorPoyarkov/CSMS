import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import {
  currentPurchasePlanPath,
  findCurrentPurchasePlan,
} from "../../services/PurchasePlan/purchasePlanCurrent";
import { useGetProcurements } from "../../services/Procurements/procurement.api";
import { useOrganizationContractProjects } from "../../services/ContractProject/contractProject.api";
import {
  useAllContractPayments,
  useAllContractStages,
  useContractRegistry,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useContractService } from "../../services/ContractService/contractService.api";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { filterVisiblePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.schema";
import { useOrganizationTasks } from "../../services/Tasks/tasks.api";
import { useNotificationStates } from "../../services/Notifications/notifications.api";
import {
  buildProcurementNotifications,
  summarizeNotifications,
} from "../../services/Notifications/deadlineNotifications";
import useUtils from "../../hooks/useUtils";
import styles from "./Main.module.scss";

const budgetLevelLabels: Record<string, string> = {
  federal: "Федеральный бюджет",
  regional: "Региональный бюджет",
  municipal: "Местный бюджет",
};

interface StatItem {
  label: string;
  hint: string;
  value: number;
  to: string;
  tone?: "ok" | "warning" | "danger";
}

interface SectionLink {
  to: string;
  title: string;
  hint: string;
}

interface SectionGroup {
  title: string;
  links: SectionLink[];
}

const Main = () => {
  const { bem } = useUtils();
  const main = bem(styles, "main");
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;
  // П. 2.1 приказа Минфина России от 31.07.2020 N 158н: способ создания
  // контрактной службы указывается при первом входе и обязателен для заказчика
  const { data: contractService, isLoading: isContractServiceLoading } =
    useContractService(orgId);
  const needsContractService =
    Boolean(orgId) && !isContractServiceLoading && !contractService;

  const { data: plans } = usePurchasePlans(orgId);
  const { data: procurements } = useGetProcurements();
  const { data: contractProjects } = useOrganizationContractProjects(orgId);
  const { data: registryContracts } = useContractRegistry(orgId);
  const { data: purchaseNotes } = usePurchaseNotes(orgId);
  const { data: allStages = [] } = useAllContractStages(Boolean(orgId));
  const { data: allPayments = [] } = useAllContractPayments(Boolean(orgId));
  const { data: orgTasks = [] } = useOrganizationTasks(orgId);
  const { data: ackStates = [] } = useNotificationStates(orgId);

  const visiblePurchaseNotes = useMemo(
    () => filterVisiblePurchaseNotes(purchaseNotes),
    [purchaseNotes],
  );

  // Данные главной идут по цепочке закупки: план-график → позиция плана (ИКЗ)
  // → закупка (СЗ) → извещение → проект контракта → реестр контрактов.
  // Закупка относится к организации, если её ИКЗ есть в позициях планов этого
  // заказчика либо на неё ссылается проект контракта или контракт реестра.
  const planList = useMemo(() => plans ?? [], [plans]);

  // Кнопка на главной открывает действующий план-график, а не форму создания:
  // заказчику нужен документ текущего года, новый план создаётся из реестра
  const currentPlanPath = useMemo(
    () => currentPurchasePlanPath(findCurrentPurchasePlan(planList)),
    [planList],
  );
  const planPositions = planList.flatMap((plan) => plan.positions ?? []);
  const planIkz = new Set(
    planPositions
      .map((position) => position.identificationCode)
      .filter(Boolean),
  );
  const linkedProcurementIds = new Set(
    [
      ...(contractProjects ?? []).map((project) =>
        String(project.procurementId ?? ""),
      ),
      ...(registryContracts ?? []).map((contract) =>
        String(contract.procurementId ?? ""),
      ),
    ].filter(Boolean),
  );
  const orgProcurements = useMemo(
    () =>
      (procurements ?? []).filter(
        (procurement) =>
          planIkz.has(procurement.ikz) ||
          linkedProcurementIds.has(String(procurement.id)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [procurements, planList, contractProjects, registryContracts],
  );
  const publishedNotices = orgProcurements.filter((procurement) =>
    Boolean(procurement.noticeNumber),
  );

  // Уведомления о приближении сроков и рисках санкций 44-ФЗ
  const activeAlerts = useMemo(() => {
    if (!orgId) return [];
    const ackSet = new Set(ackStates.map((s) => s.notificationKey));
    return buildProcurementNotifications({
      todayIso,
      contracts: registryContracts ?? [],
      stages: allStages,
      payments: allPayments,
      contractProjects: contractProjects ?? [],
      procurements: orgProcurements,
      tasks: orgTasks,
    }).filter((a) => !ackSet.has(a.id));
  }, [
    orgId,
    ackStates,
    todayIso,
    registryContracts,
    allStages,
    allPayments,
    contractProjects,
    orgProcurements,
    orgTasks,
  ]);
  const alertStats = useMemo(
    () => summarizeNotifications(activeAlerts),
    [activeAlerts],
  );

  const steps = [
    {
      title: "Планирование",
      hint: "Планы-графики заказчика",
      count: planList.length,
      to: "/purchase-plans",
    },
    {
      title: "План-график",
      hint: "Позиции плана (ИКЗ)",
      count: planPositions.length,
      to: "/purchase-plans",
    },
    {
      title: "СЗ на закупку",
      hint: "Реестр потребностей по ПГ",
      count: visiblePurchaseNotes.length,
      to: "/purchase-notes",
    },
    {
      title: "Извещение",
      hint: "Размещённые извещения",
      count: publishedNotices.length,
      to: "/procurement-processing",
    },
    {
      title: "Контракт",
      hint: "Проекты контрактов (ст. 33, 34, 51)",
      count: (contractProjects ?? []).length,
      to: "/procurement-processing",
    },
    {
      title: "Реестр контрактов",
      hint: "Реестр (ст. 82, 103)",
      count: (registryContracts ?? []).length,
      to: "/contract-registry",
    },
  ];

  const stats: StatItem[] = [
    {
      label: "Контракты",
      hint: "в реестре заказчика",
      value: (registryContracts ?? []).length,
      to: "/contract-registry",
    },
    {
      label: "Планы-графики",
      hint: "с позициями ИКЗ",
      value: planList.length,
      to: "/purchase-plans",
    },
    {
      label: "Потребности",
      hint: "служебные записки",
      value: visiblePurchaseNotes.length,
      to: "/purchase-notes",
    },
    {
      label: "Уведомления",
      hint: alertStats.total
        ? `${alertStats.critical} критических · ${alertStats.warning} срочных`
        : "сроки в норме",
      value: alertStats.total,
      to: "/notifications",
      tone: alertStats.critical
        ? "danger"
        : alertStats.warning
          ? "warning"
          : "ok",
    },
  ];

  const requisites = [
    {
      label: "ИНН / КПП",
      value: [organization?.inn, organization?.kpp].filter(Boolean).join(" / "),
    },
    { label: "ОГРН", value: organization?.ogrn },
    { label: "Реестровая запись ЕИС", value: organization?.registryNumber },
    { label: "Юридический адрес", value: organization?.legalAddress },
    { label: "Почтовый адрес", value: organization?.postalAddress },
    { label: "Email", value: organization?.email },
    { label: "Телефон", value: organization?.phone },
    {
      label: "Ответственный за планирование",
      value: [organization?.responsiblePerson, organization?.responsiblePhone]
        .filter(Boolean)
        .join(", "),
    },
  ].filter((item) => Boolean(item.value));

  // Разделы сгруппированы по смыслу: так список не превращается в длинную
  // колонку одинаковых строк и находится по названию этапа
  const linkGroups: SectionGroup[] = [
    {
      title: "Планирование и закупки",
      links: [
        {
          to: "/purchase-plans",
          title: "План-график закупок",
          hint: "44-ФЗ, импорт ЕИС и версионность",
        },
        {
          to: "/purchase-notes",
          title: "Реестр потребностей (СЗ)",
          hint: "статусы согласования и выгрузка .docx / .pdf",
        },
        {
          to: "/nmck-calculator",
          title: "Расчёт НМЦК",
          hint: "ст. 22 44-ФЗ, приказ МЭР № 567",
        },
        {
          to: "/estimates",
          title: "Сметы и НМЦК",
          hint: "дефектовка → смета → обоснование",
        },
        {
          to: "/procurement-processing",
          title: "Извещения и закупки",
          hint: "обработка информации и риски проектов",
        },
        {
          to: "/procurement-processing/new/notice-info",
          title: "Сведения для извещения",
          hint: "формирование извещения в ЕИС",
        },
        {
          to: "/contract-projects",
          title: "Проекты контрактов",
          hint: "ст. 33, 34, 51 44-ФЗ",
        },
        {
          to: "/contract-registry",
          title: "Реестр контрактов",
          hint: "ст. 82, 103 44-ФЗ",
        },
      ],
    },
    {
      title: "Исполнение и контроль",
      links: [
        {
          to: "/analytics",
          title: "Аналитика закупок",
          hint: "динамика, бюджет и статусы контрактов",
        },
        {
          to: "/contract-service",
          title: "Контрактная служба",
          hint: "приказ № 158н, п. 2.1",
        },
        {
          to: "/notifications",
          title: "Сроки и риски",
          hint: "контроль сроков и уведомления 44-ФЗ",
        },
        {
          to: "/documents",
          title: "Типовые документы",
          hint: "приказы, протоколы и Document Checker",
        },
        {
          to: "/norming-requirements",
          title: "Описание объекта закупки",
          hint: "ст. 33 44-ФЗ, ПП 145, ПП 926",
        },
        {
          to: "/defect-lists",
          title: "Дефектовки",
          hint: "объёмы работ → смета → график",
        },
        {
          to: "/bid-evaluations",
          title: "Оценка заявок",
          hint: "критерии и баллы по ПП РФ № 2604",
        },
      ],
    },
    {
      title: "Отчётность и кадры",
      links: [
        {
          to: "/reports/order-158n",
          title: "Отчётность по № 158н",
          hint: "деятельность контрактной службы",
        },
        {
          to: "/reports/smnp",
          title: "Отчёт СМП / СОНКО",
          hint: "ч. 1 ст. 30 44-ФЗ, форма № 9",
        },
        {
          to: "/liability-mapping",
          title: "Ответственность КС",
          hint: "гипотезы нарушений → нормы КоАП",
        },
        {
          to: "/vacation-schedule",
          title: "График отпусков",
          hint: "форма Т-2, ТК РФ, выгрузка .docx / .csv",
        },
        {
          to: "/tasks",
          title: "Задачи организации",
          hint: "контроль исполнения",
        },
        {
          to: "/ui-solutions",
          title: "UI-решения проекта",
          hint: "каталог компонентов и паттернов",
        },
        {
          to: "/visit-card",
          title: "Визитка проекта",
          hint: "одностраничная презентация системы",
        },
      ],
    },
  ];

  return (
    <main className={main()}>
      {/* === Превью организации-заказчика === */}
      <section className={main("hero")}>
        <div className={main("hero-main")}>
          <p className={main("eyebrow")}>
            <span className={main("eyebrow-dot")} aria-hidden="true" />
            Рабочий стол заказчика
            <span aria-hidden="true">·</span>
            {todayLabel}
          </p>

          <h1 className={main("org-title")}>
            {organization?.shortName ||
              organization?.fullName ||
              "Организация не определена"}
          </h1>

          {organization?.fullName &&
            organization.shortName &&
            organization.fullName !== organization.shortName && (
              <p className={main("org-full")}>{organization.fullName}</p>
            )}

          <div className={main("hero-badges")}>
            {organization?.budgetLevel && (
              <span className={main("badge")}>
                {budgetLevelLabels[organization.budgetLevel] ??
                  organization.budgetLevel}
              </span>
            )}
            {organization?.registryNumber && (
              <span className={main("badge", ["muted"])}>
                Реестровая запись ЕИС · {organization.registryNumber}
              </span>
            )}
            {needsContractService && (
              <Link className={main("badge", ["alert"])} to="/contract-service">
                Требуется указать способ создания КС
              </Link>
            )}
          </div>
        </div>

        <div className={main("hero-actions")}>
          <Link className={main("action", ["primary"])} to={currentPlanPath}>
            Текущий план-график
          </Link>
          <Link className={main("action")} to="/purchase-notes">
            Реестр потребностей
          </Link>
          <Link className={main("action")} to="/analytics">
            Аналитика закупок
          </Link>
        </div>

        <ul className={main("stats")}>
          {stats.map((stat) => (
            <li key={stat.label}>
              <Link
                className={main(
                  "stat",
                  stat.tone && stat.tone !== "ok" ? [stat.tone] : [],
                )}
                to={stat.to}
              >
                <span className={main("stat-value")}>{stat.value}</span>
                <span className={main("stat-label")}>{stat.label}</span>
                <span className={main("stat-hint")}>{stat.hint}</span>
              </Link>
            </li>
          ))}
        </ul>

        {requisites.length > 0 ? (
          <div className={main("requisites-block")}>
            <p className={main("requisites-title")}>Реквизиты заказчика</p>
            <dl className={main("requisites")}>
              {requisites.map((item) => (
                <div className={main("req")} key={item.label}>
                  <dt className={main("req-label")}>{item.label}</dt>
                  <dd className={main("req-value")}>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className={main("muted")}>
            Реквизиты заказчика не заполнены — войдите учётной записью,
            привязанной к организации
          </p>
        )}
      </section>

      {/* === Срочные уведомления о сроках 44-ФЗ === */}
      {orgId && activeAlerts.length > 0 && (
        <section
          className={main(
            "alert",
            alertStats.critical > 0
              ? ["critical"]
              : alertStats.warning > 0
                ? ["warning"]
                : [],
          )}
        >
          <div className={main("alert-head")}>
            <h2 className={main("alert-title")}>
              Контроль сроков 44-ФЗ: {alertStats.total} активных уведомлений (
              {alertStats.critical} критических · {alertStats.warning} срочных)
            </h2>
            <Link className={main("alert-link")} to="/notifications">
              Открыть центр уведомлений →
            </Link>
          </div>
          <ul className={main("alert-list")}>
            {activeAlerts.slice(0, 3).map((alert) => (
              <li key={alert.id} className={main("alert-item")}>
                <span className={main("alert-item-text")}>{alert.title}</span>
                <span className={main("alert-days")}>
                  {alert.daysRemaining !== null
                    ? alert.daysRemaining < 0
                      ? `Просрочка ${Math.abs(alert.daysRemaining)} дн.`
                      : `Осталось ${alert.daysRemaining} дн.`
                    : "Требует действия"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* === Поток закупки === */}
      <section className={main("card")}>
        <div className={main("section-head")}>
          <div>
            <h2 className={main("section-title")}>Поток закупки</h2>
            <p className={main("muted")}>
              Планирование → план-график → СЗ на закупку → извещение → контракт
              → реестр контрактов. Количество документов считается по данным
              организации.
            </p>
          </div>
          <span className={main("section-note")}>6 этапов</span>
        </div>

        <ol className={main("flow")}>
          {steps.map((step, index) => (
            <li
              className={main("flow-step", step.count > 0 ? ["done"] : [])}
              key={`${step.title}-${index}`}
            >
              <Link className={main("flow-link")} to={step.to}>
                <span className={main("flow-top")}>
                  <span className={main("flow-index")}>{index + 1}</span>
                  <span className={main("flow-count")}>{step.count}</span>
                </span>
                <span className={main("flow-title")}>{step.title}</span>
                <span className={main("flow-hint")}>{step.hint}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* === Разделы === */}
      <section className={main("card")}>
        <div className={main("section-head")}>
          <div>
            <h2 className={main("section-title")}>Все разделы</h2>
            <p className={main("muted")}>
              Экранные формы и справочники системы, сгруппированные по этапу
              работы.
            </p>
          </div>
        </div>

        {needsContractService && (
          <Link className={main("notice")} to="/contract-service">
            Обязательно: укажите способ создания контрактной службы (п. 2.1
            приказа № 158н)
          </Link>
        )}

        <div className={main("groups")}>
          {linkGroups.map((group) => (
            <div className={main("group")} key={group.title}>
              <h3 className={main("group-title")}>{group.title}</h3>
              <ul className={main("links")}>
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link className={main("link")} to={link.to}>
                      <span className={main("link-title")}>{link.title}</span>
                      <span className={main("link-hint")}>{link.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Main;
