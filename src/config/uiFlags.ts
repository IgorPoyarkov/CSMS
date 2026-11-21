/**
 * Флаги интерфейса.
 *
 * Значения читаются из переменных окружения Vite (`import.meta.env`) — это
 * уже используемый в проекте механизм настройки (`VITE_API_URL`,
 * `VITE_EIS_API_URL` и т. п.). Флаг подставляется на этапе сборки, поэтому
 * декор можно временно скрыть, не удаляя код, стили и данные: достаточно
 * поменять значение по умолчанию ниже или задать переменную окружения.
 */

/**
 * Читает булев флаг: `on` / `true` / `1` / `yes` — включено,
 * пустое значение — берётся значение по умолчанию.
 */
const readFlag = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return ["1", "true", "on", "yes"].includes(value.trim().toLowerCase());
};

export const uiFlags = {
  /**
   * Декоративные полярные кривые («бабочки») по бокам контента.
   * Компонент: `src/components/AppLayout/SidePolarCurves.tsx`.
   *
   * Сейчас выключены. Чтобы вернуть, достаточно задать
   * `VITE_SIDE_POLAR_CURVES=on` в `.env.local` (или поставить `true`
   * значением по умолчанию в строке ниже) и перезапустить dev-сервер.
   */
  sidePolarCurves: readFlag(import.meta.env.VITE_SIDE_POLAR_CURVES, false),
} as const;
