import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  useForm,
  useFieldArray,
  FormProvider,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import {
  ContractProjectSchema,
  emptyContractProject,
  sectionCompletion,
  MANDATORY_TERMS,
  conclusionDeadline,
  type ContractProject,
} from "../../services/ContractProject/contractProject.schema";
import {
  useCreateContractProject,
  useOrganizationContractProjects,
  useUpdateContractProject,
} from "../../services/ContractProject/contractProject.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useNotices } from "../../services/Procurements/noticeInfo.api";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { hasSmpSubcontractingRequirement } from "../../services/PurchaseNote/purchaseNote.schema";
import { useOrganizationObjectDescriptions } from "../../services/ObjectDescription/objectDescription.api";
import {
  buildObjectDescriptionSummaryText,
  formatCharacteristicValue,
} from "../../services/ObjectDescription/objectDescription.schema";
import Okpd2Select from "../UI/Okpd2Select/Okpd2Select";
import ContractRiskAssessmentPanel from "./ContractRiskAssessmentPanel";
import styles from "./ContractProject.module.scss";

// ─── Типы полей формы (плоские) ────────────────────────────────────────────

interface ContractLocationState {
  ikz?: string;
  name?: string;
  procurementType?: string;
  nmck?: number;
  noticeNumber?: string;
  kbk?: string;
}

interface FlatForm {
  procurementId: string;
  contractName: string;
  ikz: string;
  noticeNumber: string;
  smpRequiredPercent: string;
  subcontractingSmpNoteNumber: string;
  customerName: string;
  supplierName: string;
  projectDate: string;
  conclusionDate: string;
  protocolOfDisagreements: boolean;
  // subject
  objectName: string;
  description: string;
  okpd2Code: string;
  kved2Code: string;
  quantity: string;
  deliveryPlace: string;
  // price
  initialMaxPrice: string;
  finalPrice: string;
  priceBasis: string;
  priceIncludesExpenses: boolean;
  paymentProcedure: string;
  advancePercent: string;
  paymentTermDays: string;
  // term
  startDate: string;
  endDate: string;
  validUntil: string;
  acceptanceProcedure: string;
  acceptanceTermDays: string;
  // quality
  qualityRequirements: string;
  warrantyPeriodMonths: string;
  serviceLifeMonths: string;
  specifications: string;
  // security
  bidSecurityRequired: boolean;
  bidSecurityPercent: string;
  performanceSecurityRequired: boolean;
  performanceSecurityPercent: string;
  warrantySecurityRequired: boolean;
  securityAmount: string;
  penaltyFormula: string;
  fixedPenaltyAmount: string;
  interimPenaltyEnabled: boolean;
  // change
  changeConditions: string;
  allowQuantityChange: boolean;
  allowPriceChange: boolean;
  terminationConditions: string;
  securityReturnDays: string;
  // stages
  stages: { name: string; endDate: string; amount: string }[];
}

const fromProject = (p: ContractProject): FlatForm => ({
  procurementId: p.procurementId !== undefined ? String(p.procurementId) : "",
  contractName: p.contractName ?? "",
  ikz: p.ikz ?? "",
  noticeNumber: p.noticeNumber ?? "",
  smpRequiredPercent: p.smpRequiredPercent ?? "",
  subcontractingSmpNoteNumber: p.subcontractingSmpNoteNumber ?? "",
  customerName: p.customerName ?? "",
  supplierName: p.supplierName ?? "",
  projectDate: p.projectDate ?? "",
  conclusionDate: p.conclusionDate ?? "",
  protocolOfDisagreements: p.protocolOfDisagreements ?? false,
  objectName: p.subject.objectName,
  description: p.subject.description ?? "",
  okpd2Code: p.subject.okpd2Code ?? "",
  kved2Code: p.subject.kved2Code ?? "",
  quantity: p.subject.quantity ?? "",
  deliveryPlace: p.subject.deliveryPlace ?? "",
  initialMaxPrice: p.price.initialMaxPrice ?? "",
  finalPrice: p.price.finalPrice ?? "",
  priceBasis: p.price.priceBasis ?? "",
  priceIncludesExpenses: p.price.priceIncludesExpenses ?? true,
  paymentProcedure: p.price.paymentProcedure ?? "postpayment",
  advancePercent: p.price.advancePercent ?? "",
  paymentTermDays: String(p.price.paymentTermDays ?? 7),
  startDate: p.term.startDate ?? "",
  endDate: p.term.endDate ?? "",
  validUntil: p.term.validUntil ?? "",
  acceptanceProcedure: p.term.acceptanceProcedure ?? "",
  acceptanceTermDays: String(p.term.acceptanceTermDays ?? 10),
  qualityRequirements: p.quality.qualityRequirements ?? "",
  warrantyPeriodMonths:
    p.quality.warrantyPeriodMonths !== undefined
      ? String(p.quality.warrantyPeriodMonths)
      : "",
  serviceLifeMonths:
    p.quality.serviceLifeMonths !== undefined
      ? String(p.quality.serviceLifeMonths)
      : "",
  specifications: p.quality.specifications ?? "",
  bidSecurityRequired: p.security.bidSecurityRequired ?? false,
  bidSecurityPercent: p.security.bidSecurityPercent ?? "",
  performanceSecurityRequired: p.security.performanceSecurityRequired ?? true,
  performanceSecurityPercent: p.security.performanceSecurityPercent ?? "5",
  warrantySecurityRequired: p.security.warrantySecurityRequired ?? false,
  securityAmount: p.security.securityAmount ?? "",
  penaltyFormula: p.security.penaltyFormula ?? "",
  fixedPenaltyAmount: p.security.fixedPenaltyAmount ?? "",
  interimPenaltyEnabled: p.security.interimPenaltyEnabled ?? true,
  changeConditions: p.change.changeConditions ?? "",
  allowQuantityChange: p.change.allowQuantityChange ?? false,
  allowPriceChange: p.change.allowPriceChange ?? false,
  terminationConditions: p.change.terminationConditions ?? "",
  securityReturnDays:
    p.change.securityReturnDays !== undefined
      ? String(p.change.securityReturnDays)
      : "30",
  stages: (p.term.stages ?? []).map((s) => ({
    name: s.name,
    endDate: s.endDate ?? "",
    amount: s.amount ?? "",
  })),
});

