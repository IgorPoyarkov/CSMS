import useUtils from "../../hooks/useUtils";
import { asset } from "../utils/asset";
import styles from "./Loader.module.scss";

interface LoaderProps {
  count?: number;
  size?: number;
  modifer?: "pendulum" | "file" | "";
}

const Loader = ({ count = 12, size = 320, modifer = "" }: LoaderProps) => {
  const { getRandomInRange, bem } = useUtils();
  const block = bem(styles, "loader");
  const modifiers = modifer !== "" ? [modifer] : [];

  return (
    <div
      className={block("", modifiers)}
      style={
        {
          "--size": size,
          "--count": count,
        } as React.CSSProperties
      }
    >
      <ul className={block("list")}>
        {Array.from({ length: count }).map((_, index) => (
          <li
            className={block("item", index < count / 2 ? [] : ["right"])}
            style={
              {
                "--delay": getRandomInRange(30, 80),
                "--index": index + 1,
              } as React.CSSProperties
            }
            key={index}
          >
            <svg className={block("icon")}>
              <use href={asset("/sprite.svg#logo-icon")} />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Loader;
