import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import {
  describeEisError,
  EIS_GATEWAY_URL,
  useCreateEisPackage,
  useEisPackages,
} from "../../services/Eis/eisPackages.api";
import {
  EIS_CONTRACT_NUMBER_LENGTH,
  EIS_DOCUMENT_TYPES,
  eisDocumentTypeLabels,
  isEisContractNumber,
  type EisDocumentType,
} from "../../services/Eis/eisPackages.schema";
import EisPackageCard from "./EisPackageCard";
import styles from "./EisPackagesPage.module.scss";

/**
 * Пакеты сведений для ЕИС.
 *
 * Здесь видно главное, чего не было в CSV: пакет не «скачался и всё», а идёт
 * по состояниям — подписан, отправлен, проверяется, принят или отклонён с
 * конкретными ошибками ФЛК. Отклонённый пакет возвращается в работу и
 * отправляется заново.
 *
 * Данные приходят из отдельного сервиса (csms-api), а не из json-server:
 * правила («нельзя отправить неподписанное», «нельзя принять без ответа ЕИС»)
 * живут там, чтобы их нельзя было обойти из браузера.
 */
export default function EisPackagesPage() {
  const { bem } = useUtils();
  const block = bem(styles, "eis-packages");

  const { data: organization } = useCurrentOrganization();
  const { data: contracts = [] } = useContractRegistry(organization?.id);
  const { data: packages = [], isPending, isError, error } = useEisPackages();
  const createPackage = useCreateEisPackage();

  const [documentType, setDocumentType] =
    useState<EisDocumentType>("SmpAttraction");
  const [contractEisNumber, setContractEisNumber] = useState("");
  const [ikz, setIkz] = useState("");
  const [formError, setFormError] = useState("");

  const summary = useMemo(() => {
    const accepted = packages.filter(
      (item) => item.status === "AcceptedInLk",
    ).length;
    const rejected = packages.filter(
      (item) => item.status === "RejectedByFlk",
    ).length;
    const inWork = packages.filter(
      (item) => item.status !== "AcceptedInLk" && item.status !== "RejectedByFlk",
    ).length;

    return { accepted, rejected, inWork };
  }, [packages]);

  const pickContract = (contractId: string) => {
    const contract = contracts.find(
      (item) => String(item.id) === String(contractId),
    );

    if (!contract) return;

    // ИКЗ берём из карточки контракта, чтобы не вбивать вручную.
    // Реестровый номер ЕИС при этом остаётся ручным: у нас его нет —
    // это отдельная задача, записанная в docs/eis-open-questions.md
    setIkz(contract.ikz ?? "");
  };

  async function create() {
    setFormError("");

    if (!isEisContractNumber(contractEisNumber)) {
      setFormError(
        `Реестровый номер контракта в ЕИС — ${EIS_CONTRACT_NUMBER_LENGTH} цифр ` +
          `(например, 0373100000123000001). Сейчас введено «${contractEisNumber}». ` +
          "Без него ЕИС не поймёт, к какому контракту относятся сведения.",
      );

      return;
    }

    try {
      await createPackage.mutateAsync({
        documentType,
        contractEisNumber: contractEisNumber.trim(),
        ikz: ikz.trim(),
      });

      setContractEisNumber("");
    } catch (caught) {
      setFormError(describeEisError(caught));
    }
  }

  return (
    <section className={block()}>
      <h2 className={block("title")}>Пакеты ЕИС</h2>

      <p className={block("lead")}>
        Пакет — это документ, который подписывается вашей ЭП и уходит в ЕИС, а
        потом живёт по состояниям: подписан → отправлен → проверка ФЛК → принят
        или отклонён. Здесь видно, где он сейчас и что ответил портал, вместо
        файла, который человек несёт в личный кабинет руками.
      </p>

      <div className={block("notice")}>
        <b>Пока режим заглушки.</b> Содержимое собирается черновым форматом
        (placeholder), ответы ЕИС имитируются — это честно помечено в каждой
        карточке. Подпись, статусы, ошибки ФЛК и журнал работают по-настоящему.
        Когда появится Альбом форматов ЕИС, поменяется только начинка шлюза, а
        этот экран — нет.
      </div>

      <form
        className={block("create")}
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <div className={block("form-row")}>
          <label className={block("field")}>
            <span className={block("label")}>Что отправляем</span>
            <select
              className={block("select")}
              value={documentType}
              onChange={(event) =>
                setDocumentType(event.target.value as EisDocumentType)
              }
            >
              {EIS_DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {eisDocumentTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label className={block("field")}>
            <span className={block("label")}>
              Контракт в системе (подскажет ИКЗ)
            </span>
            <select
              className={block("select")}
              defaultValue=""
              onChange={(event) => pickContract(event.target.value)}
            >
              <option value="">— не выбран —</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={String(contract.id)}>
                  {contract.contractNumber} · {contract.supplierName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={block("form-row")}>
          <label className={block("field")}>
            <span className={block("label")}>
              Реестровый номер контракта в ЕИС
            </span>
            <input
              className={block("input")}
              value={contractEisNumber}
              onChange={(event) => setContractEisNumber(event.target.value)}
              placeholder="19 цифр, например 0373100000123000001"
              inputMode="numeric"
              maxLength={EIS_CONTRACT_NUMBER_LENGTH}
            />
          </label>

          <label className={block("field")}>
            <span className={block("label")}>ИКЗ</span>
            <input
              className={block("input")}
              value={ikz}
              onChange={(event) => setIkz(event.target.value)}
              placeholder="Идентификатор закупки"
            />
          </label>
        </div>

        {formError && <div className={block("error")}>{formError}</div>}

        <div className={block("form-actions")}>
          <button
            type="submit"
            className={block("btn", ["primary"])}
            disabled={createPackage.isPending}
          >
            {createPackage.isPending ? "Создаю пакет…" : "Создать пакет"}
          </button>
          <span className={block("hint")}>Шлюз: {EIS_GATEWAY_URL}</span>
        </div>
      </form>

      {isPending && <div className={block("empty")}>Загружаю пакеты…</div>}

      {isError && (
        <div className={block("error")}>
          {describeEisError(error)}
          <br />
          Без запущенного шлюза этот экран работать не может — в отличие от
          остальной системы, здесь данные не в json-server.
        </div>
      )}

      {!isPending && !isError && packages.length === 0 && (
        <div className={block("empty")}>
          Пакетов пока нет. Создайте первый — номер контракта ЕИС можно взять в
          личном кабинете.
        </div>
      )}

      {packages.length > 0 && (
        <>
          <div className={block("summary")}>
            Всего: {packages.length} · принято: {summary.accepted} · отклонено:{" "}
            {summary.rejected} · в работе: {summary.inWork}
          </div>

          <div className={block("list")}>
            {packages.map((item) => (
              <EisPackageCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
