import type React from "react";
import useUtils from "../../hooks/useUtils";

export interface ConfigurationButton {
  button: {
    name: string;
    value?: string;
    svg?: string;
    type: "button" | "reset" | "submit" | "undefined";
    modifier?: string[];
    disabled?: boolean;
  };
  defaultClass?: boolean;
}

interface CustomButtonProps {
  configuration: ConfigurationButton;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const CustomButton = ({
  configuration: {
    button: {
      name = "",
      value = "",
      svg = "",
      type = "button",
      modifier = [],
      disabled = false,
    },
    defaultClass = true,
  },
  onClick,
}: CustomButtonProps) => {
  const { bem } = useUtils();
  const block = bem("custom-button");
  const validButtonType = type === "undefined" ? "button" : type;

  return (
    <div className={block("", modifier)}>
      <button
        className={`${block("button")} ${defaultClass ? "btn" : ""}`}
        name={name}
        type={validButtonType}
        onClick={onClick}
        disabled={disabled}
      >
        {value}
      </button>
      {svg !== "" && (
        <svg className={block("icon")}>
          <use href={`../../../public/sprite.svg#${svg}`} />
        </svg>
      )}
    </div>
  );
};

export default CustomButton;
