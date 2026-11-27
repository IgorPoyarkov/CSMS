import { useCallback } from "react";
import useUtils from "../../hooks/useUtils";
import {
  useStandardContractTerms,
  type StandardContractTerm,
} from "../../services/Npa/standardContractTerms.api";
import { downloadStandardContractTermsDocx } from "../../services/Npa/standardContractTermsWord";
import type { ContractStandardTerm } from "../../services/ContractProject/contractProject.schema";
import CustomButton from "../UI/CustomButton";
import Loader from "../UI/Loader";
import styles from "./StandardContractTermsPanel.module.scss";

interface StandardContractTermsPanelProps {
  selected?: ContractStandardTerm;
  onSelect: (term: ContractStandardTerm | null) => void;
}

/** pravo.gov.ru отдаёт дату редакции как yyyyMMdd — без Date, чтобы не сдвинуть день. */
const formatRedDate = (value: string) =>
  value.length === 8
    ? `${value.slice(6, 8)}.${value.slice(4, 6)}.${value.slice(0, 4)}`
    : value;

/**
 * Выбор типовых условий контракта, обязательных по ч. 11 ст. 34 44-ФЗ.
 * Акт не пересказывается: в проект попадает дословный текст снимка pravo.gov.ru
 * вместе с хешем и ссылкой на редакцию; Word собирается из того же снимка.
 */
export default function StandardContractTermsPanel({
  selected,
  onSelect,
}: StandardContractTermsPanelProps) {
  const { bem } = useUtils();
  const block = bem(styles, "standard-terms-panel");
  const { data: catalog, isLoading, isError } = useStandardContractTerms();

  const addTerm = useCallback(
    (term: StandardContractTerm) => {
      onSelect({
        code: term.code,
        number: term.number,
        passing: term.passing,
        title: term.title,
        redDate: term.redDate,
        sourceUrl: term.sourceUrl,
        cardUrl: term.cardUrl,
        textSource: term.textSource,
        textSha256: term.textSha256,
        text: term.text,
      });
    },
    [onSelect],
  );

  return (
    <section className={block()} aria-label="Типовые условия контракта">
      <header className={block("header")}>
        <div>
          <h3 className={block("title")}>Типовые условия контракта</h3>
          <p className={block("subtitle")}>
            Акты Правительства РФ по ч. 11 ст. 34 44-ФЗ применяются заказчиками
            всегда. Выбранный акт включается в текст проекта контракта дословно,
            с сохранением официальной нумерации и ссылки на редакцию.
          </p>
        </div>
        {selected && (
          <div className={block("chosen")}>
            <span className={block("chosen-label")}>В проекте</span>
            <strong>ПП РФ № {selected.number}</strong>
            <span className={block("hash")}>
              {selected.textSha256.slice(0, 16)}…
            </span>
            <CustomButton
              configuration={{
                button: {
                  name: "remove-standard-term",
                  value: "Убрать из проекта",
                  type: "button",
                },
              }}
              ariaLabel="Убрать типовые условия из проекта контракта"
              onClick={() => onSelect(null)}
            />
          </div>
        )}
      </header>

      {isLoading && <Loader count={4} size={120} />}
      {isError && (
        <p className={block("error")}>
          Каталог типовых условий недоступен. Ранее выбранный акт остаётся в
          проекте; повторите открытие страницы, чтобы обновить список.
        </p>
      )}

      {catalog && (
        <div className={block("list")}>
          {catalog.items.map((term) => {
            const inProject = selected?.code === term.code;
            return (
              <article className={block("item")} key={term.code}>
                <div className={block("item-main")}>
                  <p className={block("kind")}>
                    ПП РФ № {term.number} · редакция от {formatRedDate(term.redDate)}
                  </p>
                  <h4 className={block("item-title")}>{term.title}</h4>
                  <div className={block("badges")}>
                    {term.isGovernment && (
                      <span className={block("badge")}>
                        Принято Правительством РФ
                      </span>
                    )}
                    {term.alwaysApplies && (
                      <span className={block("badge", ["always"])}>
                        Применяется всегда
                      </span>
                    )}
                  </div>
                  <p className={block("meta")}>Текст: {term.textSource}</p>
                  <div className={block("links")}>
                    <a href={term.sourceUrl} target="_blank" rel="noreferrer">
                      Редакция на источнике ↗
                    </a>
                    <a href={term.cardUrl} target="_blank" rel="noreferrer">
                      Карточка ↗
                    </a>
                  </div>
                </div>
                <div className={block("actions")}>
                  <CustomButton
                    configuration={{
                      button: {
                        name: `standard-term-${term.code}`,
                        value: inProject ? "В проекте" : "Добавить в проект",
                        type: "button",
                        modifier: inProject ? ["active"] : [],
                        disabled: inProject,
                      },
                    }}
                    ariaLabel={`Добавить ПП РФ № ${term.number} в проект контракта`}
                    onClick={() => addTerm(term)}
                  />
                  <CustomButton
                    configuration={{
                      button: {
                        name: `standard-term-word-${term.code}`,
                        value: "Скачать Word",
                        type: "button",
                      },
                    }}
                    ariaLabel={`Скачать типовые условия ПП РФ № ${term.number} в Word`}
                    onClick={() => void downloadStandardContractTermsDocx(term)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
