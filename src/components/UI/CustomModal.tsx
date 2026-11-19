import type React from "react";
import { useEffect } from "react";
import useUtils from "../../hooks/useUtils";
import styles from "./CustomModal.module.scss";

interface CustomModalProps {
  children?: React.ReactNode;
  configuration?: any;
  onClose?: () => void;
}

const CustomModal = ({ children, onClose }: CustomModalProps) => {
  const { bem } = useUtils();
  const modal = bem(styles, "custom-modal");

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={modal()} onClick={onClose}>
      <div
        className={modal("content")}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default CustomModal;
