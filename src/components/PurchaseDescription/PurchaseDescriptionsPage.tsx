import { useMemo, useState } from "react";
import useMyContractRole from "../../hooks/useMyContractRole";
import useUtils from "../../hooks/useUtils";
import { useContractService } from "../../services/ContractService/contractService.api";
import { contractServiceRoster } from "../ContractService/contractService.config";
import { emptyTask } from "../../services/Tasks/tasks.schema";
import { useCreateTask } from "../../services/Tasks/tasks.api";
import {
  PURCHASE_DESCRIPTION_REVIEW_DAYS,
  PURCHASE_INITIATOR_ROLE,
  PURCHASE_INITIATOR_ROLE_HINT,
  addDays,
  isPurchaseDescriptionEditable,
  purchaseDescriptionStatusLabels,
  purchaseDescriptionTotal,
  purchaseDescriptionsOfEmployee,
  sortPurchaseDescriptions,
  type PurchaseDescription,
  type PurchaseDescriptionStatus,
} from "../../services/PurchaseDescription/purchaseDescription.schema";
import {
  useDeletePurchaseDescription,
  useOrganizationPurchaseDescriptions,
  useUpdatePurchaseDescription,
} from "../../services/PurchaseDescription/purchaseDescription.api";
import PurchaseDescriptionModal from "./PurchaseDescriptionModal";
import styles from "./PurchaseDescriptionsPage.module.scss";

/**
 * «Мои описания объектов закупки» (Tasks 8, п. 4).
 *
 * Инициатор закупки — работник подразделения-заказчика, не входящий в
 * контрактную службу, — готовит здесь структурированное описание объекта
 * закупки и смету (дефектовку), видит только свои документы и направляет
 * готовое описание в КС. У контрактной службы появляется задача «проверить
 * описание и поставить позицию в план-график» — дальше процесс идёт без
 * инициатора.
 *
 * Работник контрактной службы видит все описания организации: ему по задаче
 * нужно их проверять.
 */

type StatusFilter = PurchaseDescriptionStatus | "all";

const statusFilters: StatusFilter[] = [
  "all",
  "draft",
  "submitted",
  "accepted",
  "returned",
];

const today = (): string => new Date().toISOString().slice(0, 10);

