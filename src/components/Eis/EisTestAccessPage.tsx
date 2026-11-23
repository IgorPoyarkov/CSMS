import { useEffect, useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  useCurrentOrganization,
  useOrganizations,
} from "../../services/Organization/organization.api";
import { useFetchCurrentUser } from "../../services/Users/user.api";
import { useEdsCertificates } from "../../services/Eds/eds.api";
import { certificateStateOn } from "../../services/Eds/eds.schema";
import { downloadText } from "../../services/Eis/eisExport";
import EdsFileSigner from "../Eds/EdsFileSigner";
import {
  buildEisTestAccessRequestText,
  createEmptyEisTestAccessRequest,
  EIS_TEST_ACCESS_CHANNELS,
  eisTestAccessStatusLabels,
  FNS_INTEGRATION_CHECKS,
  type EisTestAccessRequest,
  type EisTestAccessStatus,
} from "../../services/Eis/eisTestAccess.schema";
import {
  useEisTestAccessRequests,
  useSaveEisTestAccessRequest,
} from "../../services/Eis/eisTestAccess.api";
import styles from "./EisTestAccessPage.module.scss";

const TODAY = new Date().toISOString().slice(0, 10);

// Статус отображается текстом; цветовую тональность определяем по готовности чеклиста.

function downloadRequest(request: EisTestAccessRequest) {
  const text = buildEisTestAccessRequestText(request);
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
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  const activeCertificates = useMemo(
    () =>
      certificates.filter((certificate) => {
        const state = certificateStateOn(certificate, TODAY);
        return state === "active" || state === "expiring";
      }),
    [certificates],
  );

  useEffect(() => {
    const orgInn = organization?.inn ?? "";

    setRequest((current) => {
      const latest = savedRequests[0];
      const base =
        latest && hydratedId !== latest.id
          ? (setHydratedId(latest.id), latest)
          : hydratedId === current.id
            ? current
            : (setHydratedId(current.id), current);

      // ИНН организации пользователя — главный дефолт. Если черновик был создан
      // без ИНН или с устаревшим пустым значением, подтягиваем ИНН организации.
      const contractorInn = base.contractorInn || orgInn || "";

      const next: EisTestAccessRequest = {
        ...base,
        contractorName:
          base.contractorName || organization?.fullName || organization?.shortName || "",
        contractorShortName: base.contractorShortName || organization?.shortName || "",
        contractorInn,
        contractorKpp: base.contractorKpp || organization?.kpp || "",
        contractorOgrn: base.contractorOgrn || organization?.ogrn || "",
        contractorAddress:
          base.contractorAddress ||
          organization?.legalAddress ||
          organization?.postalAddress ||
          "",
        contractorEmail: base.contractorEmail || organization?.email || "",
        contractorPhone: base.contractorPhone || organization?.phone || "",
        eisRegistryNumber:
          base.eisRegistryNumber ||
          organization?.registryNumber ||
          organization?.regNum ||
          "",
        contactName: base.contactName || organization?.responsiblePerson || "",
        contactPhone:
          base.contactPhone || organization?.responsiblePhone || organization?.phone || "",
        contactEmail: base.contactEmail || organization?.email || "",
        checkInn: Boolean(base.checkInn || contractorInn),
        checkOrg: Boolean(base.checkOrg || organization?.fullName || organization?.shortName),
        checkCertificate: Boolean(base.checkCertificate || activeCertificates.length > 0),
        checkEisRegistration: Boolean(
          base.checkEisRegistration || organization?.registryNumber || organization?.regNum,
        ),
      };

      const changed = (Object.keys(next) as Array<keyof EisTestAccessRequest>).some(
        (key) => next[key] !== base[key],
      );
      return changed ? next : base;
    });
  }, [organization, savedRequests, hydratedId, activeCertificates.length]);

  useEffect(() => {
    setRequest((current) => {
      const text = buildEisTestAccessRequestText(current);
      if (current.requestText === text) return current;
      return { ...current, requestText: text };
    });
  }, [request.contractorName, request.contractorShortName, request.contractorInn, request.contractorKpp, request.contractorOgrn, request.contractorAddress, request.contractorEmail, request.contractorPhone, request.contactName, request.contactPosition, request.contactEmail, request.contactPhone, request.eisRegistryNumber, request.eisSection, request.systemName, request.purpose, request.fnsApiComment]);

  function update<K extends keyof EisTestAccessRequest>(key: K, value: EisTestAccessRequest[K]) {
    setSaveMessage("");
    setRequest((current) => ({ ...current, [key]: value }));
  }

  const checks = useMemo(
    () => [
      { ...FNS_INTEGRATION_CHECKS[0], value: request.checkInn },
      { ...FNS_INTEGRATION_CHECKS[1], value: request.checkOrg },
      { ...FNS_INTEGRATION_CHECKS[2], value: request.checkCertificate },
      { ...FNS_INTEGRATION_CHECKS[3], value: request.checkFnsApi },
      { ...FNS_INTEGRATION_CHECKS[4], value: request.checkEisRegistration },
    ],
    [request],
  );

  const missingChecks = checks.filter((check) => !check.value);

  async function save(status?: EisTestAccessStatus) {
    const next: EisTestAccessRequest = {
      ...request,
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
    update("signedAt", new Date().toISOString());
    void save("signed");
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
              <span className={block("label")}>Цель обращения</span>
              <input className={block("input")} value={request.purpose} onChange={(e) => update("purpose", e.target.value)} />
            </label>
            <label className={block("field", ["wide"])}>
              <span className={block("label")}>Комментарий по настройке API-интеграции с ФНС</span>
              <textarea
                className={block("textarea")}
                value={request.fnsApiComment ?? ""}
                onChange={(e) => update("fnsApiComment", e.target.value)}
                placeholder="Например: проверена интеграция с ФНС/ЕРВЮЛ, доступ к API настроен, ИНН контрагента проверяется."
              />
            </label>
          </div>

          <div className={block("actions")}>
            <button type="button" className={block("btn")} onClick={() => void save()}>
              Сохранить черновик
            </button>
            <button type="button" className={block("btn", ["primary"])} onClick={markPrepared}>
              Подготовить обращение
            </button>
            <button type="button" className={block("btn")} onClick={() => downloadRequest(request)}>
              Скачать текст обращения
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
                          : check.id === "fns_api"
                            ? "checkFnsApi"
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
          value={request.requestText}
          onChange={(e) => update("requestText", e.target.value)}
        />
        <div className={block("sign-actions")}>
          <button type="button" className={block("btn")} onClick={() => downloadRequest(request)}>
            Скачать файл обращения
          </button>
          <button type="button" className={block("btn", ["primary"])} onClick={markSigned}>
            Отметить как подписанное ЭП
          </button>
          {request.signedAt && (
            <span className={block("small")}>
              Подпись отмечена: {new Date(request.signedAt).toLocaleString("ru-RU")}
            </span>
          )}
        </div>
      </div>

      <EdsFileSigner />
    </div>
  );
}
