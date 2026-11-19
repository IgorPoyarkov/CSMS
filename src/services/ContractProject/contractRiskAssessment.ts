import type { ContractProject } from "./contractProject.schema";
import type { PurchaseNote } from "../PurchaseNote/purchaseNote.schema";
import type { NoticeInfo } from "../Procurements/noticeInfo.schema";
import { findOkpd2ByCode, type Okpd2Ref } from "../Okpd2Ref/okpd2Ref.api";

/**
 * Автоматизированный модуль оценки рисков проекта контракта по практике контроля 44-ФЗ
 * (ФАС России, Казначейство, Счётная палата, КоАП РФ).
 */

export type RiskSeverity = "critical" | "high" | "medium" | "low";
export type ContractRiskLevel = "low" | "medium" | "high" | "critical";
export type ContractFormSectionId =
  | "preamble"
  | "subject"
  | "price"
  | "term"
  | "quality"
  | "security"
  | "change"
  | "smp";

export interface ContractRiskFinding {
  id: string;
  ruleCode: string;
  severity: RiskSeverity;
  category: string;
  title: string;
  description: string;
  legalBasis: string;
  penaltyConsequence: string;
  recommendation: string;
  sectionTarget: ContractFormSectionId;
  sectionLabel: string;
  passed: boolean;
}

export interface ContractRiskAssessmentResult {
  overallLevel: ContractRiskLevel;
  overallLabel: string;
  complianceScore: number; // 0..100 (% пройденных взвешенных проверок)
  passedCount: number;
  failedCount: number;
  bySeverity: Record<RiskSeverity, number>;
  findings: ContractRiskFinding[];
}

export interface RiskAssessmentContext {
  notice?: NoticeInfo;
  purchaseNote?: PurchaseNote;
  okpd2Refs?: Okpd2Ref[];
  todayIso: string;
}

const SEVERITY_WEIGHT: Record<RiskSeverity, number> = {
  critical: 22,
  high: 14,
  medium: 8,
  low: 4,
};

