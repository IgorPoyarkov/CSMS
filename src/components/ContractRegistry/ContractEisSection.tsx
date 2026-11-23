import { useMemo } from "react";
import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import type { ContractRegistryItem } from "../../services/ContractRegistry/contractRegistry.schema";
import { useContractCardProjection } from "../../services/ContractRegistry/contractCardProjection.api";
import { contractCardContractNumber } from "../../services/ContractRegistry/contractCardProjection.schema";
import { useNotices } from "../../services/Procurements/noticeInfo.api";
import {
  IKZ_LENGTH,
  eisContractCardUrl,
  isEisContractNumber,
  isIkz,
} from "../../services/Eis/eisIdentifiers";
import styles from "./ContractRegistry.module.scss";

/**
 * Реквизиты контракта в ЕИС: номер, реестровый номер, ИКЗ и извещение.
 *
 * Реестровый номер и ИКЗ — не «ещё два поля карточки», а адрес, по которому
 * портал понимает, к чему относятся сведения. Номер присваивает портал при
 * регистрации сведений, ИКЗ приходит из плана-графика: править их руками в
 * карточке нельзя, иначе карточка разойдётся с реестром контрактов. Поэтому
 * блок только читает значения, а исправляют их в источнике.
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
  const { data: projection } = useContractCardProjection(contract.id);
  const { data: notices } = useNotices();

  const importNumber = contract.contractNumber ?? "";
  // Реестровый номер может прийти из выгрузки ЕИС как номер контракта: у
  // импортированных карточек `eisRegistryNumber` пуст, а 19-значный
  // `contractNumber` — это и есть реестровый номер. Без такой подстановки
  // блок писал «не указан» рядом с контрактом, у которого номер есть
  const registryNumber =
    contract.eisRegistryNumber ||
    (isEisContractNumber(importNumber) ? importNumber : "");
  // Номер контракта («17АН_26») — не реестровый: в записи реестра он есть у
  // заведённых вручную контрактов, у импортированных приходит из карточки ЕИС
  const contractNumber =
    (!isEisContractNumber(importNumber) ? importNumber : "") ||
    contractCardContractNumber(projection) ||
    "";
  const storedIkz = contract.ikz ?? "";
  const ikzBroken = storedIkz !== "" && !isIkz(storedIkz);

  // Карточка контракта на портале: сохранённая при импорте ссылка либо адрес,
  // собранный по реестровому номеру — другого способа открыть её в ЕИС нет
  const cardUrl = contract.eisUrl || eisContractCardUrl(registryNumber);

  // Извещение, по которому заключён контракт: ссылку показываем только когда
  // извещение действительно есть — пустая ссылка вводила бы в заблуждение
  const notice = useMemo(() => {
    const procurementId = contract.procurementId;
    if (procurementId === undefined || procurementId === null) return null;
    const key = String(procurementId);
    return (
      (notices ?? []).find(
        (item) =>
          item.procurementId !== undefined &&
          item.procurementId !== null &&
          String(item.procurementId) === key,
      ) ?? null
    );
  }, [notices, contract.procurementId]);
  const noticeNumber = notice?.generalInfo?.noticeNumber ?? "";

  return (
    <section className={block()}>
      <div className={block("head")}>
        <h4 className={block("title")}>Реквизиты ЕИС</h4>
      </div>

      <dl className={block("rows")}>
        <div className={block("row")}>
          <dt className={block("label")}>Номер контракта</dt>
          <dd className={block("value")}>{contractNumber || "не указан"}</dd>
        </div>
        <div className={block("row")}>
          <dt className={block("label")}>Реестровый номер контракта</dt>
          <dd className={block("value")}>
            {cardUrl ? (
              <a
                className={styles.projectionLink}
                href={cardUrl}
                target="_blank"
                rel="noreferrer"
                title="Открыть карточку контракта на портале ЕИС"
              >
                {registryNumber}
              </a>
            ) : (
              "не указан"
            )}
          </dd>
        </div>
        <div className={block("row")}>
          <dt className={block("label")}>ИКЗ</dt>
          <dd className={block("value")}>{storedIkz || "не указан"}</dd>
        </div>
        {notice && (
          <div className={block("row")}>
            <dt className={block("label")}>Извещение</dt>
            <dd className={block("value")}>
              <Link
                className={styles.projectionLink}
                to={`/procurement-processing/${String(contract.procurementId)}/notice-info`}
                title="Открыть карточку извещения"
              >
                {noticeNumber ? `№ ${noticeNumber}` : "карточка извещения"}
              </Link>
            </dd>
          </div>
        )}
      </dl>

      {!registryNumber && (
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

      {/* Обмен с ЕИС: пакет собирается по этой карточке, подписывается ЭП и
          уходит на портал. Одна кнопка ведёт ко всем пакетам контракта, вторая —
          сразу к сведениям о привлечении СМП: это разные типы документов, а не
          два адреса одного и того же действия */}
      <div className={styles.footerActions}>
        {registryNumber && isIkz(storedIkz) ? (
          <>
            <Link
              className={styles.btnSecondary}
              to={`/eis/packages?contractId=${String(contract.id)}`}
            >
              Пакеты сведений в ЕИС
            </Link>
            {Number(contract.smpRequiredPercent ?? 0) > 0 && (
              <Link
                className={styles.btnSecondary}
                to={`/eis/packages?contractId=${String(contract.id)}&documentType=SmpAttraction`}
              >
                Сведения СМП в ЕИС
              </Link>
            )}
          </>
        ) : (
          <span className={styles.projectionMissing}>
            Пакет сведений появится, когда в карточке будут реестровый номер
            ЕИС и ИКЗ из 36 разрядов.
          </span>
        )}
      </div>
    </section>
  );
}

