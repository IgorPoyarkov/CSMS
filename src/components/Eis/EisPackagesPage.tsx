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
  isEisDocumentTypeWithPayload,
  isIkz,
  type EisDocumentType,
  type EisPackageCustomerSnapshot,
  type EisPackageSource,
} from "../../services/Eis/eisPackages.schema";
import { useNotices } from "../../services/Procurements/noticeInfo.api";
import { useOrganizationContractProjects } from "../../services/ContractProject/contractProject.api";
import {
  buildContractProjectXmlPreview,
  buildNotification2020XmlPreview,
  validateContractProjectEis17,
  validateNoticeInfoEis17,
} from "../../services/Eis/eis17Types";
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
  // Документы CSMS, из которых собирается готовый XML пакета
  const { data: notices = [] } = useNotices();
  const { data: contractProjects = [] } = useOrganizationContractProjects(
    organization?.id ?? 1,
  );

  // Во встроенном браузере приложения плагина КриптоПро нет и быть не может.
  // Об этом честнее сказать сразу, чем дать человеку нажать «Подписать»
  // и получить стену диагностики, которая к его случаю не относится
  const embeddedBrowser = isEmbeddedBrowser();
  const currentUrl = typeof window === "undefined" ? "" : window.location.href;

  const [documentType, setDocumentType] =
    useState<EisDocumentType>("Notification");
  const [contractEisNumber, setContractEisNumber] = useState("");
  const [ikz, setIkz] = useState("");
  // Документ-источник для типов с готовым XML
  const [pickedNoticeId, setPickedNoticeId] = useState("");
  const [pickedProjectId, setPickedProjectId] = useState("");
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
      (item) =>
        item.status !== "AcceptedInLk" && item.status !== "RejectedByFlk",
    ).length;

    return { accepted, rejected, inWork };
  }, [packages]);

  const pickedContract =
    contracts.find((item) => String(item.id) === pickedContractId) ?? null;
  // Пока номера взяты из карточки, поля только для чтения: править их надо
  // там, где они живут, иначе по системе разъедутся две версии одного номера
  const numbersFromContract = pickedContract !== null && !manualInput;

  // Извещение и проект контракта — источники готового XML. Реестрового
  // номера контракта у них ещё нет, поэтому он не требуется.
  const pickedNotice =
    notices.find((item) => String(item.id) === pickedNoticeId) ?? null;
  const pickedProject =
    contractProjects.find((item) => String(item.id) === pickedProjectId) ??
    null;
  const withPayload = isEisDocumentTypeWithPayload(documentType);

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

  const pickNotice = (noticeId: string) => {
    const notice = notices.find((item) => String(item.id) === String(noticeId));

    setPickedNoticeId(noticeId);
    setFormError("");
    setIkz(notice?.generalInfo.ikz ?? "");
  };

  const pickProject = (projectId: string) => {
    const project = contractProjects.find(
      (item) => String(item.id) === String(projectId),
    );

    setPickedProjectId(projectId);
    setFormError("");
    setIkz(project?.ikz ?? "");
  };

  async function create() {
    setFormError("");

    if (documentType === "Notification" && !pickedNotice) {
      setFormError("Выберите сохранённое извещение — из него собирается XML.");
      return;
    }
    if (documentType === "ContractProject" && !pickedProject) {
      setFormError("Выберите проект контракта — из него собирается XML.");
      return;
    }

    if (!withPayload && !isEisContractNumber(contractEisNumber)) {
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

    // Ф3: прогоняем документ по проверкам XSD 17.0 до создания пакета.
    // Иначе ЕИС вернёт те же ошибки уже после подписания, и пакет придётся
    // переделывать — а подпись под исправленным документом станет второй.
    //
    // Валидатор работает по разобранному документу: у старых проектов контракта
    // блока eisInfo может не быть вовсе. Тогда проверка не должна ронять
    // создание пакета — пусть отвечает шлюз, у него те же данные.
    let eisValidation: ReturnType<typeof validateNoticeInfoEis17> | null = null;

    try {
      eisValidation =
        documentType === "Notification" && pickedNotice
          ? validateNoticeInfoEis17(pickedNotice)
          : documentType === "ContractProject" && pickedProject
            ? validateContractProjectEis17(pickedProject)
            : null;
    } catch {
      eisValidation = null;
    }

    if (eisValidation && eisValidation.errorsCount > 0) {
      const errors = eisValidation.issues.filter(
        (issue) => issue.severity === "error",
      );
      const shown = errors
        .slice(0, 3)
        .map((issue) => `${issue.field}: ${issue.message}`)
        .join(" ");

      setFormError(
        `Документ не готов к выгрузке в ЕИС 17.0 (ошибок: ${eisValidation.errorsCount}). ` +
          shown +
          (errors.length > 3 ? ` … и ещё ${errors.length - 3}.` : ""),
      );

      return;
    }

    try {
      const payloadXml =
        documentType === "Notification" && pickedNotice
          ? buildNotification2020XmlPreview(pickedNotice)
          : documentType === "ContractProject" && pickedProject
            ? buildContractProjectXmlPreview(pickedProject)
            : undefined;

      // Ф8: фиксируем документ-источник и снимок заказчика. Шлюз начнёт их
      // читать после Б4 — до этого он просто игнорирует лишние поля, а пакет
      // уже несёт ссылку на документ, из которого собран XML
      const source: EisPackageSource | undefined =
        documentType === "Notification" && pickedNotice
          ? { documentKind: "Notice", documentId: String(pickedNotice.id) }
          : documentType === "ContractProject" && pickedProject
            ? {
                documentKind: "ContractProject",
                documentId: String(pickedProject.id),
              }
            : undefined;

      const customer: EisPackageCustomerSnapshot | undefined = organization
        ? {
            fullName: organization.fullName || undefined,
            shortName: organization.shortName || undefined,
            inn: organization.inn || undefined,
            kpp: organization.kpp || undefined,
            okopf: organization.okopf || undefined,
            okfs: organization.okfs || undefined,
            oktmo: organization.oktmo || undefined,
            oktmoPpo: organization.oktmoPpo || undefined,
          }
        : undefined;

      await createPackage.mutateAsync({
        documentType,
        contractEisNumber: contractEisNumber.trim(),
        ikz: ikz.trim(),
        payloadXml,
        source,
        customer,
      });

      setContractEisNumber("");
      setIkz("");
      setPickedContractId("");
      setPickedNoticeId("");
      setPickedProjectId("");
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
        <b>Извещение и проект контракта собираются из документов CSMS</b> по
        схемам ЕИС 17.0. Для сведений СМП и исполнения контракта содержимое пока
        собирается черновым форматом (placeholder) — это честно помечено в
        карточке. Ответы ЕИС имитируются, подпись, статусы, ошибки ФЛК и журнал
        работают по-настоящему.
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
              {withPayload
                ? "Документ CSMS — источник XML"
                : "Контракт (номер ЕИС и ИКЗ подставятся из карточки)"}
            </span>
            {withPayload ? (
              <select
                className={block("select")}
                value={
                  documentType === "Notification"
                    ? pickedNoticeId
                    : pickedProjectId
                }
                onChange={(event) =>
                  documentType === "Notification"
                    ? pickNotice(event.target.value)
                    : pickProject(event.target.value)
                }
              >
                <option value="">— не выбран —</option>
                {documentType === "Notification"
                  ? notices.map((notice) => (
                      <option key={notice.id} value={String(notice.id)}>
                        № {notice.generalInfo.noticeNumber ?? "б/н"} ·{" "}
                        {notice.generalInfo.orderName}
                      </option>
                    ))
                  : contractProjects.map((project) => (
                      <option key={project.id} value={String(project.id)}>
                        {project.contractName || "Проект контракта"} ·{" "}
                        {project.ikz || "без ИКЗ"}
                      </option>
                    ))}
              </select>
            ) : (
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
            )}
          </label>
        </div>

        <div className={block("form-row")}>
          {!withPayload && (
            <label className={block("field")}>
              <span className={block("label")}>
                Реестровый номер контракта в ЕИС
              </span>
              <input
                className={block(
                  "input",
                  numbersFromContract ? ["readonly"] : [],
                )}
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
          )}

          <label className={block("field")}>
            <span className={block("label")}>ИКЗ</span>
            <input
              className={block(
                "input",
                numbersFromContract ? ["readonly"] : [],
              )}
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
          Пакетов пока нет. Создайте первый: выберите контракт — реестровый
          номер ЕИС и ИКЗ подставятся из его карточки.
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
