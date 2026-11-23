import { useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  describeEisError,
  sha256Hex,
  useAttachEisSignature,
  useRefreshEisPackage,
  useReviseEisPackage,
  useSendEisPackage,
  useStartEisSigning,
} from "../../services/Eis/eisPackages.api";
import {
  eisDocumentTypeLabels,
  eisPackageStatusLabels,
  eisPackageStatusTones,
  isStatusPending,
  type EisPackage,
} from "../../services/Eis/eisPackages.schema";
import {
  readStoreCertificates,
  signText,
  verifyTextSignature,
  type PluginCertificateInfo,
} from "../../services/Eds/pluginSign";
import {
  EMBEDDED_BROWSER_HINT,
  isEmbeddedBrowser,
} from "../../services/Eds/edsEnvironment";
import {
  eisNoticeReadinessSummary,
  isEisPackageOfNotice,
} from "../../services/Eis/eisNoticeReadiness";
import styles from "./EisPackageCard.module.scss";
import Select from "../UI/Select";

/**
 * Карточка пакета ЕИС: где он сейчас, что с ним можно сделать и что ответила
 * ЕИС.
 *
 * Действия не «включены/выключены на глаз», а соответствуют статусу: шлюз всё
 * равно откажет в недопустимом переходе (409), но показывать кнопку, которая
 * заведомо не сработает, — плохой интерфейс. Цвет статуса тоже не украшение:
 * «отправлен» и «принят» различаются юридически.
 */

interface EisPackageCardProps {
  item: EisPackage;
}

