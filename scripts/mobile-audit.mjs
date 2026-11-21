// Аудит мобильной вёрстки: измеряет горизонтальное переполнение и размеры
// touch-зон на заданных ширинах экрана. Работает через Chrome DevTools
// Protocol, без playwright/puppeteer — только headless-браузер и Node 22+.
//
// Запуск (dev-сервер и json-server должны быть подняты):
//   npm run check:mobile
// Другой набор страниц/ширин/темы:
//   node scripts/mobile-audit.mjs --widths=320,375 --theme=floating3d
//   node scripts/mobile-audit.mjs --routes=/,/purchase-plans --shots
//
// Что проверяется:
//   • documentElement.scrollWidth не больше ширины вьюпорта — иначе на телефоне
//     появляется горизонтальная прокрутка всей страницы;
//   • элементы, вылезающие за вьюпорт, кроме случаев, когда их предок сам
//     прокручивается по X (широкие таблицы в скроллерах — это норма);
//   • интерактивные элементы меньше 44×44 px (кроме строк таблиц: там плотность
//     данных важнее размера кнопки).
//
// Код выхода 1, если найдено переполнение: годится для CI и для проверки
// правок перед коммитом.

import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const BASE_URL = "http://localhost:5173";

// Сквозные разделы приложения: шапка, реестры, карточки, модалки, отчёты.
const DEFAULT_ROUTES = [
  "/",
  "/purchase-plans",
  "/purchase-notes",
  "/procurement-processing",
  "/contract-projects",
  "/contract-service",
  "/contract-registry",
  "/acceptances",
  "/tasks",
  "/documents",
  "/notifications",
  "/okpd2",
  "/norming-requirements",
  "/legal-acts",
  "/liability-mapping",
  "/bid-evaluations",
  "/defect-lists",
  "/nmck-calculator",
  "/vacation-schedule",
  "/eis/smp-export",
  "/eis/packages",
  "/eis/schemas",
  "/eis/chains",
  "/reports/order-158n",
  "/ui-solutions",
  "/account/login",
  "/account/profile",
];

const parseList = (value, fallback) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : fallback;

const args = new Map(
  process.argv.slice(2).map((raw) => {
    // Ровно первый «=» отделяет имя от значения: в значении бывают свои «=»
    // (например, стрелки в JS-выражении для --eval)
    const arg = raw.replace(/^--/, "");
    const at = arg.indexOf("=");
    return at === -1 ? [arg, "true"] : [arg.slice(0, at), arg.slice(at + 1)];
  }),
);

if (args.has("help")) {
  console.log(
    "node scripts/mobile-audit.mjs [--routes=/a,/b] [--widths=320,375,430] " +
      "[--theme=light|dark|storm|winter|floating3d] [--shots] [--base=URL] [--settle=1200]",
  );
  process.exit(0);
}

const base = args.get("base") ?? BASE_URL;
const routes = parseList(args.get("routes"), DEFAULT_ROUTES);
const theme = args.get("theme") ?? "light";
const withShots = args.has("shots");
const showSmall = args.has("small");
// Отладочный режим: выполнить своё выражение на каждой странице и напечатать
// результат. Нужен, когда непонятно, какой узел раздвигает макет
const evalScript = args.get("eval");

// Пауза после загрузки: react-query подтягивает данные уже после load, но при
// прогоне десятков страниц секунда на каждую складывается в минуты
const settleMs = Number(args.get("settle") ?? 1200);

// Вьюпорт задаётся либо парами --viewports=375x812,812x375, либо шириной
// --widths=320,375 (высота портретная по умолчанию)
const viewports = args.has("viewports")
  ? parseList(args.get("viewports"), []).map((pair) => {
      const [width, height = "812"] = pair.split("x");
      return { width: Number(width), height: Number(height) };
    })
  : parseList(args.get("widths"), ["320", "375", "430"]).map((width) => ({
      width: Number(width),
      height: 812,
    }));

const shotDir = ".mobile-audit";

// ─── Поиск браузера ─────────────────────────────────────────────────────────

const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const browserPath = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));

