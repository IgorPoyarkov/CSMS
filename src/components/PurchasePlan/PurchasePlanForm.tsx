import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  purchasePlanStatusLabel,
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
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const errorMessage = (path: string): string | undefined =>
    (get(errors, path) as FieldError | undefined)?.message;

  useEffect(() => {
    if (isEdit && loadedPlan) {
      reset(loadedPlan);
    }
  }, [isEdit, loadedPlan, reset]);

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
  const planStatusWatch = useWatch({ control, name: "status" });
  const planNumberWatch = useWatch({ control, name: "planNumber" });

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
      <nav className={block("breadcrumbs")} aria-label="Навигационная цепочка">
        <Link to="/" className={block("crumb")}>
          Главная
        </Link>
        <span className={block("crumb-sep")} aria-hidden="true">
          /
        </span>
        <Link to="/purchase-plans" className={block("crumb")}>
          Планы-графики (44-ФЗ)
        </Link>
        {isEdit && id && (
          <>
            <span className={block("crumb-sep")} aria-hidden="true">
              /
            </span>
            <Link to={`/purchase-plans/${id}`} className={block("crumb")}>
              План-график № {planNumberWatch || id}
            </Link>
          </>
        )}
        <span className={block("crumb-sep")} aria-hidden="true">
          /
        </span>
        <span className={block("crumb", ["current"])}>
          {isEdit ? "Редактирование документа" : "Формирование нового ПГ"}
        </span>
      </nav>

      <header className={block("header")}>
        <div className={block("header-top")}>
          <div className={block("eyebrow-row")}>
            <span className={block("eyebrow")}>
              Документ планирования · ЕИС pg2020 (44-ФЗ)
            </span>
            <span
              className={block("status-tag", [planStatusWatch ?? "draft"])}
            >
              {purchasePlanStatusLabel(planStatusWatch ?? "draft")}
            </span>
          </div>
          <h1 className={block("title")}>
            {isEdit
              ? `Редактирование плана-графика № ${planNumberWatch || "без номера"}`
              : "Новый план-график закупок (44-ФЗ)"}
          </h1>
          <p className={block("subtitle")}>
            {customer?.fullName ||
              "Заказчик определяется по текущей организации учётной записи"}
          </p>
        </div>

        <div className={block("header-actions")}>
          <button
            type="button"
            className={block("back")}
            onClick={() =>
              navigate(isEdit && id ? `/purchase-plans/${id}` : "/purchase-plans")
            }
          >
            ← {isEdit ? "В карточку плана-графика" : "К списку планов-графиков"}
          </button>
        </div>
      </header>

      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          {/* Раздел 1: Общие сведения плана-графика */}
          <section className={block("section")}>
            <h2 className={block("section-title")}>
              1. Общие сведения о плане-графике
            </h2>
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
                  label: { value: "Дата направления на контроль (ч. 5 ст. 99)" },
                  input: { name: "directDate", type: "date" },
                }}
              />
            </div>
          </section>

          {/* Раздел 2: Сведения о заказчике */}
          <section className={block("section")}>
            <h2 className={block("section-title")}>
              2. Сведения о заказчике
            </h2>

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
                <dl className={block("dl")}>
                  <div className={block("dl-row")}>
                    <dt>Полное наименование</dt>
                    <dd>{customer.fullName}</dd>
                  </div>
                  <div className={block("dl-row")}>
                    <dt>Краткое наименование</dt>
                    <dd>{customer.shortName || "—"}</dd>
                  </div>
                  <div className={block("dl-row")}>
                    <dt>ИНН / КПП</dt>
                    <dd className={block("mono")}>
                      {customer.inn} / {customer.kpp || "—"}
                    </dd>
                  </div>
                  <div className={block("dl-row")}>
                    <dt>Юридический адрес</dt>
                    <dd>{customer.legalAddress || "—"}</dd>
                  </div>
                  <div className={block("dl-row")}>
                    <dt>Ответственный за планирование</dt>
                    <dd>
                      {customer.responsiblePerson || "—"}
                      {customer.responsiblePhone
                        ? ` (${customer.responsiblePhone})`
                        : ""}
                    </dd>
                  </div>
                  <div className={block("dl-row")}>
                    <dt>Код по СПЗ / ОКТМО (ЕИС 17.0)</dt>
                    <dd className={block("mono")}>
                      {customer.regNum || customer.consRegistryNum || "—"} /{" "}
                      {customer.oktmo || "—"}
                    </dd>
                  </div>
                </dl>

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
          </section>

          {/* Раздел 3: Позиции плана-графика */}
          <section className={block("section")}>
            <div className={block("section-head")}>
              <h2 className={block("section-title", ["inline"])}>
                3. Позиции плана-графика ({positions.fields.length})
              </h2>
              <button
                type="button"
                className={block("add-button")}
                onClick={() => positions.append(emptyPurchasePlanPosition())}
              >
                + Добавить позицию
              </button>
            </div>

            {positions.fields.length === 0 && (
              <p className={block("hint")}>
                Позиции плана-графика не внесены — добавьте закупку кнопкой
                выше.
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
                      Позиция № {index + 1}
                    </span>
                    <button
                      type="button"
                      className={block("remove-button")}
                      onClick={() => positions.remove(index)}
                    >
                      Удалить позицию
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

                    <div className={block("field", ["okpd2"])}>
                      <label className={block("checkbox")}>
                        <input
                          type="checkbox"
                          {...register(
                            `positions.${index}.isPublicDiscussionRequired`,
                          )}
                        />
                        Закупка подлежит обязательному общественному обсуждению
                        (ст. 20 44-ФЗ)
                      </label>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <footer className={block("footer")}>
            <div className={block("footer-info")}>
              {needsContractService && (
                <span className={block("error")}>
                  Укажите, каким образом создана контрактная служба (п. 2.1
                  Типового положения, приказ Минфина России от 31.07.2020 N 158н)
                  — до этого план-график сохранить нельзя.{" "}
                  <button
                    type="button"
                    className={block("inline-link")}
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
            </div>

            <div className={block("footer-actions")}>
              <button
                type="button"
                className={block("cancel-button")}
                onClick={() =>
                  navigate(
                    isEdit && id ? `/purchase-plans/${id}` : "/purchase-plans",
                  )
                }
              >
                Отмена
              </button>
              <button
                type="submit"
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
