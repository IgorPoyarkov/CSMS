import { z } from "zod";

/**
 * Сведения о контрактной службе заказчика.
 *
 * Пункт 2.1 Типового положения (регламента) о контрактной службе,
 * утверждённого приказом Минфина России от 31.07.2020 N 158н, требует
 * зафиксировать СПОСОБ создания контрактной службы:
 *
 * - контрактная служба создана в виде структурного подразделения заказчика
 *   (выбирается подразделение из штатного расписания);
 * - контрактная служба сформирована из работников заказчика, назначенных
 *   приказом руководителя заказчика (состав набирается по структурным
 *   подразделениям, а работникам затем наделяют функции и полномочия
 *   из раздела III Типового положения);
 * - контрактная служба не создаётся, закупки ведёт контрактный управляющий —
 *   должностное лицо, назначенное приказом руководителя заказчика (ч. 21
 *   ст. 38 44-ФЗ: право есть при совокупном годовом объёме закупок не более
 *   100 млн руб., при большем объёме заказчик обязан создать службу).
 *
 * Способ указывается один раз — при первом входе контрактного управляющего
 * (руководителя заказчика) — и далее привязан к организации-заказчику.
 */

const idSchema = () => z.union([z.string(), z.number()]).optional();

const requiredId = (message: string) =>
  z
    .union([z.string(), z.number()])
    .refine(
      (value) => value !== "" && value !== null && value !== undefined,
      message,
    );

// Пустая строка из формы приравнивается к «не заполнено», поэтому необязательные
// поля проходят валидацию и с "" и с undefined.
const optionalText = (minLength: number, message: string) =>
  z
    .string()
    .refine((value) => value === "" || value.length >= minLength, message)
    .optional();

const optionalDate = (message: string) =>
  z
    .string()
    .refine(
      (value) =>
        value === "" ||
        /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value),
      message,
    )
    .optional();

const hasId = (value: string | number | undefined | null): boolean =>
  value !== undefined && value !== null && value !== "";

// Способы создания контрактной службы (п. 2.1 приказа N 158н):
// структурное подразделение, состав из работников либо контрактная служба не
// создаётся и закупки ведёт контрактный управляющий (ч. 21 ст. 38 44-ФЗ).
export const ContractServiceCreationMethodSchema = z.enum([
  "structural_unit",
  "employees",
  "contract_manager",
]);

export type ContractServiceCreationMethod = z.infer<
  typeof ContractServiceCreationMethodSchema
>;

// Функции и полномочия контрактной службы — по разделу III Типового положения:
// 3.1 планирование закупок, 3.2 описание объекта закупки и обоснование НМЦК,
// 3.3 определение поставщика, 3.4 заключение контракта,
// 3.5 исполнение, изменение, расторжение контракта и отчётность.
export const ContractServiceFunctionSchema = z.enum([
  "planning",
  "purchase_description",
  "supplier_determination",
  "contract_conclusion",
  "contract_execution",
]);

export type ContractServiceFunction = z.infer<
  typeof ContractServiceFunctionSchema
>;

export const contractServiceFunctionCodes =
  ContractServiceFunctionSchema.options;

// Работник заказчика в составе контрактной службы (способ "employees").
// Подразделение и ФИО сохраняются снимком: состав службы утверждается приказом,
// и последующие правки штатного расписания не должны переписывать уже
// утверждённый состав.
export const ContractServiceMemberSchema = z.object({
  id: idSchema(),
  employeeId: requiredId("Выберите работника заказчика из штатного расписания"),
  employeeFullName: optionalText(5, "Укажите ФИО работника"),
  employeeNumber: optionalText(1, "Укажите табельный номер работника"),
  position: optionalText(3, "Укажите должность работника"),
  structuralUnitId: requiredId(
    "Выберите структурное подразделение, в котором служит работник",
  ),
  structuralUnitName: optionalText(
    2,
    "Укажите наименование структурного подразделения",
  ),
  // Функции наделяются приказом и могут быть назначены позже, поэтому до
  // назначения допускается пустой список.
  functions: z.array(ContractServiceFunctionSchema).default([]),
  remarks: z.string().optional(),
});

export type ContractServiceMember = z.infer<typeof ContractServiceMemberSchema>;

