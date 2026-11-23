import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useGetProcurements } from "../../services/Procurements/procurement.api";
import { useNotices } from "../../services/Procurements/noticeInfo.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { filterVisiblePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.schema";
import { useContractService } from "../../services/ContractService/contractService.api";
import { useFetchOrganizationEmployees } from "../../services/StaffingTable/StaffingTable.api";
import { useOrganizationBidEvaluations } from "../../services/BidEvaluation/bidEvaluation.api";
import {
  COMMISSION_ROLE_LABELS,
  PROCUREMENT_DOC_TYPE_LABELS,
  buildInitialGeneratorDraft,
  generateProcurementDocument,
  matchProcurementContext,
  type BidProtocolRowInput,
  type CommissionMemberInput,
  type CommissionRole,
  type DocumentGeneratorDraftInput,
  type ProcurementDocumentType,
} from "../../services/ProcurementDocuments/procurementDocumentGenerator";
import {
  exportGeneratedDocumentToDocx,
  exportGeneratedDocumentToPdf,
} from "../../services/ProcurementDocuments/procurementDocumentExport";
import DocumentCheckerPanel from "./DocumentCheckerPanel";
import Loader from "../UI/Loader";
import styles from "./ProcurementDocumentsPage.module.scss";
import Select from "../UI/Select";

const DOC_TYPES: ProcurementDocumentType[] = [
  "commission_order",
  "bid_review_protocol",
  "procurement_launch_order",
];

