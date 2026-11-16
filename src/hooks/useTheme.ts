import { useState, useEffect, useCallback } from "react";

// Простой хук: читает тему из localStorage (или prefers-color-scheme),
// записывает в documentElement data-theme, возвращает текущее значение
// и функцию переключения.
// CSS-переменные из _themes.scss автоматически перестраиваются.

const STORAGE_KEY = "csms-theme";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

export const getTheme = (): "light" | "dark" => {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return prefersDark.matches ? "dark" : "light";
};

export const applyTheme = (theme: "light" | "dark"): void => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
};

type UseThemeReturn = [
  "light" | "dark",
  () => void,
];

export default function useTheme(): UseThemeReturn {
  const [theme, setTheme] = useState<"light" | "dark">(() => getTheme());

  // Синхронизирую с системной темой при первом рендере, если пользователь
  // ещё не выбрал явно — это позволяет избежать белого экрана при SSR
  // (хотя у нас его нет, но на всякий случай).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Слушаю системные переключения, если пользователь не выбрал явно
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
      const next = prev === "light" ? "dark" : "light";

      applyTheme(next);

      return next;
    });
  }, []);

  return [theme, toggle];
}
