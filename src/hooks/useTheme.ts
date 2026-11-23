import { useState, useEffect, useCallback } from "react";

// Хук темы: читает выбор из localStorage (или системную схему), пишет его
// в documentElement атрибутом data-theme и возвращает текущее значение
// вместе с функцией переключения.
//
// Тем семь:
//   light      — светлая, как сайт ЕИС (по умолчанию);
//   dark       — тёмная зелёная, та же схема сайта;
//   storm      — «Гроза», холодная сиренево-синяя палитра по референсу;
//   winter     — «Зима», светлая морозная серо-голубая палитра по референсу;
//   floating3d — «Парящие 3D-элементы», тёмный лес с лаймовым акцентом
//                и объёмными панелями;
//   modern     — «Современные закупки», ночной индиго-графит с неоновым
//                контуром, кометой и магнитным расхождением коротких списков;
//   frost      — «Морозный неон», та же неоновая геометрия, что у modern, но
//                на зимней палитре: ночной серо-голубой фон, ледяной акцент.
// CSS-переменные из _themes.scss перестраиваются сами, компонентам ничего
// менять не нужно: они работают с ролями var(--surface-*), var(--text-*).

const STORAGE_KEY = "csms-theme";

export type ThemeName =
  | "light"
  | "dark"
  | "storm"
  | "winter"
  | "floating3d"
  | "modern"
  | "frost";

// Порядок обхода кнопкой в шапке:
// светлая → тёмная → «Гроза» → «Зима» → «Парящие 3D» → «Современные
// закупки» → «Морозный неон» → светлая.
const THEME_ORDER: ThemeName[] = [
  "light",
  "dark",
  "storm",
  "winter",
  "floating3d",
  "modern",
  "frost",
];

const isThemeName = (value: string | null): value is ThemeName =>
  value === "light" ||
  value === "dark" ||
  value === "storm" ||
  value === "winter" ||
  value === "floating3d" ||
  value === "modern" ||
  value === "frost";

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
  // Системная схема знает только светлую и тёмную, поэтому «Гроза»,
  // «Зима» и «Парящие 3D» не сбрасываются: это осознанный выбор в шапке.
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
