import { useState } from "react";
import useUtils from "../../hooks/useUtils";
import { useUpdateContract } from "../../services/ContractRegistry/contractRegistry.api";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import {
  EIS_CONTRACT_NUMBER_LENGTH,
  IKZ_LENGTH,
  digitsOnly,
  isEisContractNumber,
  isIkz,
} from "../../services/Eis/eisIdentifiers";
import styles from "./ContractRegistry.module.scss";

/**
 * Реквизиты контракта, без которых не бывает обмена с ЕИС.
 *
 * Реестровый номер контракта и ИКЗ — не «ещё два поля карточки», а адрес, по
 * которому портал понимает, к чему относятся сведения. Раньше их спрашивали
 * при создании каждого пакета, хотя система уже знает контракт: это та же
 * ручная работа, от которой мы уходим. Поэтому номера живут здесь, один раз,
 * и пакет берёт их отсюда.
 *
 * Проверка строгая на вводе и мягкая на чтении: в старых записях реестра
 * встречаются неполные ИКЗ (35 разрядов), и разбор карточки не должен падать
 * из-за чужой опечатки — вместо этого здесь видно предупреждение.
 */

interface ContractEisSectionProps {
  contract: ContractRegistryItem;
}

export default function ContractEisSection({
  contract,
}: ContractEisSectionProps) {
  const { bem } = useUtils();
  const block = bem(styles, "eis-section");

  const updateContract = useUpdateContract();

  // Реестровый номер может прийти из выгрузки ЕИС как номер контракта: у
  // импортированных карточек `eisRegistryNumber` пуст, а 19-значный
  // `contractNumber` — это и есть реестровый номер. Без такой подстановки
  // блок писал «не указан» рядом с контрактом, у которого номер есть
  const importNumber = contract.contractNumber ?? "";
  const storedNumber =
    contract.eisRegistryNumber ||
    (isEisContractNumber(importNumber) ? importNumber : "");
  const storedIkz = contract.ikz ?? "";
  const ikzBroken = storedIkz !== "" && !isIkz(storedIkz);

  const [editing, setEditing] = useState(false);
  const [registryNumber, setRegistryNumber] = useState(storedNumber);
  const [ikz, setIkz] = useState(storedIkz);
  const [error, setError] = useState("");

  function startEdit() {
    setRegistryNumber(storedNumber);
    setIkz(storedIkz);
    setError("");
    setEditing(true);
  }

  async function save() {
    setError("");

    if (registryNumber !== "" && !isEisContractNumber(registryNumber)) {
      setError(
        `Реестровый номер контракта в ЕИС — ${EIS_CONTRACT_NUMBER_LENGTH} цифр. ` +
          `Сейчас введено ${registryNumber.length}.`,
      );

      return;
    }

    if (ikz !== "" && !isIkz(ikz)) {
      setError(
        `ИКЗ — ${IKZ_LENGTH} разрядов. Сейчас введено ${ikz.length}. ` +
          "Код берут из карточки закупки, он же указан в плане-графике.",
      );

      return;
    }

    if (contract.id === undefined) {
      setError("У контракта нет идентификатора — сохранять некуда.");

      return;
    }

    try {
      await updateContract.mutateAsync({
        id: contract.id,
        eisRegistryNumber: registryNumber,
        ikz,
      });
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <section className={block()}>
      <div className={block("head")}>
        <h4 className={block("title")}>Реквизиты для ЕИС</h4>
        {!editing && (
          <button
            type="button"
            className={block("btnEdit")}
            onClick={startEdit}
          >
            {storedNumber || storedIkz ? "Исправить" : "Указать"}
          </button>
        )}
      </div>

      {!editing && (
        <>
          <dl className={block("rows")}>
            <div className={block("row")}>
              <dt className={block("label")}>Реестровый номер контракта</dt>
              <dd className={block("value")}>
                {storedNumber || "не указан"}
              </dd>
            </div>
            <div className={block("row")}>
              <dt className={block("label")}>ИКЗ</dt>
              <dd className={block("value")}>{storedIkz || "не указан"}</dd>
            </div>
          </dl>

          {!storedNumber && (
            <p className={block("warn")}>
              Без реестрового номера пакет сведений не отправить: ЕИС не поймёт,
              к какой записи реестра он относится. Номер присваивается, когда
              сведения о контракте внесены на портале, и виден в карточке
              контракта в личном кабинете.
            </p>
          )}

          {ikzBroken && (
            <p className={block("warn")}>
              ИКЗ не {IKZ_LENGTH} разрядов ({storedIkz.length}). ЕИС такой код не
              примет — его надо взять из карточки закупки или из плана-графика.
            </p>
          )}
        </>
      )}

      {editing && (
        <form
          className={block("form")}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <label className={block("field")}>
            <span className={block("label")}>
              Реестровый номер контракта в ЕИС, {EIS_CONTRACT_NUMBER_LENGTH} цифр
            </span>
            <input
              className={block("input")}
              value={registryNumber}
              onChange={(event) =>
                setRegistryNumber(
                  digitsOnly(event.target.value).slice(
                    0,
                    EIS_CONTRACT_NUMBER_LENGTH,
                  ),
                )
              }
              placeholder="0373100000123000001"
              inputMode="numeric"
            />
          </label>

          <label className={block("field")}>
            <span className={block("label")}>
              ИКЗ, {IKZ_LENGTH} разрядов
            </span>
            <input
              className={block("input")}
              value={ikz}
              onChange={(event) =>
                setIkz(digitsOnly(event.target.value).slice(0, IKZ_LENGTH))
              }
              placeholder="262463200012346320100100170014211244"
              inputMode="numeric"
            />
          </label>

          {error && <div className={block("error")}>{error}</div>}

          <div className={block("actions")}>
            <button
              type="submit"
              className={block("btnPrimary")}
              disabled={updateContract.isPending}
            >
              {updateContract.isPending ? "Сохраняю…" : "Сохранить"}
            </button>
            <button
              type="button"
              className={block("btnCancel")}
              onClick={() => setEditing(false)}
              disabled={updateContract.isPending}
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
