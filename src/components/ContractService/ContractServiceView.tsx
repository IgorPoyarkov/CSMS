import { useState } from "react";
import useUtils from "../../hooks/useUtils";
import { useFetchOrganizationEmployees } from "../../services/StaffingTable/StaffingTable.api";
import {
  contractServiceHeadMembershipWarning,
  contractServiceHeadOrderWarning,
  MIN_CONTRACT_SERVICE_SIZE,
  type ContractService,
} from "../../services/ContractService/contractService.schema";
import {
  contractServiceHeadcount,
  contractServiceCreationMethodBasis,
  contractServiceCreationMethodLabel,
  contractServiceHeadSummary,
  contractServiceHeadcountWarning,
  contractServiceRoster,
  formatContractServiceAppointer,
  formatContractServiceDeclarator,
  formatContractServiceFunctions,
  getEducationStatus,
  educationWarning,
} from "./contractService.config";
import { useOrganizationEducations } from "../../services/ContractService/education.api";
import {
  hasOpenAccessRequest,
  useAccessRequests,
} from "../../services/AccessRequest/accessRequest.api";
import AccessRequestModal from "../Account/AccessRequestModal/AccessRequestModal";
import CustomerProcurementRequisitesCard from "./CustomerProcurementRequisitesCard";
import styles from "./ContractServicePage.module.scss";

interface ContractServiceViewProps {
  service: ContractService;
  organizationName: string;
  onEdit: () => void;
}

