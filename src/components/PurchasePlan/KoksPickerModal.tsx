import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import {
  searchKoks,
  useKoksDictionary,
  type KoksRef,
} from "../../services/KoksRef/koksRef.api";
import styles from "./KoksPickerModal.module.scss";

/**
 * Выбор кода КОКС (nsiKOKS) для позиции плана-графика.
 *
 * Код ОКС/ОНИ в ЕИС не вводится вручную: он выбирается из справочника
 * «Классификатор объектов капитального строительства». Справочник грузится
 * один раз (react-query), поиск идёт по коду, наименованию и ГРБС.
 */

interface KoksPickerModalProps {
  onSelect: (item: KoksRef) => void;
  onClose: () => void;
}

const KoksPickerModal = ({ onSelect, onClose }: KoksPickerModalProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "koks-picker");
  const { data = [], isLoading } = useKoksDictionary();
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchKoks(data, query, 50), [data, query]);

  return (
    <CustomModal onClose={onClose}>
      <div className={block()}>
        <header className={block("header")}>
          <div>
            <h2 className={block("title")}>Код объекта капитального строительства</h2>
            <p className={block("subtitle")}>
              Справочник КОКС (nsiKOKS). Найдите объект по коду или наименованию.
            </p>
          </div>
          <button
            type="button"
            className={block("close")}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <input
          className={block("search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например, 25000000000000000000 или «школа»"
          autoFocus
        />

        <div className={block("body")}>
          {isLoading ? (
            <p className={block("status")}>Загрузка справочника КОКС…</p>
          ) : results.length === 0 ? (
            <p className={block("status")}>
              Ничего не найдено. Справочник пополняется выгрузкой из ЕИС.
            </p>
          ) : (
            <ul className={block("list")}>
              {results.map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    className={block("item")}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <span className={block("code")}>{item.code}</span>
                    <span className={block("name")}>{item.name}</span>
                    {item.address && (
                      <span className={block("address")}>{item.address}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CustomModal>
  );
};

export default KoksPickerModal;