if (!browserPath) {
  console.error("Не найден Chrome/Edge. Укажите путь в CHROME_PATH.");
  process.exit(2);
}

// ─── Минимальный CDP-клиент ─────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const port = 9300 + Math.floor(Math.random() * 400);
const profileDir = join(tmpdir(), `csms-mobile-audit-${Date.now()}`);

const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const waitForTarget = async () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Браузер ещё поднимается
    }
    await sleep(150);
  }
  throw new Error("Не удалось подключиться к браузеру по CDP");
};

const createSession = async () => {
  const url = await waitForTarget();
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    listeners.forEach((listener) => listener(message));
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = (nextId += 1);
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const waitForEvent = (name, timeout = 15000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        listeners.delete(listener);
        reject(new Error(`Таймаут события ${name}`));
      }, timeout);
      const listener = (message) => {
        if (message.method === name) {
          clearTimeout(timer);
          listeners.delete(listener);
          resolve(message.params);
        }
      };
      listeners.add(listener);
    });

  return { send, waitForEvent, close: () => socket.close() };
};

// ─── Измерения внутри страницы ──────────────────────────────────────────────

const MEASURE = String.raw`
(() => {
  const vw = document.documentElement.clientWidth;

  // Элемент внутри собственного X-скроллера — это нормально (широкие таблицы)
  const inScroller = (element) => {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowX)) return true;
      parent = parent.parentElement;
    }
    return false;
  };

  const describe = (element) => {
    const rect = element.getBoundingClientRect();
    const cls = typeof element.className === "string" ? element.className : "";
    return {
      tag: element.tagName.toLowerCase(),
      cls: cls.split(" ").filter(Boolean).slice(0, 3).join(" "),
      text: (element.textContent || "").trim().slice(0, 40),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  };

  const overflow = [];
  const seen = new Set();
  document.querySelectorAll("body *").forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    if (rect.right <= vw + 1 && rect.left >= -1) return;
    const style = getComputedStyle(element);
    if (style.position === "fixed" || style.display === "none") return;
    if (style.visibility === "hidden") return;
    if (inScroller(element)) return;
    const item = describe(element);
    const signature = item.tag + "|" + item.cls + "|" + item.left + "|" + item.right;
    if (seen.has(signature)) return;
    seen.add(signature);
    overflow.push(item);
  });

  // Виновники переполнения: содержимое шире рамки у элемента, который сам не
  // скроллится. Такие узлы и раздвигают документ — по ним и правим стили.
  // Элементы во всю ширину вьюпорта — это предки-обёртки, их пропускаем:
  // нужен самый глубокий виновник, у которого ширина ещё меньше страницы.
  const pushing = [];
  document.querySelectorAll("body *").forEach((element) => {
    const style = getComputedStyle(element);
    if (/(auto|scroll)/.test(style.overflowX)) return;
    if (element.scrollWidth <= element.clientWidth + 1) return;
    const item = describe(element);
    if (item.width >= vw - 1) return;
    pushing.push({ ...item, content: element.scrollWidth });
  });
  pushing.sort((a, b) => a.content - b.content);

  // Touch-зоны меньше 44 px. Строки таблиц и ссылки в тексте не считаем:
  // там плотность информации важнее размера кнопки. Чекбоксы и радиокнопки
  // тоже пропускаем — они всегда в паре с label, и цель считается по нему.
  const small = [];
  document
    .querySelectorAll(
      "button, a[href], select, " +
        "input:not([type=hidden]):not([type=checkbox]):not([type=radio]), " +
        "textarea, [role='button']",
    )
    .forEach((element) => {
      if (element.closest("table")) return;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Ссылка-«текст» — не кнопка: у неё нет роли, фона и рамки. Внутри
      // flex/grid она blockified и теряет display: inline, поэтому смотрим ещё
      // и на оформление; иначе обычные текстовые переходы попадают в отчёт
      const isTextLink =
        element.tagName === "A" &&
        !element.getAttribute("role") &&
        (style.display === "inline" ||
          (style.backgroundColor === "rgba(0, 0, 0, 0)" &&
            style.borderBottomWidth === "0px" &&
            style.borderTopWidth === "0px"));
      if (isTextLink) return;
      if (rect.height < 44 || rect.width < 24) small.push(describe(element));
    });

  return {
    vw,
    vh: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflow: overflow.slice(0, 25),
    overflowCount: overflow.length,
    // Виновники: элементы, чьё содержимое шире собственной рамки и которые при
    // этом не являются скролл-контейнером — именно они раздвигают страницу
    pushing: pushing.slice(0, 10),
    small: small.slice(0, 25),
    smallCount: small.length,
  };
})()
`;

