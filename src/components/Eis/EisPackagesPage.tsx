import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useContractRegistry } from "../../services/ContractRegistry/contractRegistry.api";
import {
  describeEisError,
  EIS_GATEWAY_URL,
  useCreateAcceptanceEisPackage,
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
  isEisDomainBuildType,
  isEisPlaceholderOnlyType,
  isIkz,
  type EisDocumentType,
  type EisPackageCustomerSnapshot,
  type EisPackageSource,
} from "../../services/Eis/eisPackages.schema";
import { useAcceptances } from "../../services/Acceptance/acceptance.api";
import {
  acceptanceStatusLabels,
  acceptedAcceptanceStatuses,
} from "../ContractAcceptance/acceptance.config";
import { useNotices } from "../../services/Procurements/noticeInfo.api";
import { useOrganizationContractProjects } from "../../services/ContractProject/contractProject.api";
import {
  buildContractProjectXmlPreview,
  buildNotification2020XmlPreview,
  validateContractProjectEis17,
  validateNoticeInfoEis17,
} from "../../services/Eis/eis17Types";
import { isEmbeddedBrowser } from "../../services/Eds/edsEnvironment";
import {
  eisNoticeBlockingIssues,
  eisNoticeReadiness,
  eisNoticeReadinessError,
  eisNoticeReadinessSummary,
} from "../../services/Eis/eisNoticeReadiness";
import EisPackageCard from "./EisPackageCard";
import styles from "./EisPackagesPage.module.scss";
import Select from "../UI/Select";

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
  const createAcceptancePackage = useCreateAcceptanceEisPackage();
  // Приёмки берём из csms-api: ContractExecution собирается из доменного
  // документа, а не из XML, нарисованного в браузере
  const { data: acceptances = [] } = useAcceptances(
    organization ? String(organization.id) : undefined,
  );
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

  // Карточка контракта может прислать сюда с уже выбранным контрактом и видом
  // сведений: «Отправить сведения об исполнении» из карточки не должна
  // заставлять человека искать тот же контракт в списке заново
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContractId = searchParams.get("contractId") ?? "";
  const urlDocumentType = searchParams.get("documentType") ?? "";

  // Вид сведений: из адреса (переход из карточки контракта) либо выбранный
  // человеком. Отдельное «переопределение» вместо состояния позволяет
  // подхватить новую ссылку без setState в эффекте
  const [documentTypeOverride, setDocumentTypeOverride] =
    useState<EisDocumentType | null>(null);
  const documentType =
    documentTypeOverride ??
    ((EIS_DOCUMENT_TYPES as readonly string[]).includes(urlDocumentType)
      ? (urlDocumentType as EisDocumentType)
      : "Notification");
  const [contractEisNumber, setContractEisNumber] = useState("");
  const [ikz, setIkz] = useState("");
  // Доменная сборка ContractExecution: приёмка и код вида документа ЕИС.
  // Код не подставляем константой — выдуманное значение ЕИС отклонит.
  const [pickedAcceptanceId, setPickedAcceptanceId] = useState("");
  const [acceptanceDocTypeCode, setAcceptanceDocTypeCode] = useState("");
  const domainBuild = isEisDomainBuildType(documentType);
  const placeholderOnly = isEisPlaceholderOnlyType(documentType);
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

  // Контракт, выбранный вручную или пришедший из карточки: без этого
  // переход «Отправить сведения об исполнении» открывал форму с пустыми полями
  const focusContract =
    contracts.find(
      (item) => String(item.id) === (pickedContractId || urlContractId),
    ) ?? null;
  // Реестровый номер ЕИС: у импортированных из ЕИС карточек `eisRegistryNumber`
  // пуст, а 19-значный `contractNumber` — это и есть реестровый номер. Без
  // подстановки форма открывалась с пустым номером и требовала ввода вручную
  const focusContractNumber = (() => {
    if (!focusContract) return "";
    const direct = focusContract.eisRegistryNumber ?? "";
    if (direct) return direct;
    const imported = focusContract.contractNumber ?? "";
    return isEisContractNumber(imported) ? imported : "";
  })();
  // Пакеты по контракту, из карточки которого пришли: остальные не прячем
  // навсегда — рядом есть кнопка «Показать все пакеты»
  const focusNumber = focusContractNumber;
  const visiblePackages = focusNumber
    ? packages.filter((item) => item.contractEisNumber === focusNumber)
    : packages;
  // Пока номера взяты из карточки, поля только для чтения: править их надо
  // там, где они живут, иначе по системе разъедутся две версии одного номера
  const numbersFromContract = focusContract !== null && !manualInput;
  // Эффективные значения: из карточки (выбранной или пришедшей по ссылке) либо
  // введённые руками. Так переход со страницы контракта сразу даёт готовую форму
  const effectiveNumber = numbersFromContract
    ? focusContractNumber
    : contractEisNumber;
  const effectiveIkz = numbersFromContract
    ? (focusContract?.ikz ?? "")
    : ikz;

  // Извещение и проект контракта — источники готового XML. Реестрового
  // номера контракта у них ещё нет, поэтому он не требуется.
  const pickedNotice =
    notices.find((item) => String(item.id) === pickedNoticeId) ?? null;
  const pickedProject =
    contractProjects.find((item) => String(item.id) === pickedProjectId) ??
    null;
  const withPayload = isEisDocumentTypeWithPayload(documentType);

  // Готовность Раздела 2 извещения: та же проверка, что блокирует публикацию.
  // Считается на каждый рендер, а не в состоянии: правки в извещении приходят
  // из кэша запросов, и устаревшая копия готовности пропустила бы неполный
  // документ в ЕИС. Проверка дешёвая — семь категорий и список вложений.
  const noticeReadiness =
    documentType === "Notification" && pickedNotice
      ? eisNoticeReadiness(pickedNotice)
      : null;

  // Приёмки, из которых шлюз соберёт сведения об исполнении. Только принятые:
  // на остальных он сам вернёт 409, и показывать их как выбор нечестно.
  // Если в форму пришли из карточки контракта, его приёмки — первыми.
  const exportableAcceptances = useMemo(() => {
    const allowed = acceptances.filter((item) =>
      acceptedAcceptanceStatuses.includes(item.status),
    );
    const contractId = focusContract ? String(focusContract.id) : "";

    if (!contractId) {
      return allowed;
    }

    return [
      ...allowed.filter((item) => String(item.input.contractId) === contractId),
      ...allowed.filter((item) => String(item.input.contractId) !== contractId),
    ];
  }, [acceptances, focusContract]);
  const pickedAcceptance =
    exportableAcceptances.find((item) => item.id === pickedAcceptanceId) ?? null;

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

  // Предзаполнение из адреса уже учтено в effectiveNumber/effectiveIkz:
  // setState в эффекте здесь не нужен и вызывал бы лишний рендер

  async function create() {
    setFormError("");

    // ContractExecution: пакет собирает шлюз из доменного документа приёмки.
    // Фронт не рисует XML — иначе получилось бы второе, «браузерное»,
    // представление принятого документа, расходящееся с подтверждённым.
    if (domainBuild) {
      if (!pickedAcceptance) {
        setFormError(
          "Выберите принятый документ о приёмке: сведения об исполнении шлюз собирает из него, а не из введённых вручную номеров.",
        );

        return;
      }

      if (!acceptanceDocTypeCode.trim()) {
        setFormError(
          "Укажите код вида документа из справочника ЕИС (nsiEPDocTypes). " +
            "XSD 17.0 требует его в документе о приёмке, а сам код берётся из справочника — подставлять его наугад нельзя.",
        );

        return;
      }

      try {
        await createAcceptancePackage.mutateAsync({
          acceptanceId: pickedAcceptance.id,
          documentTypeCode: acceptanceDocTypeCode.trim(),
          customerSpzRegNum: organization?.consRegistryNum || undefined,
          deliveryAcceptDate: pickedAcceptance.input.documentDate ?? undefined,
        });

        setPickedAcceptanceId("");
        setAcceptanceDocTypeCode("");
        setPickedContractId("");
        setManualInput(false);
      } catch (caught) {
        setFormError(describeEisError(caught));
      }

      return;
    }

    if (documentType === "Notification" && !pickedNotice) {
      setFormError("Выберите сохранённое извещение — из него собирается XML.");
      return;
    }
    // Раздел 2 извещения проверяется до сборки XML: без утверждённых ООЗ,
    // обоснования НМЦК и проекта контракта ЕИС отклонит документ, а подпись
    // под исправленным извещением станет второй. Проверка та же, что и при
    // публикации (`noticeAttachmentReadiness`), — правила не дублируются.
    // Шлюз проверяет то же самое по `attachmentBlockingIssues` и вернул бы
    // 409, но человеку нужен ответ до подписи, а не после отказа.
    if (noticeReadiness && !noticeReadiness.ok) {
      setFormError(eisNoticeReadinessError(noticeReadiness));
      return;
    }
    if (documentType === "ContractProject" && !pickedProject) {
      setFormError("Выберите проект контракта — из него собирается XML.");
      return;
    }

    if (!withPayload && !isEisContractNumber(effectiveNumber)) {
      setFormError(
        `Реестровый номер контракта в ЕИС — ${EIS_CONTRACT_NUMBER_LENGTH} цифр ` +
          `(например, 0373100000123000001). Сейчас введено «${effectiveNumber}». ` +
          "Без него ЕИС не поймёт, к какому контракту относятся сведения. " +
          (focusContract
            ? "Заполните его в карточке контракта, блок «Реквизиты для ЕИС»."
            : ""),
      );

      return;
    }

    if (!isIkz(effectiveIkz)) {
      setFormError(
        `ИКЗ — ${IKZ_LENGTH} разрядов, сейчас ${effectiveIkz.trim().length}. ` +
          "Код берут из карточки закупки; в ЕИС без него не поймут, к какой " +
          "закупке относятся сведения." +
          (focusContract
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
        contractEisNumber: effectiveNumber.trim(),
        ikz: effectiveIkz.trim(),
        payloadXml,
        source,
        customer,
        // Документы и снимок проверки уходят вместе с XML: шлюз возвращает их
        // в карточке пакета, и через месяц видно, с каким Разделом 2 ушло
        // извещение — даже если извещение с тех пор правили
        attachments: noticeReadiness?.attachments,
        attachmentReadiness: noticeReadiness ?? undefined,
        // Плоский список блокирующих замечаний — то поле, которое шлюз уже
        // проверяет сам (409 на непустой список). Отправляется и пустым:
        // наличие поля означает «Раздел 2 проверен»
        attachmentBlockingIssues: noticeReadiness
          ? eisNoticeBlockingIssues(noticeReadiness)
          : undefined,
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
        схемам ЕИС 17.0: в пакет попадают и вложения (файлы, описания, размеры,
        отпечатки, коды видов документов).{" "}
        <b>Сведения об исполнении</b> собирает шлюз из принятого документа о
        приёмке — фронт передаёт только ссылку на него. Для сведений СМП
        доменного маппера пока нет: содержимое собирается черновым форматом
        (placeholder), и это помечено в карточке. Ответы ЕИС имитируются, подпись,
        статусы, ошибки ФЛК и журнал работают по-настоящему.
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
            <Select
              className={block("select")}
              value={documentType}
              onChange={(event) =>
                setDocumentTypeOverride(event.target.value as EisDocumentType)
              }
            >
              {EIS_DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {eisDocumentTypeLabels[type]}
                </option>
              ))}
            </Select>
          </label>

          <label className={block("field")}>
            <span className={block("label")}>
              {withPayload
                ? "Документ CSMS — источник XML"
                : domainBuild
                  ? "Принятый документ о приёмке"
                  : "Контракт (номер ЕИС и ИКЗ подставятся из карточки)"}
            </span>
            {withPayload ? (
              <Select
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
              </Select>
            ) : domainBuild ? (
              <Select
                className={block("select")}
                value={pickedAcceptanceId}
                onChange={(event) => {
                  setPickedAcceptanceId(event.target.value);
                  setFormError("");
                }}
              >
                <option value="">— не выбран —</option>
                {exportableAcceptances.map((acceptance) => (
                  <option key={acceptance.id} value={acceptance.id}>
                    № {acceptance.input.documentNumber ?? "б/н"} ·{" "}
                    {acceptance.input.contractNumber} ·{" "}
                    {acceptanceStatusLabels[acceptance.status]} ·{" "}
                    {acceptance.totalWithVat.toLocaleString("ru-RU")} ₽
                  </option>
                ))}
              </Select>
            ) : (
              <Select
                className={block("select")}
                value={
                  pickedContractId ||
                  (focusContract ? String(focusContract.id) : "")
                }
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
              </Select>
            )}
          </label>
        </div>

        {/* Готовность Раздела 2 показывается до сборки XML: человек видит и
            причины блокировки, и то, какие документы реально уйдут в ЕИС */}
        {noticeReadiness && (
          <div className={block(noticeReadiness.ok ? "source" : "error")}>
            {noticeReadiness.ok ? (
              <>
                Раздел 2 проверен: {eisNoticeReadinessSummary(noticeReadiness)}.
                {noticeReadiness.warnings.length > 0 && (
                  <>
                    {" "}
                    Предупреждения не блокируют передачу — ЕИС отклоняет документ
                    только по ошибкам:{" "}
                    {noticeReadiness.warnings
                      .map((issue) => issue.message)
                      .join(" ")}
                  </>
                )}
              </>
            ) : (
              <>
                <b>Извещение не готово к передаче в ЕИС.</b> Проверка та же, что и
                при публикации: блокирующих замечаний{" "}
                {noticeReadiness.blocking.length}.
                {noticeReadiness.blocking.map((issue) => (
                  <div key={issue.message}>{issue.message}</div>
                ))}
              </>
            )}
            {pickedNotice?.procurementId ? (
              <div>
                <Link
                  className={block("link-button")}
                  to={`/procurement-processing/${pickedNotice.procurementId}/notice-info`}
                >
                  Открыть извещение и Раздел 2
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {domainBuild ? (
          <div className={block("form-row")}>
            <label className={block("field")}>
              <span className={block("label")}>
                Код вида документа ЕИС (nsiEPDocTypes)
              </span>
              <input
                className={block("input")}
                value={acceptanceDocTypeCode}
                onChange={(event) =>
                  setAcceptanceDocTypeCode(event.target.value.slice(0, 10))
                }
                placeholder="код из справочника, до 10 символов"
                maxLength={10}
              />
            </label>
            <div className={block("source")}>
              {pickedAcceptance
                ? `Контракт ${pickedAcceptance.input.contractNumber} · реестровый номер ${
                    pickedAcceptance.input.eisRegistryNumber ?? "не указан"
                  } · ИКЗ ${pickedAcceptance.input.ikz ?? "не указан"} — эти значения шлюз берёт из приёмки.`
                : "Номер контракта, ИКЗ и реестровый номер шлюз берёт из принятого документа — вручную их не вводим."}
            </div>
          </div>
        ) : (
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
                value={numbersFromContract ? effectiveNumber : contractEisNumber}
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
              value={numbersFromContract ? effectiveIkz : ikz}
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
        )}

        {!domainBuild && numbersFromContract && (
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

        {!domainBuild && manualInput && (
          <div className={block("source")}>
            Номера введены вручную и не связаны с карточкой контракта: если там
            их исправят, пакет об этом не узнает.
          </div>
        )}

        {domainBuild && exportableAcceptances.length === 0 && (
          <div className={block("source")}>
            Принятых документов о приёмке нет. Сведения об исполнении можно
            выгрузить только после того, как приёмка принята или принята с
            расхождениями — черновик ЕИС не примет.
          </div>
        )}

        {placeholderOnly && (
          <div className={block("source")}>
            Доменного маппера для сведений СМП в шлюзе пока нет: пакет соберётся
            черновой заготовкой, и это будет помечено в карточке. Рабочий путь
            сейчас — CSV-выгрузка на экране «ЕИС / СМП».
          </div>
        )}

        {formError && <div className={block("error")}>{formError}</div>}

        <div className={block("form-actions")}>
          <button
            type="submit"
            className={block("btn", ["primary"])}
            disabled={createPackage.isPending || createAcceptancePackage.isPending}
          >
            {createPackage.isPending || createAcceptancePackage.isPending
              ? "Создаю пакет…"
              : "Создать пакет"}
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

          {focusNumber && (
            <div className={block("summary")}>
              Пакеты по контракту {focusNumber}: {visiblePackages.length}{" "}
              <button
                type="button"
                className={block("link-button")}
                onClick={() => {
                  setSearchParams({});
                  setPickedContractId("");
                  setManualInput(false);
                }}
              >
                Показать все пакеты
              </button>
            </div>
          )}

          {focusNumber && visiblePackages.length === 0 && (
            <div className={block("empty")}>
              По этому контракту пакетов ещё нет. Создайте первый — номер ЕИС и
              ИКЗ уже подставлены из карточки.
            </div>
          )}

          <div className={block("list")}>
            {visiblePackages.map((item) => (
              <EisPackageCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
