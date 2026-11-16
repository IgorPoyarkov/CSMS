import type { ConfigurationInput } from "../UI/CustomInput";
import type {
  ContractService,
  ContractServiceCreationMethod,
  ContractServiceFunction,
} from "../../services/ContractService/contractService.schema";
import {
  contractServiceStaff,
  MIN_CONTRACT_SERVICE_SIZE,
} from "../../services/ContractService/contractService.schema";
import type { BaseEmployee } from "../../services/StaffingTable/StaffingTable.schema";
import type { EmployeeEducation } from "../../services/ContractService/education.schema";

// Человекочитаемые названия функций раздела III Типового положения
export const functionLabels: Record<ContractServiceFunction, string> = {
  planning: "1. Планирование",
  purchase_description: "2. Описание объекта закупки",
  supplier_determination: "3. Определение поставщика",
  contract_conclusion: "4. Заключение контракта",
  contract_execution: "5. Исполнение контракта",
};

// Ключевые слова, указывающие на профильное образование в сфере закупок
const PROFILE_EDUCATION_KEYWORDS = [
  "закупк",
  "44-фз",
  "223-фз",
  "контрактн",
  "гос",
];

export interface Option<TValue extends string> {
  value: TValue;
  label: string;
}

// Способы создания контрактной службы — п. 2.1 Типового положения
// (регламента), утв. приказом Минфина России от 31.07.2020 N 158н.
// Подсказка и основание показываются при выборе, чтобы контрактный
// управляющий не выбирал способ «наугад».
export interface CreationMethodOption extends Option<ContractServiceCreationMethod> {
  hint: string;
  legalBasis: string;
}

export const contractServiceCreationMethodOptions: CreationMethodOption[] = [
  {
    value: "structural_unit",
    label: "Контрактная служба — структурное подразделение заказчика",
    hint: "Выберите одно подразделение из штатного расписания: все его работники ведут закупки в пределах своих должностных обязанностей.",
    legalBasis:
      "п. 2.1 Типового положения, приказ Минфина России от 31.07.2020 N 158н",
  },
  {
    value: "employees",
    label: "Контрактная служба сформирована из работников заказчика",
    hint: "Выберите работников из структурных подразделений заказчика и наденьте их функциями и полномочиями по разделу III Типового положения.",
    legalBasis:
      "п. 2.1-2.3 Типового положения, приказ Минфина России от 31.07.2020 N 158н",
  },
  {
    value: "contract_manager",
    label:
      "Контрактная служба не создаётся — закупки ведёт контрактный управляющий",
    hint: "Назначается приказом руководителя заказчика один работник. Правомерно при совокупном годовом объёме закупок не более 100 млн руб.",
    legalBasis: "ч. 21 ст. 38 Закона N 44-ФЗ",
  },
];

// Функции и полномочия — раздел III Типового положения. Формулировки
// укрупнены по пунктам 3.1-3.5: конкретные действия внутри пункта
// наделяются приказом заказчика.
export interface FunctionOption extends Option<ContractServiceFunction> {
  paragraph: string;
  shortLabel: string;
}

export const contractServiceFunctionOptions: FunctionOption[] = [
  {
    value: "planning",
    label: "Планирование закупок",
    shortLabel: "Планирование",
    paragraph: "п. 3.1",
  },
  {
    value: "purchase_description",
    label: "Описание объекта закупки и обоснование НМЦК",
    shortLabel: "Описание и НМЦК",
    paragraph: "п. 3.2",
  },
  {
    value: "supplier_determination",
    label: "Определение поставщика (подрядчика, исполнителя)",
    shortLabel: "Определение поставщика",
    paragraph: "п. 3.3",
  },
  {
    value: "contract_conclusion",
    label: "Заключение контракта",
    shortLabel: "Заключение контракта",
    paragraph: "п. 3.4",
  },
  {
    value: "contract_execution",
    label: "Исполнение, изменение, расторжение контракта и отчётность",
    shortLabel: "Исполнение и отчётность",
    paragraph: "п. 3.5",
  },
];

