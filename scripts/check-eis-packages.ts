import assert from "node:assert/strict";
import {
  buildEisAttachmentsInfoXml,
  buildEisContractProjectFilesXml,
  eisAttachmentIssues,
  normalizeEisAttachments,
  type EisAttachment,
} from "../src/services/Eis/eisAttachments";
import {
  buildEisChains,
  eisChainIssues,
} from "../src/services/Eis/types/eisChainBuilder";
import { EIS_CHAIN_STAGES } from "../src/services/Eis/types/eisChain";
import type { AcceptanceResponse } from "../src/services/Acceptance/acceptance.types";
import type {
  ContractPayment,
  ContractRegistryItem,
} from "../src/services/ContractRegistry/contractRegistry.schema";
import type { PurchasePlan } from "../src/services/PurchasePlan/purchasePlan.schema";
import type { EisPackage } from "../src/services/Eis/eisPackages.schema";

/**
 * Smoke-проверка вложений пакета ЕИС и звеньев исполнения цепочки.
 *
 * Проверяются: уровни проверок вложений (что ЕИС отклонит — ошибка, что она
 * досчитает сама — предупреждение), порядок и имена элементов в XML по
 * Альбому 17.0 (`attachmentWithKindType`, `contractProjectFileType`) и то, что
 * цепочка показывает приёмку и оплату, а сведение исполнения считается по
 * реестровому номеру сведений (`regNumberExecution`), а не по факту «есть
 * платёж».
 *
 * Запуск: npm run check:eis-packages.
 */

const IKZ = "2".repeat(36);

const attachment = (patch: Partial<EisAttachment> = {}): EisAttachment => ({
  fileName: "obosnovanie-nmck.pdf",
  description: "Обоснование НМЦК",
  fileSize: 1024,
  url: "https://example.test/files/obosnovanie.pdf",
  docKindCode: "EA44",
  ...patch,
});

// ─── 1. Проверки вложений ──────────────────────────────────────────────────

const complete = normalizeEisAttachments([attachment()]);
assert.deepEqual(
  eisAttachmentIssues(complete, { requireDocKind: true }).filter(
    (item) => item.severity === "error",
  ),
  [],
);

// Нет имени файла — ошибка: ЕИС не сможет принять вложение.
const noName = normalizeEisAttachments([attachment({ fileName: "  " })]);
assert.ok(
  eisAttachmentIssues(noName, { requireDocKind: true }).some(
    (item) => item.code === "attachment.no_file_name" && item.severity === "error",
  ),
);

// Дубликаты имён — ошибка: ЕИС сверяет вложения по имени.
assert.ok(
  eisAttachmentIssues(normalizeEisAttachments([attachment(), attachment()]), {
    requireDocKind: true,
  }).some((item) => item.code === "attachment.duplicate_file_name"),
);

// Файл только в нашем хранилище — ошибка с отдельным кодом: лечится выгрузкой.
assert.ok(
  eisAttachmentIssues(
    normalizeEisAttachments([
      attachment({ url: undefined, storageRef: "fs://notice/1/doc.pdf" }),
    ]),
    { requireDocKind: true },
  ).some(
    (item) =>
      item.code === "attachment.local_storage_only" && item.severity === "error",
  ),
);

// Нет кода вида документа — предупреждение: поля в модели извещения пока нет,
// но без docKindInfo ФЛК ЕИС отклонит вложение.
const noKind = normalizeEisAttachments([attachment({ docKindCode: undefined })]);
assert.deepEqual(
  eisAttachmentIssues(noKind, { requireDocKind: true }).map((item) => [
    item.code,
    item.severity,
  ]),
  [["attachment.no_doc_kind", "warning"]],
);

// Размер и отпечаток: ЕИС считает их сама — предупреждения, а не ошибки.
const noSize = normalizeEisAttachments([
  attachment({ fileSize: undefined, url: "https://example.test/a.pdf" }),
]);
assert.ok(
  eisAttachmentIssues(noSize, { requireDocKind: true }).some(
    (item) => item.code === "attachment.no_size" && item.severity === "warning",
  ),
);
assert.equal(
  eisAttachmentIssues(noSize, { requireDocKind: true, checkFingerprint: true })
    .filter((item) => item.code === "attachment.no_fingerprint").length,
  1,
  "отпечаток проверяется только там, где он есть в XSD",
);

