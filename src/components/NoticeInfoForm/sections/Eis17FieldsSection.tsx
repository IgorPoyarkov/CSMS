import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import { mapNoticeInfoToEis17 } from "../../../services/Eis/eis17Types";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";

/**
 * Проекция всех полей, которые уходят в XML ЕИС 17.0, в форме извещения.
 *
 * Значения берутся из того же DTO (`mapNoticeInfoToEis17`), что и XML-превью,
 * поэтому расхождения между формой и выгрузкой невозможны. Раздел намеренно
 * только для чтения: реквизиты утверждённых СЗ/ООЗ менять здесь нельзя,
 * а технические поля (docPublishDate, href, printForm) заполняет ЕИС.
 */

interface XmlFieldRow {
  path: string;
  value: string;
}

const XML_BLOCK_LABELS: Record<string, string> = {
  schemaVersion: "Версия схемы",
  notificationType: "Тип документа",
  externalId: "Внешний идентификатор",
  versionNumber: "Версия документа",
  commonInfo: "Общие сведения (commonInfo)",
  purchaseResponsibleInfo: "Ответственный заказчик",
  notificationInfo: "Сведения извещения (notificationInfo)",
  modificationInfo: "Изменения",
  cancelReasonInfo: "Отмена",
  attachments: "Вложения (attachmentsInfo)",
  serviceSigns: "Служебные признаки",
};

const formatValue = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") return "{…}";
  return String(value);
};

const flattenXmlFields = (
  value: unknown,
  prefix: string,
  rows: XmlFieldRow[],
): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      flattenXmlFields(item, `${prefix}[${index}]`, rows),
    );
    return;
  }
  if (value !== null && typeof value === "object") {
    Object.entries(value).forEach(([key, nested]) =>
      flattenXmlFields(nested, prefix ? `${prefix}.${key}` : key, rows),
    );
    return;
  }
  rows.push({ path: prefix, value: formatValue(value) });
};

const Eis17FieldsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { watch } = useFormContext<NoticeInfoFormValues>();
  const notice = watch();
  const dto = mapNoticeInfoToEis17(notice);

  const groups = Object.entries(dto as unknown as Record<string, unknown>).map(
    ([group, value]) => {
      const rows: XmlFieldRow[] = [];
      flattenXmlFields(value, group, rows);
      return { group, label: XML_BLOCK_LABELS[group] ?? group, rows };
    },
  );
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Поля XML ЕИС 17.0 в форме извещения
      </h2>
      <p className={block("muted")}>
        Все {total} значений, которые передаются в выгрузке, другой инфраструктурой
        не редактируются. Раздел только для чтения: утверждённые СЗ и ООЗ не
        меняются, технические даты и ссылки проставляет ЕИС.
      </p>
      <details className={block("eis-preview")}>
        <summary>Показать соответствие полей формы и XML ({total})</summary>
        {groups.map(({ group, label, rows }) => (
          <div key={group}>
            <h3 className={block("section-title")}>{label}</h3>
            <div className={block("state-cols")}>
              {rows.map((row) => (
                <div key={row.path} className={block("row")}>
                  <span className={block("label")}>{row.path}</span>
                  <span className={block("value")}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </details>
    </section>
  );
};

export default Eis17FieldsSection;
