import { useState } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import type { AcceptanceResponse } from "../../services/Acceptance/acceptance.types";
import type { ContractViolationSubject } from "../../services/ContractViolation/contractViolation.schema";
import {
  acceptanceKindLabels,
  acceptanceResultLabels,
  acceptanceStatusLabels,
  acceptanceStatusTone,
  formatMoney,
} from "../ContractAcceptance/acceptance.config";
import { useAcceptanceSummary } from "../ContractAcceptance/acceptanceSummary";
import ContractViolationNotice from "./ContractViolationNotice";
import styles from "./ContractRegistry.module.scss";

/**
 * Приёмка в карточке контракта — входящие документы электронного актирования.
 *
 * Направление сообщения — принципиальная разница с платежами: документ о
 * приёмке направляет поставщик, заказчик его рассматривает и принимает
 * решение; платёжные документы, наоборот, уходят от заказчика. Поэтому секция
 * показывает входящие документы и точку входа в новую приёмку, а не «ручной
 * учёт» как у платежей.
 *
 * Секция рисуется всегда (как и платежи): пустая таблица здесь — не повод
 * скрывать точку входа, по ней видно, что входящих документов пока нет.
 *
 * Расхождения или отказ по документу — это выявленное нарушение, поэтому из
 * строки открывается КС-уведомление: задача уходит члену КС по структуре
 * службы (п. 3.5.3 / 3.5.2 приказа № 158н).
 */
interface ContractAcceptanceSectionProps {
  contractId?: string | number;
  /** Номер контракта и ИКЗ — для текста КС-уведомления. */
  contractNumber?: string;
  contractSubject?: string;
  ikz?: string;
}

/** Нарушение, которое видно по документу о приёмке. */
const acceptanceViolationSubject = (
  acceptance: AcceptanceResponse,
): ContractViolationSubject | null => {
  if (acceptance.defects.length > 0) return "quality";
  if (acceptance.result === "Refused" || acceptance.status === "Refused") {
    return "quality";
  }
  if (acceptance.result === "AcceptedWithDiscrepancies") return "quality";

  return null;
};