const findOption = <TValue extends string, TOption extends Option<TValue>>(
  options: TOption[],
  value: TValue | undefined,
): TOption | undefined => options.find((option) => option.value === value);

export const contractServiceCreationMethodLabel = (
  method?: ContractServiceCreationMethod,
): string =>
  findOption(contractServiceCreationMethodOptions, method)?.label ?? "—";

export const contractServiceCreationMethodBasis = (
  method?: ContractServiceCreationMethod,
): string =>
  findOption(contractServiceCreationMethodOptions, method)?.legalBasis ?? "";

export const contractServiceFunctionLabel = (
  fn?: ContractServiceFunction,
): string => findOption(contractServiceFunctionOptions, fn)?.label ?? "—";

export const contractServiceFunctionShortLabel = (
  fn?: ContractServiceFunction,
): string => findOption(contractServiceFunctionOptions, fn)?.shortLabel ?? "—";

export const contractServiceFunctionParagraph = (
  fn?: ContractServiceFunction,
): string => findOption(contractServiceFunctionOptions, fn)?.paragraph ?? "";

// Полный перечень функций — нужен, чтобы показать, что контрактный
// управляющий ведёт закупки целиком
export const allContractServiceFunctions: ContractServiceFunction[] =
  contractServiceFunctionOptions.map((option) => option.value);

// Категории функций для группировки в раскрывающихся списках
export interface FunctionCategory {
  id: string;
  label: string;
  functions: ContractServiceFunction[];
}

export const contractServiceFunctionCategories: FunctionCategory[] = [
  {
    id: "planning_and_basis",
    label: "Планирование и обоснование",
    functions: ["planning", "purchase_description"],
  },
  {
    id: "procurement",
    label: "Закупочные процедуры",
    functions: ["supplier_determination", "contract_conclusion"],
  },
  {
    id: "execution_and_reporting",
    label: "Исполнение и отчётность",
    functions: ["contract_execution"],
  },
];

export const formatContractServiceFunctions = (
  functions: ContractServiceFunction[] | undefined,
): string => {
  if (!functions || functions.length === 0) {
    return "Функции и полномочия ещё не наделены";
  }

  return contractServiceFunctionOptions
    .filter((option) => functions.includes(option.value))
    .map((option) => `${option.paragraph} ${option.label}`)
    .join("; ");
};

// Численность контрактной службы: при способе «подразделение» считаем по
// штатному расписанию подразделения, при наборе из работников — по составу,
// контрактный управляющий один. Руководитель службы уже входит в подразделение
// или состав, поэтому учитываем его отдельно, только если он в них не числится.
export const contractServiceHeadcount = (
  service: Pick<
    ContractService,
    | "creationMethod"
    | "structuralUnitId"
    | "members"
    | "contractManager"
    | "head"
  >,
  unitEmployees: BaseEmployee[] = [],
): number => {
  if (service.creationMethod === "contract_manager") {
    return service.contractManager ? 1 : 0;
  }

  const headIsListed = (
    candidates: Array<string | number | undefined>,
  ): boolean =>
    Boolean(
      service.head?.employeeId &&
      candidates.some(
        (candidate) => String(candidate) === String(service.head?.employeeId),
      ),
    );

  if (service.creationMethod === "structural_unit") {
    return headIsListed(unitEmployees.map((employee) => employee.id))
      ? unitEmployees.length
      : unitEmployees.length + (service.head?.employeeId ? 1 : 0);
  }

  return (
    service.members.length +
    (headIsListed(service.members.map((member) => member.employeeId)) ||
    !service.head?.employeeId
      ? 0
      : 1)
  );
};

// П. 2.2 приказа N 158н применительно к просмотренной службе
export const contractServiceHeadcountWarning = (headcount: number): string =>
  `Штатная численность контрактной службы ${headcount} чел. По п. 2.2 Типового положения она не может составлять менее ${MIN_CONTRACT_SERVICE_SIZE} человек`;

