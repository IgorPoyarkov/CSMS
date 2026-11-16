import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useFetchCurrentUser, useLogout } from "../../services/Users/user.api";
import { useFetchEmployeeByUserId } from "../../services/StaffingTable/StaffingTable.api";
import type { BaseHuman } from "../../services/StaffingTable/StaffingTable.schema";
import useUtils from "../../hooks/useUtils";
import useTheme from "../../hooks/useTheme";
import styles from "./Header.module.scss";

interface HeaderProps {}

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
  const { bem, fullName } = useUtils();
  const [theme, toggleTheme] = useTheme();
  const header = bem(styles, "header");
  const nav = bem(styles, "header-navigation");

  const toggleLabel = theme === "light" ? "Тёмная тема" : "Светлая тема";

  // Ховер и клик ведут одно и то же состояние: раньше меню открывалось стилями
  // по :hover, поэтому клик по кнопке его не скрывал (курсор-то внутри) и
  // выглядело это как «не слушается». Теперь видно одно состояние, а флаг
  // hoverDisabled не даёт наведению сразу открыть меню после клика-скрытия
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHoverDisabled, setIsHoverDisabled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout(undefined, { onSuccess: () => navigate("/") });
  };

  return (
    <header className={header()}>
      <nav className={nav()}>
        <ul className={nav("list")}>
          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/"}>
              <span className={nav("link-name")}>Главная</span>
              {/* <svg className={nav("icon")}>
                <use href="/sprite.svg#logo-icon" />
              </svg> */}
            </NavLink>
          </li>

          {user && (
            <li className={nav("item")}>
              <NavLink className={nav("link", ["logo"])} to={"/tasks"}>
                <span className={nav("link-name")}>Задачи организации</span>
              </NavLink>
            </li>
          )}

          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/okpd2"}>
              <span className={nav("link-name")}>Справочник ОКПД2</span>
            </NavLink>
          </li>

          {/* Реестр норм, на которые опирается система: видно, какие экраны
              менять при правке акта (Tasks 6, п. 3) */}
          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/legal-acts"}>
              <span className={nav("link-name")}>Законодательные акты</span>
            </NavLink>
          </li>

          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/eis/smp-export"}>
              <span className={nav("link-name")}>ЕИС / СМП</span>
            </NavLink>
          </li>

          <li className={nav("item")}>
            <NavLink className={nav("link", ["logo"])} to={"/eds/journal"}>
              <span className={nav("link-name")}>Журнал ЭП</span>
            </NavLink>
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
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
