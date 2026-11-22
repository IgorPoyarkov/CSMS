import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Поднимает csms-api вместе с фронтом из `npm run start`.
 *
 * Без EIS_STORE=postgres API упадёт в in-memory режим и отдаст пустой снимок
 * ОКПД2, поэтому значение по умолчанию выставляем здесь. Всё, что задал
 * пользователь в окружении, остаётся приоритетнее (можно перекрыть URL, среду
 * или включить фоновых агентов обратно).
 *
 * Офлайн-старт (решение 2026-11-22): по умолчанию выключаем фоновые агенты,
 * которые сами ходят в ЕИС/на портал публикации НПА. Готовые снимки из
 * PostgreSQL и ручные эндпоинты обновления продолжают работать; сетевой обмен
 * включается явной переменной окружения, когда спрос окупит сервер и лицензии.
 */
const project = fileURLToPath(
  new URL("../../csms-api/src/Csms.Api/Csms.Api.csproj", import.meta.url),
);

/** Значения по умолчанию для офлайн-старта на открытых данных. */
const defaults = {
  EIS_STORE: "postgres",
  ASPNETCORE_ENVIRONMENT: "Development",
  ASPNETCORE_URLS: "http://localhost:5099",
  /** Агент разметки НПА: правила берём из уже опубликованных версий. */
  Npa__Enabled: "false",
  /** Автообновление XSD Альбома: схемы 17.0 уже лежат в репозитории. */
  EisSchemas__Update__Enabled: "false",
  /** Проверка контрагентов по выгрузке ст. 19.28 КоАП — только вручную. */
  EisCounterparties__Update__Enabled: "false",
  /**
   * Альтернативная интеграция ЕИС через ЛК (логин/пароль): выключена до
   * получения учётных данных, WSDL и тестового контура. См.
   * docs/tasks/eis-alternative-integration.md.
   */
  EisGateway__Enabled: "false",
  EisGateway__Transport: "mock",
};

const env = { ...process.env };
for (const [key, value] of Object.entries(defaults)) {
  if (env[key] === undefined) {
    env[key] = value;
  }
}

const child = spawn("dotnet", ["run", "--project", project, "--no-launch-profile"], {
  env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error("Не удалось запустить csms-api:", error.message);
  process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));
