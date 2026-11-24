import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  useCurrentOrganization,
  useOrganizations,
} from "../../services/Organization/organization.api";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import { useEdsCertificates } from "../../services/Eds/eds.api";
import { certificateStateOn } from "../../services/Eds/eds.schema";
import { downloadText } from "../../services/Eis/eisExport";
import { exportEisTestAccessToDocx } from "../../services/Eis/eisTestAccessExport";
import EdsFileSigner from "../Eds/EdsFileSigner";
import {
  buildEisTestAccessRequestText,
  createEmptyEisTestAccessRequest,
  EIS_TEST_ACCESS_CHANNELS,
  EIS_TEST_ACCESS_CHECKS,
  EIS_TEST_ACCESS_VERIFY_ITEMS,
  eisTestAccessStatusLabels,
  type EisTestAccessRequest,
  type EisTestAccessStatus,
} from "../../services/Eis/eisTestAccess.schema";
import {
  useEisTestAccessRequests,
  useSaveEisTestAccessRequest,
} from "../../services/Eis/eisTestAccess.api";
import styles from "./EisTestAccessPage.module.scss";

const TODAY = new Date().toISOString().slice(0, 10);

// Значения по умолчанию для описания системы и цели обращения: они же
// используются, когда черновик подмешивается к данным организации.
const EMPTY_REQUEST = createEmptyEisTestAccessRequest();

// Статус отображается текстом; цветовую тональность определяем по готовности чеклиста.

function downloadRequest(request: EisTestAccessRequest, text: string) {
  const safeName = (request.contractorInn || "eis-test-access").replace(/[^\dA-Za-z_-]/g, "_");
  downloadText(text, `obraschenie-eis-test-dostup-${safeName}.txt`, "text/plain;charset=utf-8");
}

