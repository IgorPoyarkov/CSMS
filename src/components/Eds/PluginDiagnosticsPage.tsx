import { useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  PLUGIN_ABSENT_HINT,
  PLUGIN_SECURE_CONTEXT_HINT,
  detectPluginEnv,
  makeSignCheckText,
  probePluginGlobals,
  readStoreCertificates,
  signText,
  type PluginCertificateInfo,
  type PluginEnv,
  type PluginProbe,
} from "../../services/Eds/pluginSign";
import styles from "./PluginDiagnosticsPage.module.scss";

/**
 * Диагностика ЭП на рабочем месте заказчика.
 *
 * Зачем отдельный экран: «сертификат не подхватился» — самая частая причина,
 * на которой встаёт пилот, и у неё три разных виновника (нет плагина, плагин
 * есть, но без расширения, токен не виден КриптоПро CSP). Экран показывает по
 * отдельности: канал связи с плагином, хранилище «Мой» и пробную подпись.
 *
 * Здесь ничего не отправляется ни на сервер, ни в ЕИС: читаются атрибуты
 * сертификата и ставится подпись под тестовой строкой. Ключ из токена не
 * извлекается — это и есть проверка того, что подпись вообще возможна.
 *
 * Запросы идут по кнопке, а не в `useEffect`: результат нужен по действию
 * человека, и состояние не пересчитывается на каждый рендер.
 */

interface SignState {
  status: "ok" | "error";
  message: string;
  bytes?: number;
}

const TODAY = new Date().toISOString().slice(0, 10);

const toRuDate = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso || "—";
  return `${match[3]}.${match[2]}.${match[1]}`;
};

/** Состояние сертификата по сроку: подсветка «просрочен / истекает». */
const certificateTone = (validTo: string): "ok" | "warn" | "bad" => {
  if (!validTo) return "ok";
  if (validTo < TODAY) return "bad";

  const warn = new Date(`${TODAY}T00:00:00`);
  warn.setDate(warn.getDate() + 60);
  if (validTo <= warn.toISOString().slice(0, 10)) return "warn";

  return "ok";
};

const certificateKey = (
  certificate: PluginCertificateInfo,
  index: number,
): string =>
  certificate.fingerprint || certificate.serialNumber || `cert-${index}`;