// Краткое описание утверждённого способа для карточки и баннеров
export const contractServiceMethodSummary = (
  service: Pick<
    ContractService,
    "creationMethod" | "structuralUnitName" | "members" | "contractManager"
  >,
): string => {
  switch (service.creationMethod) {
    case "structural_unit":
      return `Структурное подразделение: ${service.structuralUnitName || "не указано"}`;
    case "employees":
      return `Из работников заказчика: ${service.members
        .map((member) => member.employeeFullName)
        .filter(Boolean)
        .join(", ")}`;
    case "contract_manager":
      return `Контрактный управляющий: ${
        service.contractManager?.employeeFullName || "не указан"
      }`;
    default:
      return "—";
  }
};

// ФИО работника штатного расписания — один формат для списков выбора и снимков
export const employeeFullName = (employee?: BaseEmployee): string =>
  `${employee?.employee?.surname ?? ""} ${employee?.employee?.name ?? ""} ${
    employee?.employee?.patronymic ?? ""
  }`.trim();

// Градация ролей в составе службы (Tasks 3, п. 0): руководитель службы,
// начальник структурного подразделения КС и работник службы. Начальника
// определяем по должности из штатки — заказчик назначает его приказом, и
// должность в штатном расписании это отражает
const UNIT_MANAGER_POSITION_PATTERN = /начальник|руководитель|заместитель/;

export const contractServiceMemberRole = (position?: string): string =>
  UNIT_MANAGER_POSITION_PATTERN.test(position ?? "")
    ? "Начальник структурного подразделения КС"
    : "Работник службы";

// Ответственные службы: состав либо контрактный управляющий — для таблицы
// состава в карточке (возвращает тот же список, что и хелпер схемы)
export const contractServiceStaffList = contractServiceStaff;

// Строка таблицы ответственных: руководитель службы идёт первым и помечается
// ролью — по п. 2.3-2.4 он возглавляет службу и распределяет функции
export interface ContractServiceRosterRow {
  key: string;
  role: string;
  structuralUnitName?: string;
  employeeFullName?: string;
  employeeNumber?: string;
  position?: string;
  functions?: ContractServiceFunction[];
  remarks?: string;
  employeeId?: string | number;
}

export const contractServiceRoster = (
  service: Pick<
    ContractService,
    "creationMethod" | "head" | "members" | "contractManager"
  >,
): ContractServiceRosterRow[] => {
  if (service.creationMethod === "contract_manager") {
    const manager = service.contractManager;

    return manager
      ? [
          {
            key: `manager-${String(manager.employeeId ?? "")}`,
            role: "Контрактный управляющий (ч. 21 ст. 38 44-ФЗ)",
            ...manager,
            employeeId: manager.employeeId,
          },
        ]
      : [];
  }

  const head = service.head;
  const rows: ContractServiceRosterRow[] = [];

  if (head?.employeeId) {
    rows.push({
      key: `head-${String(head.employeeId)}`,
      role: "Руководитель службы (п. 2.3)",
      ...head,
      employeeId: head.employeeId,
    });
  }

  if (service.creationMethod === "employees") {
    service.members
      .filter(
        (member) => String(member.employeeId) !== String(head?.employeeId),
      )
      .forEach((member, index) => {
        rows.push({
          key: `member-${String(member.employeeId ?? index)}`,
          role: contractServiceMemberRole(member.position),
          ...member,
          employeeId: member.employeeId,
        });
      });
  }

  return rows;
};

// Кто издал приказ о назначении руководителя — с должностью из снимка
export const formatContractServiceAppointer = (
  service: Pick<ContractService, "appointedByName" | "appointedByPosition">,
): string =>
  [service.appointedByName, service.appointedByPosition]
    .filter(Boolean)
    .join(", ") || "—";

export const contractServiceHeadOrderFields: ConfigurationInput<ContractService>[] =
  [
    {
      label: { value: "Номер приказа о назначении" },
      input: { name: "headOrderNumber", placeholder: "12-КС/П" },
    },
    {
      label: { value: "Дата приказа о назначении" },
      input: { name: "headOrderDate", type: "date" },
    },
  ];