const toNum = (val?: string | number | null): number => {
  if (val === undefined || val === null || val === "") return NaN;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const assessDraftContractRisk = (
  project: ContractProject,
  context: RiskAssessmentContext,
): ContractRiskAssessmentResult => {
  const findings: ContractRiskFinding[] = [];
  const hasTreasury = Boolean(
    context.notice?.participantsRequirements?.requiresTreasurySupport ??
      context.purchaseNote?.requiresTreasurySupport,
  );
  const isSmpProcedure =
    Boolean(context.purchaseNote?.advantageSmpPart3Art30) ||
    Boolean(project.smpRequiredPercent && Number(project.smpRequiredPercent) > 0);

  const nmck = toNum(project.price.initialMaxPrice);
  const finalPrice = toNum(project.price.finalPrice);
  const advancePct = toNum(project.price.advancePercent);
  const perfPct = toNum(project.security.performanceSecurityPercent);
  const paymentDays = project.price.paymentTermDays;
  const acceptanceDays = project.term.acceptanceTermDays;

  // 1. Срок оплаты по контракту (ч. 13.1 ст. 34 44-ФЗ)
  const maxAllowedPaymentDays = hasTreasury ? 10 : 7;
  const paymentTermOk =
    paymentDays !== undefined &&
    paymentDays >= 1 &&
    paymentDays <= maxAllowedPaymentDays;
  findings.push({
    id: "rule-payment-term",
    ruleCode: "44FZ-34-13.1",
    severity: "critical",
    category: "Сроки и оплата",
    title: paymentTermOk
      ? `Срок оплаты соответствует ч. 13.1 ст. 34 (${paymentDays} раб. дн.)`
      : paymentDays === undefined
        ? "Не указан срок оплаты по контракту"
        : `Превышен предельный срок оплаты (${paymentDays} > ${maxAllowedPaymentDays} раб. дн.)`,
    description: paymentTermOk
      ? `Установленный срок оплаты укладывается в предельный норматив ${maxAllowedPaymentDays} рабочих дней.`
      : `По ч. 13.1 ст. 34 Закона № 44-ФЗ оплата должна осуществляться не более чем в течение 7 рабочих дней (либо 10 рабочих дней при отсутствии электронного документооборота/казначейском сопровождении).`,
    legalBasis: "ч. 13.1 ст. 34 Закона № 44-ФЗ; ст. 7.32.5 КоАП РФ",
    penaltyConsequence:
      "Штраф на должностное лицо 30 000–50 000 ₽; предписание органа контроля",
    recommendation: `Установите срок оплаты не более ${maxAllowedPaymentDays} рабочих дней с даты подписания документа о приёмке.`,
    sectionTarget: "price",
    sectionLabel: "2. Цена и оплата",
    passed: paymentTermOk,
  });

  // 2. Антидемпинговые меры (ст. 37 44-ФЗ)
  const priceDropPercent =
    Number.isFinite(nmck) && nmck > 0 && Number.isFinite(finalPrice) && finalPrice > 0
      ? ((nmck - finalPrice) / nmck) * 100
      : 0;
  const isDumping = priceDropPercent >= 25;
  const antiDumpingOk =
    !isDumping ||
    (project.security.performanceSecurityRequired &&
      Number.isFinite(perfPct) &&
      perfPct >= 7.5);
  findings.push({
    id: "rule-anti-dumping",
    ruleCode: "44FZ-37",
    severity: "critical",
    category: "Обеспечение и антидемпинг",
    title: !isDumping
      ? "Демпинговое снижение цены ≥ 25% не зафиксировано"
      : antiDumpingOk
        ? `Снижение цены ${priceDropPercent.toFixed(1)}% — повышенное обеспечение учтено`
        : `Выявлен демпинг (${priceDropPercent.toFixed(1)}% от НМЦК) без полуторного обеспечения (ст. 37)`,
    description: !isDumping
      ? "Снижение цены контракта относительно НМЦК составляет менее 25%."
      : `Итоговая цена снижена на ${priceDropPercent.toFixed(1)}% относительно НМЦК. Требуется обеспечение исполнения контракта в 1,5 раза выше (но не менее 10% и не менее размера аванса) либо подтверждение добросовестности.`,
    legalBasis: "ч. 1, 2 ст. 37, ч. 6 ст. 96 Закона № 44-ФЗ",
    penaltyConsequence:
      "Признание контракта заключённым с нарушением; уклонение поставщика без надлежащего обеспечения",
    recommendation:
      "Увеличьте размер обеспечения исполнения контракта в 1,5 раза (минимум 10%) либо зафиксируйте применение ч. 2 ст. 37.",
    sectionTarget: "security",
    sectionLabel: "5. Обеспечение и неустойка",
    passed: antiDumpingOk,
  });

  // 3. Соотношение аванса и обеспечения исполнения (ч. 6 ст. 96 44-ФЗ)
  const hasAdvance =
    project.price.paymentProcedure === "advance" ||
    (Number.isFinite(advancePct) && advancePct > 0);
  const advanceVal = Number.isFinite(advancePct) ? advancePct : 0;
  const advanceVsSecurityOk =
    !hasAdvance ||
    (project.security.performanceSecurityRequired &&
      Number.isFinite(perfPct) &&
      perfPct >= advanceVal);
  findings.push({
    id: "rule-advance-security",
    ruleCode: "44FZ-96-6",
    severity: "critical",
    category: "Обеспечение и антидемпинг",
    title: advanceVsSecurityOk
      ? "Соотношение аванса и обеспечения исполнения соблюдено"
      : `Обеспечение исполнения (${Number.isFinite(perfPct) ? perfPct : 0}%) меньше размера аванса (${advanceVal}%)`,
    description: advanceVsSecurityOk
      ? "Размер обеспечения исполнения контракта не ниже размера предусмотренного аванса."
      : "По ч. 6 ст. 96 Закона № 44-ФЗ, если контрактом предусмотрена выплата аванса, размер обеспечения исполнения не может быть меньше размера аванса.",
    legalBasis: "ч. 6 ст. 96 Закона № 44-ФЗ",
    penaltyConsequence:
      "Обязательное предписание ФАС / отказ Казначейства в постановке бюджетного обязательства на учёт",
    recommendation:
      "Установите обеспечение исполнения контракта не ниже процента аванса (при казначейском сопровождении аванса — в соответствии с исключениями).",
    sectionTarget: "security",
    sectionLabel: "5. Обеспечение и неустойка",
    passed: advanceVsSecurityOk,
  });

  // 4. Соответствие цены контракта НМЦК (ч. 1 ст. 34)
  const priceNotExceeded =
    !Number.isFinite(nmck) ||
    !Number.isFinite(finalPrice) ||
    finalPrice <= nmck;
  const hasNmckAndBasis =
    Number.isFinite(nmck) &&
    nmck > 0 &&
    Boolean(project.price.priceBasis && project.price.priceBasis.trim().length >= 10);
  findings.push({
    id: "rule-price-nmck",
    ruleCode: "44FZ-34-2",
    severity: !priceNotExceeded ? "critical" : "high",
    category: "Цена и НМЦК",
    title: !priceNotExceeded
      ? "Итоговая цена контракта превышает НМЦК"
      : hasNmckAndBasis
        ? "НМЦК, цена контракта и обоснование (ст. 22) заполнены корректно"
        : "Отсутствует НМЦК либо обоснование цены контракта (ст. 22)",
    description: !priceNotExceeded
      ? `Цена контракта (${finalPrice}) выше НМЦК (${nmck}), что противоречит ч. 1 ст. 34 44-ФЗ.`
      : hasNmckAndBasis
        ? "Условия о твёрдой цене контракта и обоснование НМЦК подтверждены."
        : "В проекте контракта не указана НМЦК или отсутствует ссылка на обоснование цены по ст. 22 44-ФЗ.",
    legalBasis: "ст. 22, ч. 1, 2 ст. 34 Закона № 44-ФЗ",
    penaltyConsequence:
      "Нарушение бюджетного законодательства и признание контракта недействительным в части превышения",
    recommendation:
      "Убедитесь, что цена контракта не превышает НМЦК, и приведите ссылку на расчёт по ст. 22.",
    sectionTarget: "price",
    sectionLabel: "2. Цена и оплата",
    passed: priceNotExceeded && hasNmckAndBasis,
  });

  // 5. Порядок расчёта неустоек: пени 1/300 ставки ЦБ РФ и фиксированные штрафы (ч. 4–8 ст. 34, ПП № 1042)
  const penaltyStr = (project.security.penaltyFormula ?? "").toLowerCase();
  const has1300Formula =
    penaltyStr.includes("1/300") || penaltyStr.includes("одной трехсотой");
  const hasPenaltyTerms =
    has1300Formula && Boolean(project.security.interimPenaltyEnabled);
  findings.push({
    id: "rule-penalties-pp1042",
    ruleCode: "44FZ-34-PP1042",
    severity: "high",
    category: "Неустойки (штрафы и пени)",
    title: hasPenaltyTerms
      ? "Формула пени (1/300 ЦБ РФ) и ответственность по ПП № 1042 настроены"
      : "Неполные или некорректные условия о неустойке (ст. 34, ПП РФ № 1042)",
    description: hasPenaltyTerms
      ? "Условие о пени 1/300 ключевой ставки ЦБ РФ и начислении неустоек включено."
      : "В проекте контракта должна содержаться обязательная оговорка о размере пени 1/300 ключевой ставки ЦБ РФ за каждый день просрочки (ч. 5, 7 ст. 34) и ответственности за неисполнение обязательств по ПП РФ № 1042.",
    legalBasis: "ч. 4–8 ст. 34 Закона № 44-ФЗ; ПП РФ от 30.08.2017 № 1042",
    penaltyConsequence:
      "Штраф за невключение обязательных условий в проект контракта (ч. 4.2 ст. 7.30 КоАП РФ — 3 000 ₽)",
    recommendation:
      "Укажите формулу пени «1/300 ключевой ставки ЦБ РФ за каждый день просрочки» и включите неустойку за промежуточные обязательства.",
    sectionTarget: "security",
    sectionLabel: "5. Обеспечение и неустойка",
    passed: hasPenaltyTerms,
  });

  // 6. СМП/СОНКО наследование и срок возврата обеспечения (ч. 5 ст. 30, ч. 27 ст. 34)
  const noteHasSmp = Boolean(
    context.purchaseNote?.requiresSmpSubcontracting ||
      (context.purchaseNote?.smpRequiredPercent ?? 0) > 0,
  );
  const smpInheritedOk =
    !noteHasSmp ||
    (Boolean(project.smpRequiredPercent) &&
      Number(project.smpRequiredPercent) > 0);
  const returnDays = project.change.securityReturnDays;
  const maxReturnDays = isSmpProcedure ? 15 : 30;
  const returnDaysOk =
    !project.security.performanceSecurityRequired ||
    (returnDays !== undefined && returnDays >= 1 && returnDays <= maxReturnDays);
  findings.push({
    id: "rule-smp-and-return",
    ruleCode: "44FZ-30-34-27",
    severity: "high",
    category: "СМП/СОНКО и возврат обеспечения",
    title:
      smpInheritedOk && returnDaysOk
        ? "Условия для СМП/СОНКО и срок возврата обеспечения соблюдены"
        : !smpInheritedOk
          ? "В проекте контракта потеряно требование о привлечении СМП из служебной записки"
          : `Срок возврата обеспечения (${returnDays ?? "не указан"} дн.) превышает лимит ${maxReturnDays} дн.`,
    description:
      smpInheritedOk && returnDaysOk
        ? `Срок возврата обеспечения исполнения контракта не превышает установленного лимита (${maxReturnDays} дней).`
        : `По ч. 27 ст. 34 44-ФЗ срок возврата денежных средств, внесённых в качестве обеспечения исполнения, не может превышать 30 дней (а при закупке среди СМП/СОНКО — не более 15 дней).`,
    legalBasis: "ч. 5 ст. 30, ч. 27 ст. 34 Закона № 44-ФЗ; ПП РФ № 1466",
    penaltyConsequence:
      "Нарушение прав субъектов СМП, предписание контрольного органа, штраф по ст. 7.30 КоАП РФ",
    recommendation: `Проверьте процент привлечения СМП/СОНКО и установите срок возврата обеспечения ≤ ${maxReturnDays} дней.`,
    sectionTarget: !smpInheritedOk ? "smp" : "change",
    sectionLabel: !smpInheritedOk ? "Привлечение СМП/СОНКО" : "6. Изменение и расторжение",
    passed: smpInheritedOk && returnDaysOk,
  });

  // 7. Хронология сроков исполнения и поэтапная сумма (ст. 33, 34)
  const hasDates = Boolean(project.term.startDate && project.term.endDate);
  const datesOrderOk =
    hasDates &&
    (project.term.startDate ?? "") <= (project.term.endDate ?? "") &&
    (!project.term.validUntil ||
      (project.term.endDate ?? "") <= project.term.validUntil);
  let stagesMatchOk = true;
  if (project.price.paymentProcedure === "staged") {
    const stages = project.term.stages ?? [];
    if (stages.length === 0) {
      stagesMatchOk = false;
    } else if (Number.isFinite(finalPrice) && finalPrice > 0) {
      const stagesTotal = stages.reduce(
        (sum, s) => sum + (toNum(s.amount) || 0),
        0,
      );
      if (stagesTotal > 0 && Math.abs(stagesTotal - finalPrice) > 1) {
        stagesMatchOk = false;
      }
    }
  }
  findings.push({
    id: "rule-term-chronology",
    ruleCode: "44FZ-33-TERM",
    severity: "high",
    category: "Сроки исполнения",
    title:
      datesOrderOk && stagesMatchOk
        ? "Сроки исполнения контракта и сумма этапов согласованы"
        : !hasDates
          ? "Не заданы даты начала и окончания исполнения контракта"
          : !datesOrderOk
            ? "Нарушена хронология дат исполнения и действия контракта"
            : "Сумма этапов не совпадает с ценой контракта при поэтапной оплате",
    description:
      datesOrderOk && stagesMatchOk
        ? "Даты исполнения и структура этапов не содержат противоречий."
        : "Существенным условием по ст. 34 является точный срок исполнения; при поэтапной оплате сумма этапов должна соответствовать цене контракта.",
    legalBasis: "ст. 33 ч. 1 п. 1, ч. 1 ст. 34 Закона № 44-ФЗ",
    penaltyConsequence:
      "Невозможность корректного контроля этапов в ЕИС и блокировка приёмочных документов",
    recommendation:
      "Заполните даты начала/окончания исполнения и сверьте суммы этапов с ценой контракта.",
    sectionTarget: !stagesMatchOk ? "price" : "term",
    sectionLabel: !stagesMatchOk ? "2. Цена и оплата" : "3. Срок и приёмка",
    passed: datesOrderOk && stagesMatchOk,
  });

  // 8. Срок приёмки результатов исполнения (ч. 13 ст. 94 44-ФЗ)
  const acceptanceOk =
    acceptanceDays !== undefined &&
    acceptanceDays >= 1 &&
    acceptanceDays <= 20 &&
    Boolean(
      project.term.acceptanceProcedure &&
        project.term.acceptanceProcedure.trim().length >= 10,
    );
  findings.push({
    id: "rule-acceptance-art94",
    ruleCode: "44FZ-94-13",
    severity: "medium",
    category: "Приёмка и экспертиза",
    title: acceptanceOk
      ? `Порядок и срок приёмки (${acceptanceDays} раб. дн.) соответствуют ст. 94`
      : "Проверьте срок и порядок приёмки по ст. 94 44-ФЗ",
    description: acceptanceOk
      ? "Срок подписания документа о приёмке укладывается в предельные 20 рабочих дней."
      : "По ч. 13 ст. 94 Закона № 44-ФЗ срок рассмотрения и подписания электронного документа о приёмке не может превышать 20 рабочих дней.",
    legalBasis: "ч. 13 ст. 94 Закона № 44-ФЗ",
    penaltyConsequence:
      "Затягивание приёмки переносится на срок оплаты и влечёт штраф по ст. 7.32.5 КоАП РФ",
    recommendation:
      "Установите срок приёмки не более 20 рабочих дней (рекомендуется 5–10) и опишите порядок экспертизы.",
    sectionTarget: "term",
    sectionLabel: "3. Срок и приёмка",
    passed: acceptanceOk,
  });

  // 9. Расходы поставщика в цене контракта (ч. 1 п. 1 ст. 33, ст. 34)
  findings.push({
    id: "rule-price-expenses",
    ruleCode: "44FZ-34-EXP",
    severity: "medium",
    category: "Цена и налоги",
    title: project.price.priceIncludesExpenses
      ? "В цену контракта включены налоги, пошлины, страхование и доставка"
      : "Не указано включение обязательных расходов и налогов в цену контракта",
    description: project.price.priceIncludesExpenses
      ? "Риск спора о доплате НДС/доставки сверх твёрдой цены исключён."
      : "Без оговорки о включении налогов, сборов, страхования и транспортировки поставщик может требовать возмещения сопутствующих затрат.",
    legalBasis: "ч. 2 ст. 34 Закона № 44-ФЗ",
    penaltyConsequence: "Риск судебных споров по взысканию НДС и транспортных издержек",
    recommendation:
      "Отметьте признак включения расходов на перевозку, страхование, уплату пошлин и налогов.",
    sectionTarget: "price",
    sectionLabel: "2. Цена и оплата",
    passed: Boolean(project.price.priceIncludesExpenses),
  });

  // 10. Условия изменения и одностороннего отказа (ст. 95)
  const changeOk =
    Boolean(
      project.change.changeConditions &&
        project.change.changeConditions.trim().length >= 10,
    ) &&
    Boolean(
      project.change.terminationConditions &&
        project.change.terminationConditions.trim().length >= 10,
    );
  findings.push({
    id: "rule-change-art95",
    ruleCode: "44FZ-95",
    severity: "medium",
    category: "Изменение и расторжение",
    title: changeOk
      ? "Условия изменения (±10%) и одностороннего отказа (ст. 95) закреплены"
      : "Недостаточно полно прописаны основания изменения или одностороннего отказа (ст. 95)",
    description: changeOk
      ? "Зафиксированы основания изменения существенных условий и одностороннего отказа."
      : "В отсутствие права на односторонний отказ по ст. 95 ч. 8–9 расторгнуть контракт при срыве сроков возможно только через суд.",
    legalBasis: "ч. 1, 8, 9 ст. 95 Закона № 44-ФЗ",
    penaltyConsequence:
      "Невозможность оперативно расторгнуть контракт с недобросовестным поставщиком и включить его в РНП",
    recommendation:
      "Заполните условия изменения контракта (в пределах ±10%) и право заказчика на односторонний отказ по ч. 9 ст. 95.",
    sectionTarget: "change",
    sectionLabel: "6. Изменение и расторжение",
    passed: changeOk,
  });

  // 11. Аукционный перечень ОКПД2 и качество (ст. 33, РП № 471-р)
  const okpd2Ref = findOkpd2ByCode(
    context.okpd2Refs ?? [],
    project.subject.okpd2Code,
  );
  const subjectQualityOk =
    Boolean(project.subject.okpd2Code) &&
    Boolean(project.subject.deliveryPlace && project.subject.deliveryPlace.length >= 5) &&
    Boolean(project.quality.qualityRequirements && project.quality.qualityRequirements.length >= 10);
  findings.push({
    id: "rule-subject-okpd2-quality",
    ruleCode: "44FZ-33-QUALITY",
    severity: "medium",
    category: "Предмет и качество",
    title: subjectQualityOk
      ? `Предмет, ОКПД2 (${project.subject.okpd2Code}) и требования качества заданы`
      : "Не заполнены ОКПД2, место поставки или требования к качеству",
    description: okpd2Ref?.isAuctionRequired
      ? `Код ОКПД2 ${okpd2Ref.code} включён в аукционный перечень (РП РФ № 471-р): проверьте соответствие способа определения поставщика.`
      : okpd2Ref?.isNormed
        ? `Код ОКПД2 ${okpd2Ref.code} подлежит нормированию (ПП РФ № 926): цена единицы не должна превышать предельную.`
        : "Обязательные условия ст. 33 включают чёткое описание объекта, место поставки и показатели качества/гарантии.",
    legalBasis: "ст. 33 Закона № 44-ФЗ; РП РФ № 471-р; ПП РФ № 926",
    penaltyConsequence:
      "Жалоба участника закупки на неопределённость технических характеристик и места поставки",
    recommendation:
      "Уточните код ОКПД2, точный адрес поставки и требования к качеству и сроку гарантии.",
    sectionTarget: project.quality.qualityRequirements ? "subject" : "quality",
    sectionLabel: project.quality.qualityRequirements
      ? "1. Предмет (ст. 33)"
      : "4. Качество и гарантия",
    passed: subjectQualityOk,
  });

  // 12. Идентификация закупки и реквизиты сторон (ст. 23, 51, 103)
  const identityOk =
    Boolean(project.ikz && project.ikz.trim().length >= 20) &&
    Boolean(project.customerName && project.customerName.trim().length >= 5) &&
    Boolean(project.supplierName && project.supplierName.trim().length >= 3);
  findings.push({
    id: "rule-ikz-parties",
    ruleCode: "44FZ-23-103",
    severity: "low",
    category: "Реквизиты и ИКЗ",
    title: identityOk
      ? "ИКЗ и реквизиты заказчика/поставщика указаны"
      : "Не указаны полный ИКЗ (≥ 20 символов) или наименование контрагента",
    description: identityOk
      ? "Идентификационный код закупки и стороны контракта готовы к включению в реестр контрактов."
      : "Для передачи сведений в ЕИС и Казначейство по ст. 103 необходимы действительный ИКЗ и полные реквизиты сторон.",
    legalBasis: "ст. 23, ст. 103 Закона № 44-ФЗ",
    penaltyConsequence: "Возврат пакета сведений при контроле по ст. 99 ч. 5 44-ФЗ",
    recommendation:
      "Проверьте ИКЗ, наименование заказчика и наименование победителя закупки во вкладке «Общие сведения».",
    sectionTarget: "preamble",
    sectionLabel: "Преамбула",
    passed: identityOk,
  });

  const bySeverity: Record<RiskSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let totalWeight = 0;
  let passedWeight = 0;
  let passedCount = 0;
  let failedCount = 0;

  for (const item of findings) {
    const w = SEVERITY_WEIGHT[item.severity];
    totalWeight += w;
    if (item.passed) {
      passedWeight += w;
      passedCount += 1;
    } else {
      failedCount += 1;
      bySeverity[item.severity] += 1;
    }
  }

  const complianceScore =
    totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100;

  let overallLevel: ContractRiskLevel = "low";
  if (bySeverity.critical > 0) {
    overallLevel = "critical";
  } else if (bySeverity.high >= 2 || complianceScore < 65) {
    overallLevel = "high";
  } else if (bySeverity.high > 0 || bySeverity.medium > 0) {
    overallLevel = "medium";
  }

  const overallLabels: Record<ContractRiskLevel, string> = {
    low: "Низкий риск (готов к проверке и подписанию)",
    medium: "Умеренный риск (требуются уточнения)",
    high: "Высокий риск (нарушения практики 44-ФЗ)",
    critical: "Критический риск (блокирующие нарушения 44-ФЗ)",
  };

  // Нарушения поднимаем наверх по тяжести
  const severityOrder: Record<RiskSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  findings.sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? 1 : -1;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    overallLevel,
    overallLabel: overallLabels[overallLevel],
    complianceScore,
    passedCount,
    failedCount,
    bySeverity,
    findings,
  };
};
