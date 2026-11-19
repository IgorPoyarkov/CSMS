import {
  formatLegalAct,
  isActInForceOn,
  type LegalAct,
} from "../LegalAct/legalAct.schema";
import type { ProcurementDocumentType } from "./procurementDocumentGenerator";

/**
 * Document Checker — сканер сгенерированных (или отредактированных) документов
 * закупки на соответствие актуальному реестру законодательных актов (/legalActs).
 *
 * Выявляет:
 * 1) Отсутствующие обязательные положения (missing_clause) по действующим НПА;
 * 2) Несоответствующие / устаревшие формулировки и ссылки на утратившие силу акты
 *    (non_compliant_text) с точным позиционированием для подсветки в тексте;
 * 3) Покрытие каждого действующего нормативного акта из реестра.
 */

export type DocumentCheckCategory = ProcurementDocumentType | "contract_draft" | "general";

export type CheckIssueKind = "missing_clause" | "non_compliant_text";
export type CheckSeverity = "critical" | "high" | "medium";

export interface DocumentTextMatch {
  start: number;
  end: number;
  matchedText: string;
}

export interface DocumentCheckFinding {
  id: string;
  kind: CheckIssueKind;
  severity: CheckSeverity;
  legalActId?: string;
  legalActLabel: string;
  title: string;
  description: string;
  recommendation: string;
  suggestedInsertClause?: string;
  suggestedReplacement?: {
    target: string;
    replacement: string;
  };
  matches: DocumentTextMatch[];
}

export interface RegistryActCoverage {
  act: LegalAct;
  inForce: boolean;
  referencedInText: boolean;
  statusNote: string;
}

export interface DocumentComplianceReport {
  checkedAtIso: string;
  documentCategory: DocumentCheckCategory;
  activeActsCount: number;
  inactiveActsCount: number;
  complianceScore: number;
  passedChecksCount: number;
  totalChecksCount: number;
  findings: DocumentCheckFinding[];
  registryCoverage: RegistryActCoverage[];
}

const findAllMatches = (text: string, regex: RegExp): DocumentTextMatch[] => {
  const matches: DocumentTextMatch[] = [];
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  const re = new RegExp(regex.source, flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      matchedText: m[0],
    });
  }
  return matches;
};

const findAct = (
  acts: LegalAct[],
  idOrKeyword: string,
): LegalAct | undefined => {
  const needle = idOrKeyword.toLowerCase();
  return acts.find(
    (a) =>
      String(a.id ?? "").toLowerCase() === needle ||
      a.shortName.toLowerCase().includes(needle) ||
      a.actNumber.toLowerCase() === needle,
  );
};

interface MandatoryClauseRule {
  id: string;
  actKey: string;
  defaultActLabel: string;
  categories: DocumentCheckCategory[];
  severity: CheckSeverity;
  title: string;
  description: string;
  recommendation: string;
  requiredPatterns: RegExp[];
  suggestedInsertClause: string;
}

