import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FormProvider,
  get,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import type { FieldError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useUtils from "../../hooks/useUtils";
import {
  useCreatePurchasePlan,
  usePurchasePlan,
  useUpdatePurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.api";
import {
  useCreatePurchasePlanVersion,
  usePurchasePlanVersions,
} from "../../services/PurchasePlan/purchasePlanVersion.api";
import {
  emptyPurchasePlan,
  emptyPurchasePlanPosition,
  PurchasePlanSchema,
  type PurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.schema";
import { organizationToCustomer } from "../../services/Organization/organization.schema";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useContractService } from "../../services/ContractService/contractService.api";
import CustomInput from "../UI/CustomInput";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import {
  okpd2FieldLabels,
  ownerRoleOptions,
  pfhdTypeOptions,
  planHeaderFields,
  positionFields,
  purchasePlanStatusOptions,
  formatMoney,
} from "./purchasePlan.config";
import styles from "./PurchasePlanForm.module.scss";

export default function PurchasePlanForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { data: organization, isLoading: isOrganizationLoading } =
    useCurrentOrganization();
  const organizationId = organization?.id;
  const {
    data: loadedPlan,
    isError: isPlanLoadError,
    error: planLoadError,
  } = usePurchasePlan(id, organizationId);
  const createPlan = useCreatePurchasePlan();
  const updatePlan = useUpdatePurchasePlan();
  const createVersion = useCreatePurchasePlanVersion();
  const { data: existingVersions = [] } = usePurchasePlanVersions(
    id,
    organizationId,
  );
  const [todayIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [saveVersionSnapshot, setSaveVersionSnapshot] = useState(true);
  const { bem } = useUtils();
  const block = bem(styles, "purchase-plan-form");

  const methods = useForm<PurchasePlan>({
    resolver: zodResolver(PurchasePlanSchema),
    defaultValues: emptyPurchasePlan(),
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = methods;

  const positions = useFieldArray({ control, name: "positions" });

  // Справочник ОКПД2 нужен и для выбора позиции, и для контроля нормирования
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  // Сообщение об ошибке вложенного поля (select, checkbox) берём по пути,
  // чтобы не разматывать deep-тип FieldErrors вручную.
  const errorMessage = (path: string): string | undefined =>
    (get(errors, path) as FieldError | undefined)?.message;

  useEffect(() => {
    if (isEdit && loadedPlan) {
      reset(loadedPlan);
    }
  }, [isEdit, loadedPlan, reset]);

  // Заказчик не заполняется вручную: новый план-график всегда оформляется на
  // организацию, к которой привязана учётная запись вошедшего пользователя.
  useEffect(() => {
    if (!isEdit && organization) {
      setValue("organizationId", organization.id as string | number, {
        shouldValidate: true,
        shouldDirty: false,
      });
      setValue("customer", organizationToCustomer(organization), {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [isEdit, organization, setValue]);

  const isPending = createPlan.isPending || updatePlan.isPending;
  const mutationError = createPlan.error ?? updatePlan.error;
  const customer = useWatch({ control, name: "customer" });
  const ownerRole = useWatch({ control, name: "ownerRole" });
  const okeiCode = useWatch({ control, name: "okeiCode" });
  const okeiName = useWatch({ control, name: "okeiName" });
  // Новый план-график формируется только после того, как заказчик указал
  // способ создания контрактной службы (п. 2.1 приказа N 158н).
  const { data: contractService, isLoading: isContractServiceLoading } =
    useContractService(organizationId);
  const needsContractService =
    !isEdit &&
    Boolean(organizationId) &&
    !isContractServiceLoading &&
    !contractService;
  const canSave =
    Boolean(organizationId && customer?.fullName) && !needsContractService;

  function okpd2NormControlHint(code: string | undefined) {
    const matched = findOkpd2ByCode(okpd2Refs, code);

    if (!matched?.isNormed) {
      return null;
    }

    return (
      <span className={block("hint", ["norm"])}>
        Код {matched.code} подлежит обязательному нормированию.
        {matched.normLimit
          ? ` Предельная цена единицы — ${formatMoney(matched.normLimit)}; превышение допускается только с обоснованием, подписанным главным подписантом.`
          : " Требования к позиции устанавливаются общими правилами определения требований."}
      </span>
    );
  }

  async function onSubmit(data: PurchasePlan) {
    const nextVerNum =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((v) => v.versionNumber)) + 1
        : Number(data.versionNumber || 1) + (isEdit ? 1 : 0);

    if (isEdit && id) {
      const updated = await updatePlan.mutateAsync({ id, data });
      if (saveVersionSnapshot && updated.id !== undefined) {
        const snapStatus =
          updated.status === "published"
            ? "published"
            : updated.approvalDate
              ? "approved"
              : "draft";
        await createVersion.mutateAsync({
          purchasePlanId: updated.id,
          organizationId: updated.organizationId,
          versionNumber: nextVerNum,
          versionLabel: `Редакция № ${nextVerNum} (${
            snapStatus === "published"
              ? "ЕИС"
              : snapStatus === "approved"
                ? "утверждена"
                : "черновик"
          })`,
          snapshotStatus: snapStatus,
          createdAt: todayIso,
          createdBy:
            updated.approvalAuthor ||
            updated.customer.responsiblePerson ||
            "Специалист КС",
          comment: updated.remarks || "Сохранение через редактор плана-графика",
          snapshot: updated,
        });
      }
      navigate(`/purchase-plans/${updated.id ?? id}`);
      return;
    }

    const created = await createPlan.mutateAsync(data);
    if (created.id !== undefined) {
      await createVersion.mutateAsync({
        purchasePlanId: created.id,
        organizationId: created.organizationId,
        versionNumber: 1,
        versionLabel: "Первоначальная редакция № 1",
        snapshotStatus: created.status === "published" ? "published" : "draft",
        createdAt: todayIso,
        createdBy: created.customer.responsiblePerson || "Специалист КС",
        comment: created.remarks || "Создание нового плана-графика",
        snapshot: created,
      });
    }
    navigate(`/purchase-plans/${created.id ?? ""}`);
  }

  return (
    <section className={block()}>
      <nav className={block("breadcrumbs")} aria-label="Навигация">
        <button
          type="button"
          className={block("crumb")}
          onClick={() => navigate("/purchase-plans")}
        >
          Планы-графики закупок (44-ФЗ)
        </button>
        <span className={block("crumb-sep")} aria-hidden="true">
          /
        </span>
        <span className={block("crumb-current")}>
          {isEdit
            ? "Изменение плана-графика закупок"
            : "Новый план-график закупок"}
        </span>
      </nav>

      <header className={block("header")}>
        <div className={block("header-main")}>
          <h1 className={block("title")}>
            {isEdit
              ? "Изменение плана-графика закупок"
              : "Новый план-график закупок (44-ФЗ)"}
          </h1>
          <p className={block("subtitle")}>
            Реквизиты плана-графика и сведения о заказчике в соответствии с
            форматом ЕИС (tenderPlan2020)
          </p>
        </div>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-plans")}
        >
          ← К списку планов-графиков
        </button>
      </header>

      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          <fieldset className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title")}>
                1. Сведения о плане-графике
              </h2>
            </div>

            <div className={block("grid")}>
              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="purchase-plan-status"
                >
                  Статус плана-графика
                </label>
                <select
                  id="purchase-plan-status"
                  className={block("select")}
                  {...register("status")}
                >
                  {purchasePlanStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errorMessage("status") && (
                  <span className={block("error")}>
                    {errorMessage("status")}
                  </span>
                )}
              </div>

              {planHeaderFields.map((fieldConfig) => (
                <CustomInput
                  key={fieldConfig.input.name}
                  configuration={fieldConfig}
                />
              ))}

              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="purchase-plan-owner-role"
                >
                  Роль владельца версии (ЕИС 17.0)
                </label>
                <select
                  id="purchase-plan-owner-role"
                  className={block("select")}
                  {...register("ownerRole")}
                >
                  {ownerRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={block("field")}>
                <label className={block("label")} htmlFor="purchase-plan-pfhd">
                  Вид ПФХД (tenderPlan2020)
                </label>
                <select
                  id="purchase-plan-pfhd"
                  className={block("select")}
                  {...register("pfhdType")}
                >
                  {pfhdTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <CustomInput
                configuration={{
                  label: { value: "Первый год планового периода" },
                  input: { name: "planPeriodFirstYear", placeholder: "2027" },
                }}
              />
              <CustomInput
                configuration={{
                  label: { value: "Второй год планового периода" },
                  input: { name: "planPeriodSecondYear", placeholder: "2028" },
                }}
              />
              <CustomInput
                configuration={{
                  label: {
                    value: "Дата направления на контроль (ч. 5 ст. 99)",
                  },
                  input: { name: "directDate", type: "date" },
                }}
              />
            </div>
          </fieldset>

          <fieldset className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title")}>2. Сведения о заказчике</h2>
            </div>

            {isEdit && isPlanLoadError && (
              <p className={block("hint", ["warning"])}>
                План-график недоступен для просмотра и изменения:{" "}
                {String(planLoadError)}
              </p>
            )}

            {isOrganizationLoading && !canSave && (
              <p className={block("hint")}>
                Определяем организацию заказчика...
              </p>
            )}

            {!isOrganizationLoading && !organizationId && (
              <p className={block("hint", ["warning"])}>
                К вашей учётной записи не привязана организация-заказчик,
                поэтому план-график сформировать нельзя. Обратитесь к
                администратору системы для привязки организации и ИНН.
              </p>
            )}

            {canSave && (
              <>
                <ul className={block("customer")}>
                  <li className={block("customer-item")}>
                    <span className={block("customer-label")}>
                      Полное наименование
                    </span>
                    <span className={block("customer-value")}>
                      {customer.fullName}
                    </span>
                  </li>
                  <li className={block("customer-item")}>
                    <span className={block("customer-label")}>
                      Краткое наименование
                    </span>
                    <span className={block("customer-value")}>
                      {customer.shortName || "—"}
                    </span>
                  </li>
                  <li className={block("customer-item")}>
                    <span className={block("customer-label")}>ИНН / КПП</span>
                    <span className={block("customer-value")}>
                      {customer.inn} / {customer.kpp || "—"}
                    </span>
                  </li>
                  <li className={block("customer-item")}>
                    <span className={block("customer-label")}>
                      Юридический адрес
                    </span>
                    <span className={block("customer-value")}>
                      {customer.legalAddress || "—"}
                    </span>
                  </li>
                  <li className={block("customer-item")}>
                    <span className={block("customer-label")}>
                      Ответственный за планирование
                    </span>
                    <span className={block("customer-value")}>
                      {customer.responsiblePerson || "—"}
                      {customer.responsiblePhone
                        ? ` (${customer.responsiblePhone})`
                        : ""}
                    </span>
                  </li>
                  <li className={block("customer-item")}>
                    <span className={block("customer-label")}>
                      ОКОПФ / ОКФС
                    </span>
                    <span className={block("customer-value")}>
                      {customer.okopf || "—"} / {customer.okfs || "—"}
                    </span>
                  </li>
                  <li className={block("customer-item")}>
                    <span className={block("customer-label")}>
                      Код по СПЗ / ОКТМО (ЕИС 17.0)
                    </span>
                    <span className={block("customer-value")}>
                      {customer.regNum || customer.consRegistryNum || "—"} /{" "}
                      {customer.oktmo || "—"}
                    </span>
                  </li>
                  <li className={block("customer-item")}>
                    <span className={block("customer-label")}>
                      Единица измерения (ОКЕИ)
                    </span>
                    <span className={block("customer-value")}>
                      {okeiCode || "383"} — {okeiName || "рубль"}
                    </span>
                  </li>
                </ul>
                <div className={block("grid")}>
                  <CustomInput
                    configuration={{
                      label: {
                        value: "Код организации по СПЗ (11 цифр, ЕИС 17.0)",
                      },
                      input: {
                        name: "customer.regNum",
                        placeholder: "00000000000",
                      },
                    }}
                  />
                  <CustomInput
                    configuration={{
                      label: { value: "Код по Сводному реестру (СвР)" },
                      input: {
                        name: "customer.consRegistryNum",
                        placeholder: "001Ж0000",
                      },
                    }}
                  />
                  <CustomInput
                    configuration={{
                      label: { value: "Код ОКТМО организации" },
                      input: {
                        name: "customer.oktmo",
                        placeholder: "38701000",
                      },
                    }}
                  />
                </div>
                <p className={block("hint")}>
                  {isEdit
                    ? "Основные реквизиты заказчика зафиксированы в плане-графике при формировании; коды СПЗ/СвР/ОКТМО дополняются для выгрузки в ЕИС 17.0."
                    : "Реквизиты подтянуты из учётной записи пользователя; при необходимости дополните коды СПЗ, СвР и ОКТМО для ЕИС 17.0."}
                </p>
              </>
            )}
          </fieldset>

          {ownerRole === "OA" && (
            <fieldset className={block("section")}>
              <div className={block("section-head")}>
                <h2 className={block("section-title")}>
                  Организация, которой переданы полномочия заказчика
                </h2>
              </div>
              <div className={block("grid")}>
                <CustomInput
                  configuration={{
                    label: {
                      value: "Полное наименование организации",
                    },
                    input: {
                      name: "authorizedOrganization.fullName",
                      placeholder: "Государственное бюджетное учреждение «...»",
                    },
                  }}
                />
                <CustomInput
                  configuration={{
                    label: { value: "ИНН организации" },
                    input: {
                      name: "authorizedOrganization.inn",
                      placeholder: "0000000000",
                    },
                  }}
                />
                <CustomInput
                  configuration={{
                    label: { value: "КПП организации" },
                    input: {
                      name: "authorizedOrganization.kpp",
                      placeholder: "000000000",
                    },
                  }}
                />
                <CustomInput
                  configuration={{
                    label: {
                      value:
                        "Место нахождения, телефон, адрес электронной почты",
                    },
                    input: {
                      name: "authorizedOrganization.legalAddress",
                      placeholder: "Адрес местонахождения организации",
                    },
                  }}
                />
                <CustomInput
                  configuration={{
                    label: { value: "Телефон организации" },
                    input: {
                      name: "authorizedOrganization.phone",
                      placeholder: "8-000-000-00-00",
                    },
                  }}
                />
                <CustomInput
                  configuration={{
                    label: { value: "Адрес электронной почты организации" },
                    input: {
                      name: "authorizedOrganization.email",
                      placeholder: "org@example.ru",
                    },
                  }}
                />
                <CustomInput
                  configuration={{
                    label: { value: "Код ОКТМО организации" },
                    input: {
                      name: "authorizedOrganization.oktmo",
                      placeholder: "00000000",
                    },
                  }}
                />
              </div>
              {errorMessage("authorizedOrganization") && (
                <p className={block("error")}>
                  {errorMessage("authorizedOrganization")}
                </p>
              )}
              <p className={block("hint")}>
                Заполняется по пункту 14, подпункту «ж» Положения N 1279, если
                план-график формирует бюджетное, автономное учреждение,
                унитарное предприятие или иное юридическое лицо, которому
                переданы полномочия заказчика.
              </p>
            </fieldset>
          )}

          <fieldset className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title")}>
                3. Записи плана-графика ({positions.fields.length})
              </h2>
            </div>

            {positions.fields.length === 0 && (
              <p className={block("hint")}>
                Записи плана-графика не внесены — добавьте закупку кнопкой ниже.
              </p>
            )}

            {errorMessage("positions.message") && (
              <p className={block("error")}>
                {errorMessage("positions.message")}
              </p>
            )}

            <ul className={block("positions")}>
              {positions.fields.map((field, index) => (
                <li key={field.id} className={block("position")}>
                  <div className={block("position-header")}>
                    <span className={block("position-title")}>
                      Запись плана-графика № {index + 1}
                    </span>
                    <button
                      type="button"
                      className={block("remove-button")}
                      onClick={() => positions.remove(index)}
                    >
                      Удалить запись
                    </button>
                  </div>

                  <div className={block("grid")}>
                    {positionFields.map((fieldConfig) => (
                      <CustomInput
                        key={`${index}-${fieldConfig.input.name}`}
                        configuration={fieldConfig}
                        prefixPath={`positions.${index}`}
                      />
                    ))}

                    <div className={block("field", ["okpd2"])}>
                      <label
                        className={block("label")}
                        htmlFor={`okpd2-${index}`}
                      >
                        {okpd2FieldLabels.code}
                      </label>
                      <Okpd2Select
                        id={`okpd2-${index}`}
                        code={watch(`positions.${index}.okpd2Code`)}
                        name={watch(`positions.${index}.okpd2Name`)}
                        onSelect={(item) => {
                          setValue(
                            `positions.${index}.okpd2Code`,
                            item?.code ?? "",
                            { shouldValidate: true },
                          );
                          setValue(
                            `positions.${index}.okpd2Name`,
                            item?.name ?? "",
                            { shouldValidate: true },
                          );
                        }}
                      />
                      {errorMessage(`positions.${index}.okpd2Code`) && (
                        <span className={block("error")}>
                          {errorMessage(`positions.${index}.okpd2Code`)}
                        </span>
                      )}
                      {okpd2NormControlHint(
                        watch(`positions.${index}.okpd2Code`),
                      )}
                    </div>

                    <label className={block("checkbox")}>
                      <input
                        type="checkbox"
                        {...register(
                          `positions.${index}.isPublicDiscussionRequired`,
                        )}
                      />
                      Закупка подлежит обязательному общественному обсуждению
                    </label>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={block("add-button")}
              onClick={() => positions.append(emptyPurchasePlanPosition())}
            >
              Добавить запись плана-графика
            </button>
          </fieldset>

          <footer className={block("footer")}>
            {needsContractService && (
              <span className={block("error")}>
                Укажите, каким образом создана контрактная служба (п. 2.1
                Типового положения, приказ Минфина России от 31.07.2020 N 158н)
                — до этого план-график сохранить нельзя.{" "}
                <button
                  type="button"
                  className={block("cancel-button")}
                  onClick={() => navigate("/contract-service")}
                >
                  Указать способ
                </button>
              </span>
            )}
            {mutationError && (
              <span className={block("error")}>
                Не удалось сохранить план-график: {String(mutationError)}
              </span>
            )}
            {isEdit && (
              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  checked={saveVersionSnapshot}
                  onChange={(e) => setSaveVersionSnapshot(e.target.checked)}
                />
                Сохранить снимок текущей редакции в историю версий
              </label>
            )}
            <div className={block("footer-actions")}>
              <button
                type="button"
                className={block("cancel-button")}
                onClick={() => navigate("/purchase-plans")}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={block("submit-button")}
                disabled={isPending || createVersion.isPending || !canSave}
              >
                {isPending ? "Сохранение..." : "Сохранить план-график"}
              </button>
            </div>
          </footer>
        </form>
      </FormProvider>
    </section>
  );
}
