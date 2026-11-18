import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import AppLayout from "./components/AppLayout/AppLayout";
import AccountPage from "./pages/AccountPage/AccountPage";
import LoginForm from "./components/Account/LoginForm/LoginForm";
import RegisterForm from "./components/Account/RegisterForm/RegisterForm";
import PersonalAccount from "./components/Account/PersonalAccount/PersonalAccount";
import TasksPage from "./components/Tasks/TasksPage";
import CustomModal from "./components/UI/CustomModal";
import PurchasePlanList from "./components/PurchasePlan/PurchasePlanList";
import PurchasePlanCard from "./components/PurchasePlan/PurchasePlanCard";
import PurchasePlanForm from "./components/PurchasePlan/PurchasePlanForm";
import PurchasePlanPositionEditPage from "./components/PurchasePlan/PurchasePlanPositionEditPage";
import PurchaseNotePage from "./components/PurchaseNote/PurchaseNotePage";
import PurchaseNotesRegistryPage from "./components/PurchaseNote/PurchaseNotesRegistryPage";
import ProcurementProcessing from "./components/ProcurementProcessing/ProcurementProcessing";
import NoticeInfoForm from "./components/NoticeInfoForm/NoticeInfoForm";
import ContractServicePage from "./components/ContractService/ContractServicePage";
import ContractProjectForm from "./components/ContractProject/ContractProjectForm";
import SmnpSonekPage from "./components/Reports/SmnpSonekPage";
import ContractRegistryPage from "./components/ContractRegistry/ContractRegistryPage";
import Okpd2Dictionary from "./components/Okpd2Ref/Okpd2Dictionary";
import LegalActsRegistry from "./components/LegalAct/LegalActsRegistry";
import TaskDetailPage from "./components/Tasks/TaskDetailPage";
import EisSmpExportPage from "./components/Eis/EisSmpExportPage";
import EisPackagesPage from "./components/Eis/EisPackagesPage";
import NormingRequirementsPage from "./components/NormingRequirements/NormingRequirementsPage";
import EdsJournalPage from "./components/Eds/EdsJournalPage";
import PluginDiagnosticsPage from "./components/Eds/PluginDiagnosticsPage";
import DefectListsPage from "./components/DefectList/DefectListsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      {
        path: "/account",
        element: <AccountPage />,
        children: [
          { path: "login", element: <CustomModal children={<LoginForm />} /> },
          {
            path: "register",
            element: <CustomModal children={<RegisterForm />} />,
          },
          { path: "profile", element: <PersonalAccount /> },
        ],
      },
      {
        path: "/tasks",
        element: <TasksPage />,
      },
      {
        path: "/tasks/:id",
        element: <TaskDetailPage />,
      },
      {
        path: "/purchase-plans",
        children: [
          { index: true, element: <PurchasePlanList /> },
          { path: "new", element: <PurchasePlanForm /> },
          { path: ":id", element: <PurchasePlanCard /> },
          { path: ":id/edit", element: <PurchasePlanForm /> },
          {
            path: ":id/positions/new",
            element: <PurchasePlanPositionEditPage />,
          },
          {
            path: ":id/positions/:positionId/edit",
            element: <PurchasePlanPositionEditPage />,
          },
          {
            path: ":id/positions/:positionId/requirement",
            element: <PurchaseNotePage />,
          },
        ],
      },
      {
        path: "/purchase-notes",
        element: <PurchaseNotesRegistryPage />,
      },
      {
        path: "/contract-service",
        element: <ContractServicePage />,
      },
      {
        path: "/procurement-processing",
        children: [
          { index: true, element: <ProcurementProcessing /> },
          {
            path: ":id/notice-info",
            element: <NoticeInfoForm />,
          },
          {
            path: ":id/contract-project",
            element: <ContractProjectForm />,
          },
        ],
      },
      {
        path: "/reports/smnp",
        element: <SmnpSonekPage />,
      },
      {
        path: "/contract-registry",
        element: <ContractRegistryPage />,
      },
      {
        path: "/eis/smp-export",
        element: <EisSmpExportPage />,
      },
      {
        // Пакеты ЕИС: подпись, отправка и статусы ФЛК вместо скачанного файла
        path: "/eis/packages",
        element: <EisPackagesPage />,
      },
      {
        // Справочник ОКПД2: поиск по коду/наименованию, признак нормирования
        path: "/okpd2",
        element: <Okpd2Dictionary />,
      },
      {
        // Типовые требования по п. 7 ПП РФ N 926 для нормируемых кодов ОКПД2
        path: "/norming-requirements",
        element: <NormingRequirementsPage />,
      },
      {
        // Реестр законодательных актов и связей норм с компонентами системы
        path: "/legal-acts",
        element: <LegalActsRegistry />,
      },
      {
        // Дефектовки: роль «инициатор закупки» — работник подразделения-
        // заказчика вне КС готовит объёмы работ, проект сметы контракта
        // (421/пр) и проект календарного графика (336/пр) (Tasks 8, п. 4)
        path: "/defect-lists",
        element: <DefectListsPage />,
      },
      {
        // Журнал действий с ЭП заказчика: кто, когда, каким сертификатом подписал
        path: "/eds/journal",
        element: <EdsJournalPage />,
      },
      {
        // Диагностика рабочего места: видит ли браузер плагин и сертификаты,
        // ставится ли подпись (Tasks 9, п. 1 — до отправки документов в ЕИС)
        path: "/eds/diagnostics",
        element: <PluginDiagnosticsPage />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
