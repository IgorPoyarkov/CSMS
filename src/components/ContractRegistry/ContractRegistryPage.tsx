import { useState, type FormEvent } from "react";
import {
  totalPaid,
  paymentPercent,
  totalPenalties,
  isContractOverdue,
  type ContractRegistryItem,
  type ContractStage,
  type ContractPayment,
  type ContractPenalty,
  type ContractDelivery,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  useContractRegistry,
  useContractStages,
  useContractPayments,
  useContractPenalties,
  useContractDeliveries,
  useDeleteContract,
  lookupContractByNumber,
  MIN_CONTRACT_NUMBER_LENGTH,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import useUtils from "../../hooks/useUtils";
import SmpSection from "./ContractSmpSection";
import styles from "./ContractRegistry.module.scss";

const STATUS_LABELS: Record<string, string> = {
  signed: "Заключён",
  in_execution: "Исполняется",
  completed: "Завершён",
  terminated: "Расторгнут",
  suspended: "Приостановлен",
};

const STAGE_LABELS: Record<string, string> = {
  planned: "Запланирован",
  in_progress: "Выполняется",
  completed: "Выполнен",
  delayed: "Просрочен",
};

const PAYMENT_LABELS: Record<string, string> = {
  advance: "Аванс",
  intermediate: "Промежуточный",
  final: "Финальный",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Запланирован",
  sent: "Отправлен",
  paid: "Оплачен",
  rejected: "Отклонён",
};

const PENALTY_LABELS: Record<string, string> = {
  delay: "Просрочка",
  quality: "Качество",
  delivery: "Поставка",
  other: "Прочее",
};

const PENALTY_STATUS_LABELS: Record<string, string> = {
  accrued: "Начислена",
  collected: "Взыскана",
  disputed: "Оспорена",
  written_off: "Списана",
};

const DELIVERY_LABELS: Record<string, string> = {
  accepted: "Принято",
  accepted_with_notes: "Принято с замечаниями",
  rejected: "Отклонено",
};

const formatMoney = (value: string | number | undefined | null): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!num && num !== 0) return "—";
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** id DOM-узла карточки — чтобы прокрутить страницу к подгруженному контракту. */
const contractCardDomId = (id: string | number) => `contract-card-${id}`;

type LookupNoticeTone = "pending" | "success" | "warning" | "danger";

interface LookupNotice {
  tone: LookupNoticeTone;
  text: string;
}