export default function ProcurementDocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProcId = searchParams.get("procurementId") ?? "";
  const initialDocType = (searchParams.get("docType") ??
    "commission_order") as ProcurementDocumentType;

  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;

  const { data: procurements = [], isLoading: isProcLoading } =
    useGetProcurements();
  const { data: plans = [] } = usePurchasePlans(orgId);
  const { data: purchaseNotes = [] } = usePurchaseNotes(orgId);
  const visiblePurchaseNotes = useMemo(
    () => filterVisiblePurchaseNotes(purchaseNotes),
    [purchaseNotes],
  );
  const { data: notices = [] } = useNotices();
  const { data: contractService } = useContractService(orgId);
  const { data: employees = [] } = useFetchOrganizationEmployees(orgId);
  const { data: bidEvaluations = [] } = useOrganizationBidEvaluations(orgId);

  const orgProcurements = useMemo(() => {
    const planIkz = new Set(
      plans.flatMap((p) => (p.positions ?? []).map((pos) => pos.identificationCode)),
    );
    const filtered = procurements.filter((p) => planIkz.has(p.ikz));
    return filtered.length > 0 ? filtered : procurements;
  }, [procurements, plans]);

  const [selectedProcurementId, setSelectedProcurementId] = useState<string>(
    initialProcId,
  );
  const [docType, setDocType] = useState<ProcurementDocumentType>(
    DOC_TYPES.includes(initialDocType) ? initialDocType : "commission_order",
  );
  const [draft, setDraft] = useState<DocumentGeneratorDraftInput | null>(null);
  const [checkerMode, setCheckerMode] = useState<"generated" | "custom">(
    "generated",
  );
  const [customText, setCustomText] = useState<string>("");
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);

  const activeProcurement = useMemo(() => {
    if (orgProcurements.length === 0) return null;
    return (
      orgProcurements.find(
        (p) => String(p.id) === String(selectedProcurementId),
      ) ?? orgProcurements[0]
    );
  }, [orgProcurements, selectedProcurementId]);

  const contextBundle = useMemo(() => {
    if (!activeProcurement) return null;
    return matchProcurementContext({
      procurement: activeProcurement,
      organization,
      plans,
      purchaseNotes: visiblePurchaseNotes,
      notices,
      bidEvaluations,
      contractService,
      employees,
    });
  }, [
    activeProcurement,
    organization,
    plans,
    visiblePurchaseNotes,
    notices,
    bidEvaluations,
    contractService,
    employees,
  ]);

  useEffect(() => {
    if (!contextBundle) return;
    setDraft(buildInitialGeneratorDraft(contextBundle, docType));
  }, [contextBundle, docType]);

  const generatedDoc = useMemo(() => {
    if (!contextBundle || !draft) return null;
    return generateProcurementDocument(contextBundle, draft);
  }, [contextBundle, draft]);

  const handleSelectProcurement = (id: string) => {
    setSelectedProcurementId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("procurementId", id);
      return next;
    });
  };

  const handleSelectDocType = (nextType: ProcurementDocumentType) => {
    setDocType(nextType);
    setCheckerMode("generated");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("docType", nextType);
      return next;
    });
  };

  const updateMember = (
    idx: number,
    patch: Partial<CommissionMemberInput>,
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextMembers = prev.commissionMembers.map((m, i) =>
        i === idx ? { ...m, ...patch } : m,
      );
      return { ...prev, commissionMembers: nextMembers };
    });
  };

  const addMember = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        commissionMembers: [
          ...prev.commissionMembers,
          {
            id: `cm-new-${Date.now()}`,
            fullName: "",
            position: "Специалист",
            role: "member",
            present: true,
          },
        ],
      };
    });
  };

  const removeMember = (idx: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        commissionMembers: prev.commissionMembers.filter((_, i) => i !== idx),
      };
    });
  };

  const updateBidRow = (idx: number, patch: Partial<BidProtocolRowInput>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const nextRows = prev.bidRows.map((b, i) =>
        i === idx ? { ...b, ...patch } : b,
      );
      return { ...prev, bidRows: nextRows };
    });
  };

  const addBidRow = () => {
    setDraft((prev) => {
      if (!prev) return prev;
      const n = prev.bidRows.length + 1;
      return {
        ...prev,
        bidRows: [
          ...prev.bidRows,
          {
            id: `bid-${Date.now()}`,
            regNumber: `Заявка № ${n}`,
            participantName: "",
            inn: "",
            offeredPrice: "",
            rank: n,
            decision: "admitted",
            rejectionReason: "",
          },
        ],
      };
    });
  };

  const removeBidRow = (idx: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bidRows: prev.bidRows.filter((_, i) => i !== idx),
      };
    });
  };

  const handleExport = async (format: "docx" | "pdf") => {
    if (!generatedDoc) return;
    setExporting(format);
    try {
      if (format === "docx") {
        await exportGeneratedDocumentToDocx(generatedDoc);
      } else {
        await exportGeneratedDocumentToPdf(generatedDoc);
      }
    } finally {
      setExporting(null);
    }
  };

  const textForChecker =
    checkerMode === "custom"
      ? customText
      : (generatedDoc?.fullPlainText ?? "");

  const handleInsertClause = (clause: string) => {
    if (checkerMode === "custom") {
      setCustomText((prev) => (prev.trim() ? `${prev}\n\n${clause}` : clause));
      return;
    }
    setDraft((prev) => {
      if (!prev) return prev;
      const existing = prev.additionalClauses.trim();
      if (existing.includes(clause)) return prev;
      return {
        ...prev,
        additionalClauses: existing ? `${existing}\n${clause}` : clause,
      };
    });
  };

  const handleReplaceInText = (target: string, replacement: string) => {
    if (checkerMode !== "custom" && generatedDoc) {
      // Переходим в режим редактирования текста с готовой заменой
      const updated = generatedDoc.fullPlainText.split(target).join(replacement);
      setCustomText(updated);
      setCheckerMode("custom");
      return;
    }
    setCustomText((prev) => prev.split(target).join(replacement));
  };

  if (isProcLoading) {
    return (
      <div className={styles.page}>
        <Loader modifer="pendulum" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Типовые документы закупки и Document Checker
          </h1>
          <p className={styles.subtitle}>
            Автоматическое формирование приказов о создании комиссии (ст. 39 44-ФЗ),
            протоколов рассмотрения заявок (ст. 48–50 44-ФЗ, ПП № 2604) и приказов о
            проведении закупки из карточек закупок с проверкой по актуальному реестру
            нормативных правовых актов.
          </p>
        </div>

        <div className={styles["header-actions"]}>
          <Link className={styles.btn} to="/procurement-processing">
            ← Карточки закупок
          </Link>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn--subtle"]}`}
            disabled={!generatedDoc || exporting !== null}
            onClick={() => handleExport("docx")}
          >
            {exporting === "docx" ? "Экспорт DOCX…" : "Скачать .docx"}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn--primary"]}`}
            disabled={!generatedDoc || exporting !== null}
            onClick={() => handleExport("pdf")}
          >
            {exporting === "pdf" ? "Экспорт PDF…" : "Скачать .pdf"}
          </button>
        </div>
      </header>

      {/* Выбор карточки закупки и формы документа */}
      <section className={styles.card}>
        <div className={styles["grid-2"]}>
          <label className={styles.field}>
            <span className={styles.label}>Карточка закупки (источник данных)</span>
            <Select
              className={styles.select}
              value={activeProcurement ? String(activeProcurement.id) : ""}
              onChange={(e) => handleSelectProcurement(e.target.value)}
            >
              {orgProcurements.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.ikz.slice(0, 14)}… — {p.name} ({p.nmck.toLocaleString("ru-RU")} ₽)
                </option>
              ))}
            </Select>
          </label>

          <div className={styles.field}>
            <span className={styles.label}>Типовая форма документа</span>
            <div className={styles.tabs}>
              {DOC_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.tab} ${
                    docType === t ? styles["tab--active"] : ""
                  }`}
                  onClick={() => handleSelectDocType(t)}
                >
                  {PROCUREMENT_DOC_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {generatedDoc && (
          <div className={styles["context-strip"]}>
            <span>
              ИКЗ: <strong>{generatedDoc.sourceSummary.ikz}</strong>
            </span>
            <span>
              Способ: <strong>{generatedDoc.sourceSummary.procurementType}</strong>
            </span>
            <span>
              НМЦК: <strong>{generatedDoc.sourceSummary.nmckFormatted}</strong>
            </span>
            <span>
              Извещение: <strong>{generatedDoc.sourceSummary.noticeNumber}</strong>
            </span>
            <span>
              ОКПД2: <strong>{generatedDoc.sourceSummary.okpd2}</strong>
            </span>
            <span>
              Подтянуто из:{" "}
              {generatedDoc.sourceSummary.linkedEntities.map((e) => (
                <span key={e} className={styles.tag} style={{ marginRight: 4 }}>
                  {e}
                </span>
              ))}
            </span>
          </div>
        )}
      </section>

      {draft && generatedDoc && (
        <div className={styles.workspace}>
          {/* Левая колонка — конструктор реквизитов и состава */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section className={styles.card}>
              <h2 className={styles["section-title"]}>
                Реквизиты и параметры документа
              </h2>
              <div className={styles["grid-3"]}>
                <label className={styles.field}>
                  <span className={styles.label}>Номер документа</span>
                  <input
                    type="text"
                    className={styles.input}
                    value={draft.documentNumber}
                    onChange={(e) =>
                      setDraft({ ...draft, documentNumber: e.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Дата документа</span>
                  <input
                    type="date"
                    className={styles.input}
                    value={draft.documentDate}
                    onChange={(e) =>
                      setDraft({ ...draft, documentDate: e.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Город / место</span>
                  <input
                    type="text"
                    className={styles.input}
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  />
                </label>
              </div>

              <div className={styles["grid-2"]}>
                <label className={styles.field}>
                  <span className={styles.label}>Руководитель заказчика (ФИО)</span>
                  <input
                    type="text"
                    className={styles.input}
                    value={draft.directorName}
                    onChange={(e) =>
                      setDraft({ ...draft, directorName: e.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Должность руководителя</span>
                  <input
                    type="text"
                    className={styles.input}
                    value={draft.directorPosition}
                    onChange={(e) =>
                      setDraft({ ...draft, directorPosition: e.target.value })
                    }
                  />
                </label>
              </div>

              {docType === "procurement_launch_order" ? (
                <div className={styles["grid-2"]}>
                  <label className={styles.field}>
                    <span className={styles.label}>Ответственный КС (ФИО)</span>
                    <input
                      type="text"
                      className={styles.input}
                      value={draft.responsiblePersonName}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          responsiblePersonName: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Должность ответственного</span>
                    <input
                      type="text"
                      className={styles.input}
                      value={draft.responsiblePersonPosition}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          responsiblePersonPosition: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              ) : (
                <div className={styles["grid-2"]}>
                  <label className={styles.field}>
                    <span className={styles.label}>Наименование комиссии</span>
                    <input
                      type="text"
                      className={styles.input}
                      value={draft.commissionKind}
                      onChange={(e) =>
                        setDraft({ ...draft, commissionKind: e.target.value })
                      }
                    />
                  </label>
                  {docType === "bid_review_protocol" && (
                    <label className={styles.field}>
                      <span className={styles.label}>Место заседания комиссии</span>
                      <input
                        type="text"
                        className={styles.input}
                        value={draft.meetingVenue}
                        onChange={(e) =>
                          setDraft({ ...draft, meetingVenue: e.target.value })
                        }
                      />
                    </label>
                  )}
                </div>
              )}

              {docType !== "procurement_launch_order" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className={styles.label}>
                      Состав комиссии ({draft.commissionMembers.length} чел. ·
                      минимум 3 по ч. 3 ст. 39 44-ФЗ)
                    </span>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles["btn--sm"]}`}
                      onClick={addMember}
                    >
                      + Добавить члена комиссии
                    </button>
                  </div>

                  {draft.commissionMembers.length < 3 && (
                    <div className={styles["warn-banner"]}>
                      По ч. 3 ст. 39 Закона № 44-ФЗ в состав комиссии должно
                      входить не менее 3 человек.
                    </div>
                  )}

                  <div className={styles["table-wrap"]}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ФИО</th>
                          <th>Должность</th>
                          <th>Роль</th>
                          {docType === "bid_review_protocol" && <th>Явка</th>}
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {draft.commissionMembers.map((member, idx) => (
                          <tr key={member.id}>
                            <td>
                              <input
                                type="text"
                                className={styles.input}
                                value={member.fullName}
                                onChange={(e) =>
                                  updateMember(idx, { fullName: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.input}
                                value={member.position}
                                onChange={(e) =>
                                  updateMember(idx, { position: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <Select
                                className={styles.select}
                                value={member.role}
                                onChange={(e) =>
                                  updateMember(idx, {
                                    role: e.target.value as CommissionRole,
                                  })
                                }
                              >
                                {Object.entries(COMMISSION_ROLE_LABELS).map(
                                  ([k, v]) => (
                                    <option key={k} value={k}>
                                      {v}
                                    </option>
                                  ),
                                )}
                              </Select>
                            </td>
                            {docType === "bid_review_protocol" && (
                              <td>
                                <input
                                  type="checkbox"
                                  checked={member.present !== false}
                                  onChange={(e) =>
                                    updateMember(idx, {
                                      present: e.target.checked,
                                    })
                                  }
                                />
                              </td>
                            )}
                            <td>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles["btn--danger"]} ${styles["btn--sm"]}`}
                                onClick={() => removeMember(idx)}
                                aria-label="Удалить члена комиссии"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {docType === "bid_review_protocol" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className={styles.label}>
                      Заявки участников ({draft.bidRows.length})
                    </span>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles["btn--sm"]}`}
                      onClick={addBidRow}
                    >
                      + Добавить заявку
                    </button>
                  </div>
                  <div className={styles["table-wrap"]}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>№</th>
                          <th>Участник</th>
                          <th>Цена, ₽</th>
                          <th>Решение</th>
                          <th>Место / Причина</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {draft.bidRows.map((row, idx) => (
                          <tr key={row.id}>
                            <td>
                              <input
                                type="text"
                                className={styles.input}
                                value={row.regNumber}
                                onChange={(e) =>
                                  updateBidRow(idx, { regNumber: e.target.value })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.input}
                                value={row.participantName}
                                onChange={(e) =>
                                  updateBidRow(idx, {
                                    participantName: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className={styles.input}
                                value={row.offeredPrice ?? ""}
                                onChange={(e) =>
                                  updateBidRow(idx, {
                                    offeredPrice: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <Select
                                className={styles.select}
                                value={row.decision}
                                onChange={(e) =>
                                  updateBidRow(idx, {
                                    decision: e.target.value as
                                      | "admitted"
                                      | "rejected",
                                  })
                                }
                              >
                                <option value="admitted">Допущена</option>
                                <option value="rejected">Отклонена</option>
                              </Select>
                            </td>
                            <td>
                              {row.decision === "admitted" ? (
                                <input
                                  type="number"
                                  min={1}
                                  className={styles.input}
                                  value={row.rank ?? idx + 1}
                                  onChange={(e) =>
                                    updateBidRow(idx, {
                                      rank: Number(e.target.value) || 1,
                                    })
                                  }
                                />
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Основание (ч. 12 ст. 48)"
                                  className={styles.input}
                                  value={row.rejectionReason ?? ""}
                                  onChange={(e) =>
                                    updateBidRow(idx, {
                                      rejectionReason: e.target.value,
                                    })
                                  }
                                />
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles["btn--danger"]} ${styles["btn--sm"]}`}
                                onClick={() => removeBidRow(idx)}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <label className={styles.field}>
                <span className={styles.label}>
                  Дополнительные пункты документа
                </span>
                <textarea
                  className={styles.textarea}
                  placeholder="Дополнительные поручения или особые положения документа..."
                  value={draft.additionalClauses}
                  onChange={(e) =>
                    setDraft({ ...draft, additionalClauses: e.target.value })
                  }
                />
              </label>
            </section>
          </div>

          {/* Правая колонка — Предпросмотр документа и Document Checker */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section className={styles.card}>
              <div className={styles.header}>
                <h2 className={styles["section-title"]}>
                  Сформированный документ
                </h2>
                <div className={styles.tabs}>
                  <button
                    type="button"
                    className={`${styles.tab} ${
                      checkerMode === "generated" ? styles["tab--active"] : ""
                    }`}
                    onClick={() => setCheckerMode("generated")}
                  >
                    Бланк формы
                  </button>
                  <button
                    type="button"
                    className={`${styles.tab} ${
                      checkerMode === "custom" ? styles["tab--active"] : ""
                    }`}
                    onClick={() => {
                      if (!customText) setCustomText(generatedDoc.fullPlainText);
                      setCheckerMode("custom");
                    }}
                  >
                    Текстовый редактор / Вставка для проверки
                  </button>
                </div>
              </div>

              {checkerMode === "custom" ? (
                <label className={styles.field}>
                  <span className={styles.label}>
                    Редактируемый текст документа (мгновенно проверяется в Document Checker)
                  </span>
                  <textarea
                    className={`${styles.textarea} ${styles["textarea--code"]}`}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                  />
                </label>
              ) : (
                <div className={styles.paper}>
                  <div className={styles["paper-org"]}>
                    {generatedDoc.organizationHeader}
                  </div>
                  {generatedDoc.organizationMeta && (
                    <div className={styles["paper-org-meta"]}>
                      {generatedDoc.organizationMeta}
                    </div>
                  )}
                  <div className={styles["paper-title"]}>
                    {generatedDoc.title}
                  </div>
                  <div className={styles["paper-subtitle"]}>
                    {generatedDoc.subtitle}
                  </div>
                  <div className={styles["paper-meta-row"]}>
                    <span>{generatedDoc.city}</span>
                    <span>от {generatedDoc.docDateRu}</span>
                  </div>

                  {generatedDoc.sections.map((sec) => (
                    <div key={sec.id}>
                      <h3 className={styles["paper-sec-title"]}>{sec.heading}</h3>
                      {sec.paragraphs.map((p, idx) => (
                        <p key={idx} className={styles["paper-p"]}>
                          {p}
                        </p>
                      ))}
                      {sec.table && sec.table.rows.length > 0 && (
                        <div className={styles["table-wrap"]}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                {sec.table.headers.map((h) => (
                                  <th key={h}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sec.table.rows.map((r, ri) => (
                                <tr key={ri}>
                                  {r.map((cell, ci) => (
                                    <td key={ci}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <DocumentCheckerPanel
              documentText={textForChecker}
              category={docType}
              onApplyInsertClause={handleInsertClause}
              onApplyReplacement={handleReplaceInText}
            />
          </div>
        </div>
      )}
    </div>
  );
}
