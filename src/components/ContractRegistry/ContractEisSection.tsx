import useUtils from "../../hooks/useUtils";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import {
  IKZ_LENGTH,
  isEisContractNumber,
  isIkz,
} from "../../services/Eis/eisIdentifiers";
import styles from "./ContractRegistry.module.scss";

/**
 * Реквизиты контракта, без которых не бывает обмена с ЕИС.
 *
 * Реестровый номер контракта и ИКЗ — не «ещё два поля карточки», а адрес, по
 * которому портал понимает, к чему относятся сведения. Номер присваивает
 * портал при регистрации сведений, ИКЗ приходит из плана-графика: править их
 * руками в карточке нельзя, иначе карточка разойдётся с реестром контрактов.
 * Поэтому блок только читает значения, а исправляют их в источнике.
 *
 * Проверка мягкая: в старых записях реестра встречаются неполные ИКЗ
 * (35 разрядов), и разбор карточки не должен падать из-за чужой опечатки —
 * вместо этого здесь видно предупреждение.
 */

interface ContractEisSectionProps {
  contract: ContractRegistryItem;
}

export default function ContractEisSection({
  contract,
}: ContractEisSectionProps) {
  const { bem } = useUtils();
  const block = bem(styles, "eis-section");

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

  return (
    <section className={block()}>
      <div className={block("head")}>
        <h4 className={block("title")}>Реквизиты для ЕИС</h4>
      </div>

      <dl className={block("rows")}>
        <div className={block("row")}>
          <dt className={block("label")}>Реестровый номер контракта</dt>
          <dd className={block("value")}>{storedNumber || "не указан"}</dd>
        </div>
        <div className={block("row")}>
          <dt className={block("label")}>ИКЗ</dt>
          <dd className={block("value")}>{storedIkz || "не указан"}</dd>
        </div>
      </dl>

      {!storedNumber && (
        <p className={block("warn")}>
          Без реестрового номера пакет сведений не отправить: ЕИС не поймёт, к
          какой записи реестра он относится. Номер присваивается, когда
          сведения о контракте внесены на портале, и виден в карточке контракта
          в личном кабинете.
        </p>
      )}

      {ikzBroken && (
        <p className={block("warn")}>
          ИКЗ не {IKZ_LENGTH} разрядов ({storedIkz.length}). ЕИС такой код не
          примет — его надо взять из карточки закупки или из плана-графика.
        </p>
      )}
    </section>
  );
}

