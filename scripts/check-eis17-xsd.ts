/**
 * Валидация генерируемого XML по настоящим схемам Альбома 17.0.
 *
 * `npm run check:eis17-criteria` сверяет значения и структуру строками, но не
 * проверяет документ схемой. Здесь XML из `buildEis17CriteriaXml` прогоняется
 * через XSD-валидатор по файлам `eis-parser/schemas/Schemas44`: порядок
 * элементов, обязательность, enum-ы (`criterionCodeEnum`,
 * `measurementOrderEnum`) и вложенность показателей.
 *
 * Ловушка: элемент `criteriaInfo` в IntegrationEPTypes.xsd объявлен локально
 * внутри `notificationInfo` и не имеет имени типа, поэтому напрямую по нему
 * валидировать нечего. Скрипт подставляет схему-пробу с элементом
 * `criteriaProbe`, который повторяет состав `criteriaInfo` (обе ветки:
 * ЭА/ЭЗК с `isCertainWorks` и конкурс без него), а содержимое критериев
 * проверяется реальным типом `criterionOKType`. Ветки не дублируются:
 * `criterionOKType` и его потомки берутся из Альбома.
 *
 * Валидатор выбирается по окружению: xmllint → python с lxml → PowerShell
 * с .NET (System.Xml.Schema). Если ни одного нет, проверка честно
 * пропускается с предупреждением, а не «зеленеет» молча.
 *
 * Запуск: npm run check:eis17-xsd.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildEis17CriteriaXml,
  mapNoticeCriteriaToEis17,
} from "../src/services/Eis/eis17Types";
import type { Eis17EvaluationCriterion } from "../src/services/Eis/eis17Types";
import type { NoticeInfoFormValues } from "../src/services/Procurements/noticeInfo.schema";

const ROOT = process.cwd();
const SCHEMA_DIR = path.join(ROOT, "eis-parser", "schemas", "Schemas44");
const EP_TYPES = path.join(SCHEMA_DIR, "IntegrationEPTypes.xsd");
const WORK_DIR = path.join(ROOT, ".tmp", "eis17-xsd");

const EIS_EP_NS = "http://zakupki.gov.ru/oos/EPtypes/1";

type NoticeCriteria =
  NoticeInfoFormValues["participantsRequirements"]["evaluationCriteria"];

const criterion = (
  patch: Partial<NoticeCriteria[number]>,
): NoticeCriteria[number] => ({
  id: "criterion",
  type: "price",
  enabled: true,
  weightPercent: 0,
  ...patch,
});

const noticeWithCriteria = (
  criteria: NoticeCriteria,
  placingWayCode = "OKP20",
  notificationType: "EOK2020" | "EF2020" = "EOK2020",
): NoticeInfoFormValues =>
  ({
    notificationType,
    generalInfo: { placingWayCode },
    participantsRequirements: { evaluationCriteria: criteria },
  }) as unknown as NoticeInfoFormValues;

if (!fs.existsSync(EP_TYPES)) {
  console.error(
    `Не найдены схемы Альбома 17.0: ${EP_TYPES}\n` +
      "Ожидается каталог eis-parser/schemas/Schemas44 с IntegrationEPTypes.xsd.",
  );
  process.exit(1);
}

fs.mkdirSync(WORK_DIR, { recursive: true });

// --- Схема-проба -----------------------------------------------------------

const probeSchemaPath = path.join(WORK_DIR, "criteriaProbe.xsd");

const probeSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:ep="${EIS_EP_NS}"
    targetNamespace="${EIS_EP_NS}"
    elementFormDefault="qualified">
  <!--
    Повторяет объявление criteriaInfo из IntegrationEPTypes.xsd: ветка ЭА/ЭЗК
    (isCertainWorks? + criterionInfo+) и конкурсная (criterionInfo+).
    targetNamespace тот же, что у Альбома, поэтому исходная схема подключается
    через xs:include (import в собственный namespace запрещён XSD), а тип
    критерия берётся из Альбома, а не копируется.
  -->
  <xs:include schemaLocation="${pathToFileURL(EP_TYPES).href}"/>
  <xs:element name="criteriaProbe">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="isCertainWorks" type="xs:boolean" minOccurs="0"/>
        <xs:element name="criterionInfo" type="ep:criterionOKType" maxOccurs="unbounded"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
`;

fs.writeFileSync(probeSchemaPath, probeSchema, "utf8");

/**
 * Оборачивает сгенерированный `criteriaInfo` в элемент схемы-пробы.
 *
 * Namespace не меняется: в документе извещения `criteriaInfo` тоже лежит
 * в пространстве имён EPtypes, а подменяется только имя внешнего элемента.
 */
