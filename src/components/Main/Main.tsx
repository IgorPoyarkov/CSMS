import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useContractService } from "../../services/ContractService/contractService.api";
import { useEisNews } from "../../services/EisNews/eisNews.api";
import { useStats } from "../../services/Stats/stats.api";
import Loader from "../../components/UI/Loader";
import useUtils from "../../hooks/useUtils";
import styles from "./Main.module.scss";

const budgetLevelLabels: Record<string, string> = {
  federal: "Федеральный бюджет",
  regional: "Региональный бюджет",
  municipal: "Местный бюджет",
};

/** Форматирование даты из RSS-ленты ЕИС. */
const formatNewsDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const Main = () => {
  const { bem } = useUtils();
  const main = bem(styles, "main");
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  const { data: organization } = useCurrentOrganization();
  const { data: contractService, isLoading: isContractServiceLoading } =
    useContractService(organization?.id);
  const needsContractService =
    Boolean(organization?.id) && !isContractServiceLoading && !contractService;

  const {
    data: news,
    isLoading: isNewsLoading,
    error: newsError,
  } = useEisNews(12);
  const newsItems = news?.items ?? [];

  // Лёгкая статистика — один COUNT-запрос к серверу, без скачивания документов
  const { data: stats } = useStats(organization?.id);

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

        {/* === Реквизиты заказчика === */}
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

      {/* === Быстрая статистика (счётчики из COUNT-запроса) === */}
      {stats && (
        <section className={main("stats")}>
          <div className={main("stat")}>
            <Link className={main("stat-link")} to="/purchase-plans">
              <span className={main("stat-value")}>{stats.purchasePlans}</span>
              <span className={main("stat-label")}>Планы-графики</span>
            </Link>
          </div>
          <div className={main("stat")}>
            <Link className={main("stat-link")} to="/procurement-processing">
              <span className={main("stat-value")}>{stats.procurements}</span>
              <span className={main("stat-label")}>Закупки</span>
            </Link>
          </div>
          <div className={main("stat")}>
            <Link className={main("stat-link")} to="/purchase-notes">
              <span className={main("stat-value")}>{stats.purchaseNotes}</span>
              <span className={main("stat-label")}>Потребности</span>
            </Link>
          </div>
          <div className={main("stat")}>
            <Link className={main("stat-link")} to="/contract-registry">
              <span className={main("stat-value")}>
                {stats.contractRegistryCurrentYear}
              </span>
              <span className={main("stat-label")}>
                Контракты {stats.currentYear}
              </span>
            </Link>
          </div>
          <div className={main("stat")}>
            <Link className={main("stat-link")} to="/tasks">
              <span className={main("stat-value")}>{stats.activeTasks}</span>
              <span className={main("stat-label")}>Задачи в работе</span>
            </Link>
          </div>
        </section>
      )}

      {/* === Новости ЕИС === */}
      <section className={main("news")}>
        <div className={main("news-head")}>
          <div>
            <h2 className={main("news-title")}>Новости ЕИС</h2>
            <p className={main("news-note")}>
              RSS-лента zakupki.gov.ru: изменения НПА, релизы и разъяснения ЕИС.
            </p>
          </div>
          <a
            className={main("news-all")}
            href="https://zakupki.gov.ru/epz/main/public/news/news-search.html"
            target="_blank"
            rel="noreferrer noopener"
          >
            Все новости ЕИС →
          </a>
        </div>

        {isNewsLoading && <Loader modifer="pendulum" size={260} />}

        {newsError && !newsItems.length && (
          <p className={main("news-error")}>
            Не удалось загрузить ленту ЕИС — проверьте доступ в интернет и
            обновление локального сервиса данных.
          </p>
        )}

        {newsItems.length > 0 && (
          <>
            <ul className={main("news-list")}>
              {newsItems.map((item) => (
                <li key={item.id} className={main("news-item")}>
                  <a
                    className={main("news-link")}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <span className={main("news-item-title")}>
                      {item.title}
                    </span>
                    {item.summary && (
                      <span className={main("news-summary")}>
                        {item.summary}
                      </span>
                    )}
                  </a>
                  {item.publishedAt && (
                    <span className={main("news-date")}>
                      {formatNewsDate(item.publishedAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {news?.fetchedAt && (
              <p className={main("news-updated")}>
                Обновлено {formatNewsDate(news.fetchedAt)}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default Main;