const MANDATORY_CLAUSE_RULES: MandatoryClauseRule[] = [
  {
    id: "clause-ikz",
    actKey: "law-44fz",
    defaultActLabel: "44-ФЗ",
    categories: [
      "commission_order",
      "bid_review_protocol",
      "procurement_launch_order",
      "contract_draft",
      "general",
    ],
    severity: "critical",
    title: "Отсутствует идентификационный код закупки (ИКЗ)",
    description:
      "Документ закупки должен содержать 36-значный (или 20+ значный) ИКЗ для однозначной привязки к позиции плана-графика и ЕИС (ст. 23 Закона № 44-ФЗ).",
    recommendation: "Укажите ИКЗ в реквизитах документа.",
    requiredPatterns: [/[0-9A-ZА-Я]{20,36}/],
    suggestedInsertClause:
      "Идентификационный код закупки (ИКЗ): укажите 36-значный код из позиции плана-графика.",
  },
  {
    id: "clause-art39-commission-size",
    actKey: "law-44fz",
    defaultActLabel: "ч. 3 ст. 39 Закона № 44-ФЗ",
    categories: ["commission_order"],
    severity: "critical",
    title: "Не подтверждён минимальный состав комиссии (≥ 3 человек) или ссылка на ст. 39 44-ФЗ",
    description:
      "По ч. 3 ст. 39 Закона № 44-ФЗ число членов конкурсной, аукционной, котировочной или единой комиссии должно быть не менее трёх человек.",
    recommendation: "Включите ссылку на ст. 39 Закона № 44-ФЗ и укажите состав комиссии не менее 3 лиц.",
    requiredPatterns: [/ст\.?\s*39/i, /не\s+менее\s+(3|тр[её]х)/i],
    suggestedInsertClause:
      "В соответствии с ч. 3 ст. 39 Закона № 44-ФЗ численность комиссии составляет не менее 3 (трёх) человек.",
  },
  {
    id: "clause-art39-conflict",
    actKey: "law-44fz",
    defaultActLabel: "ч. 6 ст. 39 Закона № 44-ФЗ",
    categories: ["commission_order", "bid_review_protocol"],
    severity: "high",
    title: "Нет оговорки об отсутствии конфликта интересов членов комиссии",
    description:
      "Члены комиссии обязаны подтвердить отсутствие обстоятельств, исключающих их участие (конфликта интересов, родства, заинтересованности) по ч. 6 ст. 39 Закона № 44-ФЗ.",
    recommendation: "Добавьте пункт о контроле конфликта интересов по ч. 6 ст. 39 44-ФЗ.",
    requiredPatterns: [/конфликт[аеу]?\s+интересов/i, /ч\.?\s*6\s*ст\.?\s*39/i],
    suggestedInsertClause:
      "Члены комиссии подтверждают отсутствие конфликта интересов в соответствии с ч. 6 ст. 39 Закона № 44-ФЗ.",
  },
  {
    id: "clause-art39-quorum",
    actKey: "law-44fz",
    defaultActLabel: "ч. 8 ст. 39 Закона № 44-ФЗ",
    categories: ["commission_order", "bid_review_protocol"],
    severity: "high",
    title: "Не зафиксирован кворум комиссии (≥ 50% состава) / запрет заочного голосования",
    description:
      "Комиссия правомочна осуществлять функции, если на заседании присутствует не менее 50% общего числа членов; заочное голосование запрещено (ч. 8 ст. 39 44-ФЗ).",
    recommendation: "Добавьте положение о кворуме ≥ 50%.",
    requiredPatterns: [/(кворум|50\s*%|пятьдесят\s+процентов)/i],
    suggestedInsertClause:
      "Заседание комиссии правомочно при присутствии не менее 50% от общего числа её членов (ч. 8 ст. 39 Закона № 44-ФЗ).",
  },
  {
    id: "clause-art31-rnp",
    actKey: "law-44fz",
    defaultActLabel: "ст. 31 Закона № 44-ФЗ",
    categories: [
      "commission_order",
      "bid_review_protocol",
      "procurement_launch_order",
    ],
    severity: "high",
    title: "Отсутствует ссылка на проверку участников по ст. 31 44-ФЗ и реестру РНП",
    description:
      "При подготовке и рассмотрении заявок обязательна проверка соответствия участников единым требованиям ст. 31 Закона № 44-ФЗ и отсутствия в РНП.",
    recommendation: "Включите указание на ст. 31 Закона № 44-ФЗ и проверку РНП.",
    requiredPatterns: [/ст\.?\s*31/i, /РНП|реестр[еа]?\s+недобросовестных/i],
    suggestedInsertClause:
      "Проверка участников осуществляется на соответствие требованиям ст. 31 Закона № 44-ФЗ и отсутствие сведений в РНП.",
  },
  {
    id: "clause-63fz-ukep",
    actKey: "law-63fz",
    defaultActLabel: "Закон № 63-ФЗ",
    categories: ["commission_order", "bid_review_protocol"],
    severity: "medium",
    title: "Не указано требование подписания УКЭП по Закону № 63-ФЗ",
    description:
      "Протоколы в электронной процедуре подписываются усиленными квалифицированными электронными подписями (УКЭП) согласно Закону № 63-ФЗ.",
    recommendation: "Уточните порядок подписания документа УКЭП со ссылкой на 63-ФЗ.",
    requiredPatterns: [/63-ФЗ|усиленн[а-я]+\s+квалифицированн[а-я]+\s+электронн/i],
    suggestedInsertClause:
      "Протоколы подписываются усиленными квалифицированными электронными подписями (УКЭП) в соответствии с Федеральным законом № 63-ФЗ.",
  },
  {
    id: "clause-pp1875",
    actKey: "pp-1875",
    defaultActLabel: "ПП РФ № 1875",
    categories: ["commission_order", "bid_review_protocol", "procurement_launch_order"],
    severity: "high",
    title: "Отсутствует ссылка на единый национальный режим (ст. 14 44-ФЗ, ПП РФ № 1875)",
    description:
      "С 01.01.2025 действует обновлённый механизм национального режима по ПП РФ от 23.12.2024 № 1875 (запреты, ограничения, преимущества).",
    recommendation: "Укажите учёт мер национального режима по ст. 14 44-ФЗ и ПП РФ № 1875.",
    requiredPatterns: [/1875|национальн[а-я]+\s+режим/i],
    suggestedInsertClause:
      "Соблюдение мер национального режима обеспечивается в соответствии со ст. 14 Закона № 44-ФЗ и Постановлением Правительства РФ от 23.12.2024 № 1875.",
  },
  {
    id: "clause-158n",
    actKey: "order-minfin-158n",
    defaultActLabel: "Приказ Минфина № 158н",
    categories: ["commission_order", "procurement_launch_order"],
    severity: "medium",
    title: "Не упомянут регламент контрактной службы (Приказ Минфина № 158н)",
    description:
      "Приказ заказчика о проведении закупки и распределении полномочий опирается на Типовое положение № 158н.",
    recommendation: "Добавьте ссылку на Приказ Минфина России от 31.07.2020 № 158н.",
    requiredPatterns: [/158н/i],
    suggestedInsertClause:
      "Функции контрактной службы осуществляются в соответствии с Приказом Минфина России от 31.07.2020 № 158н.",
  },
  {
    id: "clause-pp2604",
    actKey: "pp-2604",
    defaultActLabel: "ПП РФ № 2604",
    categories: ["bid_review_protocol"],
    severity: "medium",
    title: "Не указано Положение об оценке заявок (ПП РФ № 2604)",
    description:
      "Для конкурсных процедур оценка заявок и расчёт баллов оформляются по правилам Постановления Правительства РФ от 31.12.2021 № 2604.",
    recommendation: "При конкурсной закупке укажите ссылку на ПП РФ № 2604 (для аукциона отметка не требуется).",
    requiredPatterns: [/2604|аукцион|котиров/i],
    suggestedInsertClause:
      "Оценка заявок произведена в соответствии с Положением, утверждённым ПП РФ от 31.12.2021 № 2604.",
  },
  {
    id: "clause-payment-34-13-1",
    actKey: "law-44fz",
    defaultActLabel: "ч. 13.1 ст. 34 Закона № 44-ФЗ",
    categories: ["procurement_launch_order", "contract_draft"],
    severity: "critical",
    title: "Не зафиксирован предельный срок оплаты по ч. 13.1 ст. 34 44-ФЗ",
    description:
      "Срок оплаты по общему правилу не должен превышать 7 рабочих дней (или 10 рабочих дней при казначейском сопровождении / расчётах без ЕИС).",
    recommendation: "Зафиксируйте срок оплаты ≤ 7 (10) рабочих дней со ссылкой на ч. 13.1 ст. 34 44-ФЗ.",
    requiredPatterns: [/13\.1\s*ст\.?\s*34|7\s+рабоч[а-я]+\s+дн/i],
    suggestedInsertClause:
      "Срок оплаты поставленного товара, выполненной работы, оказанной услуги составляет не более 7 рабочих дней с даты подписания документа о приёмке (ч. 13.1 ст. 34 Закона № 44-ФЗ).",
  },
];

