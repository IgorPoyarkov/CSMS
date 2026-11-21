import { Outlet } from "react-router-dom";
import Container from "../Container/Container";
import Header from "../Header/Header";
import SidePolarCurves from "./SidePolarCurves";
import useUtils from "../../hooks/useUtils";
import { uiFlags } from "../../config/uiFlags";
import styles from "./AppLayout.module.scss";

const AppLayout = () => {
  const { bem } = useUtils();

  return (
    <div className={bem(styles, "app")()}>
      {/* Декоративные полярные кривые по бокам: pointer-events none,
          не участвуют в потоке документа и не перекрывают клики.
          Временно скрыты флагом uiFlags.sidePolarCurves — код и стили
          остаются на месте, включение: VITE_SIDE_POLAR_CURVES=on. */}
      {uiFlags.sidePolarCurves && <SidePolarCurves />}
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
