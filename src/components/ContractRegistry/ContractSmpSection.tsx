import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useContractSmpRecords,
  useCreateContractSmpRecord,
  useUpdateContractSmpRecord,
  useDeleteContractSmpRecord,
} from "../../services/ContractSmp/contractSmp.api";
import {
  ContractSmpRecordSchema,
  emptyContractSmpRecord,
  computeSmpVolume,
  computeSmpPenalty,
  contractSmpDocumentTypeLabels,
  contractSmpStatusLabels,
  contractSmpPriceTypeLabels,
  smpDocumentsAmount,
  smpLinkedDocuments,
  smpSubContracts,
  smpUnlinkedDocuments,
  smpVolumeSources,
  type ContractSmpRecord,
} from "../../services/ContractSmp/contractSmp.schema";
import {
  computeSmpDeadlines,
  smpDeadlineStatusLabels,
} from "../../services/ContractSmp/deadlines";
import {
  readSourceFileFields,
  formatFileSize,
  SOURCE_FILE_HINT,
  type SourceFileFields,
} from "../../services/ContractSmp/sourceFile";
import {
  useSmpInnCheck,
  useSmpRegistry,
} from "../../services/ContractSmp/smpRegistry.api";
import {
  normalizeInn,
  smpInnLookupText,
  type SmpInnLookup,
} from "../../services/ContractSmp/smpRegistry.schema";
import {
  smpCheckBadge,
  smpCheckIssuesText,
  smpCheckTone,
  smpDeadlineShort,
  smpRecordCheck,
  type SmpRecordCheck,
} from "../../services/ContractSmp/smpControl";
import {
  useCreatePenalty,
  useUpdateContract,
} from "../../services/ContractRegistry/contractRegistry.api";
import { localIsoDate } from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import {
  contractCardSmpRequirement,
  contractCardSmpRows,
  contractCardSmpTotal,
  type ContractCardSmpSubcontractor,
} from "../../services/ContractRegistry/contractCardProjection.schema";
import {
  describeEisError,
  useCreateEisPackage,
} from "../../services/Eis/eisPackages.api";
import { eisPackageStatusLabels } from "../../services/Eis/eisPackages.schema";
import { isEisContractNumber, isIkz } from "../../services/Eis/eisIdentifiers";
import styles from "./ContractRegistry.module.scss";
import useUtils from "../../hooks/useUtils";
import useMyContractRole from "../../hooks/useMyContractRole";
import EdsSignModal from "../Eds/EdsSignModal";
import { useLogSignatureEvent } from "../../services/Eds/eds.api";
import type {
  SignatureEventAction,
  SignatureEvent,
} from "../../services/Eds/eds.schema";
import Select from "../UI/Select";
import CounterpartySelect from "../UI/CounterpartySelect/CounterpartySelect";
import ContractViolationNotice from "./ContractViolationNotice";

/**
 * Секция «Привлечение СМП» в карточке контракта (Tasks 9, п. 7, п/п 7).
 *
 * Показывает:
 * 1) Прогресс-бар требуемого vs фактического объёма привлечения СМП
 * 2) Таблицу дедлайнов — два контура разными цветами (подрядчик / заказчик)
 * 3) Таблицу всех записей с подтверждением достоверности
 * 4) Кнопку создания новой записи и кнопку начисления неустойки
 */

/**
 * Дата в ГГГГ-ММ-ДД. В карточке ЕИС даты субдоговоров приходят и ISO с
 * временем, и ДД.ММ.ГГГГ: форма хранит только ГГГГ-ММ-ДД, поэтому приводим
 * значение к нему — иначе черновик не пройдёт проверку даты.
 */
const isoDate = (value?: string | null): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const dotted = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return dotted ? `${dotted[3]}-${dotted[2]}-${dotted[1]}` : raw.slice(0, 10);
};

interface SmpSectionProps {
  contractId: string | number;
  contractPrice: string | number | undefined;
  smpRequiredPercent: string | number | undefined;
  subcontractingSmpNoteNumber: string | undefined;
  /** Номер контракта, предмет и ИКЗ — для текста КС-уведомления. */
  contractNumber?: string;
  contractSubject?: string;
  ikz?: string;
}