// Контрактный управляющий — работник заказчика, назначенный приказом
// руководителя и ведущий закупки, когда контрактная служба не создаётся
// (ч. 21 ст. 38 44-ФЗ). Подразделение указывается по желанию: управляющий
// может быть в прямом подчинении руководителя и не входить в подразделение.
// Снимки ФИО/должности нужны по той же причине, что и в составе службы.
export const ContractManagerSchema = z.object({
  id: idSchema(),
  // Пустое значение допустимо на уровне записи: обязательность выбора
  // проверяется в ContractServiceSchema только для способа "contract_manager",
  // иначе пустой снимок ломал бы валидацию двух других способов.
  employeeId: idSchema(),
  employeeFullName: optionalText(5, "Укажите ФИО контрактного управляющего"),
  employeeNumber: optionalText(
    1,
    "Укажите табельный номер контрактного управляющего",
  ),
  position: optionalText(3, "Укажите должность контрактного управляющего"),
  structuralUnitId: idSchema(),
  structuralUnitName: optionalText(
    2,
    "Укажите наименование структурного подразделения",
  ),
  // Контрактный управляющий выполняет функции контрактной службы целиком,
  // но объём возложенных полномочий всё равно фиксируется приказом.
  functions: z.array(ContractServiceFunctionSchema).default([]),
  remarks: z.string().optional(),
});

export type ContractManager = z.infer<typeof ContractManagerSchema>;

// Руководитель контрактной службы — п. 2.3 Типового положения: службу возглавляет
// руководитель, назначаемый приказом руководителя заказчика, уполномоченного лица,
// исполняющего его обязанности, либо уполномоченного руководителем лица.
// Руководитель входит в службу и распределяет функции между её работниками
// (п. 2.4), поэтому у него тоже есть перечень функций.
export const ContractServiceHeadSchema = z.object({
  id: idSchema(),
  // Как и у контрактного управляющего: обязательность проверяется в
  // ContractServiceSchema только для способов со службой, иначе пустой снимок
  // ломал бы валидацию способа «контрактный управляющий».
  employeeId: idSchema(),
  employeeFullName: optionalText(
    5,
    "Укажите ФИО руководителя контрактной службы",
  ),
  employeeNumber: optionalText(
    1,
    "Укажите табельный номер руководителя контрактной службы",
  ),
  position: optionalText(
    3,
    "Укажите должность руководителя контрактной службы",
  ),
  structuralUnitId: idSchema(),
  structuralUnitName: optionalText(
    2,
    "Укажите подразделение руководителя контрактной службы",
  ),
  functions: z.array(ContractServiceFunctionSchema).default([]),
  remarks: z.string().optional(),
});

export type ContractServiceHead = z.infer<typeof ContractServiceHeadSchema>;

