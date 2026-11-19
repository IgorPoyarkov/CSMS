import type React from "react";
import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import {
  EIS_RESPONSIBLE_ROLES,
  EIS_RESPONSIBLE_ROLE_LABELS,
} from "../../../services/Eis/eis17Types";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";

const ContactInfoSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue } = useFormContext<NoticeInfoFormValues>();

  const contactInfo = watch("contactInfo");

  const handleDigitsOnly = (
    path: any,
    maxLen: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
    setValue(path, digits, { shouldValidate: true });
  };

  const renderPhoneRow = (
    label: string,
    prefix: "contactInfo.phoneNum" | "contactInfo.faxNum",
    required = false
  ) => (
    <div className={block("row")}>
      <span className={block("label")}>
        {label}
        {required && <sup>*</sup>}
      </span>
      <div className={block("phone-row")}>
        <div className={block("phone-cell")}>
          <div className={block("phone-inline")}>
            <span>+</span>
            <input
              type="text"
              maxLength={4}
              className={block("input", ["code"])}
              {...register(`${prefix}.countryCode`, {
                onChange: (e) => handleDigitsOnly(`${prefix}.countryCode`, 4, e),
              })}
            />
          </div>
          <span className={block("caption")}>Код страны</span>
        </div>

        <div className={block("phone-cell")}>
          <div className={block("phone-inline")}>
            <span>(</span>
            <input
              type="text"
              maxLength={6}
              className={block("input", ["code"])}
              {...register(`${prefix}.cityCode`, {
                onChange: (e) => handleDigitsOnly(`${prefix}.cityCode`, 6, e),
              })}
            />
            <span>)</span>
          </div>
          <span className={block("caption")}>Код города</span>
        </div>

        <div className={block("phone-cell")}>
          <input
            type="text"
            maxLength={7}
            className={block("input", ["phone-num"])}
            {...register(`${prefix}.num`, {
              onChange: (e) => handleDigitsOnly(`${prefix}.num`, 7, e),
            })}
          />
          <span className={block("caption")}>Номер телефона</span>
        </div>

        <div className={block("phone-cell", ["ext"])}>
          <div className={block("phone-inline")}>
            <span>Добавочный</span>
            <input
              type="text"
              maxLength={15}
              className={block("input", ["code"])}
              {...register(`${prefix}.numExt`, {
                onChange: (e) => handleDigitsOnly(`${prefix}.numExt`, 15, e),
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>Контактная информация</h2>

      <div className={block("form-grid")}>
        <div className={block("row")}>
          <span className={block("label")}>
            Организация, осуществляющая размещение<sup>*</sup>
          </span>
          <span className={block("value")}>{contactInfo.organizationName}</span>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Роль организации (responsibleRoleEPType)
          </span>
          <div className={block("field-col")}>
            <select
              className={block("select")}
              {...register("contactInfo.responsibleRole")}
            >
              {EIS_RESPONSIBLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {EIS_RESPONSIBLE_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            {(contactInfo.responsibleRole === "CS" ||
              contactInfo.responsibleRole === "OCS" ||
              Boolean(contactInfo.specializedOrgName)) && (
              <div className={block("sub-grid")}>
                <input
                  type="text"
                  placeholder="Наименование специализированной организации"
                  className={block("input")}
                  {...register("contactInfo.specializedOrgName")}
                />
                <input
                  type="text"
                  placeholder="ИНН спец. организации"
                  className={block("input")}
                  {...register("contactInfo.specializedOrgInn")}
                />
                <input
                  type="text"
                  placeholder="КПП спец. организации"
                  className={block("input")}
                  {...register("contactInfo.specializedOrgKpp")}
                />
              </div>
            )}
          </div>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Почтовый адрес<sup>*</sup>
          </span>
          <span className={block("value")}>{contactInfo.postalAddress}</span>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Место нахождения<sup>*</sup>
          </span>
          <span className={block("value")}>{contactInfo.locationAddress}</span>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Ответственное должностное лицо<sup>*</sup>
          </span>
          <div className={block("fio-grid")}>
            <input
              type="text"
              placeholder="Фамилия"
              maxLength={50}
              className={block("input")}
              {...register("contactInfo.placerSurname")}
            />
            <input
              type="text"
              placeholder="Имя"
              maxLength={50}
              className={block("input")}
              {...register("contactInfo.placerName")}
            />
            <input
              type="text"
              placeholder="Отчество"
              maxLength={50}
              className={block("input")}
              {...register("contactInfo.placerFathername")}
            />
          </div>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Адрес электронной почты<sup>*</sup>
          </span>
          <div className={block("field-col", ["narrow"])}>
            <input
              type="email"
              maxLength={256}
              className={block("input")}
              {...register("contactInfo.placerEmail")}
            />
          </div>
        </div>

        {renderPhoneRow(
          "Номер контактного телефона",
          "contactInfo.phoneNum",
          true
        )}
        {renderPhoneRow("Факс", "contactInfo.faxNum", false)}

        <div className={block("row")}>
          <span className={block("label")}>Дополнительная информация</span>
          <textarea
            rows={2}
            className={block("textarea")}
            {...register("contactInfo.otherInfo")}
          />
        </div>
      </div>
    </section>
  );
};

export default ContactInfoSection;
