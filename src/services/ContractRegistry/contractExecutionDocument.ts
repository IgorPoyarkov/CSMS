import type {
  ContractCardAct,
  ContractCardParty,
  ContractCardPayment,
} from "./contractCardProjection.schema";

/**
 * Печатные формы по данным карточки ЕИС: акт приёмки и платёжное поручение.
 *
 * Документ собирается из реквизитов проекции — это те же поля, что подписаны
 * в ЕИС, поэтому ничего не додумывается: если реквизита нет в выгрузке, в
 * форме остаётся прочерк. По клику на акт/платёж в карточке контракта
 * открывается окно печати с готовой формой.
 */

/** Реквизиты контракта, которых нет в самом акте/платеже. */
export interface ContractDocumentContext {
  contractNumber?: string | null;
  contractDate?: string | null;
  contractName?: string | null;
  customerName?: string | null;
  customerInn?: string | null;
  customerKpp?: string | null;
  supplierName?: string | null;
  supplierInn?: string | null;
  supplierKpp?: string | null;
  /** Подпись источника: «Выгрузка карточки ЕИС от 22.11.2026». */
  source?: string | null;
}

/** Готовая печатная форма: заголовок вкладки и HTML документа. */
export interface PrintableDocument {
  title: string;
  html: string;
}

const empty = "—";

/** Значение или прочерк: документ не должен выглядеть как пустой шаблон. */
const value = (raw?: string | null): string => {
  const text = (raw ?? "").trim();
  return text === "" ? empty : text;
};

