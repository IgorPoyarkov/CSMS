import type { BaseOrganization } from "../Organization/organization.schema";
import type { BaseEmployee } from "../StaffingTable/StaffingTable.schema";
import type { ContractService } from "../ContractService/contractService.schema";
import type { Procurement } from "../Procurements/procurement.schema";
import type { NoticeInfoFormValues } from "../Procurements/noticeInfo.schema";
import type { PurchasePlan, PurchasePlanPosition } from "../PurchasePlan/purchasePlan.schema";
import type { PurchaseNote } from "../PurchaseNote/purchaseNote.schema";
import {
  evaluateBids,
  procedureKindLabels,
  type BidEvaluation,
} from "../BidEvaluation/bidEvaluation.schema";

/**
 * Генератор типовых форм документов закупок по 44-ФЗ на основе данных,
 * уже заполненных в карточках закупок, планах-графиках, СЗ, извещениях,
 * контрактной службе и оценке заявок.
 */

export type ProcurementDocumentType =
  | "commission_order"
  | "bid_review_protocol"
  | "procurement_launch_order";

export const PROCUREMENT_DOC_TYPE_LABELS: Record<
  ProcurementDocumentType,
  string
> = {
  commission_order: "Приказ о создании комиссии по осуществлению закупок",
  bid_review_protocol: "Протокол рассмотрения и оценки заявок участников",
  procurement_launch_order: "Приказ о проведении закупки",
};

export type CommissionRole =
  | "chairman"
  | "deputy_chairman"
  | "secretary"
  | "member";

export const COMMISSION_ROLE_LABELS: Record<CommissionRole, string> = {
  chairman: "Председатель комиссии",
  deputy_chairman: "Заместитель председателя",
  secretary: "Секретарь комиссии",
  member: "Член комиссии",
};

export interface CommissionMemberInput {
  id: string;
  fullName: string;
  position: string;
  role: CommissionRole;
  present?: boolean;
}

export interface BidProtocolRowInput {
  id: string;
  regNumber: string;
  participantName: string;
  inn?: string;
  offeredPrice?: string;
  score?: number;
  rank?: number;
  decision: "admitted" | "rejected";
  rejectionReason?: string;
}

export interface DocumentGeneratorDraftInput {
  docType: ProcurementDocumentType;
  documentNumber: string;
  documentDate: string;
  city: string;
  meetingVenue: string;
  commissionKind: string;
  commissionMembers: CommissionMemberInput[];
  bidRows: BidProtocolRowInput[];
  responsiblePersonName: string;
  responsiblePersonPosition: string;
  directorName: string;
  directorPosition: string;
  additionalClauses: string;
}

export interface ProcurementContextBundle {
  procurement: Procurement;
  organization?: BaseOrganization | null;
  plan?: PurchasePlan | null;
  position?: PurchasePlanPosition | null;
  purchaseNote?: PurchaseNote | null;
  notice?: NoticeInfoFormValues | null;
  bidEvaluation?: BidEvaluation | null;
  contractService?: ContractService | null;
  employees: BaseEmployee[];
}