export default function PurchaseDescriptionsPage() {
  const { bem, formatDate, fullName } = useUtils();
  const block = bem(styles, "purchase-descriptions");

  const {
    organization,
    employee,
    isContractServiceMember,
    isPurchaseInitiator,
  } = useMyContractRole();
  const orgId = organization?.id;

  const { data: descriptions = [], isLoading } =
    useOrganizationPurchaseDescriptions(orgId);
  const { data: contractService } = useContractService(orgId);

  const createTask = useCreateTask();
  const updateDescription = useUpdatePurchaseDescription();
  const deleteDescription = useDeletePurchaseDescription();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalDescription, setModalDescription] = useState<
    PurchaseDescription | null | undefined
  >(undefined);
  const [actionError, setActionError] = useState("");

  const employeeId = employee?.id;
  const employeeName = fullName(employee?.employee ?? {});
  const structuralUnitName = employee?.structuralUnit?.name ?? "";

  // Ответственный в КС — руководитель службы (первая строка ростера),
  // при способе «контрактный управляющий» — сам управляющий
  const reviewer = contractService
    ? contractServiceRoster(contractService)[0]
    : undefined;
  const reviewerId = reviewer?.employeeId;

  // Инициатор видит только свои документы, КС — все описания организации
  const visibleDescriptions = useMemo(() => {
    const scoped = isContractServiceMember
      ? descriptions
      : purchaseDescriptionsOfEmployee(descriptions, employeeId);

    return sortPurchaseDescriptions(scoped);
  }, [descriptions, employeeId, isContractServiceMember]);

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      all: visibleDescriptions.length,
      draft: 0,
      submitted: 0,
      accepted: 0,
      returned: 0,
    };

    visibleDescriptions.forEach((description) => {
      result[description.status] += 1;
    });

    return result;
  }, [visibleDescriptions]);

  const filtered =
    statusFilter === "all"
      ? visibleDescriptions
      : visibleDescriptions.filter(
          (description) => description.status === statusFilter,
        );

  const canEdit = (description: PurchaseDescription): boolean =>
    isPurchaseDescriptionEditable(description) &&
    String(description.authorEmployeeId) === String(employeeId ?? "");

  const handleSendToKs = (description: PurchaseDescription) => {
    if (reviewerId === undefined || reviewerId === "") {
      setActionError(
        "В организации не назначен руководитель контрактной службы. Укажите состав КС в разделе «Контрактная служба» — после этого описание можно направить.",
      );

      return;
    }

    setActionError("");

    const total = purchaseDescriptionTotal(description);
    const task = {
      ...emptyTask(description.organizationId),
      title: `Проверить описание объекта закупки: ${description.title}`.slice(
        0,
        150,
      ),
      description: [
        `Инициатор: ${description.authorName || "—"}.`,
        description.structuralUnitName
          ? `Подразделение: ${description.structuralUnitName}.`
          : "",
        `ОКПД2: ${description.okpd2Code || "—"} ${
          description.okpd2Name || ""
        }.`.trim(),
        total > 0 ? `Смета: ${total.toLocaleString("ru-RU")} руб.` : "",
        "Проверить описание и поставить позицию в план-график.",
      ]
        .filter(Boolean)
        .join(" "),
      origin: "system" as const,
      functionCode: "purchase_description" as const,
      assigneeId: reviewerId,
      assigneeName: reviewer?.employeeFullName ?? "",
      assignedByEmployeeId: description.authorEmployeeId,
      assignedByName: description.authorName ?? "",
      dueDate: addDays(today(), PURCHASE_DESCRIPTION_REVIEW_DAYS),
    };

    createTask.mutate(task, {
      onSuccess: (created) => {
        updateDescription.mutate({
          id: description.id as string | number,
          status: "submitted",
          submittedAt: today(),
          taskId: created.id,
        });
      },
      onError: () => {
        setActionError(
          "Задача в контрактную службу не создана — описание осталось черновиком.",
        );
      },
    });
  };

  const handleDelete = (description: PurchaseDescription) => {
    if (
      !window.confirm(
        `Удалить описание «${description.title}»? Действие необратимо.`,
      )
    ) {
      return;
    }

    deleteDescription.mutate(description.id as string | number);
  };

  const roleBadge = isContractServiceMember
    ? "Работник контрактной службы"
    : isPurchaseInitiator
      ? PURCHASE_INITIATOR_ROLE
      : "Роль не определена";

  const roleHint = isContractServiceMember
    ? "Контрактная служба видит все описания организации: по задаче нужно проверить описание и поставить позицию в план-график."
    : isPurchaseInitiator
      ? PURCHASE_INITIATOR_ROLE_HINT
      : "Учётная запись не связана со штатным расписанием — описание нельзя привязать к инициатору. Обратитесь в отдел кадров.";

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>
            {isContractServiceMember
              ? "Описания объектов закупки"
              : "Мои описания объектов закупки"}
          </h1>
          <p className={block("subtitle")}>{roleHint}</p>
        </div>

        <div className={block("header-actions")}>
          <span
            className={block("role", [
              isContractServiceMember
                ? "service"
                : isPurchaseInitiator
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
            onClick={() => setModalDescription(null)}
          >
            + Новое описание
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
              {status === "all"
                ? "Все"
                : purchaseDescriptionStatusLabels[status]}
              <span className={block("chip-count")}>{counts[status]}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className={block("empty")}>Загрузка описаний…</p>
      ) : filtered.length === 0 ? (
        <p className={block("empty")}>
          {visibleDescriptions.length === 0
            ? "Описаний пока нет. Создайте черновик — его можно направить в контрактную службу, когда он будет готов."
            : "Нет описаний с выбранным статусом."}
        </p>
      ) : (
        <ul className={block("list")}>
          {filtered.map((description) => {
            const total = purchaseDescriptionTotal(description);
            const editable = canEdit(description);
            const isBusy =
              updateDescription.isPending &&
              String(updateDescription.variables?.id) ===
                String(description.id);

            return (
              <li className={block("card")} key={String(description.id)}>
                <div className={block("card-head")}>
                  <h2 className={block("card-title")}>{description.title}</h2>
                  <span
                    className={block("status", [description.status])}
                  >
                    {purchaseDescriptionStatusLabels[description.status]}
                  </span>
                </div>

                <dl className={block("meta")}>
                  <div className={block("meta-row")}>
                    <dt>Инициатор</dt>
                    <dd>
                      {description.authorName || "—"}
                      {description.structuralUnitName
                        ? ` · ${description.structuralUnitName}`
                        : ""}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>ОКПД2</dt>
                    <dd>
                      {description.okpd2Code
                        ? `${description.okpd2Code}${
                            description.okpd2Name
                              ? ` — ${description.okpd2Name}`
                              : ""
                          }`
                        : "не указан"}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Смета</dt>
                    <dd>
                      {total > 0
                        ? `${total.toLocaleString("ru-RU", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} ₽ · ${description.items.length} поз.`
                        : "не заполнена"}
                    </dd>
                  </div>
                  <div className={block("meta-row")}>
                    <dt>Создано</dt>
                    <dd>
                      {formatDate(description.createdAt) || "—"}
                      {description.submittedAt
                        ? ` · направлено ${formatDate(
                            description.submittedAt,
                          )}`
                        : ""}
                    </dd>
                  </div>
                  {description.reviewComment && (
                    <div className={block("meta-row")}>
                      <dt>Комментарий КС</dt>
                      <dd>{description.reviewComment}</dd>
                    </div>
                  )}
                </dl>

                {description.requirements && (
                  <p className={block("text")}>{description.requirements}</p>
                )}

                {description.justification && (
                  <p className={block("text", ["muted"])}>
                    Обоснование: {description.justification}
                  </p>
                )}

                <div className={block("card-actions")}>
                  {editable && (
                    <button
                      type="button"
                      className={block("action")}
                      onClick={() => setModalDescription(description)}
                    >
                      Редактировать
                    </button>
                  )}

                  {editable && (
                    <button
                      type="button"
                      className={block("action", ["primary"])}
                      disabled={isBusy || createTask.isPending}
                      onClick={() => handleSendToKs(description)}
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
                      onClick={() => handleDelete(description)}
                    >
                      Удалить
                    </button>
                  )}

                  {description.taskId && (
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

      {modalDescription !== undefined && (
        <PurchaseDescriptionModal
          organizationId={orgId ?? ""}
          author={{
            employeeId,
            employeeName,
            structuralUnitId: employee?.structuralUnitId,
            structuralUnitName,
          }}
          description={modalDescription}
          onClose={() => setModalDescription(undefined)}
        />
      )}
    </main>
  );
}
