import { Outlet } from "react-router-dom";
import Container from "../Container/Container";
import Header from "../Header/Header";
import SidePolarCurves from "./SidePolarCurves";
import ModernMotionLayer from "./ModernMotionLayer";
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
      {/* Декор неоновых тем «Современные закупки» и «Морозный неон»:
          размечает большие блоки (комета по контуру) и короткие списки
          (магнитное расхождение). В остальных темах компонент ничего не
          делает и слушателей не держит. */}
      <ModernMotionLayer />
      <div className={bem(styles, "content")()}>
        {/* Шапка вне контейнера: она прилипает к верху на всю ширину экрана,
            а её внутренняя строка сама выравнивается по контенту страницы */}
        <Header />
        <Container>
          <Outlet />
        </Container>
      </div>
    </div>
  );
};

export default AppLayout;
