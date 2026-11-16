import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EmployeeProfileSchema,
  type BaseEmployee,
  type EmployeeProfileChanges,
} from "../../../services/StaffingTable/StaffingTable.schema";
import { useUpdateEmployeeProfile } from "../../../services/StaffingTable/StaffingTable.api";
import useUtils from "../../../hooks/useUtils";
import styles from "./ProfileEditModal.module.scss";

interface ProfileEditModalProps {
  employee: BaseEmployee;
  onClose: () => void;
}

// Работник правит только контакты и аватар: ФИО, должность и подразделение
// принадлежат отделу кадров. Форма вынесена в модалку, чтобы не держать
// постоянное поле ввода в личном кабинете.
export default function ProfileEditModal({
  employee,
  onClose,
}: ProfileEditModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "profile-edit");
  const { mutate: saveProfile, isPending } = useUpdateEmployeeProfile();

  const methods = useForm<EmployeeProfileChanges>({
    resolver: zodResolver(EmployeeProfileSchema),
    defaultValues: {
      phone: employee.phone ?? "",
      avatar: employee.avatar ?? "",
    },
  });
  const { handleSubmit } = methods;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function onSubmit(changes: EmployeeProfileChanges) {
    if (!employee.id) return;

    saveProfile({ id: employee.id, changes }, { onSuccess: () => onClose() });
  }

  return (
    <div className={block()} onClick={onClose}>
      <div className={block("window")} onClick={(e) => e.stopPropagation()}>
        <div className={block("head")}>
          <h3 className={block("title")}>Редактирование профиля</h3>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <FormProvider {...methods}>
          <form
            className={block("form")}
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className={block("field")}>
              <label className={block("label")}>Телефон</label>
              <input
                className={block("input")}
                {...methods.register("phone")}
                placeholder="+7 495 100-01-01"
              />
              {methods.formState.errors.phone && (
                <span className={block("error")}>
                  {methods.formState.errors.phone.message}
                </span>
              )}
            </div>

            <div className={block("field")}>
              <label className={block("label")}>Аватар (URL)</label>
              <input
                className={block("input")}
                {...methods.register("avatar")}
                placeholder="https://example.com/photo.jpg"
              />
              {methods.formState.errors.avatar && (
                <span className={block("error")}>
                  {methods.formState.errors.avatar.message}
                </span>
              )}
            </div>

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
                disabled={isPending}
              >
                Сохранить
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
