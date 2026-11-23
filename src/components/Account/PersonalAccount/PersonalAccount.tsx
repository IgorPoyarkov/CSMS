import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useUtils from "../../../hooks/useUtils";
import useMyContractRole from "../../../hooks/useMyContractRole";
import ProfileEditModal from "../ProfileEditModal/ProfileEditModal";
import AccessRequestModal from "../AccessRequestModal/AccessRequestModal";
import MyTasks from "../../Tasks/MyTasks";
import TaskAssignModal from "../../Tasks/TaskAssignModal";
import { useEmployeeEducations } from "../../../services/ContractService/education.api";
import {
  useOrganizationLeaves,
  useEmployeeLeaves,
} from "../../../services/Calendar/calendar.api";
import {
  businessDaysBetween,
  type Leave,
} from "../../../services/Calendar/calendar.schema";
import {
  getEducationStatus,
  educationWarning,
  functionLabels,
} from "../../../components/ContractService/contractService.config";
import {
  useAssigneeTasks,
  useUpdateTaskProgress,
} from "../../../services/Tasks/tasks.api";

import {
  useEmployeeEvaluations,
  employeeScoreTotal,
  employeeScoreAverage,
  salaryImpact,
  salaryImpactLabel,
  onTimeCompletionRate,
} from "../../../services/Tasks/taskEvaluation.api";
import { type Task as TaskType } from "../../../services/Tasks/tasks.schema";
import { currentIsoDate } from "../../../shared/format";
import styles from "./PersonalAccount.module.scss";