export default function PluginDiagnosticsPage() {
  const { bem } = useUtils();
  const block = bem(styles, "eds-check");

  const [checking, setChecking] = useState(false);
  const [env, setEnv] = useState<PluginEnv | null>(null);
  const [probe, setProbe] = useState<PluginProbe[]>([]);
  const [certificates, setCertificates] = useState<PluginCertificateInfo[]>([]);
  const [error, setError] = useState("");
  const [signingKey, setSigningKey] = useState("");
  const [signStates, setSignStates] = useState<Record<string, SignState>>({});

  const secureContext =
    typeof window !== "undefined" ? window.isSecureContext : false;

  async function runCheck() {
    setChecking(true);
    setError("");
    setSignStates({});

    try {
      setProbe(probePluginGlobals());

      const detected = await detectPluginEnv();
      setEnv(detected);

      if (!detected.canReadCertificates) {
        setCertificates([]);
        return;
      }

      const result = await readStoreCertificates();
      setCertificates(result.certificates);
      setError(result.error);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setCertificates([]);
    } finally {
      setChecking(false);
    }
  }

  async function signCheck(
    certificate: PluginCertificateInfo,
    key: string,
  ) {
    setSigningKey(key);
    setSignStates((prev) => ({ ...prev, [key]: { status: "ok", message: "" } }));

    try {
      const result = await signText(certificate, makeSignCheckText());
      setSignStates((prev) => ({
        ...prev,
        [key]: {
          status: result.bytes > 0 ? "ok" : "error",
          message:
            result.bytes > 0
              ? `Подпись получена: ${result.bytes} байт, ${result.detached ? "открепленная" : "вложенная"}, ${result.algorithm}. Начало: ${result.value.slice(0, 48)}…`
              : "Плагин вернул пустую подпись — вероятно, нет доступа к контейнеру ключа.",
          bytes: result.bytes,
        },
      }));
    } catch (caught) {
      setSignStates((prev) => ({
        ...prev,
        [key]: {
          status: "error",
          message: caught instanceof Error ? caught.message : String(caught),
        },
      }));
    } finally {
      setSigningKey("");
    }
  }

  return (
    <div className={block()}>
      <h2 className={block("title")}>Проверка ЭП на этом компьютере</h2>

      <p className={block("lead")}>
        Экран показывает, видит ли браузер криптографический плагин и ваши
        сертификаты, и умеет ли подписывать. Ничего не отправляется ни на
        сервер, ни в ЕИС: ключ остаётся в токене, наружу выходит только
        подпись тестовой строки.
      </p>

      <div className={block("actions")}>
        <button
          type="button"
          className={block("btn", ["primary"])}
          onClick={runCheck}
          disabled={checking}
        >
          {checking ? "Проверяю…" : "Проверить плагин и сертификаты"}
        </button>

        <span className={block("meta")}>
          Защищённый контекст: {secureContext ? "да" : "нет"} · браузер:{" "}
          {navigator.userAgent.includes("YaBrowser")
            ? "Яндекс.Браузер"
            : navigator.userAgent.includes("Edg")
              ? "Edge"
              : navigator.userAgent.includes("Firefox")
                ? "Firefox"
                : "Chromium / Chrome"}
        </span>
      </div>

      {env && (
        <div
          className={block("card", [
            env.canSign && env.canReadCertificates ? "ok" : "bad",
          ])}
        >
          <div className={block("cardRow")}>
            <span className={block("cardLabel")}>Канал плагина</span>
            <span className={block("cardValue")}>
              {env.kind === "none" ? "не найден" : env.kind}
              {env.version ? ` · версия ${env.version}` : ""}
            </span>
          </div>
          <div className={block("cardRow")}>
            <span className={block("cardLabel")}>Чтение сертификатов</span>
            <span className={block("cardValue")}>
              {env.canReadCertificates ? "да" : "нет"}
            </span>
          </div>
          <div className={block("cardRow")}>
            <span className={block("cardLabel")}>Подпись</span>
            <span className={block("cardValue")}>
              {env.canSign ? "да" : "нет"}
            </span>
          </div>
          <p className={block("hint")}>{env.hint}</p>

          {!env.canSign && (
            <p className={block("hint", ["warn"])}>
              {env.found ? PLUGIN_SECURE_CONTEXT_HINT : PLUGIN_ABSENT_HINT}
            </p>
          )}

          {env.kind === "none" && (
            <p className={block("hint")}>
              Установленное расширение «CryptoPro Extension for CAdES Browser
              Plug-in» само объект не создаёт: ему нужна нативная часть —
              «КриптоПро ЭЦП Browser plug-in» (msi) и её служба (видна в
              <i> services.msc</i> как «КриптоПро ЭЦП Browser plug-in»). Без неё
              расширение стоит, но в страницу ничего не внедряет.
            </p>
          )}
        </div>
      )}

      {probe.length > 0 && (
        <div className={block("probe")}>
          <span className={block("probeLabel")}>Объекты плагина в окне:</span>
          {probe.map((item) => (
            <span
              key={item.name}
              className={block("probeItem", [
                item.type === "undefined" ? "missing" : "found",
              ])}
            >
              {item.name}: {item.type}
            </span>
          ))}
        </div>
      )}

      {error && <div className={block("error")}>{error}</div>}

      {env?.canReadCertificates && certificates.length === 0 && !error && (
        <div className={block("empty")}>
          В хранилище «Мой» нет сертификатов. Так бывает, если сертификат
          записан в контейнер токена, но не установлен в хранилище
          пользователя: в КриптоПро CSP откройте «Сервис → Просмотреть
          сертификаты в контейнере» и установите сертификат в хранилище
          «Личное».
        </div>
      )}

      {certificates.length > 0 && (
        <div className={block("certs")}>
          <h3 className={block("subtitle")}>
            Сертификаты в хранилище «Мой»: {certificates.length}
          </h3>

          <table className={block("table")}>
            <thead>
              <tr>
                <th>Владелец (subject)</th>
                <th>ИНН / СНИЛС</th>
                <th>Срок действия</th>
                <th>Серийник</th>
                <th>Ключ</th>
                <th>Проверка подписи</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((certificate, index) => {
                const key = certificateKey(certificate, index);
                const state = signStates[key];
                const tone = certificateTone(certificate.validTo);

                return (
                  <tr key={key}>
                    <td className={block("cellSubject")}>
                      {certificate.subject || "—"}
                    </td>
                    <td>
                      {certificate.inn || "—"}
                      {certificate.snils && (
                        <>
                          <br />
                          <span className={block("muted")}>
                            СНИЛС {certificate.snils}
                          </span>
                        </>
                      )}
                    </td>
                    <td className={block("cellDate", [tone])}>
                      {toRuDate(certificate.validFrom)} —{" "}
                      {toRuDate(certificate.validTo)}
                    </td>
                    <td className={block("cellSerial")}>
                      {certificate.serialNumber || "—"}
                    </td>
                    <td>{certificate.hasPrivateKey ? "есть" : "нет"}</td>
                    <td className={block("cellSign")}>
                      <button
                        type="button"
                        className={block("btn", ["small"])}
                        onClick={() => signCheck(certificate, key)}
                        disabled={signingKey === key}
                      >
                        {signingKey === key ? "Подписываю…" : "Подписать тест"}
                      </button>

                      {state && state.message && (
                        <span
                          className={block("signResult", [
                            state.status === "ok" ? "ok" : "bad",
                          ])}
                        >
                          {state.message}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className={block("hint")}>
            Подпись проверяется сервером с открытым ключом из сертификата — на
            стенде с json-server такой проверки нет, поэтому здесь подтверждается
            только то, что подпись <b>ставится</b>. Серийник и отпечаток
            попадают в журнал ЭП.
          </p>
        </div>
      )}

      <details className={block("details")}>
        <summary>Если сертификат не виден</summary>
        <ol className={block("steps")}>
          <li>
            КриптоПро CSP установлен, токен подключён и определяется: «Панель
            управления → КриптоПро CSP → Сервис → Просмотреть сертификаты в
            контейнере».
          </li>
          <li>
            Установлено расширение «КриптоПро ЭЦП Browser plug-in» и включено в
            браузере; после установки браузер перезапущен.
          </li>
          <li>
            Страница открыта по https или на localhost — часть версий плагина не
            работает вне защищённого контекста.
          </li>
          <li>
            Сертификат установлен в личное хранилище пользователя, а не только
            лежит в контейнере на токене.
          </li>
        </ol>
      </details>
    </div>
  );
}
