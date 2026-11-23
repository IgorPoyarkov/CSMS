import { useMemo } from "react";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  useContractCardProjection,
} from "../../services/ContractRegistry/contractCardProjection.api";
import {
  contractCardActAcceptedAt,
  contractCardActKind,
  contractCardActTotal,
  contractCardActSubject,
  contractCardActsTotal,
  contractCardContractNumber,
  contractCardDaysBetween,
  contractCardExecutionPeriod,
  contractCardPaymentAct,
  contractCardPaymentDeadline,
  contractCardPaymentsTotal,
  contractCardRecipientName,
  contractCardSmpRows,
  contractCardSmpTotal,
  type ContractCardAct,
  type ContractCardPayment,
} from "../../services/ContractRegistry/contractCardProjection.schema";
import {
  useContractPenalties,
  useContractPayments,
  useContractStages,
} from "../../services/ContractRegistry/contractRegistry.api";
import {
  type ContractRegistryItem,
  type ContractStage,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  buildAcceptanceActDocument,
  buildPaymentOrderDocument,
  printDocument,
  type ContractDocumentContext,
} from "../../services/ContractRegistry/contractExecutionDocument";
import { useContractSmpRecords } from "../../services/ContractSmp/contractSmp.api";
import {
  contractSmpDocumentTypeLabels,
  contractSmpStatusLabels,
} from "../../services/ContractSmp/contractSmp.schema";
import { useAcceptanceSummary } from "../ContractAcceptance/acceptanceSummary";
import {
  acceptanceKindLabels,
  acceptanceResultLabels,
  acceptanceStatusLabels,
} from "../ContractAcceptance/acceptance.config";
import {
  PAYMENT_LABELS,
  PAYMENT_STATUS_LABELS,
  PENALTY_LABELS,
  PENALTY_STATUS_LABELS,
  STAGE_LABELS,
  formatMoney,
} from "./contractRegistryFormat";
import styles from "./ContractRegistry.module.scss";

/**
 * Исполнение контракта одной хронологией (ст. 94, 95 44-ФЗ).
 *
 * Раньше карточка показывала исполнение четырьмя независимыми таблицами:
 * акты и платёжки из ЕИС, документы электронного актирования, этапы и
 * неустойки. Понять по ним, что произошло раньше и к какому этапу относится,
 * было нельзя: даты лежали в разных блоках, а этапы дублировались в чекпоинтах.
 *
 * Здесь одна линия времени: контракт со своим периодом, внутри — этапы ЕИС
 * (если они есть), внутри этапа или прямо в контракте — факты в порядке
 * календаря: документ о приёмке, платёжное поручение, субдоговор со СМП,
 * неустойка. У контракта без разбивки на этапы те же события стоят в теле
 * контракта — пустого блока «этапы не публикуются» больше нет.
 */

/** Вид факта в хронологии: от него зависит цвет и подпись. */
type TimelineKind = "acceptance" | "payment" | "smp" | "penalty";

interface TimelineItem {
  key: string;
  kind: TimelineKind;
  /** Дата факта в ГГГГ-ММ-ДД: по ней строится порядок; пустая — в конец. */
  date: string;
  title: string;
  note: string;
  /** Отметка о сроке: «в срок» или «позже срока на N дн.». */
  mark?: { text: string; tone: "late" | "ok" };
  amount: number | null;
  /** Печатная форма документа: есть только у фактов, у которых есть XML. */
  print?: { label: string; run: () => void };
  /** Ключ этапа ЕИС, к которому относится факт; null — к контракту целиком. */
  stageKey: string | null;
}

/** Этап со своими фактами: даты, суммы принятого и оплаченного. */
interface TimelineStage {
  key: string;
  stage: ContractStage;
  items: TimelineItem[];
  accepted: number;
  paid: number;
}

/** Подписи видов фактов: по ним читается, что за событие в строке. */
const KIND_LABELS: Record<TimelineKind, string> = {
  acceptance: "Приёмка",
  payment: "Оплата",
  smp: "СМП",
  penalty: "Неустойка",
};

