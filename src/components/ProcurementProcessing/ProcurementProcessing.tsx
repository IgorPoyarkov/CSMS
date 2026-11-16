import type React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import {
  useDeleteProcurement,
  useGetProcurements,
} from "../../services/Procurements/procurement.api";
import type { Procurement } from "../../services/Procurements/procurement.schema";

import type { ProcurementActionType } from "./procurement.config";
import ProcurementRow from "./ProcurementRow";
import SelectProcurementTypeModal from "./SelectProcurementTypeModal";
import styles from "./ProcurementProcessing.module.scss";
import Loader from "../UI/Loader";

const ProcurementProcessing: React.FC = () => {
  const { bem } = useUtils();
  const block = bem(styles, "procurement-processing");
  const navigate = useNavigate();

  const { data: procurements = [], isLoading, isError } = useGetProcurements();
  const { mutate: deleteProcurement, isPending: isDeleting } =
    useDeleteProcurement();

  const [noticeModalProcurement, setNoticeModalProcurement] =
    useState<Procurement | null>(null);

  const handleAction = (action: ProcurementActionType, item: Procurement) => {
    switch (action) {
      case "btn93_notice_docs":
        // Кнопка93: открыть модалку "Выберите тип закупки"
        setNoticeModalProcurement(item);
        break;

      case "btn96_contract_project":
        // Кнопка96: переход на компонент "Проект контракта"
        navigate(`/procurement-processing/${item.id}/contract-project`, {
          state: {
            ikz: item.ikz,
            name: item.name,
            procurementType: item.procurementType,
          },
        });
        break;

      case "btn305_edit_docs":
        console.log("Кнопка305 (Способ):", item.procurementType, item.ikz);
        break;

      case "btn352_edit_notice":
        console.log("Кнопка352 (Изменения в извещение):", item.ikz);
        break;

      case "btn353_create_order":
        console.log("Кнопка353 (Приказ):", item.ikz);
        break;

      case "create_remarks":
        console.log("Замечания по закупке:", item.ikz);
        break;
    }
  };

  const handleDelete = (id: string | number) => {
    if (window.confirm("Удалить закупку из Документации для УУ?")) {
      deleteProcurement(id);
    }
  };

  return (
    <section className={block()}>
      <header className={block("header")}>
        <h1 className={block("title")}>Обработка информации по Закупке</h1>
        <button
          type="button"
          className={`${block("close")} btn`}
          onClick={() => navigate("/")}
          aria-label="Закрыть"
        >
          ✕
        </button>
      </header>

      {isLoading && <Loader modifer="pendulum" />}
      {isError && (
        <p className={block("status", ["error"])}>
          Ошибка загрузки данных с сервера
        </p>
      )}

      <ul className={block("list")}>
        {procurements.map((item) => (
          <ProcurementRow
            key={item.id}
            procurement={item}
            onAction={handleAction}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        ))}
      </ul>

      {noticeModalProcurement && (
        <SelectProcurementTypeModal
          procurement={noticeModalProcurement}
          onClose={() => setNoticeModalProcurement(null)}
        />
      )}
    </section>
  );
};

export default ProcurementProcessing;
