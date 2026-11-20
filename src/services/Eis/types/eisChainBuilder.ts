import type { ContractRegistryItem } from "../../ContractRegistry/contractRegistry.schema";
import {
  computeSmpVolume,
  type ContractSmpRecord,
} from "../../ContractSmp/contractSmp.schema";
import type { NoticeInfoFormValues } from "../../Procurements/noticeInfo.schema";
import type { PurchaseNote } from "../../PurchaseNote/purchaseNote.schema";
import type {
  PurchasePlan,
  PurchasePlanPosition,
} from "../../PurchasePlan/purchasePlan.schema";
import { digitsOnly, isIkz } from "../eisIdentifiers";
import {
  eisChainStageLabels,
  emptyEisChainProgress,
  emptyEisChainRefs,
  emptyEisIdentifiers,
  emptyEisSmpSummary,
  type EisChain,
  type EisChainIdentifiers,
  type EisChainIssue,
  type EisChainLink,
  type EisChainProgress,
  type EisChainQuery,
  type EisChainSmpSummary,
  type EisChainStage,
  type EisIdentifierPatch,
} from "./eisChain";

/**
 * Сборка сквозной цепочки из наших коллекций.
 *
 * Ничего не пишет в базу и не меняет входные записи: на вход приходят уже
 * распарсенные схемы (PurchasePlan, NoticeInfoFormValues, ContractRegistryItem,
 * ContractSmpRecord), на выходе — цепочки для интерфейса и проверок.
 *
 * Связь строится по нашим идентификаторам, а не по техническим полям ЕИС:
 * — позиция ПГ → извещение: уникальный номер позиции ПГ, затем ИКЗ;
 * — извещение → контракт: ИКЗ, затем procurementId;
 * — контракт → сведения СМП: contractId.
 */

export interface EisChainSource {
  plans: PurchasePlan[];
  // Потребности (СЗ) по позициям плана-графика: связывают план и извещение
  notes: PurchaseNote[];
  notices: NoticeInfoFormValues[];
  contracts: ContractRegistryItem[];
  smpRecords: ContractSmpRecord[];
}

interface PlanPositionEntry {
  plan: PurchasePlan;
  position: PurchasePlanPosition;
}

// ─── Нормализация значений ─────────────────────────────────────────────────

const text = (value: unknown): string => String(value ?? "").trim();

const nullableText = (value: unknown): string | null => {
  const result = text(value);

  return result === "" ? null : result;
};

const localId = (value: string | number | null | undefined): string | null =>
  value === null || value === undefined || value === "" ? null : String(value);

const sameId = (
  left: string | number | null | undefined,
  right: string | number | null | undefined,
): boolean =>
  left !== null &&
  left !== undefined &&
  right !== null &&
  right !== undefined &&
  String(left) === String(right);

