import { useEffect, useMemo, useState } from "react";
import {
  useEdsCertificates,
  type EdsCertificate,
} from "../../services/Eds/eds.api";
import {
  certificateStateOn,
  edsCertificateSourceLabels,
  edsCertificateStateLabels,
  formatCertificateLabel,
  formatCertificatePeriod,
  mergeCertificateLists,
  signatureEventActionLabels,
  type SignatureEventAction,
  type SignatureEvent,
} from "../../services/Eds/eds.schema";
import {
  describeCryptoPro,
  readPluginCertificates,
} from "../../services/Eds/cryptoPro";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import useUtils from "../../hooks/useUtils";
import styles from "./EdsSignModal.module.scss";

// Дата для оценки состояния сертификата берётся один раз при загрузке
// модуля: пересчитывать её на каждом рендере не нужно, а стабильное
// значение не даёт пометке «истекает» меняться между отрисовками
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Модалка подписания документа ЭП заказчика (Tasks 9, п. 1).
 *
 * Список сертификатов складывается из двух источников: то, что прямо сейчас
 * читает крипто-плагин на рабочем месте заказчика, и то, что зарегистрировано
 * за организацией в системе. Плагин важнее — он показывает живое состояние
 * контейнера, но без него интерфейс остаётся рабочим: атрибуты внесены
 * вручную и помечены источником.
 *
 * Ключевая проверка — ИНН из subject сертификата против ИНН организации.
 * Квалифицированная ЭП выдана конкретному лицу и конкретной организации,
 * поэтому сертификат другого заказчика подписать документ этого заказчика
 * не может (ст. 10 63-ФЗ о тайне ключа, п. 6 типовых условий ПП РФ N 1466
 * об ответственности за недостоверные сведения). Отказ тоже идёт в журнал:
 * при проверке видно, что кто-то пытался расписаться не своим ключом.
 *
 * Сама подпись (CPSignEx) — следующий шаг; здесь фиксируется, КЕМ подписано.
 */

interface EdsSignModalProps {
  action: SignatureEventAction;
  documentLabel: string;
  entityType: SignatureEvent["entityType"];
  entityId: string | number;
  onClose: () => void;
  onSigned: (event: SignatureEvent) => void;
}

// Локальное время для журнала: момент подписания важен до минут — по нему
// сверяются с логином пользователя и с часами ЕИС
const nowLocalDateTime = (): string => {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function EdsSignModal({
  action,
  documentLabel,
  entityType,
  entityId,
  onClose,
  onSigned,
}: EdsSignModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "eds-sign");

  const { data: organization } = useCurrentOrganization();
  const { data: registeredCerts = [] } = useEdsCertificates(organization?.id);

  const cpStatus = useMemo(() => describeCryptoPro(), []);

  const [pluginCerts, setPluginCerts] = useState<EdsCertificate[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!organization?.id) return;

    let cancelled = false;
    readPluginCertificates(organization.id).then((list) => {
      if (!cancelled) setPluginCerts(list);
    });

    return () => {
      cancelled = true;
    };
  }, [organization?.id]);

  // Живые сертификаты плагина первыми; зарегистрированный дубль (тот же
  // серийник) не дублируем — иначе заказчик выбирает между двумя строками
  // одного сертификата
  const availableCerts = useMemo(
    () => mergeCertificateLists(pluginCerts, registeredCerts),
    [pluginCerts, registeredCerts],
  );

  const certKeyOf = (certificate: EdsCertificate, index: number): string =>
    String(certificate.serialNumber || certificate.id || index);

  const selectedCert =
    availableCerts.find(
      (certificate, index) => certKeyOf(certificate, index) === selectedKey,
    ) ?? null;

  const innMatches = Boolean(
    selectedCert?.inn &&
    organization?.inn &&
    selectedCert.inn === organization.inn,
  );

  function submit() {
    if (!selectedCert) return;

    onSigned({
      organizationId: organization?.id ?? "",
      action,
      entityType,
      entityId,
      documentLabel,
      certificateId: selectedCert.id,
      certificateOwner: selectedCert.ownerName,
      certificateInn: selectedCert.inn,
      certificateSerial: selectedCert.serialNumber,
      certificateFingerprint: selectedCert.fingerprint,
      certificateAlgorithm: selectedCert.signatureAlgorithm,
      certificateValidTo: selectedCert.validTo,
      innMatched: innMatches,
      certificateSource: selectedCert.source,
      result: innMatches ? "signed" : "rejected_certificate",
      comment,
      createdAt: nowLocalDateTime(),
    });
  }

  return (
    <div className={block()} onClick={onClose}>
      <div
        className={block("window")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={block("head")}>
          <h3 className={block("title")}>Подписание ЭП заказчика</h3>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className={block("context")}>
          <span className={block("context-action")}>
            {signatureEventActionLabels[action]}
          </span>
          <span className={block("context-doc")}>{documentLabel}</span>
        </div>

        <div
          className={
            cpStatus.installed ? block("plugin-ok") : block("plugin-warn")
          }
        >
          {cpStatus.hint}
        </div>

        <div className={block("form")}>
          <fieldset className={block("fieldset")}>
            <legend>Чем подписываем</legend>

            {availableCerts.length === 0 ? (
              <div className={block("empty")}>
                Доступных сертификатов нет. {cpStatus.hint}
              </div>
            ) : (
              <div className={block("cert-list")}>
                {availableCerts.map((certificate, index) => {
                  const state = certificateStateOn(certificate, TODAY);
                  const key = certKeyOf(certificate, index);

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
                        checked={selectedKey === key}
                        onChange={() => setSelectedKey(key)}
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
                        {certificate.ownerPosition && (
                          <span className={block("cert-meta")}>
                            {certificate.ownerPosition}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          {selectedCert && (
            <fieldset className={block("fieldset")}>
              <legend>Сверка с заказчиком</legend>
              <div className={block("check-row")}>
                <span>
                  ИНН сертификата: <strong>{selectedCert.inn || "—"}</strong>
                </span>
                <span>
                  ИНН заказчика:{" "}
                  <strong>{organization?.inn || "не определён"}</strong>
                </span>
                <span
                  className={
                    innMatches ? block("check-ok") : block("check-fail")
                  }
                >
                  {innMatches ? "✓ Совпадает" : "✗ Не совпадает"}
                </span>
              </div>
              {!innMatches && (
                <div className={block("error")}>
                  Сертификат выдан другой организации — подписать документы «
                  {organization?.shortName ?? "этого заказчика"}» им нельзя.
                  Попытку всё равно можно зафиксировать в журнале.
                </div>
              )}
            </fieldset>
          )}

          <fieldset className={block("fieldset")}>
            <legend>Комментарий</legend>
            <textarea
              className={block("comment")}
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Например: сведения по договору № 5 сверены с реестром МСП"
            />
          </fieldset>

          <div className={block("footer")}>
            <button type="button" className={block("btn")} onClick={onClose}>
              Отмена
            </button>
            <button
              type="button"
              className={block("btn", ["primary"])}
              onClick={submit}
              disabled={!selectedCert}
            >
              {innMatches
                ? "Подписать и записать в журнал"
                : "Записать отказ в журнал"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
