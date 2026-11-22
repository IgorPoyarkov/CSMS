import { useEffect } from "react";

// Декор темы «Современные закупки» (data-theme="modern").
//
// Тема двигает две группы элементов, и обе зависят от геометрии, которую CSS
// не знает:
//   • большие стационарные блоки — неоновая мерцающая подсветка по контуру,
//     по нему бежит комета с хвостом (голова — циан, хвост — магента), а на
//     hover по краям загорается неон. Блок при этом не двигается: «большой»
//     определяется порогом по площади, поэтому элемент помечается из JS:
//     data-modern-comet="after|before" и data-modern-lift (стили в
//     _theme-modern.scss);
//   • короткие списки (4–6 чипов, табы, пункты меню) — магнитное расхождение:
//     элемент отходит на 12% своего размера перпендикулярно движению курсора.
//     Набор помечается data-modern-magnet, смещение считается здесь.
//
// Псевдоэлемент для кометы выбирается по занятости: у части карточек ::after
// уже занят своим декором, поэтому берём свободный слот. Модалки получают
// комету, но не неоновую подсветку на hover: у них своя рамка. Атрибуты декора
// ставятся идемпотентно (только при изменении): снятие и повторная установка
// атрибута перезапускают CSS-анимацию, из-за чего на «живых» страницах комета
// замирала у начала контура. Дополнительно здесь есть запасной путь для
// браузеров без интерполяции @property: если угол кометы не меняется, JS
// крутит его сам. Все слушатели живут только пока включена тема; на тач-экранах
// магнитное движение выключено, при prefers-reduced-motion комета не
// останавливается, а замедляется в CSS (магнит выключен и здесь).
//
// Обёртки без скругления (section со списком карточек, div с классом panel)
// декор не получают: рамка по их прямым углам не совпадает с формой
// скруглённых карточек внутри. Декор уходит на сами карточки — см.
// roundedChildren().

const MODERN_THEME = "modern";

// Кандидаты в большие блоки: секции страниц, карточки, таблицы, формы и
// модальные окна. Часть панелей в проекте — div с классом panel, поэтому
// добавлен и этот маркер: иначе, например, реестр контрактов оставался бы
// без контура.
const PANEL_SELECTOR = [
  "section",
  "article",
  "aside",
  "fieldset",
  "table",
  "form",
  "li[class*='card']",
  "[class*='panel']",
  "[role='dialog']",
].join(", ");

// Короткие списки: табы, чипы фильтров, блоки статистики и пункты навигации.
const MAGNET_SELECTOR = [
  "[class*='__tabs'] > *",
  "[class*='tabs'] > button",
  "[class*='filters'] > *",
  "[class*='filter'] button",
  "[class*='stats'] > *",
  "header nav a",
].join(", ");

// Порог «большого» блока: уже 560 px контур читается как рамка мелкой
// карточки, а комета на ней выглядит как мигающая обводка кнопки. На узком
// экране порог ужимается до ширины контента, иначе на телефоне декор не
// появлялся бы вовсе.
const COMET_MIN_WIDTH = 560;
const COMET_MIN_HEIGHT = 240;
const COMET_MIN_SIDE_GAP = 32;

// Прямоугольные обёртки. У части страниц панелью (section, div с классом
// panel) служит контейнер без скругления, а внутри лежат скруглённые карточки:
// на /tasks это section с списком li.task-item (border-radius: 8px). Неоновая
// рамка по прямым углам такой обёртки не совпадает с формой карточек, поэтому
// декор уходит на них: подсветка на hover — всем, комета — только тем, кто
// проходит порог большого блока (мелкая карточка получает мигающую обводку).
const ROUNDED_MIN_RADIUS = 4;
const INNER_MIN_HEIGHT = 64;
const INNER_MIN_WIDTH_RATIO = 0.6;
// Доля высоты обёртки, после которой вложенная панель считается «главной» и
// получает комету. В списке карточек каждая занимает проценты высоты — комета
// на каждой превращала бы страницу в гирлянду, поэтому там остаётся только
// подсветка на hover.
const INNER_COMET_MIN_COVER = 0.5;
const INNER_LIMIT = 80;

