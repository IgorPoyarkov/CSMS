import { useMemo, useState } from "react";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import { useContractService } from "../../services/ContractService/contractService.api";
import { contractServiceRoster } from "../ContractService/contractService.config";
import { emptyTask } from "../../services/Tasks/tasks.schema";
import { useCreateTask } from "../../services/Tasks/tasks.api";
import {
  DEFECT_INITIATOR_ROLE,
  DEFECT_INITIATOR_ROLE_HINT,
  DEFECT_LIST_REVIEW_DAYS,
  addDays,
  computeEstimateTotals,
  defectDirectCost,
  defectListStatusLabels,
  defectListsOfEmployee,
  isDefectListEditable,
  normalizeEstimate,
  normalizeSchedule,
  scheduleDifference,
  scheduleTotal,
  sortDefectLists,
  type DefectList,
  type DefectListStatus,
} from "../../services/DefectList/defectList.schema";
import {
  useDeleteDefectList,
  useOrganizationDefectLists,
  useUpdateDefectList,
} from "../../services/DefectList/defectList.api";
import DefectListModal from "./DefectListModal";
import styles from "./DefectListsPage.module.scss";

/**
 * «Мои дефектовки» (Tasks 8, п. 4).
 *
 * Инициатор закупки — работник подразделения-заказчика вне контрактной
 * службы — готовит дефектовку, из которой собираются проект сметы контракта
 * и проект календарного графика, видит только свои документы и направляет
 * готовый комплект в КС. У контрактной службы появляется задача «проверить
 * дефектовку и поставить позицию в план-график».
 *
 * Наименование объекта и ОКПД2 здесь не дублируются: дефектовка ссылается
 * на описание объекта закупки (objectDescriptions).
 */

type StatusFilter = DefectListStatus | "all";

const statusFilters: StatusFilter[] = [
  "all",
  "draft",
  "submitted",
  "accepted",
  "returned",
];

const today = (): string => new Date().toISOString().slice(0, 10);

