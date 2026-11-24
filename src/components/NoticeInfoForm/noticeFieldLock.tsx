import type { ReactNode } from "react";
import {
  NoticeFieldLockContext,
  useNoticeFieldLockValue,
} from "./noticeFieldLockHooks";

/**
 * Провайдер гейта утверждённых данных извещения. Хуки лежат в отдельном
 * модуле: так файл остаётся только компонентом и не ломает fast refresh.
 */
export const NoticeFieldLockProvider = ({
  lockedPaths,
  children,
}: {
  lockedPaths: readonly string[];
  children: ReactNode;
}) => {
  const value = useNoticeFieldLockValue(lockedPaths);
  return (
    <NoticeFieldLockContext.Provider value={value}>
      {children}
    </NoticeFieldLockContext.Provider>
  );
};
