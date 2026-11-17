/**
 * Загрузчик официального `cadesplugin_api.js` (КриптоПро, JSModuleVersion 2.4.5).
 *
 * Зачем он нужен: расширение в браузере отдаёт только мост
 * `window.cpcsp_chrome_nmcades` внутри своего `nmcades_plugin_api.js`, а
 * объект `window.cadesplugin` (CreateObjectAsync, константы CAdESCOM,
 * async_spawn) создаёт именно этот скрипт, и сайт обязан подключить его сам —
 * так делают ЕИС и все ЭТП. Без него `typeof cadesplugin` всегда `undefined`
 * при любом состоянии плагина.
 *
 * Файл лежит в `public/`, поэтому отдаётся как есть, без сборки: он должен
 * выполняться в контексте страницы и сам подключать `nmcades_plugin_api.js`
 * из расширения (`chrome-extension://<id>/…`).
 */

const SCRIPT_PATH = "/cadesplugin_api.js";
const SCRIPT_ATTR = "data-csms-cades-api";
// Плагин сам сдаётся через 20 с; здесь ждём меньше, чтобы интерфейс не висел
const READY_TIMEOUT_MS = 12000;

interface CadesGlobal {
  cadesplugin?: unknown;
}

const cadesWindow = (): CadesGlobal => window as unknown as CadesGlobal;

/** API-скрипт уже выполнился: глобальный объект объявлен. */
export const isCadesApiLoaded = (): boolean =>
  typeof window !== "undefined" && Boolean(cadesWindow().cadesplugin);

/**
 * Подключить API-скрипт один раз. Повторные вызовы возвращают тот же результат:
 * второй <script> не создаётся, а параллельные вызовы ждут существующий.
 */
export const loadCadesApi = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Нет окна браузера: скрипт плагина некуда подключать."));
  }

  if (isCadesApiLoaded()) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[${SCRIPT_ATTR}]`,
  );

  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      if (isCadesApiLoaded()) resolve();
      else reject(new Error("Скрипт cadesplugin_api.js выполнился, но объект cadesplugin не появился."));
    };

    if (existing) {
      if (existing.dataset.loaded === "1") finish();
      else {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", () => reject(new Error("Не удалось загрузить cadesplugin_api.js.")), {
          once: true,
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_PATH;
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, "1");
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      finish();
    });
    script.addEventListener("error", () => {
      reject(new Error(`Не удалось загрузить ${SCRIPT_PATH}: проверьте, что файл лежит в public/.`));
    });

    document.head.appendChild(script);
  });
};

/**
 * Дождаться готовности плагина.
 *
 * `cadesplugin` — это Promise: он разрешается, когда расширение ответило и
 * объект CAdESCOM создан, и отклоняется, когда плагина нет или он заблокирован.
 * Поэтому «объект есть» ещё не значит «плагин работает» — проверять надо
 * именно ожидание.
 */
export const awaitCadesPluginReady = async (
  timeoutMs = READY_TIMEOUT_MS,
): Promise<void> => {
  const api = cadesWindow().cadesplugin;
  if (!api) {
    throw new Error("cadesplugin не объявлен: cadesplugin_api.js не подключён.");
  }

  const thenable = api as { then?: unknown; catch?: unknown };
  if (typeof thenable.then !== "function") return;

  const ready = Promise.resolve(api);
  // Гасим поздний reject самого плагина (его таймер 20 с), иначе браузер
  // покажет необработанный отказ уже после нашего сообщения об ошибке
  ready.catch(() => undefined);

  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () =>
        reject(
          new Error(
            `Плагин не ответил за ${Math.round(timeoutMs / 1000)} с. Проверьте, что расширение «Extension for CAdES Browser Plugin» включено и браузер перезапущен после установки плагина.`,
          ),
        ),
      timeoutMs,
    );
  });

  try {
    await Promise.race([ready, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
};
