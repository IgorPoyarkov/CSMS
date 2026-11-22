import { useEffect, useMemo, useState } from "react";
import { useEdsLogin, useAllEdsCertificates } from "../../services/Eds/eds.api";
import {
  describeCryptoPro,
  storeCertificateToEds,
} from "../../services/Eds/cryptoPro";
import {
  readStoreCertificates,
  signText,
  type PluginCertificateInfo,
} from "../../services/Eds/pluginSign";
import {
  certificateIdentityKey,
  certificateStateOn,
  edsCertificateSourceLabels,
  edsCertificateStateLabels,
  formatCertificateLabel,
  formatCertificatePeriod,
  mergeCertificateLists,
  type EdsCertificateState,
} from "../../services/Eds/eds.schema";
import useUtils from "../../hooks/useUtils";
import styles from "./EdsLoginForm.module.scss";

// Дата для оценки состояния сертификата берётся один раз при загрузке модуля
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Выбор сертификата для входа в систему по ЭП (Tasks 9, п. 1).
 *
 * Сертификаты читаются из хранилища «Мой» плагином КриптоПро. При нажатии
 * «Войти» сервер выдаёт одноразовый наборт, браузер подписывает его закрытым
 * ключом, а сервер проверяет подпись и выдаёт обычную сессию с профилем прав.
 * Вход по записи реестра без подписи больше не принимается: он не подтверждает
 * владение ключом и не даёт права на сессию.
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

  const [storeCerts, setStoreCerts] = useState<PluginCertificateInfo[]>([]);
  const [storeError, setStoreError] = useState("");
  const [readingCerts, setReadingCerts] = useState(true);
  const [selectedKey, setSelectedKey] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [loginError, setLoginError] = useState("");

  // Читаем хранилище «Мой»: только эти сертификаты несут закрытый ключ
  useEffect(() => {
    let cancelled = false;

    readStoreCertificates()
      .then((result) => {
        if (cancelled) return;
        setStoreCerts(result.certificates.filter((item) => item.hasPrivateKey));
        setStoreError(result.error);
      })
      .catch((error) => {
        if (!cancelled) {
          setStoreError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setReadingCerts(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signableCerts = useMemo(
    () => storeCerts.map((info) => storeCertificateToEds(info)),
    [storeCerts],
  );

  // Слияние: живые сертификаты первыми, дубли по серийнику не повторяются
  const availableCerts = useMemo(
    () => mergeCertificateLists(signableCerts, registeredCerts),
    [signableCerts, registeredCerts],
  );

  const selectedCert =
    availableCerts.find(
      (certificate) => certificateIdentityKey(certificate) === selectedKey,
    ) ?? null;

  // Подписывать можно только сертификатом с закрытым ключом из хранилища
  const signableCert =
    storeCerts.find(
      (_, index) => certificateIdentityKey(signableCerts[index]) === selectedKey,
    ) ?? null;

  const stateOf = (cert: (typeof signableCerts)[number]): EdsCertificateState =>
    certificateStateOn(cert, TODAY);

  function handleSelectCertificate(key: string) {
    setSelectedKey(key);
    setLoginError("");
  }

  function handleLogin() {
    if (!selectedCert || !signableCert) return;

    setLoginError("");
    login(
      {
        certificate: selectedCert,
        employeeNumber,
        sign: async (nonce) => {
          const signature = await signText(signableCert, nonce);
          return signature.value;
        },
      },
      {
        onSuccess: () => onLoggedIn(),
        onError: (error) => {
          setLoginError(
            error instanceof Error ? error.message : String(error),
          );
        },
      },
    );
  }

  // ─── рендер ───────────────────────────────────────────────────────────────

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
          {storeError && (
            <span className={block("warn-text")}> {storeError}</span>
          )}
        </div>

        <div className={block("form")}>
          <fieldset className={block("fieldset")}>
            <legend>Выберите сертификат</legend>

            {readingCerts ? (
              <div className={block("empty")}>Читаем сертификаты…</div>
            ) : availableCerts.length === 0 ? (
              <div className={block("empty")}>
                Сертификатов с закрытым ключом не найдено. {cpStatus.hint}
              </div>
            ) : (
              <div className={block("cert-list")}>
                {availableCerts.map((certificate) => {
                  const state = stateOf(certificate);
                  const key = certificateIdentityKey(certificate);

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
                        onChange={() => handleSelectCertificate(key)}
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

          <fieldset className={block("fieldset")}>
            <legend>Однофамильцы (необязательно)</legend>
            <div className={block("number-field")}>
              <label
                className={block("number-label")}
                htmlFor="eds-employee-number"
              >
                Табельный номер
              </label>
              <input
                id="eds-employee-number"
                className={block("number-input")}
                value={employeeNumber}
                onChange={(event) => {
                  setEmployeeNumber(event.target.value);
                  setLoginError("");
                }}
                placeholder="Например, 006"
                autoComplete="off"
              />
              <div className={block("number-hint")}>
                Если в штатном расписании несколько сотрудников с таким ФИО,
                укажите ваш табельный номер — иначе вход будет отклонён как
                неоднозначный.
              </div>
            </div>
          </fieldset>

          {selectedCert && (
            <fieldset className={block("fieldset")}>
              <legend>Проверка подписи</legend>
              {signableCert ? (
                <div className={block("sign-ok")}>
                  ✅ Закрытый ключ доступен. При входе сервер выдаст наборт,
                  браузер подпишет его, а сервер проверит подпись.
                </div>
              ) : (
                <div className={block("sign-demo")}>
                  ⚠️ У выбранного сертификата нет закрытого ключа в хранилище
                  «Мой» — вход по нему невозможен. Выберите сертификат с
                  закрытым ключом.
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
              disabled={!signableCert || isPending}
            >
              {isPending ? "Входим…" : "Войти по ЭЦП"}
            </button>
          </div>

          {isError && (
            <div className={block("error")}>
              {loginError || "Ошибка входа по ЭЦП"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
