import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  FormProvider,
  useFieldArray,
  useForm,
  type FieldPath,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CONTRACT_APPENDIX_KINDS,
  CONTRACT_APPENDIX_LABELS,
  CONTRACT_KIND_LABELS,
  CONTRACT_KINDS,
  ContractProjectSchema,
  MANDATORY_TERMS,
  sectionCompletion,
  type ContractAppendixKind,
  type ContractKind,
  type ContractProject,
} from "../../services/ContractProject/contractProject.schema";
import {
  buildDefaultAppendices,
  contractKindTerms,
  contractSectionOverrideText,
  contractSectionsForKind,
  detectContractKind,
  isContractSectionIncluded,
  nextAppendixNumber,
  type ContractFieldDef,
  type ContractSectionDef,
} from "../../services/ContractProject/contractStructure";
import {
  buildContractProjectDraft,
  contractPrefillSourceLabels,
} from "../../services/ContractProject/contractProjectPrefill";
import {
  buildContractProjectXmlPreview,
  validateContractProjectEis17,
} from "../../services/Eis/eis17Types";
import {
  buildContractDocument,
  contractDocumentToText,
  contractTimelineText,
  formatContractDate,
} from "../../services/ContractProject/contractDocument";
import {
  contractIssueCounts,
  validateContractProject,
} from "../../services/ContractProject/contractValidation";
import {
  useCreateContractProject,
  useOrganizationContractProjects,
  useUpdateContractProject,
} from "../../services/ContractProject/contractProject.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  useAttachNoticeAttachment,
  useNotices,
} from "../../services/Procurements/noticeInfo.api";
import { buildContractProjectAttachment } from "../../services/ContractProject/contractProjectAttachment";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { filterVisiblePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.schema";
import { useOrganizationObjectDescriptions } from "../../services/ObjectDescription/objectDescription.api";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import ContractRiskAssessmentPanel from "./ContractRiskAssessmentPanel";
import CivilLawRequirementsPanel from "./CivilLawRequirementsPanel";
import { analyzeContractCivilBasis } from "../../services/ContractProject/civilLawRequirements";
import ClauseSuggestionsPanel from "./ClauseSuggestionsPanel";
import type { ClauseTemplate } from "../../services/ContractProject/clauseTemplates.api";
import styles from "./ContractProject.module.scss";
import Select from "../UI/Select";
import CounterpartySelect from "../UI/CounterpartySelect/CounterpartySelect";

interface ContractLocationState {
  // Ссылка на закупку: проект не должен держаться только на ИКЗ
  procurementId?: string | number;
  ikz?: string;
  name?: string;
  procurementType?: string;
  nmck?: number;
  noticeNumber?: string;
  kbk?: string;
}

const PREVIEW_SECTION = "preview";
const CHECKS_SECTION = "checks";
const CIVIL_SECTION = "civil-law";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

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
  const visiblePurchaseNotes = useMemo(
    () => filterVisiblePurchaseNotes(purchaseNotes),
    [purchaseNotes],
  );
  const { data: objectDescriptions = [] } =
    useOrganizationObjectDescriptions(orgId);
  const { data: registryContracts = [] } = useContractRegistry(orgId);

  const { mutate: createProject, isPending: isCreating } =
    useCreateContractProject();
  const { mutate: updateProject, isPending: isUpdating } =
    useUpdateContractProject();
  // Проект контракта — документ Раздела 2 извещения (п. 5 формы). Сохранение
  // в модуле проекта не должно оставлять извещение «неготовым»: без
  // приложенного проекта публикация блокируется
  const { mutate: attachToNotice, isPending: isAttaching } =
    useAttachNoticeAttachment();

  const [activeSection, setActiveSection] = useState("preamble");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEisXml, setShowEisXml] = useState(false);

  // Существующий проект контракта именно этой закупки (по procurementId или ИКЗ)
  const existing = useMemo(() => {
    if (id) {
      const byProc = orgProjects.find(
        (project) => String(project.procurementId ?? "") === String(id),
      );
      if (byProc) return byProc;
    }
    if (stateData?.ikz) {
      return orgProjects.find((project) => project.ikz === stateData.ikz);
    }
    return undefined;
  }, [orgProjects, id, stateData?.ikz]);

  // Извещение для текущей закупки — источник структуры проекта контракта
  const matchedNotice = useMemo(() => {
    if (id) {
      const byProc = notices
        .filter((notice) => String(notice.procurementId ?? "") === String(id))
        .slice(-1)[0];
      if (byProc) return byProc;
    }
    if (stateData?.ikz) {
      return notices
        .filter(
          (notice) =>
            notice.ikz === stateData.ikz ||
            notice.generalInfo?.ikz === stateData.ikz,
        )
        .slice(-1)[0];
    }
    return undefined;
  }, [notices, id, stateData?.ikz]);

  // Служебная записка по позиции ПГ
  const matchedNote = useMemo(() => {
    const noteId = matchedNotice?.purchaseNoteId;
    if (noteId !== undefined && noteId !== null && noteId !== "") {
      const byId = visiblePurchaseNotes.find(
        (note) => String(note.id) === String(noteId),
      );
      if (byId) return byId;
    }
    if (id) {
      const byProc = visiblePurchaseNotes
        .filter((note) => String(note.procurementId ?? "") === String(id))
        .slice(-1)[0];
      if (byProc) return byProc;
    }
    const targetIkz =
      matchedNotice?.generalInfo?.ikz || stateData?.ikz || undefined;
    if (targetIkz) {
      return visiblePurchaseNotes
        .filter((note) => note.ikz === targetIkz)
        .slice(-1)[0];
    }
    return undefined;
  }, [visiblePurchaseNotes, matchedNotice, id, stateData?.ikz]);

  // Контракт в реестре по этой закупке: из него берём реквизиты поставщика,
  // если определение поставщика уже состоялось
  const matchedContract = useMemo(() => {
    const targetIkz =
      matchedNotice?.generalInfo?.ikz || stateData?.ikz || matchedNote?.ikz;
    return (
      registryContracts.find(
        (contract) =>
          (id && String(contract.procurementId ?? "") === String(id)) ||
          (targetIkz && contract.ikz === targetIkz),
      ) ?? null
    );
  }, [
    registryContracts,
    matchedNotice?.generalInfo?.ikz,
    matchedNote?.ikz,
    id,
    stateData?.ikz,
  ]);

  // Структурированное ООЗ
  const matchedDesc = useMemo(() => {
    const onlyOoz = objectDescriptions.filter(
      (description) => description.kind === "object_description",
    );
    const descId =
      matchedNotice?.objectDescriptionId ?? matchedNote?.objectDescriptionId;
    if (descId !== undefined && descId !== null && descId !== "") {
      const byId = onlyOoz.find(
        (description) => String(description.id) === String(descId),
      );
      if (byId) return byId;
    }
    if (id) {
      const byProc = onlyOoz.find(
        (description) => String(description.procurementId ?? "") === String(id),
      );
      if (byProc) return byProc;
    }
    const targetIkz =
      matchedNotice?.generalInfo?.ikz || matchedNote?.ikz || stateData?.ikz;
    if (targetIkz) {
      return onlyOoz.find((description) => description.ikz === targetIkz);
    }
    return undefined;
  }, [objectDescriptions, matchedNotice, matchedNote, id, stateData?.ikz]);

  const procurementType =
    matchedNote?.procurementType ||
    matchedNotice?.generalInfo?.orderName ||
    stateData?.procurementType;

  // Черновик, собранный по цепочке: извещение → СЗ → ООЗ → карточка заказчика
  const draft = useMemo(
    () =>
      existing ??
      buildContractProjectDraft({
        organizationId: orgId,
        // В маршруте /procurement-processing/:id/contract-project id — это
        // идентификатор закупки, поэтому он и становится procurementId
        procurementId: stateData?.procurementId ?? id,
        notice: matchedNotice ?? null,
        note: matchedNote ?? null,
        objectDescription: matchedDesc ?? null,
        organization: organization ?? null,
        procurementType,
        supplierName: matchedContract?.supplierName ?? "",
        supplier: matchedContract
          ? {
              name: matchedContract.supplierName,
              inn: matchedContract.supplierInn,
              kpp: matchedContract.supplierKpp,
            }
          : null,
        ikz: stateData?.ikz,
        noticeNumber: stateData?.noticeNumber,
        nmck: stateData?.nmck,
        contractName: stateData?.name
          ? `Контракт: ${stateData.name}`
          : undefined,
      }),
    [
      existing,
      orgId,
      matchedNotice,
      matchedNote,
      matchedDesc,
      matchedContract,
      organization,
      procurementType,
      id,
      stateData?.procurementId,
      stateData?.ikz,
      stateData?.noticeNumber,
      stateData?.nmck,
      stateData?.name,
    ],
  );

  const methods = useForm<ContractProject>({
    resolver: zodResolver(ContractProjectSchema) as Resolver<ContractProject>,
    defaultValues: draft,
    mode: "onSubmit",
  });

  const appliedKeyRef = useRef("");

  useEffect(() => {
    if (methods.formState.isDirty) return;
    const key = existing
      ? `existing:${existing.id}`
      : `prefill:${id ?? ""}:${matchedNotice?.id ?? "n"}:${matchedNote?.id ?? "p"}:${matchedDesc?.id ?? "d"}:${organization?.id ?? "o"}`;
    if (appliedKeyRef.current === key) return;
    appliedKeyRef.current = key;
    methods.reset(draft);
  }, [
    draft,
    existing,
    methods,
    id,
    matchedNotice?.id,
    matchedNote?.id,
    matchedDesc?.id,
    organization?.id,
  ]);

  const project = methods.watch() as ContractProject;
  const sections = useMemo(
    () => contractSectionsForKind(project.kind),
    [project.kind],
  );
  const completion = sectionCompletion(project);
  const issues = validateContractProject(project);
  const issueCounts = contractIssueCounts(issues);
  const civilAnalysis = useMemo(
    () => analyzeContractCivilBasis(project),
    [project],
  );
  const document = useMemo(() => buildContractDocument(project), [project]);
  // Проверка и XML по contractProjectType (ЕИС 17.0) — для выгрузки в пакет
  const eisValidation = useMemo(
    () => validateContractProjectEis17(project),
    [project],
  );
  const eisXml = useMemo(
    () => buildContractProjectXmlPreview(project),
    [project],
  );

  const stageArray = useFieldArray({
    control: methods.control,
    name: "term.stages",
  });
  const appendixArray = useFieldArray({
    control: methods.control,
    name: "appendices",
  });
  // Файлы проекта контракта для неструктурированной выгрузки
  const fileArray = useFieldArray({
    control: methods.control,
    name: "eisInfo.contractProjectFiles",
  });

  useEffect(() => {
    if (
      activeSection === PREVIEW_SECTION ||
      activeSection === CHECKS_SECTION ||
      activeSection === CIVIL_SECTION ||
      sections.some((section) => section.id === activeSection)
    ) {
      return;
    }
    setActiveSection("preamble");
  }, [activeSection, sections]);

  const getValue = (path: string): unknown => {
    let current: unknown = project;
    for (const key of path.split(".")) {
      const record = asRecord(current);
      if (!record) return undefined;
      current = record[key];
    }
    return current;
  };

  const getError = (path: string): string | undefined => {
    let current: unknown = methods.formState.errors;
    for (const key of path.split(".")) {
      const record = asRecord(current);
      if (!record) return undefined;
      current = record[key];
    }
    const message = asRecord(current)?.message;
    return typeof message === "string" ? message : undefined;
  };

  const shouldShow = (field: ContractFieldDef): boolean => {
    if (!field.when) return true;
    const value = getValue(field.when.path);
    if (field.when.truthy !== undefined) {
      return Boolean(value) === field.when.truthy;
    }
    if (field.when.equals !== undefined) {
      return String(value ?? "") === String(field.when.equals);
    }
    return true;
  };

  const registerOptions = (field: ContractFieldDef) =>
    field.kind === "number"
      ? {
          setValueAs: (value: unknown) =>
            value === "" || value === null || value === undefined
              ? undefined
              : Number(value),
        }
      : undefined;

  const changeKind = (kind: ContractKind) => {
    const terms = contractKindTerms(kind);
    methods.setValue("kind", kind, { shouldDirty: true, shouldValidate: true });
    methods.setValue("preamble.contractorRole", terms.contractorRole, {
      shouldDirty: true,
    });
    const currentWorksType = String(getValue("subject.worksType") ?? "");
    const previousTerms = contractKindTerms(project.kind);
    if (
      !currentWorksType ||
      currentWorksType === previousTerms.defaultWorksType
    ) {
      methods.setValue("subject.worksType", terms.defaultWorksType, {
        shouldDirty: true,
      });
    }
  };

  const detectKindFromNotice = () => {
    const kind = detectContractKind({
      procurementType,
      okpd2Code:
        matchedNotice?.objectDescription?.okpd2Code ||
        matchedNotice?.purchaseObjects?.items?.[0]?.okpd2OrKtruCode ||
        matchedNote?.okpd2Code,
      objectName:
        matchedNotice?.objectDescription?.objectName ||
        matchedNotice?.generalInfo?.orderName,
      description: matchedNote?.subject,
      placingWayCode: matchedNotice?.generalInfo?.placingWayCode,
    });
    changeKind(kind);
  };

  const refillFromChain = () => {
    const next = buildContractProjectDraft({
      organizationId: orgId,
      notice: matchedNotice ?? null,
      note: matchedNote ?? null,
      objectDescription: matchedDesc ?? null,
      organization: organization ?? null,
      procurementType,
      supplierName: project.supplierName || matchedContract?.supplierName,
      supplier: matchedContract
        ? {
            name: matchedContract.supplierName,
            inn: matchedContract.supplierInn,
            kpp: matchedContract.supplierKpp,
          }
        : null,
      ikz: stateData?.ikz,
      noticeNumber: stateData?.noticeNumber,
      nmck: stateData?.nmck,
      // Изменение цены и основание не выводятся из цепочки — сохраняем
      // введённые значения при повторном предзаполнении
      changePrice: project.eisInfo?.changePrice,
      changePriceFoundation: project.eisInfo?.changePriceFoundation,
    });
    methods.reset({
      ...next,
      id: existing?.id,
      contractNumber: project.contractNumber,
      status: existing?.status ?? "draft",
      createdAt: existing?.createdAt || next.createdAt,
    });
  };

  const toggleSection = (sectionId: string, included: boolean) => {
    const current = methods.getValues("sectionOverrides") ?? [];
    const rest = current.filter((override) => override.id !== sectionId);
    methods.setValue(
      "sectionOverrides",
      included ? rest : [...rest, { id: sectionId, included: false }],
      { shouldDirty: true },
    );
  };

  /**
   * Вставка утверждаемой формулировки. Если раздел переопределён вручную,
   * дописываем в override — иначе предпросмотр всё равно берёт только его.
   * В обычном случае пишем в целевое поле, откуда текст попадёт и в
   * contractDocument.ts, и в выгрузку ЕИС.
   */
  const insertClause = (template: ClauseTemplate) => {
    const overrides = methods.getValues("sectionOverrides") ?? [];
    const override = overrides.find((item) => item.id === template.sectionId);
    if (override?.text) {
      if (override.text.includes(template.body)) return;
      methods.setValue(
        "sectionOverrides",
        overrides.map((item) =>
          item.id === template.sectionId
            ? { ...item, text: `${item.text}\n${template.body}` }
            : item,
        ),
        { shouldDirty: true, shouldValidate: true },
      );
      return;
    }

    const path = template.targetPath as FieldPath<ContractProject>;
    const current = String(methods.getValues(path) ?? "");
    if (current.includes(template.body)) return;
    methods.setValue(
      path,
      current ? `${current}\n${template.body}` : template.body,
      { shouldDirty: true, shouldValidate: true },
    );
  };

  // Предмет закупки для подбора института ГК и утверждённой вставки
  const clauseSubject = [
    project.subject.objectName,
    project.subject.description,
  ]
    .filter(Boolean)
    .join(" ");

  const applyDefaultAppendices = () => {
    methods.setValue(
      "appendices",
      buildDefaultAppendices(project.kind, {
        smpRequired: Boolean(project.smp?.required),
        stagedPayment: project.price.paymentProcedure === "staged",
        hasAdvance: project.price.paymentProcedure === "advance",
      }),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const addAppendix = () => {
    const appendices = methods.getValues("appendices") ?? [];
    appendixArray.append({
      id: `appendix-${Date.now()}`,
      number: nextAppendixNumber(appendices),
      title: "Новое приложение",
      kind: "other",
      included: true,
      required: false,
      note: "",
    });
  };

  const renumberAppendices = () => {
    const appendices = methods.getValues("appendices") ?? [];
    methods.setValue(
      "appendices",
      appendices.map((item, index) => ({ ...item, number: index + 1 })),
      { shouldDirty: true },
    );
  };

  const copyDocument = async () => {
    try {
      await navigator.clipboard.writeText(contractDocumentToText(document));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const onSubmit = (data: ContractProject) => {
    // При неструктурированной форме ЕИС требует файлы проекта контракта
    // (contractProjectFilesInfo): без них документ будет отклонён
    if (!data.eisInfo?.isStructuredForm) {
      const files = (data.eisInfo?.contractProjectFiles ?? []).filter(
        (file) => file.fileName?.trim().length > 0,
      );

      if (files.length === 0) {
        methods.setError("root", {
          message:
            "При неструктурированной форме проекта контракта приложите хотя бы один файл проекта (contractProjectFilesInfo)",
        });
        return;
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const payload: ContractProject = {
      ...data,
      organizationId: orgId,
      // Связь с закупкой не теряется, даже если поле в форме пустое:
      // берём его из состояния перехода или из маршрута
      procurementId: data.procurementId || stateData?.procurementId || id || "",
      appendices: (data.appendices ?? []).map((item, index) => ({
        ...item,
        number: index + 1,
      })),
      createdAt: existing?.createdAt || data.createdAt || today,
      updatedAt: today,
    };
    const markSaved = () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    };

    // Сохранённый проект сразу становится вложением своего извещения: иначе
    // документ есть, а Раздел 2 «не готов» и публикация блокируется. Если
    // извещения по закупке ещё нет (проект делают заранее) — прикладывать
    // некуда, и это не ошибка: приложение появится вместе с извещением
    const attachSavedProject = (savedProject: ContractProject) => {
      markSaved();

      const noticeId = matchedNotice?.id;
      if (noticeId === undefined || noticeId === null) return;

      attachToNotice({
        noticeId,
        attachment: buildContractProjectAttachment({
          project: savedProject,
          noticeId,
          procurementId: savedProject.procurementId || id || null,
          purchaseNoteId: matchedNotice?.purchaseNoteId ?? null,
        }),
      });
    };

    if (existing?.id !== undefined) {
      updateProject(
        { id: existing.id, ...payload },
        { onSuccess: attachSavedProject },
      );
    } else {
      createProject(payload, { onSuccess: attachSavedProject });
    }
  };

  if (loadingProjects) return <div className={styles.loader}>Загрузка...</div>;

  const prefillSources = contractPrefillSourceLabels({
    notice: matchedNotice,
    note: matchedNote,
    objectDescription: matchedDesc,
    organization,
  });

  const renderField = (field: ContractFieldDef) => {
    if (!shouldShow(field)) return null;
    const error = getError(field.path);
    const fieldId = `contract-${field.path.replace(/\./g, "-")}`;
    const path = field.path as FieldPath<ContractProject>;

    if (field.kind === "checkbox") {
      return (
        <label
          key={field.path}
          className={`${styles.checkbox} ${styles.fieldWide}`}
          htmlFor={fieldId}
        >
          <input id={fieldId} type="checkbox" {...methods.register(path)} />
          <span>
            {field.label}
            {field.hint && <span className={styles.hint}> {field.hint}</span>}
          </span>
        </label>
      );
    }

    return (
      <div
        key={field.path}
        className={`${styles.field} ${
          field.kind === "textarea" || field.kind === "stages"
            ? styles.fieldWide
            : ""
        }`}
      >
        <label className={styles.label} htmlFor={fieldId}>
          {field.label}
          {field.article && (
            <span className={styles.articleRef}> {field.article}</span>
          )}
          {field.hint && <span className={styles.hint}> {field.hint}</span>}
        </label>

        {field.kind === "textarea" ? (
          <textarea
            id={fieldId}
            rows={field.rows ?? 3}
            className={`${styles.textarea} ${error ? styles.inputError : ""}`}
            placeholder={field.placeholder}
            {...methods.register(path)}
          />
        ) : field.kind === "select" ? (
          <Select
            id={fieldId}
            className={`${styles.input} ${error ? styles.inputError : ""}`}
            {...methods.register(path)}
          >
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ) : (
          <input
            id={fieldId}
            type={
              field.kind === "date"
                ? "date"
                : field.kind === "number"
                  ? "number"
                  : "text"
            }
            inputMode={
              field.kind === "money" || field.kind === "percent"
                ? "decimal"
                : undefined
            }
            step={field.kind === "number" ? 1 : undefined}
            min={field.kind === "number" ? 0 : undefined}
            className={`${styles.input} ${error ? styles.inputError : ""}`}
            placeholder={field.placeholder}
            {...methods.register(path, registerOptions(field))}
          />
        )}

        {error && <span className={styles.error}>{error}</span>}
      </div>
    );
  };

  const renderStages = () => (
    <div className={styles.stages}>
      <div className={styles.stagesHead}>
        <h4 className={styles.stagesTitle}>Этапы исполнения</h4>
        <button
          type="button"
          className={styles.stageAdd}
          onClick={() =>
            stageArray.append({
              name: "",
              startDate: "",
              endDate: "",
              amount: "",
            })
          }
        >
          + Добавить этап
        </button>
      </div>
      {stageArray.fields.length === 0 && (
        <p className={styles.muted}>
          Этапы не заданы. Если контракт одноэтапный — оставьте пустым.
        </p>
      )}
      {stageArray.fields.map((stage, index) => (
        <div key={stage.id} className={styles.stageRow}>
          <input
            className={styles.input}
            placeholder="Название этапа"
            {...methods.register(`term.stages.${index}.name`)}
          />
          <input
            className={styles.input}
            type="date"
            {...methods.register(`term.stages.${index}.startDate`)}
          />
          <input
            className={styles.input}
            type="date"
            {...methods.register(`term.stages.${index}.endDate`)}
          />
          <input
            className={styles.input}
            inputMode="decimal"
            placeholder="Сумма, руб."
            {...methods.register(`term.stages.${index}.amount`)}
          />
          <button
            type="button"
            className={styles.stageRemove}
            onClick={() => stageArray.remove(index)}
            aria-label="Удалить этап"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );

  const renderAppendices = () => (
    <div className={styles.appendices}>
      <div className={styles.appendixToolbar}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={applyDefaultAppendices}
        >
          Сформировать приложения по виду контракта
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={addAppendix}
        >
          + Приложение
        </button>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={renumberAppendices}
        >
          Перенумеровать
        </button>
      </div>

      {appendixArray.fields.length === 0 ? (
        <p className={styles.muted}>
          Приложения не заданы. Нажмите «Сформировать приложения по виду
          контракта» — набор подставится по ст. 33, 34 и виду работ.
        </p>
      ) : (
        <div className={styles.appendixList}>
          {appendixArray.fields.map((item, index) => (
            <div key={item.id} className={styles.appendixRow}>
              <span className={styles.appendixNumber}>{index + 1}</span>
              <input
                className={styles.input}
                placeholder="Название приложения"
                {...methods.register(`appendices.${index}.title`)}
              />
              <Select
                className={styles.input}
                {...methods.register(`appendices.${index}.kind`)}
              >
                {CONTRACT_APPENDIX_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {CONTRACT_APPENDIX_LABELS[kind as ContractAppendixKind]}
                  </option>
                ))}
              </Select>
              <label className={styles.appendixCheck}>
                <input
                  type="checkbox"
                  {...methods.register(`appendices.${index}.included`)}
                />
                <span>Включено</span>
              </label>
              <label className={styles.appendixCheck}>
                <input
                  type="checkbox"
                  {...methods.register(`appendices.${index}.required`)}
                />
                <span>Обязательное</span>
              </label>
              <button
                type="button"
                className={styles.stageRemove}
                onClick={() => appendixArray.remove(index)}
                aria-label="Удалить приложение"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Поставщика удобнее выбрать из справочника контрагентов: реквизиты
  // подставляются в поля преамбулы, но остаются редактируемыми — в тексте
  // контракта фиксируются данные на дату заключения, а карточка справочника
  // может быть уточнена позже
  const renderCounterpartyPicker = () => (
    <div className={`${styles.fields} ${styles.counterpartyPicker}`}>
      <div className={`${styles.field} ${styles.fieldWide}`}>
        <label className={styles.label} htmlFor="contract-counterparty">
          Контрагент из справочника
        </label>
        <CounterpartySelect
          id="contract-counterparty"
          inn={project.requisites?.supplierInn ?? ""}
          name={project.supplierName ?? ""}
          placeholder="Найти по ИНН или наименованию — реквизиты подставятся в преамбулу"
          onSelect={(counterparty) => {
            // Наименование карточки — полное: сокращённое подставляем отдельно,
            // если оно заполнено в справочнике
            methods.setValue("supplierName", counterparty.name, {
              shouldDirty: true,
              shouldValidate: true,
            });
            methods.setValue("requisites.supplierFullName", counterparty.name, {
              shouldDirty: true,
              shouldValidate: true,
            });
            methods.setValue(
              "requisites.supplierShortName",
              counterparty.shortName ?? "",
              { shouldDirty: true, shouldValidate: true },
            );
            methods.setValue("requisites.supplierInn", counterparty.inn, {
              shouldDirty: true,
              shouldValidate: true,
            });
            methods.setValue("requisites.supplierKpp", counterparty.kpp ?? "", {
              shouldDirty: true,
              shouldValidate: true,
            });
            methods.setValue("requisites.supplierOgrn", counterparty.ogrn ?? "", {
              shouldDirty: true,
              shouldValidate: true,
            });
            methods.setValue("requisites.supplierAddress", counterparty.legalAddress ?? "", {
              shouldDirty: true,
              shouldValidate: true,
            });
            methods.setValue("requisites.supplierEmail", counterparty.email ?? "", {
              shouldDirty: true,
              shouldValidate: true,
            });
            methods.setValue("requisites.supplierPhone", counterparty.phone ?? "", {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
        <p className={styles.hint}>
          Справочник общий для контракта, сведений о СМП и котировок НМЦК: если
          контрагента в нём нет, заведите карточку — реквизиты больше не
          придётся вбивать повторно.
        </p>
      </div>
    </div>
  );

  const renderSection = (section: ContractSectionDef, index: number) => {
    const included = isContractSectionIncluded(project, section.id);
    const overrideText = contractSectionOverrideText(project, section.id);
    const completionItem = completion.sections.find(
      (item) => item.id === section.id,
    );

    return (
      <section key={section.id} className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h3 className={styles.sectionTitle}>
              {index + 1}. {section.title}
              <span className={styles.articleRef}> {section.article}</span>
              {completionItem?.applicable && (
                <span
                  className={`${styles.sectionDot} ${
                    completionItem.complete
                      ? styles.sectionDotComplete
                      : styles.sectionDotIncomplete
                  }`}
                  title={
                    completionItem.complete
                      ? "Обязательное условие заполнено"
                      : "Обязательное условие не заполнено"
                  }
                />
              )}
            </h3>
            <p className={styles.sectionPurpose}>{section.purpose}</p>
          </div>
          {section.id !== "appendices" && (
            <label className={styles.includeToggle}>
              <input
                type="checkbox"
                checked={included}
                onChange={(event) =>
                  toggleSection(section.id, event.target.checked)
                }
              />
              <span>Включить раздел</span>
            </label>
          )}
        </div>

        {!included ? (
          <p className={styles.muted}>
            Раздел исключён из проекта контракта. Включите его, если условие
            должно остаться в тексте.
          </p>
        ) : section.special === "appendices" ? (
          renderAppendices()
        ) : (
          <>
            {/* Справочник контрагентов нужен и в преамбуле, и в реквизитах:
                в преамбуле он рядом с наименованием поставщика, в реквизитах —
                рядом с ИНН, КПП и адресом */}
            {(section.id === "preamble" || section.id === "requisites") &&
              renderCounterpartyPicker()}
            <div className={styles.fields}>
              {section.fields.map((field) =>
                field.kind === "stages" ? (
                  <div key={field.path} className={styles.fieldWide}>
                    {renderStages()}
                  </div>
                ) : (
                  renderField(field)
                ),
              )}
            </div>
            {overrideText && (
              <p className={styles.muted}>
                Раздел переопределён вручную — текст в предпросмотре берётся из
                переопределения.
              </p>
            )}
            <ClauseSuggestionsPanel
              subject={clauseSubject}
              contractKind={project.kind}
              sectionId={section.id}
              onInsert={insertClause}
            />
          </>
        )}
      </section>
    );
  };

  const renderPreview = () => (
    <section className={`${styles.section} ${styles.previewSection}`}>
      <div className={styles.previewToolbar}>
        <div>
          <h3 className={styles.sectionTitle}>Предпросмотр текста контракта</h3>
          <p className={styles.sectionPurpose}>
            Текст собран из заполненных полей. Окончательная юридическая
            редакция — за контрактной службой заказчика.
          </p>
        </div>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={copyDocument}
        >
          {copied ? "Текст скопирован" : "Скопировать текст"}
        </button>
      </div>

      <article className={styles.preview}>
        <h2 className={styles.previewTitle}>{document.title}</h2>
        <p className={styles.previewPreamble}>{document.preamble}</p>

        {document.sections.map((section) => (
          <div key={section.id} className={styles.previewBlock}>
            <h4 className={styles.previewHeading}>
              {section.number}. {section.title}
            </h4>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className={styles.previewParagraph}>
                {paragraph}
              </p>
            ))}
          </div>
        ))}

        {document.appendices.length > 0 && (
          <div className={styles.previewBlock}>
            <h4 className={styles.previewHeading}>Приложения</h4>
            {document.appendices.map((appendix) => (
              <p key={appendix.number} className={styles.previewParagraph}>
                {appendix.number}. {appendix.title}
                {appendix.note ? ` — ${appendix.note}` : ""}
              </p>
            ))}
          </div>
        )}

        <div className={styles.previewSignature}>
          {document.signature.map((line, index) => (
            <p key={index} className={styles.previewParagraph}>
              {line}
            </p>
          ))}
        </div>
      </article>

      {/* Выгрузка в ЕИС: поля, которых нет в тексте контракта, но которые
          требует contractProjectType (IntegrationCPTypes.xsd) */}
      <div className={styles.stages}>
        <div className={styles.stagesHead}>
          <h4 className={styles.stagesTitle}>
            Выгрузка в ЕИС (проект контракта)
          </h4>
          <span className={styles.articleRef}>
            {eisValidation.errorsCount} ошибок · {eisValidation.warningsCount}{" "}
            предупреждений
          </span>
        </div>

        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.label}>Номер закупки в ЕИС</span>
            <input
              className={styles.input}
              {...methods.register("eisInfo.purchaseNumber")}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Номер заявки победителя</span>
            <input
              className={styles.input}
              {...methods.register("eisInfo.appNumber")}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Протокол-основание</span>
            <input
              className={styles.input}
              placeholder="Наименование протокола"
              {...methods.register("eisInfo.protocolName")}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Номер протокола</span>
            <input
              className={styles.input}
              {...methods.register("eisInfo.protocolNumber")}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Дата протокола</span>
            <input
              type="date"
              className={styles.input}
              {...methods.register("eisInfo.protocolPublishDate")}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              Изменённая цена (changePriceInfo)
            </span>
            <input
              className={styles.input}
              inputMode="decimal"
              placeholder="Только если цена изменена"
              {...methods.register("eisInfo.changePrice")}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Основание изменения цены</span>
            <input
              className={styles.input}
              placeholder="Код/наименование по nsiChangePriceFoundation"
              {...methods.register("eisInfo.changePriceFoundation")}
            />
          </label>
          <label className={`${styles.checkbox} ${styles.fieldWide}`}>
            <input
              type="checkbox"
              {...methods.register("eisInfo.isStructuredForm")}
            />
            <span>
              Структурированная форма проекта (файлы не требуются; при
              выключенном признаке приложите файл проекта)
            </span>
          </label>
        </div>

        <div className={styles.appendixToolbar}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() =>
              fileArray.append({
                id: `file-${Date.now()}`,
                fileName: "",
                description: "",
              })
            }
          >
            + Файл проекта контракта
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => setShowEisXml((prev) => !prev)}
          >
            {showEisXml ? "Скрыть XML" : "Проверка ЕИС 17.0 / XML"}
          </button>
        </div>

        {fileArray.fields.length === 0 ? (
          <p className={styles.muted}>
            Файлы не приложены. Для неструктурированной формы без них ЕИС
            отклонит проект.
          </p>
        ) : (
          <div className={styles.appendixList}>
            {fileArray.fields.map((file, index) => (
              <div key={file.id} className={styles.appendixRow}>
                <input
                  className={styles.input}
                  placeholder="Имя файла"
                  {...methods.register(
                    `eisInfo.contractProjectFiles.${index}.fileName`,
                  )}
                />
                <input
                  className={styles.input}
                  placeholder="Описание"
                  {...methods.register(
                    `eisInfo.contractProjectFiles.${index}.description`,
                  )}
                />
                <button
                  type="button"
                  className={styles.stageRemove}
                  onClick={() => fileArray.remove(index)}
                  aria-label="Удалить файл"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {eisValidation.issues.length > 0 && (
          <ul className={styles.issueList}>
            {eisValidation.issues.map((issue, index) => (
              <li key={index} className={styles.issueItem}>
                <span
                  className={`${styles.issueBadge} ${
                    issue.severity === "error"
                      ? styles.issueError
                      : styles.issueWarning
                  }`}
                >
                  {issue.severity === "error" ? "Ошибка" : "Внимание"}
                </span>
                <span className={styles.issueText}>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}

        {showEisXml && <pre className={styles.eisXml}>{eisXml}</pre>}
      </div>
    </section>
  );

  const renderCivilLaw = () => (
    <section className={styles.section}>
      <CivilLawRequirementsPanel
        project={project}
        onNavigateSection={(sectionId) => setActiveSection(sectionId)}
      />
    </section>
  );

  const renderChecks = () => (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Проверки проекта контракта</h3>
      <p className={styles.sectionPurpose}>
        Блокирующие ошибки — не выполнены обязательные условия ст. 34 или
        нарушены пределы, установленные законом. Предупреждения требуют
        осознанного решения заказчика.
      </p>

      <div className={styles.issueSummary}>
        <span className={`${styles.issueBadge} ${styles.issueError}`}>
          Ошибки: {issueCounts.errors}
        </span>
        <span className={`${styles.issueBadge} ${styles.issueWarning}`}>
          Предупреждения: {issueCounts.warnings}
        </span>
        <span className={`${styles.issueBadge} ${styles.issueOk}`}>
          Заполнено: {completion.completed}/{completion.total}
        </span>
      </div>

      {issues.length === 0 ? (
        <p className={styles.issueEmpty}>
          Проверки пройдены: обязательные условия заполнены.
        </p>
      ) : (
        <ul className={styles.issueList}>
          {issues.map((issue, index) => (
            <li
              key={`${issue.sectionId}-${issue.field}-${index}`}
              className={`${styles.issueItem} ${
                issue.severity === "error"
                  ? styles.issueError
                  : styles.issueWarning
              }`}
            >
              <div className={styles.issueText}>
                <strong>{issue.message}</strong>
                <span className={styles.issueArticle}>{issue.article}</span>
              </div>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setActiveSection(issue.sectionId)}
              >
                Перейти
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.timeline}>
        <h4 className={styles.stagesTitle}>Сроки заключения по ст. 51</h4>
        <p className={styles.muted}>{contractTimelineText()}</p>
        {project.projectDate && (
          <p className={styles.muted}>
            Проект составлен {formatContractDate(project.projectDate)}.
            Ориентировочный срок подписания победителем —{" "}
            {formatContractDate(
              new Date(
                new Date(`${project.projectDate}T00:00:00`).getTime() +
                  5 * 86_400_000,
              )
                .toISOString()
                .slice(0, 10),
            )}
            .
          </p>
        )}
      </div>
    </section>
  );

  const activeIndex = sections.findIndex(
    (section) => section.id === activeSection,
  );
  const activeSectionDef = activeIndex >= 0 ? sections[activeIndex] : undefined;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            Конструктор проекта контракта
            {existing ? ` #${existing.id}` : ""}
          </h2>
          <p className={styles.subtitle}>
            Цепочка: план-график → служебная записка → извещение →{" "}
            <strong>проект контракта</strong> → подписанный контракт → реестр.
            Структура — по ст. 34 и 51 Закона № 44-ФЗ.
          </p>
        </div>

        <div className={styles.kindBar}>
          <label className={styles.kindLabel} htmlFor="contract-kind">
            Вид контракта
          </label>
          <Select
            id="contract-kind"
            className={styles.kindSelect}
            value={project.kind}
            onChange={(event) => changeKind(event.target.value as ContractKind)}
          >
            {CONTRACT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {CONTRACT_KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={detectKindFromNotice}
          >
            Определить по извещению
          </button>
        </div>
      </header>

      <div className={styles.banner}>
        <div>
          <strong>Предзаполнено по цепочке:</strong>{" "}
          {prefillSources.length > 0
            ? prefillSources.join(" + ")
            : "источники ещё не загружены"}
          . Проверьте обязательные условия ст. 34 перед сохранением.
        </div>
        <div className={styles.bannerActions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={refillFromChain}
          >
            Заполнить из извещения
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setActiveSection(CIVIL_SECTION)}
          >
            Условия ГК РФ:{" "}
            {civilAnalysis.counts.total - civilAnalysis.counts.filled} заполнить
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setActiveSection(CHECKS_SECTION)}
          >
            Проверки: {issueCounts.errors} / {issueCounts.warnings}
          </button>
        </div>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          Обязательные условия ст. 34:{" "}
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
          {MANDATORY_TERMS.map((term) => {
            const item = completion.sections.find(
              (section) => section.id === term.id,
            );
            const complete = item?.complete ?? false;
            const applicable = item?.applicable ?? true;
            return (
              <span
                key={term.id}
                className={`${styles.termChip} ${
                  !applicable
                    ? styles.termChipMuted
                    : complete
                      ? styles.termChipComplete
                      : styles.termChipIncomplete
                }`}
                title={term.article}
              >
                {term.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Автоматическая оценка рисков проекта контракта по 44-ФЗ */}
      <ContractRiskAssessmentPanel
        project={project}
        notice={matchedNotice}
        purchaseNote={matchedNote}
        onNavigateSection={(sectionId) => setActiveSection(sectionId)}
      />

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav} aria-label="Разделы проекта контракта">
            {sections.map((section, index) => {
              const item = completion.sections.find(
                (completionItem) => completionItem.id === section.id,
              );
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`${styles.navBtn} ${
                    activeSection === section.id ? styles.navBtnActive : ""
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className={styles.navIndex}>{index + 1}</span>
                  <span className={styles.navText}>{section.title}</span>
                  {item?.applicable && (
                    <span
                      className={`${styles.navDot} ${
                        item.complete
                          ? styles.navDotComplete
                          : styles.navDotIncomplete
                      }`}
                    />
                  )}
                </button>
              );
            })}

            <div className={styles.navDivider} />

            <button
              type="button"
              className={`${styles.navBtn} ${
                activeSection === CIVIL_SECTION ? styles.navBtnActive : ""
              }`}
              onClick={() => setActiveSection(CIVIL_SECTION)}
            >
              <span className={styles.navIndex}>§</span>
              <span className={styles.navText}>Условия ГК РФ</span>
              {civilAnalysis.counts.missing > 0 && (
                <span className={styles.navErrorCount}>
                  {civilAnalysis.counts.missing}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${
                activeSection === PREVIEW_SECTION ? styles.navBtnActive : ""
              }`}
              onClick={() => setActiveSection(PREVIEW_SECTION)}
            >
              <span className={styles.navIndex}>◉</span>
              <span className={styles.navText}>Предпросмотр</span>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${
                activeSection === CHECKS_SECTION ? styles.navBtnActive : ""
              }`}
              onClick={() => setActiveSection(CHECKS_SECTION)}
            >
              <span className={styles.navIndex}>!</span>
              <span className={styles.navText}>Проверки</span>
              {issueCounts.errors > 0 && (
                <span className={styles.navErrorCount}>
                  {issueCounts.errors}
                </span>
              )}
            </button>
          </nav>
        </aside>

        <main className={styles.content}>
          <FormProvider {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit)}
              className={styles.form}
            >
              {activeSection === PREVIEW_SECTION
                ? renderPreview()
                : activeSection === CHECKS_SECTION
                  ? renderChecks()
                  : activeSection === CIVIL_SECTION
                    ? renderCivilLaw()
                    : activeSectionDef
                    ? renderSection(activeSectionDef, activeIndex)
                    : null}

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={isCreating || isUpdating || isAttaching}
                >
                  {existing
                    ? "Сохранить изменения"
                    : "Создать проект контракта"}
                </button>
                <span className={styles.statusBadge}>
                  Статус: {existing?.status ?? "черновик"}
                </span>
                {saved && (
                  <span className={styles.savedMessage}>
                    {matchedNotice
                      ? "Проект сохранён и приложен к извещению"
                      : "Проект сохранён"}
                  </span>
                )}
              </div>
            </form>
          </FormProvider>
        </main>
      </div>
    </div>
  );
}
