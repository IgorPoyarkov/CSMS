import { useState, useEffect, useCallback } from "react";

// Хук темы: читает выбор из localStorage (или системную схему), пишет его
// в documentElement атрибутом data-theme и возвращает текущее значение
// вместе с функцией переключения.
//
// Тем три:
//   light — светлая, как сайт ЕИС (по умолчанию);
//   dark  — тёмная зелёная, та же схема сайта;
//   storm — «Гроза», холодная сиренево-синяя палитра по референсу.
// CSS-переменные из _themes.scss перестраиваются сами, компонентам ничего
// менять не нужно: они работают с ролями var(--surface-*), var(--text-*).

const STORAGE_KEY = "csms-theme";

export type ThemeName = "light" | "dark" | "storm";

// Порядок обхода кнопкой в шапке: светлая → тёмная → «Гроза» → светлая.
const THEME_ORDER: ThemeName[] = ["light", "dark", "storm"];

const isThemeName = (value: string | null): value is ThemeName =>
  value === "light" || value === "dark" || value === "storm";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

export const getTheme = (): ThemeName => {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (isThemeName(stored)) {
    return stored;
  }

  return prefersDark.matches ? "dark" : "light";
};

export const applyTheme = (theme: ThemeName): void => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
};

/** Следующая тема по кругу — для кнопки в шапке. */
export const nextTheme = (theme: ThemeName): ThemeName => {
  const index = THEME_ORDER.indexOf(theme);

  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
};

type UseThemeReturn = [ThemeName, () => void];

export default function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<ThemeName>(() => getTheme());

  // Синхронизирую с системной темой при первом рендере, если пользователь
  // ещё не выбрал явно — это позволяет избежать белого экрана при SSR
  // (хотя у нас его нет, но на всякий случай).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Слушаю системные переключения, если пользователь не выбрал явно.
  // Системная схема знает только светлую и тёмную, поэтому «Гроза»
  // не сбрасывается: это всегда осознанный выбор в шапке.
  useEffect(() => {
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    prefersDark.addEventListener("change", handler);

    return () => prefersDark.removeEventListener("change", handler);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = nextTheme(prev);

      applyTheme(next);

      return next;
    });
  }, []);

  return [theme, toggle];
}
