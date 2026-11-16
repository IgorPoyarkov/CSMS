import { useMemo, useState } from "react";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  useEdsCertificates,
  useSignatureEvents,
} from "../../services/Eds/eds.api";
import {
  certificateStateOn,
  edsCertificateSourceLabels,
  edsCertificateStateLabels,
  formatCertificatePeriod,
  signatureEventActionLabels,
  signatureEventEntityTypeLabels,
  signatureEventResultLabels,
  type SignatureEventAction,
} from "../../services/Eds/eds.schema";
import { describeCryptoPro } from "../../services/Eds/cryptoPro";
import useUtils from "../../hooks/useUtils";
import styles from "./EdsJournalPage.module.scss";

// Дата оценки состояния сертификатов: считается один раз на загрузку модуля
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Журнал действий с ЭП заказчика (Tasks 9, п. 1: «журнал действий — кто,
 * когда, чем подписал»).
 *
 * Две секции: сертификаты организации (владелец, срок, состояние) и таблица
 * подписаний (когда, каким сертификатом, над каким документом, чем кончилось).
 *
 * Журнал — аудит, а не юридический факт: документ подписывает сама подпись,
 * лог показывает историю. Но при проверке Казначейства или ФАС журнал —
 * первое, что спросят: «кто расписался и почему этот сертификат ваш».
 * Отдельно видны отказы: попытка подписать чужим ключом остаётся в истории
 * даже когда подпись не поставлена.
 */

