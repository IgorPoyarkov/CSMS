import useUtils from "../../../hooks/useUtils";
import ContactInfoSection from "../sections/ContactInfoSection";
import GeneralInfoSection from "../sections/GeneralInfoSection";
import NoticeStateSection from "../sections/NoticeStateSection";
import styles from "../NoticeInfoForm.module.scss";

const MainInfoTab = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");

  return (
    <div className={block()}>
      <div className={block("top-bar")}>
        <button
          type="button"
          className={block("link-btn")}
          onClick={() =>
            alert("Сведения синхронизированы с позицией плана-графика")
          }
        >
          Обновить сведения, сформированные на основе плана-графика
        </button>
      </div>

      <p className={block("antimonopoly-warning")}>
        Внимание! За нарушение требований антимонопольного законодательства
        Российской Федерации о запрете участия в ограничивающих конкуренцию
        соглашениях, осуществления ограничивающих конкуренцию согласованных
        действий предусмотрена ответственность в соответствии со ст. 14.32
        КоАП РФ и ст. 178 УК РФ
      </p>

      <NoticeStateSection />
      <GeneralInfoSection />
      <ContactInfoSection />
    </div>
  );
};

export default MainInfoTab;
