import type { BaseEmployee } from "../StaffingTable/StaffingTable.schema";
import type { EmployeeEducation } from "./education.schema";
import {
  contractServiceStaff,
  MIN_CONTRACT_SERVICE_SIZE,
  parentFunctionCode,
  subFunctionsOfSection,
  type ContractService,
  type ContractServiceCreationMethod,
  type ContractServiceFunction,
} from "./contractService.schema";

/**
 * Не-UI-конфигурация и хелперы контрактной службы.
 *
 * Раньше эти функции лежали в components/ContractService/contractService.config
 * и сервисы (отчёты, валидатор 158н, хук прав) тянулись в слой компонентов.
 * Старый путь оставлен реэкспортом, чтобы не править десятки импортов форм.
 */

/** Признак руководителя службы / контрактного управляющего по идентификатору. */
export const isContractServiceLeader = (
  service: Pick<ContractService, "head" | "contractManager"> | null | undefined,
  employeeId: string | number | undefined | null,
): boolean => {
  if (employeeId === undefined || employeeId === null || employeeId === "") {
    return false;
  }
  const id = String(employeeId);

  return (
    (service?.head?.employeeId != null &&
      String(service.head.employeeId) === id) ||
    (service?.contractManager?.employeeId != null &&
      String(service.contractManager.employeeId) === id)
  );
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

// Статус образования работника для таблицы состава
export interface EducationStatus {
  hasProfile: boolean;
  hasDpo: boolean;
  dpoExpired: boolean;
  dpoExpiringSoon: boolean;
  summary: string;
}

// Ключевые слова, указывающие на профильное образование в сфере закупок
const PROFILE_EDUCATION_KEYWORDS = ["закупк", "44-фз", "223-фз", "контрактн", "гос"];

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

// Справочники и подписи раздела III Типового положения (158н).
// Перенесены из components-конфига: сервисы больше не зависят от UI-слоя.
// Человекочитаемые названия функций раздела III Типового положения.
// Основные коды разделов + детальные коды подпунктов.
export const functionLabels: Record<ContractServiceFunction, string> = {
  // Разделы (обратная совместимость)
  planning: "3.1 Планирование закупок",
  purchase_description: "3.2 Определение поставщика",
  supplier_determination: "3.3 Заключение контрактов",
  contract_conclusion: "3.4 Исполнение, изменение, расторжение контракта",
  contract_execution: "3.5 Иные функции и отчётность",
  reporting: "Отчётность и обжалование",
  // Подпункты 3.1
  planning_develop_plan: "3.1.1 Разработка плана-графика",
  planning_place_plan: "3.1.2 Размещение ПГ в ЕИС",
  planning_justify_need: "3.1.3 Обоснование потребности",
  planning_norming: "3.1.4 Нормирование закупок",
  planning_consultation: "3.1.5 Консультации с поставщиками",
  // Подпункты 3.2
  supplier_determination_closed: "3.2.1 Закрытые способы определения",
  supplier_determination_notice: "3.2.2 Извещения и документация",
  supplier_determination_nmtc: "3.2.2.1 Обоснование НМЦК",
  supplier_determination_object: "3.2.2.2 Описание объекта закупки",
  supplier_determination_information: "3.2.2.3 Сведения в извещении (ст. 42)",
  supplier_determination_explanation: "3.2.3 Разъяснения извещения",
  supplier_determination_cancel: "3.2.4 Отмена определения поставщика",
  supplier_determination_protocol: "3.2.5 Протоколы определения",
  supplier_determination_commission: "3.2.6 Обеспечение комиссии",
  supplier_determination_expert: "3.2.7 Привлечение экспертов",
  // Подпункты 3.3
  contract_conclusion_placing: "3.3.1 Размещение проекта контракта",
  contract_conclusion_protocol_diff: "3.3.2 Протокол разногласий",
  contract_conclusion_guarantee: "3.3.3 Независимая гарантия (обеспечение)",
  contract_conclusion_ensuring: "3.3.4 Проверка поступления обеспечения",
  contract_conclusion_single_match: "3.3.5 Согласование с контрольным органом",
  contract_conclusion_single_notify:
    "3.3.6 Уведомление о контракте с едпоставщиком",
  contract_conclusion_storage: "3.3.7 Хранение информации и документов",
  contract_conclusion_ensuring_sig: "3.3.8 Обеспечение заключения контракта",
  contract_conclusion_registry: "3.3.9 Направление сведений в реестр",
  // Подпункты 3.4
  contract_execution_guarantee:
    "3.4.1 Независимая гарантия (гарантийное обязат.)",
  contract_execution_advance: "3.4.2 Выплата аванса",
  contract_execution_acceptance: "3.4.3 Приёмка поставленного",
  contract_execution_payment: "3.4.4 Оплата поставленного",
  contract_execution_registry: "3.4.5 Сведения об исполнении в реестр",
  contract_execution_interaction:
    "3.4.6 Взаимодействие при изменении/расторжении",
  contract_execution_unfair_registry: "3.4.7 Направление сведений в РНП",
  contract_execution_return_bond: "3.4.8 Возврат обеспечения",
  contract_execution_unilateral: "3.4.9 Одностороннее расторжение",
  // Подпункты 3.5
  reporting_winner_evasion: "3.5.1 Уклонение победителя — сведения в РНП",
  reporting_smnp: "3.5.2 Отчёт об объёме закупок у СМП/СОНКО",
  reporting_appeals: "3.5.3 Участие в обжаловании, претензионная работа",
  reporting_centralization: "3.5.5 Полномочия при централизации закупок",
};

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

// Функции и полномочия — раздел III Типового положения. Пять основных разделов
// (3.1–3.5) с детализацией по подпунктам. Конкретные действия внутри пункта
// наделяются приказом заказчика.
export interface FunctionOption extends Option<ContractServiceFunction> {
  paragraph: string;
  shortLabel: string;
}

// Основные разделы (для обратной совместимости и отображения в таблицах)
export const contractServiceFunctionOptions: FunctionOption[] = [
  {
    value: "planning",
    label: "Планирование закупок",
    shortLabel: "Планирование",
    paragraph: "п. 3.1",
  },
  {
    value: "purchase_description",
    label: "Определение поставщика (подрядчика, исполнителя)",
    shortLabel: "Определение поставщика",
    paragraph: "п. 3.2",
  },
  {
    value: "supplier_determination",
    label: "Заключение контрактов",
    shortLabel: "Заключение контрактов",
    paragraph: "п. 3.3",
  },
  {
    value: "contract_conclusion",
    label: "Исполнение, изменение, расторжение контракта",
    shortLabel: "Исполнение контракта",
    paragraph: "п. 3.4",
  },
  {
    value: "contract_execution",
    label: "Иные функции и полномочия",
    shortLabel: "Иные функции",
    paragraph: "п. 3.5",
  },
  {
    value: "reporting",
    label: "Отчётность и обжалование",
    shortLabel: "Отчётность",
    paragraph: "п. 3.5",
  },
];

// Детальные подпункты для двухуровневого пикера функций
export interface SubFunctionItem {
  code: ContractServiceFunction;
  paragraph: string;
  label: string;
}

export interface SectionWithSubFunctions {
  section: FunctionOption;
  subFunctions: SubFunctionItem[];
}

export const contractServiceSections: SectionWithSubFunctions[] = [
  {
    section: {
      value: "planning",
      label: "Планирование закупок",
      shortLabel: "Планирование",
      paragraph: "п. 3.1",
    },
    subFunctions: [
      {
        code: "planning_develop_plan",
        paragraph: "3.1.1",
        label: "Разрабатывает план-график, подготовку изменений в ПГ",
      },
      {
        code: "planning_place_plan",
        paragraph: "3.1.2",
        label: "Размещает в ЕИС план-график и изменения",
      },
      {
        code: "planning_justify_need",
        paragraph: "3.1.3",
        label: "Обосновывает потребность в закупке",
      },
      {
        code: "planning_norming",
        paragraph: "3.1.4",
        label:
          "Разрабатывает требования к закупаемым, нормативные затраты (ст. 19)",
      },
      {
        code: "planning_consultation",
        paragraph: "3.1.5",
        label: "Организует консультации с поставщиками",
      },
    ],
  },
  {
    section: {
      value: "purchase_description",
      label: "Определение поставщика (подрядчика, исполнителя)",
      shortLabel: "Определение поставщика",
      paragraph: "п. 3.2",
    },
    subFunctions: [
      {
        code: "supplier_determination_closed",
        paragraph: "3.2.1",
        label: "Проведение закрытых способов определения",
      },
      {
        code: "supplier_determination_notice",
        paragraph: "3.2.2",
        label:
          "Подготовка и размещение извещений, документации, проектов контрактов",
      },
      {
        code: "supplier_determination_nmtc",
        paragraph: "3.2.2.1",
        label: "Определение и обоснование НМЦК",
      },
      {
        code: "supplier_determination_object",
        paragraph: "3.2.2.2",
        label: "Описание объекта закупки",
      },
      {
        code: "supplier_determination_information",
        paragraph: "3.2.2.3",
        label: "Указание сведений в извещении (ст. 42)",
      },
      {
        code: "supplier_determination_explanation",
        paragraph: "3.2.3",
        label: "Подготовка и размещение разъяснений",
      },
      {
        code: "supplier_determination_cancel",
        paragraph: "3.2.4",
        label: "Подготовка извещения об отмене определения",
      },
      {
        code: "supplier_determination_protocol",
        paragraph: "3.2.5",
        label: "Оформление протоколов определения поставщика",
      },
      {
        code: "supplier_determination_commission",
        paragraph: "3.2.6",
        label: "Организационно-техническое обеспечение комиссии",
      },
      {
        code: "supplier_determination_expert",
        paragraph: "3.2.7",
        label: "Привлечение экспертов и экспертных организаций",
      },
    ],
  },
  {
    section: {
      value: "supplier_determination",
      label: "Заключение контрактов",
      shortLabel: "Заключение контрактов",
      paragraph: "п. 3.3",
    },
    subFunctions: [
      {
        code: "contract_conclusion_placing",
        paragraph: "3.3.1",
        label: "Размещение проекта контракта в ЕИС и на площадке",
      },
      {
        code: "contract_conclusion_protocol_diff",
        paragraph: "3.3.2",
        label: "Рассмотрение протокола разногласий",
      },
      {
        code: "contract_conclusion_guarantee",
        paragraph: "3.3.3",
        label: "Рассмотрение независимой гарантии (обеспечение исполнения)",
      },
      {
        code: "contract_conclusion_ensuring",
        paragraph: "3.3.4",
        label: "Проверка поступления обеспечения на счёт заказчика",
      },
      {
        code: "contract_conclusion_single_match",
        paragraph: "3.3.5",
        label: "Обращение о согласовании контракта с единственным поставщиком",
      },
      {
        code: "contract_conclusion_single_notify",
        paragraph: "3.3.6",
        label: "Уведомление о заключении контракта с едпоставщиком",
      },
      {
        code: "contract_conclusion_storage",
        paragraph: "3.3.7",
        label: "Хранение информации и документов (ч. 15 ст. 4)",
      },
      {
        code: "contract_conclusion_ensuring_sig",
        paragraph: "3.3.8",
        label: "Обеспечение заключения контракта с участником",
      },
      {
        code: "contract_conclusion_registry",
        paragraph: "3.3.9",
        label: "Направление сведений о заключённых контрактах в реестр",
      },
    ],
  },
  {
    section: {
      value: "contract_conclusion",
      label: "Исполнение, изменение, расторжение контракта",
      shortLabel: "Исполнение контракта",
      paragraph: "п. 3.4",
    },
    subFunctions: [
      {
        code: "contract_execution_guarantee",
        paragraph: "3.4.1",
        label: "Рассмотрение независимой гарантии (гарантийное обязательство)",
      },
      {
        code: "contract_execution_advance",
        paragraph: "3.4.2",
        label: "Исполнение условий в части выплаты аванса",
      },
      {
        code: "contract_execution_acceptance",
        paragraph: "3.4.3",
        label: "Приёмка поставленного товара, работ, услуг",
      },
      {
        code: "contract_execution_payment",
        paragraph: "3.4.4",
        label: "Исполнение условий в части оплаты поставленного",
      },
      {
        code: "contract_execution_registry",
        paragraph: "3.4.5",
        label: "Направление сведений об исполнении в реестр контрактов",
      },
      {
        code: "contract_execution_interaction",
        paragraph: "3.4.6",
        label: "Взаимодействие при изменении/расторжении, неустойки",
      },
      {
        code: "contract_execution_unfair_registry",
        paragraph: "3.4.7",
        label: "Направление сведений в РНП о расторжении (ст. 104)",
      },
      {
        code: "contract_execution_return_bond",
        paragraph: "3.4.8",
        label: "Возврат обеспечения исполнения контракта",
      },
      {
        code: "contract_execution_unilateral",
        paragraph: "3.4.9",
        label: "Одностороннее расторжение контракта (ст. 95)",
      },
    ],
  },
  {
    section: {
      value: "contract_execution",
      label: "Иные функции и полномочия",
      shortLabel: "Иные функции",
      paragraph: "п. 3.5",
    },
    subFunctions: [
      {
        code: "reporting_winner_evasion",
        paragraph: "3.5.1",
        label: "Информация об уклонении победителя (РНП)",
      },
      {
        code: "reporting_smnp",
        paragraph: "3.5.2",
        label: "Отчёт об объёме закупок у СМП, СОНКО",
      },
      {
        code: "reporting_appeals",
        paragraph: "3.5.3",
        label: "Участие в обжаловании, претензионно-исковая работа",
      },
      {
        code: "reporting_centralization",
        paragraph: "3.5.5",
        label: "Полномочия при централизации закупок (ст. 26)",
      },
    ],
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

// Полный перечень основных кодов разделов — для проверки «все функции на месте»
export const allContractServiceFunctions: ContractServiceFunction[] =
  contractServiceFunctionOptions.map((option) => option.value);

// Получить все коды функций (основные + подпункты) для данного раздела
export const allFunctionsInSection = (
  section: ContractServiceFunction,
): ContractServiceFunction[] => {
  const subs = subFunctionsOfSection(section);
  return [section, ...subs];
};

// Категории функций для группировки в раскрывающихся списках
export interface FunctionCategory {
  id: string;
  label: string;
  functions: ContractServiceFunction[];
}

export const contractServiceFunctionCategories: FunctionCategory[] = [
  {
    id: "planning",
    label: "3.1 Планирование закупок",
    functions: ["planning"],
  },
  {
    id: "procurement",
    label: "3.2 Определение поставщика",
    functions: ["purchase_description"],
  },
  {
    id: "contract_conclusion",
    label: "3.3 Заключение контрактов",
    functions: ["supplier_determination"],
  },
  {
    id: "execution",
    label: "3.4 Исполнение, изменение, расторжение",
    functions: ["contract_conclusion"],
  },
  {
    id: "reporting",
    label: "3.5 Иные функции и отчётность",
    functions: ["contract_execution", "reporting"],
  },
];

// Форматирует массив кодов функций для отображения в таблицах.
// Показывает разделы и, при наличии, детальные подпункты.
export const formatContractServiceFunctions = (
  functions: ContractServiceFunction[] | undefined,
): string => {
  if (!functions || functions.length === 0) {
    return "Функции и полномочия ещё не наделены";
  }

  // Разделяем на основные разделы и подпункты
  const sections = contractServiceFunctionOptions
    .filter((option) => functions.includes(option.value))
    .map((option) => `${option.paragraph} ${option.label}`);

  // Если есть только разделы без подпунктов — возвращаем их
  const subFunctions = functions.filter(
    (code) => code !== parentFunctionCode(code),
  );

  if (subFunctions.length === 0) {
    return sections.join("; ");
  }

  // Группируем подпункты по разделам
  const subBySection = new Map<string, string[]>();

  for (const code of subFunctions) {
    const parent = parentFunctionCode(code);
    const sectionOption = contractServiceFunctionOptions.find(
      (o) => o.value === parent,
    );
    const sectionLabel = sectionOption
      ? `${sectionOption.paragraph} ${sectionOption.shortLabel}`
      : parent;
    const existing = subBySection.get(sectionLabel) ?? [];

    existing.push(functionLabels[code] ?? code);
    subBySection.set(sectionLabel, existing);
  }

  const parts: string[] = [];

  for (const [sectionLabel, subs] of subBySection) {
    parts.push(`${sectionLabel}: ${subs.join(", ")}`);
  }

  return parts.join("; ");
};

// Сокращённая подпись функций (для таблиц с ограниченной шириной)
export const formatContractServiceFunctionsShort = (
  functions: ContractServiceFunction[] | undefined,
): string => {
  if (!functions || functions.length === 0) {
    return "—";
  }

  // Показываем только основные разделы
  const sections = contractServiceFunctionOptions
    .filter((option) => functions.includes(option.value))
    .map((option) => option.shortLabel);

  return sections.length > 0 ? sections.join(", ") : "—";
};

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

// Кто издал приказ о назначении руководителя — с должностью из снимка
export const formatContractServiceAppointer = (
  service: Pick<ContractService, "appointedByName" | "appointedByPosition">,
): string =>
  [service.appointedByName, service.appointedByPosition]
    .filter(Boolean)
    .join(", ") || "—";

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