interface LegacyPatternRule {
  id: string;
  regex: RegExp;
  severity: CheckSeverity;
  legalActLabel: string;
  title: string;
  description: string;
  recommendation: string;
  replacementText: string;
}

const LEGACY_NON_COMPLIANT_RULES: LegacyPatternRule[] = [
  {
    id: "legacy-pp1085",
    regex: /ПП\s*РФ\s*(?:от\s*28\.11\.2013\s*)?(?:№|N)\s*1085|постановлени[еяю]\s+Правительства\s+РФ[^.\n]{0,40}1085/gi,
    severity: "critical",
    legalActLabel: "ПП РФ № 2604 (взамен утратившего силу ПП № 1085)",
    title: "Ссылка на утратившее силу Постановление Правительства РФ № 1085",
    description:
      "ПП РФ от 28.11.2013 № 1085 утратило силу с 01.01.2022. Действующий порядок оценки заявок установлен ПП РФ от 31.12.2021 № 2604.",
    recommendation: "Замените ссылку на Постановление Правительства РФ от 31.12.2021 № 2604.",
    replacementText: "ПП РФ от 31.12.2021 № 2604",
  },
  {
    id: "legacy-nat-regime",
    regex: /(?:ПП\s*РФ|постановлени[еяю]\s+Правительства\s+РФ|Приказ(?:ом)?\s+Минфина)[^.\n]{0,35}(?:№|N)\s*(?:616|617|878|102|1289|126н)/gi,
    severity: "critical",
    legalActLabel: "ПП РФ № 1875 (ст. 14 44-ФЗ)",
    title: "Ссылка на отменённые акты нацрежима (ПП 616/617/878/102/1289, Приказ 126н)",
    description:
      "С 01.01.2025 указанные акты о запретах, ограничениях и условиях допуска заменены единым Постановлением Правительства РФ от 23.12.2024 № 1875.",
    recommendation: "Замените устаревшую ссылку на ПП РФ от 23.12.2024 № 1875.",
    replacementText: "ПП РФ от 23.12.2024 № 1875",
  },
  {
    id: "legacy-payment-30days",
    regex: /(?:срок\s+оплаты[^.\n]{0,40}(?:15|20|30)\s+(?:рабочих|календарных)\s+дн|(?:15|20|30)\s+(?:рабочих|календарных)\s+дн[а-я]*\s+с\s+(?:даты|момента)\s+подписания\s+(?:акта|документа\s+о\s+при[её]мк))/gi,
    severity: "critical",
    legalActLabel: "ч. 13.1 ст. 34 Закона № 44-ФЗ",
    title: "Завышенный срок оплаты (15/20/30 дней вместо 7 рабочих дней)",
    description:
      "По действующей редакции ч. 13.1 ст. 34 44-ФЗ срок оплаты не может превышать 7 рабочих дней с даты подписания документа о приёмке в ЕИС (10 рабочих дней при казначейском сопровождении).",
    recommendation: "Приведите срок оплаты к лимиту ≤ 7 рабочих дней.",
    replacementText: "не более 7 рабочих дней с даты подписания документа о приёмке",
  },
  {
    id: "legacy-request-proposals",
    regex: /запрос[ауе]?\s+предложений/gi,
    severity: "high",
    legalActLabel: "ст. 24 Закона № 44-ФЗ",
    title: "Упоминание исключённого способа закупки «запрос предложений»",
    description:
      "С 2022 года запрос предложений исключён из Закона № 44-ФЗ (ч. 2 ст. 24 предусматривает конкурс, аукцион, запрос котировок).",
    recommendation: "Используйте действующие конкурентные способы: конкурс, аукцион или запрос котировок.",
    replacementText: "открытый конкурс в электронной форме",
  },
  {
    id: "legacy-documentation-auction",
    regex: /документац[ияией]+\s+об\s+(?:электронном\s+)?аукционе/gi,
    severity: "medium",
    legalActLabel: "ст. 42, 49 Закона № 44-ФЗ",
    title: "Устаревший термин «документация об аукционе»",
    description:
      "После оптимизации 44-ФЗ (360-ФЗ) документация при открытых электронных процедурах не составляется — все сведения включаются в извещение и приложения к нему.",
    recommendation: "Замените на «извещение об осуществлении закупки».",
    replacementText: "извещение об осуществлении закупки",
  },
];

