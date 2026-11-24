import { createContext, useCallback, useContext, useMemo } from "react";
import {
  useFormContext,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";
import { isNoticePathLocked } from "../../services/Procurements/noticeApprovedFields";

/**
 * Общий доступ секций формы извещения к гейту утверждённых данных.
 *
 * Поля из утверждённой СЗ/ООЗ не редактируются: `register` returned-пропы
 * получают DOM-атрибут disabled (не опцию RHF `disabled` — она исключает поле
 * из отправляемых значений и сломала бы выгрузку). Кастомные контролы, которые
 * пишут через `setValue`, проверяют `isLocked` явно.
 */
interface NoticeFieldLockValue {
  lockedPaths: readonly string[];
  isLocked: (path: string) => boolean;
}

export const NoticeFieldLockContext = createContext<NoticeFieldLockValue>({
  lockedPaths: [],
  isLocked: () => false,
});

export const useNoticeFieldLock = (): NoticeFieldLockValue =>
  useContext(NoticeFieldLockContext);

/**
 * `useFormContext` с учётом блокировки. Возвращает тот же набор, что и RHF,
 * но `register` дополнительно ставит `disabled` на заблокированные поля.
 */
export const useNoticeFormContext = <T extends FieldValues>() => {
  const form = useFormContext<T>();
  const { isLocked } = useNoticeFieldLock();

  const register = useCallback(
    <TFieldName extends FieldPath<T>>(
      name: TFieldName,
      options?: RegisterOptions<T, TFieldName>,
    ) => {
      const props = form.register(name, options);
      // Ключ добавляем только для заблокированного поля: иначе перезаписали бы
      // собственный `disabled` секции (например, неактивное количество при
      // неопределённом объёме).
      return isLocked(name) ? { ...props, disabled: true } : props;
    },
    [form, isLocked],
  );

  return { ...form, register };
};

/** Мемоизированное значение провайдера — вне компонента, чтобы не ломать fast refresh. */
export const useNoticeFieldLockValue = (
  lockedPaths: readonly string[],
): NoticeFieldLockValue =>
  useMemo(
    () => ({
      lockedPaths,
      isLocked: (path: string) => isNoticePathLocked(path, lockedPaths),
    }),
    [lockedPaths],
  );
