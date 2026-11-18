import { useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import {
  useCreateNotice,
  useGetEmployeeByEmail,
  useGetOrganizationById,
} from "../../services/Procurements/noticeInfo.api";
import {
  NoticeInfoSchema,
  type NoticeInfoFormValues,
} from "../../services/Procurements/noticeInfo.schema";
import { useOkpd2Dictionary } from "../../services/Okpd2Ref/okpd2Ref.api";
import { collectNormingViolations } from "../../services/Okpd2Ref/normingControl";
import { validateNationalRegime } from "../../services/NationalRegime/pp1875";
import { RUSSIA } from "../../services/AddressRef/addressRef.schema";
import { ORGANIZATION_BUDGET_LEVEL_LABELS } from "../../services/Organization/organization.schema";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import { hasSmpSubcontractingRequirement } from "../../services/PurchaseNote/purchaseNote.schema";
import {
  criterionToNoticeType,
  normalizeCriteria,
} from "../../services/BidEvaluation/bidEvaluation.schema";
import { useOrganizationObjectDescriptions } from "../../services/ObjectDescription/objectDescription.api";
import {
  formatCharacteristicValue,
  toNoticeObjectDescriptionFields,
} from "../../services/ObjectDescription/objectDescription.schema";

import NoticeStateSection from "./sections/NoticeStateSection";

import GeneralInfoSection from "./sections/GeneralInfoSection";
import ContactInfoSection from "./sections/ContactInfoSection";
import ProcedureDatesSection from "./sections/ProcedureDatesSection";
import { ETP_OPTIONS, PLACING_WAYS_CONTEST } from "./noticeInfo.config";
import styles from "./NoticeInfoForm.module.scss";
import ContractConditionsSection from "./sections/ContractConditionsSection";
import PurchaseObjectsSection from "./sections/PurchaseObjectsSection";
import NormingControlSection from "./sections/NormingControlSection";
import NormingSubmitButton from "./sections/NormingSubmitButton";
import ParticipantsRequirementsSection from "./sections/ParticipantsRequirementsSection";
import ObjectDescriptionSection from "./sections/ObjectDescriptionSection";
import AttachedDocsSection from "./sections/AttachedDocsSection";

interface LocationState {
  ikz?: string;
  name?: string;
  procurementType?: string;
  nmck?: number;
  planPositionNumber?: string;
  responsibleFio?: string;
  // Сквозное наследование из потребности (СЗ) и ООЗ
  smpRequiredPercent?: number;
  purchaseNoteId?: string | number;
  purchaseNoteNumber?: string;
  objectDescriptionId?: string | number;
  // Из позиции плана-графика / СЗ
  authorizedBodyName?: string;
  jointOrganizerName?: string;
  kbk?: string;
}

const formatMskDateTime = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const NoticeInfoForm = () => {
  const { bem } = useUtils();
  const block = bem(styles, "notice-info-form");
  const bannerClass = block("prefill-banner");
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const { data: currentUser } = useFetchCurrentUser();
  const { data: userOrganization } = useGetOrganizationById(
    currentUser?.organizationId,
  );
  const { data: currentEmployee } = useGetEmployeeByEmail(currentUser?.email);
  const { mutate: createNotice, isPending: isSaving } = useCreateNotice();
  // Справочник ОКПД2 нужен контролю нормирования при сохранении извещения
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  // Потребности (СЗ) и структурированные ООЗ организации для предзаполнения извещения
  const { data: purchaseNotes = [] } = usePurchaseNotes(
    currentUser?.organizationId,
  );
  // План-график нужен для сведений уровня планирования (общественное
  // обсуждение по ст. 20 44-ФЗ), которых нет в служебной записке
  const { data: purchasePlans = [] } = usePurchasePlans(
    currentUser?.organizationId,
  );
  const { data: objectDescriptions = [] } = useOrganizationObjectDescriptions(
    currentUser?.organizationId,
  );

  const matchedNote = useMemo(() => {
    if (state.purchaseNoteId !== undefined && state.purchaseNoteId !== "") {
      const byId = purchaseNotes.find(
        (n) => String(n.id) === String(state.purchaseNoteId),
      );
      if (byId) return byId;
    }
    if (id) {
      const byProc = purchaseNotes
        .filter((n) => String(n.procurementId ?? "") === String(id))
        .slice(-1)[0];
      if (byProc) return byProc;
    }
    if (state.ikz) {
      return purchaseNotes.filter((n) => n.ikz === state.ikz).slice(-1)[0];
    }
    return undefined;
  }, [purchaseNotes, state.purchaseNoteId, state.ikz, id]);

  const matchedDesc = useMemo(() => {
    const descId =
      state.objectDescriptionId ?? matchedNote?.objectDescriptionId;
    const onlyOoz = objectDescriptions.filter(
      (d) => d.kind === "object_description",
    );
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
    const targetIkz = matchedNote?.ikz || state.ikz;
    if (targetIkz) {
      return onlyOoz.find((d) => d.ikz === targetIkz);
    }
    return undefined;
  }, [
    objectDescriptions,
    state.objectDescriptionId,
    state.ikz,
    matchedNote,
    id,
  ]);

  const [szLast = "", szFirst = "", szMiddle = ""] = (
    state.responsibleFio ?? ""
  ).split(" ");

  const nowFormatted = formatMskDateTime(new Date());
  const todayIso = new Date().toISOString().slice(0, 10);
  const rawIkz = state.ikz ?? "";

  const methods = useForm<NoticeInfoFormValues>({
    resolver: zodResolver(NoticeInfoSchema),
    mode: "onSubmit",
    defaultValues: {
      procurementId: id,
      purchaseNoteId: state.purchaseNoteId,
      objectDescriptionId: state.objectDescriptionId,
      ikz: rawIkz,
      noticeState: {
        statusLabel: "Формирование извещения (приглашения)",
        createdAt: nowFormatted,
        updatedAt: nowFormatted,
        createdByUserId: currentUser?.id,
        createdByFullName: currentUser?.email ?? "Не авторизован",
        updatedByFullName: currentUser?.email ?? "Не авторизован",
      },
      generalInfo: {
        noticeNumber: null,
        placingWayCode: PLACING_WAYS_CONTEST[0].code,
        isPart19Art48: false,
        etpName: ETP_OPTIONS[0].name,
        etpUrl: ETP_OPTIONS[0].url,
        placementOrganizerType: state.jointOrganizerName
          ? "joint_organizer"
          : "customer",
        authorizedBodyApproval: "Не требуется",
        orderName: state.name ?? "",
        planPositionNumber: state.planPositionNumber ?? String(id ?? ""),
        ikz: rawIkz,
        nmck: state.nmck ?? 0,
        authorizedBodyName: state.authorizedBodyName ?? "",
        jointOrganizerName: state.jointOrganizerName ?? "",
        kbk: state.kbk ?? "",
      },
      purchaseObjectsCh9St37: false,
      contactInfo: {
        organizationId: currentUser?.organizationId,
        organizationName: "",
        postalAddress: "",
        locationAddress: "",
        placerSurname: szLast,
        placerName: szFirst,
        placerFathername: szMiddle,
        placerEmail: "",
        phoneNum: { countryCode: "7", cityCode: "", num: "", numExt: "" },
        faxNum: { countryCode: "7", cityCode: "", num: "", numExt: "" },
        otherInfo: "",
      },
      procedureInfo: {
        plannedPublishDate: todayIso,
        submissionEndDate: "",
        submissionEndTime: "09:00",
        secondPartsReviewEndDate: "",
        summingUpDate: "",
      },
      contractConditions: {
        currency: "РОССИЙСКИЙ РУБЛЬ",
        usePriceFormulaPP19: false,
        priceFormulaText: "",
        isForeignCurrencyNmck: false,
        hasAdvance: false,
        advancePercent: 0,
        requiresPublicDiscussionArt20: false,
        ikzYear: rawIkz.slice(0, 2) ? `20${rawIkz.slice(0, 2)}` : "2026",
        ikzCustomerCode: rawIkz.slice(2, 22),
        ikzPlanNumber: rawIkz.slice(22, 26),
        ikzOrderNumber: rawIkz.slice(26, 29),
        ikzOkpd2: rawIkz.slice(29, 33),
        ikzKvr: rawIkz.slice(33, 36),
        isRelativeTerms: true,
        startOffsetDays: 0,
        durationDays: 0,
        hasMultipleStages: false,
        stagesCount: 1,
        stages: [],
        isBudgetFunds: true,
        budgetName: "Бюджет Курской области",
        budgetLevel: "бюджет субъекта Российской Федерации",
        oktmoCode: "38000000",
        typicalConditionsNumber: "",
        isLifecycleContract: false,
        lifecycleCasesPP1087: [],
        deliveryPlaces: [
          {
            id: "1",
            country: RUSSIA,
            region: "",
            municipality: "",
            settlement: "",
            address: "",
            additionalInfo: "",
          },
        ],
        allowUnilateralRefusalArt95: true,
        multipleWinnersPart10Art34: "not_established",
      },
      purchaseObjects: {
        isMedicines: false,
        isIndeterminateVolume: false,
        items: [],
      },
      objectDescription: {
        objectName: state.name ?? "",
        okpd2Code: "",
        okpd2Name: "",
        consumerProperties: "",
        qualityCharacteristics: "",
        functionalProperties: "",
        environmentalCharacteristics: "",
        otherRequirements: "",
      },
      participantsRequirements: {
        isNiokrOrConsulting: false,
        evaluationCriteria: [
          {
            id: "price",
            type: "price",
            enabled: true,
            weightPercent: 60,
            additionalInfo: "",
          },
          {
            id: "qualification",
            type: "qualification",
            enabled: true,
            weightPercent: 40,
            additionalInfo: "",
          },
        ],
        advantageDisabledArt29: false,
        advantagePenalSystemArt28: false,
        advantageSmpPart3Art30: false,
        unifiedRequirementsPart1Art31: true,
        unifiedRequirementsPart1Art31Text:
          "Соответствие требованиям ч. 1 ст. 31 Закона № 44-ФЗ (непроведение ликвидации/банкротства, неприостановление деятельности, отсутствие недоимки по налогам, судимости и конфликта интересов).",
        requirementP1Part1Art31: false,
        requirementP1Part1Art31Text:
          "Наличие действующей лицензии / членства в СРО / свидетельства о допуске к видам работ, установленных законодательством Российской Федерации (п. 1 ч. 1 ст. 31 Закона № 44-ФЗ).",
        requirementsPart1_1Art31: true,
        pp1482ProductionFacilities: false,
        pp1482ProductionFacilitiesText: "",
        pp1482FinancialStability: false,
        pp1482FinancialStabilityText: "",
        pp1482Specialists: false,
        pp1482SpecialistsText: "",
        additionalRequirementsPart2Art31: false,
        additionalRequirementsPart2Art31Text: "",
        pp2571Positions: [],
        requirementsPart2_1Art31: false,
        requirementsPart2_1Art31Text:
          "Наличие опыта исполнения контракта (договора) стоимостью не менее 20 процентов НМЦК за последние 3 года до даты подачи заявки при НМЦК 20 млн рублей и более (ч. 2.1 ст. 31 Закона № 44-ФЗ).",
        pp2571Point4Requirement: false,
        pp2571Point4RequirementText:
          "Участник закупки подтверждает соответствие требованиям, предусмотренным пунктом 4 Постановления Правительства РФ от 29.12.2021 № 2571 (порядок оценки опыта исполнения контракта, в том числе с учетом правопреемства и без учёта штрафов/пеней, не превышающих установленный порог, либо подтверждение документами о приёмке по ЕИС / контрактам № 44-ФЗ и № 223-ФЗ).",
        subcontractingSmpPart5Art30:
          state.smpRequiredPercent !== undefined &&
          state.smpRequiredPercent > 0,
        // Требование по СМП приходит из потребности (СЗ) по позиции плана-графика
        subcontractingSmpRequiredPercent:
          state.smpRequiredPercent !== undefined
            ? String(state.smpRequiredPercent)
            : "",
        subcontractingSmpNoteNumber: state.purchaseNoteNumber ?? "",
        sanctionsRnpRequirement: false,
        requiresApplicationSecurity: true,
        applicationSecurityPercent: 1,
        applicationSecurityOrder: "",
        applicationSecurityRequisites: {},
        applicationSecurityBudgetRequisites: {},
        requiresContractSecurity: true,
        contractSecurityPercent: 5,
        contractSecurityOrder: "",
        contractSecurityRequisites: {},
        requiresQualityWarranty: false,
        warrantyMaintenanceInfo: "",
        manufacturerWarrantyInfo: "",
        warrantyTermAndVolume: "",
        requiresWarrantySecurity: false,
        warrantySecurityPercent: 0,
        warrantySecurityOrder: "",
        warrantySecurityRequisites: {},
        additionalInfo: "",
        requiresTreasurySupport: false,
        treasurySupportType: "",
        requiresBankSupport: false,
      },
      attachedDocs: [],
      // Контроль нормирования: подпись главного подписанта ставится только при
      // превышении предельной цены единицы нормируемой позиции
      normingControl: {
        breachConfirmedByName: "",
        breachConfirmedDate: "",
        breachReason: "",
      },
    },
  });

  const { setValue, getValues, handleSubmit, setError } = methods;
  const appliedPrefillKeyRef = useRef<string>("");

  useEffect(() => {
    if (currentUser) {
      setValue("noticeState.createdByUserId", currentUser.id);
      setValue("contactInfo.organizationId", currentUser.organizationId);
    }
  }, [currentUser, setValue]);

  useEffect(() => {
    if (currentEmployee?.employee) {
      const { surname, name, patronymic } = currentEmployee.employee;
      const fullName = [surname, name, patronymic].filter(Boolean).join(" ");
      if (fullName) {
        setValue("noticeState.createdByFullName", fullName);
        setValue("noticeState.updatedByFullName", fullName);
      }
      if (!getValues("contactInfo.placerSurname") && surname) {
        setValue("contactInfo.placerSurname", surname);
      }
      if (!getValues("contactInfo.placerName") && name) {
        setValue("contactInfo.placerName", name);
      }
      if (!getValues("contactInfo.placerFathername") && patronymic) {
        setValue("contactInfo.placerFathername", patronymic);
      }
    }
  }, [currentEmployee, setValue, getValues]);

  useEffect(() => {
    if (userOrganization) {
      setValue("contactInfo.organizationName", userOrganization.fullName);
      setValue("contactInfo.postalAddress", userOrganization.postalAddress);
      setValue("contactInfo.locationAddress", userOrganization.legalAddress);
      setValue("contactInfo.placerEmail", userOrganization.email);
      if (userOrganization.budgetLevel) {
        setValue(
          "contractConditions.budgetLevel",
          ORGANIZATION_BUDGET_LEVEL_LABELS[userOrganization.budgetLevel],
        );
      }
      const orgReqs = userOrganization.procurementRequisites;
      if (orgReqs?.securityRequisites && !matchedNote) {
        setValue(
          "participantsRequirements.applicationSecurityRequisites",
          orgReqs.securityRequisites,
        );
        setValue(
          "participantsRequirements.contractSecurityRequisites",
          orgReqs.securityRequisites,
        );
        setValue(
          "participantsRequirements.warrantySecurityRequisites",
          orgReqs.securityRequisites,
        );
      }
      if (orgReqs?.budgetPart13Art44Requisites && !matchedNote) {
        setValue(
          "participantsRequirements.applicationSecurityBudgetRequisites",
          orgReqs.budgetPart13Art44Requisites,
        );
      }
    }
  }, [userOrganization, matchedNote, setValue]);

  // Сквозное предзаполнение извещения из Потребности (СЗ) и связанного ООЗ
  useEffect(() => {
    if (!matchedNote && !matchedDesc) return;
    const prefillKey = `${matchedNote?.id ?? "none"}:${matchedDesc?.id ?? "none"}`;
    if (appliedPrefillKeyRef.current === prefillKey) return;
    if (methods.formState.isDirty) return;

    appliedPrefillKeyRef.current = prefillKey;

    if (matchedNote) {
      setValue("purchaseNoteId", matchedNote.id);

      const [last = "", first = "", middle = ""] = (
        matchedNote.initiatorName ?? ""
      )
        .replace(/^[^—-]+[-—]\s*/, "")
        .trim()
        .split(/\s+/);
      if (!getValues("contactInfo.placerSurname") && last) {
        setValue("contactInfo.placerSurname", last);
        setValue("contactInfo.placerName", first);
        setValue("contactInfo.placerFathername", middle);
      }

      if (matchedNote.placingWayCode) {
        setValue("generalInfo.placingWayCode", matchedNote.placingWayCode);
      }

      // Критерии оценки по ПП РФ N 2604 приходят из служебной записки:
      // в СЗ они уже сверены с ОКПД2 позиции плана-графика
      const noteCriteria = normalizeCriteria(
        matchedNote.evaluationCriteria,
      ).filter((criterion) => criterion.enabled);

      if (noteCriteria.length > 0) {
        setValue(
          "participantsRequirements.evaluationCriteria",
          noteCriteria.map((criterion) => ({
            id: criterion.type,
            type: criterionToNoticeType[
              criterion.type
            ] as NoticeInfoFormValues["participantsRequirements"]["evaluationCriteria"][number]["type"],
            enabled: true,
            weightPercent: Number(criterion.weightPercent),
            additionalInfo: criterion.note ?? "",
          })),
        );
      }

      if (matchedNote.evaluationObjectCategory) {
        setValue(
          "participantsRequirements.evaluationObjectCategory",
          matchedNote.evaluationObjectCategory,
        );
      }

      if (matchedNote.evaluationOkpd2Codes) {
        setValue(
          "participantsRequirements.evaluationOkpd2Codes",
          matchedNote.evaluationOkpd2Codes,
        );
      }
      if (matchedNote.subject) {
        setValue("generalInfo.orderName", matchedNote.subject);
      }
      if (matchedNote.ikz) {
        setValue("generalInfo.ikz", matchedNote.ikz);
        setValue("ikz", matchedNote.ikz);
        setValue(
          "contractConditions.ikzYear",
          `20${matchedNote.ikz.slice(0, 2)}`,
        );
        setValue(
          "contractConditions.ikzCustomerCode",
          matchedNote.ikz.slice(2, 22),
        );
        setValue(
          "contractConditions.ikzPlanNumber",
          matchedNote.ikz.slice(22, 26),
        );
        setValue(
          "contractConditions.ikzOrderNumber",
          matchedNote.ikz.slice(26, 29),
        );
        setValue("contractConditions.ikzOkpd2", matchedNote.ikz.slice(29, 33));
        setValue("contractConditions.ikzKvr", matchedNote.ikz.slice(33, 36));
      }
      if (matchedNote.initialMaxPrice) {
        const parsedNmck = Number.parseFloat(matchedNote.initialMaxPrice);
        if (Number.isFinite(parsedNmck) && parsedNmck >= 0) {
          setValue("generalInfo.nmck", parsedNmck);
        }
      }
      if (matchedNote.authorizedBodyName) {
        setValue(
          "generalInfo.authorizedBodyName",
          matchedNote.authorizedBodyName,
        );
      }
      if (matchedNote.jointOrganizerName) {
        setValue(
          "generalInfo.jointOrganizerName",
          matchedNote.jointOrganizerName,
        );
        setValue("generalInfo.placementOrganizerType", "joint_organizer");
      }
      if (matchedNote.kbk) {
        setValue("generalInfo.kbk", matchedNote.kbk);
      }

      // Обязательное общественное обсуждение (ст. 20 Закона N 44-ФЗ)
      // планируется в позиции плана-графика — переносим в условия контракта
      if (
        matchedNote.purchasePlanId !== undefined &&
        matchedNote.purchasePlanId !== null &&
        matchedNote.positionId !== undefined &&
        matchedNote.positionId !== null
      ) {
        const plan = purchasePlans.find(
          (item) => String(item.id) === String(matchedNote.purchasePlanId),
        );
        const planPosition = plan?.positions.find(
          (item) => String(item.id) === String(matchedNote.positionId),
        );
        if (planPosition?.isPublicDiscussionRequired !== undefined) {
          setValue(
            "contractConditions.requiresPublicDiscussionArt20",
            Boolean(planPosition.isPublicDiscussionRequired),
          );
        }
      }

      // Условия контракта
      if (matchedNote.hasAdvance !== undefined) {
        setValue("contractConditions.hasAdvance", matchedNote.hasAdvance);
      }
      if (matchedNote.advancePercent) {
        const adv = Number.parseFloat(matchedNote.advancePercent);
        if (Number.isFinite(adv)) {
          setValue("contractConditions.advancePercent", adv);
        }
      }
      if (matchedNote.budgetLevel) {
        setValue("contractConditions.budgetLevel", matchedNote.budgetLevel);
      }
      if (matchedNote.fundingSource) {
        setValue("contractConditions.budgetName", matchedNote.fundingSource);
      }
      setValue(
        "contractConditions.isRelativeTerms",
        matchedNote.deliveryTermMode !== "absolute",
      );
      if (matchedNote.deliveryStartOffsetDays !== undefined) {
        setValue(
          "contractConditions.startOffsetDays",
          matchedNote.deliveryStartOffsetDays,
        );
      }
      if (matchedNote.deliveryTermMode === "absolute") {
        if (matchedNote.desiredStartDate && matchedNote.desiredEndDate) {
          const ms =
            new Date(matchedNote.desiredEndDate).getTime() -
            new Date(matchedNote.desiredStartDate).getTime();
          const days = Math.max(0, Math.round(ms / 86_400_000));
          setValue("contractConditions.durationDays", days);
        }
      } else if (matchedNote.executionTermDays !== undefined) {
        setValue(
          "contractConditions.durationDays",
          matchedNote.executionTermDays,
        );
      }
      if (matchedNote.allowUnilateralRefusalArt95 !== undefined) {
        setValue(
          "contractConditions.allowUnilateralRefusalArt95",
          matchedNote.allowUnilateralRefusalArt95,
        );
      }
      if (matchedNote.deliveryPlaces && matchedNote.deliveryPlaces.length > 0) {
        setValue(
          "contractConditions.deliveryPlaces",
          matchedNote.deliveryPlaces,
        );
      } else if (matchedNote.deliveryPlace) {
        const currentPlaces = getValues("contractConditions.deliveryPlaces");
        if (currentPlaces.length > 0 && !currentPlaces[0].address) {
          setValue(
            "contractConditions.deliveryPlaces.0.address",
            matchedNote.deliveryPlace,
          );
        }
      }

      // Требования к участникам (ст. 31, ПП РФ № 1482, ПП РФ № 2571, СМП)
      if (matchedNote.unifiedRequirementsPart1Art31 !== undefined) {
        setValue(
          "participantsRequirements.unifiedRequirementsPart1Art31",
          matchedNote.unifiedRequirementsPart1Art31,
        );
      }
      if (matchedNote.unifiedRequirementsPart1Art31Text) {
        setValue(
          "participantsRequirements.unifiedRequirementsPart1Art31Text",
          matchedNote.unifiedRequirementsPart1Art31Text,
        );
      }
      if (matchedNote.requirementP1Part1Art31 !== undefined) {
        setValue(
          "participantsRequirements.requirementP1Part1Art31",
          matchedNote.requirementP1Part1Art31,
        );
      }
      if (matchedNote.requirementP1Part1Art31Text) {
        setValue(
          "participantsRequirements.requirementP1Part1Art31Text",
          matchedNote.requirementP1Part1Art31Text,
        );
      }
      if (matchedNote.requirementsPart1_1Art31 !== undefined) {
        setValue(
          "participantsRequirements.requirementsPart1_1Art31",
          matchedNote.requirementsPart1_1Art31,
        );
      }
      if (matchedNote.pp1482ProductionFacilities !== undefined) {
        setValue(
          "participantsRequirements.pp1482ProductionFacilities",
          matchedNote.pp1482ProductionFacilities,
        );
      }
      if (matchedNote.pp1482ProductionFacilitiesText) {
        setValue(
          "participantsRequirements.pp1482ProductionFacilitiesText",
          matchedNote.pp1482ProductionFacilitiesText,
        );
      }
      if (matchedNote.pp1482FinancialStability !== undefined) {
        setValue(
          "participantsRequirements.pp1482FinancialStability",
          matchedNote.pp1482FinancialStability,
        );
      }
      if (matchedNote.pp1482FinancialStabilityText) {
        setValue(
          "participantsRequirements.pp1482FinancialStabilityText",
          matchedNote.pp1482FinancialStabilityText,
        );
      }
      if (matchedNote.pp1482Specialists !== undefined) {
        setValue(
          "participantsRequirements.pp1482Specialists",
          matchedNote.pp1482Specialists,
        );
      }
      if (matchedNote.pp1482SpecialistsText) {
        setValue(
          "participantsRequirements.pp1482SpecialistsText",
          matchedNote.pp1482SpecialistsText,
        );
      }
      if (matchedNote.additionalRequirementsPart2Art31 !== undefined) {
        setValue(
          "participantsRequirements.additionalRequirementsPart2Art31",
          matchedNote.additionalRequirementsPart2Art31,
        );
      }
      if (matchedNote.additionalRequirementsPart2Art31Text) {
        setValue(
          "participantsRequirements.additionalRequirementsPart2Art31Text",
          matchedNote.additionalRequirementsPart2Art31Text,
        );
      }
      if (
        matchedNote.pp2571Positions &&
        matchedNote.pp2571Positions.length > 0
      ) {
        setValue(
          "participantsRequirements.additionalRequirementsPart2Art31",
          true,
        );
        setValue(
          "participantsRequirements.pp2571Positions",
          matchedNote.pp2571Positions,
        );
      }
      if (matchedNote.requirementsPart2_1Art31 !== undefined) {
        setValue(
          "participantsRequirements.requirementsPart2_1Art31",
          matchedNote.requirementsPart2_1Art31,
        );
      }
      if (matchedNote.requirementsPart2_1Art31Text) {
        setValue(
          "participantsRequirements.requirementsPart2_1Art31Text",
          matchedNote.requirementsPart2_1Art31Text,
        );
      }
      if (matchedNote.pp2571Point4Requirement !== undefined) {
        setValue(
          "participantsRequirements.pp2571Point4Requirement",
          matchedNote.pp2571Point4Requirement,
        );
      }
      if (matchedNote.pp2571Point4RequirementText) {
        setValue(
          "participantsRequirements.pp2571Point4RequirementText",
          matchedNote.pp2571Point4RequirementText,
        );
      }
      if (matchedNote.sanctionsRnpRequirement !== undefined) {
        setValue(
          "participantsRequirements.sanctionsRnpRequirement",
          matchedNote.sanctionsRnpRequirement,
        );
      }
      if (matchedNote.nmckFileName && getValues("attachedDocs").length === 0) {
        setValue("attachedDocs", [
          {
            id: "sz-nmck-doc",
            category: "nmck_justification",
            fileName: matchedNote.nmckFileName,
            description: matchedNote.priceBasis || "Обоснование НМЦК (из СЗ)",
          },
        ]);
      }

      if (matchedNote.advantageSmpPart3Art30 !== undefined) {
        setValue(
          "participantsRequirements.advantageSmpPart3Art30",
          matchedNote.advantageSmpPart3Art30,
        );
      }
      const smpSubEnabled = hasSmpSubcontractingRequirement(matchedNote);
      setValue(
        "participantsRequirements.subcontractingSmpPart5Art30",
        smpSubEnabled,
      );
      setValue(
        "participantsRequirements.subcontractingSmpRequiredPercent",
        smpSubEnabled && matchedNote.smpRequiredPercent !== undefined
          ? String(matchedNote.smpRequiredPercent)
          : "",
      );
      setValue(
        "participantsRequirements.subcontractingSmpNoteNumber",
        String(matchedNote.noteNumber),
      );

      // Обеспечение заявки
      if (matchedNote.requiresApplicationSecurity !== undefined) {
        setValue(
          "participantsRequirements.requiresApplicationSecurity",
          matchedNote.requiresApplicationSecurity,
        );
      }
      if (matchedNote.applicationSecurityPercent) {
        const appPct = Number.parseFloat(
          matchedNote.applicationSecurityPercent,
        );
        if (Number.isFinite(appPct)) {
          setValue(
            "participantsRequirements.applicationSecurityPercent",
            appPct,
          );
        }
      }
      if (matchedNote.applicationSecurityOrder) {
        setValue(
          "participantsRequirements.applicationSecurityOrder",
          matchedNote.applicationSecurityOrder,
        );
      }
      if (matchedNote.applicationSecurityRequisites) {
        setValue(
          "participantsRequirements.applicationSecurityRequisites",
          matchedNote.applicationSecurityRequisites,
        );
      }
      if (matchedNote.applicationSecurityBudgetRequisites) {
        setValue(
          "participantsRequirements.applicationSecurityBudgetRequisites",
          matchedNote.applicationSecurityBudgetRequisites,
        );
      }

      // Обеспечение исполнения контракта
      if (matchedNote.requiresContractSecurity !== undefined) {
        setValue(
          "participantsRequirements.requiresContractSecurity",
          matchedNote.requiresContractSecurity,
        );
      }
      if (matchedNote.contractSecurityPercent) {
        const secPercent = Number.parseFloat(
          matchedNote.contractSecurityPercent,
        );
        if (Number.isFinite(secPercent)) {
          setValue(
            "participantsRequirements.contractSecurityPercent",
            secPercent,
          );
        }
      }
      if (matchedNote.contractSecurityOrder) {
        setValue(
          "participantsRequirements.contractSecurityOrder",
          matchedNote.contractSecurityOrder,
        );
      }
      if (matchedNote.contractSecurityRequisites) {
        setValue(
          "participantsRequirements.contractSecurityRequisites",
          matchedNote.contractSecurityRequisites,
        );
      }

      // Гарантия качества (3 поля) и обеспечение гарантийных обязательств
      const hasQuality = Boolean(
        matchedNote.requiresQualityWarranty ||
        matchedNote.warrantyTermAndVolume,
      );
      setValue("participantsRequirements.requiresQualityWarranty", hasQuality);
      if (matchedNote.warrantyMaintenanceInfo) {
        setValue(
          "participantsRequirements.warrantyMaintenanceInfo",
          matchedNote.warrantyMaintenanceInfo,
        );
      }
      if (matchedNote.manufacturerWarrantyInfo) {
        setValue(
          "participantsRequirements.manufacturerWarrantyInfo",
          matchedNote.manufacturerWarrantyInfo,
        );
      }
      if (matchedNote.warrantyTermAndVolume) {
        setValue(
          "participantsRequirements.warrantyTermAndVolume",
          matchedNote.warrantyTermAndVolume,
        );
      } else if (
        matchedNote.warrantyTermMonths !== undefined &&
        matchedNote.warrantyTermMonths > 0
      ) {
        setValue("participantsRequirements.requiresQualityWarranty", true);
        setValue(
          "participantsRequirements.warrantyTermAndVolume",
          `Гарантийный срок: ${matchedNote.warrantyTermMonths} мес.`,
        );
      }

      if (matchedNote.requiresWarrantySecurity !== undefined) {
        setValue(
          "participantsRequirements.requiresWarrantySecurity",
          hasQuality ? matchedNote.requiresWarrantySecurity : false,
        );
      }
      if (matchedNote.warrantySecurityPercent) {
        const wPct = Number.parseFloat(matchedNote.warrantySecurityPercent);
        if (Number.isFinite(wPct)) {
          setValue("participantsRequirements.warrantySecurityPercent", wPct);
        }
      }
      if (matchedNote.warrantySecurityOrder) {
        setValue(
          "participantsRequirements.warrantySecurityOrder",
          matchedNote.warrantySecurityOrder,
        );
      }
      if (matchedNote.warrantySecurityRequisites) {
        setValue(
          "participantsRequirements.warrantySecurityRequisites",
          matchedNote.warrantySecurityRequisites,
        );
      }

      // Казначейское и банковское сопровождение
      if (matchedNote.requiresTreasurySupport !== undefined) {
        setValue(
          "participantsRequirements.requiresTreasurySupport",
          matchedNote.requiresTreasurySupport,
        );
        if (matchedNote.treasurySupportType) {
          setValue(
            "participantsRequirements.treasurySupportType",
            matchedNote.treasurySupportType,
          );
        }
      }
      if (matchedNote.requiresBankSupport !== undefined) {
        setValue(
          "participantsRequirements.requiresBankSupport",
          matchedNote.requiresBankSupport,
        );
      }
      if (matchedNote.otherRequirements) {
        setValue(
          "participantsRequirements.additionalInfo",
          matchedNote.otherRequirements,
        );
      }
    }

    // Подстановка структурированного ООЗ
    if (matchedDesc) {
      setValue("objectDescriptionId", matchedDesc.id);
      setValue(
        "objectDescription",
        toNoticeObjectDescriptionFields(matchedDesc),
      );
      if (
        matchedDesc.warrantyTermMonths &&
        !getValues("participantsRequirements.warrantyTermAndVolume")
      ) {
        setValue("participantsRequirements.requiresQualityWarranty", true);
        setValue(
          "participantsRequirements.warrantyTermAndVolume",
          [
            `Гарантийный срок: ${matchedDesc.warrantyTermMonths} мес.`,
            matchedDesc.warrantyRequirements,
          ]
            .filter(Boolean)
            .join(" — "),
        );
      }
    } else if (matchedNote) {
      setValue("objectDescription", {
        objectName: matchedNote.subject,
        okpd2Code: matchedNote.okpd2Code ?? "",
        okpd2Name: matchedNote.okpd2Name ?? "",
        consumerProperties: "",
        qualityCharacteristics: "",
        functionalProperties: "",
        environmentalCharacteristics: "",
        otherRequirements: matchedNote.otherRequirements ?? "",
      });
    }

    // Позиции объекта закупки (purchaseObjects.items) из множественных объектов СЗ или ООЗ
    const isIndeterminate = Boolean(
      matchedNote?.isIndeterminateVolume ?? matchedDesc?.isIndeterminateVolume,
    );
    setValue("purchaseObjects.isIndeterminateVolume", isIndeterminate);

    const onlyOoz = objectDescriptions.filter(
      (d) => d.kind === "object_description",
    );

    if (getValues("purchaseObjects.items").length === 0) {
      if (matchedNote?.items && matchedNote.items.length > 0) {
        const mappedItems = matchedNote.items.map((item, idx) => {
          const itemDesc = item.objectDescriptionId
            ? onlyOoz.find(
                (d) => String(d.id) === String(item.objectDescriptionId),
              )
            : matchedDesc;
          const qtyRaw = Number.parseFloat(
            isIndeterminate ? "1" : item.quantity || "1",
          );
          const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
          const totalParsed = Number.parseFloat(String(item.totalPrice ?? ""));
          const unitParsed = Number.parseFloat(String(item.unitPrice ?? ""));
          const fallbackTotal =
            idx === 0
              ? Number.parseFloat(
                  String(matchedNote.initialMaxPrice ?? state.nmck ?? 0),
                ) || 0
              : 0;
          const totalPrice = Number.isFinite(totalParsed)
            ? totalParsed
            : Number.isFinite(unitParsed)
              ? Math.round(unitParsed * quantity * 100) / 100
              : fallbackTotal;
          const unitPrice = Number.isFinite(unitParsed)
            ? unitParsed
            : quantity > 0
              ? Math.round((totalPrice / quantity) * 100) / 100
              : totalPrice;

          const normingReqs = (itemDesc?.characteristics ?? []).map((c) => ({
            id: c.id,
            requirementType: (["consumer", "quality", "functional"].includes(
              c.category,
            )
              ? c.category
              : "other") as "consumer" | "quality" | "functional" | "other",
            requirementText: `${c.name}: ${formatCharacteristicValue(c)}`,
          }));

          return {
            id: item.id || `sz-item-${idx + 1}`,
            okpd2OrKtruCode:
              itemDesc?.ktruCode || item.okpd2Code || itemDesc?.okpd2Code || "",
            name: item.name || matchedNote.subject || itemDesc?.title || "",
            unit: item.unit || itemDesc?.unit || "шт",
            quantity,
            unitPrice,
            totalPrice,
            trademarks: itemDesc?.trademarkName || "",
            isSupplyDuringWorks: Boolean(item.isSupplyDuringWorks),
            nationalRegimeType:
              item.nationalRegimeType ??
              matchedNote.nationalRegimeType ??
              "none",
            normingRequirements:
              normingReqs.length > 0 ? normingReqs : undefined,
          };
        });
        setValue("purchaseObjects.items", mappedItems);
      } else if (matchedNote?.subject || matchedDesc?.title) {
        const qtyRaw = Number.parseFloat(
          isIndeterminate
            ? "1"
            : String(matchedNote?.quantity || matchedDesc?.quantity || "1"),
        );
        const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
        const totalPriceRaw = Number.parseFloat(
          String(matchedNote?.initialMaxPrice ?? state.nmck ?? 0),
        );
        const totalPrice = Number.isFinite(totalPriceRaw) ? totalPriceRaw : 0;
        const unitPrice =
          quantity > 0
            ? Math.round((totalPrice / quantity) * 100) / 100
            : totalPrice;

        const normingReqs = (matchedDesc?.characteristics ?? []).map((c) => ({
          id: c.id,
          requirementType: (["consumer", "quality", "functional"].includes(
            c.category,
          )
            ? c.category
            : "other") as "consumer" | "quality" | "functional" | "other",
          requirementText: `${c.name}: ${formatCharacteristicValue(c)}`,
        }));

        setValue("purchaseObjects.items", [
          {
            id: "sz-item-1",
            okpd2OrKtruCode:
              matchedDesc?.ktruCode ||
              matchedNote?.okpd2Code ||
              matchedDesc?.okpd2Code ||
              "",
            name: matchedNote?.subject || matchedDesc?.title || "",
            unit: matchedNote?.unit || matchedDesc?.unit || "шт",
            quantity,
            unitPrice,
            totalPrice,
            trademarks: matchedDesc?.trademarkName || "",
            isSupplyDuringWorks: false,
            nationalRegimeType: matchedNote?.nationalRegimeType ?? "none",
            normingRequirements:
              normingReqs.length > 0 ? normingReqs : undefined,
          },
        ]);
      }
    }
  }, [
    matchedNote,
    matchedDesc,
    objectDescriptions,
    purchasePlans,
    methods.formState.isDirty,
    setValue,
    getValues,
    state.nmck,
  ]);

  const onSubmit = (formData: NoticeInfoFormValues) => {
    // Контроль нормирования (ПП РФ N 926): превышение предельной цены единицы
    // нормируемой позиции не сохраняется, пока его не подписал главный
    // подписант. Проверка дублирует блокировку кнопки — отправка по Enter
    // не должна обходить контроль
    const isBreachSigned = Boolean(
      formData.normingControl?.breachConfirmedByName,
    );
    const violations = isBreachSigned
      ? []
      : collectNormingViolations(
          formData.purchaseObjects.items.map((item) => ({
            code: item.okpd2OrKtruCode,
            unitPrice: item.unitPrice,
          })),
          okpd2Refs,
        );

    if (violations.length > 0) {
      setError("normingControl.breachConfirmedByName", {
        message: `Превышены предельные цены единиц (${violations.length} поз.). Сохранение возможно только после подписи главного подписанта`,
      });

      return;
    }

    // Национальный режим (ПП РФ N 1875): если код ОКПД2 входит в перечень
    // запрета или ограничения, соответствующий режим обязателен
    const regimeValidation = validateNationalRegime(
      formData.purchaseObjects.items.map((item) => ({
        code: item.okpd2OrKtruCode,
        name: item.name,
        declaredMode: item.nationalRegimeType,
      })),
      okpd2Refs,
    );

    if (regimeValidation.blocksSave) {
      setError("purchaseObjects.items.0.nationalRegimeType", {
        message:
          regimeValidation.summary ??
          "Национальный режим не соответствует перечням ПП РФ N 1875",
      });

      return;
    }

    const payload: NoticeInfoFormValues = {
      ...formData,
      procurementId: id ?? formData.procurementId,
      purchaseNoteId:
        matchedNote?.id ?? state.purchaseNoteId ?? formData.purchaseNoteId,
      objectDescriptionId:
        matchedDesc?.id ??
        state.objectDescriptionId ??
        formData.objectDescriptionId,
      ikz: formData.generalInfo.ikz,
    };

    createNotice(payload, {
      onSuccess: () => {
        navigate("/procurement-processing");
      },
    });
  };

  return (
    <section className={block()}>
      <header className={block("header")}>
        <h1 className={block("title")}>Формирование извещения (44-ФЗ)</h1>
        <button
          type="button"
          className={`${block("close")} btn`}
          onClick={() => navigate("/procurement-processing")}
          aria-label="Закрыть"
        >
          ✕
        </button>
      </header>

      {(matchedNote || matchedDesc) && (
        <div className={bannerClass}>
          <strong>Предзаполнение из потребности:</strong>{" "}
          {matchedNote
            ? `СЗ № ${matchedNote.noteNumber} от ${matchedNote.noteDate}`
            : ""}
          {matchedNote && matchedDesc ? " · " : ""}
          {matchedDesc ? `ООЗ «${matchedDesc.title}»` : ""}. Все подставленные
          поля можно откорректировать перед публикацией.
        </div>
      )}

      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          <NoticeStateSection />
          {/* Способ определения поставщика приходит из служебной записки —
              в извещении он показывается зафиксированным */}
          <GeneralInfoSection
            lockedPlacingWayCode={matchedNote?.placingWayCode}
          />
          <ContactInfoSection />
          <ProcedureDatesSection />
          <ContractConditionsSection />
          <PurchaseObjectsSection />
          <ObjectDescriptionSection />
          <NormingControlSection />
          <ParticipantsRequirementsSection />
          <AttachedDocsSection />

          <footer className={block("footer")}>
            <NormingSubmitButton isSaving={isSaving} />
          </footer>
        </form>
      </FormProvider>
    </section>
  );
};

export default NoticeInfoForm;
