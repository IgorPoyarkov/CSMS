/**
 * Детерминированное чтение зафиксированного полного текста НПА.
 *
 * Никаких запросов к сети и никакой генерации формулировок: в подсказку
 * попадает только целая строка из снимка, найденная по явному правилу.
 * Правило задаёт поле ООЗ и подпись, но не текст значения — текст остаётся
 * дословной цитатой из снимка. Сопоставление нормы и поля делает человек,
 * поэтому все подсказки этого модуля имеют статус needs_review.
 */

export const NPA_FULLTEXT_RULES = [
  {
    // Код из okpd2-selection.json; сопоставление по подстроке, чтобы не
    // привязываться к полной дате в наименовании документа.
    match: /220-ФЗ/,
    rules: [
      {
        needle: "13) вид транспортного средства",
        field: "otherRequirements",
        label: "Вид транспортного средства (ст. 2 220-ФЗ)",
      },
      {
        needle: "14) класс транспортных средств",
        field: "otherRequirements",
        label: "Класс транспортных средств (ст. 2 220-ФЗ)",
      },
      {
        needle: "15) рейс",
        field: "otherRequirements",
        label: "Рейс (ст. 2 220-ФЗ)",
      },
    ],
  },
];

/**
 * Подсказки из полного текста НПА для агента ООЗ.
 * @param {{ code: string, text: string|null, sourceUrl?: string|null, fullTextUrl?: string|null }} input
 */
export function extractNpaFullTextSuggestions({
  code,
  text,
  sourceUrl = null,
  fullTextUrl = null,
}) {
  if (!text) return [];
  const group = NPA_FULLTEXT_RULES.find((item) => item.match.test(code));
  if (!group) return [];

  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return group.rules.flatMap((rule) => {
    const line = lines.find((item) => item.includes(rule.needle));
    if (!line) return [];
    return [
      {
        field: rule.field,
        // Значение — та же дословная строка, что и цитата: агент ничего не
        // переформулирует и не подставляет «свои» требования.
        value: line,
        label: rule.label,
        quote: line,
        source: code,
        sourceUrl: sourceUrl ?? fullTextUrl ?? null,
        documentCode: code,
        kind: "NPA",
        status: "needs_review",
        confidence: 0.55,
      },
    ];
  });
}

/** Признак того, что для документа есть зафиксированный полный текст. */
export const hasNpaFullTextRules = (code) =>
  NPA_FULLTEXT_RULES.some((item) => item.match.test(code));