export interface GeneratedDocumentSection {
  id: string;
  heading: string;
  paragraphs: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface GeneratedProcurementDocument {
  docType: ProcurementDocumentType;
  fileBaseName: string;
  organizationHeader: string;
  organizationMeta: string;
  title: string;
  subtitle: string;
  docNumber: string;
  docDateRu: string;
  city: string;
  sections: GeneratedDocumentSection[];
  signatures: { role: string; person: string; mark: string }[];
  fullPlainText: string;
  sourceSummary: {
    ikz: string;
    noticeNumber: string;
    nmckFormatted: string;
    procurementType: string;
    okpd2: string;
    kbk: string;
    linkedEntities: string[];
  };
}

const formatIsoToRu = (iso?: string): string => {
  if (!iso) return "«___» _________ 20__ г.";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
};

const formatMoneyRu = (raw?: string | number | null): string => {
  if (raw === undefined || raw === null || raw === "") return "—";
  const num = Number(raw);
  if (!Number.isFinite(num)) return String(raw);
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)} руб.`;
};

const employeeFullName = (emp?: BaseEmployee): string => {
  if (!emp?.employee) return "";
  const { surname, name, patronymic } = emp.employee;
  return [surname, name, patronymic].filter(Boolean).join(" ").trim();
};

const detectCityFromAddress = (address?: string): string => {
  if (!address) return "г. Белгород";
  const cityMatch = /(?:г\.|город)\s*([А-ЯЁ][а-яё-]+)/i.exec(address);
  return cityMatch ? `г. ${cityMatch[1]}` : "г. Белгород";
};

export const matchProcurementContext = (params: {
  procurement: Procurement;
  organization?: BaseOrganization | null;
  plans: PurchasePlan[];
  purchaseNotes: PurchaseNote[];
  notices: NoticeInfoFormValues[];
  bidEvaluations: BidEvaluation[];
  contractService?: ContractService | null;
  employees: BaseEmployee[];
}): ProcurementContextBundle => {
  const {
    procurement,
    organization,
    plans,
    purchaseNotes,
    notices,
    bidEvaluations,
    contractService,
    employees,
  } = params;

  let matchedPlan: PurchasePlan | null = null;
  let matchedPosition: PurchasePlanPosition | null = null;

  for (const plan of plans) {
    const pos = (plan.positions ?? []).find(
      (p) => p.identificationCode === procurement.ikz,
    );
    if (pos) {
      matchedPlan = plan;
      matchedPosition = pos;
      break;
    }
  }

  const matchedNote =
    purchaseNotes.find(
      (n) =>
        (matchedPosition?.id && String(n.positionId) === String(matchedPosition.id)) ||
        (n.subject &&
          procurement.name &&
          n.subject.toLowerCase().trim() === procurement.name.toLowerCase().trim()),
    ) ?? null;

  const matchedNotice =
    notices.find(
      (notice) =>
        (notice.ikz || notice.generalInfo?.ikz) === procurement.ikz ||
        (procurement.noticeNumber &&
          notice.generalInfo?.noticeNumber === procurement.noticeNumber),
    ) ?? null;

  const matchedEval =
    bidEvaluations.find(
      (ev) =>
        String(ev.procurementId ?? "") === String(procurement.id) ||
        (ev.objectName &&
          ev.objectName.toLowerCase().includes(procurement.name.slice(0, 24).toLowerCase())),
    ) ?? null;

  return {
    procurement,
    organization,
    plan: matchedPlan,
    position: matchedPosition,
    purchaseNote: matchedNote,
    notice: matchedNotice,
    bidEvaluation: matchedEval,
    contractService,
    employees,
  };
};

export const buildInitialGeneratorDraft = (
  bundle: ProcurementContextBundle,
  docType: ProcurementDocumentType,
): DocumentGeneratorDraftInput => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { organization, contractService, employees, bidEvaluation, procurement } =
    bundle;

  // Руководитель заказчика из штата («Руководство») или первый подходящий руководитель
  const directorEmp =
    employees.find((e) =>
      (e.position ?? "").toLowerCase().match(/директор|начальник|главный врач|руководитель|глава/),
    ) ?? employees[0];

  const directorName = employeeFullName(directorEmp) || "Иванов И. И.";
  const directorPosition =
    directorEmp?.position || "Руководитель заказчика";

  // Комиссия из состава контрактной службы + штатного расписания (минимум 3 чел. по ч. 3 ст. 39 44-ФЗ)
  const commissionMembers: CommissionMemberInput[] = [];
  const usedNames = new Set<string>();

  if (contractService?.head?.employeeFullName) {
    commissionMembers.push({
      id: "cm-head",
      fullName: contractService.head.employeeFullName,
      position: contractService.head.position || "Руководитель контрактной службы",
      role: "chairman",
      present: true,
    });
    usedNames.add(contractService.head.employeeFullName);
  } else if (contractService?.contractManager?.employeeFullName) {
    commissionMembers.push({
      id: "cm-mgr",
      fullName: contractService.contractManager.employeeFullName,
      position: contractService.contractManager.position || "Контрактный управляющий",
      role: "chairman",
      present: true,
    });
    usedNames.add(contractService.contractManager.employeeFullName);
  }

  if (contractService?.members?.length) {
    contractService.members.slice(0, 4).forEach((m, idx) => {
      const name = m.employeeFullName || `Специалист ${idx + 1}`;
      if (usedNames.has(name)) return;
      usedNames.add(name);
      commissionMembers.push({
        id: `cm-cs-${idx}`,
        fullName: name,
        position: m.position || "Член контрактной службы",
        role: idx === 0 ? "secretary" : "member",
        present: true,
      });
    });
  }

  for (const emp of employees) {
    if (commissionMembers.length >= 5) break;
    const name = employeeFullName(emp);
    if (!name || usedNames.has(name)) continue;
    usedNames.add(name);
    const role: CommissionRole =
      commissionMembers.length === 0
        ? "chairman"
        : commissionMembers.length === 1
          ? "secretary"
          : "member";
    commissionMembers.push({
      id: `cm-emp-${emp.id ?? commissionMembers.length}`,
      fullName: name,
      position: emp.position || "Специалист заказчика",
      role,
      present: true,
    });
  }

  // Заявки из BidEvaluation (если есть) или стартовый шаблон участника
  let bidRows: BidProtocolRowInput[] = [];
  if (bidEvaluation && bidEvaluation.bids.length > 0) {
    const evaluated = evaluateBids(bidEvaluation);
    bidRows = evaluated.bids.map((b, idx) => ({
      id: String(b.id ?? idx + 1),
      regNumber: `Заявка № ${idx + 1}`,
      participantName: b.participantName,
      offeredPrice: b.price ? String(b.price) : String(procurement.nmck),
      score: b.totalScore,
      rank: b.rank,
      decision: "admitted",
      rejectionReason: "",
    }));
  } else {
    bidRows = [
      {
        id: "bid-1",
        regNumber: "Заявка № 1",
        participantName: "ООО «Поставщик-1»",
        inn: "4632000001",
        offeredPrice: String(Math.round(procurement.nmck * 0.96 * 100) / 100),
        rank: 1,
        decision: "admitted",
        rejectionReason: "",
      },
      {
        id: "bid-2",
        regNumber: "Заявка № 2",
        participantName: "АО «Подрядчик-2»",
        inn: "3123000002",
        offeredPrice: String(Math.round(procurement.nmck * 0.985 * 100) / 100),
        rank: 2,
        decision: "admitted",
        rejectionReason: "",
      },
    ];
  }

  const responsible = commissionMembers[0];
  const shortProcNum = String(procurement.id).padStart(2, "0");

  return {
    docType,
    documentNumber:
      docType === "bid_review_protocol"
        ? `ПР-${shortProcNum}/${todayIso.slice(0, 4)}`
        : `${shortProcNum}-З/${todayIso.slice(0, 4)}`,
    documentDate: todayIso,
    city: detectCityFromAddress(organization?.legalAddress || organization?.postalAddress),
    meetingVenue:
      organization?.legalAddress ||
      organization?.postalAddress ||
      "Зал заседаний заказчика",
    commissionKind: "Единая комиссия по осуществлению закупок",
    commissionMembers,
    bidRows,
    responsiblePersonName: responsible?.fullName || directorName,
    responsiblePersonPosition: responsible?.position || directorPosition,
    directorName,
    directorPosition,
    additionalClauses: "",
  };
};

export const generateProcurementDocument = (
  bundle: ProcurementContextBundle,
  draft: DocumentGeneratorDraftInput,
): GeneratedProcurementDocument => {
  const { procurement, organization, position, purchaseNote, notice, bidEvaluation } =
    bundle;

  const orgName =
    organization?.fullName ||
    organization?.shortName ||
    "Государственный (муниципальный) заказчик";
  const orgMeta = [
    organization?.inn ? `ИНН ${organization.inn}` : "",
    organization?.kpp ? `КПП ${organization.kpp}` : "",
    organization?.ogrn ? `ОГРН ${organization.ogrn}` : "",
    organization?.legalAddress || "",
  ]
    .filter(Boolean)
    .join(" · ");

  const docDateRu = formatIsoToRu(draft.documentDate);
  const nmckFormatted = formatMoneyRu(procurement.nmck);
  const noticeNumber =
    procurement.noticeNumber ||
    notice?.generalInfo?.noticeNumber ||
    "не присвоен";
  const okpd2 =
    position?.okpd2Code ||
    purchaseNote?.okpd2Code ||
    bidEvaluation?.okpd2Codes?.join(", ") ||
    "—";
  const kbk = procurement.kbk || position?.kbk || "не указан";

  const linkedEntities: string[] = ["Карточка закупки"];
  if (bundle.plan) linkedEntities.push(`План-график № ${bundle.plan.planNumber || bundle.plan.id}`);
  if (purchaseNote) linkedEntities.push(`СЗ № ${purchaseNote.noteNumber || purchaseNote.id}`);
  if (notice) linkedEntities.push("Сведения извещения");
  if (bidEvaluation) linkedEntities.push(`Оценка заявок (${procedureKindLabels[bidEvaluation.procedureKind]})`);
  if (bundle.contractService) linkedEntities.push("Состав контрактной службы");

  const sections: GeneratedDocumentSection[] = [];
  let title = "";
  let subtitle = "";
  const signatures: { role: string; person: string; mark: string }[] = [];

  if (draft.docType === "commission_order") {
    title = `ПРИКАЗ № ${draft.documentNumber || "б/н"}`;
    subtitle = `О создании ${draft.commissionKind.toLowerCase()} и утверждении её состава`;

    const hasValidQuorumSize = draft.commissionMembers.length >= 3;

    sections.push({
      id: "preamble",
      heading: "Преамбула и правовое основание",
      paragraphs: [
        `В соответствии со статьёй 39 Федерального закона от 05.04.2013 № 44-ФЗ «О контрактной системе в сфере закупок товаров, работ, услуг для обеспечения государственных и муниципальных нужд», Приказом Минфина России от 31.07.2020 № 158н в целях определения поставщиков (подрядчиков, исполнителей) при осуществлении закупки:`,
        `Объект закупки: ${procurement.name}.`,
        `Идентификационный код закупки (ИКЗ): ${procurement.ikz}. Способ определения поставщика: ${procurement.procurementType}. Начальная (максимальная) цена контракта (НМЦК): ${nmckFormatted}. Извещение № ${noticeNumber}. Код ОКПД2: ${okpd2}. КБК: ${kbk}.`,
      ],
    });

    sections.push({
      id: "order-body",
      heading: "ПРИКАЗЫВАЮ:",
      paragraphs: [
        `1. Создать ${draft.commissionKind.toLowerCase()} (далее — Комиссия) численностью ${draft.commissionMembers.length} чел.${hasValidQuorumSize ? " (соответствует требованию ч. 3 ст. 39 Закона № 44-ФЗ — не менее 3 человек)" : " (ВНИМАНИЕ: согласно ч. 3 ст. 39 Закона № 44-ФЗ численность комиссии должна составлять не менее 3 человек)"} в следующем составе:`,
      ],
      table: {
        headers: ["№", "ФИО члена комиссии", "Должность", "Статус в комиссии"],
        rows: draft.commissionMembers.map((m, i) => [
          String(i + 1),
          m.fullName,
          m.position,
          COMMISSION_ROLE_LABELS[m.role],
        ]),
      },
    });

    sections.push({
      id: "powers",
      heading: "Полномочия, ограничения и порядок работы комиссии",
      paragraphs: [
        "2. Комиссии при рассмотрении и оценке заявок руководствоваться требованиями ст. 31 (единые и дополнительные требования к участникам закупок, отсутствие сведений в РНП), ст. 39, ст. 48–50 Закона № 44-ФЗ, Постановлением Правительства РФ от 31.12.2021 № 2604 (при проведении конкурса), а также мерами национального режима по ст. 14 Закона № 44-ФЗ и Постановлению Правительства РФ от 23.12.2024 № 1875.",
        "3. Заседание Комиссии считается правомочным, если на нём присутствует не менее чем пятьдесят процентов от общего числа её членов (ч. 8 ст. 39 Закона № 44-ФЗ). Принятие решения членами Комиссии путём проведения заочного голосования, а также делегирование ими своих полномочий иным лицам не допускается.",
        "4. Члены Комиссии не вправе состоять в браке или близком родстве с участниками закупки, являться их учредителями, руководителями или работниками и обязаны незамедлительно сообщить об отсутствии конфликта интересов (ч. 6 ст. 39 Закона № 44-ФЗ).",
        "5. Секретарю Комиссии обеспечить оформление и подписание протоколов усиленными квалифицированными электронными подписями в соответствии с Федеральным законом от 06.04.2011 № 63-ФЗ и размещение их в ЕИС в установленные Законом № 44-ФЗ сроки.",
        ...(draft.additionalClauses.trim() ? [`6. ${draft.additionalClauses.trim()}`] : []),
      ],
    });

    signatures.push({
      role: draft.directorPosition,
      person: draft.directorName,
      mark: "________________ / подпись /",
    });
    draft.commissionMembers.forEach((m) => {
      signatures.push({
        role: `Ознакомлен (${COMMISSION_ROLE_LABELS[m.role]})`,
        person: m.fullName,
        mark: "________________ / дата /",
      });
    });
  } else if (draft.docType === "bid_review_protocol") {
    title = `ПРОТОКОЛ № ${draft.documentNumber || "б/н"}`;
    subtitle = "рассмотрения и оценки заявок на участие в закупке";

    const presentMembers = draft.commissionMembers.filter((m) => m.present !== false);
    const totalMembers = draft.commissionMembers.length;
    const quorumOk = totalMembers > 0 && presentMembers.length * 2 >= totalMembers;
    const admittedCount = draft.bidRows.filter((b) => b.decision === "admitted").length;
    const rejectedCount = draft.bidRows.length - admittedCount;
    const winner =
      [...draft.bidRows]
        .filter((b) => b.decision === "admitted")
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))[0] ?? null;

    sections.push({
      id: "general",
      heading: "1. Сведения о закупке и заказчике",
      paragraphs: [
        `Заказчик: ${orgName}${orgMeta ? ` (${orgMeta})` : ""}.`,
        `Дата и место составления протокола: ${docDateRu}, ${draft.meetingVenue}.`,
        `Наименование объекта закупки: ${procurement.name}.`,
        `ИКЗ: ${procurement.ikz}. Номер извещения в ЕИС: ${noticeNumber}. Способ определения поставщика: ${procurement.procurementType}. НМЦК: ${nmckFormatted}. Код ОКПД2: ${okpd2}.`,
        ...(purchaseNote?.advantageSmpPart3Art30
          ? ["Преимущество для СМП и СОНКО установлено в соответствии со ст. 30 Закона № 44-ФЗ."]
          : []),
      ],
    });

    sections.push({
      id: "commission",
      heading: "2. Состав комиссии и кворум (ст. 39 Закона № 44-ФЗ)",
      paragraphs: [
        `Вид комиссии: ${draft.commissionKind}. Всего членов комиссии: ${totalMembers}. Присутствует на заседании: ${presentMembers.length}. Кворум (не менее 50% состава по ч. 8 ст. 39 44-ФЗ): ${quorumOk ? "имеется, комиссия правомочна принимать решения" : "ОТСУТСТВУЕТ — решение неправомочно"}.`,
        "Члены комиссии подтверждают отсутствие конфликта интересов с участниками закупки в соответствии с ч. 6 ст. 39 Закона № 44-ФЗ.",
      ],
      table: {
        headers: ["ФИО", "Должность", "Роль в комиссии", "Присутствие"],
        rows: draft.commissionMembers.map((m) => [
          m.fullName,
          m.position,
          COMMISSION_ROLE_LABELS[m.role],
          m.present !== false ? "Присутствует" : "Отсутствует",
        ]),
      },
    });

    sections.push({
      id: "bids-review",
      heading: "3. Результаты рассмотрения и оценки заявок (ст. 48–50 44-ФЗ, ПП РФ № 2604)",
      paragraphs: [
        `Всего подано заявок: ${draft.bidRows.length}. Признаны соответствующими требованиям извещения и ст. 31 Закона № 44-ФЗ (отсутствие в РНП, соблюдение ПП РФ № 1875): ${admittedCount}. Отклонено заявок: ${rejectedCount}.`,
      ],
      table: {
        headers: [
          "Рег. №",
          "Участник закупки",
          "Цена предложения",
          "Балл / Место",
          "Решение комиссии",
        ],
        rows: draft.bidRows.map((row) => [
          row.regNumber,
          `${row.participantName}${row.inn ? ` (ИНН ${row.inn})` : ""}`,
          formatMoneyRu(row.offeredPrice),
          row.decision === "admitted"
            ? `${row.score !== undefined ? `${row.score} б. · ` : ""}${row.rank ? `${row.rank} место` : "—"}`
            : "—",
          row.decision === "admitted"
            ? "Соответствует требованиям"
            : `Отклонена (${row.rejectionReason || "ч. 12 ст. 48 44-ФЗ"})`,
        ]),
      },
    });

    sections.push({
      id: "decision",
      heading: "4. Итоговое решение комиссии",
      paragraphs: [
        winner
          ? `Признать победителем закупки участника ${winner.participantName} (${winner.regNumber}) с ценой контракта ${formatMoneyRu(winner.offeredPrice)}. Заказчику направить проект контракта в сроки, установленные ст. 51 Закона № 44-ФЗ, и обеспечить размещение сведений в реестре контрактов (ч. 3 ст. 103 Закона № 44-ФЗ).`
          : "По результатам рассмотрения заявок победитель не определён (закупка признаётся несостоявшейся по ст. 52 Закона № 44-ФЗ).",
        "Настоящий протокол подписан усиленными квалифицированными электронными подписями (Закон № 63-ФЗ) всеми присутствующими членами комиссии и подлежит направлению оператору электронной площадки и размещению в ЕИС.",
        ...(draft.additionalClauses.trim() ? [draft.additionalClauses.trim()] : []),
      ],
    });

    presentMembers.forEach((m) => {
      signatures.push({
        role: COMMISSION_ROLE_LABELS[m.role],
        person: m.fullName,
        mark: "Подписано УКЭП / «ЗА»",
      });
    });
  } else {
    // procurement_launch_order
    title = `ПРИКАЗ № ${draft.documentNumber || "б/н"}`;
    subtitle = "О проведении закупки и утверждении условий извещения";

    sections.push({
      id: "basis",
      heading: "Основание и характеристики закупки",
      paragraphs: [
        `В соответствии с планом-графиком закупок${bundle.plan ? ` № ${bundle.plan.planNumber || bundle.plan.id}` : ""}, положениями Федерального закона от 05.04.2013 № 44-ФЗ, Приказа Минфина России от 31.07.2020 № 158н и Постановления Правительства РФ от 08.02.2017 № 145:`,
        `Предмет закупки: ${procurement.name}.`,
        `ИКЗ: ${procurement.ikz}. Способ определения поставщика: ${procurement.procurementType}. НМЦК: ${nmckFormatted} (обоснование по ст. 22 44-ФЗ и Приказу МЭР № 567). КБК: ${kbk}. ОКПД2: ${okpd2}.`,
      ],
    });

    sections.push({
      id: "directives",
      heading: "ПРИКАЗЫВАЮ:",
      paragraphs: [
        `1. Провести процедуру определения поставщика (подрядчика, исполнителя) способом «${procurement.procurementType}» с НМЦК ${nmckFormatted}.`,
        `2. Назначить ответственным должностным лицом контрактной службы (контрактным управляющим) за подготовку и размещение извещения в ЕИС: ${draft.responsiblePersonName} (${draft.responsiblePersonPosition}).`,
        `3. Утвердить описание объекта закупки (ст. 33 44-ФЗ), обоснование НМЦК (ст. 22 44-ФЗ), проект контракта с учётом сроков оплаты по ч. 13.1 ст. 34 44-ФЗ (не более 7 рабочих дней, при казначейском сопровождении — 10 рабочих дней) и требований к участникам по ст. 31 44-ФЗ.`,
        `4. Обеспечить применение национального режима (ст. 14 44-ФЗ, ПП РФ № 1875) и условий привлечения СМП/СОНКО (ст. 30 44-ФЗ, ПП РФ № 1466).`,
        ...(draft.additionalClauses.trim() ? [`5. ${draft.additionalClauses.trim()}`] : []),
      ],
    });

    signatures.push({
      role: draft.directorPosition,
      person: draft.directorName,
      mark: "________________ / подпись /",
    });
    signatures.push({
      role: "Ответственный (КС)",
      person: draft.responsiblePersonName,
      mark: "________________ / дата /",
    });
  }

  const plainParts: string[] = [
    orgName,
    orgMeta,
    `${title}\n${subtitle}`,
    `${draft.city}, ${docDateRu}`,
  ];

  sections.forEach((sec) => {
    plainParts.push(sec.heading);
    sec.paragraphs.forEach((p) => plainParts.push(p));
    if (sec.table) {
      plainParts.push(sec.table.headers.join(" | "));
      sec.table.rows.forEach((r) => plainParts.push(r.join(" | ")));
    }
  });

  plainParts.push(
    "Подписи:\n" +
      signatures.map((s) => `${s.role}: ${s.person} — ${s.mark}`).join("\n"),
  );

  return {
    docType: draft.docType,
    fileBaseName: `${draft.docType}_${procurement.ikz.slice(0, 12)}_${draft.documentDate}`,
    organizationHeader: orgName,
    organizationMeta: orgMeta,
    title,
    subtitle,
    docNumber: draft.documentNumber,
    docDateRu,
    city: draft.city,
    sections,
    signatures,
    fullPlainText: plainParts.filter(Boolean).join("\n\n"),
    sourceSummary: {
      ikz: procurement.ikz,
      noticeNumber,
      nmckFormatted,
      procurementType: procurement.procurementType,
      okpd2,
      kbk,
      linkedEntities,
    },
  };
};
