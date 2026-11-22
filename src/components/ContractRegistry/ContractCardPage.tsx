import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  contractIkzError,
  isContractOverdue,
  type ContractRegistryItem,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  useContractRegistry,
  useDeleteContract,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import useUtils from "../../hooks/useUtils";
import ContractEisSection from "./ContractEisSection";
import ContractCardProjectionSection from "./ContractCardProjectionSection";
import ContractAcceptanceSection from "./ContractAcceptanceSection";
import ContractCardSummary from "./ContractCardSummary";
import ContractStagesSection from "./ContractStagesSection";
import ContractPaymentsSection from "./ContractPaymentsSection";
import ContractPenaltiesSection from "./ContractPenaltiesSection";
import ContractDeliveriesSection from "./ContractDeliveriesSection";
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
  const organizationId = organization ? String(organization.id) : "";
  const { data: contracts, isLoading } = useContractRegistry(organizationId);
  const { mutate: deleteContract, isPending: isDeleting } = useDeleteContract();

  const contract = useMemo<ContractRegistryItem | undefined>(
    () => (contracts ?? []).find((item) => String(item.id) === id),
    [contracts, id],
  );

  if (isLoading || isOrganizationLoading) {
    return (
      <section className={styles.cardPage}>
        <p className={styles.projectionEmpty}>Загрузка карточки контракта…</p>
      </section>
    );
  }

  if (!contract) {
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
          {/* Электронное актирование по ст. 94 */}
          <Link
            className={styles.btnSecondary}
            to={`/acceptances/new?contractId=${String(contractId)}`}
          >
            Приёмка
          </Link>
          <Link
            className={styles.btnSecondary}
            to={`/acceptances?contractId=${String(contractId)}`}
          >
            Все приёмки
          </Link>
          <button
            type="button"
            className={styles.btnDanger}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Удаление…" : "Удалить"}
          </button>
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
          </span>
          <span>Цена: {formatMoney(contract.contractPrice)} ₽</span>
          <span>Поставщик: {contract.supplierName || "не указан"}</span>
          <span>Заключён: {formatDate(contract.contractDate)}</span>
          <span>
            Срок: {formatDate(contract.executionStartDate)} —{" "}
            {formatDate(contract.executionEndDate)}
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
        <ContractCardProjectionSection contractId={contract.id} />
        <ContractAcceptanceSection contractId={contract.id} />
        <ContractStagesSection contractId={contract.id} />
        <ContractPaymentsSection contractId={contract.id} />
        <ContractPenaltiesSection contractId={contract.id} />
        <ContractDeliveriesSection contractId={contract.id} />
        <ContractEventsSection contractId={contractId} />
        {/* Требование СМП наследуется из служебки; у импортированных из ЕИС
            контрактов его нет, но объём и загруженные сведения показываем */}
        <SmpSection
          contractId={contractId}
          contractPrice={contract.contractPrice}
          smpRequiredPercent={contract.smpRequiredPercent}
          subcontractingSmpNoteNumber={contract.subcontractingSmpNoteNumber}
        />

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
