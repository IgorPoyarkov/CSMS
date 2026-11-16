import { useEffect, useMemo, useState } from "react";
import {
  useEdsLogin,
  useAllEdsCertificates,
  type EdsLoginMode,
} from "../../services/Eds/eds.api";
import {
  describeCryptoPro,
  readPluginSignHandles,
  makeLoginChallenge,
  signLoginChallenge,
  type PluginSignature,
} from "../../services/Eds/cryptoPro";
import {
  certificateStateOn,
  edsCertificateSourceLabels,
  edsCertificateStateLabels,
  formatCertificateLabel,
  formatCertificatePeriod,
  mergeCertificateLists,
  type EdsCertificate,
  type EdsCertificateState,
} from "../../services/Eds/eds.schema";
import useUtils from "../../hooks/useUtils";
import styles from "./EdsLoginForm.module.scss";

// Дата для оценки состояния сертификата берётся один раз при загрузке модуля
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Выбор сертификата для входа в систему по ЭП (Tasks 9, п. 1).
 *
 * Список сертификатов складывается из двух источников: то, что читает
 * крипто-плагин на рабочем месте, и то, что зарегистрировано в системе.
 * Если плагин есть — набирается и подписывается одноразовый наборт;
 * если плагин не подписывает — предлагается режим «без проверки подписи»,
 * в котором вход выполняется по совпадению ИНН/ФИО с записью в базе, а в
 * журнале появляется пометка «без проверки подписи».
 */

interface EdsLoginFormProps {
  // Успешный вход — навигация на главную
  onLoggedIn: () => void;
  // Закрытие без входа — возврат к форме email/пароль
  onClose: () => void;
}

