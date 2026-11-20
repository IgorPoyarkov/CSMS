/**
 * Контракты csms-api для изменения и расторжения контрактов (ст. 95 44-ФЗ).
 *
 * Backend сериализует enum-ы строками (`JsonStringEnumConverter`), поэтому
 * статусы, виды и типы документов здесь — строковые union-типы. Даты формата
 * DateOnly приходят как «ГГГГ-ММ-ДД», DateTimeOffset — как ISO-строка.
 */

export type ContractChangeKind = "Modification" | "Termination";

export type ContractChangeStatus =
  | "Draft"
  | "OnApproval"
  | "Approved"
  | "Signed"
  | "RegisteredInEis"
  | "Rejected"
  | "Cancelled";

export type ContractChangeDocumentType =
  | "Agreement"
  | "Notice"
  | "Decision"
  | "CourtDecision"
  | "Attachment";

/** Замечание правил: блокирующая ошибка или предупреждение. */
export interface ContractChangeIssue {
  severity: string;
  field: string;
  message: string;
}

/**
 * Снимок контракта и предлагаемые условия изменения/расторжения.
 * Совпадает с `ContractChangeInput` домена.
 */
export interface ContractChangeInput {
  organizationId: string;
  contractId: string;
  contractNumber: string;
  contractName: string;
  contractPrice: number;
  contractStatus: string;
  contractDate: string | null;
  customerName: string | null;
  supplierName: string | null;
  ikz: string | null;
  eisRegistryNumber: string | null;
  contractQuantity: number | null;
  contractExecutionEndDate: string | null;
  kind: ContractChangeKind;
  basisCode: string;
  reason: string;
  description: string | null;
  changeDate: string;
  terminationDate: string | null;
  newPrice: number | null;
  newQuantity: number | null;
  quantityUnit: string | null;
  newSubject: string | null;
  newSupplier: string | null;
  newExecutionEndDate: string | null;
  noticeNumber: string | null;
  noticeDate: string | null;
  courtDecisionNumber: string | null;
  courtDecisionDate: string | null;
  governmentActNumber: string | null;
  governmentActDate: string | null;
  formulaText: string | null;
  unitPrice: number | null;
  initialMaxPrice: number | null;
  createdBy: string;
}

export interface ContractChangeDocument {
  id: string;
  type: ContractChangeDocumentType;
  title: string;
  content: string;
  version: number;
  sha256: string;
  matchesHash: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ContractChangeEvent {
  at: string;
  from: ContractChangeStatus;
  to: ContractChangeStatus;
  action: string;
  comment: string;
  actor: string;
}

export interface ContractChangeResponse {
  id: string;
  input: ContractChangeInput;
  status: ContractChangeStatus;
  revision: number;
  documents: ContractChangeDocument[];
  events: ContractChangeEvent[];
  issues: ContractChangeIssue[];
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  signedAt: string | null;
  signedBy: string | null;
  registeredAt: string | null;
  registeredBy: string | null;
  eisRegistrationNumber: string | null;
  eisRegistrationDate: string | null;
  rejectedReason: string | null;
  cancelledReason: string | null;
}

/** Правовое основание изменения/расторжения: от флагов зависит набор полей. */
export interface ContractChangeBasis {
  code: string;
  kind: ContractChangeKind;
  article: string;
  title: string;
  description: string;
  allowsPriceChange: boolean;
  allowsQuantityChange: boolean;
  maxQuantityPercent: number;
  allowsQualityImprovement: boolean;
  requiresGovernmentAct: boolean;
  requiresCourtDecision: boolean;
  requiresUnilateralNotice: boolean;
  requiresNewSupplier: boolean;
  requiresFormula: boolean;
  requiresUnitPrice: boolean;
  requiresEisRegistration: boolean;
  onlyPriceReduction: boolean;
  maxPriceIncreasePercent: number;
}

export interface ContractChangeStatusOption {
  value: ContractChangeStatus;
  label: string;
}

export interface ContractChangeKindOption {
  value: ContractChangeKind;
  label: string;
}

export interface ContractChangeDocumentTypeOption {
  value: ContractChangeDocumentType;
  label: string;
}

export interface ContractChangeMeta {
  statuses: ContractChangeStatusOption[];
  kinds: ContractChangeKindOption[];
  documentTypes: ContractChangeDocumentTypeOption[];
  unilateralNoticeDays: number;
}

/** Действие по статусу, которое поддерживает backend. */
export type ContractChangeActionName =
  | "submit"
  | "approve"
  | "reject"
  | "sign"
  | "cancel";

export interface ContractChangeActionPayload {
  id: string;
  action: ContractChangeActionName;
  actor: string;
  comment?: string;
}

export interface RegisterContractChangePayload {
  id: string;
  actor: string;
  registrationNumber: string;
  registrationDate: string;
}

export interface AddContractChangeDocumentPayload {
  id: string;
  type: ContractChangeDocumentType;
  title: string;
  content: string;
  actor: string;
}

export interface RemoveContractChangeDocumentPayload {
  id: string;
  documentId: string;
  actor: string;
}

export interface UpdateContractChangePayload {
  id: string;
  input: ContractChangeInput;
  actor: string;
}
