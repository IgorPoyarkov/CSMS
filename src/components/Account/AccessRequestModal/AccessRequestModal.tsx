import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useUtils from "../../../hooks/useUtils";
import useMyContractRole from "../../../hooks/useMyContractRole";
import { useFetchStructuralUnits } from "../../../services/StaffingTable/StaffingTable.api";
import type { BaseStructuralUnit } from "../../../services/StaffingTable/StaffingTable.schema";
import { useCreateAccessRequest } from "../../../services/AccessRequest/accessRequest.api";
import styles from "./AccessRequestModal.module.scss";

interface AccessRequestModalProps {
  employeeId: string | number;
  employeeName: string;
  warning: string | null;
  onClose: () => void;
  /** Вызывается после успешной отправки — родитель помечает заявку отправленной */
  onSent?: () => void;
}

export default function AccessRequestModal({
  employeeId,
  employeeName,
  warning,
  onClose,
  onSent,
}: AccessRequestModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "access-request");
  const { organization } = useMyContractRole();
  const organizationId = organization?.id;

  const { data: units = [] } = useFetchStructuralUnits(organizationId);

  const safeUnits = units as BaseStructuralUnit[];

  // Подразделение отдела кадров — выбирается по умолчанию
  const hrUnitId = useMemo(() => {
    const hr = safeUnits.find(
      (u) =>
        u.name?.toLowerCase().includes("кадр") ||
        u.name?.toLowerCase().includes("hr") ||
        u.conventionalSymbol?.toLowerCase() === "hr",
    );

    return hr?.id;
  }, [safeUnits]);

  const hrUnitName = useMemo(() => {
    return safeUnits.find((u) => String(u.id) === String(hrUnitId))?.name ?? "";
  }, [safeUnits, hrUnitId]);

  const formSchema = z.object({
    recipientUnitId: z
      .union([z.string(), z.number(), z.undefined()])
      .optional(),
    recipientUnitName: z.string(),
    message: z.string().min(1, "Введите сообщение заявки"),
  });

  type FormValues = z.infer<typeof formSchema>;

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipientUnitId: hrUnitId,
      recipientUnitName: hrUnitName,
      message: "",
    },
  });
  const { handleSubmit } = methods;
  const createRequest = useCreateAccessRequest();

  // Escape для закрытия
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function onSubmit(values: FormValues) {
    // Заявка уходит в коллекцию accessRequests того же api, что и остальные
    // сведения: раньше запрос шёл на "/api/accessRequests" мимо baseURL и
    // до сервера не доходил
    createRequest.mutate(
      {
        organizationId: organizationId ?? "",
        employeeId,
        employeeName,
        type: "missing_education",
        message: values.message,
        recipientStructuralUnitId: values.recipientUnitId,
        recipientStructuralUnitName: values.recipientUnitName,
        status: "new",
        createdAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          onSent?.();
          onClose();
        },
      },
    );
  }

  return (
    <div className={block()} onClick={onClose}>
      <div className={block("window")} onClick={(e) => e.stopPropagation()}>
        <div className={block("head")}>
          <h3 className={block("title")}>Заявка на образование</h3>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className={block("body")}>
          <p className={block("warning-text")}>
            {warning || "Не хватает данных об образовании"}
          </p>
          <p className={block("hint")}>
            Направьте заявку в отдел кадров (или иной уполномоченный отдел). Это
            может быть связано с тем, что профильное образование не внесено в
            реестр, хотя у сотрудника оно есть.
          </p>

          <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="ar-recipient">
                Подразделение-получатель
              </label>
              <select
                id="ar-recipient"
                className={block("input")}
                {...methods.register("recipientUnitId", {
                  onChange: (event) => {
                    const unit = safeUnits.find(
                      (u) => String(u.id) === event.target.value,
                    );

                    methods.setValue("recipientUnitName", unit?.name ?? "", {
                      shouldValidate: false,
                    });
                  },
                })}
              >
                <option value="">— выберите подразделение —</option>
                {safeUnits.map((unit) => (
                  <option key={String(unit.id)} value={String(unit.id)}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={block("field")}>
              <label className={block("label")} htmlFor="ar-message">
                Сообщение
              </label>
              <textarea
                id="ar-message"
                className={block("input", ["textarea"])}
                {...methods.register("message")}
                placeholder="Опишите ситуацию..."
                rows={4}
              />
              {methods.formState.errors.message && (
                <span className={block("error")}>
                  {methods.formState.errors.message.message}
                </span>
              )}
            </div>

            {createRequest.isError && (
              <span className={block("error")}>
                Заявка не отправлена: {String(createRequest.error)}
              </span>
            )}

            <div className={block("actions")}>
              <button
                type="button"
                className={block("btn", ["ghost"])}
                onClick={onClose}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={block("btn", ["primary"])}
                disabled={createRequest.isPending}
              >
                {createRequest.isPending ? "Отправка..." : "Направить заявку"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
