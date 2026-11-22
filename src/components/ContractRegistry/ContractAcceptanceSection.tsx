import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  acceptanceKindLabels,
  acceptanceResultLabels,
  acceptanceStatusLabels,
  acceptanceStatusTone,
  formatMoney,
} from "../ContractAcceptance/acceptance.config";
import { useAcceptanceSummary } from "../ContractAcceptance/acceptanceSummary";
import styles from "./ContractRegistry.module.scss";

/**
 * Документы о приёмке из контура электронного актирования (ст. 94 44-ФЗ).
 *
 * Источник — csms-api, а не карточка ЕИС: здесь документы проходят наши
 * сценарии (направление, расхождения, отказ, регистрация). Фактические акты и
 * платежи из выгрузки ЕИС показывает соседняя секция проекции — они не
 * смешиваются, иначе нельзя понять, что уже зарегистрировано в ЕИС, а что
 * только готовится к отправке.
 *
 * Пусто — секция не рисуется: точка входа в приёмку уже есть в подвале
 * карточки, дублировать её пустым блоком не нужно.
 */
interface ContractAcceptanceSectionProps {
  contractId?: string | number;
}

export default function ContractAcceptanceSection({
  contractId,
}: ContractAcceptanceSectionProps) {
  const { formatDate } = useUtils();
  const { data: organization } = useCurrentOrganization();
  const organizationId = organization ? String(organization.id) : "";
  // Сводка приёмок считается селектором один раз на изменение данных:
  // та же проекция используется прогресс-баром в сводке контракта
  const { data: summary } = useAcceptanceSummary(
    organizationId || undefined,
    contractId === undefined ? undefined : String(contractId),
  );

  if (contractId === undefined || !summary || summary.count === 0) return null;

  const { rows, count, acceptedTotal, onReview, errors } = summary;
  const contractLink = `/acceptances?contractId=${String(contractId)}`;

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>
        Документы о приёмке (электронное актирование, ст. 94)
      </h4>

      <div className={styles.projectionSummary}>
        <span className={styles.projectionChip}>
          Документов: {count}
        </span>
        <span className={styles.projectionChip}>
          Принято на {formatMoney(acceptedTotal)} ₽
        </span>
        {onReview > 0 && (
          <span className={`${styles.projectionChip} ${styles.projectionChipAlert}`}>
            На рассмотрении: {onReview}
          </span>
        )}
        {errors > 0 && (
          <span className={`${styles.projectionChip} ${styles.projectionChipAlert}`}>
            Ошибок проверки: {errors}
          </span>
        )}
      </div>

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
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((acceptance) => (
            <tr key={acceptance.id}>
              <td>№ {acceptance.input.documentNumber || "—"}</td>
              <td>
                {formatDate(acceptance.input.documentDate ?? undefined) || "—"}
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.projectionMeta}>
        <Link className={styles.projectionLink} to={contractLink}>
          Все приёмки по этому контракту
        </Link>
        <Link
          className={styles.projectionLink}
          to={`/acceptances/new?contractId=${String(contractId)}`}
        >
          Новая приёмка
        </Link>
      </div>
    </section>
  );
}
