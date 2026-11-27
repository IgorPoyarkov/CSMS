import { useCallback, useMemo, useRef, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  buildStandardTermNavigation,
  downloadStandardContractTermsDocx,
  parseStandardContractTermsText,
  standardTermBlockId,
  type StandardTermWordSource,
} from "../../services/Npa/standardContractTermsWord";
import CustomButton from "../UI/CustomButton";
import CustomModal from "../UI/CustomModal";
import styles from "./StandardTermsWordViewer.module.scss";

interface StandardTermsWordViewerProps {
  term: StandardTermWordSource | null;
  onClose: () => void;
}

/** pravo.gov.ru отдаёт дату редакции как yyyyMMdd — без Date, чтобы не сдвинуть день. */
const formatRedDate = (value: string) =>
  value.length === 8
    ? `${value.slice(6, 8)}.${value.slice(4, 6)}.${value.slice(0, 4)}`
    : value;

/**
 * Встроенный просмотр Word-документа типовых условий. Страница собирается из
 * тех же блоков снимка, что и скачиваемый .docx: текст не пересказывается,
 * оглавление ведёт к каждому размеченному уровню (шапка, раздел, пункт,
 * подпункт), активный пункт подсвечивается при прокрутке.
 */
export default function StandardTermsWordViewer({
  term,
  onClose,
}: StandardTermsWordViewerProps) {
  const { bem } = useUtils();
  const block = bem(styles, "word-viewer");
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState("");

  const blocks = useMemo(
    () => (term ? parseStandardContractTermsText(term.text) : []),
    [term],
  );
  const navigation = useMemo(
    () => buildStandardTermNavigation(blocks),
    [blocks],
  );

  const scrollToBlock = useCallback((id: string) => {
    const body = bodyRef.current;
    if (!body) return;
    const target = body.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
    if (!target) return;
    // Явный scrollTop: scrollIntoView прокручивает и модальное окно целиком.
    body.scrollTop =
      target.getBoundingClientRect().top -
      body.getBoundingClientRect().top +
      body.scrollTop -
      12;
    setActiveId(id);
  }, []);

  const updateActive = useCallback(() => {
    const body = bodyRef.current;
    if (!body || navigation.length === 0) return;
    const top = body.getBoundingClientRect().top + 24;
    let current = navigation[0].id;
    for (const item of navigation) {
      const element = body.querySelector<HTMLElement>(
        `[data-block-id="${item.id}"]`,
      );
      if (!element) continue;
      if (element.getBoundingClientRect().top > top) break;
      current = item.id;
    }
    setActiveId((previous) => (previous === current ? previous : current));
  }, [navigation]);

  if (!term) return null;

  return (
    <CustomModal onClose={onClose}>
      <div
        className={block()}
        role="dialog"
        aria-modal="true"
        aria-label={`Просмотр Word: ${term.passing}`}
      >
        <header className={block("header")}>
          <div className={block("heading")}>
            <p className={block("kind")}>
              ПП РФ № {term.number} · редакция от {formatRedDate(term.redDate)}
            </p>
            <h2 className={block("title")}>{term.title}</h2>
            <p className={block("meta")}>
              {term.passing} · документ собран из снимка {term.textSource}
            </p>
          </div>
          <div className={block("header-actions")}>
            <CustomButton
              configuration={{
                button: {
                  name: "download-word-preview",
                  value: "Скачать Word",
                  type: "button",
                },
              }}
              ariaLabel="Скачать открытый Word-документ"
              onClick={() => void downloadStandardContractTermsDocx(term)}
            />
            <CustomButton
              configuration={{
                button: {
                  name: "close-word-preview",
                  value: "Закрыть",
                  type: "button",
                },
                defaultClass: false,
              }}
              ariaLabel="Закрыть просмотр Word"
              onClick={onClose}
            />
          </div>
        </header>

        <div className={block("toolbar")}>
          <a href={term.sourceUrl} target="_blank" rel="noreferrer">
            Редакция на источнике ↗
          </a>
          <a href={term.cardUrl} target="_blank" rel="noreferrer">
            Карточка ↗
          </a>
          <span>SHA-256: {term.textSha256.slice(0, 16)}…</span>
        </div>

        <div className={block("layout")}>
          <nav className={block("nav")} aria-label="Оглавление типовых условий">
            <p className={block("nav-title")}>Содержание</p>
            {navigation.map((item) => (
              <a
                href={`#${item.id}`}
                key={item.id}
                title={item.label}
                className={block("nav-item", [
                  `level-${item.level}`,
                  activeId === item.id ? "active" : "",
                ])}
                aria-current={activeId === item.id ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToBlock(item.id);
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className={block("body")} ref={bodyRef} onScroll={updateActive}>
            <article className={block("page")}>
              <div className={block("page-head")}>
                <p>{term.passing}</p>
                <p>{term.title}</p>
              </div>
              {blocks.map((line, index) => {
                const id = standardTermBlockId(index);
                return (
                  <p
                    id={id}
                    data-block-id={id}
                    key={id}
                    className={block("line", [line.kind])}
                  >
                    {line.text}
                  </p>
                );
              })}
              <footer className={block("page-foot")}>
                Текст: {term.textSource} · {term.sourceUrl} · SHA-256{" "}
                {term.textSha256}
              </footer>
            </article>
          </div>
        </div>
      </div>
    </CustomModal>
  );
}
