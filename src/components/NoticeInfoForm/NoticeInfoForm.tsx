import { useEffect } from "react";
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
import { RUSSIA } from "../../services/AddressRef/addressRef.schema";

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
import AttachedDocsSection from "./sections/AttachedDocsSection";

interface LocationState {
  ikz?: string;
  name?: string;
  procurementType?: string;
  nmck?: number;
  planPositionNumber?: string;
  responsibleFio?: string;
  // Требование по СМП наследуется из служебки по позиции ПГ
  smpRequiredPercent?: number;
  purchaseNoteNumber?: string;
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
        placementOrganizerType: "customer",
        authorizedBodyApproval: "Не требуется",
        orderName: state.name ?? "",
        planPositionNumber: state.planPositionNumber ?? String(id ?? ""),
        ikz: rawIkz,
        nmck: state.nmck ?? 0,
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
        requirementsPart1_1Art31: false,
        additionalRequirementsPart2Art31: false,
        pp2571Positions: [],
        subcontractingSmpPart5Art30: false,
        // Требование по СМП приходит из служебки по позиции плана-графика
        subcontractingSmpRequiredPercent:
          state.smpRequiredPercent !== undefined
            ? String(state.smpRequiredPercent)
            : "",
        subcontractingSmpNoteNumber: state.purchaseNoteNumber ?? "",
        sanctionsRnpRequirement: true,
        requiresApplicationSecurity: true,
        applicationSecurityPercent: 1,
        applicationSecurityOrder: "",
        applicationSecurityRequisites: {},
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

  const { setValue, handleSubmit, setError } = methods;

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
    }
  }, [currentEmployee, setValue]);

  useEffect(() => {
    if (userOrganization) {
      setValue("contactInfo.organizationName", userOrganization.fullName);
      setValue("contactInfo.postalAddress", userOrganization.postalAddress);
      setValue("contactInfo.locationAddress", userOrganization.legalAddress);
      setValue("contactInfo.placerEmail", userOrganization.email);
    }
  }, [userOrganization, setValue]);

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

    createNotice(formData, {
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

      <FormProvider {...methods}>
        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          <NoticeStateSection />
          <GeneralInfoSection />
          <ContactInfoSection />
          <ProcedureDatesSection />
          <ContractConditionsSection />
          <PurchaseObjectsSection />
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
