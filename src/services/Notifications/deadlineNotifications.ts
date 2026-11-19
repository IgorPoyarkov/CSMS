import type {
  ContractPayment,
  ContractRegistryItem,
  ContractStage,
} from "../ContractRegistry/contractRegistry.schema";
import type { ContractProject } from "../ContractProject/contractProject.schema";
import type { Procurement } from "../Procurements/procurement.schema";
import type { Task } from "../Tasks/tasks.schema";

/**
 * Система уведомлений о приближении сроков исполнения контрактов и этапов закупок
 * для предотвращения штрафных санкций по 44-ФЗ и КоАП РФ.
 */

export type NotificationSeverity = "critical" | "warning" | "info";
export type NotificationCategory =
  | "contract"
  | "stage"
  | "payment"
  | "procurement"
  | "task";

export interface ProcurementDeadlineAlert {
  id: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  title: string;
  description: string;
  entityNumber?: string;
  entityName?: string;
  dueDate?: string;
  daysRemaining: number | null;
  penaltyRisk44Fz: string;
  recommendation: string;
  linkTo: string;
}

export interface NotificationSummaryStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
}

const DAY_MS = 86_400_000;

const parseIsoDate = (dateStr?: string): number | null => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  const ts = Date.parse(`${dateStr}T00:00:00Z`);
  return Number.isFinite(ts) ? ts : null;
};

export const diffDaysIso = (
  targetDate: string | undefined,
  todayIso: string,
): number | null => {
  const targetTs = parseIsoDate(targetDate);
  const todayTs = parseIsoDate(todayIso);
  if (targetTs === null || todayTs === null) {
    return null;
  }
  return Math.round((targetTs - todayTs) / DAY_MS);
};

export const addWorkingDaysIso = (
  startDate: string,
  workingDays: number,
): string | null => {
  const startTs = parseIsoDate(startDate);
  if (startTs === null) return null;
  const cursor = new Date(startTs);
  let added = 0;
  while (added < workingDays) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }
  return cursor.toISOString().slice(0, 10);
};

const severityRank: Record<NotificationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export interface BuildNotificationsInput {
  todayIso: string;
  contracts: ContractRegistryItem[];
  stages: ContractStage[];
  payments: ContractPayment[];
  contractProjects: ContractProject[];
  procurements: Procurement[];
  tasks: Task[];
}

