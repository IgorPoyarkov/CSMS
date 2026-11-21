import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useFetchCurrentUser, useLogout } from "../../services/Users/user.api";
import { useFetchEmployeeByUserId } from "../../services/StaffingTable/StaffingTable.api";
import type { BaseHuman } from "../../services/StaffingTable/StaffingTable.schema";
import useUtils from "../../hooks/useUtils";
import useTheme, { type ThemeName } from "../../hooks/useTheme";
import EisCoverageModal from "../Eis/EisCoverageModal";
import ReferenceDataBadge from "../Eis/ReferenceDataBadge";
import AgentsHelpModal from "./AgentsHelpModal";
import styles from "./Header.module.scss";

interface HeaderProps {}

// Кнопка темы переключает их по кругу:
// светлая → тёмная → «Гроза» → «Зима» → «Парящие 3D» → светлая.
// Иконка показывает следующую тему, title и aria-label называют её словами.
const THEME_ICONS: Record<ThemeName, string> = {
  light: "🌙",
  dark: "⛈️",
  storm: "❄️",
  winter: "🧊",
  floating3d: "☀️",
};

const THEME_TITLES: Record<ThemeName, string> = {
  light: "Тёмная тема",
  dark: "Тема «Гроза»",
  storm: "Зимняя тема",
  winter: "Тема «Парящие 3D»",
  floating3d: "Светлая тема",
};

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

