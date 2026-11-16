import { Link } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import { useLegalActs } from "../../services/LegalAct/legalAct.api";
import {
  actsForComponent,
  formatLegalAct,
  isActInForceOn,
} from "../../services/LegalAct/legalAct.schema";
import styles from "./LegalActRefs.module.scss";

interface LegalActRefsProps {
  // Имя компонента так, как оно записано в legalActs.components
  component: string;
  caption?: string;
}

/**
 * Ссылки на акты, которыми обоснован конкретный экран (Tasks 6, п. 3).
 *
 * Основание не печатается текстом в компоненте: оно берётся из реестра, поэтому
 * при изменении нормы правка уходит в одну запись реестра, а не размазывается по
 * подписям форм. Акт, вышедший за срок действия, подсвечивается — такой экран
 * пора актуализировать.
 */
export default function LegalActRefs({
  component,
  caption = "Правовое основание",
}: LegalActRefsProps) {
  const { bem } = useUtils();
  const block = bem(styles, "legal-act-refs");
  const { data: acts = [] } = useLegalActs();

  const linked = actsForComponent(acts, component);
  if (linked.length === 0) return null;

  return (
    <p className={block()}>
      <span className={block("caption")}>{caption}:</span>
      {linked.map((act) => (
        <Link
          key={String(act.id)}
          to="/legal-acts"
          className={block(
            "link",
            isActInForceOn(act, undefined) ? [] : ["expired"],
          )}
          title={`${act.fullName}${act.scope ? ` — ${act.scope}` : ""}`}
        >
          {formatLegalAct(act)}
        </Link>
      ))}
    </p>
  );
}
