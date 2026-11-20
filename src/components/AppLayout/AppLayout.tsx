import { Outlet } from "react-router-dom";
import Container from "../Container/Container";
import Header from "../Header/Header";
import SidePolarCurves from "./SidePolarCurves";
import useUtils from "../../hooks/useUtils";
import styles from "./AppLayout.module.scss";

const AppLayout = () => {
  const { bem } = useUtils();

  return (
    <div className={bem(styles, "app")()}>
      {/* Декоративные полярные кривые по бокам: pointer-events none,
          не участвуют в потоке документа и не перекрывают клики */}
      <SidePolarCurves />
      <div className={bem(styles, "content")()}>
        <Container>
          <Header />
          <Outlet />
        </Container>
      </div>
    </div>
  );
};

export default AppLayout;