export const scanDocumentCompliance = (params: {
  documentText: string;
  category: DocumentCheckCategory;
  legalActs: LegalAct[];
  checkDateIso?: string;
}): DocumentComplianceReport => {
  const {
    documentText,
    category,
    legalActs,
    checkDateIso = new Date().toISOString().slice(0, 10),
  } = params;

  const text = documentText || "";
  const findings: DocumentCheckFinding[] = [];

  const activeActs = legalActs.filter((a) => isActInForceOn(a, checkDateIso));
  const inactiveActs = legalActs.filter((a) => !isActInForceOn(a, checkDateIso));

  // 1. Сканирование текста на ссылки на неактуальные / утратившие силу акты из реестра legalActs
  inactiveActs.forEach((act) => {
    const escapedNum = act.actNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedShort = act.shortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?:${escapedShort}|№\\s*${escapedNum}|N\\s*${escapedNum})`, "gi");
    const matches = findAllMatches(text, pattern);
    if (matches.length > 0) {
      findings.push({
        id: `registry-inactive-${act.id ?? act.actNumber}`,
        kind: "non_compliant_text",
        severity: "critical",
        legalActId: act.id ? String(act.id) : undefined,
        legalActLabel: formatLegalAct(act),
        title: `Упомянут недействующий акт из реестра: ${act.shortName}`,
        description: `Статус акта в реестре: «${act.status === "superseded" ? "утратил силу (заменён)" : "срок действия истёк"}»${act.supersededBy ? `. Заменён на: ${act.supersededBy}` : ""}.`,
        recommendation: act.supersededBy
          ? `Замените ссылку на актуальный акт: ${act.supersededBy}.`
          : "Исключите ссылку на недействующий нормативный акт.",
        suggestedReplacement: act.supersededBy
          ? {
              target: matches[0].matchedText,
              replacement: act.supersededBy,
            }
          : undefined,
        matches,
      });
    }
  });

  // 2. Проверка типовых устаревших / незаконных формулировок практики 44-ФЗ
  LEGACY_NON_COMPLIANT_RULES.forEach((rule) => {
    const matches = findAllMatches(text, rule.regex);
    if (matches.length > 0) {
      findings.push({
        id: rule.id,
        kind: "non_compliant_text",
        severity: rule.severity,
        legalActLabel: rule.legalActLabel,
        title: rule.title,
        description: rule.description,
        recommendation: rule.recommendation,
        suggestedReplacement: {
          target: matches[0].matchedText,
          replacement: rule.replacementText,
        },
        matches,
      });
    }
  });

  // 3. Проверка обязательных положений (missing_clause) по действующим актам реестра
  const applicableMandatory = MANDATORY_CLAUSE_RULES.filter((r) =>
    r.categories.includes(category),
  );

  let passedMandatory = 0;
  applicableMandatory.forEach((rule) => {
    const regAct = findAct(legalActs, rule.actKey);
    // Если акт есть в реестре и помечен как недействующий — не требуем его обязательную оговорку
    if (regAct && !isActInForceOn(regAct, checkDateIso)) {
      passedMandatory += 1;
      return;
    }

    const satisfied = rule.requiredPatterns.some((re) => re.test(text));
    if (satisfied) {
      passedMandatory += 1;
    } else {
      findings.push({
        id: rule.id,
        kind: "missing_clause",
        severity: rule.severity,
        legalActId: regAct?.id ? String(regAct.id) : undefined,
        legalActLabel: regAct ? formatLegalAct(regAct) : rule.defaultActLabel,
        title: rule.title,
        description: rule.description,
        recommendation: rule.recommendation,
        suggestedInsertClause: rule.suggestedInsertClause,
        matches: [],
      });
    }
  });

  // 4. Покрытие всех актов реестра
  const registryCoverage: RegistryActCoverage[] = legalActs.map((act) => {
    const inForce = isActInForceOn(act, checkDateIso);
    const numEsc = act.actNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const shortEsc = act.shortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const refRegex = new RegExp(`(?:${shortEsc}|${numEsc})`, "i");
    const referencedInText = refRegex.test(text);

    return {
      act,
      inForce,
      referencedInText,
      statusNote: !inForce
        ? referencedInText
          ? "Критично: недействующий акт упомянут в тексте"
          : "Не действует в реестре"
        : referencedInText
          ? "Актуален и применён в документе"
          : "Актуален в реестре",
    };
  });

  const totalChecksCount =
    applicableMandatory.length + LEGACY_NON_COMPLIANT_RULES.length + inactiveActs.length;
  const failedPenaltyCount = findings.length;
  const passedChecksCount = Math.max(0, totalChecksCount - failedPenaltyCount);

  const rawScore =
    totalChecksCount === 0
      ? 100
      : Math.round((passedChecksCount / totalChecksCount) * 100);
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const complianceScore = Math.max(0, Math.min(100, rawScore - criticalCount * 6));

  return {
    checkedAtIso: new Date().toISOString(),
    documentCategory: category,
    activeActsCount: activeActs.length,
    inactiveActsCount: inactiveActs.length,
    complianceScore,
    passedChecksCount,
    totalChecksCount,
    findings,
    registryCoverage,
  };
};
