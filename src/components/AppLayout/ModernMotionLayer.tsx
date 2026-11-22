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
// комету, но не неоновую подсветку на hover: у них своя рамка. Все слушатели
// живут только пока включена тема; при prefers-reduced-motion и на тач-экранах
// движение выключено.

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
    let magnets: MagnetEntry[] = [];
    let magnetEls: HTMLElement[] = [];
    let pointerX = 0;
    let pointerY = 0;
    let dirX = 1;
    let dirY = 0;
    let hasPointer = false;

    // Комета по контуру: помечаем только блоки, у которых есть свободный
    // псевдоэлемент. Занятый ::after — не повод терять блок: пробуем ::before.
    const markPanels = () => {
      panels.forEach((el) => {
        el.removeAttribute("data-modern-comet");
        el.removeAttribute("data-modern-lift");
      });
      panels = [];

      const minWidth = Math.min(
        COMET_MIN_WIDTH,
        window.innerWidth - COMET_MIN_SIDE_GAP,
      );

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

        const after = getComputedStyle(el, "::after").content;
        const before = getComputedStyle(el, "::before").content;
        const free = (value: string) => value === "none" || value === "normal";
        const slot = free(after) ? "after" : free(before) ? "before" : null;

        if (!slot) {
          return;
        }

        el.setAttribute("data-modern-comet", slot);
        // Модалка и таблица неоновую подсветку не получают: у модалки своя
        // рамка, у таблицы inset-тень размазывается по ячейкам.
        const tag = el.tagName.toLowerCase();

        if (tag !== "table" && el.getAttribute("role") !== "dialog") {
          el.setAttribute("data-modern-lift", "");
        }

        panels.push(el);
      });
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
      motionQuery.addEventListener("change", scheduleRebuild);
    };

    const deactivate = () => {
      if (!active) {
        return;
      }

      active = false;
      window.clearTimeout(rebuildTimer);

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
      motionQuery.removeEventListener("change", scheduleRebuild);

      resetMagnets();
      magnets = [];
      panels.forEach((el) => {
        el.removeAttribute("data-modern-comet");
        el.removeAttribute("data-modern-lift");
      });
      magnetEls.forEach((el) => el.removeAttribute("data-modern-magnet"));
      panels = [];
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