const escapeHtml = (raw?: string | null): string =>
  value(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** ДД.ММ.ГГГГ из ISO: в документах дата пишется как в ЕИС. */
export const documentDate = (raw?: string | null): string => {
  const text = (raw ?? "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value(raw);
};

const money = (raw?: number | null): string =>
  raw === null || raw === undefined
    ? empty
    : raw.toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/** Сторона акта по роли: подрядчик или заказчик. */
const partyOf = (
  parties: ContractCardParty[],
  role: "supplier" | "customer",
): ContractCardParty | null =>
  parties.find((party) => {
    const roleName = (party.Role ?? "").toLowerCase();
    return role === "supplier"
      ? roleName.includes("подрядчик") || roleName.includes("поставщик")
      : roleName.includes("заказчик");
  }) ?? null;

/** Строка подписей: ФИО и должность из Signatories, иначе — пустые линии. */
const signatureRows = (act: ContractCardAct): string => {
  if (act.Signatories.length === 0) {
    return `
      <tr><td>Заказчик</td><td class="line"></td><td class="line"></td></tr>
      <tr><td>Подрядчик</td><td class="line"></td><td class="line"></td></tr>`;
  }

  return act.Signatories
    .map((signatory) => {
      const name = [signatory.LastName, signatory.FirstName, signatory.MiddleName]
        .filter(Boolean)
        .join(" ");
      const basis = signatory.AuthorityBasis
        ? ` (основание: ${escapeHtml(signatory.AuthorityBasis)})`
        : "";
      return `
        <tr>
          <td>${escapeHtml(signatory.Position)}</td>
          <td class="line"></td>
          <td>${escapeHtml(name)}${basis}</td>
        </tr>`;
    })
    .join("");
};

/** Общие стили документа: A4, таблицы с рамкой, колонтитул источника. */
const DOCUMENT_STYLES = `
  @page { size: A4; margin: 15mm; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; color: #000; }
  h1 { font-size: 14pt; text-align: center; margin: 0 0 4px; }
  .subtitle { text-align: center; margin: 0 0 16px; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
  th { background: #f2f2f2; font-weight: 600; text-align: center; }
  .plain td, .plain th { border: none; padding: 2px 4px; }
  .right { text-align: right; }
  .center { text-align: center; }
  .muted { color: #444; font-size: 10pt; }
  .line { border-bottom: 1px solid #000; min-width: 160px; }
  .signature { margin-top: 24px; }
  @media print { .no-print { display: none; } }
`;

/** Шапка документа: заказчик, подрядчик и реквизиты контракта. */
const documentHeader = (
  context: ContractDocumentContext,
  parties: {
    customerName: string | null;
    customerInn: string | null;
    customerKpp: string | null;
    supplierName: string | null;
    supplierInn: string | null;
    supplierKpp: string | null;
  },
): string => `
  <table class="plain">
    <tr>
      <td><strong>Заказчик:</strong> ${escapeHtml(parties.customerName)}</td>
      <td class="right"><strong>ИНН</strong> ${escapeHtml(parties.customerInn)}
        <strong>КПП</strong> ${escapeHtml(parties.customerKpp)}</td>
    </tr>
    <tr>
      <td><strong>Подрядчик:</strong> ${escapeHtml(parties.supplierName)}</td>
      <td class="right"><strong>ИНН</strong> ${escapeHtml(parties.supplierInn)}
        <strong>КПП</strong> ${escapeHtml(parties.supplierKpp)}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Контракт:</strong> № ${escapeHtml(context.contractNumber)}
        от ${documentDate(context.contractDate)} — ${escapeHtml(context.contractName)}</td>
    </tr>
  </table>`;

/** Итоговая строка таблицы позиций акта. */
const actTotalsRow = (act: ContractCardAct, columns: number): string => {
  const totals = act.Totals;
  if (!totals) return "";
  return `
    <tr>
      <td colspan="${columns - 3}" class="right"><strong>Итого:</strong></td>
      <td class="right">${money(totals.SumWithoutVat)}</td>
      <td class="right">${money(totals.VatSum)}</td>
      <td class="right"><strong>${money(totals.SumWithVat)}</strong></td>
    </tr>`;
};

/**
 * Акт приёмки по документу о приёмке из карточки ЕИС: позиции работ, итоги,
 * период исполнения и подписанты. Позиции берутся из WorkItems — если их нет,
 * в таблице печатается предмет приёмки целиком.
 */
export const buildAcceptanceActDocument = (
  act: ContractCardAct,
  context: ContractDocumentContext = {},
): PrintableDocument => {
  const customer = partyOf(act.Parties, "customer");
  const supplier = partyOf(act.Parties, "supplier");
  const header = documentHeader(context, {
    customerName: customer?.Name ?? context.customerName ?? null,
    customerInn: customer?.Inn ?? context.customerInn ?? null,
    customerKpp: customer?.Kpp ?? context.customerKpp ?? null,
    supplierName: supplier?.Name ?? context.supplierName ?? null,
    supplierInn: supplier?.Inn ?? context.supplierInn ?? null,
    supplierKpp: supplier?.Kpp ?? context.supplierKpp ?? null,
  });

  const rows = act.WorkItems
    .map(
      (item, index) => `
      <tr>
        <td class="center">${escapeHtml(item.LineNumber ?? String(index + 1))}</td>
        <td>${escapeHtml(item.Name)}</td>
        <td class="center">${escapeHtml(item.Okpd2Code)}</td>
        <td class="center">${escapeHtml(item.UnitName)}</td>
        <td class="right">${escapeHtml(item.Quantity)}</td>
        <td class="right">${money(item.Price)}</td>
        <td class="right">${money(item.SumWithoutVat)}</td>
        <td class="right">${money(item.VatSum)}</td>
        <td class="right">${money(item.SumWithVat)}</td>
      </tr>`,
    )
    .join("");

  const workTable = act.WorkItems.length
    ? `<table>
        <thead>
          <tr>
            <th>№</th><th>Наименование</th><th>ОКПД2</th><th>Ед.</th>
            <th>Кол-во</th><th>Цена, ₽</th><th>Без НДС, ₽</th>
            <th>НДС, ₽</th><th>С НДС, ₽</th>
          </tr>
        </thead>
        <tbody>${rows}${actTotalsRow(act, 9)}</tbody>
      </table>`
    : `<table>
        <tbody>
          <tr><td><strong>Предмет приёмки:</strong> ${escapeHtml(
            act.Period?.OperationContent ?? act.ObjectName,
          )}</td></tr>
          <tr><td><strong>Сумма с НДС, ₽:</strong> ${money(act.Totals?.SumWithVat)}</td></tr>
        </tbody>
      </table>`;

  const period = act.Period
    ? `<p><strong>Период выполнения:</strong> ${documentDate(act.Period.StartDate)} —
        ${documentDate(act.Period.EndDate)}.
        <strong>Дата предъявления:</strong> ${documentDate(act.Period.PresentationDate)}.</p>`
    : "";

  return {
    title: `Акт приёмки № ${act.ActNumber ?? ""} от ${documentDate(act.ActDate)}`,
    html: `<!doctype html><html lang="ru"><head><meta charset="utf-8">
      <title>Акт приёмки № ${escapeHtml(act.ActNumber)}</title>
      <style>${DOCUMENT_STYLES}</style></head>
      <body>
        <h1>АКТ ПРИЁМКИ № ${escapeHtml(act.ActNumber)}</h1>
        <p class="subtitle">от ${documentDate(act.ActDate)}
          · реестровый номер ЕИС ${escapeHtml(act.RegNumber)}</p>
        ${header}
        ${period}
        ${workTable}
        <table class="signature">
          <tbody>${signatureRows(act)}</tbody>
        </table>
        <p class="muted">Документ сформирован по реквизитам выгрузки карточки ЕИС
          ${escapeHtml(context.source)}. Источник: ${escapeHtml(act.FileName)}.</p>
      </body></html>`,
  };
};

/** Строка реквизитов платёжного поручения: подпись → значение. */
const requisitesRow = (label: string, raw?: string | null): string => `
  <tr><td class="muted">${escapeHtml(label)}</td><td>${escapeHtml(raw)}</td></tr>`;

/**
 * Платёжное поручение по выгрузке Казначейства: реквизиты плательщика и
 * получателя, суммы, назначение платежа, КБК и ИГК. Все поля берутся из
 * платёжного документа ЕИС — в том числе банковские счета и БИК, которые до
 * этого не мапились во фронтовую схему.
 */
export const buildPaymentOrderDocument = (
  payment: ContractCardPayment,
  context: ContractDocumentContext = {},
): PrintableDocument => {
  const amount = money(payment.Sum);
  const date = documentDate(payment.DocumentDate);
  const isAdvance = /аванс/i.test(payment.Purpose ?? "");

  return {
    title: `Платёжное поручение № ${payment.DocumentNumber ?? ""} от ${date}`,
    html: `<!doctype html><html lang="ru"><head><meta charset="utf-8">
      <title>Платёжное поручение № ${escapeHtml(payment.DocumentNumber)}</title>
      <style>${DOCUMENT_STYLES}</style></head>
      <body>
        <h1>ПЛАТЁЖНОЕ ПОРУЧЕНИЕ № ${escapeHtml(payment.DocumentNumber)}</h1>
        <p class="subtitle">от ${date}${isAdvance ? " · авансовый платёж" : ""}
          · реестровый номер ЕИС ${escapeHtml(payment.RegNumber)}</p>

        <table>
          <tbody>
            ${requisitesRow("Плательщик", payment.PayerName)}
            ${requisitesRow("ИНН / КПП плательщика", `${value(payment.PayerInn)} / ${value(payment.PayerKpp)}`)}
            ${requisitesRow("Счёт плательщика", payment.PayerAccount)}
            ${requisitesRow("Банк плательщика", payment.PayerBankName)}
            ${requisitesRow("БИК плательщика", payment.PayerBik)}
            ${requisitesRow("Получатель", payment.RecipientName)}
            ${requisitesRow("ИНН / КПП получателя", `${value(payment.RecipientInn)} / ${value(payment.RecipientKpp)}`)}
            ${requisitesRow("Счёт получателя", payment.RecipAccount)}
            ${requisitesRow("Банк получателя", payment.RecipBankName)}
            ${requisitesRow("БИК получателя", payment.RecipBik)}
          </tbody>
        </table>

        <table>
          <tbody>
            <tr>
              <td class="muted">Сумма</td>
              <td><strong>${amount} ₽</strong></td>
              <td class="muted">Сумма прописью</td>
              <td>${escapeHtml(payment.SumInWords)}</td>
            </tr>
            <tr>
              <td class="muted">Дата исполнения</td>
              <td>${documentDate(payment.ExecutionDate ?? payment.ChargeOffDate)}</td>
              <td class="muted">Код вида платежа</td>
              <td>${escapeHtml(payment.PaymentType)}</td>
            </tr>
            <tr>
              <td class="muted">КБК</td>
              <td>${escapeHtml(payment.Kbk)}</td>
              <td class="muted">ИГК</td>
              <td>${escapeHtml(payment.Igk)}</td>
            </tr>
            <tr>
              <td class="muted">Контракт</td>
              <td>№ ${escapeHtml(payment.ContractNumber ?? context.contractNumber)}
                от ${documentDate(payment.ContractDate ?? context.contractDate)}</td>
              <td class="muted">Документ о приёмке</td>
              <td>№ ${escapeHtml(payment.AcceptanceDocumentNumber)}
                от ${documentDate(payment.AcceptanceDocumentDate)}</td>
            </tr>
          </tbody>
        </table>

        <p><strong>Назначение платежа:</strong> ${escapeHtml(payment.Purpose)}</p>

        <p class="muted">Документ сформирован по реквизитам платёжного поручения
          из выгрузки карточки ЕИС ${escapeHtml(context.source)}.
          Источник: ${escapeHtml(payment.FileName)}.</p>
      </body></html>`,
  };
};

/**
 * Открыть печатную форму в новом окне. Если браузер заблокировал окно
 * (попап), возвращаем false — карточка покажет подсказку вместо тишины.
 */
export const printDocument = (document: PrintableDocument): boolean => {
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(document.html);
  printWindow.document.close();
  printWindow.document.title = document.title;
  // Печать вызываем после отрисовки: иначе Chrome печатает пустую страницу
  printWindow.addEventListener("load", () => printWindow.print(), { once: true });
  printWindow.focus();
  return true;
};