/** Порядок видов при совпадении даты: приёмка → оплата → СМП → неустойка. */
const KIND_ORDER: Record<TimelineKind, number> = {
  acceptance: 0,
  payment: 1,
  smp: 2,
  penalty: 3,
};

/**
 * Дата в ГГГГ-ММ-ДД. В выгрузке ЕИС встречаются и ISO с временем, и
 * ДД.ММ.ГГГГ из ручных записей: без нормализации сортировка хронологии
 * перемешивала бы события.
 */
const isoDate = (value?: string | null): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return dotted ? `${dotted[3]}-${dotted[2]}-${dotted[1]}` : raw.slice(0, 10);
};

/** Дата события в карточке: ДД.ММ.ГГГГ, пустая — «дата не указана». */
const showDate = (value?: string | null): string => {
  const [year, month, day] = isoDate(value).split("-");
  return day && month && year ? `${day}.${month}.${year}` : "";
};

/** Денежная строка хронологии: пустая сумма — прочерк, а не ноль. */
const money = (value: number | null): string =>
  value === null
    ? "—"
    : value.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/** «просрочка 3 дн.» — единый текст для нарушенных сроков. */
const daysLabel = (days: number): string =>
  days === 1 ? "1 день" : days < 5 ? `${days} дня` : `${days} дней`;

/**
 * Печать документа по реквизитам карточки. Попап может быть заблокирован
 * браузером — тогда молчание выглядело бы как «кнопка не работает».
 */
const openDocument = (
  build: () => Parameters<typeof printDocument>[0],
): void => {
  if (!printDocument(build())) {
    alert(
      "Браузер заблокировал окно печати. Разрешите всплывающие окна для этой страницы и повторите.",
    );
  }
};

/** Период строкой: одна граница читается как «до <дата>» / «с <дата>». */
const periodLabel = (start: string, end: string): string => {
  const from = showDate(start);
  const to = showDate(end);
  if (from && to) return `${from} — ${to}`;
  if (to) return `до ${to}`;
  if (from) return `с ${from}`;
  return "срок не указан";
};

interface ContractExecutionTimelineProps {
  contract: ContractRegistryItem;
}

