import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useFetchCurrentUser, useLogout } from "../../services/Users/user.api";
import { useFetchEmployeeByUserId } from "../../services/StaffingTable/StaffingTable.api";
import type { BaseHuman } from "../../services/StaffingTable/StaffingTable.schema";
import useUtils from "../../hooks/useUtils";
import useTheme, { type ThemeName } from "../../hooks/useTheme";
import EisCoverageModal from "../Eis/EisCoverageModal";
import ReferenceDataBadge from "../Eis/ReferenceDataBadge";
import NeonMark3D from "../Brand/NeonMark3D";
import AgentsHelpModal from "./AgentsHelpModal";
import DelegationSchemeModal from "./DelegationSchemeModal";
import styles from "./Header.module.scss";

// Кнопка темы переключает их по кругу:
// светлая → тёмная → «Гроза» → «Зима» → «Парящие 3D» → «Современные
// закупки» → «Морозный неон» → светлая.
// Иконка показывает следующую тему, title и aria-label называют её словами,
// поэтому ключ записи — текущая тема, а значение — та, что включится по клику:
// ☀️ светлая → 🌙 тёмная → ⛈️ «Гроза» → ❄️ «Зима» → 🧊 «Парящие 3D» →
// 🌌 «Современные закупки» → 🌨️ «Морозный неон».
const THEME_ICONS: Record<ThemeName, string> = {
  light: "🌙",
  dark: "⛈️",
  storm: "❄️",
  winter: "🧊",
  floating3d: "🌌",
  modern: "🌨️",
  frost: "☀️",
};

const THEME_TITLES: Record<ThemeName, string> = {
  light: "Тёмная тема",
  dark: "Тема «Гроза»",
  storm: "Зимняя тема",
  winter: "Тема «Парящие 3D»",
  floating3d: "Тема «Современные закупки»",
  modern: "Тема «Морозный неон»",
  frost: "Светлая тема",
};

interface NavItem {
  to: string;
  label: string;
  // Для главной: иначе NavLink считает её активной на всех маршрутах
  end?: boolean;
  // Пункты, которые показываются только вошедшему пользователю
  requiresAuth?: boolean;
}

interface NavGroup {
  title: string;
  links: NavItem[];
}

// Первый ряд шапки — только сквозной контур закупки. Он должен читаться
// с одного взгляда, поэтому здесь нет ни справочников, ни отчётности.
const PRIMARY_LINKS: NavItem[] = [
  { to: "/", label: "Главная", end: true },
  { to: "/purchase-plans", label: "План-график" },
  { to: "/purchase-notes", label: "Потребность" },
  { to: "/procurement-processing", label: "Извещения" },
  { to: "/contract-service", label: "Контрактная служба" },
];

// Остальные разделы собраны в меню «Ещё» по смыслу: так шапка остаётся
// одной строкой, а не превращается в три ряда чипов.
const MORE_GROUPS: NavGroup[] = [
  {
    title: "Сквозной контур",
    links: [
      { to: "/contract-projects", label: "Проект контракта" },
      { to: "/eis/chains", label: "Цепочка ЕИС" },
      { to: "/contractor", label: "Кабинет подрядчика" },
      { to: "/documents", label: "Типовые документы", requiresAuth: true },
      { to: "/notifications", label: "Сроки и риски", requiresAuth: true },
    ],
  },
  {
    title: "ЕИС",
    links: [
      { to: "/eis/smp-export", label: "Выгрузка СМП / СОНКО" },
      { to: "/eis/packages", label: "Пакеты ЕИС" },
      { to: "/eis/schemas", label: "Схемы ЕИС" },
      { to: "/eis/test-access", label: "Тестовый доступ ЕИС" },
    ],
  },
  {
    title: "Отчётность и контроль",
    links: [
      { to: "/analytics", label: "Аналитика закупок" },
      { to: "/reports/order-158n", label: "Отчёты 158н" },
      { to: "/liability-mapping", label: "Ответственность КС" },
      { to: "/legal", label: "НПА и редакции" },
      { to: "/legal/library", label: "Библиотека НПА" },
      { to: "/consultant", label: "Консультант 44-ФЗ" },
      { to: "/ui-solutions", label: "UI-решения" },
      { to: "/brand", label: "Фирменный знак" },
      { to: "/visit-card", label: "Визитка проекта" },
      { to: "/okpd2", label: "Справочник ОКПД2" },
    ],
  },
];

const MORE_PATHS = MORE_GROUPS.flatMap((group) =>
  group.links.map((link) => link.to),
);

