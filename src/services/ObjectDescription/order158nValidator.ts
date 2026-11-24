import {
  contractServiceRoster,
  type ContractServiceRosterRow,
} from "../ContractService/contractService.config";
import { formatMoneyRu } from "../../shared/format";
import {
  contractServiceSizeWarning,
  type ContractService,
} from "../ContractService/contractService.schema";
import {
  getEmployeeEducations,
  hasProfileEducation,
  isDpoExpired,
  isDpoExpiringSoon,
  type EmployeeEducation,
} from "../ContractService/education.schema";
import { findOkpd2ByCode } from "../Okpd2Ref/okpd2Ref.api";
import type { Okpd2Ref } from "../Okpd2Ref/okpd2Ref.schema";
import {
  validateObjectDescriptionCompliance,
  type ObjectDescription,
} from "./objectDescription.schema";

/**
 * Валидатор соответствия описания объекта закупки (ООЗ) требованиям
 * Приказа Минфина России от 31.07.2020 № 158н «Об утверждении Типового
 * положения (регламента) о контрактной службе».
 */

export type Order158nCheckStatus = "pass" | "warning" | "fail";

export interface Order158nCheckItem {
  id: string;
  clause: string;
  title: string;
  status: Order158nCheckStatus;
  detail: string;
  actionTo?: string;
  actionLabel?: string;
}

export interface Order158nValidationReport {
  overallStatus: Order158nCheckStatus;
  passedCount: number;
  warningCount: number;
  failCount: number;
  checks: Order158nCheckItem[];
}

export interface Order158nValidationContext {
  contractService?: ContractService | null;
  educations?: EmployeeEducation[];
  okpd2Dictionary?: Okpd2Ref[];
}

const findDescriptionAssignees = (
  service: ContractService,
  roster: ContractServiceRosterRow[],
): ContractServiceRosterRow[] => {
  if (service.creationMethod === "contract_manager") {
    return roster;
  }
  return roster.filter((row) =>
    (row.functions ?? []).includes("purchase_description"),
  );
};

