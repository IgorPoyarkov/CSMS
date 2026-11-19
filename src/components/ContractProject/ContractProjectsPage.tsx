import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useOrganizationContractProjects } from "../../services/ContractProject/contractProject.api";
import {
  CONTRACT_KIND_LABELS,
  type ContractProject,
} from "../../services/ContractProject/contractProject.schema";
import { useGetProcurements } from "../../services/Procurements/procurement.api";
import { noticeStatusLabel } from "../../services/Procurements/procurement.schema";
import styles from "./ContractProjectsPage.module.scss";

const STATUS_LABELS: Record<ContractProject["status"], string> = {
  draft: "Черновик",
  published: "Размещён",
  signed: "Подписан",
  terminated: "Расторгнут",
};

const formatMoney = (value?: string): string => {
  const num = Number.parseFloat(value ?? "");
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `${num.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ₽`;
};

const formatDate = (value?: string): string => {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
};

/**
 * Реестр проектов контрактов — точка входа в конструктор из шапки.
 *
 * Показывает уже созданные проекты своей организации и закупки, по которым
 * проекта ещё нет. «Создать проект» открывает конструктор с предзаполнением
 * из извещения (ИКЗ, предмет, НМЦК, способ закупки).
 */
export default function ContractProjectsPage() {
  const navigate = useNavigate();
  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id ?? 1;

  const { data: projects = [], isLoading } =
    useOrganizationContractProjects(orgId);
  const { data: procurements = [] } = useGetProcurements();

  const [query, setQuery] = useState("");

  const projectsByProcurement = useMemo(() => {
    const map = new Map<string, ContractProject>();
    projects.forEach((project) => {
      if (project.procurementId !== undefined && project.procurementId !== "") {
        map.set(String(project.procurementId), project);
      }
      if (project.ikz) {
        map.set(`ikz:${project.ikz}`, project);
      }
    });
    return map;
  }, [projects]);

  const visibleProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) =>
      [
        project.contractName,
        project.ikz,
        project.supplierName,
        project.contractNumber,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [projects, query]);

  const availableProcurements = useMemo(() => {
    return procurements
      .filter((procurement) => procurement.noticeStatus !== "cancelled")
      .filter(
        (procurement) =>
          !projectsByProcurement.has(String(procurement.id)) &&
          !projectsByProcurement.has(`ikz:${procurement.ikz}`),
      );
  }, [procurements, projectsByProcurement]);

  const openProject = (project: ContractProject) => {
    const id = project.procurementId ?? project.ikz ?? "0";
    navigate(`/procurement-processing/${id}/contract-project`, {
      state: {
        ikz: project.ikz,
        name: project.contractName,
        nmck: Number.parseFloat(project.price.finalPrice ?? "") || undefined,
        noticeNumber: project.noticeNumber,
      },
    });
  };

  const createProject = (procurement: {
    id: string | number;
    ikz: string;
    name: string;
    nmck: number;
    procurementType: string;
    noticeNumber: string | null;
    kbk: string | null;
  }) => {
    navigate(`/procurement-processing/${procurement.id}/contract-project`, {
      state: {
        ikz: procurement.ikz,
        name: procurement.name,
        procurementType: procurement.procurementType,
        nmck: procurement.nmck,
        noticeNumber: procurement.noticeNumber ?? undefined,
        kbk: procurement.kbk ?? undefined,
      },
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>Проекты контрактов</h2>
          <p className={styles.subtitle}>
            Следующий этап после извещения: конструктор проекта контракта по
            ст. 34 и 51 Закона № 44-ФЗ. Данные подтягиваются из извещения,
            служебной записки и описания объекта закупки.
          </p>
        </div>
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по контракту, ИКЗ, поставщику"
            aria-label="Поиск проекта контракта"
          />
          <span className={styles.counter}>
            Проектов: {projects.length} · закупок без проекта:{" "}
            {availableProcurements.length}
          </span>
        </div>
      </header>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Созданные проекты</h3>

        {isLoading ? (
          <p className={styles.empty}>Загрузка…</p>
        ) : visibleProjects.length === 0 ? (
          <p className={styles.empty}>
            Проектов пока нет. Выберите закупку ниже — конструктор соберёт
            проект из извещения.
          </p>
        ) : (
          <div className={styles.grid}>
            {visibleProjects.map((project) => (
              <article key={project.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.kind}>
                    {CONTRACT_KIND_LABELS[project.kind]}
                  </span>
                  <span
                    className={`${styles.status} ${
                      project.status === "signed"
                        ? styles.statusSigned
                        : project.status === "terminated"
                          ? styles.statusTerminated
                          : project.status === "published"
                            ? styles.statusPublished
                            : styles.statusDraft
                    }`}
                  >
                    {STATUS_LABELS[project.status]}
                  </span>
                </div>

                <h4 className={styles.cardTitle}>
                  {project.contractName || "Без названия"}
                </h4>

                <dl className={styles.meta}>
                  <div className={styles.metaRow}>
                    <dt>ИКЗ</dt>
                    <dd className={styles.mono}>{project.ikz || "—"}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Цена</dt>
                    <dd>{formatMoney(project.price.finalPrice)}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Поставщик</dt>
                    <dd>{project.supplierName || "не указан"}</dd>
                  </div>
                  <div className={styles.metaRow}>
                    <dt>Обновлён</dt>
                    <dd>{formatDate(project.updatedAt)}</dd>
                  </div>
                </dl>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => openProject(project)}
                  >
                    Открыть конструктор
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Закупки без проекта контракта
        </h3>
        {availableProcurements.length === 0 ? (
          <p className={styles.empty}>
            По всем текущим закупкам проекты уже созданы.
          </p>
        ) : (
          <div className={styles.createList}>
            {availableProcurements.map((procurement) => (
              <div key={procurement.id} className={styles.createRow}>
                <div className={styles.createMain}>
                  <span className={styles.createName}>{procurement.name}</span>
                  <span className={styles.createMeta}>
                    {procurement.noticeNumber
                      ? `Извещение № ${procurement.noticeNumber}`
                      : "Номер извещения не присвоен"}{" "}
                    · {noticeStatusLabel(procurement.noticeStatus)} ·{" "}
                    {formatMoney(String(procurement.nmck))}
                  </span>
                  <span className={styles.createIkz}>{procurement.ikz}</span>
                </div>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => createProject(procurement)}
                >
                  Создать проект
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