// Руководитель службы — краткая строка для карточки и баннеров
export const contractServiceHeadSummary = (
  service: Pick<ContractService, "head">,
): string => {
  const head = service.head;

  if (!head?.employeeFullName) {
    return "Руководитель контрактной службы не назначен";
  }

  return [head.employeeFullName, head.position, head.structuralUnitName]
    .filter(Boolean)
    .join(", ");
};

export const contractServiceOrderFields: ConfigurationInput<ContractService>[] =
  [
    {
      label: { value: "Номер приказа" },
      input: { name: "orderNumber", placeholder: "12-П" },
    },
    {
      label: { value: "Дата приказа" },
      input: { name: "orderDate", type: "date" },
    },
  ];

// Поля фиксации действия: кто из работников заказчиков указал сведения (выбор
// из штатки) и когда
export const contractServiceDeclarationFields: ConfigurationInput<ContractService>[] =
  [
    {
      label: { value: "Дата указания сведений" },
      input: { name: "declaredDate", type: "date" },
    },
    {
      label: { value: "Примечание" },
      input: {
        name: "remarks",
        placeholder: "Например: основание создания службы",
      },
    },
  ];

// Кто указал сведения — работник штатного расписания, поэтому в карточке
// показываем снимок «ФИО, должность, подразделение»
export const formatContractServiceDeclarator = (
  service: Pick<
    ContractService,
    "declaredByName" | "declaredByPosition" | "declaredByStructuralUnitName"
  >,
): string => {
  if (!service.declaredByName) {
    return "—";
  }

  return [
    service.declaredByName,
    service.declaredByPosition,
    service.declaredByStructuralUnitName,
  ]
    .filter(Boolean)
    .join(", ");
};

// Статус образования работника для таблицы состава
export interface EducationStatus {
  hasProfile: boolean;
  hasDpo: boolean;
  dpoExpired: boolean;
  dpoExpiringSoon: boolean;
  summary: string;
}

export const getEducationStatus = (
  educations: EmployeeEducation[],
): EducationStatus => {
  if (educations.length === 0) {
    return {
      hasProfile: false,
      hasDpo: false,
      dpoExpired: false,
      dpoExpiringSoon: false,
      summary: "Нет данных об образовании",
    };
  }

  // Проверяем только записи типа "higher" — именно они определяют профильность
  const higherEdu = educations.find((edu) => edu.type === "higher");
  const hasProfile =
    !!higherEdu &&
    PROFILE_EDUCATION_KEYWORDS.some((keyword) =>
      higherEdu.field.toLowerCase().includes(keyword),
    );

  const dpoList = educations.filter((edu) => edu.type === "dpo");
  const hasDpo = dpoList.length > 0;

  let dpoExpired = false;
  let dpoExpiringSoon = false;

  for (const dpo of dpoList) {
    if (dpo.status === "expired") {
      dpoExpired = true;
    } else if (dpo.status === "expiring") {
      dpoExpiringSoon = true;
    }
  }

  const parts: string[] = [];

  if (hasProfile) {
    parts.push("Профильное образование");
  } else {
    parts.push("Образование не в сфере закупок");
  }

  if (hasDpo) {
    if (dpoExpired) {
      parts.push("ДПО истёк");
    } else if (dpoExpiringSoon) {
      parts.push("ДПО скоро истекает");
    } else {
      parts.push("ДПО действует");
    }
  } else {
    parts.push("Нет ДПО");
  }

  return {
    hasProfile,
    hasDpo,
    dpoExpired,
    dpoExpiringSoon,
    summary: parts.join(", "),
  };
};

export const educationWarning = (status: EducationStatus): string | null => {
  if (!status.hasProfile) {
    return "Работник не имеет профильного образования в сфере закупок (п. 2.5)";
  }

  if (status.dpoExpired) {
    return "Срок действия ДПО истёк — работник не может выполнять функции до обновления квалификации";
  }

  if (status.dpoExpiringSoon) {
    return "Срок действия ДПО истекает — рекомендуется направить на курсы повышения квалификации";
  }

  return null;
};
