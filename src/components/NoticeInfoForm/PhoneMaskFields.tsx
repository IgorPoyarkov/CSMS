import type React from "react";
import { useFormContext } from "react-hook-form";
import useUtils from "../../hooks/useUtils";
import CustomInput from "../UI/CustomInput";
import styles from "./NoticeInfoForm.module.scss";

interface PhoneMaskFieldsProps {
  title: string;
  prefixPath: "contactInfo.phone" | "contactInfo.fax";
}

const formatPhoneNumber = (rawValue: string): string => {
  const digits = rawValue.replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  if (digits.length <= 6) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 7)}`;
};

const PhoneMaskFields = ({ title, prefixPath }: PhoneMaskFieldsProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "notice-info-form");
  const { setValue } = useFormContext();

  const handleMaskInput = (
    field: "countryCode" | "cityCode" | "number" | "extension",
    e: React.FormEvent<HTMLDivElement>
  ) => {
    const target = e.target as HTMLInputElement;
    if (!target || target.tagName !== "INPUT") return;

    let formatted = target.value;

    if (field === "countryCode") {
      const cleaned = formatted.replace(/[^\d+]/g, "");
      formatted = cleaned.startsWith("+")
        ? `+${cleaned.slice(1).replace(/\+/g, "").slice(0, 3)}`
        : cleaned.slice(0, 3);
    } else if (field === "cityCode") {
      formatted = formatted.replace(/\D/g, "").slice(0, 5);
    } else if (field === "number") {
      formatted = formatPhoneNumber(formatted);
    } else if (field === "extension") {
      formatted = formatted.replace(/\D/g, "").slice(0, 5);
    }

    target.value = formatted;
    setValue(`${prefixPath}.${field}`, formatted, { shouldValidate: true });
  };

  return (
    <div className={block("phone-group")}>
      <span className={block("label")}>{title}</span>
      <div className={block("phone-grid")}>
        <div onInput={(e) => handleMaskInput("countryCode", e)}>
          <CustomInput
            prefixPath={prefixPath}
            configuration={{
              label: { value: "Код страны" },
              input: { name: "countryCode" as any, placeholder: "+7" },
            }}
          />
        </div>

        <div onInput={(e) => handleMaskInput("cityCode", e)}>
          <CustomInput
            prefixPath={prefixPath}
            configuration={{
              label: { value: "Код города" },
              input: { name: "cityCode" as any, placeholder: "4712" },
            }}
          />
        </div>

        <div onInput={(e) => handleMaskInput("number", e)}>
          <CustomInput
            prefixPath={prefixPath}
            configuration={{
              label: { value: "Номер телефона" },
              input: { name: "number" as any, placeholder: "00-00-00" },
            }}
          />
        </div>

        <div onInput={(e) => handleMaskInput("extension", e)}>
          <CustomInput
            prefixPath={prefixPath}
            configuration={{
              label: { value: "Добавочный" },
              input: { name: "extension" as any, placeholder: "101" },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PhoneMaskFields;