export const buildProcurementNotifications = ({
  todayIso,
  contracts,
  stages,
  payments,
  contractProjects,
  procurements,
  tasks,
}: BuildNotificationsInput): ProcurementDeadlineAlert[] => {
  const alerts: ProcurementDeadlineAlert[] = [];
  const orgContractMap = new Map<string, ContractRegistryItem>();

  for (const contract of contracts) {
    if (contract.id !== undefined) {
      orgContractMap.set(String(contract.id), contract);
    }

    const isClosed =
      contract.status === "completed" || contract.status === "terminated";

    // 1. Контроль окончания срока исполнения контракта
    if (!isClosed && contract.executionEndDate) {
      const days = diffDaysIso(contract.executionEndDate, todayIso);
      if (days !== null && days <= 30) {
        const isOverdue = days < 0;
        alerts.push({
          id: `contract-end-${contract.id ?? contract.contractNumber}`,
          severity: isOverdue ? "critical" : days <= 10 ? "warning" : "info",
          category: "contract",
          title: isOverdue
            ? `Просрочен срок исполнения контракта № ${contract.contractNumber}`
            : `Приближается срок завершения контракта № ${contract.contractNumber}`,
          description: isOverdue
            ? `Истёк на ${Math.abs(days)} дн. (плановая дата ${contract.executionEndDate}). Контрагент: ${contract.supplierName}.`
            : `До окончания срока исполнения осталось ${days} дн. (${contract.executionEndDate}). Контрагент: ${contract.supplierName}.`,
          entityNumber: contract.contractNumber,
          entityName: contract.contractName,
          dueDate: contract.executionEndDate,
          daysRemaining: days,
          penaltyRisk44Fz:
            "ч. 6–8 ст. 34 44-ФЗ, ПП РФ № 1042: заказчик обязан направить требование об уплате пени (≥ 1/300 ставки ЦБ РФ) либо штрафа",
          recommendation:
            "Проверьте акты приёмки, направьте претензию подрядчику или оформите допсоглашение/расторжение по ст. 95.",
          linkTo: "/contract-registry",
        });
      }
    }

    // 2. Контроль срока направления сведений в реестр контрактов ЕИС (3 раб. дня)
    if (contract.contractDate && !contract.eisPublishDate && !isClosed) {
      const eisDue = addWorkingDaysIso(contract.contractDate, 3);
      const days = eisDue ? diffDaysIso(eisDue, todayIso) : null;
      if (days !== null && days <= 5) {
        alerts.push({
          id: `contract-eis-${contract.id ?? contract.contractNumber}`,
          severity: days < 0 ? "critical" : "warning",
          category: "contract",
          title:
            days < 0
              ? `Просрочена публикация сведений в ЕИС по контракту № ${contract.contractNumber}`
              : `Срок направления сведений в ЕИС по контракту № ${contract.contractNumber}`,
          description: `Контракт заключён ${contract.contractDate}, дата публикации в ЕИС не заполнена (регламентный срок до ${eisDue}).`,
          entityNumber: contract.contractNumber,
          entityName: contract.contractName,
          dueDate: eisDue ?? undefined,
          daysRemaining: days,
          penaltyRisk44Fz:
            "ч. 3 ст. 103 44-ФЗ, ст. 7.31 КоАП РФ: штраф на должностное лицо до 20 000 ₽ за нарушение 3-дневного срока",
          recommendation:
            "Передайте сведения о заключённом контракте в реестр контрактов ЕИС через Казначейство.",
          linkTo: "/contract-registry",
        });
      }
    }
  }

  // 3. Контроль сроков этапов исполнения контрактов
  for (const stage of stages) {
    const parentContract = orgContractMap.get(String(stage.contractId ?? ""));
    if (!parentContract) continue;
    if (
      parentContract.status === "completed" ||
      parentContract.status === "terminated"
    ) {
      continue;
    }

    if (stage.status !== "completed" && stage.endDate) {
      const days = diffDaysIso(stage.endDate, todayIso);
      if (stage.status === "delayed" || (days !== null && days <= 14)) {
        const isOverdue = stage.status === "delayed" || (days ?? 0) < 0;
        alerts.push({
          id: `stage-due-${stage.id ?? `${parentContract.id}-${stage.stageNumber}`}`,
          severity: isOverdue
            ? "critical"
            : (days ?? 99) <= 5
              ? "warning"
              : "info",
          category: "stage",
          title: isOverdue
            ? `Просрочен этап ${stage.stageNumber} контракта № ${parentContract.contractNumber}`
            : `Завершается этап ${stage.stageNumber} контракта № ${parentContract.contractNumber}`,
          description: `«${stage.name}» — срок этапа ${stage.endDate}${
            days !== null
              ? days < 0
                ? ` (просрочка ${Math.abs(days)} дн.)`
                : ` (осталось ${days} дн.)`
              : ""
          }.`,
          entityNumber: `${parentContract.contractNumber} / Этап ${stage.stageNumber}`,
          entityName: stage.name,
          dueDate: stage.endDate,
          daysRemaining: days,
          penaltyRisk44Fz:
            "ч. 7 ст. 34 44-ФЗ: начисление пеней за нарушение промежуточных сроков исполнения этапов контракта",
          recommendation:
            "Инициируйте приёмку по ст. 94 44-ФЗ либо зафиксируйте просрочку в журнале неустоек.",
          linkTo: "/contract-registry",
        });
      }
    }

    // Принятый этап без полной оплаты -> риск нарушения ч. 13.1 ст. 34 (7 рабочих дней)
    const stageAmount = Number.parseFloat(stage.amount ?? "0");
    const stagePaid = Number.parseFloat(stage.paidAmount ?? "0");
    if (
      stage.status === "completed" &&
      stage.acceptanceActDate &&
      Number.isFinite(stageAmount) &&
      stageAmount > (Number.isFinite(stagePaid) ? stagePaid : 0) + 0.01
    ) {
      const payDue = addWorkingDaysIso(stage.acceptanceActDate, 7);
      const days = payDue ? diffDaysIso(payDue, todayIso) : null;
      if (days !== null && days <= 14) {
        alerts.push({
          id: `stage-unpaid-${stage.id ?? `${parentContract.id}-${stage.stageNumber}`}`,
          severity: days <= 2 ? "critical" : "warning",
          category: "payment",
          title: `Требуется оплата принятого этапа ${stage.stageNumber} (контракт № ${parentContract.contractNumber})`,
          description: `Акт ${stage.acceptanceActNumber || "приёмки"} от ${stage.acceptanceActDate}; к оплате ${(stageAmount - stagePaid).toLocaleString("ru-RU")} ₽, предельный срок оплаты ${payDue}.`,
          entityNumber: parentContract.contractNumber,
          entityName: stage.name,
          dueDate: payDue ?? undefined,
          daysRemaining: days,
          penaltyRisk44Fz:
            "ч. 13.1 ст. 34 44-ФЗ, ст. 7.32.5 КоАП РФ: нарушение 7-дневного срока оплаты грозит штрафом 30 000–50 000 ₽ на должностное лицо",
          recommendation:
            "Направьте платёжное поручение в Федеральное казначейство для своевременной оплаты.",
          linkTo: "/contract-registry",
        });
      }
    }
  }

  // 4. Контроль запланированных и отклонённых платежей
  for (const payment of payments) {
    const parentContract = orgContractMap.get(String(payment.contractId ?? ""));
    if (!parentContract) continue;

    if (payment.status === "rejected") {
      alerts.push({
        id: `payment-rejected-${payment.id ?? parentContract.id}`,
        severity: "critical",
        category: "payment",
        title: `Отклонён платёж по контракту № ${parentContract.contractNumber}`,
        description: `Платёжный документ ${payment.paymentDocumentNumber || "б/н"} на сумму ${Number(payment.amount).toLocaleString("ru-RU")} ₽ отклонён.`,
        entityNumber: parentContract.contractNumber,
        entityName: parentContract.contractName,
        dueDate: payment.paymentDate || todayIso,
        daysRemaining: payment.paymentDate
          ? diffDaysIso(payment.paymentDate, todayIso)
          : 0,
        penaltyRisk44Fz:
          "ч. 5 ст. 34 44-ФЗ, ст. 7.32.5 КоАП РФ: задержка оплаты влечёт пени 1/300 ключевой ставки ЦБ РФ на заказчика и штраф по КоАП",
        recommendation:
          "Устраните замечания Казначейства/бухгалтерии и повторно проведите платёж.",
        linkTo: "/contract-registry",
      });
      continue;
    }

    if (
      (payment.status === "scheduled" || payment.status === "sent") &&
      payment.paymentDate
    ) {
      const days = diffDaysIso(payment.paymentDate, todayIso);
      if (days !== null && days <= 14) {
        alerts.push({
          id: `payment-due-${payment.id ?? `${parentContract.id}-${payment.paymentDocumentNumber}`}`,
          severity: days < 0 ? "critical" : days <= 3 ? "warning" : "info",
          category: "payment",
          title:
            days < 0
              ? `Просрочен платёж по контракту № ${parentContract.contractNumber}`
              : `Запланирован платёж по контракту № ${parentContract.contractNumber}`,
          description: `Документ ${payment.paymentDocumentNumber || "—"} от ${payment.paymentDate} на ${Number(payment.amount).toLocaleString("ru-RU")} ₽ (${payment.status === "sent" ? "отправлен в казначейство" : "в графике"}).`,
          entityNumber: parentContract.contractNumber,
          entityName: parentContract.contractName,
          dueDate: payment.paymentDate,
          daysRemaining: days,
          penaltyRisk44Fz:
            "ч. 13.1 ст. 34 44-ФЗ: несоблюдение сроков оплаты контракта (7 / 10 рабочих дней)",
          recommendation:
            "Проконтролируйте прохождение платежа и обновите статус оплаты в реестре контрактов.",
          linkTo: "/contract-registry",
        });
      }
    }
  }

  // 5. Контроль сроков заключения проектов контрактов и закупок на стадии подведения итогов
  for (const project of contractProjects) {
    if (project.status === "signed" || project.status === "terminated") {
      continue;
    }

    if (project.conclusionDate) {
      const days = diffDaysIso(project.conclusionDate, todayIso);
      if (days !== null && days <= 10) {
        alerts.push({
          id: `project-conclusion-${project.id ?? project.ikz}`,
          severity: days < 0 ? "critical" : days <= 3 ? "warning" : "info",
          category: "procurement",
          title:
            days < 0
              ? `Просрочена дата подписания контракта «${project.contractName}»`
              : `Срок подписания проекта контракта «${project.contractName}»`,
          description: `Плановая дата заключения: ${project.conclusionDate}${
            project.protocolOfDisagreements
              ? " (активен протокол разногласий — ч. 4 ст. 51: 4 рабочих дня на рассмотрение)"
              : ""
          }.`,
          entityNumber: project.ikz || project.noticeNumber,
          entityName: project.contractName,
          dueDate: project.conclusionDate,
          daysRemaining: days,
          penaltyRisk44Fz:
            "ст. 51 44-ФЗ, ст. 7.32 КоАП РФ: нарушение порядка и сроков заключения контракта (штраф до 50 000 ₽)",
          recommendation:
            "Проверьте проект контракта на риски 44-ФЗ и завершите подписание со стороны заказчика.",
          linkTo: project.procurementId
            ? `/procurement-processing/${project.procurementId}/contract-project`
            : "/procurement-processing",
        });
      }
    }
  }

  // Извещения без заведённого проекта контракта
  const projectProcIds = new Set(
    contractProjects.map((p) => String(p.procurementId ?? "")).filter(Boolean),
  );
  const projectIkzSet = new Set(
    contractProjects.map((p) => p.ikz).filter(Boolean),
  );
  for (const proc of procurements) {
    if (
      proc.noticeNumber &&
      !projectProcIds.has(String(proc.id)) &&
      !projectIkzSet.has(proc.ikz)
    ) {
      alerts.push({
        id: `procurement-no-contract-${proc.id}`,
        severity: "info",
        category: "procurement",
        title: `Размещено извещение без проекта контракта (${proc.noticeNumber})`,
        description: `По закупке «${proc.name}» (ИКЗ ${proc.ikz}) не сформирован проект контракта.`,
        entityNumber: proc.noticeNumber,
        entityName: proc.name,
        dueDate: undefined,
        daysRemaining: null,
        penaltyRisk44Fz:
          "ч. 2 ст. 51 44-ФЗ: проект контракта размещается не позднее 2 рабочих дней со дня размещения итогового протокола",
        recommendation:
          "Перейдите в карточку закупки и сформируйте проект контракта с автоматической проверкой рисков.",
        linkTo: `/procurement-processing/${proc.id}/contract-project`,
      });
    }
  }

  // 6. Контроль регламентированных задач КС по Приказу № 158н
  for (const task of tasks) {
    if (task.status === "completed" || !task.dueDate) continue;
    const days = diffDaysIso(task.dueDate, todayIso);
    if (days !== null && days <= 10) {
      alerts.push({
        id: `task-due-${task.id ?? task.title}`,
        severity: days < 0 ? "critical" : days <= 3 ? "warning" : "info",
        category: "task",
        title:
          days < 0
            ? `Просрочена задача КС: «${task.title}»`
            : `Приближается срок задачи КС: «${task.title}»`,
        description: `Исполнитель: ${task.assigneeName || "не указан"}. Срок: ${task.dueDate}${
          task.order158nClause ? ` (${task.order158nClause})` : ""
        }.`,
        entityNumber: task.order158nPoolCode || undefined,
        entityName: task.title,
        dueDate: task.dueDate,
        daysRemaining: days,
        penaltyRisk44Fz:
          task.legalBasis ||
          "Приказ Минфина № 158н: персональная ответственность работника КС за нарушение сроков функций раздела III",
        recommendation:
          "Откройте карточку задачи, отметьте выполненные шаги либо перераспределите нагрузку.",
        linkTo: task.id ? `/tasks/${task.id}` : "/tasks",
      });
    }
  }

  return alerts.sort((a, b) => {
    const sevDiff = severityRank[a.severity] - severityRank[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const daysA = a.daysRemaining ?? 9999;
    const daysB = b.daysRemaining ?? 9999;
    return daysA - daysB;
  });
};

export const summarizeNotifications = (
  alerts: ProcurementDeadlineAlert[],
): NotificationSummaryStats =>
  alerts.reduce<NotificationSummaryStats>(
    (acc, item) => {
      acc.total += 1;
      acc[item.severity] += 1;
      return acc;
    },
    { total: 0, critical: 0, warning: 0, info: 0 },
  );
