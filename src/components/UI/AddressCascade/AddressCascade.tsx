import { useMemo, useState } from "react";
import useUtils from "../../../hooks/useUtils";
import {
  useAddressMunicipalities,
  useAddressRegions,
} from "../../../services/AddressRef/addressRef.api";
import {
  RUSSIA,
  formatDeliveryAddress,
  type DeliveryAddressParts,
} from "../../../services/AddressRef/addressRef.schema";
import styles from "./AddressCascade.module.scss";
import Select from "../Select";

/**
 * Каскад выбора места поставки (Tasks 7, п. 2): страна → субъект Российской
 * Федерации → муниципальное образование → населённый пункт → адрес.
 *
 * Субъекты берутся из справочника, муниципальные образования — из справочника
 * по субъекту; пока регион не подключён из ФИАС (доступ к API ФНС выдаётся по
 * мастер-токену), значение вводится вручную. Итоговая строка собирается
 * автоматически и показывается под полями — её же получают документы.
 */

interface AddressCascadeProps {
  idPrefix: string;
  value: DeliveryAddressParts;
  onChange: (next: DeliveryAddressParts) => void;
  disabled?: boolean;
}

const MANUAL_OPTION = "__manual";

export default function AddressCascade({
  idPrefix,
  value,
  onChange,
  disabled,
}: AddressCascadeProps) {
  const { bem } = useUtils();
  const block = bem(styles, "address-cascade");

  const { data: regions = [] } = useAddressRegions();
  const [isAnotherCountry, setIsAnotherCountry] = useState(
    Boolean(value.country) && value.country !== RUSSIA,
  );

  // Субъект храним названием: место поставки в документах — строка, а не ссылка
  const region = useMemo(
    () => regions.find((item) => item.name === value.region),
    [regions, value.region],
  );
  const { data: municipalities = [] } = useAddressMunicipalities(region?.id);

  const isManualMunicipality =
    Boolean(value.municipality) &&
    !municipalities.some((item) => item.name === value.municipality);

  const patch = (next: Partial<DeliveryAddressParts>) =>
    onChange({ ...value, ...next });

  const preview = formatDeliveryAddress(value);

  return (
    <div className={block()}>
      <div className={block("levels")}>
        <div className={block("level")}>
          <label className={block("label")} htmlFor={`${idPrefix}-country`}>
            Страна
          </label>
          <Select
            id={`${idPrefix}-country`}
            className={block("control")}
            disabled={disabled}
            value={isAnotherCountry ? MANUAL_OPTION : RUSSIA}
            onChange={(event) => {
              const manual = event.target.value === MANUAL_OPTION;
              setIsAnotherCountry(manual);
              patch({ country: manual ? "" : RUSSIA });
            }}
          >
            <option value={RUSSIA}>{RUSSIA}</option>
            <option value={MANUAL_OPTION}>Другая страна…</option>
          </Select>
          {isAnotherCountry && (
            <input
              className={block("control")}
              placeholder="Наименование государства"
              disabled={disabled}
              value={value.country ?? ""}
              onChange={(event) => patch({ country: event.target.value })}
            />
          )}
        </div>

        <div className={block("level")}>
          <label className={block("label")} htmlFor={`${idPrefix}-region`}>
            Субъект Российской Федерации
          </label>
          <Select
            id={`${idPrefix}-region`}
            className={block("control")}
            disabled={disabled}
            value={value.region ?? ""}
            onChange={(event) =>
              // Муниципальное образование относится к выбранному субъекту,
              // поэтому при смене субъекта его сбрасываем
              patch({ region: event.target.value, municipality: "" })
            }
          >
            <option value="">— выберите субъект —</option>
            {regions.map((item) => (
              <option key={String(item.id)} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>

        <div className={block("level")}>
          <label
            className={block("label")}
            htmlFor={`${idPrefix}-municipality`}
          >
            Муниципальное образование
          </label>
          {municipalities.length > 0 ? (
            <Select
              id={`${idPrefix}-municipality`}
              className={block("control")}
              disabled={disabled || !region}
              value={isManualMunicipality ? MANUAL_OPTION : value.municipality ?? ""}
              onChange={(event) =>
                patch({
                  municipality:
                    event.target.value === MANUAL_OPTION ? "" : event.target.value,
                })
              }
            >
              <option value="">
                {region ? "— выберите муниципальное образование —" : "сначала выберите субъект"}
              </option>
              {municipalities.map((item) => (
                <option key={String(item.id)} value={item.name}>
                  {item.name}
                </option>
              ))}
              <option value={MANUAL_OPTION}>Ввести вручную…</option>
            </Select>
          ) : (
            <input
              id={`${idPrefix}-municipality`}
              className={block("control")}
              placeholder={
                region
                  ? "Городской округ или муниципальный район"
                  : "сначала выберите субъект"
              }
              disabled={disabled || !region}
              value={value.municipality ?? ""}
              onChange={(event) => patch({ municipality: event.target.value })}
            />
          )}
          {region && municipalities.length === 0 && (
            <span className={block("hint")}>
              Справочник муниципальных образований по субъекту не подключён —
              значение вводится вручную (ФИАС подключается по мастер-токену ФНС).
            </span>
          )}
          {isManualMunicipality && municipalities.length > 0 && (
            <input
              className={block("control")}
              placeholder="Городской округ или муниципальный район"
              disabled={disabled}
              value={value.municipality ?? ""}
              onChange={(event) => patch({ municipality: event.target.value })}
            />
          )}
        </div>

        <div className={block("level")}>
          <label className={block("label")} htmlFor={`${idPrefix}-settlement`}>
            Населённый пункт
          </label>
          <input
            id={`${idPrefix}-settlement`}
            className={block("control")}
            placeholder="г Курск"
            disabled={disabled}
            value={value.settlement ?? ""}
            onChange={(event) => patch({ settlement: event.target.value })}
          />
        </div>

        <div className={block("level", ["wide"])}>
          <label className={block("label")} htmlFor={`${idPrefix}-address`}>
            Адрес места поставки
          </label>
          <input
            id={`${idPrefix}-address`}
            className={block("control")}
            placeholder="Транспортная развязка на улице Карла Маркса в месте примыкания проспекта Победы"
            disabled={disabled}
            value={value.address ?? ""}
            onChange={(event) => patch({ address: event.target.value })}
          />
        </div>

        <div className={block("level", ["wide"])}>
          <label className={block("label")} htmlFor={`${idPrefix}-info`}>
            Дополнительная информация об адресе
          </label>
          <input
            id={`${idPrefix}-info`}
            className={block("control")}
            placeholder="Порядок и время приёмки, режим работы склада"
            disabled={disabled}
            value={value.additionalInfo ?? ""}
            onChange={(event) => patch({ additionalInfo: event.target.value })}
          />
        </div>
      </div>

      <p className={block("preview")}>
        <span className={block("preview-label")}>Место поставки в извещении</span>
        <span className={block("preview-value")}>
          {preview || "— уровни места поставки не указаны —"}
        </span>
      </p>
    </div>
  );
}
