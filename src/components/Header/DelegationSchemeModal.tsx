import { Fragment } from "react";
import useUtils from "../../hooks/useUtils";
import CustomModal from "../UI/CustomModal";
import {
  DELEGATION_HIERARCHY,
  DELEGATION_NOTES,
  DELEGATION_ROLES,
  DELEGATION_STEPS,
} from "./delegationScheme.config";
import styles from "./DelegationSchemeModal.module.scss";

interface DelegationSchemeModalProps {
  onClose: () => void;
}

/**
 * Схема делегирования задач в контрактной службе: открывается из меню «Ещё».
 *
 * Показывает текущий маршрут задачи — от распределения функций по п. 2.4
 * Типового положения до кабинета исполнителя и контроля результата.
 * Данные вынесены в delegationScheme.config.ts, чтобы справку можно было
 * править без изменений разметки.
 */
const DelegationSchemeModal = ({ onClose }: DelegationSchemeModalProps) => {
  const { bem } = useUtils();
  const modal = bem(styles, "delegation-scheme");

  return (
    <CustomModal onClose={onClose}>
      <div className={modal()} role="dialog" aria-modal="true">
        <header className={modal("header")}>
          <div>
            <h2 className={modal("title")}>
              Делегирование задач в контрактной службе
            </h2>
            <p className={modal("subtitle")}>
              Кто ставит задачу, кто исполняет и как за ней следит руководитель.
              Схема описывает текущую реализацию в CSMS.
            </p>
          </div>
          {/* Нативная кнопка закрытия — как в соседних модалках шапки */}
          <button
            type="button"
            className={modal("close")}
            onClick={onClose}
            aria-label="Закрыть схему делегирования"
          >
            ×
          </button>
        </header>

        <div className={modal("body")}>
          <section className={modal("section")}>
            <h3 className={modal("section-title")}>Участники</h3>
            <p className={modal("section-hint")}>
              Цветная полоса у карточки совпадает с ролью, от которой задача
              приходит исполнителю.
            </p>
            <div className={modal("roles")}>
              {DELEGATION_ROLES.map((role) => (
                <article
                  className={modal("role", [role.id])}
                  key={role.id}
                >
                  <h4 className={modal("role-name")}>{role.name}</h4>
                  <span className={modal("role-badge")}>{role.badge}</span>
                  <p className={modal("role-text")}>{role.text}</p>
                  <ul className={modal("role-points")}>
                    {role.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className={modal("section")}>
            <h3 className={modal("section-title")}>Подчинение</h3>
            <p className={modal("section-hint")}>
              Стрелка вниз — назначение приказом или передача функций,
              стрелка вправо — руководство внутри подразделения.
            </p>
            <div className={modal("hierarchy")}>
              {DELEGATION_HIERARCHY.map((branch) => (
                <article
                  className={modal("hierarchy-branch")}
                  key={branch.id}
                >
                  <h4 className={modal("hierarchy-branch-title")}>
                    {branch.title}
                  </h4>
                  <p className={modal("hierarchy-branch-hint")}>
                    {branch.hint}
                  </p>
                  <div className={modal("hierarchy-chain")}>
                    {branch.levels.map((level, levelIndex) => (
                      <Fragment key={level.nodes[0]?.name}>
                        <div className={modal("hierarchy-level")}>
                          {level.nodes.map((node, nodeIndex) => (
                            <Fragment key={node.name}>
                              {nodeIndex > 0 && (
                                <span
                                  className={modal("hierarchy-across")}
                                  title={level.acrossLabel}
                                  aria-label={level.acrossLabel}
                                >
                                  →
                                </span>
                              )}
                              <div
                                className={modal("hierarchy-node", [
                                  node.modifier,
                                ])}
                              >
                                <span className={modal("hierarchy-node-name")}>
                                  {node.name}
                                </span>
                                <span
                                  className={modal("hierarchy-node-caption")}
                                >
                                  {node.caption}
                                </span>
                              </div>
                            </Fragment>
                          ))}
                        </div>
                        {levelIndex < branch.levels.length - 1 && (
                          <div className={modal("hierarchy-down")}>
                            <span aria-hidden="true">↓</span>
                            <span>{level.downLabel}</span>
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={modal("section")}>
            <h3 className={modal("section-title")}>Маршрут задачи</h3>
            <p className={modal("section-hint")}>
              От правового основания до результата: ответственность за шаг
              передаётся стрелкой.
            </p>
            <div className={modal("flow")}>
              {DELEGATION_STEPS.map((step, index) => (
                <article className={modal("step")} key={step.title}>
                  <span className={modal("step-num")}>{index + 1}</span>
                  <h4 className={modal("step-title")}>{step.title}</h4>
                  <p className={modal("step-text")}>{step.text}</p>
                  <p className={modal("step-meta")}>{step.meta}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={modal("section")}>
            <div className={modal("note")}>
              <span className={modal("note-title")}>Что важно при передаче</span>
              <ul className={modal("note-list")}>
                {DELEGATION_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <footer className={modal("footer")}>
          Основание: п. 2.1–2.5 Типового положения о контрактной службе,
          утв. приказом Минфина России от 31.07.2020 № 158н (раздел III —
          функции и полномочия); ч. 21 ст. 38 Федерального закона № 44-ФЗ —
          контрактный управляющий вместо службы.
        </footer>
      </div>
    </CustomModal>
  );
};

export default DelegationSchemeModal;