// ─── Прогон ─────────────────────────────────────────────────────────────────

const run = async () => {
  const session = await createSession();
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  // Тема задаётся до первой отрисовки: useTheme читает localStorage при старте
  await session.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `try { localStorage.setItem("csms-theme", ${JSON.stringify(theme)}); } catch (e) {}`,
  });

  if (withShots) await mkdir(shotDir, { recursive: true });

  const report = [];
  let failures = 0;

  for (const viewport of viewports) {
    const { width, height } = viewport;
    await session.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: true,
    });

    for (const route of routes) {
      await session.send("Page.navigate", { url: base + route });
      try {
        await session.waitForEvent("Page.loadEventFired", 15000);
      } catch {
        // SPA может не прислать событие повторно — ждём фиксированно
      }
      // react-query подтягивает данные уже после load
      await sleep(settleMs);

      if (evalScript) {
        const probe = await session.send("Runtime.evaluate", {
          expression: evalScript,
          returnByValue: true,
        });
        console.log(`${String(width).padStart(4)}x${height} ${route} ⇒`, probe.result?.value);
        continue;
      }

      const { result } = await session.send("Runtime.evaluate", {
        expression: MEASURE,
        returnByValue: true,
      });
      const metrics = result?.value ?? {};

      const overflows = (metrics.scrollWidth ?? 0) > width + 1;
      if (overflows) failures += 1;

      report.push({ width, height, route, ...metrics });

      console.log(
        `${(overflows ? "OVERFLOW" : "ok").padEnd(8)} ${String(width).padStart(4)}x${height} ${route}` +
          ` scroll=${metrics.scrollWidth} offenders=${metrics.overflowCount} ` +
          `small-targets=${metrics.smallCount}`,
      );

      if (overflows && metrics.overflow?.length) {
        metrics.overflow.slice(0, 5).forEach((item) => {
          console.log(
            `         · <${item.tag} class="${item.cls}"> ${item.left}…${item.right} ` +
              `(${item.width}px) "${item.text}"`,
          );
        });
      }

      if (overflows && metrics.pushing?.length) {
        metrics.pushing.slice(0, 3).forEach((item) => {
          console.log(
            `         → <${item.tag} class="${item.cls}"> content=${item.content} box=${item.width} ` +
              `"${item.text}"`,
          );
        });
      }

      if (showSmall && metrics.small?.length) {
        metrics.small.slice(0, 8).forEach((item) => {
          console.log(
            `         ◦ <${item.tag} class="${item.cls}"> ${item.width}×${item.height} "${item.text}"`,
          );
        });
      }

      if (withShots) {
        const shot = await session.send("Page.captureScreenshot", {
          format: "png",
          captureBeyondViewport: false,
        });
        const slug = route === "/" ? "home" : route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
        await writeFile(
          join(shotDir, `${slug}-${width}x${height}.png`),
          Buffer.from(shot.data, "base64"),
        );
      }
    }
  }

  if (withShots) {
    await writeFile(join(shotDir, "report.json"), JSON.stringify(report, null, 2));
  }

  session.close();
  console.log(`\nИтого: страниц ${report.length}, с горизонтальным переполнением — ${failures}.`);

  return failures;
};

let exitCode = 0;
try {
  exitCode = (await run()) > 0 ? 1 : 0;
} catch (error) {
  console.error("Аудит не выполнен:", error.message);
  exitCode = 2;
} finally {
  browser.kill();
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  process.exit(exitCode);
}