export default function EisTestAccessPage() {
  const { bem } = useUtils();
  const block = bem(styles, "eis-test-access");

  const { data: currentOrganization } = useCurrentOrganization();
  const { data: currentUser } = useFetchCurrentUser();
  const { data: organizations = [] } = useOrganizations();
  const organization = useMemo(() => {
    if (currentOrganization) return currentOrganization;
    const byUser = organizations.find(
      (item) => String(item.id) === String(currentUser?.organizationId ?? ""),
    );
    return byUser ?? organizations[0];
  }, [currentOrganization, organizations, currentUser?.organizationId]);

  const { data: certificates = [] } = useEdsCertificates(organization?.id);
  const { data: savedRequests = [] } = useEisTestAccessRequests();
  const saveRequest = useSaveEisTestAccessRequest();

  const [request, setRequest] = useState<EisTestAccessRequest>(() =>
    createEmptyEisTestAccessRequest(),
  );
  const [saveMessage, setSaveMessage] = useState("");

  const activeCertificates = useMemo(
    () =>
      certificates.filter((certificate) => {
        const state = certificateStateOn(certificate, TODAY);
        return state === "active" || state === "expiring";
      }),
    [certificates],
  );

  const latestSaved = savedRequests[0];

  // Черновик, организация и сертификаты приходят асинхронно и в разном порядке.
  // Ключ источника позволяет один раз подмешать их во время рендера — вместо
  // эффектов с setState и гонки между тремя запросами.
  const sourceKey = [
    latestSaved?.id ?? "",
    organization?.id ?? "",
    activeCertificates.length,
  ].join("|");
  const [appliedSourceKey, setAppliedSourceKey] = useState<string | null>(null);

  if (sourceKey !== appliedSourceKey && (latestSaved || organization)) {
    setAppliedSourceKey(sourceKey);

    const contractorInn =
      request.contractorInn || latestSaved?.contractorInn || organization?.inn || "";
    const systemDescription =
      latestSaved?.systemDescription?.trim() ||
      request.systemDescription?.trim() ||
      EMPTY_REQUEST.systemDescription;

    setRequest({
      ...request,
      ...(latestSaved ?? {}),
      contractorInn,
      contractorName:
        request.contractorName ||
        latestSaved?.contractorName ||
        organization?.fullName ||
        organization?.shortName ||
        "",
      contractorShortName:
        request.contractorShortName ||
        latestSaved?.contractorShortName ||
        organization?.shortName ||
        "",
      contractorKpp:
        request.contractorKpp || latestSaved?.contractorKpp || organization?.kpp || "",
      contractorOgrn:
        request.contractorOgrn || latestSaved?.contractorOgrn || organization?.ogrn || "",
      contractorAddress:
        request.contractorAddress ||
        latestSaved?.contractorAddress ||
        organization?.legalAddress ||
        organization?.postalAddress ||
        "",
      contractorEmail:
        request.contractorEmail || latestSaved?.contractorEmail || organization?.email || "",
      contractorPhone:
        request.contractorPhone || latestSaved?.contractorPhone || organization?.phone || "",
      eisRegistryNumber:
        request.eisRegistryNumber ||
        latestSaved?.eisRegistryNumber ||
        organization?.registryNumber ||
        organization?.regNum ||
        "",
      contactName:
        request.contactName || latestSaved?.contactName || organization?.responsiblePerson || "",
      contactPhone:
        request.contactPhone ||
        latestSaved?.contactPhone ||
        organization?.responsiblePhone ||
        organization?.phone ||
        "",
      contactEmail:
        request.contactEmail || latestSaved?.contactEmail || organization?.email || "",
      systemName: request.systemName || latestSaved?.systemName || EMPTY_REQUEST.systemName,
      systemDescription,
      purpose: request.purpose || latestSaved?.purpose || EMPTY_REQUEST.purpose,
      checkInn: Boolean(request.checkInn || latestSaved?.checkInn || contractorInn),
      checkOrg: Boolean(
        request.checkOrg ||
          latestSaved?.checkOrg ||
          organization?.fullName ||
          organization?.shortName,
      ),
      checkCertificate: Boolean(
        request.checkCertificate || latestSaved?.checkCertificate || activeCertificates.length,
      ),
      checkSystemDescription: Boolean(
        request.checkSystemDescription ||
          latestSaved?.checkSystemDescription ||
          systemDescription,
      ),
      checkEisRegistration: Boolean(
        request.checkEisRegistration ||
          latestSaved?.checkEisRegistration ||
          organization?.registryNumber ||
          organization?.regNum,
      ),
    });
  }

  // Текст обращения выводится из полей формы. Ручная правка живёт в textState,
  // а смена любого поля заново генерирует текст — без эффекта с setState.
  const generatedRequestText = buildEisTestAccessRequestText(request);
  const [textState, setTextState] = useState(() => ({
    source: generatedRequestText,
    value: generatedRequestText,
  }));

  if (textState.source !== generatedRequestText) {
    setTextState({ source: generatedRequestText, value: generatedRequestText });
  }
  const requestText = textState.value;

  function editRequestText(value: string) {
    setSaveMessage("");
    setTextState({ source: generatedRequestText, value });
  }

  function update<K extends keyof EisTestAccessRequest>(key: K, value: EisTestAccessRequest[K]) {
    setSaveMessage("");
    setRequest((current) => ({ ...current, [key]: value }));
  }

  const checks = useMemo(
    () => [
      { ...EIS_TEST_ACCESS_CHECKS[0], value: request.checkInn },
      { ...EIS_TEST_ACCESS_CHECKS[1], value: request.checkOrg },
      { ...EIS_TEST_ACCESS_CHECKS[2], value: request.checkCertificate },
      { ...EIS_TEST_ACCESS_CHECKS[3], value: request.checkSystemDescription },
      { ...EIS_TEST_ACCESS_CHECKS[4], value: request.checkEisRegistration },
    ],
    [request],
  );

  const missingChecks = checks.filter((check) => !check.value);

  async function save(status?: EisTestAccessStatus, patch: Partial<EisTestAccessRequest> = {}) {
    const next: EisTestAccessRequest = {
      ...request,
      ...patch,
      requestText,
      status: status ?? request.status,
      updatedAt: new Date().toISOString(),
      checkCertificate: request.checkCertificate || activeCertificates.length > 0,
    };
    setRequest(next);
    try {
      await saveRequest.mutateAsync(next);
      setSaveMessage(
        status === "prepared"
          ? "Обращение подготовлено и сохранено."
          : status === "signed"
            ? "Статус подписанного обращения сохранён."
            : status === "sent"
              ? "Отметка об отправке обращения сохранена."
              : "Черновик сохранён.",
      );
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Не удалось сохранить обращение.",
      );
    }
  }

  function markPrepared() {
    void save("prepared");
  }

  function markSigned() {
    void save("signed", {
      signedAt: new Date().toISOString(),
      signedBy: request.contactName,
    });
  }

  function markSent() {
    void save("sent");
  }

  async function downloadDocx() {
    try {
      const certificate = activeCertificates[0] ?? null;
      await exportEisTestAccessToDocx(request, certificate);
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "Не удалось сформировать Word-документ.",
      );
    }
  }

  const readinessTone = missingChecks.length === 0 ? "ok" : "warn";

  return (
    <div className={block()}>
      <h2 className={block("title")}>Обращение в ЕИС на тестовый доступ</h2>
      <p className={block("lead")}>
        Отдельный модуль для подготовки обращения на получение тестового доступа к ЕИС.
        Обращение формируется в CSMS, проверяется по чеклисту, скачивается файлом и
        подписывается ЭП на рабочем месте заказчика. Отдельного личного кабинета
        разработчика ЕИС нет: отправка выполняется через официальные каналы ЕИС.
      </p>

      <div className={block("layout")}>
        <div className={block("card")}>
          <h3 className={block("card-title")}>Данные организации / подрядчика</h3>
          <div className={block("grid")}>
            <label className={block("field", ["wide"])}>
              <span className={block("label")}>Полное наименование</span>
              <input className={block("input")} value={request.contractorName} onChange={(e) => update("contractorName", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>Краткое наименование</span>
              <input className={block("input")} value={request.contractorShortName ?? ""} onChange={(e) => update("contractorShortName", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>ИНН</span>
              <input className={block("input")} value={request.contractorInn} onChange={(e) => update("contractorInn", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>КПП</span>
              <input className={block("input")} value={request.contractorKpp ?? ""} onChange={(e) => update("contractorKpp", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>ОГРН</span>
              <input className={block("input")} value={request.contractorOgrn ?? ""} onChange={(e) => update("contractorOgrn", e.target.value)} />
            </label>
            <label className={block("field", ["wide"])}>
              <span className={block("label")}>Адрес</span>
              <input className={block("input")} value={request.contractorAddress ?? ""} onChange={(e) => update("contractorAddress", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>Email</span>
              <input className={block("input")} value={request.contractorEmail ?? ""} onChange={(e) => update("contractorEmail", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>Телефон</span>
              <input className={block("input")} value={request.contractorPhone ?? ""} onChange={(e) => update("contractorPhone", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>Реестровый номер в ЕИС</span>
              <input className={block("input")} value={request.eisRegistryNumber ?? ""} onChange={(e) => update("eisRegistryNumber", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>Раздел / контур ЕИС</span>
              <input className={block("input")} value={request.eisSection ?? ""} onChange={(e) => update("eisSection", e.target.value)} />
            </label>
          </div>

          <h3 className={block("card-title")}>Контактное лицо</h3>
          <div className={block("grid")}>
            <label className={block("field")}>
              <span className={block("label")}>ФИО</span>
              <input className={block("input")} value={request.contactName} onChange={(e) => update("contactName", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>Должность</span>
              <input className={block("input")} value={request.contactPosition ?? ""} onChange={(e) => update("contactPosition", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>Email</span>
              <input className={block("input")} value={request.contactEmail ?? ""} onChange={(e) => update("contactEmail", e.target.value)} />
            </label>
            <label className={block("field")}>
              <span className={block("label")}>Телефон</span>
              <input className={block("input")} value={request.contactPhone ?? ""} onChange={(e) => update("contactPhone", e.target.value)} />
            </label>
          </div>

          <h3 className={block("card-title")}>Данные обращения</h3>
          <div className={block("grid")}>
            <label className={block("field", ["wide"])}>
              <span className={block("label")}>Система</span>
              <input className={block("input")} value={request.systemName} onChange={(e) => update("systemName", e.target.value)} />
            </label>
            <label className={block("field", ["wide"])}>
              <span className={block("label")}>Краткое описание системы</span>
              <textarea
                className={block("textarea")}
                value={request.systemDescription ?? ""}
                onChange={(e) => update("systemDescription", e.target.value)}
                placeholder="Кратко опишите назначение CSMS, основные процессы и цель интеграции с ЕИС."
              />
            </label>
            <label className={block("field", ["wide"])}>
              <span className={block("label")}>Цель обращения</span>
              <input className={block("input")} value={request.purpose} onChange={(e) => update("purpose", e.target.value)} />
            </label>
          </div>

          <h3 className={block("card-title")}>Что проверяем на тестовом контуре</h3>
          <ul className={block("channels")}>
            {EIS_TEST_ACCESS_VERIFY_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className={block("actions")}>
            <button type="button" className={block("btn")} onClick={() => void save()}>
              Сохранить черновик
            </button>
            <button type="button" className={block("btn", ["primary"])} onClick={markPrepared}>
              Подготовить обращение
            </button>
            <button type="button" className={block("btn")} onClick={() => downloadRequest(request, requestText)}>
              Скачать текст обращения
            </button>
            <button type="button" className={block("btn")} onClick={() => void downloadDocx()}>
              Скачать Word (.docx)
            </button>
            <span className={block("small")}>
              Статус: {eisTestAccessStatusLabels[request.status]}
            </span>
          </div>
          {saveMessage && <div className={block("status", [readinessTone])}>{saveMessage}</div>}
        </div>

        <div className={block("card")}>
          <h3 className={block("card-title")}>Проверка готовности</h3>
          <div className={block("status", [readinessTone])}>
            {missingChecks.length === 0
              ? "Базовые проверки пройдены. Можно скачивать и подписывать обращение."
              : `Нужно проверить: ${missingChecks.map((check) => check.label.toLowerCase()).join("; ")}.`}
          </div>

          <div className={block("checklist")}>
            {checks.map((check) => (
              <label key={check.id} className={block("check")}>
                <input
                  type="checkbox"
                  checked={check.value}
                  onChange={(e) => update(
                    check.id === "inn"
                      ? "checkInn"
                      : check.id === "org"
                        ? "checkOrg"
                        : check.id === "certificate"
                          ? "checkCertificate"
                          : check.id === "system_description"
                            ? "checkSystemDescription"
                            : "checkEisRegistration",
                    e.target.checked,
                  )}
                />
                <span>
                  <span className={block("check-title")}>{check.label}</span>
                  <span className={block("check-hint")}>{check.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <p className={block("meta")}>
            Действующих сертификатов в реестре организации: {activeCertificates.length}.
            {organization?.inn ? ` ИНН организации: ${organization.inn}.` : ""}
          </p>

          <h3 className={block("card-title")}>Каналы обращения в ЕИС</h3>
          <ul className={block("channels")}>
            {EIS_TEST_ACCESS_CHANNELS.map((channel) => (
              <li key={channel.id}>
                <div>{channel.label}</div>
                {channel.kind === "url" ? (
                  <a className={block("channel-link")} href={channel.value} target="_blank" rel="noreferrer">
                    {channel.value}
                  </a>
                ) : channel.kind === "email" ? (
                  <a className={block("channel-link")} href={`mailto:${channel.value}`}>
                    {channel.value}
                  </a>
                ) : (
                  <span className={block("channel-hint")}>{channel.value}</span>
                )}
              </li>
            ))}
          </ul>
          <p className={block("hint")}>
            Отдельного личного кабинета разработчика ЕИС нет. После подписания файл
            обращения и подпись .sig направляются через форму обратной связи ЕИС или
            в техподдержку по регламенту.
          </p>
        </div>
      </div>

      <div className={block("card")}>
        <h3 className={block("card-title")}>Текст обращения</h3>
        <textarea
          className={block("textarea", ["large"])}
          value={requestText}
          onChange={(e) => editRequestText(e.target.value)}
        />
        <div className={block("sign-actions")}>
          <button type="button" className={block("btn")} onClick={() => downloadRequest(request, requestText)}>
            Скачать файл обращения
          </button>
          <button type="button" className={block("btn")} onClick={() => void downloadDocx()}>
            Скачать Word с оттиском ЭП
          </button>
          <button type="button" className={block("btn", ["primary"])} onClick={markSigned}>
            Отметить как подписанное ЭП
          </button>
          <button
            type="button"
            className={block("btn")}
            onClick={markSent}
            disabled={request.status === "sent"}
          >
            Отметить отправленным
          </button>
          {request.signedAt && (
            <span className={block("small")}>
              Подпись отмечена: {new Date(request.signedAt).toLocaleString("ru-RU")}
            </span>
          )}
        </div>
        <p className={block("hint")}>
          Word-документ формируется из текущего черновика. Если обращение отмечено как
          подписанное ЭП, в документ добавляется визуальный оттиск подписи с реквизитами
          сертификата. Юридическую силу имеет файл подписи .sig, приложенный к обращению.
        </p>
      </div>

      <EdsFileSigner />
    </div>
  );
}
