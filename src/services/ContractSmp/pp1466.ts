/**
 * Типовые условия контракта, по которым подрядчик привлекает субподрядчиков
 * и соисполнителей из числа СМП/СОНКО — постановление Правительства РФ
 * от 23.12.2016 N 1466 (п. 1-6).
 *
 * Заведено по Tasks 9 (п. 7, п/п 1): сроки типовых условий НЕ являются
 * реквизитом контракта, поэтому в системе это константы, а не поля, которые
 * каждый раз заполняет контрактная служба. Единственная переменная величина —
 * процент привлечения по п. 1, его устанавливает заказчик в служебной
 * записке по позиции плана-графика (`purchaseNotes.smpRequiredPercent`).
 *
 * Ссылки на норму в интерфейсе ведут на id акта в `legalActs`, а не текст:
 * `PP_1466_ACT_ID` и `CUSTOMER_DEADLINE_ACT_ID`.
 */

// id записей в коллекции legalActs
export const PP_1466_ACT_ID = "pp-1466";
export const CUSTOMER_DEADLINE_ACT_ID = "law-44fz-art103-p3";

// п. 1 — минимальный объём привлечения от цены контракта, процентов
export const MINIMUM_SMP_REQUIRED_PERCENT = 5;

// От чего считается срок и сколько рабочих дней даётся подрядчику
export interface SmpDeadlineRule {
  code: "p2" | "p3" | "p4a" | "p4b" | "p5";
  // Пункт типовых условий
  clause: string;
  // Какие документы (или действие) требует пункт
  title: string;
  // Срок в рабочих днях
  workingDays: number;
  // От какого события считается срок
  basis: string;
  // На какой акт ссылается правило
  actId: string;
}

export const SMP_DEADLINE_RULES: SmpDeadlineRule[] = [
  {
    code: "p2",
    clause: "п. 2",
    title: "Декларация о принадлежности к СМП/СОНКО и заверенная копия договора",
    workingDays: 5,
    basis: "со дня заключения договора с субподрядчиком",
    actId: PP_1466_ACT_ID,
  },
  {
    code: "p3",
    clause: "п. 3",
    title: "Те же документы при замене субподрядчика на этапе исполнения",
    workingDays: 5,
    basis: "со дня заключения договора с новым субподрядчиком",
    actId: PP_1466_ACT_ID,
  },
  {
    code: "p4a",
    clause: "п. 4",
    title: "Копии документов о приёмке выполненных работ (оказанных услуг)",
    workingDays: 10,
    basis: "со дня оплаты обязательств перед субподрядчиком",
    actId: PP_1466_ACT_ID,
  },
  {
    code: "p4b",
    clause: "п. 4",
    title: "Копии платёжных поручений",
    // 10 рабочих дней, если субподрядчик оплачен раньше срока, предусмотренного
    // контрактом с заказчиком; иначе 5 рабочих дней со дня оплаты
    workingDays: 5,
    basis: "со дня оплаты (10 рабочих дней, если оплата раньше срока по контракту)",
    actId: PP_1466_ACT_ID,
  },
  {
    code: "p5",
    clause: "п. 5",
    title: "Оплата подрядчиком обязательств перед субподрядчиком",
    workingDays: 7,
    basis: "с даты подписания подрядчиком документа о приёмке",
    actId: PP_1466_ACT_ID,
  },
];

// п. 4 — копии платёжных поручений при оплате раньше срока по контракту
export const SMP_PAYMENT_EARLY_DEADLINE_WORKING_DAYS = 10;

// Срок самого заказчика: 3 рабочих дня с момента получения сведений от
// подрядчика (ч. 3 ст. 103 44-ФЗ). Отсчёт от `receivedAt` записи
export const CUSTOMER_EIS_DEADLINE_WORKING_DAYS = 3;

export const CUSTOMER_EIS_DEADLINE_RULE = {
  code: "customer" as const,
  clause: "ч. 3 ст. 103 44-ФЗ",
  title: "Разместить полученные сведения в ЕИС",
  workingDays: CUSTOMER_EIS_DEADLINE_WORKING_DAYS,
  basis: "с момента получения сведений от подрядчика",
  actId: CUSTOMER_DEADLINE_ACT_ID,
};

export const smpDeadlineRuleByCode = (
  code: SmpDeadlineRule["code"],
): SmpDeadlineRule | undefined =>
  SMP_DEADLINE_RULES.find((rule) => rule.code === code);
