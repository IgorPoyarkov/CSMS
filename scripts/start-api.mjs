import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Поднимает csms-api вместе с фронтом из `npm run start`.
 *
 * Без EIS_STORE=postgres API упадёт в in-memory режим и отдаст пустой снимок
 * ОКПД2, поэтому значение по умолчанию выставляем здесь. Всё, что задал
 * пользователь в окружении, остаётся приоритетнее (можно перекрыть URL, среду
 * или вообще отключить агента НПА через Npa__Enabled=false).
 */
const project = fileURLToPath(
  new URL("../../csms-api/src/Csms.Api/Csms.Api.csproj", import.meta.url),
);

const env = {
  ...process.env,
  EIS_STORE: process.env.EIS_STORE ?? "postgres",
  ASPNETCORE_ENVIRONMENT: process.env.ASPNETCORE_ENVIRONMENT ?? "Development",
  ASPNETCORE_URLS: process.env.ASPNETCORE_URLS ?? "http://localhost:5099",
};

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
