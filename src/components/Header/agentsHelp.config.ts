/** Краткая справка по программным агентам системы; развёрнутый источник — csms-api/docs/agents.md. */
export type AgentHelpStatus = "ok" | "partial" | "blocked";

export interface AgentHelpItem {
  title: string;
  kind: string;
  summary: string;
  place: string;
  status: AgentHelpStatus;
  statusLabel: string;
  details: string[];
}

export const AGENTS_HELP: AgentHelpItem[] = [
  {
    title: "Разметка правил НПА",
    kind: "Фоновый агент",
    summary:
      "Ежедневно в 03:00 МСК скачивает официальные акты, распознаёт таблицы и раскладывает правила по 21 066 кодам ОКПД2. Версии не перезаписываются.",
    place: "csms-api · NpaSyncWorker + Csms.Infrastructure/Npa/",
    status: "partial",
    statusLabel: "471-р, 1875, 2604 работают; 926/927 в разборе",
    details: [
      "Источник текста — только publication.pravo.gov.ru или загруженная заказчиком копия .pdf/.docx",
      "Самый длинный префикс ОКПД2 побеждает, exclude сильнее include предка",
      "Коды сверяются с активным справочником ОКПД2 в /okpd2 (21 066 записей)",
      "Время последней проверки отделено от времени публикации версии",
    ],
  },
  {
    title: "LLM-аналитик НПА",
    kind: "Второй агент",
    summary:
      "Разбирает только спорные строки, ищет неявные совпадения по наименованию и предлагает коды из активного справочника. Ничего не публикует молча.",
    place: "csms-api · NpaLlmAnalyzer, /api/npa/documents/{code}/analyze",
    status: "ok",
    statusLabel: "Локальная модель qwen2.5:14b-instruct-q4_K_M",
    details: [
      "Код принимается только из кандидатов конкретной строки, цитата — дословно из неё же",
      "Все предложения уходят в needs_review и не действуют до подтверждения",
      "Подтверждение — POST .../rules/{ruleId}/verify, по ID записи",
    ],
  },
  {
    title: "Извлечение функций из документа",
    kind: "Агент по запросу",
    summary:
      "Сегментирует загруженный НПА, извлекает функции и атомарные подзадачи через локальную модель, проверяет цитаты и сворачивает дубли.",
    place: "csms-api · DocumentExtractionService, /api/documents/*",
    status: "partial",
    statusLabel: "Работает на rp-471; покрытие эталона 158н 8/41 — repair",
    details: [
      "Сегмент → Map → Validate → Reduce → Curate; каждая цитата сверяется с исходником",
      "Все предложения уходят в needs_review и публикуются только по ID",
      "Коды ОКПД2 предлагаются только из активного справочника /okpd2",
    ],
  },
  {
    title: "Автообновление XSD ЕИС",
    kind: "Фоновый агент",
    summary:
      "Раз в 720 минут проверяет Альбом форматов ЕИС, скачивает ZIP с XSD/WSDL и после проверки схемы атомарно меняет каталог.",
    place: "csms-api · EisSchemaUpdateWorker, /api/eis/schemas/*",
    status: "ok",
    statusLabel: "Снимок 17.0 установлен, 32 XSD компилируются",
    details: [
      "При ошибке активные схемы остаются прежними",
      "Схемы для 658/215н и 918 в архиве ЕИС отсутствуют",
    ],
  },
  {
    title: "Опрос ЕИС 44-ФЗ",
    kind: "Отдельный worker",
    summary:
      "Последовательно опрашивает регионы, подсистемы и даты через getDocsIP, скачивает архивы и дедуплицирует документы по номеру закупки и версии.",
    place: "csms/eis-parser · Eis44Parser.Worker/PollingWorker.cs",
    status: "blocked",
    statusLabel: "Код готов, live ждёт токен ЕИС",
    details: [
      "Токен и PIN хранятся вне репозитория, в User Secrets и временном конфиге",
      "Старый токен остался в публичной истории git — подлежит отзыву",
      "Запросы идут последовательно, чтобы не превысить лимит около 8 RPS",
    ],
  },
  {
    title: "Импортёр справочников НСИ",
    kind: "Импорт по запросу",
    summary:
      "Обходит публичное дерево ЕИС, сохраняет полный объект каждой записи и публикует версию набора с SHA-256. Не фоновая служба.",
    place: "csms-api · EisNsiTreeImporter, /api/references/import/eis/{dataset}",
    status: "partial",
    statusLabel: "ОКПД2 — 21 066 кодов; КТРУ и адреса ждут выгрузок",
    details: [
      "Повторный импорт той же версии отклоняется",
      "Обновления приходят через SSE /api/references/events",
    ],
  },
];