// ─── 2. XML вложения извещения (attachmentWithKindType) ────────────────────

const attachedXml = buildEisAttachmentsInfoXml(
  normalizeEisAttachments([
    attachment({
      contentId: "11111111-1111-4111-8111-111111111111",
      url: undefined,
      docKindName: "Обоснование НМЦК",
    }),
    attachment({
      fileName: "proekt-kontrakta.docx",
      description: "Проект контракта",
      url: "https://example.test/files/proekt.docx",
      docKindCode: "EA22",
      fileSize: 2048,
    }),
  ]),
  "  ",
);

// Порядок детей — по последовательности XSD: fileName, fileSize,
// docDescription, docDate, choice, docKindInfo.
assert.match(
  attachedXml,
  /<fileName>obosnovanie-nmck\.pdf<\/fileName>\s*<fileSize>1024<\/fileSize>\s*<docDescription>Обоснование НМЦК<\/docDescription>\s*<contentId>11111111-1111-4111-8111-111111111111<\/contentId>\s*<docKindInfo><code>EA44<\/code><name>Обоснование НМЦК<\/name><\/docKindInfo>/,
);
// Во втором вложении нет contentId — уходит url (choice допускает одно из трёх).
assert.match(attachedXml, /<\/docDescription>\s*<url>https:\/\/example\.test\/files\/proekt\.docx<\/url>/);
// Элемента description в XSD нет — только docDescription.
assert.ok(!/<description>/.test(attachedXml), "description вместо docDescription");

// ─── 3. XML файлов проекта контракта (contractProjectFileType) ─────────────

const filesXml = buildEisContractProjectFilesXml(
  normalizeEisAttachments([
    attachment({
      fileName: "proekt.docx",
      contentId: "22222222-2222-4222-8222-222222222222",
      url: undefined,
      fileFingerPrint: "0Y3p7D0m9Q==",
      docKindCode: undefined,
    }),
  ]),
  "  ",
);

assert.match(
  filesXml,
  /<contractProjectFileInfo>\s*<fileName>proekt\.docx<\/fileName>\s*<docDescription>Обоснование НМЦК<\/docDescription>\s*<contentId>22222222-2222-4222-8222-222222222222<\/contentId>\s*<fileSize>1024<\/fileSize>\s*<fileFingerPrint>0Y3p7D0m9Q==<\/fileFingerPrint>\s*<\/contractProjectFileInfo>/,
);

// Пустых блоков не создаём: <attachmentsInfo/> ЕИС отклонит так же, как
// пустой список вложений.
assert.equal(buildEisAttachmentsInfoXml([]), "");
assert.equal(buildEisContractProjectFilesXml([]), "");

// ─── 4. Звенья исполнения в цепочке ────────────────────────────────────────

const plan = {
  id: "plan-1",
  organizationId: "org-1",
  planNumber: "001",
  status: "approved",
  publishDate: "2026-01-10",
  positions: [
    {
      id: 10,
      purchaseNumber: "0101",
      uniqueNumber: "0001",
      identificationCode: IKZ,
      amountTotal: "100000.00",
      status: "approved",
    },
  ],
} as unknown as PurchasePlan;

const contract = {
  id: "contract-1",
  organizationId: "org-1",
  contractNumber: "0373100000123000001",
  ikz: IKZ,
  eisRegistryNumber: "0373100000123000001",
  contractPrice: "100000.00",
  supplierName: "ООО «Поставщик»",
  status: "executed",
} as unknown as ContractRegistryItem;

