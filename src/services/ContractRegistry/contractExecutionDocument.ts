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
  /** Реестровый номер контракта в ЕИС (19 цифр) — `РеестрНомКонт`. */
  regNumber?: string | null;
  /** ИКЗ контракта — `ИКЗ` в блоке `СведКонт`. */
  ikz?: string | null;
  /**
   * Период исполнения контракта. В акте он есть не всегда (`СвПродПер`), и
   * тогда печатная форма берёт срок из самого контракта — иначе в документе
   * оставалась строка с прочерками.
   */
  periodStart?: string | null;
  periodEnd?: string | null;
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

/** Стили документа: A4, таблицы с рамкой, колонтитул источника. */
const DOCUMENT_STYLES = `
  @page { size: A4; margin: 12mm 12mm 14mm; }
  body { font-family: "Times New Roman", serif; font-size: 11pt; color: #000; }
  h1 { font-size: 14pt; text-align: center; margin: 0 0 4px; }
  h2.section { font-size: 12pt; margin: 14px 0 6px; }
  .subtitle { text-align: center; margin: 0 0 4px; font-size: 11pt; }
  .stamp { margin: 0 0 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { border: 1px solid #000; padding: 3px 5px; vertical-align: top; }
  th { background: #f2f2f2; font-weight: 600; text-align: center; }
  .plain td, .plain th { border: none; padding: 3px 4px; }
  .plain td.label { width: 30%; }
  .right { text-align: right; }
  .center { text-align: center; }
  .muted { color: #444; font-size: 9.5pt; }
  .line { min-width: 140px; height: 22px; }
  .signature { margin-top: 10px; }
  @media print { .no-print { display: none; } }
`;

/** Строка реквизитов без рамки: подпись слева, значение справа. */
const plainRow = (label: string, body: string): string => `
    <tr>
      <td class="label">${label}</td>
      <td>${body}</td>
    </tr>`;

/**
 * Сторона акта: наименование, ИНН/КПП, адрес и контакты — как в блоках
 * `СвПодр` и `СвЗак` формы ОН_АКТРЕЗРАБП. У подрядчика дополнительно
 * печатаются банковские реквизиты (`ДопПолеСтрИнф` → `БанкРекв`): по ним
 * заказчик платит, и в печатной форме акта они есть всегда.
 */