// Магнит: радиус действия, доля размера элемента (12%) и предел площади —
// крупные панели не должны ездить под курсором.
const MAGNET_RADIUS = 170;
const MAGNET_SHIFT = 0.12;
const MAGNET_MAX_WIDTH = 520;
const MAGNET_MAX_HEIGHT = 300;
const MAGNET_MAX_AREA = MAGNET_MAX_WIDTH * MAGNET_MAX_HEIGHT;

// Пересборка после изменений в разметке: списки и таблицы перерисовываются
// пачками, поэтому ждём, пока React закончит.
const REBUILD_DELAY = 400;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canHover = () => window.matchMedia("(hover: hover)").matches;

interface MagnetEntry {
  el: HTMLElement;
  cx: number;
  cy: number;
  // Меньшая сторона: сдвиг в процентах от неё не выводит элемент за границы
  // короткого списка, даже если он вытянут по горизонтали.
  size: number;
}

/**
 * Слой декора темы. Ничего не рендерит: только помечает элементы и двигает
 * их, пока включена тема «Современные закупки».
 */
export default function ModernMotionLayer() {
  useEffect(() => {
    const root = document.documentElement;

    let active = false;
    let frame = 0;
    let rebuildTimer = 0;
    let panels: HTMLElement[] = [];
    // Все элементы с декором (комета и/или подсветка). Нужен отдельно от
    // panels: подсветку получают и мелкие скруглённые карточки, у которых
    // кометы нет, а снимать атрибуты при деактивации нужно со всех.
    let decorated: HTMLElement[] = [];
    let magnets: MagnetEntry[] = [];
    let magnetEls: HTMLElement[] = [];
    let pointerX = 0;
    let pointerY = 0;
    let dirX = 1;
    let dirY = 0;
    let hasPointer = false;

    // --- Движение кометы без @property ---------------------------------------
    // Угол конического градиента интерполируется только у зарегистрированного
    // кастомного свойства. Там, где такой регистрации нет, keyframes
    // modern-comet-run ничего не меняет и рамка стоит на месте в одном
    // положении. Поэтому после разметки дважды замеряем угол: если он не
    // сдвинулся — крутим его сами, раз в два кадра (30 fps хватает: полный
    // оборот идёт 8 с). CSS-анимация при этом остаётся: она приоритетнее
    // инлайн-значения, так что при ложном срабатывании ничего не ломается.
    let fallbackFrame = 0;
    let detectTimer = 0;

    const cometSeconds = () => {
      const raw = getComputedStyle(root)
        .getPropertyValue("--comet-duration")
        .trim();
      const value = Number.parseFloat(raw);

      if (!Number.isFinite(value) || value <= 0) {
        return 8;
      }

      return raw.endsWith("ms") ? value / 1000 : value;
    };

    const cometAngle = (el: HTMLElement) => {
      const pseudo =
        el.getAttribute("data-modern-comet") === "before"
          ? "::before"
          : "::after";

      return getComputedStyle(el, pseudo)
        .getPropertyValue("--modern-comet-angle")
        .trim();
    };

    const stopCometFallback = () => {
      if (fallbackFrame) {
        window.cancelAnimationFrame(fallbackFrame);
        fallbackFrame = 0;
      }

      // Чистим по селектору, а не только по текущему списку: панель могла
      // выпасть из разметки декора после того, как угол уже был выставлен.
      document
        .querySelectorAll<HTMLElement>("[data-modern-comet]")
        .forEach((el) => el.style.removeProperty("--modern-comet-angle"));
    };

    const startCometFallback = () => {
      if (fallbackFrame || !active) {
        return;
      }

      // При reduced-motion CSS замедляет полосу в 4,5 раза — фолбэк держит ту
      // же скорость, иначе рамка побежит быстрее, чем задумано для этой темы.
      const period = cometSeconds() * (prefersReducedMotion() ? 4.5 : 1) * 1000;

      fallbackFrame = window.requestAnimationFrame(function tick() {
        fallbackFrame = window.requestAnimationFrame(tick);

        if (document.visibilityState !== "visible") {
          return;
        }

        const angle = ((performance.now() % period) / period) * 360;
        const value = `${angle.toFixed(2)}deg`;

        panels.forEach((el) => {
          if (el.isConnected) {
            el.style.setProperty("--modern-comet-angle", value);
          }
        });
      });
    };

    const probeCometMotion = () => {
      window.clearTimeout(detectTimer);

      if (!active || fallbackFrame || !panels.length) {
        return;
      }

      detectTimer = window.setTimeout(() => {
        const el = panels.find((panel) => panel.isConnected);

        if (!active || !el) {
          return;
        }

        const first = cometAngle(el);

        detectTimer = window.setTimeout(() => {
          if (!active || !el.isConnected) {
            return;
          }

          if (first && cometAngle(el) === first) {
            startCometFallback();
          }
        }, 450);
      }, 600);
    };

    // --- Разметка панелей ----------------------------------------------------
    // Комета по контуру: помечаем только блоки, у которых есть свободный
    // псевдоэлемент. Занятый ::after — не повод терять блок: пробуем ::before.
    // Атрибуты трогаем только при реальном изменении: снятие и повторная
    // установка перезапускают CSS-анимацию кометы с нуля, и на странице с
    // частыми обновлениями разметки полоса «стоит» на одном месте.
    const freeSlot = (el: HTMLElement) => {
      const free = (value: string) => value === "none" || value === "normal";
      const after = getComputedStyle(el, "::after").content;

      if (free(after)) {
        return "after";
      }

      return free(getComputedStyle(el, "::before").content) ? "before" : null;
    };

    // Скруглённые панели внутри прямоугольной обёртки. Берём только потомков,
    // которые занимают заметную часть обёртки по ширине и не являются
    // строчными мелочами: иначе подсветка расползётся по чипам и бейджам.
    const roundedChildren = (host: HTMLElement, hostRect: DOMRect) => {
      const minWidth = hostRect.width * INNER_MIN_WIDTH_RATIO;
      const found: { el: HTMLElement; rect: DOMRect }[] = [];

      host.querySelectorAll<HTMLElement>("*").forEach((child) => {
        if (found.length >= INNER_LIMIT) {
          return;
        }

        // Скрытые ветки отсекаются сами: у них нулевые размеры.
        const rect = child.getBoundingClientRect();

        if (rect.width < minWidth || rect.height < INNER_MIN_HEIGHT) {
          return;
        }

        const style = getComputedStyle(child);
        const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;

        if (radius < ROUNDED_MIN_RADIUS) {
          return;
        }

        // У таблицы со «схлопнутыми» границами радиус не применяется: считать
        // её скруглённой панелью нельзя, иначе декор пропадёт с обёртки.
        if (style.borderCollapse === "collapse") {
          return;
        }

        found.push({ el: child, rect });
      });

      return found;
    };

    const markPanels = () => {
      const minWidth = Math.min(
        COMET_MIN_WIDTH,
        window.innerWidth - COMET_MIN_SIDE_GAP,
      );
      const next = new Set<HTMLElement>();
      const nextPanels = new Set<HTMLElement>();

      const decorate = (
        el: HTMLElement,
        rect: DOMRect,
        allowLift: boolean,
        allowComet: boolean,
      ) => {
        const big = rect.width >= minWidth && rect.height >= COMET_MIN_HEIGHT;
        const slot = allowComet && big ? freeSlot(el) : null;

        if (slot) {
          if (el.getAttribute("data-modern-comet") !== slot) {
            el.setAttribute("data-modern-comet", slot);
          }

          nextPanels.add(el);
        } else if (el.hasAttribute("data-modern-comet")) {
          el.removeAttribute("data-modern-comet");
        }

        // Модалка и таблица неоновую подсветку не получают: у модалки своя
        // рамка, у таблицы inset-тень размазывается по ячейкам.
        const wantLift =
          allowLift &&
          el.tagName.toLowerCase() !== "table" &&
          el.getAttribute("role") !== "dialog";

        if (wantLift) {
          if (!el.hasAttribute("data-modern-lift")) {
            el.setAttribute("data-modern-lift", "");
          }
        } else if (el.hasAttribute("data-modern-lift")) {
          el.removeAttribute("data-modern-lift");
        }

        if (slot || wantLift) {
          next.add(el);
        }
      };

      document.querySelectorAll<HTMLElement>(PANEL_SELECTOR).forEach((el) => {
        const rect = el.getBoundingClientRect();

        if (
          rect.width < minWidth ||
          rect.height < COMET_MIN_HEIGHT ||
          !el.getClientRects().length ||
          el.closest("[aria-hidden='true']")
        ) {
          return;
        }

        const radius =
          Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;

        if (radius < ROUNDED_MIN_RADIUS) {
          const inner = roundedChildren(el, rect);

          if (inner.length) {
            // Обёртка прямоугольная, а содержимое скруглённое: рамку по её
            // прямым углам не рисуем. Подсветку получают сами карточки;
            // комету — только те, кто проходит порог, и только снаружи
            // (у вложенной панели уже есть своя рамка).
            const innerSet = new Set(inner.map((item) => item.el));
            const insidePanel = (node: HTMLElement) => {
              for (
                let parent = node.parentElement;
                parent;
                parent = parent.parentElement
              ) {
                if (innerSet.has(parent)) {
                  return true;
                }
              }

              return false;
            };

            inner.forEach(({ el: child, rect: childRect }) => {
              // Комета — только «главной» панели обёртки: у вложенной внутри
              // другой панели и у карточки списка её нет.
              const allowComet =
                !insidePanel(child) &&
                childRect.height >= rect.height * INNER_COMET_MIN_COVER;

              decorate(child, childRect, true, allowComet);
            });

            // Если ни одна вложенная панель декор не получила (например, всё
            // содержимое — таблицы), обёртка остаётся с прежней подсветкой:
            // иначе страница теряет неон совсем.
            if (!inner.some((item) => next.has(item.el))) {
              decorate(el, rect, true, true);
            }

            return;
          }
        }

        decorate(el, rect, true, true);
      });

      // Декор снимаем только с тех, кто больше не подходит: сменил размер,
      // попал в скрытую ветку или ушёл из разметки.
      decorated.forEach((el) => {
        if (next.has(el)) {
          return;
        }

        el.removeAttribute("data-modern-comet");
        el.removeAttribute("data-modern-lift");
      });

      panels = [...nextPanels];
      decorated = [...next];
      probeCometMotion();
    };

    const refreshMagnetCenters = () => {
      magnets = magnetEls.map((el) => {
        const rect = el.getBoundingClientRect();

        return {
          el,
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
          size: Math.min(rect.width, rect.height),
        };
      });
    };

    const resetMagnets = () => {
      magnetEls.forEach((el) => {
        el.style.transform = "";
      });
      hasPointer = false;
    };

    const collectMagnets = () => {
      resetMagnets();
      magnetEls.forEach((el) => el.removeAttribute("data-modern-magnet"));
      magnetEls = [];

      if (prefersReducedMotion() || !canHover()) {
        magnets = [];
        return;
      }

      document.querySelectorAll<HTMLElement>(MAGNET_SELECTOR).forEach((el) => {
        const rect = el.getBoundingClientRect();

        if (
          !rect.width ||
          !rect.height ||
          rect.width > MAGNET_MAX_WIDTH ||
          rect.height > MAGNET_MAX_HEIGHT ||
          rect.width * rect.height > MAGNET_MAX_AREA
        ) {
          return;
        }

        el.setAttribute("data-modern-magnet", "");
        magnetEls.push(el);
      });

      refreshMagnetCenters();
    };

    const rebuild = () => {
      if (!active) {
        return;
      }

      markPanels();
      collectMagnets();
    };

    const scheduleRebuild = () => {
      window.clearTimeout(rebuildTimer);
      rebuildTimer = window.setTimeout(rebuild, REBUILD_DELAY);
    };

    // Курсор двигается — раз в кадр сдвигаем чипы. Сдвиг считается от
    // направления движения, а не от положения курсора: элементы расходятся
    // в стороны от линии, по которой идёт указатель.
    const applyMagnets = () => {
      frame = 0;

      if (!active || prefersReducedMotion()) {
        return;
      }

      const perpX = -dirY;
      const perpY = dirX;

      magnets.forEach(({ el, cx, cy, size }) => {
        const dx = cx - pointerX;
        const dy = cy - pointerY;
        const distance = Math.hypot(dx, dy);

        if (distance > MAGNET_RADIUS || !size) {
          if (el.style.transform) {
            el.style.transform = "";
          }

          return;
        }

        // Затухание к краю радиуса: на границе сдвиг нулевой, иначе элемент
        // «прыгает» в момент входа курсора в радиус.
        const falloff = 1 - distance / MAGNET_RADIUS;
        // Куда отходит элемент: в ту сторону перпендикуляра, где лежит его
        // центр относительно курсора.
        const side = dx * perpX + dy * perpY >= 0 ? 1 : -1;
        const shift = MAGNET_SHIFT * size * falloff * side;

        el.style.transform = `translate3d(${(perpX * shift).toFixed(
          2,
        )}px, ${(perpY * shift).toFixed(2)}px, 0)`;
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }

      const dx = event.clientX - pointerX;
      const dy = event.clientY - pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;

      const length = Math.hypot(dx, dy);

      // Мелкие дрожания курсора не должны менять направление: иначе элементы
      // дёргаются из стороны в сторону на одном месте.
      if (length > 1.5) {
        dirX = dx / length;
        dirY = dy / length;
      }

      if (!hasPointer) {
        hasPointer = true;

        return;
      }

      if (!frame) {
        frame = window.requestAnimationFrame(applyMagnets);
      }
    };

    // Прокрутка сдвигает центры чипов: без пересчёта магнит «отстаёт» от
    // элементов и они дёргаются при движении курсора после скролла.
    let scrollFrame = 0;
    const handleScroll = () => {
      if (scrollFrame) {
        return;
      }

      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        refreshMagnetCenters();
      });
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Смена настройки «уменьшить движение» меняет скорость кометы в CSS:
    // сбрасываем JS-фолбэк, чтобы он пересчитал период, и пересобираем декор.
    const handleMotionChange = () => {
      stopCometFallback();
      scheduleRebuild();
    };

    const activate = () => {
      if (active) {
        return;
      }

      active = true;
      rebuild();

      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      window.addEventListener("blur", resetMagnets);
      window.addEventListener("resize", scheduleRebuild);
      window.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
      document.documentElement.addEventListener("mouseleave", resetMagnets);
      motionQuery.addEventListener("change", handleMotionChange);
    };

    const deactivate = () => {
      if (!active) {
        return;
      }

      active = false;
      window.clearTimeout(rebuildTimer);
      window.clearTimeout(detectTimer);

      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }

      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
        scrollFrame = 0;
      }

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetMagnets);
      window.removeEventListener("resize", scheduleRebuild);
      window.removeEventListener("scroll", handleScroll, true);
      document.documentElement.removeEventListener("mouseleave", resetMagnets);
      motionQuery.removeEventListener("change", handleMotionChange);

      resetMagnets();
      stopCometFallback();
      magnets = [];
      decorated.forEach((el) => {
        el.removeAttribute("data-modern-comet");
        el.removeAttribute("data-modern-lift");
      });
      magnetEls.forEach((el) => el.removeAttribute("data-modern-magnet"));
      panels = [];
      decorated = [];
      magnetEls = [];
    };

    // Тема переключается атрибутом на <html>: следим за ним и не держим
    // слушатели, пока тема другая.
    const themeObserver = new MutationObserver(() => {
      if (root.getAttribute("data-theme") === MODERN_THEME) {
        activate();
      } else {
        deactivate();
      }
    });

    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Разметку пересобираем только по появлению/удалению узлов: смена
    // собственных атрибутов декора наблюдателя не будит (attributes: false),
    // поэтому цикла «мутация → пересборка → мутация» нет.
    const domObserver = new MutationObserver(() => {
      if (active) {
        scheduleRebuild();
      }
    });

    domObserver.observe(document.body, { childList: true, subtree: true });

    if (root.getAttribute("data-theme") === MODERN_THEME) {
      activate();
    }

    return () => {
      themeObserver.disconnect();
      domObserver.disconnect();
      deactivate();
    };
  }, []);

  return null;
}