const toProject = (f: FlatForm, orgId: string | number): ContractProject => ({
  organizationId: orgId,
  procurementId: f.procurementId || undefined,
  ikz: f.ikz,
  noticeNumber: f.noticeNumber,
  smpRequiredPercent: f.smpRequiredPercent || undefined,
  subcontractingSmpNoteNumber: f.subcontractingSmpNoteNumber || undefined,
  contractName: f.contractName,
  customerName: f.customerName,
  supplierName: f.supplierName,
  projectDate: f.projectDate,
  conclusionDate: f.conclusionDate,
  protocolOfDisagreements: f.protocolOfDisagreements,
  subject: {
    objectName: f.objectName,
    description: f.description,
    okpd2Code: f.okpd2Code,
    kved2Code: f.kved2Code,
    quantity: f.quantity,
    deliveryPlace: f.deliveryPlace,
  },
  price: {
    initialMaxPrice: f.initialMaxPrice,
    finalPrice: f.finalPrice,
    priceBasis: f.priceBasis,
    priceIncludesExpenses: f.priceIncludesExpenses,
    paymentProcedure:
      (f.paymentProcedure as "advance" | "postpayment" | "staged") ||
      "postpayment",
    advancePercent: f.advancePercent,
    paymentTermDays: f.paymentTermDays ? Number(f.paymentTermDays) : undefined,
  },
  term: {
    startDate: f.startDate,
    endDate: f.endDate,
    validUntil: f.validUntil,
    stages: f.stages.filter((s) => s.name),
    acceptanceProcedure: f.acceptanceProcedure,
    acceptanceTermDays: f.acceptanceTermDays
      ? Number(f.acceptanceTermDays)
      : undefined,
  },
  quality: {
    qualityRequirements: f.qualityRequirements,
    warrantyPeriodMonths: f.warrantyPeriodMonths
      ? Number(f.warrantyPeriodMonths)
      : undefined,
    serviceLifeMonths: f.serviceLifeMonths
      ? Number(f.serviceLifeMonths)
      : undefined,
    specifications: f.specifications,
  },
  security: {
    bidSecurityRequired: f.bidSecurityRequired,
    bidSecurityPercent: f.bidSecurityPercent,
    performanceSecurityRequired: f.performanceSecurityRequired,
    performanceSecurityPercent: f.performanceSecurityPercent,
    warrantySecurityRequired: f.warrantySecurityRequired,
    securityAmount: f.securityAmount,
    penaltyFormula: f.penaltyFormula,
    fixedPenaltyAmount: f.fixedPenaltyAmount,
    interimPenaltyEnabled: f.interimPenaltyEnabled,
  },
  change: {
    changeConditions: f.changeConditions,
    allowQuantityChange: f.allowQuantityChange,
    allowPriceChange: f.allowPriceChange,
    terminationConditions: f.terminationConditions,
    securityReturnDays: f.securityReturnDays
      ? Number(f.securityReturnDays)
      : undefined,
  },
  status: "draft",
  createdAt: f.projectDate,
  updatedAt: new Date().toISOString().slice(0, 10),
});

// Маппинг ошибок вложенной ContractProjectSchema обратно на плоские поля формы
const createFlatResolver =
  (getOrgId: () => string | number): Resolver<FlatForm> =>
  async (values) => {
    const candidate = toProject(values, getOrgId());
    const parsed = ContractProjectSchema.safeParse(candidate);
    if (parsed.success) {
      return { values, errors: {} };
    }

    const flatErrors: FieldErrors<FlatForm> = {};
    for (const issue of parsed.error.issues) {
      const leaf = issue.path[issue.path.length - 1];
      const fieldKey =
        typeof leaf === "string" && leaf in values
          ? (leaf as keyof FlatForm)
          : (String(issue.path[0] ?? "contractName") as keyof FlatForm);
      if (!flatErrors[fieldKey]) {
        flatErrors[fieldKey] = {
          type: issue.code,
          message: issue.message,
        };
      }
    }

    return { values: {}, errors: flatErrors };
  };