export default function PersonalAccount() {
  const navigate = useNavigate();
  // Дата фиксируется на момент открытия страницы: вызов new Date() в рендере
  // делал бы результат календаря нестабильным между перерисовками.
  const [todayIso] = useState(currentIsoDate);
  const { formatDate, fullName } = useUtils();
  const { mutate: updateTask } = useUpdateTaskProgress();
  const { user, organization, employee, myRole, isHead } = useMyContractRole();
  const employeeId = employee?.id;

  // Образование — для роли в КС и личного кабинета
  const eduForEmployee = useEmployeeEducations(employeeId);
  const eduStatus = getEducationStatus(eduForEmployee.data ?? []);
  const eduWarning = educationWarning(eduStatus);

  // Задачи исполнителя (личный кабинет). Задачи организации смотрят в разделе
  // «Задачи организации» шапки, а не в личном кабинете
  const assigneeTasks = useAssigneeTasks(employeeId);

  // Оценка эффективности — баллы, влияние на ЗП, соблюдение сроков
  const evaluations = useEmployeeEvaluations(employeeId);
  const totalScore = employeeScoreTotal(evaluations.data ?? []);
  const avgScore = employeeScoreAverage(evaluations.data ?? []);
  const salary = salaryImpact(evaluations.data ?? []);
  const onTime = onTimeCompletionRate(
    assigneeTasks.data ?? [],
    evaluations.data ?? [],
  );

  // Календарь отпусков и больничных
  const orgLeaves = useOrganizationLeaves(organization?.id);
  const myLeaves = useEmployeeLeaves(employeeId);

  // Профиль правится в модалке, которую открывает карандаш на аватаре;
  // назначение задачи — отдельная модалка из «Возможных действий»
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAccessRequestOpen, setIsAccessRequestOpen] = useState(false);

  function onTaskChange(id: string | number, task: TaskType) {
    if (task.status === "pending") {
      updateTask({ id, status: "in_progress" });
    } else if (task.status === "in_progress") {
      updateTask({
        id,
        status: "completed",
        result: task.result,
      });
    }
  }

  if (!user || !employee) {
    return (
      <div className={styles["personal-account"]}>
        <div className={styles["loader"]}>Загрузка профиля...</div>
      </div>
    );
  }

  return (
    <div className={styles["personal-account"]}>
      <h2 className={styles["title"]}>Личный кабинет</h2>

      {/* === Персональные данные ===
          Организация не показана: пользователь знает, под каким заказчиком
          работает. Роль в контрактной службе — подраздел этой же карточки */}
      <section className={styles["section"]}>
        <h3 className={styles["section-title"]}>Персональные данные</h3>

        <div className={styles["profile-card"]}>
          {/* Аватар-кружок с карандашом: правка профиля открывается по ним,
              отдельная широкая кнопка для этого не нужна */}
          <div className={styles["avatar"]}>
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt="Аватар"
                className={styles["avatar-image"]}
              />
            ) : (
              <span className={styles["avatar-placeholder"]}>
                {fullName(employee.employee ?? {})
                  .charAt(0)
                  .toUpperCase() || "?"}
              </span>
            )}

            <button
              type="button"
              className={styles["avatar__edit"]}
              onClick={() => setIsEditOpen(true)}
              aria-label="Редактировать профиль"
              title="Редактировать профиль"
            >
              <svg
                className={styles["avatar__edit-icon"]}
                viewBox="0 0 16 16"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M2 11.4V14h2.6l7.5-7.5-2.6-2.6L2 11.4zm12.1-5.5c.3-.3.3-.8 0-1.1l-1.5-1.5c-.3-.3-.8-.3-1.1 0l-1.2 1.2 2.6 2.6 1.2-1.2z" />
              </svg>
            </button>
          </div>

          {/* Данные — список строк «ФИО: ...», одна под другой */}
          <dl className={styles["profile-data"]}>
            <div className={styles["profile-data__item"]}>
              <dt className={styles["profile-data__label"]}>ФИО</dt>
              <dd className={styles["profile-data__value"]}>
                {fullName(employee.employee ?? {})}
              </dd>
            </div>
            <div className={styles["profile-data__item"]}>
              <dt className={styles["profile-data__label"]}>Должность</dt>
              <dd className={styles["profile-data__value"]}>
                {employee.position || "\u2014"}
              </dd>
            </div>
            <div className={styles["profile-data__item"]}>
              <dt className={styles["profile-data__label"]}>Подразделение</dt>
              <dd className={styles["profile-data__value"]}>
                {employee.structuralUnit?.name || "\u2014"}
              </dd>
            </div>
            <div className={styles["profile-data__item"]}>
              <dt className={styles["profile-data__label"]}>Email</dt>
              <dd className={styles["profile-data__value"]}>
                {employee.email || user.email}
              </dd>
            </div>
            <div className={styles["profile-data__item"]}>
              <dt className={styles["profile-data__label"]}>Телефон</dt>
              <dd className={styles["profile-data__value"]}>
                {employee.phone || "\u2014"}
              </dd>
            </div>
          </dl>

          {/* Роль в службе и образование — раскрывающийся подраздел карточки */}
          <details className={styles["profile-card__details"]}>
            <summary className={styles["details__summary"]}>
              Роль в контрактной службе и образование (п. 2.5)
            </summary>

            <div className={styles["details__body"]}>
              {myRole ? (
                <div className={styles["role-card"]}>
                  <div className={styles["role-card__title"]}>
                    {myRole.role}
                  </div>
                  {myRole.structuralUnitName && (
                    <div className={styles["role-card__info"]}>
                      Подразделение: {myRole.structuralUnitName}
                    </div>
                  )}
                  {myRole.position && (
                    <div className={styles["role-card__info"]}>
                      Должность: {myRole.position}
                    </div>
                  )}
                  {myRole.functions && myRole.functions.length > 0 && (
                    <div className={styles["role-card__info"]}>
                      Функции:{" "}
                      {myRole.functions
                        .map((f) => functionLabels[f])
                        .join("; ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles["empty-state"]}>
                  Вы не входите в состав контрактной службы
                </div>
              )}

              {eduWarning && (
                <div className={styles["warning"]}>
                  {eduWarning}
                  <button
                    type="button"
                    className={styles["warning__action"]}
                    onClick={() => setIsAccessRequestOpen(true)}
                  >
                    Направить заявку в отдел кадров
                  </button>
                </div>
              )}

              {eduForEmployee.data && eduForEmployee.data.length > 0 ? (
                <div className={styles["education-list"]}>
                  {eduForEmployee.data.map((edu) => (
                    <div key={edu.id} className={styles["education-item"]}>
                      <div className={styles["education-item__type"]}>
                        {edu.type === "higher" ? "Высшее" : "ДПО"}
                      </div>
                      <div className={styles["education-item__field"]}>
                        {edu.field}
                      </div>
                      <div className={styles["education-item__institution"]}>
                        {edu.institution}
                      </div>
                      <div className={styles["education-item__date"]}>
                        {formatDate(edu.graduationDate)}
                      </div>
                      {edu.dpoValidityMonths && (
                        <div className={styles["education-item__validity"]}>
                          Срок действия: {edu.dpoValidityMonths} мес.
                        </div>
                      )}
                      {edu.documentNumber && (
                        <div className={styles["education-item__doc"]}>
                          Документ: {edu.documentNumber}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles["empty-state"]}>
                  Сведений об образовании нет
                </div>
              )}
            </div>
          </details>
        </div>
      </section>

      {/* === Эффективность (Раздел III) === */}
      <section className={styles["section"]}>
        <h3 className={styles["section-title"]}>Эффективность</h3>

        <div className={styles["performance-grid"]}>
          <div className={styles["performance-card"]}>
            <div className={styles["performance-card__label"]}>
              Суммарный балл
            </div>
            <div
              className={`${styles["performance-card__value"]} ${
                totalScore > 0
                  ? styles["performance-card__value--positive"]
                  : totalScore < 0
                    ? styles["performance-card__value--negative"]
                    : ""
              }`}
            >
              {totalScore > 0 ? `+${totalScore}` : totalScore}
            </div>
          </div>

          <div className={styles["performance-card"]}>
            <div className={styles["performance-card__label"]}>
              Средний балл
            </div>
            <div className={styles["performance-card__value"]}>
              {avgScore !== null ? avgScore.toFixed(1) : "—"}
            </div>
          </div>

          <div className={styles["performance-card"]}>
            <div className={styles["performance-card__label"]}>
              Влияние на ЗП
            </div>
            <div
              className={`${styles["performance-card__value"]} ${
                salary === "bonus"
                  ? styles["performance-card__value--positive"]
                  : salary === "penalty"
                    ? styles["performance-card__value--negative"]
                    : ""
              }`}
            >
              {salaryImpactLabel[salary]}
            </div>
          </div>

          <div className={styles["performance-card"]}>
            <div className={styles["performance-card__label"]}>
              Выполнено в срок
            </div>
            <div className={styles["performance-card__value"]}>
              {onTime.total > 0 ? `${onTime.rate}%` : "—"}
            </div>
            {onTime.total > 0 && (
              <div className={styles["performance-card__detail"]}>
                {onTime.onTime} в срок / {onTime.late} с нарушением из{" "}
                {onTime.total}
              </div>
            )}
          </div>
        </div>

        {evaluations.data && evaluations.data.length > 0 && (
          <div className={styles["evaluation-list"]}>
            <h4 className={styles["evaluation-list__title"]}>
              Оценки выполненных задач
            </h4>
            {evaluations.data.map((evalItem) => (
              <div key={evalItem.id} className={styles["evaluation-item"]}>
                <div
                  className={`${styles["evaluation-item__score"]} ${
                    styles[
                      evalItem.score === "excellent"
                        ? "evaluation-score--excellent"
                        : evalItem.score === "good"
                          ? "evaluation-score--good"
                          : evalItem.score === "needs_improvement"
                            ? "evaluation-score--needs"
                            : evalItem.score === "violation"
                              ? "evaluation-score--violation"
                              : "evaluation-score--satisfactory"
                    ]
                  }`}
                >
                  {evalItem.score === "excellent"
                    ? "Отлично"
                    : evalItem.score === "good"
                      ? "Хорошо"
                      : evalItem.score === "satisfactory"
                        ? "Удовл."
                        : evalItem.score === "needs_improvement"
                          ? "Треб. улучш."
                          : "Нарушение"}
                </div>
                <div className={styles["evaluation-item__comment"]}>
                  {evalItem.comment || "Без комментария"}
                </div>
                <div className={styles["evaluation-item__meta"]}>
                  Оценил: {evalItem.evaluatedByName} ·{" "}
                  {formatDate(evalItem.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* === Календарь отпусков (табельный учёт) === */}
      <section className={styles["section"]}>
        <h3 className={styles["section-title"]}>Календарь отпусков</h3>

        {myLeaves.data && myLeaves.data.length > 0 ? (
          <div className={styles["leave-list"]}>
            {myLeaves.data.map((leave: Leave) => {
              const days = businessDaysBetween(leave.startDate, leave.endDate);
              const now = todayIso;
              const isActive =
                leave.status === "ongoing" ||
                (leave.status === "approved" &&
                  leave.startDate <= now &&
                  now <= leave.endDate);

              return (
                <div
                  key={leave.id}
                  className={`${styles["leave-item"]} ${
                    isActive ? styles["leave-item--active"] : ""
                  }`}
                >
                  <div className={styles["leave-item__type"]}>
                    {leave.type === "vacation"
                      ? "Отпуск"
                      : leave.type === "sick_leave"
                        ? "Больничный"
                        : leave.type === "business_trip"
                          ? "Командировка"
                          : leave.type === "unpaid_leave"
                            ? "Б/З"
                            : "Декрет"}
                  </div>
                  <div className={styles["leave-item__period"]}>
                    {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                  </div>
                  <div className={styles["leave-item__days"]}>
                    {days} раб. дн.
                  </div>
                  <div
                    className={`${styles["leave-item__status"]} ${
                      styles[
                        leave.status === "approved"
                          ? "status-approved"
                          : leave.status === "ongoing"
                            ? "status-ongoing"
                            : leave.status === "scheduled"
                              ? "status-scheduled"
                              : leave.status === "completed"
                                ? "status-completed"
                                : "status-cancelled"
                      ]
                    }`}
                  >
                    {leave.status === "approved"
                      ? "Утверждён"
                      : leave.status === "ongoing"
                        ? "Активен"
                        : leave.status === "scheduled"
                          ? "Запланирован"
                          : leave.status === "completed"
                            ? "Завершён"
                            : "Отменён"}
                  </div>
                  {leave.orderNumber && (
                    <div className={styles["leave-item__order"]}>
                      Приказ {leave.orderNumber}
                      {leave.orderDate
                        ? ` от ${formatDate(leave.orderDate)}`
                        : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles["empty-state"]}>Записей об отсутствии нет</div>
        )}

        {/* Табель по организации — только руководитель видит */}
        {myRole?.role.includes("Руководитель") &&
          orgLeaves.data &&
          orgLeaves.data.length > 0 && (
            <div className={styles["leave-roster"]}>
              <h4 className={styles["leave-roster__title"]}>
                Отсутствуют в организации
              </h4>
              <table className={styles["leave-roster__table"]}>
                <thead>
                  <tr>
                    <th>Сотрудник</th>
                    <th>Тип</th>
                    <th>Период</th>
                    <th>Раб. дн.</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {orgLeaves.data
                    .filter(
                      (l: Leave) =>
                        l.status === "approved" || l.status === "ongoing",
                    )
                    .map((l: Leave) => (
                      <tr key={l.id}>
                        <td>{l.employeeName}</td>
                        <td>
                          {l.type === "vacation"
                            ? "Отпуск"
                            : l.type === "sick_leave"
                              ? "Больничный"
                              : l.type === "business_trip"
                                ? "Командировка"
                                : l.type === "unpaid_leave"
                                  ? "Б/З"
                                  : "Декрет"}
                        </td>
                        <td>
                          {formatDate(l.startDate)} — {formatDate(l.endDate)}
                        </td>
                        <td>{businessDaysBetween(l.startDate, l.endDate)}</td>
                        <td>
                          {l.status === "ongoing" ? "Активен" : "Утверждён"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      {/* === Мои задачи: фильтр по статусу, очередь по остатку срока,
          показ по 5/10/15/все и два вида — списком (по умолчанию) и сеткой === */}
      <section className={styles["section"]}>
        <h3 className={styles["section-title"]}>Мои задачи</h3>

        {assigneeTasks.isLoading ? (
          <div className={styles["loader"]}>Загрузка задач...</div>
        ) : (
          <MyTasks tasks={assigneeTasks.data ?? []} onAdvance={onTaskChange} />
        )}
      </section>

      {/* === Возможные действия === */}
      <section className={styles["section"]}>
        <h3 className={styles["section-title"]}>Возможные действия</h3>
        <ul className={styles["action-list"]}>
          <li>
            <button
              className={styles["btn-outline"]}
              onClick={() => navigate("/contract-service")}
            >
              Контрактная служба
            </button>
          </li>
          <li>
            <button
              className={styles["btn-outline"]}
              onClick={() => navigate("/purchase-plans")}
            >
              План-график закупок
            </button>
          </li>
          <li>
            <button
              className={styles["btn-outline"]}
              onClick={() => navigate("/procurement-processing")}
            >
              Обработка информации по закупке
            </button>
          </li>
          <li>
            <button
              className={styles["btn-outline"]}
              onClick={() => navigate("/contract-registry")}
            >
              Реестр контрактов
            </button>
          </li>
          {/* Назначение задачи — право руководителя службы и контрактного
              управляющего (п. 2.4); сотрудник без права его не видит.
              Выход из учётной записи убран: он в меню профиля шапки, и держать
              опасное действие рядом с обычными нельзя */}
          {isHead && (
            <li>
              <button
                className={styles["btn-outline"]}
                onClick={() => setIsAssignOpen(true)}
              >
                Назначить задачу
              </button>
            </li>
          )}
        </ul>
      </section>

      {isEditOpen && (
        <ProfileEditModal
          employee={employee}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isAssignOpen && (
        <TaskAssignModal onClose={() => setIsAssignOpen(false)} />
      )}

      {isAccessRequestOpen && employee && (
        <AccessRequestModal
          employeeId={employee.id ?? ""}
          employeeName={fullName(employee.employee ?? {})}
          warning={eduWarning ?? ""}
          onClose={() => setIsAccessRequestOpen(false)}
        />
      )}
    </div>
  );
}
