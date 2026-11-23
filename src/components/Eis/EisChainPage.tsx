import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/axios.instance";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { filterVisiblePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.schema";
import { useNotices } from "../../services/Procurements/noticeInfo.api";
import {
  useAllContractPayments,
  useContractRegistry,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useAllContractSmpRecords } from "../../services/ContractSmp/contractSmp.api";
import { useAcceptances } from "../../services/Acceptance/acceptance.api";
import { useEisPackages } from "../../services/Eis/eisPackages.api";
import {
  applyEisIdentifiers,
  buildEisChains,
} from "../../services/Eis/types/eisChainBuilder";
import {
  eisChainStageLabels,
  type EisChain,
  type EisChainLink,
} from "../../services/Eis/types/eisChain";
import styles from "./EisChainPage.module.scss";

/**
 * Сквозная цепочка закупки: план-график → потребность (СЗ) → извещение →
 * контракт → сведения СМП.
 *
 * Экран ничего не выдумывает: цепочки собирает `buildEisChains` из наших
 * коллекций, разрывы и «сироты» показывает `eisChainIssues`, а номера ЕИС
 * сохраняются в те же записи, из которых цепочка построена.
 */

const stageTitles = eisChainStageLabels;

const formatMoney = (value: string | null): string => {
  if (!value) return "—";
  const number = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(number)) return value;
  return number.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const linkSummary = (link: EisChainLink): string => {
  if (!link.present) return "Не создано";
  const parts = [
    link.identifiers.ikz ? `ИКЗ ${link.identifiers.ikz}` : "",
    link.identifiers.noticeNumber
      ? `Извещение ${link.identifiers.noticeNumber}`
      : "",
    link.identifiers.contractRegistryNumber
      ? `Реестр ${link.identifiers.contractRegistryNumber}`
      : "",
    link.identifiers.regNumberExecution
      ? `Исполнение ${link.identifiers.regNumberExecution}`
      : "",
    link.amount ? `${formatMoney(link.amount)} ₽` : "",
    link.status ?? "",
    link.reaward?.successorContractId
      ? "расторгнут → перезаключён"
      : link.reaward?.previousContractId
        ? "перезаключение той же позиции ПГ"
        : "",
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(" · ")
    : "Запись есть, реквизиты не заполнены";
};

interface ChainCardProps {
  chain: EisChain;
  block: (element?: string, modifiers?: string[]) => string;
  onSave: (payload: {
    chain: EisChain;
    noticeNumber: string;
    contractRegistryNumber: string;
  }) => void;
  saving: boolean;
}

function ChainCard({ chain, block, onSave, saving }: ChainCardProps) {
  const noticeLink = chain.links.find((link) => link.stage === "notice");
  const contractLink = chain.links.find((link) => link.stage === "contract");
  const [noticeNumber, setNoticeNumber] = useState(
    noticeLink?.identifiers.noticeNumber ?? "",
  );
  const [registryNumber, setRegistryNumber] = useState(
    contractLink?.identifiers.contractRegistryNumber ?? "",
  );

  const preview = useMemo(() => {
    let next = chain;
    if (noticeNumber.trim() && noticeLink?.present) {
      next = applyEisIdentifiers(next, "notice", {
        noticeNumber: noticeNumber.trim(),
      });
    }
    if (registryNumber.trim() && contractLink?.present) {
      next = applyEisIdentifiers(next, "contract", {
        contractRegistryNumber: registryNumber.trim(),
      });
    }
    return next;
  }, [
    chain,
    noticeNumber,
    registryNumber,
    noticeLink?.present,
    contractLink?.present,
  ]);

  return (
    <article className={block("card")}>
      <header className={block("card-head")}>
        <div>
          <h3 className={block("card-title")}>
            {chain.purchaseNumber
              ? `Закупка № ${chain.purchaseNumber}`
              : chain.ikz
                ? `ИКЗ ${chain.ikz}`
                : chain.key}
          </h3>
          <p className={block("card-subtitle")}>
            {chain.ikz ? `ИКЗ ${chain.ikz}` : "ИКЗ не заполнен"}
          </p>
        </div>
        <div className={block("progress")}>
          <span className={block("progress-value")}>
            {preview.progress.completed}/{preview.progress.total}
          </span>
          <div className={block("progress-track")}>
            <div
              className={block("progress-fill")}
              style={{ width: `${preview.progress.percent}%` }}
            />
          </div>
        </div>
      </header>

      <ol className={block("steps")}>
        {preview.links.map((link) => (
          <li
            key={link.stage}
            className={block("step", [link.present ? "done" : "missing"])}
          >
            <div className={block("step-head")}>
              <span className={block("step-name")}>
                {stageTitles[link.stage]}
              </span>
              <span className={block("step-state")}>
                {link.present ? "есть" : "нет"}
              </span>
            </div>
            <p className={block("step-text")}>{linkSummary(link)}</p>
            <p className={block("step-refs")}>
              {link.refs.purchaseNoteId
                ? `СЗ id ${link.refs.purchaseNoteId}`
                : ""}
              {link.refs.noticeId
                ? ` · извещение id ${link.refs.noticeId}`
                : ""}
              {link.refs.contractId
                ? ` · контракт id ${link.refs.contractId}`
                : ""}
            </p>
          </li>
        ))}
      </ol>

      <p className={block("step-text")}>
        <b>Исполнение.</b>{" "}
        {preview.execution.acceptanceCount === 0
          ? "приёмки нет"
          : `приёмок ${preview.execution.acceptanceCount}, принято ${preview.execution.acceptedCount}` +
            (preview.execution.acceptedAmount > 0
              ? ` на ${formatMoney(String(preview.execution.acceptedAmount))} ₽`
              : "")}
        {" · "}
        {preview.execution.paymentCount === 0
          ? "платежей нет"
          : `платежей ${preview.execution.paymentCount}` +
            (preview.execution.withoutRegNumberExecution > 0
              ? `, без реестрового номера исполнения: ${preview.execution.withoutRegNumberExecution}`
              : "")}
        {" · "}
        {preview.execution.reconciled
          ? "исполнение сведено"
          : "исполнение не сведено"}
        {preview.execution.flkRejectedPackages > 0
          ? ` · ФЛК отклонил пакетов: ${preview.execution.flkRejectedPackages}`
          : ""}
        {preview.execution.pendingPackages > 0
          ? ` · в работе пакетов: ${preview.execution.pendingPackages}`
          : ""}
      </p>

      {preview.issues.length > 0 && (
        <ul className={block("issues")}>
          {preview.issues.map((issue) => (
            <li
              key={`${issue.stage}:${issue.code}`}
              className={block("issue", [issue.severity])}
            >
              <span className={block("issue-stage")}>
                {stageTitles[issue.stage]}
              </span>
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      {(noticeLink?.present || contractLink?.present) && (
        <div className={block("save-row")}>
          {noticeLink?.present && (
            <label className={block("field")}>
              <span className={block("label")}>Номер извещения в ЕИС</span>
              <input
                className={block("input")}
                value={noticeNumber}
                onChange={(event) => setNoticeNumber(event.target.value)}
                placeholder="0844..."
              />
            </label>
          )}
          {contractLink?.present && (
            <label className={block("field")}>
              <span className={block("label")}>Реестровый номер контракта</span>
              <input
                className={block("input")}
                value={registryNumber}
                onChange={(event) => setRegistryNumber(event.target.value)}
                placeholder="19 цифр"
              />
            </label>
          )}
          <button
            type="button"
            className={block("save")}
            disabled={saving}
            onClick={() =>
              onSave({
                chain,
                noticeNumber: noticeNumber.trim(),
                contractRegistryNumber: registryNumber.trim(),
              })
            }
          >
            {saving ? "Сохранение…" : "Сохранить номера ЕИС"}
          </button>
        </div>
      )}
    </article>
  );
}

export default function EisChainPage() {
  const { bem } = useUtils();
  const block = bem(styles, "eis-chain");
  const queryClient = useQueryClient();

  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;
  const { data: plans = [] } = usePurchasePlans(orgId);
  const { data: notes = [] } = usePurchaseNotes(orgId);
  const visibleNotes = useMemo(() => filterVisiblePurchaseNotes(notes), [notes]);
  const { data: notices = [] } = useNotices();
  const { data: contracts = [] } = useContractRegistry(orgId);
  const { data: smpRecords = [] } = useAllContractSmpRecords();
  // Исполнение: приёмки живут в csms-api, платежи — в реестре, пакеты — в шлюзе.
  // Любой из источников может быть недоступен (шлюз не запущен) — цепочка
  // тогда строится без этих звеньев, а не падает целиком.
  const { data: acceptances = [] } = useAcceptances(
    orgId ? String(orgId) : undefined,
  );
  const { data: payments = [] } = useAllContractPayments();
  const { data: packages = [] } = useEisPackages();
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState("");

  const chains = useMemo(
    () =>
      buildEisChains({
        plans,
        notes: visibleNotes,
        notices,
        contracts,
        smpRecords,
        acceptances,
        payments,
        packages,
      }),
    [
      plans,
      visibleNotes,
      notices,
      contracts,
      smpRecords,
      acceptances,
      payments,
      packages,
    ],
  );

  const visibleChains = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return chains;
    return chains.filter((chain) =>
      [
        chain.key,
        chain.ikz,
        chain.purchaseNumber,
        ...chain.links.flatMap((link) => [
          link.identifiers.noticeNumber,
          link.identifiers.contractRegistryNumber,
          link.identifiers.planPositionNumber,
        ]),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [chains, search]);

  const summary = useMemo(() => {
    const total = chains.length;
    const completed = chains.filter(
      (chain) => chain.progress.percent === 100,
    ).length;
    const withIssues = chains.filter((chain) => chain.issues.length > 0).length;
    return { total, completed, withIssues };
  }, [chains]);

  const saveIdentifiers = useMutation({
    mutationFn: async ({
      chain,
      noticeNumber,
      contractRegistryNumber,
    }: {
      chain: EisChain;
      noticeNumber: string;
      contractRegistryNumber: string;
    }) => {
      const noticeLink = chain.links.find((link) => link.stage === "notice");
      const contractLink = chain.links.find(
        (link) => link.stage === "contract",
      );

      if (noticeNumber && noticeLink?.refs.noticeId) {
        const notice = notices.find(
          (item) => String(item.id) === String(noticeLink.refs.noticeId),
        );

        if (!notice) {
          throw new Error("Извещение не найдено в текущей загрузке");
        }

        await api.patch(`/notices/${noticeLink.refs.noticeId}`, {
          generalInfo: { ...notice.generalInfo, noticeNumber },
        });
      }

      if (contractRegistryNumber && contractLink?.refs.contractId) {
        await api.patch(`/contractRegistry/${contractLink.refs.contractId}`, {
          eisRegistryNumber: contractRegistryNumber,
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notices"] }),
        queryClient.invalidateQueries({ queryKey: ["contractRegistry"] }),
      ]);
    },
    onSettled: () => setSavingKey(""),
  });

  return (
    <main className={block()}>
      <header className={block("header")}>
        <div>
          <h1 className={block("title")}>Сквозная цепочка закупки</h1>
          <p className={block("subtitle")}>
            Позиция плана-графика → все её извещения → контракты (включая
            расторгнутые и перезаключённые) → оплата по ИКЗ → сведения СМП.
            Разрывы показываются отдельно, номера ЕИС сохраняются в исходные
            записи.
          </p>
        </div>
        <div className={block("summary")}>
          <span>Всего цепочек: {summary.total}</span>
          <span>Пройдено полностью: {summary.completed}</span>
          <span>С разрывами: {summary.withIssues}</span>
        </div>
      </header>

      <div className={block("toolbar")}>
        <input
          className={block("search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по ИКЗ, номеру закупки, извещению, реестровому номеру"
        />
      </div>

      {visibleChains.length === 0 ? (
        <p className={block("empty")}>
          Цепочек не найдено. Проверьте, что у закупок заполнены номер закупки и
          ИКЗ, а извещения и контракты связаны с позицией плана-графика.
        </p>
      ) : (
        <div className={block("list")}>
          {visibleChains.map((chain) => (
            <ChainCard
              key={chain.key}
              chain={chain}
              block={block}
              saving={savingKey === chain.key}
              onSave={(payload) => {
                setSavingKey(chain.key);
                saveIdentifiers.mutate(payload);
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