const formatMoment = (iso: string | null): string => {
  if (!iso) return "—";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const certKeyOf = (certificate: PluginCertificateInfo, index: number): string =>
  certificate.fingerprint || certificate.serialNumber || `cert-${index}`;

/** Размер файла для человека: байты в мегабайтах читаются плохо. */
const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
    : bytes >= 1024
      ? `${Math.round(bytes / 1024)} КБ`
      : `${bytes} Б`;

const describeCertificate = (certificate: PluginCertificateInfo): string => {
  const owner = certificate.subject || "Владелец не определён";
  const inn = certificate.inn ? ` · ИНН ${certificate.inn}` : "";
  const validTo = certificate.validTo ? ` · до ${certificate.validTo}` : "";

  return `${owner}${inn}${validTo}`;
};

export default function EisPackageCard({ item }: EisPackageCardProps) {
  const { bem } = useUtils();
  const block = bem(styles, "eis-package");

  const startSigning = useStartEisSigning();
  const attachSignature = useAttachEisSignature();
  const sendPackage = useSendEisPackage();
  const refreshPackage = useRefreshEisPackage();
  const revisePackage = useReviseEisPackage();

  const [certificates, setCertificates] = useState<
    PluginCertificateInfo[] | null
  >(null);
  const [certKey, setCertKey] = useState("");
  const [busy, setBusy] = useState<"sign" | "send" | "refresh" | "revise" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [pluginVerdict, setPluginVerdict] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  const tone = eisPackageStatusTones[item.status];
  const canSign = item.status === "Draft" || item.status === "Signing";
  const canSend = item.status === "Signed" || item.status === "SendFailed";
  const canRefresh = isStatusPending(item.status);
  const canRevise =
    item.status === "RejectedByFlk" || item.status === "SendFailed";
  // Встроенный браузер приложения — не «сломанный плагин», а среда, где его
  // не может быть. Проверяем один раз за рендер: UA за сессию не меняется
  const embeddedBrowser = isEmbeddedBrowser();

  const selectedCertificate =
    certificates?.find(
      (certificate, index) => certKeyOf(certificate, index) === certKey,
    ) ?? null;

  /** Сертификаты читаются по нажатию, а не при открытии страницы: на машине
   * без плагина это ожидание никому не нужно. */
  async function loadCertificates() {
    setError("");
    setBusy("sign");

    try {
      const result = await readStoreCertificates();
      const usable = result.certificates.filter((cert) => cert.hasPrivateKey);

      setCertificates(usable);

      if (result.error) {
        setError(result.error);
      } else if (usable.length === 0) {
        setError(
          "В хранилище «Мой» нет сертификатов с закрытым ключом — подписывать нечем. " +
            "Проверьте токен на странице «Проверка ЭП».",
        );
      } else {
        setCertKey(certKeyOf(usable[0], 0));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  /**
   * Подписать и сразу приложить подпись.
   *
   * Порядок важен: сначала шлюз отдаёт содержимое, потом его подписывает
   * плагин, потом шлюз сверяет хеш подписанного со своим. Хеш считается здесь,
   * по тем байтам, которые реально ушли в плагин, — иначе проверка на сервере
   * ничего не значит.
   */
  async function sign() {
    if (!selectedCertificate) return;

    setBusy("sign");
    setError("");
    setPluginVerdict(null);

    try {
      const task = await startSigning.mutateAsync(item.id);
      const signature = await signText(selectedCertificate, task.payloadXml);

      if (signature.bytes === 0) {
        throw new Error(
          "Плагин вернул пустую подпись: вероятно, нет доступа к контейнеру закрытого ключа.",
        );
      }

      const verdict = await verifyTextSignature(
        task.payloadXml,
        signature.value,
      );
      setPluginVerdict(verdict);

      // Непроверенную подпись не отправляем: лучше остановиться здесь, чем
      // получить отказ ФЛК и разбираться, чья это была подпись
      if (!verdict.valid) {
        throw new Error(
          `Подпись не сходится с документом, отправлять её нельзя: ${verdict.message}`,
        );
      }

      await attachSignature.mutateAsync({
        id: item.id,
        signatureBase64: signature.value,
        signerThumbprint:
          selectedCertificate.fingerprint ||
          selectedCertificate.serialNumber ||
          "",
        signedContentSha256: await sha256Hex(task.payloadXml),
      });
    } catch (caught) {
      setError(describeEisError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function run(
    kind: "send" | "refresh" | "revise",
    action: typeof sendPackage,
  ) {
    setBusy(kind);
    setError("");

    try {
      await action.mutateAsync(item.id);
    } catch (caught) {
      setError(describeEisError(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={block()}>
      <header className={block("head")}>
        <div className={block("head-main")}>
          <h3 className={block("title")}>
            {eisDocumentTypeLabels[item.documentType]} · контракт{" "}
            {item.contractEisNumber}
          </h3>
          <div className={block("meta")}>
            ИКЗ {item.ikz || "не указан"} · создан{" "}
            {formatMoment(item.createdAt)} · формат {item.payloadSchemaVersion}
          </div>
        </div>

        <span className={block("status", [tone])}>
          {eisPackageStatusLabels[item.status]}
        </span>
      </header>

      {item.isPlaceholderFormat ? (
        <div className={block("notice")}>
          Документ собран черновой заглушкой, а не по XSD из Альбома форматов
          ЕИС. Пакет нельзя считать файлом обмена: настоящая ФЛК его отклонит.
          Подпись, статусы и журнал при этом работают по-настоящему.
        </div>
      ) : (
        <div className={block("signed")}>
          Документ собран по XSD ЕИС {item.payloadSchemaVersion} из данных
          системы — это файл обмена, а не заготовка.
        </div>
      )}

      {item.lastError && item.status === "SendFailed" && (
        <div className={block("error")}>
          До ЕИС не дошли: {item.lastError}
        </div>
      )}

      {item.validationErrors.length > 0 && (
        <div className={block("flk")}>
          <div className={block("flk-title")}>
            Шлюз не принял документ — исправьте данные и создайте пакет заново:
          </div>
          <ul className={block("flk-list")}>
            {item.validationErrors.map((issue) => (
              <li
                key={`${issue.code}-${issue.field ?? ""}`}
                className={block("flk-row")}
              >
                <span className={block("flk-code")}>{issue.code}</span>
                <span className={block("flk-text")}>
                  {issue.message}
                  {issue.hint ? ` ${issue.hint}` : ""}
                </span>
                {issue.field && (
                  <span className={block("flk-field")}>поле: {issue.field}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.attachments.length > 0 && (
        <details className={block("details")} open>
          <summary className={block("summary")}>
            Вложения · {item.attachments.length}
          </summary>
          <ul className={block("history")}>
            {item.attachments.map((file, index) => (
              <li
                key={`${file.fileName}-${index}`}
                className={block("history-row")}
              >
                <span className={block("history-text")}>
                  {file.fileName}
                  {file.description ? ` — ${file.description}` : ""}
                  {file.docKindCode ? ` · вид ${file.docKindCode}` : ""}
                  {file.fileSize ? ` · ${formatBytes(file.fileSize)}` : ""}
                  {file.fileFingerPrint
                    ? ` · отпечаток ${file.fileFingerPrint.slice(0, 16)}…`
                    : " · без отпечатка"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {item.attachmentReadiness && (
        <div
          className={block(
            !item.attachmentReadiness.ok
              ? "error"
              : item.attachmentReadiness.warnings.length > 0
                ? "notice"
                : "signed",
          )}
        >
          Проверка Раздела 2 извещения{" "}
          {formatMoment(item.attachmentReadiness.checkedAt)} ·{" "}
          {eisNoticeReadinessSummary(item.attachmentReadiness)}
          {item.attachmentReadiness.noticeNumber
            ? ` · извещение № ${item.attachmentReadiness.noticeNumber}`
            : ""}
          {/* Снимок и пакет сверяются по ИКЗ: если пакет собран из одного
              извещения, а проверка — другого, это надо сказать, а не скрыть */}
          {!isEisPackageOfNotice(item, item.attachmentReadiness) && (
            <div>
              Снимок сделан по ИКЗ{" "}
              {item.attachmentReadiness.ikz || "который не указан"} — сверьте,
              что пакет собран из того же извещения, что и проверка.
            </div>
          )}
          {item.attachmentReadiness.blocking.map((issue) => (
            <div key={issue.message}>{issue.message}</div>
          ))}
          {item.attachmentReadiness.warnings.length > 0 && (
            <div>
              {item.attachmentReadiness.warnings
                .map((issue) => issue.message)
                .join(" ")}
            </div>
          )}
        </div>
      )}

      {item.flkErrors.length > 0 && (
        <div className={block("flk")}>
          <div className={block("flk-title")}>
            ЕИС отклонила пакет — исправьте и отправьте заново:
          </div>
          <ul className={block("flk-list")}>
            {item.flkErrors.map((flk) => (
              <li key={`${flk.code}-${flk.field ?? ""}`} className={block("flk-row")}>
                <span className={block("flk-code")}>{flk.code}</span>
                <span className={block("flk-text")}>
                  {flk.message}
                  {flk.hint ? ` ${flk.hint}` : ""}
                </span>
                {flk.field && (
                  <span className={block("flk-field")}>поле: {flk.field}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.signatureBase64 && (
        <div className={block("signed")}>
          Подпись: отпечаток {item.signerThumbprint || "не указан"} ·{" "}
          {formatMoment(item.signedAt)}
          {pluginVerdict?.valid && " · плагин проверил совпадение с документом"}
        </div>
      )}

      {item.eisGuid && (
        <div className={block("signed")}>Идентификатор в ЕИС: {item.eisGuid}</div>
      )}

      {item.regNumberExecution && (
        <div className={block("signed")}>
          Реестровый номер сведений об исполнении в ЕИС: {item.regNumberExecution}
        </div>
      )}

      {canSign && (
        <div className={block("sign-block")}>
          {embeddedBrowser ? (
            <span className={block("sign-unavailable")}>
              {EMBEDDED_BROWSER_HINT}
            </span>
          ) : certificates === null ? (
            <button
              type="button"
              className={block("btn", ["primary"])}
              onClick={loadCertificates}
              disabled={busy !== null}
            >
              {busy === "sign" ? "Ищу сертификаты…" : "Подписать"}
            </button>
          ) : (
            <>
              <label className={block("field")}>
                <span className={block("label")}>Сертификат подписанта</span>
                <Select
                  className={block("select")}
                  value={certKey}
                  onChange={(event) => setCertKey(event.target.value)}
                >
                  {certificates.map((certificate, index) => {
                    const key = certKeyOf(certificate, index);

                    return (
                      <option key={key} value={key}>
                        {describeCertificate(certificate)}
                      </option>
                    );
                  })}
                </Select>
              </label>

              <button
                type="button"
                className={block("btn", ["primary"])}
                onClick={sign}
                disabled={busy !== null || !selectedCertificate}
              >
                {busy === "sign" ? "Подписываю…" : "Подписать документ"}
              </button>
            </>
          )}
        </div>
      )}

      <div className={block("actions")}>
        {canSend && (
          <button
            type="button"
            className={block("btn", ["primary"])}
            onClick={() => run("send", sendPackage)}
            disabled={busy !== null}
          >
            {busy === "send"
              ? "Отправляю…"
              : item.status === "SendFailed"
                ? "Повторить отправку"
                : "Отправить в ЕИС"}
          </button>
        )}

        {canRefresh && (
          <button
            type="button"
            className={block("btn")}
            onClick={() => run("refresh", refreshPackage)}
            disabled={busy !== null}
          >
            {busy === "refresh" ? "Спрашиваю ЕИС…" : "Проверить результат"}
          </button>
        )}

        {canRevise && (
          <button
            type="button"
            className={block("btn")}
            onClick={() => run("revise", revisePackage)}
            disabled={busy !== null}
          >
            {busy === "revise" ? "Возвращаю…" : "Вернуть в работу"}
          </button>
        )}

        {item.status === "AcceptedInLk" && (
          <span className={block("done")}>
            Пакет принят ЕИС. Отправлять больше нечего.
          </span>
        )}
      </div>

      {error && <div className={block("error")}>{error}</div>}

      {pluginVerdict && !pluginVerdict.valid && (
        <div className={block("error")}>{pluginVerdict.message}</div>
      )}

      <details className={block("details")}>
        <summary className={block("summary")}>
          Документ, который подписывается · SHA-256{" "}
          {item.payloadSha256.slice(0, 16)}…
        </summary>
        <pre className={block("doc")}>{item.payloadXml}</pre>
      </details>

      <details className={block("details")}>
        <summary className={block("summary")}>
          Журнал пакета · {item.history.length}{" "}
          {item.history.length === 1 ? "запись" : "записей"}
        </summary>
        <ul className={block("history")}>
          {item.history.map((event, index) => (
            <li key={`${event.at}-${index}`} className={block("history-row")}>
              <span className={block("history-time")}>
                {formatMoment(event.at)}
              </span>
              <span className={block("history-text")}>
                {event.comment}
                {event.from !== event.to && (
                  <span className={block("history-move")}>
                    {" "}
                    ({eisPackageStatusLabels[event.from]} →{" "}
                    {eisPackageStatusLabels[event.to]})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