export const ContractServiceSchema = z
  .object({
    id: idSchema(),
    // Служба всегда принадлежит организации-заказчику (organizations.id);
    // сведения других заказчиков пользователю недоступны.
    organizationId: requiredId(
      "Сведения о контрактной службе должны быть привязаны к организации заказчика",
    ),
    creationMethod: ContractServiceCreationMethodSchema,

    // Способ 1: контрактная служба — структурное подразделение заказчика
    structuralUnitId: idSchema(),
    structuralUnitName: optionalText(
      2,
      "Укажите наименование структурного подразделения контрактной службы",
    ),

    // Способ 2: контрактная служба из работников заказчика
    members: z.array(ContractServiceMemberSchema).default([]),

    // Способ 3: служба не создана, закупки ведёт контрактный управляющий
    contractManager: ContractManagerSchema.optional(),

    // Руководитель контрактной службы (п. 2.3) — есть у обоих способов со
    // службой; при контрактном управляющем службы нет, поэтому и руководителя нет
    head: ContractServiceHeadSchema.optional(),

    // Приказ о назначении руководителя службы (п. 2.3) — отдельный документ:
    // приказ о создании службы утверждает состав, приказ о назначении —
    // руководителя
    headOrderNumber: optionalText(
      1,
      "Укажите номер приказа о назначении руководителя контрактной службы",
    ),
    headOrderDate: optionalDate(
      "Неверный формат даты приказа о назначении руководителя (ожидается ГГГГ-ММ-ДД)",
    ),

    // Кто издал приказ о назначении: по п. 2.3 это руководитель заказчика,
    // уполномоченное лицо, исполняющее его обязанности, либо уполномоченное
    // руководителем лицо — круг ограничен, поэтому выбор из штатного расписания
    // (должность и ФИО сохраняются снимком)
    appointedByEmployeeId: idSchema(),
    appointedByName: optionalText(
      5,
      "Укажите, кто издал приказ о назначении руководителя контрактной службы",
    ),
    appointedByPosition: optionalText(
      3,
      "Укажите должность лица, издавшего приказ о назначении руководителя",
    ),

    // Основание: приказ руководителя заказчика о создании службы
    // (о назначении её состава — для способа "employees", о назначении
    // контрактного управляющего — для способа "contract_manager")
    orderNumber: optionalText(
      1,
      "Укажите номер приказа о создании контрактной службы",
    ),
    orderDate: optionalDate(
      "Неверный формат даты приказа (ожидается ГГГГ-ММ-ДД)",
    ),

    // Кто и когда зафиксировал способ — обязательное действие при первом входе.
    // Указавший сведения берётся из штатного расписания (сначала отдел, затем
    // работник), поэтому должность и отдел сохраняются снимком вместе с работником.
    declaredByEmployeeId: idSchema(),
    declaredByName: optionalText(
      5,
      "Укажите должность и ФИО указавшего сведения о контрактной службе",
    ),
    declaredByPosition: optionalText(
      3,
      "Укажите должность указавшего сведения о контрактной службе",
    ),
    declaredByStructuralUnitId: idSchema(),
    declaredByStructuralUnitName: optionalText(
      2,
      "Укажите подразделение указавшего сведения о контрактной службе",
    ),
    declaredDate: optionalDate(
      "Неверный формат даты указания сведений (ожидается ГГГГ-ММ-ДД)",
    ),

    remarks: z.string().optional(),
  })
  .superRefine((service, context) => {
    // П. 2.3: службу возглавляет руководитель — требуется для обоих способов её
    // создания. При контрактном управляющем службы нет, поэтому и руководитель не
    // указывается.
    if (service.creationMethod !== "contract_manager") {
      if (!hasId(service.head?.employeeId)) {
        context.addIssue({
          code: "custom",
          path: ["head", "employeeId"],
          message:
            "Выберите руководителя контрактной службы из штатного расписания заказчика (п. 2.3 Типового положения)",
        });
      }

      // Приказ о назначении руководителя должен быть кем-то издан — круг лиц
      // ограничен п. 2.3, поэтому выбор из штатного расписания
      if (
        hasId(service.head?.employeeId) &&
        !hasId(service.appointedByEmployeeId) &&
        (service.headOrderNumber || service.headOrderDate)
      ) {
        context.addIssue({
          code: "custom",
          path: ["appointedByEmployeeId"],
          message:
            "Укажите, кто издал приказ о назначении руководителя: руководитель заказчика, лицо, исполняющее его обязанности, либо уполномоченное руководителем лицо (п. 2.3)",
        });
      }

      // Номер и дату приказа о назначении проверяем только для способов со
      // службой: при контрактном управляющие эти поля скрыты, и значения,
      // оставшиеся от предыдущего выбора способа, не должны блокировать сохранение
      if (service.headOrderNumber && !service.headOrderDate) {
        context.addIssue({
          code: "custom",
          path: ["headOrderDate"],
          message: "Укажите дату приказа о назначении руководителя",
        });
      }

      if (service.headOrderDate && !service.headOrderNumber) {
        context.addIssue({
          code: "custom",
          path: ["headOrderNumber"],
          message: "Укажите номер приказа о назначении руководителя",
        });
      }
    }

    if (service.creationMethod === "structural_unit") {
      if (!hasId(service.structuralUnitId)) {
        context.addIssue({
          code: "custom",
          path: ["structuralUnitId"],
          message:
            "Выберите структурное подразделение заказчика, в котором создана контрактная служба",
        });
      }

      return;
    }

    if (service.creationMethod === "contract_manager") {
      if (
        !service.contractManager ||
        !hasId(service.contractManager.employeeId)
      ) {
        context.addIssue({
          code: "custom",
          path: ["contractManager", "employeeId"],
          message:
            "Выберите контрактного управляющего из штатного расписания заказчика",
        });
      }

      return;
    }

    if (service.members.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["members"],
        message:
          "Укажите хотя бы одного работника заказчика, входящего в состав контрактной службы",
      });
    }

    const alreadyIncluded = new Set<string>();

    service.members.forEach((member, index) => {
      if (!hasId(member.employeeId)) {
        context.addIssue({
          code: "custom",
          path: ["members", index, "employeeId"],
          message: "Выберите работника заказчика из штатного расписания",
        });

        return;
      }

      const employeeKey = String(member.employeeId);

      if (alreadyIncluded.has(employeeKey)) {
        context.addIssue({
          code: "custom",
          path: ["members", index, "employeeId"],
          message: "Этот работник уже включён в состав контрактной службы",
        });

        return;
      }

      alreadyIncluded.add(employeeKey);

      if (!hasId(member.structuralUnitId)) {
        context.addIssue({
          code: "custom",
          path: ["members", index, "structuralUnitId"],
          message: "Выберите структурное подразделение работника",
        });
      }
    });

    // Указавший сведения выбирается из штатного расписания, а не вводится
    // вручную: если есть дата или ФИО, должен быть выбран и сам работник.
    if (
      !hasId(service.declaredByEmployeeId) &&
      (service.declaredByName || service.declaredDate)
    ) {
      context.addIssue({
        code: "custom",
        path: ["declaredByEmployeeId"],
        message:
          "Выберите указавшего сведения работника из штатного расписания заказчика",
      });
    }
  })
  .refine((service) => !service.orderNumber || Boolean(service.orderDate), {
    // Для способа "contract_manager" это приказ о назначении управляющего
    message: "Укажите дату приказа",
    path: ["orderDate"],
  })
  .refine((service) => !service.orderDate || Boolean(service.orderNumber), {
    message: "Укажите номер приказа",
    path: ["orderNumber"],
  });