export default function ContractRegistryPage() {
  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;
  const { formatDate } = useUtils();

  const { data: contracts, isLoading } = useContractRegistry(orgId);
  const { mutate: deleteContract } = useDeleteContract();

  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const toggleExpand = (id: string | number | undefined) => {
    if (id === undefined) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ─── Подгрузка сведений из реестра по реестровому номеру контракта ────────
  const [numberInput, setNumberInput] = useState("");
  const [notice, setNotice] = useState<LookupNotice | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  // Карточка, полученная подгрузкой, — подсвечиваем её до сброса поиска
  const [loadedId, setLoadedId] = useState<string | number | null>(null);

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = numberInput.trim();
    if (!orgId) {
      setNotice({
        tone: "danger",
        text: "Организация не определена — подгрузка сведений недоступна.",
      });
      return;
    }
    if (trimmed.length < MIN_CONTRACT_NUMBER_LENGTH) {
      setLoadedId(null);
      setNotice(
        trimmed
          ? {
              tone: "danger",
              text: `Реестровый номер должен содержать не менее ${MIN_CONTRACT_NUMBER_LENGTH} символов.`,
            }
          : null,
      );
      return;
    }
    setIsLooking(true);
    setNotice({
      tone: "pending",
      text: `Ищем контракт ${trimmed} в реестре...`,
    });
    try {
      const result = await lookupContractByNumber(trimmed, orgId);
      const found = result.contract;
      if (found && found.id !== undefined) {
        setExpandedId(found.id);
        setLoadedId(found.id);
        setNotice({
          tone: "success",
          text: `Подгружены сведения контракта ${found.contractNumber}: ${found.contractName}`,
        });
        // Прокрутку делаем после раскрытия карточки, иначе промахнёмся по позиции
        const cardId = contractCardDomId(found.id);
        requestAnimationFrame(() => {
          document
            .getElementById(cardId)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }
      setLoadedId(null);
      setNotice(
        result.anotherOrganization
          ? {
              tone: "warning",
              text: `Контракт ${trimmed} в реестре есть, но относится к другому заказчику — его сведения вам недоступны.`,
            }
          : {
              tone: "danger",
              text: `Контракт с реестровым номером ${trimmed} не найден.`,
            },
      );
    } catch {
      setLoadedId(null);
      setNotice({
        tone: "danger",
        text: "Не удалось подгрузить сведения из реестра контрактов.",
      });
    } finally {
      setIsLooking(false);
    }
  };

  const handleLookupReset = () => {
    setNumberInput("");
    setNotice(null);
    setLoadedId(null);
  };

  if (isLoading) {
    return <div className={styles.loader}>Загрузка реестра контрактов...</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Реестр контрактов (ст. 82, 103 ФЗ-44)</h2>

      <section className={styles.lookup}>
        <h3 className={styles.lookupTitle}>
          Подгрузка сведений из реестра контрактов
        </h3>
        <form className={styles.lookupRow} onSubmit={handleLookup}>
          <div className={styles.lookupField}>
            <label
              className={styles.lookupLabel}
              htmlFor="registry-contract-number"
            >
              Реестровый номер контракта
            </label>
            <input
              id="registry-contract-number"
              className={styles.lookupInput}
              value={numberInput}
              onChange={(event) => setNumberInput(event.target.value)}
              placeholder="Например: 0346200000626000001"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className={styles.lookupSubmit}
            disabled={isLooking}
          >
            {isLooking ? "Подгружаем..." : "Подгрузить"}
          </button>
          {(numberInput || notice) && (
            <button
              type="button"
              className={styles.lookupReset}
              onClick={handleLookupReset}
            >
              Сбросить
            </button>
          )}
        </form>
        <p className={styles.lookupHint}>
          По номеру подтягиваются сведения контракта вашей организации: этапы,
          платежи, неустойки, поставки и объём субподряда СМП.
        </p>
        {notice && (
          <div
            className={`${styles.lookupNotice} ${styles[`lookupNotice_${notice.tone}`]}`}
            role="status"
          >
            {notice.text}
          </div>
        )}
      </section>

      {!contracts || contracts.length === 0 ? (
        <div className={styles.empty}>Контрактов нет</div>
      ) : (
        <div className={styles.list}>
          {contracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              expanded={expandedId === contract.id}
              highlighted={
                loadedId !== null && String(contract.id) === String(loadedId)
              }
              domId={
                contract.id === undefined
                  ? undefined
                  : contractCardDomId(contract.id)
              }
              onToggle={() => toggleExpand(contract.id)}
              onDelete={() => {
                if (contract.id && confirm("Удалить контракт из реестра?")) {
                  deleteContract(contract.id);
                }
              }}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Карточка контракта ─────────────────────────────────────────────────────

interface ContractCardProps {
  contract: ContractRegistryItem;
  expanded: boolean;
  /** Карточка получена подгрузкой по реестровому номеру — выделяем её. */
  highlighted: boolean;
  domId?: string;
  onToggle: () => void;
  onDelete: () => void;
  formatDate: (date?: string) => string;
}

function ContractCard({
  contract,
  expanded,
  highlighted,
  domId,
  onToggle,
  onDelete,
  formatDate,
}: ContractCardProps) {
  const overdue = isContractOverdue(contract);

  return (
    <div
      id={domId}
      className={`${styles.card} ${overdue ? styles.cardOverdue : ""} ${
        highlighted ? styles.cardHighlighted : ""
      }`}
    >
      <div className={styles.cardHeader} onClick={onToggle}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.contractNumber}>
            {contract.contractNumber}
          </span>
          <span className={styles.contractName}>{contract.contractName}</span>
        </div>
        <div className={styles.cardHeaderRight}>
          <span
            className={`${styles.statusBadge} ${styles[`status_${contract.status}`]}`}
          >
            {STATUS_LABELS[contract.status]}
          </span>
          {overdue && <span className={styles.overdueBadge}>Просрочен</span>}
          <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      <div className={styles.cardSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Поставщик</span>
          <span className={styles.summaryValue}>{contract.supplierName}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Цена контракта</span>
          <span className={styles.summaryValue}>
            {formatMoney(contract.contractPrice)} ₽
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Заключён</span>
          <span className={styles.summaryValue}>
            {formatDate(contract.contractDate)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Срок исполнения</span>
          <span className={styles.summaryValue}>
            {formatDate(contract.executionStartDate)} —{" "}
            {formatDate(contract.executionEndDate)}
          </span>
        </div>
      </div>

      {expanded && (
        <div className={styles.cardBody}>
          <PaymentSummary contract={contract} />
          <StagesSection contractId={contract.id} />
          <PaymentsSection contractId={contract.id} />
          <PenaltiesSection contractId={contract.id} />
          <DeliveriesSection contractId={contract.id} />
          {contract.subcontractingSmpNoteNumber && (
            <SmpSection
              contractId={contract.id ?? ""}
              contractPrice={contract.contractPrice}
              smpRequiredPercent={contract.smpRequiredPercent}
              subcontractingSmpNoteNumber={contract.subcontractingSmpNoteNumber}
            />
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
            <button className={styles.btnDanger} onClick={onDelete}>
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Сводка по оплатам ──────────────────────────────────────────────────────

function PaymentSummary({ contract }: { contract: ContractRegistryItem }) {
  const { data: payments } = useContractPayments(contract.id);
  const paid = totalPaid(payments ?? []);
  const percent = paymentPercent(paid, contract.contractPrice);

  return (
    <div className={styles.summaryBar}>
      <div className={styles.summaryBarInfo}>
        <span>
          Оплачено: <strong>{formatMoney(paid)} ₽</strong> из{" "}
          <strong>{formatMoney(contract.contractPrice)} ₽</strong>
        </span>
        <span className={percent >= 100 ? styles.cellSuccess : undefined}>
          {percent}%
        </span>
      </div>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressValue}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Этапы ──────────────────────────────────────────────────────────────────

function StagesSection({ contractId }: { contractId?: string | number }) {
  const { data: stages } = useContractStages(contractId);

  if (!stages || stages.length === 0) return null;

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Этапы исполнения</h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>№</th>
            <th>Наименование</th>
            <th>Период</th>
            <th>Сумма, ₽</th>
            <th>Оплачено, ₽</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s: ContractStage) => (
            <tr key={s.id}>
              <td>{s.stageNumber}</td>
              <td>{s.name}</td>
              <td>
                {s.startDate} — {s.endDate}
              </td>
              <td>{formatMoney(s.amount)}</td>
              <td>{formatMoney(s.paidAmount)}</td>
              <td>
                <span
                  className={`${styles.stageBadge} ${styles[`stage_${s.status}`]}`}
                >
                  {STAGE_LABELS[s.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── Платежи ────────────────────────────────────────────────────────────────

function PaymentsSection({ contractId }: { contractId?: string | number }) {
  const { data: payments } = useContractPayments(contractId);

  if (!payments || payments.length === 0) return null;

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Платежи (ст. 34 ч. 12, 13.1)</h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Документ</th>
            <th>Дата</th>
            <th>Тип</th>
            <th>Сумма, ₽</th>
            <th>Статус</th>
            <th>Казначейство</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p: ContractPayment) => (
            <tr key={p.id}>
              <td>{p.paymentDocumentNumber || "—"}</td>
              <td>{p.paymentDate || "—"}</td>
              <td>{PAYMENT_LABELS[p.paymentType]}</td>
              <td>{formatMoney(p.amount)}</td>
              <td>
                <span
                  className={`${styles.payBadge} ${styles[`pay_${p.status}`]}`}
                >
                  {PAYMENT_STATUS_LABELS[p.status]}
                </span>
              </td>
              <td>{p.treasuryExecution ? "Да" : "Нет"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── Неустойки ──────────────────────────────────────────────────────────────

function PenaltiesSection({ contractId }: { contractId?: string | number }) {
  const { data: penalties } = useContractPenalties(contractId);

  if (!penalties || penalties.length === 0) return null;

  const total = totalPenalties(penalties);

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>
        Неустойки (ст. 34 ч. 5) — итого: {formatMoney(total)} ₽
      </h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Выявлено</th>
            <th>Тип</th>
            <th>Нарушение</th>
            <th>Сумма, ₽</th>
            <th>Статус</th>
            <th>Основание</th>
          </tr>
        </thead>
        <tbody>
          {penalties.map((p: ContractPenalty) => (
            <tr key={p.id}>
              <td>{p.detectedDate}</td>
              <td>{PENALTY_LABELS[p.type]}</td>
              <td className={styles.description}>{p.description}</td>
              <td className={styles.cellDanger}>{formatMoney(p.amount)}</td>
              <td>{PENALTY_STATUS_LABELS[p.status]}</td>
              <td className={styles.reference}>{p.reference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── Поставки ───────────────────────────────────────────────────────────────

function DeliveriesSection({ contractId }: { contractId?: string | number }) {
  const { data: deliveries } = useContractDeliveries(contractId);

  if (!deliveries || deliveries.length === 0) return null;

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Поставки и приёмка (ст. 94)</h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Наименование</th>
            <th>Кол-во</th>
            <th>Сумма, ₽</th>
            <th>Акт</th>
            <th>Результат</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d: ContractDelivery) => (
            <tr key={d.id}>
              <td>{d.deliveryDate}</td>
              <td>{d.itemName}</td>
              <td>
                {d.quantity} {d.unit}
              </td>
              <td>{formatMoney(d.amount)}</td>
              <td>
                {d.acceptanceActNumber}
                {d.acceptanceActDate ? ` от ${d.acceptanceActDate}` : ""}
              </td>
              <td>
                <span
                  className={`${styles.deliveryBadge} ${styles[`del_${d.result}`]}`}
                >
                  {DELIVERY_LABELS[d.result]}
                </span>
                {d.notes && <div className={styles.notes}>{d.notes}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