export default function ContractExecutionTimeline({
  contract,
}: ContractExecutionTimelineProps) {
  const contractId = contract.id;
  // Свои документы (электронное актирование, платежи, СМП) и выгрузка ЕИС:
  // ключи запросов общие со сводкой карточки, лишних обращений нет
  const { data: organization } = useCurrentOrganization();
  const organizationId = organization ? String(organization.id) : "";
  const { data: summary } = useAcceptanceSummary(
    organizationId || undefined,
    contractId === undefined ? undefined : String(contractId),
  );
  const { data: projection, isLoading, isError } =
    useContractCardProjection(contractId);
  const { data: stages } = useContractStages(contractId);
  const { data: payments } = useContractPayments(contractId);
  const { data: penalties } = useContractPenalties(contractId);
  const { data: smpRecords } = useContractSmpRecords(contractId);

  // Реквизиты для печатных форм: акт и платёжка печатаются по данным карточки
  // ЕИС, а подрядчика документ добирает из сторон акта или строки платежа
  const documentContext = useMemo<ContractDocumentContext>(() => {
    // Срок исполнения контракта: запасной источник периода для акта, когда в
    // самом акте блок `СвПродПер` не выгружен
    const period = contractCardExecutionPeriod(projection);
    return {
      contractNumber:
        contractCardContractNumber(projection) || projection?.contractNumber,
      contractDate: projection?.General?.ContractDate,
      contractName: projection?.General?.ContractName,
      customerName: projection?.General?.CustomerName,
      customerInn: projection?.General?.CustomerInn,
      customerKpp: projection?.General?.CustomerKpp,
      supplierName: projection?.General?.SupplierName,
      supplierInn: projection?.General?.SupplierInn,
      supplierKpp: projection?.General?.SupplierKpp,
      // Реестровый номер контракта и ИКЗ: обязательные строки печатной формы
      regNumber: projection?.regNumber ?? projection?.RegNumber,
      ikz: projection?.General?.Ikz,
      periodStart: period.start,
      periodEnd: period.end,
      source: projection?.importedAt
        ? `от ${showDate(projection.importedAt)}`
        : null,
    };
  }, [projection]);

  const timeline = useMemo(() => {
    const acts: ContractCardAct[] = projection?.Acts ?? [];
    const decisions = projection?.Decisions ?? [];
    const eisPayments: ContractCardPayment[] = projection?.Payments ?? [];
    const manualPayments = payments ?? [];
    const acceptanceRows = summary?.rows ?? [];

    // Срок исполнения контракта целиком: запись реестра приоритетнее выгрузки
    const eisPeriod = contractCardExecutionPeriod(projection);
    const executionStart = isoDate(
      contract.executionStartDate || eisPeriod.start,
    );
    const executionEnd = isoDate(contract.executionEndDate || eisPeriod.end);

    const orderedStages = [...(stages ?? [])].sort(
      (left, right) => Number(left.stageNumber) - Number(right.stageNumber),
    );
    // Ключи этапов: акт ссылается на этап по sid, а номер этапа ЕИС лежит в
    // TechnicalSid — принимаем оба варианта, иначе акт «повисает» вне этапа
    const stageKeys = new Map<string, string>();
    const stageNodes: TimelineStage[] = orderedStages.map((stage) => {
      const key = (stage.sid || `stage-${stage.stageNumber}`)
        .trim()
        .toLowerCase();
      if (stage.sid) stageKeys.set(stage.sid.trim().toLowerCase(), key);
      stageKeys.set(String(stage.stageNumber), key);
      return { key, stage, items: [], accepted: 0, paid: 0 };
    });

    /** Этап факта: ссылка из документа, а если её нет — дата внутри периода. */
    const resolveStage = (
      actStage: { Sid?: string | null; TechnicalSid?: string | null } | null,
      date: string,
    ): string | null => {
      const bySid = actStage?.Sid
        ? stageKeys.get(actStage.Sid.trim().toLowerCase())
        : undefined;
      const byTechnical = actStage?.TechnicalSid
        ? stageKeys.get(actStage.TechnicalSid.trim().toLowerCase())
        : undefined;
      if (bySid || byTechnical) return bySid ?? byTechnical ?? null;
      const iso = isoDate(date);
      if (!iso) return null;
      const inside = stageNodes.find(({ stage }) => {
        const start = isoDate(stage.startDate);
        const end = isoDate(stage.endDate);
        return (!start || iso >= start) && (!end || iso <= end);
      });
      return inside?.key ?? null;
    };

    const items: TimelineItem[] = [];

    // ─── Приёмка ──────────────────────────────────────────────────────────
    // Свои документы электронного актирования приоритетнее выгрузки: если по
    // контракту работают в нашем контуре, акты ЕИС дублировали бы их в линии
    if (acceptanceRows.length > 0) {
      for (const acceptance of acceptanceRows) {
        const date = isoDate(acceptance.input.documentDate);
        items.push({
          key: `acceptance-${acceptance.id}`,
          kind: "acceptance",
          date,
          title: `Документ о приёмке № ${acceptance.input.documentNumber || "—"}`,
          note: [
            acceptanceKindLabels[acceptance.input.kind],
            acceptanceStatusLabels[acceptance.status],
            acceptance.result ? acceptanceResultLabels[acceptance.result] : "",
          ]
            .filter(Boolean)
            .join(" · "),
          amount: acceptance.totalWithVat,
          stageKey: resolveStage(null, date),
        });
      }
    } else {
      for (const act of acts) {
        const date = isoDate(act.ActDate);
        const stageKey = resolveStage(act.Stage ?? null, date);
        // Приёмка позже срока этапа (или контракта) — нарушение подрядчика
        const stage = stageNodes.find((node) => node.key === stageKey)?.stage;
        const deadline = isoDate(stage?.endDate) || executionEnd;
        const lateDays = deadline
          ? contractCardDaysBetween(deadline, act.ActDate)
          : null;
        items.push({
          key: `act-${act.FileName ?? `${act.ActNumber}-${act.ActDate}`}`,
          kind: "acceptance",
          date,
          title: `Акт № ${act.ActNumber ?? "—"} от ${showDate(act.ActDate) || "—"}`,
          note: [
            contractCardActKind(act).label,
            contractCardActSubject(act),
          ]
            .filter(Boolean)
            .join(" · "),
          mark:
            lateDays !== null && lateDays > 0
              ? { text: `позже срока на ${daysLabel(lateDays)}`, tone: "late" }
              : undefined,
          amount: contractCardActTotal(act),
          print: {
            label: "Акт",
            run: () => openDocument(() => buildAcceptanceActDocument(act, documentContext)),
          },
          stageKey,
        });
      }
    }

    // ─── Оплата ───────────────────────────────────────────────────────────
    // Ручные платёжные поручения приоритетнее выгрузки: у контрактов, которые
    // ведутся в системе, платёжки ЕИС дублировали бы записи реестра
    if (manualPayments.length > 0) {
      for (const payment of manualPayments) {
        const date = isoDate(payment.paymentDate);
        items.push({
          key: `payment-${payment.id}`,
          kind: "payment",
          date,
          title: `Платёж № ${payment.paymentDocumentNumber || "—"}`,
          note: [
            PAYMENT_LABELS[payment.paymentType],
            PAYMENT_STATUS_LABELS[payment.status],
          ]
            .filter(Boolean)
            .join(" · "),
          amount: Number(payment.amount) || null,
          stageKey: resolveStage(null, date),
        });
      }
    } else {
      for (const payment of eisPayments) {
        const act = contractCardPaymentAct(payment, acts);
        const date = isoDate(payment.DocumentDate);
        // Срок оплаты считается от подписания документа о приёмке (ч. 13.1
        // ст. 34): так видно, нарушил ли заказчик срок
        const deadline = act
          ? contractCardPaymentDeadline(
              contractCardActAcceptedAt(act, decisions),
            )
          : null;
        const lateDays = deadline
          ? contractCardDaysBetween(deadline, payment.DocumentDate)
          : null;
        const stageKey = act
          ? resolveStage(act.Stage ?? null, act.ActDate ?? "")
          : resolveStage(null, date);
        items.push({
          key: `payment-${payment.DocumentId ?? payment.FileName ?? payment.DocumentNumber}`,
          kind: "payment",
          date,
          title: `Платёжное поручение № ${payment.DocumentNumber ?? "—"}`,
          note: [
            contractCardRecipientName(payment.RecipientName),
            payment.Purpose ?? "",
          ]
            .filter(Boolean)
            .join(" · "),
          mark:
            lateDays !== null
              ? lateDays > 0
                ? { text: `позже срока на ${daysLabel(lateDays)}`, tone: "late" }
                : { text: "в срок", tone: "ok" }
              : undefined,
          amount: payment.Sum,
          print: {
            label: "Платёжка",
            run: () =>
              openDocument(() => buildPaymentOrderDocument(payment, documentContext)),
          },
          stageKey,
        });
      }
    }

    // ─── Привлечение СМП/СОНО ─────────────────────────────────────────────
    // Свои записи приоритетнее подтаблицы ЕИС: они подтверждены документами
    // субподряда, а выгрузка ЕИС показывает только опубликованные сведения
    if ((smpRecords ?? []).length > 0) {
      for (const record of smpRecords ?? []) {
        const date = isoDate(record.documentDate || record.receivedAt);
        items.push({
          key: `smp-${record.id}`,
          kind: "smp",
          date,
          title: `${contractSmpDocumentTypeLabels[record.documentType]} № ${
            record.documentNumber || "—"
          }`,
          note: [record.supplierName, contractSmpStatusLabels[record.status]]
            .filter(Boolean)
            .join(" · "),
          amount: record.amount ? Number(record.amount) : null,
          stageKey: resolveStage(null, date),
        });
      }
    } else {
      for (const row of contractCardSmpRows(projection?.Smp ?? [])) {
        const date = isoDate(row.ContractDate);
        items.push({
          key: `smp-eis-${row.Inn}-${row.ContractNumber ?? ""}`,
          kind: "smp",
          date,
          title: `Субдоговор со СМП/СОНО № ${row.ContractNumber ?? "—"}`,
          note: [row.Name, row.StatusName].filter(Boolean).join(" · "),
          amount: row.ContractSum,
          stageKey: resolveStage(null, date),
        });
      }
    }

    // ─── Неустойки ────────────────────────────────────────────────────────
    // Неустойка — тоже факт исполнения: она относится к тому этапу, в период
    // которого выявлена, и стоит в хронологии рядом с приёмкой и оплатой
    for (const penalty of penalties ?? []) {
      const date = isoDate(penalty.detectedDate);
      items.push({
        key: `penalty-${penalty.id}`,
        kind: "penalty",
        date,
        title: `Неустойка: ${PENALTY_LABELS[penalty.type] ?? "прочее"}`,
        note: [
          penalty.description,
          PENALTY_STATUS_LABELS[penalty.status],
          penalty.reference ?? "",
        ]
          .filter(Boolean)
          .join(" · "),
        amount: Number(penalty.amount) || null,
        stageKey: resolveStage(null, date),
      });
    }

    // Порядок чтения: дата, а при равных датах — приёмка, оплата, СМП,
    // неустойка. События без даты уходят в конец: их место в календаре
    // неизвестно, и ставить их первыми было бы неверно
    const compare = (left: TimelineItem, right: TimelineItem): number => {
      if (left.date && right.date && left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }
      if (left.date && !right.date) return -1;
      if (!left.date && right.date) return 1;
      return KIND_ORDER[left.kind] - KIND_ORDER[right.kind];
    };
    items.sort(compare);

    // Раскладка по этапам: этап берёт факты своего периода, остальное
    // остаётся у контракта целиком — ничего не теряется и не дублируется
    const contractItems: TimelineItem[] = [];
    for (const item of items) {
      const node = item.stageKey
        ? stageNodes.find((entry) => entry.key === item.stageKey)
        : undefined;
      if (!node) {
        contractItems.push(item);
        continue;
      }
      node.items.push(item);
      if (item.kind === "acceptance") node.accepted += item.amount ?? 0;
      if (item.kind === "payment") node.paid += item.amount ?? 0;
    }
    for (const node of stageNodes) node.items.sort(compare);

    const usesManualAcceptance = acceptanceRows.length > 0;
    const usesManualPayments = manualPayments.length > 0;
    return {
      executionStart,
      executionEnd,
      stageNodes,
      contractItems,
      acceptedTotal: usesManualAcceptance
        ? (summary?.acceptedTotal ?? 0)
        : contractCardActsTotal(acts),
      acceptedCount: usesManualAcceptance
        ? (summary?.acceptedCount ?? 0)
        : acts.length,
      paidTotal: usesManualPayments
        ? manualPayments.reduce(
            (sum, payment) => sum + (Number(payment.amount) || 0),
            0,
          )
        : contractCardPaymentsTotal(eisPayments),
      paymentCount: usesManualPayments
        ? manualPayments.length
        : eisPayments.length,
      smpTotal: (smpRecords ?? []).length
        ? (smpRecords ?? []).reduce(
            (sum, record) => sum + (Number(record.amount) || 0),
            0,
          )
        : contractCardSmpTotal(contractCardSmpRows(projection?.Smp ?? [])),
      hasItems: items.length > 0,
    };
  }, [
    projection,
    stages,
    payments,
    penalties,
    smpRecords,
    summary,
    contract.executionStartDate,
    contract.executionEndDate,
    documentContext,
  ]);

  // Пока идёт первый запрос или адаптер недоступен, секцию не рисуем: пустое
  // состояние ниже — про отсутствие выгрузки, а не про сетевую ошибку
  if (!contractId || isLoading || isError) return null;

  const unpaidTotal = Math.max(0, timeline.acceptedTotal - timeline.paidTotal);

  return (
    <section id="contract-execution" className={styles.subSection}>
      <h4 className={styles.subTitle}>Исполнение контракта</h4>

      {/* Сводка: период, цена и что уже закрыто. Якоря оставлены для плиток
          сводки карточки — оплата и приёмка ведут к своим цифрам */}
      <div className={styles.projectionSummary}>
        <span className={styles.projectionChip}>
          Период:{" "}
          {periodLabel(timeline.executionStart, timeline.executionEnd)}
        </span>
        <span className={styles.projectionChip}>
          Цена: {formatMoney(contract.contractPrice)} ₽
        </span>
        {/* Идентификаторы чипов не повторяют якоря рабочих секций ниже:
            сводка карточки ведёт в рабочую приёмку и платежи, а не сюда */}
        <span
          id="contract-acceptance-facts"
          className={styles.projectionChip}
        >
          Принято: {timeline.acceptedCount} на {money(timeline.acceptedTotal)} ₽
        </span>
        <span id="contract-payments-facts" className={styles.projectionChip}>
          Оплачено: {timeline.paymentCount} на {money(timeline.paidTotal)} ₽
        </span>
        {timeline.smpTotal > 0 && (
          <span className={styles.projectionChip}>
            СМП: {money(timeline.smpTotal)} ₽
          </span>
        )}
        {unpaidTotal > 0 && (
          <span
            className={`${styles.projectionChip} ${styles.projectionChipAlert}`}
          >
            Принято без оплаты: {money(unpaidTotal)} ₽
          </span>
        )}
      </div>

      {!projection ? (
        <p className={styles.projectionEmpty}>
          Выгрузки карточки ЕИС по этому контракту нет: фактических актов
          приёмки и платёжных поручений в базе нет. Выгрузку снимает воркер
          eis-parser — пока её нет, факты исполнения в хронологию не попадают.
          Ручного учёта платежей в карточке нет: платёжные документы подписаны в
          ЕИС, дублировать их ручным вводом нельзя.
        </p>
      ) : (
        <div className={styles.timeline}>
          <div className={styles.timelineNode}>
            <div className={styles.timelineHead}>
              <span className={styles.timelineBullet} aria-hidden="true" />
              <div className={styles.timelineHeadBody}>
                <span className={styles.timelineTitle}>
                  Контракт № {contract.contractNumber}
                </span>
                <span className={styles.timelineNote}>
                  Срок исполнения:{" "}
                  {periodLabel(timeline.executionStart, timeline.executionEnd)}
                  {contract.contractDate
                    ? ` · заключён ${showDate(contract.contractDate)}`
                    : ""}
                </span>
              </div>
              <span className={styles.timelineSum}>
                {formatMoney(contract.contractPrice)} ₽
              </span>
            </div>

            <div className={styles.timelineBody}>
              {timeline.stageNodes.map((node) => (
                <div key={node.key} className={styles.timelineStage}>
                  <div className={styles.timelineStageHead}>
                    <span className={styles.timelineStageIndex}>
                      {node.stage.stageNumber}
                    </span>
                    <div className={styles.timelineHeadBody}>
                      <span className={styles.timelineStageName}>
                        {node.stage.name}
                      </span>
                      <span className={styles.timelineNote}>
                        {periodLabel(
                          isoDate(node.stage.startDate),
                          isoDate(node.stage.endDate),
                        )}
                        {node.stage.amount
                          ? ` · ${formatMoney(node.stage.amount)} ₽`
                          : ""}
                        {node.paid > 0
                          ? ` · оплачено ${money(node.paid)} ₽`
                          : ""}
                      </span>
                    </div>
                    <span
                      className={`${styles.stageBadge} ${
                        styles[`stage_${node.stage.status}`]
                      }`}
                    >
                      {STAGE_LABELS[node.stage.status]}
                    </span>
                  </div>
                  <TimelineEvents
                    items={node.items}
                    empty="Приёмок, оплат и неустоек по этапу пока нет"
                  />
                </div>
              ))}

              {timeline.contractItems.length > 0 && (
                <div className={styles.timelineStage}>
                  {timeline.stageNodes.length > 0 && (
                    <div className={styles.timelineStageHead}>
                      <span
                        className={styles.timelineStageIndex}
                        aria-hidden="true"
                      >
                        •
                      </span>
                      <div className={styles.timelineHeadBody}>
                        <span className={styles.timelineStageName}>
                          Вне этапов
                        </span>
                        <span className={styles.timelineNote}>
                          факты, не попавшие в период ни одного этапа
                        </span>
                      </div>
                    </div>
                  )}
                  <TimelineEvents items={timeline.contractItems} />
                </div>
              )}

              {!timeline.hasItems && (
                <p className={styles.timelineEmpty}>
                  В выгрузке карточки ЕИС нет документов о приёмке, платёжных
                  поручений, сведений о СМП и неустоек по этому контракту.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Подвал хронологии: только ссылка на карточку ЕИС. Счётчики
          «выгрузка от … · сообщений ЭДО» убраны: дата выгрузки ничего не
          решает для работы, а число сообщений ЭДО в проекции всегда 0 */}
      {projection?.eisUrl && (
        <div className={styles.projectionMeta}>
          <a
            className={styles.projectionLink}
            href={projection.eisUrl}
            target="_blank"
            rel="noreferrer"
          >
            Карточка контракта в ЕИС
          </a>
        </div>
      )}
    </section>
  );
}

/**
 * Факты хронологии одного этапа (или контракта целиком).
 *
 * Строка — это документ: дата, вид, номер с пояснением, сумма и печатная форма,
 * если она есть. Пустой список этапа не исчезает: «по этапу пока нет приёмок»
 * — это тоже сведения, а исчезнувшая строка читалась бы как потеря данных.
 */
function TimelineEvents({
  items,
  empty,
}: {
  items: TimelineItem[];
  empty?: string;
}) {
  if (items.length === 0) {
    return empty ? <p className={styles.timelineEmpty}>{empty}</p> : null;
  }

  return (
    <ol className={styles.timelineEvents}>
      {items.map((item) => (
        <li key={item.key} className={styles.timelineEvent}>
          <span className={styles.timelineEventDate}>
            {showDate(item.date) || "дата не указана"}
          </span>
          <span
            className={`${styles.timelineEventKind} ${
              styles[`timeline_${item.kind}`]
            }`}
          >
            {KIND_LABELS[item.kind]}
          </span>
          <span className={styles.timelineEventBody}>
            <span className={styles.timelineEventTitle}>{item.title}</span>
            {item.note && (
              <span className={styles.projectionNote}>{item.note}</span>
            )}
            {item.mark && (
              <span
                className={`${styles.projectionNote} ${
                  item.mark.tone === "late"
                    ? styles.projectionLate
                    : styles.projectionOk
                }`}
              >
                {item.mark.text}
              </span>
            )}
          </span>
          <span
            className={`${styles.timelineEventAmount} ${
              item.kind === "penalty" ? styles.cellDanger : ""
            }`}
          >
            {item.amount === null ? "—" : `${money(item.amount)} ₽`}
          </span>
          <span className={styles.timelineEventAction}>
            {item.print && (
              <button
                type="button"
                className={styles.projectionDocButton}
                onClick={item.print.run}
                title="Печатная форма по реквизитам документа"
              >
                {item.print.label}
              </button>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

