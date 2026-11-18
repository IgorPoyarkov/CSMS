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
  IKZ_LENGTH,
  digitsOnly,
  eisDocumentTypeLabels,
  isEisContractNumber,
  isIkz,
  type EisDocumentType,
} from "../../services/Eis/eisPackages.schema";
import { isEmbeddedBrowser } from "../../services/Eds/edsEnvironment";
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

  // Во встроенном браузере приложения плагина КриптоПро нет и быть не может.
  // Об этом честнее сказать сразу, чем дать человеку нажать «Подписать»
  // и получить стену диагностики, которая к его случаю не относится
  const embeddedBrowser = isEmbeddedBrowser();
  const currentUrl = typeof window === "undefined" ? "" : window.location.href;

  const [documentType, setDocumentType] =
    useState<EisDocumentType>("SmpAttraction");
  const [contractEisNumber, setContractEisNumber] = useState("");
  const [ikz, setIkz] = useState("");
  // Выбранная карточка контракта: из неё берутся оба номера. Ручной ввод —
  // исключение (контракт ещё не заведён), поэтому он включается отдельно
  const [pickedContractId, setPickedContractId] = useState("");
  const [manualInput, setManualInput] = useState(false);
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

  const pickedContract =
    contracts.find((item) => String(item.id) === pickedContractId) ?? null;
  // Пока номера взяты из карточки, поля только для чтения: править их надо
  // там, где они живут, иначе по системе разъедутся две версии одного номера
  const numbersFromContract = pickedContract !== null && !manualInput;

  const pickContract = (contractId: string) => {
    const contract = contracts.find(
      (item) => String(item.id) === String(contractId),
    );

    setPickedContractId(contractId);
    setManualInput(false);
    setFormError("");

    // Оба номера — свойства контракта, а не пакета: человек не должен
    // вводить их заново на каждое сведение
    setContractEisNumber(contract?.eisRegistryNumber ?? "");
    setIkz(contract?.ikz ?? "");
  };

  async function create() {
    setFormError("");

    if (!isEisContractNumber(contractEisNumber)) {
      setFormError(
        `Реестровый номер контракта в ЕИС — ${EIS_CONTRACT_NUMBER_LENGTH} цифр ` +
          `(например, 0373100000123000001). Сейчас введено «${contractEisNumber}». ` +
          "Без него ЕИС не поймёт, к какому контракту относятся сведения. " +
          (pickedContract
            ? "Заполните его в карточке контракта, блок «Реквизиты для ЕИС»."
            : ""),
      );

      return;
    }

    if (!isIkz(ikz)) {
      setFormError(
        `ИКЗ — ${IKZ_LENGTH} разрядов, сейчас ${ikz.trim().length}. ` +
          "Код берут из карточки закупки; в ЕИС без него не поймут, к какой " +
          "закупке относятся сведения." +
          (pickedContract
            ? " Исправьте ИКЗ в карточке контракта, блок «Реквизиты для ЕИС»."
            : ""),
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
      setIkz("");
      setPickedContractId("");
      setManualInput(false);
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

      {/* Встроенный браузер приложения: подписи здесь не будет ни при каком
          раскладе, и человек должен узнать это до нажатия кнопки */}
      {embeddedBrowser && (
        <div className={block("browser-notice")}>
          <b>Подписать здесь нельзя.</b> Вы открыли страницу во встроенном
          браузере приложения — расширения КриптоПро CAdES в нём нет. Откройте
          тот же адрес в Яндекс.Браузере или Chrome (токен и сертификаты те же):{" "}
          <a className={block("browser-link")} href={currentUrl}>
            {currentUrl}
          </a>
        </div>
      )}

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
              Контракт (номер ЕИС и ИКЗ подставятся из карточки)
            </span>
            <select
              className={block("select")}
              value={pickedContractId}
              onChange={(event) => pickContract(event.target.value)}
            >
              <option value="">— не выбран —</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={String(contract.id)}>
                  {contract.contractNumber} · {contract.supplierName}
                  {contract.eisRegistryNumber
                    ? ` · ЕИС ${contract.eisRegistryNumber}`
                    : ""}
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
              className={block("input", numbersFromContract ? ["readonly"] : [])}
              value={contractEisNumber}
              onChange={(event) =>
                setContractEisNumber(
                  digitsOnly(event.target.value).slice(
                    0,
                    EIS_CONTRACT_NUMBER_LENGTH,
                  ),
                )
              }
              readOnly={numbersFromContract}
              placeholder="19 цифр, например 0373100000123000001"
              inputMode="numeric"
              maxLength={EIS_CONTRACT_NUMBER_LENGTH}
            />
          </label>

          <label className={block("field")}>
            <span className={block("label")}>ИКЗ</span>
            <input
              className={block("input", numbersFromContract ? ["readonly"] : [])}
              value={ikz}
              onChange={(event) =>
                setIkz(digitsOnly(event.target.value).slice(0, IKZ_LENGTH))
              }
              readOnly={numbersFromContract}
              placeholder={`${IKZ_LENGTH} разрядов`}
              inputMode="numeric"
              maxLength={IKZ_LENGTH}
            />
          </label>
        </div>

        {numbersFromContract && (
          <div className={block("source")}>
            Номера взяты из карточки контракта — исправлять их надо там, чтобы в
            системе не появилось двух версий одного номера.{" "}
            <button
              type="button"
              className={block("link-button")}
              onClick={() => setManualInput(true)}
            >
              Ввести вручную
            </button>
          </div>
        )}

        {manualInput && (
          <div className={block("source")}>
            Номера введены вручную и не связаны с карточкой контракта: если там
            их исправят, пакет об этом не узнает.
          </div>
        )}

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
          Пакетов пока нет. Создайте первый: выберите контракт — реестровый номер
          ЕИС и ИКЗ подставятся из его карточки.
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
