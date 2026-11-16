import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";

const NoticeStateSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { watch } = useFormContext<NoticeInfoFormValues>();
  const noticeState = watch("noticeState");

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Сведения о состоянии извещения
      </h2>

      <div className={block("state-grid")}>
        <div className={block("row")}>
          <span className={block("label")}>Статус</span>
          <span className={block("value")}>{noticeState.statusLabel}</span>
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