export default function EdsJournalPage() {
  const { bem } = useUtils();
  const block = bem(styles, "eds-journal");

  const { data: organization } = useCurrentOrganization();
  const { data: certificates = [] } = useEdsCertificates(organization?.id);
  const { data: events = [] } = useSignatureEvents(organization?.id);

  const cpStatus = useMemo(() => describeCryptoPro(), []);

  const [actionFilter, setActionFilter] = useState<SignatureEventAction | "">(
    "",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredEvents = useMemo(
    () =>
      events
        .filter((event) => !actionFilter || event.action === actionFilter)
        .filter((event) => {
          const day = String(event.createdAt).slice(0, 10);
          if (dateFrom && day < dateFrom) return false;
          if (dateTo && day > dateTo) return false;
          return true;
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [events, actionFilter, dateFrom, dateTo],
  );

  const stats = useMemo(
    () => ({
      total: events.length,
      signed: events.filter((e) => e.result === "signed").length,
      refused: events.filter((e) => e.result === "rejected_certificate").length,
      failed: events.filter((e) => e.result === "failed").length,
    }),
    [events],
  );

  const states = certificates.map((cert) => certificateStateOn(cert, TODAY));
  const activeCerts = states.filter((state) => state === "active").length;
  const expiringCerts = states.filter((state) => state === "expiring").length;
  const deadCerts = states.filter(
    (state) => state === "expired" || state === "revoked",
  ).length;

  return (
    <div className={block()}>
      <h2 className={block("title")}>Журнал действий с ЭП</h2>

      {organization ? (
        <div className={block("org")}>
          <span>{organization.shortName || organization.fullName}</span>
          <span className={block("inn")}>
            ИНН {organization.inn}
            {organization.kpp ? ` · КПП ${organization.kpp}` : ""}
          </span>
        </div>
      ) : (
        <div className={block("org")}>
          Организация не определена — войдите под учётной записью заказчика
        </div>
      )}

      <div className={block("plugin")}>
        <span
          className={
            cpStatus.installed ? block("state-ok") : block("state-warn")
          }
        >
          {cpStatus.installed ? "Плагин обнаружен" : "Плагин не найден"}
        </span>
        <span className={block("plugin-hint")}>{cpStatus.hint}</span>
      </div>

      <div className={block("stats")}>
        <div className={block("stat")}>
          <span className={block("stat-label")}>Действует</span>
          <span className={block("stat-value")}>{activeCerts}</span>
        </div>
        <div
          className={expiringCerts ? block("stat", ["warn"]) : block("stat")}
        >
          <span className={block("stat-label")}>Истекают скоро</span>
          <span className={block("stat-value")}>{expiringCerts}</span>
        </div>
        <div className={deadCerts ? block("stat", ["danger"]) : block("stat")}>
          <span className={block("stat-label")}>Просрочено и отозвано</span>
          <span className={block("stat-value")}>{deadCerts}</span>
        </div>
        <div className={block("stat")}>
          <span className={block("stat-label")}>Подписаний</span>
          <span className={block("stat-value")}>{stats.signed}</span>
        </div>
        <div
          className={stats.refused ? block("stat", ["danger"]) : block("stat")}
        >
          <span className={block("stat-label")}>Отказов по чужому ИНН</span>
          <span className={block("stat-value")}>{stats.refused}</span>
        </div>
      </div>

      <section className={block("section")}>
        <h3 className={block("section-title")}>
          Сертификаты организации ({certificates.length})
        </h3>
        {certificates.length === 0 ? (
          <div className={block("empty")}>
            За организации пока не зарегистрирован ни один сертификат.
          </div>
        ) : (
          <table className={block("table")}>
            <thead>
              <tr>
                <th>Владелец</th>
                <th>Должность</th>
                <th>ИНН в сертификате</th>
                <th>Серийный номер</th>
                <th>Срок действия</th>
                <th>Состояние</th>
                <th>Откуда данные</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert, index) => {
                const state = states[index];

                return (
                  <tr
                    key={String(cert.id)}
                    className={
                      state === "expired" || state === "revoked"
                        ? block("row-danger")
                        : state === "expiring"
                          ? block("row-warn")
                          : ""
                    }
                  >
                    <td>
                      {cert.ownerName}
                      {cert.isProxy && (
                        <span className={block("inn")}>
                          {" "}
                          · по МЧД {cert.proxyNumber || "без номера"}
                        </span>
                      )}
                    </td>
                    <td>{cert.ownerPosition || "—"}</td>
                    <td>{cert.inn || "—"}</td>
                    <td>{cert.serialNumber || "—"}</td>
                    <td>{formatCertificatePeriod(cert)}</td>
                    <td>
                      <span
                        className={
                          state === "active"
                            ? block("state-ok")
                            : state === "expiring"
                              ? block("state-warn")
                              : block("state-danger")
                        }
                      >
                        {edsCertificateStateLabels[state]}
                      </span>
                    </td>
                    <td>{edsCertificateSourceLabels[cert.source]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className={block("section")}>
        <h3 className={block("section-title")}>
          Подписания ({filteredEvents.length}
          {filteredEvents.length !== events.length
            ? ` из ${events.length}`
            : ""}
          )
        </h3>

        <div className={block("filters")}>
          <label className={block("filter-label")}>
            Действие
            <select
              className={block("filter-select")}
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(event.target.value as SignatureEventAction | "")
              }
            >
              <option value="">Все</option>
              {Object.entries(signatureEventActionLabels).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className={block("filter-label")}>
            С даты
            <input
              type="date"
              className={block("filter-input")}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label className={block("filter-label")}>
            По дату
            <input
              type="date"
              className={block("filter-input")}
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
          <button
            type="button"
            className={block("btn")}
            onClick={() => {
              setActionFilter("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Сбросить
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <div className={block("empty")}>
            Событий нет — журнал заполняется, когда заказчик подписывает
            сведения или выгрузку в ЕИС.
          </div>
        ) : (
          <table className={block("table")}>
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Действие</th>
                <th>Документ</th>
                <th>Кем подписано</th>
                <th>Сертификат</th>
                <th>Алгоритм</th>
                <th>Результат</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr
                  key={String(event.id)}
                  className={
                    event.result === "signed" ? "" : block("row-danger")
                  }
                >
                  <td>{String(event.createdAt).replace("T", " ")}</td>
                  <td>{signatureEventActionLabels[event.action]}</td>
                  <td>
                    {signatureEventEntityTypeLabels[event.entityType]}
                    <br />
                    <span className={block("inn")}>{event.documentLabel}</span>
                  </td>
                  <td>
                    {event.certificateOwner || "—"}
                    {!event.innMatched && (
                      <span className={block("inn-mismatch")}>
                        {" "}
                        ИНН не совпал
                      </span>
                    )}
                  </td>
                  <td>
                    {event.certificateSerial
                      ? `${event.certificateSerial.slice(0, 8)}…`
                      : "—"}
                    <br />
                    <span className={block("inn")}>
                      {edsCertificateSourceLabels[event.certificateSource]}
                    </span>
                  </td>
                  <td>{event.certificateAlgorithm || "—"}</td>
                  <td>
                    <span
                      className={
                        event.result === "signed"
                          ? block("state-ok")
                          : block("state-danger")
                      }
                    >
                      {signatureEventResultLabels[event.result]}
                    </span>
                    {event.comment && <br />}
                    {event.comment && (
                      <span className={block("inn")}>{event.comment}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
