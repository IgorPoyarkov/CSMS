import { useEffect, useRef, useState } from "react";
import {
  Controller,
  FormProvider,
  get,
  useFieldArray,
  useForm,
  useWatch,
  type FieldError,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import { useSaveContractService } from "../../services/ContractService/contractService.api";
import {
  contractServiceSizeWarning,
  contractServiceHeadOrderWarning,
  contractServiceHeadMembershipWarning,
  emptyContractService,
  emptyContractServiceMember,
  isContractServiceAppointerPosition,
  ContractServiceSchema,
  contractServiceFunctionCodes,
  type ContractService,
  type ContractServiceCreationMethod,
  type ContractServiceFunction,
} from "../../services/ContractService/contractService.schema";
import {
  useFetchOrganizationEmployees,
  useFetchStructuralUnits,
} from "../../services/StaffingTable/StaffingTable.api";
import type { BaseEmployee } from "../../services/StaffingTable/StaffingTable.schema";
import CustomInput from "../UI/CustomInput";
import {
  contractServiceCreationMethodOptions,
  contractServiceDeclarationFields,
  contractServiceFunctionCategories,
  contractServiceFunctionOptions,
  contractServiceHeadOrderFields,
  contractServiceHeadcount,
  contractServiceOrderFields,
} from "./contractService.config";
import { getOrder158nTasksByFunction } from "../../services/Tasks/order158nTaskPool";
import StaffEmployeePicker, {
  type StaffEmployeeFields,
} from "./StaffEmployeePicker";
import StaffEmployeeSelect, {
  type StaffEmployeeSelectFields,
} from "./StaffEmployeeSelect";
import styles from "./ContractServicePage.module.scss";

interface ContractServiceFormProps {
  organizationId: string | number;
  organizationName: string;
  service?: ContractService;
  onSaved?: (service: ContractService) => void;
  onCancel?: () => void;
}

// Пути снимков работника: состав службы, контрактный управляющий и работник,
// указавший сведения, выбираются по одному сценарию «отдел → человек»
const memberEmployeeFields = (index: number): StaffEmployeeFields => ({
  unitId: `members.${index}.structuralUnitId`,
  unitName: `members.${index}.structuralUnitName`,
  employeeId: `members.${index}.employeeId`,
  fullName: `members.${index}.employeeFullName`,
  employeeNumber: `members.${index}.employeeNumber`,
  position: `members.${index}.position`,
});

const managerEmployeeFields: StaffEmployeeFields = {
  unitId: "contractManager.structuralUnitId",
  unitName: "contractManager.structuralUnitName",
  employeeId: "contractManager.employeeId",
  fullName: "contractManager.employeeFullName",
  employeeNumber: "contractManager.employeeNumber",
  position: "contractManager.position",
};

// Руководитель службы (п. 2.3) выбирается по той же схеме «отдел → работник»
const headEmployeeFields: StaffEmployeeFields = {
  unitId: "head.structuralUnitId",
  unitName: "head.structuralUnitName",
  employeeId: "head.employeeId",
  fullName: "head.employeeFullName",
  employeeNumber: "head.employeeNumber",
  position: "head.position",
};

// Лицо, издавшее приказ о назначении руководителя, выбирается без отдела —
// круг кандидатов ограничен п. 2.3
const appointerFields: StaffEmployeeSelectFields = {
  employeeId: "appointedByEmployeeId",
  fullName: "appointedByName",
  position: "appointedByPosition",
};

const declaratorEmployeeFields: StaffEmployeeFields = {
  unitId: "declaredByStructuralUnitId",
  unitName: "declaredByStructuralUnitName",
  employeeId: "declaredByEmployeeId",
  fullName: "declaredByName",
  position: "declaredByPosition",
};

// Отметка функций: toggle — если уже выбрана, снять; иначе добавить.
// Порядок сохраняет справочник contractServiceFunctionCodes, чтобы перечень
// не «прыгал» при назначении функций в произвольном порядке.
const toggleFunction = (
  selected: ContractServiceFunction[],
  toggled: ContractServiceFunction,
): ContractServiceFunction[] => {
  const next = selected.includes(toggled)
    ? selected.filter((code) => code !== toggled)
    : [...selected, toggled];

  return contractServiceFunctionCodes.filter((code) => next.includes(code));
};

// Функции сгруппированы по категориям (раскрывающиеся списки) — аналогично ЛК.
// При снятии последней функции в категории она всё равно остаётся видимой
// (пустая категория не прячется), чтобы пользователь не потерял её из виду.
function FunctionPicker({
  value = [],
  onChange,
}: {
  value?: ContractServiceFunction[];
  onChange?: (functions: ContractServiceFunction[]) => void;
}) {
  const { bem } = useUtils();
  const block = bem(styles, "contract-service");

  return (
    <div className={block("functions")}>
      {contractServiceFunctionCategories.map((category) => {
        const selectedInCategory = category.functions.filter((code) =>
          value.includes(code),
        );

        return (
          <details
            key={category.id}
            className={block("function-group")}
            open={selectedInCategory.length > 0}
          >
            <summary>
              {category.label}
              {selectedInCategory.length > 0
                ? ` (${selectedInCategory.length})`
                : ""}
            </summary>
            <div className={block("function-group__body")}>
              {category.functions.map((code) => {
                const option = contractServiceFunctionOptions.find(
                  (o) => o.value === code,
                );
                const subClauses = getOrder158nTasksByFunction(code)
                  .map((item) => item.clause)
                  .join(", ");

                return (
                  <label key={code} className={block("checkbox")}>
                    <input
                      type="checkbox"
                      checked={value.includes(code)}
                      onChange={() => onChange?.(toggleFunction(value, code))}
                    />
                    <span>
                      {option?.paragraph} · {option?.label}
                      {subClauses ? ` (${subClauses})` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default function ContractServiceForm({
  organizationId,
  organizationName,
  service,
  onSaved,
  onCancel,
}: ContractServiceFormProps) {
  const { bem } = useUtils();
  const block = bem(styles, "contract-service");
  const saveService = useSaveContractService();

  // .default([]) в схеме делает входной и выходной типы различными (поле может
  // отсутствовать в ответе json-server), поэтому resolver приводится к типу
  // значений формы
  const methods = useForm<ContractService>({
    resolver: zodResolver(ContractServiceSchema) as Resolver<ContractService>,
    defaultValues: service ?? emptyContractService(organizationId),
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = methods;

  const members = useFieldArray({ control, name: "members" });

  const errorMessage = (path: string): string | undefined =>
    (get(errors, path) as FieldError | undefined)?.message;

  const { data: structuralUnits = [], isLoading: isUnitsLoading } =
    useFetchStructuralUnits(organizationId);
  const { data: employees = [], isLoading: isEmployeesLoading } =
    useFetchOrganizationEmployees(organizationId);

  const watchedMethod = useWatch({ control, name: "creationMethod" });
  const watchedUnitId = useWatch({ control, name: "structuralUnitId" });
  const watchedMembers = useWatch({ control, name: "members" }) ?? [];
  const watchedManager = useWatch({ control, name: "contractManager" });
  const watchedHead = useWatch({ control, name: "head" });
  const watchedHeadOrderNumber = useWatch({ control, name: "headOrderNumber" });

  // При редактировании существующей службы способ создания меняется только
  // через подтверждение: это критичное изменение, сбрасывающее состав/функции
  const originalMethod = service?.creationMethod;
  const [pendingMethod, setPendingMethod] =
    useState<ContractServiceCreationMethod | null>(null);
  const [showMethodConfirm, setShowMethodConfirm] = useState(false);

  // Для members: открытые карточки работников (по field.id из useFieldArray).
  // При добавлении нового — открыт только он, при редактировании — все свёрнуты.
  const [openMemberIds, setOpenMemberIds] = useState<Set<string>>(new Set());
  const prevFieldIdsRef = useRef<Set<string>>(new Set());

  // Отслеживаем появление новых members (при members.append) — открываем их
  useEffect(() => {
    const currentIds = new Set(members.fields.map((f) => f.id));
    const newIds = members.fields
      .filter((f) => !prevFieldIdsRef.current.has(f.id))
      .map((f) => f.id);

    if (newIds.length > 0) {
      setOpenMemberIds((prev) => new Set([...prev, ...newIds]));
    }
    prevFieldIdsRef.current = currentIds;
  }, [members.fields.length]);

  // Отдел перечисляем по алфавиту: в штатке их много, искать по порядку неудобно

  // Организация-владелец берётся из учётной записи и не выбирается вручную
  useEffect(() => {
    setValue("organizationId", organizationId, { shouldValidate: true });
  }, [organizationId, setValue]);

  const employeesOfUnit = (structuralUnitId: unknown): BaseEmployee[] =>
    employees.filter(
      (employee) =>
        String(employee.structuralUnitId) === String(structuralUnitId),
    );

  // Отделы перечисляем по алфавиту: в штатке их много, искать по порядку неудобно
  const unitOptions = [...structuralUnits].sort((first, second) =>
    String(first.name).localeCompare(String(second.name), "ru"),
  );

  const headcount = contractServiceHeadcount(
    {
      creationMethod: watchedMethod,
      structuralUnitId: watchedUnitId,
      members: watchedMembers,
      contractManager: watchedManager,
      head: watchedHead,
    },
    employeesOfUnit(watchedUnitId),
  );
  const sizeWarning = contractServiceSizeWarning(headcount, watchedMethod);

  // П. 2.3: приказ о назначении руководителя службы издаёт ограниченный круг лиц
  // (руководитель заказчика, исполняющий его обязанности либо уполномоченное
  // лицо). Если в штатке таких должностей нет, предлагаем выбирать любого
  // работника, чтобы заказчик мог внести уполномоченное лицо
  const appointerCandidates = employees.filter((employee) =>
    isContractServiceAppointerPosition(employee.position),
  );
  const appointers =
    appointerCandidates.length > 0 ? appointerCandidates : employees;
  const headOrderWarning = contractServiceHeadOrderWarning({
    creationMethod: watchedMethod,
    head: watchedHead,
    headOrderNumber: watchedHeadOrderNumber,
  });
  const headMembershipWarning = contractServiceHeadMembershipWarning({
    creationMethod: watchedMethod,
    head: watchedHead,
    members: watchedMembers,
  });

  function onSubmit(data: ContractService) {
    saveService.mutate(
      { ...data, organizationId },
      { onSuccess: (saved) => onSaved?.(saved) },
    );
  }

  return (
    <section className={block("form")}>
      <h2 className={block("form-title")}>
        {service
          ? "Изменение сведений о контрактной службе"
          : "Укажите, каким образом создана контрактная служба"}
      </h2>
      <p className={block("lead")}>
        {organizationName}. Способ создания контрактной службы указывается один
        раз и требуется п. 2.1 Типового положения (регламента) о контрактной
        службе, утверждённого приказом Минфина России от 31.07.2020 N 158н.
      </p>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset className={block("section")}>
            <legend>Способ создания</legend>

            <div className={block("methods")}>
              {contractServiceCreationMethodOptions.map((option) => (
                <label
                  key={option.value}
                  className={
                    watchedMethod === option.value
                      ? block("method", ["active"])
                      : block("method")
                  }
                >
                  <input
                    type="radio"
                    value={option.value}
                    {...register("creationMethod", {
                      onChange: (event) => {
                        const newMethod = event.target
                          .value as ContractServiceCreationMethod;

                        // При редактировании способ меняется только через
                        // подтверждение — он сбрасывает состав и функции
                        if (
                          service &&
                          originalMethod &&
                          newMethod !== originalMethod
                        ) {
                          setPendingMethod(newMethod);
                          setShowMethodConfirm(true);
                        }
                      },
                    })}
                  />
                  <span className={block("method-title")}>{option.label}</span>
                  <span className={block("method-hint")}>{option.hint}</span>
                  <span className={block("method-basis")}>
                    {option.legalBasis}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Руководитель — всегда первым после способа создания (п. 2.3) */}
          {(service || watchedMethod !== "contract_manager") && (
            <fieldset className={block("section")}>
              <legend>Руководитель контрактной службы</legend>
              <p className={block("lead")}>
                По п. 2.3 Типового положения службу возглавляет руководитель,
                назначаемый приказом руководителя заказчика, уполномоченного
                лица, исполняющего его обязанности, либо уполномоченного
                руководителем лица. Руководитель распределяет функции между
                работниками службы (п. 2.4).
              </p>

              <StaffEmployeePicker
                fields={headEmployeeFields}
                units={structuralUnits}
                employees={employees}
                idPrefix="service-head"
                unitLabel="Подразделение руководителя (при наличии)"
                employeeLabel="Руководитель контрактной службы"
                unitOptional
                unitOptionalHint="— в прямом подчинении руководителя —"
                isUnitsLoading={isUnitsLoading}
                isEmployeesLoading={isEmployeesLoading}
              />

              <div className={block("grid")}>
                {contractServiceHeadOrderFields.map((fieldConfig) => (
                  <CustomInput
                    key={fieldConfig.input.name}
                    configuration={fieldConfig}
                  />
                ))}

                <StaffEmployeeSelect
                  fields={appointerFields}
                  employees={appointers}
                  idPrefix="head-appointer"
                  label="Приказ издал (п. 2.3)"
                  emptyOptionLabel="— выберите руководителя заказчика или уполномоченное лицо —"
                  hint={
                    appointerCandidates.length > 0
                      ? "Список ограничен должностями руководства: именно они вправе издавать приказ о назначении"
                      : "В штатном расписании нет должностей руководства — выберите уполномоченное лицо"
                  }
                  isLoading={isEmployeesLoading}
                />
              </div>

              {headOrderWarning && (
                <p className={block("warning")}>{headOrderWarning}</p>
              )}
              {headMembershipWarning && (
                <p className={block("warning")}>{headMembershipWarning}</p>
              )}
            </fieldset>
          )}

          {watchedMethod === "structural_unit" && (
            <fieldset className={block("section")}>
              <legend>Структурное подразделение контрактной службы</legend>

              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="contract-service-unit"
                >
                  Подразделение из штатного расписания
                </label>
                <select
                  id="contract-service-unit"
                  className={block("select")}
                  {...register("structuralUnitId", {
                    onChange: (event) =>
                      setValue(
                        "structuralUnitName",
                        structuralUnits.find(
                          (unit) => String(unit.id) === event.target.value,
                        )?.name ?? "",
                        { shouldValidate: false },
                      ),
                  })}
                >
                  <option value="">— выберите подразделение —</option>
                  {unitOptions.map((unit) => (
                    <option key={String(unit.id)} value={String(unit.id)}>
                      {unit.name}
                      {unit.conventionalSymbol
                        ? ` (${unit.conventionalSymbol})`
                        : ""}
                    </option>
                  ))}
                </select>
                {isUnitsLoading && (
                  <span className={block("hint")}>
                    Загрузка подразделений...
                  </span>
                )}
                {errorMessage("structuralUnitId") && (
                  <span className={block("error")}>
                    {errorMessage("structuralUnitId")}
                  </span>
                )}
              </div>
            </fieldset>
          )}

          {watchedMethod === "employees" && (
            <fieldset className={block("section")}>
              <legend>Состав контрактной службы из работников заказчика</legend>

              {members.fields.map((field, index) => {
                const memberName =
                  watchedMembers[index]?.employeeFullName || "новый работник";

                return (
                  <details
                    key={field.id}
                    className={block("member")}
                    open={openMemberIds.has(field.id)}
                    onToggle={(event) => {
                      const isOpen = (event.target as HTMLDetailsElement).open;

                      setOpenMemberIds((prev) => {
                        const next = new Set(prev);

                        if (isOpen) {
                          next.add(field.id);
                        } else {
                          next.delete(field.id);
                        }

                        return next;
                      });
                    }}
                  >
                    <summary className={block("member-header")}>
                      <span className={block("member-title")}>
                        {index + 1}. {memberName}
                      </span>
                    </summary>

                    <div className={block("member-body")}>
                      <StaffEmployeePicker
                        fields={memberEmployeeFields(index)}
                        units={structuralUnits}
                        employees={employees}
                        idPrefix={`member-${field.id}`}
                        isUnitsLoading={isUnitsLoading}
                        isEmployeesLoading={isEmployeesLoading}
                      />

                      <Controller
                        control={control}
                        name={`members.${index}.functions`}
                        render={({ field: functionsField }) => (
                          <FunctionPicker
                            value={functionsField.value ?? []}
                            onChange={functionsField.onChange}
                          />
                        )}
                      />
                      {errorMessage(`members.${index}.functions`) && (
                        <span className={block("error")}>
                          {errorMessage(`members.${index}.functions`)}
                        </span>
                      )}

                      <button
                        type="button"
                        className={block("member-remove")}
                        onClick={() => {
                          members.remove(index);
                          setOpenMemberIds((prev) => {
                            const next = new Set(prev);
                            next.delete(field.id);
                            return next;
                          });
                        }}
                      >
                        Исключить
                      </button>
                    </div>
                  </details>
                );
              })}

              <button
                type="button"
                className={block("add-button")}
                onClick={() => members.append(emptyContractServiceMember())}
              >
                Добавить работника
              </button>
              {errorMessage("members") && (
                <span className={block("error")}>
                  {errorMessage("members")}
                </span>
              )}
            </fieldset>
          )}

          {watchedMethod === "contract_manager" && (
            <fieldset className={block("section")}>
              <legend>Контрактный управляющий</legend>

              <StaffEmployeePicker
                fields={managerEmployeeFields}
                units={structuralUnits}
                employees={employees}
                idPrefix="contract-manager"
                unitLabel="Подразделение управляющего (при наличии)"
                employeeLabel="Контрактный управляющий"
                unitOptional
                unitOptionalHint="— в прямом подчинении руководителя —"
                isUnitsLoading={isUnitsLoading}
                isEmployeesLoading={isEmployeesLoading}
              />

              <Controller
                control={control}
                name="contractManager.functions"
                render={({ field: functionsField }) => (
                  <FunctionPicker
                    value={functionsField.value ?? []}
                    onChange={functionsField.onChange}
                  />
                )}
              />
            </fieldset>
          )}

          {/* Руководитель контрактной службы — вверху формы (см. задачу 0
              Tasks 3): по п. 2.3 он возглавляет службу, поэтому секция идёт
              сразу после способа создания, до состава */}

          <fieldset className={block("section")}>
            <legend>Приказ-основание</legend>
            <div className={block("grid")}>
              {contractServiceOrderFields.map((fieldConfig) => (
                <CustomInput
                  key={fieldConfig.input.name}
                  configuration={fieldConfig}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className={block("section")}>
            <legend>Кто указал сведения</legend>
            <p className={block("lead")}>
              Указавший сведения берётся из штатного расписания: сначала отдел,
              затем работник. Должность и отдел сохраняются вместе со
              сведениями, вписывать их вручную не нужно.
            </p>

            <StaffEmployeePicker
              fields={declaratorEmployeeFields}
              units={structuralUnits}
              employees={employees}
              idPrefix="declared-by"
              unitLabel="Подразделение (отдел)"
              employeeLabel="Указал сведения"
              isUnitsLoading={isUnitsLoading}
              isEmployeesLoading={isEmployeesLoading}
            />

            <div className={block("grid")}>
              {contractServiceDeclarationFields.map((fieldConfig) => (
                <CustomInput
                  key={fieldConfig.input.name}
                  configuration={fieldConfig}
                />
              ))}
            </div>
          </fieldset>

          {sizeWarning && <p className={block("warning")}>{sizeWarning}</p>}

          {saveService.isError && (
            <p className={block("error")}>{String(saveService.error)}</p>
          )}

          <div className={block("actions")}>
            <button
              type="submit"
              className={block("submit")}
              disabled={saveService.isPending || !organizationId}
            >
              {saveService.isPending ? "Сохранение..." : "Сохранить сведения"}
            </button>
            {onCancel && (
              <button
                type="button"
                className={block("cancel")}
                onClick={onCancel}
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      </FormProvider>

      {/* Подтверждение смены способа создания: сбрасывает состав и функции */}
      {showMethodConfirm && (
        <div
          className={block("confirm-overlay")}
          onClick={() => setShowMethodConfirm(false)}
        >
          <div
            className={block("confirm-window")}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={block("confirm-title")}>Сменить способ создания?</h3>
            <p className={block("confirm-text")}>
              Выбран новый способ создания контрактной службы. Это сбросит
              текущий состав службы, функции и полномочия работников.
              Сохранённые данные будут перезаписаны.
            </p>
            <div className={block("confirm-actions")}>
              <button
                type="button"
                className={block("confirm-btn", ["ghost"])}
                onClick={() => {
                  setShowMethodConfirm(false);
                  setPendingMethod(null);
                  // Возвращаем прежний способ
                  if (originalMethod) {
                    setValue("creationMethod", originalMethod, {
                      shouldValidate: false,
                    });
                  }
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className={block("confirm-btn", ["danger"])}
                onClick={() => {
                  if (pendingMethod) {
                    setValue("creationMethod", pendingMethod, {
                      shouldValidate: false,
                    });
                  }
                  setShowMethodConfirm(false);
                  setPendingMethod(null);
                }}
              >
                Сменить способ
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
