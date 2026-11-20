/**
 * Контракты csms-api для электронного актирования (ст. 94 44-ФЗ).
 *
 * Backend сериализует enum-ы строками, поэтому статусы, виды и требования по
 * недостаткам здесь — строковые union-типы. `result` — код ЕИС: 0 возврат на
 * уточнение, 1 принято, 2 принято с расхождениями, 3 не принято.
 */

export type AcceptanceKind = "Primary" | "Correction";

export type AcceptanceStatus =
  | "Draft"
  | "Submitted"
  | "Accepted"
  | "AcceptedWithDiscrepancies"
  | "Refused"
  | "ReturnedForRevision"
  | "RegisteredInEis"
  | "Cancelled";

export type AcceptanceResult =
  | "ReturnedForRevision"
  | "Accepted"
  | "AcceptedWithDiscrepancies"
  | "Refused";

export type AcceptanceDefectRequirement =
  | "Replace"
  | "Repair"
  | "DeductPrice"
  | "Reject";

export interface AcceptanceIssue {
  severity: string;
  field: string;
  message: string;
}

export interface AcceptanceInput {
  organizationId: string;
  contractId: string;
  contractNumber: string;
  contractName: string;
  contractPrice: number;
  contractStatus: string;
  contractDate: string | null;
  customerName: string | null;
  supplierName: string | null;
  supplierInn: string | null;
  ikz: string | null;
  eisRegistryNumber: string | null;
  stageNumber: number | null;
  stageName: string | null;
  kind: AcceptanceKind;
  documentNumber: string | null;
  documentDate: string | null;
  correctedDocumentNumber: string | null;
  correctedDocumentDate: string | null;
  correctionReason: string | null;
  acceptanceTermDays: number;
  expertiseRequired: boolean;
  expertiseByThirdParty: boolean;
  expertiseOrganization: string | null;
  expertiseConclusionNumber: string | null;
  expertiseConclusionDate: string | null;
  commissionRequired: boolean;
  commissionDecisionNumber: string | null;
  commissionDecisionDate: string | null;
  deliveryPlace: string | null;
  notes: string | null;
  createdBy: string;
}

export interface AcceptancePosition {
  id: string;
  name: string;
  okpd2: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalWithVat: number;
  vatAmount: number;
  totalWithoutVat: number;
  countryOrigin: string | null;
  registryNumber: string | null;
}

export interface AcceptanceDefect {
  id: string;
  positionId: string | null;
  description: string;
  quantity: number;
  requirement: AcceptanceDefectRequirement;
  requirementLabel: string;
}

export interface AcceptanceEvent {
  at: string;
  from: AcceptanceStatus;
  to: AcceptanceStatus;
  action: string;
  comment: string;
  actor: string;
}

export interface AcceptanceResponse {
  id: string;
  input: AcceptanceInput;
  status: AcceptanceStatus;
  result: AcceptanceResult | null;
  revision: number;
  positions: AcceptancePosition[];
  defects: AcceptanceDefect[];
  events: AcceptanceEvent[];
  issues: AcceptanceIssue[];
  totalWithVat: number;
  vatAmount: number;
  totalWithoutVat: number;
  reviewDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  signedAt: string | null;
  signedBy: string | null;
  registeredAt: string | null;
  registeredBy: string | null;
  eisRegistrationNumber: string | null;
  eisRegistrationDate: string | null;
  refusalReason: string | null;
  returnComment: string | null;
  cancelledReason: string | null;
}

export interface AcceptanceStatusOption {
  value: AcceptanceStatus;
  label: string;
}

export interface AcceptanceKindOption {
  value: AcceptanceKind;
  label: string;
}

export interface AcceptanceResultOption {
  value: AcceptanceResult;
  eisCode: number;
  label: string;
}

export interface AcceptanceDefectRequirementOption {
  value: AcceptanceDefectRequirement;
  label: string;
}

export interface AcceptanceMeta {
  statuses: AcceptanceStatusOption[];
  kinds: AcceptanceKindOption[];
  results: AcceptanceResultOption[];
  defectRequirements: AcceptanceDefectRequirementOption[];
  vatRates: number[];
  maxReviewTermDays: number;
}

export type AcceptanceActionName = "submit" | "refuse" | "return" | "cancel";

export interface AcceptanceActionPayload {
  id: string;
  action: AcceptanceActionName;
  actor: string;
  comment?: string;
}

export interface AcceptAcceptancePayload {
  id: string;
  actor: string;
  result: AcceptanceResult;
  comment?: string;
}

export interface RegisterAcceptancePayload {
  id: string;
  actor: string;
  registrationNumber: string;
  registrationDate: string;
}

export interface AddAcceptancePositionPayload {
  id: string;
  name: string;
  okpd2?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  countryOrigin?: string;
  registryNumber?: string;
  actor: string;
}

export interface RemoveAcceptancePositionPayload {
  id: string;
  positionId: string;
  actor: string;
}

export interface AddAcceptanceDefectPayload {
  id: string;
  positionId: string | null;
  description: string;
  quantity: number;
  requirement: AcceptanceDefectRequirement;
  actor: string;
}

export interface RemoveAcceptanceDefectPayload {
  id: string;
  defectId: string;
  actor: string;
}

export interface UpdateAcceptancePayload {
  id: string;
  input: AcceptanceInput;
  actor: string;
}