const acceptance = {
  id: "acceptance-1",
  status: "Accepted",
  input: {
    contractId: "contract-1",
    contractNumber: "0373100000123000001",
    ikz: IKZ,
    eisRegistryNumber: "0373100000123000001",
  },
  totalWithVat: 50_000,
  submittedAt: "2026-02-01T10:00:00Z",
  registeredAt: null,
  updatedAt: "2026-02-02T10:00:00Z",
} as unknown as AcceptanceResponse;

const payment = (patch: Partial<ContractPayment> = {}): ContractPayment =>
  ({
    id: 7,
    contractId: "contract-1",
    amount: "50000.00",
    paymentType: "final",
    status: "paid",
    paymentDate: "2026-02-05",
    ...patch,
  }) as unknown as ContractPayment;

const packageRejected = {
  id: "package-1",
  documentType: "ContractExecution",
  contractEisNumber: "0373100000123000001",
  ikz: IKZ,
  status: "RejectedByFlk",
  payloadXml: "",
  payloadSha256: "",
  payloadSchemaVersion: "17.0",
  isPlaceholderFormat: false,
  signatureBase64: null,
  signerThumbprint: null,
  signedAt: null,
  eisGuid: null,
  lastError: null,
  flkErrors: [],
  validationErrors: [],
  attachments: [],
  regNumberExecution: null,
  history: [],
  createdAt: "2026-02-03T10:00:00Z",
  updatedAt: "2026-02-03T10:00:00Z",
} as unknown as EisPackage;

const [chain] = buildEisChains({
  plans: [plan],
  notes: [],
  notices: [],
  contracts: [contract],
  smpRecords: [],
  acceptances: [acceptance],
  payments: [payment()],
  packages: [packageRejected],
});

assert.ok(chain, "цепочка по позиции ПГ построена");
assert.deepEqual(
  chain.links.map((link) => link.stage),
  [...EIS_CHAIN_STAGES],
  "звенья идут в порядке движения документов",
);
assert.equal(chain.links[3].present, true, "звено приёмки заполнено");
assert.equal(chain.links[4].present, true, "звено оплаты заполнено");
assert.equal(chain.execution.acceptedCount, 1);
assert.equal(chain.execution.acceptedAmount, 50_000);
assert.equal(chain.execution.paymentCount, 1);
assert.equal(chain.execution.withoutRegNumberExecution, 1);
assert.equal(chain.execution.reconciled, false, "без номера исполнения не сведено");
assert.equal(chain.execution.flkRejectedPackages, 1);
assert.equal(chain.progress.acceptance, true);
assert.equal(chain.progress.payment, false);
assert.equal(chain.progress.total, EIS_CHAIN_STAGES.length);

const issueCodes = eisChainIssues(chain).map((item) => item.code);
assert.ok(issueCodes.includes("payment.no_reg_number"));
assert.ok(issueCodes.includes("execution.flk_rejected"));

// Реестровый номер присвоен — исполнение сведено, шаг «Оплата» пройден.
const [reconciled] = buildEisChains({
  plans: [plan],
  notes: [],
  notices: [],
  contracts: [contract],
  smpRecords: [],
  acceptances: [acceptance],
  payments: [payment({ regNumberExecution: "0000123456789012345" })],
  packages: [],
});

assert.equal(reconciled.execution.reconciled, true);
assert.equal(reconciled.progress.payment, true);
assert.equal(reconciled.links[4].identifiers.regNumberExecution, "0000123456789012345");
assert.ok(
  !eisChainIssues(reconciled).some((item) => item.code === "payment.no_reg_number"),
);

// Черновик приёмки не считается исполнением.
const [draftAcceptance] = buildEisChains({
  plans: [plan],
  notes: [],
  notices: [],
  contracts: [contract],
  smpRecords: [],
  acceptances: [{ ...acceptance, status: "Draft" } as AcceptanceResponse],
  payments: [],
});

assert.equal(draftAcceptance.execution.acceptedCount, 0);
assert.equal(draftAcceptance.progress.acceptance, false);
assert.ok(
  eisChainIssues(draftAcceptance).some(
    (item) => item.code === "acceptance.not_accepted",
  ),
);

console.log("check-eis-packages: ok");