export default function ContractServiceView({
  service,
  organizationName,
  onEdit,
}: ContractServiceViewProps) {
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "contract-service");
  const { data: employees = [] } = useFetchOrganizationEmployees(
    service.organizationId,
  );

  // Заявка на обучение: цель — работник из состава службы
  const [accessRequestTarget, setAccessRequestTarget] = useState<{
    employeeId: string | number;
    employeeName: string;
    warning: string;
  } | null>(null);

  // Отправленные заявки: по ним кнопка становится неактивной с надписью
  // «Запрос отправлен». Локальный набор держит отметку до ревалидации запроса,
  // чтобы кнопка гасла сразу после отправки
  const { data: accessRequests = [] } = useAccessRequests(
    service.organizationId,
  );
  const [justSentEmployeeIds, setJustSentEmployeeIds] = useState<Set<string>>(
    new Set(),
  );

  const isRequestSent = (employeeId: string | number | undefined): boolean =>
    employeeId !== undefined &&
    (justSentEmployeeIds.has(String(employeeId)) ||
      hasOpenAccessRequest(accessRequests, employeeId));

  const unitEmployees = employees.filter(
    (employee) =>
      String(employee.structuralUnitId) === String(service.structuralUnitId),
  );
  const headcount = contractServiceHeadcount(service, unitEmployees);
  const roster = contractServiceRoster(service);
  const headOrderWarning = contractServiceHeadOrderWarning(service);
  const headMembershipWarning = contractServiceHeadMembershipWarning(service);

  const { data: educations = [] } = useOrganizationEducations(
    service.organizationId,
  );

  return (
    <section className={block("card")}>
      <header className={block("card-header")}>
        <div>
          <h2 className={block("title")}>Контрактная служба</h2>
          <p className={block("lead")}>{organizationName}</p>
        </div>
        <button type="button" className={block("edit-button")} onClick={onEdit}>
          Изменить сведения
        </button>
      </header>

      <dl className={block("requisites")}>
        <div className={block("requisite")}>
          <dt>Способ создания (п. 2.1 приказа N 158н)</dt>
          <dd>{contractServiceCreationMethodLabel(service.creationMethod)}</dd>
        </div>
        <div className={block("requisite")}>
          <dt>Правовое основание</dt>
          <dd>{contractServiceCreationMethodBasis(service.creationMethod)}</dd>
        </div>
        <div className={block("requisite")}>
          <dt>Приказ</dt>
          <dd>
            {service.orderNumber
              ? `от ${formatDate(service.orderDate)} № ${service.orderNumber}`
              : "не указан"}
          </dd>
        </div>
        <div className={block("requisite")}>
          <dt>Сведения указал</dt>
          <dd>
            {formatContractServiceDeclarator(service)}
            {service.declaredDate
              ? `, ${formatDate(service.declaredDate)}`
              : ""}
          </dd>
        </div>
        <div className={block("requisite")}>
          <dt>Численность</dt>
          <dd>{`${headcount} чел.`}</dd>
        </div>
        {service.creationMethod !== "contract_manager" && (
          <>
            <div className={block("requisite")}>
              <dt>Руководитель службы (п. 2.3)</dt>
              <dd>{contractServiceHeadSummary(service)}</dd>
            </div>
            <div className={block("requisite")}>
              <dt>Приказ о назначении руководителя</dt>
              <dd>
                {service.headOrderNumber
                  ? `от ${formatDate(service.headOrderDate)} № ${service.headOrderNumber}`
                  : "не указан"}
                {service.appointedByName
                  ? `, издал: ${formatContractServiceAppointer(service)}`
                  : ""}
              </dd>
            </div>
          </>
        )}
        {service.remarks && (
          <div className={block("requisite")}>
            <dt>Примечание</dt>
            <dd>{service.remarks}</dd>
          </div>
        )}
      </dl>

      {service.creationMethod === "structural_unit" && (
        <p className={block("lead")}>
          Закупки ведёт структурное подразделение «
          {service.structuralUnitName || "не указано"}». Функции контрактной
          службы выполняют работники подразделения в пределах должностных
          обязанностей.
        </p>
      )}

      {headcount > 0 && headcount < MIN_CONTRACT_SERVICE_SIZE && (
        <p className={block("warning")}>
          {contractServiceHeadcountWarning(headcount)}
        </p>
      )}

      {roster.length > 0 && (
        <div className={block("table-wrapper")}>
          <table className={block("table")}>
            <thead>
              <tr>
                <th>№</th>
                <th>Роль</th>
                <th>Подразделение (отдел)</th>
                <th>Работник</th>
                <th>Должность</th>
                <th>Образование (п. 2.5)</th>
                <th>Функции и полномочия (раздел III)</th>
                <th>Примечание</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row, index) => {
                const employeeEducations = educations.filter(
                  (edu) => String(edu.employeeId) === String(row.employeeId),
                );
                const eduStatus = getEducationStatus(employeeEducations);
                const eduWarning = educationWarning(eduStatus);

                return (
                  <tr key={row.key}>
                    <td>{index + 1}</td>
                    <td className={block("role")}>{row.role}</td>
                    <td>{row.structuralUnitName || "в прямом подчинении"}</td>
                    <td>
                      {row.employeeFullName || "—"}
                      {row.employeeNumber
                        ? ` (таб. ${row.employeeNumber})`
                        : ""}
                    </td>
                    <td>{row.position || "—"}</td>
                    <td>
                      <div className={block("education-status")}>
                        {eduStatus.summary}
                        {eduWarning && (
                          <span className={block("education-warning")}>
                            {eduWarning}
                          </span>
                        )}
                      </div>
                      {eduWarning && row.employeeId && (
                        <button
                          type="button"
                          className={block(
                            "request-education-btn",
                            isRequestSent(row.employeeId) ? ["sent"] : [],
                          )}
                          disabled={isRequestSent(row.employeeId)}
                          onClick={() =>
                            setAccessRequestTarget({
                              employeeId: row.employeeId!,
                              employeeName: row.employeeFullName || "—",
                              warning: eduWarning,
                            })
                          }
                        >
                          {isRequestSent(row.employeeId)
                            ? "Запрос отправлен"
                            : "Запрос на обучение"}
                        </button>
                      )}
                    </td>
                    <td>{formatContractServiceFunctions(row.functions)}</td>
                    <td>{row.remarks || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {service.creationMethod !== "contract_manager" && roster.length === 0 && (
        <p className={block("status")}>
          Ответственные за закупки не назначены.
        </p>
      )}

      {headOrderWarning && (
        <p className={block("warning")}>{headOrderWarning}</p>
      )}
      {headMembershipWarning && (
        <p className={block("warning")}>{headMembershipWarning}</p>
      )}

      {/* Общие предупреждения об образовании */}
      {roster.some((row) => {
        const eduStatus = getEducationStatus(
          educations.filter(
            (edu) => String(edu.employeeId) === String(row.employeeId),
          ),
        );

        return (
          !eduStatus.hasProfile ||
          eduStatus.dpoExpired ||
          eduStatus.dpoExpiringSoon
        );
      }) && (
        <section className={block("education-summary")}>
          <h3 className={block("education-summary-title")}>
            Требования к образованию (п. 2.5 Типового положения)
          </h3>
          <p className={block("education-summary-lead")}>
            Все работники контрактной службы должны иметь высшее или
            дополнительное профессиональное образование в сфере закупок. Статус
            образования проверяется автоматически по реестру документов.
          </p>
          <ul className={block("education-summary-list")}>
            {roster.map((row) => {
              const eduStatus = getEducationStatus(
                educations.filter(
                  (edu) => String(edu.employeeId) === String(row.employeeId),
                ),
              );
              const warning = educationWarning(eduStatus);

              if (!warning) return null;

              return (
                <li key={row.key} className={block("education-warning-item")}>
                  <strong>{row.employeeFullName || "—"}</strong> ({row.role}):{" "}
                  {warning}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <CustomerProcurementRequisitesCard />

      {accessRequestTarget && (
        <AccessRequestModal
          employeeId={accessRequestTarget.employeeId}
          employeeName={accessRequestTarget.employeeName}
          warning={accessRequestTarget.warning}
          onSent={() =>
            setJustSentEmployeeIds((prev) =>
              new Set(prev).add(String(accessRequestTarget.employeeId)),
            )
          }
          onClose={() => setAccessRequestTarget(null)}
        />
      )}
    </section>
  );
}
