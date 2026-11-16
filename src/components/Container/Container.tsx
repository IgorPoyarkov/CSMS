import type { ReactNode } from "react";
import useUtils from "../../hooks/useUtils";
import styles from "./Container.module.scss";

interface ContainerProps {
  children: ReactNode;
}

const Container = ({ children }: ContainerProps) => {
  const { bem } = useUtils();

  return <div className={bem(styles, "container")()}>{children}</div>;
};

export default Container;