const money = (value: number): string =>
  value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function DefectListsPage() {
  const { bem, formatDate, fullName } = useUtils();
  const block = bem(styles, "defect-lists");

  const { organization, employee, isContractServiceMember } =
    useMyContractRole();
  const orgId = organization?.id;

  const { data: lists = [], isLoading } = useOrganizationDefectLists(orgId);
  const { data: contractService } = useContractService(orgId);

  const createTask = useCreateTask();
  const updateList = useUpdateDefectList();
  const deleteList = useDeleteDefectList();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalList, setModalList] = useState<DefectList | null | undefined>(
    undefined,
  );
  const [actionError, setActionError] = useState("");

  const employeeId = employee?.id;
  const employeeName = fullName(employee?.employee ?? {});
  const structuralUnitName = employee?.structuralUnit?.name ?? "";

  // Ответственный в КС — руководитель службы (первая строка ростера)
  const reviewer = contractService
    ? contractServiceRoster(contractService)[0]
    : undefined;
  const reviewerId = reviewer?.employeeId;

  const visibleLists = useMemo(() => {
    const scoped = isContractServiceMember
      ? lists
      : defectListsOfEmployee(lists, employeeId);

    return sortDefectLists(scoped);
  }, [lists, employeeId, isContractServiceMember]);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      all: visibleLists.length,
      draft: 0,
      submitted: 0,
      accepted: 0,
      returned: 0,
    };

    visibleLists.forEach((list) => {
      result[list.status] += 1;
    });

    return result;
  }, [visibleLists]);

  const filtered =
    statusFilter === "all"
      ? visibleLists
      : visibleLists.filter((list) => list.status === statusFilter);

  const canEdit = (list: DefectList): boolean =>
    isDefectListEditable(list) &&
    String(list.authorEmployeeId) === String(employeeId ?? "");

  const handleSendToKs = (list: DefectList) => {
    if (reviewerId === undefined || reviewerId === "") {
      setActionError(
        "В организации не назначен руководитель контрактной службы. Укажите состав КС в разделе «Контрактная служба» — после этого дефектовку можно направить.",
      );

      return;
    }

    setActionError("");

    const estimate = normalizeEstimate(list.estimate);
    const schedule = normalizeSchedule(list.schedule);
    const totals = computeEstimateTotals({ items: list.items, estimate });

    const task = {
      ...emptyTask(list.organizationId),
      title: `Проверить дефектовку и проект сметы: ${
        list.objectName || "объект закупки"
      }`.slice(0, 150),
      description: [
        `Инициатор: ${list.authorName || "—"}.`,
        list.structuralUnitName
          ? `Подразделение: ${list.structuralUnitName}.`
          : "",
        `Позиций дефектовки: ${list.items.length}, прямые затраты ${money(
          defectDirectCost(list.items),
        )} руб.`,
        `Проект сметы: ${money(totals.total)} руб.`,
        schedule.stages.length > 0
          ? `Этапов графика: ${schedule.stages.length} на ${money(
              scheduleTotal(schedule.stages),
            )} руб.`
          : "Проект графика не сформирован.",
        "Проверить документы и поставить позицию в план-график.",
      ]
        .filter(Boolean)
        .join(" "),
      origin: "system" as const,
      functionCode: "purchase_description" as const,
      assigneeId: reviewerId,
      assigneeName: reviewer?.employeeFullName ?? "",
      assignedByEmployeeId: list.authorEmployeeId,
      assignedByName: list.authorName ?? "",
      dueDate: addDays(today(), DEFECT_LIST_REVIEW_DAYS),
    };

    createTask.mutate(task, {
      onSuccess: (created) => {
        updateList.mutate({
          id: list.id as string | number,
          status: "submitted",
          submittedAt: today(),
          taskId: created.id,
        });
      },
      onError: () => {
        setActionError(
          "Задача в контрактную службу не создана — дефектовка осталась черновиком.",
        );
      },
    });
  };

  const handleDelete = (list: DefectList) => {
    if (
      !window.confirm(
        `Удалить дефектовку «${list.objectName || "без объекта"}»? Действие необратимо.`,
      )
    ) {
      return;
    }

    deleteList.mutate(list.id as string | number);
  };

  const roleBadge = isContractServiceMember
    ? "Работник контрактной службы"
    : employeeId
      ? DEFECT_INITIATOR_ROLE
      : "Роль не определена";

  const roleHint = isContractServiceMember
    ? "Контрактная служба видит все дефектовки организации: по задаче нужно проверить объёмы, проект сметы и проект графика."
    : employeeId
      ? DEFECT_INITIATOR_ROLE_HINT
      : "Учётная запись не связана со штатным расписанием — дефектовку нельзя привязать к инициатору. Обратитесь в отдел кадров.";

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>
            {isContractServiceMember
              ? "Дефектовки организации"
              : "Мои дефектовки"}
          </h1>
          <p className={block("subtitle")}>{roleHint}</p>
        </div>

        <div className={block("header-actions")}>
          <span
            className={block("role", [
              isContractServiceMember
                ? "service"
                : employeeId
                  ? "initiator"
                  : "unknown",
            ])}
          >
            {roleBadge}
          </span>

          <button
            type="button"
            className={block("primary")}
            disabled={!employeeId}
            title={
              employeeId
                ? undefined
                : "Учётная запись не связана со штатным расписанием"
            }
            onClick={() => setModalList(null)}
          >
            + Новая дефектовка
          </button>
        </div>
      </header>

      {actionError && <p className={block("alert")}>{actionError}</p>}

      <div className={block("toolbar")}>
        <div
          className={block("filters")}
          role="group"
          aria-label="Фильтр по статусу"
        >
          {statusFilters.map((status) => (
            <button
              key={status}
              type="button"
              className={block("chip", [
                statusFilter === status ? "active" : "",
              ])}
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "Все" : defectListStatusLabels[status]}
              <span className={block("chip-count")}>{counts[status]}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className={block("empty")}>Загрузка дефектовок…</p>
      ) : filtered.length === 0 ? (
        <p className={block("empty")}>
          {visibleLists.length === 0
            ? "Дефектовок пока нет. Создайте черновик — из него соберутся проект сметы и проект календарного графика."
            : "Нет дефектовок с выбранным статусом."}
        </p>
      ) : (
        <ul className={block("list")}>
          {filtered.map((list) => {
            const estimate = normalizeEstimate(list.estimate);
            const schedule = normalizeSchedule(list.schedule);
            const totals = computeEstimateTotals({
              items: list.items,
              estimate,
            });
            const scheduleSum = scheduleTotal(schedule.stages);
            const difference = scheduleDifference({
              items: list.items,
              estimate,
              schedule,
            });
            const editable = canEdit(list);
            const isBusy =
              updateList.isPending &&
              String(updateList.variables?.id) === String(list.id);

            return (
              <li className={block("card")} key={String(list.id)}>
                <div className={block("card-head")}>
                  <h2 className={block("card-title")}>
                    {list.objectName || "Объект не указан"}
                  </h2>
                  <span className={block("status", [list.status])}>
                    {defectListStatusLabels[list.status]}
                  </span>
                </div>

                <dl className={block("meta")}>
                  <div className={block("meta-row")}>
                    <dt>Инициатор</dt>
                    <dd>
                      {list.authorName || "—"}
                      {list.structuralUnitName
                        ? ` · ${list.structuralUnitName}`
                        : ""}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Основание</dt>
                    <dd>{list.basis || "не указано"}</dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Дефектовка</dt>
                    <dd>
                      {list.items.length} поз. · прямые{" "}
                      {money(defectDirectCost(list.items))} ₽
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Проект сметы</dt>
                    <dd>
                      {money(totals.total)} ₽ · НДС {money(totals.vat)} ₽
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Проект графика</dt>
                    <dd>
                      {schedule.stages.length > 0
                        ? `${schedule.stages.length} эт. · ${money(
                            scheduleSum,
                          )} ₽ · ${
                            difference === 0
                              ? "сходится со сметой"
                              : `расхождение ${money(Math.abs(difference))} ₽`
                          }`
                        : "не сформирован"}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Создано</dt>
                    <dd>
                      {formatDate(list.createdAt) || "—"}
                      {list.submittedAt
                        ? ` · направлено ${formatDate(list.submittedAt)}`
                        : ""}
                    </dd>
                  </div>
                  {list.reviewComment && (
                    <div className={block("meta-row")}>
                      <dt>Комментарий КС</dt>
                      <dd>{list.reviewComment}</dd>
                    </div>
                  )}
                </dl>

                <div className={block("card-actions")}>
                  {editable && (
                    <button
                      type="button"
                      className={block("action")}
                      onClick={() => setModalList(list)}
                    >
                      Редактировать
                    </button>
                  )}

                  {editable && (
                    <button
                      type="button"
                      className={block("action", ["primary"])}
                      disabled={isBusy || createTask.isPending}
                      onClick={() => handleSendToKs(list)}
                      title={
                        reviewerId === undefined || reviewerId === ""
                          ? "В организации не назначен руководитель КС"
                          : undefined
                      }
                    >
                      {isBusy ? "Отправка…" : "Направить в КС"}
                    </button>
                  )}

                  {editable && (
                    <button
                      type="button"
                      className={block("action", ["danger"])}
                      onClick={() => handleDelete(list)}
                    >
                      Удалить
                    </button>
                  )}

                  {list.taskId && (
                    <span className={block("task-note")}>
                      Задача в КС создана
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalList !== undefined && (
        <DefectListModal
          organizationId={orgId ?? ""}
          author={{
            employeeId,
            employeeName,
            structuralUnitId: employee?.structuralUnitId,
            structuralUnitName,
          }}
          list={modalList}
          onClose={() => setModalList(undefined)}
        />
      )}
    </main>
  );
}