export const validateOrder158nCompliance = (
  desc: ObjectDescription,
  context: Order158nValidationContext,
): Order158nValidationReport => {
  const { contractService, educations = [], okpd2Dictionary = [] } = context;
  const checks: Order158nCheckItem[] = [];

  const roster = contractService ? contractServiceRoster(contractService) : [];

  // 1. П. 2.1, п. 2.2 — наличие контрактной службы / управляющего и численность ≥ 2
  if (!contractService) {
    checks.push({
      id: "p2_1_p2_2",
      clause: "п. 2.1, п. 2.2",
      title: "Контрактная служба / контрактный управляющий и штатная численность",
      status: "fail",
      detail:
        "У организации не оформлена контрактная служба или контрактный управляющий — некому осуществлять полномочия по описанию объекта закупки.",
      actionTo: "/contract-service",
      actionLabel: "Оформить КС",
    });
  } else {
    const headcount =
      contractService.creationMethod === "structural_unit"
        ? Math.max(roster.length, 1)
        : roster.length;
    const sizeWarn = contractServiceSizeWarning(
      headcount,
      contractService.creationMethod,
    );

    if (
      contractService.creationMethod === "employees" &&
      sizeWarn
    ) {
      checks.push({
        id: "p2_1_p2_2",
        clause: "п. 2.1, п. 2.2",
        title: "Контрактная служба / контрактный управляющий и штатная численность",
        status: "warning",
        detail: sizeWarn,
        actionTo: "/contract-service",
        actionLabel: "Проверить состав КС",
      });
    } else if (contractService.creationMethod === "structural_unit") {
      checks.push({
        id: "p2_1_p2_2",
        clause: "п. 2.1, п. 2.2",
        title: "Контрактная служба / контрактный управляющий и штатная численность",
        status: "pass",
        detail: `Создано структурное подразделение «${contractService.structuralUnitName || "Контрактная служба"}».`,
      });
    } else {
      checks.push({
        id: "p2_1_p2_2",
        clause: "п. 2.1, п. 2.2",
        title: "Контрактная служба / контрактный управляющий и штатная численность",
        status: "pass",
        detail:
          contractService.creationMethod === "contract_manager"
            ? "Назначен контрактный управляющий (ч. 21 ст. 38 44-ФЗ)."
            : `Сформирована контрактная служба без выделения подразделения (численность: ${roster.length} чел.).`,
      });
    }
  }

  // 2. П. 2.4, п. 3.2.2.2 — распределение функции «Описание объекта закупки» и составитель
  const assignees = contractService
    ? findDescriptionAssignees(contractService, roster)
    : [];

  if (!contractService) {
    checks.push({
      id: "p2_4_p3_2_2_2",
      clause: "п. 2.4, п. 3.2.2.2",
      title: "Распределение функции описания объекта закупки и ответственный составитель",
      status: "fail",
      detail:
        "Без сведений о контрактной службе невозможно подтвердить закрепление полномочия по п. 3.2.2.2 за исполнителем.",
      actionTo: "/contract-service",
      actionLabel: "Настроить функции КС",
    });
  } else if (
    contractService.creationMethod !== "structural_unit" &&
    assignees.length === 0
  ) {
    checks.push({
      id: "p2_4_p3_2_2_2",
      clause: "п. 2.4, п. 3.2.2.2",
      title: "Распределение функции описания объекта закупки и ответственный составитель",
      status: "warning",
      detail:
        "В приказе о контрактной службе ни за одним работником не закреплена функция «Описание объекта закупки» (Раздел III).",
      actionTo: "/contract-service",
      actionLabel: "Назначить функцию",
    });
  } else if (!desc.authorName?.trim()) {
    checks.push({
      id: "p2_4_p3_2_2_2",
      clause: "п. 2.4, п. 3.2.2.2",
      title: "Распределение функции описания объекта закупки и ответственный составитель",
      status: "warning",
      detail:
        "Функция в КС распределена, но в самом документе ООЗ не указан составитель (персональная ответственность по п. 3.2.2.2).",
    });
  } else {
    const names = assignees
      .map((a) => a.employeeFullName)
      .filter(Boolean)
      .join(", ");
    checks.push({
      id: "p2_4_p3_2_2_2",
      clause: "п. 2.4, п. 3.2.2.2",
      title: "Распределение функции описания объекта закупки и ответственный составитель",
      status: "pass",
      detail: names
        ? `Функция закреплена (${names}); составитель ООЗ — ${desc.authorName}.`
        : `Подразделение службы определено; составитель ООЗ — ${desc.authorName}.`,
    });
  }

  // 3. П. 2.5 — высшее или ДПО в сфере закупок у ответственных за ООЗ
  const checkStaff = assignees.length > 0 ? assignees : roster;
  const staffWithIds = checkStaff.filter(
    (row) => row.employeeId !== undefined && row.employeeId !== "",
  );

  if (!contractService || staffWithIds.length === 0) {
    checks.push({
      id: "p2_5_education",
      clause: "п. 2.5",
      title: "Профессиональное образование исполнителей в сфере закупок",
      status: "warning",
      detail:
        "Невозможно проверить соответствие по образованию (высшее / ДПО в сфере закупок): не привязаны работники штатки в КС.",
      actionTo: "/contract-service",
      actionLabel: "Проверить образование",
    });
  } else {
    const expiredNames: string[] = [];
    const missingNames: string[] = [];
    const expiringNames: string[] = [];

    staffWithIds.forEach((row) => {
      const empEdus = getEmployeeEducations(educations, row.employeeId!);
      const label = row.employeeFullName || `Таб. ${row.employeeNumber || row.employeeId}`;

      if (!hasProfileEducation(empEdus)) {
        missingNames.push(label);
      } else if (empEdus.some((e) => e.type === "dpo") && empEdus.filter((e) => e.type === "dpo").every(isDpoExpired)) {
        expiredNames.push(label);
      } else if (empEdus.some(isDpoExpiringSoon)) {
        expiringNames.push(label);
      }
    });

    if (expiredNames.length > 0) {
      checks.push({
        id: "p2_5_education",
        clause: "п. 2.5",
        title: "Профессиональное образование исполнителей в сфере закупок",
        status: "fail",
        detail: `Срок действия ДПО истёк у ответственных за ООЗ: ${expiredNames.join(", ")}. По п. 2.5 работник должен обновить квалификацию.`,
        actionTo: "/account/profile",
        actionLabel: "Заявка на обучение",
      });
    } else if (missingNames.length > 0 || expiringNames.length > 0) {
      const parts: string[] = [];
      if (missingNames.length > 0) {
        parts.push(`нет профильного образования/сведений у: ${missingNames.join(", ")}`);
      }
      if (expiringNames.length > 0) {
        parts.push(`истекает ДПО у: ${expiringNames.join(", ")}`);
      }
      checks.push({
        id: "p2_5_education",
        clause: "п. 2.5",
        title: "Профессиональное образование исполнителей в сфере закупок",
        status: "warning",
        detail: `Требуется внимание кадровой службы: ${parts.join("; ")}.`,
        actionTo: "/account/profile",
        actionLabel: "Проверить в ЛК",
      });
    } else {
      checks.push({
        id: "p2_5_education",
        clause: "п. 2.5",
        title: "Профессиональное образование исполнителей в сфере закупок",
        status: "pass",
        detail: `У ответственных работников (${staffWithIds.length} чел.) подтверждено действующее профильное образование в сфере закупок.`,
      });
    }
  }

  // 4. П. 2.3, п. 2.4 — руководство КС и утверждение документа ООЗ
  if (contractService && !contractService.headOrderNumber && contractService.creationMethod !== "contract_manager") {
    checks.push({
      id: "p2_3_approval",
      clause: "п. 2.3, п. 2.4",
      title: "Утверждение ООЗ руководителем КС / контрактным управляющим",
      status: "warning",
      detail:
        "В карточке КС не указан номер приказа о назначении руководителя службы (п. 2.3), и ООЗ требует утверждения.",
      actionTo: "/contract-service",
      actionLabel: "Карточка КС",
    });
  } else if (desc.status !== "approved") {
    checks.push({
      id: "p2_3_approval",
      clause: "п. 2.3, п. 2.4",
      title: "Утверждение ООЗ руководителем КС / контрактным управляющим",
      status: "warning",
      detail:
        "Документ ещё не утверждён руководителем КС / контрактным управляющим — перед включением в извещение переведите статус в «Утверждено».",
    });
  } else if (!desc.approvedByName?.trim()) {
    checks.push({
      id: "p2_3_approval",
      clause: "п. 2.3, п. 2.4",
      title: "Утверждение ООЗ руководителем КС / контрактным управляющим",
      status: "warning",
      detail:
        "Статус «Утверждено», но не заполнено должностное лицо, утвердившее описание объекта закупки.",
    });
  } else {
    checks.push({
      id: "p2_3_approval",
      clause: "п. 2.3, п. 2.4",
      title: "Утверждение ООЗ руководителем КС / контрактным управляющим",
      status: "pass",
      detail: `Документ утверждён: ${desc.approvedByName}${desc.approvedDate ? ` (${desc.approvedDate})` : ""}.`,
    });
  }

  // 5. П. 3.1.4 — нормирование по ст. 19 44-ФЗ и ПП РФ N 926
  const matchedOkpd2 = findOkpd2ByCode(okpd2Dictionary, desc.okpd2Code);
  if (matchedOkpd2?.isNormed) {
    const hasNormingProps = desc.characteristics.some(
      (c) =>
        c.category === "consumer" ||
        c.category === "quality" ||
        c.category === "functional",
    );
    const limitNote =
      matchedOkpd2.normLimit !== undefined
        ? ` Предельная цена единицы по нормированию: ${formatMoneyRu(matchedOkpd2.normLimit)}.`
        : "";

    if (!hasNormingProps) {
      checks.push({
        id: "p3_1_4_norming",
        clause: "п. 3.1.4",
        title: "Соблюдение требований нормирования (ст. 19 44-ФЗ, ПП РФ N 926)",
        status: "fail",
        detail: `Код ОКПД2 ${matchedOkpd2.code} подлежит обязательному нормированию, но в ООЗ не заполнены потребительские, качественные или функциональные свойства.${limitNote}`,
      });
    } else {
      checks.push({
        id: "p3_1_4_norming",
        clause: "п. 3.1.4",
        title: "Соблюдение требований нормирования (ст. 19 44-ФЗ, ПП РФ N 926)",
        status: "pass",
        detail: `Обязательные свойства нормируемого кода ОКПД2 ${matchedOkpd2.code} описаны.${limitNote}`,
      });
    }
  } else {
    checks.push({
      id: "p3_1_4_norming",
      clause: "п. 3.1.4",
      title: "Соблюдение требований нормирования (ст. 19 44-ФЗ, ПП РФ N 926)",
      status: "pass",
      detail: desc.okpd2Code
        ? `Код ОКПД2 ${desc.okpd2Code} не относится к перечню обязательного нормирования.`
        : "Укажите код ОКПД2 для проверки на обязательное нормирование.",
    });
  }

  // 6. П. 3.2.2.2 — полнота структурированного ООЗ, ст. 33 44-ФЗ и ПП РФ N 145
  const structuralIssues = validateObjectDescriptionCompliance(desc);
  const hardErrors = structuralIssues.filter((i) => i.level === "error");
  const missingMeasures =
    !desc.okpd2Code.trim() ||
    (!desc.isIndeterminateVolume && (!desc.unit?.trim() || !desc.quantity?.trim()));

  if (hardErrors.length > 0) {
    checks.push({
      id: "p3_2_2_2_structure",
      clause: "п. 3.2.2.2",
      title: "Полнота структурированного описания объекта (ст. 33 44-ФЗ, ПП N 145)",
      status: "fail",
      detail: hardErrors.map((e) => e.message).join(" "),
    });
  } else if (desc.characteristics.length === 0) {
    // Отсутствие характеристик — предупреждение по ст. 33 и правилам КТРУ,
    // но не основание блокировать сохранение ООЗ (требование заказчика).
    checks.push({
      id: "p3_2_2_2_structure",
      clause: "п. 3.2.2.2",
      title: "Полнота структурированного описания объекта (ст. 33 44-ФЗ, ПП N 145)",
      status: "warning",
      detail:
        "Не добавлено ни одной характеристики: ст. 33 44-ФЗ требует описания объекта, а при применении КТРУ показатели обязательны (ПП РФ N 145). Добавьте показатели, но это не блокирует сохранение.",
    });
  } else if (missingMeasures) {
    checks.push({
      id: "p3_2_2_2_structure",
      clause: "п. 3.2.2.2",
      title: "Полнота структурированного описания объекта (ст. 33 44-ФЗ, ПП N 145)",
      status: "warning",
      detail:
        "Характеристики заполнены, но рекомендуется указать единицу измерения и количество (либо отметить ч. 24 ст. 22) для бесшовной передачи в извещение.",
    });
  } else {
    checks.push({
      id: "p3_2_2_2_structure",
      clause: "п. 3.2.2.2",
      title: "Полнота структурированного описания объекта (ст. 33 44-ФЗ, ПП N 145)",
      status: "pass",
      detail: `Заполнено характеристик: ${desc.characteristics.length}, стандартов: ${desc.standards.length}; нарушений ст. 33 и Правил КТРУ (ПП 145) не выявлено.`,
    });
  }

  // 7. П. 2.6 — недопущение ограничений конкуренции и защита от обжалования
  const needsInstruction = structuralIssues.some(
    (i) => i.code === "INSTRUCTION_RECOMMENDED",
  );
  if (!desc.noRestrictionDeclaration || needsInstruction) {
    const hints: string[] = [];
    if (!desc.noRestrictionDeclaration) {
      hints.push(
        "не отмечена декларация отсутствия требований, ограничивающих количество участников закупки",
      );
    }
    if (needsInstruction) {
      hints.push(
        "при диапазонных/вариативных характеристиках требуется инструкция по заполнению заявки",
      );
    }
    checks.push({
      id: "p2_6_competition",
      clause: "п. 2.6",
      title: "Защита от рисков обжалования и ограничения конкуренции",
      status: "warning",
      detail: `По п. 2.6 действия должностных лиц КС могут быть обжалованы по гл. 6 44-ФЗ: ${hints.join("; ")}.`,
    });
  } else {
    checks.push({
      id: "p2_6_competition",
      clause: "п. 2.6",
      title: "Защита от рисков обжалования и ограничения конкуренции",
      status: "pass",
      detail:
        "Декларация отсутствия ограничений конкуренции подтверждена, требования к заявке определены.",
    });
  }

  const failCount = checks.filter((c) => c.status === "fail").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const passedCount = checks.filter((c) => c.status === "pass").length;

  const overallStatus: Order158nCheckStatus =
    failCount > 0 ? "fail" : warningCount > 0 ? "warning" : "pass";

  return {
    overallStatus,
    passedCount,
    warningCount,
    failCount,
    checks,
  };
};