export type ContractService = z.infer<typeof ContractServiceSchema>;

// json-server отдаёт коллекцию списком, поэтому выборка проверяется той же
// схемой — иначе сведения с битыми ссылками попали бы в интерфейс
export const ContractServiceListSchema = z.array(ContractServiceSchema);

// Сведения принадлежат конкретной организации-заказчику: сравнение через String,
// потому что json-server отдаёт id числом, а из формы значение приходит строкой
export const isContractServiceOfOrganization = (
  service: Pick<ContractService, "organizationId">,
  organizationId: string | number,
): boolean =>
  hasId(service.organizationId) &&
  String(service.organizationId) === String(organizationId);

// П. 2.2 Типового положения: численность контрактной службы не может быть
// менее двух человек
export const MIN_CONTRACT_SERVICE_SIZE = 2;

// Ч. 21 ст. 38 44-ФЗ: при совокупном годовом объёме закупок до 100 млн руб.
// заказчик вправе не создавать контрактную службу
export const CONTRACT_MANAGER_MAX_ANNUAL_VOLUME = 100_000_000;

// Должности, которые по п. 2.3 вправе издавать приказ о назначении руководителя
// службы: руководитель заказчика, лицо, исполняющее его обязанности, либо
// уполномоченное руководителем лицо
const APPOINTER_POSITION_PATTERN =
  /директор|главный врач|глава|руководител|заместител|председател/i;

export const isContractServiceAppointerPosition = (
  position?: string,
): boolean => Boolean(position && APPOINTER_POSITION_PATTERN.test(position));

// Ответственные контрактной службы в одном списке: руководитель службы (п. 2.3),
// затем состав либо контрактный управляющий, если служба не создавалась.
// Руководитель не дублируется, когда он уже включён в состав
export const contractServiceStaff = (
  service: Pick<
    ContractService,
    "creationMethod" | "head" | "members" | "contractManager"
  >,
): Array<ContractServiceMember | ContractManager | ContractServiceHead> => {
  if (service.creationMethod === "contract_manager") {
    return service.contractManager?.employeeId ? [service.contractManager] : [];
  }

  const head = service.head?.employeeId ? [service.head] : [];
  const members =
    service.creationMethod === "employees"
      ? service.members.filter(
          (member) =>
            String(member.employeeId) !== String(service.head?.employeeId),
        )
      : [];

  return [...head, ...members];
};