const partyBlock = (
  label: string,
  party: ContractCardParty | null,
  fallback: { name?: string | null; inn?: string | null; kpp?: string | null },
  withBank: boolean,
): string => {
  const name = escapeHtml(party?.Name ?? fallback.name);
  const short = party?.ShortName
    ? `<span class="muted"> (${escapeHtml(party.ShortName)})</span>`
    : "";
  const contact = [
    party?.Phone ? `тел. ${party.Phone}` : "",
    party?.Email ? `эл. почта ${party.Email}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const bank = party?.BankRequisites;
  const bankLines = withBank
    ? [
        bank?.BankName ? `Банк: ${bank.BankName}` : "",
        bank?.BankBik ? `БИК ${bank.BankBik}` : "",
        bank?.CorrespondentAccount
          ? `корр. счёт ${bank.CorrespondentAccount}`
          : "",
        bank?.PersonalAccount ? `расчётный счёт ${bank.PersonalAccount}` : "",
      ]
        .filter(Boolean)
        .map((line) => `<div class="muted">${escapeHtml(line)}</div>`)
        .join("")
    : "";

  return plainRow(
    label,
    `<div><strong>${name}</strong>${short}</div>
      <div class="muted">ИНН ${escapeHtml(party?.Inn ?? fallback.inn)} ·
        КПП ${escapeHtml(party?.Kpp ?? fallback.kpp)}</div>
      ${party?.Address ? `<div class="muted">Адрес: ${escapeHtml(party.Address)}</div>` : ""}
      ${contact ? `<div class="muted">${escapeHtml(contact)}</div>` : ""}
      ${bankLines}`,
  );
};

/** Строка таблицы работ акта: состав, ОКЕИ, количество и суммы по НДС. */
const workItemRow = (
  item: ContractCardAct["WorkItems"][number],
  index: number,
): string => {
  const okpd = item.Okpd2Code
    ? `<div class="muted">ОКПД2 ${escapeHtml(item.Okpd2Code)}${
        item.Okpd2Name ? ` — ${escapeHtml(item.Okpd2Name)}` : ""
      }</div>`
    : "";

  return `
    <tr>
      <td class="center">${escapeHtml(item.LineNumber || String(index + 1))}</td>
      <td>${escapeHtml(item.Name)}${okpd}</td>
      <td class="center">${escapeHtml(item.UnitName)}</td>
      <td class="right">${escapeHtml(item.Quantity)}</td>
      <td class="right">${money(item.Price)}</td>
      <td class="right">${money(item.SumWithoutVat)}</td>
      <td class="center">${escapeHtml(item.VatRate)}</td>
      <td class="right">${money(item.VatSum)}</td>
      <td class="right"><strong>${money(item.SumWithVat)}</strong></td>
    </tr>`;
};

/** Итоговая строка таблицы работ: `ВсегоАктОтч` формы. */
const actTotalsRow = (act: ContractCardAct, columns: number): string => {
  const totals = act.Totals;
  if (!totals) return "";

  return `
    <tr>
      <td colspan="${columns - 4}" class="right"><strong>Всего по акту:</strong></td>
      <td class="right">${money(totals.SumWithoutVat)}</td>
      <td class="center">—</td>
      <td class="right">${money(totals.VatSum)}</td>
      <td class="right"><strong>${money(totals.SumWithVat)}</strong></td>
    </tr>`;
};

/** Вложения акта: КС-2, ЖПР, исполнительная документация (`Вложен`). */
const attachmentsTable = (act: ContractCardAct): string => {
  if (act.Attachments.length === 0) return "";

  const rows = act.Attachments.map(
    (file, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(file.FileName)}</td>
        <td>${escapeHtml(file.DocumentKindName)}</td>
        <td class="center">${escapeHtml(file.Extension)}</td>
        <td class="center">${documentDate(file.AttachedAt)}</td>
      </tr>`,
  ).join("");

  return `
    <h2 class="section">Приложения</h2>
    <table>
      <thead>
        <tr>
          <th>№</th><th>Файл</th><th>Вид документа</th><th>Формат</th>
          <th>Прикреплён</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

/** Подписанты акта: должность, ФИО и основание полномочий (`ПодписантПодр`). */
const signatoryTable = (act: ContractCardAct): string => {
  if (act.Signatories.length === 0) {
    return `
      <table class="signature">
        <tbody>
          <tr><td>Заказчик</td><td class="line"></td><td class="line"></td></tr>
          <tr><td>Подрядчик</td><td class="line"></td><td class="line"></td></tr>
        </tbody>
      </table>`;
  }

  const rows = act.Signatories.map((signatory) => {
    const name = [signatory.LastName, signatory.FirstName, signatory.MiddleName]
      .filter(Boolean)
      .join(" ");
    return `
      <tr>
        <td>${escapeHtml(signatory.Position)}</td>
        <td class="line"></td>
        <td>${escapeHtml(name)}${
          signatory.AuthorityBasis
            ? `<div class="muted">${escapeHtml(signatory.AuthorityBasis)}</div>`
            : ""
        }</td>
      </tr>`;
  }).join("");

  return `
    <h2 class="section">Подписант</h2>
    <table class="signature">
      <thead>
        <tr><th>Должность</th><th>Подпись</th><th>Фамилия, имя, отчество</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

/**
 * Акт приёмки по документу о приёмке из карточки ЕИС.
 *
 * Форма повторяет структуру XML, который подписывается в ЕИС
 * (ОН_АКТРЕЗРАБП, КНД 1110335), — в том же порядке блоков:
 * 1) `СвАктСдПр` — номер, дата, объект, контракт, реестровый номер, ИКЗ, этап;
 * 2) `СвПодр` / `СвЗак` — стороны договора с реквизитами и банком;
 * 3) `НаимИСт` / `ВидРаб` — состав работ по строкам сметы с ОКПД2, ОКЕИ,
 *    количеством, ценой без НДС, ставкой и суммой налога;
 * 4) `ВсегоАктОтч` — итоги по акту;
 * 5) `СвПродПер` — содержание операции, дата предъявления и период;
 * 6) `Вложен` — приложения (КС-2, ЖПР, исполнительная документация);
 * 7) `ПодписантПодр` — подписант подрядчика с основанием полномочий.
 *
 * Ничего не додумывается: если реквизита нет в выгрузке, в форме прочерк.
 */
export const buildAcceptanceActDocument = (
  act: ContractCardAct,
  context: ContractDocumentContext = {},
): PrintableDocument => {
  const customer = partyOf(act.Parties, "customer");
  const supplier = partyOf(act.Parties, "supplier");

  // Период: сначала `СвПродПер`, затем срок контракта — в печатной форме
  // период заполнен всегда, если он вообще известен по карточке
  const periodStart = act.Period?.StartDate || context.periodStart || null;
  const periodEnd = act.Period?.EndDate || context.periodEnd || null;
  const presentation = act.Period?.PresentationDate || act.ActDate || null;
  const operation =
    act.Period?.OperationContent ||
    (act.WorkItems.length > 0 ? "Работы выполнены в полном объёме" : "");

  // Шапка: код формы и служебные реквизиты выгрузки (`Документ` в XML)
  const stamp = [
    act.Knd ? `КНД ${act.Knd}` : "",
    act.FormVersion ? `версия формы ${act.FormVersion}` : "",
    act.CurrencyCode ? `валюта ${act.CurrencyCode}` : "",
    act.InfoDate
      ? `сведения сформированы ${documentDate(act.InfoDate)}${
          act.InfoTime ? ` в ${act.InfoTime}` : ""
        }`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const parties = `
    <table class="plain">
      <tbody>
        ${partyBlock(
          "Заказчик",
          customer,
          {
            name: context.customerName,
            inn: context.customerInn,
            kpp: context.customerKpp,
          },
          false,
        )}
        ${partyBlock(
          "Подрядчик (исполнитель)",
          supplier,
          {
            name: context.supplierName,
            inn: context.supplierInn,
            kpp: context.supplierKpp,
          },
          true,
        )}
      </tbody>
    </table>`;

  // ОсновСтроит: реестровый номер контракта, ИКЗ и этап исполнения
  const contractBlock = `
    <table class="plain">
      <tbody>
        ${plainRow(
          "Контракт",
          `<strong>№ ${escapeHtml(act.Contract?.Number ?? context.contractNumber)}</strong>
            от ${documentDate(act.Contract?.Date ?? context.contractDate)}`,
        )}
        ${plainRow(
          "Наименование объекта",
          escapeHtml(act.ObjectName ?? context.contractName),
        )}
        ${plainRow(
          "Реестровый номер контракта",
          escapeHtml(act.RegNumber || context.regNumber),
        )}
        ${plainRow("ИКЗ", escapeHtml(act.Stage?.Ikz || context.ikz))}
        ${plainRow(
          "Этап исполнения",
          escapeHtml(act.Stage?.TechnicalSid || act.Stage?.Sid),
        )}
      </tbody>
    </table>`;

  const workTable = act.WorkItems.length
    ? `<h2 class="section">Состав работ</h2>
      <table>
        <thead>
          <tr>
            <th>№</th><th>Наименование работ (товаров, услуг)</th>
            <th>Ед. изм.</th><th>Кол-во</th><th>Цена без НДС, ₽</th>
            <th>Стоимость без НДС, ₽</th><th>Ставка НДС</th>
            <th>Сумма налога, ₽</th><th>Стоимость с НДС, ₽</th>
          </tr>
        </thead>
        <tbody>${act.WorkItems.map(workItemRow).join("")}${actTotalsRow(act, 9)}</tbody>
      </table>`
    : `<h2 class="section">Предмет приёмки</h2>
      <table>
        <tbody>
          <tr><td>${escapeHtml(operation || act.ObjectName)}</td></tr>
          <tr>
            <td><strong>Стоимость с НДС:</strong>
              ${money(act.Totals?.SumWithVat)} ₽</td>
          </tr>
        </tbody>
      </table>`;

  const periodBlock = `
    <h2 class="section">Период выполнения</h2>
    <table class="plain">
      <tbody>
        ${plainRow("Содержание операции", escapeHtml(operation))}
        ${plainRow(
          "Дата предъявления к приёмке",
          documentDate(presentation),
        )}
        ${plainRow(
          "Период выполнения работ",
          `${documentDate(periodStart)} — ${documentDate(periodEnd)}`,
        )}
      </tbody>
    </table>`;

  return {
    title: `Акт приёмки № ${act.ActNumber ?? ""} от ${documentDate(act.ActDate)}`,
    html: `<!doctype html><html lang="ru"><head><meta charset="utf-8">
      <title>Акт приёмки № ${escapeHtml(act.ActNumber)}</title>
      <style>${DOCUMENT_STYLES}</style></head>
      <body>
        <h1>АКТ ПРИЁМКИ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ)</h1>
        <p class="subtitle">№ ${escapeHtml(act.ActNumber)} от ${documentDate(act.ActDate)}</p>
        <p class="subtitle muted stamp">${escapeHtml(stamp)}</p>
        ${parties}
        ${contractBlock}
        ${workTable}
        ${periodBlock}
        ${attachmentsTable(act)}
        ${signatoryTable(act)}
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
