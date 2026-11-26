import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import {
  getObjectDescriptionOkpd2Codes,
  objectDescriptionStatusLabels,
  type ObjectDescription,
} from "../../services/ObjectDescription/objectDescription.schema";
import styles from "./OozPickerModal.module.scss";

interface OozPickerModalProps {
  descriptions: ObjectDescription[];
  positionOkpd2?: string;
  onSelect: (desc: ObjectDescription) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

/**
 * Модалка на этапе перехода «ПГ → СЗ»: спрашивает, есть ли уже подготовленное
 * описание объекта закупки (ООЗ), и позволяет найти его по ОКПД2 / поиску либо
 * создать новое.
 */
export default function OozPickerModal({
  descriptions,
  positionOkpd2,
  onSelect,
  onCreateNew,
  onClose,
}: OozPickerModalProps) {
  const { bem } = useUtils();
  const block = bem(styles, "ooz-picker");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = descriptions.filter((desc) => {
      if (!q) return true;
      const codes = getObjectDescriptionOkpd2Codes(desc)
        .map((item) => item.code.toLowerCase())
        .join(" ");
      return (
        (desc.title || "").toLowerCase().includes(q) ||
        codes.includes(q) ||
        (desc.ikz || "").toLowerCase().includes(q)
      );
    });
    // Сначала точное совпадение по ОКПД2 позиции ПГ, затем остальные.
    return [...list].sort((a, b) => {
      const aMatch = positionOkpd2
        ? getObjectDescriptionOkpd2Codes(a).some(
            (item) => item.code === positionOkpd2,
          )
        : false;
      const bMatch = positionOkpd2
        ? getObjectDescriptionOkpd2Codes(b).some(
            (item) => item.code === positionOkpd2,
          )
        : false;
      return Number(bMatch) - Number(aMatch);
    });
  }, [descriptions, query, positionOkpd2]);

  return (
    <CustomModal onClose={onClose}>
      <div className={block()}>
        <h2 className={block("title")}>
          Есть ли подготовленное описание объекта закупки (ООЗ)?
        </h2>
        <p className={block("hint")}>
          Найдите существующее ООЗ по наименованию, коду ОКПД2 или ИКЗ — объекты
          закупки и характеристики подставятся в СЗ автоматически.
        </p>
        <input
          className={block("search")}
          type="text"
          placeholder="Поиск по названию, ОКПД2 или ИКЗ…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className={block("list")}>
          {filtered.length === 0 ? (
            <p className={block("empty")}>
              Ничего не найдено — можно создать новое ООЗ.
            </p>
          ) : (
            filtered.map((desc) => (
              <button
                key={String(desc.id)}
                type="button"
                className={block("item")}
                onClick={() => onSelect(desc)}
              >
                <span className={block("item-title")}>{desc.title}</span>
                <span className={block("item-meta")}>
                  {getObjectDescriptionOkpd2Codes(desc)
                    .map((item) => item.code)
                    .join(", ") || "ОКПД2 не указан"}
                  {desc.ikz ? ` · ИКЗ ${desc.ikz}` : ""} ·{" "}
                  {objectDescriptionStatusLabels[desc.status]}
                </span>
              </button>
            ))
          )}
        </div>
        <div className={block("actions")}>
          <button
            type="button"
            className={block("primary-btn")}
            onClick={onCreateNew}
          >
            Создать новое ООЗ
          </button>
          <button
            type="button"
            className={block("secondary-btn")}
            onClick={onClose}
          >
            Пока без ООЗ
          </button>
        </div>
      </div>
    </CustomModal>
  );
}