// В шапке достаточно фамилии и инициалов: полностью ФИО видно в подсказке,
// а личный кабинет и выход открываются выпадающим списком профиля
const shortName = (human: BaseHuman): string => {
  const surname = human.surname || "";
  const initials = [human.name, human.patronymic]
    .filter(Boolean)
    .map((part) => `${(part as string).charAt(0).toUpperCase()}.`)
    .join("");

  return `${surname} ${initials}`.trim() || "Профиль";
};

// На тач-экранах браузер синтезирует mouseenter/mouseleave после касания:
// без этой проверки меню профиля и подменю открывались и тут же закрывались
const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

const Header = () => {
  const { data: user, isLoading } = useFetchCurrentUser();
  // Учётная запись и запись штатного расписания связаны полем userId, поэтому
  // сотрудника ищем по id пользователя
  const { data: employee } = useFetchEmployeeByUserId(user?.id);
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  // Пункт «Реестр контрактов» остаётся активным и на подстраницах с ?group=
  const isRegistryActive = location.pathname.startsWith("/contract-registry");
  const isMoreActive = MORE_PATHS.some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`),
  );
  const { bem, fullName } = useUtils();
  const [theme, toggleTheme] = useTheme();
  const header = bem(styles, "header");
  const nav = bem(styles, "header-navigation");

  const toggleLabel = THEME_TITLES[theme];

  // Подпись «Фамилия И.О.» в строке шапки не показываем: вместе с ней семь
  // пунктов меню не помещались в 1120px и «пилюля» профиля выезжала из
  // навигации, закрывая переключатель темы. Полное ФИО осталось в подсказке
  // кнопки и шапкой в открытом меню профиля
  const profileName = fullName(employee?.employee ?? {}) || "Профиль";

  // Ховер и клик ведут одно и то же состояние: раньше меню открывалось стилями
  // по :hover, поэтому клик по кнопке его не скрывал (курсор-то внутри) и
  // выглядело это как «не слушается». Теперь видно одно состояние, а флаг
  // hoverDisabled не даёт наведению сразу открыть меню после клика-скрытия
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHoverDisabled, setIsHoverDisabled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Подменю «Реестр контрактов»: конкурентные способы и закупки у ЕП.
  // Открывается наведением и кликом, закрывается кликом вне и Escape
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);
  const registryRef = useRef<HTMLDivElement>(null);

  // Меню «Ещё»: остальные разделы, сгруппированные по назначению
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Быстрый чек-лист покрытия XSD: открывается модалкой, чтобы не уводить
  // пользователя со страницы, на которой он смотрит план-график или извещение
  const [isCoverageOpen, setIsCoverageOpen] = useState(false);

  // Справка по агентам: та же логика — не уводим пользователя с его страницы
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Схема делегирования задач КС: открывается модалкой из меню «Ещё»
  const [isDelegationOpen, setIsDelegationOpen] = useState(false);

  // Мобильная шапка: список пунктов занимал почти весь первый экран, поэтому
  // ниже 1120px он прячется за бургер (Header.module.scss)
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Перешли на другой раздел — панели надо закрыть, иначе они висят поверх
  // новой страницы. Сброс при смене адреса делаем во время рендера: эффект
  // с синхронным setState вызывал бы лишнюю перерисовку шапки.
  const currentLocation = `${location.pathname}${location.search}`;
  const [closedOnLocation, setClosedOnLocation] = useState(currentLocation);
  if (closedOnLocation !== currentLocation) {
    setClosedOnLocation(currentLocation);
    setIsNavOpen(false);
    setIsMoreOpen(false);
    setIsRegistryOpen(false);
  }

  // Открытая панель на мобильном — это модальное состояние: страница под ней
  // не прокручивается, Escape закрывает
  useEffect(() => {
    if (!isNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsNavOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isNavOpen]);

  const openProfile = () => {
    if (isHoverDisabled) return;
    if (!canHover()) return;
    setIsProfileOpen(true);
  };

  const closeProfileOnLeave = () => {
    if (!canHover()) return;
    setIsProfileOpen(false);
    setIsHoverDisabled(false);
  };

  const toggleProfile = () => {
    if (isProfileOpen) {
      setIsHoverDisabled(true);
      setIsProfileOpen(false);
      return;
    }

    setIsHoverDisabled(false);
    setIsProfileOpen(true);
  };

  useEffect(() => {
    if (!isProfileOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
        setIsHoverDisabled(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsProfileOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isRegistryOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!registryRef.current?.contains(event.target as Node)) {
        setIsRegistryOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRegistryOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isRegistryOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMoreOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMoreOpen]);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout(undefined, { onSuccess: () => navigate("/") });
  };

  const closeMenus = () => {
    setIsMoreOpen(false);
    setIsRegistryOpen(false);
    setIsNavOpen(false);
  };

  // Меню «Ещё» открывается только кликом: при наведении оно успевало
  // раскрыться, и первый же клик по кнопке его закрывал — со стороны это
  // выглядело как «кнопка не работает»
  const toggleMore = () => {
    setIsRegistryOpen(false);
    setIsMoreOpen((open) => !open);
  };

  return (
    <>
      <header className={header()}>
        <div className={header("inner")}>
          {/* Бургер виден только на мобильном: там список пунктов уезжает
              в выпадающую панель */}
          <button
            type="button"
            className={header("burger", isNavOpen ? ["open"] : [])}
            aria-label={
              isNavOpen ? "Закрыть меню разделов" : "Открыть меню разделов"
            }
            aria-expanded={isNavOpen}
            aria-controls="header-navigation"
            onClick={() => setIsNavOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <NavLink
            className={header("brand")}
            to={"/"}
            onClick={() => setIsNavOpen(false)}
          >
            {/* Основной знак бренда — неоновая плитка с 3D-наклоном.
                Компактный вариант: амплитуда меньше, чтобы шапка не «плясала» */}
            <NeonMark3D
              className={header("brand-mark")}
              size={36}
              variant="compact"
            />
            <span className={header("brand-text")}>
              <span className={header("brand-name")}>КСЗ</span>
              <span className={header("brand-sub")}>Контрактная служба</span>
            </span>
          </NavLink>

          <nav
            id="header-navigation"
            className={nav("", isNavOpen ? ["open"] : [])}
            aria-label="Разделы системы"
          >
            <ul className={nav("list")}>
              {PRIMARY_LINKS.map((link) => (
                <li className={nav("item")} key={link.to}>
                  <NavLink
                    className={nav("link")}
                    to={link.to}
                    end={link.end}
                    onClick={closeMenus}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}

              {/* Реестр контрактов с разбивкой по виду способа закупки:
                  конкурентные процедуры и закупки у единственного поставщика */}
              <li className={nav("item")}>
                <div
                  ref={registryRef}
                  className={nav(
                    "submenu-wrap",
                    isRegistryOpen ? ["open"] : [],
                  )}
                  onMouseEnter={() => canHover() && setIsRegistryOpen(true)}
                  onMouseLeave={() => canHover() && setIsRegistryOpen(false)}
                >
                  <NavLink
                    className={nav("link", isRegistryActive ? ["active"] : [])}
                    to={"/contract-registry"}
                    aria-haspopup="menu"
                    aria-expanded={isRegistryOpen}
                    onClick={() => setIsRegistryOpen(false)}
                  >
                    Реестр контрактов
                    <span className={nav("arrow")} aria-hidden="true">
                      ▾
                    </span>
                  </NavLink>
                  {/* На тач-экранах подменю раскрывает отдельная кнопка: тап по
                      самому пункту уводит на страницу реестра */}
                  <button
                    type="button"
                    className={nav("submenu-toggle")}
                    aria-label="Показать виды реестра контрактов"
                    aria-expanded={isRegistryOpen}
                    onClick={() => setIsRegistryOpen((open) => !open)}
                  >
                    ▾
                  </button>
                  {isRegistryOpen && (
                    <ul className={nav("submenu")} role="menu">
                      <li>
                        <NavLink
                          className={nav("submenu-link")}
                          to={"/contract-registry"}
                          end
                          onClick={closeMenus}
                        >
                          Все контракты
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className={nav("submenu-link")}
                          to={"/contract-registry?group=competitive"}
                          onClick={closeMenus}
                        >
                          Контракты по конкурентным способам
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          className={nav("submenu-link")}
                          to={"/contract-registry?group=single"}
                          onClick={closeMenus}
                        >
                          Контракты у ЕП
                        </NavLink>
                      </li>
                    </ul>
                  )}
                </div>
              </li>

              {/* Остальные разделы: сгруппированное меню вместо второго ряда */}
              <li className={nav("item")}>
                <div
                  ref={moreRef}
                  className={nav("submenu-wrap", isMoreOpen ? ["open"] : [])}
                >
                  <button
                    type="button"
                    className={nav("link", [
                      "button",
                      ...(isMoreActive ? ["active"] : []),
                      ...(isMoreOpen ? ["open"] : []),
                    ])}
                    aria-haspopup="menu"
                    aria-expanded={isMoreOpen}
                    onClick={toggleMore}
                  >
                    Ещё
                    <span className={nav("arrow")} aria-hidden="true">
                      ▾
                    </span>
                  </button>

                  {isMoreOpen && (
                    <div className={nav("mega")} role="menu">
                      <div className={nav("mega-grid")}>
                        {MORE_GROUPS.map((group) => {
                          const links = group.links.filter(
                            (link) => !link.requiresAuth || user,
                          );

                          if (links.length === 0) return null;

                          return (
                            <div
                              className={nav("mega-group")}
                              key={group.title}
                            >
                              <p className={nav("mega-title")}>{group.title}</p>
                              <ul className={nav("mega-list")}>
                                {links.map((link) => (
                                  <li key={link.to}>
                                    <NavLink
                                      className={nav("mega-link")}
                                      to={link.to}
                                      onClick={closeMenus}
                                    >
                                      {link.label}
                                    </NavLink>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>

                      <div className={nav("mega-foot")}>
                        <button
                          type="button"
                          className={nav("foot-btn")}
                          onClick={() => {
                            setIsMoreOpen(false);
                            setIsCoverageOpen(true);
                          }}
                        >
                          Покрытие XSD
                        </button>
                        {/* Нативная кнопка — как соседние кнопки нижней строки
                            меню: стили заданы Header.module.scss */}
                        <button
                          type="button"
                          className={nav("foot-btn")}
                          onClick={() => {
                            setIsMoreOpen(false);
                            setIsDelegationOpen(true);
                          }}
                        >
                          Схема делегирования
                        </button>
                        <button
                          type="button"
                          className={nav("foot-btn")}
                          onClick={() => {
                            setIsMoreOpen(false);
                            setIsHelpOpen(true);
                          }}
                        >
                          Справка
                        </button>
                        <div className={nav("mega-badge")}>
                          <ReferenceDataBadge />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>

              <li className={nav("item", ["end"])}>
                {user ? (
                  <div
                    ref={profileRef}
                    className={nav(
                      "profile-wrap",
                      isProfileOpen ? ["open"] : [],
                    )}
                    onMouseEnter={openProfile}
                    onMouseLeave={closeProfileOnLeave}
                  >
                    <button
                      type="button"
                      className={nav("profile", isProfileOpen ? ["open"] : [])}
                      title={profileName}
                      // Имени внутри кнопки больше нет, поэтому доступное имя
                      // задаём явно — иначе остался бы только значок аватара
                      aria-label={
                        isLoading && !employee ? "Загрузка профиля" : profileName
                      }
                      aria-haspopup="menu"
                      aria-expanded={isProfileOpen}
                      onClick={toggleProfile}
                    >
                      <span className={nav("profile-avatar")}>
                        {employee?.avatar ? (
                          <img
                            src={employee.avatar}
                            alt=""
                            className={nav("profile-avatar-image")}
                          />
                        ) : (
                          fullName(employee?.employee ?? {})
                            .charAt(0)
                            .toUpperCase() || "?"
                        )}
                      </span>
                      <span className={nav("profile-name")}>
                        {isLoading && !employee
                          ? "Загрузка профиля"
                          : shortName(employee?.employee ?? {})}
                      </span>
                      <span className={nav("profile-arrow")} aria-hidden="true">
                        ▾
                      </span>
                    </button>

                    <ul className={nav("profile-menu")} role="menu">
                      {/* В строке шапки остался только аватар, поэтому ФИО и
                          должность показываем шапкой открытого меню */}
                      <li role="none" className={nav("profile-menu-head")}>
                        <span className={nav("profile-menu-name")}>
                          {profileName}
                        </span>
                        {employee?.position && (
                          <span className={nav("profile-menu-role")}>
                            {employee.position}
                          </span>
                        )}
                      </li>
                      <li role="none">
                        <NavLink
                          role="menuitem"
                          className={nav("profile-menu-link")}
                          to={"/account/profile"}
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Личный кабинет
                        </NavLink>
                      </li>
                      <li role="none">
                        <button
                          type="button"
                          role="menuitem"
                          className={nav("profile-menu-link", ["logout"])}
                          onClick={handleLogout}
                        >
                          Выйти
                        </button>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <NavLink className={nav("link")} to={"/account/login"}>
                    {isLoading ? "Загрузка профиля" : "Вход"}
                  </NavLink>
                )}
              </li>
            </ul>
          </nav>

          <div className={header("actions")}>
            <button
              type="button"
              className={header("theme-toggle")}
              onClick={toggleTheme}
              title={toggleLabel}
              aria-label={toggleLabel}
            >
              {THEME_ICONS[theme]}
            </button>
          </div>
        </div>
      </header>

      {/* Модалки вынесены из <header>: у шапки есть backdrop-filter, а он
          делает её containing block — fixed-оверлей окна прилип бы к шапке */}
      {isCoverageOpen && (
        <EisCoverageModal onClose={() => setIsCoverageOpen(false)} />
      )}

      {isHelpOpen && <AgentsHelpModal onClose={() => setIsHelpOpen(false)} />}

      {isDelegationOpen && (
        <DelegationSchemeModal
          onClose={() => setIsDelegationOpen(false)}
        />
      )}
    </>
  );
};

export default Header;