// ─── Компонент ─────────────────────────────────────────────────────────────

export default function ContractProjectForm() {
  const { id } = useParams();
  const location = useLocation();
  const stateData = location.state as ContractLocationState | undefined;

  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id ?? 1;

  const { data: orgProjects = [], isLoading: loadingProjects } =
    useOrganizationContractProjects(orgId);
  const { data: notices = [] } = useNotices();
  const { data: purchaseNotes = [] } = usePurchaseNotes(orgId);
  const { data: objectDescriptions = [] } =
    useOrganizationObjectDescriptions(orgId);

  const { mutate: createProject, isPending: isCreating } =
    useCreateContractProject();
  const { mutate: updateProject, isPending: isUpdating } =
    useUpdateContractProject();

  const [activeSection, setActiveSection] = useState("general");
  const [saved, setSaved] = useState(false);

  // Существующий проект контракта именно этой закупки (по procurementId или ИКЗ)
  const existing = useMemo(() => {
    if (id) {
      const byProc = orgProjects.find(
        (p) => String(p.procurementId ?? "") === String(id),
      );
      if (byProc) return byProc;
    }
    if (stateData?.ikz) {
      return orgProjects.find((p) => p.ikz === stateData.ikz);
    }
    return undefined;
  }, [orgProjects, id, stateData?.ikz]);

  // Извещение для текущей закупки (из /notices)
  const matchedNotice = useMemo(() => {
    if (id) {
      const byProc = notices
        .filter((n) => String(n.procurementId ?? "") === String(id))
        .slice(-1)[0];
      if (byProc) return byProc;
    }
    const targetIkz = stateData?.ikz;
    if (targetIkz) {
      return notices
        .filter((n) => n.ikz === targetIkz || n.generalInfo?.ikz === targetIkz)
        .slice(-1)[0];
    }
    return undefined;
  }, [notices, id, stateData?.ikz]);

  // Потребность (СЗ) для текущей закупки
  const matchedNote = useMemo(() => {
    const noteId = matchedNotice?.purchaseNoteId;
    if (noteId !== undefined && noteId !== null && noteId !== "") {
      const byId = purchaseNotes.find((n) => String(n.id) === String(noteId));
      if (byId) return byId;
    }
    if (id) {
      const byProc = purchaseNotes
        .filter((n) => String(n.procurementId ?? "") === String(id))
        .slice(-1)[0];
      if (byProc) return byProc;
    }
    const targetIkz =
      matchedNotice?.generalInfo?.ikz || stateData?.ikz || undefined;
    if (targetIkz) {
      return purchaseNotes.filter((n) => n.ikz === targetIkz).slice(-1)[0];
    }
    return undefined;
  }, [purchaseNotes, matchedNotice, id, stateData?.ikz]);

  // Структурированное ООЗ (если привязано к извещению или СЗ)
  const matchedDesc = useMemo(() => {
    const onlyOoz = objectDescriptions.filter(
      (d) => d.kind === "object_description",
    );
    const descId =
      matchedNotice?.objectDescriptionId ?? matchedNote?.objectDescriptionId;
    if (descId !== undefined && descId !== null && descId !== "") {
      const byId = onlyOoz.find((d) => String(d.id) === String(descId));
      if (byId) return byId;
    }
    if (id) {
      const byProc = onlyOoz.find(
        (d) => String(d.procurementId ?? "") === String(id),
      );
      if (byProc) return byProc;
    }
    const targetIkz =
      matchedNotice?.generalInfo?.ikz || matchedNote?.ikz || stateData?.ikz;
    if (targetIkz) {
      return onlyOoz.find((d) => d.ikz === targetIkz);
    }
    return undefined;
  }, [objectDescriptions, matchedNotice, matchedNote, id, stateData?.ikz]);

  const initialForm = useMemo(() => {
    const base = fromProject(existing ?? emptyContractProject(orgId));
    if (!existing && stateData?.ikz && !base.ikz) {
      base.procurementId = id ?? "";
      base.ikz = stateData.ikz;
      base.noticeNumber = stateData.noticeNumber ?? "";
      base.contractName = `Контракт: ${stateData.name ?? ""}`;
      base.objectName = stateData.name ?? "";
      if (stateData.nmck !== undefined && stateData.nmck > 0) {
        base.initialMaxPrice = stateData.nmck.toFixed(2);
      }
      base.projectDate = new Date().toISOString().slice(0, 10);
    }
    return base;
  }, [existing, orgId, stateData, id]);

  const orgIdRef = useRef(orgId);
  orgIdRef.current = orgId;

  const methods = useForm<FlatForm>({
    resolver: createFlatResolver(() => orgIdRef.current),
    defaultValues: initialForm,
  });

  const appliedKeyRef = useRef<string>("");

  // Асинхронная подгрузка существующего проекта ИЛИ предзаполнение из Извещения + СЗ + ООЗ
  useEffect(() => {
    if (methods.formState.isDirty) return;

    if (existing) {
      const key = `existing:${existing.id}`;
      if (appliedKeyRef.current === key) return;
      appliedKeyRef.current = key;
      methods.reset(fromProject(existing));
      return;
    }

    if (!matchedNotice && !matchedNote && !matchedDesc && !organization) {
      return;
    }

    const key = `prefill:${id ?? ""}:${matchedNotice?.id ?? "n"}:${matchedNote?.id ?? "p"}:${matchedDesc?.id ?? "d"}:${organization?.id ?? "o"}`;
    if (appliedKeyRef.current === key) return;
    appliedKeyRef.current = key;

    const todayIso = new Date().toISOString().slice(0, 10);
    const noticeObj = matchedNotice?.objectDescription;
    const noticeCond = matchedNotice?.contractConditions;
    const noticeReq = matchedNotice?.participantsRequirements;
    const noticeItems = matchedNotice?.purchaseObjects?.items ?? [];

    const objectTitle =
      noticeObj?.objectName ||
      matchedNotice?.generalInfo.orderName ||
      matchedNote?.subject ||
      stateData?.name ||
      "";

    const descriptionParts: string[] = [];
    if (matchedDesc) {
      descriptionParts.push(buildObjectDescriptionSummaryText(matchedDesc));
    } else if (noticeObj) {
      if (noticeObj.consumerProperties) {
        descriptionParts.push(
          `Потребительские свойства: ${noticeObj.consumerProperties}`,
        );
      }
      if (noticeObj.qualityCharacteristics) {
        descriptionParts.push(
          `Качественные характеристики: ${noticeObj.qualityCharacteristics}`,
        );
      }
      if (noticeObj.functionalProperties) {
        descriptionParts.push(
          `Функциональные характеристики: ${noticeObj.functionalProperties}`,
        );
      }
      if (noticeObj.environmentalCharacteristics) {
        descriptionParts.push(
          `Экологические характеристики: ${noticeObj.environmentalCharacteristics}`,
        );
      }
      if (noticeObj.otherRequirements) {
        descriptionParts.push(noticeObj.otherRequirements);
      }
    } else if (matchedNote) {
      descriptionParts.push(matchedNote.subject);
      if (matchedNote.otherRequirements) {
        descriptionParts.push(matchedNote.otherRequirements);
      }
    }

    const quantityStr =
      matchedNotice?.purchaseObjects?.isIndeterminateVolume ||
      matchedNote?.isIndeterminateVolume
        ? "Невозможно определить объём (ч. 24 ст. 22 44-ФЗ)"
        : noticeItems.length > 0
          ? noticeItems
              .map((it) => `${it.quantity} ${it.unit}`.trim())
              .join("; ")
          : matchedNote?.quantity
            ? `${matchedNote.quantity} ${matchedNote.unit ?? ""}`.trim()
            : "";

    const deliveryPlacesList = noticeCond?.deliveryPlaces?.length
      ? noticeCond.deliveryPlaces
      : (matchedNote?.deliveryPlaces ?? []);
    const deliveryPlaceFromCascade = deliveryPlacesList
      .map((pl) =>
        [pl.region, pl.municipality, pl.settlement, pl.address, pl.additionalInfo]
          .filter(Boolean)
          .join(", "),
      )
      .filter(Boolean)
      .join("; ");

    const nmckValue =
      matchedNotice?.generalInfo?.nmck && matchedNotice.generalInfo.nmck > 0
        ? matchedNotice.generalInfo.nmck.toFixed(2)
        : matchedNote?.initialMaxPrice
          ? matchedNote.initialMaxPrice
          : stateData?.nmck !== undefined && stateData.nmck > 0
            ? stateData.nmck.toFixed(2)
            : "";

    const perfRequired =
      noticeReq?.requiresContractSecurity ??
      matchedNote?.requiresContractSecurity ??
      true;
    const perfPercentStr =
      noticeReq?.contractSecurityPercent !== undefined
        ? String(noticeReq.contractSecurityPercent)
        : (matchedNote?.contractSecurityPercent ?? "5");

    const nmckNum = Number.parseFloat(nmckValue);
    const perfNum = Number.parseFloat(perfPercentStr);
    const computedSecurityAmount =
      perfRequired &&
      Number.isFinite(nmckNum) &&
      nmckNum > 0 &&
      Number.isFinite(perfNum) &&
      perfNum > 0
        ? ((nmckNum * perfNum) / 100).toFixed(2)
        : "";

    const specLines = noticeItems.map(
      (it, idx) =>
        `${idx + 1}. ${it.name} (ОКПД2/КТРУ: ${it.okpd2OrKtruCode || "—"}) — ${it.quantity} ${it.unit} × ${it.unitPrice.toFixed(2)} руб = ${it.totalPrice.toFixed(2)} руб`,
    );
    if (specLines.length === 0 && matchedDesc?.characteristics?.length) {
      matchedDesc.characteristics.forEach((c, idx) => {
        specLines.push(
          `${idx + 1}. ${c.name}: ${formatCharacteristicValue(c)}`,
        );
      });
    }

    const warrantyMonths =
      matchedNote?.warrantyTermMonths !== undefined
        ? String(matchedNote.warrantyTermMonths)
        : (matchedDesc?.warrantyTermMonths ?? "");

    const qualityDetails = [
      matchedNote?.warrantyMaintenanceInfo &&
        `Гарантийное обслуживание: ${matchedNote.warrantyMaintenanceInfo}`,
      matchedNote?.manufacturerWarrantyInfo &&
        `Гарантия производителя: ${matchedNote.manufacturerWarrantyInfo}`,
      matchedNote?.warrantyTermAndVolume &&
        `Срок и объём гарантии: ${matchedNote.warrantyTermAndVolume}`,
    ]
      .filter(Boolean)
      .join("\n");

    const qualityText =
      qualityDetails ||
      noticeObj?.qualityCharacteristics ||
      matchedDesc?.standards
        .map((s) => `${s.code}${s.title ? ` (${s.title})` : ""}`)
        .join(", ") ||
      matchedNote?.otherRequirements ||
      (objectTitle
        ? `Товар (работа, услуга) должен соответствовать требованиям ст. 33 Закона № 44-ФЗ, ГОСТ и техническим регламентам для объекта «${objectTitle}»`
        : "");

    const allowUnilateral =
      noticeCond?.allowUnilateralRefusalArt95 ??
      matchedNote?.allowUnilateralRefusalArt95 ??
      true;

    // Срок оплаты зависит от казначейского сопровождения (расчёт на этапе проекта контракта)
    const hasTreasury = Boolean(
      noticeReq?.requiresTreasurySupport ?? matchedNote?.requiresTreasurySupport,
    );
    const computedPaymentTermDays = matchedNote?.paymentTermDays
      ? String(matchedNote.paymentTermDays)
      : hasTreasury
        ? "10"
        : "7";

    const hasAdvanceFlag = Boolean(
      noticeCond?.hasAdvance ?? matchedNote?.hasAdvance,
    );

    const smpEnabled = matchedNote
      ? hasSmpSubcontractingRequirement(matchedNote)
      : Boolean(noticeReq?.subcontractingSmpPart5Art30);

    const acceptanceText =
      matchedNote?.acceptanceTermMode === "date" && matchedNote.acceptanceDate
        ? `Приёмка и экспертиза результатов исполнения контракта по ст. 94 Закона № 44-ФЗ в срок до ${matchedNote.acceptanceDate}`
        : `Приёмка и экспертиза результатов исполнения контракта по ст. 94 Закона № 44-ФЗ в течение ${matchedNote?.acceptanceTermDays ?? 10} рабочих дней ${matchedNote?.acceptanceEventBase || "со дня предоставления документа о приёмке"}`;

    methods.reset({
      ...initialForm,
      procurementId: id ?? "",
      contractName: objectTitle ? `Контракт: ${objectTitle}` : initialForm.contractName,
      ikz:
        matchedNotice?.generalInfo?.ikz ||
        matchedNote?.ikz ||
        stateData?.ikz ||
        initialForm.ikz,
      noticeNumber:
        matchedNotice?.generalInfo?.noticeNumber ||
        stateData?.noticeNumber ||
        initialForm.noticeNumber,
      smpRequiredPercent: smpEnabled
        ? noticeReq?.subcontractingSmpRequiredPercent ||
          (matchedNote?.smpRequiredPercent !== undefined
            ? String(matchedNote.smpRequiredPercent)
            : "")
        : "",
      subcontractingSmpNoteNumber:
        noticeReq?.subcontractingSmpNoteNumber ||
        (matchedNote?.noteNumber ? String(matchedNote.noteNumber) : ""),
      customerName:
        matchedNotice?.contactInfo?.organizationName ||
        organization?.fullName ||
        initialForm.customerName,
      projectDate: initialForm.projectDate || todayIso,
      objectName: objectTitle || initialForm.objectName,
      description: descriptionParts.join("\n") || initialForm.description,
      okpd2Code:
        noticeObj?.okpd2Code ||
        matchedDesc?.okpd2Code ||
        matchedNote?.okpd2Code ||
        initialForm.okpd2Code,
      quantity: quantityStr || initialForm.quantity,
      deliveryPlace:
        deliveryPlaceFromCascade ||
        matchedNote?.deliveryPlace ||
        initialForm.deliveryPlace,
      initialMaxPrice: nmckValue || initialForm.initialMaxPrice,
      priceBasis:
        matchedNote?.priceBasis ||
        "Обоснование НМЦК в соответствии со ст. 22 Закона № 44-ФЗ",
      paymentProcedure: hasAdvanceFlag
        ? "advance"
        : noticeCond?.hasMultipleStages
          ? "staged"
          : "postpayment",
      advancePercent: noticeCond?.hasAdvance
        ? String(noticeCond.advancePercent)
        : (matchedNote?.advancePercent ?? ""),
      paymentTermDays: computedPaymentTermDays,
      startDate:
        matchedNote?.deliveryTermMode === "absolute"
          ? (matchedNote?.desiredStartDate ?? "")
          : "",
      endDate:
        matchedNote?.deliveryTermMode === "absolute"
          ? (matchedNote?.desiredEndDate ?? "")
          : "",
      acceptanceTermDays: String(matchedNote?.acceptanceTermDays ?? 10),
      acceptanceProcedure: acceptanceText,
      qualityRequirements: qualityText,
      warrantyPeriodMonths: warrantyMonths,
      specifications: specLines.join("\n"),
      bidSecurityRequired:
        noticeReq?.requiresApplicationSecurity ??
        matchedNote?.requiresApplicationSecurity ??
        initialForm.bidSecurityRequired,
      bidSecurityPercent:
        noticeReq?.requiresApplicationSecurity &&
        noticeReq.applicationSecurityPercent !== undefined
          ? String(noticeReq.applicationSecurityPercent)
          : (matchedNote?.applicationSecurityPercent ??
            initialForm.bidSecurityPercent),
      performanceSecurityRequired: perfRequired,
      performanceSecurityPercent: perfPercentStr,
      warrantySecurityRequired:
        noticeReq?.requiresWarrantySecurity ??
        matchedNote?.requiresWarrantySecurity ??
        false,
      securityAmount: computedSecurityAmount,
      terminationConditions: allowUnilateral
        ? "Заказчик и поставщик вправе принять решение об одностороннем отказе от исполнения контракта по основаниям, предусмотренным ГК РФ (ч. 8, 9, 19 ст. 95 Закона № 44-ФЗ)"
        : "",
    });
  }, [
    existing,
    matchedNotice,
    matchedNote,
    matchedDesc,
    organization,
    id,
    stateData,
    initialForm,
    methods,
  ]);

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "stages",
  });

  const watched = methods.watch();
  const completion = sectionCompletion(toProject(watched, orgId));
  const deadline = conclusionDeadline(watched.conclusionDate);

  const onSubmit = (data: FlatForm) => {
    const project = toProject(data, orgId);
    const markSaved = () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    };

    if (existing?.id !== undefined) {
      updateProject(
        { id: existing.id, ...project },
        { onSuccess: markSaved },
      );
    } else {
      createProject(project, { onSuccess: markSaved });
    }
  };

  if (loadingProjects) return <div className={styles.loader}>Загрузка...</div>;

  const sections = [
    { id: "general", label: "Общие сведения" },
    { id: "subject", label: "1. Предмет (ст. 33)" },
    { id: "price", label: "2. Цена и оплата (ст. 33, 34)" },
    { id: "term", label: "3. Срок и приёмка (ст. 33, 94)" },
    { id: "quality", label: "4. Качество и гарантия (ст. 33)" },
    { id: "security", label: "5. Обеспечение и неустойка (ст. 34)" },
    { id: "change", label: "6. Изменение (ст. 95)" },
  ];

  const renderField = (
    name: keyof FlatForm,
    label: string,
    type = "text",
    placeholder = "",
    hint = "",
  ) => {
    const error = methods.formState.errors[name]?.message;
    return (
      <div className={styles.field}>
        <label className={styles.label}>
          {label}
          {hint && <span className={styles.hint}> {hint}</span>}
        </label>
        <input
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          type={type}
          placeholder={placeholder}
          {...methods.register(name)}
        />
        {error && <span className={styles.error}>{String(error)}</span>}
      </div>
    );
  };

  // ОКПД2 проекта контракта выбирается из справочника (поиск по коду и
  // наименованию), как и в плане-графике
  const renderOkpd2Field = () => {
    const error = methods.formState.errors.okpd2Code?.message;

    return (
      <div className={styles.field}>
        <label className={styles.label}>Код ОКПД2</label>
        <Okpd2Select
          code={watched.okpd2Code}
          onSelect={(item) =>
            methods.setValue("okpd2Code", item?.code ?? "", {
              shouldValidate: true,
            })
          }
        />
        {error && <span className={styles.error}>{String(error)}</span>}
      </div>
    );
  };

  const renderCheckbox = (name: keyof FlatForm, label: string) => (
    <label className={styles.checkbox}>
      <input type="checkbox" {...methods.register(name)} />
      <span>{label}</span>
    </label>
  );

  const renderTextarea = (
    name: keyof FlatForm,
    label: string,
    placeholder = "",
    hint = "",
  ) => {
    const error = methods.formState.errors[name]?.message;
    return (
      <div className={styles.field}>
        <label className={styles.label}>
          {label}
          {hint && <span className={styles.hint}> {hint}</span>}
        </label>
        <textarea
          className={`${styles.textarea} ${error ? styles.inputError : ""}`}
          placeholder={placeholder}
          rows={3}
          {...methods.register(name)}
        />
        {error && <span className={styles.error}>{String(error)}</span>}
      </div>
    );
  };

  const renderSelect = (
    name: keyof FlatForm,
    label: string,
    options: { value: string; label: string }[],
    hint = "",
  ) => {
    const error = methods.formState.errors[name]?.message;
    return (
      <div className={styles.field}>
        <label className={styles.label}>
          {label}
          {hint && <span className={styles.hint}> {hint}</span>}
        </label>
        <select
          className={`${styles.input} ${error ? styles.inputError : ""}`}
          {...methods.register(name)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <span className={styles.error}>{String(error)}</span>}
      </div>
    );
  };

  const prefillSources = [
    matchedNotice ? "Извещение (44-ФЗ)" : null,
    matchedNote ? `СЗ № ${matchedNote.noteNumber}` : null,
    matchedDesc ? `ООЗ «${matchedDesc.title}»` : null,
  ].filter(Boolean);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Проект контракта {existing ? `#${existing.id}` : ""}
      </h2>

      {!existing && prefillSources.length > 0 && (
        <div className={styles.prefillBanner}>
          <strong>Предзаполнено по цепочке:</strong> {prefillSources.join(" + ")}.
          Проверьте обязательные условия ст. 33 и ст. 34 перед сохранением.
        </div>
      )}

      {/* Прогресс заполнения */}
      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          Обязательные условия ст. 33:{" "}
          <strong>
            {completion.completed}/{completion.total}
          </strong>{" "}
          ({completion.percent}%)
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <div className={styles.progressTerms}>
          {MANDATORY_TERMS.map((t) => {
            const section = completion.sections.find((s) => s.id === t.id);
            return (
              <span
                key={t.id}
                className={`${styles.termChip} ${
                  section?.complete
                    ? styles.termChipComplete
                    : styles.termChipIncomplete
                }`}
                title={t.article}
              >
                {t.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Подсказка по сроку заключения */}
      {deadline && (
        <div className={styles.deadlineHint}>
          Срок заключения контракта по ст. 51 ч. 4:{" "}
          <strong>не ранее {deadline}</strong> (10 дней с даты протокола)
        </div>
      )}

      {/* Автоматическая оценка рисков проекта контракта по 44-ФЗ */}
      <ContractRiskAssessmentPanel
        project={toProject(watched, orgId)}
        notice={matchedNotice}
        purchaseNote={matchedNote}
        onNavigateSection={(sectionId) => setActiveSection(sectionId)}
      />

      {/* Навигация по разделам */}
      <nav className={styles.nav}>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.navBtn} ${
              activeSection === s.id ? styles.navBtnActive : ""
            }`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Форма */}
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className={styles.form}>
          {/* === Общие сведения === */}
          {activeSection === "general" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Общие сведения</h3>
              {renderField("contractName", "Наименование контракта")}
              <div className={styles.row}>
                {renderField("ikz", "ИКЗ", "text", "0123456789012345678901234")}
                {renderField("noticeNumber", "Номер извещения")}
              </div>
              <div className={styles.row}>
                {renderField(
                  "smpRequiredPercent",
                  "Привлечение СМП/СОНКО, %",
                  "text",
                  "5",
                  "ПП РФ № 1466 (из СЗ и извещения)",
                )}
                {renderField(
                  "subcontractingSmpNoteNumber",
                  "Номер СЗ (основание СМП)",
                )}
              </div>
              {renderField("customerName", "Заказчик")}
              {renderField("supplierName", "Поставщик (победитель)")}
              <div className={styles.row}>
                {renderField("projectDate", "Дата проекта", "date")}
                {renderField("conclusionDate", "Дата заключения", "date")}
              </div>
              {renderCheckbox(
                "protocolOfDisagreements",
                "Протокол разногласий (ст. 51 ч. 4: проект размещается в течение 4 дней)",
              )}
            </div>
          )}

          {/* === 1. Предмет контракта === */}
          {activeSection === "subject" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Предмет контракта{" "}
                <span className={styles.articleRef}>ст. 33 ч. 1 п. 1</span>
              </h3>
              {renderField("objectName", "Наименование объекта закупки")}
              {renderTextarea("description", "Описание объекта закупки")}
              <div className={styles.row}>
                {renderOkpd2Field()}
                {renderField("kved2Code", "Код КВЕД2")}
              </div>
              {renderField("quantity", "Количество / объём")}
              {renderField("deliveryPlace", "Место поставки")}
            </div>
          )}

          {/* === 2. Цена и оплата === */}
          {activeSection === "price" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Цена контракта и порядок оплаты{" "}
                <span className={styles.articleRef}>
                  ст. 33 ч. 1 п. 1, ст. 34 ч. 12
                </span>
              </h3>
              <div className={styles.row}>
                {renderField("initialMaxPrice", "НМЦК, руб")}
                {renderField("finalPrice", "Цена контракта, руб")}
              </div>
              {renderTextarea(
                "priceBasis",
                "Обоснование цены",
                "",
                "ст. 22 ФЗ-44",
              )}
              {renderCheckbox(
                "priceIncludesExpenses",
                "Включены расходы на перевозку, страхование, уплату пошлин, налогов и обязательные платежи (ст. 33 ч. 1 п. 1)",
              )}
              {renderSelect(
                "paymentProcedure",
                "Порядок оплаты (ст. 34 ч. 12)",
                [
                  { value: "postpayment", label: "Постоплата" },
                  { value: "advance", label: "Аванс" },
                  { value: "staged", label: "Поэтапная оплата" },
                ],
              )}
              <div className={styles.row}>
                {renderField("advancePercent", "Аванс, %")}
                {renderField("paymentTermDays", "Срок оплаты, раб. дней")}
              </div>
              {watched.paymentProcedure === "staged" && (
                <div className={styles.stages}>
                  <h4 className={styles.stagesTitle}>Этапы исполнения</h4>
                  {fields.map((field, index) => (
                    <div key={field.id} className={styles.stageRow}>
                      <input
                        className={styles.input}
                        placeholder="Название этапа"
                        {...methods.register(`stages.${index}.name`)}
                      />
                      <input
                        className={styles.input}
                        type="date"
                        {...methods.register(`stages.${index}.endDate`)}
                      />
                      <input
                        className={styles.input}
                        placeholder="Сумма, руб"
                        {...methods.register(`stages.${index}.amount`)}
                      />
                      <button
                        type="button"
                        className={styles.stageRemove}
                        onClick={() => remove(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.stageAdd}
                    onClick={() =>
                      append({ name: "", endDate: "", amount: "" })
                    }
                  >
                    + Добавить этап
                  </button>
                </div>
              )}
            </div>
          )}

          {/* === 3. Срок и приёмка === */}
          {activeSection === "term" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Срок исполнения и приёмка{" "}
                <span className={styles.articleRef}>
                  ст. 33 ч. 1 п. 1, ст. 94
                </span>
              </h3>
              <div className={styles.row}>
                {renderField("startDate", "Дата начала", "date")}
                {renderField("endDate", "Дата окончания", "date")}
              </div>
              {renderField("validUntil", "Срок действия контракта", "date")}
              {renderTextarea("acceptanceProcedure", "Порядок приёмки")}
              {renderField("acceptanceTermDays", "Срок приёмки, дней")}
            </div>
          )}

          {/* === 4. Качество и гарантия === */}
          {activeSection === "quality" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Качество и гарантия{" "}
                <span className={styles.articleRef}>ст. 33 ч. 1 п. 2, 6</span>
              </h3>
              {renderTextarea(
                "qualityRequirements",
                "Требования к качеству",
                "",
                "обязательное условие",
              )}
              <div className={styles.row}>
                {renderField("warrantyPeriodMonths", "Гарантия, мес.")}
                {renderField("serviceLifeMonths", "Срок службы, мес.")}
              </div>
              {renderTextarea("specifications", "Спецификация (по позициям)")}
            </div>
          )}

          {/* === 5. Обеспечение и неустойка === */}
          {activeSection === "security" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Обеспечение и неустойка{" "}
                <span className={styles.articleRef}>ст. 34 ч. 5-7</span>
              </h3>
              {renderCheckbox("bidSecurityRequired", "Обеспечение заявки")}
              {watched.bidSecurityRequired &&
                renderField(
                  "bidSecurityPercent",
                  "Обеспечение заявки, %",
                  "text",
                  "0.5–5",
                  "ст. 34 ч. 4",
                )}
              {renderCheckbox(
                "performanceSecurityRequired",
                "Обеспечение исполнения контракта",
              )}
              {watched.performanceSecurityRequired && (
                <div className={styles.row}>
                  {renderField(
                    "performanceSecurityPercent",
                    "Обеспечение, %",
                    "text",
                    "0.5–30",
                    "ст. 34 ч. 6",
                  )}
                  {renderField("securityAmount", "Сумма обеспечения, руб")}
                </div>
              )}
              {renderCheckbox(
                "warrantySecurityRequired",
                "Обеспечение гарантийных обязательств",
              )}
              <div className={styles.divider} />
              {renderField(
                "penaltyFormula",
                "Пени",
                "text",
                "",
                "ст. 34 ч. 5 п. 1",
              )}
              {renderField("fixedPenaltyAmount", "Фиксированный штраф, руб")}
              {renderCheckbox(
                "interimPenaltyEnabled",
                "Неустойка за нарушение промежуточных обязательств",
              )}
            </div>
          )}

          {/* === 6. Изменение и расторжение === */}
          {activeSection === "change" && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Изменение и расторжение контракта{" "}
                <span className={styles.articleRef}>ст. 95</span>
              </h3>
              {renderTextarea(
                "changeConditions",
                "Условия изменения контракта",
              )}
              {renderCheckbox(
                "allowQuantityChange",
                "Допускается изменение количества (объёма) поставок",
              )}
              {renderCheckbox(
                "allowPriceChange",
                "Допускается изменение цены контракта",
              )}
              {renderTextarea(
                "terminationConditions",
                "Условия одностороннего отказа (ст. 95 ч. 8-9)",
              )}
              {renderField(
                "securityReturnDays",
                "Срок возврата обеспечения, дней",
                "text",
                "",
                "ст. 34 ч. 27",
              )}
            </div>
          )}

          {/* Кнопки */}
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isCreating || isUpdating}
            >
              {existing
                ? "Сохранить изменения"
                : "Создать проект контракта"}
            </button>
            {saved && (
              <span className={styles.savedMessage}>Проект сохранён</span>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
