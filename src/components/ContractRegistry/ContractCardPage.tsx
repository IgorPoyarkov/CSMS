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
import {
  contractCardContractNumber,
  contractCardExecutionPeriod,
  contractCardSmpRequirement,
  contractCardSmpRows,
  contractCardSubject,
  contractCardSupplier,
} from "../../services/ContractRegistry/contractCardProjection.schema";
import { useContractSmpRecords } from "../../services/ContractSmp/contractSmp.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import useUtils from "../../hooks/useUtils";
import ContractEisSection from "./ContractEisSection";
import ContractAcceptanceSection from "./ContractAcceptanceSection";
import ContractPaymentsSection from "./ContractPaymentsSection";
import ContractCardSummary from "./ContractCardSummary";
import ContractExecutionTimeline from "./ContractExecutionTimeline";
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
  // Ручные записи о привлечении СМП: блок прячем, только если нет ни требования,
  // ни сведений из ЕИС, ни уже внесённых субдоговоров
  const { data: smpRecords } = useContractSmpRecords(contract?.id ?? id);
  const smpRequirement = useMemo(
    () => contractCardSmpRequirement(projection?.Smp ?? []),
    [projection],
  );
  const smpEisRows = useMemo(
    () => contractCardSmpRows(projection?.Smp ?? []),
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
  // Предмет, подрядчик и срок исполнения — из карточки ЕИС: реестр контрактов
  // этих полей почти не отдаёт, а в выгрузке они есть. Запись реестра остаётся
  // приоритетнее, чтобы ручные правки не перекрывались импортом
  const eisSupplier = contractCardSupplier(projection);
  const supplierName = contract.supplierName || eisSupplier.name;
  const supplierInn = contract.supplierInn || eisSupplier.inn;
  const subject = contractCardSubject(projection) || contract.contractName;
  // Номер контракта, а не реестровый номер: у импортированных записей в
  // `contractNumber` лежит 19-значный номер реестра, а сам номер контракта
  // («14Р_26») приходит с выгрузкой ЕИС
  const contractNumberLabel =
    contractCardContractNumber(projection) || contract.contractNumber;
  const eisExecution = contractCardExecutionPeriod(projection);
  const executionStart = contract.executionStartDate || eisExecution.start;
  const executionEnd = contract.executionEndDate || eisExecution.end;
  // Обязанность привлекать СМП: служебка, процент, сведения ЕИС или уже
  // внесённые субдоговоры. Без них блок оставался пустой оболочкой
  const showSmpBlock =
    hasSmpRequirement ||
    Boolean(contract.subcontractingSmpNoteNumber) ||
    smpEisRows.length > 0 ||
    (smpRecords?.length ?? 0) > 0;

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
        {/* Заголовок — только предмет контракта: номер и реквизиты читаются
            строкой меты под ним, а в заголовке они отвлекали от сути */}
        <h2 className={styles.cardPageTitle}>{subject}</h2>
        <div className={styles.cardPageMeta}>
          <span>Контракт № {contractNumberLabel}</span>
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
            {executionStart ? `${formatDate(executionStart)} — ` : "до "}
            {formatDate(executionEnd) || "не указан"}
          </span>
          {ikzError && <span className={styles.cellDanger}>{ikzError}</span>}
        </div>
      </header>

      {/* Сводка исполнения: оплата, приёмка, СМП */}
      <ContractCardSummary contract={contract} />

      <div className={styles.cardBody}>
        <ContractEisSection contract={contract} />
        {/* Исполнение — одной хронологией: период контракта, этапы ЕИС и факты
            (приёмка, оплата, СМП, неустойки) в порядке календаря. Раньше это
            были четыре независимые таблицы, и порядок событий в них терялся */}
        <ContractExecutionTimeline contract={contract} />
        {/* Приёмка и оплата — рабочие секции, а не хронология: здесь заводят
            документы и отправляют их в ЕИС дистанционного актирования.
            Хронология выше остаётся справкой по уже опубликованным фактам */}
        <div id="contract-acceptance">
          <ContractAcceptanceSection contractId={contractId} />
        </div>
        <div id="contract-payments">
          <ContractPaymentsSection contractId={contractId} />
        </div>
        {/* Требование СМП наследуется из служебки; у импортированных из ЕИС
            контрактов его может не быть — тогда блока нет совсем, чтобы не
            показывать пустую оболочку с редактором, который нечего настраивать */}
        {showSmpBlock && (
          <div id="contract-smp">
            <SmpSection
              contractId={contractId}
              contractPrice={contract.contractPrice}
              smpRequiredPercent={contract.smpRequiredPercent}
              subcontractingSmpNoteNumber={contract.subcontractingSmpNoteNumber}
            />
          </div>
        )}

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
