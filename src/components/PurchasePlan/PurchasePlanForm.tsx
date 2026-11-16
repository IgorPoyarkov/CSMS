import { useEffect } from "react";
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
  planHeaderFields,
  positionFields,
  purchasePlanStatusOptions,
  formatMoney,
} from "./purchasePlan.config";
import styles from "./PurchasePlanForm.module.scss";

interface PurchasePlanFormProps {}

export default function PurchasePlanForm({}: PurchasePlanFormProps) {
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
  // Новый план-график формируется только после того, как заказчик указал
  // способ создания контрактной службы (п. 2.1 приказа N 158н). Уже
  // сформированные планы при этом остаются доступными для правки.
  const { data: contractService, isLoading: isContractServiceLoading } =
    useContractService(organizationId);
  const needsContractService =
    !isEdit &&
    Boolean(organizationId) &&
    !isContractServiceLoading &&
    !contractService;
  // Без привязанной организации формировать план-график не на что
  const canSave =
    Boolean(organizationId && customer?.fullName) && !needsContractService;

  // Позиции, подпадающие под обязательное нормирование (ПП РФ N 926 от
  // 02.09.2015 и ПП РФ N 1047 от 13.10.2014): цена единицы не может
  // превышать предельное значение, поэтому о нём предупреждаем сразу при
  // выборе ОКПД2 — до расчёта и обоснования НМЦК.
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

  function onSubmit(data: PurchasePlan) {
    const goToPlan = (plan: PurchasePlan) =>
      navigate(`/purchase-plans/${plan.id ?? id}`);

    if (isEdit && id) {
      updatePlan.mutate({ id, data }, { onSuccess: goToPlan });

      return;
    }

    createPlan.mutate(data, { onSuccess: goToPlan });
  }

  return (
    <section className={block()}>
      <header className={block("header")}>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-plans")}
        >
          ← К списку планов-графиков
        </button>
        <h1 className={block("title")}>
          {isEdit
            ? "Изменение плана-графика закупок"
            : "Новый план-график закупок (44-ФЗ)"}
        </h1>
      </header>

      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          <fieldset className={block("section")}>
            <legend>Сведения о плане-графике</legend>
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
            </div>
          </fieldset>

          <fieldset className={block("section")}>
            <legend>Заказчик</legend>

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
                </ul>
                <p className={block("hint")}>
                  {isEdit
                    ? "Заказчик зафиксирован в плане-графике при его формировании и изменению не подлежит."
                    : "Реквизиты подтянуты из учётной записи пользователя и не редактируются в плане-графике."}
                </p>
              </>
            )}
          </fieldset>

          <fieldset className={block("section")}>
            <legend>Записи плана-графика ({positions.fields.length})</legend>

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

                    {/* ОКПД2 выбирается из справочника: код и наименование
                        заполняются одним действием */}
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
            <div className={block("footer-actions")}>
              <button
                type="button"
                className={block("cancel-button")}
                onClick={() => navigate("/purchase-plans")}
              >
                Отмена
              </button>
              <button type="submit" disabled={isPending || !canSave}>
                {isPending ? "Сохранение..." : "Сохранить план-график"}
              </button>
            </div>
          </footer>
        </form>
      </FormProvider>
    </section>
  );
}
