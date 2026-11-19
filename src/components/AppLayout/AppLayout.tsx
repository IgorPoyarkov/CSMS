import { Outlet } from "react-router-dom";
import Container from "../Container/Container";
import Header from "../Header/Header";
import useUtils from "../../hooks/useUtils";
import styles from "./AppLayout.module.scss";

const AppLayout = () => {
  const { bem } = useUtils();

  return (
    <div className={bem(styles, "app")()}>
      <Container>
        <Header />
        <Outlet />
      </Container>
    </div>
  );
};

export default AppLayout;
