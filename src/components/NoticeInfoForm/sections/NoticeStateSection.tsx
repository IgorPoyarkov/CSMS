import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import {
  EIS_NOTIFICATION_TYPES,
  EIS_NOTIFICATION_TYPE_LABELS,
  inferNotificationType,
} from "../../../services/Eis/eis17Types";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";

const NoticeStateSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch } = useFormContext<NoticeInfoFormValues>();
  const noticeState = watch("noticeState");
  const placingWayCode = watch("generalInfo.placingWayCode");
  const explicitType = watch("notificationType");
  const effectiveType = inferNotificationType(placingWayCode, explicitType);

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Сведения о состоянии извещения и схема ЕИС 17.0
      </h2>

      <div className={block("state-grid")}>
        <div className={block("row")}>
          <span className={block("label")}>Статус</span>
          <span className={block("value")}>{noticeState.statusLabel}</span>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Тип документа ЕИС 17.0 (IntegrationEPTypes.xsd)
          </span>
          <div className={block("sub-grid")}>
            <select
              className={block("select")}
              {...register("notificationType")}
              value={explicitType ?? effectiveType}
            >
              {EIS_NOTIFICATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EIS_NOTIFICATION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Версия (по умолчанию 1)"
              className={block("input")}
              {...register("versionNumber")}
            />
            <input
              type="text"
              placeholder="Внешний ИД (externalId)"
              className={block("input")}
              {...register("externalId")}
            />
          </div>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>Служебные признаки (serviceSigns)</span>
          <div className={block("inline-group")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("serviceSigns.isIncludeKOKS")}
              />
              <span>Включает КОКС (ОКС/ОНИ)</span>
            </label>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("serviceSigns.isControlP1Ch5St99")}
              />
              <span>Контроль по ч. 5.1 ст. 99 44-ФЗ пройден</span>
            </label>
          </div>
        </div>

        <div className={block("state-cols")}>
          <div className={block("state-col")}>
            <h3 className={block("sub-title")}>
              Информация о создании извещения
            </h3>
            <div className={block("mini-row")}>
              <span className={block("muted")}>Дата создания</span>
              <span>
                {noticeState.createdAt}{" "}
                <span className={block("msk")}>(МСК)</span>
              </span>
            </div>
            <div className={block("mini-row")}>
              <span className={block("muted")}>Пользователь</span>
              <span>{noticeState.createdByFullName}</span>
            </div>
          </div>

          <div className={block("state-col")}>
            <h3 className={block("sub-title")}>
              Информация о последнем обновлении
            </h3>
            <div className={block("mini-row")}>
              <span className={block("muted")}>Дата обновления</span>
              <span>
                {noticeState.updatedAt}{" "}
                <span className={block("msk")}>(МСК)</span>
              </span>
            </div>
            <div className={block("mini-row")}>
              <span className={block("muted")}>Пользователь</span>
              <span>{noticeState.updatedByFullName}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NoticeStateSection;