/** Что уже известно о нарушении — подставляется в форму уведомления. */
const acceptanceViolationEssence = (
  acceptance: AcceptanceResponse,
  showDate: (iso: string | undefined) => string,
): string => {
  const result = acceptance.result
    ? acceptanceResultLabels[acceptance.result]
    : acceptanceStatusLabels[acceptance.status];
  const defects = acceptance.defects
    .map((defect) => `${defect.description} (${defect.requirementLabel})`)
    .join("; ");

  return [
    `По документу о приёмке № ${acceptance.input.documentNumber || "—"} от ${
      showDate(acceptance.input.documentDate ?? undefined) || "—"
    } итог: ${result}.`,
    defects ? `Выявленные недостатки: ${defects}.` : "",
    acceptance.refusalReason
      ? `Мотивированный отказ: ${acceptance.refusalReason}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
};

export default function ContractAcceptanceSection({
  contractId,
  contractNumber = "",
  contractSubject,
  ikz,
}: ContractAcceptanceSectionProps) {
  const { formatDate } = useUtils();
  const { data: organization } = useCurrentOrganization();
  const organizationId = organization ? String(organization.id) : "";
  // Сводка приёмок считается селектором один раз на изменение данных:
  // та же проекция используется прогресс-баром в сводке контракта
  const { data: summary, isLoading, isError } = useAcceptanceSummary(
    organizationId || undefined,
    contractId === undefined ? undefined : String(contractId),
  );

  // Документ, по которому сотрудник формирует КС-уведомление
  const [notice, setNotice] = useState<{
    subject: ContractViolationSubject;
    essence: string;
    label: string;
    link: string;
  } | null>(null);

  if (contractId === undefined) return null;

  const rows = summary?.rows ?? [];
  const count = summary?.count ?? 0;
  const acceptedTotal = summary?.acceptedTotal ?? 0;
  const onReview = summary?.onReview ?? 0;
  const errors = summary?.errors ?? 0;
  const contractLink = `/acceptances?contractId=${String(contractId)}`;
  const newLink = `/acceptances/new?contractId=${String(contractId)}`;

  return (
    <section className={styles.subSection}>
      <div className={styles.subHeader}>
        <h4 className={styles.subTitle}>
          Приёмка — входящие документы из ЕИС (электронное актирование, ст. 94)
        </h4>
        {/* Аналог «+ Платёж»: документ о приёмке заводят в том же контуре,
            что и платёжные документы, но он входящий — его направил
            поставщик */}
        <Link className={styles.btnSmall} to={newLink}>
          + Приёмка
        </Link>
      </div>

      <p className={styles.projectionEmpty}>
        Входящее сообщение: документ направляет поставщик через ЕИС, заказчик
        рассматривает его, принимает или отказывает. Платёжные документы идут в
        обратную сторону — это исходящие сообщения в секции «Платежи».
      </p>

      {count > 0 && (
        <div className={styles.projectionSummary}>
          <span className={styles.projectionChip}>Документов: {count}</span>
          <span className={styles.projectionChip}>
            Принято на {formatMoney(acceptedTotal)} ₽
          </span>
          {onReview > 0 && (
            <span
              className={`${styles.projectionChip} ${styles.projectionChipAlert}`}
            >
              На рассмотрении: {onReview}
            </span>
          )}
          {errors > 0 && (
            <span
              className={`${styles.projectionChip} ${styles.projectionChipAlert}`}
            >
              Ошибок проверки: {errors}
            </span>
          )}
        </div>
      )}

      {isError ? (
        <p className={styles.projectionEmpty}>
          Не удалось получить входящие документы из контура электронного
          актирования (csms-api недоступен). Пустой список здесь не означает,
          что приёмок по контракту нет.
        </p>
      ) : isLoading && !summary ? (
        <p className={styles.projectionEmpty}>
          Загрузка входящих документов о приёмке…
        </p>
      ) : count === 0 ? (
        <p className={styles.projectionEmpty}>
          Входящих документов о приёмке нет. Поставщик направляет их через ЕИС
          дистанционного актирования; если документ пришёл вне системы, приёмку
          заводят вручную — от этого зависят срок оплаты и основание для
          КС-уведомления о ненадлежащем исполнении.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Документ</th>
              <th>Дата</th>
              <th>Вид</th>
              <th>Статус</th>
              <th>Итог приёмки</th>
              <th>Сумма с НДС, ₽</th>
              <th>Позиций / недостатков</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>

            {rows.map((acceptance) => {
              const violation = acceptanceViolationSubject(acceptance);

              return (
                <tr key={acceptance.id}>
                  <td>№ {acceptance.input.documentNumber || "—"}</td>
                  <td>
                    {formatDate(acceptance.input.documentDate ?? undefined) ||
                      "—"}
                  </td>
                  <td>{acceptanceKindLabels[acceptance.input.kind]}</td>
                  <td>
                    <span
                      className={`${styles.accBadge} ${
                        styles[`acc_${acceptanceStatusTone(acceptance.status)}`]
                      }`}
                    >
                      {acceptanceStatusLabels[acceptance.status]}
                    </span>
                  </td>
                  <td>
                    {acceptance.result
                      ? acceptanceResultLabels[acceptance.result]
                      : "не определён"}
                  </td>
                  <td className={styles.moneyCell}>
                    {formatMoney(acceptance.totalWithVat)}
                  </td>
                  <td>
                    {acceptance.positions.length} / {acceptance.defects.length}
                  </td>
                  <td>
                    <Link
                      className={styles.projectionLink}
                      to={`/acceptances/${acceptance.id}`}
                    >
                      Открыть
                    </Link>
                    {violation && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          className={styles.btnSmall}
                          title="Сформировать КС-уведомление о ненадлежащем исполнении: задача уйдёт ответственному в контрактной службе"
                          onClick={() =>
                            setNotice({
                              subject: violation,
                              essence: acceptanceViolationEssence(
                                acceptance,
                                formatDate,
                              ),
                              label: `Документ о приёмке № ${
                                acceptance.input.documentNumber || "—"
                              } от ${
                                formatDate(
                                  acceptance.input.documentDate ?? undefined,
                                ) || "—"
                              }`,
                              link: `/acceptances/${acceptance.id}`,
                            })
                          }
                        >
                          КС-уведомление
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className={styles.projectionMeta}>
        <Link className={styles.projectionLink} to={contractLink}>
          Все приёмки по этому контракту
        </Link>
        <Link className={styles.projectionLink} to={newLink}>
          Новая приёмка
        </Link>
      </div>

      {notice && (
        <ContractViolationNotice
          contractId={contractId}
          contractNumber={contractNumber}
          contractSubject={contractSubject}
          ikz={ikz}
          source="acceptance"
          defaultSubject={notice.subject}
          defaultEssence={notice.essence}
          sourceRef={{ label: notice.label, link: notice.link }}
          onClose={() => setNotice(null)}
        />
      )}
    </section>
  );
}