export default function SmpSection({
  contractId,
  contractPrice,
  smpRequiredPercent,
  subcontractingSmpNoteNumber,
  contractNumber,
  contractSubject,
  ikz,
}: SmpSectionProps) {
  const { bem, fullName, formatDate } = useUtils();
  const block = bem(styles, "smp-section");

  const { data: records = [] } = useContractSmpRecords(contractId);
  const createRecord = useCreateContractSmpRecord();
  const updateRecord = useUpdateContractSmpRecord();
  const deleteRecord = useDeleteContractSmpRecord();
  const createPenalty = useCreatePenalty();

  // Реестр МСП: единственный источник подтверждения, что субподрядчик —
  // субъект МСП. Заявленный в сведениях признак «СМП» ничего не доказывает.
  // Справочник хранит ответы сервиса ФНС по конкретным ИНН, поэтому вердикта
  // нет ровно до тех пор, пока ИНН не сверен — его и запускает кнопка ниже
  const { data: smpRegistry = [] } = useSmpRegistry();
  const innCheck = useSmpInnCheck();
  const [innCheckMessage, setInnCheckMessage] = useState<string | null>(null);

  /** ИНН субподрядчиков, заявленных как СМП: их и сверяем с реестром. */
  const smpInns = useMemo(
    () => [
      ...new Set(
        records
          .filter((record) => record.isSmpSubject)
          .map((record) => normalizeInn(record.supplierInn))
          .filter(Boolean),
      ),
    ],
    [records],
  );

  const checkRecordInns = () => {
    if (smpInns.length === 0) return;

    setInnCheckMessage(null);
    innCheck.mutate(smpInns, {
      onSuccess: (answers) => {
        const count = (status: string) =>
          answers.filter((answer) => answer.status === status).length;
        const withoutVerdict = answers.filter(
          (answer) =>
            answer.status === "unavailable" || answer.status === "invalid",
        );

        setInnCheckMessage(
          [
            `Проверено ИНН: ${answers.length}.`,
            `в реестре: ${count("in_registry")}`,
            `не найдено: ${count("out_of_registry")}`,
            count("excluded") > 0 ? `исключено: ${count("excluded")}` : "",
            withoutVerdict.length > 0
              ? `без вердикта: ${withoutVerdict
                  .map((answer) => answer.inn)
                  .join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
        );
      },
      onError: () =>
        setInnCheckMessage(
          "Сервис ФНС недоступен: вердикта по ИНН нет, повторите позже.",
        ),
    });
  };

  // Проверка каждой записи: реестр МСП + сроки ПП 1466. Одна функция на
  // таблицу, форму и хронологию исполнения — вердикт не должен расходиться
  const checks = useMemo(() => {
    const map = new Map<string, SmpRecordCheck>();
    for (const record of records) {
      map.set(String(record.id), smpRecordCheck(record, records, smpRegistry));
    }
    return map;
  }, [records, smpRegistry]);

  // Строки таблицы: договор с субподрядчиком, а под ним — присланные к нему
  // декларация, акты приёмки и платёжные поручения. Сводка по договору
  // считается здесь один раз, чтобы не перебирать документы в каждой ячейке.
  //
  // Записи, которые ни к одному договору не привязались, показываются в конце
  // без отступа — иначе акт, заведённый без договора-основания, пропал бы из
  // таблицы совсем.
  const rows = useMemo(() => {
    const ordered: Array<{
      record: ContractSmpRecord;
      nested: boolean;
      paymentAmount?: number;
      acceptanceAmount?: number;
      documentCount?: number;
    }> = [];
    const seen = new Set<string>();

    for (const subContract of smpSubContracts(records)) {
      const documents = smpLinkedDocuments(subContract, records);
      ordered.push({
        record: subContract,
        nested: false,
        paymentAmount: smpDocumentsAmount(documents, "payment"),
        acceptanceAmount: smpDocumentsAmount(documents, "acceptance"),
        documentCount: documents.length,
      });
      seen.add(String(subContract.id));

      for (const document of documents) {
        // Документ мог привязаться к двум договорам одного субподрядчика по
        // ИНН — второй раз строку не повторяем
        if (seen.has(String(document.id))) continue;
        seen.add(String(document.id));
        ordered.push({ record: document, nested: true });
      }
    }

    for (const record of smpUnlinkedDocuments(records)) {
      if (seen.has(String(record.id))) continue;
      ordered.push({ record, nested: false });
    }

    return ordered.map((row) => ({
      ...row,
      check: checks.get(String(row.record.id)),
    }));
  }, [records, checks]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContractSmpRecord | null>(null);
  // Черновик из подтаблицы ЕИС: субподрядчик уже опубликован заказчиком в
  // карточке контракта, но записи в нашем реестре СМП нет. Клик по строке
  // открывает форму с подставленными реквизитами — их проверяют, а не
  // перепечатывают из XML
  const [eisDraft, setEisDraft] = useState<ContractSmpRecord | null>(null);
  // Черновик документа, приложенного к договору субподрядчика: акт или
  // платёжка создаются из строки договора, поэтому договор-основание и
  // реквизиты субподрядчика уже заполнены
  const [childDraft, setChildDraft] = useState<ContractSmpRecord | null>(null);
  // Результат постановки в очередь ЕИС: строка под таблицей вместо alert —
  // отказ шлюза надо прочитать, а не закрыть по привычке
  const [eisQueued, setEisQueued] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const createEisPackage = useCreateEisPackage();

  // Требование о привлечении СМП живёт в самом контракте: у контрактов,
  // импортированных из ЕИС, процента и номера служебки нет — их можно задать
  // прямо здесь, не уходя из карточки
  const updateContract = useUpdateContract();
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [percentDraft, setPercentDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [requirementError, setRequirementError] = useState("");

  // Подтаблица «Информация о привлечении СМП, СОНО» из выгрузки карточки ЕИС:
  // сведения лежат в XML контракта, поэтому приходят вместе с проекцией
  const { data: projection } = useContractCardProjection(contractId);
  // Адрес записи в реестре ЕИС: сведения о СМП шлюз привязывает к реестровому
  // номеру контракта и ИКЗ. Без них пакет собирать не из чего — предупреждаем
  // об этом в карточке, а не после отказа шлюза
  const eisContractNumber = projection?.regNumber || projection?.RegNumber || "";
  const eisIkz = projection?.General?.Ikz ?? "";
  const canQueueEis = isEisContractNumber(eisContractNumber) && isIkz(eisIkz);
  const eisSmpRows = useMemo(
    () => contractCardSmpRows(projection?.Smp ?? []),
    [projection],
  );
  const eisRequirement = useMemo(
    () => contractCardSmpRequirement(projection?.Smp ?? []),
    [projection],
  );
  const eisTotal = useMemo(
    () => contractCardSmpTotal(eisSmpRows),
    [eisSmpRows],
  );
  // Ключи уже заведённых записей: ИНН + номер субдоговора. По ним видно, что
  // строка ЕИС не «новая» — второй раз её заводить не нужно
  const registeredEisKeys = useMemo(
    () =>
      new Set(
        records.map(
          (record) => `${record.supplierInn ?? ""}|${record.documentNumber ?? ""}`,
        ),
      ),
    [records],
  );

  // Условие привлечения СМП (процент и ответственность) публикуется в ЕИС у всех
  // контрактов с ч. 5 ст. 30 44-ФЗ, поэтому блок показываем и без субподрядчиков
  const hasEisRequirement =
    eisRequirement.percent !== null ||
    eisRequirement.sum !== null ||
    Boolean(eisRequirement.responsibility);
  const showEisSmp = eisSmpRows.length > 0 || hasEisRequirement;

  // Требование задаётся служебной запиской; если её нет, процент берём из
  // сведений ЕИС — иначе объём не считается, хотя в карточке контракта он есть
  const ownPercent =
    Number(smpRequiredPercent ?? 0) > 0 ? smpRequiredPercent : undefined;
  const effectivePercent = ownPercent ?? eisRequirement.percent ?? undefined;

  // Объём: требуемый, факт, прогресс. Факт берём из ручных записей, а если их
  // нет — из субдоговоров карточки ЕИС, чтобы прогресс не показывал ноль
  const eisActual = eisTotal > 0 ? eisTotal : undefined;
  const usesEisActual = records.length === 0 && eisTotal > 0;
  const volume = useMemo(
    () => computeSmpVolume(records, contractPrice, effectivePercent, eisActual),
    [records, contractPrice, effectivePercent, eisActual],
  );

  // Источники факта: оплаты подрядчика субподрядчикам, а пока платёжек нет —
  // суммы принятых договоров. Подпись под прогресс-баром показывает, что
  // именно учтено, чтобы цифра не выглядела взятой из ниоткуда
  const volumeSources = useMemo(() => smpVolumeSources(records), [records]);

  // Дедлайны: подрядчик + заказчик
  const deadlines = useMemo(() => computeSmpDeadlines(records), [records]);

  // Процента из служебки нет — объём не считается: при required = 0 формула
  // даёт ложное «объём привлечённых СМП закрыт полностью»
  const hasRequirement = volume.required > 0;

  // Максимальная просрочка подрядчика (для неустойки)
  const maxOverdueDays = useMemo(
    () =>
      deadlines.supplier.reduce(
        (max, d) => Math.max(max, d.overdueBusinessDays),
        0,
      ),
    [deadlines.supplier],
  );

  // Авто-неустойка
  const penaltyResult = useMemo(
    () => computeSmpPenalty(volume.shortfall, maxOverdueDays),
    [volume.shortfall, maxOverdueDays],
  );

  // КС-уведомление: сотрудник, вносящий сведения о СМП, видит нарушение
  // первым — предмет и существо подставляются из посчитанного объёма и
  // просрочки, чтобы не перепечатывать цифры руками
  const [noticeOpen, setNoticeOpen] = useState(false);
  const noticeDefaults = useMemo(() => {
    const money = (value: number) => value.toLocaleString("ru-RU");
    const amount =
      penaltyResult && penaltyResult.amount > 0
        ? String(penaltyResult.amount)
        : "";

    if (volume.shortfall > 0) {
      return {
        subject: "smpVolume" as const,
        essence: `Требуемый объём привлечения СМП/СОНКО — ${money(
          volume.required,
        )} ₽, подтверждённый объём — ${money(
          volume.actual,
        )} ₽; недобрано ${money(volume.shortfall)} ₽ (исполнение ${
          volume.progress
        }%).`,
        amount,
      };
    }

    if (maxOverdueDays > 0) {
      return {
        subject: "smpLate" as const,
        essence: `Сведения о привлечении СМП/СОНКО представлены с просрочкой: максимальная просрочка по сведениям контракта — ${maxOverdueDays} раб. дн.`,
        amount,
      };
    }

    return { subject: "smpVolume" as const, essence: "", amount: "" };
  }, [volume, maxOverdueDays, penaltyResult]);

  // ─── Действия ────────────────────────────────────────────────────────────

  function handleCreate() {
    setShowForm(true);
    setEisDraft(null);
    setChildDraft(null);
    setEisQueued(null);
  }

  /**
   * Новый документ по договору субподрядчика: акт приёмки или платёжное
   * поручение. Договор-основание и реквизиты субподрядчика подставлены, чтобы
   * документ сразу встал под нужную строку, а оплата попала в фактическое
   * привлечение СМП.
   */
  function handleCreateChild(subContract: ContractSmpRecord) {
    if (subContract.id == null) return;

    const draft = emptyContractSmpRecord("", contractId);
    draft.documentType = "acceptance";
    draft.subContractRecordId = subContract.id;
    draft.supplierName = subContract.supplierName;
    draft.supplierInn = subContract.supplierInn ?? "";
    draft.supplierKpp = subContract.supplierKpp ?? "";
    draft.isSmpSubject = subContract.isSmpSubject;
    draft.comment = `Документ по договору № ${subContract.documentNumber} от ${subContract.documentDate}.`;

    setChildDraft(draft);
    setEisDraft(null);
    setEditing(null);
    setShowForm(false);
    setEisQueued(null);
  }

  function handleCancel() {
    setShowForm(false);
    setEditing(null);
    setEisDraft(null);
    setChildDraft(null);
  }

  function handleSave(data: ContractSmpRecord) {
    if (editing && editing.id != null) {
      updateRecord.mutate({ id: editing.id, ...data });
    } else {
      // Запись, заведённая из строки ЕИС, сразу становится пакетом сведений:
      // реквизиты человек уже подтвердил в форме, второй кнопки «выгрузить»
      // не нужно
      const fromEis = eisDraft !== null;
      createRecord.mutate(data, {
        onSuccess: (created) => {
          if (fromEis) queueEisPackage(created);
        },
      });
    }
    setShowForm(false);
    setEditing(null);
    setEisDraft(null);
    setChildDraft(null);
  }

  /**
   * Черновик записи из строки ЕИС.
   *
   * Реквизиты субдоговора переносим один к одному: номер, дата, сумма, ОКПД2,
   * предмет и субподрядчик. Признак субъекта МСП берём из кода статуса ЕИС
   * (30 — СМП, 40 — СОНО), а не «по умолчанию»: от него зависит, закроет ли
   * договор требуемый объём привлечения.
   */
  function openEisDraft(row: ContractCardSmpSubcontractor) {
    const draft = emptyContractSmpRecord("", contractId);
    draft.documentType = "subContract";
    draft.documentNumber = row.ContractNumber ?? "";
    draft.documentDate = isoDate(row.ContractDate) || draft.documentDate;
    draft.amount = row.ContractSum !== null ? String(row.ContractSum) : "";
    draft.okpd2Code = row.Okpd2Code ?? "";
    draft.subject = row.ContractSubject ?? "";
    draft.supplierName = row.Name ?? "";
    draft.supplierInn = row.Inn ?? "";
    draft.supplierKpp = row.Kpp ?? "";
    draft.isSmpSubject = row.StatusCode === "30" || row.StatusCode === "40";
    draft.comment =
      "Реквизиты подставлены из карточки ЕИС. Проверьте состав сведений перед выгрузкой в ЕИС.";
    setEisDraft(draft);
    setEditing(null);
    setShowForm(false);
    setEisQueued(null);
  }

  /**
   * Постановка сведений в очередь ЕИС — пакет `SmpAttraction` со ссылкой на
   * запись реестра СМП (`SmpReport`). XML собирает шлюз: фронт передаёт только
   * адрес записи, так же как для актов приёмки и расторжений.
   */
  function queueEisPackage(record: ContractSmpRecord) {
    if (record.id == null) return;

    if (!canQueueEis) {
      setEisQueued({
        ok: false,
        text: "Запись сохранена, но пакет в ЕИС не создан: в карточке нет реестрового номера контракта и ИКЗ из 36 разрядов. Их присваивает портал — без них шлюз не поймёт, к какой записи реестра относятся сведения.",
      });
      return;
    }

    createEisPackage.mutate(
      {
        documentType: "SmpAttraction",
        contractEisNumber: eisContractNumber,
        ikz: eisIkz,
        source: {
          documentKind: "SmpReport",
          documentId: String(record.id),
          documentNumber: record.documentNumber || undefined,
        },
      },
      {
        onSuccess: (pkg) =>
          setEisQueued({
            ok: true,
            text: `Пакет «Привлечение СМП» создан: ${eisPackageStatusLabels[pkg.status]}. Подпишите и отправьте его в разделе «Пакеты сведений» — до отправки сведения в ЕИС не считаются опубликованными.`,
          }),
        onError: (error) =>
          setEisQueued({ ok: false, text: describeEisError(error) }),
      },
    );
  }

  function handleDelete(id: string | number) {
    if (!confirm("Удалить запись?")) return;
    deleteRecord.mutate(id);
  }

  function handleStatusChange(
    id: string | number,
    status: ContractSmpRecord["status"],
  ) {
    updateRecord.mutate({ id, status });
  }

  function handleAccruePenalty() {
    if (!penaltyResult || penaltyResult.amount <= 0) return;
    if (!confirm(`Начислить неустойку ${penaltyResult.amount} ₽?`)) return;

    createPenalty.mutate({
      contractId,
      type: "other",
      amount: penaltyResult.penalty.amount,
      status: "accrued",
      detectedDate: localIsoDate(),
      description: penaltyResult.penalty.description,
      reference: penaltyResult.penalty.reference,
    });
  }

  // ─── Требование о привлечении СМП (процент и основание) ──────────────────

  function openRequirement() {
    setPercentDraft(String(smpRequiredPercent ?? ""));
    setNoteDraft(subcontractingSmpNoteNumber ?? "");
    setRequirementError("");
    setRequirementOpen(true);
  }

  function saveRequirement() {
    if (!contractId) return;

    const percent = percentDraft.trim().replace(",", ".");
    const percentValid =
      percent === "" ||
      (/^\d{1,3}(\.\d{1,2})?$/.test(percent) &&
        Number(percent) >= 0 &&
        Number(percent) <= 100);
    if (!percentValid) {
      setRequirementError("Процент от 0 до 100");
      return;
    }

    updateContract.mutate(
      {
        id: contractId,
        smpRequiredPercent: percent,
        subcontractingSmpNoteNumber: noteDraft.trim(),
      },
      { onSuccess: () => setRequirementOpen(false) },
    );
  }

  // ─── Подтверждение достоверности (п. 6 ПП РФ N 1466) ──────────────────────

  const { employee, myRole } = useMyContractRole();
  const logSignature = useLogSignatureEvent();

  const signerLabel = useMemo(() => {
    const human = employee?.employee;
    if (!human) return "";
    // Подпись вида «Фамилия И. О., должность» — как в бумажных подтверждениях
    const shortName = fullName(human)
      .split(" ")
      .filter(Boolean)
      .map((word, index) => (index === 0 ? word : `${word[0]}.`))
      .join(" ");
    return [shortName, myRole?.role ?? ""].filter(Boolean).join(", ");
  }, [employee, myRole, fullName]);

  const nowLocalDateTime = () => {
    const d = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Какое действие подписываем: модалка ЭП открывается поверх таблицы
  const [signing, setSigning] = useState<{
    record: ContractSmpRecord;
    action: SignatureEventAction;
  } | null>(null);

  // Подписываем не молча: сначала журнал (кто, когда, каким сертификатом),
  // потом уже правка записи. Отказ по чужому ИНН остаётся в журнале —
  // ровно то, что спрашивает проверка
  function handleSigned(event: SignatureEvent) {
    if (!signing) return;
    const { record, action } = signing;

    logSignature.mutate(event);

    const stamp = [
      "ЭП",
      event.certificateOwner,
      event.certificateSerial
        ? `срез ${event.certificateSerial.slice(0, 8)}…`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");

    if (action === "smp_supplier_confirm") {
      updateRecord.mutate({
        id: record.id!,
        supplierConfirmedAt: nowLocalDateTime(),
        supplierConfirmedBy: signerLabel,
        supplierConfirmedDocument: stamp,
      });
    } else {
      updateRecord.mutate({
        id: record.id!,
        customerConfirmedAt: nowLocalDateTime(),
        customerConfirmedBy: signerLabel,
        customerConfirmedDocument: stamp,
        status: record.status === "submitted" ? "accepted" : record.status,
      });
    }

    setSigning(null);
  }

  function handleSupplierConfirm(record: ContractSmpRecord) {
    if (record.supplierConfirmedAt) return;
    setSigning({ record, action: "smp_supplier_confirm" });
  }

  function handleCustomerConfirm(record: ContractSmpRecord) {
    if (record.customerConfirmedAt) return;
    // Приёмка субподрядчика, которого нет в реестре МСП, закрыла бы объём
    // привлечения незаконно (ч. 6 ст. 30 44-ФЗ) — кнопка уже заблокирована,
    // проверка страхует от устаревшего рендера
    if (checks.get(String(record.id))?.acceptanceBlocked) return;
    setSigning({ record, action: "smp_customer_confirm" });
  }

  // ─── Подпись прогресс-бара ──────────────────────────────────────────────

  const progressColor =
    volume.progress >= 100
      ? "var(--state-success)"
      : volume.progress >= 50
        ? "var(--state-warning)"
        : "var(--state-danger)";

  return (
    <section className={block()}>
      <h4 className={styles.subTitle}>
        Привлечение СМП/СОНКО (ч. 5 ст. 30 44-ФЗ)
      </h4>

      {/* Требование: процент из служебки и её номер. У контрактов из ЕИС этих
          данных нет — их можно задать здесь, остальное считается само */}
      {requirementOpen ? (
        <form
          className={block("requirement")}
          onSubmit={(event) => {
            event.preventDefault();
            saveRequirement();
          }}
        >
          <div className={block("requirementField")}>
            <label
              className={block("requirementLabel")}
              htmlFor="smp-required-percent"
            >
              Требуемый объём, % от цены контракта
            </label>
            <input
              id="smp-required-percent"
              className={block("requirementInput")}
              value={percentDraft}
              onChange={(event) => setPercentDraft(event.target.value)}
              placeholder="10"
              inputMode="decimal"
            />
          </div>

          <div className={block("requirementField")}>
            <label
              className={block("requirementLabel")}
              htmlFor="smp-note-number"
            >
              Номер служебной записки (основание)
            </label>
            <input
              id="smp-note-number"
              className={block("requirementInput")}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="например 12"
            />
          </div>

          {requirementError && (
            <span className={block("requirementError")}>{requirementError}</span>
          )}

          <div className={block("requirementActions")}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={updateContract.isPending}
            >
              {updateContract.isPending ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              className={styles.btnSmall}
              onClick={() => setRequirementOpen(false)}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <p className={block("note")}>
          <span>
            {hasRequirement
              ? `Требуемый объём: ${effectivePercent}% от цены контракта${
                  ownPercent ? "" : " (по сведениям ЕИС)"
                }`
              : "Требование о привлечении СМП не задано — объём не рассчитывается"}
            {subcontractingSmpNoteNumber &&
              ` · служебная записка № ${subcontractingSmpNoteNumber}`}
          </span>
          <button
            type="button"
            className={block("requirementBtn")}
            onClick={openRequirement}
          >
            {ownPercent || subcontractingSmpNoteNumber
              ? "Изменить требование"
              : "Указать требование"}
          </button>
        </p>
      )}

      {/* Прогресс-бар объёма */}
      <div className={block("volume")}>
        <div className={block("volume-header")}>
          <span>Требуемый объём:</span>
          <strong>
            {hasRequirement
              ? `${volume.required.toLocaleString("ru-RU")} ₽`
              : "не задан"}
          </strong>
        </div>
        <div className={block("volume-header")}>
          <span>
            {usesEisActual
              ? "Факт (субдоговоры из карточки ЕИС):"
              : volumeSources.basis === "payments"
                ? "Факт (оплаты по договорам с СМП):"
                : "Факт (принятые договоры с СМП, оплат пока нет):"}
          </span>
          <strong style={{ color: progressColor }}>
            {volume.actual.toLocaleString("ru-RU")} ₽
          </strong>
        </div>
        <div className={block("progress-bar")}>
          <div
            className={block("progress-fill")}
            style={{
              width: `${Math.min(volume.progress, 100)}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
        <div className={block("volume-footer")}>
          {/* Расшифровка факта: видно, что именно учтено, — иначе цифра
              «оплаты» выглядела бы взятой из ниоткуда */}
          {!usesEisActual && volumeSources.basis === "payments" && (
            <span className={block("rowSummary")}>
              Договоров с СМП на{" "}
              {volumeSources.contracted.toLocaleString("ru-RU")} ₽ · принято по
              актам {volumeSources.accepted.toLocaleString("ru-RU")} ₽. В факт
              идут оплаты подрядчика субподрядчикам.
            </span>
          )}
          {!hasRequirement ? (
            <span>
              Процент не задан — объём не рассчитывается. Укажите его в блоке
              требования выше: прогресс-бар, недобор и неустойка появятся
              автоматически.
            </span>
          ) : volume.isComplete ? (
            <span style={{ color: "var(--state-success)" }}>
              ✓ Объём привлечённых СМП закрыт полностью
            </span>
          ) : (
            <>
              <span>
                Недобрано:{" "}
                <strong style={{ color: "var(--state-danger)" }}>
                  {volume.shortfall.toLocaleString("ru-RU")} ₽
                </strong>{" "}
                ({volume.progress.toFixed(1)}%)
              </span>
              {penaltyResult && penaltyResult.amount > 0 && (
                <span>
                  {" "}
                  · Неустойка:{" "}
                  <strong style={{ color: "var(--state-danger)" }}>
                    {penaltyResult.amount.toLocaleString("ru-RU")} ₽
                  </strong>{" "}
                  ({maxOverdueDays} раб. дн.)
                </span>
              )}
            </>
          )}
        </div>
        {!volume.isComplete && penaltyResult && (
          <button
            className={block("btnPenalty")}
            onClick={handleAccruePenalty}
            disabled={createPenalty.isPending}
          >
            {createPenalty.isPending ? "Начисление..." : "Начислить неустойку"}
          </button>
        )}
      </div>

      {/* Дедлайны подрядчика и заказчика */}
      {(deadlines.supplier.length > 0 || deadlines.customer.length > 0) && (
        <div className={block("deadlines")}>
          <h5 className={block("deadlinesTitle")}>
            Сроки по типовым условиям (ПП РФ от 23.12.2016 N 1466)
          </h5>

          {/* Контур подрядчика */}
          {deadlines.supplier.length > 0 && (
            <div className={block("deadlinesTable")}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Документ</th>
                    <th>Требование</th>
                    <th>Отсчёт от</th>
                    <th>Срок (раб. дн.)</th>
                    <th>Статус</th>
                    <th>Превышение</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.supplier.map((item) => (
                    <tr
                      key={item.key}
                      className={
                        item.status === "overdue" ? styles.rowDanger : ""
                      }
                    >
                      <td className={styles.reference}>
                        {item.documentLabel}
                        {item.supplierName && (
                          <>
                            <br />
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {item.supplierName}
                            </span>
                          </>
                        )}
                      </td>
                      <td>
                        {item.title}
                        <br />
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {item.basis}
                        </span>
                      </td>
                      <td>{item.startDate}</td>
                      <td>
                        {item.dueDate}
                        <br />
                        <span style={{ fontSize: "11px" }}>
                          ({item.workingDays} раб. дн.)
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            color:
                              item.status === "met"
                                ? "var(--state-success)"
                                : item.status === "overdue"
                                  ? "var(--state-danger)"
                                  : "var(--state-warning)",
                            fontWeight:
                              item.status === "overdue" ? "700" : "400",
                          }}
                        >
                          {smpDeadlineStatusLabels[item.status]}
                        </span>
                      </td>
                      <td>
                        {item.overdueBusinessDays > 0 && (
                          <span
                            style={{
                              color: "var(--state-danger)",
                              fontWeight: "600",
                            }}
                          >
                            {item.overdueBusinessDays} раб. дн.
                          </span>
                        )}
                        {item.status === "pending" && (
                          <span style={{ fontSize: "11px" }}>
                            {item.remainingBusinessDays > 0
                              ? `${item.remainingBusinessDays} дн. осталось`
                              : "сегодня"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Контур заказчика */}
          {deadlines.customer.length > 0 && (
            <div className={block("deadlinesTable")}>
              <h6 className={block("customerDeadlineTitle")}>
                Контур заказчика (ч. 3 ст. 103 44-ФЗ)
              </h6>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Сведения</th>
                    <th>Получены</th>
                    <th>Срок в ЕИС</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.customer.map((item) => (
                    <tr
                      key={item.key}
                      className={
                        item.status === "overdue" ? styles.rowDanger : ""
                      }
                    >
                      <td className={styles.reference}>{item.documentLabel}</td>
                      <td>{item.startDate}</td>
                      <td>{item.dueDate}</td>
                      <td>
                        <span
                          style={{
                            color:
                              item.status === "met"
                                ? "var(--state-success)"
                                : "var(--state-danger)",
                            fontWeight:
                              item.status === "overdue" ? "700" : "400",
                          }}
                        >
                          {item.status === "met"
                            ? "Выгружено в ЕИС"
                            : item.status === "overdue"
                              ? `Просрочка ${item.overdueBusinessDays} раб. дн.`
                              : "Ожидается"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Подтаблица контракта из выгрузки ЕИС: сведения о субподряде лежат
          в XML контракта, поэтому появляются у каждого выгруженного контракта,
          а не только там, где заводили записи вручную */}
      {showEisSmp && (
        <div className={block("records")}>
          <h5 className={block("recordsTitle")}>
            {eisSmpRows.length > 0
              ? `По сведениям карточки ЕИС (${eisSmpRows.length})`
              : "Условие привлечения СМП по данным ЕИС"}
          </h5>
          <p className={block("hint")}>
            {eisRequirement.percent !== null &&
              `Требуемый объём по сведениям ЕИС: ${eisRequirement.percent}%`}
            {eisRequirement.sum !== null &&
              ` (${eisRequirement.sum.toLocaleString("ru-RU")} ₽)`}
            {hasEisRequirement ? " · " : ""}
            {eisSmpRows.length > 0
              ? `Факт по субдоговорам: ${eisTotal.toLocaleString("ru-RU")} ₽`
              : "Сведения о привлечённых субподрядчиках заказчик в ЕИС ещё не опубликовал"}
          </p>
          {eisRequirement.responsibility && (
            <p className={block("hint")}>{eisRequirement.responsibility}</p>
          )}
          {eisSmpRows.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Субподрядчик</th>
                  <th>Статус</th>
                  <th>Субдоговор</th>
                  <th>Сумма, ₽</th>
                  <th>ОКПД2</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {eisSmpRows.map((row) => (
                  <tr
                    key={`${row.Inn}|${row.ContractNumber ?? ""}`}
                    className={block("eis-row")}
                    onClick={() => openEisDraft(row)}
                    title="Завести сведения о привлечении по этому субподрядчику: реквизиты подставятся в форму"
                  >
                    <td>
                      {row.Name ?? "—"}
                      <br />
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        ИНН {row.Inn}
                        {row.Kpp ? ` / КПП ${row.Kpp}` : ""}
                      </span>
                    </td>
                    <td>
                      {row.StatusCode === "30"
                        ? "СМП"
                        : row.StatusCode === "40"
                          ? "СОНО"
                          : (row.StatusName ?? "—")}
                    </td>
                    <td>
                      {row.ContractNumber ? `№ ${row.ContractNumber}` : "—"}
                      {row.ContractDate
                        ? ` от ${formatDate(row.ContractDate)}`
                        : ""}
                      {row.ContractSubject && (
                        <>
                          <br />
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {row.ContractSubject}
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      {row.ContractSum !== null
                        ? row.ContractSum.toLocaleString("ru-RU")
                        : "—"}
                    </td>
                    <td>{row.Okpd2Code ?? "—"}</td>
                    <td>
                      {registeredEisKeys.has(
                        `${row.Inn ?? ""}|${row.ContractNumber ?? ""}`,
                      ) ? (
                        <span className={block("hint")}>заведено</span>
                      ) : (
                        <button
                          className={styles.btnSmall}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEisDraft(row);
                          }}
                          title="Открыть форму с реквизитами из карточки ЕИС: после сохранения сведения встанут в очередь на отправку в ЕИС"
                        >
                          Завести
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Таблица записей: пустое состояние объясняет, откуда берутся сведения */}
      {records.length === 0 && !showEisSmp && (
        <p className={block("empty")}>
          {projection
            ? "В выгруженном XML контракта сведений о привлечении СМП нет: субподрядчиков не привлекали либо сведения не опубликованы в ЕИС. Записи можно завести вручную — объём, сроки и неустойка посчитаются сами."
            : "Карточка ЕИС по этому контракту ещё не выгружена, поэтому подтаблицы СМП нет. Её наполнит ближайшая выгрузка воркера; пока сведения можно завести вручную."}
        </p>
      )}

      {records.length > 0 && (
        <div className={block("records")}>
          <h5 className={block("recordsTitle")}>
            Сведения о привлечении ({records.length})
          </h5>
          <p className={block("hint")}>
            Под каждым договором с субподрядчиком — присланные к нему акты
            приёмки и платёжные поручения. Фактическое привлечение СМП считается
            по суммам оплат: договор без оплаты объём ещё не закрывает.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Тип</th>
                <th>Номер / дата</th>
                <th>Субподрядчик</th>
                <th>Сумма, ₽</th>
                <th>СМП</th>
                <th>Сроки</th>
                <th>Получено</th>
                <th>Статус</th>
                <th>Подтверждения (п. 6 ПП 1466)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(
                ({
                  record,
                  check,
                  nested,
                  paymentAmount,
                  acceptanceAmount,
                  documentCount,
                }) => (
                  <tr
                    key={record.id}
                    className={nested ? block("rowChild") : undefined}
                  >
                    <td>
                      {nested && (
                        <span className={block("childMark")} aria-hidden="true">
                          └{" "}
                        </span>
                      )}
                      {contractSmpDocumentTypeLabels[record.documentType]}
                    </td>
                    <td>
                      № {record.documentNumber} от {record.documentDate}
                    </td>
                    <td>
                      {record.supplierName}
                      {record.supplierInn && (
                        <>
                          <br />
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            ИНН {record.supplierInn}
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      {record.amount
                        ? Number(record.amount).toLocaleString("ru-RU")
                        : "—"}
                      {/* Сводка по договору: сколько по нему оплачено и принято по
                          актам — из оплат и складывается фактическое привлечение */}
                      {documentCount !== undefined && documentCount > 0 && (
                        <span className={block("rowSummary")}>
                          Оплачено:{" "}
                          {(paymentAmount ?? 0).toLocaleString("ru-RU")} ₽
                          <br />
                          По актам:{" "}
                          {(acceptanceAmount ?? 0).toLocaleString("ru-RU")} ₽
                          <br />
                          Документов: {documentCount}
                        </span>
                      )}
                    </td>
                    <td className={block("smp-cell")}>
                      {record.isSmpSubject ? "✓" : "—"}
                      {/* Вердикт реестра: сверка идёт по ИНН, а не по названию */}
                      {check?.registry.applicable && (
                        <span
                          className={block("registry", [
                            check.registry.status === "in_registry"
                              ? "ok"
                              : check.registry.status === "unknown" ||
                                  check.registry.status === "unchecked"
                                ? "unknown"
                                : check.blocking.some(
                                      (issue) => issue.code === "registry",
                                    )
                                  ? "error"
                                  : "warn",
                          ])}
                          title={check.registry.text}
                        >
                          {check.registry.status === "in_registry"
                            ? "в реестре МСП"
                            : check.registry.status === "unknown"
                              ? "ИНН не указан"
                              : check.registry.status === "unchecked"
                                ? "не проверено"
                                : check.registry.status === "excluded"
                                  ? "исключён из МСП"
                                  : "нет в реестре МСП"}
                        </span>
                      )}
                    </td>
                    <td>
                      {/* Сроки ПП 1466 по этой записи: ближайший или нарушенный */}
                      {check?.deadline ? (
                        <>
                          <span
                            className={
                              check.deadline.status === "overdue"
                                ? styles.projectionLate
                                : check.deadline.status === "met"
                                  ? styles.projectionOk
                                  : styles.projectionNote
                            }
                            title={check.deadlineText}
                          >
                            {smpDeadlineShort(check.deadline)}
                          </span>
                          <br />
                          <span
                            className={styles.projectionNote}
                            title={`${check.deadline.title}: ${check.deadline.basis}`}
                          >
                            до {formatDate(check.deadline.dueDate)} ·{" "}
                            {check.deadline.clause}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{record.receivedAt?.slice(0, 10)}</td>
                    <td>
                      <Select
                        className={block("statusSelect")}
                        value={record.status}
                        onChange={(event) =>
                          handleStatusChange(
                            record.id!,
                            event.target.value as ContractSmpRecord["status"],
                          )
                        }
                      >
                        {Object.entries(contractSmpStatusLabels).map(
                          ([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ),
                        )}
                      </Select>
                      {/* Сводка проверки: причина видна по наведению, строка не
                          обрастает колонками */}
                      {check && smpCheckTone(check) !== "ok" && (
                        <span
                          className={block("checkBadge", [smpCheckTone(check)])}
                          title={smpCheckIssuesText(check)}
                        >
                          {smpCheckBadge(check)}
                        </span>
                      )}
                    </td>
                    <td className={block("confirm-cell")}>
                      <div className={block("confirm-row")}>
                        {record.supplierConfirmedAt ? (
                          <span className={block("confirm-done")}>
                            Подрядчик: {record.supplierConfirmedAt.slice(0, 10)}
                            {record.supplierConfirmedBy && (
                              <>
                                <br />
                                <span>{record.supplierConfirmedBy}</span>
                              </>
                            )}
                            {record.supplierConfirmedDocument && (
                              <>
                                <br />
                                <span className={block("confirm-doc")}>
                                  {record.supplierConfirmedDocument}
                                </span>
                              </>
                            )}
                          </span>
                        ) : (
                          <button
                            className={styles.btnSmall}
                            onClick={() => handleSupplierConfirm(record)}
                            disabled={updateRecord.isPending}
                            title="Действие подрядчика «подтверждаю достоверность» (п. 6 ПП РФ N 1466). В демо его выполняет заказчик — вход подрядчика по ссылке отложен (Tasks 9, п. 2, п/п 3)"
                          >
                            Подтвердить достоверность
                          </button>
                        )}
                      </div>
                      <div className={block("confirm-row")}>
                        {record.customerConfirmedAt ? (
                          <span className={block("confirm-done")}>
                            Заказчик: {record.customerConfirmedAt.slice(0, 10)}
                            {record.customerConfirmedBy && (
                              <>
                                <br />
                                <span>{record.customerConfirmedBy}</span>
                              </>
                            )}
                            {record.customerConfirmedDocument && (
                              <>
                                <br />
                                <span className={block("confirm-doc")}>
                                  {record.customerConfirmedDocument}
                                </span>
                              </>
                            )}
                          </span>
                        ) : (
                          <button
                            className={styles.btnSmall}
                            onClick={() => handleCustomerConfirm(record)}
                            disabled={
                              updateRecord.isPending ||
                              record.status !== "submitted" ||
                              Boolean(check?.acceptanceBlocked)
                            }
                            title={
                              check?.acceptanceBlocked
                                ? `${check.registry.text}. Приёмка заблокирована: договор с таким субподрядчиком не закроет объём привлечения СМП (ч. 6 ст. 30 44-ФЗ)`
                                : "Действие заказчика «подтверждаю достоверность принятых сведений» (п. 6 ПП РФ N 1466). Доступно по присланным подрядчиком сведениям"
                            }
                          >
                            Принять и подтвердить
                          </button>
                        )}
                        {check?.acceptanceBlocked &&
                          !record.customerConfirmedAt && (
                            <span className={styles.cellDanger}>
                              Реестр МСП не подтверждает субподрядчика
                            </span>
                          )}
                      </div>
                    </td>
                    <td>
                      {/* Документы к договору заводятся из его строки: иначе акт
                          и платёжка остаются без договора-основания */}
                      {record.documentType === "subContract" && (
                        <button
                          className={styles.btnSmall}
                          onClick={() => handleCreateChild(record)}
                          title="Добавить акт приёмки или платёжное поручение по этому договору"
                        >
                          + документ
                        </button>
                      )}
                      <button
                        className={styles.btnSmall}
                        onClick={() => {
                          setEisDraft(null);
                          setChildDraft(null);
                          setEditing(record);
                        }}
                      >
                        Ред
                      </button>
                      <button
                        className={`${styles.btnSmall} ${styles.btnDanger}`}
                        onClick={() => handleDelete(record.id!)}
                      >
                        Удал
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Кнопка загрузки */}
      <div className={block("actions")}>
        <button className={styles.btnPrimary} onClick={handleCreate}>
          + Загрузить сведения
        </button>
        {/* Сверка заявленных СМП с реестром: ответ сервиса ФНС сохраняется в
            справочнике и сразу меняет вердикты в таблице и приёмке */}
        {smpInns.length > 0 && (
          <button
            type="button"
            className={styles.btnSmall}
            onClick={checkRecordInns}
            disabled={innCheck.isPending}
            title="Спросить сервис ФНС по ИНН субподрядчиков и сохранить ответ в справочнике"
          >
            {innCheck.isPending
              ? "Проверяем в реестре МСП…"
              : `Проверить ИНН в реестре МСП (${smpInns.length})`}
          </button>
        )}
        {/* Нарушение по СМП видит тот, кто вносит сведения: уведомление
            собирает предмет нарушения и уходит ответственному в КС */}
        <button
          type="button"
          className={styles.btnSmall}
          onClick={() => setNoticeOpen(true)}
          title="Сформировать КС-уведомление о ненадлежащем исполнении по СМП: предмет нарушения и суммы подставятся из расчёта, задача уйдёт ответственному в контрактной службе"
        >
          КС-уведомление о нарушении
        </button>
        {records.length > 0 && (
          <span className={block("hint")}>
            Требуемый объём привлечённых СМП:{" "}
            {volume.required.toLocaleString("ru-RU")} ₽{" · "}
            Факт: {volume.actual.toLocaleString("ru-RU")} ₽{" · "}
            Недобрано: {volume.shortfall.toLocaleString("ru-RU")} ₽
          </span>
        )}
      </div>

      {/* Итог сверки ИНН: без вердикта по ИНН объём привлечения не подтверждён */}
      {innCheckMessage && (
        <p className={block("hint")} role="status">
          {innCheckMessage}
        </p>
      )}

      {/* Итог постановки в очередь ЕИС: отказ шлюза надо прочитать, поэтому
          строка под таблицей, а не модальное окно */}
      {eisQueued && (
        <p
          className={block("hint")}
          style={{ color: eisQueued.ok ? "var(--state-success)" : "var(--state-danger)" }}
        >
          {eisQueued.text}{" "}
          {eisQueued.ok && (
            <Link
              className={styles.projectionLink}
              to={`/eis/packages?contractId=${String(contractId)}&documentType=SmpAttraction`}
            >
              Открыть пакеты СМП
            </Link>
          )}
        </p>
      )}

      {/* Форма создания / редактирования. Черновик из строки ЕИС и документ,
          созданный из строки договора, открываются тем же окном: это создание
          записи, а не правка существующей. Условие включает `editing`, иначе
          кнопка «Ред» только заполняла бы состояние, а окно не открывалось */}
      {(showForm || eisDraft || childDraft || editing !== null) && (
        <ContractSmpRecordForm
          contractId={contractId}
          record={editing ?? null}
          draft={eisDraft ?? childDraft}
          draftTitle={childDraft ? "Документ по договору с субподрядчиком" : undefined}
          records={records}
          onClose={handleCancel}
          onSave={handleSave}
        />
      )}

      {/* Модалка подписания ЭП (Tasks 9, п. 1) */}
      {signing && (
        <EdsSignModal
          action={signing.action}
          documentLabel={`${contractSmpDocumentTypeLabels[signing.record.documentType]} № ${signing.record.documentNumber} от ${signing.record.documentDate} · ${signing.record.supplierName}`}
          entityType="contractSmpRecord"
          entityId={signing.record.id!}
          onClose={() => setSigning(null)}
          onSigned={handleSigned}
        />
      )}

      {/* КС-уведомление о ненадлежащем исполнении по сведениям о СМП */}
      {noticeOpen && (
        <ContractViolationNotice
          contractId={contractId}
          contractNumber={contractNumber || eisContractNumber}
          contractSubject={contractSubject}
          ikz={ikz || eisIkz}
          source="smp"
          defaultSubject={noticeDefaults.subject}
          defaultEssence={noticeDefaults.essence}
          defaultAmount={noticeDefaults.amount}
          onClose={() => setNoticeOpen(false)}
        />
      )}
    </section>
  );
}

// ─── Форма создания / редактирования записи ────────────────────────────────

interface FormProps {
  contractId: string | number;
  record: ContractSmpRecord | null;
  /**
   * Черновик из строки ЕИС: реквизиты уже подставлены, но записи в реестре
   * СМП ещё нет. От `record` отличается тем, что сохранение создаёт запись, а
   * не правит существующую.
   */
  draft?: ContractSmpRecord | null;
  /**
   * Заголовок окна для черновика. Документ, созданный из строки договора, —
   * тоже черновик, но «сведения из карточки ЕИС» здесь были бы неправдой.
   */
  draftTitle?: string;
  /**
   * Все записи контракта: по ним видно, представлялся ли такой ИНН ранее и
   * какие сроки ПП 1466 уже действуют. Без них проверка в форме невозможна.
   */
  records: ContractSmpRecord[];
  onClose: () => void;
  onSave: (data: ContractSmpRecord) => void;
}

function ContractSmpRecordForm({
  contractId,
  record,
  draft = null,
  draftTitle,
  records,
  onClose,
  onSave,
}: FormProps) {
  const { bem } = useUtils();
  const block = bem(styles, "smp-form");
  const isEditing = record !== null;

  const methods = useForm<ContractSmpRecord>({
    resolver: zodResolver(ContractSmpRecordSchema) as any,
    defaultValues: record ?? draft ?? emptyContractSmpRecord("", contractId),
  });

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = methods;

  const priceType = useWatch({ control: methods.control, name: "priceType" });
  const documentType = useWatch({
    control: methods.control,
    name: "documentType",
  });

  // Договоры, к которым можно приложить акт или платёжку: список тот же, что в
  // таблице, поэтому документ сразу встанет под нужным субподрядчиком
  const subContracts = useMemo(
    () => smpSubContracts(records),
    [records],
  );
  const basisField = register("subContractRecordId");

  /**
   * Договор-основание выбран: реквизиты субподрядчика принадлежат договору, а
   * не документу, поэтому подставляем их сюда — акт и платёжка не могут
   * относиться к другому лицу.
   */
  function applyBasis(value: string) {
    const parent = subContracts.find((item) => String(item.id) === value);
    if (!parent) return;

    setValue("supplierName", parent.supplierName, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("supplierInn", parent.supplierInn ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("supplierKpp", parent.supplierKpp ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("isSmpSubject", parent.isSmpSubject, { shouldDirty: true });
    checkSupplierInn(parent.supplierInn);
  }

  // Живая проверка вводимых реквизитов: реестр МСП сверяется по ИНН, сроки
  // ПП 1466 считаются от дат записи. Ошибку видно до сохранения, а не в
  // таблице после него
  const { data: smpRegistry = [] } = useSmpRegistry();
  const watchedRecord = useWatch({
    control: methods.control,
  }) as Partial<ContractSmpRecord>;
  const liveCheck = smpRecordCheck(
    { ...emptyContractSmpRecord("", contractId), ...watchedRecord },
    records,
    smpRegistry,
  );

  // Точечная сверка ИНН: подрядчик вводит ИНН — система спрашивает сервис ФНС
  // и сразу показывает вердикт. Полная выгрузка реестра не нужна, ответ
  // сохраняется в справочнике и работает для приёмки и для КП
  const innCheck = useSmpInnCheck();
  const [innAnswer, setInnAnswer] = useState<SmpInnLookup | null>(null);
  const watchedInn = normalizeInn(watchedRecord.supplierInn);
  const supplierInnField = register("supplierInn");

  // Ответ показывается только для того ИНН, по которому он получен: правишь
  // ИНН — прежний вердикт исчезает сам, без побочного эффекта
  const shownInnAnswer = innAnswer?.inn === watchedInn ? innAnswer : null;

  const checkSupplierInn = (value?: string) => {
    const inn = normalizeInn(value ?? getValues("supplierInn"));
    if (inn.length !== 10 && inn.length !== 12) {
      setInnAnswer(null);
      return;
    }

    innCheck.mutate(inn, {
      onSuccess: ([answer]) => setInnAnswer(answer ?? null),
    });
  };

  const innAnswerTone =
    shownInnAnswer?.status === "in_registry"
      ? "ok"
      : shownInnAnswer?.status === "unavailable" ||
          shownInnAnswer?.status === "invalid"
        ? "warn"
        : "no";

  // Файл-основание: в базе остаётся только его имя, содержимое не читается
  const [sourceFile, setSourceFile] = useState<SourceFileFields | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Записи, приложенные к этому договору: акт и платёжка привязываются к нему
  const existingSourceName = record?.sourceFileName ?? "";

  const errorText = (path: string): string | undefined =>
    (errors as Record<string, { message?: string }>)?.[path]?.message;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fields = readSourceFileFields(file);
    setSourceFile(fields);
    setValue("sourceFileName", fields.fileName, { shouldDirty: true });

    // Подставляем только в пустые поля: то, что уже введено вручную, не трём —
    // извлечённое остаётся подсказкой, которую человек подтверждает сам
    if (fields.documentNumber && !getValues("documentNumber")) {
      setValue("documentNumber", fields.documentNumber, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    if (fields.documentDate && !getValues("documentDate")) {
      setValue("documentDate", fields.documentDate, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }

  function clearSourceFile() {
    setSourceFile(null);
    setValue("sourceFileName", "", { shouldDirty: true });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(data: ContractSmpRecord) {
    onSave(data);
  }

  // Пустой ИНН у новой записи — незаполненное поле, а не ошибка: не мигаем
  // красным, пока человек не ввёл ни одной цифры
  const registryReady =
    liveCheck.registry.applicable && liveCheck.registry.status !== "unknown";
  const liveIssues = [...liveCheck.blocking, ...liveCheck.warnings].filter(
    (issue) => registryReady || issue.code !== "registry",
  );
  const liveTone = smpCheckTone(liveCheck);
  const noticeClass =
    liveTone === "error"
      ? styles.xmlNotice_error
      : liveTone === "warning"
        ? styles.xmlNotice_warn
        : styles.xmlNotice_ok;
  const showNotice =
    registryReady || liveIssues.length > 0 || Boolean(liveCheck.deadlineText);

  return (
    <div className={block()} onClick={onClose}>
      <div className={block("window")} onClick={(e) => e.stopPropagation()}>
        <div className={block("head")}>
          <h3 className={block("title")}>
            {isEditing
              ? "Редактировать сведения"
              : draft
                ? (draftTitle ?? "Сведения из карточки ЕИС")
                : "Новые сведения о СМП"}
          </h3>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form className={block("form")} onSubmit={handleSubmit(onSubmit)}>
          <div className={block("grid")}>
            {/* Тип */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-doc-type">
                Тип документа
              </label>
              <Select
                id="smp-doc-type"
                className={block("select")}
                {...register("documentType")}
              >
                {Object.entries(contractSmpDocumentTypeLabels).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </div>

            {/* Договор-основание: акт и платёжка не существуют сами по себе —
                они всегда приложены к договору с субподрядчиком */}
            {documentType !== "subContract" && (
              <div className={block("field", ["wide"])}>
                <label className={block("label")} htmlFor="smp-basis">
                  Договор с субподрядчиком (основание)
                </label>
                <Select
                  id="smp-basis"
                  className={block("select")}
                  {...basisField}
                  onChange={(event) => {
                    void basisField.onChange(event);
                    applyBasis(event.target.value);
                  }}
                >
                  <option value="">— не указан —</option>
                  {subContracts.map((item) => (
                    <option key={String(item.id)} value={String(item.id)}>
                      № {item.documentNumber} от {item.documentDate} ·{" "}
                      {item.supplierName}
                    </option>
                  ))}
                </Select>
                <span className={block("hint")}>
                  {subContracts.length === 0
                    ? "Сначала заведите договор с субподрядчиком: без него акт и платёжка не встанут под субподрядчика и не попадут в фактическое привлечение СМП."
                    : "Документ встанет под выбранным договором; суммы оплат по этим документам формируют фактическое привлечение СМП."}
                </span>
              </div>
            )}

            {/* Номер / дата */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-doc-number">
                Номер
              </label>
              <input
                id="smp-doc-number"
                className={block("input")}
                {...register("documentNumber")}
              />
              {errorText("documentNumber") && (
                <span className={block("error")}>
                  {errorText("documentNumber")}
                </span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-doc-date">
                Дата
              </label>
              <input
                id="smp-doc-date"
                className={block("input")}
                type="date"
                {...register("documentDate")}
              />
              {errorText("documentDate") && (
                <span className={block("error")}>
                  {errorText("documentDate")}
                </span>
              )}
            </div>

            {/* Сумма и реквизиты цены для реестра ЕИС */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-amount">
                Сумма, ₽
              </label>
              <input
                id="smp-amount"
                className={block("input")}
                {...register("amount")}
                placeholder="0.00"
              />
              {errorText("amount") && (
                <span className={block("error")}>{errorText("amount")}</span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-okpd2">
                ОКПД2 предмета договора
              </label>
              <input
                id="smp-okpd2"
                className={block("input")}
                {...register("okpd2Code")}
                placeholder="43.31.10"
              />
              {errorText("okpd2Code") && (
                <span className={block("error")}>{errorText("okpd2Code")}</span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-price-type">
                Вид цены контракта
              </label>
              <Select
                id="smp-price-type"
                className={block("select")}
                {...register("priceType")}
              >
                {Object.entries(contractSmpPriceTypeLabels).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </div>
            {priceType === "unit" && (
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-unit-price">
                  Цена за единицу, ₽
                </label>
                <input
                  id="smp-unit-price"
                  className={block("input")}
                  {...register("unitPrice")}
                  placeholder="0.00"
                />
                {errorText("unitPrice") && (
                  <span className={block("error")}>
                    {errorText("unitPrice")}
                  </span>
                )}
              </div>
            )}

            {/* Субподрядчик */}
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="smp-counterparty">
                Контрагент из справочника
              </label>
              <CounterpartySelect
                id="smp-counterparty"
                inn={watchedRecord.supplierInn}
                name={watchedRecord.supplierName}
                placeholder="Найти по ИНН или наименованию — реквизиты подставятся ниже"
                onSelect={(counterparty) => {
                  // Справочник — только подсказка: поля ниже остаются
                  // редактируемыми, потому что сведения в ЕИС фиксируются на
                  // дату документа и могут отличаться от текущей карточки
                  setValue("supplierName", counterparty.name, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("supplierInn", counterparty.inn, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("supplierKpp", counterparty.kpp ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  // Вердикт МСП подтягиваем сразу: у нового контрагента сверки
                  // ещё нет, а у известного она могла устареть
                  checkSupplierInn(counterparty.inn);
                }}
              />
            </div>
            <div className={block("field", ["wide"])}>
              <label className={block("label")} htmlFor="smp-supplier">
                Субподрядчик (наименование)
              </label>
              <input
                id="smp-supplier"
                className={block("input")}
                {...register("supplierName")}
                placeholder="ООО «Субподрядчик»"
              />
              {errorText("supplierName") && (
                <span className={block("error")}>
                  {errorText("supplierName")}
                </span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-inn">
                ИНН
              </label>
              <div className={block("innRow")}>
                <input
                  id="smp-inn"
                  className={block("input")}
                  {...supplierInnField}
                  placeholder="10 или 12 цифр"
                  onBlur={(event) => {
                    void supplierInnField.onBlur(event);
                    // Ушёл из поля — сразу сверяем ИНН с реестром МСП
                    checkSupplierInn(event.target.value);
                  }}
                />
                <button
                  type="button"
                  className={block("innCheck")}
                  onClick={() => checkSupplierInn()}
                  disabled={
                    innCheck.isPending ||
                    (watchedInn.length !== 10 && watchedInn.length !== 12)
                  }
                  title="Спросить сервис ФНС и сохранить ответ в справочнике"
                >
                  {innCheck.isPending ? "Проверяем…" : "Проверить в реестре МСП"}
                </button>
              </div>
              {shownInnAnswer && (
                <span className={block("innAnswer", [innAnswerTone])}>
                  {smpInnLookupText(shownInnAnswer)}
                </span>
              )}
              {innCheck.isError && (
                <span className={block("innAnswer", ["warn"])}>
                  Проверка не выполнена: сервис ФНС недоступен, вердикта нет.
                </span>
              )}
              {errorText("supplierInn") && (
                <span className={block("error")}>
                  {errorText("supplierInn")}
                </span>
              )}
            </div>
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-kpp">
                КПП
              </label>
              <input
                id="smp-kpp"
                className={block("input")}
                {...register("supplierKpp")}
                placeholder="9 цифр"
              />
            </div>

            {/* СМП */}
            <div className={block("field")}>
              <label className={block("checkbox")}>
                <input type="checkbox" {...register("isSmpSubject")} />
                Субъект МСП / СОНКО
              </label>
            </div>

            {/* Получено */}
            <div className={block("field")}>
              <label className={block("label")} htmlFor="smp-received">
                Получено от подрядчика (дата и время)
              </label>
              <input
                id="smp-received"
                className={block("input")}
                type="datetime-local"
                {...register("receivedAt")}
              />
              {errorText("receivedAt") && (
                <span className={block("error")}>
                  {errorText("receivedAt")}
                </span>
              )}
            </div>

            {/* Живая сверка: реестр МСП по ИНН и сроки ПП 1466 по датам */}
            {showNotice && (
              <div className={block("field", ["wide"])}>
                <div className={`${styles.xmlNotice} ${noticeClass}`}>
                  {registryReady && (
                    <span className={styles.xmlNoticeItem}>
                      Реестр МСП: {liveCheck.registry.text}
                    </span>
                  )}
                  {liveCheck.deadlineText && (
                    <span className={styles.xmlNoticeItem}>
                      Сроки ПП 1466: {liveCheck.deadlineText}
                    </span>
                  )}
                  {liveIssues.map((issue) => (
                    <span
                      key={`${issue.code}-${issue.field}-${issue.message}`}
                      className={styles.xmlNoticeItem}
                    >
                      • {issue.message}
                      {issue.hint ? ` ${issue.hint}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Файл-основание: имя читаем, содержимое остаётся у пользователя */}
          <fieldset className={block("section")}>
            <legend>Файл-основание</legend>
            <div className={block("fileRow")}>
              <input
                ref={fileInputRef}
                type="file"
                id="smp-source-file"
                className={block("fileInput")}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
              />
              {(sourceFile || existingSourceName) && (
                <button
                  type="button"
                  className={block("fileClear")}
                  onClick={clearSourceFile}
                >
                  Очистить
                </button>
              )}
            </div>

            {(sourceFile || existingSourceName) && (
              <div className={block("fileInfo")}>
                <span className={block("fileName")}>
                  {sourceFile?.fileName ?? existingSourceName}
                </span>
                {sourceFile && sourceFile.size > 0 && (
                  <span className={block("fileSize")}>
                    {formatFileSize(sourceFile.size)}
                  </span>
                )}
              </div>
            )}

            {sourceFile && sourceFile.matched.length > 0 && (
              <div className={block("fileExtracted")}>
                Из имени файла прочитано:{" "}
                {sourceFile.matched
                  .map((field) =>
                    field === "documentNumber" ? "номер" : "дата",
                  )
                  .join(", ")}
                . Проверьте поля выше — распознавание содержимого документа ещё
                не подключено.
              </div>
            )}

            {sourceFile && sourceFile.matched.length === 0 && (
              <div className={block("fileEmpty")}>
                Номер и дата в имени файла не найдены — внесите их вручную.
              </div>
            )}

            <p className={block("fileHint")}>{SOURCE_FILE_HINT}</p>

            <div className={block("grid")}>
              <div className={block("field", ["wide"])}>
                <label className={block("label")} htmlFor="smp-subject">
                  Предмет документа
                </label>
                <input
                  id="smp-subject"
                  className={block("input")}
                  {...register("subject")}
                  placeholder="Выполнение работ по благоустройству…"
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-period">
                  Период
                </label>
                <input
                  id="smp-period"
                  className={block("input")}
                  {...register("period")}
                  placeholder="2026-03 или I квартал 2026"
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-source-name">
                  Имя файла (сохраняется в базе)
                </label>
                <input
                  id="smp-source-name"
                  className={block("input")}
                  {...register("sourceFileName")}
                  readOnly
                  placeholder="Файл не выбран"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={block("section")}>
            <legend>Реквизиты исполнения</legend>
            <div className={block("grid")}>
              {/* Дата оплаты субподрядчику */}
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-paid-date">
                  Дата оплаты субподрядчику
                </label>
                <input
                  id="smp-paid-date"
                  className={block("input")}
                  type="date"
                  {...register("paidToSupplierDate")}
                />
              </div>

              {/* Подписано подрядчиком */}
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-acceptance-date">
                  Подписано подрядчиком о приёмке
                </label>
                <input
                  id="smp-acceptance-date"
                  className={block("input")}
                  type="date"
                  {...register("acceptanceSignedDate")}
                />
              </div>

              {/* Раньше срока контракта */}
              <div className={block("field")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("paidEarlierThanContractSchedule")}
                  />
                  Оплата раньше срока по контракту (п. 4б, 10 раб. дн.)
                </label>
              </div>

              {/* Замена субподрядчика */}
              <div className={block("field")}>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("isReplacementSubContract")}
                  />
                  Замена субподрядчика (п. 3, 5 раб. дн. от нового договора)
                </label>
              </div>
            </div>
          </fieldset>

          {/* Подтверждения достоверности */}
          <fieldset className={block("section")}>
            <legend>Подтверждения достоверности (п. 6 ПП РФ N 1466)</legend>
            <div className={block("grid")}>
              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="smp-supplier-confirmed"
                >
                  Подрядчик подтвердил (дата)
                </label>
                <input
                  id="smp-supplier-confirmed"
                  className={block("input")}
                  type="datetime-local"
                  {...register("supplierConfirmedAt")}
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-supplier-by">
                  Кем (ФИО подрядчика)
                </label>
                <input
                  id="smp-supplier-by"
                  className={block("input")}
                  {...register("supplierConfirmedBy")}
                  placeholder="Иванов И. И."
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-supplier-doc">
                  Документ подтверждения подрядчика
                </label>
                <input
                  id="smp-supplier-doc"
                  className={block("input")}
                  placeholder="Подтверждение достоверности сведений № 1 от 12.11.2026"
                  {...register("supplierConfirmedDocument")}
                />
              </div>
              <div className={block("field")}>
                <label
                  className={block("label")}
                  htmlFor="smp-customer-confirmed"
                >
                  Заказчик подтвердил (дата)
                </label>
                <input
                  id="smp-customer-confirmed"
                  className={block("input")}
                  type="datetime-local"
                  {...register("customerConfirmedAt")}
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-customer-by">
                  Кем (ФИО заказчика)
                </label>
                <input
                  id="smp-customer-by"
                  className={block("input")}
                  {...register("customerConfirmedBy")}
                  placeholder="Петров П. П."
                />
              </div>
              <div className={block("field")}>
                <label className={block("label")} htmlFor="smp-customer-doc">
                  Документ принятия заказчика
                </label>
                <input
                  id="smp-customer-doc"
                  className={block("input")}
                  placeholder="Принятие сведений № 1 от 12.11.2026"
                  {...register("customerConfirmedDocument")}
                />
              </div>
            </div>
          </fieldset>

          <footer className={block("footer")}>
            <div className={block("actions")}>
              <button type="button" onClick={onClose}>
                Отмена
              </button>
              <button type="submit">
                {isEditing
                  ? "Сохранить"
                  : draft
                    ? "Создать и отправить в ЕИС"
                    : "Создать"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
