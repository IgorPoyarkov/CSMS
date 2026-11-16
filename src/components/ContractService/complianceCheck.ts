import { useOrganizationEducations } from "../../services/ContractService/education.api";
import { useOrganizationTasks } from "../../services/Tasks/tasks.api";
import {
  getEducationStatus,
  educationWarning,
  contractServiceRoster,
} from "../../components/ContractService/contractService.config";
import type { ContractService } from "../../services/ContractService/contractService.schema";
import type { EmployeeEducation } from "../../services/ContractService/education.schema";
import type { Task } from "../../services/Tasks/tasks.schema";

export interface ComplianceCheckRow {
  employeeId: string | number;
  employeeFullName: string;
  role: string;
  educations: EmployeeEducation[];
  hasProfile: boolean;
  hasDpo: boolean;
  dpoExpired: boolean;
  dpoExpiringSoon: boolean;
  warning: string | null;
  needsReplacement: boolean;
}

/**
 * Проверяет соответствие работников контрактной службы требованиям п. 2.5
 * Типового положения. Если не соответствует — по п. 2.6 работник должен быть
 * заменён, и руководителю ставится задача на замену.
 */
export const useComplianceCheck = (
  organizationId: string | number | undefined,
  contractService: ContractService | undefined,
) => {
  const { data: educations } = useOrganizationEducations(organizationId);
  const { data: tasks } = useOrganizationTasks(organizationId);

  const roster = contractService ? contractServiceRoster(contractService) : [];

  // Группируем образование по employeeId
  const eduByEmployee = new Map<string, EmployeeEducation[]>();

  for (const edu of educations ?? []) {
    const key = String(edu.employeeId);
    const list = eduByEmployee.get(key) ?? [];

    list.push(edu);
    eduByEmployee.set(key, list);
  }

  // Формируем строки проверки
  const rows: ComplianceCheckRow[] = [];

  for (const member of roster) {
    if (!member.employeeId) continue;

    const empEdu = eduByEmployee.get(String(member.employeeId)) ?? [];
    const status = getEducationStatus(empEdu);
    const warning = educationWarning(status);

    // needsReplacement: нет профильного образования ИЛИ ДПО истёк
    const needsReplacement = !status.hasProfile || status.dpoExpired;

    rows.push({
      employeeId: member.employeeId,
      employeeFullName: member.employeeFullName ?? "",
      role: member.role,
      educations: empEdu,
      hasProfile: status.hasProfile,
      hasDpo: status.hasDpo,
      dpoExpired: status.dpoExpired,
      dpoExpiringSoon: status.dpoExpiringSoon,
      warning,
      needsReplacement,
    });
  }

  // Есть ли уже открытая задача на замену этого сотрудника?
  const replacementTaskExists = (employeeId: string | number): boolean => {
    if (!tasks) return false;

    return tasks.some(
      (task) =>
        String(task.assigneeId) === String(employeeId) &&
        task.title.toLowerCase().includes("замена") &&
        task.status !== "completed",
    );
  };

  // Собираем незакрытые задачи на замену по п. 2.6
  const pendingReplacements: Task[] = (tasks ?? []).filter(
    (task) =>
      task.title.toLowerCase().includes("замена") &&
      task.status !== "completed",
  );

  return {
    rows,
    replacementTaskExists,
    pendingReplacements,
    needsAttention: rows.filter((r) => r.needsReplacement),
  };
};

// Кнопка «Создать задачу на замену» — использует существующую форму задачи
export const replacementTaskTitle = (employeeFullName: string): string =>
  `Замена работника КС: ${employeeFullName} (п. 2.6)`;

export const replacementTaskDescription = (
  employeeFullName: string,
  warning: string,
): string =>
  `Работник ${employeeFullName} не соответствует требованиям п. 2.5 Типового положения: ${warning}. По п. 2.6 должен быть заменён на соответствующего сотрудника.`;