const Header = ({}: HeaderProps) => {
  const { data: user, isLoading } = useFetchCurrentUser();
  // Учётная запись и запись штатного расписания связаны полем userId, поэтому
  // сотрудника ищем по id пользователя
  const { data: employee } = useFetchEmployeeByUserId(user?.id);
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  // Пункт «Реестр контрактов» остаётся активным и на подстраницах с ?group=
  const isRegistryActive = location.pathname.startsWith("/contract-registry");
  const { bem, fullName } = useUtils();
  const [theme, toggleTheme] = useTheme();
  const header = bem(styles, "header");
  const nav = bem(styles, "header-navigation");

  const toggleLabel = THEME_TITLES[theme];

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

  // Быстрый чек-лист покрытия XSD: открывается модалкой, чтобы не уводить
  // пользователя со страницы, на которой он смотрит план-график или извещение
  const [isCoverageOpen, setIsCoverageOpen] = useState(false);

  // Справка по агентам: та же логика — не уводим пользователя с его страницы
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const openProfile = () => {
    if (isHoverDisabled) return;
    setIsProfileOpen(true);
  };

  const closeProfileOnLeave = () => {
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

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout(undefined, { onSuccess: () => navigate("/") });
  };

  return (
    <header className={header()}>
      <nav className={nav()}>
        <ul className={nav("list")}>
          {/* В шапке — только сквозной контур закупки: главная, план-график,
              потребность, извещения, контракты и реестр контрактов. */}
          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/"}>
              <span className={nav("link-name")}>Главная</span>
            </NavLink>
          </li>

          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/purchase-plans"}>
              <span className={nav("link-name")}>План-график</span>
            </NavLink>
          </li>

          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/purchase-notes"}>
              <span className={nav("link-name")}>Потребность</span>
            </NavLink>
          </li>

          <li className={nav("item")}>
            <NavLink
              className={nav("link", ["logo"])}
              to={"/procurement-processing"}
            >
              <span className={nav("link-name")}>Извещения</span>
            </NavLink>
          </li>

          {/* Следующий этап цепочки после извещения — проект контракта */}
          <li className={nav("item")}>
            <NavLink
              className={nav("link", ["logo"])}
              to={"/contract-projects"}
            >
              <span className={nav("link-name")}>Проект контракта</span>
            </NavLink>
          </li>

          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/contract-service"}>
              <span className={nav("link-name")}>Контракты</span>
            </NavLink>
          </li>

          {/* Реестр контрактов с разбивкой по виду способа закупки:
              конкурентные процедуры и закупки у единственного поставщика */}
          <li className={nav("item")}>
            <div
              ref={registryRef}
              className={nav("submenu-wrap", isRegistryOpen ? ["open"] : [])}
              onMouseEnter={() => setIsRegistryOpen(true)}
              onMouseLeave={() => setIsRegistryOpen(false)}
            >
              <NavLink
                className={nav("link", [
                  "logo",
                  ...(isRegistryActive ? ["active"] : []),
                ])}
                to={"/contract-registry"}
                aria-haspopup="menu"
                aria-expanded={isRegistryOpen}
                onClick={() => setIsRegistryOpen(false)}
              >
                <span className={nav("link-name")}>Реестр контрактов</span>
                <span className={nav("submenu-arrow")}>▼</span>
              </NavLink>
              {isRegistryOpen && (
                <ul className={nav("submenu")}>
                  <li>
                    <NavLink
                      className={nav("submenu-link")}
                      to={"/contract-registry"}
                      end
                      onClick={() => setIsRegistryOpen(false)}
                    >
                      Все контракты
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      className={nav("submenu-link")}
                      to={"/contract-registry?group=competitive"}
                      onClick={() => setIsRegistryOpen(false)}
                    >
                      Контракты по конкурентным способам
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      className={nav("submenu-link")}
                      to={"/contract-registry?group=single"}
                      onClick={() => setIsRegistryOpen(false)}
                    >
                      Контракты у ЕП
                    </NavLink>
                  </li>
                </ul>
              )}
            </div>
          </li>

          {/* Выгрузка пакетов в ЕИС и работа с СМП/СОНКО */}
          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/eis/smp-export"}>
              <span className={nav("link-name")}>ЕИС / СМП</span>
            </NavLink>
          </li>

          {/* Исходящие пакеты: подпись, статусы и ошибки ФЛК */}
          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/eis/packages"}>
              <span className={nav("link-name")}>Пакеты ЕИС</span>
            </NavLink>
          </li>

          {/* Обозреватель официальных XSD ЕИС */}
          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/eis/schemas"}>
              <span className={nav("link-name")}>Схемы ЕИС</span>
            </NavLink>
          </li>

          {/* Сквозная цепочка: план-график → СЗ → извещение → контракт */}
          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/eis/chains"}>
              <span className={nav("link-name")}>Цепочка ЕИС</span>
            </NavLink>
          </li>

          {/* Чек-лист покрытия: какие наши поля уже переносятся в XSD */}
          <li className={nav("item")}>
            <button
              type="button"
              className={nav("link", ["logo", "button"])}
              onClick={() => setIsCoverageOpen(true)}
            >
              <span className={nav("link-name")}>Покрытие XSD</span>
            </button>
          </li>

          {/* Короткая справка о программных агентах системы */}
          <li className={nav("item")}>
            <button
              type="button"
              className={nav("link", ["logo", "button"])}
              onClick={() => setIsHelpOpen(true)}
            >
              <span className={nav("link-name")}>Справка</span>
            </button>
          </li>

          {/* Полный перечень UI-решений: назначение, место применения и реализация */}
          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/ui-solutions"}>
              <span className={nav("link-name")}>UI-решения</span>
            </NavLink>
          </li>

          <li className={nav("item")}>
            <NavLink
              className={nav("link", ["logo"])}
              to={"/reports/order-158n"}
            >
              <span className={nav("link-name")}>Отчёты 158н</span>
            </NavLink>
          </li>

          <li className={nav("item")}>
            <NavLink
              className={nav("link", ["logo"])}
              to={"/liability-mapping"}
            >
              <span className={nav("link-name")}>Ответственность КС</span>
            </NavLink>
          </li>

          {user && (
            <li className={nav("item")}>
              <NavLink className={nav("link", ["logo"])} to={"/documents"}>
                <span className={nav("link-name")}>Документы</span>
              </NavLink>
            </li>
          )}

          {user && (
            <li className={nav("item")}>
              <NavLink className={nav("link", ["logo"])} to={"/notifications"}>
                <span className={nav("link-name")}>Сроки и риски</span>
              </NavLink>
            </li>
          )}

          {/* ОКПД2 из реальной выгрузки НСИ: 21 066 кодов из csms-api */}
          <li className={nav("item")}>
            <NavLink
              className={({ isActive }) =>
                nav("link", ["logo", ...(isActive ? ["active"] : [])])
              }
              to={"/okpd2"}
            >
              <span className={nav("link-name")}>ОКПД2</span>
            </NavLink>
          </li>

          {/* Реальные выгрузки НСИ: версия, объём и источник из csms-api */}
          <li className={nav("item")}>
            <ReferenceDataBadge />
          </li>

          <li className={nav("item", ["end"])}>
            {user ? (
              <div
                ref={profileRef}
                className={nav("profile-wrap", isProfileOpen ? ["open"] : [])}
                onMouseEnter={openProfile}
                onMouseLeave={closeProfileOnLeave}
              >
                <button
                  type="button"
                  className={nav("profile", isProfileOpen ? ["open"] : [])}
                  title={fullName(employee?.employee ?? {}) || "Профиль"}
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
                  <span className={nav("link-name")}>
                    {isLoading && !employee
                      ? "Загрузка профиля"
                      : shortName(employee?.employee ?? {})}
                  </span>
                  <span className={nav("profile-arrow")} aria-hidden="true">
                    ▾
                  </span>
                </button>

                <ul className={nav("profile-menu")} role="menu">
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
              <NavLink className={nav("link", ["logo"])} to={"/account/login"}>
                <span className={nav("link-name")}>
                  {isLoading ? "Загрузка профиля" : "Вход"}
                </span>
              </NavLink>
            )}
          </li>

          {/* Переключатель темы — крайний справа и занимает минимум места */}
          <li className={nav("item")}>
            <button
              className={nav("theme-toggle")}
              onClick={toggleTheme}
              title={toggleLabel}
              aria-label={toggleLabel}
            >
              {THEME_ICONS[theme]}
            </button>
          </li>
        </ul>
      </nav>

      {isCoverageOpen && (
        <EisCoverageModal onClose={() => setIsCoverageOpen(false)} />
      )}

      {isHelpOpen && <AgentsHelpModal onClose={() => setIsHelpOpen(false)} />}
    </header>
  );
};

export default Header;