// Численность нормируется только для службы: контрактный управляющий один по
// закону, а пустой состав блокирует сохранение и без предупреждения
export const contractServiceSizeWarning = (
  headcount: number,
  method?: ContractServiceCreationMethod,
): string | null => {
  if (method === "contract_manager" || headcount === 0) {
    return null;
  }

  if (headcount >= MIN_CONTRACT_SERVICE_SIZE) {
    return null;
  }

  return `Штатная численность контрактной службы ${headcount} чел. По п. 2.2 Типового положения она не может составлять менее ${MIN_CONTRACT_SERVICE_SIZE} человек`;
};

// Порог ч. 21 ст. 38 44-ФЗ проверяется только для способа «контрактный
// управляющий»: служба создаётся при любом объёме, поэтому предупреждения нет
export const contractManagerVolumeWarning = (
  annualVolume?: number,
  method?: ContractServiceCreationMethod,
): string | null => {
  if (
    method !== "contract_manager" ||
    !annualVolume ||
    annualVolume <= CONTRACT_MANAGER_MAX_ANNUAL_VOLUME
  ) {
    return null;
  }

  return `Совокупный годовой объём закупок ${new Intl.NumberFormat(
    "ru-RU",
  ).format(
    annualVolume,
  )} ₽ превышает 100 млн руб. При таком объёме заказчик обязан создать контрактную службу (ч. 2 ст. 38 44-ФЗ), контрактный управляющий назначается при объёме до 100 млн руб. (ч. 21 ст. 38 44-ФЗ)`;
};

// Руководитель назначен приказом (п. 2.3): если человек выбран, а приказа нет,
// сведений для подтверждения полномочий недостаточно
export const contractServiceHeadOrderWarning = (
  service: Pick<ContractService, "creationMethod" | "head"> &
    Partial<Pick<ContractService, "headOrderNumber">>,
): string | null => {
  if (
    service.creationMethod === "contract_manager" ||
    !hasId(service.head?.employeeId) ||
    service.headOrderNumber
  ) {
    return null;
  }

  return "Руководитель контрактной службы возглавляет её по приказу руководителя заказчика, уполномоченного лица, исполняющего его обязанности, либо уполномоченного руководителем лица. Укажите номер и дату приказа о назначении (п. 2.3 Типового положения)";
};

// П. 2.3-2.4: руководитель входит в службу и распределяет функции между её
// работниками, поэтому при наборе из работников он должен быть в составе
export const contractServiceHeadMembershipWarning = (
  service: Pick<ContractService, "creationMethod" | "head" | "members">,
): string | null => {
  if (
    service.creationMethod !== "employees" ||
    !hasId(service.head?.employeeId)
  ) {
    return null;
  }

  const isListed = service.members.some(
    (member) => String(member.employeeId) === String(service.head?.employeeId),
  );

  if (isListed) {
    return null;
  }

  return "Руководитель контрактной службы не включён в её состав. По п. 2.3-2.4 Типового положения он входит в службу и распределяет функции между её работниками, поэтому его нужно включить в состав приказом";
};

export const emptyContractServiceMember = (): ContractServiceMember => ({
  employeeId: "",
  employeeFullName: "",
  employeeNumber: "",
  position: "",
  structuralUnitId: "",
  structuralUnitName: "",
  functions: [],
  remarks: "",
});

export const emptyContractManager = (): ContractManager => ({
  employeeId: "",
  employeeFullName: "",
  employeeNumber: "",
  position: "",
  structuralUnitId: "",
  structuralUnitName: "",
  functions: [],
  remarks: "",
});

export const emptyContractServiceHead = (): ContractServiceHead => ({
  employeeId: "",
  employeeFullName: "",
  employeeNumber: "",
  position: "",
  structuralUnitId: "",
  structuralUnitName: "",
  functions: [],
  remarks: "",
});

export const emptyContractService = (
  organizationId: string | number = "",
): ContractService => ({
  organizationId,
  creationMethod: "structural_unit",
  structuralUnitId: "",
  structuralUnitName: "",
  members: [],
  contractManager: emptyContractManager(),
  head: emptyContractServiceHead(),
  headOrderNumber: "",
  headOrderDate: "",
  appointedByEmployeeId: "",
  appointedByName: "",
  appointedByPosition: "",
  orderNumber: "",
  orderDate: "",
  declaredByEmployeeId: "",
  declaredByName: "",
  declaredByPosition: "",
  declaredByStructuralUnitId: "",
  declaredByStructuralUnitName: "",
  declaredDate: "",
  remarks: "",
});