const moneyNumber = (value: unknown): number => {
  const parsed = Number.parseFloat(text(value).replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
};

const moneyText = (value: unknown): string | null => {
  const result = text(value);

  return result === "" ? null : result;
};

const formatMoney = (value: number): string =>
  value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Сопоставление звеньев ─────────────────────────────────────────────────

const matchesNotice = (
  notice: NoticeInfoFormValues,
  position: { ikz: string | null; planPositionNumber: string | null },
): boolean => {
  const noticePosition = nullableText(notice.generalInfo.positionUniqueNumber);

  if (noticePosition && position.planPositionNumber) {
    return noticePosition === position.planPositionNumber;
  }

  const noticeIkz =
    nullableText(notice.generalInfo.ikz) ?? nullableText(notice.ikz);

  return Boolean(noticeIkz && position.ikz && noticeIkz === position.ikz);
};

const matchesNote = (
  note: PurchaseNote,
  position: {
    ikz: string | null;
    planPositionNumber: string | null;
    positionId: string | null;
  },
): boolean => {
  if (
    position.positionId &&
    note.positionId !== null &&
    note.positionId !== undefined &&
    sameId(note.positionId, position.positionId)
  ) {
    return true;
  }

  const notePosition = nullableText(note.positionUniqueNumber);

  if (notePosition && position.planPositionNumber) {
    return notePosition === position.planPositionNumber;
  }

  const noteIkz = nullableText(note.ikz);

  return Boolean(noteIkz && position.ikz && noteIkz === position.ikz);
};

const matchesContract = (
  contract: ContractRegistryItem,
  notice: { ikz: string | null; procurementId: string | null },
): boolean => {
  const contractIkz = nullableText(contract.ikz);

  if (contractIkz && notice.ikz && contractIkz === notice.ikz) {
    return true;
  }

  return Boolean(
    notice.procurementId &&
    contract.procurementId !== null &&
    contract.procurementId !== undefined &&
    sameId(contract.procurementId, notice.procurementId),
  );
};

// ─── Заготовки звеньев ─────────────────────────────────────────────────────

const absentLink = (stage: EisChainStage): EisChainLink => ({
  stage,
  label: eisChainStageLabels[stage],
  present: false,
  identifiers: emptyEisIdentifiers(),
  refs: emptyEisChainRefs(),
  amount: null,
  status: null,
  publishedAt: null,
});

const planLinkOf = (
  entry: PlanPositionEntry,
  note: PurchaseNote | null,
): EisChainLink => {
  const { plan, position } = entry;

  return {
    stage: "plan",
    label: `План-график ${plan.planNumber}`,
    present: true,
    identifiers: {
      ...emptyEisIdentifiers(),
      localId: localId(position.id),
      purchaseNumber: nullableText(position.purchaseNumber),
      planPositionNumber: nullableText(position.uniqueNumber),
      ikz: nullableText(position.identificationCode),
    },
    refs: {
      ...emptyEisChainRefs(),
      planId: localId(plan.id),
      planPositionId: localId(position.id),
      purchaseNoteId: localId(note?.id),
    },
    amount: moneyText(position.amountTotal),
    status: nullableText(position.status) ?? nullableText(plan.status),
    publishedAt: nullableText(plan.publishDate),
  };
};

const noticeLinkOf = (
  notice: NoticeInfoFormValues,
  fallback: {
    purchaseNumber: string | null;
    planPositionNumber: string | null;
    ikz: string | null;
  },
  note: PurchaseNote | null = null,
): EisChainLink => ({
  stage: "notice",
  label: `Извещение ${nullableText(notice.generalInfo.noticeNumber) ?? "без номера"}`,
  present: true,
  identifiers: {
    ...emptyEisIdentifiers(),
    localId: localId(notice.id),
    purchaseNumber: fallback.purchaseNumber,
    planPositionNumber: fallback.planPositionNumber,
    ikz: nullableText(notice.generalInfo.ikz) ?? fallback.ikz,
    noticeNumber: nullableText(notice.generalInfo.noticeNumber),
  },
  refs: {
    ...emptyEisChainRefs(),
    purchaseNoteId: localId(note?.id ?? notice.purchaseNoteId),
    procurementId: localId(notice.procurementId),
    noticeId: localId(notice.id),
  },
  amount: moneyText(notice.generalInfo.nmck),
  status: nullableText(notice.noticeState.statusLabel),
  publishedAt: nullableText(notice.noticeState.updatedAt),
});

const contractLinkOf = (
  contract: ContractRegistryItem,
  fallback: { purchaseNumber: string | null; ikz: string | null },
): EisChainLink => ({
  stage: "contract",
  label: `Контракт ${contract.contractNumber}`,
  present: true,
  identifiers: {
    ...emptyEisIdentifiers(),
    localId: localId(contract.id),
    purchaseNumber: fallback.purchaseNumber,
    ikz: nullableText(contract.ikz) ?? fallback.ikz,
    contractRegistryNumber: nullableText(contract.eisRegistryNumber),
  },
  refs: {
    ...emptyEisChainRefs(),
    procurementId: localId(contract.procurementId),
    contractId: localId(contract.id),
    contractProjectId: localId(contract.contractProjectId),
  },
  amount: moneyText(contract.contractPrice),
  status: nullableText(contract.status),
  publishedAt: nullableText(contract.eisPublishDate),
});

const smpLinkOf = (
  records: ContractSmpRecord[],
  fallback: {
    purchaseNumber: string | null;
    ikz: string | null;
    contractRegistryNumber: string | null;
    contractId: string | null;
  },
): EisChainLink => {
  const recordIds = records
    .map((record) => localId(record.id))
    .filter((value): value is string => value !== null);
  const total = records.reduce(
    (sum, record) => sum + moneyNumber(record.amount),
    0,
  );
  const dates = records
    .map((record) => nullableText(record.eisPublishDate))
    .filter((value): value is string => value !== null)
    .sort();

  return {
    stage: "smp",
    label: `Сведения СМП (${records.length})`,
    present: records.length > 0,
    identifiers: {
      ...emptyEisIdentifiers(),
      // Сводное звено не имеет одного localId: id записей лежат в refs.
      localId: records.length === 1 ? localId(records[0].id) : null,
      purchaseNumber: fallback.purchaseNumber,
      ikz: fallback.ikz,
      contractRegistryNumber: fallback.contractRegistryNumber,
    },
    refs: {
      ...emptyEisChainRefs(),
      contractId: fallback.contractId,
      smpRecordIds: recordIds,
    },
    amount: records.length > 0 ? total.toFixed(2) : null,
    status: records.length > 0 ? `${records.length} записей` : null,
    publishedAt: dates.length > 0 ? dates[dates.length - 1] : null,
  };
};

// ─── Сводка СМП ────────────────────────────────────────────────────────────

const smpSummaryOf = (
  records: ContractSmpRecord[],
  contract: ContractRegistryItem | null,
  notice: NoticeInfoFormValues | null,
): EisChainSmpSummary => {
  const requiredPercent =
    nullableText(contract?.smpRequiredPercent) ??
    nullableText(
      notice?.participantsRequirements.subcontractingSmpRequiredPercent,
    );

  if (records.length === 0) {
    return {
      ...emptyEisSmpSummary(),
      requiredPercent,
    };
  }

  const volume = computeSmpVolume(
    records,
    contract?.contractPrice,
    requiredPercent ?? undefined,
  );

  return {
    requiredPercent,
    requiredAmount: volume.required > 0 ? volume.required : null,
    actualAmount: volume.actual,
    recordsCount: records.length,
    pendingCount: records.filter((record) => record.status === "submitted")
      .length,
    withoutInnCount: records.filter(
      (record) => nullableText(record.supplierInn) === null,
    ).length,
    withoutOkpd2Count: records.filter(
      (record) =>
        record.documentType === "subContract" &&
        nullableText(record.okpd2Code) === null,
    ).length,
  };
};

// ─── Проверки ──────────────────────────────────────────────────────────────

const issue = (
  stage: EisChainStage,
  code: string,
  message: string,
  severity: EisChainIssue["severity"],
  field: string | null = null,
): EisChainIssue => ({ stage, code, message, severity, field });

/**
 * Разрывы цепочки. Ошибка блокирует передачу в ЕИС (нет ИКЗ), предупреждение —
 * то, что ещё не случилось или заполняется позже (номер извещения, реестровый
 * номер). Номера ЕИС не считаем ошибкой: их присваивает портал.
 */
export const eisChainIssues = (chain: EisChain): EisChainIssue[] => {
  const issues: EisChainIssue[] = [];
  const link = (stage: EisChainStage): EisChainLink | undefined =>
    chain.links.find((item) => item.stage === stage);

  const plan = link("plan");
  const notice = link("notice");
  const contract = link("contract");
  const smp = link("smp");

  if (plan?.present) {
    if (!plan.identifiers.purchaseNumber) {
      issues.push(
        issue(
          "plan",
          "plan.no_purchase_number",
          "У позиции плана-графика нет номера закупки: извещение не с чем связать.",
          "warning",
          "purchaseNumber",
        ),
      );
    }

    if (!plan.identifiers.ikz) {
      issues.push(
        issue(
          "plan",
          "plan.no_ikz",
          "Не заполнен ИКЗ — без него извещение и контракт не свяжутся с планом.",
          "error",
          "identificationCode",
        ),
      );
    } else if (!isIkz(plan.identifiers.ikz)) {
      issues.push(
        issue(
          "plan",
          "plan.bad_ikz",
          "ИКЗ должен состоять из 36 цифр — иначе ЕИС не примет сведения.",
          "warning",
          "identificationCode",
        ),
      );
    }
  }

  if (plan?.present && !plan.refs.purchaseNoteId) {
    issues.push(
      issue(
        "plan",
        "plan.no_purchase_note",
        "По позиции плана-графика ещё не создана потребность (служебная записка).",
        "warning",
      ),
    );
  }

  if (plan?.present && !notice?.present) {
    issues.push(
      issue(
        "notice",
        "notice.missing",
        "По позиции плана-графика ещё не создано извещение.",
        "warning",
      ),
    );
  }

  if (
    !plan?.present &&
    (notice?.present || contract?.present || smp?.present)
  ) {
    issues.push(
      issue(
        "plan",
        "plan.missing",
        "Закупка не связана с позицией плана-графика: проверьте номер закупки и ИКЗ.",
        "warning",
      ),
    );
  }

  if (!notice?.present && contract?.present) {
    issues.push(
      issue(
        "notice",
        "notice.missing_for_contract",
        "Контракт не связан с извещением: проверьте ИКЗ и номер закупки.",
        "warning",
      ),
    );
  }

  if (smp?.present && !contract?.present) {
    issues.push(
      issue(
        "smp",
        "smp.no_contract",
        "Сведения СМП не привязаны к контракту.",
        "warning",
        "contractId",
      ),
    );
  }

  if (notice?.present && !notice.identifiers.noticeNumber) {
    issues.push(
      issue(
        "notice",
        "notice.not_published",
        "Извещение не размещено в ЕИС: номер присвоит портал после публикации.",
        "warning",
        "noticeNumber",
      ),
    );
  }

  if (notice?.present && !contract?.present) {
    issues.push(
      issue(
        "contract",
        "contract.missing",
        "По извещению ещё не заключён контракт.",
        "warning",
      ),
    );
  }

  if (contract?.present && !contract.identifiers.contractRegistryNumber) {
    issues.push(
      issue(
        "contract",
        "contract.not_in_registry",
        "Контракт не включён в реестр контрактов: реестровый номер присвоит ЕИС.",
        "warning",
        "eisRegistryNumber",
      ),
    );
  }

  if (chain.smp.requiredPercent && chain.smp.recordsCount === 0) {
    issues.push(
      issue(
        "smp",
        "smp.missing",
        `Установлено требование о привлечении СМП (${chain.smp.requiredPercent} %), но сведения ещё не заведены.`,
        "warning",
      ),
    );
  }

  if (
    chain.smp.requiredAmount !== null &&
    chain.smp.actualAmount < chain.smp.requiredAmount
  ) {
    const shortfall = chain.smp.requiredAmount - chain.smp.actualAmount;

    issues.push(
      issue(
        "smp",
        "smp.shortfall",
        `Объём привлечения СМП не закрыт: не хватает ${formatMoney(shortfall)} ₽ из ${formatMoney(chain.smp.requiredAmount)} ₽.`,
        "warning",
      ),
    );
  }

  if (chain.smp.pendingCount > 0) {
    issues.push(
      issue(
        "smp",
        "smp.pending",
        `Не принято заказчиком записей СМП: ${chain.smp.pendingCount}.`,
        "warning",
      ),
    );
  }

  if (chain.smp.withoutInnCount > 0) {
    issues.push(
      issue(
        "smp",
        "smp.no_inn",
        `У ${chain.smp.withoutInnCount} записей СМП не указан ИНН субподрядчика.`,
        "warning",
        "supplierInn",
      ),
    );
  }

  if (chain.smp.withoutOkpd2Count > 0) {
    issues.push(
      issue(
        "smp",
        "smp.no_okpd2",
        `У ${chain.smp.withoutOkpd2Count} договоров с субподрядчиком не указан ОКПД2 — реестр контрактов его требует.`,
        "warning",
        "okpd2Code",
      ),
    );
  }

  return issues;
};

// ─── Прогресс ──────────────────────────────────────────────────────────────

export const eisChainProgress = (chain: EisChain): EisChainProgress => {
  const link = (stage: EisChainStage): EisChainLink | undefined =>
    chain.links.find((item) => item.stage === stage);

  const plan = Boolean(link("plan")?.present);
  const notice = Boolean(
    link("notice")?.present && link("notice")?.identifiers.noticeNumber,
  );
  const contract = Boolean(
    link("contract")?.present &&
    link("contract")?.identifiers.contractRegistryNumber,
  );
  const smpRequired = Boolean(
    chain.smp.requiredPercent && Number(chain.smp.requiredPercent) > 0,
  );
  const smp = !smpRequired || chain.smp.recordsCount > 0;
  const flags = [plan, notice, contract, smp];
  const completed = flags.filter(Boolean).length;
  const total = flags.length;

  return {
    plan,
    notice,
    contract,
    smp,
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

// ─── Сборка цепочки ────────────────────────────────────────────────────────

const finalizeChain = (
  chain: Omit<EisChain, "issues" | "progress">,
): EisChain => {
  const draft: EisChain = {
    ...chain,
    issues: [],
    progress: emptyEisChainProgress(),
  };
  const issues = eisChainIssues(draft);

  return {
    ...draft,
    issues,
    progress: eisChainProgress({ ...draft, issues }),
  };
};

const chainKey = (
  purchaseNumber: string | null,
  ikz: string | null,
  fallback: string,
): string =>
  purchaseNumber
    ? `purchase:${purchaseNumber}`
    : ikz
      ? `ikz:${ikz}`
      : `local:${fallback}`;

const buildChainForPosition = (
  entry: PlanPositionEntry,
  source: EisChainSource,
): EisChain => {
  const { plan, position } = entry;
  const purchaseNumber = nullableText(position.purchaseNumber);
  const ikz = nullableText(position.identificationCode);
  const planPositionNumber = nullableText(position.uniqueNumber);

  const note =
    source.notes.find((item) =>
      matchesNote(item, {
        ikz,
        planPositionNumber,
        positionId: localId(position.id),
      }),
    ) ?? null;
  const notice =
    source.notices.find((item) =>
      matchesNotice(item, { ikz, planPositionNumber }),
    ) ?? null;
  const procurementId = localId(notice?.procurementId);
  const contract =
    source.contracts.find((item) =>
      matchesContract(item, { ikz, procurementId }),
    ) ?? null;
  const smpRecords = contract
    ? source.smpRecords.filter((record) =>
        sameId(record.contractId, contract.id),
      )
    : [];

  const links: EisChainLink[] = [
    planLinkOf(entry, note),
    notice
      ? noticeLinkOf(notice, { purchaseNumber, planPositionNumber, ikz }, note)
      : absentLink("notice"),
    contract
      ? contractLinkOf(contract, { purchaseNumber, ikz })
      : absentLink("contract"),
    smpLinkOf(smpRecords, {
      purchaseNumber,
      ikz: nullableText(contract?.ikz) ?? ikz,
      contractRegistryNumber: nullableText(contract?.eisRegistryNumber),
      contractId: localId(contract?.id),
    }),
  ];

  return finalizeChain({
    organizationId: localId(plan.organizationId),
    key: chainKey(
      purchaseNumber,
      ikz,
      `${localId(plan.id) ?? "plan"}:${(localId(position.id) ?? text(position.serialNumber)) || "position"}`,
    ),
    purchaseNumber,
    ikz,
    links,
    smp: smpSummaryOf(smpRecords, contract, notice),
  });
};

const buildChainForNotice = (
  notice: NoticeInfoFormValues,
  source: EisChainSource,
  skipContractIds: Set<string>,
  skipSmpIds: Set<string>,
): EisChain => {
  const ikz = nullableText(notice.generalInfo.ikz) ?? nullableText(notice.ikz);
  const procurementId = localId(notice.procurementId);
  const contract =
    source.contracts.find(
      (item) =>
        !skipContractIds.has(localId(item.id) ?? "") &&
        matchesContract(item, { ikz, procurementId }),
    ) ?? null;
  const smpRecords = contract
    ? source.smpRecords.filter(
        (record) =>
          !skipSmpIds.has(localId(record.id) ?? "") &&
          sameId(record.contractId, contract.id),
      )
    : [];

  const note =
    source.notes.find(
      (item) =>
        sameId(item.id, notice.purchaseNoteId) ||
        (nullableText(item.ikz) !== null && nullableText(item.ikz) === ikz),
    ) ?? null;

  const links: EisChainLink[] = [
    absentLink("plan"),
    noticeLinkOf(
      notice,
      {
        purchaseNumber: null,
        planPositionNumber: nullableText(
          notice.generalInfo.positionUniqueNumber,
        ),
        ikz,
      },
      note,
    ),
    contract
      ? contractLinkOf(contract, { purchaseNumber: null, ikz })
      : absentLink("contract"),
    smpLinkOf(smpRecords, {
      purchaseNumber: null,
      ikz: nullableText(contract?.ikz) ?? ikz,
      contractRegistryNumber: nullableText(contract?.eisRegistryNumber),
      contractId: localId(contract?.id),
    }),
  ];

  return finalizeChain({
    organizationId:
      localId(notice.contactInfo.organizationId) ??
      localId(contract?.organizationId) ??
      localId(smpRecords[0]?.organizationId),
    key: chainKey(
      null,
      ikz,
      `notice:${localId(notice.id) ?? nullableText(notice.generalInfo.noticeNumber) ?? "unknown"}`,
    ),
    purchaseNumber: null,
    ikz,
    links,
    smp: smpSummaryOf(smpRecords, contract, notice),
  });
};

const buildChainForContract = (
  contract: ContractRegistryItem,
  source: EisChainSource,
  skipSmpIds: Set<string>,
): EisChain => {
  const ikz = nullableText(contract.ikz);
  const smpRecords = source.smpRecords.filter(
    (record) =>
      !skipSmpIds.has(localId(record.id) ?? "") &&
      sameId(record.contractId, contract.id),
  );

  const links: EisChainLink[] = [
    absentLink("plan"),
    absentLink("notice"),
    contractLinkOf(contract, { purchaseNumber: null, ikz }),
    smpLinkOf(smpRecords, {
      purchaseNumber: null,
      ikz,
      contractRegistryNumber: nullableText(contract.eisRegistryNumber),
      contractId: localId(contract.id),
    }),
  ];

  return finalizeChain({
    organizationId: localId(contract.organizationId),
    key: chainKey(
      null,
      ikz,
      `contract:${localId(contract.id) ?? contract.contractNumber}`,
    ),
    purchaseNumber: null,
    ikz,
    links,
    smp: smpSummaryOf(smpRecords, contract, null),
  });
};

const buildChainForNote = (
  note: PurchaseNote,
  source: EisChainSource,
  skipContractIds: Set<string>,
  skipSmpIds: Set<string>,
): EisChain => {
  const ikz = nullableText(note.ikz);
  const notice =
    source.notices.find(
      (item) =>
        sameId(item.purchaseNoteId, note.id) ||
        (nullableText(item.generalInfo.ikz) !== null &&
          nullableText(item.generalInfo.ikz) === ikz),
    ) ?? null;
  const procurementId = localId(notice?.procurementId);
  const contract =
    source.contracts.find(
      (item) =>
        !skipContractIds.has(localId(item.id) ?? "") &&
        matchesContract(item, { ikz, procurementId }),
    ) ?? null;
  const smpRecords = contract
    ? source.smpRecords.filter(
        (record) =>
          !skipSmpIds.has(localId(record.id) ?? "") &&
          sameId(record.contractId, contract.id),
      )
    : [];

  const links: EisChainLink[] = [
    absentLink("plan"),
    notice
      ? noticeLinkOf(
          notice,
          {
            purchaseNumber: null,
            planPositionNumber: nullableText(note.positionUniqueNumber),
            ikz,
          },
          note,
        )
      : absentLink("notice"),
    contract
      ? contractLinkOf(contract, { purchaseNumber: null, ikz })
      : absentLink("contract"),
    smpLinkOf(smpRecords, {
      purchaseNumber: null,
      ikz: nullableText(contract?.ikz) ?? ikz,
      contractRegistryNumber: nullableText(contract?.eisRegistryNumber),
      contractId: localId(contract?.id),
    }),
  ];

  return finalizeChain({
    organizationId:
      localId(note.organizationId) ??
      localId(contract?.organizationId) ??
      localId(smpRecords[0]?.organizationId),
    key: chainKey(null, ikz, `note:${localId(note.id) ?? note.noteNumber}`),
    purchaseNumber: null,
    ikz,
    links,
    smp: smpSummaryOf(smpRecords, contract, notice),
  });
};

const buildChainForSmp = (record: ContractSmpRecord): EisChain => {
  const links: EisChainLink[] = [
    absentLink("plan"),
    absentLink("notice"),
    absentLink("contract"),
    smpLinkOf([record], {
      purchaseNumber: null,
      ikz: null,
      contractRegistryNumber: null,
      contractId: localId(record.contractId),
    }),
  ];

  return finalizeChain({
    organizationId: localId(record.organizationId),
    key: `smp:${localId(record.id) ?? record.documentNumber}`,
    purchaseNumber: null,
    ikz: null,
    links,
    smp: smpSummaryOf([record], null, null),
  });
};

/**
 * Собрать цепочки по всем коллекциям.
 *
 * Сначала строятся цепочки по позициям плана-графика. Затем добавляются
 * «сироты» — извещения без позиции ПГ, контракты без извещения и записи СМП
 * без контракта. Сироты не теряются молча: у них в цепочке будет разрыв,
 * который увидит заказчик.
 */
export const buildEisChains = (source: EisChainSource): EisChain[] => {
  const chains: EisChain[] = [];
  const usedNoteIds = new Set<string>();
  const usedNoticeIds = new Set<string>();
  const usedContractIds = new Set<string>();
  const usedSmpIds = new Set<string>();

  const markUsed = (chain: EisChain): void => {
    for (const link of chain.links) {
      if (link.refs.purchaseNoteId) {
        usedNoteIds.add(link.refs.purchaseNoteId);
      }

      if (!link.present) {
        continue;
      }

      if (link.stage === "notice" && link.identifiers.localId) {
        usedNoticeIds.add(link.identifiers.localId);
      }

      if (link.stage === "contract" && link.identifiers.localId) {
        usedContractIds.add(link.identifiers.localId);
      }

      if (link.stage === "smp") {
        for (const id of link.refs.smpRecordIds) {
          usedSmpIds.add(id);
        }
      }
    }
  };

  for (const plan of source.plans) {
    for (const position of plan.positions ?? []) {
      const chain = buildChainForPosition({ plan, position }, source);
      chains.push(chain);
      markUsed(chain);
    }
  }

  for (const note of source.notes) {
    const id = localId(note.id);

    if (id && usedNoteIds.has(id)) {
      continue;
    }

    const chain = buildChainForNote(note, source, usedContractIds, usedSmpIds);
    chains.push(chain);
    markUsed(chain);
  }

  for (const notice of source.notices) {
    const id = localId(notice.id);

    if (id && usedNoticeIds.has(id)) {
      continue;
    }

    const chain = buildChainForNotice(
      notice,
      source,
      usedContractIds,
      usedSmpIds,
    );
    chains.push(chain);
    markUsed(chain);
  }

  for (const contract of source.contracts) {
    const id = localId(contract.id);

    if (id && usedContractIds.has(id)) {
      continue;
    }

    const chain = buildChainForContract(contract, source, usedSmpIds);
    chains.push(chain);
    markUsed(chain);
  }

  for (const record of source.smpRecords) {
    const id = localId(record.id);

    if (id && usedSmpIds.has(id)) {
      continue;
    }

    const chain = buildChainForSmp(record);
    chains.push(chain);
    markUsed(chain);
  }

  return chains;
};

// ─── Сохранение номеров, которые вернул портал ─────────────────────────────

const normalizePatch = (patch: EisIdentifierPatch): EisIdentifierPatch => ({
  purchaseNumber:
    patch.purchaseNumber !== undefined
      ? digitsOnly(patch.purchaseNumber)
      : undefined,
  planPositionNumber:
    patch.planPositionNumber !== undefined
      ? patch.planPositionNumber.trim()
      : undefined,
  ikz: patch.ikz !== undefined ? digitsOnly(patch.ikz) : undefined,
  noticeNumber:
    patch.noticeNumber !== undefined
      ? digitsOnly(patch.noticeNumber)
      : undefined,
  contractRegistryNumber:
    patch.contractRegistryNumber !== undefined
      ? digitsOnly(patch.contractRegistryNumber)
      : undefined,
});

/**
 * Записать номера, которые ЕИС вернула после размещения.
 *
 * `purchaseNumber` и `ikz` — сквозные: они обновляются у всех звеньев.
 * `noticeNumber` пишется в извещение, `contractRegistryNumber` — в контракт
 * и в сводное звено СМП. Возвращается новая цепочка, входная не мутируется.
 */
export const applyEisIdentifiers = (
  chain: EisChain,
  stage: EisChainStage,
  patch: EisIdentifierPatch,
): EisChain => {
  const normalized = normalizePatch(patch);

  const links = chain.links.map((link) => {
    if (!link.present) {
      return link;
    }

    const identifiers: EisChainIdentifiers = { ...link.identifiers };

    if (normalized.purchaseNumber !== undefined) {
      identifiers.purchaseNumber = normalized.purchaseNumber || null;
    }

    if (
      normalized.planPositionNumber !== undefined &&
      (link.stage === "plan" || link.stage === "notice")
    ) {
      identifiers.planPositionNumber = normalized.planPositionNumber || null;
    }

    if (normalized.ikz !== undefined && link.stage !== "smp") {
      identifiers.ikz = normalized.ikz || null;
    }

    if (
      normalized.noticeNumber !== undefined &&
      stage === "notice" &&
      link.stage === "notice"
    ) {
      identifiers.noticeNumber = normalized.noticeNumber || null;
    }

    if (
      normalized.contractRegistryNumber !== undefined &&
      stage === "contract" &&
      (link.stage === "contract" || link.stage === "smp")
    ) {
      identifiers.contractRegistryNumber =
        normalized.contractRegistryNumber || null;
    }

    return { ...link, identifiers };
  });

  const planLink = links.find((link) => link.stage === "plan");
  const purchaseNumber =
    normalized.purchaseNumber !== undefined
      ? normalized.purchaseNumber || null
      : chain.purchaseNumber;
  const ikz =
    normalized.ikz !== undefined
      ? normalized.ikz || null
      : (planLink?.identifiers.ikz ?? chain.ikz);

  const draft: EisChain = {
    ...chain,
    links,
    purchaseNumber,
    ikz,
    issues: [],
    progress: emptyEisChainProgress(),
  };
  const issues = eisChainIssues(draft);

  return {
    ...draft,
    issues,
    progress: eisChainProgress({ ...draft, issues }),
  };
};

// ─── Поиск ─────────────────────────────────────────────────────────────────

const queryText = (
  value: string | number | null | undefined,
): string | null => {
  const result = text(value);

  return result === "" ? null : result;
};

const queryDigits = (
  value: string | number | null | undefined,
): string | null => {
  const result = digitsOnly(text(value));

  return result === "" ? null : result;
};

/** Найти цепочку по любому известному идентификатору. */
export const findEisChain = (
  chains: EisChain[],
  query: EisChainQuery,
): EisChain | null => {
  const purchaseNumber = queryDigits(query.purchaseNumber);
  const ikz = queryDigits(query.ikz);
  const localIdQuery = queryText(query.localId);
  const noticeNumber = queryDigits(query.noticeNumber);
  const contractRegistryNumber = queryDigits(query.contractRegistryNumber);

  const found =
    chains.find((chain) => {
      if (purchaseNumber && chain.purchaseNumber === purchaseNumber) {
        return true;
      }

      if (ikz && chain.ikz === ikz) {
        return true;
      }

      if (localIdQuery) {
        const byLocalId = chain.links.some(
          (link) =>
            link.identifiers.localId === localIdQuery ||
            link.refs.purchaseNoteId === localIdQuery ||
            link.refs.smpRecordIds.includes(localIdQuery),
        );

        if (byLocalId) {
          return true;
        }
      }

      if (
        noticeNumber &&
        chain.links.some(
          (link) => link.identifiers.noticeNumber === noticeNumber,
        )
      ) {
        return true;
      }

      return Boolean(
        contractRegistryNumber &&
        chain.links.some(
          (link) =>
            link.identifiers.contractRegistryNumber === contractRegistryNumber,
        ),
      );
    }) ?? null;

  return found;
};
