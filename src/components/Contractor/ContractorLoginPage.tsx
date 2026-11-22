import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  readContractorSession,
  useContractorDirectory,
  useContractorLogin,
} from "../../services/Contractor/contractor.api";
import {
  contractorInnError,
  normalizeContractorInn,
} from "../../services/Contractor/contractor.schema";
import useUtils from "../../hooks/useUtils";
import styles from "./Contractor.module.scss";

/**
 * Вход подрядчика в личный кабинет (Tasks 9, п. 6: «подрядчик сам загружает
 * нужные для реестра сведения и направляет их заказчику»).
 *
 * Регистрации и пароля нет: подрядчик определяется по ИНН поставщика, под
 * которым он уже записан в реестре контрактов. Это дешёвый вход на данных,
 * которые и так опубликованы в ЕИС, — на проде его закрывает одноразовая
 * ссылка-приглашение на контракт (тот же сценарий, но с токеном).
 *
 * Список подрядчиков ниже — не «выбрать себя из чужого списка», а подсказка
 * для стенда: она строится по реальному реестру, поэтому вход не может
 * показать контракты, которых у ИНН нет.
 */

const ContractorLoginPage = () => {
  const { bem } = useUtils();
  const block = bem(styles, "contractor-login");
  const navigate = useNavigate();

  const [inn, setInn] = useState("");
  const [representative, setRepresentative] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState("");

  const login = useContractorLogin();
  const { data: directory = [] } = useContractorDirectory(
    !readContractorSession(),
  );

  function openCabinet() {
    navigate("/contractor/registry");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const innProblem = contractorInnError(inn);
    if (innProblem) {
      setError(innProblem);
      return;
    }

    setError("");
    login.mutate(
      {
        inn: normalizeContractorInn(inn),
        representative: representative.trim(),
        position: position.trim(),
      },
      { onSuccess: openCabinet },
    );
  }

  // Уже вошёл — не показываем форму повторно
  const session = readContractorSession();
  if (session) {
    return (
      <div className={block()}>
        <div className={block("card")}>
          <h1 className={block("title")}>Кабинет подрядчика</h1>
          <p className={block("text")}>
            Вы уже вошли как <strong>{session.name}</strong>, ИНН {session.inn}.
          </p>
          <div className={block("actions")}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={openCabinet}
            >
              Открыть реестр контрактов
            </button>
            <button
              type="button"
              className={styles.btnSmall}
              onClick={() => navigate("/contractor")}
            >
              Войти под другим ИНН
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={block()}>
      <div className={block("card")}>
        <p className={block("eyebrow")}>ЦСМС · контур подрядчика</p>
        <h1 className={block("title")}>Личный кабинет подрядчика</h1>
        <p className={block("text")}>
          Реестр ваших контрактов по заказчикам и направление сведений о
          привлечении субподрядчиков из СМП и СОНКО (ч. 5, 6 ст. 30 44-ФЗ, ПП РФ
          от 23.12.2016 N 1466). Заказчик видит отправленное, подтверждает
          достоверность своей стороной и размещает сведения в ЕИС.
        </p>

        <form className={block("form")} onSubmit={handleSubmit}>
          <label className={block("field")}>
            <span className={block("label")}>ИНН подрядчика</span>
            <input
              className={block("input")}
              value={inn}
              onChange={(event) => setInn(event.target.value)}
              placeholder="10 или 12 цифр"
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
            />
            <span className={block("hint")}>
              По нему кабинет найдёт контракты, где вы записаны поставщиком
            </span>
          </label>

          <div className={block("row")}>
            <label className={block("field")}>
              <span className={block("label")}>
                Представитель (необязательно)
              </span>
              <input
                className={block("input")}
                value={representative}
                onChange={(event) => setRepresentative(event.target.value)}
                placeholder="Фамилия Имя Отчество"
                autoComplete="off"
              />
            </label>

            <label className={block("field")}>
              <span className={block("label")}>Должность</span>
              <input
                className={block("input")}
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                placeholder="Директор"
                autoComplete="off"
              />
            </label>
          </div>

          <p className={block("note")}>
            ФИО представителя попадает в подтверждение достоверности сведений
            (п. 6 типовых условий) — его видит контрактная служба заказчика.
          </p>

          {error && <p className={block("error")}>{error}</p>}
          {login.isError && (
            <p className={block("error")}>{login.error.message}</p>
          )}

          <div className={block("actions")}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={login.isPending}
            >
              {login.isPending ? "Проверяем реестр…" : "Войти по ИНН"}
            </button>
            <button
              type="button"
              className={styles.btnSmall}
              onClick={() => navigate("/")}
            >
              К кабинету заказчика
            </button>
          </div>
        </form>

        {directory.length > 0 && (
          <div className={block("directory")}>
            <p className={block("directoryTitle")}>
              Подрядчики, уже занесённые в реестр контрактов
            </p>
            <ul className={block("directoryList")}>
              {directory.slice(0, 8).map((entry) => (
                <li key={entry.inn}>
                  <button
                    type="button"
                    className={block("directoryBtn")}
                    onClick={() => setInn(entry.inn)}
                  >
                    <span className={block("directoryName")}>
                      {entry.name || "Наименование не указано"}
                    </span>
                    <span className={block("directoryMeta")}>
                      ИНН {entry.inn} · контрактов: {entry.contracts} ·
                      заказчиков: {entry.customers}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className={block("directoryFoot")}>
              Подстановка по клику: сначала система проверяет ИНН в реестре,
              поэтому увидеть чужие контракты из этого списка нельзя.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractorLoginPage;
