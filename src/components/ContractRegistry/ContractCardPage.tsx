import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  contractIkzError,
  isContractOverdue,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  useContractById,
  useDeleteContract,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import { contractCardSmpRequirement } from "../../services/ContractRegistry/contractCardProjection.schema";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import useUtils from "../../hooks/useUtils";
import ContractEisSection from "./ContractEisSection";
import ContractCardProjectionSection from "./ContractCardProjectionSection";
import ContractAcceptanceSection from "./ContractAcceptanceSection";
import ContractCardSummary from "./ContractCardSummary";
import ContractStagesSection from "./ContractStagesSection";
import ContractPenaltiesSection from "./ContractPenaltiesSection";
import ContractEventsSection from "./ContractEventsSection";
import SmpSection from "./ContractSmpSection";
import { CONTRACT_STATUS_LABELS, formatMoney } from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

/**
 * Карточка контракта: всё об одном контракте на своём роуте.
 *
 * Реестр раньше показывал эти секции прямо в раскрытой строке — при десятках
 * строк это давало лавину запросов и «задумывание» списка. Теперь реестр
 * отдаёт только сводку (`ContractCardSummary`), а полная информация — здесь.
 */
export default function ContractCardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatDate } = useUtils();
  const { data: organization, isLoading: isOrganizationLoading } =
    useCurrentOrganization();
  // Один контракт по id: карточке не нужен весь реестр организации
  const { data: contract, isLoading } = useContractById(id);
  const { mutate: deleteContract, isPending: isDeleting } = useDeleteContract();
  // Выгрузка карточки ЕИС нужна и сводке, и заголовку: по ней видно, есть ли
  // у контракта обязанность привлекать СМП. Ключ запроса общий, данные из кэша
  const { data: projection } = useContractCardProjection(contract?.id ?? id);
  const smpRequirement = useMemo(
    () => contractCardSmpRequirement(projection?.Smp ?? []),
    [projection],
  );
  const hasSmpRequirement =
    Number(contract?.smpRequiredPercent ?? 0) > 0 ||
    Boolean(smpRequirement.percent) ||
    Number(smpRequirement.sum ?? 0) > 0;

  if (isLoading || isOrganizationLoading) {
    return (
      <section className={styles.cardPage}>
        <p className={styles.projectionEmpty}>Загрузка карточки контракта…</p>
      </section>
    );
  }

  // Чужой контракт не показываем: разграничение по организации остаётся
  // клиентским, потому что запись читается по одному id
  const anotherOrganization =
    Boolean(contract && organization) &&
    String(contract?.organizationId) !== String(organization?.id);

  if (!contract || anotherOrganization) {
    return (
      <section className={styles.cardPage}>
        <Link className={styles.projectionLink} to="/contract-registry">
          ← К реестру контрактов
        </Link>
        <p className={styles.projectionEmpty}>
          Контракт не найден. Возможно, он удалён или относится к другой
          организации.
        </p>
      </section>
    );
  }

  const contractId = contract.id ?? "";
  const overdue = isContractOverdue(contract);
  const ikzError = contractIkzError(contract.ikz);
  // Выгрузка из ЕИС (есть ссылка на карточку портала) — не наш документ:
  // удалить запись реестра контрактов нельзя, её снимают сведениями в ЕИС
  const isEisContract = Boolean(contract.eisUrl);
  // Поставщика реестр контрактов не отдаёт, но получатель платежа в выгрузке
  // ЕИС — это подрядчик: показываем его, чтобы шапка не оставалась пустой у
  // контракта, по которому уже прошла оплата
  const eisRecipient = projection?.Payments.find(
    (payment) => payment.RecipientName,
  );
  const supplierName =
    contract.supplierName || eisRecipient?.RecipientName || "";
  const supplierInn = contract.supplierInn || eisRecipient?.RecipientInn || "";

  const handleDelete = () => {
    if (!contract.id) return;
    if (
      !window.confirm(
        `Удалить контракт ${contract.contractNumber}? Действие необратимо.`,
      )
    ) {
      return;
    }
    deleteContract(contract.id, {
      onSuccess: () => navigate("/contract-registry"),
    });
  };

  return (
    <section className={styles.cardPage}>
      <div className={styles.cardPageTop}>
        <Link className={styles.projectionLink} to="/contract-registry">
          ← К реестру контрактов
        </Link>
        <div className={styles.footerActions}>
          {/* Изменение или расторжение по ст. 95: снимок подставляется из
              этой карточки */}
          <Link
            className={styles.btnSecondary}
            to={`/contract-changes/new?contractId=${String(contractId)}`}
          >
            Изменение / расторжение
          </Link>
          {/* Электронное актирование — только просмотр: документы о приёмке
              включаются в реестр контрактов, а не составляются в карточке */}
          <Link
            className={styles.btnSecondary}
            to={`/acceptances?contractId=${String(contractId)}`}
          >
            Все приёмки
          </Link>
          {/* Удалять можно только запись, заведённую в системе. Контракт из
              выгрузки ЕИС удалению не подлежит */}
          {!isEisContract && (
            <button
              type="button"
              className={styles.btnDanger}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Удаление…" : "Удалить"}
            </button>
          )}
        </div>
      </div>

      <header className={styles.cardPageHeader}>
        <h2 className={styles.cardPageTitle}>
          {contract.contractNumber} — {contract.contractName}
        </h2>
        <div className={styles.cardPageMeta}>
          <span className={styles.statusCell}>
            <span
              className={`${styles.statusBadge} ${styles[`status_${contract.status}`]}`}
            >
              {CONTRACT_STATUS_LABELS[contract.status]}
            </span>
            {overdue && <span className={styles.overdueBadge}>Просрочен</span>}
            {hasSmpRequirement && (
              <span
                className={styles.smpBadge}
                title="Контракт с привлечением СМП/СОНКО"
              >
                СМП
              </span>
            )}
          </span>
          <span>Цена: {formatMoney(contract.contractPrice)} ₽</span>
          <span>Подрядчик: {supplierName || "не указан в выгрузке"}</span>
          {supplierInn && <span>ИНН: {supplierInn}</span>}
          <span>Заключён: {formatDate(contract.contractDate)}</span>
          {/* Импорт ЕИС не всегда отдаёт дату начала исполнения: тогда срок
              читается как «до <дата>», а не «— — дата» */}
          <span>
            Срок исполнения:{" "}
            {contract.executionStartDate
              ? `${formatDate(contract.executionStartDate)} — `
              : "до "}
            {formatDate(contract.executionEndDate) || "не указан"}
          </span>
          {contract.eisRegistryNumber && (
            <span>Реестровый номер ЕИС: {contract.eisRegistryNumber}</span>
          )}
          {ikzError && <span className={styles.cellDanger}>{ikzError}</span>}
        </div>
      </header>

      {/* Сводка исполнения: оплата, приёмка, СМП */}
      <ContractCardSummary contract={contract} />

      <div className={styles.cardBody}>
        <ContractEisSection contract={contract} />
        {/* Факт исполнения — из выгрузки ЕИС: акты приёмки и платёжные
            поручения. Ручных платежей и поставок в карточке нет: это
            документы реестра контрактов, а не наши учётные записи */}
        <ContractCardProjectionSection contractId={contract.id} />
        <ContractAcceptanceSection contractId={contract.id} />
        <ContractStagesSection contractId={contract.id} contract={contract} />
        <ContractPenaltiesSection contractId={contract.id} />
          <ContractEventsSection contractId={contractId} contract={contract} />
        {/* Требование СМП наследуется из служебки; у импортированных из ЕИС
            контрактов его нет, но объём и загруженные сведения показываем */}
        <div id="contract-smp">
          <SmpSection
            contractId={contractId}
            contractPrice={contract.contractPrice}
            smpRequiredPercent={contract.smpRequiredPercent}
            subcontractingSmpNoteNumber={contract.subcontractingSmpNoteNumber}
          />
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.meta}>
            {contract.eisPublishDate && (
              <span>
                Опубликован в ЕИС: {formatDate(contract.eisPublishDate)}
              </span>
            )}
            {contract.treasuryPublishDate && (
              <span>
                В Казначействе: {formatDate(contract.treasuryPublishDate)}
              </span>
            )}
            {contract.signedByName && (
              <span>Подписал: {contract.signedByName}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