export default function EdsLoginForm({
  onLoggedIn,
  onClose,
}: EdsLoginFormProps) {
  const { bem } = useUtils();
  const block = bem(styles, "eds-login");

  const { data: registeredCerts = [] } = useAllEdsCertificates();
  const cpStatus = useMemo(() => describeCryptoPro(), []);
  const { mutate: login, isPending, isError } = useEdsLogin();

  const [pluginHandles, setPluginHandles] = useState<
    Awaited<ReturnType<typeof readPluginSignHandles>>
  >([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [mode, setMode] = useState<EdsLoginMode>("plugin");
  const [signature, setSignature] = useState<PluginSignature | null>(null);
  const [loginError, setLoginError] = useState("");

  // Читаем сертификаты плагина при монтировании
  useEffect(() => {
    let cancelled = false;
    readPluginSignHandles().then((handles) => {
      if (!cancelled) setPluginHandles(handles);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Слияние: живые первыми, дубли по серийнику не повторяются
  const availableCerts = useMemo(
    () =>
      mergeCertificateLists(
        pluginHandles.map((h) => h.certificate),
        registeredCerts,
      ),
    [pluginHandles, registeredCerts],
  );

  const selectedCert =
    availableCerts.find(
      (c) => c.serialNumber === selectedKey || String(c.id) === selectedKey,
    ) ?? null;

  /**
   * Выбор сертификата. Живой сертификат плагина пробуем подписать сразу;
   * зарегистрированный подписать нечем — он сразу идёт в режим «без проверки
   * подписи», и интерфейс честно это показывает до нажатия «Войти».
   */
  function handleSelectCertificate(certificate: EdsCertificate) {
    const key = certificate.serialNumber || String(certificate.id);

    setSelectedKey(key);
    setLoginError("");
    setSignature(null);

    const handle =
      pluginHandles.find(
        (item) =>
          item.certificate.serialNumber === key ||
          String(item.certificate.id) === key,
      ) ?? null;

    if (!handle || !cpStatus.canSign) {
      setMode("registry");
      return;
    }

    setMode("plugin");
    signLoginChallenge(handle, makeLoginChallenge()).then((sig) => {
      if (sig) {
        setSignature(sig);
      } else {
        // Плагин не подписал наборт: вход остаётся возможным, но без
        // подтверждения владения ключом — режим помечается в журнале
        setMode("registry");
      }
    });
  }

  const stateOf = (cert: EdsCertificate): EdsCertificateState =>
    certificateStateOn(cert, TODAY);

  function handleLogin() {
    if (!selectedCert) return;

    setLoginError("");
    login(
      {
        certificate: selectedCert,
        mode,
        signature: mode === "plugin" ? signature : null,
      },
      {
        onSuccess: ({ resolution }) => {
          if (resolution.ok) {
            onLoggedIn();
          } else {
            setLoginError(resolution.message);
          }
        },
        onError: (err) => {
          setLoginError(String(err));
        },
      },
    );
  }

  // ─── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div className={block()} onClick={onClose}>
      <div
        className={block("window")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={block("head")}>
          <h3 className={block("title")}>Вход по ЭЦП</h3>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div
          className={
            cpStatus.installed ? block("plugin-ok") : block("plugin-warn")
          }
        >
          {cpStatus.hint}
          {cpStatus.installed && !cpStatus.canSign && (
            <span className={block("warn-text")}>
              {" "}
              Плагин обнаружен, но не может подписать наборт.
            </span>
          )}
        </div>

        <div className={block("form")}>
          <fieldset className={block("fieldset")}>
            <legend>Выберите сертификат</legend>

            {availableCerts.length === 0 ? (
              <div className={block("empty")}>
                Сертификатов не найдено. {cpStatus.hint}
              </div>
            ) : (
              <div className={block("cert-list")}>
                {availableCerts.map((certificate) => {
                  const state = stateOf(certificate);
                  const key =
                    certificate.serialNumber || String(certificate.id);

                  return (
                    <label
                      key={key}
                      className={
                        block("cert-option") +
                        (state === "expired" || state === "revoked"
                          ? ` ${block("cert-option", ["danger"])}`
                          : state === "expiring"
                            ? ` ${block("cert-option", ["warn"])}`
                            : "")
                      }
                    >
                      <input
                        type="radio"
                        name="eds-certificate"
                        value={key}
                        checked={selectedKey === key}
                        onChange={() => handleSelectCertificate(certificate)}
                      />
                      <span className={block("cert-label")}>
                        <span className={block("cert-name")}>
                          {formatCertificateLabel(certificate)}
                          {certificate.isProxy ? " · по МЧД" : ""}
                        </span>
                        <span className={block("cert-meta")}>
                          {edsCertificateStateLabels[state]} ·{" "}
                          {formatCertificatePeriod(certificate)} · ИНН{" "}
                          {certificate.inn || "не указан"} ·{" "}
                          {edsCertificateSourceLabels[certificate.source]}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          {selectedCert && (
            <fieldset className={block("fieldset")}>
              <legend>Проверка подписи</legend>
              {mode === "plugin" && signature ? (
                <div className={block("sign-ok")}>
                  ✅ Набор подписан плагином ({signature.algorithm})
                </div>
              ) : mode === "plugin" && signature === null ? (
                <div className={block("sign-pending")}>Подписание набора…</div>
              ) : (
                <div className={block("sign-demo")}>
                  ⚠️ Вход без проверки подписи: наборт не подписан крипто-
                  плагином. В журнале появится пометка «без проверки подписи».
                </div>
              )}
            </fieldset>
          )}

          <div className={block("footer")}>
            <button type="button" className={block("btn")} onClick={onClose}>
              Отмена
            </button>
            <button
              type="button"
              className={block("btn", ["primary"])}
              onClick={handleLogin}
              disabled={!selectedCert || isPending}
            >
              {isPending ? "Входим…" : "Войти по ЭЦП"}
            </button>
          </div>

          {isError && (
            <div className={block("error")}>{loginError || "Ошибка входа"}</div>
          )}
        </div>
      </div>
    </div>
  );
}
