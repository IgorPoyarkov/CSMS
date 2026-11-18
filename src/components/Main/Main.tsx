import { Link } from "react-router-dom";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import { useGetProcurements } from "../../services/Procurements/procurement.api";
import { useOrganizationContractProjects } from "../../services/ContractProject/contractProject.api";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import { useContractService } from "../../services/ContractService/contractService.api";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import useUtils from "../../hooks/useUtils";
import styles from "./Main.module.scss";

interface MainProps {}

const budgetLevelLabels: Record<string, string> = {
  federal: "Федеральный бюджет",
  regional: "Региональный бюджет",
  municipal: "Местный бюджет",
};

const Main = ({}: MainProps) => {
  const { bem } = useUtils();
  const main = bem(styles, "main");
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

  // Данные главной идут по цепочке закупки: план-график → позиция плана (ИКЗ)
  // → закупка (СЗ) → извещение → проект контракта → реестр контрактов.
  // Закупка относится к организации, если её ИКЗ есть в позициях планов этого
  // заказчика либо на неё ссылается проект контракта или контракт реестра.
  const planList = plans ?? [];
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
  const orgProcurements = (procurements ?? []).filter(
    (procurement) =>
      planIkz.has(procurement.ikz) ||
      linkedProcurementIds.has(String(procurement.id)),
  );
  const publishedNotices = orgProcurements.filter((procurement) =>
    Boolean(procurement.noticeNumber),
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
      count: (purchaseNotes ?? []).length,
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

  const testLinks = [
    {
      to: "/contract-service",
      title: "Контрактная служба",
      hint: "приказ N 158н, п. 2.1",
    },
    {
      to: "/purchase-plans",
      title: "План-график закупок",
      hint: "44-ФЗ, планирование",
    },
    {
      to: "/nmck-calculator",
      title: "Расчёт НМЦК (анализ рынка)",
      hint: "ст. 22 44-ФЗ, Приказ МЭР № 567",
    },
    {
      to: "/purchase-notes",
      title: "Реестр потребностей (СЗ)",
      hint: "статусы и выгрузка .docx / .pdf",
    },
    {
      to: "/procurement-processing",
      title: "Обработка информации по закупке",
      hint: "закупки и процедуры",
    },
    {
      to: "/procurement-processing/new/notice-info",
      title: "Сведения для формирования извещения",
      hint: "извещение в ЕИС",
    },
    {
      to: "/contract-registry",
      title: "Реестр контрактов",
      hint: "ст. 82, 103 44-ФЗ",
    },
    {
      to: "/reports/smnp",
      title: "Отчёт СМП / СОНКО",
      hint: "ч. 1 ст. 30 44-ФЗ, форма № 9",
    },
    {
      to: "/norming-requirements",
      title: "Описание объекта закупки (ООЗ)",
      hint: "ст. 33 44-ФЗ, ПП 145, ПП 926",
    },
    {
      to: "/defect-lists",
      title: "Дефектовки",
      hint: "инициатор закупки: объёмы работ → смета (421/пр) → график (336/пр)",
    },
    {
      to: "/bid-evaluations",
      title: "Оценка заявок",
      hint: "критерии и баллы по ПП РФ № 2604",
    },
    {
      to: "/vacation-schedule",
      title: "График отпусков",
      hint: "форма Т-2, ст. 115, 123, 125, 128 ТК РФ, выгрузка .docx / .csv",
    },
    { to: "/tasks", title: "Задачи организации", hint: "контроль исполнения" },
  ];

  return (
    <main className={main()}>
      {/* === Превью организации-заказчика === */}
      <section className={main("card")}>
        <div className={main("card-head")}>
          <h1 className={main("org-title")}>
            {organization?.shortName ||
              organization?.fullName ||
              "Организация не определена"}
          </h1>
          {organization?.budgetLevel && (
            <span className={main("badge")}>
              {budgetLevelLabels[organization.budgetLevel] ??
                organization.budgetLevel}
            </span>
          )}
        </div>

        {organization?.fullName &&
          organization.shortName &&
          organization.fullName !== organization.shortName && (
            <p className={main("org-full")}>{organization.fullName}</p>
          )}

        {requisites.length > 0 ? (
          <dl className={main("requisites")}>
            {requisites.map((item) => (
              <div className={main("req")} key={item.label}>
                <dt className={main("req-label")}>{item.label}</dt>
                <dd className={main("req-value")}>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={main("muted")}>
            Реквизиты заказчика не заполнены — войдите учётной записью,
            привязанной к организации
          </p>
        )}
      </section>

      {/* === Поток закупки === */}
      <section className={main("card")}>
        <h2 className={main("section-title")}>Поток закупки</h2>
        <p className={main("muted")}>
          Планирование → план-график → СЗ на закупку → извещение → контракт →
          реестр контрактов. Количество документов считается по данным
          организации.
        </p>

        <ol className={main("steps")}>
          {steps.map((step, index) => (
            <li
              className={main("step", step.count > 0 ? ["done"] : [])}
              key={`${step.title}-${index}`}
            >
              <Link className={main("step-link")} to={step.to}>
                <span className={main("step-index")}>{index + 1}</span>
                <span className={main("step-title")}>{step.title}</span>
                <span className={main("step-hint")}>{step.hint}</span>
                <span className={main("step-count")}>{step.count}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* === Разделы для тестов === */}
      <section className={main("card")}>
        <h2 className={main("section-title")}>Разделы</h2>

        {needsContractService && (
          <Link className={main("notice")} to="/contract-service">
            Обязательно: укажите способ создания контрактной службы (п. 2.1
            приказа N 158н)
          </Link>
        )}

        <ul className={main("links")}>
          {testLinks.map((link) => (
            <li className={main("link-item")} key={link.to}>
              <Link className={main("link")} to={link.to}>
                <span className={main("link-title")}>{link.title}</span>
                <span className={main("link-hint")}>{link.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default Main;