const toProbeXml = (criteriaXml: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n${criteriaXml
    .replace(/^<criteriaInfo>/, `<criteriaProbe xmlns="${EIS_EP_NS}">`)
    .replace(/<\/criteriaInfo>$/, "</criteriaProbe>")}\n`;

// --- Валидаторы ------------------------------------------------------------

type ValidationOutcome = { ok: boolean; messages: string[] };

type XsdValidator = {
  name: string;
  validate: (schemaPath: string, xmlPath: string) => ValidationOutcome | null;
};

const shell = (command: string, args: string[]) =>
  spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  });

const toMessages = (stdout: string | null, stderr: string | null): string[] =>
  `${stdout ?? ""}${stderr ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

const validators: XsdValidator[] = [
  {
    name: "xmllint",
    validate: (schemaPath, xmlPath) => {
      const result = shell("xmllint", [
        "--noout",
        "--schema",
        schemaPath,
        xmlPath,
      ]);

      if (result.error) return null;

      return {
        ok: result.status === 0,
        messages: toMessages(result.stdout, result.stderr),
      };
    },
  },
  {
    name: "python + lxml",
    validate: (schemaPath, xmlPath) => {
      const probe = shell("python", ["-c", "import lxml.etree"]);

      if (probe.error || probe.status !== 0) return null;

      const script = [
        "import sys",
        "from lxml import etree",
        "schema = etree.XMLSchema(etree.parse(sys.argv[1]))",
        "document = etree.parse(sys.argv[2])",
        "if schema.validate(document):",
        "    sys.exit(0)",
        "for error in schema.error_log:",
        "    print('строка %s: %s' % (error.line, error.message))",
        "sys.exit(1)",
      ].join("\n");
      const result = shell("python", ["-c", script, schemaPath, xmlPath]);

      if (result.error) return null;

      return {
        ok: result.status === 0,
        messages: toMessages(result.stdout, result.stderr),
      };
    },
  },
  {
    name: "PowerShell + System.Xml.Schema",
    validate: (schemaPath, xmlPath) => {
      const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
      const script = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$schemaPath = ${quote(schemaPath)}
$xmlPath = ${quote(xmlPath)}
try {
  $settings = New-Object System.Xml.XmlReaderSettings
  $settings.ValidationType = [System.Xml.ValidationType]::Schema
  $settings.ValidationFlags = [System.Xml.Schema.XmlSchemaValidationFlags]::ReportValidationWarnings
  $schemas = New-Object System.Xml.Schema.XmlSchemaSet
  $schemas.XmlResolver = New-Object System.Xml.XmlUrlResolver
  $schemaReader = [System.Xml.XmlReader]::Create($schemaPath)
  $schema = [System.Xml.Schema.XmlSchema]::Read($schemaReader, [System.Xml.Schema.ValidationEventHandler]$null)
  $schemaReader.Close()
  [void]$schemas.Add($schema)
  $schemas.Compile()
  $settings.Schemas = $schemas
  $messages = New-Object 'System.Collections.Generic.List[string]'
  $handler = [System.Xml.Schema.ValidationEventHandler]{
    param($sender, $eventArgs)
    $exception = $eventArgs.Exception
    $messages.Add(('{0}: {1} (строка {2}, позиция {3})' -f $eventArgs.Severity, $eventArgs.Message, $exception.LineNumber, $exception.LinePosition))
  }
  $settings.add_ValidationEventHandler($handler)
  $reader = [System.Xml.XmlReader]::Create($xmlPath, $settings)
  while ($reader.Read()) { }
  $reader.Close()
} catch {
  Write-Output ('ERROR: ' + $_.Exception.Message)
  exit 2
}
$messages | ForEach-Object { Write-Output $_ }
if ($messages.Count -gt 0) { exit 1 }
exit 0
`;

      // -EncodedCommand снимает проблему кавычек в путях с пробелами.
      const encoded = Buffer.from(script, "utf16le").toString("base64");

      for (const executable of ["pwsh", "powershell"]) {
        const result = shell(executable, [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-EncodedCommand",
          encoded,
        ]);

        if (result.error) continue;

        return {
          ok: result.status === 0,
          messages: toMessages(result.stdout, result.stderr),
        };
      }

      return null;
    },
  },
];

/**
 * Первый доступный валидатор. Отсутствие бинарника/модуля даёт `null`,
 * а ошибки чтения схемы возвращаются как результат валидации — тогда
 * настоящий прогон покажет текст, а не тихо пропустит проверку.
 */
const pickValidator = (): XsdValidator | null => {
  for (const validator of validators) {
    if (validator.validate(probeSchemaPath, probeSchemaPath) !== null) {
      return validator;
    }
  }

  return null;
};

// --- Кейсы -----------------------------------------------------------------

type Case = {
  name: string;
  criteria: Eis17EvaluationCriterion[];
  includeCertainWorks?: boolean;
  isCertainWorks?: boolean;
};

const cases: Case[] = [
  {
    name: "конкурс: формула и шкала",
    criteria: mapNoticeCriteriaToEis17(
      noticeWithCriteria([
        criterion({ id: "c-price", type: "price", weightPercent: 60 }),
        criterion({
          id: "c-quality",
          type: "qualitative_characteristics",
          weightPercent: 40,
          additionalInfo: "Оценка по п. 20 Положения",
          indicators: [
            {
              id: "i-quality",
              name: "Качество работ",
              weightPercent: 70,
              best: "max",
              scoring: "formula",
              unit: "балл",
              limitMin: 0,
              limitMax: 100,
            },
            {
              id: "i-eco",
              name: "Экологичность",
              weightPercent: 30,
              best: "min",
              scoring: "scale",
              scaleText: "Шкала 1–5",
            },
          ],
        }),
      ]),
    ),
  },
  {
    name: "конкурс: иной порядок оценки (п. 22)",
    criteria: mapNoticeCriteriaToEis17(
      noticeWithCriteria([
        criterion({ id: "c-price", type: "price", weightPercent: 60 }),
        criterion({
          id: "c-quality-other",
          type: "qualitative_characteristics",
          weightPercent: 40,
          indicators: [
            {
              id: "i-other",
              name: "Опыт работ по иному порядку",
              weightPercent: 100,
              best: "none",
              scoring: "other",
              otherOrder: "Балл = 100 − отклонение от лучшего предложения, %",
            },
          ],
        }),
      ]),
    ),
  },
  {
    name: "аукцион: единственный критерий «цена»",
    criteria: mapNoticeCriteriaToEis17(
      noticeWithCriteria([], "EA20", "EF2020"),
    ),
    includeCertainWorks: true,
    isCertainWorks: false,
  },
  {
    name: "конкурс: расходы MC с показателями",
    criteria: mapNoticeCriteriaToEis17(
      noticeWithCriteria([
        criterion({ id: "c-price", type: "price", weightPercent: 40 }),
        criterion({
          id: "c-exploitation",
          type: "exploitation_expenses",
          weightPercent: 60,
          indicators: [
            {
              id: "i-repair",
              name: "Стоимость ремонта",
              weightPercent: 100,
              best: "min",
              scoring: "formula",
              unit: "руб",
            },
          ],
        }),
      ]),
    ),
  },
  {
    name: "конкурс: квалификация QO с показателями",
    criteria: mapNoticeCriteriaToEis17(
      noticeWithCriteria([
        criterion({ id: "c-price", type: "price", weightPercent: 60 }),
        criterion({
          id: "c-qualification",
          type: "qualification",
          weightPercent: 40,
          indicators: [
            {
              id: "i-exp",
              name: "Опыт исполнения контрактов",
              weightPercent: 100,
              best: "max",
              scoring: "formula",
              unit: "шт",
            },
          ],
        }),
      ]),
    ),
  },
];

// --- Прогон ----------------------------------------------------------------

const validator = pickValidator();

if (!validator) {
  console.warn(
    "XSD-валидация пропущена: не найден xmllint, python с lxml или PowerShell " +
      "с System.Xml.Schema. Смысловые проверки check:eis17-criteria при этом выполняются.",
  );
  process.exit(0);
}

let failed = 0;

for (const [index, item] of cases.entries()) {
  const criteriaXml = buildEis17CriteriaXml(item.criteria, {
    includeCertainWorks: item.includeCertainWorks,
    isCertainWorks: item.isCertainWorks,
  });

  if (!criteriaXml) {
    console.error(`[${item.name}] пустой criteriaInfo — генерировать нечего`);
    failed += 1;
    continue;
  }

  const xmlPath = path.join(WORK_DIR, `case-${index + 1}.xml`);
  fs.writeFileSync(xmlPath, toProbeXml(criteriaXml), "utf8");

  const outcome = validator.validate(probeSchemaPath, xmlPath);

  if (!outcome) {
    console.warn(`[${item.name}] валидатор ${validator.name} недоступен`);
    continue;
  }

  if (outcome.ok) {
    console.log(`ok   ${item.name}`);
    continue;
  }

  failed += 1;
  console.error(`FAIL ${item.name} (${validator.name})`);
  for (const message of outcome.messages) {
    console.error(`     ${message}`);
  }
}

if (failed > 0) {
  console.error(
    `\nXSD-валидация criteriaInfo: ${failed} кейс(ов) с ошибками. ` +
      "Файлы для разбора: .tmp/eis17-xsd.",
  );
  process.exit(1);
}

console.log(
  `XSD-валидация criteriaInfo по IntegrationEPTypes.xsd 17.0 пройдена ` +
    `(${validator.name}): ${cases.length} кейс(ов).`,
);
