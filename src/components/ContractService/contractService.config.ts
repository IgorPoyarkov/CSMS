import type { ConfigurationInput } from "../UI/CustomInput";
import type { ContractService } from "../../services/ContractService/contractService.schema";

// Все не-UI-справочники и хелперы контрактной службы перенесены в services.
// Старый путь оставлен реэкспортом: формы продолжают импортировать отсюда.
// Здесь остались только описания полей приказов, привязанные к react-hook-form.
export * from "../../services/ContractService/contractService.config";

export const contractServiceHeadOrderFields: ConfigurationInput<ContractService>[] =
  [
    {
      label: { value: "Номер приказа о назначении" },
      input: { name: "headOrderNumber", placeholder: "12-КС/П" },
    },
    {
      label: { value: "Дата приказа о назначении" },
      input: { name: "headOrderDate", type: "date" },
    },
  ];

export const contractServiceOrderFields: ConfigurationInput<ContractService>[] =
  [
    {
      label: { value: "Номер приказа" },
      input: { name: "orderNumber", placeholder: "12-П" },
    },
    {
      label: { value: "Дата приказа" },
      input: { name: "orderDate", type: "date" },
    },
  ];

// Поля фиксации действия: кто из работников заказчиков указал сведения (выбор
// из штатки) и когда
export const contractServiceDeclarationFields: ConfigurationInput<ContractService>[] =
  [
    {
      label: { value: "Дата указания сведений" },
      input: { name: "declaredDate", type: "date" },
    },
    {
      label: { value: "Примечание" },
      input: {
        name: "remarks",
        placeholder: "Например: основание создания службы",
      },
    },
  ];
